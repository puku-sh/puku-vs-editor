/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku Authentication Service for VS Code layer
 *  Google OAuth flow with Puku API (api.puku.sh)
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IURLService } from '../../../../platform/url/common/url.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { asText, IRequestService } from '../../../../platform/request/common/request.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
// Puku API base URL
const PUKU_API_BASE = 'https://api.puku.sh';
// Storage keys
const PUKU_SESSION_TOKEN_KEY = 'puku.sessionToken';
const PUKU_USER_KEY = 'puku.user';
export const IPukuAuthService = createDecorator('pukuAuthService');
let PukuAuthService = class PukuAuthService extends Disposable {
    constructor(logService, openerService, storageService, urlService, requestService) {
        super();
        this.logService = logService;
        this.openerService = openerService;
        this.storageService = storageService;
        this.urlService = urlService;
        this.requestService = requestService;
        this._onDidChangeSession = this._register(new Emitter());
        this.onDidChangeSession = this._onDidChangeSession.event;
        this.logService.info('[PukuAuthService] Initializing');
        // Register URL handler for OAuth callback
        this._register(this.urlService.registerHandler(this));
    }
    get session() {
        return this._session;
    }
    isAuthenticated() {
        return !!this._session;
    }
    getSessionToken() {
        return this._session?.sessionToken;
    }
    /**
     * Handle URI callback from OAuth flow
     * URI format: puku://Puku.puku-editor/auth/callback?token=xxx
     */
    async handleURL(uri) {
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
            }
            catch {
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
            this.storageService.store(PUKU_SESSION_TOKEN_KEY, token, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.storageService.store(PUKU_USER_KEY, JSON.stringify(userInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this.logService.info('[PukuAuthService] Authenticated as', userInfo.email);
            this._onDidChangeSession.fire(this._session);
            // Resolve pending sign-in
            if (this._pendingSignIn) {
                const authSession = {
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
        }
        catch (error) {
            this.logService.error('[PukuAuthService] Error after OAuth callback:', error);
            if (this._pendingSignIn) {
                this._pendingSignIn.reject(error);
                this._pendingSignIn = undefined;
            }
        }
        return true;
    }
    /**
     * Validate session token and get user info from Puku API
     */
    async validateSessionAndGetUser(sessionToken) {
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
        return JSON.parse(responseText);
    }
    /**
     * Sign in with Google via Puku API
     */
    async signInWithGoogle() {
        this.logService.info('[PukuAuthService] Starting Google OAuth sign-in');
        // Create promise that will be resolved when we get the callback
        const signInPromise = new Promise((resolve, reject) => {
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
        }
        catch (error) {
            this.logService.error('[PukuAuthService] Sign-in error:', error);
            throw error;
        }
        finally {
            if (this._signInTimeout) {
                clearTimeout(this._signInTimeout);
                this._signInTimeout = undefined;
            }
        }
    }
    /**
     * Sign out from Puku
     */
    async signOut() {
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
            }
            catch {
                // Ignore logout errors
            }
        }
        // Clear local state
        this._session = undefined;
        this.storageService.remove(PUKU_SESSION_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(PUKU_USER_KEY, -1 /* StorageScope.APPLICATION */);
        this._onDidChangeSession.fire(undefined);
    }
    /**
     * Initialize - restore session from storage
     */
    async initialize() {
        this.logService.info('[PukuAuthService] Initializing');
        try {
            // Try to restore session from storage
            const storedToken = this.storageService.get(PUKU_SESSION_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
            const storedUserJson = this.storageService.get(PUKU_USER_KEY, -1 /* StorageScope.APPLICATION */);
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
                    this.storageService.store(PUKU_USER_KEY, JSON.stringify(userInfo), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                    this.logService.info('[PukuAuthService] Session restored for', userInfo.email);
                    this._onDidChangeSession.fire(this._session);
                }
                catch (error) {
                    // Session is invalid, clear it
                    this.logService.info('[PukuAuthService] Stored session is invalid, clearing');
                    this.storageService.remove(PUKU_SESSION_TOKEN_KEY, -1 /* StorageScope.APPLICATION */);
                    this.storageService.remove(PUKU_USER_KEY, -1 /* StorageScope.APPLICATION */);
                }
            }
        }
        catch (error) {
            this.logService.error('[PukuAuthService] Error during initialization:', error);
        }
    }
    dispose() {
        if (this._signInTimeout) {
            clearTimeout(this._signInTimeout);
        }
        super.dispose();
    }
};
PukuAuthService = __decorate([
    __param(0, ILogService),
    __param(1, IOpenerService),
    __param(2, IStorageService),
    __param(3, IURLService),
    __param(4, IRequestService)
], PukuAuthService);
export { PukuAuthService };
/**
 * Convert Puku session to VS Code AuthenticationSession
 */
export function pukuSessionToAuthSession(pukuSession) {
    return {
        id: `puku-${pukuSession.user.id}`,
        accessToken: pukuSession.sessionToken,
        account: {
            id: pukuSession.user.id,
            label: pukuSession.user.email,
        },
        scopes: ['openid', 'email', 'profile'],
    };
}
registerSingleton(IPukuAuthService, PukuAuthService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=pukuAuthService.js.map