/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ExtensionsRegistry } from '../../extensions/common/extensionsRegistry.js';
import { Extensions as ColorRegistryExtensions } from '../../../../platform/theme/common/colorRegistry.js';
import { Color } from '../../../../base/common/color.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Extensions } from '../../extensionManagement/common/extensionFeatures.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
const colorRegistry = Registry.as(ColorRegistryExtensions.ColorContribution);
const colorReferenceSchema = colorRegistry.getColorReferenceSchema();
const colorIdPattern = '^\\w+[.\\w+]*$';
const configurationExtPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'colors',
    jsonSchema: {
        description: nls.localize(15767, null),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: nls.localize(15768, null),
                    pattern: colorIdPattern,
                    patternErrorMessage: nls.localize(15769, null),
                },
                description: {
                    type: 'string',
                    description: nls.localize(15770, null),
                },
                defaults: {
                    type: 'object',
                    properties: {
                        light: {
                            description: nls.localize(15771, null),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        dark: {
                            description: nls.localize(15772, null),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        highContrast: {
                            description: nls.localize(15773, null),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        },
                        highContrastLight: {
                            description: nls.localize(15774, null),
                            type: 'string',
                            anyOf: [
                                colorReferenceSchema,
                                { type: 'string', format: 'color-hex' }
                            ]
                        }
                    },
                    required: ['light', 'dark']
                }
            }
        }
    }
});
export class ColorExtensionPoint {
    constructor() {
        configurationExtPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                const extensionValue = extension.value;
                const collector = extension.collector;
                if (!extensionValue || !Array.isArray(extensionValue)) {
                    collector.error(nls.localize(15775, null));
                    return;
                }
                const parseColorValue = (s, name) => {
                    if (s.length > 0) {
                        if (s[0] === '#') {
                            return Color.Format.CSS.parseHex(s);
                        }
                        else {
                            return s;
                        }
                    }
                    collector.error(nls.localize(15776, null, name));
                    return Color.red;
                };
                for (const colorContribution of extensionValue) {
                    if (typeof colorContribution.id !== 'string' || colorContribution.id.length === 0) {
                        collector.error(nls.localize(15777, null));
                        return;
                    }
                    if (!colorContribution.id.match(colorIdPattern)) {
                        collector.error(nls.localize(15778, null));
                        return;
                    }
                    if (typeof colorContribution.description !== 'string' || colorContribution.id.length === 0) {
                        collector.error(nls.localize(15779, null));
                        return;
                    }
                    const defaults = colorContribution.defaults;
                    if (!defaults || typeof defaults !== 'object' || typeof defaults.light !== 'string' || typeof defaults.dark !== 'string') {
                        collector.error(nls.localize(15780, null));
                        return;
                    }
                    if (defaults.highContrast && typeof defaults.highContrast !== 'string') {
                        collector.error(nls.localize(15781, null));
                        return;
                    }
                    if (defaults.highContrastLight && typeof defaults.highContrastLight !== 'string') {
                        collector.error(nls.localize(15782, null));
                        return;
                    }
                    colorRegistry.registerColor(colorContribution.id, {
                        light: parseColorValue(defaults.light, 'configuration.colors.defaults.light'),
                        dark: parseColorValue(defaults.dark, 'configuration.colors.defaults.dark'),
                        hcDark: parseColorValue(defaults.highContrast ?? defaults.dark, 'configuration.colors.defaults.highContrast'),
                        hcLight: parseColorValue(defaults.highContrastLight ?? defaults.light, 'configuration.colors.defaults.highContrastLight'),
                    }, colorContribution.description);
                }
            }
            for (const extension of delta.removed) {
                const extensionValue = extension.value;
                for (const colorContribution of extensionValue) {
                    colorRegistry.deregisterColor(colorContribution.id);
                }
            }
        });
    }
}
class ColorDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.colors;
    }
    render(manifest) {
        const colors = manifest.contributes?.colors || [];
        if (!colors.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            nls.localize(15783, null),
            nls.localize(15784, null),
            nls.localize(15785, null),
            nls.localize(15786, null),
            nls.localize(15787, null),
        ];
        const toColor = (colorReference) => colorReference[0] === '#' ? Color.fromHex(colorReference) : undefined;
        const rows = colors.sort((a, b) => a.id.localeCompare(b.id))
            .map(color => {
            return [
                new MarkdownString().appendMarkdown(`\`${color.id}\``),
                color.description,
                toColor(color.defaults.dark) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.dark}\``),
                toColor(color.defaults.light) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.light}\``),
                toColor(color.defaults.highContrast) ?? new MarkdownString().appendMarkdown(`\`${color.defaults.highContrast}\``),
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
    id: 'colors',
    label: nls.localize(15788, null),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ColorDataRenderer),
});
//# sourceMappingURL=colorExtensionPoint.js.map