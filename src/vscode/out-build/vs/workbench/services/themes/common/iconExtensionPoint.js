/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as IconRegistryExtensions } from '../../../../platform/theme/common/iconRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import * as resources from '../../../../base/common/resources.js';
import { extname, posix } from '../../../../base/common/path.js';
const iconRegistry = Registry.as(IconRegistryExtensions.IconContribution);
const iconReferenceSchema = iconRegistry.getIconReferenceSchema();
const iconIdPattern = `^${ThemeIcon.iconNameSegment}(-${ThemeIcon.iconNameSegment})+$`;
const iconConfigurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'icons',
    jsonSchema: {
        description: nls.localize(15848, null),
        type: 'object',
        propertyNames: {
            pattern: iconIdPattern,
            description: nls.localize(15849, null),
            patternErrorMessage: nls.localize(15850, null),
        },
        additionalProperties: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: nls.localize(15851, null),
                },
                default: {
                    anyOf: [
                        iconReferenceSchema,
                        {
                            type: 'object',
                            properties: {
                                fontPath: {
                                    description: nls.localize(15852, null),
                                    type: 'string'
                                },
                                fontCharacter: {
                                    description: nls.localize(15853, null),
                                    type: 'string'
                                }
                            },
                            required: ['fontPath', 'fontCharacter'],
                            defaultSnippets: [{ body: { fontPath: '${1:myiconfont.woff}', fontCharacter: '${2:\\\\E001}' } }]
                        }
                    ],
                    description: nls.localize(15854, null),
                }
            },
            required: ['description', 'default'],
            defaultSnippets: [{ body: { description: '${1:my icon}', default: { fontPath: '${2:myiconfont.woff}', fontCharacter: '${3:\\\\E001}' } } }]
        },
        defaultSnippets: [{ body: { '${1:my-icon-id}': { description: '${2:my icon}', default: { fontPath: '${3:myiconfont.woff}', fontCharacter: '${4:\\\\E001}' } } } }]
    }
});
export class IconExtensionPoint {
    constructor() {
        iconConfigurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || typeof extensionValue !== 'object') {
                    collector.error(nls.localize(15855, null));
                    return;
                }
                for (const id in extensionValue) {
                    if (!id.match(iconIdPattern)) {
                        collector.error(nls.localize(15856, null));
                        return;
                    }
                    const iconContribution = extensionValue[id];
                    if (typeof iconContribution.description !== 'string' || iconContribution.description.length === 0) {
                        collector.error(nls.localize(15857, null));
                        return;
                    }
                    const defaultIcon = iconContribution.default;
                    if (typeof defaultIcon === 'string') {
                        iconRegistry.registerIcon(id, { id: defaultIcon }, iconContribution.description);
                    }
                    else if (typeof defaultIcon === 'object' && typeof defaultIcon.fontPath === 'string' && typeof defaultIcon.fontCharacter === 'string') {
                        const fileExt = extname(defaultIcon.fontPath).substring(1);
                        const format = formatMap[fileExt];
                        if (!format) {
                            collector.warn(nls.localize(15858, null, fileExt));
                            return;
                        }
                        const extensionLocation = extension.description.extensionLocation;
                        const iconFontLocation = resources.joinPath(extensionLocation, defaultIcon.fontPath);
                        const fontId = getFontId(extension.description, defaultIcon.fontPath);
                        const definition = iconRegistry.registerIconFont(fontId, { src: [{ location: iconFontLocation, format }] });
                        if (!resources.isEqualOrParent(iconFontLocation, extensionLocation)) {
                            collector.warn(nls.localize(15859, null, iconFontLocation.path, extensionLocation.path));
                            return;
                        }
                        iconRegistry.registerIcon(id, {
                            fontCharacter: defaultIcon.fontCharacter,
                            font: {
                                id: fontId,
                                definition
                            }
                        }, iconContribution.description);
                    }
                    else {
                        collector.error(nls.localize(15860, null));
                    }
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const id in extensionValue) {
                    iconRegistry.deregisterIcon(id);
                }
            }
        });
    }
}
const formatMap = {
    'ttf': 'truetype',
    'woff': 'woff',
    'woff2': 'woff2'
};
function getFontId(description, fontPath) {
    return posix.join(description.identifier.value, fontPath);
}
//# sourceMappingURL=iconExtensionPoint.js.map