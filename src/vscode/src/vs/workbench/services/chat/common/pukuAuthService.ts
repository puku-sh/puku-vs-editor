/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku Authentication Service for VS Code layer
 *  Google OAuth flow with Puku API (api.puku.sh)
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { AuthenticationSession, AuthenticationSessionAccount } from '../../authentication/common/authentication.js';
import { IURLService, IURLHandler } from '../../../../platform/url/common/url.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';

// Puku API base URL
const PUKU_API_BASE = 'https://api.puku.sh';

// Storage keys
const PUKU_SESSION_TOKEN_KEY = 'puku.sessionToken';
const PUKU_USER_KEY = 'puku.user';

export interface IPukuUser {
	readonly id: string;
	readonly name: string;
	readonly email: string;
	readonly picture?: string;
}

export interface IPukuSession {
	readonly user: IPukuUser;
	readonly sessionToken: string;
	readonly createdAt: number;
}

export const IPukuAuthService = createDecorator<IPukuAuthService>('pukuAuthService');

export interface IPukuAuthService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when Puku session changes
	 */
	readonly onDidChangeSession: Event<IPukuSession | undefined>;

	/**
	 * Current Puku session
	 */
	readonly session: IPukuSession | undefined;

	/**
	 * Check if authenticated with Puku
	 */
	isAuthenticated(): boolean;

	/**
	 * Sign in with Google via Puku API
	 * Opens browser to Puku's Google OAuth flow
	 * Returns AuthenticationSession compatible with VS Code's auth service
	 */
	signInWithGoogle(): Promise<AuthenticationSession>;

	/**
	 * Sign out from Puku
	 */
	signOut(): Promise<void>;

	/**
	 * Initialize - restore session from storage
	 */
	initialize(): Promise<void>;

	/**
	 * Get current session token for API calls
	 */
	getSessionToken(): string | undefined;
}

export class PukuAuthService extends Disposable implements IPukuAuthService, IURLHandler {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeSession = this._register(new Emitter<IPukuSession | undefined>());
	readonly onDidChangeSession: Event<IPukuSession | undefined> = this._onDidChangeSession.event;

	private _session: IPukuSession | undefined;
	private _pendingSignIn: { resolve: (session: AuthenticationSession) => void; reject: (err: Error) => void } | undefined;
	private _signInTimeout: ReturnType<typeof setTimeout> | undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IStorageService private readonly storageService: IStorageService,
		@IURLService private readonly urlService: IURLService,
		@IRequestService private readonly requestService: IRequestService,
	) {
		super();
		this.logService.info('[PukuAuthService] Initializing');

		// Register URL handler for OAuth callback
		this._register(this.urlService.registerHandler(this));
	}

	get session(): IPukuSession | undefined {
		return this._session;
	}

	isAuthenticated(): boolean {
		return !!this._session;
	}

	getSessionToken(): string | undefined {
		return this._session?.sessionToken;
	}

	/**
	 * Handle URI callback from OAuth flow
	 * URI format: puku://Puku.puku-editor/auth/callback?token=xxx
	 */
	async handleURL(uri: URI): Promise<boolean> {
		this.logService.info('[PukuAuthService] Received URI callback:', uri.toString());

		// Check if this is our auth callback (case-insensitive authority check)
		if (uri.authority.toLowerCase() !== 'puku.puku-editor' || uri.path !== '/auth/callback') {
			return false;
		}

		// The query string may be double-encoded (e.g., token%3Dxxx instead of token=xxx)
		// First try with URLSearchParams directly
		let params = new URLSearchParams(uri.query);
		let token = params.get('token');
		this.logService.info('[PukuAuthService] First try - token:', token ? 'found' : 'null');

		// If not found, try decoding the query string first
		if (!token) {
			try {
				const decodedQuery = decodeURIComponent(uri.query);
				this.logService.info('[PukuAuthService] Decoded query:', decodedQuery);
				params = new URLSearchParams(decodedQuery);
				token = params.get('token');
				this.logService.info('[PukuAuthService] Second try - token:', token ? 'found' : 'null');
			} catch {
				// decodeURIComponent can throw on invalid input
				this.logService.error('[PukuAuthService] Failed to decode query string');
			}
		}

		if (!token) {
			this.logService.error('[PukuAuthService] No token in callback URI');
			if (this._pendingSignIn) {
				this._pendingSignIn.reject(new Error('No token received from OAuth flow'));
				this._pendingSignIn = undefined;
			}
			return true;
		}

		try {
			// Validate session and get user info
			const userInfo = await this.validateSessionAndGetUser(token);

			// Store session
			this._session = {
				user: userInfo,
				sessionToken: token,
				createdAt: Date.now(),
			};

			// Persist to storage
			this.storageService.store(PUKU_SESSION_TOKEN_KEY, token, StorageScope.APPLICATION, StorageTarget.MACHINE);
			this.storageService.store(PUKU_USER_KEY, JSON.stringify(userInfo), StorageScope.APPLICATION, StorageTarget.MACHINE);

			this.logService.info('[PukuAuthService] Authenticated as', userInfo.email);
			this._onDidChangeSession.fire(this._session);

			// Resolve pending sign-in
			if (this._pendingSignIn) {
				const authSession: AuthenticationSession = {
					id: `puku-${userInfo.id}`,
					accessToken: token,
					account: {
						id: userInfo.id,
						label: userInfo.email,
					},
					scopes: ['openid', 'email', 'profile'],
				};
				this._pendingSignIn.resolve(authSession);
				this._pendingSignIn = undefined;
			}

			// Clear timeout
			if (this._signInTimeout) {
				clearTimeout(this._signInTimeout);
				this._signInTimeout = undefined;
			}

		} catch (error) {
			this.logService.error('[PukuAuthService] Error after OAuth callback:', error);
			if (this._pendingSignIn) {
				this._pendingSignIn.reject(error as Error);
				this._pendingSignIn = undefined;
			}
		}

		return true;
	}

	/**
	 * Validate session token and get user info from Puku API
	 */
	private async validateSessionAndGetUser(sessionToken: string): Promise<IPukuUser> {
		const response = await this.requestService.request({
			type: 'GET',
			url: `${PUKU_API_BASE}/auth/session`,
			headers: {
				'Authorization': `Bearer ${sessionToken}`,
				'Content-Type': 'application/json',
			},
		}, CancellationToken.None);

		if (!response.res.statusCode || response.res.statusCode !== 200) {
			throw new Error(`Failed to validate session: ${response.res.statusCode}`);
		}

		const responseText = await asText(response);
		if (!responseText) {
			throw new Error('Empty response from session validation');
		}

		return JSON.parse(responseText) as IPukuUser;
	}

	/**
	 * Sign in with Google via Puku API
	 */
	async signInWithGoogle(): Promise<AuthenticationSession> {
		this.logService.info('[PukuAuthService] Starting Google OAuth sign-in');

		// Create promise that will be resolved when we get the callback
		const signInPromise = new Promise<AuthenticationSession>((resolve, reject) => {
			this._pendingSignIn = { resolve, reject };
		});

		// Set a timeout for the OAuth flow (5 minutes)
		this._signInTimeout = setTimeout(() => {
			if (this._pendingSignIn) {
				this._pendingSignIn.reject(new Error('Sign-in timed out'));
				this._pendingSignIn = undefined;
			}
		}, 5 * 60 * 1000);

		try {
			// Open browser to Puku's Google OAuth
			const authUrl = `${PUKU_API_BASE}/auth/google`;
			await this.openerService.open(URI.parse(authUrl), { openExternal: true });

			// Wait for the callback
			const session = await signInPromise;
			return session;

		} catch (error) {
			this.logService.error('[PukuAuthService] Sign-in error:', error);
			throw error;

		} finally {
			if (this._signInTimeout) {
				clearTimeout(this._signInTimeout);
				this._signInTimeout = undefined;
			}
		}
	}

	/**
	 * Sign out from Puku
	 */
	async signOut(): Promise<void> {
		this.logService.info('[PukuAuthService] Signing out');

		// Logout on server
		if (this._session?.sessionToken) {
			try {
				await this.requestService.request({
					type: 'POST',
					url: `${PUKU_API_BASE}/auth/logout`,
					headers: {
						'Authorization': `Bearer ${this._session.sessionToken}`,
						'Content-Type': 'application/json',
					},
				}, CancellationToken.None);
			} catch {
				// Ignore logout errors
			}
		}

		// Clear local state
		this._session = undefined;
		this.storageService.remove(PUKU_SESSION_TOKEN_KEY, StorageScope.APPLICATION);
		this.storageService.remove(PUKU_USER_KEY, StorageScope.APPLICATION);
		this._onDidChangeSession.fire(undefined);
	}

	/**
	 * Initialize - restore session from storage
	 */
	async initialize(): Promise<void> {
		this.logService.info('[PukuAuthService] Initializing');

		try {
			// Try to restore session from storage
			const storedToken = this.storageService.get(PUKU_SESSION_TOKEN_KEY, StorageScope.APPLICATION);
			const storedUserJson = this.storageService.get(PUKU_USER_KEY, StorageScope.APPLICATION);

			if (storedToken && storedUserJson) {
				this.logService.info('[PukuAuthService] Found stored session, validating...');

				try {
					// Validate token is still valid
					const userInfo = await this.validateSessionAndGetUser(storedToken);

					this._session = {
						user: userInfo,
						sessionToken: storedToken,
						createdAt: Date.now(),
					};

					// Update stored user info
					this.storageService.store(PUKU_USER_KEY, JSON.stringify(userInfo), StorageScope.APPLICATION, StorageTarget.MACHINE);

					this.logService.info('[PukuAuthService] Session restored for', userInfo.email);
					this._onDidChangeSession.fire(this._session);

				} catch (error) {
					// Session is invalid, clear it
					this.logService.info('[PukuAuthService] Stored session is invalid, clearing');
					this.storageService.remove(PUKU_SESSION_TOKEN_KEY, StorageScope.APPLICATION);
					this.storageService.remove(PUKU_USER_KEY, StorageScope.APPLICATION);
				}
			}
		} catch (error) {
			this.logService.error('[PukuAuthService] Error during initialization:', error);
		}
	}

	override dispose(): void {
		if (this._signInTimeout) {
			clearTimeout(this._signInTimeout);
		}
		super.dispose();
	}
}

/**
 * Convert Puku session to VS Code AuthenticationSession
 */
export function pukuSessionToAuthSession(pukuSession: IPukuSession): AuthenticationSession {
	return {
		id: `puku-${pukuSession.user.id}`,
		accessToken: pukuSession.sessionToken,
		account: {
			id: pukuSession.user.id,
			label: pukuSession.user.email,
		} as AuthenticationSessionAccount,
		scopes: ['openid', 'email', 'profile'],
	};
}

registerSingleton(IPukuAuthService, PukuAuthService, InstantiationType.Eager);

// Register commands for extensions to access Puku auth from the workbench layer
// Command to get session token from workbench PukuAuthService
CommandsRegistry.registerCommand('_puku.workbench.getSessionToken', (accessor) => {
	const logService = accessor.get(ILogService);
	logService.info('[PukuAuthService] _puku.workbench.getSessionToken called');
	const pukuAuthService = accessor.get(IPukuAuthService);
	const token = pukuAuthService.getSessionToken();
	logService.info(`[PukuAuthService] Workbench token: ${token ? 'FOUND (length: ' + token.length + ')' : 'NOT FOUND'}`);
	return token;
});

// Command to get user info from workbench PukuAuthService
CommandsRegistry.registerCommand('_puku.workbench.getUserInfo', (accessor) => {
	const pukuAuthService = accessor.get(IPukuAuthService);
	const session = pukuAuthService.session;
	if (!session) {
		return undefined;
	}
	return {
		id: session.user.id,
		name: session.user.name,
		email: session.user.email
	};
});
