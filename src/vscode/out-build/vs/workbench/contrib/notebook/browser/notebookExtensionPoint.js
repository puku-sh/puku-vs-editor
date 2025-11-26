/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { NotebookEditorPriority } from '../common/notebookCommon.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
const NotebookEditorContribution = Object.freeze({
    type: 'type',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const NotebookRendererContribution = Object.freeze({
    id: 'id',
    displayName: 'displayName',
    mimeTypes: 'mimeTypes',
    entrypoint: 'entrypoint',
    hardDependencies: 'dependencies',
    optionalDependencies: 'optionalDependencies',
    requiresMessaging: 'requiresMessaging',
});
const NotebookPreloadContribution = Object.freeze({
    type: 'type',
    entrypoint: 'entrypoint',
    localResourceRoots: 'localResourceRoots',
});
const notebookProviderContribution = {
    description: nls.localize(10505, null),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', displayName: '', 'selector': [{ 'filenamePattern': '' }] }] }],
    items: {
        type: 'object',
        required: [
            NotebookEditorContribution.type,
            NotebookEditorContribution.displayName,
            NotebookEditorContribution.selector,
        ],
        properties: {
            [NotebookEditorContribution.type]: {
                type: 'string',
                description: nls.localize(10506, null),
            },
            [NotebookEditorContribution.displayName]: {
                type: 'string',
                description: nls.localize(10507, null),
            },
            [NotebookEditorContribution.selector]: {
                type: 'array',
                description: nls.localize(10508, null),
                items: {
                    type: 'object',
                    properties: {
                        filenamePattern: {
                            type: 'string',
                            description: nls.localize(10509, null),
                        },
                        excludeFileNamePattern: {
                            type: 'string',
                            description: nls.localize(10510, null)
                        }
                    }
                }
            },
            [NotebookEditorContribution.priority]: {
                type: 'string',
                markdownDeprecationMessage: nls.localize(10511, null),
                enum: [
                    NotebookEditorPriority.default,
                    NotebookEditorPriority.option,
                ],
                markdownEnumDescriptions: [
                    nls.localize(10512, null),
                    nls.localize(10513, null),
                ],
                default: 'default'
            }
        }
    }
};
const defaultRendererSnippet = Object.freeze({ id: '', displayName: '', mimeTypes: [''], entrypoint: '' });
const notebookRendererContribution = {
    description: nls.localize(10514, null),
    type: 'array',
    defaultSnippets: [{ body: [defaultRendererSnippet] }],
    items: {
        defaultSnippets: [{ body: defaultRendererSnippet }],
        allOf: [
            {
                type: 'object',
                required: [
                    NotebookRendererContribution.id,
                    NotebookRendererContribution.displayName,
                ],
                properties: {
                    [NotebookRendererContribution.id]: {
                        type: 'string',
                        description: nls.localize(10515, null),
                    },
                    [NotebookRendererContribution.displayName]: {
                        type: 'string',
                        description: nls.localize(10516, null),
                    },
                    [NotebookRendererContribution.hardDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize(10517, null),
                    },
                    [NotebookRendererContribution.optionalDependencies]: {
                        type: 'array',
                        uniqueItems: true,
                        items: { type: 'string' },
                        markdownDescription: nls.localize(10518, null),
                    },
                    [NotebookRendererContribution.requiresMessaging]: {
                        default: 'never',
                        enum: [
                            'always',
                            'optional',
                            'never',
                        ],
                        enumDescriptions: [
                            nls.localize(10519, null),
                            nls.localize(10520, null),
                            nls.localize(10521, null),
                        ],
                        description: nls.localize(10522, null),
                    },
                }
            },
            {
                oneOf: [
                    {
                        required: [
                            NotebookRendererContribution.entrypoint,
                            NotebookRendererContribution.mimeTypes,
                        ],
                        properties: {
                            [NotebookRendererContribution.mimeTypes]: {
                                type: 'array',
                                description: nls.localize(10523, null),
                                items: {
                                    type: 'string'
                                }
                            },
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize(10524, null),
                                type: 'string',
                            },
                        }
                    },
                    {
                        required: [
                            NotebookRendererContribution.entrypoint,
                        ],
                        properties: {
                            [NotebookRendererContribution.entrypoint]: {
                                description: nls.localize(10525, null),
                                type: 'object',
                                required: ['extends', 'path'],
                                properties: {
                                    extends: {
                                        type: 'string',
                                        description: nls.localize(10526, null),
                                    },
                                    path: {
                                        type: 'string',
                                        description: nls.localize(10527, null),
                                    },
                                }
                            },
                        }
                    }
                ]
            }
        ]
    }
};
const notebookPreloadContribution = {
    description: nls.localize(10528, null),
    type: 'array',
    defaultSnippets: [{ body: [{ type: '', entrypoint: '' }] }],
    items: {
        type: 'object',
        required: [
            NotebookPreloadContribution.type,
            NotebookPreloadContribution.entrypoint
        ],
        properties: {
            [NotebookPreloadContribution.type]: {
                type: 'string',
                description: nls.localize(10529, null),
            },
            [NotebookPreloadContribution.entrypoint]: {
                type: 'string',
                description: nls.localize(10530, null),
            },
            [NotebookPreloadContribution.localResourceRoots]: {
                type: 'array',
                items: { type: 'string' },
                description: nls.localize(10531, null),
            },
        }
    }
};
export const notebooksExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebooks',
    jsonSchema: notebookProviderContribution,
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            if (contrib.type) {
                yield `onNotebookSerializer:${contrib.type}`;
            }
        }
    }
});
export const notebookRendererExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookRenderer',
    jsonSchema: notebookRendererContribution,
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            if (contrib.id) {
                yield `onRenderer:${contrib.id}`;
            }
        }
    }
});
export const notebookPreloadExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'notebookPreload',
    jsonSchema: notebookPreloadContribution,
});
class NotebooksDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebooks;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebooks || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(10532, null),
            nls.localize(10533, null),
        ];
        const rows = contrib
            .sort((a, b) => a.type.localeCompare(b.type))
            .map(notebook => {
            return [
                notebook.type,
                notebook.displayName
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
class NotebookRenderersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.notebookRenderer;
    }
    render(manifest) {
        const contrib = manifest.contributes?.notebookRenderer || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(10534, null),
            nls.localize(10535, null),
        ];
        const rows = contrib
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map(notebookRenderer => {
            return [
                notebookRenderer.displayName,
                notebookRenderer.mimeTypes.join(',')
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
    id: 'notebooks',
    label: nls.localize(10536, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(NotebooksDataRenderer),
});
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'notebookRenderer',
    label: nls.localize(10537, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(NotebookRenderersDataRenderer),
});
//# sourceMappingURL=notebookExtensionPoint.js.map