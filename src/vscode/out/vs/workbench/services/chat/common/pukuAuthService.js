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
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVrdUF1dGhTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NoYXQvY29tbW9uL3B1a3VBdXRoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztnR0FJZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUU5RyxPQUFPLEVBQUUsV0FBVyxFQUFlLE1BQU0sd0NBQXdDLENBQUM7QUFDbEYsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEYsb0JBQW9CO0FBQ3BCLE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUFDO0FBRTVDLGVBQWU7QUFDZixNQUFNLHNCQUFzQixHQUFHLG1CQUFtQixDQUFDO0FBQ25ELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQztB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