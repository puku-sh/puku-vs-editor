/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { asArray } from '../../../../base/common/arrays.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import Severity from '../../../../base/common/severity.js';
import { basename } from '../../../../base/common/path.js';
export function getInstanceHoverInfo(instance, storageService) {
    const showDetailed = parseInt(storageService.get("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, -1 /* StorageScope.APPLICATION */) ?? '0');
    let statusString = '';
    const statuses = instance.statusList.statuses;
    const actions = [];
    for (const status of statuses) {
        if (showDetailed) {
            if (status.detailedTooltip ?? status.tooltip) {
                statusString += `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` + (status.detailedTooltip ?? status.tooltip ?? '');
            }
        }
        else {
            if (status.tooltip) {
                statusString += `\n\n---\n\n${status.icon ? `$(${status.icon?.id}) ` : ''}` + (status.tooltip ?? '');
            }
        }
        if (status.hoverActions) {
            actions.push(...status.hoverActions);
        }
    }
    actions.push({
        commandId: 'toggleDetailedInfo',
        label: showDetailed ? localize(12741, null) : localize(12742, null),
        run() {
            storageService.store("terminal.integrated.tabs.showDetailed" /* TerminalStorageKeys.TabsShowDetailed */, (showDetailed + 1) % 2, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        },
    });
    const shellProcessString = getShellProcessTooltip(instance, !!showDetailed);
    const content = new MarkdownString(instance.title + shellProcessString + statusString, { supportThemeIcons: true });
    return { content, actions };
}
export function getShellProcessTooltip(instance, showDetailed) {
    const lines = [];
    if (instance.processId && instance.processId > 0) {
        lines.push(localize(12743, null, 'PID', instance.processId) + '\n');
    }
    if (instance.shellLaunchConfig.executable) {
        let commandLine = '';
        if (!showDetailed && instance.shellLaunchConfig.executable.length > 32) {
            const base = basename(instance.shellLaunchConfig.executable);
            const sepIndex = instance.shellLaunchConfig.executable.length - base.length - 1;
            const sep = instance.shellLaunchConfig.executable.substring(sepIndex, sepIndex + 1);
            commandLine += `…${sep}${base}`;
        }
        else {
            commandLine += instance.shellLaunchConfig.executable;
        }
        const args = asArray(instance.injectedArgs || instance.shellLaunchConfig.args || []).map(x => x.match(/\s/) ? `'${x}'` : x).join(' ');
        if (args) {
            commandLine += ` ${args}`;
        }
        lines.push(localize(12744, null, commandLine));
    }
    return lines.length ? `\n\n---\n\n${lines.join('\n')}` : '';
}
export function refreshShellIntegrationInfoStatus(instance) {
    if (!instance.xterm) {
        return;
    }
    const cmdDetectionType = (instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.hasRichCommandDetection
        ? localize(12745, null)
        : instance.capabilities.has(2 /* TerminalCapability.CommandDetection */)
            ? localize(12746, null)
            : instance.usedShellIntegrationInjection
                ? localize(12747, null)
                : localize(12748, null));
    const detailedAdditions = [];
    if (instance.shellType) {
        detailedAdditions.push(`Shell type: \`${instance.shellType}\``);
    }
    const cwd = instance.cwd;
    if (cwd) {
        detailedAdditions.push(`Current working directory: \`${cwd}\``);
    }
    const seenSequences = Array.from(instance.xterm.shellIntegration.seenSequences);
    if (seenSequences.length > 0) {
        detailedAdditions.push(`Seen sequences: ${seenSequences.map(e => `\`${e}\``).join(', ')}`);
    }
    const promptType = instance.capabilities.get(6 /* TerminalCapability.PromptTypeDetection */)?.promptType;
    if (promptType) {
        detailedAdditions.push(`Prompt type: \`${promptType}\``);
    }
    const combinedString = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.promptInputModel.getCombinedString();
    if (combinedString !== undefined) {
        detailedAdditions.push(`Prompt input: \`\`\`${combinedString}\`\`\``);
    }
    const detailedAdditionsString = detailedAdditions.length > 0
        ? '\n\n' + detailedAdditions.map(e => `- ${e}`).join('\n')
        : '';
    instance.statusList.add({
        id: "shell-integration-info" /* TerminalStatus.ShellIntegrationInfo */,
        severity: Severity.Info,
        tooltip: `${localize(12749, null)}: ${cmdDetectionType}`,
        detailedTooltip: `${localize(12750, null)}: ${cmdDetectionType}${detailedAdditionsString}`
    });
}
//# sourceMappingURL=terminalTooltip.js.map