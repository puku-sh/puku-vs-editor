"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuAuthService = exports.IPukuAuthService = exports.PukuAuthStatus = void 0;
const services_1 = require("../../../util/common/services");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
/**
 * Authentication status
 */
var PukuAuthStatus;
(function (PukuAuthStatus) {
    PukuAuthStatus["Unknown"] = "unknown";
    PukuAuthStatus["Authenticated"] = "authenticated";
    PukuAuthStatus["Unauthenticated"] = "unauthenticated";
    PukuAuthStatus["Error"] = "error";
})(PukuAuthStatus || (exports.PukuAuthStatus = PukuAuthStatus = {}));
exports.IPukuAuthService = (0, services_1.createServiceIdentifier)('IPukuAuthService');
/**
 * Puku Auth Service - manages authentication with Puku API
 */
class PukuAuthService extends lifecycle_1.Disposable {
    constructor(pukuEndpoint) {
        super();
        this._onDidChangeAuthStatus = this._register(new event_1.Emitter());
        this.onDidChangeAuthStatus = this._onDidChangeAuthStatus.event;
        this._status = PukuAuthStatus.Unknown;
        this._pukuEndpoint = pukuEndpoint;
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
        return this._status === PukuAuthStatus.Authenticated && !!this._token?.indexingEnabled;
    }
    async initialize() {
        try {
            const token = await this.getToken();
            if (token) {
                await this.getUser();
                this._setStatus(PukuAuthStatus.Authenticated);
            }
            else {
                this._setStatus(PukuAuthStatus.Unauthenticated);
            }
        }
        catch (error) {
            console.error('[PukuAuth] Initialization failed:', error);
            this._setStatus(PukuAuthStatus.Error);
        }
    }
    async getToken() {
        // Return cached token if still valid
        if (this._token && this._token.expiresAt > Date.now() / 1000) {
            return this._token;
        }
        try {
            const response = await fetch(`${this._pukuEndpoint}/puku/v1/token`);
            if (!response.ok) {
                console.error('[PukuAuth] Failed to get token:', response.status);
                return undefined;
            }
            const data = await response.json();
            this._token = {
                token: data.token,
                expiresAt: data.expires_at,
                refreshIn: data.refresh_in,
                endpoints: data.endpoints,
                indexingEnabled: data.indexing_enabled ?? true,
                semanticSearchEnabled: data.semantic_search_enabled ?? true,
            };
            // Schedule token refresh
            this._scheduleTokenRefresh();
            return this._token;
        }
        catch (error) {
            console.error('[PukuAuth] Error fetching token:', error);
            return undefined;
        }
    }
    async getUser() {
        if (this._user) {
            return this._user;
        }
        try {
            const response = await fetch(`${this._pukuEndpoint}/puku/v1/user`);
            if (!response.ok) {
                return undefined;
            }
            const data = await response.json();
            this._user = {
                id: data.id,
                name: data.name,
                email: data.email,
            };
            return this._user;
        }
        catch (error) {
            console.error('[PukuAuth] Error fetching user:', error);
            return undefined;
        }
    }
    async signIn() {
        // Base implementation - override in subclasses for custom auth flow
        throw new Error('signIn() must be implemented by subclass');
    }
    signOut() {
        this._token = undefined;
        this._user = undefined;
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            this._refreshTimeout = undefined;
        }
        this._setStatus(PukuAuthStatus.Unauthenticated);
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
exports.PukuAuthService = PukuAuthService;
//# sourceMappingURL=pukuAuth.js.map