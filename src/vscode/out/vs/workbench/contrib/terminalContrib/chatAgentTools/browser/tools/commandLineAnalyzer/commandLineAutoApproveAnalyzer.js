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
import { asArray } from '../../../../../../../base/common/arrays.js';
import { createCommandUri, MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { ITerminalChatService } from '../../../../../terminal/browser/terminal.js';
import { IStorageService } from '../../../../../../../platform/storage/common/storage.js';
import { openTerminalSettingsLinkCommandId } from '../../../../../chat/browser/chatContentParts/toolInvocationParts/chatTerminalToolProgressPart.js';
import { ChatConfiguration } from '../../../../../chat/common/constants.js';
import { CommandLineAutoApprover } from '../../commandLineAutoApprover.js';
import { dedupeRules, generateAutoApproveActions, isPowerShell } from '../../runInTerminalHelpers.js';
const promptInjectionWarningCommandsLower = [
    'curl',
    'wget',
];
const promptInjectionWarningCommandsLowerPwshOnly = [
    'invoke-restmethod',
    'invoke-webrequest',
    'irm',
    'iwr',
];
let CommandLineAutoApproveAnalyzer = class CommandLineAutoApproveAnalyzer extends Disposable {
    constructor(_treeSitterCommandParser, _telemetry, _log, _configurationService, instantiationService, _storageService, _terminalChatService) {
        super();
        this._treeSitterCommandParser = _treeSitterCommandParser;
        this._telemetry = _telemetry;
        this._log = _log;
        this._configurationService = _configurationService;
        this._storageService = _storageService;
        this._terminalChatService = _terminalChatService;
        this._commandLineAutoApprover = this._register(instantiationService.createInstance(CommandLineAutoApprover));
    }
    async analyze(options) {
        if (options.chatSessionId && this._terminalChatService.hasChatSessionAutoApproval(options.chatSessionId)) {
            this._log('Session has auto approval enabled, auto approving command');
            const disableUri = createCommandUri('_chat.disableSessionAutoApproval', options.chatSessionId);
            const mdTrustSettings = {
                isTrusted: {
                    enabledCommands: ['_chat.disableSessionAutoApproval']
                }
            };
            return {
                isAutoApproved: true,
                isAutoApproveAllowed: true,
                disclaimers: [],
                autoApproveInfo: new MarkdownString(`${localize('autoApprove.session', 'Auto approved for this session')} ([${localize('autoApprove.session.disable', 'Disable')}](${disableUri.toString()}))`, mdTrustSettings),
            };
        }
        let subCommands;
        try {
            subCommands = await this._treeSitterCommandParser.extractSubCommands(options.treeSitterLanguage, options.commandLine);
            this._log(`Parsed sub-commands via ${options.treeSitterLanguage} grammar`, subCommands);
        }
        catch (e) {
            console.error(e);
            this._log(`Failed to parse sub-commands via ${options.treeSitterLanguage} grammar`);
        }
        let isAutoApproved = false;
        let autoApproveInfo;
        let customActions;
        if (!subCommands) {
            return {
                isAutoApproveAllowed: false,
                disclaimers: [],
            };
        }
        const subCommandResults = subCommands.map(e => this._commandLineAutoApprover.isCommandAutoApproved(e, options.shell, options.os));
        const commandLineResult = this._commandLineAutoApprover.isCommandLineAutoApproved(options.commandLine);
        const autoApproveReasons = [
            ...subCommandResults.map(e => e.reason),
            commandLineResult.reason,
        ];
        let isDenied = false;
        let autoApproveReason;
        let autoApproveDefault;
        const deniedSubCommandResult = subCommandResults.find(e => e.result === 'denied');
        if (deniedSubCommandResult) {
            this._log('Sub-command DENIED auto approval');
            isDenied = true;
            autoApproveDefault = deniedSubCommandResult.rule?.isDefaultRule;
            autoApproveReason = 'subCommand';
        }
        else if (commandLineResult.result === 'denied') {
            this._log('Command line DENIED auto approval');
            isDenied = true;
            autoApproveDefault = commandLineResult.rule?.isDefaultRule;
            autoApproveReason = 'commandLine';
        }
        else {
            if (subCommandResults.every(e => e.result === 'approved')) {
                this._log('All sub-commands auto-approved');
                autoApproveReason = 'subCommand';
                isAutoApproved = true;
                autoApproveDefault = subCommandResults.every(e => e.rule?.isDefaultRule);
            }
            else {
                this._log('All sub-commands NOT auto-approved');
                if (commandLineResult.result === 'approved') {
                    this._log('Command line auto-approved');
                    autoApproveReason = 'commandLine';
                    isAutoApproved = true;
                    autoApproveDefault = commandLineResult.rule?.isDefaultRule;
                }
                else {
                    this._log('Command line NOT auto-approved');
                }
            }
        }
        // Log detailed auto approval reasoning
        for (const reason of autoApproveReasons) {
            this._log(`- ${reason}`);
        }
        // Apply auto approval or force it off depending on enablement/opt-in state
        const isAutoApproveEnabled = this._configurationService.getValue("chat.tools.terminal.enableAutoApprove" /* TerminalChatAgentToolsSettingId.EnableAutoApprove */) === true;
        const isAutoApproveWarningAccepted = this._storageService.getBoolean("chat.tools.terminal.autoApprove.warningAccepted" /* TerminalToolConfirmationStorageKeys.TerminalAutoApproveWarningAccepted */, -1 /* StorageScope.APPLICATION */, false);
        if (isAutoApproveEnabled && isAutoApproved) {
            autoApproveInfo = this._createAutoApproveInfo(isAutoApproved, isDenied, autoApproveReason, subCommandResults, commandLineResult);
        }
        else {
            isAutoApproved = false;
        }
        // Send telemetry about auto approval process
        this._telemetry.logPrepare({
            terminalToolSessionId: options.terminalToolSessionId,
            subCommands,
            autoApproveAllowed: !isAutoApproveEnabled ? 'off' : isAutoApproveWarningAccepted ? 'allowed' : 'needsOptIn',
            autoApproveResult: isAutoApproved ? 'approved' : isDenied ? 'denied' : 'manual',
            autoApproveReason,
            autoApproveDefault
        });
        // Prompt injection warning for common commands that return content from the web
        const disclaimers = [];
        const subCommandsLowerFirstWordOnly = subCommands.map(command => command.split(' ')[0].toLowerCase());
        if (!isAutoApproved && (subCommandsLowerFirstWordOnly.some(command => promptInjectionWarningCommandsLower.includes(command)) ||
            (isPowerShell(options.shell, options.os) && subCommandsLowerFirstWordOnly.some(command => promptInjectionWarningCommandsLowerPwshOnly.includes(command))))) {
            disclaimers.push(localize('runInTerminal.promptInjectionDisclaimer', 'Web content may contain malicious code or attempt prompt injection attacks.'));
        }
        if (!isAutoApproved && isAutoApproveEnabled) {
            customActions = generateAutoApproveActions(options.commandLine, subCommands, { subCommandResults, commandLineResult });
        }
        return {
            isAutoApproved,
            // This is not based on isDenied because we want the user to be able to configure it
            isAutoApproveAllowed: true,
            disclaimers,
            autoApproveInfo,
            customActions,
        };
    }
    _createAutoApproveInfo(isAutoApproved, isDenied, autoApproveReason, subCommandResults, commandLineResult) {
        const formatRuleLinks = (result) => {
            return asArray(result).map(e => {
                const settingsUri = createCommandUri(openTerminalSettingsLinkCommandId, e.rule.sourceTarget);
                return `[\`${e.rule.sourceText}\`](${settingsUri.toString()} "${localize('ruleTooltip', 'View rule in settings')}")`;
            }).join(', ');
        };
        const mdTrustSettings = {
            isTrusted: {
                enabledCommands: [openTerminalSettingsLinkCommandId]
            }
        };
        const config = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        const isGlobalAutoApproved = config?.value ?? config.defaultValue;
        if (isGlobalAutoApproved) {
            const settingsUri = createCommandUri(openTerminalSettingsLinkCommandId, 'global');
            return new MarkdownString(`${localize('autoApprove.global', 'Auto approved by setting {0}', `[\`${ChatConfiguration.GlobalAutoApprove}\`](${settingsUri.toString()} "${localize('ruleTooltip.global', 'View settings')}")`)}`, mdTrustSettings);
        }
        if (isAutoApproved) {
            switch (autoApproveReason) {
                case 'commandLine': {
                    if (commandLineResult.rule) {
                        return new MarkdownString(localize('autoApprove.rule', 'Auto approved by rule {0}', formatRuleLinks(commandLineResult)), mdTrustSettings);
                    }
                    break;
                }
                case 'subCommand': {
                    const uniqueRules = dedupeRules(subCommandResults);
                    if (uniqueRules.length === 1) {
                        return new MarkdownString(localize('autoApprove.rule', 'Auto approved by rule {0}', formatRuleLinks(uniqueRules)), mdTrustSettings);
                    }
                    else if (uniqueRules.length > 1) {
                        return new MarkdownString(localize('autoApprove.rules', 'Auto approved by rules {0}', formatRuleLinks(uniqueRules)), mdTrustSettings);
                    }
                    break;
                }
            }
        }
        else if (isDenied) {
            switch (autoApproveReason) {
                case 'commandLine': {
                    if (commandLineResult.rule) {
                        return new MarkdownString(localize('autoApproveDenied.rule', 'Auto approval denied by rule {0}', formatRuleLinks(commandLineResult)), mdTrustSettings);
                    }
                    break;
                }
                case 'subCommand': {
                    const uniqueRules = dedupeRules(subCommandResults.filter(e => e.result === 'denied'));
                    if (uniqueRules.length === 1) {
                        return new MarkdownString(localize('autoApproveDenied.rule', 'Auto approval denied by rule {0}', formatRuleLinks(uniqueRules)));
                    }
                    else if (uniqueRules.length > 1) {
                        return new MarkdownString(localize('autoApproveDenied.rules', 'Auto approval denied by rules {0}', formatRuleLinks(uniqueRules)));
                    }
                    break;
                }
            }
        }
        return undefined;
    }
};
CommandLineAutoApproveAnalyzer = __decorate([
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IStorageService),
    __param(6, ITerminalChatService)
], CommandLineAutoApproveAnalyzer);
export { CommandLineAutoApproveAnalyzer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZUFuYWx5emVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvdG9vbHMvY29tbWFuZExpbmVBbmFseXplci9jb21tYW5kTGluZUF1dG9BcHByb3ZlQW5hbHl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxjQUFjLEVBQXdCLE1BQU0saURBQWlELENBQUM7QUFDekgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLHlEQUF5RCxDQUFDO0FBRXhHLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGtHQUFrRyxDQUFDO0FBQ3JKLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzVFLE9BQU8sRUFBRSx1QkFBdUIsRUFBNkYsTUFBTSxrQ0FBa0MsQ0FBQztBQUN0SyxPQUFPLEVBQUUsV0FBVyxFQUFFLDBCQUEwQixFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBS3RHLE1BQU0sbUNBQW1DLEdB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