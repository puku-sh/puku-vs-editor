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
exports.CopilotTokenManagerImpl = exports.ICompletionsCopilotTokenManager = exports.CopilotToken = void 0;
const authentication_1 = require("../../../../../../platform/authentication/common/authentication");
const copilotToken_1 = require("../../../../../../platform/authentication/common/copilotToken");
const services_1 = require("../../../../../../util/common/services");
const async_1 = require("../../../../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../../../../util/vs/base/common/lifecycle");
const config_1 = require("../config");
var copilotToken_2 = require("../../../../../../platform/authentication/common/copilotToken");
Object.defineProperty(exports, "CopilotToken", { enumerable: true, get: function () { return copilotToken_2.CopilotToken; } });
/**
 * Create a dummy CopilotToken for BYOK mode (no GitHub authentication required)
 */
function createDummyToken() {
    const dummyInfo = {
        token: '', // Empty token string
        expires_at: Date.now() + 86400000, // Expires in 24 hours
        refresh_in: 3600, // Refresh in 1 hour
        username: 'byok-user',
        isVscodeTeamMember: false,
        copilot_plan: 'individual',
        endpoints: undefined,
        chat_enabled: true,
        sku: 'no_auth_limited_copilot' // Mark as no-auth user
    };
    return new copilotToken_1.CopilotToken(dummyInfo);
}
exports.ICompletionsCopilotTokenManager = (0, services_1.createServiceIdentifier)('ICompletionsCopilotTokenManager');
let CopilotTokenManagerImpl = class CopilotTokenManagerImpl extends lifecycle_1.Disposable {
    get token() {
        void this.tokenRefetcher.trigger(() => this.updateCachedToken());
        return this._token;
    }
    constructor(primed = false, authenticationService, configProvider) {
        super();
        this.primed = primed;
        this.authenticationService = authenticationService;
        this.configProvider = configProvider;
        this.tokenRefetcher = new async_1.ThrottledDelayer(5_000);
        // Puku Editor: Skip token update if BYOK mode or Puku AI is enabled
        const overrideProxyUrl = this.configProvider.getOptionalConfig(config_1.ConfigKey.DebugOverrideProxyUrl)
            || this.configProvider.getOptionalConfig(config_1.ConfigKey.DebugOverrideProxyUrlLegacy);
        const pukuAIEndpoint = this.configProvider.getOptionalConfig('pukuai.endpoint');
        const isPukuAIConfigured = !!pukuAIEndpoint;
        if (!overrideProxyUrl && !isPukuAIConfigured) {
            // Only fetch token if not in BYOK/Puku AI mode
            // Use catch to handle errors gracefully
            this.updateCachedToken().catch(() => {
                // Silently handle errors - updateCachedToken will create dummy token if needed
            });
            this._register(this.authenticationService.onDidAuthenticationChange(() => {
                this.updateCachedToken().catch(() => {
                    // Silently handle errors
                });
            }));
        }
        else {
            // Initialize with dummy token immediately for BYOK/Puku AI mode
            this._token = createDummyToken();
        }
    }
    /**
     * Ensure we have a token and that the `StatusReporter` is up to date.
     */
    primeToken() {
        try {
            return this.getToken().then(() => true, () => false);
        }
        catch (e) {
            return Promise.resolve(false);
        }
    }
    async getToken() {
        return this.updateCachedToken();
    }
    async updateCachedToken() {
        // Puku Editor: In BYOK mode or when Puku AI is configured, return a dummy token instead of fetching from GitHub
        const overrideProxyUrl = this.configProvider.getOptionalConfig(config_1.ConfigKey.DebugOverrideProxyUrl)
            || this.configProvider.getOptionalConfig(config_1.ConfigKey.DebugOverrideProxyUrlLegacy);
        // Check if Puku AI endpoint is configured (using string key since completions config uses string keys)
        // If endpoint is set (even if default), assume Puku AI mode
        const pukuAIEndpoint = this.configProvider.getOptionalConfig('pukuai.endpoint');
        const isPukuAIConfigured = !!pukuAIEndpoint;
        if (overrideProxyUrl || isPukuAIConfigured) {
            // BYOK/Puku AI mode: Return dummy token with all required methods
            this._token = createDummyToken();
            return this._token;
        }
        // Normal Copilot mode: Fetch real token
        // Catch GitHubLoginFailed errors gracefully (e.g., when using Puku AI without GitHub auth)
        try {
            this._token = await this.authenticationService.getCopilotToken();
            return this._token;
        }
        catch (error) {
            // If GitHub login fails and we don't have a token, use dummy token
            // This allows the extension to work with Puku AI without GitHub authentication
            if (error instanceof Error && (error.message === 'GitHubLoginFailed' || error.message.includes('GitHubLoginFailed'))) {
                // Use dummy token if we don't have one yet
                if (!this._token) {
                    this._token = createDummyToken();
                    return this._token;
                }
                // If we have a token, return it (might be expired but better than nothing)
                return this._token;
            }
            throw error;
        }
    }
    resetToken(httpError) {
        this.authenticationService.resetCopilotToken();
    }
    getLastToken() {
        return this.authenticationService.copilotToken;
    }
};
exports.CopilotTokenManagerImpl = CopilotTokenManagerImpl;
exports.CopilotTokenManagerImpl = CopilotTokenManagerImpl = __decorate([
    __param(1, authentication_1.IAuthenticationService),
    __param(2, config_1.ICompletionsConfigProvider)
], CopilotTokenManagerImpl);
//# sourceMappingURL=copilotTokenManager.js.map