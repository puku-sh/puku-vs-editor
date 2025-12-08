"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const arrays_1 = require("../../../util/vs/base/common/arrays");
const copilotTokenStore_1 = require("../../authentication/common/copilotTokenStore");
const packagejson_1 = require("../../env/common/packagejson");
const configurationService_1 = require("../common/configurationService");
// Helper to avoid JSON.stringify quoting strings
function stringOrStringify(value) {
    if (typeof value === 'string') {
        return value;
    }
    return JSON.stringify(value);
}
let ConfigurationServiceImpl = class ConfigurationServiceImpl extends configurationService_1.AbstractConfigurationService {
    constructor(copilotTokenStore) {
        super(copilotTokenStore);
        this.config = vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix);
        // Reload cached config if a workspace config change effects Copilot namespace
        vscode.workspace.onDidChangeConfiguration(changeEvent => {
            if (changeEvent.affectsConfiguration(configurationService_1.CopilotConfigPrefix)) {
                this.config = vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix);
            }
            this._onDidChangeConfiguration.fire({
                affectsConfiguration: (section, scope) => {
                    if (changeEvent.affectsConfiguration(section, scope)) {
                        return true;
                    }
                    const oldId = configurationService_1.globalConfigRegistry.configs.get(section)?.fullyQualifiedOldId;
                    if (oldId && changeEvent.affectsConfiguration(oldId, scope)) {
                        return true;
                    }
                    return false;
                }
            });
        });
    }
    getConfig(key, scope) {
        if (key.options?.valueIgnoredForExternals && !this._isInternal) {
            // If the setting is restricted to internal users and the user is not internal, we return the default value
            return this.getDefaultValue(key);
        }
        const config = scope === undefined ? this.config : vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix, scope);
        let configuredValue;
        if (key.advancedSubKey) {
            // This is a `puku.advanced.*` setting
            // First, let's try to read it using the flat style
            // e.g. "puku.advanced.debug.useElectronFetcher": false
            const advancedConfigFlatStyleValue = config.get(key.id);
            if (advancedConfigFlatStyleValue !== undefined) {
                configuredValue = advancedConfigFlatStyleValue;
            }
            else {
                // If that doesn't work, fall back to the object style
                // e.g. "puku.advanced": { "debug.useElectronFetcher": false }
                const advancedConfig = config.get('advanced');
                configuredValue = advancedConfig?.[key.advancedSubKey];
            }
        }
        else {
            const hasCustomDefaultValue = (configurationService_1.ConfigValueValidators.isDefaultValueWithTeamAndInternalValue(key.defaultValue)
                || configurationService_1.ConfigValueValidators.isDefaultValueWithTeamValue(key.defaultValue));
            const userIsInternalOrTeamMember = (this._isInternal || this._isTeamMember);
            if (key.isPublic && hasCustomDefaultValue && userIsInternalOrTeamMember) {
                // The setting is public, but it has a different default value for team
                // or internal users, so the (public) default value used by vscode is not the same.
                // We need to really check if the user or workspace configured the setting
                if (this.isConfigured(key, scope)) {
                    configuredValue = config.get(key.id) ?? (key.oldId ? config.get(key.oldId) : undefined);
                }
            }
            else {
                if (key.oldId && key.oldId.startsWith('chat.advanced')) {
                    // Migrated advanced settings were not registered before
                    // So when not configured the default value from config API is undefined
                    // and the default value is obtained from the registered Config<T>.
                    // Therefore, to get the same behavior as before
                    // we need to check if the migrated setting is configured
                    // and take only the configured value and let the default value be obtained from the registered Config<T>.
                    if (this.isConfigured(key, scope)) {
                        configuredValue = config.get(key.id) ?? (key.oldId ? config.get(key.oldId) : undefined);
                    }
                }
                else {
                    configuredValue = config.get(key.id) ?? (key.oldId ? config.get(key.oldId) : undefined);
                }
            }
        }
        if (configuredValue === undefined) {
            return this.getDefaultValue(key);
        }
        if (!key.validator) {
            return configuredValue;
        }
        const value = key.validator.validate(configuredValue);
        if (value.error) {
            console.error(`Could not read "${key.fullyQualifiedId}": ${value.error.message}`);
            return this.getDefaultValue(key);
        }
        return value.content;
    }
    inspectConfig(key, scope) {
        if (key.options?.valueIgnoredForExternals && !this._isInternal) {
            return { defaultValue: this.getDefaultValue(key) };
        }
        const config = scope === undefined ? this.config : vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix, scope);
        const inspectResult = config.inspect(key.id);
        if (!key.oldId) {
            return inspectResult;
        }
        const oldInspectResult = config.inspect(key.oldId);
        const languageIds = (0, arrays_1.distinct)([...inspectResult?.languageIds ?? [], ...oldInspectResult?.languageIds ?? []]);
        return {
            defaultValue: inspectResult?.defaultValue ?? oldInspectResult?.defaultValue,
            globalValue: inspectResult?.globalValue ?? oldInspectResult?.globalValue,
            workspaceValue: inspectResult?.workspaceValue ?? oldInspectResult?.workspaceValue,
            workspaceFolderValue: inspectResult?.workspaceFolderValue ?? oldInspectResult?.workspaceFolderValue,
            defaultLanguageValue: inspectResult?.defaultLanguageValue ?? oldInspectResult?.defaultLanguageValue,
            globalLanguageValue: inspectResult?.globalLanguageValue ?? oldInspectResult?.globalLanguageValue,
            workspaceLanguageValue: inspectResult?.workspaceLanguageValue ?? oldInspectResult?.workspaceLanguageValue,
            workspaceFolderLanguageValue: inspectResult?.workspaceFolderLanguageValue ?? oldInspectResult?.workspaceFolderLanguageValue,
            languageIds: languageIds.length ? languageIds : undefined,
        };
    }
    getNonExtensionConfig(configKey) {
        return vscode.workspace.getConfiguration().get(configKey);
    }
    _getTargetFromInspect(inspect) {
        let target;
        // When we get a config using this service, we have no idea which settings file it came from
        // however, Copilot is more of a "prefer-global" extension, so this logic basically overwrites
        // the value where it was set, but if it was not set, it will set it globally.
        // This way, the user does not have to set the same value in multiple workspaces.
        // TODO: Should we handle language overrides?
        if (!inspect) {
            target = vscode.ConfigurationTarget.Global;
        }
        else if (inspect.workspaceFolderValue !== undefined) {
            target = vscode.ConfigurationTarget.WorkspaceFolder;
        }
        else if (inspect.workspaceValue !== undefined) {
            target = vscode.ConfigurationTarget.Workspace;
        }
        else {
            target = vscode.ConfigurationTarget.Global;
        }
        return target;
    }
    setConfig(key, value) {
        if (key.advancedSubKey) {
            // This is a `puku.advanced.*` setting
            // We support two styles when reading these settings:
            // 1. Flat style: "puku.advanced.debug.useElectronFetcher": false
            //    This is the style our team likes to use, but this is not the correct way according to how the setting is registered in package.json.
            // 2. Object style: "puku.advanced": { "debug.useElectronFetcher": false }
            //    This is the style that the package.json schema expects, and is the correct way to write these settings.
            // Unfortunately, the configuration API of vscode is unable to write the flat style setting, it refuses to write them.
            // So we can only write the object style setting.
            // But having both styles in the same settings.json file is very finnicky, as the object style will override the flat style
            // and there is no user warning that this is happening.
            // If the setting is already written using the flat style, we unfortunately cannot touch it
            const flatConfigStyle = this.config.inspect(key.id);
            const hasFlatStyle = (flatConfigStyle?.globalValue !== undefined
                || flatConfigStyle?.workspaceFolderValue !== undefined
                || flatConfigStyle?.workspaceValue !== undefined);
            if (hasFlatStyle) {
                throw new Error(`Cannot write to "${key.fullyQualifiedId}". Please update the setting manually to ${JSON.stringify(value)}.`);
            }
            let currentValue = this.config.get('advanced');
            if (!currentValue) {
                currentValue = {
                    [key.advancedSubKey]: value
                };
            }
            else {
                currentValue[key.advancedSubKey] = value;
            }
            return this.config.update('advanced', currentValue, this._getTargetFromInspect(this.config.inspect('advanced')));
        }
        return this.config.update(key.id, value, this._getTargetFromInspect(this.config.inspect(key.id)));
    }
    getExperimentBasedConfig(key, experimentationService, scope) {
        const configuredValue = this._getUserConfiguredValueForExperimentBasedConfig(key, scope);
        if (configuredValue !== undefined) {
            return configuredValue;
        }
        if (key.experimentName) {
            const expValue = experimentationService.getTreatmentVariable(key.experimentName);
            if (expValue !== undefined) {
                return expValue;
            }
        }
        // This is the pattern we've been using for a while now. We need to maintain it for older experiments.
        const expValue = experimentationService.getTreatmentVariable(`copilotchat.config.${key.id}`);
        if (expValue !== undefined) {
            return expValue;
        }
        // This is the pattern vscode uses for settings using the `onExp` tag. But vscode only supports it for
        // settings defined in package.json, so this is why we're also reading the value from exp here.
        const expValue2 = experimentationService.getTreatmentVariable(`config.${key.fullyQualifiedId}`);
        if (expValue2 !== undefined) {
            return expValue2;
        }
        if (key.fullyQualifiedOldId) {
            const oldExpValue = experimentationService.getTreatmentVariable(`copilotchat.config.${key.oldId}`);
            if (oldExpValue !== undefined) {
                return oldExpValue;
            }
            const oldExpValue2 = experimentationService.getTreatmentVariable(`config.${key.fullyQualifiedOldId}`);
            if (oldExpValue2 !== undefined) {
                return oldExpValue2;
            }
        }
        return this.getDefaultValue(key);
    }
    _getUserConfiguredValueForExperimentBasedConfig(key, scope) {
        if (key.options?.valueIgnoredForExternals && !this._isInternal) {
            // If the setting is restricted to internal users and the user is not internal, we return the default value
            return undefined;
        }
        const config = scope === undefined ? this.config : vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix, scope);
        if (!this.isConfigured(key, scope)) {
            // The user did not configure this setting
            return undefined;
        }
        return config.get(key.id) ?? (key.oldId ? config.get(key.oldId) : undefined);
    }
    // Dumps config settings defined in the extension json
    dumpConfig() {
        const configProperties = {};
        try {
            const config = packagejson_1.packageJson.contributes.configuration;
            const propertyGroups = config.map((c) => c.properties);
            const extensionConfigProps = Object.assign({}, ...propertyGroups);
            for (const key in extensionConfigProps) {
                const localKey = key.replace(`${configurationService_1.CopilotConfigPrefix}.`, '');
                const value = localKey.split('.').reduce((o, i) => o[i], this.config);
                if (typeof value === 'object' && value !== null) {
                    // Dump objects as their properties, filtering secret_key
                    Object.keys(value)
                        .filter(k => k !== 'secret_key')
                        .forEach(k => (configProperties[`${key}.${k}`] = stringOrStringify(value[k])));
                }
                else {
                    configProperties[key] = stringOrStringify(value);
                }
            }
        }
        catch (ex) {
            // cannot use logger.error which makes a telemetry call
            console.error(`Failed to retrieve configuration properties ${ex}`);
        }
        return configProperties;
    }
    updateExperimentBasedConfiguration(treatments) {
        if (treatments.length === 0) {
            return;
        }
        // Refresh cached config, in case of an exp based config change
        this.config = vscode.workspace.getConfiguration(configurationService_1.CopilotConfigPrefix);
        // Fire simulated event which checks if a configuration is affected in the treatments
        this._onDidChangeConfiguration.fire({
            affectsConfiguration: (section, _scope) => {
                if (treatments.some(t => t.startsWith(`config.${section}`))) {
                    return true;
                }
                const oldId = configurationService_1.globalConfigRegistry.configs.get(section)?.fullyQualifiedOldId;
                if (oldId && treatments.some(t => t.startsWith(`config.${oldId}`))) {
                    return true;
                }
                return false;
            }
        });
    }
};
exports.ConfigurationServiceImpl = ConfigurationServiceImpl;
exports.ConfigurationServiceImpl = ConfigurationServiceImpl = __decorate([
    __param(0, copilotTokenStore_1.ICopilotTokenStore)
], ConfigurationServiceImpl);
//# sourceMappingURL=configurationServiceImpl.js.map