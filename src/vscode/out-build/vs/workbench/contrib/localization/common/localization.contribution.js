/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ClearDisplayLanguageAction, ConfigureDisplayLanguageAction } from './localizationsActions.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export class BaseLocalizationWorkbenchContribution extends Disposable {
    constructor() {
        super();
        // Register action to configure locale and related settings
        registerAction2(ConfigureDisplayLanguageAction);
        registerAction2(ClearDisplayLanguageAction);
        ExtensionsRegistry.registerExtensionPoint({
            extensionPoint: 'localizations',
            defaultExtensionKind: ['ui', 'workspace'],
            jsonSchema: {
                description: localize(9345, null),
                type: 'array',
                default: [],
                items: {
                    type: 'object',
                    required: ['languageId', 'translations'],
                    defaultSnippets: [{ body: { languageId: '', languageName: '', localizedLanguageName: '', translations: [{ id: 'vscode', path: '' }] } }],
                    properties: {
                        languageId: {
                            description: localize(9346, null),
                            type: 'string'
                        },
                        languageName: {
                            description: localize(9347, null),
                            type: 'string'
                        },
                        localizedLanguageName: {
                            description: localize(9348, null),
                            type: 'string'
                        },
                        translations: {
                            description: localize(9349, null),
                            type: 'array',
                            default: [{ id: 'vscode', path: '' }],
                            items: {
                                type: 'object',
                                required: ['id', 'path'],
                                properties: {
                                    id: {
                                        type: 'string',
                                        description: localize(9350, null),
                                        pattern: '^((vscode)|([a-z0-9A-Z][a-z0-9A-Z-]*)\\.([a-z0-9A-Z][a-z0-9A-Z-]*))$',
                                        patternErrorMessage: localize(9351, null)
                                    },
                                    path: {
                                        type: 'string',
                                        description: localize(9352, null)
                                    }
                                },
                                defaultSnippets: [{ body: { id: '', path: '' } }],
                            },
                        }
                    }
                }
            }
        });
    }
}
class LocalizationsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.localizations;
    }
    render(manifest) {
        const localizations = manifest.contributes?.localizations || [];
        if (!localizations.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize(9353, null),
            localize(9354, null),
            localize(9355, null),
        ];
        const rows = localizations
            .sort((a, b) => a.languageId.localeCompare(b.languageId))
            .map(localization => {
            return [
                localization.languageId,
                localization.languageName ?? '',
                localization.localizedLanguageName ?? ''
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
    id: 'localizations',
    label: localize(9356, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(LocalizationsDataRenderer),
});
//# sourceMappingURL=localization.contribution.js.map