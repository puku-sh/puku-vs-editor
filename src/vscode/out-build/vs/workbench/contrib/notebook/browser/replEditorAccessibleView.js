/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibleContentProvider } from '../../../../platform/accessibility/browser/accessibleView.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { isReplEditorControl } from '../../replNotebook/browser/replEditor.js';
import { IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED } from '../common/notebookContextKeys.js';
import { getAllOutputsText } from './viewModel/cellOutputTextHelper.js';
/**
 * The REPL input is already accessible, so we can show a view for the most recent execution output.
 */
export class ReplEditorAccessibleView {
    constructor() {
        this.priority = 100;
        this.name = 'replEditorInput';
        this.type = "view" /* AccessibleViewType.View */;
        this.when = ContextKeyExpr.and(IS_COMPOSITE_NOTEBOOK, NOTEBOOK_CELL_LIST_FOCUSED.negate());
    }
    getProvider(accessor) {
        const editorService = accessor.get(IEditorService);
        return getAccessibleOutputProvider(editorService);
    }
}
export function getAccessibleOutputProvider(editorService) {
    const editorControl = editorService.activeEditorPane?.getControl();
    if (editorControl && isReplEditorControl(editorControl) && editorControl.notebookEditor) {
        const notebookEditor = editorControl.notebookEditor;
        const viewModel = notebookEditor?.getViewModel();
        if (notebookEditor && viewModel) {
            // last cell of the viewmodel is the last cell history
            const lastCellIndex = viewModel.length - 1;
            if (lastCellIndex >= 0) {
                const cell = viewModel.viewCells[lastCellIndex];
                const outputContent = getAllOutputsText(viewModel.notebookDocument, cell);
                if (outputContent) {
                    return new AccessibleContentProvider("notebook" /* AccessibleViewProviderId.Notebook */, { type: "view" /* AccessibleViewType.View */ }, () => { return outputContent; }, () => {
                        editorControl.activeCodeEditor?.focus();
                    }, "accessibility.verbosity.replEditor" /* AccessibilityVerbositySettingId.ReplEditor */);
                }
            }
        }
    }
    return;
}
//# sourceMappingURL=replEditorAccessibleView.js.map