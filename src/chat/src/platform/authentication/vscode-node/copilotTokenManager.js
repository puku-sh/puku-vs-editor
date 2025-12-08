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
exports.VSCodeCopilotTokenManager = exports.ChatDisabledError = exports.EnterpriseManagedError = exports.ContactSupportError = exports.SubscriptionExpiredError = exports.NotSignedUpError = void 0;
const vscode_1 = require("vscode");
const taskSingler_1 = require("../../../util/common/taskSingler");
const configurationService_1 = require("../../configuration/common/configurationService");
const capiClient_1 = require("../../endpoint/common/capiClient");
const domainService_1 = require("../../endpoint/common/domainService");
const envService_1 = require("../../env/common/envService");
const githubService_1 = require("../../github/common/githubService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const copilotToken_1 = require("../common/copilotToken");
const copilotTokenManager_1 = require("../common/copilotTokenManager");
const copilotTokenManager_2 = require("../node/copilotTokenManager");
//Flag if we've shown message about broken oauth token.
let shown401Message = false;
class NotSignedUpError extends Error {
}
exports.NotSignedUpError = NotSignedUpError;
class SubscriptionExpiredError extends Error {
}
exports.SubscriptionExpiredError = SubscriptionExpiredError;
class ContactSupportError extends Error {
}
exports.ContactSupportError = ContactSupportError;
class EnterpriseManagedError extends Error {
}
exports.EnterpriseManagedError = EnterpriseManagedError;
class ChatDisabledError extends Error {
}
exports.ChatDisabledError = ChatDisabledError;
let VSCodeCopilotTokenManager = class VSCodeCopilotTokenManager extends copilotTokenManager_2.BaseCopilotTokenManager {
    constructor(logService, telemetryService, domainService, capiClientService, fetcherService, envService, configurationService) {
        super(new githubService_1.BaseOctoKitService(capiClientService, fetcherService, logService, telemetryService), logService, telemetryService, domainService, capiClientService, fetcherService, envService);
        this.configurationService = configurationService;
        this._taskSingler = new taskSingler_1.TaskSingler();
    }
    async getCopilotToken(force) {
        if (!this.copilotToken || this.copilotToken.expires_at - (60 * 5 /* 5min */) < (0, copilotTokenManager_1.nowSeconds)() || force) {
            try {
                this._logService.debug(`Getting CopilotToken (force: ${force})...`);
                this.copilotToken = await this._authShowWarnings();
                this._logService.debug(`Got CopilotToken (force: ${force}).`);
            }
            catch (e) {
                this._logService.debug(`Getting CopilotToken (force: ${force}) threw error: ${e}`);
                this.copilotToken = undefined;
                throw e;
            }
        }
        return new copilotToken_1.CopilotToken(this.copilotToken);
    }
    async _auth() {
        // Puku Editor: Always fetch token from proxy when Puku AI endpoint is configured
        const pukuAIEndpoint = this.configurationService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
        if (pukuAIEndpoint) {
            this._logService.info(`[PukuTokenManager] Puku AI endpoint configured, fetching token from proxy`);
            try {
                const tokenUrl = `${pukuAIEndpoint}/api/tokens/issue`;
                const response = await this._fetcherService.fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'puku-user',
                        metadata: {
                            source: 'puku-editor',
                            version: this._envService.getVersion(),
                        },
                    }),
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    this._logService.error(`[PukuTokenManager] Failed to fetch token from proxy: ${response.status} ${errorText}`);
                    return {
                        kind: 'failure',
                        reason: 'FailedToGetToken',
                        message: `Proxy returned ${response.status}: ${errorText}`
                    };
                }
                const tokenData = await response.json();
                if (!tokenData.token) {
                    this._logService.error(`[PukuTokenManager] Proxy returned invalid token data`);
                    return {
                        kind: 'failure',
                        reason: 'FailedToGetToken',
                        message: 'Token missing in proxy response'
                    };
                }
                // Convert expires_at from milliseconds to seconds if needed
                const expiresAt = tokenData.expires_at > 10000000000
                    ? Math.floor(tokenData.expires_at / 1000)
                    : tokenData.expires_at;
                this._logService.info(`[PukuTokenManager] Successfully fetched token from proxy, expires at ${new Date(expiresAt * 1000).toISOString()}`);
                return {
                    kind: 'success',
                    token: tokenData.token,
                    expires_at: expiresAt,
                    refresh_in: tokenData.refresh_in,
                    username: tokenData.userId || 'puku-user',
                    copilot_plan: 'individual',
                    isVscodeTeamMember: false,
                    chat_enabled: true,
                    organization_list: [],
                    individual: true,
                    endpoints: {
                        'api': pukuAIEndpoint,
                        'telemetry': '',
                        'proxy': pukuAIEndpoint,
                    },
                };
            }
            catch (error) {
                this._logService.error(`[PukuTokenManager] Error fetching token from proxy:`, error);
                return {
                    kind: 'failure',
                    reason: 'FailedToGetToken',
                    message: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        }
        // If no Puku AI endpoint is configured, return error (no fallback to GitHub)
        this._logService.warn('[PukuTokenManager] No Puku AI endpoint configured');
        return {
            kind: 'failure',
            reason: 'FailedToGetToken',
            message: 'Puku AI endpoint must be configured'
        };
    }
    async _authShowWarnings() {
        const tokenResult = await this._taskSingler.getOrCreate('auth', () => this._auth());
        if (tokenResult.kind === 'failure' && tokenResult.reason === 'NotAuthorized') {
            const message = tokenResult.message;
            switch (tokenResult.notification_id) {
                case copilotToken_1.TokenErrorNotificationId.NotSignedUp:
                case copilotToken_1.TokenErrorNotificationId.NoCopilotAccess:
                    throw new NotSignedUpError(message ?? 'User not authorized');
                case copilotToken_1.TokenErrorNotificationId.SubscriptionEnded:
                    throw new SubscriptionExpiredError(message);
                case copilotToken_1.TokenErrorNotificationId.EnterPriseManagedUserAccount:
                    throw new EnterpriseManagedError(message);
                case copilotToken_1.TokenErrorNotificationId.ServerError:
                case copilotToken_1.TokenErrorNotificationId.FeatureFlagBlocked:
                case copilotToken_1.TokenErrorNotificationId.SpammyUser:
                case copilotToken_1.TokenErrorNotificationId.SnippyNotConfigured:
                    throw new ContactSupportError(message);
            }
        }
        if (tokenResult.kind === 'failure' && tokenResult.reason === 'HTTP401') {
            const message = 'Your GitHub token is invalid. Please sign out from your GitHub account using the VS Code accounts menu and try again.';
            if (!shown401Message) {
                shown401Message = true;
                vscode_1.window.showWarningMessage(message);
            }
            throw Error(message);
        }
        if (tokenResult.kind === 'failure' && tokenResult.reason === 'GitHubLoginFailed') {
            throw Error('GitHubLoginFailed');
        }
        if (tokenResult.kind === 'failure' && tokenResult.reason === 'RateLimited') {
            throw Error("Your account has exceeded GitHub's API rate limit. Please try again later.");
        }
        if (tokenResult.kind === 'failure') {
            throw Error('Failed to get copilot token');
        }
        if (tokenResult.kind === 'success' && tokenResult.chat_enabled === false) {
            throw new ChatDisabledError('Copilot Chat is disabled');
        }
        return tokenResult;
    }
};
exports.VSCodeCopilotTokenManager = VSCodeCopilotTokenManager;
exports.VSCodeCopilotTokenManager = VSCodeCopilotTokenManager = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, domainService_1.IDomainService),
    __param(3, capiClient_1.ICAPIClientService),
    __param(4, fetcherService_1.IFetcherService),
    __param(5, envService_1.IEnvService),
    __param(6, configurationService_1.IConfigurationService)
], VSCodeCopilotTokenManager);
//# sourceMappingURL=copilotTokenManager.js.map