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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AnthropicLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnthropicLMProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const progressRecorder_1 = require("../../../util/common/progressRecorder");
const errorMessage_1 = require("../../../util/vs/base/common/errorMessage");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const anthropicMessageConverter_1 = require("../common/anthropicMessageConverter");
const byokProvider_1 = require("../common/byokProvider");
const byokUIService_1 = require("./byokUIService");
let AnthropicLMProvider = class AnthropicLMProvider {
    static { AnthropicLMProvider_1 = this; }
    static { this.providerName = 'Anthropic'; }
    constructor(_knownModels, _byokStorageService, _logService, _requestLogger, _configurationService, _experimentationService) {
        this._knownModels = _knownModels;
        this._byokStorageService = _byokStorageService;
        this._logService = _logService;
        this._requestLogger = _requestLogger;
        this._configurationService = _configurationService;
        this._experimentationService = _experimentationService;
        this.authType = 0 /* BYOKAuthType.GlobalApiKey */;
    }
    _enableThinking(modelId) {
        const thinkingEnabledInConfig = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AnthropicThinkingEnabled, this._experimentationService);
        if (!thinkingEnabledInConfig) {
            return false;
        }
        const modelCapabilities = this._knownModels?.[modelId];
        return modelCapabilities?.thinking ?? false;
    }
    /**
     * Checks if a model supports memory based on its model ID.
     * Memory is supported by:
     * - Claude Sonnet 4.5 (claude-sonnet-4-5-*)
     * - Claude Sonnet 4 (claude-sonnet-4-*)
     * - Claude Haiku 4.5 (claude-haiku-4-5-*)
     * - Claude Opus 4.1 (claude-opus-4-1-*)
     * - Claude Opus 4 (claude-opus-4-*)
     * TODO: Save these model capabilities in the knownModels object instead of hardcoding them here
     */
    _enableMemory(modelId) {
        const normalized = modelId.toLowerCase();
        return normalized.startsWith('claude-sonnet-4-5') ||
            normalized.startsWith('claude-sonnet-4') ||
            normalized.startsWith('claude-haiku-4-5') ||
            normalized.startsWith('claude-opus-4-1') ||
            normalized.startsWith('claude-opus-4');
    }
    _calculateThinkingBudget(maxOutputTokens) {
        const maxBudget = this._configurationService.getConfig(configurationService_1.ConfigKey.MaxAnthropicThinkingTokens) ?? 32000;
        return Math.min(maxOutputTokens - 1, maxBudget);
    }
    // Filters the byok known models based on what the anthropic API knows as well
    async getAllModels(apiKey) {
        if (!this._anthropicAPIClient) {
            this._anthropicAPIClient = new sdk_1.default({ apiKey });
        }
        try {
            const response = await this._anthropicAPIClient.models.list();
            const modelList = {};
            for (const model of response.data) {
                if (this._knownModels && this._knownModels[model.id]) {
                    modelList[model.id] = this._knownModels[model.id];
                }
                else {
                    // Mix in generic capabilities for models we don't know
                    modelList[model.id] = {
                        maxInputTokens: 100000,
                        maxOutputTokens: 16000,
                        name: model.display_name,
                        toolCalling: true,
                        vision: false,
                        thinking: false
                    };
                }
            }
            return modelList;
        }
        catch (error) {
            this._logService.error(error, `Error fetching available ${AnthropicLMProvider_1.providerName} models`);
            throw new Error(error.message ? error.message : error);
        }
    }
    async updateAPIKey() {
        this._apiKey = await (0, byokUIService_1.promptForAPIKey)(AnthropicLMProvider_1.providerName, await this._byokStorageService.getAPIKey(AnthropicLMProvider_1.providerName) !== undefined);
        if (this._apiKey) {
            await this._byokStorageService.storeAPIKey(AnthropicLMProvider_1.providerName, this._apiKey, 0 /* BYOKAuthType.GlobalApiKey */);
            this._anthropicAPIClient = undefined;
        }
    }
    async updateAPIKeyViaCmd(envVarName, action = 'update', modelId) {
        if (action === 'remove') {
            this._apiKey = undefined;
            this._anthropicAPIClient = undefined;
            await this._byokStorageService.deleteAPIKey(AnthropicLMProvider_1.providerName, this.authType, modelId);
            this._logService.info(`BYOK: API key removed for provider ${AnthropicLMProvider_1.providerName}`);
            return;
        }
        const apiKey = process.env[envVarName];
        if (!apiKey) {
            throw new Error(`BYOK: Environment variable ${envVarName} not found or empty for API key management`);
        }
        this._apiKey = apiKey;
        await this._byokStorageService.storeAPIKey(AnthropicLMProvider_1.providerName, apiKey, this.authType, modelId);
        this._anthropicAPIClient = undefined;
        this._logService.info(`BYOK: API key updated for provider ${AnthropicLMProvider_1.providerName} from environment variable ${envVarName}`);
    }
    async provideLanguageModelChatInformation(options, token) {
        if (!this._apiKey) { // If we don't have the API key it might just be in storage, so we try to read it first
            this._apiKey = await this._byokStorageService.getAPIKey(AnthropicLMProvider_1.providerName);
        }
        try {
            if (this._apiKey) {
                return (0, byokProvider_1.byokKnownModelsToAPIInfo)(AnthropicLMProvider_1.providerName, await this.getAllModels(this._apiKey));
            }
            else if (options.silent && !this._apiKey) {
                return [];
            }
            else { // Not silent, and no api key = good to prompt user for api key
                await this.updateAPIKey();
                if (this._apiKey) {
                    return (0, byokProvider_1.byokKnownModelsToAPIInfo)(AnthropicLMProvider_1.providerName, await this.getAllModels(this._apiKey));
                }
                else {
                    return [];
                }
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('invalid x-api-key')) {
                if (options.silent) {
                    return [];
                }
                await this.updateAPIKey();
                if (this._apiKey) {
                    try {
                        return (0, byokProvider_1.byokKnownModelsToAPIInfo)(AnthropicLMProvider_1.providerName, await this.getAllModels(this._apiKey));
                    }
                    catch (retryError) {
                        this._logService.error(`Error after re-prompting for API key: ${(0, errorMessage_1.toErrorMessage)(retryError, true)}`);
                    }
                }
            }
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        if (!this._anthropicAPIClient) {
            return;
        }
        // Convert the messages from the API format into messages that we can use against anthropic
        const { system, messages: convertedMessages } = (0, anthropicMessageConverter_1.apiMessageToAnthropicMessage)(messages);
        const requestId = (0, uuid_1.generateUuid)();
        const pendingLoggedChatRequest = this._requestLogger.logChatRequest('AnthropicBYOK', {
            model: model.id,
            modelMaxPromptTokens: model.maxInputTokens,
            urlOrRequestMetadata: this._anthropicAPIClient.baseURL,
        }, {
            model: model.id,
            messages: (0, anthropicMessageConverter_1.anthropicMessagesToRawMessagesForLogging)(convertedMessages, system),
            ourRequestId: requestId,
            location: commonTypes_1.ChatLocation.Other,
            body: {
                tools: options.tools?.map((tool) => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema
                    }
                }))
            },
        });
        let hasMemoryTool = false;
        // Build tools array, handling both standard tools and native Anthropic tools
        const tools = (options.tools ?? []).map(tool => {
            // Handle native Anthropic memory tool
            if (tool.name === 'memory' && this._enableMemory(model.id)) {
                hasMemoryTool = true;
                return {
                    name: 'memory',
                    type: 'memory_20250818'
                };
            }
            if (!tool.inputSchema) {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: {
                        type: 'object',
                        properties: {},
                        required: []
                    }
                };
            }
            return {
                name: tool.name,
                description: tool.description,
                input_schema: {
                    type: 'object',
                    properties: tool.inputSchema.properties ?? {},
                    required: tool.inputSchema.required ?? [],
                    $schema: tool.inputSchema.$schema
                }
            };
        });
        // Check if web search is enabled and append web_search tool if not already present.
        // We need to do this because there is no local web_search tool definition we can replace.
        const webSearchEnabled = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AnthropicWebSearchToolEnabled, this._experimentationService);
        if (webSearchEnabled && !tools.some(tool => tool.name === 'web_search')) {
            const maxUses = this._configurationService.getConfig(configurationService_1.ConfigKey.AnthropicWebSearchMaxUses);
            const allowedDomains = this._configurationService.getConfig(configurationService_1.ConfigKey.AnthropicWebSearchAllowedDomains);
            const blockedDomains = this._configurationService.getConfig(configurationService_1.ConfigKey.AnthropicWebSearchBlockedDomains);
            const userLocation = this._configurationService.getConfig(configurationService_1.ConfigKey.AnthropicWebSearchUserLocation);
            const webSearchTool = {
                name: 'web_search',
                type: 'web_search_20250305',
                max_uses: maxUses
            };
            // Add domain filtering if configured
            // Cannot use both allowed and blocked domains simultaneously
            if (allowedDomains && allowedDomains.length > 0) {
                webSearchTool.allowed_domains = allowedDomains;
            }
            else if (blockedDomains && blockedDomains.length > 0) {
                webSearchTool.blocked_domains = blockedDomains;
            }
            // Add user location if configured
            // Note: All fields are optional according to Anthropic docs
            if (userLocation && (userLocation.city || userLocation.region || userLocation.country || userLocation.timezone)) {
                webSearchTool.user_location = {
                    type: 'approximate',
                    ...userLocation
                };
            }
            tools.push(webSearchTool);
        }
        const thinkingEnabled = this._enableThinking(model.id);
        // Build betas array for beta API features
        const betas = [];
        if (thinkingEnabled) {
            betas.push('interleaved-thinking-2025-05-14');
        }
        if (hasMemoryTool) {
            betas.push('context-management-2025-06-27');
        }
        const params = {
            model: model.id,
            messages: convertedMessages,
            max_tokens: model.maxOutputTokens,
            stream: true,
            system: [system],
            tools: tools.length > 0 ? tools : undefined,
            thinking: thinkingEnabled ? {
                type: 'enabled',
                budget_tokens: this._calculateThinkingBudget(model.maxOutputTokens)
            } : undefined
        };
        const wrappedProgress = new progressRecorder_1.RecordedProgress(progress);
        try {
            const result = await this._makeRequest(wrappedProgress, params, betas, token);
            if (result.ttft) {
                pendingLoggedChatRequest.markTimeToFirstToken(result.ttft);
            }
            pendingLoggedChatRequest.resolve({
                type: commonTypes_1.ChatFetchResponseType.Success,
                requestId,
                serverRequestId: requestId,
                usage: result.usage,
                value: ['value'],
                resolvedModel: model.id
            }, wrappedProgress.items.map((i) => {
                if (i instanceof vscode_1.LanguageModelTextPart) {
                    return { text: i.value };
                }
                else if (i instanceof vscode_1.LanguageModelToolCallPart) {
                    return {
                        text: '',
                        copilotToolCalls: [{
                                name: i.name,
                                arguments: JSON.stringify(i.input),
                                id: i.callId
                            }]
                    };
                }
                else if (i instanceof vscode_1.LanguageModelToolResultPart) {
                    // Handle tool results - extract text from content
                    const resultText = i.content.map(c => c instanceof vscode_1.LanguageModelTextPart ? c.value : '').join('');
                    return {
                        text: `[Tool Result ${i.callId}]: ${resultText}`
                    };
                }
                else {
                    return { text: '' };
                }
            }));
        }
        catch (err) {
            this._logService.error(`BYOK Anthropic error: ${(0, errorMessage_1.toErrorMessage)(err, true)}`);
            pendingLoggedChatRequest.resolve({
                type: commonTypes_1.ChatFetchResponseType.Unknown,
                requestId,
                serverRequestId: requestId,
                reason: err.message
            }, wrappedProgress.items.map((i) => {
                if (i instanceof vscode_1.LanguageModelTextPart) {
                    return { text: i.value };
                }
                else if (i instanceof vscode_1.LanguageModelToolCallPart) {
                    return {
                        text: '',
                        copilotToolCalls: [{
                                name: i.name,
                                arguments: JSON.stringify(i.input),
                                id: i.callId
                            }]
                    };
                }
                else if (i instanceof vscode_1.LanguageModelToolResultPart) {
                    // Handle tool results - extract text from content
                    const resultText = i.content.map(c => c instanceof vscode_1.LanguageModelTextPart ? c.value : '').join('');
                    return {
                        text: `[Tool Result ${i.callId}]: ${resultText}`
                    };
                }
                else {
                    return { text: '' };
                }
            }));
            throw err;
        }
    }
    async provideTokenCount(model, text, token) {
        // Simple estimation - actual token count would require Claude's tokenizer
        return Math.ceil(text.toString().length / 4);
    }
    async _makeRequest(progress, params, betas, token) {
        if (!this._anthropicAPIClient) {
            return { ttft: undefined, usage: undefined };
        }
        const start = Date.now();
        let ttft;
        const stream = await this._anthropicAPIClient.beta.messages.create({
            ...params,
            ...(betas.length > 0 && { betas })
        });
        let pendingToolCall;
        let pendingThinking;
        let pendingRedactedThinking;
        let pendingServerToolCall;
        let usage;
        let hasText = false;
        for await (const chunk of stream) {
            if (token.isCancellationRequested) {
                break;
            }
            if (ttft === undefined) {
                ttft = Date.now() - start;
            }
            this._logService.trace(`chunk: ${JSON.stringify(chunk)}`);
            if (chunk.type === 'content_block_start') {
                if ('content_block' in chunk && chunk.content_block.type === 'tool_use') {
                    pendingToolCall = {
                        toolId: chunk.content_block.id,
                        name: chunk.content_block.name,
                        jsonInput: ''
                    };
                }
                else if ('content_block' in chunk && chunk.content_block.type === 'server_tool_use') {
                    // Handle server-side tool use (e.g., web_search)
                    pendingServerToolCall = {
                        toolId: chunk.content_block.id,
                        name: chunk.content_block.name,
                        jsonInput: '',
                        type: chunk.content_block.name
                    };
                    progress.report(new vscode_1.LanguageModelTextPart('\n'));
                }
                else if ('content_block' in chunk && chunk.content_block.type === 'thinking') {
                    pendingThinking = {
                        thinking: '',
                        signature: ''
                    };
                }
                else if ('content_block' in chunk && chunk.content_block.type === 'redacted_thinking') {
                    const redactedBlock = chunk.content_block;
                    pendingRedactedThinking = {
                        data: redactedBlock.data
                    };
                }
                else if ('content_block' in chunk && chunk.content_block.type === 'web_search_tool_result') {
                    if (!pendingServerToolCall || !pendingServerToolCall.toolId) {
                        continue;
                    }
                    const resultBlock = chunk.content_block;
                    // Handle potential error in web search
                    if (!Array.isArray(resultBlock.content)) {
                        this._logService.error(`Web search error: ${resultBlock.content.error_code}`);
                        continue;
                    }
                    const results = resultBlock.content.map((result) => ({
                        type: 'web_search_result',
                        url: result.url,
                        title: result.title,
                        page_age: result.page_age,
                        encrypted_content: result.encrypted_content
                    }));
                    // Format according to Anthropic's web_search_tool_result specification
                    const toolResult = {
                        type: 'web_search_tool_result',
                        tool_use_id: pendingServerToolCall.toolId,
                        content: results
                    };
                    const searchResults = JSON.stringify(toolResult, null, 2);
                    // TODO: @bhavyaus - instead of just pushing text, create a specialized WebSearchResult part
                    progress.report(new vscode_1.LanguageModelToolResultPart(pendingServerToolCall.toolId, [new vscode_1.LanguageModelTextPart(searchResults)]));
                    pendingServerToolCall = undefined;
                }
                continue;
            }
            if (chunk.type === 'content_block_delta') {
                if (chunk.delta.type === 'text_delta') {
                    progress.report(new vscode_1.LanguageModelTextPart(chunk.delta.text || ''));
                    hasText ||= chunk.delta.text?.length > 0;
                }
                else if (chunk.delta.type === 'citations_delta') {
                    if ('citation' in chunk.delta) {
                        // TODO: @bhavyaus - instead of just pushing text, create a specialized Citation part
                        const citation = chunk.delta.citation;
                        if (citation.type === 'web_search_result_location') {
                            // Format citation according to Anthropic specification
                            const citationData = {
                                type: 'web_search_result_location',
                                url: citation.url,
                                title: citation.title,
                                encrypted_index: citation.encrypted_index,
                                cited_text: citation.cited_text
                            };
                            // Format citation as readable blockquote with source link
                            const referenceText = `\n> "${citation.cited_text}" — [${vscode.l10n.t('Source')}](${citation.url})\n\n`;
                            // Report formatted reference text to user
                            progress.report(new vscode_1.LanguageModelTextPart(referenceText));
                            // Store the citation data in the correct format for multi-turn conversations
                            progress.report(new vscode_1.LanguageModelToolResultPart('citation', [new vscode_1.LanguageModelTextPart(JSON.stringify(citationData, null, 2))]));
                        }
                    }
                }
                else if (chunk.delta.type === 'thinking_delta') {
                    if (pendingThinking) {
                        pendingThinking.thinking = (pendingThinking.thinking || '') + (chunk.delta.thinking || '');
                        progress.report(new vscode_1.LanguageModelThinkingPart(chunk.delta.thinking || ''));
                    }
                }
                else if (chunk.delta.type === 'signature_delta') {
                    // Accumulate signature
                    if (pendingThinking) {
                        pendingThinking.signature = (pendingThinking.signature || '') + (chunk.delta.signature || '');
                    }
                }
                else if (chunk.delta.type === 'input_json_delta' && pendingToolCall) {
                    pendingToolCall.jsonInput = (pendingToolCall.jsonInput || '') + (chunk.delta.partial_json || '');
                    try {
                        // Try to parse the accumulated JSON to see if it's complete
                        const parsedJson = JSON.parse(pendingToolCall.jsonInput);
                        progress.report(new vscode_1.LanguageModelToolCallPart(pendingToolCall.toolId, pendingToolCall.name, parsedJson));
                        pendingToolCall = undefined;
                    }
                    catch {
                        // JSON is not complete yet, continue accumulating
                        continue;
                    }
                }
                else if (chunk.delta.type === 'input_json_delta' && pendingServerToolCall) {
                    pendingServerToolCall.jsonInput = (pendingServerToolCall.jsonInput || '') + (chunk.delta.partial_json || '');
                }
            }
            if (chunk.type === 'content_block_stop') {
                if (pendingToolCall) {
                    try {
                        const parsedJson = JSON.parse(pendingToolCall.jsonInput || '{}');
                        progress.report(new vscode_1.LanguageModelToolCallPart(pendingToolCall.toolId, pendingToolCall.name, parsedJson));
                    }
                    catch (e) {
                        console.error('Failed to parse tool call JSON:', e);
                    }
                    pendingToolCall = undefined;
                }
                else if (pendingThinking) {
                    if (pendingThinking.signature) {
                        const finalThinkingPart = new vscode_1.LanguageModelThinkingPart('');
                        finalThinkingPart.metadata = {
                            signature: pendingThinking.signature,
                            _completeThinking: pendingThinking.thinking
                        };
                        progress.report(finalThinkingPart);
                    }
                    pendingThinking = undefined;
                }
                else if (pendingRedactedThinking) {
                    pendingRedactedThinking = undefined;
                }
            }
            if (chunk.type === 'message_start') {
                // TODO final output tokens: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":46}}
                usage = {
                    completion_tokens: -1,
                    prompt_tokens: chunk.message.usage.input_tokens + (chunk.message.usage.cache_creation_input_tokens ?? 0) + (chunk.message.usage.cache_read_input_tokens ?? 0),
                    total_tokens: -1,
                    prompt_tokens_details: {
                        cached_tokens: chunk.message.usage.cache_read_input_tokens ?? 0,
                        cache_creation_input_tokens: chunk.message.usage.cache_creation_input_tokens
                    }
                };
            }
            else if (usage && chunk.type === 'message_delta') {
                if (chunk.usage.output_tokens) {
                    usage.completion_tokens = chunk.usage.output_tokens;
                    usage.total_tokens = usage.prompt_tokens + chunk.usage.output_tokens;
                }
            }
        }
        return { ttft, usage };
    }
};
exports.AnthropicLMProvider = AnthropicLMProvider;
exports.AnthropicLMProvider = AnthropicLMProvider = AnthropicLMProvider_1 = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, nullExperimentationService_1.IExperimentationService)
], AnthropicLMProvider);
//# sourceMappingURL=anthropicProvider.js.map