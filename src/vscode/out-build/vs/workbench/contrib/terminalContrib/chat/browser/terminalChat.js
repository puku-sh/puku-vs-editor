/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { MenuId } from '../../../../../platform/actions/common/actions.js';
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
export var TerminalChatCommandId;
(function (TerminalChatCommandId) {
    TerminalChatCommandId["Start"] = "workbench.action.terminal.chat.start";
    TerminalChatCommandId["Close"] = "workbench.action.terminal.chat.close";
    TerminalChatCommandId["MakeRequest"] = "workbench.action.terminal.chat.makeRequest";
    TerminalChatCommandId["Cancel"] = "workbench.action.terminal.chat.cancel";
    TerminalChatCommandId["RunCommand"] = "workbench.action.terminal.chat.runCommand";
    TerminalChatCommandId["RunFirstCommand"] = "workbench.action.terminal.chat.runFirstCommand";
    TerminalChatCommandId["InsertCommand"] = "workbench.action.terminal.chat.insertCommand";
    TerminalChatCommandId["InsertFirstCommand"] = "workbench.action.terminal.chat.insertFirstCommand";
    TerminalChatCommandId["ViewInChat"] = "workbench.action.terminal.chat.viewInChat";
    TerminalChatCommandId["RerunRequest"] = "workbench.action.terminal.chat.rerunRequest";
    TerminalChatCommandId["ViewHiddenChatTerminals"] = "workbench.action.terminal.chat.viewHiddenChatTerminals";
})(TerminalChatCommandId || (TerminalChatCommandId = {}));
export const MENU_TERMINAL_CHAT_WIDGET_INPUT_SIDE_TOOLBAR = MenuId.for('terminalChatWidget');
export const MENU_TERMINAL_CHAT_WIDGET_STATUS = MenuId.for('terminalChatWidget.status');
export const MENU_TERMINAL_CHAT_WIDGET_TOOLBAR = MenuId.for('terminalChatWidget.toolbar');
export var TerminalChatContextKeyStrings;
(function (TerminalChatContextKeyStrings) {
    TerminalChatContextKeyStrings["ChatFocus"] = "terminalChatFocus";
    TerminalChatContextKeyStrings["ChatVisible"] = "terminalChatVisible";
    TerminalChatContextKeyStrings["ChatActiveRequest"] = "terminalChatActiveRequest";
    TerminalChatContextKeyStrings["ChatInputHasText"] = "terminalChatInputHasText";
    TerminalChatContextKeyStrings["ChatAgentRegistered"] = "terminalChatAgentRegistered";
    TerminalChatContextKeyStrings["ChatResponseEditorFocused"] = "terminalChatResponseEditorFocused";
    TerminalChatContextKeyStrings["ChatResponseContainsCodeBlock"] = "terminalChatResponseContainsCodeBlock";
    TerminalChatContextKeyStrings["ChatResponseContainsMultipleCodeBlocks"] = "terminalChatResponseContainsMultipleCodeBlocks";
    TerminalChatContextKeyStrings["ChatResponseSupportsIssueReporting"] = "terminalChatResponseSupportsIssueReporting";
    TerminalChatContextKeyStrings["ChatSessionResponseVote"] = "terminalChatSessionResponseVote";
    TerminalChatContextKeyStrings["ChatHasTerminals"] = "hasChatTerminals";
    TerminalChatContextKeyStrings["ChatHasHiddenTerminals"] = "hasHiddenChatTerminals";
})(TerminalChatContextKeyStrings || (TerminalChatContextKeyStrings = {}));
export var TerminalChatContextKeys;
(function (TerminalChatContextKeys) {
    /** Whether the chat widget is focused */
    TerminalChatContextKeys.focused = new RawContextKey("terminalChatFocus" /* TerminalChatContextKeyStrings.ChatFocus */, false, localize(13062, null));
    /** Whether the chat widget is visible */
    TerminalChatContextKeys.visible = new RawContextKey("terminalChatVisible" /* TerminalChatContextKeyStrings.ChatVisible */, false, localize(13063, null));
    /** Whether there is an active chat request */
    TerminalChatContextKeys.requestActive = new RawContextKey("terminalChatActiveRequest" /* TerminalChatContextKeyStrings.ChatActiveRequest */, false, localize(13064, null));
    /** Whether the chat input has text */
    TerminalChatContextKeys.inputHasText = new RawContextKey("terminalChatInputHasText" /* TerminalChatContextKeyStrings.ChatInputHasText */, false, localize(13065, null));
    /** The chat response contains at least one code block */
    TerminalChatContextKeys.responseContainsCodeBlock = new RawContextKey("terminalChatResponseContainsCodeBlock" /* TerminalChatContextKeyStrings.ChatResponseContainsCodeBlock */, false, localize(13066, null));
    /** The chat response contains multiple code blocks */
    TerminalChatContextKeys.responseContainsMultipleCodeBlocks = new RawContextKey("terminalChatResponseContainsMultipleCodeBlocks" /* TerminalChatContextKeyStrings.ChatResponseContainsMultipleCodeBlocks */, false, localize(13067, null));
    /** A chat agent exists for the terminal location */
    TerminalChatContextKeys.hasChatAgent = new RawContextKey("terminalChatAgentRegistered" /* TerminalChatContextKeyStrings.ChatAgentRegistered */, false, localize(13068, null));
    /** Has terminals created via chat */
    TerminalChatContextKeys.hasChatTerminals = new RawContextKey("hasChatTerminals" /* TerminalChatContextKeyStrings.ChatHasTerminals */, false, localize(13069, null));
    /** Has hidden chat terminals */
    TerminalChatContextKeys.hasHiddenChatTerminals = new RawContextKey("hasHiddenChatTerminals" /* TerminalChatContextKeyStrings.ChatHasHiddenTerminals */, false, localize(13070, null));
})(TerminalChatContextKeys || (TerminalChatContextKeys = {}));
//# sourceMappingURL=terminalChat.js.map