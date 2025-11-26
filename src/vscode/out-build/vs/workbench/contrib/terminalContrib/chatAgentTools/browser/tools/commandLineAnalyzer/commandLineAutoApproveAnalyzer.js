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
                autoApproveInfo: new MarkdownString(`${localize(13117, null)} ([${localize(13118, null)}](${disableUri.toString()}))`, mdTrustSettings),
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
            disclaimers.push(localize(13119, null));
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
                return `[\`${e.rule.sourceText}\`](${settingsUri.toString()} "${localize(13120, null)}")`;
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
            return new MarkdownString(`${localize(13121, null, `[\`${ChatConfiguration.GlobalAutoApprove}\`](${settingsUri.toString()} "${localize(13122, null)}")`)}`, mdTrustSettings);
        }
        if (isAutoApproved) {
            switch (autoApproveReason) {
                case 'commandLine': {
                    if (commandLineResult.rule) {
                        return new MarkdownString(localize(13123, null, formatRuleLinks(commandLineResult)), mdTrustSettings);
                    }
                    break;
                }
                case 'subCommand': {
                    const uniqueRules = dedupeRules(subCommandResults);
                    if (uniqueRules.length === 1) {
                        return new MarkdownString(localize(13124, null, formatRuleLinks(uniqueRules)), mdTrustSettings);
                    }
                    else if (uniqueRules.length > 1) {
                        return new MarkdownString(localize(13125, null, formatRuleLinks(uniqueRules)), mdTrustSettings);
                    }
                    break;
                }
            }
        }
        else if (isDenied) {
            switch (autoApproveReason) {
                case 'commandLine': {
                    if (commandLineResult.rule) {
                        return new MarkdownString(localize(13126, null, formatRuleLinks(commandLineResult)), mdTrustSettings);
                    }
                    break;
                }
                case 'subCommand': {
                    const uniqueRules = dedupeRules(subCommandResults.filter(e => e.result === 'denied'));
                    if (uniqueRules.length === 1) {
                        return new MarkdownString(localize(13127, null, formatRuleLinks(uniqueRules)));
                    }
                    else if (uniqueRules.length > 1) {
                        return new MarkdownString(localize(13128, null, formatRuleLinks(uniqueRules)));
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
//# sourceMappingURL=commandLineAutoApproveAnalyzer.js.map