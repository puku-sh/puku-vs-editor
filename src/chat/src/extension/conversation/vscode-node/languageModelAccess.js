"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotLanguageModelWrapper = exports.LanguageModelAccess = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const blockedExtensionService_1 = require("../../../platform/chat/common/blockedExtensionService");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const endpointTypes_1 = require("../../../platform/endpoint/common/endpointTypes");
const modelAliasRegistry_1 = require("../../../platform/endpoint/common/modelAliasRegistry");
const statefulMarkerContainer_1 = require("../../../platform/endpoint/common/statefulMarkerContainer");
const autoChatEndpoint_1 = require("../../../platform/endpoint/node/autoChatEndpoint");
const automodeService_1 = require("../../../platform/endpoint/node/automodeService");
const envService_1 = require("../../../platform/env/common/envService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const logService_1 = require("../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const thinking_1 = require("../../../platform/thinking/common/thinking");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const types_1 = require("../../../util/vs/base/common/types");
const nls_1 = require("../../../util/vs/nls");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const languageModelChatMessageHelpers_1 = require("../common/languageModelChatMessageHelpers");
const languageModelAccessPrompt_1 = require("./languageModelAccessPrompt");
let LanguageModelAccess = class LanguageModelAccess extends lifecycle_1.Disposable {
    constructor(_logService, _instantiationService, _authenticationService, _configurationService, _endpointProvider, _embeddingsComputer, _vsCodeExtensionContext, _automodeService, _expService) {
        super();
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._authenticationService = _authenticationService;
        this._configurationService = _configurationService;
        this._endpointProvider = _endpointProvider;
        this._embeddingsComputer = _embeddingsComputer;
        this._vsCodeExtensionContext = _vsCodeExtensionContext;
        this._automodeService = _automodeService;
        this._expService = _expService;
        this.id = 'languageModelAccess';
        this._onDidChange = this._register(new event_1.Emitter());
        this._currentModels = []; // Store current models for reference
        this._chatEndpoints = [];
        this._lmWrapper = this._instantiationService.createInstance(CopilotLanguageModelWrapper);
        this._promptBaseCountCache = this._instantiationService.createInstance(LanguageModelAccessPromptBaseCountCache);
        if (this._vsCodeExtensionContext.extensionMode === vscodeTypes_1.ExtensionMode.Test && !envService_1.isScenarioAutomation) {
            this._logService.warn('[LanguageModelAccess] LanguageModels and Embeddings are NOT AVAILABLE in test mode.');
            return;
        }
        // initial
        this.activationBlocker = Promise.all([
            this._registerChatProvider(),
            this._registerEmbeddings(),
        ]).then(() => { });
    }
    dispose() {
        super.dispose();
    }
    get currentModels() {
        return this._currentModels;
    }
    async _registerChatProvider() {
        // Puku Editor: Puku AI now registers as 'pukuai' vendor, so no conflict with 'copilot'
        // This provider registers as 'copilot' for GitHub Copilot models
        const provider = {
            onDidChangeLanguageModelChatInformation: this._onDidChange.event,
            provideLanguageModelChatInformation: this._provideLanguageModelChatInfo.bind(this),
            provideLanguageModelChatResponse: this._provideLanguageModelChatResponse.bind(this),
            provideTokenCount: this._provideTokenCount.bind(this)
        };
        this._register(vscode.lm.registerLanguageModelChatProvider('copilot', provider));
        this._register(this._authenticationService.onDidAuthenticationChange(() => {
            // Auth changed which means models could've changed. Fire the event
            this._onDidChange.fire();
        }));
    }
    async _provideLanguageModelChatInfo(options, token) {
        // Puku Editor: Check if Ollama or Puku AI endpoint is configured
        // When these are configured (no GitHub auth), their contributions will register their own providers
        // In that case, this provider won't be called. Otherwise, provide GitHub Copilot models.
        const isOllamaConfigured = this._configurationService.isConfigured(configurationService_1.ConfigKey.OllamaEndpoint);
        const pukuAIEndpoint = this._configurationService.getConfig(configurationService_1.ConfigKey.PukuAIEndpoint);
        const isPukuAIConfigured = this._configurationService.isConfigured(configurationService_1.ConfigKey.PukuAIEndpoint);
        // Try to get GitHub session, but don't fail if it's not available (e.g., when using Puku AI)
        let session = undefined;
        try {
            session = await this._getToken();
        }
        catch (error) {
            // If GitHub login fails, it's OK when using Puku AI or Ollama
            // The error will be handled gracefully by returning empty models
            if (isPukuAIConfigured || isOllamaConfigured || pukuAIEndpoint) {
                // Expected - no GitHub auth needed
                session = undefined;
            }
            else {
                // Only log the error if we're not in Puku AI/Ollama mode
                this._logService.warn(`[LanguageModelAccess] GitHub login failed: ${error}`);
            }
        }
        this._logService.info(`[LanguageModelAccess] _provideLanguageModelChatInfo called, isOllamaConfigured: ${isOllamaConfigured}, isPukuAIConfigured: ${isPukuAIConfigured}, pukuAIEndpoint: ${pukuAIEndpoint}, has session: ${!!session}`);
        console.log(`[LanguageModelAccess] _provideLanguageModelChatInfo called, isOllamaConfigured: ${isOllamaConfigured}, isPukuAIConfigured: ${isPukuAIConfigured}, pukuAIEndpoint: ${pukuAIEndpoint}, has session: ${!!session}`);
        // If Ollama endpoint is configured and we have no GitHub session, return empty
        // (BYOKContrib will have registered Ollama provider as "copilot" vendor instead)
        if (isOllamaConfigured && !session) {
            this._logService.info(`[LanguageModelAccess] Ollama endpoint configured with no GitHub auth, returning empty (Ollama provider registered as copilot vendor)`);
            console.log(`[LanguageModelAccess] Ollama endpoint configured with no GitHub auth, returning empty (Ollama provider registered as copilot vendor)`);
            this._currentModels = [];
            return [];
        }
        // If Puku AI endpoint is set (even if default) and we have no GitHub session, return empty
        // (PukuAIContribution will have registered its own provider instead)
        if ((isPukuAIConfigured || pukuAIEndpoint) && !session) {
            this._logService.info(`[LanguageModelAccess] Puku AI endpoint set (${pukuAIEndpoint}) with no GitHub auth, returning empty (Puku AI provider registered)`);
            console.log(`[LanguageModelAccess] Puku AI endpoint set (${pukuAIEndpoint}) with no GitHub auth, returning empty (Puku AI provider registered)`);
            this._currentModels = [];
            return [];
        }
        if (!session) {
            this._logService.warn(`[LanguageModelAccess] No session and no Puku AI/Ollama endpoint, returning empty models`);
            console.log(`[LanguageModelAccess] No session and no Puku AI/Ollama endpoint, returning empty models`);
            this._currentModels = [];
            return [];
        }
        const models = [];
        // Puku Editor: Filter to only show GLM models from Ollama
        const allChatEndpoints = await this._endpointProvider.getAllChatEndpoints();
        const chatEndpoints = allChatEndpoints.filter(e => (e.model && e.model.startsWith('GLM-')) || e.model === 'gpt-4o-mini');
        // Puku Editor: Only add auto mode endpoint if we have GitHub Copilot endpoints
        let autoEndpoint;
        if (chatEndpoints.length > 0 && chatEndpoints.some(e => !e.model.startsWith('GLM-'))) {
            autoEndpoint = await this._automodeService.resolveAutoModeEndpoint(undefined, chatEndpoints);
            chatEndpoints.push(autoEndpoint);
        }
        let defaultChatEndpoint;
        const defaultExpModel = this._expService.getTreatmentVariable('chat.defaultLanguageModel')?.replace('copilot/', '');
        if (this._authenticationService.copilotToken?.isNoAuthUser) {
            // No Auth users always get Auto as the default model
            defaultChatEndpoint = autoEndpoint;
        }
        else if (defaultExpModel === autoChatEndpoint_1.AutoChatEndpoint.pseudoModelId) {
            // Auto is a fake model id so force map it
            defaultChatEndpoint = autoEndpoint;
        }
        else if (defaultExpModel) {
            // Find exp default
            defaultChatEndpoint = chatEndpoints.find(e => e.model === defaultExpModel);
        }
        if (!defaultChatEndpoint) {
            // Find a default set by CAPI
            defaultChatEndpoint = chatEndpoints.find(e => e.isDefault) ?? await this._endpointProvider.getChatEndpoint('gpt-4.1') ?? chatEndpoints[0];
        }
        const seenFamilies = new Set();
        for (const endpoint of chatEndpoints) {
            if (seenFamilies.has(endpoint.family) && !endpoint.showInModelPicker) {
                continue;
            }
            seenFamilies.add(endpoint.family);
            const sanitizedModelName = endpoint.name.replace(/\(Preview\)/g, '').trim();
            let modelDescription;
            if (endpoint.degradationReason) {
                modelDescription = endpoint.degradationReason;
            }
            else if (endpoint instanceof autoChatEndpoint_1.AutoChatEndpoint) {
                if (this._authenticationService.copilotToken?.isNoAuthUser || (endpoint.discountRange.low === 0 && endpoint.discountRange.high === 0)) {
                    modelDescription = (0, nls_1.localize)('languageModel.autoTooltipNoAuth', 'Auto selects the best model for your request based on capacity and performance.');
                }
                else if (endpoint.discountRange.low === endpoint.discountRange.high) {
                    modelDescription = (0, nls_1.localize)('languageModel.autoTooltipSameDiscount', 'Auto selects the best model for your request based on capacity and performance. Auto is given a {0}% discount.', endpoint.discountRange.low * 100);
                }
                else {
                    modelDescription = (0, nls_1.localize)('languageModel.autoTooltipDiffDiscount', 'Auto selects the best model for your request based on capacity and performance. Auto is given a {0}% to {1}% discount.', endpoint.discountRange.low * 100, endpoint.discountRange.high * 100);
                }
            }
            else if (endpoint.multiplier) {
                modelDescription = (0, nls_1.localize)('languageModel.costTooltip', '{0} ({1}) is counted at a {2}x rate.', sanitizedModelName, endpoint.version, endpoint.multiplier);
            }
            else if (endpoint.isFallback && endpoint.multiplier === 0) {
                modelDescription = (0, nls_1.localize)('languageModel.baseTooltip', '{0} ({1}) does not count towards your premium request limit. This model may be slowed during times of high congestion.', sanitizedModelName, endpoint.version);
            }
            else {
                modelDescription = `${sanitizedModelName} (${endpoint.version})`;
            }
            let modelCategory;
            if (endpoint instanceof autoChatEndpoint_1.AutoChatEndpoint) {
                modelCategory = { label: '', order: Number.MIN_SAFE_INTEGER };
            }
            else if (endpoint.isPremium === undefined || this._authenticationService.copilotToken?.isFreeUser) {
                modelCategory = { label: (0, nls_1.localize)('languageModelHeader.copilot', "Puku AI Models"), order: 0 };
            }
            else if (endpoint.isPremium) {
                modelCategory = { label: (0, nls_1.localize)('languageModelHeader.premium', "Premium Models"), order: 1 };
            }
            else {
                modelCategory = { label: (0, nls_1.localize)('languageModelHeader.standard', "Standard Models"), order: 0 };
            }
            // Counting tokens requires instantiating the tokenizers, which makes this process use a lot of memory.
            // Let's cache the results across extension activations
            const baseCount = await this._promptBaseCountCache.getBaseCount(endpoint);
            let modelDetail = endpoint.multiplier !== undefined ? `${endpoint.multiplier}x` : undefined;
            if (endpoint instanceof autoChatEndpoint_1.AutoChatEndpoint) {
                if (endpoint.discountRange.high === endpoint.discountRange.low && endpoint.discountRange.low !== 0) {
                    modelDetail = `${endpoint.discountRange.low * 100}% discount`;
                }
                else if (endpoint.discountRange.high !== endpoint.discountRange.low) {
                    modelDetail = `${endpoint.discountRange.low * 100}% to ${endpoint.discountRange.high * 100}% discount`;
                }
            }
            if (endpoint.customModel) {
                const customModel = endpoint.customModel;
                modelDetail = customModel.owner_name;
                modelDescription = `${endpoint.name} is contributed by ${customModel.owner_name} using ${customModel.key_name}`;
                modelCategory = { label: (0, nls_1.localize)('languageModelHeader.custom_models', "Custom Models"), order: 2 };
            }
            const session = this._authenticationService.anyGitHubSession;
            const model = {
                id: endpoint instanceof autoChatEndpoint_1.AutoChatEndpoint ? autoChatEndpoint_1.AutoChatEndpoint.pseudoModelId : endpoint.model,
                name: endpoint instanceof autoChatEndpoint_1.AutoChatEndpoint ? 'Auto' : endpoint.name,
                family: endpoint.family,
                tooltip: modelDescription,
                detail: modelDetail,
                category: modelCategory,
                statusIcon: endpoint.degradationReason ? new vscode.ThemeIcon('warning') : undefined,
                version: endpoint.version,
                maxInputTokens: endpoint.modelMaxPromptTokens - baseCount - tokenizer_1.BaseTokensPerCompletion,
                maxOutputTokens: endpoint.maxOutputTokens,
                requiresAuthorization: session && { label: session.account.label },
                isDefault: endpoint === defaultChatEndpoint,
                isUserSelectable: endpoint.showInModelPicker,
                capabilities: {
                    imageInput: endpoint.supportsVision,
                    toolCalling: endpoint.supportsToolCalls,
                }
            };
            models.push(model);
            // Register aliases for this model
            const aliases = modelAliasRegistry_1.ModelAliasRegistry.getAliases(model.id);
            for (const alias of aliases) {
                models.push({
                    ...model,
                    id: alias,
                    family: alias,
                    isUserSelectable: false,
                });
            }
        }
        this._currentModels = models;
        this._chatEndpoints = chatEndpoints;
        return models;
    }
    async _provideLanguageModelChatResponse(model, messages, options, progress, token) {
        const endpoint = this._chatEndpoints.find(e => e.model === modelAliasRegistry_1.ModelAliasRegistry.resolveAlias(model.id));
        if (!endpoint) {
            throw new Error(`Endpoint not found for model ${model.id}`);
        }
        return this._lmWrapper.provideLanguageModelResponse(endpoint, messages, {
            ...options,
            modelOptions: options.modelOptions
        }, options.requestInitiator, progress, token);
    }
    async _provideTokenCount(model, text, token) {
        const endpoint = this._chatEndpoints.find(e => e.model === modelAliasRegistry_1.ModelAliasRegistry.resolveAlias(model.id));
        if (!endpoint) {
            throw new Error(`Endpoint not found for model ${model.id}`);
        }
        return this._lmWrapper.provideTokenCount(endpoint, text);
    }
    async _registerEmbeddings() {
        const dispo = this._register(new lifecycle_1.MutableDisposable());
        const update = async () => {
            if (!await this._getToken()) {
                dispo.clear();
                return;
            }
            const embeddingsComputer = this._embeddingsComputer;
            const embeddingType = embeddingsComputer_1.EmbeddingType.text3small_512;
            const model = (0, embeddingsComputer_1.getWellKnownEmbeddingTypeInfo)(embeddingType)?.model;
            if (!model) {
                throw new Error(`No model found for embedding type ${embeddingType.id}`);
            }
            dispo.clear();
            dispo.value = vscode.lm.registerEmbeddingsProvider(`copilot.${model}`, new class {
                async provideEmbeddings(input, token) {
                    const result = await embeddingsComputer.computeEmbeddings(embeddingType, input, {}, new telemetryCorrelationId_1.TelemetryCorrelationId('EmbeddingsProvider::provideEmbeddings'), token);
                    return result.values.map(embedding => ({ values: embedding.value.slice(0) }));
                }
            });
        };
        this._register(this._authenticationService.onDidAuthenticationChange(() => update()));
        await update();
    }
    async _getToken() {
        try {
            const copilotToken = await this._authenticationService.getCopilotToken();
            return copilotToken;
        }
        catch (e) {
            this._logService.warn('[LanguageModelAccess] LanguageModel/Embeddings are not available without auth token');
            this._logService.error(e);
            return undefined;
        }
    }
};
exports.LanguageModelAccess = LanguageModelAccess;
exports.LanguageModelAccess = LanguageModelAccess = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, embeddingsComputer_1.IEmbeddingsComputer),
    __param(6, extensionContext_1.IVSCodeExtensionContext),
    __param(7, automodeService_1.IAutomodeService),
    __param(8, nullExperimentationService_1.IExperimentationService)
], LanguageModelAccess);
let LanguageModelAccessPromptBaseCountCache = class LanguageModelAccessPromptBaseCountCache {
    constructor(_extensionContext, _instantiationService, _envService) {
        this._extensionContext = _extensionContext;
        this._instantiationService = _instantiationService;
        this._envService = _envService;
    }
    async getBaseCount(endpoint) {
        const key = `lmBaseCount/${endpoint.model}`;
        const cached = this._extensionContext.globalState.get(key);
        if (cached && cached.extensionVersion === this._envService.getVersion() && typeof cached.baseCount === 'number') {
            return cached.baseCount;
        }
        const baseCount = await this._computeBaseCount(endpoint);
        // Store the computed value along with the extension version so we can
        // invalidate the cache when the extension is updated.
        try {
            await this._extensionContext.globalState.update(key, { extensionVersion: this._envService.getVersion(), baseCount });
        }
        catch (err) {
            // Best-effort cache update — don't fail the caller if persisting the
            // cache entry fails for any reason.
        }
        return baseCount;
    }
    async _computeBaseCount(endpoint) {
        const baseCount = await promptRenderer_1.PromptRenderer.create(this._instantiationService, endpoint, languageModelAccessPrompt_1.LanguageModelAccessPrompt, { noSafety: false, messages: [] }).countTokens();
        return baseCount;
    }
};
LanguageModelAccessPromptBaseCountCache = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, envService_1.IEnvService)
], LanguageModelAccessPromptBaseCountCache);
/**
 * Exported for test
 */
let CopilotLanguageModelWrapper = class CopilotLanguageModelWrapper extends lifecycle_1.Disposable {
    constructor(_expService, _telemetryService, _blockedExtensionService, _instantiationService, _logService, _authenticationService, _configurationService, _envService) {
        super();
        this._expService = _expService;
        this._telemetryService = _telemetryService;
        this._blockedExtensionService = _blockedExtensionService;
        this._instantiationService = _instantiationService;
        this._logService = _logService;
        this._authenticationService = _authenticationService;
        this._configurationService = _configurationService;
        this._envService = _envService;
    }
    async _provideLanguageModelResponse(_endpoint, _messages, _options, extensionId, callback, token) {
        const extensionInfo = extensionId === 'core' ? { packageJSON: { version: this._envService.vscodeVersion } } : vscode.extensions.getExtension(extensionId, true);
        if (!extensionInfo || typeof extensionInfo.packageJSON.version !== 'string') {
            throw new Error('Invalid extension information');
        }
        const extensionVersion = extensionInfo.packageJSON.version;
        const blockedExtensionMessage = vscode.l10n.t('The extension has been temporarily blocked due to making too many requests. Please try again later.');
        if (this._blockedExtensionService.isExtensionBlocked(extensionId)) {
            throw vscode.LanguageModelError.Blocked(blockedExtensionMessage);
        }
        const toolTokenCount = _options.tools ? await this.countToolTokens(_endpoint, _options.tools) : 0;
        const baseCount = await promptRenderer_1.PromptRenderer.create(this._instantiationService, _endpoint, languageModelAccessPrompt_1.LanguageModelAccessPrompt, { noSafety: false, messages: [] }).countTokens();
        const tokenLimit = _endpoint.modelMaxPromptTokens - baseCount - tokenizer_1.BaseTokensPerCompletion - toolTokenCount;
        this.validateRequest(_messages);
        if (_options.tools) {
            this.validateTools(_options.tools);
        }
        // Add safety rules to the prompt if it originates from outside the Copilot Chat extension, otherwise they already exist in the prompt.
        const { messages, tokenCount } = await promptRenderer_1.PromptRenderer.create(this._instantiationService, {
            ..._endpoint,
            modelMaxPromptTokens: tokenLimit
        }, languageModelAccessPrompt_1.LanguageModelAccessPrompt, { noSafety: extensionId === this._envService.extensionId, messages: _messages }).render();
        /* __GDPR__
            "languagemodelrequest" : {
                "owner": "jrieken",
                "comment": "Data about extensions using the language model",
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is being used" },
                "extensionId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The extension identifier for which we make the request" },
                "extensionVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The extension version for which we make the request" },
                "tokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of tokens" },
                "tokenLimit": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of tokens that can be used" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('languagemodelrequest', {
            extensionId,
            extensionVersion,
            model: _endpoint.model
        }, {
            tokenCount,
            tokenLimit
        });
        // If no messages they got rendered out due to token limit
        if (messages.length === 0 || tokenCount > tokenLimit) {
            throw new Error('Message exceeds token limit.');
        }
        if (_options.tools && _options.tools.length > 128) {
            throw new Error('Cannot have more than 128 tools per request.');
        }
        const endpoint = new Proxy(_endpoint, {
            get: function (target, prop, receiver) {
                if (prop === 'getExtraHeaders') {
                    return function () {
                        const extraHeaders = target.getExtraHeaders?.() ?? {};
                        if (extensionId === 'core') {
                            return extraHeaders;
                        }
                        return {
                            ...extraHeaders,
                            'x-onbehalf-extension-id': `${extensionId}/${extensionVersion}`,
                        };
                    };
                }
                if (prop === 'acquireTokenizer') {
                    return target.acquireTokenizer.bind(target);
                }
                return Reflect.get(target, prop, receiver);
            }
        });
        const options = LanguageModelOptions.Default.convert(_options.modelOptions ?? {});
        const telemetryProperties = { messageSource: `api.${extensionId}` };
        options.tools = _options.tools?.map((tool) => {
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema && Object.keys(tool.inputSchema).length ? tool.inputSchema : undefined
                }
            };
        });
        console.log(`CopilotLanguageModelWrapper: Converted options.tools count: ${options.tools?.length ?? 0}`);
        if (options.tools && options.tools.length > 0) {
            console.log(`CopilotLanguageModelWrapper: Converted tool names: ${options.tools.map(t => t.function.name).join(', ')}`);
        }
        if (_options.toolMode === vscode.LanguageModelChatToolMode.Required && _options.tools?.length && _options.tools.length > 1) {
            throw new Error('LanguageModelChatToolMode.Required is not supported with more than one tool');
        }
        options.tool_choice = _options.toolMode === vscode.LanguageModelChatToolMode.Required && _options.tools?.length ?
            { type: 'function', function: { name: _options.tools[0].name } } :
            undefined;
        console.log(`CopilotLanguageModelWrapper: Calling endpoint.makeChatRequest with ${options.tools?.length ?? 0} tools`);
        const result = await endpoint.makeChatRequest('copilotLanguageModelWrapper', messages, callback, token, commonTypes_1.ChatLocation.Other, { extensionId }, options, extensionId !== 'core', telemetryProperties);
        if (result.type !== commonTypes_1.ChatFetchResponseType.Success) {
            this._logService.error(`CopilotLanguageModelWrapper: Chat request failed with type ${result.type}, reason: ${result.reason}`);
            console.error(`CopilotLanguageModelWrapper: Chat request failed with type ${result.type}, reason:`, result.reason);
            if (result.type === commonTypes_1.ChatFetchResponseType.ExtensionBlocked) {
                this._blockedExtensionService.reportBlockedExtension(extensionId, result.retryAfter);
                throw vscode.LanguageModelError.Blocked(blockedExtensionMessage);
            }
            else if (result.type === commonTypes_1.ChatFetchResponseType.QuotaExceeded) {
                // Puku Editor: Skip copilot token check when using Ollama
                const ollamaEndpoint = this._configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
                let copilotPlan = 'free';
                if (!ollamaEndpoint) {
                    const token = await this._authenticationService.getCopilotToken();
                    copilotPlan = token.copilotPlan;
                }
                const details = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(result, copilotPlan);
                const err = new vscode.LanguageModelError(details.message);
                err.name = 'ChatQuotaExceeded';
                throw err;
            }
            else if (result.type === commonTypes_1.ChatFetchResponseType.RateLimited) {
                const err = new Error(result.reason);
                err.name = 'ChatRateLimited';
                throw err;
            }
            throw new Error(result.reason);
        }
        this._telemetryService.sendInternalMSFTTelemetryEvent('languagemodelrequest', {
            extensionId,
            extensionVersion,
            requestid: result.requestId,
            query: (0, globalStringUtils_1.getTextPart)(messages[messages.length - 1].content),
            model: _endpoint.model
        }, {
            tokenCount,
            tokenLimit
        });
    }
    async provideLanguageModelResponse(endpoint, messages, options, extensionId, progress, token) {
        let thinkingActive = false;
        const finishCallback = async (_text, index, delta) => {
            if (delta.thinking) {
                // Show thinking progress for unencrypted thinking deltas
                if (!(0, thinking_1.isEncryptedThinkingDelta)(delta.thinking)) {
                    const text = delta.thinking.text ?? '';
                    progress.report(new vscode.LanguageModelThinkingPart(text, delta.thinking.id, delta.thinking.metadata));
                    thinkingActive = true;
                }
            }
            else if (thinkingActive) {
                progress.report(new vscode.LanguageModelThinkingPart('', '', { vscode_reasoning_done: true }));
                thinkingActive = false;
            }
            if (delta.text) {
                progress.report(new vscode.LanguageModelTextPart(delta.text));
            }
            if (delta.copilotToolCalls) {
                for (const call of delta.copilotToolCalls) {
                    try {
                        // Anthropic models send "" (empty string) for tools with no parameters.
                        const parameters = JSON.parse(call.arguments || '{}');
                        progress.report(new vscode.LanguageModelToolCallPart(call.id, call.name, parameters));
                    }
                    catch (err) {
                        this._logService.error(err, `Got invalid JSON for tool call: ${call.arguments}`);
                        throw new Error('Invalid JSON for tool call');
                    }
                }
            }
            if (delta.statefulMarker) {
                progress.report(new vscode.LanguageModelDataPart((0, statefulMarkerContainer_1.encodeStatefulMarker)(endpoint.model, delta.statefulMarker), endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker));
            }
            return undefined;
        };
        return this._provideLanguageModelResponse(endpoint, messages, options, extensionId, finishCallback, token);
    }
    async provideTokenCount(endpoint, message) {
        if (typeof message === 'string') {
            return endpoint.acquireTokenizer().tokenLength(message);
        }
        else {
            let raw;
            const content = message.content.map((part) => {
                if (part instanceof vscode.LanguageModelTextPart) {
                    return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: part.value };
                }
                else if ((0, languageModelChatMessageHelpers_1.isImageDataPart)(part)) {
                    return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image, imageUrl: { url: `data:${part.mimeType};base64,${Buffer.from(part.data).toString('base64url')}` } };
                }
                else {
                    return undefined;
                }
            }).filter(types_1.isDefined);
            switch (message.role) {
                case vscode.LanguageModelChatMessageRole.User:
                    raw = { role: prompt_tsx_1.Raw.ChatRole.User, content, name: message.name };
                    break;
                case vscode.LanguageModelChatMessageRole.System:
                    raw = { role: prompt_tsx_1.Raw.ChatRole.Assistant, content, name: message.name };
                    break;
                case vscode.LanguageModelChatMessageRole.Assistant:
                    raw = {
                        role: prompt_tsx_1.Raw.ChatRole.Assistant,
                        content,
                        name: message.name,
                        toolCalls: message.content
                            .filter(part => part instanceof vscode.LanguageModelToolCallPart)
                            .map(part => part)
                            .map(part => ({ function: { name: part.name, arguments: JSON.stringify(part.input) }, id: part.callId, type: 'function' })),
                    };
                    break;
                default:
                    return 0;
            }
            return endpoint.acquireTokenizer().countMessageTokens(raw);
        }
    }
    validateTools(tools) {
        for (const tool of tools) {
            if (!tool.name.match(/^[\w-]+$/)) {
                throw new Error(`Invalid tool name "${tool.name}": only alphanumeric characters, hyphens, and underscores are allowed.`);
            }
        }
    }
    async countToolTokens(endpoint, tools) {
        return await endpoint.acquireTokenizer().countToolTokens(tools);
    }
    validateRequest(_messages) {
        const lastMessage = _messages.at(-1);
        if (!lastMessage) {
            throw new Error('Invalid request: no messages.');
        }
        _messages.forEach((message, i) => {
            if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
                // Filter out DataPart since it does not share the same value type and does not have callId, function, etc.
                const filteredContent = message.content.filter(part => part instanceof vscode.LanguageModelDataPart);
                const toolCallIds = new Set(filteredContent
                    .filter(part => part instanceof vscode.LanguageModelToolCallPart)
                    .map(part => part.callId));
                let nextMessageIdx = i + 1;
                const errMsg = 'Invalid request: Tool call part must be followed by a User message with a LanguageModelToolResultPart with a matching callId.';
                while (toolCallIds.size > 0) {
                    const nextMessage = _messages.at(nextMessageIdx++);
                    if (!nextMessage || nextMessage.role !== vscode.LanguageModelChatMessageRole.User) {
                        throw new Error(errMsg);
                    }
                    nextMessage.content.forEach(part => {
                        if (!(part instanceof vscode.LanguageModelToolResultPart2 || part instanceof vscode.LanguageModelToolResultPart)) {
                            throw new Error(errMsg);
                        }
                        toolCallIds.delete(part.callId);
                    });
                }
            }
        });
    }
};
exports.CopilotLanguageModelWrapper = CopilotLanguageModelWrapper;
exports.CopilotLanguageModelWrapper = CopilotLanguageModelWrapper = __decorate([
    __param(0, nullExperimentationService_1.IExperimentationService),
    __param(1, telemetry_1.ITelemetryService),
    __param(2, blockedExtensionService_1.IBlockedExtensionService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, logService_1.ILogService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, configurationService_1.IConfigurationService),
    __param(7, envService_1.IEnvService)
], CopilotLanguageModelWrapper);
function or(...checks) {
    return (value) => checks.some(check => check(value));
}
class LanguageModelOptions {
    static { this._defaultDesc = {
        stop: or(types_1.isStringArray, types_1.isString),
        temperature: types_1.isNumber,
        max_tokens: types_1.isNumber,
        frequency_penalty: types_1.isNumber,
        presence_penalty: types_1.isNumber,
    }; }
    static { this.Default = new LanguageModelOptions({ ...this._defaultDesc }); }
    constructor(_description) {
        this._description = _description;
    }
    convert(options) {
        const result = {};
        for (const key in this._description) {
            const isValid = this._description[key];
            const value = options[key];
            if (value !== null && value !== undefined && isValid(value)) {
                // Type guards ensure we only add values of the correct type
                if ((0, types_1.isNumber)(value) || (0, types_1.isBoolean)(value) || (0, types_1.isString)(value)) {
                    result[key] = value;
                }
            }
        }
        return result;
    }
}
//# sourceMappingURL=languageModelAccess.js.map