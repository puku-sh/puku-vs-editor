/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
const idDescription = nls.localize(15163, null);
const typeDescription = nls.localize(15164, null);
const descriptionDescription = nls.localize(15165, null);
const defaultDescription = nls.localize(15166, null);
export const inputsSchema = {
    definitions: {
        inputs: {
            type: 'array',
            description: nls.localize(15167, null),
            items: {
                oneOf: [
                    {
                        type: 'object',
                        required: ['id', 'type', 'description'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['promptString'],
                                enumDescriptions: [
                                    nls.localize(15168, null),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            password: {
                                type: 'boolean',
                                description: nls.localize(15169, null),
                            },
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'description', 'options'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['pickString'],
                                enumDescriptions: [
                                    nls.localize(15170, null),
                                ]
                            },
                            description: {
                                type: 'string',
                                description: descriptionDescription
                            },
                            default: {
                                type: 'string',
                                description: defaultDescription
                            },
                            options: {
                                type: 'array',
                                description: nls.localize(15171, null),
                                items: {
                                    oneOf: [
                                        {
                                            type: 'string'
                                        },
                                        {
                                            type: 'object',
                                            required: ['value'],
                                            additionalProperties: false,
                                            properties: {
                                                label: {
                                                    type: 'string',
                                                    description: nls.localize(15172, null)
                                                },
                                                value: {
                                                    type: 'string',
                                                    description: nls.localize(15173, null)
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        type: 'object',
                        required: ['id', 'type', 'command'],
                        additionalProperties: false,
                        properties: {
                            id: {
                                type: 'string',
                                description: idDescription
                            },
                            type: {
                                type: 'string',
                                description: typeDescription,
                                enum: ['command'],
                                enumDescriptions: [
                                    nls.localize(15174, null),
                                ]
                            },
                            command: {
                                type: 'string',
                                description: nls.localize(15175, null)
                            },
                            args: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        description: nls.localize(15176, null)
                                    },
                                    {
                                        type: 'array',
                                        description: nls.localize(15177, null)
                                    },
                                    {
                                        type: 'string',
                                        description: nls.localize(15178, null)
                                    }
                                ]
                            }
                        }
                    }
                ]
            }
        }
    }
};
//# sourceMappingURL=configurationResolverSchema.js.map