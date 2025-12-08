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
var AzureTestEndpoint_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureTestEndpoint = void 0;
const tokenizer_1 = require("../../../../util/common/tokenizer");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../../chat/common/chatMLFetcher");
const configurationService_1 = require("../../../configuration/common/configurationService");
const logService_1 = require("../../../log/common/logService");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const nullExperimentationService_1 = require("../../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const tokenizer_2 = require("../../../tokenizer/node/tokenizer");
const capiClient_1 = require("../../common/capiClient");
const domainService_1 = require("../../common/domainService");
const chatEndpoint_1 = require("../../node/chatEndpoint");
let AzureTestEndpoint = AzureTestEndpoint_1 = class AzureTestEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(_azureModel, domainService, capiClient, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService) {
        const modelInfo = {
            id: _azureModel,
            name: 'Azure Test',
            version: '1.0',
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            capabilities: {
                type: 'chat',
                family: 'azure',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                supports: { streaming: true, tool_calls: true, vision: false, prediction: false },
                limits: {
                    max_prompt_tokens: 200000,
                    max_output_tokens: 56000,
                },
            }
        };
        super(modelInfo, domainService, capiClient, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService);
        this._azureModel = _azureModel;
        this.instantiationService = instantiationService;
        this.isThinkingModel = false; // Set to true if testing a thinking model
    }
    get urlOrRequestMetadata() {
        switch (this._azureModel) {
            case "experimental-01" /* CHAT_MODEL.EXPERIMENTAL */:
                // Set model params and thinking in constructor
                return '<replace with your experimental endpoint URL>';
            default:
                throw new Error(`Unknown azure model passed ${this._azureModel} passed to test endpoint`);
        }
    }
    getSecretKey() {
        let secretKey = '';
        switch (this._azureModel) {
            case "experimental-01" /* CHAT_MODEL.EXPERIMENTAL */:
                secretKey = process.env.EXPERIMENTAL_TOKEN;
                break;
            default:
                throw new Error(`Unknown azure model passed ${this._azureModel} passed to test endpoint`);
        }
        if (!secretKey) {
            throw new Error(`No secret key found for model ${this._azureModel}`);
        }
        return secretKey;
    }
    getAuthHeader() {
        return 'Bearer ' + this.getSecretKey();
    }
    getExtraHeaders() {
        return {
            'Authorization': this.getAuthHeader(),
            'ocp-apim-subscription-key': this.getSecretKey(),
            'api-key': this.getSecretKey(),
            'x-policy-id': "nil"
        };
    }
    interceptBody(body) {
        super.interceptBody(body);
        if (body) {
            delete body.snippy;
            delete body.intent;
            if (body && this.isThinkingModel) {
                delete body.temperature;
                body['max_completion_tokens'] = body.max_tokens;
                delete body.max_tokens;
            }
        }
    }
    async acceptChatPolicy() {
        return true;
    }
    cloneWithTokenOverride(modelMaxPromptTokens) {
        return this.instantiationService.createInstance(AzureTestEndpoint_1, this._azureModel);
    }
    getCompletionsCallback() {
        return (out, data) => {
            if (data && data.id) {
                out.cot_id = data.id;
                out.cot_summary = Array.isArray(data.text) ? data.text.join('') : data.text;
            }
        };
    }
};
exports.AzureTestEndpoint = AzureTestEndpoint;
exports.AzureTestEndpoint = AzureTestEndpoint = AzureTestEndpoint_1 = __decorate([
    __param(1, domainService_1.IDomainService),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, telemetry_1.ITelemetryService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, chatMLFetcher_1.IChatMLFetcher),
    __param(7, tokenizer_2.ITokenizerProvider),
    __param(8, instantiation_1.IInstantiationService),
    __param(9, configurationService_1.IConfigurationService),
    __param(10, nullExperimentationService_1.IExperimentationService),
    __param(11, logService_1.ILogService)
], AzureTestEndpoint);
//# sourceMappingURL=azureEndpoint.js.map