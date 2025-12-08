"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
exports.PukuAuthProvider = void 0;
const vscode = __importStar(require("vscode"));
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const PUKU_AUTH_PROVIDER_ID = 'puku';
const PUKU_AUTH_PROVIDER_LABEL = 'Puku';
const PUKU_API_ENDPOINT = 'https://api.puku.sh';
/**
 * Puku Authentication Provider
 * Implements VS Code's AuthenticationProvider interface for Puku authentication
 */
class PukuAuthProvider extends lifecycle_1.Disposable {
    constructor(_context, _logService) {
        super();
        this._context = _context;
        this._logService = _logService;
        this._sessions = [];
        this._onDidChangeSessions = this._register(new vscode.EventEmitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._logService.info('[PukuAuthProvider] Initializing');
        // Load any existing sessions from storage
        this._loadSessions();
    }
    async getSessions(scopes) {
        this._logService.debug(`[PukuAuthProvider] getSessions called with scopes: ${scopes?.join(', ')}`);
        return this._sessions;
    }
    async createSession(scopes) {
        this._logService.info('[PukuAuthProvider] createSession called - opening login flow');
        try {
            // Open Puku login page
            const loginUrl = `${PUKU_API_ENDPOINT}/auth/vscode`;
            const callbackUri = await vscode.env.asExternalUri(vscode.Uri.parse(`${vscode.env.uriScheme}://Puku.puku-editor/auth-callback`));
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
            const session = {
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
        }
        catch (error) {
            this._logService.error('[PukuAuthProvider] Failed to create session:', error);
            throw error;
        }
    }
    async removeSession(sessionId) {
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
    async _waitForAuthCallback() {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                disposable.dispose();
                resolve(undefined);
            }, 5 * 60 * 1000); // 5 minute timeout
            const disposable = vscode.window.registerUriHandler({
                handleUri: (uri) => {
                    this._logService.info(`[PukuAuthProvider] Received auth callback: ${uri.toString()}`);
                    // Parse token from query string
                    const query = new URLSearchParams(uri.query);
                    const token = query.get('token');
                    clearTimeout(timeout);
                    disposable.dispose();
                    if (token) {
                        resolve(token);
                    }
                    else {
                        resolve(undefined);
                    }
                }
            });
        });
    }
    async _getUserInfo(token) {
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
        }
        catch (error) {
            this._logService.error('[PukuAuthProvider] Failed to fetch user info:', error);
            throw error;
        }
    }
    async _loadSessions() {
        try {
            const storedSessions = this._context.globalState.get('puku.auth.sessions', []);
            this._sessions = storedSessions;
            this._logService.info(`[PukuAuthProvider] Loaded ${this._sessions.length} session(s) from storage`);
        }
        catch (error) {
            this._logService.error('[PukuAuthProvider] Failed to load sessions:', error);
            this._sessions = [];
        }
    }
    async _saveSessions() {
        try {
            await this._context.globalState.update('puku.auth.sessions', this._sessions);
            this._logService.debug(`[PukuAuthProvider] Saved ${this._sessions.length} session(s) to storage`);
        }
        catch (error) {
            this._logService.error('[PukuAuthProvider] Failed to save sessions:', error);
        }
    }
    /**
     * Register the Puku authentication provider with VS Code
     */
    static register(context, logService) {
        const provider = new PukuAuthProvider(context, logService);
        const disposable = vscode.authentication.registerAuthenticationProvider(PUKU_AUTH_PROVIDER_ID, PUKU_AUTH_PROVIDER_LABEL, provider, { supportsMultipleAccounts: false });
        logService.info('[PukuAuthProvider] Registered authentication provider');
        return vscode.Disposable.from(disposable, provider);
    }
}
exports.PukuAuthProvider = PukuAuthProvider;
//# sourceMappingURL=pukuAuthProvider.js.map