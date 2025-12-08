"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Puku Authentication Contribution - Registers auth commands and UI
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuAuthContribution = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const logService_1 = require("../../../platform/log/common/logService");
const pukuAuthProvider_1 = require("./pukuAuthProvider");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
/**
 * Puku Authentication Contribution
 * Registers sign-in/sign-out commands, authentication provider, and status bar item
 */
let PukuAuthContribution = class PukuAuthContribution extends lifecycle_1.Disposable {
    constructor(_logService, extensionContext) {
        super();
        this._logService = _logService;
        this.id = 'puku-auth-contribution';
        this._logService.info('PukuAuthContribution: Initializing');
        // Register Puku Authentication Provider
        try {
            // IVSCodeExtensionContext IS the ExtensionContext, not a wrapper
            const authProviderDisposable = pukuAuthProvider_1.PukuAuthProvider.register(extensionContext, this._logService);
            this._register(authProviderDisposable);
            this._logService.info('PukuAuthContribution: Auth provider registered successfully');
        }
        catch (error) {
            this._logService.error('PukuAuthContribution: Failed to register auth provider', error);
        }
        // Create status bar item
        this._statusBarItem = vscode.window.createStatusBarItem('puku.auth.status', vscode.StatusBarAlignment.Right, 100);
        this._register(this._statusBarItem);
        // Register URI handler for OAuth callbacks (once, globally)
        this._register(vscode.window.registerUriHandler({
            handleUri: (uri) => {
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
    async _initializeAuth() {
        try {
            this._logService.info('PukuAuthContribution: Initializing auth, checking for existing sessions');
            // Get existing sessions from the Puku auth provider
            const sessions = await vscode.authentication.getSession('puku', [], { silent: true });
            this._session = sessions ?? undefined;
            if (this._session) {
                this._logService.info(`PukuAuthContribution: Found existing session for ${this._session.account.label}`);
            }
            else {
                this._logService.info('PukuAuthContribution: No existing session found');
            }
            this._updateStatusBar();
        }
        catch (error) {
            this._logService.error('PukuAuthContribution: Error initializing auth:', error);
        }
    }
    _registerCommands() {
        // Sign in command - directly opens OAuth without permission dialog
        this._register(vscode.commands.registerCommand('puku.auth.signIn', async () => {
            this._logService.info('PukuAuthContribution: Sign in command triggered - direct OAuth flow');
            try {
                const PUKU_API_ENDPOINT = 'https://api.puku.sh';
                // Use Google OAuth endpoint (same as VS Code layer)
                const loginUrl = `${PUKU_API_ENDPOINT}/auth/google`;
                this._logService.info(`PukuAuthContribution: Opening Google OAuth URL: ${loginUrl}`);
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
                };
                this._logService.info(`PukuAuthContribution: Successfully signed in as ${this._session.account.label}`);
                this._updateStatusBar();
                vscode.window.showInformationMessage(`Signed in to Puku as ${this._session.account.label}`);
            }
            catch (error) {
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
                vscode.window.showInformationMessage('Signed out from Puku');
            }
        }));
        // Status command (shows account info)
        this._register(vscode.commands.registerCommand('puku.auth.status', async () => {
            if (this._session) {
                const choice = await vscode.window.showInformationMessage(`Signed in as ${this._session.account.label}`, 'Sign Out');
                if (choice === 'Sign Out') {
                    await vscode.commands.executeCommand('puku.auth.signOut');
                }
            }
            else {
                const choice = await vscode.window.showInformationMessage('Not signed in to Puku', 'Sign In');
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
            this._logService.info('PukuAuthContribution: _puku.getSessionToken called');
            // First try to get from local session (extension layer)
            if (this._session && 'accessToken' in this._session) {
                const PUKU_API_ENDPOINT = 'https://api.puku.sh';
                const accessToken = this._session.accessToken;
                this._logService.info('PukuAuthContribution: Returning token from extension layer session');
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
                const workbenchToken = await vscode.commands.executeCommand('_puku.workbench.getSessionToken');
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
            }
            catch (error) {
                this._logService.error('PukuAuthContribution: Failed to get token from workbench layer:', error);
            }
            this._logService.info('PukuAuthContribution: No session token available');
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
                const workbenchUserInfo = await vscode.commands.executeCommand('_puku.workbench.getUserInfo');
                if (workbenchUserInfo) {
                    this._logService.info('PukuAuthContribution: Got user info from VS Code workbench layer');
                    return workbenchUserInfo;
                }
            }
            catch (error) {
                this._logService.debug('PukuAuthContribution: Failed to get user info from workbench layer:', error);
            }
            this._logService.debug('PukuAuthContribution: No user info available');
            return undefined;
        }));
    }
    _updateStatusBar() {
        // Status bar is now handled by VS Code layer (chatStatus.ts)
        // Extension auth UI is disabled to avoid duplicate sign-in buttons
        this._statusBarItem.hide();
    }
    async _waitForAuthCallback() {
        return new Promise((resolve) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this._pendingAuthCallback = undefined;
                resolve(undefined);
            }, 5 * 60 * 1000); // 5 minute timeout
            // Set up callback that will be called by the global URI handler
            this._pendingAuthCallback = (token) => {
                clearTimeout(timeout);
                resolve(token);
            };
        });
    }
    async _getUserInfo(token) {
        try {
            const PUKU_API_ENDPOINT = 'https://api.puku.sh';
            // Use the same endpoint as VS Code layer: /auth/session
            const response = await fetch(`${PUKU_API_ENDPOINT}/auth/session`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
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
        }
        catch (error) {
            this._logService.error('PukuAuthContribution: Failed to fetch user info:', error);
            throw error;
        }
    }
};
exports.PukuAuthContribution = PukuAuthContribution;
exports.PukuAuthContribution = PukuAuthContribution = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, extensionContext_1.IVSCodeExtensionContext)
], PukuAuthContribution);
//# sourceMappingURL=pukuAuth.contribution.js.map