"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockClaudeCodeSdkService = void 0;
/**
 * Mock implementation of IClaudeCodeService for testing
 */
class MockClaudeCodeSdkService {
    constructor() {
        this.queryCallCount = 0;
    }
    async query(options) {
        this.queryCallCount++;
        return this.createMockGenerator(options.prompt);
    }
    async *createMockGenerator(prompt) {
        // For every user message yielded, emit an assistant text and then a result
        for await (const _ of prompt) {
            yield {
                type: 'assistant',
                session_id: 'sess-1',
                message: {
                    role: 'assistant',
                    content: [
                        { type: 'text', text: 'Hello from mock!' }
                    ]
                }
            };
            yield {
                type: 'result',
                subtype: 'error_max_turns',
                uuid: 'mock-uuid',
                session_id: 'sess-1',
                duration_ms: 0,
                duration_api_ms: 0,
                is_error: false,
                num_turns: 0,
                total_cost_usd: 0,
                usage: { input_tokens: 0, output_tokens: 0 },
                permission_denials: []
            };
        }
    }
}
exports.MockClaudeCodeSdkService = MockClaudeCodeSdkService;
//# sourceMappingURL=mockClaudeCodeSdkService.js.map