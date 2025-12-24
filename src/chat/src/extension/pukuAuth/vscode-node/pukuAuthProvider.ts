/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

const PUKU_AUTH_PROVIDER_ID = 'puku';
const PUKU_AUTH_PROVIDER_LABEL = 'Puku';
const PUKU_API_ENDPOINT = 'https://api.puku.sh';

interface PukuAuthSession extends vscode.AuthenticationSession {
	readonly accessToken: string;
}

/**
 * Puku Authentication Provider
 * Implements VS Code's AuthenticationProvider interface for Puku authentication
 */
export class PukuAuthProvider extends Disposable implements vscode.AuthenticationProvider {
	private _sessions: PukuAuthSession[] = [];
	private readonly _onDidChangeSessions = this._register(
		new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>()
	);
	readonly onDidChangeSessions: vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> =
		this._onDidChangeSessions.event;

	constructor(
		private readonly _context: vscode.ExtensionContext,
		private readonly _logService: ILogService
	) {
		super();
		this._logService.info('[PukuAuthProvider] Initializing');

		// Load any existing sessions from storage
		this._loadSessions();
	}

	async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
		this._logService.debug(`[PukuAuthProvider] getSessions called with scopes: ${scopes?.join(', ')}`);
		return this._sessions;
	}

	async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
		this._logService.info('[PukuAuthProvider] createSession called - opening login flow');

		try {
			// Open Puku login page
			const loginUrl = `${PUKU_API_ENDPOINT}/auth/vscode`;
			const callbackUri = await vscode.env.asExternalUri(
				vscode.Uri.parse(`${vscode.env.uriScheme}://GitHub.puku-editor/callback`)
			);

			const loginUriWithCallback = `${loginUrl}?callback=${encodeURIComponent(callbackUri.toString())}`;

			this._logService.info(`[PukuAuthProvider] Opening login URL: ${loginUriWithCallback}`);

			// Open the login page in browser
			await vscode.env.openExternal(vscode.Uri.parse(loginUriWithCallback));

			// Wait for the callback
			const token = await this._waitForAuthCallback();

			if (!token) {
				throw new Error('Authentication failed - no token received');
			}

			// Fetch user info from Puku API
			const userInfo = await this._getUserInfo(token);

			// Create session
			const session: PukuAuthSession = {
				id: userInfo.id,
				accessToken: token,
				account: {
					id: userInfo.id,
					label: userInfo.name || userInfo.email
				},
				scopes: [...scopes]
			};

			// Save session
			this._sessions.push(session);
			await this._saveSessions();

			// Fire event
			this._onDidChangeSessions.fire({
				added: [session],
				removed: [],
				changed: []
			});

			this._logService.info(`[PukuAuthProvider] Successfully created session for user: ${session.account.label}`);

			return session;
		} catch (error) {
			this._logService.error('[PukuAuthProvider] Failed to create session:', error);
			throw error;
		}
	}

	async removeSession(sessionId: string): Promise<void> {
		this._logService.info(`[PukuAuthProvider] removeSession called for session: ${sessionId}`);

		const sessionIndex = this._sessions.findIndex(s => s.id === sessionId);
		if (sessionIndex === -1) {
			this._logService.warn(`[PukuAuthProvider] Session not found: ${sessionId}`);
			return;
		}

		const session = this._sessions[sessionIndex];
		this._sessions.splice(sessionIndex, 1);
		await this._saveSessions();

		// Fire event
		this._onDidChangeSessions.fire({
			added: [],
			removed: [session],
			changed: []
		});

		this._logService.info(`[PukuAuthProvider] Successfully removed session: ${sessionId}`);
	}

	private async _waitForAuthCallback(): Promise<string | undefined> {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				disposable.dispose();
				resolve(undefined);
			}, 5 * 60 * 1000); // 5 minute timeout

			const disposable = vscode.window.registerUriHandler({
				handleUri: (uri: vscode.Uri) => {
					this._logService.info(`[PukuAuthProvider] Received auth callback: ${uri.toString()}`);

					// Parse token from query string
					const query = new URLSearchParams(uri.query);
					const token = query.get('token');

					clearTimeout(timeout);
					disposable.dispose();

					if (token) {
						resolve(token);
					} else {
						resolve(undefined);
					}
				}
			});
		});
	}

	private async _getUserInfo(token: string): Promise<{ id: string; name?: string; email: string }> {
		try {
			const response = await fetch(`${PUKU_API_ENDPOINT}/puku/v1/user`, {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch user info: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				id: data.id || data.user_id || 'unknown',
				name: data.name || data.username,
				email: data.email
			};
		} catch (error) {
			this._logService.error('[PukuAuthProvider] Failed to fetch user info:', error);
			throw error;
		}
	}

	private async _loadSessions(): Promise<void> {
		try {
			const storedSessions = this._context.globalState.get<PukuAuthSession[]>('puku.auth.sessions', []);
			this._sessions = storedSessions;
			this._logService.info(`[PukuAuthProvider] Loaded ${this._sessions.length} session(s) from storage`);
		} catch (error) {
			this._logService.error('[PukuAuthProvider] Failed to load sessions:', error);
			this._sessions = [];
		}
	}

	private async _saveSessions(): Promise<void> {
		try {
			await this._context.globalState.update('puku.auth.sessions', this._sessions);
			this._logService.debug(`[PukuAuthProvider] Saved ${this._sessions.length} session(s) to storage`);
		} catch (error) {
			this._logService.error('[PukuAuthProvider] Failed to save sessions:', error);
		}
	}

	/**
	 * Register the Puku authentication provider with VS Code
	 */
	static register(context: vscode.ExtensionContext, logService: ILogService): vscode.Disposable {
		const provider = new PukuAuthProvider(context, logService);

		const disposable = vscode.authentication.registerAuthenticationProvider(
			PUKU_AUTH_PROVIDER_ID,
			PUKU_AUTH_PROVIDER_LABEL,
			provider,
			{ supportsMultipleAccounts: false }
		);

		logService.info('[PukuAuthProvider] Registered authentication provider');

		return vscode.Disposable.from(disposable, provider);
	}
}
