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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters, regExpLeadsToEndlessLoop } from '../../../../../base/common/strings.js';
import { isObject } from '../../../../../base/common/types.js';
import { structuralEquals } from '../../../../../base/common/equals.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { isPowerShell } from './runInTerminalHelpers.js';
const neverMatchRegex = /(?!.*)/;
const transientEnvVarRegex = /^[A-Z_][A-Z0-9_]*=/i;
let CommandLineAutoApprover = class CommandLineAutoApprover extends Disposable {
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._denyListRules = [];
        this._allowListRules = [];
        this._allowListCommandLineRules = [];
        this._denyListCommandLineRules = [];
        this.updateConfiguration();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */) ||
                e.affectsConfiguration("chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */) ||
                e.affectsConfiguration("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApproveCompatible */)) {
                this.updateConfiguration();
            }
        }));
    }
    updateConfiguration() {
        let configValue = this._configurationService.getValue("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */);
        const configInspectValue = this._configurationService.inspect("chat.tools.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */);
        const deprecatedValue = this._configurationService.getValue("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.DeprecatedAutoApproveCompatible */);
        if (deprecatedValue && typeof deprecatedValue === 'object' && configValue && typeof configValue === 'object') {
            configValue = {
                ...configValue,
                ...deprecatedValue
            };
        }
        const { denyListRules, allowListRules, allowListCommandLineRules, denyListCommandLineRules } = this._mapAutoApproveConfigToRules(configValue, configInspectValue);
        this._allowListRules = allowListRules;
        this._denyListRules = denyListRules;
        this._allowListCommandLineRules = allowListCommandLineRules;
        this._denyListCommandLineRules = denyListCommandLineRules;
    }
    isCommandAutoApproved(command, shell, os) {
        // Check if the command has a transient environment variable assignment prefix which we
        // always deny for now as it can easily lead to execute other commands
        if (transientEnvVarRegex.test(command)) {
            return {
                result: 'denied',
                reason: `Command '${command}' is denied because it contains transient environment variables`
            };
        }
        // Check the deny list to see if this command requires explicit approval
        for (const rule of this._denyListRules) {
            if (this._commandMatchesRule(rule, command, shell, os)) {
                return {
                    result: 'denied',
                    rule,
                    reason: `Command '${command}' is denied by deny list rule: ${rule.sourceText}`
                };
            }
        }
        // Check the allow list to see if the command is allowed to run without explicit approval
        for (const rule of this._allowListRules) {
            if (this._commandMatchesRule(rule, command, shell, os)) {
                return {
                    result: 'approved',
                    rule,
                    reason: `Command '${command}' is approved by allow list rule: ${rule.sourceText}`
                };
            }
        }
        // TODO: LLM-based auto-approval https://github.com/microsoft/vscode/issues/253267
        // Fallback is always to require approval
        return {
            result: 'noMatch',
            reason: `Command '${command}' has no matching auto approve entries`
        };
    }
    isCommandLineAutoApproved(commandLine) {
        // Check the deny list first to see if this command line requires explicit approval
        for (const rule of this._denyListCommandLineRules) {
            if (rule.regex.test(commandLine)) {
                return {
                    result: 'denied',
                    rule,
                    reason: `Command line '${commandLine}' is denied by deny list rule: ${rule.sourceText}`
                };
            }
        }
        // Check if the full command line matches any of the allow list command line regexes
        for (const rule of this._allowListCommandLineRules) {
            if (rule.regex.test(commandLine)) {
                return {
                    result: 'approved',
                    rule,
                    reason: `Command line '${commandLine}' is approved by allow list rule: ${rule.sourceText}`
                };
            }
        }
        return {
            result: 'noMatch',
            reason: `Command line '${commandLine}' has no matching auto approve entries`
        };
    }
    _commandMatchesRule(rule, command, shell, os) {
        const isPwsh = isPowerShell(shell, os);
        // PowerShell is case insensitive regardless of platform
        if ((isPwsh ? rule.regexCaseInsensitive : rule.regex).test(command)) {
            return true;
        }
        else if (isPwsh && command.startsWith('(')) {
            // Allow ignoring of the leading ( for PowerShell commands as it's a command pattern to
            // operate on the output of a command. For example `(Get-Content README.md) ...`
            if (rule.regexCaseInsensitive.test(command.slice(1))) {
                return true;
            }
        }
        return false;
    }
    _mapAutoApproveConfigToRules(config, configInspectValue) {
        if (!config || typeof config !== 'object') {
            return {
                denyListRules: [],
                allowListRules: [],
                allowListCommandLineRules: [],
                denyListCommandLineRules: []
            };
        }
        const denyListRules = [];
        const allowListRules = [];
        const allowListCommandLineRules = [];
        const denyListCommandLineRules = [];
        const ignoreDefaults = this._configurationService.getValue("chat.tools.terminal.ignoreDefaultAutoApproveRules" /* TerminalChatAgentToolsSettingId.IgnoreDefaultAutoApproveRules */) === true;
        for (const [key, value] of Object.entries(config)) {
            const defaultValue = configInspectValue?.default?.value;
            const isDefaultRule = !!(isObject(defaultValue) &&
                Object.prototype.hasOwnProperty.call(defaultValue, key) &&
                structuralEquals(defaultValue[key], value));
            function checkTarget(inspectValue) {
                return (isObject(inspectValue) &&
                    Object.prototype.hasOwnProperty.call(inspectValue, key) &&
                    structuralEquals(inspectValue[key], value));
            }
            const sourceTarget = (checkTarget(configInspectValue.workspaceFolder) ? 6 /* ConfigurationTarget.WORKSPACE_FOLDER */
                : checkTarget(configInspectValue.workspaceValue) ? 5 /* ConfigurationTarget.WORKSPACE */
                    : checkTarget(configInspectValue.userRemoteValue) ? 4 /* ConfigurationTarget.USER_REMOTE */
                        : checkTarget(configInspectValue.userLocalValue) ? 3 /* ConfigurationTarget.USER_LOCAL */
                            : checkTarget(configInspectValue.userValue) ? 2 /* ConfigurationTarget.USER */
                                : checkTarget(configInspectValue.applicationValue) ? 1 /* ConfigurationTarget.APPLICATION */
                                    : 7 /* ConfigurationTarget.DEFAULT */);
            // If default rules are disabled, ignore entries that come from the default config
            if (ignoreDefaults && isDefaultRule && sourceTarget === 7 /* ConfigurationTarget.DEFAULT */) {
                continue;
            }
            if (typeof value === 'boolean') {
                const { regex, regexCaseInsensitive } = this._convertAutoApproveEntryToRegex(key);
                // IMPORTANT: Only true and false are used, null entries need to be ignored
                if (value === true) {
                    allowListRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                }
                else if (value === false) {
                    denyListRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                }
            }
            else if (typeof value === 'object' && value !== null) {
                // Handle object format like { approve: true/false, matchCommandLine: true/false }
                const objectValue = value;
                if (typeof objectValue.approve === 'boolean') {
                    const { regex, regexCaseInsensitive } = this._convertAutoApproveEntryToRegex(key);
                    if (objectValue.approve === true) {
                        if (objectValue.matchCommandLine === true) {
                            allowListCommandLineRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                        }
                        else {
                            allowListRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                        }
                    }
                    else if (objectValue.approve === false) {
                        if (objectValue.matchCommandLine === true) {
                            denyListCommandLineRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                        }
                        else {
                            denyListRules.push({ regex, regexCaseInsensitive, sourceText: key, sourceTarget, isDefaultRule });
                        }
                    }
                }
            }
        }
        return {
            denyListRules,
            allowListRules,
            allowListCommandLineRules,
            denyListCommandLineRules
        };
    }
    _convertAutoApproveEntryToRegex(value) {
        const regex = this._doConvertAutoApproveEntryToRegex(value);
        if (regex.flags.includes('i')) {
            return { regex, regexCaseInsensitive: regex };
        }
        return { regex, regexCaseInsensitive: new RegExp(regex.source, regex.flags + 'i') };
    }
    _doConvertAutoApproveEntryToRegex(value) {
        // If it's wrapped in `/`, it's in regex format and should be converted directly
        // Support all standard JavaScript regex flags: d, g, i, m, s, u, v, y
        const regexMatch = value.match(/^\/(?<pattern>.+)\/(?<flags>[dgimsuvy]*)$/);
        const regexPattern = regexMatch?.groups?.pattern;
        if (regexPattern) {
            let flags = regexMatch.groups?.flags;
            // Remove global flag as it changes how the regex state works which we need to handle
            // internally
            if (flags) {
                flags = flags.replaceAll('g', '');
            }
            // Allow .* as users expect this would match everything
            if (regexPattern === '.*') {
                return new RegExp(regexPattern);
            }
            try {
                const regex = new RegExp(regexPattern, flags || undefined);
                if (regExpLeadsToEndlessLoop(regex)) {
                    return neverMatchRegex;
                }
                return regex;
            }
            catch (error) {
                return neverMatchRegex;
            }
        }
        // The empty string should be ignored, rather than approve everything
        if (value === '') {
            return neverMatchRegex;
        }
        let sanitizedValue;
        // Match both path separators it if looks like a path
        if (value.includes('/') || value.includes('\\')) {
            // Replace path separators with placeholders first, apply standard sanitization, then
            // apply special path handling
            let pattern = value.replace(/[/\\]/g, '%%PATH_SEP%%');
            pattern = escapeRegExpCharacters(pattern);
            pattern = pattern.replace(/%%PATH_SEP%%*/g, '[/\\\\]');
            sanitizedValue = `^(?:\\.[/\\\\])?${pattern}`;
        }
        // Escape regex special characters for non-path strings
        else {
            sanitizedValue = escapeRegExpCharacters(value);
        }
        // Regular strings should match the start of the command line and be a word boundary
        return new RegExp(`^${sanitizedValue}\\b`);
    }
};
CommandLineAutoApprover = __decorate([
    __param(0, IConfigurationService)
], CommandLineAutoApprover);
export { CommandLineAutoApprover };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9jb21tYW5kTGluZUF1dG9BcHByb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDekcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3hFLE9BQU8sRUFBdUIscUJBQXFCLEVBQTRCLE1BQU0sK0RBQStELENBQUM7QUFFckosT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBa0J6RCxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUM7QUFDakMsTUFBTSxvQkFBb0IsR0FBRyxxQkFBcUIsQ0FBQztBQUU1QyxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7SUFNdEQsWUFDd0IscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFDO1FBRmdDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFON0UsbUJBQWMsR0FBdUIsRUFBRSxDQUFDO1FBQ3hDLG9CQUFlLEdBQXVCLEVBQUUsQ0FBQztRQUN6QywrQkFBMEIsR0FBdUIsRUFBRSxDQUFDO1FBQ3BELDhCQUF5QixHQUF1QixFQUFFLENBQUM7UUFNMUQsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDM0Is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