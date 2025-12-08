"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const endpointProvider_1 = require("../../../../../platform/endpoint/common/endpointProvider");
const openaiCompatibleEndpoint_1 = require("../openaiCompatibleEndpoint");
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
    instantiationService: {
        createInstance: (ctor, ...args) => new ctor(...args)
    },
    configurationService: {
        getExperimentBasedConfig: () => false
    },
    expService: {},
    logService: {}
});
(0, vitest_1.describe)('OpenAICompatibleTestEndpoint - Reasoning Properties', () => {
    let mockServices;
    let modelConfig;
    (0, vitest_1.beforeEach)(() => {
        mockServices = createMockServices();
        modelConfig = {
            id: 'test-openai-compatible',
            name: 'Test OpenAI Compatible Model',
            version: '1.0',
            useDeveloperRole: false,
            type: 'openai',
            url: 'https://api.example.com/v1/chat/completions',
            auth: {
                useBearerHeader: true,
                useApiKeyHeader: false,
                apiKeyEnvName: 'OPENAI_API_KEY'
            },
            overrides: {
                requestHeaders: {}
            },
            capabilities: {
                supports: {
                    parallel_tool_calls: true,
                    streaming: true,
                    tool_calls: true,
                    vision: false,
                    prediction: false,
                    thinking: false
                },
                limits: {
                    max_prompt_tokens: 4096,
                    max_output_tokens: 2048,
                    max_context_window_tokens: 6144
                }
            },
            supported_endpoints: [endpointProvider_1.ModelSupportedEndpoint.ChatCompletions]
        };
    });
    (0, vitest_1.describe)('CAPI reasoning properties', () => {
        (0, vitest_1.it)('should set cot_id and cot_summary properties when processing thinking content', () => {
            const endpoint = new openaiCompatibleEndpoint_1.OpenAICompatibleTestEndpoint(modelConfig, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const thinkingMessage = createThinkingMessage('openai-compat-123', 'openai compatible reasoning');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].cot_id).toBe('openai-compat-123');
            (0, vitest_1.expect)(messages[0].cot_summary).toBe('openai compatible reasoning');
        });
        (0, vitest_1.it)('should handle multiple messages with thinking content', () => {
            const endpoint = new openaiCompatibleEndpoint_1.OpenAICompatibleTestEndpoint(modelConfig, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const userMessage = {
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: 'Generate code' }]
            };
            const thinkingMessage = createThinkingMessage('compat-reasoning-456', 'thinking about the code generation');
            const options = createTestOptions([userMessage, thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(2);
            // User message should not have reasoning properties
            (0, vitest_1.expect)(messages[0].cot_id).toBeUndefined();
            (0, vitest_1.expect)(messages[0].cot_summary).toBeUndefined();
            // Assistant message should have reasoning properties
            (0, vitest_1.expect)(messages[1].cot_id).toBe('compat-reasoning-456');
            (0, vitest_1.expect)(messages[1].cot_summary).toBe('thinking about the code generation');
        });
        (0, vitest_1.it)('should handle messages without thinking content', () => {
            const endpoint = new openaiCompatibleEndpoint_1.OpenAICompatibleTestEndpoint(modelConfig, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const regularMessage = {
                role: prompt_tsx_1.Raw.ChatRole.Assistant,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: 'Here is your code' }]
            };
            const options = createTestOptions([regularMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].cot_id).toBeUndefined();
            (0, vitest_1.expect)(messages[0].cot_summary).toBeUndefined();
        });
        (0, vitest_1.it)('should work with Azure OpenAI configuration', () => {
            const azureModelConfig = {
                ...modelConfig,
                type: 'azureOpenai',
                url: 'https://myresource.openai.azure.com/openai/deployments/gpt-4/chat/completions?api-version=2023-12-01-preview',
                auth: {
                    useBearerHeader: false,
                    useApiKeyHeader: true,
                    apiKeyEnvName: 'AZURE_OPENAI_API_KEY'
                }
            };
            const endpoint = new openaiCompatibleEndpoint_1.OpenAICompatibleTestEndpoint(azureModelConfig, mockServices.domainService, mockServices.capiClientService, mockServices.fetcherService, mockServices.envService, mockServices.telemetryService, mockServices.authService, mockServices.chatMLFetcher, mockServices.tokenizerProvider, mockServices.instantiationService, mockServices.configurationService, mockServices.expService, mockServices.logService);
            const thinkingMessage = createThinkingMessage('azure-thinking-789', 'azure reasoning process');
            const options = createTestOptions([thinkingMessage]);
            const body = endpoint.createRequestBody(options);
            (0, vitest_1.expect)(body.messages).toBeDefined();
            const messages = body.messages;
            (0, vitest_1.expect)(messages).toHaveLength(1);
            (0, vitest_1.expect)(messages[0].cot_id).toBe('azure-thinking-789');
            (0, vitest_1.expect)(messages[0].cot_summary).toBe('azure reasoning process');
        });
    });
});
//# sourceMappingURL=openaiCompatibleEndpoint.spec.js.map