/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../../base/common/codicons.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { localize } from '../../../../../nls.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { insertCell } from './cellOperations.js';
import { NotebookAction } from './coreActions.js';
import { NOTEBOOK_CELL_LIST_FOCUSED, NOTEBOOK_EDITOR_EDITABLE } from '../../common/notebookContextKeys.js';
import { CellKind, NotebookSetting } from '../../common/notebookCommon.js';
import { INotebookKernelHistoryService } from '../../common/notebookKernelService.js';
const INSERT_CODE_CELL_ABOVE_COMMAND_ID = 'notebook.cell.insertCodeCellAbove';
const INSERT_CODE_CELL_BELOW_COMMAND_ID = 'notebook.cell.insertCodeCellBelow';
const INSERT_CODE_CELL_ABOVE_AND_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.insertCodeCellAboveAndFocusContainer';
const INSERT_CODE_CELL_BELOW_AND_FOCUS_CONTAINER_COMMAND_ID = 'notebook.cell.insertCodeCellBelowAndFocusContainer';
const INSERT_CODE_CELL_AT_TOP_COMMAND_ID = 'notebook.cell.insertCodeCellAtTop';
const INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID = 'notebook.cell.insertMarkdownCellAbove';
const INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID = 'notebook.cell.insertMarkdownCellBelow';
const INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID = 'notebook.cell.insertMarkdownCellAtTop';
export function insertNewCell(accessor, context, kind, direction, focusEditor) {
    let newCell = null;
    if (context.ui) {
        context.notebookEditor.focus();
    }
    const languageService = accessor.get(ILanguageService);
    const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
    if (context.cell) {
        const idx = context.notebookEditor.getCellIndex(context.cell);
        newCell = insertCell(languageService, context.notebookEditor, idx, kind, direction, undefined, true, kernelHistoryService);
    }
    else {
        const focusRange = context.notebookEditor.getFocus();
        const next = Math.max(focusRange.end - 1, 0);
        newCell = insertCell(languageService, context.notebookEditor, next, kind, direction, undefined, true, kernelHistoryService);
    }
    return newCell;
}
export class InsertCellCommand extends NotebookAction {
    constructor(desc, kind, direction, focusEditor) {
        super(desc);
        this.kind = kind;
        this.direction = direction;
        this.focusEditor = focusEditor;
    }
    async runWithContext(accessor, context) {
        const newCell = await insertNewCell(accessor, context, this.kind, this.direction, this.focusEditor);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, this.focusEditor ? 'editor' : 'container');
        }
    }
}
registerAction2(class InsertCodeCellAboveAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_ABOVE_COMMAND_ID,
            title: localize(10288, null),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 0
            }
        }, CellKind.Code, 'above', true);
    }
});
registerAction2(class InsertCodeCellAboveAndFocusContainerAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_ABOVE_AND_FOCUS_CONTAINER_COMMAND_ID,
            title: localize(10289, null)
        }, CellKind.Code, 'above', false);
    }
});
registerAction2(class InsertCodeCellBelowAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
            title: localize(10290, null),
            keybinding: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 3 /* KeyCode.Enter */,
                when: ContextKeyExpr.and(NOTEBOOK_CELL_LIST_FOCUSED, InputFocusedContext.toNegated()),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 1
            }
        }, CellKind.Code, 'below', true);
    }
});
registerAction2(class InsertCodeCellBelowAndFocusContainerAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_CODE_CELL_BELOW_AND_FOCUS_CONTAINER_COMMAND_ID,
            title: localize(10291, null),
        }, CellKind.Code, 'below', false);
    }
});
registerAction2(class InsertMarkdownCellAboveAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_ABOVE_COMMAND_ID,
            title: localize(10292, null),
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 2
            }
        }, CellKind.Markup, 'above', true);
    }
});
registerAction2(class InsertMarkdownCellBelowAction extends InsertCellCommand {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
            title: localize(10293, null),
            menu: {
                id: MenuId.NotebookCellInsert,
                order: 3
            }
        }, CellKind.Markup, 'below', true);
    }
});
registerAction2(class InsertCodeCellAtTopAction extends NotebookAction {
    constructor() {
        super({
            id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
            title: localize(10294, null),
            f1: false
        });
    }
    async run(accessor, context) {
        context = context ?? this.getEditorContextFromArgsOrActive(accessor);
        if (context) {
            this.runWithContext(accessor, context);
        }
    }
    async runWithContext(accessor, context) {
        const languageService = accessor.get(ILanguageService);
        const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
        const newCell = insertCell(languageService, context.notebookEditor, 0, CellKind.Code, 'above', undefined, true, kernelHistoryService);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
});
registerAction2(class InsertMarkdownCellAtTopAction extends NotebookAction {
    constructor() {
        super({
            id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
            title: localize(10295, null),
            f1: false
        });
    }
    async run(accessor, context) {
        context = context ?? this.getEditorContextFromArgsOrActive(accessor);
        if (context) {
            this.runWithContext(accessor, context);
        }
    }
    async runWithContext(accessor, context) {
        const languageService = accessor.get(ILanguageService);
        const kernelHistoryService = accessor.get(INotebookKernelHistoryService);
        const newCell = insertCell(languageService, context.notebookEditor, 0, CellKind.Markup, 'above', undefined, true, kernelHistoryService);
        if (newCell) {
            await context.notebookEditor.focusNotebookCell(newCell, 'editor');
        }
    }
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        title: '$(add) ' + localize(10296, null),
        tooltip: localize(10297, null)
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        title: localize(10298, null),
        icon: Codicon.add,
        tooltip: localize(10299, null)
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.equals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: INSERT_CODE_CELL_BELOW_COMMAND_ID,
        icon: Codicon.add,
        title: localize(10300, null),
        tooltip: localize(10301, null)
    },
    order: -5,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
        title: '$(add) ' + localize(10302, null),
        tooltip: localize(10303, null)
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_CODE_CELL_AT_TOP_COMMAND_ID,
        title: localize(10304, null),
        icon: Codicon.add,
        tooltip: localize(10305, null)
    },
    order: 0,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.equals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellBetween, {
    command: {
        id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
        title: '$(add) ' + localize(10306, null),
        tooltip: localize(10307, null)
    },
    order: 1,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookToolbar, {
    command: {
        id: INSERT_MARKDOWN_CELL_BELOW_COMMAND_ID,
        icon: Codicon.add,
        title: localize(10308, null),
        tooltip: localize(10309, null)
    },
    order: -5,
    group: 'navigation/add',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'betweenCells'), ContextKeyExpr.notEquals('config.notebook.insertToolbarLocation', 'hidden'), ContextKeyExpr.notEquals(`config.${NotebookSetting.globalToolbarShowLabel}`, false), ContextKeyExpr.notEquals(`config.${NotebookSetting.globalToolbarShowLabel}`, 'never'))
});
MenuRegistry.appendMenuItem(MenuId.NotebookCellListTop, {
    command: {
        id: INSERT_MARKDOWN_CELL_AT_TOP_COMMAND_ID,
        title: '$(add) ' + localize(10310, null),
        tooltip: localize(10311, null)
    },
    order: 1,
    group: 'inline',
    when: ContextKeyExpr.and(NOTEBOOK_EDITOR_EDITABLE.isEqualTo(true), ContextKeyExpr.notEquals('config.notebook.experimental.insertToolbarAlignment', 'left'))
});
//# sourceMappingURL=insertCellActions.js.map