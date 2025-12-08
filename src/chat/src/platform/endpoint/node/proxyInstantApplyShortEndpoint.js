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
exports.ProxyInstantApplyShortEndpoint = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const tokenizer_1 = require("../../../util/common/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../chat/common/chatMLFetcher");
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const tokenizer_2 = require("../../tokenizer/node/tokenizer");
const capiClient_1 = require("../common/capiClient");
const domainService_1 = require("../common/domainService");
const chatEndpoint_1 = require("./chatEndpoint");
let ProxyInstantApplyShortEndpoint = class ProxyInstantApplyShortEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService) {
        const model = configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InstantApplyShortModelName, experimentationService) ?? "gpt-4o-instant-apply-full-ft-v66-short" /* CHAT_MODEL.SHORT_INSTANT_APPLY */;
        const modelInfo = {
            id: model,
            name: model,
            version: 'unknown',
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            capabilities: {
                type: 'chat',
                family: model,
                tokenizer: tokenizer_1.TokenizerType.O200K,
                supports: { streaming: true, parallel_tool_calls: false, tool_calls: false, vision: false, prediction: true },
                limits: {
                    max_prompt_tokens: 128000,
                    max_output_tokens: 16000,
                }
            }
        };
        super(modelInfo, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService);
        this.authService = authService;
    }
    getExtraHeaders() {
        const headers = {};
        if (this.authService.speculativeDecodingEndpointToken) {
            headers['Copilot-Edits-Session'] = this.authService.speculativeDecodingEndpointToken;
        }
        return headers;
    }
    get urlOrRequestMetadata() {
        return { type: pukuRequestTypes_1.RequestType.ProxyChatCompletions };
    }
};
exports.ProxyInstantApplyShortEndpoint = ProxyInstantApplyShortEndpoint;
exports.ProxyInstantApplyShortEndpoint = ProxyInstantApplyShortEndpoint = __decorate([
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
], ProxyInstantApplyShortEndpoint);
//# sourceMappingURL=proxyInstantApplyShortEndpoint.js.map