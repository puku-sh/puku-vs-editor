/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  VS Code-specific implementation of Puku Authentication Service
 *  Bridges to VS Code layer's PukuAuthService via internal commands
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuAuthService, PukuAuthStatus, PukuToken, PukuUser } from '../common/pukuAuth';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { Emitter } from '../../../util/vs/base/common/event';

/**
 * VS Code-specific implementation of PukuAuthService
 * Bridges to VS Code core layer's PukuAuthService
 */
export class VsCodePukuAuthService extends Disposable implements IPukuAuthService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuthStatus = this._register(new Emitter<PukuAuthStatus>());
	readonly onDidChangeAuthStatus = this._onDidChangeAuthStatus.event;

	private _status: PukuAuthStatus = PukuAuthStatus.Unknown;
	private _token: PukuToken | undefined;
	private _user: PukuUser | undefined;
	private _refreshTimeout: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		super();

		// Listen for authentication commands that might indicate auth state changed
		// This ensures we refresh when VS Code layer authenticates
		this._register(vscode.commands.registerCommand('_puku.refreshAuth', async () => {
			console.log('[VsCodePukuAuthService] Refreshing auth state');
			await this.initialize();
		}));

		// Poll for auth changes every 5 seconds (as a fallback)
		const pollInterval = setInterval(async () => {
			if (this._status === PukuAuthStatus.Unauthenticated) {
				const token = await this.getToken();
				if (token) {
					console.log('[VsCodePukuAuthService] Auth state changed, initializing');
					await this.initialize();
				}
			}
		}, 5000);

		this._register({ dispose: () => clearInterval(pollInterval) });
	}

	get status(): PukuAuthStatus {
		return this._status;
	}

	get token(): PukuToken | undefined {
		return this._token;
	}

	get user(): PukuUser | undefined {
		return this._user;
	}

	isReady(): boolean {
		return this._status === PukuAuthStatus.Authenticated && !!this._token?.indexingEnabled;
	}

	async initialize(): Promise<void> {
		try {
			const token = await this.getToken();
			if (token) {
				await this.getUser();
				this._setStatus(PukuAuthStatus.Authenticated);
			} else {
				this._setStatus(PukuAuthStatus.Unauthenticated);
			}
		} catch (error) {
			console.error('[PukuAuth] Initialization failed:', error);
			this._setStatus(PukuAuthStatus.Error);
		}
	}

	async getToken(): Promise<PukuToken | undefined> {
		// Return cached token if still valid
		if (this._token && this._token.expiresAt > Date.now() / 1000) {
			return this._token;
		}

		try {
			// Bridge to VS Code layer: Use internal command to get Puku session token
			const tokenData: any = await vscode.commands.executeCommand('_puku.getSessionToken');

			if (!tokenData) {
				console.log('[PukuAuth] No session token available from VS Code layer');
				return undefined;
			}

			this._token = {
				token: tokenData.token || tokenData,
				expiresAt: tokenData.expiresAt || (Date.now() / 1000 + 3600), // 1 hour default
				refreshIn: tokenData.refreshIn || 3500,
				endpoints: tokenData.endpoints || {
					api: 'https://api.puku.sh',
					embeddings: 'https://api.puku.sh/v1/embeddings'
				},
				indexingEnabled: tokenData.indexingEnabled !== false,
				semanticSearchEnabled: tokenData.semanticSearchEnabled !== false,
			};

			// Schedule token refresh
			this._scheduleTokenRefresh();

			return this._token;
		} catch (error) {
			console.error('[PukuAuth] Error fetching token:', error);
			return undefined;
		}
	}

	async getUser(): Promise<PukuUser | undefined> {
		if (this._user) {
			return this._user;
		}

		try {
			// Bridge to VS Code layer: Use internal command to get Puku user info
			const userData: any = await vscode.commands.executeCommand('_puku.getUserInfo');

			if (!userData) {
				console.log('[PukuAuth] No user info available from VS Code layer');
				return undefined;
			}

			this._user = {
				id: userData.id,
				name: userData.name,
				email: userData.email,
			};

			return this._user;
		} catch (error) {
			console.error('[PukuAuth] Error fetching user:', error);
			return undefined;
		}
	}

	signOut(): void {
		this._token = undefined;
		this._user = undefined;
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = undefined;
		}
		this._setStatus(PukuAuthStatus.Unauthenticated);
	}

	private _setStatus(status: PukuAuthStatus): void {
		if (this._status !== status) {
			this._status = status;
			this._onDidChangeAuthStatus.fire(status);
		}
	}

	private _scheduleTokenRefresh(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}

		if (this._token) {
			const refreshMs = (this._token.refreshIn - 60) * 1000; // Refresh 60 seconds before expiry
			this._refreshTimeout = setTimeout(() => {
				this._token = undefined;
				this.getToken().catch(console.error);
			}, Math.max(refreshMs, 60000));
		}
	}

	override dispose(): void {
		if (this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
		}
		super.dispose();
	}
}
