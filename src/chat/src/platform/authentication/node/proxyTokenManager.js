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
exports.ProxyTokenManager = void 0;
const configurationService_1 = require("../../configuration/common/configurationService");
const configurationService_2 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const copilotTokenManager_1 = require("./copilotTokenManager");
const copilotToken_1 = require("../common/copilotToken");
/**
 * Token manager that fetches tokens from the Puku AI proxy
 */
let ProxyTokenManager = class ProxyTokenManager extends copilotTokenManager_1.BaseCopilotTokenManager {
    constructor(_fetcherService, _logService, _telemetryService, _configurationService) {
        super();
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._configurationService = _configurationService;
    }
    async getCopilotToken(force) {
        if (!this.copilotToken || this.copilotToken.expires_at < Date.now() / 1000 - 300 || force) {
            const tokenResult = await this.fetchTokenFromProxy();
            if (tokenResult.kind === 'failure') {
                throw new Error(`Failed to get token from proxy: ${tokenResult.reason}`);
            }
            this.copilotToken = { ...tokenResult };
        }
        return new copilotToken_1.CopilotToken(this.copilotToken);
    }
    async fetchTokenFromProxy() {
        try {
            const endpoint = this._configurationService.getConfig(configurationService_2.ConfigKey.PukuAIEndpoint);
            if (!endpoint) {
                return { kind: 'failure', reason: 'NoProxyEndpoint' };
            }
            const tokenUrl = `${endpoint}/api/tokens/issue`;
            this._logService.info(`[ProxyTokenManager] Fetching token from ${tokenUrl}`);
            const response = await this._fetcherService.fetch(tokenUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: 'puku-user',
                    metadata: {
                        source: 'vscode-extension',
                    },
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                this._logService.error(`[ProxyTokenManager] Token fetch failed: ${response.status} ${errorText}`);
                return { kind: 'failure', reason: 'HTTPError', message: errorText };
            }
            const tokenData = await response.json();
            if (!tokenData.token) {
                return { kind: 'failure', reason: 'NoTokenInResponse' };
            }
            // Convert expires_at from milliseconds to seconds if needed
            const expiresAt = tokenData.expires_at > 10000000000
                ? Math.floor(tokenData.expires_at / 1000)
                : tokenData.expires_at;
            const extendedInfo = {
                token: tokenData.token,
                expires_at: expiresAt,
                refresh_in: tokenData.refresh_in,
                username: tokenData.userId || 'puku-user',
                copilot_plan: 'individual',
                isVscodeTeamMember: false,
                chat_enabled: true,
            };
            this._logService.info(`[ProxyTokenManager] Successfully fetched token, expires at ${new Date(expiresAt * 1000).toISOString()}`);
            return { kind: 'success', ...extendedInfo };
        }
        catch (error) {
            this._logService.error(`[ProxyTokenManager] Error fetching token:`, error);
            return {
                kind: 'failure',
                reason: 'NetworkError',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async checkCopilotToken() {
        if (!this.copilotToken || this.copilotToken.expires_at < Date.now() / 1000) {
            const tokenResult = await this.fetchTokenFromProxy();
            if (tokenResult.kind === 'failure') {
                return tokenResult;
            }
            this.copilotToken = { ...tokenResult };
        }
        return { status: 'OK' };
    }
};
exports.ProxyTokenManager = ProxyTokenManager;
exports.ProxyTokenManager = ProxyTokenManager = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, configurationService_1.IConfigurationService)
], ProxyTokenManager);
//# sourceMappingURL=proxyTokenManager.js.map