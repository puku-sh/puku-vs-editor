/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import * as nls from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { languagesExtPoint } from '../../../services/language/common/languageService.js';
const Fields = Object.freeze({
    viewType: 'viewType',
    displayName: 'displayName',
    selector: 'selector',
    priority: 'priority',
});
const customEditorsContributionSchema = {
    type: 'object',
    required: [
        Fields.viewType,
        Fields.displayName,
        Fields.selector,
    ],
    additionalProperties: false,
    properties: {
        [Fields.viewType]: {
            type: 'string',
            markdownDescription: nls.localize(6985, null),
        },
        [Fields.displayName]: {
            type: 'string',
            description: nls.localize(6986, null),
        },
        [Fields.selector]: {
            type: 'array',
            description: nls.localize(6987, null),
            items: {
                type: 'object',
                defaultSnippets: [{
                        body: {
                            filenamePattern: '$1',
                        }
                    }],
                additionalProperties: false,
                properties: {
                    filenamePattern: {
                        type: 'string',
                        description: nls.localize(6988, null),
                    },
                }
            }
        },
        [Fields.priority]: {
            type: 'string',
            markdownDeprecationMessage: nls.localize(6989, null),
            enum: [
                "default" /* CustomEditorPriority.default */,
                "option" /* CustomEditorPriority.option */,
            ],
            markdownEnumDescriptions: [
                nls.localize(6990, null),
                nls.localize(6991, null),
            ],
            default: "default" /* CustomEditorPriority.default */
        }
    }
};
export const customEditorsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'customEditors',
    deps: [languagesExtPoint],
    jsonSchema: {
        description: nls.localize(6992, null),
        type: 'array',
        defaultSnippets: [{
                body: [{
                        [Fields.viewType]: '$1',
                        [Fields.displayName]: '$2',
                        [Fields.selector]: [{
                                filenamePattern: '$3'
                            }],
                    }]
            }],
        items: customEditorsContributionSchema
    },
    activationEventsGenerator: function* (contribs) {
        for (const contrib of contribs) {
            const viewType = contrib[Fields.viewType];
            if (viewType) {
                yield `onCustomEditor:${viewType}`;
            }
        }
    },
});
class CustomEditorsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.customEditors;
    }
    render(manifest) {
        const customEditors = manifest.contributes?.customEditors || [];
        if (!customEditors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(6993, null),
            nls.localize(6994, null),
            nls.localize(6995, null),
        ];
        const rows = customEditors
            .map(customEditor => {
            return [
                customEditor.viewType,
                customEditor.priority ?? '',
                coalesce(customEditor.selector.map(x => x.filenamePattern)).join(', ')
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
    id: 'customEditors',
    label: nls.localize(6996, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(CustomEditorsDataRenderer),
});
//# sourceMappingURL=extensionPoint.js.map