/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Schemas } from './problemMatcher.js';
const schema = {
    definitions: {
        showOutputType: {
            type: 'string',
            enum: ['always', 'silent', 'never']
        },
        options: {
            type: 'object',
            description: nls.localize(12401, null),
            properties: {
                cwd: {
                    type: 'string',
                    description: nls.localize(12402, null)
                },
                env: {
                    type: 'object',
                    additionalProperties: {
                        type: 'string'
                    },
                    description: nls.localize(12403, null)
                }
            },
            additionalProperties: {
                type: ['string', 'array', 'object']
            }
        },
        problemMatcherType: {
            oneOf: [
                {
                    type: 'string',
                    errorMessage: nls.localize(12404, null)
                },
                Schemas.LegacyProblemMatcher,
                {
                    type: 'array',
                    items: {
                        anyOf: [
                            {
                                type: 'string',
                                errorMessage: nls.localize(12405, null)
                            },
                            Schemas.LegacyProblemMatcher
                        ]
                    }
                }
            ]
        },
        shellConfiguration: {
            type: 'object',
            additionalProperties: false,
            description: nls.localize(12406, null),
            properties: {
                executable: {
                    type: 'string',
                    description: nls.localize(12407, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(12408, null),
                    items: {
                        type: 'string'
                    }
                }
            }
        },
        commandConfiguration: {
            type: 'object',
            additionalProperties: false,
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize(12409, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(12410, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                }
            }
        },
        taskDescription: {
            type: 'object',
            required: ['taskName'],
            additionalProperties: false,
            properties: {
                taskName: {
                    type: 'string',
                    description: nls.localize(12411, null)
                },
                command: {
                    type: 'string',
                    description: nls.localize(12412, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(12413, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                windows: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(12414, null),
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(12415, null)
                                }
                            }
                        }
                    ]
                },
                osx: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(12416, null)
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(12417, null)
                                }
                            }
                        }
                    ]
                },
                linux: {
                    anyOf: [
                        {
                            $ref: '#/definitions/commandConfiguration',
                            description: nls.localize(12418, null)
                        },
                        {
                            properties: {
                                problemMatcher: {
                                    $ref: '#/definitions/problemMatcherType',
                                    description: nls.localize(12419, null)
                                }
                            }
                        }
                    ]
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize(12420, null),
                    default: true
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize(12421, null)
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize(12422, null),
                    default: true
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize(12423, null),
                    description: nls.localize(12424, null),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize(12425, null),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize(12426, null),
                    default: false
                },
                isBuildCommand: {
                    type: 'boolean',
                    description: nls.localize(12427, null),
                    default: true
                },
                isTestCommand: {
                    type: 'boolean',
                    description: nls.localize(12428, null),
                    default: true
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize(12429, null)
                }
            }
        },
        taskRunnerConfiguration: {
            type: 'object',
            required: [],
            properties: {
                command: {
                    type: 'string',
                    description: nls.localize(12430, null)
                },
                args: {
                    type: 'array',
                    description: nls.localize(12431, null),
                    items: {
                        type: 'string'
                    }
                },
                options: {
                    $ref: '#/definitions/options'
                },
                showOutput: {
                    $ref: '#/definitions/showOutputType',
                    description: nls.localize(12432, null)
                },
                isWatching: {
                    type: 'boolean',
                    deprecationMessage: nls.localize(12433, null),
                    description: nls.localize(12434, null),
                    default: true
                },
                isBackground: {
                    type: 'boolean',
                    description: nls.localize(12435, null),
                    default: true
                },
                promptOnClose: {
                    type: 'boolean',
                    description: nls.localize(12436, null),
                    default: false
                },
                echoCommand: {
                    type: 'boolean',
                    description: nls.localize(12437, null),
                    default: true
                },
                suppressTaskName: {
                    type: 'boolean',
                    description: nls.localize(12438, null),
                    default: true
                },
                taskSelector: {
                    type: 'string',
                    description: nls.localize(12439, null)
                },
                problemMatcher: {
                    $ref: '#/definitions/problemMatcherType',
                    description: nls.localize(12440, null)
                },
                tasks: {
                    type: 'array',
                    description: nls.localize(12441, null),
                    items: {
                        type: 'object',
                        $ref: '#/definitions/taskDescription'
                    }
                }
            }
        }
    }
};
export default schema;
//# sourceMappingURL=jsonSchemaCommon.js.map