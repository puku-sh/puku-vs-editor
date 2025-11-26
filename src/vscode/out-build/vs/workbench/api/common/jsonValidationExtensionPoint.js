/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../nls.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import * as resources from '../../../base/common/resources.js';
import { isString } from '../../../base/common/types.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Extensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'jsonValidation',
    defaultExtensionKind: ['workspace', 'web'],
    jsonSchema: {
        description: nls.localize(3028, null),
        type: 'array',
        defaultSnippets: [{ body: [{ fileMatch: '${1:file.json}', url: '${2:url}' }] }],
        items: {
            type: 'object',
            defaultSnippets: [{ body: { fileMatch: '${1:file.json}', url: '${2:url}' } }],
            properties: {
                fileMatch: {
                    type: ['string', 'array'],
                    description: nls.localize(3029, null),
                    items: {
                        type: ['string']
                    }
                },
                url: {
                    description: nls.localize(3030, null),
                    type: 'string'
                }
            }
        }
    }
});
export class JSONValidationExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions) => {
            for (const extension of extensions) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                const extensionLocation = extension.description.extensionLocation;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize(3031, null));
                    return;
                }
                extensionValue.forEach(extension => {
                    if (!isString(extension.fileMatch) && !(Array.isArray(extension.fileMatch) && extension.fileMatch.every(isString))) {
                        collector.error(nls.localize(3032, null));
                        return;
                    }
                    const uri = extension.url;
                    if (!isString(uri)) {
                        collector.error(nls.localize(3033, null));
                        return;
                    }
                    if (uri.startsWith('./')) {
                        try {
                            const colorThemeLocation = resources.joinPath(extensionLocation, uri);
                            if (!resources.isEqualOrParent(colorThemeLocation, extensionLocation)) {
                                collector.warn(nls.localize(3034, null, configurationExtPoint.name, colorThemeLocation.toString(), extensionLocation.path));
                            }
                        }
                        catch (e) {
                            collector.error(nls.localize(3035, null, e.message));
                        }
                    }
                    else if (!/^[^:/?#]+:\/\//.test(uri)) {
                        collector.error(nls.localize(3036, null));
                        return;
                    }
                });
            }
        });
    }
}
class JSONValidationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.jsonValidation;
    }
    render(manifest) {
        const contrib = manifest.contributes?.jsonValidation || [];
        if (!contrib.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(3037, null),
            nls.localize(3038, null),
        ];
        const rows = contrib.map(v => {
            return [
                new MarkdownString().appendMarkdown(`\`${Array.isArray(v.fileMatch) ? v.fileMatch.join(', ') : v.fileMatch}\``),
                v.url,
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
    id: 'jsonValidation',
    label: nls.localize(3039, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(JSONValidationDataRenderer),
});
//# sourceMappingURL=jsonValidationExtensionPoint.js.map