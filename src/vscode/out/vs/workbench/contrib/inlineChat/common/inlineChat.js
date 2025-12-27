/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { Extensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { diffInserted, diffRemoved, editorWidgetBackground, editorWidgetBorder, editorWidgetForeground, focusBorder, inputBackground, inputPlaceholderForeground, registerColor, transparent, widgetShadow } from '../../../../platform/theme/common/colorRegistry.js';
import { NOTEBOOK_IS_ACTIVE_EDITOR } from '../../notebook/common/notebookContextKeys.js';
// settings
export var InlineChatConfigKeys;
(function (InlineChatConfigKeys) {
    InlineChatConfigKeys["FinishOnType"] = "inlineChat.finishOnType";
    InlineChatConfigKeys["StartWithOverlayWidget"] = "inlineChat.startWithOverlayWidget";
    InlineChatConfigKeys["HoldToSpeech"] = "inlineChat.holdToSpeech";
    InlineChatConfigKeys["AccessibleDiffView"] = "inlineChat.accessibleDiffView";
    /** @deprecated do not read on client */
    InlineChatConfigKeys["EnableV2"] = "inlineChat.enableV2";
    InlineChatConfigKeys["notebookAgent"] = "inlineChat.notebookAgent";
})(InlineChatConfigKeys || (InlineChatConfigKeys = {}));
Registry.as(Extensions.Configuration).registerConfiguration({
    id: 'editor',
    properties: {
        ["inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */]: {
            description: localize('finishOnType', "Whether to finish an inline chat session when typing outside of changed regions."),
            default: false,
            type: 'boolean'
        },
        ["inlineChat.holdToSpeech" /* InlineChatConfigKeys.HoldToSpeech */]: {
            description: localize('holdToSpeech', "Whether holding the inline chat keybinding will automatically enable speech recognition."),
            default: true,
            type: 'boolean'
        },
        ["inlineChat.accessibleDiffView" /* InlineChatConfigKeys.AccessibleDiffView */]: {
            description: localize('accessibleDiffView', "Whether the inline chat also renders an accessible diff viewer for its changes."),
            default: 'auto',
            type: 'string',
            enum: ['auto', 'on', 'off'],
            markdownEnumDescriptions: [
                localize('accessibleDiffView.auto', "The accessible diff viewer is based on screen reader mode being enabled."),
                localize('accessibleDiffView.on', "The accessible diff viewer is always enabled."),
                localize('accessibleDiffView.off', "The accessible diff viewer is never enabled."),
            ],
        },
        ["inlineChat.enableV2" /* InlineChatConfigKeys.EnableV2 */]: {
            description: localize('enableV2', "Whether to use the next version of inline chat."),
            default: false,
            type: 'boolean',
            tags: ['preview'],
            experiment: {
                mode: 'auto'
            }
        },
        ["inlineChat.notebookAgent" /* InlineChatConfigKeys.notebookAgent */]: {
            markdownDescription: localize('notebookAgent', "Enable agent-like behavior for inline chat widget in notebooks."),
            default: false,
            type: 'boolean',
            tags: ['experimental'],
            experiment: {
                mode: 'startup'
            }
        }
    }
});
export const INLINE_CHAT_ID = 'interactiveEditor';
export const INTERACTIVE_EDITOR_ACCESSIBILITY_HELP_ID = 'interactiveEditorAccessiblityHelp';
// --- CONTEXT
export var InlineChatResponseType;
(function (InlineChatResponseType) {
    InlineChatResponseType["None"] = "none";
    InlineChatResponseType["Messages"] = "messages";
    InlineChatResponseType["MessagesAndEdits"] = "messagesAndEdits";
})(InlineChatResponseType || (InlineChatResponseType = {}));
export const CTX_INLINE_CHAT_POSSIBLE = new RawContextKey('inlineChatPossible', false, localize('inlineChatHasPossible', "Whether a provider for inline chat exists and whether an editor for inline chat is open"));
/** @deprecated */
const CTX_INLINE_CHAT_HAS_AGENT = new RawContextKey('inlineChatHasProvider', false, localize('inlineChatHasProvider', "Whether a provider for interactive editors exists"));
export const CTX_INLINE_CHAT_HAS_AGENT2 = new RawContextKey('inlineChatHasEditsAgent', false, localize('inlineChatHasEditsAgent', "Whether an agent for inline for interactive editors exists"));
export const CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE = new RawContextKey('inlineChatHasNotebookInline', false, localize('inlineChatHasNotebookInline', "Whether an agent for notebook cells exists"));
export const CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT = new RawContextKey('inlineChatHasNotebookAgent', false, localize('inlineChatHasNotebookAgent', "Whether an agent for notebook cells exists"));
export const CTX_INLINE_CHAT_VISIBLE = new RawContextKey('inlineChatVisible', false, localize('inlineChatVisible', "Whether the interactive editor input is visible"));
export const CTX_INLINE_CHAT_FOCUSED = new RawContextKey('inlineChatFocused', false, localize('inlineChatFocused', "Whether the interactive editor input is focused"));
export const CTX_INLINE_CHAT_EDITING = new RawContextKey('inlineChatEditing', true, localize('inlineChatEditing', "Whether the user is currently editing or generating code in the inline chat"));
export const CTX_INLINE_CHAT_RESPONSE_FOCUSED = new RawContextKey('inlineChatResponseFocused', false, localize('inlineChatResponseFocused', "Whether the interactive widget's response is focused"));
export const CTX_INLINE_CHAT_EMPTY = new RawContextKey('inlineChatEmpty', false, localize('inlineChatEmpty', "Whether the interactive editor input is empty"));
export const CTX_INLINE_CHAT_INNER_CURSOR_FIRST = new RawContextKey('inlineChatInnerCursorFirst', false, localize('inlineChatInnerCursorFirst', "Whether the cursor of the iteractive editor input is on the first line"));
export const CTX_INLINE_CHAT_INNER_CURSOR_LAST = new RawContextKey('inlineChatInnerCursorLast', false, localize('inlineChatInnerCursorLast', "Whether the cursor of the iteractive editor input is on the last line"));
export const CTX_INLINE_CHAT_OUTER_CURSOR_POSITION = new RawContextKey('inlineChatOuterCursorPosition', '', localize('inlineChatOuterCursorPosition', "Whether the cursor of the outer editor is above or below the interactive editor input"));
export const CTX_INLINE_CHAT_HAS_STASHED_SESSION = new RawContextKey('inlineChatHasStashedSession', false, localize('inlineChatHasStashedSession', "Whether interactive editor has kept a session for quick restore"));
export const CTX_INLINE_CHAT_CHANGE_HAS_DIFF = new RawContextKey('inlineChatChangeHasDiff', false, localize('inlineChatChangeHasDiff', "Whether the current change supports showing a diff"));
export const CTX_INLINE_CHAT_CHANGE_SHOWS_DIFF = new RawContextKey('inlineChatChangeShowsDiff', false, localize('inlineChatChangeShowsDiff', "Whether the current change showing a diff"));
export const CTX_INLINE_CHAT_REQUEST_IN_PROGRESS = new RawContextKey('inlineChatRequestInProgress', false, localize('inlineChatRequestInProgress', "Whether an inline chat request is currently in progress"));
export const CTX_INLINE_CHAT_RESPONSE_TYPE = new RawContextKey('inlineChatResponseType', "none" /* InlineChatResponseType.None */, localize('inlineChatResponseTypes', "What type was the responses have been receieved, nothing yet, just messages, or messaged and local edits"));
export const CTX_INLINE_CHAT_V1_ENABLED = ContextKeyExpr.or(ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR.negate(), CTX_INLINE_CHAT_HAS_AGENT), ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE));
export const CTX_INLINE_CHAT_V2_ENABLED = ContextKeyExpr.or(ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR.negate(), CTX_INLINE_CHAT_HAS_AGENT2), ContextKeyExpr.and(NOTEBOOK_IS_ACTIVE_EDITOR, CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT));
// --- (selected) action identifier
export const ACTION_START = 'inlineChat.start';
export const ACTION_ACCEPT_CHANGES = 'inlineChat.acceptChanges';
export const ACTION_DISCARD_CHANGES = 'inlineChat.discardHunkChange';
export const ACTION_REGENERATE_RESPONSE = 'inlineChat.regenerate';
export const ACTION_VIEW_IN_CHAT = 'inlineChat.viewInChat';
export const ACTION_TOGGLE_DIFF = 'inlineChat.toggleDiff';
export const ACTION_REPORT_ISSUE = 'inlineChat.reportIssue';
// --- menus
export const MENU_INLINE_CHAT_WIDGET_STATUS = MenuId.for('inlineChatWidget.status');
export const MENU_INLINE_CHAT_WIDGET_SECONDARY = MenuId.for('inlineChatWidget.secondary');
export const MENU_INLINE_CHAT_ZONE = MenuId.for('inlineChatWidget.changesZone');
export const MENU_INLINE_CHAT_SIDE = MenuId.for('inlineChatWidget.side');
// --- colors
export const inlineChatForeground = registerColor('inlineChat.foreground', editorWidgetForeground, localize('inlineChat.foreground', "Foreground color of the interactive editor widget"));
export const inlineChatBackground = registerColor('inlineChat.background', editorWidgetBackground, localize('inlineChat.background', "Background color of the interactive editor widget"));
export const inlineChatBorder = registerColor('inlineChat.border', editorWidgetBorder, localize('inlineChat.border', "Border color of the interactive editor widget"));
export const inlineChatShadow = registerColor('inlineChat.shadow', widgetShadow, localize('inlineChat.shadow', "Shadow color of the interactive editor widget"));
export const inlineChatInputBorder = registerColor('inlineChatInput.border', editorWidgetBorder, localize('inlineChatInput.border', "Border color of the interactive editor input"));
export const inlineChatInputFocusBorder = registerColor('inlineChatInput.focusBorder', focusBorder, localize('inlineChatInput.focusBorder', "Border color of the interactive editor input when focused"));
export const inlineChatInputPlaceholderForeground = registerColor('inlineChatInput.placeholderForeground', inputPlaceholderForeground, localize('inlineChatInput.placeholderForeground', "Foreground color of the interactive editor input placeholder"));
export const inlineChatInputBackground = registerColor('inlineChatInput.background', inputBackground, localize('inlineChatInput.background', "Background color of the interactive editor input"));
export const inlineChatDiffInserted = registerColor('inlineChatDiff.inserted', transparent(diffInserted, .5), localize('inlineChatDiff.inserted', "Background color of inserted text in the interactive editor input"));
export const overviewRulerInlineChatDiffInserted = registerColor('editorOverviewRuler.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize('editorOverviewRuler.inlineChatInserted', 'Overview ruler marker color for inline chat inserted content.'));
export const minimapInlineChatDiffInserted = registerColor('editorMinimap.inlineChatInserted', { dark: transparent(diffInserted, 0.6), light: transparent(diffInserted, 0.8), hcDark: transparent(diffInserted, 0.6), hcLight: transparent(diffInserted, 0.8) }, localize('editorMinimap.inlineChatInserted', 'Minimap marker color for inline chat inserted content.'));
export const inlineChatDiffRemoved = registerColor('inlineChatDiff.removed', transparent(diffRemoved, .5), localize('inlineChatDiff.removed', "Background color of removed text in the interactive editor input"));
export const overviewRulerInlineChatDiffRemoved = registerColor('editorOverviewRuler.inlineChatRemoved', { dark: transparent(diffRemoved, 0.6), light: transparent(diffRemoved, 0.8), hcDark: transparent(diffRemoved, 0.6), hcLight: transparent(diffRemoved, 0.8) }, localize('editorOverviewRuler.inlineChatRemoved', 'Overview ruler marker color for inline chat removed content.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvY29tbW9uL2lubGluZUNoYXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUEwQixNQUFNLG9FQUFvRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDckcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLGtCQUFrQixFQUFFLHNCQUFzQixFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2USxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV6RixXQUFXO0FBRVgsTUFBTSxDQUFOLElBQWtCLG9CQVFqQjtBQVJELFdBQWtCLG9CQUFvQjtJQUNyQyxnRUFBd0MsQ0FBQTtJQUN4QyxvRkFBNEQsQ0FBQTtJQUM1RCxnRUFBd0MsQ0FBQTtJQUN4Qyw0RUFBb0QsQ0FBQTtJQUNwRCx3Q0FBd0M7SUFDeEMsd0RBQWdDLENBQUE7SUFDaEMsa0VBQTBDLENBQUE7QUFDM0MsQ0FBQyxFQVJpQixvQkFBb0IsS0FBcEIsb0JBQW9CLFFBUXJDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsVUFBVSxDQUFDLGFB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