"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestThinkingData = exports.ReasoningPropertyVerifiers = void 0;
exports.createThinkingMessage = createThinkingMessage;
exports.createUserMessage = createUserMessage;
exports.createAssistantMessage = createAssistantMessage;
exports.createTestOptions = createTestOptions;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
/**
 * Test fixtures and utilities for endpoint reasoning properties tests
 */
/**
 * Creates a test message with thinking content (opaque part)
 */
function createThinkingMessage(thinkingId, thinkingText) {
    return {
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
    };
}
/**
 * Creates a simple user message for testing
 */
function createUserMessage(text) {
    return {
        role: prompt_tsx_1.Raw.ChatRole.User,
        content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text }]
    };
}
/**
 * Creates a simple assistant message (without thinking content) for testing
 */
function createAssistantMessage(text) {
    return {
        role: prompt_tsx_1.Raw.ChatRole.Assistant,
        content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text }]
    };
}
/**
 * Creates test options for endpoint createRequestBody calls
 */
function createTestOptions(messages) {
    return {
        debugName: 'test',
        messages,
        requestId: 'test-req-123',
        postOptions: {},
        finishedCb: undefined,
        location: undefined
    };
}
/**
 * Verification helpers for reasoning properties
 */
exports.ReasoningPropertyVerifiers = {
    /**
     * Verifies that a message has OpenAI-style CoT (Chain of Thought) properties
     */
    hasOpenAICoTProperties(message, expectedId, expectedText) {
        return message.cot_id === expectedId && message.cot_summary === expectedText;
    },
    /**
     * Verifies that a message has Copilot-style reasoning properties
     */
    hasCopilotReasoningProperties(message, expectedId, expectedText) {
        return message.reasoning_opaque === expectedId && message.reasoning_text === expectedText;
    },
    /**
     * Verifies that a message has no reasoning properties
     */
    hasNoReasoningProperties(message) {
        return (message.cot_id === undefined &&
            message.cot_summary === undefined &&
            message.reasoning_opaque === undefined &&
            message.reasoning_text === undefined);
    }
};
/**
 * Sample thinking data for consistent testing
 */
exports.TestThinkingData = {
    openai: {
        id: 'openai-thinking-123',
        text: 'OpenAI-style reasoning process'
    },
    copilot: {
        id: 'copilot-reasoning-456',
        text: 'Copilot-style reasoning analysis'
    },
    azure: {
        id: 'azure-thinking-789',
        text: 'Azure OpenAI reasoning content'
    },
    generic: {
        id: 'test-thinking-abc',
        text: 'Generic test reasoning text'
    }
};
//# sourceMappingURL=endpointTestFixtures.js.map