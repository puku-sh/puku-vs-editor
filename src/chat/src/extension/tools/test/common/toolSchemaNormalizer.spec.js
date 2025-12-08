"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const toolSchemaNormalizer_1 = require("../../common/toolSchemaNormalizer");
(0, vitest_1.describe)('ToolSchemaNormalizer', () => {
    const makeTool = (properties) => [{
            type: 'function',
            function: {
                name: 'test',
                description: 'test',
                parameters: {
                    type: 'object',
                    properties,
                }
            }
        }];
    (0, vitest_1.test)('throws an invalid primitive types', () => {
        vitest_1.assert.throws(() => (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, makeTool({
            foo: {
                type: 'text',
                description: 'foo',
            }
        })), Error, /do not match JSON schema/);
    });
    (0, vitest_1.test)('fails on array without item specs', () => {
        vitest_1.assert.throws(() => (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, makeTool({
            foo: {
                type: 'array',
            }
        })), Error, /array type must have items/);
    });
    (0, vitest_1.test)('trims extra properties', () => {
        const schema = (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, makeTool({
            foo: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 2,
            }
        }));
        (0, vitest_1.expect)(schema[0].function.parameters).toMatchInlineSnapshot(`
			{
			  "properties": {
			    "foo": {
			      "items": {
			        "type": "string",
			      },
			      "type": "array",
			    },
			  },
			  "type": "object",
			}
		`);
    });
    (0, vitest_1.test)('does not fail on "in true""', () => {
        (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, makeTool({
            foo: {
                type: 'array',
                items: true
            }
        }));
    });
    (0, vitest_1.test)('removes undefined required properties', () => {
        const schema = (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, makeTool({
            foo1: {
                type: 'object',
            },
            foo2: {
                type: 'object',
                properties: { a: { type: 'string' } },
            },
            foo3: {
                type: 'object',
                properties: { a: { type: 'string' }, b: { type: 'string' } },
                required: ['a', 'b', 'c'],
            }
        }));
        (0, vitest_1.expect)(schema[0].function.parameters).toMatchInlineSnapshot(`
			{
			  "properties": {
			    "foo1": {
			      "type": "object",
			    },
			    "foo2": {
			      "properties": {
			        "a": {
			          "type": "string",
			        },
			      },
			      "type": "object",
			    },
			    "foo3": {
			      "properties": {
			        "a": {
			          "type": "string",
			        },
			        "b": {
			          "type": "string",
			        },
			      },
			      "required": [
			        "a",
			        "b",
			      ],
			      "type": "object",
			    },
			  },
			  "type": "object",
			}
		`);
    });
    (0, vitest_1.test)('ensures object parameters', () => {
        const n1 = (0, toolSchemaNormalizer_1.normalizeToolSchema)("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, [{
                type: 'function',
                function: {
                    name: 'noParams',
                    description: 'test',
                }
            }, {
                type: 'function',
                function: {
                    name: 'wrongType',
                    description: 'test',
                    parameters: { type: 'string' },
                }
            }, {
                type: 'function',
                function: {
                    name: 'missingProps',
                    description: 'test',
                    parameters: { type: 'object' },
                }
            }]);
        (0, vitest_1.expect)(n1).toMatchInlineSnapshot(`
			[
			  {
			    "function": {
			      "description": "test",
			      "name": "noParams",
			    },
			    "type": "function",
			  },
			  {
			    "function": {
			      "description": "test",
			      "name": "wrongType",
			      "parameters": {
			        "properties": {},
			        "type": "object",
			      },
			    },
			    "type": "function",
			  },
			  {
			    "function": {
			      "description": "test",
			      "name": "missingProps",
			      "parameters": {
			        "properties": {},
			        "type": "object",
			      },
			    },
			    "type": "function",
			  },
			]
		`);
    });
    (0, vitest_1.test)('normalizes arrays for draft 2020-12', () => {
        const schema = (0, toolSchemaNormalizer_1.normalizeToolSchema)("claude-3.7-sonnet" /* CHAT_MODEL.CLAUDE_37_SONNET */, makeTool({
            foo: {
                type: 'array',
                items: [{ type: 'string' }, { type: 'number' }],
                minItems: 2,
                maxItems: 2,
            },
            bar: {
                type: 'array',
                items: { type: 'string' },
                minItems: 2,
                maxItems: 2,
            }
        }));
        (0, vitest_1.expect)(schema[0]).toMatchInlineSnapshot(`
			{
			  "function": {
			    "description": "test",
			    "name": "test",
			    "parameters": {
			      "properties": {
			        "bar": {
			          "items": {
			            "type": "string",
			          },
			          "maxItems": 2,
			          "minItems": 2,
			          "type": "array",
			        },
			        "foo": {
			          "items": {
			            "anyOf": [
			              {
			                "type": "string",
			              },
			              {
			                "type": "number",
			              },
			            ],
			          },
			          "maxItems": 2,
			          "minItems": 2,
			          "type": "array",
			        },
			      },
			      "type": "object",
			    },
			  },
			  "type": "function",
			}
		`);
    });
});
//# sourceMappingURL=toolSchemaNormalizer.spec.js.map