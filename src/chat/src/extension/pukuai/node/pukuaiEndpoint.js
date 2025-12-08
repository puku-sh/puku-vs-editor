"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PukuAIEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuAIEndpoint = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const chatEndpoint_1 = require("../../../platform/endpoint/node/chatEndpoint");
const logService_1 = require("../../../platform/log/common/logService");
const fetch_1 = require("../../../platform/networking/common/fetch");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const networking_1 = require("../../../platform/networking/common/networking");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
function hydratePukuAIErrorMessages(response) {
    if (response.type === commonTypes_1.ChatFetchResponseType.Failed && response.streamError) {
        return {
            type: response.type,
            requestId: response.requestId,
            serverRequestId: response.serverRequestId,
            reason: JSON.stringify(response.streamError),
        };
    }
    else if (response.type === commonTypes_1.ChatFetchResponseType.RateLimited) {
        return {
            type: response.type,
            requestId: response.requestId,
            serverRequestId: response.serverRequestId,
            reason: response.capiError ? 'Rate limit exceeded\n\n' + JSON.stringify(response.capiError) : 'Rate limit exceeded',
            rateLimitKey: '',
            retryAfter: undefined,
            capiError: response.capiError
        };
    }
    return response;
}
/**
 * Puku AI Endpoint - A dedicated endpoint for Puku AI models that properly handles tool calling.
 * This endpoint does NOT inherit tool deletion logic from the parent class.
 */
let PukuAIEndpoint = PukuAIEndpoint_1 = class PukuAIEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(_modelMetadata, _apiKey, _modelUrl, fetcherService, domainService, capiClientService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, expService, logService) {
        super(_modelMetadata, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, expService, logService);
        this._apiKey = _apiKey;
        this._modelUrl = _modelUrl;
        this.instantiationService = instantiationService;
        this.logService = logService;
    }
    createRequestBody(options) {
        const callback = (out, data) => {
            if (data && data.id) {
                out.cot_id = data.id;
                out.cot_summary = Array.isArray(data.text) ? data.text.join('') : data.text;
            }
        };
        const body = (0, networking_1.createCapiRequestBody)(options, this.model, callback);
        return body;
    }
    interceptBody(body) {
        // Puku AI: Do NOT call super.interceptBody() as it deletes tools based on supportsToolCalls
        // which is not set correctly for Puku AI models. Handle body interception here instead.
        // Handle streaming support
        if (body && !this.modelMetadata.capabilities.supports.streaming) {
            body.stream = false;
        }
        // Remove empty tools array
        if (body?.tools?.length === 0) {
            delete body.tools;
        }
        // Ensure tool parameters are properly formatted for OpenAI API
        if (body?.tools) {
            body.tools = body.tools.map(tool => {
                if ((0, fetch_1.isOpenAiFunctionTool)(tool) && tool.function.parameters === undefined) {
                    tool.function.parameters = { type: "object", properties: {} };
                }
                return tool;
            });
        }
        if (body) {
            // Handle thinking models
            if (this.modelMetadata.capabilities.supports.thinking) {
                delete body.temperature;
                body['max_completion_tokens'] = body.max_tokens;
                delete body.max_tokens;
            }
            // Remove max_tokens - defaults to maximum for Puku AI
            delete body.max_tokens;
            // Add stream options for usage tracking
            if (body.stream) {
                body['stream_options'] = { 'include_usage': true };
            }
        }
    }
    get urlOrRequestMetadata() {
        return this._modelUrl;
    }
    getExtraHeaders() {
        const headers = {
            "Content-Type": "application/json"
        };
        console.log(`[PukuAIEndpoint] getExtraHeaders - apiKey: ${this._apiKey ? 'EXISTS (length: ' + this._apiKey.length + ')' : 'EMPTY/UNDEFINED'}`);
        if (this._apiKey) {
            console.log(`[PukuAIEndpoint] Adding Authorization header with Bearer token`);
            headers['Authorization'] = `Bearer ${this._apiKey}`;
        }
        else {
            console.log(`[PukuAIEndpoint] No Authorization header - anonymous access`);
        }
        console.log(`[PukuAIEndpoint] Headers:`, JSON.stringify(headers, null, 2));
        return headers;
    }
    async acceptChatPolicy() {
        return true;
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        const newModelInfo = { ...this.modelMetadata, maxInputTokens: modelMaxPromptTokens };
        return this.instantiationService.createInstance(PukuAIEndpoint_1, newModelInfo, this._apiKey, this._modelUrl);
    }
    async makeChatRequest2(options, token) {
        const modifiedOptions = { ...options, ignoreStatefulMarker: false };
        let response = await super.makeChatRequest2(modifiedOptions, token);
        if (response.type === commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker) {
            response = await this._makeChatRequest2({ ...options, ignoreStatefulMarker: true }, token);
        }
        return hydratePukuAIErrorMessages(response);
    }
};
exports.PukuAIEndpoint = PukuAIEndpoint;
exports.PukuAIEndpoint = PukuAIEndpoint = PukuAIEndpoint_1 = __decorate([
    __param(3, fetcherService_1.IFetcherService),
    __param(4, domainService_1.IDomainService),
    __param(5, capiClient_1.ICAPIClientService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, authentication_1.IAuthenticationService),
    __param(8, chatMLFetcher_1.IChatMLFetcher),
    __param(9, tokenizer_1.ITokenizerProvider),
    __param(10, instantiation_1.IInstantiationService),
    __param(11, configurationService_1.IConfigurationService),
    __param(12, nullExperimentationService_1.IExperimentationService),
    __param(13, logService_1.ILogService)
], PukuAIEndpoint);
//# sourceMappingURL=pukuaiEndpoint.js.map