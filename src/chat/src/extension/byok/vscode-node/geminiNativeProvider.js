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
var GeminiNativeBYOKLMProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiNativeBYOKLMProvider = void 0;
const genai_1 = require("@google/genai");
const vscode_1 = require("vscode");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const progressRecorder_1 = require("../../../util/common/progressRecorder");
const errorMessage_1 = require("../../../util/vs/base/common/errorMessage");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const byokProvider_1 = require("../common/byokProvider");
const geminiFunctionDeclarationConverter_1 = require("../common/geminiFunctionDeclarationConverter");
const geminiMessageConverter_1 = require("../common/geminiMessageConverter");
const byokUIService_1 = require("./byokUIService");
let GeminiNativeBYOKLMProvider = class GeminiNativeBYOKLMProvider {
    static { GeminiNativeBYOKLMProvider_1 = this; }
    static { this.providerName = 'Gemini'; }
    constructor(_knownModels, _byokStorageService, _logService, _requestLogger) {
        this._knownModels = _knownModels;
        this._byokStorageService = _byokStorageService;
        this._logService = _logService;
        this._requestLogger = _requestLogger;
        this.authType = 0 /* BYOKAuthType.GlobalApiKey */;
    }
    async getAllModels(apiKey) {
        if (!this._genAIClient) {
            this._genAIClient = new genai_1.GoogleGenAI({ apiKey });
        }
        try {
            const models = await this._genAIClient.models.list();
            const modelList = {};
            for await (const model of models) {
                const modelId = model.name;
                if (!modelId) {
                    continue; // Skip models without names
                }
                // Enable only known models.
                if (this._knownModels && this._knownModels[modelId]) {
                    modelList[modelId] = this._knownModels[modelId];
                }
            }
            return modelList;
        }
        catch (error) {
            this._logService.error(error, `Error fetching available ${GeminiNativeBYOKLMProvider_1.providerName} models`);
            throw new Error((0, errorMessage_1.toErrorMessage)(error, true));
        }
    }
    async updateAPIKey() {
        this._apiKey = await (0, byokUIService_1.promptForAPIKey)(GeminiNativeBYOKLMProvider_1.providerName, await this._byokStorageService.getAPIKey(GeminiNativeBYOKLMProvider_1.providerName) !== undefined);
        if (this._apiKey) {
            await this._byokStorageService.storeAPIKey(GeminiNativeBYOKLMProvider_1.providerName, this._apiKey, 0 /* BYOKAuthType.GlobalApiKey */);
        }
    }
    async provideLanguageModelChatInformation(options, token) {
        if (!this._apiKey) { // If we don't have the API key it might just be in storage, so we try to read it first
            this._apiKey = await this._byokStorageService.getAPIKey(GeminiNativeBYOKLMProvider_1.providerName);
        }
        try {
            if (this._apiKey) {
                return (0, byokProvider_1.byokKnownModelsToAPIInfo)(GeminiNativeBYOKLMProvider_1.providerName, await this.getAllModels(this._apiKey));
            }
            else if (options.silent && !this._apiKey) {
                return [];
            }
            else { // Not silent, and no api key = good to prompt user for api key
                await this.updateAPIKey();
                if (this._apiKey) {
                    return (0, byokProvider_1.byokKnownModelsToAPIInfo)(GeminiNativeBYOKLMProvider_1.providerName, await this.getAllModels(this._apiKey));
                }
                else {
                    return [];
                }
            }
        }
        catch {
            return [];
        }
    }
    async provideLanguageModelChatResponse(model, messages, options, progress, token) {
        if (!this._genAIClient) {
            return;
        }
        // Convert the messages from the API format into messages that we can use against Gemini
        const { contents, systemInstruction } = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        const requestId = (0, uuid_1.generateUuid)();
        const pendingLoggedChatRequest = this._requestLogger.logChatRequest('GeminiNativeBYOK', {
            model: model.id,
            modelMaxPromptTokens: model.maxInputTokens,
            urlOrRequestMetadata: 'https://generativelanguage.googleapis.com',
        }, {
            model: model.id,
            messages: (0, geminiMessageConverter_1.geminiMessagesToRawMessagesForLogging)(contents, systemInstruction),
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
            }
        });
        // Convert VS Code tools to Gemini function declarations
        const tools = (options.tools ?? []).length > 0 ? [{
                functionDeclarations: (options.tools ?? []).map(tool => {
                    if (!tool.inputSchema) {
                        return {
                            name: tool.name,
                            description: tool.description,
                            parameters: {
                                type: genai_1.Type.OBJECT,
                                properties: {},
                                required: []
                            }
                        };
                    }
                    // Transform the input schema to match Gemini's expectations
                    const finalTool = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)(tool.name, tool.description, tool.inputSchema);
                    finalTool.description = tool.description || finalTool.description;
                    return finalTool;
                })
            }] : [];
        // Bridge VS Code cancellation token to Gemini abortSignal for early network termination
        const abortController = new AbortController();
        const cancelSub = token.onCancellationRequested(() => {
            abortController.abort();
            this._logService.trace('Gemini request aborted via VS Code cancellation token');
        });
        const params = {
            model: model.id,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
                tools: tools.length > 0 ? tools : undefined,
                maxOutputTokens: model.maxOutputTokens,
                thinkingConfig: {
                    includeThoughts: true,
                },
                abortSignal: abortController.signal
            }
        };
        const wrappedProgress = new progressRecorder_1.RecordedProgress(progress);
        try {
            const result = await this._makeRequest(wrappedProgress, params, token);
            if (result.ttft) {
                pendingLoggedChatRequest.markTimeToFirstToken(result.ttft);
            }
            pendingLoggedChatRequest.resolve({
                type: commonTypes_1.ChatFetchResponseType.Success,
                requestId,
                serverRequestId: requestId,
                usage: result.usage,
                resolvedModel: model.id,
                value: ['value'],
            }, wrappedProgress.items.map((i) => {
                return {
                    text: i instanceof vscode_1.LanguageModelTextPart ? i.value : '',
                    copilotToolCalls: i instanceof vscode_1.LanguageModelToolCallPart ? [{
                            name: i.name,
                            arguments: JSON.stringify(i.input),
                            id: i.callId
                        }] : undefined,
                };
            }));
        }
        catch (err) {
            this._logService.error(`BYOK GeminiNative error: ${(0, errorMessage_1.toErrorMessage)(err, true)}`);
            pendingLoggedChatRequest.resolve({
                type: token.isCancellationRequested ? commonTypes_1.ChatFetchResponseType.Canceled : commonTypes_1.ChatFetchResponseType.Unknown,
                requestId,
                serverRequestId: requestId,
                reason: token.isCancellationRequested ? 'cancelled' : (0, errorMessage_1.toErrorMessage)(err)
            }, wrappedProgress.items.map((i) => {
                return {
                    text: i instanceof vscode_1.LanguageModelTextPart ? i.value : '',
                    copilotToolCalls: i instanceof vscode_1.LanguageModelToolCallPart ? [{
                            name: i.name,
                            arguments: JSON.stringify(i.input),
                            id: i.callId
                        }] : undefined,
                };
            }));
            throw err;
        }
        finally {
            cancelSub.dispose();
        }
    }
    async provideTokenCount(model, text, token) {
        // Simple estimation for approximate token count - actual token count would require Gemini's tokenizer
        return Math.ceil(text.toString().length / 4);
    }
    async _makeRequest(progress, params, token) {
        if (!this._genAIClient) {
            return { ttft: undefined, usage: undefined };
        }
        const start = Date.now();
        let ttft;
        try {
            const stream = await this._genAIClient.models.generateContentStream(params);
            let usage;
            for await (const chunk of stream) {
                if (token.isCancellationRequested) {
                    break;
                }
                if (ttft === undefined) {
                    ttft = Date.now() - start;
                }
                this._logService.trace(`Gemini chunk: ${JSON.stringify(chunk)}`);
                // Process the streaming response chunks
                if (chunk.candidates && chunk.candidates.length > 0) {
                    // choose the primary candidate
                    const candidate = chunk.candidates[0];
                    if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                            if ('thought' in part && part.thought === true && part.text) {
                                // Handle thinking/reasoning content from Gemini API
                                progress.report(new vscode_1.LanguageModelThinkingPart(part.text));
                            }
                            else if (part.text) {
                                progress.report(new vscode_1.LanguageModelTextPart(part.text));
                            }
                            else if (part.functionCall && part.functionCall.name) {
                                // Generate a synthetic call id
                                const callId = `${part.functionCall.name}_${Date.now()}`;
                                progress.report(new vscode_1.LanguageModelToolCallPart(callId, part.functionCall.name, part.functionCall.args || {}));
                            }
                        }
                    }
                }
                // Extract usage information if available in the chunk
                if (chunk.usageMetadata) {
                    const promptTokens = chunk.usageMetadata.promptTokenCount || -1;
                    const completionTokens = chunk.usageMetadata.candidatesTokenCount || -1;
                    usage = {
                        // Use -1 as a sentinel value to indicate that the token count is unavailable
                        completion_tokens: completionTokens,
                        prompt_tokens: promptTokens,
                        total_tokens: chunk.usageMetadata.totalTokenCount ||
                            (promptTokens !== -1 && completionTokens !== -1 ? promptTokens + completionTokens : -1),
                        prompt_tokens_details: {
                            cached_tokens: chunk.usageMetadata.cachedContentTokenCount || 0,
                        }
                    };
                }
            }
            return { ttft, usage };
        }
        catch (error) {
            if (error?.name === 'AbortError' || token.isCancellationRequested) {
                this._logService.trace('Gemini streaming aborted');
                return { ttft, usage: undefined };
            }
            this._logService.error(`Gemini streaming error: ${(0, errorMessage_1.toErrorMessage)(error, true)}`);
            throw error;
        }
    }
};
exports.GeminiNativeBYOKLMProvider = GeminiNativeBYOKLMProvider;
exports.GeminiNativeBYOKLMProvider = GeminiNativeBYOKLMProvider = GeminiNativeBYOKLMProvider_1 = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, requestLogger_1.IRequestLogger)
], GeminiNativeBYOKLMProvider);
//# sourceMappingURL=geminiNativeProvider.js.map