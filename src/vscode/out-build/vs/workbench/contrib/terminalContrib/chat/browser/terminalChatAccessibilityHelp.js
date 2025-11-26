/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { TerminalChatContextKeys } from './terminalChat.js';
import { TerminalChatController } from './terminalChatController.js';
export class TerminalChatAccessibilityHelp {
    constructor() {
        this.priority = 110;
        this.name = 'terminalChat';
        this.when = TerminalChatContextKeys.focused;
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        const terminalService = accessor.get(ITerminalService);
        const instance = terminalService.activeInstance;
        if (!instance) {
            return;
        }
        const helpText = getAccessibilityHelpText(accessor);
        return new AccessibleContentProvider("terminal-chat" /* AccessibleViewProviderId.TerminalChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => TerminalChatController.get(instance)?.terminalChatWidget?.focus(), "accessibility.verbosity.terminalChat" /* AccessibilityVerbositySettingId.TerminalInlineChat */);
    }
}
export function getAccessibilityHelpText(accessor) {
    const keybindingService = accessor.get(IKeybindingService);
    const content = [];
    const openAccessibleViewKeybinding = keybindingService.lookupKeybinding('editor.action.accessibleView')?.getAriaLabel();
    const runCommandKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.runCommand" /* TerminalChatCommandId.RunCommand */)?.getAriaLabel();
    const insertCommandKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.insertCommand" /* TerminalChatCommandId.InsertCommand */)?.getAriaLabel();
    const makeRequestKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.makeRequest" /* TerminalChatCommandId.MakeRequest */)?.getAriaLabel();
    const startChatKeybinding = keybindingService.lookupKeybinding("workbench.action.terminal.chat.start" /* TerminalChatCommandId.Start */)?.getAriaLabel();
    const focusResponseKeybinding = keybindingService.lookupKeybinding('chat.action.focus')?.getAriaLabel();
    const focusInputKeybinding = keybindingService.lookupKeybinding('workbench.action.chat.focusInput')?.getAriaLabel();
    content.push(localize(13071, null));
    content.push(localize(13072, null, startChatKeybinding));
    content.push(makeRequestKeybinding ? localize(13073, null, makeRequestKeybinding) : localize(13074, null));
    content.push(openAccessibleViewKeybinding ? localize(13075, null, openAccessibleViewKeybinding) : localize(13076, null));
    content.push(focusResponseKeybinding ? localize(13077, null, focusResponseKeybinding) : localize(13078, null));
    content.push(focusInputKeybinding ? localize(13079, null, focusInputKeybinding) : localize(13080, null));
    content.push(runCommandKeybinding ? localize(13081, null, runCommandKeybinding) : localize(13082, null));
    content.push(insertCommandKeybinding ? localize(13083, null, insertCommandKeybinding) : localize(13084, null));
    content.push(localize(13085, null));
    content.push(localize(13086, null));
    return content.join('\n');
}
//# sourceMappingURL=terminalChatAccessibilityHelp.js.map