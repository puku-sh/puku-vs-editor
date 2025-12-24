/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku Authentication Contribution - Registers auth commands and UI
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IExtensionContribution } from '../../common/contributions';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { PukuAuthProvider } from './pukuAuthProvider';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';

/**
 * Puku Authentication Contribution
 * Registers sign-in/sign-out commands, authentication provider, and status bar item
 */
export class PukuAuthContribution extends Disposable implements IExtensionContribution {
	public readonly id = 'puku-auth-contribution';

	private _statusBarItem: vscode.StatusBarItem;
	private _session: vscode.AuthenticationSession | undefined;
	private _pendingAuthCallback?: (token: string | undefined) => void;
	private _pendingState?: string;

	constructor(
		@ILogService private readonly _logService: ILogService,
		@IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
	) {
		super();
		this._logService.info('PukuAuthContribution: Initializing');

		// Register Puku Authentication Provider
		try {
			// IVSCodeExtensionContext IS the ExtensionContext, not a wrapper
			const authProviderDisposable = PukuAuthProvider.register(extensionContext, this._logService);
			this._register(authProviderDisposable);
			this._logService.info('PukuAuthContribution: Auth provider registered successfully');
		} catch (error) {
			this._logService.error('PukuAuthContribution: Failed to register auth provider', error);
		}

		// Create status bar item
		this._statusBarItem = vscode.window.createStatusBarItem(
			'puku.auth.status',
			vscode.StatusBarAlignment.Right,
			100
		);
		this._register(this._statusBarItem);

		// Register URI handler for OAuth callbacks (once, globally)
		this._register(vscode.window.registerUriHandler({
			handleUri: (uri: vscode.Uri) => {
				this._logService.info(`PukuAuthContribution: Received auth callback: ${uri.toString()}`);

				// Parse token from query string
				const query = new URLSearchParams(uri.query);
				const token = query.get('token');

				// Resolve pending auth callback if any
				if (this._pendingAuthCallback) {
					this._pendingAuthCallback(token ?? undefined);
					this._pendingAuthCallback = undefined;
				}
			}
		}));

		// Register commands
		this._registerCommands();

		// Initialize auth session
		this._initializeAuth();

		// Listen for auth session changes
		this._register(vscode.authentication.onDidChangeSessions(e => {
			if (e.provider.id === 'puku') {
				this._logService.info('PukuAuthContribution: Auth sessions changed');
				this._initializeAuth();
			}
		}));
	}

	private async _initializeAuth(): Promise<void> {
		try {
			this._logService.info('PukuAuthContribution: Initializing auth, checking for existing sessions');

			// Get existing sessions from the Puku auth provider
			const sessions = await vscode.authentication.getSession('puku', [], { silent: true });
			this._session = sessions ?? undefined;

			if (this._session) {
				this._logService.info(`PukuAuthContribution: Found existing session for ${this._session.account.label}`);

				// Refresh context keys to update UI with existing session
				this._logService.info('PukuAuthContribution: Refreshing context keys for existing session');
				await vscode.commands.executeCommand('puku.refreshToken');
			} else {
				this._logService.info('PukuAuthContribution: No existing session found');
			}

			this._updateStatusBar();
		} catch (error) {
			this._logService.error('PukuAuthContribution: Error initializing auth:', error);
		}
	}

	private _registerCommands(): void {
		// Sign in command - directly opens OAuth without permission dialog
		this._register(vscode.commands.registerCommand('puku.auth.signIn', async () => {
			this._logService.info('PukuAuthContribution: Sign in command triggered - direct OAuth flow');
			try {
				const PUKU_API_ENDPOINT = 'https://api.puku.sh';

				// Generate callback URI for redirect
				const callbackUri = await vscode.env.asExternalUri(
					vscode.Uri.parse(`${vscode.env.uriScheme}://GitHub.puku-editor/callback`)
				);
				this._logService.info(`PukuAuthContribution: Generated callback URI: ${callbackUri.toString()}`);

				// Generate state parameter for CSRF protection
				const state = this._generateState();
				this._logService.info(`PukuAuthContribution: Generated state: ${state}`);

				// Store state for callback verification
				this._pendingState = state;

				// Use Google OAuth endpoint with callback URL
				const loginUrl = `${PUKU_API_ENDPOINT}/auth/google?callback=${encodeURIComponent(callbackUri.toString())}&state=${state}`;

				this._logService.info(`PukuAuthContribution: Opening Google OAuth URL: ${loginUrl.replace(state, '***')}`);

				// Open browser directly - no permission dialog
				await vscode.env.openExternal(vscode.Uri.parse(loginUrl));

				this._logService.info('PukuAuthContribution: Waiting for OAuth callback...');

				// Wait for OAuth callback
				const token = await this._waitForAuthCallback();

				if (!token) {
					this._logService.error('PukuAuthContribution: No token received from OAuth callback');
					throw new Error('Authentication failed - no token received');
				}

				this._logService.info('PukuAuthContribution: Token received, fetching user info...');

				// Fetch user info
				const userInfo = await this._getUserInfo(token);

				this._logService.info(`PukuAuthContribution: User info received: ${JSON.stringify(userInfo)}`);

				// Create session directly
				this._session = {
					id: userInfo.id,
					accessToken: token,
					account: {
						id: userInfo.id,
						label: userInfo.name || userInfo.email
					},
					scopes: []
				} as any;

				this._logService.info(`PukuAuthContribution: Successfully signed in as ${this._session.account.label}`);
				this._logService.info(`PukuAuthContribution: Session created with token length: ${token.length}`);

				// Create .vscode/settings.json in workspace folders
				await this._createWorkspaceSettings(token);
				this._updateStatusBar();

				// Also try to create session in the auth provider for persistence
				try {
					this._logService.info('PukuAuthContribution: Creating session in auth provider for persistence');
					await vscode.authentication.getSession('puku', [], { createIfNone: true, silent: true });
				} catch (e) {
					this._logService.warn('PukuAuthContribution: Could not create session in auth provider (non-critical): ' + e);
				}

				// Refresh context keys to update UI after authentication
				// Small delay to ensure session is fully set
				await new Promise(resolve => setTimeout(resolve, 100));
				this._logService.info('PukuAuthContribution: Refreshing context keys after sign-in');
				await vscode.commands.executeCommand('puku.refreshToken');

				vscode.window.showInformationMessage(`Signed in to Puku as ${this._session.account.label}`);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				this._logService.error(`PukuAuthContribution: Sign-in failed: ${errorMessage}`, error);
				vscode.window.showErrorMessage(`Failed to sign in to Puku: ${errorMessage}`);
			}
		}));

		// Sign out command
		this._register(vscode.commands.registerCommand('puku.auth.signOut', async () => {
			this._logService.info('PukuAuthContribution: Sign out command triggered');
			if (this._session) {
				// For now, just clear the local session reference
				// The auth provider will handle the actual session removal
				this._session = undefined;
				this._updateStatusBar();

				// Refresh context keys to update UI after sign-out
				this._logService.info('PukuAuthContribution: Refreshing context keys after sign-out');
				await vscode.commands.executeCommand('puku.refreshToken');

				vscode.window.showInformationMessage('Signed out from Puku');
			}
		}));

		// Status command (shows account info)
		this._register(vscode.commands.registerCommand('puku.auth.status', async () => {
			if (this._session) {
				const choice = await vscode.window.showInformationMessage(
					`Signed in as ${this._session.account.label}`,
					'Sign Out'
				);
				if (choice === 'Sign Out') {
					await vscode.commands.executeCommand('puku.auth.signOut');
				}
			} else {
				const choice = await vscode.window.showInformationMessage(
					'Not signed in to Puku',
					'Sign In'
				);
				if (choice === 'Sign In') {
					await vscode.commands.executeCommand('puku.auth.signIn');
				}
			}
		}));

		// Internal command: Refresh auth state (called by chat entitlement service)
		this._register(vscode.commands.registerCommand('_puku.refreshAuth', async () => {
			this._logService.info('PukuAuthContribution: Refresh auth command triggered');
			await this._initializeAuth();
		}));

		// Internal command: Get session token
		// This is called by other services to get the current auth token
		this._register(vscode.commands.registerCommand('_puku.getSessionToken', async () => {
			this._logService.info(`PukuAuthContribution: _puku.getSessionToken called. Has session: ${!!this._session}, Has accessToken: ${this._session && 'accessToken' in this._session}`);

			// First try to get from local session (extension layer)
			if (this._session && 'accessToken' in this._session) {
				const PUKU_API_ENDPOINT = 'https://api.puku.sh';
				const accessToken = (this._session as any).accessToken;

				this._logService.info(`PukuAuthContribution: Returning token from extension layer session (account: ${this._session.account.label})`);
				return {
					token: accessToken,
					expiresAt: (Date.now() / 1000) + (7 * 24 * 3600), // 7 days
					refreshIn: (7 * 24 * 3600) - 3600, // Refresh 1 hour before expiry
					endpoints: {
						api: PUKU_API_ENDPOINT,
						embeddings: `${PUKU_API_ENDPOINT}/v1/embeddings`
					},
					indexingEnabled: true,
					semanticSearchEnabled: true,
				};
			}

			// Fallback: Try to get from VS Code workbench layer
			try {
				this._logService.info('PukuAuthContribution: No extension session, calling _puku.workbench.getSessionToken');
				const workbenchToken = await vscode.commands.executeCommand<string | undefined>('_puku.workbench.getSessionToken');
				this._logService.info(`PukuAuthContribution: Workbench token result: ${workbenchToken ? 'FOUND (length: ' + workbenchToken.length + ')' : 'NOT FOUND'}`);

				if (workbenchToken) {
					this._logService.info('PukuAuthContribution: Got token from VS Code workbench layer');
					const PUKU_API_ENDPOINT = 'https://api.puku.sh';
					return {
						token: workbenchToken,
						expiresAt: (Date.now() / 1000) + (7 * 24 * 3600), // 7 days
						refreshIn: (7 * 24 * 3600) - 3600, // Refresh 1 hour before expiry
						endpoints: {
							api: PUKU_API_ENDPOINT,
							embeddings: `${PUKU_API_ENDPOINT}/v1/embeddings`
						},
						indexingEnabled: true,
						semanticSearchEnabled: true,
					};
				}
			} catch (error) {
				this._logService.error('PukuAuthContribution: Failed to get token from workbench layer:', error);
			}

			this._logService.warn('PukuAuthContribution: No session token available - user needs to sign in');
			return undefined;
		}));

		// Internal command: Get user info
		// This is called by other services to get current user info
		this._register(vscode.commands.registerCommand('_puku.getUserInfo', async () => {
			// First try to get from local session (extension layer)
			if (this._session) {
				this._logService.debug('PukuAuthContribution: Returning user info from extension layer session');
				return {
					id: this._session.account.id,
					name: this._session.account.label,
					email: this._session.account.label, // Using label as email for now
				};
			}

			// Fallback: Try to get from VS Code workbench layer
			try {
				const workbenchUserInfo = await vscode.commands.executeCommand<{ id: string; name: string; email: string } | undefined>('_puku.workbench.getUserInfo');
				if (workbenchUserInfo) {
					this._logService.info('PukuAuthContribution: Got user info from VS Code workbench layer');
					return workbenchUserInfo;
				}
			} catch (error) {
				this._logService.debug('PukuAuthContribution: Failed to get user info from workbench layer: ' + error);
			}

			this._logService.debug('PukuAuthContribution: No user info available');
			return undefined;
		}));
	}

	private _updateStatusBar(): void {
		// Status bar is now handled by VS Code layer (chatStatus.ts)
		// Extension auth UI is disabled to avoid duplicate sign-in buttons
		this._statusBarItem.hide();
	}

	private async _waitForAuthCallback(): Promise<string | undefined> {
		return new Promise((resolve) => {
			// Set up timeout
			const timeout = setTimeout(() => {
				this._pendingAuthCallback = undefined;
				resolve(undefined);
			}, 5 * 60 * 1000); // 5 minute timeout

			// Set up callback that will be called by the global URI handler
			this._pendingAuthCallback = (token: string | undefined) => {
				clearTimeout(timeout);
				resolve(token);
			};
		});
	}

	private async _getUserInfo(token: string): Promise<{ id: string; name?: string; email: string }> {
		try {
			const PUKU_API_ENDPOINT = 'https://api.puku.sh';
			// Use the same endpoint as PukuAuthProvider: /puku/v1/user
			const response = await fetch(`${PUKU_API_ENDPOINT}/puku/v1/user`, {
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				this._logService.error(`PukuAuthContribution: Failed to fetch user info: ${response.status} ${response.statusText}`);
				throw new Error(`Failed to fetch user info: ${response.statusText}`);
			}

			const data = await response.json() as { id?: string; user_id?: string; name?: string; username?: string; email?: string };
			this._logService.info(`PukuAuthContribution: User info response: ${JSON.stringify(data)}`);
			return {
				id: data.id || data.user_id || 'unknown',
				name: data.name || data.username,
				email: data.email || 'unknown'
			};
		} catch (error) {
			this._logService.error('PukuAuthContribution: Failed to fetch user info:', error);
			throw error;
		}
	}

	/**
	 * Generate a random state parameter for CSRF protection
	 */
	private _generateState(): string {
		const array = new Uint8Array(16);
		crypto.getRandomValues(array);
		return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Create .vscode/settings.json in workspace folders with the token
	 */
	private async _createWorkspaceSettings(token: string): Promise<void> {
		try {
			const workspaceFolders = vscode.workspace.workspaceFolders;
			if (!workspaceFolders || workspaceFolders.length === 0) {
				this._logService.info('PukuAuthContribution: No workspace folders open, skipping settings.json creation');
				return;
			}

			this._logService.info(`PukuAuthContribution: Creating .vscode/settings.json in ${workspaceFolders.length} workspace(s)`);

			for (const folder of workspaceFolders) {
				const vscodeUri = vscode.Uri.joinPath(folder.uri, '.vscode', 'settings.json');

				// Check if settings.json already exists
				try {
					await vscode.workspace.fs.stat(vscodeUri);
					this._logService.info(`PukuAuthContribution: Settings file already exists at ${vscodeUri.toString()}, updating...`);

					// Read existing settings
					const existingData = await vscode.workspace.fs.readFile(vscodeUri);
					const existingSettings = JSON.parse(Buffer.from(existingData).toString('utf-8'));

					// Merge with new settings
					const updatedSettings = {
						...existingSettings,
						'files.autoSave': 'afterDelay',
						'puku.embeddings.token': token
					};

					// Write updated settings
					const updatedContent = JSON.stringify(updatedSettings, null, '\t');
					await vscode.workspace.fs.writeFile(vscodeUri, Buffer.from(updatedContent, 'utf-8'));
					this._logService.info(`PukuAuthContribution: Updated settings file at ${vscodeUri.toString()}`);
				} catch (error) {
					// File doesn't exist, create it
					this._logService.info(`PukuAuthContribution: Creating new settings file at ${vscodeUri.toString()}`);

					// Create .vscode directory first
					const vscodeDirUri = vscode.Uri.joinPath(folder.uri, '.vscode');
					try {
						await vscode.workspace.fs.createDirectory(vscodeDirUri);
					} catch (e) {
						// Directory might already exist, ignore error
					}

					// Create settings.json
					const settings = {
						'files.autoSave': 'afterDelay',
						'puku.embeddings.token': token
					};
					const content = JSON.stringify(settings, null, '\t');
					await vscode.workspace.fs.writeFile(vscodeUri, Buffer.from(content, 'utf-8'));
					this._logService.info(`PukuAuthContribution: Created settings file at ${vscodeUri.toString()}`);
				}
			}
		} catch (error) {
			this._logService.error('PukuAuthContribution: Failed to create workspace settings:', error);
			// Don't throw - this is non-critical
		}
	}
}
