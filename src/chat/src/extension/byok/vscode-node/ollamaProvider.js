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
var OllamaLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaLMProvider = void 0;
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
// Minimum supported Ollama version - versions below this may have compatibility issues
const MINIMUM_OLLAMA_VERSION = '0.6.4';
let OllamaLMProvider = class OllamaLMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { OllamaLMProvider_1 = this; }
    static { this.providerName = 'Ollama'; }
    constructor(_ollamaBaseUrl, byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(2 /* BYOKAuthType.None */, OllamaLMProvider_1.providerName, `${_ollamaBaseUrl}/v1`, undefined, byokStorageService, _fetcherService, _logService, _instantiationService);
        this._ollamaBaseUrl = _ollamaBaseUrl;
        this._modelCache = new Map();
    }
    async getAllModels() {
        this._logService.info(`Ollama: getAllModels called for endpoint ${this._ollamaBaseUrl}`);
        try {
            // Check Ollama server version before proceeding with model operations
            await this._checkOllamaVersion();
            const response = await this._fetcherService.fetch(`${this._ollamaBaseUrl}/api/tags`, { method: 'GET' });
            const models = (await response.json()).models;
            this._logService.info(`Ollama: Fetched ${models.length} models from ${this._ollamaBaseUrl}/api/tags`);
            const knownModels = {};
            for (const model of models) {
                this._logService.info(`Ollama: Processing model ${model.model}`);
                const modelInfo = await this.getModelInfo(model.model, '', undefined);
                this._modelCache.set(model.model, modelInfo);
                knownModels[model.model] = {
                    maxInputTokens: modelInfo.capabilities.limits?.max_prompt_tokens ?? 4096,
                    maxOutputTokens: modelInfo.capabilities.limits?.max_output_tokens ?? 4096,
                    name: modelInfo.name,
                    toolCalling: !!modelInfo.capabilities.supports.tool_calls,
                    vision: !!modelInfo.capabilities.supports.vision
                };
                this._logService.info(`Ollama: Model ${model.model} registered: toolCalling=${knownModels[model.model].toolCalling}, vision=${knownModels[model.model].vision}`);
            }
            this._logService.info(`Ollama: Returning ${Object.keys(knownModels).length} models`);
            return knownModels;
        }
        catch (e) {
            // Check if this is our version check error and preserve it
            if (e instanceof Error && e.message.includes('Ollama server version')) {
                this._logService.error(`Ollama: Version check failed: ${e.message}`);
                throw e;
            }
            this._logService.error(`Ollama: Failed to fetch models: ${e}`);
            throw new Error('Failed to fetch models from Ollama. Please ensure Ollama is running. If ollama is on another host, please configure the `"puku.chat.byok.ollamaEndpoint"` setting.');
        }
    }
    /**
     * Compare version strings to check if current version meets minimum requirements
     * @param currentVersion Current Ollama server version
     * @returns true if version is supported, false otherwise
     */
    _isVersionSupported(currentVersion) {
        // Simple version comparison: split by dots and compare numerically
        const currentParts = currentVersion.split('.').map(n => parseInt(n, 10));
        const minimumParts = MINIMUM_OLLAMA_VERSION.split('.').map(n => parseInt(n, 10));
        for (let i = 0; i < Math.max(currentParts.length, minimumParts.length); i++) {
            const current = currentParts[i] || 0;
            const minimum = minimumParts[i] || 0;
            if (current > minimum) {
                return true;
            }
            if (current < minimum) {
                return false;
            }
        }
        return true; // versions are equal
    }
    async _getOllamaModelInformation(modelId) {
        const response = await this._fetcherService.fetch(`${this._ollamaBaseUrl}/api/show`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: modelId })
        });
        return response.json();
    }
    async getModelInfo(modelId, apiKey, modelCapabilities) {
        if (this._modelCache.has(modelId)) {
            return this._modelCache.get(modelId);
        }
        if (!modelCapabilities) {
            const modelInfo = await this._getOllamaModelInformation(modelId);
            const contextWindow = modelInfo.model_info[`${modelInfo.model_info['general.architecture']}.context_length`] ?? 4096;
            const outputTokens = contextWindow < 4096 ? Math.floor(contextWindow / 2) : 4096;
            modelCapabilities = {
                name: modelInfo.model_info['general.basename'],
                maxOutputTokens: outputTokens,
                maxInputTokens: contextWindow - outputTokens,
                vision: modelInfo.capabilities.includes("vision"),
                toolCalling: modelInfo.capabilities.includes("tools")
            };
        }
        return super.getModelInfo(modelId, apiKey, modelCapabilities);
    }
    /**
     * Check if the connected Ollama server version meets the minimum requirements
     * @throws Error if version is below minimum or version check fails
     */
    async _checkOllamaVersion() {
        try {
            const response = await this._fetcherService.fetch(`${this._ollamaBaseUrl}/api/version`, { method: 'GET' });
            const versionInfo = await response.json();
            if (!this._isVersionSupported(versionInfo.version)) {
                throw new Error(`Ollama server version ${versionInfo.version} is not supported. ` +
                    `Please upgrade to version ${MINIMUM_OLLAMA_VERSION} or higher. ` +
                    `Visit https://ollama.ai for upgrade instructions.`);
            }
        }
        catch (e) {
            if (e instanceof Error && e.message.includes('Ollama server version')) {
                // Re-throw our custom version error
                throw e;
            }
            // If version endpoint fails
            throw new Error(`Unable to verify Ollama server version. Please ensure you have Ollama version ${MINIMUM_OLLAMA_VERSION} or higher installed. ` +
                `If you're running an older version, please upgrade from https://ollama.ai`);
        }
    }
};
exports.OllamaLMProvider = OllamaLMProvider;
exports.OllamaLMProvider = OllamaLMProvider = OllamaLMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService)
], OllamaLMProvider);
//# sourceMappingURL=ollamaProvider.js.map