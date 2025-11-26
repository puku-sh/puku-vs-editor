/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Separator } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { posix as pathPosix, win32 as pathWin32 } from '../../../../../base/common/path.js';
import { escapeRegExpCharacters, removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
import { localize } from '../../../../../nls.js';
export function isPowerShell(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^(?:powershell|pwsh)(?:-preview)?$/i.test(pathWin32.basename(envShell).replace(/\.exe$/i, ''));
    }
    return /^(?:powershell|pwsh)(?:-preview)?$/.test(pathPosix.basename(envShell));
}
export function isWindowsPowerShell(envShell) {
    return envShell.endsWith('System32\\WindowsPowerShell\\v1.0\\powershell.exe');
}
export function isZsh(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^zsh(?:\.exe)?$/i.test(pathWin32.basename(envShell));
    }
    return /^zsh$/.test(pathPosix.basename(envShell));
}
export function isFish(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^fish(?:\.exe)?$/i.test(pathWin32.basename(envShell));
    }
    return /^fish$/.test(pathPosix.basename(envShell));
}
// Maximum output length to prevent context overflow
const MAX_OUTPUT_LENGTH = 60000; // ~60KB limit to keep context manageable
const TRUNCATION_MESSAGE = '\n\n[... MIDDLE OF OUTPUT TRUNCATED ...]\n\n';
export function sanitizeTerminalOutput(output) {
    let sanitized = removeAnsiEscapeCodes(output)
        // Trim trailing \r\n characters
        .trimEnd();
    // Truncate if output is too long to prevent context overflow
    if (sanitized.length > MAX_OUTPUT_LENGTH) {
        const truncationMessageLength = TRUNCATION_MESSAGE.length;
        const availableLength = MAX_OUTPUT_LENGTH - truncationMessageLength;
        const startLength = Math.floor(availableLength * 0.4); // Keep 40% from start
        const endLength = availableLength - startLength; // Keep 60% from end
        const startPortion = sanitized.substring(0, startLength);
        const endPortion = sanitized.substring(sanitized.length - endLength);
        sanitized = startPortion + TRUNCATION_MESSAGE + endPortion;
    }
    return sanitized;
}
export function generateAutoApproveActions(commandLine, subCommands, autoApproveResult) {
    const actions = [];
    // We shouldn't offer configuring rules for commands that are explicitly denied since it
    // wouldn't get auto approved with a new rule
    const canCreateAutoApproval = (autoApproveResult.subCommandResults.every(e => e.result !== 'denied') &&
        autoApproveResult.commandLineResult.result !== 'denied');
    if (canCreateAutoApproval) {
        const unapprovedSubCommands = subCommands.filter((_, index) => {
            return autoApproveResult.subCommandResults[index].result !== 'approved';
        });
        // Some commands should not be recommended as they are too permissive generally. This only
        // applies to sub-commands, we still want to offer approving of the exact the command line
        // however as it's very specific.
        const neverAutoApproveCommands = new Set([
            // Shell interpreters
            'bash', 'sh', 'zsh', 'fish', 'ksh', 'csh', 'tcsh', 'dash',
            'pwsh', 'powershell', 'powershell.exe', 'cmd', 'cmd.exe',
            // Script interpreters
            'python', 'python3', 'node', 'ruby', 'perl', 'php', 'lua',
            // Direct execution commands
            'eval', 'exec', 'source', 'sudo', 'su', 'doas',
            // Network tools that can download and execute code
            'curl', 'wget', 'invoke-restmethod', 'invoke-webrequest', 'irm', 'iwr',
        ]);
        // Commands where we want to suggest the sub-command (eg. `foo bar` instead of `foo`)
        const commandsWithSubcommands = new Set(['git', 'npm', 'yarn', 'docker', 'kubectl', 'cargo', 'dotnet', 'mvn', 'gradle']);
        // Commands where we want to suggest the sub-command of a sub-command (eg. `foo bar baz`
        // instead of `foo`)
        const commandsWithSubSubCommands = new Set(['npm run', 'yarn run']);
        // For each unapproved sub-command (within the overall command line), decide whether to
        // suggest new rules for the command, a sub-command, a sub-command of a sub-command or to
        // not suggest at all.
        const subCommandsToSuggest = Array.from(new Set(coalesce(unapprovedSubCommands.map(command => {
            const parts = command.trim().split(/\s+/);
            const baseCommand = parts[0].toLowerCase();
            const baseSubCommand = parts.length > 1 ? `${parts[0]} ${parts[1]}`.toLowerCase() : '';
            // Security check: Never suggest auto-approval for dangerous interpreter commands
            if (neverAutoApproveCommands.has(baseCommand)) {
                return undefined;
            }
            if (commandsWithSubSubCommands.has(baseSubCommand)) {
                if (parts.length >= 3 && !parts[2].startsWith('-')) {
                    return `${parts[0]} ${parts[1]} ${parts[2]}`;
                }
                return undefined;
            }
            else if (commandsWithSubcommands.has(baseCommand)) {
                if (parts.length >= 2 && !parts[1].startsWith('-')) {
                    return `${parts[0]} ${parts[1]}`;
                }
                return undefined;
            }
            else {
                return parts[0];
            }
        }))));
        if (subCommandsToSuggest.length > 0) {
            let subCommandLabel;
            if (subCommandsToSuggest.length === 1) {
                subCommandLabel = localize('autoApprove.baseCommandSingle', 'Always Allow Command: {0}', subCommandsToSuggest[0]);
            }
            else {
                const commandSeparated = subCommandsToSuggest.join(', ');
                subCommandLabel = localize('autoApprove.baseCommand', 'Always Allow Commands: {0}', commandSeparated);
            }
            actions.push({
                label: subCommandLabel,
                data: {
                    type: 'newRule',
                    rule: subCommandsToSuggest.map(key => ({
                        key,
                        value: true
                    }))
                }
            });
        }
        // Allow exact command line, don't do this if it's just the first sub-command's first
        // word or if it's an exact match for special sub-commands
        const firstSubcommandFirstWord = unapprovedSubCommands.length > 0 ? unapprovedSubCommands[0].split(' ')[0] : '';
        if (firstSubcommandFirstWord !== commandLine &&
            !commandsWithSubcommands.has(commandLine) &&
            !commandsWithSubSubCommands.has(commandLine)) {
            actions.push({
                label: localize('autoApprove.exactCommand', 'Always Allow Exact Command Line'),
                data: {
                    type: 'newRule',
                    rule: {
                        key: `/^${escapeRegExpCharacters(commandLine)}$/`,
                        value: {
                            approve: true,
                            matchCommandLine: true
                        }
                    }
                }
            });
        }
    }
    if (actions.length > 0) {
        actions.push(new Separator());
    }
    // Allow all commands for this session
    actions.push({
        label: localize('allowSession', 'Allow All Commands in this Session'),
        tooltip: localize('allowSessionTooltip', 'Allow this tool to run in this session without confirmation.'),
        data: {
            type: 'sessionApproval'
        }
    });
    actions.push(new Separator());
    // Always show configure option
    actions.push({
        label: localize('autoApprove.configure', 'Configure Auto Approve...'),
        data: {
            type: 'configure'
        }
    });
    return actions;
}
export function dedupeRules(rules) {
    return rules.filter((result, index, array) => {
        return result.rule && array.findIndex(r => r.rule && r.rule.sourceText === result.rule.sourceText) === index;
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbEhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9ydW5JblRlcm1pbmFsSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFLakQsTUFBTSxVQUFVLFlBQVksQ0FBQyxRQUFnQixFQUFFLEVBQW1CO0lBQ2pFLElBQUksRUFBRSxvQ0FBNEIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8scUNBQXFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXhHLENBQUM7SUFDRCxPQUFPLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUVELE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxRQUFnQjtJQUNuRCxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsbURBQW1ELENBQUMsQ0FBQztBQUMvRSxDQUFDO0FB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