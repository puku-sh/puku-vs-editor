import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../nls.js';
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED } from '../../notebook/common/notebookContextKeys.js';
export class ReplEditorInputAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor Input';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityInputHelpText());
    }
}
function getAccessibilityInputHelpText() {
    return [
        localize(11432, null),
        localize(11433, null, '<keybinding:repl.execute>'),
        localize(11434, null),
        localize(11435, null),
        localize(11436, null, '<keybinding:repl.focusLastItemExecuted>'),
        localize(11437, null, '<keybinding:editor.action.accessibleView>'),
        localize(11438, null, '<keybinding:repl.input.focus>'),
    ].join('\n');
}
export class ReplEditorHistoryAccessibilityHelp {
    constructor() {
        this.priority = 105;
        this.name = 'REPL Editor History';
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED);
        this.type = "help" /* AccessibleViewType.Help */;
    }
    getProvider(accessor) {
        return getAccessibilityHelpProvider(accessor.get(ICodeEditorService), getAccessibilityHistoryHelpText());
    }
}
function getAccessibilityHistoryHelpText() {
    return [
        localize(11439, null),
        localize(11440, null, '<keybinding:notebook.cell.edit>'),
        localize(11441, null, '<keybinding:notebook.cell.quitEdit>'),
        localize(11442, null, '<keybinding:editor.action.accessibleView>'),
        localize(11443, null, '<keybinding:notebook.cell.focusInOutput>'),
        localize(11444, null, '<keybinding:repl.input.focus>'),
        localize(11445, null, '<keybinding:repl.focusLastItemExecuted>'),
    ].join('\n');
}
function getAccessibilityHelpProvider(editorService, helpText) {
    const activeEditor = editorService.getActiveCodeEditor()
        || editorService.getFocusedCodeEditor();
    if (!activeEditor) {
        return;
    }
    return new AccessibleContentProvider("replEditor" /* AccessibleViewProviderId.ReplEditor */, { type: "help" /* AccessibleViewType.Help */ }, () => helpText, () => activeEditor.focus(), "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
}
//# sourceMappingURL=replEditorAccessibilityHelp.js.map