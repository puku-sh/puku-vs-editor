/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
const titleTranslated = localize(14373, null);
export const walkthroughsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'walkthroughs',
    jsonSchema: {
        description: localize(14374, null),
        type: 'array',
        items: {
            type: 'object',
            required: ['id', 'title', 'description', 'steps'],
            defaultSnippets: [{ body: { 'id': '$1', 'title': '$2', 'description': '$3', 'steps': [] } }],
            properties: {
                id: {
                    type: 'string',
                    description: localize(14375, null),
                },
                title: {
                    type: 'string',
                    description: localize(14376, null)
                },
                icon: {
                    type: 'string',
                    description: localize(14377, null),
                },
                description: {
                    type: 'string',
                    description: localize(14378, null)
                },
                featuredFor: {
                    type: 'array',
                    description: localize(14379, null),
                    items: {
                        type: 'string'
                    },
                },
                when: {
                    type: 'string',
                    description: localize(14380, null)
                },
                steps: {
                    type: 'array',
                    description: localize(14381, null),
                    items: {
                        type: 'object',
                        required: ['id', 'title', 'media'],
                        defaultSnippets: [{
                                body: {
                                    'id': '$1', 'title': '$2', 'description': '$3',
                                    'completionEvents': ['$5'],
                                    'media': {},
                                }
                            }],
                        properties: {
                            id: {
                                type: 'string',
                                description: localize(14382, null),
                            },
                            title: {
                                type: 'string',
                                description: localize(14383, null)
                            },
                            description: {
                                type: 'string',
                                description: localize(14384, null, `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`)
                            },
                            button: {
                                deprecationMessage: localize(14385, null, `[${titleTranslated}](command:myext.command)`, `[${titleTranslated}](command:toSide:myext.command)`, `[${titleTranslated}](https://aka.ms)`),
                            },
                            media: {
                                type: 'object',
                                description: localize(14386, null),
                                oneOf: [
                                    {
                                        required: ['image', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize(14387, null)
                                            },
                                            image: {
                                                description: localize(14388, null),
                                                oneOf: [
                                                    {
                                                        type: 'string',
                                                    },
                                                    {
                                                        type: 'object',
                                                        required: ['dark', 'light', 'hc', 'hcLight'],
                                                        properties: {
                                                            dark: {
                                                                description: localize(14389, null),
                                                                type: 'string',
                                                            },
                                                            light: {
                                                                description: localize(14390, null),
                                                                type: 'string',
                                                            },
                                                            hc: {
                                                                description: localize(14391, null),
                                                                type: 'string',
                                                            },
                                                            hcLight: {
                                                                description: localize(14392, null),
                                                                type: 'string',
                                                            }
                                                        }
                                                    }
                                                ]
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize(14393, null)
                                            }
                                        }
                                    },
                                    {
                                        required: ['svg', 'altText'],
                                        additionalProperties: false,
                                        properties: {
                                            svg: {
                                                description: localize(14394, null),
                                                type: 'string',
                                            },
                                            altText: {
                                                type: 'string',
                                                description: localize(14395, null)
                                            },
                                        }
                                    },
                                    {
                                        required: ['markdown'],
                                        additionalProperties: false,
                                        properties: {
                                            path: {
                                                deprecationMessage: localize(14396, null)
                                            },
                                            markdown: {
                                                description: localize(14397, null),
                                                type: 'string',
                                            }
                                        }
                                    }
                                ]
                            },
                            completionEvents: {
                                description: localize(14398, null),
                                type: 'array',
                                items: {
                                    type: 'string',
                                    defaultSnippets: [
                                        {
                                            label: 'onCommand',
                                            description: localize(14399, null),
                                            body: 'onCommand:${1:commandId}'
                                        },
                                        {
                                            label: 'onLink',
                                            description: localize(14400, null),
                                            body: 'onLink:${2:linkId}'
                                        },
                                        {
                                            label: 'onView',
                                            description: localize(14401, null),
                                            body: 'onView:${2:viewId}'
                                        },
                                        {
                                            label: 'onSettingChanged',
                                            description: localize(14402, null),
                                            body: 'onSettingChanged:${2:settingName}'
                                        },
                                        {
                                            label: 'onContext',
                                            description: localize(14403, null),
                                            body: 'onContext:${2:key}'
                                        },
                                        {
                                            label: 'onExtensionInstalled',
                                            description: localize(14404, null),
                                            body: 'onExtensionInstalled:${3:extensionId}'
                                        },
                                        {
                                            label: 'onStepSelected',
                                            description: localize(14405, null),
                                            body: 'onStepSelected'
                                        },
                                    ]
                                }
                            },
                            doneOn: {
                                description: localize(14406, null),
                                deprecationMessage: localize(14407, null),
                                type: 'object',
                                required: ['command'],
                                defaultSnippets: [{ 'body': { command: '$1' } }],
                                properties: {
                                    'command': {
                                        description: localize(14408, null),
                                        type: 'string'
                                    }
                                },
                            },
                            when: {
                                type: 'string',
                                description: localize(14409, null)
                            }
                        }
                    }
                }
            }
        }
    },
    activationEventsGenerator: function* (walkthroughContributions) {
        for (const walkthroughContribution of walkthroughContributions) {
            if (walkthroughContribution.id) {
                yield `onWalkthrough:${walkthroughContribution.id}`;
            }
        }
    }
});
//# sourceMappingURL=gettingStartedExtensionPoint.js.map