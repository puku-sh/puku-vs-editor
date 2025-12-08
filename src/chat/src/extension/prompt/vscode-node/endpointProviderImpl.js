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
exports.ProductionEndpointProvider = void 0;
const authentication_1 = require("../../../platform/authentication/common/authentication");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const autoChatEndpoint_1 = require("../../../platform/endpoint/node/autoChatEndpoint");
const automodeService_1 = require("../../../platform/endpoint/node/automodeService");
const copilotChatEndpoint_1 = require("../../../platform/endpoint/node/copilotChatEndpoint");
const embeddingsEndpoint_1 = require("../../../platform/endpoint/node/embeddingsEndpoint");
const pukuChatEndpoint_1 = require("../../../platform/endpoint/node/pukuChatEndpoint");
const modelMetadataFetcher_1 = require("../../../platform/endpoint/node/modelMetadataFetcher");
const extChatEndpoint_1 = require("../../../platform/endpoint/vscode-node/extChatEndpoint");
const envService_1 = require("../../../platform/env/common/envService");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../util/common/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
let ProductionEndpointProvider = class ProductionEndpointProvider {
    constructor(collectFetcherTelemetry, capiClientService, fetcher, _autoModeService, _expService, _telemetryService, _logService, _configService, _instantiationService, _envService, _authService, _requestLogger) {
        this._autoModeService = _autoModeService;
        this._expService = _expService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configService = _configService;
        this._instantiationService = _instantiationService;
        this._authService = _authService;
        this._chatEndpoints = new Map();
        this._embeddingEndpoints = new Map();
        this._modelFetcher = new modelMetadataFetcher_1.ModelMetadataFetcher(collectFetcherTelemetry, false, fetcher, _requestLogger, capiClientService, this._configService, this._expService, _envService, _authService, this._telemetryService, _logService, _instantiationService);
        // When new models come in from CAPI we want to clear our local caches and let the endpoints be recreated since there may be new info
        this._modelFetcher.onDidModelsRefresh(() => {
            this._chatEndpoints.clear();
        });
    }
    get _overridenChatModel() {
        return this._configService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.DebugOverrideChatEngine);
    }
    getOrCreateChatEndpointInstance(modelMetadata) {
        const modelId = modelMetadata.id;
        let chatEndpoint = this._chatEndpoints.get(modelId);
        if (!chatEndpoint) {
            chatEndpoint = this._instantiationService.createInstance(copilotChatEndpoint_1.CopilotChatEndpoint, modelMetadata);
            this._chatEndpoints.set(modelId, chatEndpoint);
        }
        return chatEndpoint;
    }
    async getChatEndpoint(requestOrFamilyOrModel) {
        this._logService.trace(`Resolving chat model`);
        if (this._overridenChatModel) {
            // Override, only allowed by internal users. Sets model based on setting
            this._logService.trace(`Using overriden chat model`);
            return this.getOrCreateChatEndpointInstance({
                id: this._overridenChatModel,
                name: 'Custom Overriden Chat Model',
                version: '1.0.0',
                model_picker_enabled: true,
                is_chat_default: false,
                is_chat_fallback: false,
                capabilities: {
                    supports: { streaming: true },
                    tokenizer: tokenizer_1.TokenizerType.O200K,
                    family: 'custom',
                    type: 'chat'
                }
            });
        }
        let endpoint;
        if (typeof requestOrFamilyOrModel === 'string') {
            // Handle puku-ai directly
            if (requestOrFamilyOrModel === 'puku-ai') {
                this._logService.trace(`Using Puku AI endpoint`);
                return this._instantiationService.createInstance(pukuChatEndpoint_1.PukuChatEndpoint);
            }
            // The family case, resolve the chat model for the passed in family
            const modelMetadata = await this._modelFetcher.getChatModelFromFamily(requestOrFamilyOrModel);
            endpoint = this.getOrCreateChatEndpointInstance(modelMetadata);
        }
        else {
            const model = 'model' in requestOrFamilyOrModel ? requestOrFamilyOrModel.model : requestOrFamilyOrModel;
            if (model && model.vendor === 'copilot' && model.id === autoChatEndpoint_1.AutoChatEndpoint.pseudoModelId) {
                return this._autoModeService.resolveAutoModeEndpoint(requestOrFamilyOrModel, Array.from(this._chatEndpoints.values()));
            }
            else if (model && model.vendor === 'copilot') {
                // Puku Editor: Check if this is a BYOK/Ollama model by checking if Ollama endpoint is configured
                const ollamaEndpoint = this._configService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
                if (ollamaEndpoint) {
                    // This is a BYOK model registered as "copilot" vendor - treat it as extension contributed
                    this._logService.info(`EndpointProvider: Using BYOK model ${model.id} as extension contributed endpoint`);
                    endpoint = this._instantiationService.createInstance(extChatEndpoint_1.ExtensionContributedChatEndpoint, model);
                }
                else {
                    // Traditional GitHub Copilot model - fetch from CAPI
                    const modelMetadata = await this._modelFetcher.getChatModelFromApiModel(model);
                    // If we fail to resolve a model since this is panel we give GPT-4.1. This really should never happen as the picker is powered by the same service.
                    endpoint = modelMetadata ? this.getOrCreateChatEndpointInstance(modelMetadata) : await this.getChatEndpoint('gpt-4.1');
                }
            }
            else if (model && model.id === 'puku-ai') {
                endpoint = this._instantiationService.createInstance(pukuChatEndpoint_1.PukuChatEndpoint);
            }
            else if (model) {
                endpoint = this._instantiationService.createInstance(extChatEndpoint_1.ExtensionContributedChatEndpoint, model);
            }
            else {
                // No explicit family passed and no model picker = gpt-4.1 class model
                endpoint = await this.getChatEndpoint('gpt-4.1');
            }
        }
        this._logService.trace(`Resolved chat model`);
        return endpoint;
    }
    async getEmbeddingsEndpoint(family) {
        this._logService.trace(`Resolving embedding model`);
        const modelMetadata = await this._modelFetcher.getEmbeddingsModel('text-embedding-3-small');
        const model = await this.getOrCreateEmbeddingEndpointInstance(modelMetadata);
        this._logService.trace(`Resolved embedding model`);
        return model;
    }
    async getOrCreateEmbeddingEndpointInstance(modelMetadata) {
        const modelId = 'text-embedding-3-small';
        let embeddingEndpoint = this._embeddingEndpoints.get(modelId);
        if (!embeddingEndpoint) {
            embeddingEndpoint = this._instantiationService.createInstance(embeddingsEndpoint_1.EmbeddingEndpoint, modelMetadata);
            this._embeddingEndpoints.set(modelId, embeddingEndpoint);
        }
        return embeddingEndpoint;
    }
    async getAllCompletionModels(forceRefresh) {
        return this._modelFetcher.getAllCompletionModels(forceRefresh ?? false);
    }
    async getAllChatEndpoints() {
        const models = await this._modelFetcher.getAllChatModels();
        const endpoints = models.map(model => this.getOrCreateChatEndpointInstance(model));
        const pukuEndpointUrl = this._configService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
        if (pukuEndpointUrl) {
            endpoints.push(this._instantiationService.createInstance(pukuChatEndpoint_1.PukuChatEndpoint));
        }
        return endpoints;
    }
};
exports.ProductionEndpointProvider = ProductionEndpointProvider;
exports.ProductionEndpointProvider = ProductionEndpointProvider = __decorate([
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, automodeService_1.IAutomodeService),
    __param(4, nullExperimentationService_1.IExperimentationService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, logService_1.ILogService),
    __param(7, configurationService_1.IConfigurationService),
    __param(8, instantiation_1.IInstantiationService),
    __param(9, envService_1.IEnvService),
    __param(10, authentication_1.IAuthenticationService),
    __param(11, requestLogger_1.IRequestLogger)
], ProductionEndpointProvider);
//# sourceMappingURL=endpointProviderImpl.js.map