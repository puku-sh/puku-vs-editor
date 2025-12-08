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
exports.CustomNesEndpoint = void 0;
const tokenizer_1 = require("../../../../util/common/tokenizer");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../../authentication/common/authentication");
const chatMLFetcher_1 = require("../../../chat/common/chatMLFetcher");
const configurationService_1 = require("../../../configuration/common/configurationService");
const envService_1 = require("../../../env/common/envService");
const logService_1 = require("../../../log/common/logService");
const fetcherService_1 = require("../../../networking/common/fetcherService");
const nullExperimentationService_1 = require("../../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../telemetry/common/telemetry");
const tokenizer_2 = require("../../../tokenizer/node/tokenizer");
const capiClient_1 = require("../../common/capiClient");
const domainService_1 = require("../../common/domainService");
const chatEndpoint_1 = require("../../node/chatEndpoint");
let CustomNesEndpoint = class CustomNesEndpoint extends chatEndpoint_1.ChatEndpoint {
    constructor(domainService, capiClientService, fetcherService, envService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService) {
        const modelInfo = {
            id: "custom-nes" /* CHAT_MODEL.CUSTOM_NES */,
            name: 'custom-nes',
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            version: 'unknown',
            capabilities: {
                type: 'chat',
                family: 'custom-nes',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                limits: {
                    // TODO@ulugbekna: copied from CAPI's 4o-mini
                    max_prompt_tokens: 12285,
                    max_output_tokens: 4096,
                },
                supports: {
                    streaming: true,
                    parallel_tool_calls: false,
                    tool_calls: false,
                    vision: false,
                    prediction: true,
                }
            }
        };
        super(modelInfo, domainService, capiClientService, fetcherService, telemetryService, authService, chatMLFetcher, tokenizerProvider, instantiationService, configurationService, experimentationService, logService);
    }
    get urlOrRequestMetadata() {
        const url = process.env.CUSTOM_NES_URL;
        if (!url) {
            throw new Error(`No url found for custom NES model`);
        }
        return url;
    }
    getSecretKey() {
        const secretKey = process.env.CUSTOM_NES_TOKEN;
        if (!secretKey) {
            throw new Error(`No secret key found for custom NES model`);
        }
        return secretKey;
    }
    getAuthHeader() {
        return 'Bearer ' + this.getSecretKey();
    }
    getExtraHeaders() {
        return {
            'Authorization': this.getAuthHeader(),
            'api-key': this.getSecretKey(),
        };
    }
    interceptBody(body) {
        super.interceptBody(body);
        if (body) {
            delete body.snippy;
            delete body.intent;
        }
    }
};
exports.CustomNesEndpoint = CustomNesEndpoint;
exports.CustomNesEndpoint = CustomNesEndpoint = __decorate([
    __param(0, domainService_1.IDomainService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, envService_1.IEnvService),
    __param(4, telemetry_1.ITelemetryService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, chatMLFetcher_1.IChatMLFetcher),
    __param(7, tokenizer_2.ITokenizerProvider),
    __param(8, instantiation_1.IInstantiationService),
    __param(9, configurationService_1.IConfigurationService),
    __param(10, nullExperimentationService_1.IExperimentationService),
    __param(11, logService_1.ILogService)
], CustomNesEndpoint);
//# sourceMappingURL=customNesEndpoint.js.map