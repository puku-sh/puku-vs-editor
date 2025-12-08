"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testLogService_1 = require("../../../../platform/testing/common/testLogService");
const toolsService_1 = require("../toolsService");
(0, vitest_1.describe)('Tool Service', () => {
    (0, vitest_1.describe)('validateToolInput', () => {
        let toolsService;
        (0, vitest_1.beforeEach)(() => {
            const logService = new testLogService_1.TestLogService();
            toolsService = new toolsService_1.NullToolsService(logService);
        });
        (0, vitest_1.test)('should return error for non-existent tool', () => {
            const result = toolsService.validateToolInput('nonExistentTool', '{}');
            (0, vitest_1.expect)(result).toEqual({
                error: 'ERROR: The tool "nonExistentTool" does not exist'
            });
        });
        (0, vitest_1.test)('should validate tool input with schema', () => {
            // Add a mock tool with a schema
            const mockTool = {
                name: 'testTool',
                description: 'A test tool',
                inputSchema: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'A message parameter'
                        },
                        count: {
                            type: 'number',
                            description: 'A numeric parameter'
                        }
                    },
                    required: ['message']
                },
                tags: [],
                source: undefined
            };
            toolsService.tools.push(mockTool);
            // Test valid input
            const validResult = toolsService.validateToolInput('testTool', '{"message": "hello", "count": 42}');
            (0, vitest_1.expect)(validResult).toEqual({
                inputObj: { message: 'hello', count: 42 }
            });
            // Test missing required field
            const invalidResult = toolsService.validateToolInput('testTool', '{"count": 42}');
            (0, vitest_1.expect)(invalidResult).toMatchObject({
                error: vitest_1.expect.stringContaining('ERROR: Your input to the tool was invalid')
            });
            // Test invalid JSON
            const malformedResult = toolsService.validateToolInput('testTool', '{"message": "hello"');
            (0, vitest_1.expect)(malformedResult).toMatchObject({
                error: vitest_1.expect.stringContaining('ERROR: Your input to the tool was invalid')
            });
        });
        (0, vitest_1.test)('should handle empty input with optional properties', () => {
            const emptyTool = {
                name: 'emptyTool',
                description: 'A tool with optional parameters',
                inputSchema: {
                    type: 'object',
                    properties: {
                        optionalParam: {
                            type: 'string',
                            description: 'An optional parameter'
                        }
                    }
                },
                tags: [],
                source: undefined
            };
            toolsService.tools.push(emptyTool);
            const emptyResult = toolsService.validateToolInput('emptyTool', '');
            (0, vitest_1.expect)(emptyResult).toMatchObject({
                inputObj: undefined
            });
        });
        (0, vitest_1.test)('should handle tool without schema', () => {
            const toolWithoutSchema = {
                name: 'schemaLessTool',
                description: 'A tool without input schema',
                inputSchema: undefined,
                tags: [],
                source: undefined
            };
            toolsService.tools.push(toolWithoutSchema);
            const result = toolsService.validateToolInput('schemaLessTool', '{"anyParam": "anyValue"}');
            (0, vitest_1.expect)(result).toEqual({
                inputObj: { anyParam: 'anyValue' }
            });
        });
        (0, vitest_1.test)('should handle type coercion', () => {
            const coercionTool = {
                name: 'coercionTool',
                description: 'A tool that tests type coercion',
                inputSchema: {
                    type: 'object',
                    properties: {
                        numberAsString: {
                            type: 'number'
                        },
                        booleanAsString: {
                            type: 'boolean'
                        }
                    }
                },
                tags: [],
                source: undefined
            };
            toolsService.tools.push(coercionTool);
            // Test that AJV coerces string numbers to numbers and string booleans to booleans
            const result = toolsService.validateToolInput('coercionTool', '{"numberAsString": "42", "booleanAsString": "true"}');
            (0, vitest_1.expect)(result).toEqual({
                inputObj: { numberAsString: 42, booleanAsString: true }
            });
        });
        (0, vitest_1.test)('should handle nested JSON strings', () => {
            const nestedJsonTool = {
                name: 'nestedJsonTool',
                description: 'A tool that expects nested objects',
                inputSchema: {
                    type: 'object',
                    properties: {
                        thread_id: {
                            type: 'string',
                            description: 'Thread identifier'
                        },
                        action_json: {
                            type: 'object',
                            description: 'Action configuration',
                            properties: {
                                command: {
                                    type: 'string'
                                }
                            },
                            required: ['command']
                        }
                    },
                    required: ['thread_id', 'action_json']
                },
                tags: [],
                source: undefined
            };
            toolsService.tools.push(nestedJsonTool);
            // Test that nested JSON strings are automatically parsed
            const result = toolsService.validateToolInput('nestedJsonTool', '{"thread_id": "i6747", "action_json": "{\\"command\\": \\"ls -la\\"}"}');
            (0, vitest_1.expect)(result).toEqual({
                inputObj: {
                    thread_id: 'i6747',
                    action_json: { command: 'ls -la' }
                }
            });
            // Test with multiple nested JSON strings
            const multiNestedTool = {
                name: 'multiNestedTool',
                description: 'A tool with multiple nested objects',
                inputSchema: {
                    type: 'object',
                    properties: {
                        config: {
                            type: 'object',
                            properties: {
                                setting: { type: 'string' }
                            }
                        },
                        metadata: {
                            type: 'object',
                            properties: {
                                tags: { type: 'array' }
                            }
                        }
                    }
                },
                tags: [],
                source: undefined
            };
            toolsService.tools.push(multiNestedTool);
            const multiResult = toolsService.validateToolInput('multiNestedTool', '{"config": "{\\"setting\\": \\"value\\"}", "metadata": "{\\"tags\\": [\\"tag1\\", \\"tag2\\"]}"}');
            (0, vitest_1.expect)(multiResult).toEqual({
                inputObj: {
                    config: { setting: 'value' },
                    metadata: { tags: ['tag1', 'tag2'] }
                }
            });
            // Test that malformed nested JSON strings still fail gracefully
            const malformedResult = toolsService.validateToolInput('nestedJsonTool', '{"thread_id": "i6747", "action_json": "{\\"command\\": invalid}"}');
            (0, vitest_1.expect)(malformedResult).toMatchObject({
                error: vitest_1.expect.stringContaining('ERROR: Your input to the tool was invalid')
            });
        });
    });
});
//# sourceMappingURL=toolService.spec.js.map