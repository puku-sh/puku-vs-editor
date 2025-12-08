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
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const endpointTypes_1 = require("../../../../platform/endpoint/common/endpointTypes");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const geminiMessageConverter_1 = require("../geminiMessageConverter");
(0, vitest_1.describe)('GeminiMessageConverter', () => {
    (0, vitest_1.it)('should convert basic user and assistant messages', () => {
        const messages = [
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.User,
                content: [new vscodeTypes_1.LanguageModelTextPart('Hello, how are you?')],
                name: undefined
            },
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant,
                content: [new vscodeTypes_1.LanguageModelTextPart('I am doing well, thank you!')],
                name: undefined
            }
        ];
        const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        (0, vitest_1.expect)(result.contents).toHaveLength(2);
        (0, vitest_1.expect)(result.contents[0].role).toBe('user');
        (0, vitest_1.expect)(result.contents[0].parts).toBeDefined();
        (0, vitest_1.expect)(result.contents[0].parts[0].text).toBe('Hello, how are you?');
        (0, vitest_1.expect)(result.contents[1].role).toBe('model');
        (0, vitest_1.expect)(result.contents[1].parts).toBeDefined();
        (0, vitest_1.expect)(result.contents[1].parts[0].text).toBe('I am doing well, thank you!');
    });
    (0, vitest_1.it)('should handle system messages as system instruction', () => {
        const messages = [
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.System,
                content: [new vscodeTypes_1.LanguageModelTextPart('You are a helpful assistant.')],
                name: undefined
            },
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.User,
                content: [new vscodeTypes_1.LanguageModelTextPart('Hello!')],
                name: undefined
            }
        ];
        const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        (0, vitest_1.expect)(result.systemInstruction).toBeDefined();
        (0, vitest_1.expect)(result.systemInstruction.parts).toBeDefined();
        (0, vitest_1.expect)(result.systemInstruction.parts[0].text).toBe('You are a helpful assistant.');
        (0, vitest_1.expect)(result.contents).toHaveLength(1);
        (0, vitest_1.expect)(result.contents[0].role).toBe('user');
    });
    (0, vitest_1.it)('should filter out empty text parts', () => {
        const messages = [
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.User,
                content: [
                    new vscodeTypes_1.LanguageModelTextPart(''),
                    new vscodeTypes_1.LanguageModelTextPart('  '),
                    new vscodeTypes_1.LanguageModelTextPart('Hello!')
                ],
                name: undefined
            }
        ];
        const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        (0, vitest_1.expect)(result.contents[0].parts).toBeDefined();
        (0, vitest_1.expect)(result.contents[0].parts).toHaveLength(2); // Empty string filtered out, whitespace kept
        (0, vitest_1.expect)(result.contents[0].parts[0].text).toBe('  ');
        (0, vitest_1.expect)(result.contents[0].parts[1].text).toBe('Hello!');
    });
    (0, vitest_1.it)('should extract functionResponse parts from model message into subsequent user message and prune empty model', () => {
        // Simulate a model message that (incorrectly) contains only a tool result part
        const toolResult = new vscodeTypes_1.LanguageModelToolResultPart('myTool_12345', [new vscodeTypes_1.LanguageModelTextPart('{"foo":"bar"}')]);
        const messages = [
            {
                role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant,
                content: [toolResult],
                name: undefined
            }
        ];
        const { contents } = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        // The original (empty) model message should be pruned; we expect a single user message with functionResponse
        (0, vitest_1.expect)(contents).toHaveLength(1);
        (0, vitest_1.expect)(contents[0].role).toBe('user');
        (0, vitest_1.expect)(contents[0].parts[0]).toHaveProperty('functionResponse');
        const fr = contents[0].parts[0];
        (0, vitest_1.expect)(fr.functionResponse.name).toBe('myTool'); // extracted from callId prefix
        (0, vitest_1.expect)(fr.functionResponse.response).toEqual({ foo: 'bar' });
    });
    (0, vitest_1.it)('should be idempotent when called multiple times (no duplication)', () => {
        const toolResult = new vscodeTypes_1.LanguageModelToolResultPart('doThing_12345', [new vscodeTypes_1.LanguageModelTextPart('{"value":42}')]);
        const messages = [
            { role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant, content: [new vscodeTypes_1.LanguageModelTextPart('Result:'), toolResult], name: undefined }
        ];
        const first = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
        const second = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages); // Re-run with same original messages
        // Both runs should yield identical normalized structure (model text + user tool response) without growth
        (0, vitest_1.expect)(first.contents.length).toBe(2);
        (0, vitest_1.expect)(second.contents.length).toBe(2);
        (0, vitest_1.expect)(first.contents[0].role).toBe('model');
        (0, vitest_1.expect)(first.contents[1].role).toBe('user');
        (0, vitest_1.expect)(second.contents[0].role).toBe('model');
        (0, vitest_1.expect)(second.contents[1].role).toBe('user');
    });
    (0, vitest_1.describe)('Image handling', () => {
        (0, vitest_1.it)('should handle LanguageModelDataPart as inline image data', () => {
            const imageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
            const imagePart = new vscodeTypes_1.LanguageModelDataPart(imageData, 'image/png');
            const messages = [
                {
                    role: vscodeTypes_1.LanguageModelChatMessageRole.User,
                    content: [new vscodeTypes_1.LanguageModelTextPart('Here is an image:'), imagePart],
                    name: undefined
                }
            ];
            const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
            (0, vitest_1.expect)(result.contents).toHaveLength(1);
            (0, vitest_1.expect)(result.contents[0].parts).toHaveLength(2);
            (0, vitest_1.expect)(result.contents[0].parts[0].text).toBe('Here is an image:');
            (0, vitest_1.expect)(result.contents[0].parts[1]).toHaveProperty('inlineData');
            const inlineData = result.contents[0].parts[1];
            (0, vitest_1.expect)(inlineData.inlineData.mimeType).toBe('image/png');
            (0, vitest_1.expect)(inlineData.inlineData.data).toBe(Buffer.from(imageData).toString('base64'));
        });
        (0, vitest_1.it)('should filter out StatefulMarker and CacheControl data parts', () => {
            const imageData = new Uint8Array([137, 80, 78, 71]);
            const validImage = new vscodeTypes_1.LanguageModelDataPart(imageData, 'image/jpeg');
            const statefulMarker = new vscodeTypes_1.LanguageModelDataPart(new Uint8Array([1, 2, 3]), endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker);
            const cacheControl = new vscodeTypes_1.LanguageModelDataPart(new TextEncoder().encode('ephemeral'), endpointTypes_1.CustomDataPartMimeTypes.CacheControl);
            const messages = [
                {
                    role: vscodeTypes_1.LanguageModelChatMessageRole.User,
                    content: [validImage, statefulMarker, cacheControl],
                    name: undefined
                }
            ];
            const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
            // Should only include the valid image, not the stateful marker or cache control
            (0, vitest_1.expect)(result.contents[0].parts).toHaveLength(1);
            (0, vitest_1.expect)(result.contents[0].parts[0]).toHaveProperty('inlineData');
            const inlineData = result.contents[0].parts[0];
            (0, vitest_1.expect)(inlineData.inlineData.mimeType).toBe('image/jpeg');
        });
        (0, vitest_1.it)('should handle images in tool result content with text', () => {
            const imageData = new Uint8Array([255, 216, 255, 224]); // JPEG header
            const imagePart = new vscodeTypes_1.LanguageModelDataPart(imageData, 'image/jpeg');
            const textPart = new vscodeTypes_1.LanguageModelTextPart('{"success": true}');
            const toolResult = new vscodeTypes_1.LanguageModelToolResultPart('processImage_12345', [textPart, imagePart]);
            const messages = [
                {
                    role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant,
                    content: [toolResult],
                    name: undefined
                }
            ];
            const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
            // Should have a user message with function response
            (0, vitest_1.expect)(result.contents).toHaveLength(1);
            (0, vitest_1.expect)(result.contents[0].role).toBe('user');
            (0, vitest_1.expect)(result.contents[0].parts[0]).toHaveProperty('functionResponse');
            const fr = result.contents[0].parts[0];
            (0, vitest_1.expect)(fr.functionResponse.name).toBe('processImage');
            (0, vitest_1.expect)(fr.functionResponse.response.success).toBe(true);
            (0, vitest_1.expect)(fr.functionResponse.response.images).toBeDefined();
            (0, vitest_1.expect)(fr.functionResponse.response.images).toHaveLength(1);
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].mimeType).toBe('image/jpeg');
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].size).toBe(imageData.length);
        });
        (0, vitest_1.it)('should handle images in tool result content without text', () => {
            const imageData1 = new Uint8Array([255, 216, 255, 224]); // JPEG header
            const imageData2 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header
            const imagePart1 = new vscodeTypes_1.LanguageModelDataPart(imageData1, 'image/jpeg');
            const imagePart2 = new vscodeTypes_1.LanguageModelDataPart(imageData2, 'image/png');
            const toolResult = new vscodeTypes_1.LanguageModelToolResultPart('generateImages_12345', [imagePart1, imagePart2]);
            const messages = [
                {
                    role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant,
                    content: [toolResult],
                    name: undefined
                }
            ];
            const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
            (0, vitest_1.expect)(result.contents).toHaveLength(1);
            (0, vitest_1.expect)(result.contents[0].role).toBe('user');
            const fr = result.contents[0].parts[0];
            (0, vitest_1.expect)(fr.functionResponse.name).toBe('generateImages');
            (0, vitest_1.expect)(fr.functionResponse.response.images).toHaveLength(2);
            // First image
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].mimeType).toBe('image/jpeg');
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].size).toBe(imageData1.length);
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].data).toBe(Buffer.from(imageData1).toString('base64'));
            // Second image
            (0, vitest_1.expect)(fr.functionResponse.response.images[1].mimeType).toBe('image/png');
            (0, vitest_1.expect)(fr.functionResponse.response.images[1].size).toBe(imageData2.length);
            (0, vitest_1.expect)(fr.functionResponse.response.images[1].data).toBe(Buffer.from(imageData2).toString('base64'));
        });
        (0, vitest_1.it)('should handle mixed text and filtered data parts in tool results', () => {
            const validImageData = new Uint8Array([255, 216]);
            const validImage = new vscodeTypes_1.LanguageModelDataPart(validImageData, 'image/jpeg');
            const statefulMarker = new vscodeTypes_1.LanguageModelDataPart(new Uint8Array([1, 2, 3]), endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker);
            const textPart = new vscodeTypes_1.LanguageModelTextPart('Result text');
            const toolResult = new vscodeTypes_1.LanguageModelToolResultPart('mixedContent_12345', [textPart, validImage, statefulMarker]);
            const messages = [
                {
                    role: vscodeTypes_1.LanguageModelChatMessageRole.Assistant,
                    content: [toolResult],
                    name: undefined
                }
            ];
            const result = (0, geminiMessageConverter_1.apiMessageToGeminiMessage)(messages);
            const fr = result.contents[0].parts[0];
            (0, vitest_1.expect)(fr.functionResponse.name).toBe('mixedContent');
            // Should include text and valid image, but not stateful marker
            (0, vitest_1.expect)(fr.functionResponse.response.result).toContain('Result text');
            (0, vitest_1.expect)(fr.functionResponse.response.result).toContain('[Contains 1 image(s) with types: image/jpeg]');
            (0, vitest_1.expect)(fr.functionResponse.response.images).toHaveLength(1);
            (0, vitest_1.expect)(fr.functionResponse.response.images[0].mimeType).toBe('image/jpeg');
        });
    });
    (0, vitest_1.describe)('geminiMessagesToRawMessages', () => {
        (0, vitest_1.it)('should convert function response with images to Raw format with image content parts', async () => {
            const { geminiMessagesToRawMessages } = await Promise.resolve().then(() => __importStar(require('../geminiMessageConverter')));
            // Simulate a Gemini Content with function response containing images
            const contents = [{
                    role: 'user',
                    parts: [{
                            functionResponse: {
                                name: 'generateImages',
                                response: {
                                    success: true,
                                    images: [
                                        {
                                            mimeType: 'image/jpeg',
                                            size: 1024,
                                            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
                                        },
                                        {
                                            mimeType: 'image/png',
                                            size: 512,
                                            data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBAQFBAYFBQYJBgUGCQsIBgYICwwKCgsKCgwQDAwMDAwMEAwODxAPDgwTExQUExMcGxsbHB8fHx8fHx8fHx//2wBDAQcHBw0MDRgQEBgaFREVGh8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx//wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
                                        }
                                    ]
                                }
                            }
                        }]
                }];
            const rawMessages = geminiMessagesToRawMessages(contents);
            (0, vitest_1.expect)(rawMessages).toHaveLength(1);
            // Check the role - should be Raw.ChatRole.Tool enum value
            (0, vitest_1.expect)(rawMessages[0].role).toBe(prompt_tsx_1.Raw.ChatRole.Tool);
            // Type assertion for tool message
            const toolMessage = rawMessages[0];
            (0, vitest_1.expect)(toolMessage.toolCallId).toBe('generateImages');
            (0, vitest_1.expect)(rawMessages[0].content).toHaveLength(3); // 2 images + 1 text part
            // Check first image
            (0, vitest_1.expect)(rawMessages[0].content[0].type).toBe(prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image);
            const firstImage = rawMessages[0].content[0];
            (0, vitest_1.expect)(firstImage.imageUrl?.url).toBe('data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
            // Check second image
            (0, vitest_1.expect)(rawMessages[0].content[1].type).toBe(prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image);
            const secondImage = rawMessages[0].content[1];
            (0, vitest_1.expect)(secondImage.imageUrl?.url).toBe('data:image/png;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBAQFBAYFBQYJBgUGCQsIBgYICwwKCgsKCgwQDAwMDAwMEAwODxAPDgwTExQUExMcGxsbHB8fHx8fHx8fHx//2wBDAQcHBw0MDRgQEBgaFREVGh8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx//wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=');
            // Check text content with cleaned response
            (0, vitest_1.expect)(rawMessages[0].content[2].type).toBe(prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text);
            const textPart = rawMessages[0].content[2];
            const textContent = JSON.parse(textPart.text);
            (0, vitest_1.expect)(textContent.success).toBe(true);
            (0, vitest_1.expect)(textContent.images).toHaveLength(2);
            (0, vitest_1.expect)(textContent.images[0].mimeType).toBe('image/jpeg');
            (0, vitest_1.expect)(textContent.images[0].size).toBe(1024);
            (0, vitest_1.expect)(textContent.images[1].mimeType).toBe('image/png');
            (0, vitest_1.expect)(textContent.images[1].size).toBe(512);
            // Should not contain raw base64 data in text content
            (0, vitest_1.expect)(textContent.images[0]).not.toHaveProperty('data');
            (0, vitest_1.expect)(textContent.images[1]).not.toHaveProperty('data');
        });
        (0, vitest_1.it)('should handle function response without images normally', async () => {
            const { geminiMessagesToRawMessages } = await Promise.resolve().then(() => __importStar(require('../geminiMessageConverter')));
            const contents = [{
                    role: 'user',
                    parts: [{
                            functionResponse: {
                                name: 'textFunction',
                                response: { result: 'success', value: 42 }
                            }
                        }]
                }];
            const rawMessages = geminiMessagesToRawMessages(contents);
            (0, vitest_1.expect)(rawMessages).toHaveLength(1);
            (0, vitest_1.expect)(rawMessages[0].role).toBe(prompt_tsx_1.Raw.ChatRole.Tool);
            (0, vitest_1.expect)(rawMessages[0].content).toHaveLength(1);
            (0, vitest_1.expect)(rawMessages[0].content[0].type).toBe(prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text);
            const textPart = rawMessages[0].content[0];
            (0, vitest_1.expect)(JSON.parse(textPart.text)).toEqual({ result: 'success', value: 42 });
        });
    });
});
//# sourceMappingURL=geminiMessageConverter.spec.js.map