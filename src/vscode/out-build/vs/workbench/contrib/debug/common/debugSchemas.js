/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as extensionsRegistry from '../../../services/extensions/common/extensionsRegistry.js';
import * as nls from '../../../../nls.js';
import { launchSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
// debuggers extension point
export const debuggersExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'debuggers',
    defaultExtensionKind: ['workspace'],
    jsonSchema: {
        description: nls.localize(7725, null),
        type: 'array',
        defaultSnippets: [{ body: [{ type: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { type: '', program: '', runtime: '' } }],
            properties: {
                type: {
                    description: nls.localize(7726, null),
                    type: 'string'
                },
                label: {
                    description: nls.localize(7727, null),
                    type: 'string'
                },
                program: {
                    description: nls.localize(7728, null),
                    type: 'string'
                },
                args: {
                    description: nls.localize(7729, null),
                    type: 'array'
                },
                runtime: {
                    description: nls.localize(7730, null),
                    type: 'string'
                },
                runtimeArgs: {
                    description: nls.localize(7731, null),
                    type: 'array'
                },
                variables: {
                    description: nls.localize(7732, null),
                    type: 'object'
                },
                initialConfigurations: {
                    description: nls.localize(7733, null),
                    type: ['array', 'string'],
                },
                languages: {
                    description: nls.localize(7734, null),
                    type: 'array'
                },
                configurationSnippets: {
                    description: nls.localize(7735, null),
                    type: 'array'
                },
                configurationAttributes: {
                    description: nls.localize(7736, null),
                    type: 'object'
                },
                when: {
                    description: nls.localize(7737, null),
                    type: 'string',
                    default: ''
                },
                hiddenWhen: {
                    description: nls.localize(7738, null),
                    type: 'string',
                    default: ''
                },
                deprecated: {
                    description: nls.localize(7739, null),
                    type: 'string',
                    default: ''
                },
                windows: {
                    description: nls.localize(7740, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(7741, null),
                            type: 'string'
                        }
                    }
                },
                osx: {
                    description: nls.localize(7742, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(7743, null),
                            type: 'string'
                        }
                    }
                },
                linux: {
                    description: nls.localize(7744, null),
                    type: 'object',
                    properties: {
                        runtime: {
                            description: nls.localize(7745, null),
                            type: 'string'
                        }
                    }
                },
                strings: {
                    description: nls.localize(7746, null),
                    type: 'object',
                    properties: {
                        unverifiedBreakpoints: {
                            description: nls.localize(7747, null),
                            type: 'string'
                        }
                    }
                }
            }
        }
    }
});
// breakpoints extension point #9037
export const breakpointsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'breakpoints',
    jsonSchema: {
        description: nls.localize(7748, null),
        type: 'array',
        defaultSnippets: [{ body: [{ language: '' }] }],
        items: {
            type: 'object',
            additionalProperties: false,
            defaultSnippets: [{ body: { language: '' } }],
            properties: {
                language: {
                    description: nls.localize(7749, null),
                    type: 'string'
                },
                when: {
                    description: nls.localize(7750, null),
                    type: 'string',
                    default: ''
                }
            }
        }
    }
});
// debug general schema
export const presentationSchema = {
    type: 'object',
    description: nls.localize(7751, null),
    properties: {
        hidden: {
            type: 'boolean',
            default: false,
            description: nls.localize(7752, null)
        },
        group: {
            type: 'string',
            default: '',
            description: nls.localize(7753, null)
        },
        order: {
            type: 'number',
            default: 1,
            description: nls.localize(7754, null)
        }
    },
    default: {
        hidden: false,
        group: '',
        order: 1
    }
};
const defaultCompound = { name: 'Compound', configurations: [] };
export const launchSchema = {
    id: launchSchemaId,
    type: 'object',
    title: nls.localize(7755, null),
    allowTrailingCommas: true,
    allowComments: true,
    required: [],
    default: { version: '0.2.0', configurations: [], compounds: [] },
    properties: {
        version: {
            type: 'string',
            description: nls.localize(7756, null),
            default: '0.2.0'
        },
        configurations: {
            type: 'array',
            description: nls.localize(7757, null),
            items: {
                defaultSnippets: [],
                'type': 'object',
                oneOf: []
            }
        },
        compounds: {
            type: 'array',
            description: nls.localize(7758, null),
            items: {
                type: 'object',
                required: ['name', 'configurations'],
                properties: {
                    name: {
                        type: 'string',
                        description: nls.localize(7759, null)
                    },
                    presentation: presentationSchema,
                    configurations: {
                        type: 'array',
                        default: [],
                        items: {
                            oneOf: [{
                                    enum: [],
                                    description: nls.localize(7760, null)
                                }, {
                                    type: 'object',
                                    required: ['name'],
                                    properties: {
                                        name: {
                                            enum: [],
                                            description: nls.localize(7761, null)
                                        },
                                        folder: {
                                            enum: [],
                                            description: nls.localize(7762, null)
                                        }
                                    }
                                }]
                        },
                        description: nls.localize(7763, null)
                    },
                    stopAll: {
                        type: 'boolean',
                        default: false,
                        description: nls.localize(7764, null)
                    },
                    preLaunchTask: {
                        type: 'string',
                        default: '',
                        description: nls.localize(7765, null)
                    }
                },
                default: defaultCompound
            },
            default: [
                defaultCompound
            ]
        },
        inputs: inputsSchema.definitions.inputs
    }
};
class DebuggersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.debuggers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.debuggers || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(7766, null),
            nls.localize(7767, null),
        ];
        const rows = contrib.map(d => {
            return [
                d.label ?? '',
                d.type
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'debuggers',
    label: nls.localize(7768, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(DebuggersDataRenderer),
});
//# sourceMappingURL=debugSchemas.js.map