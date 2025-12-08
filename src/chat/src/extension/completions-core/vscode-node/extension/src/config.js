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
exports.VSCodeEditorInfo = exports.VSCodeConfigProvider = void 0;
exports.isCompletionEnabled = isCompletionEnabled;
exports.isCompletionEnabledForDocument = isCompletionEnabledForDocument;
exports.isInlineSuggestEnabled = isInlineSuggestEnabled;
exports.enableCompletions = enableCompletions;
exports.disableCompletions = disableCompletions;
exports.toggleCompletions = toggleCompletions;
const vscode = __importStar(require("vscode"));
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const config_1 = require("../../lib/src/config");
const constants_1 = require("../../lib/src/constants");
const logger_1 = require("../../lib/src/logger");
const event_1 = require("../../lib/src/util/event");
const logger = new logger_1.Logger('extensionConfig');
class VSCodeConfigProvider extends config_1.ConfigProvider {
    constructor() {
        super();
        this.onDidChangeCopilotSettings = (0, event_1.transformEvent)(vscode.workspace.onDidChangeConfiguration, event => {
            if (event.affectsConfiguration('puku')) {
                return this;
            }
            if (event.affectsConfiguration('puku-chat')) {
                return this;
            }
        });
        this.config = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix);
        // Reload cached config if a workspace config change effects Copilot namespace
        vscode.workspace.onDidChangeConfiguration(changeEvent => {
            if (changeEvent.affectsConfiguration(constants_1.CopilotConfigPrefix)) {
                this.config = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix);
            }
        });
    }
    getConfig(key) {
        return (0, config_1.getConfigKeyRecursively)(this.config, key) ?? (0, config_1.getConfigDefaultForKey)(key);
    }
    getOptionalConfig(key) {
        return (0, config_1.getConfigKeyRecursively)(this.config, key) ?? (0, config_1.getOptionalConfigDefaultForKey)(key);
    }
    // Dumps config settings defined in the extension json
    dumpForTelemetry() {
        return {};
    }
}
exports.VSCodeConfigProvider = VSCodeConfigProvider;
// From vscode's src/vs/platform/telemetry/common/telemetryUtils.ts
const telemetryAllowedAuthorities = new Set([
    'ssh-remote',
    'dev-container',
    'attached-container',
    'wsl',
    'tunnel',
    'codespaces',
    'amlext',
]);
class VSCodeEditorInfo {
    getEditorInfo() {
        let devName = vscode.env.uriScheme;
        if (vscode.version.endsWith('-insider')) {
            devName = devName.replace(/-insiders$/, '');
        }
        const remoteName = vscode.env.remoteName;
        if (remoteName) {
            devName += `@${telemetryAllowedAuthorities.has(remoteName) ? remoteName : 'other'}`;
        }
        return {
            name: 'vscode',
            readableName: vscode.env.appName.replace(/ - Insiders$/, ''),
            devName: devName,
            version: vscode.version,
            root: vscode.env.appRoot,
        };
    }
    getEditorPluginInfo() {
        return { name: 'copilot-chat', readableName: 'GitHub Copilot for Visual Studio Code', version: config_1.packageJson.version };
    }
    getRelatedPluginInfo() {
        // Any additions to this list should also be added as a known filter in
        // lib/src/experiments/filters.ts
        return [
            'ms-vscode.cpptools',
            'ms-vscode.cmake-tools',
            'ms-vscode.makefile-tools',
            'ms-dotnettools.csdevkit',
            'ms-python.python',
            'ms-python.vscode-pylance',
            'vscjava.vscode-java-pack',
            'vscjava.vscode-java-dependency',
            'vscode.typescript-language-features',
            'ms-vscode.vscode-typescript-next',
            'ms-dotnettools.csharp',
            'puku-chat',
        ]
            .map(name => {
            const extpj = vscode.extensions.getExtension(name)?.packageJSON;
            if (extpj && typeof extpj === 'object' && 'version' in extpj && typeof extpj.version === 'string') {
                return { name, version: extpj.version };
            }
        })
            .filter(plugin => plugin !== undefined);
    }
}
exports.VSCodeEditorInfo = VSCodeEditorInfo;
function getEnabledConfigObject(accessor) {
    const configProvider = accessor.get(config_1.ICompletionsConfigProvider);
    return { '*': true, ...(configProvider.getConfig(config_1.ConfigKey.Enable) ?? {}) };
}
function getEnabledConfig(accessor, languageId) {
    const obj = getEnabledConfigObject(accessor);
    return obj[languageId] ?? obj['*'] ?? true;
}
/**
 * Checks if automatic completions are enabled for the current document by all Copilot completion settings.
 * Excludes the `editor.inlineSuggest.enabled` setting.
 * Return undefined if there is no current document.
 */
function isCompletionEnabled(accessor) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return undefined;
    }
    return isCompletionEnabledForDocument(accessor, editor.document);
}
function isCompletionEnabledForDocument(accessor, document) {
    return getEnabledConfig(accessor, document.languageId);
}
function isInlineSuggestEnabled() {
    return vscode.workspace.getConfiguration('editor.inlineSuggest').get('enabled');
}
const inspectKinds = [
    ['workspaceFolderLanguageValue', vscode.ConfigurationTarget.WorkspaceFolder, true],
    ['workspaceFolderValue', vscode.ConfigurationTarget.WorkspaceFolder, false],
    ['workspaceLanguageValue', vscode.ConfigurationTarget.Workspace, true],
    ['workspaceValue', vscode.ConfigurationTarget.Workspace, false],
    ['globalLanguageValue', vscode.ConfigurationTarget.Global, true],
    ['globalValue', vscode.ConfigurationTarget.Global, false],
];
function getConfigurationTargetForEnabledConfig() {
    const inspect = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix).inspect(config_1.ConfigKey.Enable);
    if (inspect?.workspaceFolderValue !== undefined) {
        return vscode.ConfigurationTarget.WorkspaceFolder;
    }
    else if (inspect?.workspaceValue !== undefined) {
        return vscode.ConfigurationTarget.Workspace;
    }
    else {
        return vscode.ConfigurationTarget.Global;
    }
}
/**
 * Enable completions by every means possible.
 */
async function enableCompletions(accessor) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const scope = vscode.window.activeTextEditor?.document;
    // Make sure both of these settings are enabled, because that's a precondition for the user seeing inline completions.
    for (const [section, option] of [['', 'editor.inlineSuggest.enabled']]) {
        const config = vscode.workspace.getConfiguration(section, scope);
        const inspect = config.inspect(option);
        // Start from the most specific setting and work our way up to the global default.
        for (const [key, target, overrideInLanguage] of inspectKinds) {
            // Exit condition: if VS Code thinks the setting is enabled, we're done.
            // This might be true from the start, or a call to .update() might flip it.
            if (vscode.workspace.getConfiguration(section, scope).get(option)) {
                break;
            }
            if (inspect?.[key] === false) {
                await config.update(option, true, target, overrideInLanguage);
            }
        }
    }
    // The rest of this function is the inverse of disableCompletions(), updating the puku.enable setting.
    const languageId = vscode.window.activeTextEditor?.document.languageId;
    if (!languageId) {
        return;
    }
    const config = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix);
    const enabledConfig = { ...instantiationService.invokeFunction(getEnabledConfigObject) };
    if (!(languageId in enabledConfig)) {
        enabledConfig['*'] = true;
    }
    else {
        enabledConfig[languageId] = true;
    }
    await config.update(config_1.ConfigKey.Enable, enabledConfig, getConfigurationTargetForEnabledConfig());
    if (!instantiationService.invokeFunction(isCompletionEnabled)) {
        const inspect = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix).inspect(config_1.ConfigKey.Enable);
        const error = new Error(`Failed to enable completions for ${languageId}: ${JSON.stringify(inspect)}`);
        instantiationService.invokeFunction(acc => logger.exception(acc, error, '.enable'));
    }
}
/**
 * Disable completions using the puku.enable setting.
 */
async function disableCompletions(accessor) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    const languageId = vscode.window.activeTextEditor?.document.languageId;
    if (!languageId) {
        return;
    }
    const config = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix);
    const enabledConfig = { ...instantiationService.invokeFunction(getEnabledConfigObject) };
    if (!(languageId in enabledConfig)) {
        enabledConfig['*'] = false;
    }
    else if (enabledConfig[languageId]) {
        enabledConfig[languageId] = false;
    }
    await config.update(config_1.ConfigKey.Enable, enabledConfig, getConfigurationTargetForEnabledConfig());
    if (instantiationService.invokeFunction(isCompletionEnabled)) {
        const inspect = vscode.workspace.getConfiguration(constants_1.CopilotConfigPrefix).inspect(config_1.ConfigKey.Enable);
        const error = new Error(`Failed to disable completions for ${languageId}: ${JSON.stringify(inspect)}`);
        instantiationService.invokeFunction(acc => logger.exception(acc, error, '.disable'));
    }
}
async function toggleCompletions(accessor) {
    if (isCompletionEnabled(accessor) && isInlineSuggestEnabled()) {
        await disableCompletions(accessor);
    }
    else {
        await enableCompletions(accessor);
    }
}
//# sourceMappingURL=config.js.map