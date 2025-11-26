/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { isCodeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { EditorAction2 } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { InlineChatController, InlineChatController1, InlineChatController2, InlineChatRunOptions } from './inlineChatController.js';
import { ACTION_ACCEPT_CHANGES, CTX_INLINE_CHAT_HAS_STASHED_SESSION, CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, CTX_INLINE_CHAT_INNER_CURSOR_LAST, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_WIDGET_STATUS, CTX_INLINE_CHAT_REQUEST_IN_PROGRESS, CTX_INLINE_CHAT_RESPONSE_TYPE, ACTION_REGENERATE_RESPONSE, ACTION_VIEW_IN_CHAT, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_CHANGE_HAS_DIFF, CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF, MENU_INLINE_CHAT_ZONE, ACTION_DISCARD_CHANGES, CTX_INLINE_CHAT_POSSIBLE, ACTION_START, MENU_INLINE_CHAT_SIDE, CTX_INLINE_CHAT_V2_ENABLED, CTX_INLINE_CHAT_V1_ENABLED } from '../common/inlineChat.js';
import { ctxHasEditorModification, ctxHasRequestInProgress } from '../../chat/browser/chatEditing/chatEditingEditorContextKeys.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
CommandsRegistry.registerCommandAlias('interactiveEditor.start', 'inlineChat.start');
CommandsRegistry.registerCommandAlias('interactive.acceptChanges', ACTION_ACCEPT_CHANGES);
export const START_INLINE_CHAT = registerIcon('start-inline-chat', Codicon.sparkle, localize('startInlineChat', 'Icon which spawns the inline chat from the editor toolbar.'));
let _holdForSpeech = undefined;
export function setHoldForSpeech(holdForSpeech) {
    _holdForSpeech = holdForSpeech;
}
const inlineChatContextKey = ContextKeyExpr.and(ContextKeyExpr.or(CTX_INLINE_CHAT_V1_ENABLED, CTX_INLINE_CHAT_V2_ENABLED), CTX_INLINE_CHAT_POSSIBLE, EditorContextKeys.writable, EditorContextKeys.editorSimpleInput.negate());
export class StartSessionAction extends Action2 {
    constructor() {
        super({
            id: ACTION_START,
            title: localize2('run', 'Open Inline Chat'),
            category: AbstractInline1ChatAction.category,
            f1: true,
            precondition: inlineChatContextKey,
            keybinding: {
                when: EditorContextKeys.focus,
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */
            },
            icon: START_INLINE_CHAT,
            menu: [{
                    id: MenuId.EditorContext,
                    group: '1_chat',
                    order: 3,
                    when: inlineChatContextKey
                }, {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 3,
                }]
        });
    }
    run(accessor, ...args) {
        const codeEditorService = accessor.get(ICodeEditorService);
        const editor = codeEditorService.getActiveCodeEditor();
        if (!editor || editor.isSimpleWidget) {
            // well, at least we tried...
            return;
        }
        // precondition does hold
        return editor.invokeWithinContext((editorAccessor) => {
            const kbService = editorAccessor.get(IContextKeyService);
            const logService = editorAccessor.get(ILogService);
            const enabled = kbService.contextMatchesRules(this.desc.precondition ?? undefined);
            if (!enabled) {
                logService.debug(`[EditorAction2] NOT running command because its precondition is FALSE`, this.desc.id, this.desc.precondition?.serialize());
                return;
            }
            return this._runEditorCommand(editorAccessor, editor, ...args);
        });
    }
    _runEditorCommand(accessor, editor, ..._args) {
        const ctrl = InlineChatController.get(editor);
        if (!ctrl) {
            return;
        }
        if (_holdForSpeech) {
            accessor.get(IInstantiationService).invokeFunction(_holdForSpeech, ctrl, this);
        }
        let options;
        const arg = _args[0];
        if (arg && InlineChatRunOptions.isInlineChatRunOptions(arg)) {
            options = arg;
        }
        InlineChatController.get(editor)?.run({ ...options });
    }
}
export class FocusInlineChat extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.focus',
            title: localize2('focus', "Focus Input"),
            f1: true,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_FOCUSED.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: [{
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('above'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                }, {
                    weight: 0 /* KeybindingWeight.EditorCore */ + 10, // win against core_command
                    when: ContextKeyExpr.and(CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.isEqualTo('below'), EditorContextKeys.isEmbeddedDiffEditor.negate()),
                    primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                }]
        });
    }
    runEditorCommand(_accessor, editor, ..._args) {
        InlineChatController.get(editor)?.focus();
    }
}
//#region --- VERSION 1
export class UnstashSessionAction extends EditorAction2 {
    constructor() {
        super({
            id: 'inlineChat.unstash',
            title: localize2('unstash', "Resume Last Dismissed Inline Chat"),
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_HAS_STASHED_SESSION, EditorContextKeys.writable),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 56 /* KeyCode.KeyZ */,
            }
        });
    }
    async runEditorCommand(_accessor, editor, ..._args) {
        const ctrl = InlineChatController1.get(editor);
        if (ctrl) {
            const session = ctrl.unstashLastSession();
            if (session) {
                ctrl.run({
                    existingSession: session,
                });
            }
        }
    }
}
export class AbstractInline1ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        const massageMenu = (menu) => {
            if (Array.isArray(menu)) {
                for (const entry of menu) {
                    entry.when = ContextKeyExpr.and(CTX_INLINE_CHAT_V1_ENABLED, entry.when);
                }
            }
            else if (menu) {
                menu.when = ContextKeyExpr.and(CTX_INLINE_CHAT_V1_ENABLED, menu.when);
            }
        };
        if (Array.isArray(desc.menu)) {
            massageMenu(desc.menu);
        }
        else {
            massageMenu(desc.menu);
        }
        super({
            ...desc,
            category: AbstractInline1ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_V1_ENABLED, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController1.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController1.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
export class ArrowOutUpAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutUp',
            title: localize('arrowUp', 'Cursor Up'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_FIRST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(true);
    }
}
export class ArrowOutDownAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.arrowOutDown',
            title: localize('arrowDown', 'Cursor Down'),
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_FOCUSED, CTX_INLINE_CHAT_INNER_CURSOR_LAST, EditorContextKeys.isEmbeddedDiffEditor.negate(), CONTEXT_ACCESSIBILITY_MODE_ENABLED.negate()),
            keybinding: {
                weight: 0 /* KeybindingWeight.EditorCore */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.arrowOut(false);
    }
}
export class AcceptChanges extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_ACCEPT_CHANGES,
            title: localize2('apply1', "Accept Changes"),
            shortTitle: localize('apply2', 'Accept'),
            icon: Codicon.check,
            f1: true,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE),
            keybinding: [{
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                }],
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)),
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 1,
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        ctrl.acceptHunk(hunk);
    }
}
export class DiscardHunkAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_DISCARD_CHANGES,
            title: localize('discard', 'Discard'),
            icon: Codicon.chromeClose,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    order: 2
                }],
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */,
                primary: 9 /* KeyCode.Escape */,
                when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messagesAndEdits" /* InlineChatResponseType.MessagesAndEdits */)
            }
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, hunk) {
        return ctrl.discardHunk(hunk);
    }
}
export class RerunAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_REGENERATE_RESPONSE,
            title: localize2('chat.rerun.label', "Rerun Request"),
            shortTitle: localize('rerun', 'Rerun'),
            f1: false,
            icon: Codicon.refresh,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: '0_main',
                order: 5,
                when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate(), CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("none" /* InlineChatResponseType.None */))
            },
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 48 /* KeyCode.KeyR */
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        const chatService = accessor.get(IChatService);
        const chatWidgetService = accessor.get(IChatWidgetService);
        const model = ctrl.chatWidget.viewModel?.model;
        if (!model) {
            return;
        }
        const lastRequest = model.getRequests().at(-1);
        if (lastRequest) {
            const widget = chatWidgetService.getWidgetBySessionResource(model.sessionResource);
            await chatService.resendRequest(lastRequest, {
                noCommandDetection: false,
                attempt: lastRequest.attempt + 1,
                location: ctrl.chatWidget.location,
                userSelectedModelId: widget?.input.currentLanguageModel
            });
        }
    }
}
export class CloseAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.close',
            title: localize('close', 'Close'),
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                primary: 9 /* KeyCode.Escape */,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate()
                }, {
                    id: MENU_INLINE_CHAT_SIDE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("none" /* InlineChatResponseType.None */)
                }]
        });
    }
    async runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        ctrl.cancelSession();
    }
}
export class ConfigureInlineChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.configure',
            title: localize2('configure', 'Configure Inline Chat'),
            icon: Codicon.settingsGear,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            menu: {
                id: MENU_INLINE_CHAT_WIDGET_STATUS,
                group: 'zzz',
                order: 5
            }
        });
    }
    async runInlineChatCommand(accessor, ctrl, _editor, ..._args) {
        accessor.get(IPreferencesService).openSettings({ query: 'inlineChat' });
    }
}
export class MoveToNextHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToNextHunk',
            title: localize2('moveToNextHunk', 'Move to Next Change'),
            precondition: CTX_INLINE_CHAT_VISIBLE,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(true);
    }
}
export class MoveToPreviousHunk extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: 'inlineChat.moveToPreviousHunk',
            title: localize2('moveToPreviousHunk', 'Move to Previous Change'),
            f1: true,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */
            }
        });
    }
    runInlineChatCommand(accessor, ctrl, editor, ...args) {
        ctrl.moveHunk(false);
    }
}
export class ViewInChatAction extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_VIEW_IN_CHAT,
            title: localize('viewInChat', 'View in Chat'),
            icon: Codicon.chatSparkle,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'more',
                    order: 1,
                    when: CTX_INLINE_CHAT_RESPONSE_TYPE.notEqualsTo("messages" /* InlineChatResponseType.Messages */)
                }, {
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: '0_main',
                    order: 1,
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasText.toNegated(), CTX_INLINE_CHAT_RESPONSE_TYPE.isEqualTo("messages" /* InlineChatResponseType.Messages */), CTX_INLINE_CHAT_REQUEST_IN_PROGRESS.negate())
                }],
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                when: ChatContextKeys.inChatInput
            }
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, ..._args) {
        return ctrl.viewInChat();
    }
}
export class ToggleDiffForChange extends AbstractInline1ChatAction {
    constructor() {
        super({
            id: ACTION_TOGGLE_DIFF,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, CTX_INLINE_CHAT_CHANGE_HAS_DIFF),
            title: localize2('showChanges', 'Toggle Changes'),
            icon: Codicon.diffSingle,
            toggled: {
                condition: CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF,
            },
            menu: [{
                    id: MENU_INLINE_CHAT_WIDGET_STATUS,
                    group: 'zzz',
                    order: 1,
                }, {
                    id: MENU_INLINE_CHAT_ZONE,
                    group: 'navigation',
                    when: CTX_INLINE_CHAT_CHANGE_HAS_DIFF,
                    order: 2
                }]
        });
    }
    runInlineChatCommand(_accessor, ctrl, _editor, hunkInfo) {
        ctrl.toggleDiff(hunkInfo);
    }
}
//#endregion
//#region --- VERSION 2
class AbstractInline2ChatAction extends EditorAction2 {
    static { this.category = localize2('cat', "Inline Chat"); }
    constructor(desc) {
        const massageMenu = (menu) => {
            if (Array.isArray(menu)) {
                for (const entry of menu) {
                    entry.when = ContextKeyExpr.and(CTX_INLINE_CHAT_V2_ENABLED, entry.when);
                }
            }
            else if (menu) {
                menu.when = ContextKeyExpr.and(CTX_INLINE_CHAT_V2_ENABLED, menu.when);
            }
        };
        if (Array.isArray(desc.menu)) {
            massageMenu(desc.menu);
        }
        else {
            massageMenu(desc.menu);
        }
        super({
            ...desc,
            category: AbstractInline2ChatAction.category,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_V2_ENABLED, desc.precondition)
        });
    }
    runEditorCommand(accessor, editor, ..._args) {
        const editorService = accessor.get(IEditorService);
        const logService = accessor.get(ILogService);
        let ctrl = InlineChatController2.get(editor);
        if (!ctrl) {
            const { activeTextEditorControl } = editorService;
            if (isCodeEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl;
            }
            else if (isDiffEditor(activeTextEditorControl)) {
                editor = activeTextEditorControl.getModifiedEditor();
            }
            ctrl = InlineChatController2.get(editor);
        }
        if (!ctrl) {
            logService.warn('[IE] NO controller found for action', this.desc.id, editor.getModel()?.uri);
            return;
        }
        if (editor instanceof EmbeddedCodeEditorWidget) {
            editor = editor.getParentEditor();
        }
        if (!ctrl) {
            for (const diffEditor of accessor.get(ICodeEditorService).listDiffEditors()) {
                if (diffEditor.getOriginalEditor() === editor || diffEditor.getModifiedEditor() === editor) {
                    if (diffEditor instanceof EmbeddedDiffEditorWidget) {
                        this.runEditorCommand(accessor, diffEditor.getParentEditor(), ..._args);
                    }
                }
            }
            return;
        }
        this.runInlineChatCommand(accessor, ctrl, editor, ..._args);
    }
}
class KeepOrUndoSessionAction extends AbstractInline2ChatAction {
    constructor(_keep, desc) {
        super(desc);
        this._keep = _keep;
    }
    async runInlineChatCommand(_accessor, ctrl, editor, ..._args) {
        if (this._keep) {
            await ctrl.acceptSession();
        }
        else {
            await ctrl.rejectSession();
        }
        if (editor.hasModel()) {
            editor.setSelection(editor.getSelection().collapseToStart());
        }
    }
}
export class KeepSessionAction2 extends KeepOrUndoSessionAction {
    constructor() {
        super(true, {
            id: 'inlineChat2.keep',
            title: localize2('Keep', "Keep"),
            f1: true,
            icon: Codicon.check,
            precondition: ContextKeyExpr.and(CTX_INLINE_CHAT_VISIBLE, ctxHasRequestInProgress.negate(), ctxHasEditorModification),
            keybinding: [{
                    when: ContextKeyExpr.and(ChatContextKeys.inputHasFocus, ChatContextKeys.inputHasText.negate()),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 3 /* KeyCode.Enter */
                }, {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */
                }],
            menu: [{
                    id: MenuId.ChatEditorInlineExecute,
                    group: 'navigation',
                    order: 4,
                    when: ContextKeyExpr.and(ctxHasRequestInProgress.negate(), ctxHasEditorModification, ChatContextKeys.inputHasText.toNegated()),
                }]
        });
    }
}
export class UndoAndCloseSessionAction2 extends KeepOrUndoSessionAction {
    constructor() {
        super(false, {
            id: 'inlineChat2.close',
            title: localize2('close2', "Close"),
            f1: true,
            icon: Codicon.close,
            precondition: CTX_INLINE_CHAT_VISIBLE,
            keybinding: [{
                    when: ContextKeyExpr.or(ContextKeyExpr.and(EditorContextKeys.focus, ctxHasEditorModification.negate()), ChatContextKeys.inputHasFocus),
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    primary: 9 /* KeyCode.Escape */,
                }],
            menu: [{
                    id: MenuId.ChatEditorInlineExecute,
                    group: 'navigation',
                    order: 100
                }]
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBZSxZQUFZLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQ3BILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3JJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxtQ0FBbUMsRUFBRSx1QkFBdUIsRUFBRSxrQ0FBa0MsRUFBRSxpQ0FBaUMsRUFBRSx1QkFBdUIsRUFBRSxxQ0FBcUMsRUFBRSw4QkFBOEIsRUFBRSxtQ0FBbUMsRUFBRSw2QkFBNkIsRUFBMEIsMEJBQTBCLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsWUFBWSxFQUFFLHFCQUFxQixFQUFFLDBCQUEwQixFQUFFLDBCQUEwQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDaHJC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