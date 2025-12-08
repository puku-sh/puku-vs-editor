"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockLanguageModelChat = void 0;
exports.createMockEndpointProvider = createMockEndpointProvider;
/**
 * Creates a mock endpoint provider for search tool tests
 */
function createMockEndpointProvider(modelFamily) {
    return {
        _serviceBrand: undefined,
        getChatEndpoint: async () => ({
            family: modelFamily,
            model: 'test-model',
            maxOutputTokens: 1000,
            supportsToolCalls: true,
            supportsVision: true,
            supportsPrediction: true,
            showInModelPicker: true,
        }),
        getAllChatEndpoints: async () => [],
        getAllCompletionModels: async () => [],
        getEmbeddingsEndpoint: async () => ({}),
    };
}
/**
 * Mock language model chat for testing search tools with model-specific behavior
 */
exports.mockLanguageModelChat = {
    name: 'test-model',
    id: 'test-id',
    vendor: 'test',
    family: 'test-family',
    version: 'test-version',
    maxInputTokens: 1000,
    maxOutputTokens: 1000,
    sendRequest: async () => ({
        text: (async function* () { yield ''; })(),
        stream: (async function* () { })()
    }),
    countTokens: async () => 0,
    capabilities: {
        supportsToolCalling: true,
        supportsImageToText: true
    },
};
//# sourceMappingURL=searchToolTestUtils.js.map