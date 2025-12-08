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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigKey = exports.XTabProviderId = exports.AuthPermissionMode = exports.AuthProviderId = exports.HARD_TOOL_LIMIT = exports.ConfigurationMigrationRegistry = exports.globalConfigRegistry = exports.ConfigValueValidators = exports.AbstractConfigurationService = exports.IConfigurationService = exports.CopilotConfigPrefix = void 0;
exports.getAllConfigKeys = getAllConfigKeys;
exports.registerNextEditProviderId = registerNextEditProviderId;
const services_1 = require("../../../util/common/services");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const hash_1 = require("../../../util/vs/base/common/hash");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const objects = __importStar(require("../../../util/vs/base/common/objects"));
const observable_1 = require("../../../util/vs/base/common/observable");
const types = __importStar(require("../../../util/vs/base/common/types"));
const packagejson_1 = require("../../env/common/packagejson");
const nextCursorLinePrediction_1 = require("../../inlineEdits/common/dataTypes/nextCursorLinePrediction");
const xtabPromptOptions = __importStar(require("../../inlineEdits/common/dataTypes/xtabPromptOptions"));
const xtabPromptOptions_1 = require("../../inlineEdits/common/dataTypes/xtabPromptOptions");
const responseProcessor_1 = require("../../inlineEdits/common/responseProcessor");
const alternativeContentFormat_1 = require("../../notebook/common/alternativeContentFormat");
const validator_1 = require("./validator");
exports.CopilotConfigPrefix = 'puku';
exports.IConfigurationService = (0, services_1.createServiceIdentifier)('IConfigurationService');
class AbstractConfigurationService extends lifecycle_1.Disposable {
    constructor(copilotTokenStore) {
        super();
        this._onDidChangeConfiguration = this._register(new event_1.Emitter());
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._isInternal = false;
        this._isTeamMember = false;
        this._teamMemberUsername = undefined;
        this.observables = new Map();
        if (copilotTokenStore) {
            this._register(copilotTokenStore.onDidStoreUpdate(() => {
                const isTeamMember = !!copilotTokenStore.copilotToken?.isVscodeTeamMember;
                this._setUserInfo({
                    isInternal: !!copilotTokenStore.copilotToken?.isInternal,
                    isTeamMember,
                    teamMemberUsername: isTeamMember ? copilotTokenStore.copilotToken?.username : undefined
                });
            }));
        }
    }
    getConfigMixedWithDefaults(key) {
        if (key.options?.valueIgnoredForExternals && !this._isInternal) {
            return this.getDefaultValue(key);
        }
        const userValue = this.getConfig(key);
        // if user doesn't override the setting, return the default
        if (userValue === undefined) {
            return this.getDefaultValue(key);
        }
        // if user overrides the setting and the setting is an object, combine default with user value, with the preference to user settings
        if (types.isObject(userValue) && types.isObject(key.defaultValue)) {
            // If default is an object apply the default and then apply the setting
            return { ...key.defaultValue, ...userValue };
        }
        return userValue;
    }
    getDefaultValue(key) {
        if (ConfigValueValidators.isDefaultValueWithTeamAndInternalValue(key.defaultValue)) {
            return this._isUsingTeamDefault(key)
                ? key.defaultValue.teamDefaultValue
                : this._isInternal
                    ? key.defaultValue.internalDefaultValue
                    : key.defaultValue.defaultValue;
        }
        if (ConfigValueValidators.isDefaultValueWithTeamValue(key.defaultValue)) {
            return this._isUsingTeamDefault(key) ? key.defaultValue.teamDefaultValue : key.defaultValue.defaultValue;
        }
        return key.defaultValue;
    }
    _setUserInfo(userInfo) {
        if (this._isInternal === userInfo.isInternal && this._isTeamMember === userInfo.isTeamMember && this._teamMemberUsername === userInfo.teamMemberUsername) {
            // no change
            return;
        }
        this._isInternal = userInfo.isInternal;
        this._isTeamMember = userInfo.isTeamMember;
        this._teamMemberUsername = userInfo.teamMemberUsername;
        // fire a fake change event to refresh all settings
        this._onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
    }
    updateExperimentBasedConfiguration(treatments) {
        if (treatments.length === 0) {
            return;
        }
        this._onDidChangeConfiguration.fire({ affectsConfiguration: () => true });
    }
    getConfigObservable(key) {
        return this._getObservable_$show2FramesUp(key, () => this.getConfig(key));
    }
    getExperimentBasedConfigObservable(key, experimentationService) {
        return this._getObservable_$show2FramesUp(key, () => this.getExperimentBasedConfig(key, experimentationService));
    }
    _getObservable_$show2FramesUp(key, getValue) {
        let observable = this.observables.get(key.id);
        if (!observable) {
            observable = (0, observable_1.observableFromEventOpts)({ debugName: () => `Configuration Key "${key.id}"` }, (handleChange) => this._register(this.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(key.fullyQualifiedId)) {
                    handleChange(e);
                }
            })), getValue);
            this.observables.set(key.id, observable);
        }
        return observable;
    }
    _isUsingTeamDefault(key) {
        if (!this._isTeamMember) {
            return false;
        }
        if (!ConfigValueValidators.isDefaultValueWithTeamAndInternalValue(key.defaultValue)
            && !ConfigValueValidators.isDefaultValueWithTeamValue(key.defaultValue)) {
            return false;
        }
        const rolloutRatio = key.defaultValue.teamDefaultValueRollout;
        if (rolloutRatio === undefined || rolloutRatio >= 1) {
            return true;
        }
        const selectedValue = `${key.fullyQualifiedId};${this._teamMemberUsername}`;
        // Extract first 4 bytes and convert to a number between 0 and 1
        const hashValue = AbstractConfigurationService._extractHashValue(selectedValue);
        // Compare with rolloutRatio to determine if the user should get the feature
        return hashValue < rolloutRatio;
    }
    /**
     * Extracts a normalized value (0-1) from a string
     */
    static _extractHashValue(input) {
        const hash = new hash_1.StringSHA1();
        hash.update(input);
        const firstPortion = hash.digest().substring(0, 8);
        // Convert from hex to number
        const hashNumber = parseInt(firstPortion, 16);
        // Normalize to a value between 0 and 1
        return (hashNumber / 0xFFFFFFFF);
    }
    /**
     * Checks if the key is configured by the user in any of the configuration scopes.
     */
    isConfigured(key, scope) {
        const inspect = this.inspectConfig(key, scope);
        const isConfigured = (inspect?.globalValue !== undefined
            || inspect?.globalLanguageValue !== undefined
            || inspect?.workspaceFolderValue !== undefined
            || inspect?.workspaceFolderLanguageValue !== undefined
            || inspect?.workspaceValue !== undefined
            || inspect?.workspaceLanguageValue !== undefined);
        return isConfigured;
    }
}
exports.AbstractConfigurationService = AbstractConfigurationService;
var ConfigValueValidators;
(function (ConfigValueValidators) {
    function isDefaultValueWithTeamValue(value) {
        return types.isObject(value) && 'defaultValue' in value && 'teamDefaultValue' in value;
    }
    ConfigValueValidators.isDefaultValueWithTeamValue = isDefaultValueWithTeamValue;
    function isDefaultValueWithTeamAndInternalValue(value) {
        return ConfigValueValidators.isDefaultValueWithTeamValue(value) && 'internalDefaultValue' in value;
    }
    ConfigValueValidators.isDefaultValueWithTeamAndInternalValue = isDefaultValueWithTeamAndInternalValue;
})(ConfigValueValidators || (exports.ConfigValueValidators = ConfigValueValidators = {}));
/**
 * Indicates that a setting can not be configured by external users
 */
const INTERNAL_RESTRICTED = {
    internal: true,
    valueIgnoredForExternals: true,
};
let packageJsonDefaults = undefined;
function getPackageJsonDefaults() {
    if (!packageJsonDefaults) {
        packageJsonDefaults = new Map();
        // Use the information in packageJson
        const config = packagejson_1.packageJson.contributes.configuration;
        const propertyGroups = config.map((c) => c.properties);
        const configProps = Object.assign({}, ...propertyGroups);
        for (const key in configProps) {
            packageJsonDefaults.set(key, configProps[key].default);
        }
    }
    return packageJsonDefaults;
}
function toBaseConfig(key, defaultValue, options) {
    const fullyQualifiedId = `${exports.CopilotConfigPrefix}.${key}`;
    const fullyQualifiedOldId = options?.oldKey ? `${exports.CopilotConfigPrefix}.${options.oldKey}` : undefined;
    const packageJsonDefaults = getPackageJsonDefaults();
    const isPublic = packageJsonDefaults.has(fullyQualifiedId);
    const packageJsonDefaultValue = packageJsonDefaults.get(fullyQualifiedId);
    if (isPublic) {
        // make sure the default in the code matches the default in packageJson
        const publicDefaultValue = (ConfigValueValidators.isDefaultValueWithTeamAndInternalValue(defaultValue)
            ? defaultValue.defaultValue
            : ConfigValueValidators.isDefaultValueWithTeamValue(defaultValue)
                ? defaultValue.defaultValue
                : defaultValue);
        if (!objects.equals(publicDefaultValue, packageJsonDefaultValue)) {
            throw new errors_1.BugIndicatingError(`The default value for setting ${key} is different in packageJson and in code`);
        }
    }
    if (isPublic && options?.internal) {
        throw new errors_1.BugIndicatingError(`The setting ${key} is public, it therefore cannot be marked internal!`);
    }
    if (isPublic && options?.valueIgnoredForExternals) {
        throw new errors_1.BugIndicatingError(`The setting ${key} is public, it therefore cannot be restricted to internal!`);
    }
    if (ConfigValueValidators.isDefaultValueWithTeamAndInternalValue(defaultValue)
        || ConfigValueValidators.isDefaultValueWithTeamValue(defaultValue)) {
        const rolloutRatio = defaultValue?.teamDefaultValueRollout;
        if (rolloutRatio !== undefined && (rolloutRatio < 0 || rolloutRatio > 1)) {
            throw new errors_1.BugIndicatingError(`The rollout ratio for setting ${key} is invalid`);
        }
    }
    const advancedSubKey = fullyQualifiedId.startsWith('puku.advanced.') ? fullyQualifiedId.substring('puku.advanced.'.length) : undefined;
    return { id: key, oldId: options?.oldKey, isPublic, fullyQualifiedId, fullyQualifiedOldId, advancedSubKey, defaultValue, options };
}
class ConfigRegistry {
    constructor() {
        /**
         * A map of all registered configs, keyed by their full id, eg `puku.advanced.debug.overrideProxyUrl`.
         */
        this.configs = new Map();
    }
    registerConfig(config) {
        this.configs.set(config.fullyQualifiedId, config);
    }
}
exports.globalConfigRegistry = new ConfigRegistry();
class ConfigurationMigrationRegistryImpl {
    constructor() {
        this.migrations = [];
        this._onDidRegisterConfigurationMigrations = new event_1.Emitter();
        this.onDidRegisterConfigurationMigration = this._onDidRegisterConfigurationMigrations.event;
    }
    registerConfigurationMigrations(configurationMigrations) {
        this.migrations.push(...configurationMigrations);
        this._onDidRegisterConfigurationMigrations.fire(configurationMigrations);
    }
}
exports.ConfigurationMigrationRegistry = new ConfigurationMigrationRegistryImpl();
function defineValidatedSetting(key, validator, defaultValue, options) {
    const value = { ...toBaseConfig(key, defaultValue, options), configType: 0 /* ConfigType.Simple */, validator };
    exports.globalConfigRegistry.registerConfig(value);
    return value;
}
function defineSetting(key, defaultValue, options) {
    const value = { ...toBaseConfig(key, defaultValue, options), configType: 0 /* ConfigType.Simple */ };
    exports.globalConfigRegistry.registerConfig(value);
    return value;
}
/**
 * Will define a setting which will be backed by an experiment. The experiment variable will be:
 * ```
 *     config.puku.${key}
 *
 * e.g.
 *     config.puku.chat.advanced.inlineEdits.internalRollout
 * ```
 */
function defineExpSetting(key, defaultValue, options, expOptions) {
    const value = { ...toBaseConfig(key, defaultValue, options), configType: 1 /* ConfigType.ExperimentBased */, experimentName: expOptions?.experimentName };
    if (value.advancedSubKey) {
        // This is a `puku.advanced.*` setting
        throw new errors_1.BugIndicatingError('Shared settings cannot be experiment based');
    }
    exports.globalConfigRegistry.registerConfig(value);
    return value;
}
function migrateSetting(newKey, oldKey) {
    exports.ConfigurationMigrationRegistry.registerConfigurationMigrations([{
            key: `${exports.CopilotConfigPrefix}.${oldKey}`,
            migrateFn: async (migrationValue) => {
                return [
                    [`${exports.CopilotConfigPrefix}.${newKey}`, { value: migrationValue }],
                    [`${exports.CopilotConfigPrefix}.${oldKey}`, { value: undefined }]
                ];
            }
        }]);
}
function defineAndMigrateSetting(oldKey, newKey, defaultValue, options) {
    migrateSetting(newKey, oldKey);
    return defineSetting(newKey, defaultValue, { ...options, oldKey });
}
function defineAndMigrateExpSetting(oldKey, newKey, defaultValue, options, expOptions) {
    migrateSetting(newKey, oldKey);
    return defineExpSetting(newKey, defaultValue, { ...options, oldKey }, expOptions);
}
// Max CAPI tool count limit
exports.HARD_TOOL_LIMIT = 128;
var AuthProviderId;
(function (AuthProviderId) {
    AuthProviderId["GitHub"] = "github";
    AuthProviderId["GitHubEnterprise"] = "github-enterprise";
    AuthProviderId["Microsoft"] = "microsoft";
})(AuthProviderId || (exports.AuthProviderId = AuthProviderId = {}));
var AuthPermissionMode;
(function (AuthPermissionMode) {
    AuthPermissionMode["Default"] = "default";
    AuthPermissionMode["Minimal"] = "minimal";
})(AuthPermissionMode || (exports.AuthPermissionMode = AuthPermissionMode = {}));
exports.XTabProviderId = 'XtabProvider';
var ConfigKey;
(function (ConfigKey) {
    /**
     * These settings are defined in the completions extensions and shared.
     *
     * We should not change the names of these settings without coordinating with Completions extension.
    */
    let Shared;
    (function (Shared) {
        /** Allows for overriding the base domain we use for making requests to the CAPI. This helps CAPI devs develop against a local instance. */
        Shared.DebugOverrideProxyUrl = defineSetting('advanced.debug.overrideProxyUrl', undefined);
        Shared.DebugOverrideCAPIUrl = defineSetting('advanced.debug.overrideCapiUrl', undefined);
        Shared.DebugUseNodeFetchFetcher = defineSetting('advanced.debug.useNodeFetchFetcher', true);
        Shared.DebugUseNodeFetcher = defineSetting('advanced.debug.useNodeFetcher', false);
        Shared.DebugUseElectronFetcher = defineSetting('advanced.debug.useElectronFetcher', true);
        Shared.AuthProvider = defineSetting('advanced.authProvider', AuthProviderId.GitHub);
        Shared.AuthPermissions = defineSetting('advanced.authPermissions', AuthPermissionMode.Default);
    })(Shared = ConfigKey.Shared || (ConfigKey.Shared = {}));
    /**
     * Advanced experimental settings that are available for all users to configure.
     * These should only be in this list temporarily. Either should be made stable or removed.
     */
    let AdvancedExperimental;
    (function (AdvancedExperimental) {
        /** Allows forcing a particular model.
         * Note: this should not be used while self-hosting because it might lead to
         * a fundamental different experience compared to our end-users.
        */
        AdvancedExperimental.DebugOverrideChatEngine = defineAndMigrateSetting('chat.advanced.debug.overrideChatEngine', 'chat.debug.overrideChatEngine', undefined);
        AdvancedExperimental.WorkspacePrototypeAdoCodeSearchEndpointOverride = defineAndMigrateSetting('chat.advanced.workspace.prototypeAdoCodeSearchEndpointOverride', 'chat.workspace.prototypeAdoCodeSearchEndpointOverride', '');
        AdvancedExperimental.FeedbackOnChange = defineAndMigrateSetting('chat.advanced.feedback.onChange', 'chat.feedback.onChange', false);
        AdvancedExperimental.ReviewIntent = defineAndMigrateSetting('chat.advanced.review.intent', 'chat.review.intent', false);
        /** Enable the new notebook priorities experiment */
        AdvancedExperimental.NotebookSummaryExperimentEnabled = defineAndMigrateSetting('chat.advanced.notebook.summaryExperimentEnabled', 'chat.notebook.summaryExperimentEnabled', false);
        /** Enable filtering variables by cell document symbols */
        AdvancedExperimental.NotebookVariableFilteringEnabled = defineAndMigrateSetting('chat.advanced.notebook.variableFilteringEnabled', 'chat.notebook.variableFilteringEnabled', false);
        AdvancedExperimental.TerminalToDebuggerPatterns = defineAndMigrateSetting('chat.advanced.debugTerminalCommandPatterns', 'chat.debugTerminalCommandPatterns', []);
        AdvancedExperimental.WorkspaceRecordingEnabled = defineAndMigrateSetting('chat.advanced.localWorkspaceRecording.enabled', 'chat.localWorkspaceRecording.enabled', false);
        AdvancedExperimental.EditRecordingEnabled = defineAndMigrateSetting('chat.advanced.editRecording.enabled', 'chat.editRecording.enabled', false);
        AdvancedExperimental.CodeSearchAgentEnabled = defineAndMigrateSetting('chat.advanced.codesearch.agent.enabled', 'chat.codesearch.agent.enabled', true);
        AdvancedExperimental.AgentTemperature = defineAndMigrateSetting('chat.advanced.agent.temperature', 'chat.agent.temperature', undefined);
        AdvancedExperimental.EnableUserPreferences = defineAndMigrateSetting('chat.advanced.enableUserPreferences', 'chat.enableUserPreferences', false);
        AdvancedExperimental.SummarizeAgentConversationHistoryThreshold = defineAndMigrateSetting('chat.advanced.summarizeAgentConversationHistoryThreshold', 'chat.summarizeAgentConversationHistoryThreshold', undefined);
        AdvancedExperimental.AgentHistorySummarizationMode = defineAndMigrateSetting('chat.advanced.agentHistorySummarizationMode', 'chat.agentHistorySummarizationMode', undefined);
        AdvancedExperimental.UseResponsesApiTruncation = defineAndMigrateSetting('chat.advanced.useResponsesApiTruncation', 'chat.useResponsesApiTruncation', false);
        AdvancedExperimental.OmitBaseAgentInstructions = defineAndMigrateSetting('chat.advanced.omitBaseAgentInstructions', 'chat.omitBaseAgentInstructions', false);
        AdvancedExperimental.ClaudeCodeDebugEnabled = defineAndMigrateSetting('chat.advanced.claudeCode.debug', 'chat.claudeCode.debug', false);
        AdvancedExperimental.CopilotCLIEnabled = defineAndMigrateSetting('chat.advanced.copilotCLI.enabled', 'chat.copilotCLI.enabled', true);
        AdvancedExperimental.GitHistoryRelatedFilesUsingEmbeddings = defineAndMigrateSetting('chat.advanced.suggestRelatedFilesFromGitHistory.useEmbeddings', 'chat.suggestRelatedFilesFromGitHistory.useEmbeddings', false);
        AdvancedExperimental.CLIIsolationEnabled = defineAndMigrateSetting('chat.advanced.cli.isolation.enabled', 'chat.cli.isolation.enabled', false);
        AdvancedExperimental.CLIMCPServerEnabled = defineAndMigrateSetting('chat.advanced.cli.mcp.enabled', 'chat.cli.mcp.enabled', false);
        // Unused
        AdvancedExperimental.EditSourceTrackingShowDecorations = defineAndMigrateSetting('chat.advanced.editSourceTracking.showDecorations', 'chat.editSourceTracking.showDecorations', false);
        AdvancedExperimental.EditSourceTrackingShowStatusBar = defineAndMigrateSetting('chat.advanced.editSourceTracking.showStatusBar', 'chat.editSourceTracking.showStatusBar', false);
        AdvancedExperimental.EnableClaudeCodeAgent = defineAndMigrateSetting('chat.advanced.claudeCode.enabled', 'chat.claudeCode.enabled', false);
    })(AdvancedExperimental = ConfigKey.AdvancedExperimental || (ConfigKey.AdvancedExperimental = {}));
    /**
     * Advanced experimental settings that are available for all users to configure and controlled by experiments.
     * These should only be in this list temporarily. Either should be made stable or removed.
     */
    let AdvancedExperimentalExperiments;
    (function (AdvancedExperimentalExperiments) {
        /** Uses new expanded project labels */
        AdvancedExperimentalExperiments.ProjectLabelsExpanded = defineAndMigrateExpSetting('chat.advanced.projectLabels.expanded', 'chat.projectLabels.expanded', false);
        /** Add project labels in default agent */
        AdvancedExperimentalExperiments.ProjectLabelsChat = defineAndMigrateExpSetting('chat.advanced.projectLabels.chat', 'chat.projectLabels.chat', false);
        /** Add project labels in default agent */
        AdvancedExperimentalExperiments.ProjectLabelsInline = defineAndMigrateExpSetting('chat.advanced.projectLabels.inline', 'chat.projectLabels.inline', false);
        AdvancedExperimentalExperiments.WorkspaceMaxLocalIndexSize = defineAndMigrateExpSetting('chat.advanced.workspace.maxLocalIndexSize', 'chat.workspace.maxLocalIndexSize', 100_000);
        AdvancedExperimentalExperiments.WorkspaceEnableFullWorkspace = defineAndMigrateExpSetting('chat.advanced.workspace.enableFullWorkspace', 'chat.workspace.enableFullWorkspace', true);
        AdvancedExperimentalExperiments.WorkspaceEnableCodeSearch = defineAndMigrateExpSetting('chat.advanced.workspace.enableCodeSearch', 'chat.workspace.enableCodeSearch', true);
        AdvancedExperimentalExperiments.WorkspaceEnableEmbeddingsSearch = defineAndMigrateExpSetting('chat.advanced.workspace.enableEmbeddingsSearch', 'chat.workspace.enableEmbeddingsSearch', true);
        AdvancedExperimentalExperiments.WorkspacePreferredEmbeddingsModel = defineAndMigrateExpSetting('chat.advanced.workspace.preferredEmbeddingsModel', 'chat.workspace.preferredEmbeddingsModel', '');
        AdvancedExperimentalExperiments.NotebookAlternativeDocumentFormat = defineAndMigrateExpSetting('chat.advanced.notebook.alternativeFormat', 'chat.notebook.alternativeFormat', alternativeContentFormat_1.AlternativeNotebookFormat.xml);
        AdvancedExperimentalExperiments.UseAlternativeNESNotebookFormat = defineAndMigrateExpSetting('chat.advanced.notebook.alternativeNESFormat.enabled', 'chat.notebook.alternativeNESFormat.enabled', false);
        /** Configure temporal context max age */
        AdvancedExperimentalExperiments.TemporalContextMaxAge = defineAndMigrateExpSetting('chat.advanced.temporalContext.maxAge', 'chat.temporalContext.maxAge', 100);
        AdvancedExperimentalExperiments.TemporalContextPreferSameLang = defineAndMigrateExpSetting('chat.advanced.temporalContext.preferSameLang', 'chat.temporalContext.preferSameLang', false);
        AdvancedExperimentalExperiments.InstantApplyShortModelName = defineAndMigrateExpSetting('chat.advanced.instantApply.shortContextModelName', 'chat.instantApply.shortContextModelName', "gpt-4o-instant-apply-full-ft-v66-short" /* CHAT_MODEL.SHORT_INSTANT_APPLY */);
        AdvancedExperimentalExperiments.InstantApplyShortContextLimit = defineAndMigrateExpSetting('chat.advanced.instantApply.shortContextLimit', 'chat.instantApply.shortContextLimit', 8000);
        AdvancedExperimentalExperiments.AgentHistorySummarizationWithPromptCache = defineAndMigrateExpSetting('chat.advanced.agentHistorySummarizationWithPromptCache', 'chat.agentHistorySummarizationWithPromptCache', false);
        AdvancedExperimentalExperiments.AgentHistorySummarizationForceGpt41 = defineAndMigrateExpSetting('chat.advanced.agentHistorySummarizationForceGpt41', 'chat.agentHistorySummarizationForceGpt41', false);
        AdvancedExperimentalExperiments.PromptFileContext = defineAndMigrateExpSetting('chat.advanced.promptFileContextProvider.enabled', 'chat.promptFileContextProvider.enabled', true);
        AdvancedExperimentalExperiments.DefaultToolsGrouped = defineAndMigrateExpSetting('chat.advanced.tools.defaultToolsGrouped', 'chat.tools.defaultToolsGrouped', false);
        AdvancedExperimentalExperiments.Gpt5AlternativePatch = defineAndMigrateExpSetting('chat.advanced.gpt5AlternativePatch', 'chat.gpt5AlternativePatch', false);
        AdvancedExperimentalExperiments.InlineEditsTriggerOnEditorChangeAfterSeconds = defineAndMigrateExpSetting('chat.advanced.inlineEdits.triggerOnEditorChangeAfterSeconds', 'chat.inlineEdits.triggerOnEditorChangeAfterSeconds', { defaultValue: undefined, teamDefaultValue: 10 });
        AdvancedExperimentalExperiments.InlineEditsNextCursorPredictionDisplayLine = defineAndMigrateExpSetting('chat.advanced.inlineEdits.nextCursorPrediction.displayLine', 'chat.inlineEdits.nextCursorPrediction.displayLine', true);
        AdvancedExperimentalExperiments.InlineEditsNextCursorPredictionCurrentFileMaxTokens = defineAndMigrateExpSetting('chat.advanced.inlineEdits.nextCursorPrediction.currentFileMaxTokens', 'chat.inlineEdits.nextCursorPrediction.currentFileMaxTokens', xtabPromptOptions.DEFAULT_OPTIONS.currentFile.maxTokens);
        // Unused
        AdvancedExperimentalExperiments.VirtualToolEmbeddingRanking = defineAndMigrateExpSetting('chat.advanced.virtualTools.embeddingRanking', 'chat.virtualTools.embeddingRanking', false);
        AdvancedExperimentalExperiments.MultiReplaceStringGrok = defineAndMigrateExpSetting('chat.advanced.multiReplaceStringGrok.enabled', 'chat.multiReplaceStringGrok.enabled', false);
    })(AdvancedExperimentalExperiments = ConfigKey.AdvancedExperimentalExperiments || (ConfigKey.AdvancedExperimentalExperiments = {}));
    /**
     * Internal settings those only team members can configure
     * Features should only be in this list temporarily, moving on to experimental to be accessible to early adopters.
    */
    let Internal;
    (function (Internal) {
        /** Allows forcing a particular context window size.
         * This setting doesn't validate values so large windows may not be supported by the model.
         * Note: this should not be used while self-hosting because it might lead to
         * a fundamental different experience compared to our end-users.
         */
        Internal.DebugOverrideChatMaxTokenNum = defineSetting('chat.advanced.debug.overrideChatMaxTokenNum', 0, INTERNAL_RESTRICTED);
        /** Allow reporting issue when clicking on the Unhelpful button
         * Requires a window reload to take effect
         */
        Internal.DebugReportFeedback = defineSetting('chat.advanced.debug.reportFeedback', { defaultValue: false, teamDefaultValue: true }, INTERNAL_RESTRICTED);
        Internal.DebugCollectFetcherTelemetry = defineExpSetting('chat.advanced.debug.collectFetcherTelemetry', true, INTERNAL_RESTRICTED);
        Internal.DebugExpUseNodeFetchFetcher = defineExpSetting('chat.advanced.debug.useNodeFetchFetcher', undefined, INTERNAL_RESTRICTED);
        Internal.DebugExpUseNodeFetcher = defineExpSetting('chat.advanced.debug.useNodeFetcher', undefined, INTERNAL_RESTRICTED);
        Internal.DebugExpUseElectronFetcher = defineExpSetting('chat.advanced.debug.useElectronFetcher', undefined, INTERNAL_RESTRICTED);
        Internal.RequestLoggerMaxEntries = defineSetting('chat.advanced.debug.requestLogger.maxEntries', 100);
        Internal.InlineEditsIgnoreCompletionsDisablement = defineValidatedSetting('chat.advanced.inlineEdits.ignoreCompletionsDisablement', (0, validator_1.vBoolean)(), false, INTERNAL_RESTRICTED);
        Internal.InlineEditsAsyncCompletions = defineExpSetting('chat.advanced.inlineEdits.asyncCompletions', true, INTERNAL_RESTRICTED);
        Internal.InlineEditsDebounceUseCoreRequestTime = defineExpSetting('chat.advanced.inlineEdits.debounceUseCoreRequestTime', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsYieldToCopilot = defineExpSetting('chat.advanced.inlineEdits.yieldToCopilot', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsExcludedProviders = defineExpSetting('chat.advanced.inlineEdits.excludedProviders', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsEnableCompletionsProvider = defineExpSetting('chat.advanced.inlineEdits.completionsProvider.enabled', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsEnableGhCompletionsProvider = defineExpSetting('chat.advanced.inlineEdits.githubCompletionsProvider.enabled', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsCompletionsUrl = defineExpSetting('chat.advanced.inlineEdits.completionsProvider.url', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsLogContextRecorderEnabled = defineSetting('chat.advanced.inlineEdits.logContextRecorder.enabled', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsDebounce = defineExpSetting('chat.advanced.inlineEdits.debounce', 200, INTERNAL_RESTRICTED);
        Internal.InlineEditsCacheDelay = defineExpSetting('chat.advanced.inlineEdits.cacheDelay', 300, INTERNAL_RESTRICTED);
        Internal.InlineEditsSubsequentCacheDelay = defineExpSetting('chat.advanced.inlineEdits.subsequentCacheDelay', 0, INTERNAL_RESTRICTED);
        Internal.InlineEditsRebasedCacheDelay = defineExpSetting('chat.advanced.inlineEdits.rebasedCacheDelay', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsBackoffDebounceEnabled = defineExpSetting('chat.advanced.inlineEdits.backoffDebounceEnabled', true, INTERNAL_RESTRICTED);
        Internal.InlineEditsExtraDebounceEndOfLine = defineExpSetting('chat.advanced.inlineEdits.extraDebounceEndOfLine', 0, INTERNAL_RESTRICTED);
        Internal.InlineEditsDebounceOnSelectionChange = defineExpSetting('chat.advanced.inlineEdits.debounceOnSelectionChange', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsProviderId = defineExpSetting('chat.advanced.inlineEdits.providerId', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsHideInternalInterface = defineValidatedSetting('chat.advanced.inlineEdits.hideInternalInterface', (0, validator_1.vBoolean)(), false, INTERNAL_RESTRICTED);
        Internal.InlineEditsLogCancelledRequests = defineValidatedSetting('chat.advanced.inlineEdits.logCancelledRequests', (0, validator_1.vBoolean)(), false, INTERNAL_RESTRICTED);
        Internal.InlineEditsUnification = defineExpSetting('chat.advanced.inlineEdits.unification', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsNextCursorPredictionEnabled = defineExpSetting('chat.advanced.inlineEdits.nextCursorPrediction.enabled', { defaultValue: undefined, teamDefaultValue: nextCursorLinePrediction_1.NextCursorLinePrediction.OnlyWithEdit }, INTERNAL_RESTRICTED);
        Internal.InlineEditsNextCursorPredictionModelName = defineExpSetting('chat.advanced.inlineEdits.nextCursorPrediction.modelName', { defaultValue: undefined, teamDefaultValue: "xtab-cursor-jump-1104" }, INTERNAL_RESTRICTED);
        Internal.InlineEditsNextCursorPredictionUrl = defineValidatedSetting('chat.advanced.inlineEdits.nextCursorPrediction.url', (0, validator_1.vString)(), undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsNextCursorPredictionApiKey = defineValidatedSetting('chat.advanced.inlineEdits.nextCursorPrediction.apiKey', (0, validator_1.vString)(), undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderUrl = defineValidatedSetting('chat.advanced.inlineEdits.xtabProvider.url', (0, validator_1.vString)(), undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderApiKey = defineValidatedSetting('chat.advanced.inlineEdits.xtabProvider.apiKey', (0, validator_1.vString)(), undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderModelConfiguration = defineValidatedSetting('chat.advanced.inlineEdits.xtabProvider.modelConfiguration', xtabPromptOptions.MODEL_CONFIGURATION_VALIDATOR, { defaultValue: undefined, teamDefaultValue: { modelName: "copilot-nes-oct", promptingStrategy: xtabPromptOptions.PromptingStrategy.Xtab275, includeTagsInCurrentFile: false } }, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderModelConfigurationString = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.modelConfigurationString', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderDefaultModelConfigurationString = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.defaultModelConfigurationString', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsInlineCompletionsEnabled = defineValidatedSetting('chat.advanced.inlineEdits.inlineCompletions.enabled', (0, validator_1.vBoolean)(), true, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderUsePrediction = defineValidatedSetting('chat.advanced.inlineEdits.xtabProvider.usePrediction', (0, validator_1.vBoolean)(), true, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderUseVaryingLinesAbove = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.useVaryingLinesAbove', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderNLinesAbove = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.nLinesAbove', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderNLinesBelow = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.nLinesBelow', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderRetryWithNMoreLinesBelow = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.retryWithNMoreLinesBelow', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsAutoExpandEditWindowLines = defineExpSetting('chat.advanced.inlineEdits.autoExpandEditWindowLines', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabNRecentlyViewedDocuments = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.nRecentlyViewedDocuments', xtabPromptOptions.DEFAULT_OPTIONS.recentlyViewedDocuments.nDocuments, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabRecentlyViewedDocumentsMaxTokens = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.recentlyViewedDocuments.maxTokens', xtabPromptOptions.DEFAULT_OPTIONS.recentlyViewedDocuments.maxTokens, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabDiffNEntries = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.diffNEntries', xtabPromptOptions.DEFAULT_OPTIONS.diffHistory.nEntries, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabDiffMaxTokens = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.diffMaxTokens', xtabPromptOptions.DEFAULT_OPTIONS.diffHistory.maxTokens, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabProviderEmitFastCursorLineChange = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.emitFastCursorLineChange', true, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabIncludeViewedFiles = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.includeViewedFiles', xtabPromptOptions.DEFAULT_OPTIONS.recentlyViewedDocuments.includeViewedFiles, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabPageSize = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.pageSize', xtabPromptOptions.DEFAULT_OPTIONS.pagedClipping.pageSize, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabEditWindowMaxTokens = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.editWindowMaxTokens', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabIncludeTagsInCurrentFile = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.includeTagsInCurrentFile', xtabPromptOptions.DEFAULT_OPTIONS.currentFile.includeTags, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabCurrentFileMaxTokens = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.currentFileMaxTokens', xtabPromptOptions.DEFAULT_OPTIONS.currentFile.maxTokens, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabPrioritizeAboveCursor = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.currentFile.prioritizeAboveCursor', xtabPromptOptions.DEFAULT_OPTIONS.currentFile.prioritizeAboveCursor, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabDiffOnlyForDocsInPrompt = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.diffOnlyForDocsInPrompt', xtabPromptOptions.DEFAULT_OPTIONS.diffHistory.onlyForDocsInPrompt, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabDiffUseRelativePaths = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.diffUseRelativePaths', xtabPromptOptions.DEFAULT_OPTIONS.diffHistory.useRelativePaths, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabNNonSignificantLinesToConverge = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.nNonSignificantLinesToConverge', responseProcessor_1.ResponseProcessor.DEFAULT_DIFF_PARAMS.nLinesToConverge, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabNSignificantLinesToConverge = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.nSignificantLinesToConverge', responseProcessor_1.ResponseProcessor.DEFAULT_DIFF_PARAMS.nSignificantLinesToConverge, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabLanguageContextEnabled = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.languageContext.enabled', xtabPromptOptions.DEFAULT_OPTIONS.languageContext.enabled, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabLanguageContextEnabledLanguages = defineSetting('chat.advanced.inlineEdits.xtabProvider.languageContext.enabledLanguages', xtabPromptOptions_1.LANGUAGE_CONTEXT_ENABLED_LANGUAGES, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabLanguageContextMaxTokens = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.languageContext.maxTokens', xtabPromptOptions.DEFAULT_OPTIONS.languageContext.maxTokens, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabMaxMergeConflictLines = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.maxMergeConflictLines', undefined, INTERNAL_RESTRICTED);
        Internal.InlineEditsXtabOnlyMergeConflictLines = defineExpSetting('chat.advanced.inlineEdits.xtabProvider.onlyMergeConflictLines', false, INTERNAL_RESTRICTED);
        Internal.InlineEditsUndoInsertionFiltering = defineExpSetting('chat.advanced.inlineEdits.undoInsertionFiltering', 'v1', INTERNAL_RESTRICTED);
        Internal.InlineEditsDiagnosticsExplorationEnabled = defineSetting('chat.advanced.inlineEdits.inlineEditsDiagnosticsExplorationEnabled', false, INTERNAL_RESTRICTED);
        Internal.InternalWelcomeHintEnabled = defineSetting('chat.advanced.welcomePageHint.enabled', { defaultValue: false, internalDefaultValue: true, teamDefaultValue: true }, INTERNAL_RESTRICTED);
        Internal.InlineChatUseCodeMapper = defineSetting('chat.advanced.inlineChat.useCodeMapper', false, INTERNAL_RESTRICTED);
        Internal.InstantApplyModelName = defineExpSetting('chat.advanced.instantApply.modelName', 'gpt-4o-instant-apply-full-ft-v66', INTERNAL_RESTRICTED);
        Internal.VerifyTextDocumentChanges = defineExpSetting('chat.advanced.inlineEdits.verifyTextDocumentChanges', false, INTERNAL_RESTRICTED);
        Internal.DiagnosticsContextProvider = defineExpSetting('chat.advanced.inlineEdits.diagnosticsContextProvider.enabled', true);
        // TODO: @sandy081 - These should be moved away from this namespace
        Internal.EnableReadFileV2 = defineExpSetting('chat.advanced.enableReadFileV2', packagejson_1.isPreRelease);
        Internal.AskAgent = defineExpSetting('chat.advanced.enableAskAgent', { defaultValue: false, teamDefaultValue: true, internalDefaultValue: true });
    })(Internal = ConfigKey.Internal || (ConfigKey.Internal = {}));
    ConfigKey.Enable = defineSetting('enable', {
        "*": true,
        "plaintext": false,
        "markdown": false,
        "scminput": false
    });
    ConfigKey.selectedCompletionsModel = defineSetting('selectedCompletionModel', '');
    /** Use the Responses API instead of Chat Completions when supported */
    ConfigKey.UseResponsesApi = defineExpSetting('chat.useResponsesApi', true);
    /** Configure reasoning effort sent to Responses API */
    ConfigKey.ResponsesApiReasoningEffort = defineExpSetting('chat.responsesApiReasoningEffort', 'default');
    /** Configure reasoning summary style sent to Responses API */
    ConfigKey.ResponsesApiReasoningSummary = defineExpSetting('chat.responsesApiReasoningSummary', 'detailed');
    ConfigKey.EnableChatImageUpload = defineExpSetting('chat.imageUpload.enabled', true);
    /** Enable extended thinking for Anthropic models that support it */
    ConfigKey.AnthropicThinkingEnabled = defineExpSetting('chat.anthropic.thinking.enabled', false);
    /** Maximum thinking tokens for Anthropic extended thinking. If set, overrides the default calculation. */
    ConfigKey.MaxAnthropicThinkingTokens = defineSetting('chat.anthropic.thinking.maxTokens', null);
    /** Enable Anthropic web search tool for BYOK Claude models */
    ConfigKey.AnthropicWebSearchToolEnabled = defineExpSetting('chat.anthropic.tools.websearch.enabled', false);
    /** Maximum number of web searches allowed per request */
    ConfigKey.AnthropicWebSearchMaxUses = defineSetting('chat.anthropic.tools.websearch.maxUses', 5);
    /** List of domains to restrict web search results to */
    ConfigKey.AnthropicWebSearchAllowedDomains = defineSetting('chat.anthropic.tools.websearch.allowedDomains', []);
    /** List of domains to exclude from web search results */
    ConfigKey.AnthropicWebSearchBlockedDomains = defineSetting('chat.anthropic.tools.websearch.blockedDomains', []);
    /** User location for personalizing web search results */
    ConfigKey.AnthropicWebSearchUserLocation = defineSetting('chat.anthropic.tools.websearch.userLocation', null);
    /** Enable memory tool */
    ConfigKey.MemoryToolEnabled = defineExpSetting('chat.tools.memory.enabled', false);
    /** User provided code generation instructions for the chat */
    ConfigKey.CodeGenerationInstructions = defineSetting('chat.codeGeneration.instructions', []);
    ConfigKey.TestGenerationInstructions = defineSetting('chat.testGeneration.instructions', []);
    ConfigKey.CommitMessageGenerationInstructions = defineSetting('chat.commitMessageGeneration.instructions', []);
    ConfigKey.PullRequestDescriptionGenerationInstructions = defineSetting('chat.pullRequestDescriptionGeneration.instructions', []);
    /** Show code lens "Generate tests" when we have test coverage info about this symbol and it's not covered */
    ConfigKey.GenerateTestsCodeLens = defineSetting('chat.generateTests.codeLens', false);
    /** Whether new flows around setting up tests are enabled */
    ConfigKey.SetupTests = defineSetting('chat.setupTests.enabled', true);
    /** Whether the Copilot TypeScript context provider is enabled and if how */
    ConfigKey.TypeScriptLanguageContext = defineExpSetting('chat.languageContext.typescript.enabled', false);
    ConfigKey.TypeScriptLanguageContextMode = defineExpSetting('chat.languageContext.typescript.items', 'minimal');
    ConfigKey.TypeScriptLanguageContextIncludeDocumentation = defineExpSetting('chat.languageContext.typescript.includeDocumentation', false);
    ConfigKey.TypeScriptLanguageContextCacheTimeout = defineExpSetting('chat.languageContext.typescript.cacheTimeout', 500);
    ConfigKey.TypeScriptLanguageContextFix = defineExpSetting('chat.languageContext.fix.typescript.enabled', false);
    ConfigKey.TypeScriptLanguageContextInline = defineExpSetting('chat.languageContext.inline.typescript.enabled', false);
    ConfigKey.UseInstructionFiles = defineSetting('chat.codeGeneration.useInstructionFiles', true);
    ConfigKey.ReviewAgent = defineSetting('chat.reviewAgent.enabled', true);
    ConfigKey.CodeFeedback = defineSetting('chat.reviewSelection.enabled', true);
    ConfigKey.CodeFeedbackInstructions = defineSetting('chat.reviewSelection.instructions', []);
    ConfigKey.UseProjectTemplates = defineSetting('chat.useProjectTemplates', true);
    ConfigKey.ExplainScopeSelection = defineSetting('chat.scopeSelection', false);
    ConfigKey.EnableCodeActions = defineSetting('editor.enableCodeActions', true);
    ConfigKey.LocaleOverride = defineSetting('chat.localeOverride', 'auto');
    ConfigKey.TerminalChatLocation = defineSetting('chat.terminalChatLocation', 'chatView');
    ConfigKey.AutomaticRenameSuggestions = defineSetting('renameSuggestions.triggerAutomatically', true);
    ConfigKey.GitHistoryRelatedFilesProvider = defineSetting('chat.edits.suggestRelatedFilesFromGitHistory', true);
    ConfigKey.Test2SrcRelatedFilesProvider = defineSetting('chat.edits.suggestRelatedFilesForTests', true);
    ConfigKey.TerminalToDebuggerEnabled = defineSetting('chat.copilotDebugCommand.enabled', true);
    ConfigKey.CodeSearchAgentEnabled = defineSetting('chat.codesearch.enabled', false);
    ConfigKey.InlineEditsEnabled = defineExpSetting('nextEditSuggestions.enabled', { defaultValue: false, teamDefaultValue: true });
    ConfigKey.InlineEditsEnableDiagnosticsProvider = defineExpSetting('nextEditSuggestions.fixes', { defaultValue: true, teamDefaultValue: true });
    ConfigKey.InlineEditsAllowWhitespaceOnlyChanges = defineExpSetting('nextEditSuggestions.allowWhitespaceOnlyChanges', true);
    ConfigKey.NewWorkspaceCreationAgentEnabled = defineSetting('chat.newWorkspaceCreation.enabled', true);
    ConfigKey.NewWorkspaceUseContext7 = defineSetting('chat.newWorkspace.useContext7', false);
    ConfigKey.SummarizeAgentConversationHistory = defineSetting('chat.summarizeAgentConversationHistory.enabled', true);
    ConfigKey.VirtualToolThreshold = defineExpSetting('chat.virtualTools.threshold', exports.HARD_TOOL_LIMIT);
    ConfigKey.CurrentEditorAgentContext = defineSetting('chat.agent.currentEditorContext.enabled', true);
    /** Puku AI */
    ConfigKey.PukuAIEndpoint = defineSetting('pukuai.endpoint', 'https://api.puku.sh');
    ConfigKey.PukuAIModel = defineSetting('pukuai.model', 'puku-ai');
    /** BYOK  */
    ConfigKey.OllamaEndpoint = defineSetting('chat.byok.ollamaEndpoint', 'http://localhost:11434');
    ConfigKey.AzureModels = defineSetting('chat.azureModels', {});
    ConfigKey.CustomOAIModels = defineSetting('chat.customOAIModels', {});
    ConfigKey.AutoFixDiagnostics = defineExpSetting('chat.agent.autoFix', true);
    ConfigKey.NotebookFollowCellExecution = defineSetting('chat.notebook.followCellExecution.enabled', false);
    ConfigKey.UseAlternativeNESNotebookFormat = defineExpSetting('chat.notebook.enhancedNextEditSuggestions.enabled', false);
    ConfigKey.CustomInstructionsInSystemMessage = defineSetting('chat.customInstructionsInSystemMessage', true);
    ConfigKey.EnableAlternateGptPrompt = defineExpSetting('chat.alternateGptPrompt.enabled', false);
    ConfigKey.CompletionsFetcher = defineExpSetting('chat.completionsFetcher', undefined);
    ConfigKey.NextEditSuggestionsFetcher = defineExpSetting('chat.nesFetcher', undefined);
})(ConfigKey || (exports.ConfigKey = ConfigKey = {}));
function getAllConfigKeys() {
    return Object.values(ConfigKey).flatMap(namespace => Object.values(namespace).map(setting => setting.fullyQualifiedId));
}
const nextEditProviderIds = [];
function registerNextEditProviderId(providerId) {
    nextEditProviderIds.push(providerId);
    return providerId;
}
//# sourceMappingURL=configurationService.js.map