"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  VS Code-specific implementation of Puku Authentication Service
 *  Delegates to VS Code workbench's PukuAuthService for actual auth
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsCodePukuAuthService = void 0;
const vscode = __importStar(require("vscode"));
const pukuAuth_1 = require("../common/pukuAuth");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const event_1 = require("../../../util/vs/base/common/event");
const PUKU_API_ENDPOINT = 'https://api.puku.sh';
/**
 * VS Code-specific implementation of PukuAuthService
 * Delegates to VS Code workbench's PukuAuthService for actual authentication
 */
class VsCodePukuAuthService extends lifecycle_1.Disposable {
    constructor() {
        super();
        this._onDidChangeAuthStatus = this._register(new event_1.Emitter());
        this.onDidChangeAuthStatus = this._onDidChangeAuthStatus.event;
        this._status = pukuAuth_1.PukuAuthStatus.Unknown;
        // Listen for auth refresh command from workbench
        this._register(vscode.commands.registerCommand('_puku.extensionRefreshAuth', async () => {
            console.log('[VsCodePukuAuthService] Received refresh auth command from workbench');
            await this.initialize();
        }));
        // Poll for auth changes every 2 seconds when unauthenticated
        const pollInterval = setInterval(async () => {
            if (this._status === pukuAuth_1.PukuAuthStatus.Unauthenticated) {
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
    async _getSessionTokenFromVSCode() {
        try {
            const result = await vscode.commands.executeCommand('_puku.getSessionToken');
            return result?.token;
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Error getting session token:', error);
            return undefined;
        }
    }
    /**
     * Get user info from VS Code workbench's Puku auth service
     */
    async _getUserInfoFromVSCode() {
        try {
            const userInfo = await vscode.commands.executeCommand('_puku.getUserInfo');
            return userInfo;
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Error getting user info:', error);
            return undefined;
        }
    }
    get status() {
        return this._status;
    }
    get token() {
        return this._token;
    }
    get user() {
        return this._user;
    }
    isReady() {
        return this._status === pukuAuth_1.PukuAuthStatus.Authenticated && !!this._token?.indexingEnabled;
    }
    async initialize() {
        console.log('[VsCodePukuAuthService] Initializing extension auth service');
        try {
            const token = await this.getToken();
            if (token) {
                await this.getUser();
                this._setStatus(pukuAuth_1.PukuAuthStatus.Authenticated);
                console.log('[VsCodePukuAuthService] Initialized as authenticated');
            }
            else {
                this._setStatus(pukuAuth_1.PukuAuthStatus.Unauthenticated);
                console.log('[VsCodePukuAuthService] Initialized as unauthenticated');
            }
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Initialization failed:', error);
            this._setStatus(pukuAuth_1.PukuAuthStatus.Error);
        }
    }
    async getToken() {
        try {
            // Get session token from VS Code workbench's Puku auth service via command
            let sessionToken = await this._getSessionTokenFromVSCode();
            // Fallback: Try to get API key from VS Code settings if workbench command fails
            if (!sessionToken) {
                const config = vscode.workspace.getConfiguration('puku.embeddings');
                sessionToken = config.get('token');
                if (sessionToken) {
                    console.log('[VsCodePukuAuthService] Using API key from settings (puku.embeddings.token)');
                }
                else {
                    console.log('[VsCodePukuAuthService] No token from workbench or settings');
                    // Clear cached token if no valid session
                    this._token = undefined;
                    return undefined;
                }
            }
            // Return cached token if it matches the session token and is still valid
            if (this._token && this._token.token === sessionToken && this._token.expiresAt > Date.now() / 1000) {
                return this._token;
            }
            console.log('[VsCodePukuAuthService] New session token detected, creating PukuToken');
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
            this._setStatus(pukuAuth_1.PukuAuthStatus.Authenticated);
            this._scheduleTokenRefresh();
            return this._token;
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Error fetching token:', error);
            return undefined;
        }
    }
    async getUser() {
        if (this._user) {
            return this._user;
        }
        try {
            this._user = await this._getUserInfoFromVSCode();
            return this._user;
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Error fetching user:', error);
            return undefined;
        }
    }
    async signIn() {
        try {
            console.log('[VsCodePukuAuthService] Triggering sign-in via VS Code workbench service');
            // Call VS Code workbench's Puku auth service to start Google OAuth
            await vscode.commands.executeCommand('_puku.signIn');
            // Wait a bit for the sign-in to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.initialize();
        }
        catch (error) {
            console.error('[VsCodePukuAuthService] Sign-in failed:', error);
            throw error;
        }
    }
    signOut() {
        this._token = undefined;
        this._user = undefined;
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = undefined;
        }
        this._setStatus(pukuAuth_1.PukuAuthStatus.Unauthenticated);
        vscode.window.showInformationMessage('Signed out from Puku');
    }
    _setStatus(status) {
        if (this._status !== status) {
            this._status = status;
            this._onDidChangeAuthStatus.fire(status);
        }
    }
    _scheduleTokenRefresh() {
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
    dispose() {
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        super.dispose();
    }
}
exports.VsCodePukuAuthService = VsCodePukuAuthService;
//# sourceMappingURL=vscodePukuAuthService.js.map