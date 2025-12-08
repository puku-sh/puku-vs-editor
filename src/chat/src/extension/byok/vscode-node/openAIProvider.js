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
var OAIBYOKLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAIBYOKLMProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
let OAIBYOKLMProvider = class OAIBYOKLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { OAIBYOKLMProvider_1 = this; }
    static { this.providerName = 'OpenAI'; }
    constructor(knownModels, byokStorageService, _fetcherService, _logService, _instantiationService, _configurationService, _expService) {
        super(0 /* BYOKAuthType.GlobalApiKey */, OAIBYOKLMProvider_1.providerName, 'https://api.openai.com/v1', knownModels, byokStorageService, _fetcherService, _logService, _instantiationService);
        this._configurationService = _configurationService;
        this._expService = _expService;
    }
    async getModelInfo(modelId, apiKey, modelCapabilities) {
        const modelInfo = await super.getModelInfo(modelId, apiKey, modelCapabilities);
        const enableResponsesApi = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.UseResponsesApi, this._expService);
        if (enableResponsesApi) {
            modelInfo.supported_endpoints = [
                endpointProvider_1.ModelSupportedEndpoint.ChatCompletions,
                endpointProvider_1.ModelSupportedEndpoint.Responses
            ];
        }
        return modelInfo;
    }
};
exports.OAIBYOKLMProvider = OAIBYOKLMProvider;
exports.OAIBYOKLMProvider = OAIBYOKLMProvider = OAIBYOKLMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService)
], OAIBYOKLMProvider);
//# sourceMappingURL=openAIProvider.js.map