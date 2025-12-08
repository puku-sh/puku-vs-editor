"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGlobalKeyConfig = isGlobalKeyConfig;
exports.isPerModelConfig = isPerModelConfig;
exports.isNoAuthConfig = isNoAuthConfig;
exports.chatModelInfoToProviderMetadata = chatModelInfoToProviderMetadata;
exports.resolveModelInfo = resolveModelInfo;
exports.byokKnownModelsToAPIInfo = byokKnownModelsToAPIInfo;
exports.isBYOKEnabled = isBYOKEnabled;
const envService_1 = require("../../../platform/env/common/envService");
const tokenizer_1 = require("../../../util/common/tokenizer");
const nls_1 = require("../../../util/vs/nls");
// Type guards to ensure correct config type
function isGlobalKeyConfig(config) {
    return 'apiKey' in config && !('deploymentUrl' in config);
}
function isPerModelConfig(config) {
    return 'apiKey' in config && 'deploymentUrl' in config;
}
function isNoAuthConfig(config) {
    return !('apiKey' in config) && !('deploymentUrl' in config);
}
function chatModelInfoToProviderMetadata(chatModelInfo) {
    const outputTokens = chatModelInfo.capabilities.limits?.max_output_tokens ?? 4096;
    const inputTokens = chatModelInfo.capabilities.limits?.max_prompt_tokens ?? ((chatModelInfo.capabilities.limits?.max_context_window_tokens || 64000) - outputTokens);
    return {
        id: chatModelInfo.id,
        family: chatModelInfo.capabilities.family,
        tooltip: (0, nls_1.localize)('byok.model.description', '{0} is contributed via the {1} provider.', chatModelInfo.name, chatModelInfo.capabilities.family),
        version: '1.0.0',
        maxOutputTokens: outputTokens,
        maxInputTokens: inputTokens,
        name: chatModelInfo.name,
        isUserSelectable: true,
        capabilities: {
            toolCalling: chatModelInfo.capabilities.supports.tool_calls,
            imageInput: chatModelInfo.capabilities.supports.vision,
        },
        requiresAuthorization: true
    };
}
function resolveModelInfo(modelId, providerName, knownModels, modelCapabilities) {
    // Model Capabilities are something the user has decided on so those take precedence, then we rely on known model info, then defaults.
    let knownModelInfo = modelCapabilities;
    if (knownModels && !knownModelInfo) {
        knownModelInfo = knownModels[modelId];
    }
    const modelName = knownModelInfo?.name || modelId;
    const contextWinow = knownModelInfo ? (knownModelInfo.maxInputTokens + knownModelInfo.maxOutputTokens) : 128000;
    const modelInfo = {
        id: modelId,
        name: modelName,
        version: '1.0.0',
        capabilities: {
            type: 'chat',
            family: modelId,
            supports: {
                streaming: true,
                tool_calls: !!knownModelInfo?.toolCalling,
                vision: !!knownModelInfo?.vision,
                thinking: !!knownModelInfo?.thinking
            },
            tokenizer: tokenizer_1.TokenizerType.O200K,
            limits: {
                max_context_window_tokens: contextWinow,
                max_prompt_tokens: knownModelInfo?.maxInputTokens || 100000,
                max_output_tokens: knownModelInfo?.maxOutputTokens || 8192
            }
        },
        is_chat_default: false,
        is_chat_fallback: false,
        model_picker_enabled: true
    };
    if (knownModelInfo?.requestHeaders && Object.keys(knownModelInfo.requestHeaders).length > 0) {
        modelInfo.requestHeaders = { ...knownModelInfo.requestHeaders };
    }
    return modelInfo;
}
function byokKnownModelsToAPIInfo(providerName, knownModels) {
    if (!knownModels) {
        return [];
    }
    const entries = Object.entries(knownModels);
    return entries.map(([id, capabilities], index) => {
        return {
            id,
            name: capabilities.name,
            version: '1.0.0',
            maxOutputTokens: capabilities.maxOutputTokens,
            maxInputTokens: capabilities.maxInputTokens,
            detail: providerName,
            family: providerName,
            tooltip: `${capabilities.name} is contributed via the ${providerName} provider.`,
            isUserSelectable: true,
            isDefault: index === 0, // Puku Editor: Mark first model as default
            capabilities: {
                toolCalling: capabilities.toolCalling,
                imageInput: capabilities.vision
            },
        };
    });
}
function isBYOKEnabled(copilotToken, capiClientService) {
    if (envService_1.isScenarioAutomation) {
        return true;
    }
    const isGHE = capiClientService.dotcomAPIURL !== 'https://api.github.com';
    const byokAllowed = (copilotToken.isInternal || copilotToken.isIndividual) && !isGHE;
    return byokAllowed;
}
//# sourceMappingURL=byokProvider.js.map