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
exports.BaseOpenAICompatibleLMProvider = void 0;
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const languageModelAccess_1 = require("../../conversation/vscode-node/languageModelAccess");
const byokProvider_1 = require("../common/byokProvider");
const openAIEndpoint_1 = require("../node/openAIEndpoint");
const byokUIService_1 = require("./byokUIService");
let BaseOpenAICompatibleLMProvider = class BaseOpenAICompatibleLMProvider {
    constructor(authType, _name, _baseUrl, _knownModels, _byokStorageService, _fetcherService, _logService, _instantiationService) {
        this.authType = authType;
        this._name = _name;
        this._baseUrl = _baseUrl;
        this._knownModels = _knownModels;
        this._byokStorageService = _byokStorageService;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._lmWrapper = this._instantiationService.createInstance(languageModelAccess_1.CopilotLanguageModelWrapper);
    }
    async getModelInfo(modelId, apiKey, modelCapabilities) {
        return (0, byokProvider_1.resolveModelInfo)(modelId, this._name, this._knownModels, modelCapabilities);
    }
    async getAllModels() {
        try {
            const response = await this._fetcherService.fetch(`${this._baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this._apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            const models = await response.json();
            if (models.error) {
                throw models.error;
            }
            this._logService.trace(`Fetched ${models.data.length} models from ${this._name}`);
            const modelList = {};
            for (const model of models.data) {
                if (this._knownModels && this._knownModels[model.id]) {
                    modelList[model.id] = this._knownModels[model.id];
                }
            }
            this._logService.trace(`Filtered to ${Object.keys(modelList).length} known models for ${this._name}`);
            return modelList;
        }
        catch (error) {
            throw new Error(error.message ? error.message : error);
        }
    }
    async provideLanguageModelChatInformation(options, token) {
        this._logService.info(`${this._name}: provideLanguageModelChatInformation called, silent=${options.silent}, authType=${this.authType}`);
        console.log(`${this._name}: provideLanguageModelChatInformation called, silent=${options.silent}, authType=${this.authType}`);
        if (!this._apiKey && this.authType === 0 /* BYOKAuthType.GlobalApiKey */) { // If we don't have the API key it might just be in storage, so we try to read it first
            this._apiKey = await this._byokStorageService.getAPIKey(this._name);
        }
        try {
            if (this._apiKey || this.authType === 2 /* BYOKAuthType.None */) {
                const allModels = await this.getAllModels();
                this._logService.info(`${this._name}: getAllModels returned ${Object.keys(allModels).length} models`);
                console.log(`${this._name}: getAllModels returned ${Object.keys(allModels).length} models:`, Object.keys(allModels));
                const apiInfo = (0, byokProvider_1.byokKnownModelsToAPIInfo)(this._name, allModels);
                this._logService.info(`${this._name}: Returning ${apiInfo.length} models to chat`);
                console.log(`${this._name}: Returning ${apiInfo.length} models to chat:`, apiInfo);
                return apiInfo;
            }
            else if (options.silent && !this._apiKey) {
                this._logService.info(`${this._name}: Silent mode and no API key, returning empty`);
                console.log(`${this._name}: Silent mode and no API key, returning empty`);
                return [];
            }
            else { // Not silent, and no api key = good to prompt user for api key
                await this.updateAPIKey();
                if (this._apiKey) {
                    return (0, byokProvider_1.byokKnownModelsToAPIInfo)(this._name, await this.getAllModels());
                }
                else {
                    return [];
                }
            }
        }
        catch (e) {
            this._logService.error(e, `Error fetching available ${this._name} models`);
            console.error(`${this._name}: Error in provideLanguageModelChatInformation:`, e);
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        this._logService.info(`${this._name}: provideLanguageModelChatResponse called for model ${model.id}`);
        console.log(`${this._name}: provideLanguageModelChatResponse called for model ${model.id}`);
        console.log(`${this._name}: Tools count: ${options.tools?.length ?? 0}`);
        if (options.tools && options.tools.length > 0) {
            console.log(`${this._name}: Tool names: ${options.tools.map(t => t.name).join(', ')}`);
        }
        try {
            const openAIChatEndpoint = await this.getEndpointImpl(model);
            this._logService.info(`${this._name}: Created endpoint for ${model.id}: ${openAIChatEndpoint.constructor.name}, calling wrapper`);
            console.log(`${this._name}: Created endpoint for ${model.id}: ${openAIChatEndpoint.constructor.name}, URL: ${openAIChatEndpoint.urlOrRequestMetadata}`);
            return this._lmWrapper.provideLanguageModelResponse(openAIChatEndpoint, messages, options, options.requestInitiator, progress, token);
        }
        catch (e) {
            this._logService.error(`${this._name}: Error in provideLanguageModelChatResponse: ${e}`);
            console.error(`${this._name}: Error in provideLanguageModelChatResponse:`, e);
            throw e;
        }
    }
    async provideTokenCount(model, text, token) {
        const openAIChatEndpoint = await this.getEndpointImpl(model);
        return this._lmWrapper.provideTokenCount(openAIChatEndpoint, text);
    }
    async getEndpointImpl(model) {
        const modelInfo = await this.getModelInfo(model.id, this._apiKey);
        const url = modelInfo.supported_endpoints?.includes(endpointProvider_1.ModelSupportedEndpoint.Responses) ?
            `${this._baseUrl}/responses` :
            `${this._baseUrl}/chat/completions`;
        return this._instantiationService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelInfo, this._apiKey ?? '', url);
    }
    async updateAPIKey() {
        if (this.authType === 2 /* BYOKAuthType.None */) {
            return;
        }
        const newAPIKey = await (0, byokUIService_1.promptForAPIKey)(this._name, await this._byokStorageService.getAPIKey(this._name) !== undefined);
        if (newAPIKey === undefined) {
            return;
        }
        else if (newAPIKey === '') {
            this._apiKey = undefined;
            await this._byokStorageService.deleteAPIKey(this._name, this.authType);
        }
        else if (newAPIKey !== undefined) {
            this._apiKey = newAPIKey;
            await this._byokStorageService.storeAPIKey(this._name, this._apiKey, 0 /* BYOKAuthType.GlobalApiKey */);
        }
    }
    async updateAPIKeyViaCmd(envVarName, action = 'update', modelId) {
        if (this.authType === 2 /* BYOKAuthType.None */) {
            return;
        }
        if (action === 'remove') {
            this._apiKey = undefined;
            await this._byokStorageService.deleteAPIKey(this._name, this.authType, modelId);
            this._logService.info(`BYOK: API key removed for provider ${this._name}`);
            return;
        }
        const apiKey = process.env[envVarName];
        if (!apiKey) {
            throw new Error(`BYOK: Environment variable ${envVarName} not found or empty for API key management`);
        }
        this._apiKey = apiKey;
        await this._byokStorageService.storeAPIKey(this._name, apiKey, this.authType, modelId);
        this._logService.info(`BYOK: API key updated for provider ${this._name} from environment variable ${envVarName}`);
    }
};
exports.BaseOpenAICompatibleLMProvider = BaseOpenAICompatibleLMProvider;
exports.BaseOpenAICompatibleLMProvider = BaseOpenAICompatibleLMProvider = __decorate([
    __param(5, fetcherService_1.IFetcherService),
    __param(6, logService_1.ILogService),
    __param(7, instantiation_1.IInstantiationService)
], BaseOpenAICompatibleLMProvider);
//# sourceMappingURL=baseOpenAICompatibleProvider.js.map