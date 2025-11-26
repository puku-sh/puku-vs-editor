/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize2 } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ActiveEditorContext } from '../../../../common/contextkeys.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatAgentLocation, ChatModeKind } from '../../common/constants.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { EditingSessionAction, getEditingSessionContext } from '../chatEditing/chatEditingActions.js';
import { ChatEditorInput } from '../chatEditorInput.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION, CHAT_CATEGORY, handleCurrentEditingSession } from './chatActions.js';
import { clearChatEditor } from './chatClear.js';
export function registerNewChatActions() {
    // Add "New Chat" submenu to Chat view menu
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: MenuId.ChatNewMenu,
        title: localize2(5209, "New Chat"),
        icon: Codicon.plus,
        when: ContextKeyExpr.equals('view', ChatViewId),
        group: 'navigation',
        order: -1,
        isSplitButton: true
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chatEditor.newChat',
                title: localize2(5210, "New Chat"),
                icon: Codicon.plus,
                f1: false,
                precondition: ChatContextKeys.enabled,
            });
        }
        async run(accessor, ...args) {
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            await clearChatEditor(accessor);
        }
    });
    registerAction2(class NewChatAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_NEW_CHAT,
                title: localize2(5211, "New Chat"),
                category: CHAT_CATEGORY,
                icon: Codicon.plus,
                precondition: ContextKeyExpr.and(ChatContextKeys.enabled, ChatContextKeys.location.isEqualTo(ChatAgentLocation.Chat)),
                f1: true,
                menu: [
                    {
                        id: MenuId.ChatContext,
                        group: 'z_clear'
                    },
                    {
                        id: MenuId.ChatNewMenu,
                        group: '1_open',
                        order: 1,
                    },
                    {
                        id: MenuId.CompactWindowEditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.lockedToCodingAgent.negate()),
                        order: 1
                    }
                ],
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 42 /* KeyCode.KeyL */],
                    mac: {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                        secondary: [256 /* KeyMod.WinCtrl */ | 42 /* KeyCode.KeyL */]
                    },
                    when: ChatContextKeys.inChatSession
                }
            });
        }
        async run(accessor, ...args) {
            const executeCommandContext = args[0];
            // Context from toolbar or lastFocusedWidget
            const context = getEditingSessionContext(accessor, args);
            const { editingSession, chatWidget: widget } = context ?? {};
            if (!widget) {
                return;
            }
            const accessibilitySignalService = accessor.get(IAccessibilitySignalService);
            const dialogService = accessor.get(IDialogService);
            if (editingSession && !(await handleCurrentEditingSession(editingSession, undefined, dialogService))) {
                return;
            }
            accessibilitySignalService.playSignal(AccessibilitySignal.clear);
            await editingSession?.stop();
            await widget.clear();
            widget.attachmentModel.clear(true);
            widget.input.relatedFiles?.clear();
            widget.focusInput();
            if (!executeCommandContext) {
                return;
            }
            if (typeof executeCommandContext.agentMode === 'boolean') {
                widget.input.setChatMode(executeCommandContext.agentMode ? ChatModeKind.Agent : ChatModeKind.Edit);
            }
            if (executeCommandContext.inputValue) {
                if (executeCommandContext.isPartialQuery) {
                    widget.setInput(executeCommandContext.inputValue);
                }
                else {
                    widget.acceptInput(executeCommandContext.inputValue);
                }
            }
        }
    });
    CommandsRegistry.registerCommandAlias(ACTION_ID_NEW_EDIT_SESSION, ACTION_ID_NEW_CHAT);
    registerAction2(class UndoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.undoEdit',
                title: localize2(5212, "Undo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.discard,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanUndo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -3,
                        isHiddenByDefault: true
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            await editingSession.undoInteraction();
        }
    });
    registerAction2(class RedoChatEditInteractionAction extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit',
                title: localize2(5213, "Redo Last Request"),
                category: CHAT_CATEGORY,
                icon: Codicon.redo,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.equals('view', ChatViewId),
                        group: 'navigation',
                        order: -2,
                        isHiddenByDefault: true
                    }
                ]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const widget = accessor.get(IChatWidgetService);
            await editingSession.redoInteraction();
            widget.lastFocusedWidget?.viewModel?.model.setCheckpoint(undefined);
        }
    });
    registerAction2(class RedoChatCheckpoints extends EditingSessionAction {
        constructor() {
            super({
                id: 'workbench.action.chat.redoEdit2',
                title: localize2(5214, "Redo"),
                tooltip: localize2(5215, "Reapply discarded workspace changes and chat"),
                category: CHAT_CATEGORY,
                precondition: ContextKeyExpr.and(ChatContextKeys.chatEditingCanRedo, ChatContextKeys.enabled),
                f1: true,
                menu: [{
                        id: MenuId.ChatMessageRestoreCheckpoint,
                        when: ChatContextKeys.lockedToCodingAgent.negate(),
                        group: 'navigation',
                        order: -1
                    }]
            });
        }
        async runEditingSessionAction(accessor, editingSession) {
            const widget = accessor.get(IChatWidgetService);
            while (editingSession.canRedo.get()) {
                await editingSession.redoInteraction();
            }
            const currentWidget = widget.lastFocusedWidget;
            const requestText = currentWidget?.viewModel?.model.checkpoint?.message.text;
            // if the input has the same text that we just restored, clear it.
            if (currentWidget?.inputEditor.getValue() === requestText) {
                currentWidget?.input.setValue('', false);
            }
            currentWidget?.viewModel?.model.setCheckpoint(undefined);
            currentWidget?.focusInput();
        }
    });
}
//# sourceMappingURL=chatNewActions.js.map