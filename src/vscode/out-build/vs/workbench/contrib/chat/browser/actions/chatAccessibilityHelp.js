/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleDiffViewerNext } from '../../../../../editor/browser/widget/diffEditor/commands.js';
import { localize } from '../../../../../nls.js';
import { AccessibleContentProvider } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { INLINE_CHAT_ID } from '../../../inlineChat/common/inlineChat.js';
import { ChatContextKeyExprs, ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { IChatWidgetService } from '../chat.js';
import { ChatEditingShowChangesAction, ViewPreviousEditsAction } from '../chatEditing/chatEditingActions.js';
export class PanelChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'panelChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat), ChatContextKeys.inQuickChat.negate(), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Ask), ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'panelChat');
    }
}
export class QuickChatAccessibilityHelp {
    constructor() {
        this.priority = 107;
        this.name = 'quickChat';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.inQuickChat, ContextKeyExpr.or(ChatContextKeys.inChatSession, ChatContextKeys.isResponse, ChatContextKeys.isRequest));
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'quickChat');
    }
}
export class EditsChatAccessibilityHelp {
    constructor() {
        this.priority = 119;
        this.name = 'editsView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeyExprs.inEditingMode, ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'editsView');
    }
}
export class AgentChatAccessibilityHelp {
    constructor() {
        this.priority = 120;
        this.name = 'agentView';
        this.type = "help" /* AccessibleViewType.Help */;
        this.when = ContextKeyExpr.and(ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.inChatInput);
    }
    getProvider(accessor) {
        return getChatAccessibilityHelpProvider(accessor, undefined, 'agentView');
    }
}
export function getAccessibilityHelpText(type, keybindingService) {
    const content = [];
    if (type === 'panelChat' || type === 'quickChat' || type === 'agentView') {
        if (type === 'quickChat') {
            content.push(localize(4996, null));
            content.push(localize(4997, null));
        }
        if (type === 'panelChat') {
            content.push(localize(4998, null));
        }
        content.push(localize(4999, null));
        content.push(localize(5000, null));
        content.push(localize(5001, null, '<keybinding:editor.action.accessibleView>'));
        content.push(localize(5002, null, getChatFocusKeybindingLabel(keybindingService, type, 'last')));
        content.push(localize(5003, null, getChatFocusKeybindingLabel(keybindingService, type, 'lastFocused')));
        content.push(localize(5004, null, getChatFocusKeybindingLabel(keybindingService, type, 'input')));
        content.push(localize(5005, null));
        content.push(localize(5006, null));
        content.push(localize(5007, null, '<keybinding:workbench.action.chat.nextCodeBlock>'));
        content.push(localize(5008, null, '<keybinding:workbench.action.chat.nextUserPrompt>'));
        content.push(localize(5009, null, '<keybinding:workbench.action.chat.previousUserPrompt>'));
        content.push(localize(5010, null, '<keybinding:workbench.action.chat.focusConfirmation>'));
        content.push(localize(5011, null, '<keybinding:workbench.action.terminal.chat.viewHiddenChatTerminals>'));
        content.push(localize(5012, null, '<keybinding:workbench.action.chat.focusMostRecentChatTerminal>'));
        content.push(localize(5013, null, '<keybinding:workbench.action.chat.focusMostRecentChatTerminalOutput>'));
        if (type === 'panelChat') {
            content.push(localize(5014, null, '<keybinding:workbench.action.chat.new>'));
        }
    }
    if (type === 'editsView' || type === 'agentView') {
        if (type === 'agentView') {
            content.push(localize(5015, null));
        }
        else {
            content.push(localize(5016, null));
        }
        content.push(localize(5017, null));
        content.push(localize(5018, null));
        content.push(localize(5019, null));
        content.push(localize(5020, null, '<keybinding:chatEditor.action.navigatePrevious>', '<keybinding:chatEditor.action.navigateNext>'));
        content.push(localize(5021, null, '<keybinding:chatEditor.action.acceptHunk>', '<keybinding:chatEditor.action.undoHunk>', '<keybinding:chatEditor.action.toggleDiff>'));
        content.push(localize(5022, null));
        if (type === 'agentView') {
            content.push(localize(5023, null));
            content.push(localize(5024, null, '<keybinding:workbench.action.chat.acceptTool>'));
            content.push(localize(5025, null, ChatConfiguration.GlobalAutoApprove, 'true'));
            content.push(localize(5026, null, '<keybinding:workbench.action.chat.acceptTool>'));
            content.push(localize(5027, null));
        }
        content.push(localize(5028, null));
        content.push(localize(5029, null, '<keybinding:workbench.action.chat.undoEdits>'));
        content.push(localize(5030, null, '<keybinding:workbench.action.chat.editing.attachFiles>'));
        content.push(localize(5031, null, '<keybinding:chatEditing.removeFileFromWorkingSet>'));
        content.push(localize(5032, null, '<keybinding:chatEditing.acceptFile>', '<keybinding:chatEditing.discardFile>'));
        content.push(localize(5033, null, '<keybinding:chatEditing.saveAllFiles>'));
        content.push(localize(5034, null, '<keybinding:chatEditing.acceptAllFiles>'));
        content.push(localize(5035, null, '<keybinding:chatEditing.discardAllFiles>'));
        content.push(localize(5036, null, '<keybinding:chatEditing.openFileInDiff>'));
        content.push(`- ${ChatEditingShowChangesAction.LABEL}<keybinding:chatEditing.viewChanges>`);
        content.push(`- ${ViewPreviousEditsAction.Label}<keybinding:chatEditing.viewPreviousEdits>`);
    }
    else {
        content.push(localize(5037, null));
        content.push(localize(5038, null, '<keybinding:inlineChat.start>'));
        content.push(localize(5039, null, '<keybinding:history.showPrevious>', '<keybinding:history.showNext>'));
        content.push(localize(5040, null, '<keybinding:editor.action.accessibleView>'));
        content.push(localize(5041, null));
        content.push(localize(5042, null));
        content.push(localize(5043, null, AccessibleDiffViewerNext.id));
        content.push(localize(5044, null));
    }
    content.push(localize(5045, null));
    return content.join('\n');
}
export function getChatAccessibilityHelpProvider(accessor, editor, type) {
    const widgetService = accessor.get(IChatWidgetService);
    const keybindingService = accessor.get(IKeybindingService);
    const inputEditor = widgetService.lastFocusedWidget?.inputEditor;
    if (!inputEditor) {
        return;
    }
    const domNode = inputEditor.getDomNode() ?? undefined;
    if (!domNode) {
        return;
    }
    const cachedPosition = inputEditor.getPosition();
    inputEditor.getSupportedActions();
    const helpText = getAccessibilityHelpText(type, keybindingService);
    return new AccessibleContentProvider(type === 'panelChat' ? "panelChat" /* AccessibleViewProviderId.PanelChat */ : type === 'inlineChat' ? "inlineChat" /* AccessibleViewProviderId.InlineChat */ : type === 'agentView' ? "agentChat" /* AccessibleViewProviderId.AgentChat */ : "quickChat" /* AccessibleViewProviderId.QuickChat */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => {
        if (type === 'quickChat' || type === 'editsView' || type === 'agentView' || type === 'panelChat') {
            if (cachedPosition) {
                inputEditor.setPosition(cachedPosition);
            }
            inputEditor.focus();
        }
        else if (type === 'inlineChat') {
            // TODO@jrieken find a better way for this
            const ctrl = editor?.getContribution(INLINE_CHAT_ID);
            ctrl?.focus();
        }
    }, type === 'panelChat' ? "accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */ : "accessibility.verbosity.inlineChat" /* AccessibilityVerbositySettingId.InlineChat */);
}
// The when clauses for actions may not be true when we invoke the accessible view, so we need to provide the keybinding label manually
// to ensure it's correct
function getChatFocusKeybindingLabel(keybindingService, type, focus) {
    let kbs;
    const fallback = ' (unassigned keybinding)';
    if (focus === 'input') {
        kbs = keybindingService.lookupKeybindings('workbench.action.chat.focusInput');
    }
    else if (focus === 'lastFocused') {
        kbs = keybindingService.lookupKeybindings('workbench.chat.action.focusLastFocused');
    }
    else {
        kbs = keybindingService.lookupKeybindings('chat.action.focus');
    }
    if (!kbs?.length) {
        return fallback;
    }
    let kb;
    if (type === 'agentView' || type === 'panelChat') {
        if (focus !== 'input') {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
    }
    else {
        // Quick chat
        if (focus !== 'input') {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('DownArrow'))?.getAriaLabel();
        }
        else {
            kb = kbs.find(kb => kb.getAriaLabel()?.includes('UpArrow'))?.getAriaLabel();
        }
    }
    return !!kb ? ` (${kb})` : fallback;
}
//# sourceMappingURL=chatAccessibilityHelp.js.map