"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const copilotChatEndpoint_1 = require("../copilotChatEndpoint");
// Test fixtures for thinking content
const createThinkingMessage = (thinkingId, thinkingText) => ({
    role: prompt_tsx_1.Raw.ChatRole.Assistant,
    content: [
        {
            type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque,
            value: {
                type: 'thinking',
                thinking: {
                    id: thinkingId,
                    text: thinkingText
                }
            }
        }
    ]
});
const createTestOptions = (messages) => ({
    debugName: 'test',
    messages,
    requestId: 'test-req-123',
    postOptions: {},
    finishedCb: undefined,
    location: undefined
});
// Mock implementations
const createMockServices = () => ({
    fetcherService: {},
    domainService: {},
    capiClientService: {},
    envService: {},
    telemetryService: {},
    authService: {},
    chatMLFetcher: {},
    tokenizerProvider: {},
    instantiationService: {},
    configurationService: {
        getExperimentBasedConfig: () => false
    },
    expService: {},
    logService: {}
});
(0, vitest_1.describe)('CopilotChatEndpoint - Reasoning Properties', () => {
    let mockServices;
    let modelMetadata;
    (0, vitest_1.beforeEach)(() => {
        mockServices = createMockServices();
        modelMetadata = {
            id: 'copilot-base',
            name: 'Copilot Base',
            version: '1.0',
            model_picker_enabled: true,
            is_chat_default: true,
            is_chat_fallback: false,
            capabilities: {
                type: 'chat',
                family: 'copilot',
                tokenizer: 'o200k_base',
                supports: {
                    parallel_tool_calls: true,
                    streaming: true,
                    tool_calls: true,
                    vision: false,
                    prediction: false,
                    thinking: true
                },
                limits: {
                    max_prompt_tokens: 8192,
                    max_output_tokens: 4096,
                    max_context_window_tokens: 12288
                }
            }
        };
    });
    (0, vitest_1.describe)('CAPI reasoning properties', () => {
        (0, vitest_1.it)('should set reasoning_opaque and reasoning_text properties when processing thinking content', () => {
            const endpoint = new copilotChatEndpoint_1.CopilotChatEndpoint(modelMetadata, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const thinkingMessage = createThinkingMessage('copilot-thinking-abc', 'copilot reasoning process');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].reasoning_opaque).toBe('copilot-thinking-abc');
            (0, vitest_1.expect)(messages[0].reasoning_text).toBe('copilot reasoning process');
        });
        (0, vitest_1.it)('should handle multiple messages with thinking content', () => {
            const endpoint = new copilotChatEndpoint_1.CopilotChatEndpoint(modelMetadata, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const userMessage = {
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: 'Help me with code' }]
            };
            const thinkingMessage = createThinkingMessage('copilot-reasoning-def', 'analyzing the code request');
            const options = createTestOptions([userMessage, thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(2);
            // User message should not have reasoning properties
            (0, vitest_1.expect)(messages[0].reasoning_opaque).toBeUndefined();
            (0, vitest_1.expect)(messages[0].reasoning_text).toBeUndefined();
            // Assistant message should have reasoning properties
            (0, vitest_1.expect)(messages[1].reasoning_opaque).toBe('copilot-reasoning-def');
            (0, vitest_1.expect)(messages[1].reasoning_text).toBe('analyzing the code request');
        });
        (0, vitest_1.it)('should handle messages without thinking content', () => {
            const endpoint = new copilotChatEndpoint_1.CopilotChatEndpoint(modelMetadata, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const regularMessage = {
                role: prompt_tsx_1.Raw.ChatRole.Assistant,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: 'Regular response' }]
            };
            const options = createTestOptions([regularMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].reasoning_opaque).toBeUndefined();
            (0, vitest_1.expect)(messages[0].reasoning_text).toBeUndefined();
        });
    });
});
//# sourceMappingURL=copilotChatEndpoint.spec.js.map