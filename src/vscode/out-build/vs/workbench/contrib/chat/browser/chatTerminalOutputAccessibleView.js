/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ITerminalChatService } from '../../terminal/browser/terminal.js';
export class ChatTerminalOutputAccessibleView {
    constructor() {
        this.priority = 115;
        this.name = 'chatTerminalOutput';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ChatContextKeys.inChatTerminalToolOutput;
    }
    getProvider(accessor) {
        const terminalChatService = accessor.get(ITerminalChatService);
        const part = terminalChatService.getFocusedProgressPart();
        if (!part) {
            return;
        }
        const content = part.getCommandAndOutputAsText();
        if (!content) {
            return;
        }
        return new AccessibleContentProvider("chatTerminalOutput" /* AccessibleViewProviderId.ChatTerminalOutput */, { type: "view" /* AccessibleViewType.View */, id: "chatTerminalOutput" /* AccessibleViewProviderId.ChatTerminalOutput */, language: 'text' }, () => content, () => part.focusOutput(), "accessibility.verbosity.terminalChatOutput" /* AccessibilityVerbositySettingId.TerminalChatOutput */);
    }
}
//# sourceMappingURL=chatTerminalOutputAccessibleView.js.map