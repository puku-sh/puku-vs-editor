/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AbstractSettingRenderer_1, CopySettingIdAction_1, CopySettingAsJSONAction_1, CopySettingAsURLAction_1, SyncSettingAction_1, ApplySettingToAllProfilesAction_1;
import { BrowserFeatures } from '../../../../base/browser/canIUse.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { SimpleIconLabel } from '../../../../base/browser/ui/iconLabel/simpleIconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { DefaultStyleController } from '../../../../base/browser/ui/list/listWidget.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { Toggle, unthemedToggleStyles } from '../../../../base/browser/ui/toggle/toggle.js';
import { ToolBar } from '../../../../base/browser/ui/toolbar/toolbar.js';
import { RenderIndentGuides } from '../../../../base/browser/ui/tree/abstractTree.js';
import { ObjectTreeModel } from '../../../../base/browser/ui/tree/objectTreeModel.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { distinct } from '../../../../base/common/arrays.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, isDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { isIOS } from '../../../../base/common/platform.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { isDefined, isUndefinedOrNull } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize } from '../../../../nls.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService, getLanguageTagSettingPlainKey } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IListService, WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { defaultButtonStyles, getInputBoxStyle, getListStyles, getSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { editorBackground, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { getIgnoredSettings } from '../../../../platform/userDataSync/common/settingsMerge.js';
import { IUserDataSyncEnablementService, getDefaultIgnoredSettings } from '../../../../platform/userDataSync/common/userDataSync.js';
import { hasNativeContextMenu } from '../../../../platform/window/common/window.js';
import { APPLICATION_SCOPES, APPLY_ALL_PROFILES_SETTING, IWorkbenchConfigurationService } from '../../../services/configuration/common/configuration.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { SETTINGS_AUTHORITY, SettingValueType } from '../../../services/preferences/common/preferences.js';
import { getInvalidTypeError } from '../../../services/preferences/common/preferencesValidation.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { LANGUAGE_SETTING_TAG, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU, compareTwoNullableNumbers } from '../common/preferences.js';
import { settingsNumberInputBackground, settingsNumberInputBorder, settingsNumberInputForeground, settingsSelectBackground, settingsSelectBorder, settingsSelectForeground, settingsSelectListBorder, settingsTextInputBackground, settingsTextInputBorder, settingsTextInputForeground } from '../common/settingsEditorColorRegistry.js';
import { settingsMoreActionIcon } from './preferencesIcons.js';
import { SettingsTreeIndicatorsLabel, getIndicatorsLabelAriaLabel } from './settingsEditorSettingIndicators.js';
import { SettingsTreeGroupElement, SettingsTreeNewExtensionsElement, SettingsTreeSettingElement, inspectSetting, objectSettingSupportsRemoveDefaultValue, settingKeyToDisplayFormat } from './settingsTreeModels.js';
import { ExcludeSettingWidget, IncludeSettingWidget, ListSettingWidget, ObjectSettingCheckboxWidget, ObjectSettingDropdownWidget } from './settingsWidgets.js';
const $ = DOM.$;
function getIncludeExcludeDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...element.scopeValue } :
        elementDefaultValue;
    return Object.keys(data)
        .filter(key => !!data[key])
        .map(key => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        const value = data[key];
        const sibling = typeof value === 'boolean' ? undefined : value.when;
        return {
            value: {
                type: 'string',
                data: key
            },
            sibling,
            elementType: element.valueType,
            source
        };
    });
}
function areAllPropertiesDefined(properties, itemsToDisplay) {
    const staticProperties = new Set(properties);
    itemsToDisplay.forEach(({ key }) => staticProperties.delete(key.data));
    return staticProperties.size === 0;
}
function getEnumOptionsFromSchema(schema) {
    if (schema.anyOf) {
        return schema.anyOf.map(getEnumOptionsFromSchema).flat();
    }
    const enumDescriptions = schema.enumDescriptions ?? [];
    return (schema.enum ?? []).map((value, idx) => {
        const description = idx < enumDescriptions.length
            ? enumDescriptions[idx]
            : undefined;
        return { value, description };
    });
}
function getObjectValueType(schema) {
    if (schema.anyOf) {
        const subTypes = schema.anyOf.map(getObjectValueType);
        if (subTypes.some(type => type === 'enum')) {
            return 'enum';
        }
        return 'string';
    }
    if (schema.type === 'boolean') {
        return 'boolean';
    }
    else if (schema.type === 'string' && isDefined(schema.enum) && schema.enum.length > 0) {
        return 'enum';
    }
    else {
        return 'string';
    }
}
function getObjectEntryValueDisplayValue(type, data, options) {
    if (type === 'boolean') {
        return { type, data: !!data };
    }
    else if (type === 'enum') {
        return { type, data: '' + data, options };
    }
    else {
        return { type, data: '' + data };
    }
}
function getObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const elementScopeValue = typeof element.scopeValue === 'object'
        ? element.scopeValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...elementScopeValue } :
        element.hasPolicyValue ? element.scopeValue :
            elementDefaultValue;
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object
        .entries(objectPatternProperties ?? {})
        .map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema
    }));
    const wellDefinedKeyEnumOptions = Object.entries(objectProperties ?? {}).map(([key, schema]) => ({ value: key, description: schema.description }));
    return Object.keys(data).map(key => {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(`${element.setting.key}.${key}`);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        if (isDefined(objectProperties) && key in objectProperties) {
            const valueEnumOptions = getEnumOptionsFromSchema(objectProperties[key]);
            return {
                key: {
                    type: 'enum',
                    data: key,
                    options: wellDefinedKeyEnumOptions,
                },
                value: getObjectEntryValueDisplayValue(getObjectValueType(objectProperties[key]), data[key], valueEnumOptions),
                keyDescription: objectProperties[key].description,
                removable: isUndefinedOrNull(defaultValue),
                resetable: !isUndefinedOrNull(defaultValue),
                source
            };
        }
        // The row is removable if it doesn't have a default value assigned or the setting supports removing the default value.
        // If a default value is assigned and the user modified the default, it can be reset back to the default.
        const removable = defaultValue === undefined || objectSettingSupportsRemoveDefaultValue(element.setting.key);
        const resetable = !!defaultValue && defaultValue !== data[key];
        const schema = patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (schema) {
            const valueEnumOptions = getEnumOptionsFromSchema(schema);
            return {
                key: { type: 'string', data: key },
                value: getObjectEntryValueDisplayValue(getObjectValueType(schema), data[key], valueEnumOptions),
                keyDescription: schema.description,
                removable,
                resetable,
                source
            };
        }
        const additionalValueEnums = getEnumOptionsFromSchema(typeof objectAdditionalProperties === 'boolean'
            ? {}
            : objectAdditionalProperties ?? {});
        return {
            key: { type: 'string', data: key },
            value: getObjectEntryValueDisplayValue(typeof objectAdditionalProperties === 'object' ? getObjectValueType(objectAdditionalProperties) : 'string', data[key], additionalValueEnums),
            keyDescription: typeof objectAdditionalProperties === 'object' ? objectAdditionalProperties.description : undefined,
            removable,
            resetable,
            source
        };
    }).filter(item => !isUndefinedOrNull(item.value.data));
}
function getBoolObjectDisplayValue(element) {
    const elementDefaultValue = typeof element.defaultValue === 'object'
        ? element.defaultValue ?? {}
        : {};
    const elementScopeValue = typeof element.scopeValue === 'object'
        ? element.scopeValue ?? {}
        : {};
    const data = element.isConfigured ?
        { ...elementDefaultValue, ...elementScopeValue } :
        elementDefaultValue;
    const { objectProperties } = element.setting;
    const displayValues = [];
    for (const key in objectProperties) {
        const defaultValue = elementDefaultValue[key];
        // Get source if it's a default value
        let source;
        if (defaultValue === data[key] && element.setting.type === 'object' && element.defaultValueSource instanceof Map) {
            const defaultSource = element.defaultValueSource.get(key);
            source = typeof defaultSource === 'string' ? defaultSource : defaultSource?.displayName;
        }
        displayValues.push({
            key: {
                type: 'string',
                data: key
            },
            value: {
                type: 'boolean',
                data: !!data[key]
            },
            keyDescription: objectProperties[key].description,
            removable: false,
            resetable: true,
            source
        });
    }
    return displayValues;
}
function createArraySuggester(element) {
    return (keys, idx) => {
        const enumOptions = [];
        if (element.setting.enum) {
            element.setting.enum.forEach((key, i) => {
                // include the currently selected value, even if uniqueItems is true
                if (!element.setting.uniqueItems || (idx !== undefined && key === keys[idx]) || !keys.includes(key)) {
                    const description = element.setting.enumDescriptions?.[i];
                    enumOptions.push({ value: key, description });
                }
            });
        }
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectKeySuggester(element) {
    const { objectProperties } = element.setting;
    const allStaticKeys = Object.keys(objectProperties ?? {});
    return keys => {
        const existingKeys = new Set(keys);
        const enumOptions = [];
        allStaticKeys.forEach(staticKey => {
            if (!existingKeys.has(staticKey)) {
                enumOptions.push({ value: staticKey, description: objectProperties[staticKey].description });
            }
        });
        return enumOptions.length > 0
            ? { type: 'enum', data: enumOptions[0].value, options: enumOptions }
            : undefined;
    };
}
function createObjectValueSuggester(element) {
    const { objectProperties, objectPatternProperties, objectAdditionalProperties } = element.setting;
    const patternsAndSchemas = Object
        .entries(objectPatternProperties ?? {})
        .map(([pattern, schema]) => ({
        pattern: new RegExp(pattern),
        schema
    }));
    return (key) => {
        let suggestedSchema;
        if (isDefined(objectProperties) && key in objectProperties) {
            suggestedSchema = objectProperties[key];
        }
        const patternSchema = suggestedSchema ?? patternsAndSchemas.find(({ pattern }) => pattern.test(key))?.schema;
        if (isDefined(patternSchema)) {
            suggestedSchema = patternSchema;
        }
        else if (isDefined(objectAdditionalProperties) && typeof objectAdditionalProperties === 'object') {
            suggestedSchema = objectAdditionalProperties;
        }
        if (isDefined(suggestedSchema)) {
            const type = getObjectValueType(suggestedSchema);
            if (type === 'boolean') {
                return { type, data: suggestedSchema.default ?? true };
            }
            else if (type === 'enum') {
                const options = getEnumOptionsFromSchema(suggestedSchema);
                return { type, data: suggestedSchema.default ?? options[0].value, options };
            }
            else {
                return { type, data: suggestedSchema.default ?? '' };
            }
        }
        return;
    };
}
function isNonNullableNumericType(type) {
    return type === 'number' || type === 'integer';
}
function parseNumericObjectValues(dataElement, v) {
    const newRecord = {};
    for (const key in v) {
        // Set to true/false once we're sure of the answer
        let keyMatchesNumericProperty;
        const patternProperties = dataElement.setting.objectPatternProperties;
        const properties = dataElement.setting.objectProperties;
        const additionalProperties = dataElement.setting.objectAdditionalProperties;
        // Match the current record key against the properties of the object
        if (properties) {
            for (const propKey in properties) {
                if (propKey === key) {
                    keyMatchesNumericProperty = isNonNullableNumericType(properties[propKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined && patternProperties) {
            for (const patternKey in patternProperties) {
                if (key.match(patternKey)) {
                    keyMatchesNumericProperty = isNonNullableNumericType(patternProperties[patternKey].type);
                    break;
                }
            }
        }
        if (keyMatchesNumericProperty === undefined && additionalProperties && typeof additionalProperties !== 'boolean') {
            if (isNonNullableNumericType(additionalProperties.type)) {
                keyMatchesNumericProperty = true;
            }
        }
        newRecord[key] = keyMatchesNumericProperty ? Number(v[key]) : v[key];
    }
    return newRecord;
}
function getListDisplayValue(element) {
    if (!element.value || !Array.isArray(element.value)) {
        return [];
    }
    if (element.setting.arrayItemType === 'enum') {
        let enumOptions = [];
        if (element.setting.enum) {
            enumOptions = element.setting.enum.map((setting, i) => {
                return {
                    value: setting,
                    description: element.setting.enumDescriptions?.[i]
                };
            });
        }
        return element.value.map((key) => {
            return {
                value: {
                    type: 'enum',
                    data: key,
                    options: enumOptions
                }
            };
        });
    }
    else {
        return element.value.map((key) => {
            return {
                value: {
                    type: 'string',
                    data: key
                }
            };
        });
    }
}
function getShowAddButtonList(dataElement, listDisplayValue) {
    if (dataElement.setting.enum && dataElement.setting.uniqueItems) {
        return dataElement.setting.enum.length - listDisplayValue.length > 0;
    }
    else {
        return true;
    }
}
export function resolveSettingsTree(tocData, coreSettingsGroups, filter, logService) {
    const allSettings = getFlatSettings(coreSettingsGroups);
    return {
        tree: _resolveSettingsTree(tocData, allSettings, filter, logService),
        leftoverSettings: allSettings
    };
}
export function resolveConfiguredUntrustedSettings(groups, target, languageFilter, configurationService) {
    const allSettings = getFlatSettings(groups);
    return [...allSettings].filter(setting => setting.restricted && inspectSetting(setting.key, target, languageFilter, configurationService).isConfigured);
}
export async function createTocTreeForExtensionSettings(extensionService, groups, filter) {
    const extGroupTree = new Map();
    const addEntryToTree = (extensionId, extensionName, childEntry) => {
        if (!extGroupTree.has(extensionId)) {
            const rootEntry = {
                id: extensionId,
                label: extensionName,
                children: []
            };
            extGroupTree.set(extensionId, rootEntry);
        }
        extGroupTree.get(extensionId).children.push(childEntry);
    };
    const processGroupEntry = async (group) => {
        const flatSettings = group.sections.map(section => section.settings).flat();
        const settings = filter ? getMatchingSettings(new Set(flatSettings), filter) : flatSettings;
        const extensionId = group.extensionInfo.id;
        const extension = await extensionService.getExtension(extensionId);
        const extensionName = extension?.displayName ?? extension?.name ?? extensionId;
        // There could be multiple groups with the same extension id that all belong to the same extension.
        // To avoid highlighting all groups upon expanding the extension's ToC entry,
        // use the group ID only if it is non-empty and isn't the extension ID.
        // Ref https://github.com/microsoft/vscode/issues/241521.
        const settingGroupId = (group.id && group.id !== extensionId) ? group.id : group.title;
        const childEntry = {
            id: settingGroupId,
            label: group.title,
            order: group.order,
            settings
        };
        addEntryToTree(extensionId, extensionName, childEntry);
    };
    const processPromises = groups.map(g => processGroupEntry(g));
    return Promise.all(processPromises).then(() => {
        const extGroups = [];
        for (const extensionRootEntry of extGroupTree.values()) {
            for (const child of extensionRootEntry.children) {
                // Sort the individual settings of the child by order.
                // Leave the undefined order settings untouched.
                child.settings?.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
            }
            if (extensionRootEntry.children.length === 1) {
                // There is a single category for this extension.
                // Push a flattened setting.
                extGroups.push({
                    id: extensionRootEntry.id,
                    label: extensionRootEntry.children[0].label,
                    settings: extensionRootEntry.children[0].settings
                });
            }
            else {
                // Sort the categories.
                // Leave the undefined order categories untouched.
                extensionRootEntry.children.sort((a, b) => {
                    return compareTwoNullableNumbers(a.order, b.order);
                });
                // If there is a category that matches the setting name,
                // add the settings in manually as "ungrouped" settings.
                // https://github.com/microsoft/vscode/issues/137259
                const ungroupedChild = extensionRootEntry.children.find(child => child.label === extensionRootEntry.label);
                if (ungroupedChild && !ungroupedChild.children) {
                    const groupedChildren = extensionRootEntry.children.filter(child => child !== ungroupedChild);
                    extGroups.push({
                        id: extensionRootEntry.id,
                        label: extensionRootEntry.label,
                        settings: ungroupedChild.settings,
                        children: groupedChildren
                    });
                }
                else {
                    // Push all the groups as-is.
                    extGroups.push(extensionRootEntry);
                }
            }
        }
        // Sort the outermost settings.
        extGroups.sort((a, b) => a.label.localeCompare(b.label));
        return {
            id: 'extensions',
            label: localize('extensions', "Extensions"),
            children: extGroups
        };
    });
}
function _resolveSettingsTree(tocData, allSettings, filter, logService) {
    let children;
    if (tocData.children) {
        children = tocData.children
            .filter(child => child.hide !== true)
            .map(child => _resolveSettingsTree(child, allSettings, filter, logService))
            .filter(child => child.children?.length || child.settings?.length);
    }
    let settings;
    if (filter || tocData.settings) {
        settings = getMatchingSettings(allSettings, {
            include: {
                keyPatterns: [...filter?.include?.keyPatterns ?? [], ...tocData.settings ?? []],
                tags: filter?.include?.tags ? [...filter.include.tags] : []
            },
            exclude: filter?.exclude ?? {}
        });
    }
    if (!children && !settings) {
        throw new Error(`TOC node has no child groups or settings: ${tocData.id}`);
    }
    return {
        id: tocData.id,
        label: tocData.label,
        children,
        settings
    };
}
function getMatchingSettings(allSettings, filter) {
    const result = [];
    allSettings.forEach(setting => {
        let shouldInclude = false;
        let shouldExclude = false;
        // Check include filters
        if (filter.include?.keyPatterns) {
            shouldInclude = filter.include.keyPatterns.some(pattern => {
                if (pattern.startsWith('@tag:')) {
                    const tagName = pattern.substring(5);
                    return setting.tags?.includes(tagName);
                }
                else {
                    return settingMatches(setting, pattern);
                }
            });
        }
        else {
            shouldInclude = true;
        }
        if (shouldInclude && filter.include?.tags?.length) {
            shouldInclude = filter.include.tags.some(tag => setting.tags?.includes(tag));
        }
        // Check exclude filters (takes precedence)
        if (filter.exclude?.keyPatterns) {
            shouldExclude = filter.exclude.keyPatterns.some(pattern => {
                if (pattern.startsWith('@tag:')) {
                    const tagName = pattern.substring(5);
                    return setting.tags?.includes(tagName);
                }
                else {
                    return settingMatches(setting, pattern);
                }
            });
        }
        if (!shouldExclude && filter.exclude?.tags?.length) {
            shouldExclude = filter.exclude.tags.some(tag => setting.tags?.includes(tag));
        }
        // Include if matches include filter and doesn't match exclude filter
        if (shouldInclude && !shouldExclude) {
            result.push(setting);
            allSettings.delete(setting);
        }
    });
    return result.sort((a, b) => a.key.localeCompare(b.key));
}
const settingPatternCache = new Map();
export function createSettingMatchRegExp(pattern) {
    pattern = escapeRegExpCharacters(pattern)
        .replace(/\\\*/g, '.*');
    return new RegExp(`^${pattern}$`, 'i');
}
function settingMatches(s, pattern) {
    let regExp = settingPatternCache.get(pattern);
    if (!regExp) {
        regExp = createSettingMatchRegExp(pattern);
        settingPatternCache.set(pattern, regExp);
    }
    return regExp.test(s.key);
}
function getFlatSettings(settingsGroups) {
    const result = new Set();
    for (const group of settingsGroups) {
        for (const section of group.sections) {
            for (const s of section.settings) {
                if (!s.overrides || !s.overrides.length) {
                    result.add(s);
                }
            }
        }
    }
    return result;
}
const SETTINGS_TEXT_TEMPLATE_ID = 'settings.text.template';
const SETTINGS_MULTILINE_TEXT_TEMPLATE_ID = 'settings.multilineText.template';
const SETTINGS_NUMBER_TEMPLATE_ID = 'settings.number.template';
const SETTINGS_ENUM_TEMPLATE_ID = 'settings.enum.template';
const SETTINGS_BOOL_TEMPLATE_ID = 'settings.bool.template';
const SETTINGS_ARRAY_TEMPLATE_ID = 'settings.array.template';
const SETTINGS_EXCLUDE_TEMPLATE_ID = 'settings.exclude.template';
const SETTINGS_INCLUDE_TEMPLATE_ID = 'settings.include.template';
const SETTINGS_OBJECT_TEMPLATE_ID = 'settings.object.template';
const SETTINGS_BOOL_OBJECT_TEMPLATE_ID = 'settings.boolObject.template';
const SETTINGS_COMPLEX_TEMPLATE_ID = 'settings.complex.template';
const SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID = 'settings.complexObject.template';
const SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID = 'settings.newExtensions.template';
const SETTINGS_ELEMENT_TEMPLATE_ID = 'settings.group.template';
const SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID = 'settings.extensionToggle.template';
function removeChildrenFromTabOrder(node) {
    // eslint-disable-next-line no-restricted-syntax
    const focusableElements = node.querySelectorAll(`
		[tabindex="0"],
		input:not([tabindex="-1"]),
		select:not([tabindex="-1"]),
		textarea:not([tabindex="-1"]),
		a:not([tabindex="-1"]),
		button:not([tabindex="-1"]),
		area:not([tabindex="-1"])
	`);
    focusableElements.forEach(element => {
        element.setAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR, 'true');
        element.setAttribute('tabindex', '-1');
    });
}
function addChildrenToTabOrder(node) {
    // eslint-disable-next-line no-restricted-syntax
    const focusableElements = node.querySelectorAll(`[${AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR}="true"]`);
    focusableElements.forEach(element => {
        element.removeAttribute(AbstractSettingRenderer.ELEMENT_FOCUSABLE_ATTR);
        element.setAttribute('tabindex', '0');
    });
}
let AbstractSettingRenderer = class AbstractSettingRenderer extends Disposable {
    static { AbstractSettingRenderer_1 = this; }
    static { this.CONTROL_CLASS = 'setting-control-focus-target'; }
    static { this.CONTROL_SELECTOR = '.' + this.CONTROL_CLASS; }
    static { this.CONTENTS_CLASS = 'setting-item-contents'; }
    static { this.CONTENTS_SELECTOR = '.' + this.CONTENTS_CLASS; }
    static { this.ALL_ROWS_SELECTOR = '.monaco-list-row'; }
    static { this.SETTING_KEY_ATTR = 'data-key'; }
    static { this.SETTING_ID_ATTR = 'data-id'; }
    static { this.ELEMENT_FOCUSABLE_ATTR = 'data-focusable'; }
    constructor(settingActions, disposableActionFactory, _themeService, _contextViewService, _openerService, _instantiationService, _commandService, _contextMenuService, _keybindingService, _configService, _extensionsService, _extensionsWorkbenchService, _productService, _telemetryService, _hoverService, _markdownRendererService) {
        super();
        this.settingActions = settingActions;
        this.disposableActionFactory = disposableActionFactory;
        this._themeService = _themeService;
        this._contextViewService = _contextViewService;
        this._openerService = _openerService;
        this._instantiationService = _instantiationService;
        this._commandService = _commandService;
        this._contextMenuService = _contextMenuService;
        this._keybindingService = _keybindingService;
        this._configService = _configService;
        this._extensionsService = _extensionsService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._productService = _productService;
        this._telemetryService = _telemetryService;
        this._hoverService = _hoverService;
        this._markdownRendererService = _markdownRendererService;
        this._onDidClickOverrideElement = this._register(new Emitter());
        this.onDidClickOverrideElement = this._onDidClickOverrideElement.event;
        this._onDidChangeSetting = this._register(new Emitter());
        this.onDidChangeSetting = this._onDidChangeSetting.event;
        this._onDidOpenSettings = this._register(new Emitter());
        this.onDidOpenSettings = this._onDidOpenSettings.event;
        this._onDidClickSettingLink = this._register(new Emitter());
        this.onDidClickSettingLink = this._onDidClickSettingLink.event;
        this._onDidFocusSetting = this._register(new Emitter());
        this.onDidFocusSetting = this._onDidFocusSetting.event;
        this._onDidChangeIgnoredSettings = this._register(new Emitter());
        this.onDidChangeIgnoredSettings = this._onDidChangeIgnoredSettings.event;
        this._onDidChangeSettingHeight = this._register(new Emitter());
        this.onDidChangeSettingHeight = this._onDidChangeSettingHeight.event;
        this._onApplyFilter = this._register(new Emitter());
        this.onApplyFilter = this._onApplyFilter.event;
        this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
        this._register(this._configService.onDidChangeConfiguration(e => {
            this.ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this._configService);
            this._onDidChangeIgnoredSettings.fire();
        }));
    }
    renderCommonTemplate(tree, _container, typeClass) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-' + typeClass);
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer_1.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const labelCategoryContainer = DOM.append(titleElement, $('.setting-item-cat-label-container'));
        const categoryElement = DOM.append(labelCategoryContainer, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(labelCategoryContainer, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = toDispose.add(this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement));
        const descriptionElement = DOM.append(container, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', "The setting has been configured in the current scope.")
        }));
        const valueElement = DOM.append(container, $('.setting-item-value'));
        const controlElement = DOM.append(valueElement, $('div.setting-item-control'));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            descriptionElement,
            controlElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar
        };
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, DOM.EventType.MOUSE_DOWN, e => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));
        return template;
    }
    addSettingElementFocusHandler(template) {
        const focusTracker = DOM.trackFocus(template.containerElement);
        template.toDispose.add(focusTracker);
        template.toDispose.add(focusTracker.onDidBlur(() => {
            if (template.containerElement.classList.contains('focused')) {
                template.containerElement.classList.remove('focused');
            }
        }));
        template.toDispose.add(focusTracker.onDidFocus(() => {
            template.containerElement.classList.add('focused');
            if (template.context) {
                this._onDidFocusSetting.fire(template.context);
            }
        }));
    }
    renderSettingToolbar(container) {
        const toggleMenuKeybinding = this._keybindingService.lookupKeybinding(SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU);
        let toggleMenuTitle = localize('settingsContextMenuTitle', "More Actions... ");
        if (toggleMenuKeybinding) {
            toggleMenuTitle += ` (${toggleMenuKeybinding && toggleMenuKeybinding.getLabel()})`;
        }
        const toolbar = new ToolBar(container, this._contextMenuService, {
            toggleMenuTitle,
            renderDropdownAsChildElement: !isIOS,
            moreIcon: settingsMoreActionIcon
        });
        return toolbar;
    }
    renderSettingElement(node, index, template) {
        const element = node.element;
        // The element must inspect itself to get information for
        // the modified indicator and the overridden Settings indicators.
        element.inspectSelf();
        template.context = element;
        template.toolbar.context = element;
        const actions = this.disposableActionFactory(element.setting, element.settingsTarget);
        actions.forEach(a => isDisposable(a) && template.elementDisposables.add(a));
        template.toolbar.setActions([], [...this.settingActions, ...actions]);
        const setting = element.setting;
        template.containerElement.classList.toggle('is-configured', element.isConfigured);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_KEY_ATTR, element.setting.key);
        template.containerElement.setAttribute(AbstractSettingRenderer_1.SETTING_ID_ATTR, element.id);
        const titleTooltip = setting.key + (element.isConfigured ? ' - Modified' : '');
        template.categoryElement.textContent = element.displayCategory ? (element.displayCategory + ': ') : '';
        template.elementDisposables.add(this._hoverService.setupDelayedHover(template.categoryElement, { content: titleTooltip }));
        template.labelElement.text = element.displayLabel;
        template.labelElement.title = titleTooltip;
        template.descriptionElement.innerText = '';
        if (element.setting.descriptionIsMarkdown) {
            const renderedDescription = this.renderSettingMarkdown(element, template.containerElement, element.description, template.elementDisposables);
            template.descriptionElement.appendChild(renderedDescription);
        }
        else {
            template.descriptionElement.innerText = element.description;
        }
        template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
        template.elementDisposables.add(this._configService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING)) {
                template.indicatorsLabel.updateScopeOverrides(element, this._onDidClickOverrideElement, this._onApplyFilter);
            }
        }));
        const onChange = (value) => this._onDidChangeSetting.fire({
            key: element.setting.key,
            value,
            type: template.context.valueType,
            manualReset: false,
            scope: element.setting.scope
        });
        const deprecationText = element.setting.deprecationMessage || '';
        if (deprecationText && element.setting.deprecationMessageIsMarkdown) {
            template.deprecationWarningElement.innerText = '';
            template.deprecationWarningElement.appendChild(this.renderSettingMarkdown(element, template.containerElement, element.setting.deprecationMessage, template.elementDisposables));
        }
        else {
            template.deprecationWarningElement.innerText = deprecationText;
        }
        template.deprecationWarningElement.prepend($('.codicon.codicon-error'));
        template.containerElement.classList.toggle('is-deprecated', !!deprecationText);
        this.renderValue(element, template, onChange);
        template.indicatorsLabel.updateWorkspaceTrust(element);
        template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        template.indicatorsLabel.updateDefaultOverrideIndicator(element);
        template.indicatorsLabel.updatePreviewIndicator(element);
        template.elementDisposables.add(this.onDidChangeIgnoredSettings(() => {
            template.indicatorsLabel.updateSyncIgnored(element, this.ignoredSettings);
        }));
        this.updateSettingTabbable(element, template);
        template.elementDisposables.add(element.onDidChangeTabbable(() => {
            this.updateSettingTabbable(element, template);
        }));
    }
    updateSettingTabbable(element, template) {
        if (element.tabbable) {
            addChildrenToTabOrder(template.containerElement);
        }
        else {
            removeChildrenFromTabOrder(template.containerElement);
        }
    }
    renderSettingMarkdown(element, container, text, disposables) {
        // Rewrite `#editor.fontSize#` to link format
        text = fixSettingLinks(text);
        const renderedMarkdown = disposables.add(this._markdownRendererService.render({ value: text, isTrusted: true }, {
            actionHandler: (content) => {
                if (content.startsWith('#')) {
                    const e = {
                        source: element,
                        targetKey: content.substring(1)
                    };
                    this._onDidClickSettingLink.fire(e);
                }
                else {
                    this._openerService.open(content, { allowCommands: true }).catch(onUnexpectedError);
                }
            },
            asyncRenderCallback: () => {
                const height = container.clientHeight;
                if (height) {
                    this._onDidChangeSettingHeight.fire({ element, height });
                }
            },
        }));
        renderedMarkdown.element.classList.add('setting-item-markdown');
        cleanRenderedMarkdown(renderedMarkdown.element);
        return renderedMarkdown.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
    disposeElement(_element, _index, template) {
        template.elementDisposables?.clear();
    }
};
AbstractSettingRenderer = AbstractSettingRenderer_1 = __decorate([
    __param(2, IThemeService),
    __param(3, IContextViewService),
    __param(4, IOpenerService),
    __param(5, IInstantiationService),
    __param(6, ICommandService),
    __param(7, IContextMenuService),
    __param(8, IKeybindingService),
    __param(9, IConfigurationService),
    __param(10, IExtensionService),
    __param(11, IExtensionsWorkbenchService),
    __param(12, IProductService),
    __param(13, ITelemetryService),
    __param(14, IHoverService),
    __param(15, IMarkdownRendererService)
], AbstractSettingRenderer);
export { AbstractSettingRenderer };
class SettingGroupRenderer {
    constructor() {
        this.templateId = SETTINGS_ELEMENT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        container.classList.add('group-title');
        const template = {
            parent: container,
            toDispose: new DisposableStore()
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.parent.innerText = '';
        const labelElement = DOM.append(templateData.parent, $('div.settings-group-title-label.settings-row-inner-container'));
        labelElement.classList.add(`settings-group-level-${element.element.level}`);
        labelElement.textContent = element.element.label;
        if (element.element.isFirstGroup) {
            labelElement.classList.add('settings-group-first');
        }
    }
    disposeTemplate(templateData) {
        templateData.toDispose.dispose();
    }
}
let SettingNewExtensionsRenderer = class SettingNewExtensionsRenderer {
    constructor(_commandService) {
        this._commandService = _commandService;
        this.templateId = SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        container.classList.add('setting-item-new-extensions');
        const button = new Button(container, { title: true, ...defaultButtonStyles });
        toDispose.add(button);
        toDispose.add(button.onDidClick(() => {
            if (template.context) {
                this._commandService.executeCommand('workbench.extensions.action.showExtensionsWithIds', template.context.extensionIds);
            }
        }));
        button.label = localize('newExtensionsButtonLabel', "Show matching extensions");
        button.element.classList.add('settings-new-extensions-button');
        const template = {
            button,
            toDispose
        };
        return template;
    }
    renderElement(element, index, templateData) {
        templateData.context = element.element;
    }
    disposeTemplate(template) {
        template.toDispose.dispose();
    }
};
SettingNewExtensionsRenderer = __decorate([
    __param(0, ICommandService)
], SettingNewExtensionsRenderer);
export { SettingNewExtensionsRenderer };
export class SettingComplexRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_TEMPLATE_ID;
    }
    static { this.EDIT_IN_JSON_LABEL = localize('editInSettingsJson', "Edit in settings.json"); }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'complex');
        const openSettingsButton = DOM.append(common.controlElement, $('a.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const plainKey = getLanguageTagSettingPlainKey(dataElement.setting.key);
        const editLanguageSettingLabel = localize('editLanguageSettingLabel', "Edit settings for {0}", plainKey);
        const isLanguageTagSetting = dataElement.setting.isLanguageTagSetting;
        template.button.textContent = isLanguageTagSetting
            ? editLanguageSettingLabel
            : SettingComplexRenderer.EDIT_IN_JSON_LABEL;
        const onClickOrKeydown = (e) => {
            if (isLanguageTagSetting) {
                this._onApplyFilter.fire(`@${LANGUAGE_SETTING_TAG}${plainKey.replaceAll(' ', '')}`);
            }
            else {
                this._onDidOpenSettings.fire(dataElement.setting.key);
            }
            e.preventDefault();
            e.stopPropagation();
        };
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.CLICK, (e) => {
            onClickOrKeydown(e);
        }));
        template.elementDisposables.add(DOM.addDisposableListener(template.button, DOM.EventType.KEY_DOWN, (e) => {
            const ev = new StandardKeyboardEvent(e);
            if (ev.equals(10 /* KeyCode.Space */) || ev.equals(3 /* KeyCode.Enter */)) {
                onClickOrKeydown(e);
            }
        }));
        this.renderValidations(dataElement, template);
        if (isLanguageTagSetting) {
            template.button.setAttribute('aria-label', editLanguageSettingLabel);
        }
        else {
            template.button.setAttribute('aria-label', `${SettingComplexRenderer.EDIT_IN_JSON_LABEL}: ${dataElement.setting.key}`);
        }
    }
    renderValidations(dataElement, template) {
        const errMsg = dataElement.isConfigured && getInvalidTypeError(dataElement.value, dataElement.setting.type);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            return;
        }
        template.containerElement.classList.remove('invalid-input');
    }
}
class SettingComplexObjectRenderer extends SettingComplexRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const objectSettingWidget = common.toDispose.add(this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement));
        objectSettingWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const openSettingsButton = DOM.append(DOM.append(common.controlElement, $('.complex-object-edit-in-settings-button-container')), $('a.complex-object.edit-in-settings-button'));
        openSettingsButton.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        openSettingsButton.role = 'button';
        const validationErrorMessageElement = $('.setting-item-validation-message');
        common.containerElement.appendChild(validationErrorMessageElement);
        const template = {
            ...common,
            button: openSettingsButton,
            validationErrorMessageElement,
            objectSettingWidget
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        template.objectSettingWidget.setValue(items, {
            settingKey: dataElement.setting.key,
            showAddButton: false,
            isReadOnly: true,
        });
        template.button.parentElement?.classList.toggle('hide', dataElement.hasPolicyValue);
        super.renderValue(dataElement, template, onChange);
    }
}
class SettingArrayRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ARRAY_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        // eslint-disable-next-line no-restricted-syntax
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const listWidget = this._instantiationService.createInstance(ListSettingWidget, common.controlElement);
        listWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(listWidget);
        const template = {
            ...common,
            listWidget,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(listWidget.onDidChangeList(e => {
            const newList = this.computeNewList(template, e);
            template.onChange?.(newList);
        }));
        return template;
    }
    computeNewList(template, e) {
        if (template.context) {
            let newValue = [];
            if (Array.isArray(template.context.scopeValue)) {
                newValue = [...template.context.scopeValue];
            }
            else if (Array.isArray(template.context.value)) {
                newValue = [...template.context.value];
            }
            if (e.type === 'move') {
                // A drag and drop occurred
                const sourceIndex = e.sourceIndex;
                const targetIndex = e.targetIndex;
                const splicedElem = newValue.splice(sourceIndex, 1)[0];
                newValue.splice(targetIndex, 0, splicedElem);
            }
            else if (e.type === 'remove' || e.type === 'reset') {
                newValue.splice(e.targetIndex, 1);
            }
            else if (e.type === 'change') {
                const itemValueData = e.newItem.value.data.toString();
                // Update value
                if (e.targetIndex > -1) {
                    newValue[e.targetIndex] = itemValueData;
                }
                // For some reason, we are updating and cannot find original value
                // Just append the value in this case
                else {
                    newValue.push(itemValueData);
                }
            }
            else if (e.type === 'add') {
                newValue.push(e.newItem.value.data.toString());
            }
            if (template.context.defaultValue &&
                Array.isArray(template.context.defaultValue) &&
                template.context.defaultValue.length === newValue.length &&
                template.context.defaultValue.join() === newValue.join()) {
                return undefined;
            }
            return newValue;
        }
        return undefined;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getListDisplayValue(dataElement);
        const keySuggester = dataElement.setting.enum ? createArraySuggester(dataElement) : undefined;
        template.listWidget.setValue(value, {
            showAddButton: getShowAddButtonList(dataElement, value),
            keySuggester
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.listWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const itemType = dataElement.setting.arrayItemType;
                const arrToSave = isNonNullableNumericType(itemType) ? v.map(a => +a) : v;
                onChange(arrToSave);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, value.map(v => v.value.data.toString()), true);
    }
}
class AbstractSettingObjectRenderer extends AbstractSettingRenderer {
    renderTemplateWithWidget(common, widget) {
        widget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(widget);
        // eslint-disable-next-line no-restricted-syntax
        const descriptionElement = common.containerElement.querySelector('.setting-item-description');
        const validationErrorMessageElement = $('.setting-item-validation-message');
        descriptionElement.after(validationErrorMessageElement);
        const template = {
            ...common,
            validationErrorMessageElement
        };
        if (widget instanceof ObjectSettingCheckboxWidget) {
            template.objectCheckboxWidget = widget;
        }
        else {
            template.objectDropdownWidget = widget;
        }
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
}
class SettingObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingDropdownWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList(e => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        const widget = template.objectDropdownWidget;
        if (template.context) {
            const settingSupportsRemoveDefault = objectSettingSupportsRemoveDefaultValue(template.context.setting.key);
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? template.context.defaultValue ?? {}
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object'
                ? template.context.scopeValue ?? {}
                : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            widget.items.forEach((item, idx) => {
                // Item was updated
                if ((e.type === 'change' || e.type === 'move') && e.targetIndex === idx) {
                    // If the key of the default value is changed, remove the default value
                    if (e.originalItem.key.data !== e.newItem.key.data && settingSupportsRemoveDefault && e.originalItem.key.data in defaultValue) {
                        newValue[e.originalItem.key.data] = null;
                    }
                    else {
                        delete newValue[e.originalItem.key.data];
                    }
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if ((e.type !== 'change' && e.type !== 'move') || e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            // Item was deleted
            if (e.type === 'remove' || e.type === 'reset') {
                const objectKey = e.originalItem.key.data;
                const removingDefaultValue = e.type === 'remove' && settingSupportsRemoveDefault && defaultValue[objectKey] === e.originalItem.value.data;
                if (removingDefaultValue) {
                    newValue[objectKey] = null;
                }
                else {
                    delete newValue[objectKey];
                }
                const itemToDelete = newItems.findIndex(item => item.key.data === objectKey);
                const defaultItemValue = defaultValue[objectKey];
                // Item does not have a default or default is bing removed
                if (removingDefaultValue || isUndefinedOrNull(defaultValue[objectKey]) && itemToDelete > -1) {
                    newItems.splice(itemToDelete, 1);
                }
                else if (!removingDefaultValue && itemToDelete > -1) {
                    newItems[itemToDelete].value.data = defaultItemValue;
                }
            }
            // New item was added
            else if (e.type === 'add') {
                newValue[e.newItem.key.data] = e.newItem.value.data;
                newItems.push(e.newItem);
            }
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value && defaultValue[key] === value && !(settingSupportsRemoveDefault && value === null)) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectDropdownWidget.setValue(newItems);
            template.onChange?.(newObject);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getObjectDisplayValue(dataElement);
        const { key, objectProperties, objectPatternProperties, objectAdditionalProperties } = dataElement.setting;
        template.objectDropdownWidget.setValue(items, {
            settingKey: key,
            showAddButton: objectAdditionalProperties === false
                ? (!areAllPropertiesDefined(Object.keys(objectProperties ?? {}), items) ||
                    isDefined(objectPatternProperties))
                : true,
            keySuggester: createObjectKeySuggester(dataElement),
            valueSuggester: createObjectValueSuggester(dataElement)
        });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.objectDropdownWidget.cancelEdit();
        }));
        template.onChange = (v) => {
            if (v && !renderArrayValidations(dataElement, template, v, false)) {
                const parsedRecord = parseNumericObjectValues(dataElement, v);
                onChange(parsedRecord);
            }
            else {
                // Save the setting unparsed and containing the errors.
                // renderArrayValidations will render relevant error messages.
                onChange(v);
            }
        };
        renderArrayValidations(dataElement, template, dataElement.value, true);
    }
}
class SettingBoolObjectRenderer extends AbstractSettingObjectRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const widget = this._instantiationService.createInstance(ObjectSettingCheckboxWidget, common.controlElement);
        const template = this.renderTemplateWithWidget(common, widget);
        common.toDispose.add(widget.onDidChangeList(e => {
            this.onDidChangeObject(template, e);
        }));
        return template;
    }
    onDidChangeObject(template, e) {
        if (template.context) {
            const widget = template.objectCheckboxWidget;
            const defaultValue = typeof template.context.defaultValue === 'object'
                ? template.context.defaultValue ?? {}
                : {};
            const scopeValue = typeof template.context.scopeValue === 'object'
                ? template.context.scopeValue ?? {}
                : {};
            const newValue = { ...template.context.scopeValue }; // Initialize with scoped values as removed default values are not rendered
            const newItems = [];
            if (e.type !== 'change') {
                console.warn('Unexpected event type', e.type, 'for bool object setting', template.context.setting.key);
                return;
            }
            widget.items.forEach((item, idx) => {
                // Item was updated
                if (e.targetIndex === idx) {
                    newValue[e.newItem.key.data] = e.newItem.value.data;
                    newItems.push(e.newItem);
                }
                // All remaining items, but skip the one that we just updated
                else if (e.newItem.key.data !== item.key.data) {
                    newValue[item.key.data] = item.value.data;
                    newItems.push(item);
                }
            });
            Object.entries(newValue).forEach(([key, value]) => {
                // value from the scope has changed back to the default
                if (scopeValue[key] !== value && defaultValue[key] === value) {
                    delete newValue[key];
                }
            });
            const newObject = Object.keys(newValue).length === 0 ? undefined : newValue;
            template.objectCheckboxWidget.setValue(newItems);
            template.onChange?.(newObject);
            // Focus this setting explicitly, in case we were previously
            // focused on another setting and clicked a checkbox/value container
            // for this setting.
            this._onDidFocusSetting.fire(template.context);
        }
    }
    renderValue(dataElement, template, onChange) {
        const items = getBoolObjectDisplayValue(dataElement);
        const { key } = dataElement.setting;
        template.objectCheckboxWidget.setValue(items, {
            settingKey: key
        });
        template.context = dataElement;
        template.onChange = (v) => {
            onChange(v);
        };
    }
}
class SettingIncludeExcludeRenderer extends AbstractSettingRenderer {
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'list');
        const includeExcludeWidget = this._instantiationService.createInstance(this.isExclude() ? ExcludeSettingWidget : IncludeSettingWidget, common.controlElement);
        includeExcludeWidget.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        common.toDispose.add(includeExcludeWidget);
        const template = {
            ...common,
            includeExcludeWidget
        };
        this.addSettingElementFocusHandler(template);
        common.toDispose.add(includeExcludeWidget.onDidChangeList(e => this.onDidChangeIncludeExclude(template, e)));
        return template;
    }
    onDidChangeIncludeExclude(template, e) {
        if (template.context) {
            const newValue = { ...template.context.scopeValue };
            // first delete the existing entry, if present
            if (e.type !== 'add') {
                if (e.originalItem.value.data.toString() in template.context.defaultValue) {
                    // delete a default by overriding it
                    newValue[e.originalItem.value.data.toString()] = false;
                }
                else {
                    delete newValue[e.originalItem.value.data.toString()];
                }
            }
            // then add the new or updated entry, if present
            if (e.type === 'change' || e.type === 'add' || e.type === 'move') {
                if (e.newItem.value.data.toString() in template.context.defaultValue && !e.newItem.sibling) {
                    // add a default by deleting its override
                    delete newValue[e.newItem.value.data.toString()];
                }
                else {
                    newValue[e.newItem.value.data.toString()] = e.newItem.sibling ? { when: e.newItem.sibling } : true;
                }
            }
            function sortKeys(obj) {
                const sortedKeys = Object.keys(obj)
                    .sort((a, b) => a.localeCompare(b));
                const retVal = {};
                for (const key of sortedKeys) {
                    retVal[key] = obj[key];
                }
                return retVal;
            }
            this._onDidChangeSetting.fire({
                key: template.context.setting.key,
                value: Object.keys(newValue).length === 0 ? undefined : sortKeys(newValue),
                type: template.context.valueType,
                manualReset: false,
                scope: template.context.setting.scope
            });
        }
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const value = getIncludeExcludeDisplayValue(dataElement);
        template.includeExcludeWidget.setValue(value, { isReadOnly: dataElement.hasPolicyValue });
        template.context = dataElement;
        template.elementDisposables.add(toDisposable(() => {
            template.includeExcludeWidget.cancelEdit();
        }));
    }
}
class SettingExcludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return true;
    }
}
class SettingIncludeRenderer extends SettingIncludeExcludeRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_INCLUDE_TEMPLATE_ID;
    }
    isExclude() {
        return false;
    }
}
const settingsInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsTextInputBackground,
    inputForeground: settingsTextInputForeground,
    inputBorder: settingsTextInputBorder
});
class AbstractSettingTextRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.MULTILINE_MAX_HEIGHT = 150;
    }
    renderTemplate(_container, useMultiline) {
        const common = this.renderCommonTemplate(null, _container, 'text');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBoxOptions = {
            flexibleHeight: useMultiline,
            flexibleWidth: false,
            flexibleMaxHeight: this.MULTILINE_MAX_HEIGHT,
            inputBoxStyles: settingsInputBoxStyles
        };
        const inputBox = new InputBox(common.controlElement, this._contextViewService, inputBoxOptions);
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange(e => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.inputBox.value = dataElement.value;
        template.inputBox.setEnabled(!dataElement.hasPolicyValue);
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.onChange = value => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(value);
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const template = super.renderTemplate(_container, false);
        // TODO@9at8: listWidget filters out all key events from input boxes, so we need to come up with a better way
        // Disable ArrowUp and ArrowDown behaviour in favor of list navigation
        template.toDispose.add(DOM.addStandardDisposableListener(template.inputBox.inputElement, DOM.EventType.KEY_DOWN, e => {
            if (e.equals(16 /* KeyCode.UpArrow */) || e.equals(18 /* KeyCode.DownArrow */)) {
                e.preventDefault();
            }
        }));
        return template;
    }
}
class SettingMultilineTextRenderer extends AbstractSettingTextRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        return super.renderTemplate(_container, true);
    }
    renderValue(dataElement, template, onChange) {
        const onChangeOverride = (value) => {
            // Ensure the model is up to date since a different value will be rendered as different height when probing the height.
            dataElement.value = value;
            onChange(value);
        };
        super.renderValue(dataElement, template, onChangeOverride);
        template.elementDisposables.add(template.inputBox.onDidHeightChange(e => {
            const height = template.containerElement.clientHeight;
            // Don't fire event if height is reported as 0,
            // which sometimes happens when clicking onto a new setting.
            if (height) {
                this._onDidChangeSettingHeight.fire({
                    element: dataElement,
                    height: template.containerElement.clientHeight
                });
            }
        }));
        template.inputBox.layout();
    }
}
class SettingEnumRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_ENUM_TEMPLATE_ID;
    }
    renderTemplate(container) {
        const common = this.renderCommonTemplate(null, container, 'enum');
        const styles = getSelectBoxStyles({
            selectBackground: settingsSelectBackground,
            selectForeground: settingsSelectForeground,
            selectBorder: settingsSelectBorder,
            selectListBorder: settingsSelectListBorder
        });
        const selectBox = new SelectBox([], 0, this._contextViewService, styles, {
            useCustomDrawn: !hasNativeContextMenu(this._configService) || !(isIOS && BrowserFeatures.pointerEvents)
        });
        common.toDispose.add(selectBox);
        selectBox.render(common.controlElement);
        // eslint-disable-next-line no-restricted-syntax
        const selectElement = common.controlElement.querySelector('select');
        if (selectElement) {
            selectElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
            selectElement.tabIndex = 0;
        }
        common.toDispose.add(selectBox.onDidSelect(e => {
            template.onChange?.(e.index);
        }));
        const enumDescriptionElement = common.containerElement.insertBefore($('.setting-item-enumDescription'), common.descriptionElement.nextSibling);
        const template = {
            ...common,
            selectBox,
            selectElement,
            enumDescriptionElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        // Make shallow copies here so that we don't modify the actual dataElement later
        const enumItemLabels = dataElement.setting.enumItemLabels ? [...dataElement.setting.enumItemLabels] : [];
        const enumDescriptions = dataElement.setting.enumDescriptions ? [...dataElement.setting.enumDescriptions] : [];
        const settingEnum = [...dataElement.setting.enum];
        const enumDescriptionsAreMarkdown = dataElement.setting.enumDescriptionsAreMarkdown;
        const disposables = new DisposableStore();
        template.elementDisposables.add(disposables);
        let createdDefault = false;
        if (!settingEnum.includes(dataElement.defaultValue)) {
            // Add a new potentially blank default setting
            settingEnum.unshift(dataElement.defaultValue);
            enumDescriptions.unshift('');
            enumItemLabels.unshift('');
            createdDefault = true;
        }
        // Use String constructor in case of null or undefined values
        const stringifiedDefaultValue = escapeInvisibleChars(String(dataElement.defaultValue));
        const displayOptions = settingEnum
            .map(String)
            .map(escapeInvisibleChars)
            .map((data, index) => {
            const description = (enumDescriptions[index] && (enumDescriptionsAreMarkdown ? fixSettingLinks(enumDescriptions[index], false) : enumDescriptions[index]));
            return {
                text: enumItemLabels[index] ? enumItemLabels[index] : data,
                detail: enumItemLabels[index] ? data : '',
                description,
                descriptionIsMarkdown: enumDescriptionsAreMarkdown,
                descriptionMarkdownActionHandler: (content) => {
                    this._openerService.open(content).catch(onUnexpectedError);
                },
                decoratorRight: (((data === stringifiedDefaultValue) || (createdDefault && index === 0)) ? localize('settings.Default', "default") : '')
            };
        });
        template.selectBox.setOptions(displayOptions);
        template.selectBox.setAriaLabel(dataElement.setting.key);
        template.selectBox.setEnabled(!dataElement.hasPolicyValue);
        let idx = settingEnum.indexOf(dataElement.value);
        if (idx === -1) {
            idx = 0;
        }
        template.onChange = undefined;
        template.selectBox.select(idx);
        template.onChange = (idx) => {
            if (createdDefault && idx === 0) {
                onChange(dataElement.defaultValue);
            }
            else {
                onChange(settingEnum[idx]);
            }
        };
        template.enumDescriptionElement.innerText = '';
    }
}
const settingsNumberInputBoxStyles = getInputBoxStyle({
    inputBackground: settingsNumberInputBackground,
    inputForeground: settingsNumberInputForeground,
    inputBorder: settingsNumberInputBorder
});
class SettingNumberRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_NUMBER_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'number');
        const validationErrorMessageElement = DOM.append(common.containerElement, $('.setting-item-validation-message'));
        const inputBox = new InputBox(common.controlElement, this._contextViewService, { type: 'number', inputBoxStyles: settingsNumberInputBoxStyles });
        common.toDispose.add(inputBox);
        common.toDispose.add(inputBox.onDidChange(e => {
            template.onChange?.(e);
        }));
        common.toDispose.add(inputBox);
        inputBox.inputElement.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        inputBox.inputElement.tabIndex = 0;
        const template = {
            ...common,
            inputBox,
            validationErrorMessageElement
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        const numParseFn = (dataElement.valueType === 'integer' || dataElement.valueType === 'nullable-integer')
            ? parseInt : parseFloat;
        const nullNumParseFn = (dataElement.valueType === 'nullable-integer' || dataElement.valueType === 'nullable-number')
            ? ((v) => v === '' ? null : numParseFn(v)) : numParseFn;
        template.onChange = undefined;
        template.inputBox.value = typeof dataElement.value === 'number' ?
            dataElement.value.toString() : '';
        template.inputBox.step = dataElement.valueType.includes('integer') ? '1' : 'any';
        template.inputBox.setAriaLabel(dataElement.setting.key);
        template.inputBox.setEnabled(!dataElement.hasPolicyValue);
        template.onChange = value => {
            if (!renderValidations(dataElement, template, false)) {
                onChange(nullNumParseFn(value));
            }
        };
        renderValidations(dataElement, template, true);
    }
}
class SettingBoolRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_BOOL_TEMPLATE_ID;
    }
    renderTemplate(_container) {
        _container.classList.add('setting-item');
        _container.classList.add('setting-item-bool');
        const toDispose = new DisposableStore();
        const container = DOM.append(_container, $(AbstractSettingRenderer.CONTENTS_SELECTOR));
        container.classList.add('settings-row-inner-container');
        const titleElement = DOM.append(container, $('.setting-item-title'));
        const categoryElement = DOM.append(titleElement, $('span.setting-item-category'));
        const labelElementContainer = DOM.append(titleElement, $('span.setting-item-label'));
        const labelElement = toDispose.add(new SimpleIconLabel(labelElementContainer));
        const indicatorsLabel = toDispose.add(this._instantiationService.createInstance(SettingsTreeIndicatorsLabel, titleElement));
        const descriptionAndValueElement = DOM.append(container, $('.setting-item-value-description'));
        const controlElement = DOM.append(descriptionAndValueElement, $('.setting-item-bool-control'));
        const descriptionElement = DOM.append(descriptionAndValueElement, $('.setting-item-description'));
        const modifiedIndicatorElement = DOM.append(container, $('.setting-item-modified-indicator'));
        toDispose.add(this._hoverService.setupDelayedHover(modifiedIndicatorElement, {
            content: localize('modified', "The setting has been configured in the current scope.")
        }));
        const deprecationWarningElement = DOM.append(container, $('.setting-item-deprecation-message'));
        const checkbox = new Toggle({ icon: Codicon.check, actionClassName: 'setting-value-checkbox', isChecked: true, title: '', ...unthemedToggleStyles });
        controlElement.appendChild(checkbox.domNode);
        toDispose.add(checkbox);
        toDispose.add(checkbox.onChange(() => {
            template.onChange(checkbox.checked);
        }));
        checkbox.domNode.classList.add(AbstractSettingRenderer.CONTROL_CLASS);
        const toolbarContainer = DOM.append(container, $('.setting-toolbar-container'));
        const toolbar = this.renderSettingToolbar(toolbarContainer);
        toDispose.add(toolbar);
        const template = {
            toDispose,
            elementDisposables: toDispose.add(new DisposableStore()),
            containerElement: container,
            categoryElement,
            labelElement,
            controlElement,
            checkbox,
            descriptionElement,
            deprecationWarningElement,
            indicatorsLabel,
            toolbar
        };
        this.addSettingElementFocusHandler(template);
        // Prevent clicks from being handled by list
        toDispose.add(DOM.addDisposableListener(controlElement, 'mousedown', (e) => e.stopPropagation()));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_ENTER, e => container.classList.add('mouseover')));
        toDispose.add(DOM.addDisposableListener(titleElement, DOM.EventType.MOUSE_LEAVE, e => container.classList.remove('mouseover')));
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.onChange = undefined;
        template.checkbox.checked = dataElement.value;
        if (dataElement.hasPolicyValue) {
            template.checkbox.disable();
            template.descriptionElement.classList.add('disabled');
        }
        else {
            template.checkbox.enable();
            template.descriptionElement.classList.remove('disabled');
            // Need to listen for mouse clicks on description and toggle checkbox - use target ID for safety
            // Also have to ignore embedded links - too buried to stop propagation
            template.elementDisposables.add(DOM.addDisposableListener(template.descriptionElement, DOM.EventType.MOUSE_DOWN, (e) => {
                const targetElement = e.target;
                // Toggle target checkbox
                if (targetElement.tagName.toLowerCase() !== 'a') {
                    template.checkbox.checked = !template.checkbox.checked;
                    template.onChange(template.checkbox.checked);
                }
                DOM.EventHelper.stop(e);
            }));
        }
        template.checkbox.setTitle(dataElement.setting.key);
        template.onChange = onChange;
    }
}
class SettingsExtensionToggleRenderer extends AbstractSettingRenderer {
    constructor() {
        super(...arguments);
        this.templateId = SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
        this._onDidDismissExtensionSetting = this._register(new Emitter());
        this.onDidDismissExtensionSetting = this._onDidDismissExtensionSetting.event;
    }
    renderTemplate(_container) {
        const common = super.renderCommonTemplate(null, _container, 'extension-toggle');
        const actionButton = new Button(common.containerElement, {
            title: false,
            ...defaultButtonStyles
        });
        actionButton.element.classList.add('setting-item-extension-toggle-button');
        actionButton.label = localize('showExtension', "Show Extension");
        const dismissButton = new Button(common.containerElement, {
            title: false,
            secondary: true,
            ...defaultButtonStyles
        });
        dismissButton.element.classList.add('setting-item-extension-dismiss-button');
        dismissButton.label = localize('dismiss', "Dismiss");
        const template = {
            ...common,
            actionButton,
            dismissButton
        };
        this.addSettingElementFocusHandler(template);
        return template;
    }
    renderElement(element, index, templateData) {
        super.renderSettingElement(element, index, templateData);
    }
    renderValue(dataElement, template, onChange) {
        template.elementDisposables.clear();
        const extensionId = dataElement.setting.displayExtensionId;
        template.elementDisposables.add(template.actionButton.onDidClick(async () => {
            this._telemetryService.publicLog2('ManageExtensionClick', { extensionId });
            this._commandService.executeCommand('extension.open', extensionId);
        }));
        template.elementDisposables.add(template.dismissButton.onDidClick(async () => {
            this._telemetryService.publicLog2('DismissExtensionClick', { extensionId });
            this._onDidDismissExtensionSetting.fire(extensionId);
        }));
    }
}
let SettingTreeRenderers = class SettingTreeRenderers extends Disposable {
    constructor(_instantiationService, _contextMenuService, _contextViewService, _userDataSyncEnablementService) {
        super();
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._contextViewService = _contextViewService;
        this._userDataSyncEnablementService = _userDataSyncEnablementService;
        this._onDidChangeSetting = this._register(new Emitter());
        this.settingActions = [
            new Action('settings.resetSetting', localize('resetSettingLabel', "Reset Setting"), undefined, undefined, async (context) => {
                if (context instanceof SettingsTreeSettingElement) {
                    if (!context.isUntrusted) {
                        this._onDidChangeSetting.fire({
                            key: context.setting.key,
                            value: undefined,
                            type: context.setting.type,
                            manualReset: true,
                            scope: context.setting.scope
                        });
                    }
                }
            }),
            new Separator(),
            this._instantiationService.createInstance(CopySettingIdAction),
            this._instantiationService.createInstance(CopySettingAsJSONAction),
            this._instantiationService.createInstance(CopySettingAsURLAction),
        ];
        const actionFactory = (setting, settingTarget) => this.getActionsForSetting(setting, settingTarget);
        const emptyActionFactory = (_) => [];
        const extensionRenderer = this._instantiationService.createInstance(SettingsExtensionToggleRenderer, [], emptyActionFactory);
        const settingRenderers = [
            this._instantiationService.createInstance(SettingBoolRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingNumberRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingArrayRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingComplexObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingMultilineTextRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingExcludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingIncludeRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingEnumRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingObjectRenderer, this.settingActions, actionFactory),
            this._instantiationService.createInstance(SettingBoolObjectRenderer, this.settingActions, actionFactory),
            extensionRenderer
        ];
        this.onDidClickOverrideElement = Event.any(...settingRenderers.map(r => r.onDidClickOverrideElement));
        this.onDidChangeSetting = Event.any(...settingRenderers.map(r => r.onDidChangeSetting), this._onDidChangeSetting.event);
        this.onDidDismissExtensionSetting = extensionRenderer.onDidDismissExtensionSetting;
        this.onDidOpenSettings = Event.any(...settingRenderers.map(r => r.onDidOpenSettings));
        this.onDidClickSettingLink = Event.any(...settingRenderers.map(r => r.onDidClickSettingLink));
        this.onDidFocusSetting = Event.any(...settingRenderers.map(r => r.onDidFocusSetting));
        this.onDidChangeSettingHeight = Event.any(...settingRenderers.map(r => r.onDidChangeSettingHeight));
        this.onApplyFilter = Event.any(...settingRenderers.map(r => r.onApplyFilter));
        this.allRenderers = [
            ...settingRenderers,
            this._instantiationService.createInstance(SettingGroupRenderer),
            this._instantiationService.createInstance(SettingNewExtensionsRenderer),
        ];
    }
    getActionsForSetting(setting, settingTarget) {
        const actions = [];
        if (!(setting.scope && APPLICATION_SCOPES.includes(setting.scope)) && settingTarget === 3 /* ConfigurationTarget.USER_LOCAL */) {
            actions.push(this._instantiationService.createInstance(ApplySettingToAllProfilesAction, setting));
        }
        if (this._userDataSyncEnablementService.isEnabled() && !setting.disallowSyncIgnore) {
            actions.push(this._instantiationService.createInstance(SyncSettingAction, setting));
        }
        if (actions.length) {
            actions.splice(0, 0, new Separator());
        }
        return actions;
    }
    cancelSuggesters() {
        this._contextViewService.hideContextView();
    }
    showContextMenu(element, settingDOMElement) {
        // eslint-disable-next-line no-restricted-syntax
        const toolbarElement = settingDOMElement.querySelector('.monaco-toolbar');
        if (toolbarElement) {
            this._contextMenuService.showContextMenu({
                getActions: () => this.settingActions,
                getAnchor: () => toolbarElement,
                getActionsContext: () => element
            });
        }
    }
    getSettingDOMElementForDOMElement(domElement) {
        const parent = DOM.findParentWithClass(domElement, AbstractSettingRenderer.CONTENTS_CLASS);
        if (parent) {
            return parent;
        }
        return null;
    }
    getDOMElementsForSettingKey(treeContainer, key) {
        // eslint-disable-next-line no-restricted-syntax
        return treeContainer.querySelectorAll(`[${AbstractSettingRenderer.SETTING_KEY_ATTR}="${key}"]`);
    }
    getKeyForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_KEY_ATTR);
    }
    getIdForDOMElementInSetting(element) {
        const settingElement = this.getSettingDOMElementForDOMElement(element);
        return settingElement && settingElement.getAttribute(AbstractSettingRenderer.SETTING_ID_ATTR);
    }
    dispose() {
        super.dispose();
        this.settingActions.forEach(action => {
            if (isDisposable(action)) {
                action.dispose();
            }
        });
        this.allRenderers.forEach(renderer => {
            if (isDisposable(renderer)) {
                renderer.dispose();
            }
        });
    }
};
SettingTreeRenderers = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextMenuService),
    __param(2, IContextViewService),
    __param(3, IUserDataSyncEnablementService)
], SettingTreeRenderers);
export { SettingTreeRenderers };
/**
 * Validate and render any error message. Returns true if the value is invalid.
 */
function renderValidations(dataElement, template, calledOnStartup) {
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(template.inputBox.value);
        if (errMsg) {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', "Validation Error.");
            template.inputBox.inputElement.parentElement.setAttribute('aria-label', [validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.inputBox.inputElement.parentElement.removeAttribute('aria-label');
        }
    }
    template.containerElement.classList.remove('invalid-input');
    return false;
}
/**
 * Validate and render any error message for arrays. Returns true if the value is invalid.
 */
function renderArrayValidations(dataElement, template, value, calledOnStartup) {
    template.containerElement.classList.add('invalid-input');
    if (dataElement.setting.validator) {
        const errMsg = dataElement.setting.validator(value);
        if (errMsg && errMsg !== '') {
            template.containerElement.classList.add('invalid-input');
            template.validationErrorMessageElement.innerText = errMsg;
            const validationError = localize('validationError', "Validation Error.");
            template.containerElement.setAttribute('aria-label', [dataElement.setting.key, validationError, errMsg].join(' '));
            if (!calledOnStartup) {
                aria.status(validationError + ' ' + errMsg);
            }
            return true;
        }
        else {
            template.containerElement.setAttribute('aria-label', dataElement.setting.key);
            template.containerElement.classList.remove('invalid-input');
        }
    }
    return false;
}
function cleanRenderedMarkdown(element) {
    for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes.item(i);
        const tagName = child.tagName && child.tagName.toLowerCase();
        if (tagName === 'img') {
            child.remove();
        }
        else {
            cleanRenderedMarkdown(child);
        }
    }
}
function fixSettingLinks(text, linkify = true) {
    return text.replace(/`#([^#\s`]+)#`|'#([^#\s']+)#'/g, (match, backticksGroup, quotesGroup) => {
        const settingKey = backticksGroup ?? quotesGroup;
        const targetDisplayFormat = settingKeyToDisplayFormat(settingKey);
        const targetName = `${targetDisplayFormat.category}: ${targetDisplayFormat.label}`;
        return linkify ?
            `[${targetName}](#${settingKey} "${settingKey}")` :
            `"${targetName}"`;
    });
}
function escapeInvisibleChars(enumValue) {
    return enumValue && enumValue
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
let SettingsTreeFilter = class SettingsTreeFilter {
    constructor(viewState, environmentService) {
        this.viewState = viewState;
        this.environmentService = environmentService;
    }
    filter(element, parentVisibility) {
        // Filter during search
        if (this.viewState.filterToCategory && element instanceof SettingsTreeSettingElement) {
            if (!this.settingContainedInGroup(element.setting, this.viewState.filterToCategory)) {
                return false;
            }
        }
        // Non-user scope selected
        if (element instanceof SettingsTreeSettingElement && this.viewState.settingsTarget !== 3 /* ConfigurationTarget.USER_LOCAL */) {
            const isRemote = !!this.environmentService.remoteAuthority;
            if (!element.matchesScope(this.viewState.settingsTarget, isRemote)) {
                return false;
            }
        }
        // Group with no visible children
        if (element instanceof SettingsTreeGroupElement) {
            if (typeof element.count === 'number') {
                return element.count > 0;
            }
            return 2 /* TreeVisibility.Recurse */;
        }
        // Filtered "new extensions" button
        if (element instanceof SettingsTreeNewExtensionsElement) {
            if (this.viewState.tagFilters?.size || this.viewState.filterToCategory) {
                return false;
            }
        }
        return true;
    }
    settingContainedInGroup(setting, group) {
        return group.children.some(child => {
            if (child instanceof SettingsTreeGroupElement) {
                return this.settingContainedInGroup(setting, child);
            }
            else if (child instanceof SettingsTreeSettingElement) {
                return child.setting.key === setting.key;
            }
            else {
                return false;
            }
        });
    }
};
SettingsTreeFilter = __decorate([
    __param(1, IWorkbenchEnvironmentService)
], SettingsTreeFilter);
export { SettingsTreeFilter };
class SettingsTreeDelegate extends CachedListVirtualDelegate {
    getTemplateId(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return SETTINGS_ELEMENT_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeSettingElement) {
            if (element.valueType === SettingValueType.ExtensionToggle) {
                return SETTINGS_EXTENSION_TOGGLE_TEMPLATE_ID;
            }
            const invalidTypeError = element.isConfigured && getInvalidTypeError(element.value, element.setting.type);
            if (invalidTypeError) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Boolean) {
                return SETTINGS_BOOL_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Integer ||
                element.valueType === SettingValueType.Number ||
                element.valueType === SettingValueType.NullableInteger ||
                element.valueType === SettingValueType.NullableNumber) {
                return SETTINGS_NUMBER_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.MultilineString) {
                return SETTINGS_MULTILINE_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.String) {
                return SETTINGS_TEXT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Enum) {
                return SETTINGS_ENUM_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Array) {
                return SETTINGS_ARRAY_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Exclude) {
                return SETTINGS_EXCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Include) {
                return SETTINGS_INCLUDE_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.Object) {
                return SETTINGS_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.BooleanObject) {
                return SETTINGS_BOOL_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.ComplexObject) {
                return SETTINGS_COMPLEX_OBJECT_TEMPLATE_ID;
            }
            if (element.valueType === SettingValueType.LanguageTag) {
                return SETTINGS_COMPLEX_TEMPLATE_ID;
            }
            return SETTINGS_COMPLEX_TEMPLATE_ID;
        }
        if (element instanceof SettingsTreeNewExtensionsElement) {
            return SETTINGS_NEW_EXTENSIONS_TEMPLATE_ID;
        }
        throw new Error('unknown element type: ' + element);
    }
    hasDynamicHeight(element) {
        return !(element instanceof SettingsTreeGroupElement);
    }
    estimateHeight(element) {
        if (element instanceof SettingsTreeGroupElement) {
            return 42;
        }
        return element instanceof SettingsTreeSettingElement && element.valueType === SettingValueType.Boolean ? 78 : 104;
    }
}
export class NonCollapsibleObjectTreeModel extends ObjectTreeModel {
    isCollapsible(element) {
        return false;
    }
    setCollapsed(element, collapsed, recursive) {
        return false;
    }
}
class SettingsTreeAccessibilityProvider {
    constructor(configurationService, languageService, userDataProfilesService) {
        this.configurationService = configurationService;
        this.languageService = languageService;
        this.userDataProfilesService = userDataProfilesService;
    }
    getAriaLabel(element) {
        if (element instanceof SettingsTreeSettingElement) {
            const ariaLabelSections = [];
            ariaLabelSections.push(`${element.displayCategory} ${element.displayLabel}.`);
            if (element.isConfigured) {
                const modifiedText = localize('settings.Modified', 'Modified.');
                ariaLabelSections.push(modifiedText);
            }
            const indicatorsLabelAriaLabel = getIndicatorsLabelAriaLabel(element, this.configurationService, this.userDataProfilesService, this.languageService);
            if (indicatorsLabelAriaLabel.length) {
                ariaLabelSections.push(`${indicatorsLabelAriaLabel}.`);
            }
            const descriptionWithoutSettingLinks = renderAsPlaintext({ value: fixSettingLinks(element.description, false) });
            if (descriptionWithoutSettingLinks.length) {
                ariaLabelSections.push(descriptionWithoutSettingLinks);
            }
            return ariaLabelSections.join(' ');
        }
        else if (element instanceof SettingsTreeGroupElement) {
            return element.label;
        }
        else {
            return element.id;
        }
    }
    getWidgetAriaLabel() {
        return localize('settings', "Settings");
    }
}
let SettingsTree = class SettingsTree extends WorkbenchObjectTree {
    constructor(container, viewState, renderers, contextKeyService, listService, configurationService, instantiationService, languageService, userDataProfilesService) {
        super('SettingsTree', container, new SettingsTreeDelegate(), renderers, {
            horizontalScrolling: false,
            supportDynamicHeights: true,
            scrollToActiveElement: true,
            identityProvider: {
                getId(e) {
                    return e.id;
                }
            },
            accessibilityProvider: new SettingsTreeAccessibilityProvider(configurationService, languageService, userDataProfilesService),
            styleController: id => new DefaultStyleController(domStylesheetsJs.createStyleSheet(container), id),
            filter: instantiationService.createInstance(SettingsTreeFilter, viewState),
            smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling'),
            multipleSelectionSupport: false,
            findWidgetEnabled: false,
            renderIndentGuides: RenderIndentGuides.None,
            transformOptimization: false // Disable transform optimization #177470
        }, instantiationService, contextKeyService, listService, configurationService);
        this.getHTMLElement().classList.add('settings-editor-tree');
        this.style(getListStyles({
            listBackground: editorBackground,
            listActiveSelectionBackground: editorBackground,
            listActiveSelectionForeground: foreground,
            listFocusAndSelectionBackground: editorBackground,
            listFocusAndSelectionForeground: foreground,
            listFocusBackground: editorBackground,
            listFocusForeground: foreground,
            listHoverForeground: foreground,
            listHoverBackground: editorBackground,
            listHoverOutline: editorBackground,
            listFocusOutline: editorBackground,
            listInactiveSelectionBackground: editorBackground,
            listInactiveSelectionForeground: foreground,
            listInactiveFocusBackground: editorBackground,
            listInactiveFocusOutline: editorBackground,
            treeIndentGuidesStroke: undefined,
            treeInactiveIndentGuidesStroke: undefined,
        }));
        this.disposables.add(configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.list.smoothScrolling')) {
                this.updateOptions({
                    smoothScrolling: configurationService.getValue('workbench.list.smoothScrolling')
                });
            }
        }));
    }
    createModel(user, options) {
        return new NonCollapsibleObjectTreeModel(user, options);
    }
};
SettingsTree = __decorate([
    __param(3, IContextKeyService),
    __param(4, IListService),
    __param(5, IWorkbenchConfigurationService),
    __param(6, IInstantiationService),
    __param(7, ILanguageService),
    __param(8, IUserDataProfilesService)
], SettingsTree);
export { SettingsTree };
let CopySettingIdAction = class CopySettingIdAction extends Action {
    static { CopySettingIdAction_1 = this; }
    static { this.ID = 'settings.copySettingId'; }
    static { this.LABEL = localize('copySettingIdLabel', "Copy Setting ID"); }
    constructor(clipboardService) {
        super(CopySettingIdAction_1.ID, CopySettingIdAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            await this.clipboardService.writeText(context.setting.key);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingIdAction = CopySettingIdAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingIdAction);
let CopySettingAsJSONAction = class CopySettingAsJSONAction extends Action {
    static { CopySettingAsJSONAction_1 = this; }
    static { this.ID = 'settings.copySettingAsJSON'; }
    static { this.LABEL = localize('copySettingAsJSONLabel', "Copy Setting as JSON"); }
    constructor(clipboardService) {
        super(CopySettingAsJSONAction_1.ID, CopySettingAsJSONAction_1.LABEL);
        this.clipboardService = clipboardService;
    }
    async run(context) {
        if (context) {
            const jsonResult = `"${context.setting.key}": ${JSON.stringify(context.value, undefined, '  ')}`;
            await this.clipboardService.writeText(jsonResult);
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsJSONAction = CopySettingAsJSONAction_1 = __decorate([
    __param(0, IClipboardService)
], CopySettingAsJSONAction);
let CopySettingAsURLAction = class CopySettingAsURLAction extends Action {
    static { CopySettingAsURLAction_1 = this; }
    static { this.ID = 'settings.copySettingAsURL'; }
    static { this.LABEL = localize('copySettingAsURLLabel', "Copy Setting as URL"); }
    constructor(clipboardService, productService) {
        super(CopySettingAsURLAction_1.ID, CopySettingAsURLAction_1.LABEL);
        this.clipboardService = clipboardService;
        this.productService = productService;
    }
    async run(context) {
        if (context) {
            const settingKey = context.setting.key;
            const product = this.productService.urlProtocol;
            const uri = URI.from({ scheme: product, authority: SETTINGS_AUTHORITY, path: `/${settingKey}` }, true);
            await this.clipboardService.writeText(uri.toString());
        }
        return Promise.resolve(undefined);
    }
};
CopySettingAsURLAction = CopySettingAsURLAction_1 = __decorate([
    __param(0, IClipboardService),
    __param(1, IProductService)
], CopySettingAsURLAction);
let SyncSettingAction = class SyncSettingAction extends Action {
    static { SyncSettingAction_1 = this; }
    static { this.ID = 'settings.stopSyncingSetting'; }
    static { this.LABEL = localize('stopSyncingSetting', "Sync This Setting"); }
    constructor(setting, configService) {
        super(SyncSettingAction_1.ID, SyncSettingAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, e => e.affectsConfiguration('settingsSync.ignoredSettings'))(() => this.update()));
        this.update();
    }
    async update() {
        const ignoredSettings = getIgnoredSettings(getDefaultIgnoredSettings(), this.configService);
        this.checked = !ignoredSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        let currentValue = [...this.configService.getValue('settingsSync.ignoredSettings')];
        currentValue = currentValue.filter(v => v !== this.setting.key && v !== `-${this.setting.key}`);
        const defaultIgnoredSettings = getDefaultIgnoredSettings();
        const isDefaultIgnored = defaultIgnoredSettings.includes(this.setting.key);
        const askedToSync = !this.checked;
        // If asked to sync, then add only if it is ignored by default
        if (askedToSync && isDefaultIgnored) {
            currentValue.push(`-${this.setting.key}`);
        }
        // If asked not to sync, then add only if it is not ignored by default
        if (!askedToSync && !isDefaultIgnored) {
            currentValue.push(this.setting.key);
        }
        this.configService.updateValue('settingsSync.ignoredSettings', currentValue.length ? currentValue : undefined, 2 /* ConfigurationTarget.USER */);
        return Promise.resolve(undefined);
    }
};
SyncSettingAction = SyncSettingAction_1 = __decorate([
    __param(1, IConfigurationService)
], SyncSettingAction);
let ApplySettingToAllProfilesAction = class ApplySettingToAllProfilesAction extends Action {
    static { ApplySettingToAllProfilesAction_1 = this; }
    static { this.ID = 'settings.applyToAllProfiles'; }
    static { this.LABEL = localize('applyToAllProfiles', "Apply Setting to all Profiles"); }
    constructor(setting, configService) {
        super(ApplySettingToAllProfilesAction_1.ID, ApplySettingToAllProfilesAction_1.LABEL);
        this.setting = setting;
        this.configService = configService;
        this._register(Event.filter(configService.onDidChangeConfiguration, e => e.affectsConfiguration(APPLY_ALL_PROFILES_SETTING))(() => this.update()));
        this.update();
    }
    update() {
        const allProfilesSettings = this.configService.getValue(APPLY_ALL_PROFILES_SETTING);
        this.checked = allProfilesSettings.includes(this.setting.key);
    }
    async run() {
        // first remove the current setting completely from ignored settings
        const value = this.configService.getValue(APPLY_ALL_PROFILES_SETTING) ?? [];
        if (this.checked) {
            value.splice(value.indexOf(this.setting.key), 1);
        }
        else {
            value.push(this.setting.key);
        }
        const newValue = distinct(value);
        if (this.checked) {
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).application?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
        else {
            await this.configService.updateValue(APPLY_ALL_PROFILES_SETTING, newValue.length ? newValue : undefined, 3 /* ConfigurationTarget.USER_LOCAL */);
            await this.configService.updateValue(this.setting.key, this.configService.inspect(this.setting.key).userLocal?.value, 3 /* ConfigurationTarget.USER_LOCAL */);
        }
    }
};
ApplySettingToAllProfilesAction = ApplySettingToAllProfilesAction_1 = __decorate([
    __param(1, IWorkbenchConfigurationService)
], ApplySettingToAllProfilesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvcHJlZmVyZW5jZXMvYnJvd3Nlci9zZXR0aW5nc1RyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3ZELE9BQU8sS0FBSyxnQkFBZ0IsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVqRixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFpQixRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMzRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNyRixPQUFPLEVBQUUsc0JBQXNCLEVBQThCLE1BQU0sZ0RBQWdELENBQUM7QUFDcEgsT0FBTyxFQUFxQixTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNsRyxPQUFPLEVBQUUsTUFBTSxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFD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