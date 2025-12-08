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
var PukuAILMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuAILMProvider = void 0;
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const fetcherService_1 = require("../../../platform/networking/common/fetcherService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pukuaiEndpoint_1 = require("../../pukuai/node/pukuaiEndpoint");
const baseOpenAICompatibleProvider_1 = require("./baseOpenAICompatibleProvider");
// Minimum supported version
const MINIMUM_PUKUAI_VERSION = '0.6.4';
let PukuAILMProvider = class PukuAILMProvider extends baseOpenAICompatibleProvider_1.BaseOpenAICompatibleLMProvider {
    static { PukuAILMProvider_1 = this; }
    static { this.providerName = 'Puku AI'; }
    constructor(_pukuAIBaseUrl, byokStorageService, _fetcherService, _logService, _instantiationService) {
        super(2 /* BYOKAuthType.None */, PukuAILMProvider_1.providerName, `${_pukuAIBaseUrl}/v1`, undefined, byokStorageService, _fetcherService, _logService, _instantiationService);
        this._pukuAIBaseUrl = _pukuAIBaseUrl;
        this._modelCache = new Map();
    }
    async getAllModels() {
        this._logService.info(`Puku AI: getAllModels called for endpoint ${this._pukuAIBaseUrl}`);
        try {
            // Check server version before proceeding
            await this._checkPukuAIVersion();
            const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/tags`, { method: 'GET' });
            const models = (await response.json()).models;
            this._logService.info(`Puku AI: Fetched ${models.length} models from ${this._pukuAIBaseUrl}/api/tags`);
            const knownModels = {};
            for (const model of models) {
                this._logService.info(`Puku AI: Processing model ${model.model}`);
                const modelInfo = await this.getModelInfo(model.model, '', undefined);
                this._modelCache.set(model.model, modelInfo);
                knownModels[model.model] = {
                    maxInputTokens: modelInfo.capabilities.limits?.max_prompt_tokens ?? 4096,
                    maxOutputTokens: modelInfo.capabilities.limits?.max_output_tokens ?? 4096,
                    name: modelInfo.name,
                    toolCalling: !!modelInfo.capabilities.supports.tool_calls,
                    vision: !!modelInfo.capabilities.supports.vision
                };
                this._logService.info(`Puku AI: Model ${model.model} registered: toolCalling=${knownModels[model.model].toolCalling}, vision=${knownModels[model.model].vision}`);
            }
            this._logService.info(`Puku AI: Returning ${Object.keys(knownModels).length} models`);
            return knownModels;
        }
        catch (e) {
            // Check if this is our version check error and preserve it
            if (e instanceof Error && e.message.includes('Puku AI server version')) {
                this._logService.error(`Puku AI: Version check failed: ${e.message}`);
                throw e;
            }
            this._logService.error(`Puku AI: Failed to fetch models: ${e}`);
            throw new Error('Failed to fetch models from Puku AI. Please ensure Puku AI proxy is running. Configure the endpoint in settings if needed.');
        }
    }
    /**
     * Compare version strings to check if current version meets minimum requirements
     * @param currentVersion Current server version
     * @returns true if version is supported, false otherwise
     */
    _isVersionSupported(currentVersion) {
        // Simple version comparison: split by dots and compare numerically
        const currentParts = currentVersion.split('.').map(n => parseInt(n, 10));
        const minimumParts = MINIMUM_PUKUAI_VERSION.split('.').map(n => parseInt(n, 10));
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
    async _getPukuAIModelInformation(modelId) {
        const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/show`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: modelId })
        });
        return response.json();
    }
    async getModelInfo(modelId, apiKey, modelCapabilities) {
        if (this._modelCache.has(modelId)) {
            return this._modelCache.get(modelId);
        }
        if (!modelCapabilities) {
            const modelInfo = await this._getPukuAIModelInformation(modelId);
            const contextWindow = modelInfo.model_info[`${modelInfo.model_info['general.architecture']}.context_length`] ?? 128000;
            const outputTokens = contextWindow < 4096 ? Math.floor(contextWindow / 2) : 8192;
            modelCapabilities = {
                name: modelInfo.model_info['general.basename'] || modelId,
                maxOutputTokens: outputTokens,
                maxInputTokens: contextWindow - outputTokens,
                vision: modelInfo.capabilities.includes("vision"),
                toolCalling: modelInfo.capabilities.includes("tools")
            };
        }
        return super.getModelInfo(modelId, apiKey, modelCapabilities);
    }
    /**
     * Override to use PukuAIEndpoint which properly preserves tools
     */
    async getEndpointImpl(model) {
        const modelInfo = await this.getModelInfo(model.id, '');
        const url = modelInfo.supported_endpoints?.includes(endpointProvider_1.ModelSupportedEndpoint.Responses) ?
            `${this._pukuAIBaseUrl}/v1/responses` :
            `${this._pukuAIBaseUrl}/v1/chat/completions`;
        return this._instantiationService.createInstance(pukuaiEndpoint_1.PukuAIEndpoint, modelInfo, '', url);
    }
    /**
     * Check if the connected Puku AI server version meets the minimum requirements
     * @throws Error if version is below minimum or version check fails
     */
    async _checkPukuAIVersion() {
        try {
            const response = await this._fetcherService.fetch(`${this._pukuAIBaseUrl}/api/version`, { method: 'GET' });
            const versionInfo = await response.json();
            if (!this._isVersionSupported(versionInfo.version)) {
                throw new Error(`Puku AI server version ${versionInfo.version} is not supported. ` +
                    `Please upgrade to version ${MINIMUM_PUKUAI_VERSION} or higher.`);
            }
        }
        catch (e) {
            if (e instanceof Error && e.message.includes('Puku AI server version')) {
                // Re-throw our custom version error
                throw e;
            }
            // If version endpoint fails
            throw new Error(`Unable to verify Puku AI server version. Please ensure you have Puku AI proxy version ${MINIMUM_PUKUAI_VERSION} or higher running.`);
        }
    }
};
exports.PukuAILMProvider = PukuAILMProvider;
exports.PukuAILMProvider = PukuAILMProvider = PukuAILMProvider_1 = __decorate([
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, instantiation_1.IInstantiationService)
], PukuAILMProvider);
//# sourceMappingURL=pukuAIProvider.js.map