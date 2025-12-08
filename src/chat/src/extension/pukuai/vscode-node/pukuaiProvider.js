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
var PukuAILanguageModelProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuAILanguageModelProvider = void 0;
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const tokenizer_1 = require("../../../util/common/tokenizer");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const languageModelAccess_1 = require("../../conversation/vscode-node/languageModelAccess");
const pukuaiEndpoint_1 = require("../node/pukuaiEndpoint");
const pukuAuth_1 = require("../../pukuIndexing/common/pukuAuth");
/**
 * Puku AI Language Model Provider - Provides GLM models through the Puku AI API
 * This is a standalone provider that implements VS Code's LanguageModelChatProvider interface
 */
let PukuAILanguageModelProvider = class PukuAILanguageModelProvider {
    static { PukuAILanguageModelProvider_1 = this; }
    static { this.providerName = 'Puku AI'; }
    constructor(_pukuBaseUrl, _fetcherService, _logService, _instantiationService, _pukuAuthService) {
        this._pukuBaseUrl = _pukuBaseUrl;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._pukuAuthService = _pukuAuthService;
        this._modelCache = new Map();
        this._knownModels = new Map();
        this._lmWrapper = this._instantiationService.createInstance(languageModelAccess_1.CopilotLanguageModelWrapper);
        this._logService.info(`[PukuAIProvider] Initialized with endpoint ${_pukuBaseUrl}`);
        console.log(`[PukuAIProvider] Initialized with endpoint ${_pukuBaseUrl}`);
    }
    async provideLanguageModelChatInformation(options, token) {
        this._logService.info(`[PukuAIProvider] ============ provideLanguageModelChatInformation START ============`);
        this._logService.info(`[PukuAIProvider] Silent: ${options.silent}`);
        console.log(`[PukuAIProvider] ============ provideLanguageModelChatInformation START ============`);
        console.log(`[PukuAIProvider] Silent: ${options.silent}`);
        try {
            const allModels = await this._getAllModels();
            this._logService.info(`[PukuAIProvider] getAllModels returned ${allModels.size} models`);
            console.log(`[PukuAIProvider] getAllModels returned ${allModels.size} models:`, Array.from(allModels.keys()));
            const apiInfo = this._modelsToAPIInfo(allModels);
            this._logService.info(`[PukuAIProvider] Returning ${apiInfo.length} models to VS Code`);
            console.log(`[PukuAIProvider] Returning ${apiInfo.length} models to VS Code:`);
            console.log(`[PukuAIProvider] Model details:`, JSON.stringify(apiInfo, null, 2));
            console.log(`[PukuAIProvider] ============ provideLanguageModelChatInformation END ============`);
            return apiInfo;
        }
        catch (e) {
            this._logService.error(e, `[PukuAIProvider] Error fetching available Puku AI models`);
            console.error(`[PukuAIProvider] Error in provideLanguageModelChatInformation:`, e);
            console.log(`[PukuAIProvider] ============ provideLanguageModelChatInformation END (ERROR) ============`);
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        this._logService.info(`[PukuAIProvider] provideLanguageModelChatResponse called for model ${model.id}`);
        console.log(`[PukuAIProvider] provideLanguageModelChatResponse called for model ${model.id}`);
        console.log(`[PukuAIProvider] Message count: ${messages.length}`);
        console.log(`[PukuAIProvider] Tools count: ${options.tools?.length ?? 0}`);
        if (options.tools && options.tools.length > 0) {
            console.log(`[PukuAIProvider] Tool names: ${options.tools.map(t => t.name).join(', ')}`);
        }
        try {
            const pukuAIEndpoint = await this._getEndpoint(model);
            this._logService.info(`[PukuAIProvider] Created endpoint for ${model.id}: ${pukuAIEndpoint.constructor.name}`);
            console.log(`[PukuAIProvider] Created endpoint for ${model.id}: ${pukuAIEndpoint.constructor.name}, URL: ${pukuAIEndpoint.urlOrRequestMetadata}`);
            return this._lmWrapper.provideLanguageModelResponse(pukuAIEndpoint, messages, options, options.requestInitiator, progress, token);
        }
        catch (e) {
            this._logService.error(`[PukuAIProvider] Error in provideLanguageModelChatResponse: ${e}`);
            console.error(`[PukuAIProvider] Error in provideLanguageModelChatResponse:`, e);
            throw e;
        }
    }
    async provideTokenCount(model, text, token) {
        const pukuAIEndpoint = await this._getEndpoint(model);
        return this._lmWrapper.provideTokenCount(pukuAIEndpoint, text);
    }
    async _getEndpoint(model) {
        this._logService.info(`[PukuAIProvider] _getEndpoint called for model ${model.id}`);
        const modelInfo = await this._getModelInfo(model.id);
        const url = modelInfo.supported_endpoints?.includes(endpointProvider_1.ModelSupportedEndpoint.Responses) ?
            `${this._pukuBaseUrl}/v1/responses` :
            `${this._pukuBaseUrl}/v1/chat/completions`;
        // Puku AI: Get real Puku authentication token (optional - worker API doesn't need auth)
        this._logService.info('[PukuAIProvider] Calling _pukuAuthService.getToken()...');
        console.log('[PukuAIProvider] Calling _pukuAuthService.getToken()...');
        const pukuToken = await this._pukuAuthService.getToken();
        this._logService.info(`[PukuAIProvider] Got token result: ${pukuToken ? 'YES (length: ' + pukuToken.token.length + ')' : 'NO (using anonymous access)'}`);
        console.log(`[PukuAIProvider] Got token result: ${pukuToken ? 'YES (length: ' + pukuToken.token.length + ')' : 'NO (using anonymous access)'}`);
        // Use empty string as token if not authenticated (worker API allows anonymous access)
        const token = pukuToken ? pukuToken.token : '';
        console.log(`[PukuAIProvider] Final token to pass to endpoint: ${token ? 'EXISTS (length: ' + token.length + ')' : 'EMPTY STRING'}`);
        this._logService.info(`[PukuAIProvider] Creating endpoint with${token ? '' : 'out'} token for URL: ${url}`);
        console.log(`[PukuAIProvider] Creating endpoint with${token ? '' : 'out'} token for URL: ${url}`);
        return this._instantiationService.createInstance(pukuaiEndpoint_1.PukuAIEndpoint, modelInfo, token, url);
    }
    async _getAllModels() {
        this._logService.info(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);
        console.log(`Puku AI: getAllModels called for endpoint ${this._pukuBaseUrl}`);
        try {
            const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/tags`, { method: 'GET' });
            const data = await response.json();
            const models = data.models;
            this._logService.info(`Puku AI: Fetched ${models.length} models from ${this._pukuBaseUrl}/api/tags`);
            console.log(`Puku AI: Fetched ${models.length} models:`, models.map((m) => m.model).join(', '));
            const knownModels = new Map();
            for (const model of models) {
                this._logService.info(`Puku AI: Processing model ${model.model}`);
                const modelInfo = await this._getModelInfo(model.model);
                this._modelCache.set(model.model, modelInfo);
                const knownModel = {
                    name: modelInfo.name,
                    maxInputTokens: modelInfo.capabilities.limits?.max_prompt_tokens ?? 4096,
                    maxOutputTokens: modelInfo.capabilities.limits?.max_output_tokens ?? 4096,
                    toolCalling: !!modelInfo.capabilities.supports.tool_calls,
                    vision: !!modelInfo.capabilities.supports.vision
                };
                knownModels.set(model.model, knownModel);
                this._knownModels.set(model.model, knownModel);
                this._logService.info(`Puku AI: Model ${model.model} registered: toolCalling=${knownModel.toolCalling}, vision=${knownModel.vision}`);
            }
            this._logService.info(`Puku AI: Returning ${knownModels.size} models`);
            console.log(`Puku AI: Returning ${knownModels.size} models:`, Array.from(knownModels.keys()));
            return knownModels;
        }
        catch (e) {
            this._logService.error(`Puku AI: Failed to fetch models: ${e}`);
            console.error(`Puku AI: Failed to fetch models: ${e}`);
            throw new Error('Failed to fetch models from Puku AI. Please check your connection to api.puku.sh.');
        }
    }
    async _getModelInfo(modelId) {
        if (this._modelCache.has(modelId)) {
            return this._modelCache.get(modelId);
        }
        const modelApiInfo = await this._getPukuAIModelInformation(modelId);
        console.log(`Puku AI: Model info for ${modelId}:`, JSON.stringify(modelApiInfo, null, 2));
        // Handle cases where model_info might be undefined or missing fields
        let contextWindow = 128000;
        let modelName = modelId;
        if (modelApiInfo.model_info) {
            const architecture = modelApiInfo.model_info['general.architecture'] || 'puku';
            contextWindow = modelApiInfo.model_info[`${architecture}.context_length`] ?? 128000;
            modelName = modelApiInfo.model_info['general.basename'] || modelId;
        }
        const outputTokens = 8192;
        // GLM-4.5-Air DOES support tool calling according to Z.AI docs, but API may report it incorrectly
        // Override for puku-ai-air model
        let toolCalling = modelApiInfo.capabilities?.supports?.tools ?? false;
        let vision = modelApiInfo.capabilities?.supports?.vision ?? false;
        if (modelId === 'puku-ai-air') {
            toolCalling = true; // GLM-4.5-Air supports tool calling per Z.AI documentation
            this._logService.info(`[PukuAIProvider] Overriding puku-ai-air capabilities: toolCalling=true`);
        }
        console.log(`Puku AI: ${modelId} capabilities:`, modelApiInfo.capabilities);
        console.log(`Puku AI: ${modelId} parsed - toolCalling: ${toolCalling}, vision: ${vision}`);
        const modelInfo = {
            id: modelId,
            name: modelName,
            version: '1.0.0',
            capabilities: {
                type: 'chat',
                family: modelId,
                supports: {
                    streaming: true,
                    tool_calls: toolCalling,
                    vision: vision,
                    thinking: false
                },
                tokenizer: tokenizer_1.TokenizerType.O200K,
                limits: {
                    max_context_window_tokens: contextWindow,
                    max_prompt_tokens: contextWindow - outputTokens,
                    max_output_tokens: outputTokens
                }
            },
            is_chat_default: false,
            is_chat_fallback: false,
            model_picker_enabled: true
        };
        this._modelCache.set(modelId, modelInfo);
        return modelInfo;
    }
    async _getPukuAIModelInformation(modelId) {
        const response = await this._fetcherService.fetch(`${this._pukuBaseUrl}/api/show`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: modelId })
        });
        return response.json();
    }
    _modelsToAPIInfo(models) {
        const result = [];
        let index = 0;
        console.log(`Puku AI: _modelsToAPIInfo called with ${models.size} models:`, Array.from(models.keys()));
        for (const [id, capabilities] of models) {
            const modelInfo = {
                id,
                name: capabilities.name,
                version: '1.0.0',
                maxOutputTokens: capabilities.maxOutputTokens,
                maxInputTokens: capabilities.maxInputTokens,
                detail: PukuAILanguageModelProvider_1.providerName,
                family: PukuAILanguageModelProvider_1.providerName,
                tooltip: `${capabilities.name} is contributed via the ${PukuAILanguageModelProvider_1.providerName} provider.`,
                isUserSelectable: true,
                isDefault: index === 0,
                capabilities: {
                    toolCalling: capabilities.toolCalling,
                    imageInput: capabilities.vision
                },
            };
            console.log(`Puku AI: Adding model ${id} - name: ${capabilities.name}, toolCalling: ${capabilities.toolCalling}, vision: ${capabilities.vision}`);
            result.push(modelInfo);
            index++;
        }
        console.log(`Puku AI: _modelsToAPIInfo returning ${result.length} models`);
        return result;
    }
};
exports.PukuAILanguageModelProvider = PukuAILanguageModelProvider;
exports.PukuAILanguageModelProvider = PukuAILanguageModelProvider = PukuAILanguageModelProvider_1 = __decorate([
    __param(1, fetcherService_1.IFetcherService),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, pukuAuth_1.IPukuAuthService)
], PukuAILanguageModelProvider);
//# sourceMappingURL=pukuaiProvider.js.map