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
exports.PukuChatEndpoint = void 0;
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../util/common/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../chat/common/chatMLFetcher");
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const tokenizer_2 = require("../../tokenizer/node/tokenizer");
const capiClient_1 = require("../common/capiClient");
const domainService_1 = require("../common/domainService");
const chatEndpoint_1 = require("./chatEndpoint");
let PukuChatEndpoint = class PukuChatEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentService, logService) {
        const modelId = configurationService.getConfig(configurationService_1.ConfigKey.PukuAIModel) || 'GLM-4.6';
        const modelInfo = {
            id: modelId,
            name: 'Puku AI',
            version: '1.0.0',
            model_picker_enabled: true,
            is_chat_default: true,
            is_chat_fallback: false,
            capabilities: {
                type: 'chat',
                family: 'puku',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                supports: {
                    streaming: true,
                    tool_calls: true, // GLM-4.6 supports tool calling
                    vision: true, // GLM-4.6 supports vision
                },
                limits: {
                    // GLM-4.6 has 128K context window
                    max_prompt_tokens: 100000,
                    max_output_tokens: 16000,
                    max_context_window_tokens: 128000,
                }
            },
            requestHeaders: {}
        };
        super(modelInfo, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentService, logService);
    }
    getExtraHeaders() {
        return {};
    }
    get urlOrRequestMetadata() {
        const baseEndpoint = this._configurationService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
        // Ensure the full chat completions URL is returned
        // Handle both '/v1' and '/v1/chat/completions' as base endpoints
        if (baseEndpoint.endsWith('/v1/chat/completions')) {
            return baseEndpoint;
        }
        else if (baseEndpoint.endsWith('/v1')) {
            return `${baseEndpoint}/chat/completions`;
        }
        else {
            return `${baseEndpoint}/v1/chat/completions`;
        }
    }
};
exports.PukuChatEndpoint = PukuChatEndpoint;
exports.PukuChatEndpoint = PukuChatEndpoint = __decorate([
    __param(0, domainService_1.IDomainService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, authentication_1.IAuthenticationService),
    __param(5, chatMLFetcher_1.IChatMLFetcher),
    __param(6, tokenizer_2.ITokenizerProvider),
    __param(7, instantiation_1.IInstantiationService),
    __param(8, configurationService_1.IConfigurationService),
    __param(9, nullExperimentationService_1.IExperimentationService),
    __param(10, logService_1.ILogService)
], PukuChatEndpoint);
//# sourceMappingURL=pukuChatEndpoint.js.map