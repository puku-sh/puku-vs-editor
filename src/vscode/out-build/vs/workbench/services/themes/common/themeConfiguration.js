/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as types from '../../../../base/common/types.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { textmateColorsSchemaId, textmateColorGroupSchemaId } from './colorThemeSchema.js';
import { workbenchColorsSchemaId } from '../../../../platform/theme/common/colorRegistry.js';
import { tokenStylingSchemaId } from '../../../../platform/theme/common/tokenClassificationRegistry.js';
import { ThemeSettings, ThemeSettingDefaults } from './workbenchThemeService.js';
import { isWeb } from '../../../../base/common/platform.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
// Configuration: Themes
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const colorThemeSettingEnum = [];
const colorThemeSettingEnumItemLabels = [];
const colorThemeSettingEnumDescriptions = [];
export function formatSettingAsLink(str) {
    return `\`#${str}#\``;
}
export const COLOR_THEME_CONFIGURATION_SETTINGS_TAG = 'colorThemeConfiguration';
const colorThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize(15868, null, formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: isWeb ? ThemeSettingDefaults.COLOR_THEME_LIGHT : ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize(15869, null),
};
const preferredDarkThemeSettingSchema = {
    type: 'string', //
    markdownDescription: nls.localize(15870, null, formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize(15871, null),
};
const preferredLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize(15872, null, formatSettingAsLink(ThemeSettings.DETECT_COLOR_SCHEME)),
    default: ThemeSettingDefaults.COLOR_THEME_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize(15873, null),
};
const preferredHCDarkThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize(15874, null, formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_DARK,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize(15875, null),
};
const preferredHCLightThemeSettingSchema = {
    type: 'string',
    markdownDescription: nls.localize(15876, null, formatSettingAsLink(ThemeSettings.DETECT_HC)),
    default: ThemeSettingDefaults.COLOR_THEME_HC_LIGHT,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
    enum: colorThemeSettingEnum,
    enumDescriptions: colorThemeSettingEnumDescriptions,
    enumItemLabels: colorThemeSettingEnumItemLabels,
    errorMessage: nls.localize(15877, null),
};
const detectColorSchemeSettingSchema = {
    type: 'boolean',
    markdownDescription: nls.localize(15878, null, formatSettingAsLink(ThemeSettings.PREFERRED_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_LIGHT_THEME)),
    default: false,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const colorCustomizationsSchema = {
    type: 'object',
    description: nls.localize(15879, null),
    allOf: [{ $ref: workbenchColorsSchemaId }],
    default: {},
    defaultSnippets: [{
            body: {}
        }]
};
const fileIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.FILE_ICON_THEME,
    description: nls.localize(15880, null),
    enum: [null],
    enumItemLabels: [nls.localize(15881, null)],
    enumDescriptions: [nls.localize(15882, null)],
    errorMessage: nls.localize(15883, null)
};
const productIconThemeSettingSchema = {
    type: ['string', 'null'],
    default: ThemeSettingDefaults.PRODUCT_ICON_THEME,
    description: nls.localize(15884, null),
    enum: [ThemeSettingDefaults.PRODUCT_ICON_THEME],
    enumItemLabels: [nls.localize(15885, null)],
    enumDescriptions: [nls.localize(15886, null)],
    errorMessage: nls.localize(15887, null)
};
const detectHCSchemeSettingSchema = {
    type: 'boolean',
    default: true,
    markdownDescription: nls.localize(15888, null, formatSettingAsLink(ThemeSettings.PREFERRED_HC_DARK_THEME), formatSettingAsLink(ThemeSettings.PREFERRED_HC_LIGHT_THEME)),
    scope: 1 /* ConfigurationScope.APPLICATION */,
    tags: [COLOR_THEME_CONFIGURATION_SETTINGS_TAG],
};
const themeSettingsConfiguration = {
    id: 'workbench',
    order: 7.1,
    type: 'object',
    properties: {
        [ThemeSettings.COLOR_THEME]: colorThemeSettingSchema,
        [ThemeSettings.PREFERRED_DARK_THEME]: preferredDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_LIGHT_THEME]: preferredLightThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_DARK_THEME]: preferredHCDarkThemeSettingSchema,
        [ThemeSettings.PREFERRED_HC_LIGHT_THEME]: preferredHCLightThemeSettingSchema,
        [ThemeSettings.FILE_ICON_THEME]: fileIconThemeSettingSchema,
        [ThemeSettings.COLOR_CUSTOMIZATIONS]: colorCustomizationsSchema,
        [ThemeSettings.PRODUCT_ICON_THEME]: productIconThemeSettingSchema
    }
};
configurationRegistry.registerConfiguration(themeSettingsConfiguration);
const themeSettingsWindowConfiguration = {
    id: 'window',
    order: 8.1,
    type: 'object',
    properties: {
        [ThemeSettings.DETECT_HC]: detectHCSchemeSettingSchema,
        [ThemeSettings.DETECT_COLOR_SCHEME]: detectColorSchemeSettingSchema,
    }
};
configurationRegistry.registerConfiguration(themeSettingsWindowConfiguration);
function tokenGroupSettings(description) {
    return {
        description,
        $ref: textmateColorGroupSchemaId
    };
}
const themeSpecificSettingKey = '^\\[[^\\]]*(\\]\\s*\\[[^\\]]*)*\\]$';
const tokenColorSchema = {
    type: 'object',
    properties: {
        comments: tokenGroupSettings(nls.localize(15889, null)),
        strings: tokenGroupSettings(nls.localize(15890, null)),
        keywords: tokenGroupSettings(nls.localize(15891, null)),
        numbers: tokenGroupSettings(nls.localize(15892, null)),
        types: tokenGroupSettings(nls.localize(15893, null)),
        functions: tokenGroupSettings(nls.localize(15894, null)),
        variables: tokenGroupSettings(nls.localize(15895, null)),
        textMateRules: {
            description: nls.localize(15896, null),
            $ref: textmateColorsSchemaId
        },
        semanticHighlighting: {
            description: nls.localize(15897, null),
            deprecationMessage: nls.localize(15898, null),
            markdownDeprecationMessage: nls.localize(15899, null, formatSettingAsLink('editor.semanticTokenColorCustomizations')),
            type: 'boolean'
        }
    },
    additionalProperties: false
};
const tokenColorCustomizationSchema = {
    description: nls.localize(15900, null),
    default: {},
    allOf: [{ ...tokenColorSchema, patternProperties: { '^\\[': {} } }]
};
const semanticTokenColorSchema = {
    type: 'object',
    properties: {
        enabled: {
            type: 'boolean',
            description: nls.localize(15901, null),
            suggestSortText: '0_enabled'
        },
        rules: {
            $ref: tokenStylingSchemaId,
            description: nls.localize(15902, null),
            suggestSortText: '0_rules'
        }
    },
    additionalProperties: false
};
const semanticTokenColorCustomizationSchema = {
    description: nls.localize(15903, null),
    default: {},
    allOf: [{ ...semanticTokenColorSchema, patternProperties: { '^\\[': {} } }]
};
const tokenColorCustomizationConfiguration = {
    id: 'editor',
    order: 7.2,
    type: 'object',
    properties: {
        [ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS]: tokenColorCustomizationSchema,
        [ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS]: semanticTokenColorCustomizationSchema
    }
};
configurationRegistry.registerConfiguration(tokenColorCustomizationConfiguration);
export function updateColorThemeConfigurationSchemas(themes) {
    // updates enum for the 'workbench.colorTheme` setting
    themes.sort((a, b) => a.label.localeCompare(b.label));
    colorThemeSettingEnum.splice(0, colorThemeSettingEnum.length, ...themes.map(t => t.settingsId));
    colorThemeSettingEnumDescriptions.splice(0, colorThemeSettingEnumDescriptions.length, ...themes.map(t => t.description || ''));
    colorThemeSettingEnumItemLabels.splice(0, colorThemeSettingEnumItemLabels.length, ...themes.map(t => t.label || ''));
    const themeSpecificWorkbenchColors = { properties: {} };
    const themeSpecificTokenColors = { properties: {} };
    const themeSpecificSemanticTokenColors = { properties: {} };
    const workbenchColors = { $ref: workbenchColorsSchemaId, additionalProperties: false };
    const tokenColors = { properties: tokenColorSchema.properties, additionalProperties: false };
    for (const t of themes) {
        // add theme specific color customization ("[Abyss]":{ ... })
        const themeId = `[${t.settingsId}]`;
        themeSpecificWorkbenchColors.properties[themeId] = workbenchColors;
        themeSpecificTokenColors.properties[themeId] = tokenColors;
        themeSpecificSemanticTokenColors.properties[themeId] = semanticTokenColorSchema;
    }
    themeSpecificWorkbenchColors.patternProperties = { [themeSpecificSettingKey]: workbenchColors };
    themeSpecificTokenColors.patternProperties = { [themeSpecificSettingKey]: tokenColors };
    themeSpecificSemanticTokenColors.patternProperties = { [themeSpecificSettingKey]: semanticTokenColorSchema };
    colorCustomizationsSchema.allOf[1] = themeSpecificWorkbenchColors;
    tokenColorCustomizationSchema.allOf[1] = themeSpecificTokenColors;
    semanticTokenColorCustomizationSchema.allOf[1] = themeSpecificSemanticTokenColors;
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration, tokenColorCustomizationConfiguration);
}
export function updateFileIconThemeConfigurationSchemas(themes) {
    fileIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map(t => t.settingsId));
    fileIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map(t => t.label));
    fileIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map(t => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
export function updateProductIconThemeConfigurationSchemas(themes) {
    productIconThemeSettingSchema.enum.splice(1, Number.MAX_VALUE, ...themes.map(t => t.settingsId));
    productIconThemeSettingSchema.enumItemLabels.splice(1, Number.MAX_VALUE, ...themes.map(t => t.label));
    productIconThemeSettingSchema.enumDescriptions.splice(1, Number.MAX_VALUE, ...themes.map(t => t.description || ''));
    configurationRegistry.notifyConfigurationSchemaUpdated(themeSettingsConfiguration);
}
const colorSchemeToPreferred = {
    [ColorScheme.DARK]: ThemeSettings.PREFERRED_DARK_THEME,
    [ColorScheme.LIGHT]: ThemeSettings.PREFERRED_LIGHT_THEME,
    [ColorScheme.HIGH_CONTRAST_DARK]: ThemeSettings.PREFERRED_HC_DARK_THEME,
    [ColorScheme.HIGH_CONTRAST_LIGHT]: ThemeSettings.PREFERRED_HC_LIGHT_THEME
};
export class ThemeConfiguration {
    constructor(configurationService, hostColorService) {
        this.configurationService = configurationService;
        this.hostColorService = hostColorService;
    }
    get colorTheme() {
        return this.configurationService.getValue(this.getColorThemeSettingId());
    }
    get fileIconTheme() {
        return this.configurationService.getValue(ThemeSettings.FILE_ICON_THEME);
    }
    get productIconTheme() {
        return this.configurationService.getValue(ThemeSettings.PRODUCT_ICON_THEME);
    }
    get colorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.COLOR_CUSTOMIZATIONS) || {};
    }
    get tokenColorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS) || {};
    }
    get semanticTokenColorCustomizations() {
        return this.configurationService.getValue(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS);
    }
    getPreferredColorScheme() {
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && this.hostColorService.highContrast) {
            return this.hostColorService.dark ? ColorScheme.HIGH_CONTRAST_DARK : ColorScheme.HIGH_CONTRAST_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return this.hostColorService.dark ? ColorScheme.DARK : ColorScheme.LIGHT;
        }
        return undefined;
    }
    isDetectingColorScheme() {
        return this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME);
    }
    getColorThemeSettingId() {
        const preferredScheme = this.getPreferredColorScheme();
        return preferredScheme ? colorSchemeToPreferred[preferredScheme] : ThemeSettings.COLOR_THEME;
    }
    async setColorTheme(theme, settingsTarget) {
        await this.writeConfiguration(this.getColorThemeSettingId(), theme.settingsId, settingsTarget);
        return theme;
    }
    async setFileIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.FILE_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    async setProductIconTheme(theme, settingsTarget) {
        await this.writeConfiguration(ThemeSettings.PRODUCT_ICON_THEME, theme.settingsId, settingsTarget);
        return theme;
    }
    isDefaultColorTheme() {
        const settings = this.configurationService.inspect(this.getColorThemeSettingId());
        return settings && settings.default?.value === settings.value;
    }
    findAutoConfigurationTarget(key) {
        const settings = this.configurationService.inspect(key);
        if (!types.isUndefined(settings.workspaceFolderValue)) {
            return 6 /* ConfigurationTarget.WORKSPACE_FOLDER */;
        }
        else if (!types.isUndefined(settings.workspaceValue)) {
            return 5 /* ConfigurationTarget.WORKSPACE */;
        }
        else if (!types.isUndefined(settings.userRemote)) {
            return 4 /* ConfigurationTarget.USER_REMOTE */;
        }
        return 2 /* ConfigurationTarget.USER */;
    }
    async writeConfiguration(key, value, settingsTarget) {
        if (settingsTarget === undefined || settingsTarget === 'preview') {
            return;
        }
        const settings = this.configurationService.inspect(key);
        if (settingsTarget === 'auto') {
            return this.configurationService.updateValue(key, value);
        }
        if (settingsTarget === 2 /* ConfigurationTarget.USER */) {
            if (value === settings.userValue) {
                return Promise.resolve(undefined); // nothing to do
            }
            else if (value === settings.defaultValue) {
                if (types.isUndefined(settings.userValue)) {
                    return Promise.resolve(undefined); // nothing to do
                }
                value = undefined; // remove configuration from user settings
            }
        }
        else if (settingsTarget === 5 /* ConfigurationTarget.WORKSPACE */ || settingsTarget === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */ || settingsTarget === 4 /* ConfigurationTarget.USER_REMOTE */) {
            if (value === settings.value) {
                return Promise.resolve(undefined); // nothing to do
            }
        }
        return this.configurationService.updateValue(key, value, settingsTarget);
    }
}
//# sourceMappingURL=themeConfiguration.js.map