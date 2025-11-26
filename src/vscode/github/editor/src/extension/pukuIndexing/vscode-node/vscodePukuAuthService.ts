/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  VS Code-specific implementation of Puku Authentication Service
 *  Delegates to VS Code workbench's PukuAuthService for actual auth
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuAuthService, PukuAuthStatus, PukuToken, PukuUser } from '../common/pukuAuth';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { Emitter } from '../../../util/vs/base/common/event';

const PUKU_API_ENDPOINT = 'https://api.puku.sh';

/**
 * VS Code-specific implementation of PukuAuthService
 * Delegates to VS Code workbench's PukuAuthService for actual authentication
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

		// Listen for auth refresh command from workbench
		this._register(vscode.commands.registerCommand('_puku.extensionRefreshAuth', async () => {
			console.log('[VsCodePukuAuthService] Received refresh auth command from workbench');
			await this.initialize();
		}));

		// Poll for auth changes every 2 seconds when unauthenticated
		const pollInterval = setInterval(async () => {
			if (this._status === PukuAuthStatus.Unauthenticated) {
				const token = await this.getToken();
				if (token) {
					console.log('[VsCodePukuAuthService] Detected new auth session via polling');
					clearInterval(pollInterval);
				}
			}
		}, 2000);

		this._register({ dispose: () => clearInterval(pollInterval) });
	}

	/**
	 * Get session token from VS Code workbench's Puku auth service
	 */
	private async _getSessionTokenFromVSCode(): Promise<string | undefined> {
		try {
			const result = await vscode.commands.executeCommand<{ token: string } | undefined>('_puku.getSessionToken');
			return result?.token;
		} catch (error) {
			console.error('[VsCodePukuAuthService] Error getting session token:', error);
			return undefined;
		}
	}

	/**
	 * Get user info from VS Code workbench's Puku auth service
	 */
	private async _getUserInfoFromVSCode(): Promise<PukuUser | undefined> {
		try {
			const userInfo = await vscode.commands.executeCommand<{ id: string; name: string; email: string } | undefined>('_puku.getUserInfo');
			return userInfo;
		} catch (error) {
			console.error('[VsCodePukuAuthService] Error getting user info:', error);
			return undefined;
		}
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
		console.log('[VsCodePukuAuthService] Initializing extension auth service');
		try {
			const token = await this.getToken();
			if (token) {
				await this.getUser();
				this._setStatus(PukuAuthStatus.Authenticated);
				console.log('[VsCodePukuAuthService] Initialized as authenticated');
			} else {
				this._setStatus(PukuAuthStatus.Unauthenticated);
				console.log('[VsCodePukuAuthService] Initialized as unauthenticated');
			}
		} catch (error) {
			console.error('[VsCodePukuAuthService] Initialization failed:', error);
			this._setStatus(PukuAuthStatus.Error);
		}
	}

	async getToken(): Promise<PukuToken | undefined> {
		console.log('[VsCodePukuAuthService] getToken() called');

		try {
			// Get session token from VS Code workbench's Puku auth service via command
			console.log('[VsCodePukuAuthService] Fetching session token from VS Code service...');
			const sessionToken = await this._getSessionTokenFromVSCode();
			console.log(`[VsCodePukuAuthService] Session token result: ${sessionToken ? 'FOUND (length: ' + sessionToken.length + ')' : 'NOT FOUND'}`);

			if (!sessionToken) {
				console.log('[VsCodePukuAuthService] No session token from VS Code service');
				// Clear cached token if no valid session
				this._token = undefined;
				return undefined;
			}

			// Return cached token if it matches the session token and is still valid
			if (this._token && this._token.token === sessionToken && this._token.expiresAt > Date.now() / 1000) {
				console.log('[VsCodePukuAuthService] Returning cached token');
				return this._token;
			}

			console.log('[VsCodePukuAuthService] Got session token from VS Code service');

			// Get user info from VS Code service
			const userInfo = await this._getUserInfoFromVSCode();
			if (userInfo) {
				this._user = userInfo;
				console.log('[VsCodePukuAuthService] User info:', userInfo.email);
			}

			this._token = {
				token: sessionToken,
				expiresAt: (Date.now() / 1000) + (7 * 24 * 3600), // 7 days
				refreshIn: (7 * 24 * 3600) - 3600, // Refresh 1 hour before expiry
				username: userInfo?.email || 'puku-user',
				endpoints: {
					api: PUKU_API_ENDPOINT,
					embeddings: `${PUKU_API_ENDPOINT}/v1/embeddings`
				},
				indexingEnabled: true,
				semanticSearchEnabled: true,
			};

			console.log('[VsCodePukuAuthService] Created PukuToken, updating status to Authenticated');
			this._setStatus(PukuAuthStatus.Authenticated);
			this._scheduleTokenRefresh();
			return this._token;
		} catch (error) {
			console.error('[VsCodePukuAuthService] Error fetching token:', error);
			return undefined;
		}
	}

	async getUser(): Promise<PukuUser | undefined> {
		if (this._user) {
			return this._user;
		}

		try {
			this._user = await this._getUserInfoFromVSCode();
			return this._user;
		} catch (error) {
			console.error('[VsCodePukuAuthService] Error fetching user:', error);
			return undefined;
		}
	}

	async signIn(): Promise<void> {
		try {
			console.log('[VsCodePukuAuthService] Triggering sign-in via VS Code workbench service');
			// Call VS Code workbench's Puku auth service to start Google OAuth
			await vscode.commands.executeCommand('_puku.signIn');
			// Wait a bit for the sign-in to complete
			await new Promise(resolve => setTimeout(resolve, 1000));
			await this.initialize();
		} catch (error) {
			console.error('[VsCodePukuAuthService] Sign-in failed:', error);
			throw error;
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
		vscode.window.showInformationMessage('Signed out from Puku');
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
