"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const vitest_1 = require("vitest");
const geminiFunctionDeclarationConverter_1 = require("../geminiFunctionDeclarationConverter");
(0, vitest_1.describe)('GeminiFunctionDeclarationConverter', () => {
    (0, vitest_1.describe)('toGeminiFunction', () => {
        (0, vitest_1.it)('should convert basic function with simple parameters', () => {
            const schema = {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'The name parameter'
                    },
                    age: {
                        type: 'number',
                        description: 'The age parameter'
                    },
                    isActive: {
                        type: 'boolean',
                        description: 'Whether the user is active'
                    }
                },
                required: ['name', 'age']
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('testFunction', 'A test function', schema);
            (0, vitest_1.expect)(result.name).toBe('testFunction');
            (0, vitest_1.expect)(result.description).toBe('A test function');
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(result.parameters.required).toEqual(['name', 'age']);
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties['name']).toEqual({
                type: genai_1.Type.STRING,
                description: 'The name parameter'
            });
            (0, vitest_1.expect)(result.parameters.properties['age']).toEqual({
                type: genai_1.Type.NUMBER,
                description: 'The age parameter'
            });
            (0, vitest_1.expect)(result.parameters.properties['isActive']).toEqual({
                type: genai_1.Type.BOOLEAN,
                description: 'Whether the user is active'
            });
        });
        (0, vitest_1.it)('should handle function with no description', () => {
            const schema = {
                type: 'object',
                properties: {
                    value: { type: 'string' }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('noDescFunction', '', schema);
            (0, vitest_1.expect)(result.description).toBe('No description provided.');
        });
        (0, vitest_1.it)('should handle integer type by mapping to INTEGER', () => {
            const schema = {
                type: 'object',
                properties: {
                    count: {
                        type: 'integer',
                        description: 'An integer count'
                    },
                    groupIndex: {
                        type: 'integer',
                        description: 'Group index'
                    }
                },
                required: ['count']
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('integerFunction', 'Function with integer parameters', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(result.parameters.required).toEqual(['count']);
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties['count']).toEqual({
                type: genai_1.Type.INTEGER,
                description: 'An integer count'
            });
            (0, vitest_1.expect)(result.parameters.properties['groupIndex']).toEqual({
                type: genai_1.Type.INTEGER,
                description: 'Group index'
            });
        });
        (0, vitest_1.it)('should handle null type by mapping to NULL', () => {
            const schema = {
                type: 'object',
                properties: {
                    nullableField: {
                        type: 'null',
                        description: 'A nullable field'
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('nullFunction', 'Function with null parameter', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties['nullableField']).toEqual({
                type: genai_1.Type.NULL,
                description: 'A nullable field'
            });
        });
        (0, vitest_1.it)('should handle array schema by using items as parameters', () => {
            const schema = {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        count: { type: 'number' }
                    },
                    required: ['id']
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('arrayFunction', 'Array function', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(result.parameters.required).toEqual(['id']);
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties['id']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(result.parameters.properties['count']).toEqual({
                type: genai_1.Type.NUMBER
            });
        });
        (0, vitest_1.it)('should handle nested object properties', () => {
            const schema = {
                type: 'object',
                properties: {
                    user: {
                        type: 'object',
                        description: 'User information',
                        properties: {
                            profile: {
                                type: 'object',
                                properties: {
                                    firstName: { type: 'string' },
                                    lastName: { type: 'string' }
                                },
                                required: ['firstName']
                            },
                            settings: {
                                type: 'object',
                                properties: {
                                    theme: { type: 'string' },
                                    notifications: { type: 'boolean' }
                                }
                            }
                        },
                        required: ['profile']
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('nestedFunction', 'Function with nested objects', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const userProperty = result.parameters.properties['user'];
            (0, vitest_1.expect)(userProperty.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(userProperty.description).toBe('User information');
            (0, vitest_1.expect)(userProperty.required).toEqual(['profile']);
            (0, vitest_1.expect)(userProperty.properties).toBeDefined();
            const profileProperty = userProperty.properties['profile'];
            (0, vitest_1.expect)(profileProperty.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(profileProperty.required).toEqual(['firstName']);
            (0, vitest_1.expect)(profileProperty.properties).toBeDefined();
            (0, vitest_1.expect)(profileProperty.properties['firstName']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(profileProperty.properties['lastName']).toEqual({
                type: genai_1.Type.STRING
            });
            const settingsProperty = userProperty.properties['settings'];
            (0, vitest_1.expect)(settingsProperty.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(settingsProperty.properties).toBeDefined();
            (0, vitest_1.expect)(settingsProperty.properties['theme']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(settingsProperty.properties['notifications']).toEqual({
                type: genai_1.Type.BOOLEAN
            });
        });
        (0, vitest_1.it)('should handle array properties with primitive items', () => {
            const schema = {
                type: 'object',
                properties: {
                    tags: {
                        type: 'array',
                        description: 'List of tags',
                        items: {
                            type: 'string',
                            description: 'Individual tag'
                        }
                    },
                    scores: {
                        type: 'array',
                        items: {
                            type: 'number'
                        }
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('arrayPropsFunction', 'Function with arrays', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const tagsProperty = result.parameters.properties['tags'];
            (0, vitest_1.expect)(tagsProperty.type).toBe(genai_1.Type.ARRAY);
            (0, vitest_1.expect)(tagsProperty.description).toBe('List of tags');
            (0, vitest_1.expect)(tagsProperty.items).toEqual({
                type: genai_1.Type.STRING,
                description: 'Individual tag'
            });
            const scoresProperty = result.parameters.properties['scores'];
            (0, vitest_1.expect)(scoresProperty.type).toBe(genai_1.Type.ARRAY);
            (0, vitest_1.expect)(scoresProperty.items).toEqual({
                type: genai_1.Type.NUMBER
            });
        });
        (0, vitest_1.it)('should handle array properties with object items', () => {
            const schema = {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        description: 'List of items',
                        items: {
                            type: 'object',
                            description: 'Individual item',
                            properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                metadata: {
                                    type: 'object',
                                    properties: {
                                        created: { type: 'string' },
                                        version: { type: 'number' }
                                    }
                                }
                            },
                            required: ['id', 'name']
                        }
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('complexArrayFunction', 'Function with complex arrays', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const itemsProperty = result.parameters.properties['items'];
            (0, vitest_1.expect)(itemsProperty.type).toBe(genai_1.Type.ARRAY);
            (0, vitest_1.expect)(itemsProperty.description).toBe('List of items');
            (0, vitest_1.expect)(itemsProperty.items).toBeDefined();
            (0, vitest_1.expect)(itemsProperty.items.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(itemsProperty.items.description).toBe('Individual item');
            (0, vitest_1.expect)(itemsProperty.items.required).toEqual(['id', 'name']);
            (0, vitest_1.expect)(itemsProperty.items.properties).toBeDefined();
            (0, vitest_1.expect)(itemsProperty.items.properties['id']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(itemsProperty.items.properties['name']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(itemsProperty.items.properties['metadata'].type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(itemsProperty.items.properties['metadata'].properties).toBeDefined();
            (0, vitest_1.expect)(itemsProperty.items.properties['metadata'].properties['created']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(itemsProperty.items.properties['metadata'].properties['version']).toEqual({
                type: genai_1.Type.NUMBER
            });
        });
        (0, vitest_1.it)('should handle enum properties', () => {
            const schema = {
                type: 'object',
                properties: {
                    status: {
                        type: 'string',
                        description: 'Status value',
                        enum: ['active', 'inactive', 'pending']
                    },
                    priority: {
                        type: 'string',
                        enum: ['1', '2', '3', '4', '5']
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('enumFunction', 'Function with enums', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const statusProperty = result.parameters.properties['status'];
            (0, vitest_1.expect)(statusProperty.type).toBe(genai_1.Type.STRING);
            (0, vitest_1.expect)(statusProperty.description).toBe('Status value');
            (0, vitest_1.expect)(statusProperty.enum).toEqual(['active', 'inactive', 'pending']);
            const priorityProperty = result.parameters.properties['priority'];
            (0, vitest_1.expect)(priorityProperty.type).toBe(genai_1.Type.STRING);
            (0, vitest_1.expect)(priorityProperty.enum).toEqual(['1', '2', '3', '4', '5']);
        });
        (0, vitest_1.it)('should handle anyOf composition by using first option', () => {
            const schema = {
                type: 'object',
                properties: {
                    value: {
                        anyOf: [
                            { type: 'string', description: 'String value' },
                            { type: 'number', description: 'Number value' }
                        ]
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('anyOfFunction', 'Function with anyOf', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const valueProperty = result.parameters.properties['value'];
            (0, vitest_1.expect)(valueProperty.type).toBe(genai_1.Type.STRING);
            (0, vitest_1.expect)(valueProperty.description).toBe('String value');
        });
        (0, vitest_1.it)('should handle oneOf composition by using first option', () => {
            const schema = {
                type: 'object',
                properties: {
                    data: {
                        oneOf: [
                            { type: 'boolean', description: 'Boolean data' },
                            { type: 'string', description: 'String data' }
                        ]
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('oneOfFunction', 'Function with oneOf', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const dataProperty = result.parameters.properties['data'];
            (0, vitest_1.expect)(dataProperty.type).toBe(genai_1.Type.BOOLEAN);
            (0, vitest_1.expect)(dataProperty.description).toBe('Boolean data');
        });
        (0, vitest_1.it)('should handle allOf composition by using first option', () => {
            const schema = {
                type: 'object',
                properties: {
                    config: {
                        allOf: [
                            { type: 'object', description: 'Config object' },
                            { type: 'string', description: 'Config string' }
                        ]
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('allOfFunction', 'Function with allOf', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const configProperty = result.parameters.properties['config'];
            (0, vitest_1.expect)(configProperty.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(configProperty.description).toBe('Config object');
        });
        (0, vitest_1.it)('should handle schema with no properties', () => {
            const schema = {
                type: 'object'
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('emptyFunction', 'Function with no properties', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(result.parameters.properties).toEqual({});
            (0, vitest_1.expect)(result.parameters.required).toEqual([]);
        });
        (0, vitest_1.it)('should handle schema with no required fields', () => {
            const schema = {
                type: 'object',
                properties: {
                    optional1: { type: 'string' },
                    optional2: { type: 'number' }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('optionalFunction', 'Function with optional params', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.required).toEqual([]);
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties['optional1']).toEqual({
                type: genai_1.Type.STRING
            });
            (0, vitest_1.expect)(result.parameters.properties['optional2']).toEqual({
                type: genai_1.Type.NUMBER
            });
        });
        (0, vitest_1.it)('should default to object type when type is missing', () => {
            const schema = {
                properties: {
                    field: {
                        description: 'Field without type'
                    }
                }
            };
            const result = (0, geminiFunctionDeclarationConverter_1.toGeminiFunction)('defaultTypeFunction', 'Function with missing types', schema);
            (0, vitest_1.expect)(result.parameters).toBeDefined();
            (0, vitest_1.expect)(result.parameters.properties).toBeDefined();
            const fieldProperty = result.parameters.properties['field'];
            (0, vitest_1.expect)(fieldProperty.type).toBe(genai_1.Type.OBJECT);
            (0, vitest_1.expect)(fieldProperty.description).toBe('Field without type');
        });
    });
});
//# sourceMappingURL=geminiFunctionDeclarationConverter.spec.js.map