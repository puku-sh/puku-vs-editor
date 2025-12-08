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
var ModelMetadataFetcher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelMetadataFetcher = void 0;
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const tokenizer_1 = require("../../../util/common/tokenizer");
const taskSingler_1 = require("../../../util/common/taskSingler");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const configurationService_1 = require("../../configuration/common/configurationService");
const envService_1 = require("../../env/common/envService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const requestLogger_1 = require("../../requestLogger/node/requestLogger");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const capiClient_1 = require("../common/capiClient");
const endpointProvider_1 = require("../common/endpointProvider");
const modelAliasRegistry_1 = require("../common/modelAliasRegistry");
/**
 * Responsible for interacting with the CAPI Model API
 * This is solely owned by the EndpointProvider (and TestEndpointProvider) which uses this service to power server side rollout of models
 * All model acquisition should be done through the EndpointProvider
 */
let ModelMetadataFetcher = class ModelMetadataFetcher extends lifecycle_1.Disposable {
    static { ModelMetadataFetcher_1 = this; }
    static { this.ALL_MODEL_KEY = 'allModels'; }
    constructor(collectFetcherTelemetry, _isModelLab, _fetcher, _requestLogger, _capiClientService, _configService, _expService, _envService, _authService, _telemetryService, _logService, _instantiationService) {
        super();
        this.collectFetcherTelemetry = collectFetcherTelemetry;
        this._isModelLab = _isModelLab;
        this._fetcher = _fetcher;
        this._requestLogger = _requestLogger;
        this._capiClientService = _capiClientService;
        this._configService = _configService;
        this._expService = _expService;
        this._envService = _envService;
        this._authService = _authService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._familyMap = new Map();
        this._completionsFamilyMap = new Map();
        this._lastFetchTime = 0;
        this._taskSingler = new taskSingler_1.TaskSingler();
        this._onDidModelRefresh = new event_1.Emitter();
        this.onDidModelsRefresh = this._onDidModelRefresh.event;
        this._register(this._authService.onDidAuthenticationChange(() => {
            // Auth changed so next fetch should be forced to get a new list
            this._familyMap.clear();
            this._completionsFamilyMap.clear();
            this._lastFetchTime = 0;
        }));
    }
    async getAllCompletionModels(forceRefresh) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, () => this._fetchModels(forceRefresh));
        const completionModels = [];
        for (const [, models] of this._completionsFamilyMap) {
            for (const model of models) {
                if ((0, endpointProvider_1.isCompletionModelInformation)(model)) {
                    completionModels.push(model);
                }
            }
        }
        return completionModels;
    }
    async getAllChatModels() {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        const chatModels = [];
        for (const [, models] of this._familyMap) {
            for (const model of models) {
                if ((0, endpointProvider_1.isChatModelInformation)(model)) {
                    chatModels.push(model);
                }
            }
        }
        return chatModels;
    }
    /**
     * Hydrates a model API response from the `/models` endpoint with proper exp overrides and error handling
     * @param resolvedModel The resolved model to hydrate
     * @returns The resolved model with proper exp overrides and token counts
     */
    async _hydrateResolvedModel(resolvedModel) {
        if (!resolvedModel) {
            throw this._lastFetchError;
        }
        // If it's a chat model, update max prompt tokens based on settings + exp
        if ((0, endpointProvider_1.isChatModelInformation)(resolvedModel) && (resolvedModel.capabilities.limits)) {
            resolvedModel.capabilities.limits.max_prompt_tokens = this._getMaxPromptTokensOverride(resolvedModel);
            // Also ensure prompt tokens + output tokens <= context window. Output tokens is capped to max 15% input tokens
            const outputTokens = Math.floor(Math.min(resolvedModel.capabilities.limits.max_output_tokens ?? 4096, resolvedModel.capabilities.limits.max_prompt_tokens * 0.15));
            const contextWindow = resolvedModel.capabilities.limits.max_context_window_tokens ?? (outputTokens + resolvedModel.capabilities.limits.max_prompt_tokens);
            resolvedModel.capabilities.limits.max_prompt_tokens = Math.min(resolvedModel.capabilities.limits.max_prompt_tokens, contextWindow - outputTokens);
        }
        // If it's a chat model, update showInModelPicker based on experiment overrides
        if ((0, endpointProvider_1.isChatModelInformation)(resolvedModel)) {
            resolvedModel.model_picker_enabled = this._getShowInModelPickerOverride(resolvedModel);
        }
        if (resolvedModel.preview && !resolvedModel.name.endsWith('(Preview)')) {
            // If the model is a preview model, we append (Preview) to the name
            resolvedModel.name = `${resolvedModel.name} (Preview)`;
        }
        return resolvedModel;
    }
    async getChatModelFromFamily(family) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        let resolvedModel;
        family = modelAliasRegistry_1.ModelAliasRegistry.resolveAlias(family);
        if (family === 'gpt-4.1') {
            resolvedModel = this._familyMap.get('gpt-4.1')?.[0] ?? this._familyMap.get('gpt-4o')?.[0];
        }
        else if (family === 'copilot-base') {
            resolvedModel = this._copilotBaseModel;
        }
        else {
            resolvedModel = this._familyMap.get(family)?.[0];
        }
        // Puku Editor: When using Ollama and model not found, return a dummy model for GLM-4.6
        // This allows intent detection and other features to work without CAPI models
        const ollamaEndpoint = this._configService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
        if (!resolvedModel && ollamaEndpoint) {
            this._logService.info(`ModelMetadataFetcher: Model family ${family} not found in CAPI, returning GLM-4.6 placeholder`);
            return {
                id: 'GLM-4.6',
                name: 'GLM-4.6',
                version: '1.0.0',
                capabilities: {
                    type: 'chat',
                    family: 'GLM-4.6',
                    supports: { streaming: true, tool_calls: true, vision: false },
                    tokenizer: tokenizer_1.TokenizerType.O200K,
                    limits: {
                        max_context_window_tokens: 32768,
                        max_prompt_tokens: 28672,
                        max_output_tokens: 4096
                    }
                },
                is_chat_default: true,
                is_chat_fallback: false,
                model_picker_enabled: true
            };
        }
        if (!resolvedModel || !(0, endpointProvider_1.isChatModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve chat model with family selection: ${family}`);
        }
        return resolvedModel;
    }
    async getChatModelFromApiModel(apiModel) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        let resolvedModel;
        for (const models of this._familyMap.values()) {
            resolvedModel = models.find(model => model.id === apiModel.id &&
                model.version === apiModel.version &&
                model.capabilities.family === apiModel.family);
            if (resolvedModel) {
                break;
            }
        }
        if (!resolvedModel) {
            return;
        }
        if (!(0, endpointProvider_1.isChatModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve chat model: ${apiModel.id},${apiModel.name},${apiModel.version},${apiModel.family}`);
        }
        return resolvedModel;
    }
    async getEmbeddingsModel(family) {
        await this._taskSingler.getOrCreate(ModelMetadataFetcher_1.ALL_MODEL_KEY, this._fetchModels.bind(this));
        const resolvedModel = this._familyMap.get(family)?.[0];
        if (!resolvedModel || !(0, endpointProvider_1.isEmbeddingModelInformation)(resolvedModel)) {
            throw new Error(`Unable to resolve embeddings model with family selection: ${family}`);
        }
        return resolvedModel;
    }
    _shouldRefreshModels() {
        if (this._familyMap.size === 0) {
            return true;
        }
        const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
        const now = Date.now();
        if (!this._lastFetchTime) {
            return true; // If there's no last fetch time, we should refresh
        }
        // We only want to fetch models if the current session is active
        if (!this._envService.isActive) {
            return false;
        }
        const timeSinceLastFetch = now - this._lastFetchTime;
        return timeSinceLastFetch > tenMinutes;
    }
    async _fetchModels(force) {
        // Puku Editor: Return empty model list to force using only BYOK/Ollama models
        this._logService.info('Puku Editor: Using BYOK/Ollama mode - clearing model metadata');
        this._familyMap.clear();
        this._completionsFamilyMap.clear();
        this._lastFetchTime = Date.now();
        this._lastFetchError = undefined;
        this._onDidModelRefresh.fire();
        return;
        if (!force && !this._shouldRefreshModels()) {
            return;
        }
        const requestStartTime = Date.now();
        const copilotToken = (await this._authService.getCopilotToken()).token;
        const requestId = (0, uuid_1.generateUuid)();
        const requestMetadata = { type: pukuRequestTypes_1.RequestType.Models, isModelLab: this._isModelLab };
        try {
            const response = await (0, networking_1.getRequest)(this._fetcher, this._telemetryService, this._capiClientService, requestMetadata, copilotToken, await (0, crypto_1.createRequestHMAC)(process.env.HMAC_SECRET), 'model-access', requestId);
            this._lastFetchTime = Date.now();
            this._logService.info(`Fetched model metadata in ${Date.now() - requestStartTime}ms ${requestId}`);
            if (response.status < 200 || response.status >= 300) {
                // If we're rate limited and have models, we should just return
                if (response.status === 429 && this._familyMap.size > 0) {
                    this._logService.warn(`Rate limited while fetching models ${requestId}`);
                    return;
                }
                throw new Error(`Failed to fetch models (${requestId}): ${(await response.text()) || response.statusText || `HTTP ${response.status}`}`);
            }
            this._familyMap.clear();
            const data = (await response.json()).data;
            this._requestLogger.logModelListCall(requestId, requestMetadata, data);
            for (let model of data) {
                model = await this._hydrateResolvedModel(model);
                const isCompletionModel = (0, endpointProvider_1.isCompletionModelInformation)(model);
                // The base model is whatever model is deemed "fallback" by the server
                if (model.is_chat_fallback && !isCompletionModel) {
                    this._copilotBaseModel = model;
                }
                const family = model.capabilities.family;
                const familyMap = isCompletionModel ? this._completionsFamilyMap : this._familyMap;
                if (!familyMap.has(family)) {
                    familyMap.set(family, []);
                }
                familyMap.get(family)?.push(model);
            }
            this._lastFetchError = undefined;
            this._onDidModelRefresh.fire();
            if (this.collectFetcherTelemetry) {
                this._instantiationService.invokeFunction(this.collectFetcherTelemetry, undefined);
            }
        }
        catch (e) {
            this._logService.error(e, `Failed to fetch models (${requestId})`);
            this._lastFetchError = e;
            this._lastFetchTime = 0;
            // If we fail to fetch models, we should try again next time
            if (this.collectFetcherTelemetry) {
                this._instantiationService.invokeFunction(this.collectFetcherTelemetry, e);
            }
        }
    }
    // get ChatMaxNumTokens from config for experimentation
    _getMaxPromptTokensOverride(chatModelInfo) {
        // check debug override ChatMaxTokenNum
        const chatMaxTokenNumOverride = this._configService.getConfig(configurationService_1.ConfigKey.Internal.DebugOverrideChatMaxTokenNum); // can only be set by internal users
        // Base 3 tokens for each OpenAI completion
        let modelLimit = -3;
        // if option is set, takes precedence over any other logic
        if (chatMaxTokenNumOverride > 0) {
            modelLimit += chatMaxTokenNumOverride;
            return modelLimit;
        }
        let experimentalOverrides = {};
        try {
            const expValue = this._expService.getTreatmentVariable('copilotchat.contextWindows');
            experimentalOverrides = JSON.parse(expValue ?? '{}');
        }
        catch {
            // If the experiment service either is not available or returns a bad value we ignore the overrides
        }
        // If there's an experiment that takes precedence over what comes back from CAPI
        if (experimentalOverrides[chatModelInfo.id]) {
            modelLimit += experimentalOverrides[chatModelInfo.id];
            return modelLimit;
        }
        // Check if CAPI has prompt token limits and return those
        if (chatModelInfo.capabilities?.limits?.max_prompt_tokens) {
            modelLimit += chatModelInfo.capabilities.limits.max_prompt_tokens;
            return modelLimit;
        }
        else if (chatModelInfo.capabilities.limits?.max_context_window_tokens) {
            // Otherwise return the context window as the prompt tokens for cases where CAPI doesn't configure the prompt tokens
            modelLimit += chatModelInfo.capabilities.limits.max_context_window_tokens;
            return modelLimit;
        }
        return modelLimit;
    }
    _getShowInModelPickerOverride(resolvedModel) {
        let modelPickerOverrides = {};
        const expResult = this._expService.getTreatmentVariable('copilotchat.showInModelPicker');
        try {
            modelPickerOverrides = JSON.parse(expResult || '{}');
        }
        catch {
            // No-op if parsing experiment fails
        }
        return modelPickerOverrides[resolvedModel.id] ?? resolvedModel.model_picker_enabled;
    }
};
exports.ModelMetadataFetcher = ModelMetadataFetcher;
exports.ModelMetadataFetcher = ModelMetadataFetcher = ModelMetadataFetcher_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, capiClient_1.ICAPIClientService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, envService_1.IEnvService),
    __param(8, authentication_1.IAuthenticationService),
    __param(9, telemetry_1.ITelemetryService),
    __param(10, logService_1.ILogService),
    __param(11, instantiation_1.IInstantiationService)
], ModelMetadataFetcher);
//#endregion
//# sourceMappingURL=modelMetadataFetcher.js.map