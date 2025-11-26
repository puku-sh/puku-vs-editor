/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { NotebookOutlineContext } from '../contrib/outline/notebookOutline.js';
import { FoldingController } from './foldingController.js';
import { CellEditState } from '../notebookBrowser.js';
import * as icons from '../notebookIcons.js';
import { CellKind } from '../../common/notebookCommon.js';
import { CELL_TITLE_CELL_GROUP_ID } from './coreActions.js';
import { executeSectionCondition } from './executeActions.js';
export class NotebookRunSingleCellInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runSingleCell',
            title: {
                ...localize2(10344, "Run Cell"),
                mnemonicTitle: localize(10336, null),
            },
            shortTitle: localize(10337, null),
            icon: icons.executeIcon,
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Code), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren.toNegated(), NotebookOutlineContext.CellHasHeader.toNegated())
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        context.notebookEditor.executeNotebookCells([context.outlineEntry.cell]);
    }
}
export class NotebookRunCellsInSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.runCells',
            title: {
                ...localize2(10345, "Run Cells In Section"),
                mnemonicTitle: localize(10338, null),
            },
            shortTitle: localize(10339, null),
            icon: icons.executeIcon, // TODO @Yoyokrazy replace this with new icon later
            menu: [
                {
                    id: MenuId.NotebookStickyScrollContext,
                    group: 'notebookExecution',
                    order: 1
                },
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'inline',
                    order: 1,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader)
                },
                {
                    id: MenuId.NotebookCellTitle,
                    order: 0 /* CellToolbarOrder.RunSection */,
                    group: CELL_TITLE_CELL_GROUP_ID,
                    when: executeSectionCondition
                }
            ]
        });
    }
    async run(_accessor, context) {
        let cell;
        if (checkOutlineEntryContext(context)) {
            cell = context.outlineEntry.cell;
        }
        else if (checkNotebookCellContext(context)) {
            cell = context.cell;
        }
        else {
            return;
        }
        if (cell.getEditState() === CellEditState.Editing) {
            const foldingController = context.notebookEditor.getContribution(FoldingController.id);
            foldingController.recompute();
        }
        const cellIdx = context.notebookEditor.getViewModel()?.getCellIndex(cell);
        if (cellIdx === undefined) {
            return;
        }
        const sectionIdx = context.notebookEditor.getViewModel()?.getFoldingStartIndex(cellIdx);
        if (sectionIdx === undefined) {
            return;
        }
        const length = context.notebookEditor.getViewModel()?.getFoldedLength(sectionIdx);
        if (length === undefined) {
            return;
        }
        const cells = context.notebookEditor.getCellsInRange({ start: sectionIdx, end: sectionIdx + length + 1 });
        context.notebookEditor.executeNotebookCells(cells);
    }
}
export class NotebookFoldSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.foldSection',
            title: {
                ...localize2(10346, "Fold Section"),
                mnemonicTitle: localize(10340, null),
            },
            shortTitle: localize(10341, null),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(1 /* CellFoldingState.Expanded */))
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 2 /* CellFoldingState.Collapsed */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
export class NotebookExpandSection extends Action2 {
    constructor() {
        super({
            id: 'notebook.section.expandSection',
            title: {
                ...localize2(10347, "Expand Section"),
                mnemonicTitle: localize(10342, null),
            },
            shortTitle: localize(10343, null),
            menu: [
                {
                    id: MenuId.NotebookOutlineActionMenu,
                    group: 'notebookFolding',
                    order: 2,
                    when: ContextKeyExpr.and(NotebookOutlineContext.CellKind.isEqualTo(CellKind.Markup), NotebookOutlineContext.OutlineElementTarget.isEqualTo(1 /* OutlineTarget.OutlinePane */), NotebookOutlineContext.CellHasChildren, NotebookOutlineContext.CellHasHeader, NotebookOutlineContext.CellFoldingState.isEqualTo(2 /* CellFoldingState.Collapsed */))
                }
            ]
        });
    }
    async run(_accessor, context) {
        if (!checkOutlineEntryContext(context)) {
            return;
        }
        this.toggleFoldRange(context.outlineEntry, context.notebookEditor);
    }
    toggleFoldRange(entry, notebookEditor) {
        const foldingController = notebookEditor.getContribution(FoldingController.id);
        const index = entry.index;
        const headerLevel = entry.level;
        const newFoldingState = 1 /* CellFoldingState.Expanded */;
        foldingController.setFoldingStateDown(index, newFoldingState, headerLevel);
    }
}
/**
 * Take in context args and check if they exist. True if action is run from notebook sticky scroll context menu or
 * notebook outline context menu.
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkOutlineEntryContext(context) {
    return !!(context && context.notebookEditor && context.outlineEntry);
}
/**
 * Take in context args and check if they exist. True if action is run from a cell toolbar menu (potentially from the
 * notebook cell container or cell editor context menus, but not tested or implemented atm)
 *
 * @param context - Notebook Outline Context containing a notebook editor and outline entry
 * @returns true if context is valid, false otherwise
 */
function checkNotebookCellContext(context) {
    return !!(context && context.notebookEditor && context.cell);
}
registerAction2(NotebookRunSingleCellInSection);
registerAction2(NotebookRunCellsInSection);
registerAction2(NotebookFoldSection);
registerAction2(NotebookExpandSection);
//# sourceMappingURL=sectionActions.js.map