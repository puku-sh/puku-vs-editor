/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { ToggleAutoSaveAction, FocusFilesExplorer, GlobalCompareResourcesAction, ShowActiveFileInExplorer, CompareWithClipboardAction, NEW_FILE_COMMAND_ID, NEW_FILE_LABEL, NEW_FOLDER_COMMAND_ID, NEW_FOLDER_LABEL, TRIGGER_RENAME_LABEL, MOVE_FILE_TO_TRASH_LABEL, COPY_FILE_LABEL, PASTE_FILE_LABEL, FileCopiedContext, renameHandler, moveFileToTrashHandler, copyFileHandler, pasteFileHandler, deleteFileHandler, cutFileHandler, DOWNLOAD_COMMAND_ID, openFilePreserveFocusHandler, DOWNLOAD_LABEL, OpenActiveFileInEmptyWorkspace, UPLOAD_COMMAND_ID, UPLOAD_LABEL, CompareNewUntitledTextFilesAction, SetActiveEditorReadonlyInSession, SetActiveEditorWriteableInSession, ToggleActiveEditorReadonlyInSession, ResetActiveEditorReadonlyInSession } from './fileActions.js';
import { revertLocalChangesCommand, acceptLocalChangesCommand, CONFLICT_RESOLUTION_CONTEXT } from './editors/textFileSaveErrorHandler.js';
import { MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { openWindowCommand, newWindowCommand } from './fileCommands.js';
import { COPY_PATH_COMMAND_ID, REVEAL_IN_EXPLORER_COMMAND_ID, OPEN_TO_SIDE_COMMAND_ID, REVERT_FILE_COMMAND_ID, SAVE_FILE_COMMAND_ID, SAVE_FILE_LABEL, SAVE_FILE_AS_COMMAND_ID, SAVE_FILE_AS_LABEL, SAVE_ALL_IN_GROUP_COMMAND_ID, OpenEditorsGroupContext, COMPARE_WITH_SAVED_COMMAND_ID, COMPARE_RESOURCE_COMMAND_ID, SELECT_FOR_COMPARE_COMMAND_ID, ResourceSelectedForCompareContext, OpenEditorsDirtyEditorContext, COMPARE_SELECTED_COMMAND_ID, REMOVE_ROOT_FOLDER_COMMAND_ID, REMOVE_ROOT_FOLDER_LABEL, SAVE_FILES_COMMAND_ID, COPY_RELATIVE_PATH_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID, SAVE_FILE_WITHOUT_FORMATTING_LABEL, OpenEditorsReadonlyEditorContext, OPEN_WITH_EXPLORER_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID, NEW_UNTITLED_FILE_LABEL, SAVE_ALL_COMMAND_ID, OpenEditorsSelectedFileOrUntitledContext } from './fileConstants.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { KeybindingsRegistry } from '../../../../platform/keybinding/common/keybindingsRegistry.js';
import { FilesExplorerFocusCondition, ExplorerRootContext, ExplorerFolderContext, ExplorerResourceWritableContext, ExplorerResourceCut, ExplorerResourceMoveableToTrash, ExplorerResourceAvailableEditorIdsContext, FoldersViewVisibleContext } from '../common/files.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL } from '../../../browser/actions/workspaceCommands.js';
import { CLOSE_SAVED_EDITORS_COMMAND_ID, CLOSE_EDITORS_IN_GROUP_COMMAND_ID, CLOSE_EDITOR_COMMAND_ID, CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID, REOPEN_WITH_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { AutoSaveAfterShortDelayContext } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { WorkbenchListDoubleSelection } from '../../../../platform/list/browser/listService.js';
import { Schemas } from '../../../../base/common/network.js';
import { DirtyWorkingCopiesContext, EnterMultiRootWorkspaceSupportContext, HasWebFileSystemAccess, WorkbenchStateContext, WorkspaceFolderCountContext, SidebarFocusContext, ActiveEditorCanRevertContext, ActiveEditorContext, ResourceContextKey, ActiveEditorAvailableEditorIdsContext, MultipleEditorsSelectedInGroupContext, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
import { IExplorerService } from './files.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
// Contribute Global Actions
registerAction2(GlobalCompareResourcesAction);
registerAction2(FocusFilesExplorer);
registerAction2(ShowActiveFileInExplorer);
registerAction2(CompareWithClipboardAction);
registerAction2(CompareNewUntitledTextFilesAction);
registerAction2(ToggleAutoSaveAction);
registerAction2(OpenActiveFileInEmptyWorkspace);
registerAction2(SetActiveEditorReadonlyInSession);
registerAction2(SetActiveEditorWriteableInSession);
registerAction2(ToggleActiveEditorReadonlyInSession);
registerAction2(ResetActiveEditorReadonlyInSession);
// Commands
CommandsRegistry.registerCommand('_files.windowOpen', openWindowCommand);
CommandsRegistry.registerCommand('_files.newWindow', newWindowCommand);
const explorerCommandsWeightBonus = 10; // give our commands a little bit more weight over other default list/tree commands
const RENAME_ID = 'renameFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: RENAME_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 60 /* KeyCode.F2 */,
    mac: {
        primary: 3 /* KeyCode.Enter */
    },
    handler: renameHandler
});
const MOVE_FILE_TO_TRASH_ID = 'moveFileToTrash';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: MOVE_FILE_TO_TRASH_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */,
        secondary: [20 /* KeyCode.Delete */]
    },
    handler: moveFileToTrashHandler
});
const DELETE_FILE_ID = 'deleteFile';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: FilesExplorerFocusCondition,
    primary: 1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1 /* KeyCode.Backspace */
    },
    handler: deleteFileHandler
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: DELETE_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceMoveableToTrash.toNegated()),
    primary: 20 /* KeyCode.Delete */,
    mac: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 1 /* KeyCode.Backspace */
    },
    handler: deleteFileHandler
});
const CUT_FILE_ID = 'filesExplorer.cut';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: CUT_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated(), ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
    handler: cutFileHandler,
});
const COPY_FILE_ID = 'filesExplorer.copy';
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: COPY_FILE_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerRootContext.toNegated()),
    primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
    handler: copyFileHandler,
});
const PASTE_FILE_ID = 'filesExplorer.paste';
CommandsRegistry.registerCommand(PASTE_FILE_ID, pasteFileHandler);
KeybindingsRegistry.registerKeybindingRule({
    id: `^${PASTE_FILE_ID}`, // the `^` enables pasting files into the explorer by preventing default bubble up
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceWritableContext),
    primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.cancelCut',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerResourceCut),
    primary: 9 /* KeyCode.Escape */,
    handler: async (accessor) => {
        const explorerService = accessor.get(IExplorerService);
        await explorerService.setToCopy([], true);
    }
});
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: 'filesExplorer.openFilePreserveFocus',
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + explorerCommandsWeightBonus,
    when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext.toNegated()),
    primary: 10 /* KeyCode.Space */,
    handler: openFilePreserveFocusHandler
});
const copyPathCommand = {
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize(8655, null)
};
const copyRelativePathCommand = {
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize(8656, null)
};
export const revealInSideBarCommand = {
    id: REVEAL_IN_EXPLORER_COMMAND_ID,
    title: nls.localize(8657, null)
};
// Editor Title Context Menu
appendEditorTitleContextMenuItem(COPY_PATH_COMMAND_ID, copyPathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(COPY_RELATIVE_PATH_COMMAND_ID, copyRelativePathCommand.title, ResourceContextKey.IsFileSystemResource, '1_cutcopypaste', true);
appendEditorTitleContextMenuItem(revealInSideBarCommand.id, revealInSideBarCommand.title, ResourceContextKey.IsFileSystemResource, '2_files', false, 1);
export function appendEditorTitleContextMenuItem(id, title, when, group, supportsMultiSelect, order) {
    const precondition = supportsMultiSelect !== true ? MultipleEditorsSelectedInGroupContext.negate() : undefined;
    // Menu
    MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
        command: { id, title, precondition },
        when,
        group,
        order,
    });
}
// Editor Title Menu for Conflict Resolution
appendSaveConflictEditorTitleAction('workbench.files.action.acceptLocalChanges', nls.localize(8658, null), Codicon.check, -10, acceptLocalChangesCommand);
appendSaveConflictEditorTitleAction('workbench.files.action.revertLocalChanges', nls.localize(8659, null), Codicon.discard, -9, revertLocalChangesCommand);
function appendSaveConflictEditorTitleAction(id, title, icon, order, command) {
    // Command
    CommandsRegistry.registerCommand(id, command);
    // Action
    MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
        command: { id, title, icon },
        when: ContextKeyExpr.equals(CONFLICT_RESOLUTION_CONTEXT, true),
        group: 'navigation',
        order
    });
}
// Menu registration - command palette
export function appendToCommandPalette({ id, title, category, metadata }, when) {
    MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
        command: {
            id,
            title,
            category,
            metadata
        },
        when
    });
}
appendToCommandPalette({
    id: COPY_PATH_COMMAND_ID,
    title: nls.localize2(8686, "Copy Path of Active File"),
    category: Categories.File
});
appendToCommandPalette({
    id: COPY_RELATIVE_PATH_COMMAND_ID,
    title: nls.localize2(8687, "Copy Relative Path of Active File"),
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILE_COMMAND_ID,
    title: SAVE_FILE_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILE_WITHOUT_FORMATTING_COMMAND_ID,
    title: SAVE_FILE_WITHOUT_FORMATTING_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_ALL_IN_GROUP_COMMAND_ID,
    title: nls.localize2(8688, "Save All in Group"),
    category: Categories.File
});
appendToCommandPalette({
    id: SAVE_FILES_COMMAND_ID,
    title: nls.localize2(8689, "Save All Files"),
    category: Categories.File
});
appendToCommandPalette({
    id: REVERT_FILE_COMMAND_ID,
    title: nls.localize2(8690, "Revert File"),
    category: Categories.File
});
appendToCommandPalette({
    id: COMPARE_WITH_SAVED_COMMAND_ID,
    title: nls.localize2(8691, "Compare Active File with Saved"),
    category: Categories.File,
    metadata: {
        description: nls.localize2(8692, "Opens a new diff editor to compare the active file with the version on disk.")
    }
});
appendToCommandPalette({
    id: SAVE_FILE_AS_COMMAND_ID,
    title: SAVE_FILE_AS_LABEL,
    category: Categories.File
});
appendToCommandPalette({
    id: NEW_FILE_COMMAND_ID,
    title: NEW_FILE_LABEL,
    category: Categories.File
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_FOLDER_COMMAND_ID,
    title: NEW_FOLDER_LABEL,
    category: Categories.File,
    metadata: { description: nls.localize2(8693, "Create a new folder or directory") }
}, WorkspaceFolderCountContext.notEqualsTo('0'));
appendToCommandPalette({
    id: NEW_UNTITLED_FILE_COMMAND_ID,
    title: NEW_UNTITLED_FILE_LABEL,
    category: Categories.File
});
// Menu registration - open editors
const isFileOrUntitledResourceContextKey = ContextKeyExpr.or(ResourceContextKey.IsFileSystemResource, ResourceContextKey.Scheme.isEqualTo(Schemas.untitled));
const openToSideCommand = {
    id: OPEN_TO_SIDE_COMMAND_ID,
    title: nls.localize(8660, null)
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: isFileOrUntitledResourceContextKey
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_open',
    order: 10,
    command: {
        id: REOPEN_WITH_COMMAND_ID,
        title: nls.localize(8661, null)
    },
    when: ContextKeyExpr.and(
    // Editors with Available Choices to Open With
    ActiveEditorAvailableEditorIdsContext, 
    // Not: editor groups
    OpenEditorsGroupContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 10,
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: SAVE_FILE_LABEL,
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.or(
    // Untitled Editors
    ResourceContextKey.Scheme.isEqualTo(Schemas.untitled), 
    // Or:
    ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated()))
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 20,
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize(8662, null),
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.and(
    // Not: editor groups
    OpenEditorsGroupContext.toNegated(), 
    // Not: readonly editors
    OpenEditorsReadonlyEditorContext.toNegated(), 
    // Not: untitled editors (revert closes them)
    ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), 
    // Not: auto save after short delay
    AutoSaveAfterShortDelayContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '2_save',
    order: 30,
    command: {
        id: SAVE_ALL_IN_GROUP_COMMAND_ID,
        title: nls.localize(8663, null),
        precondition: DirtyWorkingCopiesContext
    },
    // Editor Group
    when: OpenEditorsGroupContext
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 10,
    command: {
        id: COMPARE_WITH_SAVED_COMMAND_ID,
        title: nls.localize(8664, null),
        precondition: OpenEditorsDirtyEditorContext
    },
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, AutoSaveAfterShortDelayContext.toNegated(), WorkbenchListDoubleSelection.toNegated())
});
const compareResourceCommand = {
    id: COMPARE_RESOURCE_COMMAND_ID,
    title: nls.localize(8665, null)
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, ResourceSelectedForCompareContext, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated())
});
const selectForCompareCommand = {
    id: SELECT_FOR_COMPARE_COMMAND_ID,
    title: nls.localize(8666, null)
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, isFileOrUntitledResourceContextKey, WorkbenchListDoubleSelection.toNegated())
});
const compareSelectedCommand = {
    id: COMPARE_SELECTED_COMMAND_ID,
    title: nls.localize(8667, null)
};
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, WorkbenchListDoubleSelection, OpenEditorsSelectedFileOrUntitledContext)
});
MenuRegistry.appendMenuItem(MenuId.EditorTitleContext, {
    group: '1_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ResourceContextKey.HasResource, TwoEditorsSelectedInGroupContext, SelectedEditorsInGroupFileOrUntitledResourceContextKey)
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 10,
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize(8668, null)
    },
    when: OpenEditorsGroupContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 20,
    command: {
        id: CLOSE_OTHER_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize(8669, null)
    },
    when: OpenEditorsGroupContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 30,
    command: {
        id: CLOSE_SAVED_EDITORS_COMMAND_ID,
        title: nls.localize(8670, null)
    }
});
MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, {
    group: '4_close',
    order: 40,
    command: {
        id: CLOSE_EDITORS_IN_GROUP_COMMAND_ID,
        title: nls.localize(8671, null)
    }
});
// Menu registration - explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 4,
    command: {
        id: NEW_FILE_COMMAND_ID,
        title: NEW_FILE_LABEL,
        precondition: ExplorerResourceWritableContext
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 6,
    command: {
        id: NEW_FOLDER_COMMAND_ID,
        title: NEW_FOLDER_LABEL,
        precondition: ExplorerResourceWritableContext
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: 'navigation',
    order: 20,
    command: {
        id: OPEN_WITH_EXPLORER_COMMAND_ID,
        title: nls.localize(8672, null),
    },
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ExplorerResourceAvailableEditorIdsContext),
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 20,
    command: compareResourceCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, ResourceSelectedForCompareContext, WorkbenchListDoubleSelection.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: selectForCompareCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '3_compare',
    order: 30,
    command: compareSelectedCommand,
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, WorkbenchListDoubleSelection)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 8,
    command: {
        id: CUT_FILE_ID,
        title: nls.localize(8673, null),
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceWritableContext)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 10,
    command: {
        id: COPY_FILE_ID,
        title: COPY_FILE_LABEL,
    },
    when: ExplorerRootContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '5_cutcopypaste',
    order: 20,
    command: {
        id: PASTE_FILE_ID,
        title: PASTE_FILE_LABEL,
        precondition: ContextKeyExpr.and(ExplorerResourceWritableContext, FileCopiedContext)
    },
    when: ExplorerFolderContext
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, ({
    group: '5b_importexport',
    order: 10,
    command: {
        id: DOWNLOAD_COMMAND_ID,
        title: DOWNLOAD_LABEL
    },
    when: ContextKeyExpr.or(
    // native: for any remote resource
    ContextKeyExpr.and(IsWebContext.toNegated(), ResourceContextKey.Scheme.notEqualsTo(Schemas.file)), 
    // web: for any files
    ContextKeyExpr.and(IsWebContext, ExplorerFolderContext.toNegated(), ExplorerRootContext.toNegated()), 
    // web: for any folders if file system API support is provided
    ContextKeyExpr.and(IsWebContext, HasWebFileSystemAccess))
}));
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, ({
    group: '5b_importexport',
    order: 20,
    command: {
        id: UPLOAD_COMMAND_ID,
        title: UPLOAD_LABEL,
    },
    when: ContextKeyExpr.and(
    // only in web
    IsWebContext, 
    // only on folders
    ExplorerFolderContext, 
    // only on writable folders
    ExplorerResourceWritableContext)
}));
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '6_copypath',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 10,
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: ADD_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')))
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '2_workspace',
    order: 30,
    command: {
        id: REMOVE_ROOT_FOLDER_COMMAND_ID,
        title: REMOVE_ROOT_FOLDER_LABEL,
    },
    when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext, ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))))
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 10,
    command: {
        id: RENAME_ID,
        title: TRIGGER_RENAME_LABEL,
        precondition: ExplorerResourceWritableContext,
    },
    when: ExplorerRootContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: MOVE_FILE_TO_TRASH_ID,
        title: MOVE_FILE_TO_TRASH_LABEL
    },
    alt: {
        id: DELETE_FILE_ID,
        title: nls.localize(8674, null)
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash)
});
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '7_modification',
    order: 20,
    command: {
        id: DELETE_FILE_ID,
        title: nls.localize(8675, null)
    },
    when: ContextKeyExpr.and(ExplorerRootContext.toNegated(), ExplorerResourceMoveableToTrash.toNegated())
});
// Empty Editor Group / Editor Tabs Container Context Menu
for (const menuId of [MenuId.EmptyEditorGroupContext, MenuId.EditorTabsBarContext]) {
    MenuRegistry.appendMenuItem(menuId, { command: { id: NEW_UNTITLED_FILE_COMMAND_ID, title: nls.localize(8676, null) }, group: '1_file', order: 10 });
    MenuRegistry.appendMenuItem(menuId, { command: { id: 'workbench.action.quickOpen', title: nls.localize(8677, null) }, group: '1_file', order: 20 });
}
// File menu
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '1_new',
    command: {
        id: NEW_UNTITLED_FILE_COMMAND_ID,
        title: nls.localize(8678, null)
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_COMMAND_ID,
        title: nls.localize(8679, null),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_FILE_AS_COMMAND_ID,
        title: nls.localize(8680, null),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 2
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '4_save',
    command: {
        id: SAVE_ALL_COMMAND_ID,
        title: nls.localize(8681, null),
        precondition: DirtyWorkingCopiesContext
    },
    order: 3
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '5_autosave',
    command: {
        id: ToggleAutoSaveAction.ID,
        title: nls.localize(8682, null),
        toggled: ContextKeyExpr.notEquals('config.files.autoSave', 'off')
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: REVERT_FILE_COMMAND_ID,
        title: nls.localize(8683, null),
        precondition: ContextKeyExpr.or(
        // Active editor can revert
        ContextKeyExpr.and(ActiveEditorCanRevertContext), 
        // Explorer focused but not on untitled
        ContextKeyExpr.and(ResourceContextKey.Scheme.notEqualsTo(Schemas.untitled), FoldersViewVisibleContext, SidebarFocusContext)),
    },
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CLOSE_EDITOR_COMMAND_ID,
        title: nls.localize(8684, null),
        precondition: ContextKeyExpr.or(ActiveEditorContext, ContextKeyExpr.and(FoldersViewVisibleContext, SidebarFocusContext))
    },
    order: 2
});
// Go to menu
MenuRegistry.appendMenuItem(MenuId.MenubarGoMenu, {
    group: '3_global_nav',
    command: {
        id: 'workbench.action.quickOpen',
        title: nls.localize(8685, null)
    },
    order: 1
});
// Chat used attachment anchor context menu
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 10,
    command: openToSideCommand,
    when: ContextKeyExpr.and(ResourceContextKey.IsFileSystemResource, ExplorerFolderContext.toNegated())
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: 'navigation',
    order: 20,
    command: revealInSideBarCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 10,
    command: copyPathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
MenuRegistry.appendMenuItem(MenuId.ChatAttachmentsContext, {
    group: '1_cutcopypaste',
    order: 20,
    command: copyRelativePathCommand,
    when: ResourceContextKey.IsFileSystemResource
});
// Chat resource anchor attachments/anchors context menu
for (const menuId of [MenuId.ChatInlineResourceAnchorContext, MenuId.ChatInputResourceAttachmentContext]) {
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 10,
        command: openToSideCommand,
        when: ContextKeyExpr.and(ResourceContextKey.HasResource, ExplorerFolderContext.toNegated())
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: 'navigation',
        order: 20,
        command: revealInSideBarCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 10,
        command: copyPathCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
    MenuRegistry.appendMenuItem(menuId, {
        group: '1_cutcopypaste',
        order: 20,
        command: copyRelativePathCommand,
        when: ResourceContextKey.IsFileSystemResource
    });
}
//# sourceMappingURL=fileActions.contribution.js.map