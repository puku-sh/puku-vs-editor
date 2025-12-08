"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuTokenManager = exports.PukuLoginRequired = void 0;
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const pukuAuth_1 = require("../../../extension/pukuIndexing/common/pukuAuth");
const copilotToken_1 = require("../common/copilotToken");
const logService_1 = require("../../log/common/logService");
/**
 * Error thrown when Puku authentication is required but user is not signed in.
 * This matches the pattern of GitHubLoginFailed error from VSCodeCopilotTokenManager.
 */
class PukuLoginRequired extends Error {
    constructor() {
        super('PukuLoginRequired');
        this.name = 'PukuLoginRequired';
    }
}
exports.PukuLoginRequired = PukuLoginRequired;
/**
 * Puku Token Manager - implements ICopilotTokenManager using Puku authentication
 * instead of GitHub Copilot authentication. This allows the chat system to work
 * with Puku tokens seamlessly.
 */
let PukuTokenManager = class PukuTokenManager extends lifecycle_1.Disposable {
    constructor(_logService, _pukuAuthService) {
        super();
        this._logService = _logService;
        this._pukuAuthService = _pukuAuthService;
        // Token managers need a refresh event, but Puku tokens are long-lived (7 days)
        // so we just provide an empty event
        this.onDidCopilotTokenRefresh = event_1.Event.None;
        this._logService.info('[PukuTokenManager] Initialized - using Puku authentication instead of GitHub Copilot');
    }
    async getCopilotToken(force) {
        this._logService.debug(`[PukuTokenManager] Getting Puku token (force: ${force})...`);
        // Get Puku token from Puku auth service
        const pukuToken = await this._pukuAuthService.getToken();
        if (!pukuToken) {
            this._logService.debug('[PukuTokenManager] No Puku token available - will trigger sign-in on first chat use');
            // Throw PukuLoginRequired error - matches GitHubLoginFailed pattern
            // The chat entitlement service will catch this and trigger sign-in flow
            throw new PukuLoginRequired();
        }
        // Check token expiration with 5-minute buffer (following reference implementation pattern)
        const nowSeconds = Math.floor(Date.now() / 1000);
        const expirationBuffer = 60 * 5; // 5 minutes
        const isExpiringSoon = pukuToken.expiresAt - expirationBuffer < nowSeconds;
        if (isExpiringSoon) {
            this._logService.info('[PukuTokenManager] Puku token expiring within 5 minutes, user should re-authenticate');
            // For now, we'll still use the token but log the warning
            // TODO: Implement token refresh mechanism in IPukuAuthService
        }
        this._logService.debug('[PukuTokenManager] Got Puku token successfully');
        // Convert Puku token to CopilotToken format expected by the system
        // This allows the rest of the codebase to work without modification
        const extendedTokenInfo = {
            token: pukuToken.token,
            expires_at: pukuToken.expiresAt,
            refresh_in: pukuToken.refreshIn,
            username: pukuToken.username || 'puku-user',
            copilot_plan: 'business', // Puku is always business-tier
            isVscodeTeamMember: false,
        };
        return new copilotToken_1.CopilotToken(extendedTokenInfo);
    }
    resetCopilotToken(httpError) {
        // For Puku, we don't need to reset tokens on HTTP errors
        // The token is managed by the Puku auth service
        this._logService.debug(`[PukuTokenManager] Reset token requested (HTTP ${httpError}) - Puku tokens are managed by auth service`);
    }
};
exports.PukuTokenManager = PukuTokenManager;
exports.PukuTokenManager = PukuTokenManager = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, pukuAuth_1.IPukuAuthService)
], PukuTokenManager);
//# sourceMappingURL=pukuTokenManager.js.map