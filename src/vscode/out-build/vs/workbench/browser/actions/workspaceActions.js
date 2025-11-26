/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { IWorkspaceContextService, hasWorkspaceFileExtension } from '../../../platform/workspace/common/workspace.js';
import { IWorkspaceEditingService } from '../../services/workspaces/common/workspaceEditing.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { ICommandService } from '../../../platform/commands/common/commands.js';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, PICK_WORKSPACE_FOLDER_COMMAND_ID, SET_ROOT_FOLDER_COMMAND_ID } from './workspaceCommands.js';
import { IFileDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { MenuRegistry, MenuId, Action2, registerAction2 } from '../../../platform/actions/common/actions.js';
import { EmptyWorkspaceSupportContext, EnterMultiRootWorkspaceSupportContext, OpenFolderWorkspaceSupportContext, WorkbenchStateContext, WorkspaceFolderCountContext } from '../../common/contextkeys.js';
import { IHostService } from '../../services/host/browser/host.js';
import { KeyChord } from '../../../base/common/keyCodes.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { IWorkbenchEnvironmentService } from '../../services/environment/common/environmentService.js';
import { IWorkspacesService } from '../../../platform/workspaces/common/workspaces.js';
import { IsMacNativeContext } from '../../../platform/contextkey/common/contextkeys.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
const workspacesCategory = localize2(3303, 'Workspaces');
export class OpenFileAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFile'; }
    constructor() {
        super({
            id: OpenFileAction.ID,
            title: localize2(3304, 'Open File...'),
            category: Categories.File,
            f1: true,
            keybinding: {
                when: IsMacNativeContext.toNegated(),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFolder'; }
    constructor() {
        super({
            id: OpenFolderAction.ID,
            title: localize2(3305, 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: OpenFolderWorkspaceSupportContext,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: undefined,
                linux: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */)
                },
                win: {
                    primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */)
                }
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
export class OpenFolderViaWorkspaceAction extends Action2 {
    // This action swaps the folders of a workspace with
    // the selected folder and is a workaround for providing
    // "Open Folder..." in environments that do not support
    // this without having a workspace open (e.g. web serverless)
    static { this.ID = 'workbench.action.files.openFolderViaWorkspace'; }
    constructor() {
        super({
            id: OpenFolderViaWorkspaceAction.ID,
            title: localize2(3306, 'Open Folder...'),
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace')),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(SET_ROOT_FOLDER_COMMAND_ID);
    }
}
export class OpenFileFolderAction extends Action2 {
    static { this.ID = 'workbench.action.files.openFileFolder'; }
    static { this.LABEL = localize2(3307, 'Open...'); }
    constructor() {
        super({
            id: OpenFileFolderAction.ID,
            title: OpenFileFolderAction.LABEL,
            category: Categories.File,
            f1: true,
            precondition: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 45 /* KeyCode.KeyO */
            }
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickFileFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
    }
}
class OpenWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspace'; }
    constructor() {
        super({
            id: OpenWorkspaceAction.ID,
            title: localize2(3308, 'Open Workspace from File...'),
            category: Categories.File,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor, data) {
        const fileDialogService = accessor.get(IFileDialogService);
        return fileDialogService.pickWorkspaceAndOpen({ telemetryExtraData: data });
    }
}
class CloseWorkspaceAction extends Action2 {
    static { this.ID = 'workbench.action.closeFolder'; }
    constructor() {
        super({
            id: CloseWorkspaceAction.ID,
            title: localize2(3309, 'Close Workspace'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkbenchStateContext.notEqualsTo('empty'), EmptyWorkspaceSupportContext),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 36 /* KeyCode.KeyF */)
            }
        });
    }
    async run(accessor) {
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        return hostService.openWindow({ forceReuseWindow: true, remoteAuthority: environmentService.remoteAuthority });
    }
}
class OpenWorkspaceConfigFileAction extends Action2 {
    static { this.ID = 'workbench.action.openWorkspaceConfigFile'; }
    constructor() {
        super({
            id: OpenWorkspaceConfigFileAction.ID,
            title: localize2(3310, 'Open Workspace Configuration File'),
            category: workspacesCategory,
            f1: true,
            precondition: WorkbenchStateContext.isEqualTo('workspace')
        });
    }
    async run(accessor) {
        const contextService = accessor.get(IWorkspaceContextService);
        const editorService = accessor.get(IEditorService);
        const configuration = contextService.getWorkspace().configuration;
        if (configuration) {
            await editorService.openEditor({ resource: configuration, options: { pinned: true } });
        }
    }
}
export class AddRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.addRootFolder'; }
    constructor() {
        super({
            id: AddRootFolderAction.ID,
            title: ADD_ROOT_FOLDER_LABEL,
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace'))
        });
    }
    run(accessor) {
        const commandService = accessor.get(ICommandService);
        return commandService.executeCommand(ADD_ROOT_FOLDER_COMMAND_ID);
    }
}
export class RemoveRootFolderAction extends Action2 {
    static { this.ID = 'workbench.action.removeRootFolder'; }
    constructor() {
        super({
            id: RemoveRootFolderAction.ID,
            title: localize2(3311, 'Remove Folder from Workspace...'),
            category: workspacesCategory,
            f1: true,
            precondition: ContextKeyExpr.and(WorkspaceFolderCountContext.notEqualsTo('0'), ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')))
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const folder = await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        if (folder) {
            await workspaceEditingService.removeFolders([folder.uri]);
        }
    }
}
class SaveWorkspaceAsAction extends Action2 {
    static { this.ID = 'workbench.action.saveWorkspaceAs'; }
    constructor() {
        super({
            id: SaveWorkspaceAsAction.ID,
            title: localize2(3312, 'Save Workspace As...'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor) {
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const contextService = accessor.get(IWorkspaceContextService);
        const configPathUri = await workspaceEditingService.pickNewWorkspacePath();
        if (configPathUri && hasWorkspaceFileExtension(configPathUri)) {
            switch (contextService.getWorkbenchState()) {
                case 1 /* WorkbenchState.EMPTY */:
                case 2 /* WorkbenchState.FOLDER */: {
                    const folders = contextService.getWorkspace().folders.map(folder => ({ uri: folder.uri }));
                    return workspaceEditingService.createAndEnterWorkspace(folders, configPathUri);
                }
                case 3 /* WorkbenchState.WORKSPACE */:
                    return workspaceEditingService.saveAndEnterWorkspace(configPathUri);
            }
        }
    }
}
class DuplicateWorkspaceInNewWindowAction extends Action2 {
    static { this.ID = 'workbench.action.duplicateWorkspaceInNewWindow'; }
    constructor() {
        super({
            id: DuplicateWorkspaceInNewWindowAction.ID,
            title: localize2(3313, 'Duplicate As Workspace in New Window'),
            category: workspacesCategory,
            f1: true,
            precondition: EnterMultiRootWorkspaceSupportContext
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const workspaceEditingService = accessor.get(IWorkspaceEditingService);
        const hostService = accessor.get(IHostService);
        const workspacesService = accessor.get(IWorkspacesService);
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        const folders = workspaceContextService.getWorkspace().folders;
        const remoteAuthority = environmentService.remoteAuthority;
        const newWorkspace = await workspacesService.createUntitledWorkspace(folders, remoteAuthority);
        await workspaceEditingService.copyWorkspaceSettings(newWorkspace);
        return hostService.openWindow([{ workspaceUri: newWorkspace.configPath }], { forceNewWindow: true, remoteAuthority });
    }
}
// --- Actions Registration
registerAction2(AddRootFolderAction);
registerAction2(RemoveRootFolderAction);
registerAction2(OpenFileAction);
registerAction2(OpenFolderAction);
registerAction2(OpenFolderViaWorkspaceAction);
registerAction2(OpenFileFolderAction);
registerAction2(OpenWorkspaceAction);
registerAction2(OpenWorkspaceConfigFileAction);
registerAction2(CloseWorkspaceAction);
registerAction2(SaveWorkspaceAsAction);
registerAction2(DuplicateWorkspaceInNewWindowAction);
// --- Menu Registration
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileAction.ID,
        title: localize(3293, null)
    },
    order: 1,
    when: IsMacNativeContext.toNegated()
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderAction.ID,
        title: localize(3294, null)
    },
    order: 2,
    when: OpenFolderWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFolderViaWorkspaceAction.ID,
        title: localize(3295, null)
    },
    order: 2,
    when: ContextKeyExpr.and(OpenFolderWorkspaceSupportContext.toNegated(), WorkbenchStateContext.isEqualTo('workspace'))
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenFileFolderAction.ID,
        title: localize(3296, null)
    },
    order: 1,
    when: ContextKeyExpr.and(IsMacNativeContext, OpenFolderWorkspaceSupportContext)
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '2_open',
    command: {
        id: OpenWorkspaceAction.ID,
        title: localize(3297, null)
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: ADD_ROOT_FOLDER_COMMAND_ID,
        title: localize(3298, null)
    },
    when: ContextKeyExpr.or(EnterMultiRootWorkspaceSupportContext, WorkbenchStateContext.isEqualTo('workspace')),
    order: 1
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: SaveWorkspaceAsAction.ID,
        title: localize(3299, null)
    },
    order: 2,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '3_workspace',
    command: {
        id: DuplicateWorkspaceInNewWindowAction.ID,
        title: localize(3300, null)
    },
    order: 3,
    when: EnterMultiRootWorkspaceSupportContext
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize(3301, null)
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('folder'), EmptyWorkspaceSupportContext)
});
MenuRegistry.appendMenuItem(MenuId.MenubarFileMenu, {
    group: '6_close',
    command: {
        id: CloseWorkspaceAction.ID,
        title: localize(3302, null)
    },
    order: 3,
    when: ContextKeyExpr.and(WorkbenchStateContext.isEqualTo('workspace'), EmptyWorkspaceSupportContext)
});
//# sourceMappingURL=workspaceActions.js.map