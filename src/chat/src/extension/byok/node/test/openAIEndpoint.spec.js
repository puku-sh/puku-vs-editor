"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../test/node/services");
const openAIEndpoint_1 = require("../openAIEndpoint");
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
(0, vitest_1.describe)('OpenAIEndpoint - Reasoning Properties', () => {
    let modelMetadata;
    const disposables = new lifecycle_1.DisposableStore();
    let accessor;
    let instaService;
    (0, vitest_1.beforeEach)(() => {
        modelMetadata = {
            id: 'test-model',
            name: 'Test Model',
            version: '1.0',
            model_picker_enabled: true,
            is_chat_default: false,
            is_chat_fallback: false,
            supported_endpoints: [endpointProvider_1.ModelSupportedEndpoint.ChatCompletions, endpointProvider_1.ModelSupportedEndpoint.Responses],
            capabilities: {
                type: 'chat',
                family: 'openai',
                tokenizer: 'o200k_base',
                supports: {
                    parallel_tool_calls: false,
                    streaming: true,
                    tool_calls: false,
                    vision: false,
                    prediction: false,
                    thinking: true
                },
                limits: {
                    max_prompt_tokens: 4096,
                    max_output_tokens: 2048,
                    max_context_window_tokens: 6144
                }
            }
        };
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = disposables.add(testingServiceCollection.createTestingAccessor());
        instaService = accessor.get(instantiation_1.IInstantiationService);
    });
    (0, vitest_1.afterEach)(() => {
        disposables.clear();
    });
    (0, vitest_1.describe)('CAPI mode (useResponsesApi = false)', () => {
        (0, vitest_1.it)('should set cot_id and cot_summary properties when processing thinking content', () => {
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.UseResponsesApi, false);
            const endpoint = instaService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelMetadata, 'test-api-key', 'https://api.openai.com/v1/chat/completions');
            const thinkingMessage = createThinkingMessage('test-thinking-123', 'this is my reasoning');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].cot_id).toBe('test-thinking-123');
            (0, vitest_1.expect)(messages[0].cot_summary).toBe('this is my reasoning');
        });
        (0, vitest_1.it)('should handle multiple messages with thinking content', () => {
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.UseResponsesApi, false);
            const endpoint = instaService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelMetadata, 'test-api-key', 'https://api.openai.com/v1/chat/completions');
            const userMessage = {
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: 'Hello' }]
            };
            const thinkingMessage = createThinkingMessage('reasoning-456', 'complex reasoning here');
            const options = createTestOptions([userMessage, thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(2);
            // User message should not have thinking properties
            (0, vitest_1.expect)(messages[0].cot_id).toBeUndefined();
            (0, vitest_1.expect)(messages[0].cot_summary).toBeUndefined();
            // Assistant message should have thinking properties
            (0, vitest_1.expect)(messages[1].cot_id).toBe('reasoning-456');
            (0, vitest_1.expect)(messages[1].cot_summary).toBe('complex reasoning here');
        });
    });
    (0, vitest_1.describe)('Responses API mode (useResponsesApi = true)', () => {
        (0, vitest_1.it)('should preserve reasoning object when thinking is supported', () => {
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.UseResponsesApi, true);
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.ResponsesApiReasoningEffort, 'medium');
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.ResponsesApiReasoningSummary, 'detailed');
            const endpoint = instaService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelMetadata, 'test-api-key', 'https://api.openai.com/v1/chat/completions');
            const thinkingMessage = createThinkingMessage('resp-api-789', 'responses api reasoning');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.store).toBe(true);
            (0, vitest_1.expect)(body.n).toBeUndefined();
            (0, vitest_1.expect)(body.stream_options).toBeUndefined();
            (0, vitest_1.expect)(body.reasoning).toBeDefined(); // Should preserve reasoning object
        });
        (0, vitest_1.it)('should remove reasoning object when thinking is not supported', () => {
            const modelWithoutThinking = {
                ...modelMetadata,
                capabilities: {
                    ...modelMetadata.capabilities,
                    supports: {
                        ...modelMetadata.capabilities.supports,
                        thinking: false
                    }
                }
            };
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.UseResponsesApi, true);
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.ResponsesApiReasoningEffort, 'medium');
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.ResponsesApiReasoningSummary, 'detailed');
            const endpoint = instaService.createInstance(openAIEndpoint_1.OpenAIEndpoint, modelWithoutThinking, 'test-api-key', 'https://api.openai.com/v1/chat/completions');
            const thinkingMessage = createThinkingMessage('no-thinking-999', 'should be removed');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.reasoning).toBeUndefined(); // Should be removed
        });
    });
});
//# sourceMappingURL=openAIEndpoint.spec.js.map