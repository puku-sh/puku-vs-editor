"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const anthropicMessageConverter_1 = require("../anthropicMessageConverter");
(0, vitest_1.suite)('anthropicMessagesToRawMessages', function () {
    (0, vitest_1.test)('converts simple text messages', function () {
        const messages = [
            {
                role: 'user',
                content: 'Hello world'
            },
            {
                role: 'assistant',
                content: 'Hi there!'
            }
        ];
        const system = { type: 'text', text: 'You are a helpful assistant' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('handles empty system message', function () {
        const messages = [
            {
                role: 'user',
                content: 'Hello'
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('converts messages with content blocks', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Look at this image:' },
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: 'fake-base64-data'
                        }
                    }
                ]
            }
        ];
        const system = { type: 'text', text: 'System prompt' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('converts tool use messages', function () {
        const messages = [
            {
                role: 'assistant',
                content: [
                    { type: 'text', text: 'I will use a tool:' },
                    {
                        type: 'tool_use',
                        id: 'call_123',
                        name: 'get_weather',
                        input: { location: 'London' }
                    }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('converts tool result messages', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: 'call_123',
                        content: 'The weather in London is sunny'
                    }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('converts tool result with content blocks', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: 'call_456',
                        content: [
                            { type: 'text', text: 'Here is the chart:' },
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: 'image/png',
                                    data: 'chart-data'
                                }
                            }
                        ]
                    }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('handles cache control blocks', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: 'Cached content',
                        cache_control: { type: 'ephemeral' }
                    }
                ]
            }
        ];
        const system = {
            type: 'text',
            text: 'System with cache',
            cache_control: { type: 'ephemeral' }
        };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('includes thinking blocks in conversion to raw messages', function () {
        const messages = [
            {
                role: 'assistant',
                content: [
                    { type: 'thinking', thinking: 'Let me think...', signature: '' },
                    { type: 'text', text: 'Here is my response' }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('handles url-based images', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'url',
                            url: 'https://example.com/image.jpg'
                        }
                    }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('handles empty tool result content', function () {
        const messages = [
            {
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: 'call_empty',
                        content: []
                    }
                ]
            }
        ];
        const system = { type: 'text', text: '' };
        const result = (0, anthropicMessageConverter_1.anthropicMessagesToRawMessages)(messages, system);
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
});
//# sourceMappingURL=anthropicMessageConverter.spec.js.map