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
exports.AutomodeService = exports.IAutomodeService = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const services_1 = require("../../../util/common/services");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const logService_1 = require("../../log/common/logService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const capiClient_1 = require("../common/capiClient");
const autoChatEndpoint_1 = require("./autoChatEndpoint");
class AutoModeTokenBank extends lifecycle_1.Disposable {
    constructor(debugName, _capiClientService, _authService, _logService, _expService) {
        super();
        this.debugName = debugName;
        this._capiClientService = _capiClientService;
        this._authService = _authService;
        this._logService = _logService;
        this._expService = _expService;
        this._refreshTimer = this._register(new async_1.TimeoutTimer());
        this._fetchTokenPromise = this._fetchToken();
    }
    async getToken() {
        if (!this._token) {
            if (this._fetchTokenPromise) {
                await this._fetchTokenPromise;
            }
            else {
                this._fetchTokenPromise = this._fetchToken();
                await this._fetchTokenPromise;
            }
        }
        if (!this._token) {
            throw new Error(`[${this.debugName}] Failed to fetch AutoMode token: token is undefined after fetch attempt.`);
        }
        return this._token;
    }
    async _fetchToken() {
        // Skip auto mode token fetch - using BYOK/Ollama mode
        this._logService.info('Skipping auto mode token fetch - using BYOK/Ollama mode');
        return;
        const startTime = Date.now();
        const authToken = (await this._authService.getCopilotToken()).token;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        };
        if (this._token) {
            headers['Copilot-Session-Token'] = this._token.session_token;
        }
        const autoModeHint = this._expService.getTreatmentVariable('copilotchat.autoModelHint') || 'auto';
        const response = await this._capiClientService.makeRequest({
            json: {
                'auto_mode': { 'model_hints': [autoModeHint] }
            },
            headers,
            method: 'POST'
        }, { type: pukuRequestTypes_1.RequestType.AutoModels });
        const data = await response.json();
        this._logService.trace(`Fetched auto model for ${this.debugName} in ${Date.now() - startTime}ms.`);
        this._token = data;
        // Trigger a refresh 5 minutes before expiration
        this._refreshTimer.cancelAndSet(this._fetchToken.bind(this), (data.expires_at * 1000) - Date.now() - 5 * 60 * 1000);
        this._fetchTokenPromise = undefined;
    }
}
exports.IAutomodeService = (0, services_1.createServiceIdentifier)('IAutomodeService');
let AutomodeService = class AutomodeService extends lifecycle_1.Disposable {
    constructor(_capiClientService, _authService, _logService, _instantiationService, _expService) {
        super();
        this._capiClientService = _capiClientService;
        this._authService = _authService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._expService = _expService;
        this._autoModelCache = new Map();
        this._register(this._authService.onDidAuthenticationChange(() => {
            for (const entry of this._autoModelCache.values()) {
                entry.tokenBank.dispose();
            }
            this._autoModelCache.clear();
            this._reserveToken?.dispose();
            this._reserveToken = new AutoModeTokenBank('reserve', this._capiClientService, this._authService, this._logService, this._expService);
        }));
        this._serviceBrand = undefined;
    }
    dispose() {
        for (const entry of this._autoModelCache.values()) {
            entry.tokenBank.dispose();
        }
        this._autoModelCache.clear();
        this._reserveToken?.dispose();
        super.dispose();
    }
    /**
     * Resolve an auto mode endpoint using a double-buffer strategy and a global reserve token.
     */
    async resolveAutoModeEndpoint(chatRequest, knownEndpoints) {
        if (!knownEndpoints.length) {
            throw new Error('No auto mode endpoints provided.');
        }
        const conversationId = getConversationId(chatRequest);
        const entry = this._autoModelCache.get(conversationId);
        if (entry) {
            const entryToken = await entry.tokenBank.getToken();
            if (entry.endpoint.model !== entryToken.selected_model) {
                // Model changed during a token refresh -> map to new endpoint
                const newModel = knownEndpoints.find(e => e.model === entryToken.selected_model) || knownEndpoints[0];
                entry.endpoint = this._instantiationService.createInstance(autoChatEndpoint_1.AutoChatEndpoint, newModel, entryToken.session_token, entryToken.discounted_costs?.[newModel.model] || 0, this._calculateDiscountRange(entryToken.discounted_costs));
            }
            return entry.endpoint;
        }
        // No entry yet -> Promote reserve token to active and repopulate reserve
        const reserveTokenBank = this._reserveToken || new AutoModeTokenBank('reserve', this._capiClientService, this._authService, this._logService, this._expService);
        this._reserveToken = new AutoModeTokenBank('reserve', this._capiClientService, this._authService, this._logService, this._expService);
        // Update the debug name so logs are properly associating this token with the right conversation id now
        reserveTokenBank.debugName = conversationId;
        const reserveToken = await reserveTokenBank.getToken();
        const selectedModel = knownEndpoints.find(e => e.model === reserveToken.selected_model) || knownEndpoints[0];
        const autoEndpoint = this._instantiationService.createInstance(autoChatEndpoint_1.AutoChatEndpoint, selectedModel, reserveToken.session_token, reserveToken.discounted_costs?.[selectedModel.model] || 0, this._calculateDiscountRange(reserveToken.discounted_costs));
        this._autoModelCache.set(conversationId, { endpoint: autoEndpoint, tokenBank: reserveTokenBank });
        return autoEndpoint;
    }
    _calculateDiscountRange(discounts) {
        if (!discounts) {
            return { low: 0, high: 0 };
        }
        let low = Infinity;
        let high = -Infinity;
        let hasValues = false;
        for (const value of Object.values(discounts)) {
            hasValues = true;
            if (value < low) {
                low = value;
            }
            if (value > high) {
                high = value;
            }
        }
        return hasValues ? { low, high } : { low: 0, high: 0 };
    }
};
exports.AutomodeService = AutomodeService;
exports.AutomodeService = AutomodeService = __decorate([
    __param(0, capiClient_1.ICAPIClientService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, nullExperimentationService_1.IExperimentationService)
], AutomodeService);
/**
 * Get the conversation ID from the chat request. This is representative of a single chat thread
 * @param chatRequest The chat request object.
 * @returns The conversation ID or 'unknown' if not available.
 */
function getConversationId(chatRequest) {
    if (!chatRequest) {
        return 'unknown';
    }
    return chatRequest?.toolInvocationToken?.sessionId || 'unknown';
}
//# sourceMappingURL=automodeService.js.map