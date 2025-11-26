/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { isWindows, OS } from '../../../../base/common/platform.js';
import { extname, basename, isAbsolute } from '../../../../base/common/path.js';
import * as resources from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Action } from '../../../../base/common/actions.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { VIEWLET_ID, VIEW_ID } from '../common/files.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IQuickInputService, ItemActivation } from '../../../../platform/quickinput/common/quickInput.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID, SAVE_ALL_IN_GROUP_COMMAND_ID, NEW_UNTITLED_FILE_COMMAND_ID } from './fileConstants.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../base/common/network.js';
import { IDialogService, getFileNamesMessage } from '../../../../platform/dialogs/common/dialogs.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CLOSE_EDITORS_AND_GROUP_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { NewExplorerItem } from '../common/explorerModel.js';
import { getErrorMessage } from '../../../../base/common/errors.js';
import { triggerUpload } from '../../../../base/browser/dom.js';
import { IFilesConfigurationService } from '../../../services/filesConfiguration/common/filesConfigurationService.js';
import { IWorkingCopyService } from '../../../services/workingCopy/common/workingCopyService.js';
import { timeout } from '../../../../base/common/async.js';
import { IWorkingCopyFileService } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { trim, rtrim } from '../../../../base/common/strings.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { ResourceFileEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { IExplorerService } from './files.js';
import { BrowserFileUpload, FileDownload } from './fileImportExport.js';
import { IPaneCompositePartService } from '../../../services/panecomposite/browser/panecomposite.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { IPathService } from '../../../services/path/common/pathService.js';
import { Action2 } from '../../../../platform/actions/common/actions.js';
import { ActiveEditorCanToggleReadonlyContext, ActiveEditorContext, EmptyWorkspaceSupportContext } from '../../../common/contextkeys.js';
import { KeyChord } from '../../../../base/common/keyCodes.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { getPathForFile } from '../../../../platform/dnd/browser/dnd.js';
export const NEW_FILE_COMMAND_ID = 'explorer.newFile';
export const NEW_FILE_LABEL = nls.localize2(8769, "New File...");
export const NEW_FOLDER_COMMAND_ID = 'explorer.newFolder';
export const NEW_FOLDER_LABEL = nls.localize2(8770, "New Folder...");
export const TRIGGER_RENAME_LABEL = nls.localize(8694, null);
export const MOVE_FILE_TO_TRASH_LABEL = nls.localize(8695, null);
export const COPY_FILE_LABEL = nls.localize(8696, null);
export const PASTE_FILE_LABEL = nls.localize(8697, null);
export const FileCopiedContext = new RawContextKey('fileCopied', false);
export const DOWNLOAD_COMMAND_ID = 'explorer.download';
export const DOWNLOAD_LABEL = nls.localize(8698, null);
export const UPLOAD_COMMAND_ID = 'explorer.upload';
export const UPLOAD_LABEL = nls.localize(8699, null);
const CONFIRM_DELETE_SETTING_KEY = 'explorer.confirmDelete';
const MAX_UNDO_FILE_SIZE = 5000000; // 5mb
async function refreshIfSeparator(value, explorerService) {
    if (value && ((value.indexOf('/') >= 0) || (value.indexOf('\\') >= 0))) {
        // New input contains separator, multiple resources will get created workaround for #68204
        await explorerService.refresh();
    }
}
async function deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm = false, ignoreIfNotExists = false) {
    let primaryButton;
    if (useTrash) {
        primaryButton = isWindows ? nls.localize(8700, null) : nls.localize(8701, null);
    }
    else {
        primaryButton = nls.localize(8702, null);
    }
    // Handle dirty
    const distinctElements = resources.distinctParents(elements, e => e.resource);
    const dirtyWorkingCopies = new Set();
    for (const distinctElement of distinctElements) {
        for (const dirtyWorkingCopy of workingCopyFileService.getDirty(distinctElement.resource)) {
            dirtyWorkingCopies.add(dirtyWorkingCopy);
        }
    }
    if (dirtyWorkingCopies.size) {
        let message;
        if (distinctElements.length > 1) {
            message = nls.localize(8703, null);
        }
        else if (distinctElements[0].isDirectory) {
            if (dirtyWorkingCopies.size === 1) {
                message = nls.localize(8704, null, distinctElements[0].name);
            }
            else {
                message = nls.localize(8705, null, distinctElements[0].name, dirtyWorkingCopies.size);
            }
        }
        else {
            message = nls.localize(8706, null, distinctElements[0].name);
        }
        const response = await dialogService.confirm({
            type: 'warning',
            message,
            detail: nls.localize(8707, null),
            primaryButton
        });
        if (!response.confirmed) {
            return;
        }
        else {
            skipConfirm = true;
        }
    }
    // Handle readonly
    if (!skipConfirm) {
        const readonlyResources = distinctElements.filter(e => filesConfigurationService.isReadonly(e.resource));
        if (readonlyResources.length) {
            let message;
            if (readonlyResources.length > 1) {
                message = nls.localize(8708, null);
            }
            else if (readonlyResources[0].isDirectory) {
                message = nls.localize(8709, null, distinctElements[0].name);
            }
            else {
                message = nls.localize(8710, null, distinctElements[0].name);
            }
            const response = await dialogService.confirm({
                type: 'warning',
                message,
                detail: nls.localize(8711, null),
                primaryButton: nls.localize(8712, null)
            });
            if (!response.confirmed) {
                return;
            }
        }
    }
    let confirmation;
    // We do not support undo of folders, so in that case the delete action is irreversible
    const deleteDetail = distinctElements.some(e => e.isDirectory) ? nls.localize(8713, null) :
        distinctElements.length > 1 ? nls.localize(8714, null) : nls.localize(8715, null);
    // Check if we need to ask for confirmation at all
    if (skipConfirm || (useTrash && configurationService.getValue(CONFIRM_DELETE_SETTING_KEY) === false)) {
        confirmation = { confirmed: true };
    }
    // Confirm for moving to trash
    else if (useTrash) {
        let { message, detail } = getMoveToTrashMessage(distinctElements);
        detail += detail ? '\n' : '';
        if (isWindows) {
            detail += distinctElements.length > 1 ? nls.localize(8716, null) : nls.localize(8717, null);
        }
        else {
            detail += distinctElements.length > 1 ? nls.localize(8718, null) : nls.localize(8719, null);
        }
        confirmation = await dialogService.confirm({
            message,
            detail,
            primaryButton,
            checkbox: {
                label: nls.localize(8720, null)
            }
        });
    }
    // Confirm for deleting permanently
    else {
        let { message, detail } = getDeleteMessage(distinctElements);
        detail += detail ? '\n' : '';
        detail += deleteDetail;
        confirmation = await dialogService.confirm({
            type: 'warning',
            message,
            detail,
            primaryButton
        });
    }
    // Check for confirmation checkbox
    if (confirmation.confirmed && confirmation.checkboxChecked === true) {
        await configurationService.updateValue(CONFIRM_DELETE_SETTING_KEY, false);
    }
    // Check for confirmation
    if (!confirmation.confirmed) {
        return;
    }
    // Call function
    try {
        const resourceFileEdits = distinctElements.map(e => new ResourceFileEdit(e.resource, undefined, { recursive: true, folder: e.isDirectory, ignoreIfNotExists, skipTrashBin: !useTrash, maxSize: MAX_UNDO_FILE_SIZE }));
        const options = {
            undoLabel: distinctElements.length > 1 ? nls.localize(8721, null, distinctElements.length) : nls.localize(8722, null, distinctElements[0].name),
            progressLabel: distinctElements.length > 1 ? nls.localize(8723, null, distinctElements.length) : nls.localize(8724, null, distinctElements[0].name),
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
    catch (error) {
        // Handle error to delete file(s) from a modal confirmation dialog
        let errorMessage;
        let detailMessage;
        let primaryButton;
        if (useTrash) {
            errorMessage = isWindows ? nls.localize(8725, null) : nls.localize(8726, null);
            detailMessage = deleteDetail;
            primaryButton = nls.localize(8727, null);
        }
        else {
            errorMessage = toErrorMessage(error, false);
            primaryButton = nls.localize(8728, null);
        }
        const res = await dialogService.confirm({
            type: 'warning',
            message: errorMessage,
            detail: detailMessage,
            primaryButton
        });
        if (res.confirmed) {
            if (useTrash) {
                useTrash = false; // Delete Permanently
            }
            skipConfirm = true;
            ignoreIfNotExists = true;
            return deleteFiles(explorerService, workingCopyFileService, dialogService, configurationService, filesConfigurationService, elements, useTrash, skipConfirm, ignoreIfNotExists);
        }
    }
}
function getMoveToTrashMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize(8729, null, distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize(8730, null, distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map(e => e.resource))
            };
        }
        return {
            message: nls.localize(8731, null, distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements[0].isDirectory && !distinctElements[0].isSymbolicLink) {
        return { message: nls.localize(8732, null, distinctElements[0].name), detail: '' };
    }
    return { message: nls.localize(8733, null, distinctElements[0].name), detail: '' };
}
function getDeleteMessage(distinctElements) {
    if (containsBothDirectoryAndFile(distinctElements)) {
        return {
            message: nls.localize(8734, null, distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements.length > 1) {
        if (distinctElements[0].isDirectory) {
            return {
                message: nls.localize(8735, null, distinctElements.length),
                detail: getFileNamesMessage(distinctElements.map(e => e.resource))
            };
        }
        return {
            message: nls.localize(8736, null, distinctElements.length),
            detail: getFileNamesMessage(distinctElements.map(e => e.resource))
        };
    }
    if (distinctElements[0].isDirectory) {
        return { message: nls.localize(8737, null, distinctElements[0].name), detail: '' };
    }
    return { message: nls.localize(8738, null, distinctElements[0].name), detail: '' };
}
function containsBothDirectoryAndFile(distinctElements) {
    const directory = distinctElements.find(element => element.isDirectory);
    const file = distinctElements.find(element => !element.isDirectory);
    return !!directory && !!file;
}
export async function findValidPasteFileTarget(explorerService, fileService, dialogService, targetFolder, fileToPaste, incrementalNaming) {
    let name = typeof fileToPaste.resource === 'string' ? fileToPaste.resource : resources.basenameOrAuthority(fileToPaste.resource);
    let candidate = resources.joinPath(targetFolder.resource, name);
    // In the disabled case we must ask if it's ok to overwrite the file if it exists
    if (incrementalNaming === 'disabled') {
        const canOverwrite = await askForOverwrite(fileService, dialogService, candidate);
        if (!canOverwrite) {
            return;
        }
    }
    while (true && !fileToPaste.allowOverwrite) {
        if (!explorerService.findClosest(candidate)) {
            break;
        }
        if (incrementalNaming !== 'disabled') {
            name = incrementFileName(name, !!fileToPaste.isDirectory, incrementalNaming);
        }
        candidate = resources.joinPath(targetFolder.resource, name);
    }
    return candidate;
}
export function incrementFileName(name, isFolder, incrementalNaming) {
    if (incrementalNaming === 'simple') {
        let namePrefix = name;
        let extSuffix = '';
        if (!isFolder) {
            extSuffix = extname(name);
            namePrefix = basename(name, extSuffix);
        }
        // name copy 5(.txt) => name copy 6(.txt)
        // name copy(.txt) => name copy 2(.txt)
        const suffixRegex = /^(.+ copy)( \d+)?$/;
        if (suffixRegex.test(namePrefix)) {
            return namePrefix.replace(suffixRegex, (match, g1, g2) => {
                const number = (g2 ? parseInt(g2) : 1);
                return number === 0
                    ? `${g1}`
                    : (number < 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */
                        ? `${g1} ${number + 1}`
                        : `${g1}${g2} copy`);
            }) + extSuffix;
        }
        // name(.txt) => name copy(.txt)
        return `${namePrefix} copy${extSuffix}`;
    }
    const separators = '[\\.\\-_]';
    const maxNumber = 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */;
    // file.1.txt=>file.2.txt
    const suffixFileRegex = RegExp('(.*' + separators + ')(\\d+)(\\..*)$');
    if (!isFolder && name.match(suffixFileRegex)) {
        return name.replace(suffixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g2);
            return number < maxNumber
                ? g1 + String(number + 1).padStart(g2.length, '0') + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.file.txt=>2.file.txt
    const prefixFileRegex = RegExp('(\\d+)(' + separators + '.*)(\\..*)$');
    if (!isFolder && name.match(prefixFileRegex)) {
        return name.replace(prefixFileRegex, (match, g1, g2, g3) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0') + g2 + g3
                : `${g1}${g2}.1${g3}`;
        });
    }
    // 1.txt=>2.txt
    const prefixFileNoNameRegex = RegExp('(\\d+)(\\..*)$');
    if (!isFolder && name.match(prefixFileNoNameRegex)) {
        return name.replace(prefixFileNoNameRegex, (match, g1, g2) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0') + g2
                : `${g1}.1${g2}`;
        });
    }
    // file.txt=>file.1.txt
    const lastIndexOfDot = name.lastIndexOf('.');
    if (!isFolder && lastIndexOfDot >= 0) {
        return `${name.substr(0, lastIndexOfDot)}.1${name.substr(lastIndexOfDot)}`;
    }
    // 123 => 124
    const noNameNoExtensionRegex = RegExp('(\\d+)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noNameNoExtensionRegex)) {
        return name.replace(noNameNoExtensionRegex, (match, g1) => {
            const number = parseInt(g1);
            return number < maxNumber
                ? String(number + 1).padStart(g1.length, '0')
                : `${g1}.1`;
        });
    }
    // file => file1
    // file1 => file2
    const noExtensionRegex = RegExp('(.*)(\\d*)$');
    if (!isFolder && lastIndexOfDot === -1 && name.match(noExtensionRegex)) {
        return name.replace(noExtensionRegex, (match, g1, g2) => {
            let number = parseInt(g2);
            if (isNaN(number)) {
                number = 0;
            }
            return number < maxNumber
                ? g1 + String(number + 1).padStart(g2.length, '0')
                : `${g1}${g2}.1`;
        });
    }
    // folder.1=>folder.2
    if (isFolder && name.match(/(\d+)$/)) {
        return name.replace(/(\d+)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0')
                : `${groups[0]}.1`;
        });
    }
    // 1.folder=>2.folder
    if (isFolder && name.match(/^(\d+)/)) {
        return name.replace(/^(\d+)(.*)$/, (match, ...groups) => {
            const number = parseInt(groups[0]);
            return number < maxNumber
                ? String(number + 1).padStart(groups[0].length, '0') + groups[1]
                : `${groups[0]}${groups[1]}.1`;
        });
    }
    // file/folder=>file.1/folder.1
    return `${name}.1`;
}
/**
 * Checks to see if the resource already exists, if so prompts the user if they would be ok with it being overwritten
 * @param fileService The file service
 * @param dialogService The dialog service
 * @param targetResource The resource to be overwritten
 * @return A boolean indicating if the user is ok with resource being overwritten, if the resource does not exist it returns true.
 */
async function askForOverwrite(fileService, dialogService, targetResource) {
    const exists = await fileService.exists(targetResource);
    if (!exists) {
        return true;
    }
    // Ask for overwrite confirmation
    const { confirmed } = await dialogService.confirm({
        type: Severity.Warning,
        message: nls.localize(8739, null, basename(targetResource.path)),
        primaryButton: nls.localize(8740, null)
    });
    return confirmed;
}
// Global Compare with
export class GlobalCompareResourcesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareFileWith'; }
    static { this.LABEL = nls.localize2(8771, "Compare Active File With..."); }
    constructor() {
        super({
            id: GlobalCompareResourcesAction.ID,
            title: GlobalCompareResourcesAction.LABEL,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorContext,
            metadata: {
                description: nls.localize2(8772, "Opens a picker to select a file to diff with the active editor.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const textModelService = accessor.get(ITextModelService);
        const quickInputService = accessor.get(IQuickInputService);
        const activeInput = editorService.activeEditor;
        const activeResource = EditorResourceAccessor.getOriginalUri(activeInput);
        if (activeResource && textModelService.canHandleResource(activeResource)) {
            const picks = await quickInputService.quickAccess.pick('', { itemActivation: ItemActivation.SECOND });
            if (picks?.length === 1) {
                const resource = picks[0].resource;
                if (URI.isUri(resource) && textModelService.canHandleResource(resource)) {
                    editorService.openEditor({
                        original: { resource: activeResource },
                        modified: { resource: resource },
                        options: { pinned: true }
                    });
                }
            }
        }
    }
}
export class ToggleAutoSaveAction extends Action2 {
    static { this.ID = 'workbench.action.toggleAutoSave'; }
    constructor() {
        super({
            id: ToggleAutoSaveAction.ID,
            title: nls.localize2(8773, "Toggle Auto Save"),
            f1: true,
            category: Categories.File,
            metadata: { description: nls.localize2(8774, "Toggle the ability to save files automatically after typing") }
        });
    }
    run(accessor) {
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        return filesConfigurationService.toggleAutoSave();
    }
}
let BaseSaveAllAction = class BaseSaveAllAction extends Action {
    constructor(id, label, commandService, notificationService, workingCopyService) {
        super(id, label);
        this.commandService = commandService;
        this.notificationService = notificationService;
        this.workingCopyService = workingCopyService;
        this.lastDirtyState = this.workingCopyService.hasDirty;
        this.enabled = this.lastDirtyState;
        this.registerListeners();
    }
    registerListeners() {
        // update enablement based on working copy changes
        this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.updateEnablement(workingCopy)));
    }
    updateEnablement(workingCopy) {
        const hasDirty = workingCopy.isDirty() || this.workingCopyService.hasDirty;
        if (this.lastDirtyState !== hasDirty) {
            this.enabled = hasDirty;
            this.lastDirtyState = this.enabled;
        }
    }
    async run(context) {
        try {
            await this.doRun(context);
        }
        catch (error) {
            this.notificationService.error(toErrorMessage(error, false));
        }
    }
};
BaseSaveAllAction = __decorate([
    __param(2, ICommandService),
    __param(3, INotificationService),
    __param(4, IWorkingCopyService)
], BaseSaveAllAction);
export class SaveAllInGroupAction extends BaseSaveAllAction {
    static { this.ID = 'workbench.files.action.saveAllInGroup'; }
    static { this.LABEL = nls.localize(8741, null); }
    get class() {
        return 'explorer-action ' + ThemeIcon.asClassName(Codicon.saveAll);
    }
    doRun(context) {
        return this.commandService.executeCommand(SAVE_ALL_IN_GROUP_COMMAND_ID, {}, context);
    }
}
let CloseGroupAction = class CloseGroupAction extends Action {
    static { this.ID = 'workbench.files.action.closeGroup'; }
    static { this.LABEL = nls.localize(8742, null); }
    constructor(id, label, commandService) {
        super(id, label, ThemeIcon.asClassName(Codicon.closeAll));
        this.commandService = commandService;
    }
    run(context) {
        return this.commandService.executeCommand(CLOSE_EDITORS_AND_GROUP_COMMAND_ID, {}, context);
    }
};
CloseGroupAction = __decorate([
    __param(2, ICommandService)
], CloseGroupAction);
export { CloseGroupAction };
export class FocusFilesExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.focusFilesExplorer'; }
    static { this.LABEL = nls.localize2(8775, "Focus on Files Explorer"); }
    constructor() {
        super({
            id: FocusFilesExplorer.ID,
            title: FocusFilesExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2(8776, "Moves focus to the file explorer view container.")
            }
        });
    }
    async run(accessor) {
        const paneCompositeService = accessor.get(IPaneCompositePartService);
        await paneCompositeService.openPaneComposite(VIEWLET_ID, 0 /* ViewContainerLocation.Sidebar */, true);
    }
}
export class ShowActiveFileInExplorer extends Action2 {
    static { this.ID = 'workbench.files.action.showActiveFileInExplorer'; }
    static { this.LABEL = nls.localize2(8777, "Reveal Active File in Explorer View"); }
    constructor() {
        super({
            id: ShowActiveFileInExplorer.ID,
            title: ShowActiveFileInExplorer.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2(8778, "Reveals and selects the active file within the explorer view.")
            }
        });
    }
    async run(accessor) {
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (resource) {
            commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, resource);
        }
    }
}
export class OpenActiveFileInEmptyWorkspace extends Action2 {
    static { this.ID = 'workbench.action.files.showOpenedFileInNewWindow'; }
    static { this.LABEL = nls.localize2(8779, "Open Active Editor in New Empty Workspace"); }
    constructor() {
        super({
            id: OpenActiveFileInEmptyWorkspace.ID,
            title: OpenActiveFileInEmptyWorkspace.LABEL,
            f1: true,
            category: Categories.File,
            precondition: EmptyWorkspaceSupportContext,
            metadata: {
                description: nls.localize2(8780, "Opens the active editor in a new window with no folders open.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const hostService = accessor.get(IHostService);
        const dialogService = accessor.get(IDialogService);
        const fileService = accessor.get(IFileService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (fileResource && fileService.hasProvider(fileResource)) {
            hostService.openWindow([{ fileUri: fileResource }], { forceNewWindow: true });
        }
        else {
            dialogService.error(nls.localize(8743, null));
        }
    }
}
export function validateFileName(pathService, item, name, os) {
    // Produce a well formed file name
    name = getWellFormedFileName(name);
    // Name not provided
    if (!name || name.length === 0 || /^\s+$/.test(name)) {
        return {
            content: nls.localize(8744, null),
            severity: Severity.Error
        };
    }
    // Relative paths only
    if (name[0] === '/' || name[0] === '\\') {
        return {
            content: nls.localize(8745, null),
            severity: Severity.Error
        };
    }
    const names = coalesce(name.split(/[\\/]/));
    const parent = item.parent;
    if (name !== item.name) {
        // Do not allow to overwrite existing file
        const child = parent?.getChild(name);
        if (child && child !== item) {
            return {
                content: nls.localize(8746, null, name),
                severity: Severity.Error
            };
        }
    }
    // Check for invalid file name.
    if (names.some(folderName => !pathService.hasValidBasename(item.resource, os, folderName))) {
        // Escape * characters
        const escapedName = name.replace(/\*/g, '\\*'); // CodeQL [SM02383] This only processes filenames which are enforced against having backslashes in them farther up in the stack.
        return {
            content: nls.localize(8747, null, trimLongName(escapedName)),
            severity: Severity.Error
        };
    }
    if (names.some(name => /^\s|\s$/.test(name))) {
        return {
            content: nls.localize(8748, null),
            severity: Severity.Warning
        };
    }
    return null;
}
function trimLongName(name) {
    if (name?.length > 255) {
        return `${name.substr(0, 255)}...`;
    }
    return name;
}
function getWellFormedFileName(filename) {
    if (!filename) {
        return filename;
    }
    // Trim tabs
    filename = trim(filename, '\t');
    // Remove trailing slashes
    filename = rtrim(filename, '/');
    filename = rtrim(filename, '\\');
    return filename;
}
export class CompareNewUntitledTextFilesAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareNewUntitledTextFiles'; }
    static { this.LABEL = nls.localize2(8781, "Compare New Untitled Text Files"); }
    constructor() {
        super({
            id: CompareNewUntitledTextFilesAction.ID,
            title: CompareNewUntitledTextFilesAction.LABEL,
            f1: true,
            category: Categories.File,
            metadata: {
                description: nls.localize2(8782, "Opens a new diff editor with two untitled files.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        await editorService.openEditor({
            original: { resource: undefined },
            modified: { resource: undefined },
            options: { pinned: true }
        });
    }
}
export class CompareWithClipboardAction extends Action2 {
    static { this.ID = 'workbench.files.action.compareWithClipboard'; }
    static { this.LABEL = nls.localize2(8783, "Compare Active File with Clipboard"); }
    static { this.SCHEME_COUNTER = 0; }
    constructor() {
        super({
            id: CompareWithClipboardAction.ID,
            title: CompareWithClipboardAction.LABEL,
            f1: true,
            category: Categories.File,
            keybinding: { primary: KeyChord(2048 /* KeyMod.CtrlCmd */ | 41 /* KeyCode.KeyK */, 33 /* KeyCode.KeyC */), weight: 200 /* KeybindingWeight.WorkbenchContrib */ },
            metadata: {
                description: nls.localize2(8784, "Opens a new diff editor to compare the active file with the contents of the clipboard.")
            }
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const instantiationService = accessor.get(IInstantiationService);
        const textModelService = accessor.get(ITextModelService);
        const fileService = accessor.get(IFileService);
        const resource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        const scheme = `clipboardCompare${CompareWithClipboardAction.SCHEME_COUNTER++}`;
        if (resource && (fileService.hasProvider(resource) || resource.scheme === Schemas.untitled)) {
            if (!this.registrationDisposal) {
                const provider = instantiationService.createInstance(ClipboardContentProvider);
                this.registrationDisposal = textModelService.registerTextModelContentProvider(scheme, provider);
            }
            const name = resources.basename(resource);
            const editorLabel = nls.localize(8749, null, name);
            await editorService.openEditor({
                original: { resource: resource.with({ scheme }) },
                modified: { resource: resource },
                label: editorLabel,
                options: { pinned: true }
            }).finally(() => {
                dispose(this.registrationDisposal);
                this.registrationDisposal = undefined;
            });
        }
    }
    dispose() {
        dispose(this.registrationDisposal);
        this.registrationDisposal = undefined;
    }
}
let ClipboardContentProvider = class ClipboardContentProvider {
    constructor(clipboardService, languageService, modelService) {
        this.clipboardService = clipboardService;
        this.languageService = languageService;
        this.modelService = modelService;
    }
    async provideTextContent(resource) {
        const text = await this.clipboardService.readText();
        const model = this.modelService.createModel(text, this.languageService.createByFilepathOrFirstLine(resource), resource);
        return model;
    }
};
ClipboardContentProvider = __decorate([
    __param(0, IClipboardService),
    __param(1, ILanguageService),
    __param(2, IModelService)
], ClipboardContentProvider);
function onErrorWithRetry(notificationService, error, retry) {
    notificationService.prompt(Severity.Error, toErrorMessage(error, false), [{
            label: nls.localize(8750, null),
            run: () => retry()
        }]);
}
async function openExplorerAndCreate(accessor, isFolder) {
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const configService = accessor.get(IConfigurationService);
    const filesConfigService = accessor.get(IFilesConfigurationService);
    const editorService = accessor.get(IEditorService);
    const viewsService = accessor.get(IViewsService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const commandService = accessor.get(ICommandService);
    const pathService = accessor.get(IPathService);
    const wasHidden = !viewsService.isViewVisible(VIEW_ID);
    const view = await viewsService.openView(VIEW_ID, true);
    if (wasHidden) {
        // Give explorer some time to resolve itself #111218
        await timeout(500);
    }
    if (!view) {
        // Can happen in empty workspace case (https://github.com/microsoft/vscode/issues/100604)
        if (isFolder) {
            throw new Error('Open a folder or workspace first.');
        }
        return commandService.executeCommand(NEW_UNTITLED_FILE_COMMAND_ID);
    }
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    let folder;
    if (stat) {
        folder = stat.isDirectory ? stat : (stat.parent || explorerService.roots[0]);
    }
    else {
        folder = explorerService.roots[0];
    }
    if (folder.isReadonly) {
        throw new Error('Parent folder is readonly.');
    }
    const newStat = new NewExplorerItem(fileService, configService, filesConfigService, folder, isFolder);
    folder.addChild(newStat);
    const onSuccess = async (value) => {
        try {
            const resourceToCreate = resources.joinPath(folder.resource, value);
            if (value.endsWith('/')) {
                isFolder = true;
            }
            await explorerService.applyBulkEdit([new ResourceFileEdit(undefined, resourceToCreate, { folder: isFolder })], {
                undoLabel: nls.localize(8751, null, value),
                progressLabel: nls.localize(8752, null, value),
                confirmBeforeUndo: true
            });
            await refreshIfSeparator(value, explorerService);
            if (isFolder) {
                await explorerService.select(resourceToCreate, true);
            }
            else {
                await editorService.openEditor({ resource: resourceToCreate, options: { pinned: true } });
            }
        }
        catch (error) {
            onErrorWithRetry(notificationService, error, () => onSuccess(value));
        }
    };
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(newStat, {
        validationMessage: value => validateFileName(pathService, newStat, value, os),
        onFinish: async (value, success) => {
            folder.removeChild(newStat);
            await explorerService.setEditable(newStat, null);
            if (success) {
                onSuccess(value);
            }
        }
    });
}
CommandsRegistry.registerCommand({
    id: NEW_FILE_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, false);
    }
});
CommandsRegistry.registerCommand({
    id: NEW_FOLDER_COMMAND_ID,
    handler: async (accessor) => {
        await openExplorerAndCreate(accessor, true);
    }
});
export const renameHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const remoteAgentService = accessor.get(IRemoteAgentService);
    const pathService = accessor.get(IPathService);
    const configurationService = accessor.get(IConfigurationService);
    const stats = explorerService.getContext(false);
    const stat = stats.length > 0 ? stats[0] : undefined;
    if (!stat) {
        return;
    }
    const os = (await remoteAgentService.getEnvironment())?.os ?? OS;
    await explorerService.setEditable(stat, {
        validationMessage: value => validateFileName(pathService, stat, value, os),
        onFinish: async (value, success) => {
            if (success) {
                const parentResource = stat.parent.resource;
                const targetResource = resources.joinPath(parentResource, value);
                if (stat.resource.toString() !== targetResource.toString()) {
                    try {
                        await explorerService.applyBulkEdit([new ResourceFileEdit(stat.resource, targetResource)], {
                            confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
                            undoLabel: nls.localize(8753, null, stat.name, value),
                            progressLabel: nls.localize(8754, null, stat.name, value),
                        });
                        await refreshIfSeparator(value, explorerService);
                    }
                    catch (e) {
                        notificationService.error(e);
                    }
                }
            }
            await explorerService.setEditable(stat, null);
        }
    });
};
export const moveFileToTrashHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter(s => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, true);
    }
};
export const deleteFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true).filter(s => !s.isRoot);
    if (stats.length) {
        await deleteFiles(accessor.get(IExplorerService), accessor.get(IWorkingCopyFileService), accessor.get(IDialogService), accessor.get(IConfigurationService), accessor.get(IFilesConfigurationService), stats, false);
    }
};
let pasteShouldMove = false;
export const copyFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, false);
        pasteShouldMove = false;
    }
};
export const cutFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    if (stats.length > 0) {
        await explorerService.setToCopy(stats, true);
        pasteShouldMove = true;
    }
};
const downloadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(true);
    const explorerItems = context.length ? context : explorerService.roots;
    const downloadHandler = instantiationService.createInstance(FileDownload);
    try {
        await downloadHandler.download(explorerItems);
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: DOWNLOAD_COMMAND_ID,
    handler: downloadFileHandler
});
const uploadFileHandler = async (accessor) => {
    const explorerService = accessor.get(IExplorerService);
    const notificationService = accessor.get(INotificationService);
    const instantiationService = accessor.get(IInstantiationService);
    const context = explorerService.getContext(false);
    const element = context.length ? context[0] : explorerService.roots[0];
    try {
        const files = await triggerUpload();
        if (files) {
            const browserUpload = instantiationService.createInstance(BrowserFileUpload);
            await browserUpload.upload(element, files);
        }
    }
    catch (error) {
        notificationService.error(error);
        throw error;
    }
};
CommandsRegistry.registerCommand({
    id: UPLOAD_COMMAND_ID,
    handler: uploadFileHandler
});
export const pasteFileHandler = async (accessor, fileList) => {
    const clipboardService = accessor.get(IClipboardService);
    const explorerService = accessor.get(IExplorerService);
    const fileService = accessor.get(IFileService);
    const notificationService = accessor.get(INotificationService);
    const editorService = accessor.get(IEditorService);
    const configurationService = accessor.get(IConfigurationService);
    const uriIdentityService = accessor.get(IUriIdentityService);
    const dialogService = accessor.get(IDialogService);
    const hostService = accessor.get(IHostService);
    const context = explorerService.getContext(false);
    const hasNativeFilesToPaste = fileList && fileList.length > 0;
    const confirmPasteNative = hasNativeFilesToPaste && configurationService.getValue('explorer.confirmPasteNative');
    const toPaste = await getFilesToPaste(fileList, clipboardService, hostService);
    if (confirmPasteNative && toPaste.files.length >= 1) {
        const message = toPaste.files.length > 1 ?
            nls.localize(8755, null, toPaste.files.length) :
            nls.localize(8756, null, basename(toPaste.type === 'paths' ? toPaste.files[0].fsPath : toPaste.files[0].name));
        const detail = toPaste.files.length > 1 ? getFileNamesMessage(toPaste.files.map(item => {
            if (URI.isUri(item)) {
                return item.fsPath;
            }
            if (toPaste.type === 'paths') {
                const path = getPathForFile(item);
                if (path) {
                    return path;
                }
            }
            return item.name;
        })) : undefined;
        const confirmation = await dialogService.confirm({
            message,
            detail,
            checkbox: {
                label: nls.localize(8757, null)
            },
            primaryButton: nls.localize(8758, null)
        });
        if (!confirmation.confirmed) {
            return;
        }
        // Check for confirmation checkbox
        if (confirmation.checkboxChecked === true) {
            await configurationService.updateValue('explorer.confirmPasteNative', false);
        }
    }
    const element = context.length ? context[0] : explorerService.roots[0];
    const incrementalNaming = configurationService.getValue().explorer.incrementalNaming;
    const editableItem = explorerService.getEditable();
    // If it's an editable item, just do nothing
    if (editableItem) {
        return;
    }
    try {
        let targets = [];
        if (toPaste.type === 'paths') { // Pasting from files on disk
            // Check if target is ancestor of pasted folder
            const sourceTargetPairs = coalesce(await Promise.all(toPaste.files.map(async (fileToPaste) => {
                if (element.resource.toString() !== fileToPaste.toString() && resources.isEqualOrParent(element.resource, fileToPaste)) {
                    throw new Error(nls.localize(8759, null));
                }
                const fileToPasteStat = await fileService.stat(fileToPaste);
                // Find target
                let target;
                if (uriIdentityService.extUri.isEqual(element.resource, fileToPaste)) {
                    target = element.parent;
                }
                else {
                    target = element.isDirectory ? element : element.parent;
                }
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, { resource: fileToPaste, isDirectory: fileToPasteStat.isDirectory, allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled' }, incrementalNaming);
                if (!targetFile) {
                    return undefined;
                }
                return { source: fileToPaste, target: targetFile };
            })));
            if (sourceTargetPairs.length >= 1) {
                // Move/Copy File
                if (pasteShouldMove) {
                    const resourceFileEdits = sourceTargetPairs.map(pair => new ResourceFileEdit(pair.source, pair.target, { overwrite: incrementalNaming === 'disabled' }));
                    const options = {
                        confirmBeforeUndo: configurationService.getValue().explorer.confirmUndo === "verbose" /* UndoConfirmLevel.Verbose */,
                        progressLabel: sourceTargetPairs.length > 1 ? nls.localize(8760, null, sourceTargetPairs.length)
                            : nls.localize(8761, null, resources.basenameOrAuthority(sourceTargetPairs[0].target)),
                        undoLabel: sourceTargetPairs.length > 1 ? nls.localize(8762, null, sourceTargetPairs.length)
                            : nls.localize(8763, null, resources.basenameOrAuthority(sourceTargetPairs[0].target))
                    };
                    await explorerService.applyBulkEdit(resourceFileEdits, options);
                }
                else {
                    const resourceFileEdits = sourceTargetPairs.map(pair => new ResourceFileEdit(pair.source, pair.target, { copy: true, overwrite: incrementalNaming === 'disabled' }));
                    await applyCopyResourceEdit(sourceTargetPairs.map(pair => pair.target), resourceFileEdits);
                }
            }
            targets = sourceTargetPairs.map(pair => pair.target);
        }
        else { // Pasting from file data
            const targetAndEdits = coalesce(await Promise.all(toPaste.files.map(async (file) => {
                const target = element.isDirectory ? element : element.parent;
                const targetFile = await findValidPasteFileTarget(explorerService, fileService, dialogService, target, { resource: file.name, isDirectory: false, allowOverwrite: pasteShouldMove || incrementalNaming === 'disabled' }, incrementalNaming);
                if (!targetFile) {
                    return;
                }
                return {
                    target: targetFile,
                    edit: new ResourceFileEdit(undefined, targetFile, {
                        overwrite: incrementalNaming === 'disabled',
                        contents: (async () => VSBuffer.wrap(new Uint8Array(await file.arrayBuffer())))(),
                    })
                };
            })));
            await applyCopyResourceEdit(targetAndEdits.map(pair => pair.target), targetAndEdits.map(pair => pair.edit));
            targets = targetAndEdits.map(pair => pair.target);
        }
        if (targets.length) {
            const firstTarget = targets[0];
            await explorerService.select(firstTarget);
            if (targets.length === 1) {
                const item = explorerService.findClosest(firstTarget);
                if (item && !item.isDirectory) {
                    await editorService.openEditor({ resource: item.resource, options: { pinned: true, preserveFocus: true } });
                }
            }
        }
    }
    catch (e) {
        notificationService.error(toErrorMessage(new Error(nls.localize(8764, null, getErrorMessage(e))), false));
    }
    finally {
        if (pasteShouldMove) {
            // Cut is done. Make sure to clear cut state.
            await explorerService.setToCopy([], false);
            pasteShouldMove = false;
        }
    }
    async function applyCopyResourceEdit(targets, resourceFileEdits) {
        const undoLevel = configurationService.getValue().explorer.confirmUndo;
        const options = {
            confirmBeforeUndo: undoLevel === "default" /* UndoConfirmLevel.Default */ || undoLevel === "verbose" /* UndoConfirmLevel.Verbose */,
            progressLabel: targets.length > 1 ? nls.localize(8765, null, targets.length)
                : nls.localize(8766, null, resources.basenameOrAuthority(targets[0])),
            undoLabel: targets.length > 1 ? nls.localize(8767, null, targets.length)
                : nls.localize(8768, null, resources.basenameOrAuthority(targets[0]))
        };
        await explorerService.applyBulkEdit(resourceFileEdits, options);
    }
};
async function getFilesToPaste(fileList, clipboardService, hostService) {
    if (fileList && fileList.length > 0) {
        // with a `fileList` we support natively pasting file from disk from clipboard
        const resources = [...fileList].map(file => getPathForFile(file)).filter(filePath => !!filePath && isAbsolute(filePath)).map((filePath) => URI.file(filePath));
        if (resources.length) {
            return { type: 'paths', files: resources, };
        }
        // Support pasting files that we can't read from disk
        return { type: 'data', files: [...fileList].filter(file => !getPathForFile(file)) };
    }
    else {
        // otherwise we fallback to reading resources from our clipboard service
        return { type: 'paths', files: resources.distinctParents(await clipboardService.readResources(), resource => resource) };
    }
}
export const openFilePreserveFocusHandler = async (accessor) => {
    const editorService = accessor.get(IEditorService);
    const explorerService = accessor.get(IExplorerService);
    const stats = explorerService.getContext(true);
    await editorService.openEditors(stats.filter(s => !s.isDirectory).map(s => ({
        resource: s.resource,
        options: { preserveFocus: true }
    })));
};
class BaseSetActiveEditorReadonlyInSession extends Action2 {
    constructor(id, title, newReadonlyState) {
        super({
            id,
            title,
            f1: true,
            category: Categories.File,
            precondition: ActiveEditorCanToggleReadonlyContext
        });
        this.newReadonlyState = newReadonlyState;
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const filesConfigurationService = accessor.get(IFilesConfigurationService);
        const fileResource = EditorResourceAccessor.getOriginalUri(editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if (!fileResource) {
            return;
        }
        await filesConfigurationService.updateReadonly(fileResource, this.newReadonlyState);
    }
}
export class SetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2(8785, "Set Active Editor Read-only in Session"); }
    constructor() {
        super(SetActiveEditorReadonlyInSession.ID, SetActiveEditorReadonlyInSession.LABEL, true);
    }
}
export class SetActiveEditorWriteableInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.setActiveEditorWriteableInSession'; }
    static { this.LABEL = nls.localize2(8786, "Set Active Editor Writeable in Session"); }
    constructor() {
        super(SetActiveEditorWriteableInSession.ID, SetActiveEditorWriteableInSession.LABEL, false);
    }
}
export class ToggleActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.toggleActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2(8787, "Toggle Active Editor Read-only in Session"); }
    constructor() {
        super(ToggleActiveEditorReadonlyInSession.ID, ToggleActiveEditorReadonlyInSession.LABEL, 'toggle');
    }
}
export class ResetActiveEditorReadonlyInSession extends BaseSetActiveEditorReadonlyInSession {
    static { this.ID = 'workbench.action.files.resetActiveEditorReadonlyInSession'; }
    static { this.LABEL = nls.localize2(8788, "Reset Active Editor Read-only in Session"); }
    constructor() {
        super(ResetActiveEditorReadonlyInSession.ID, ResetActiveEditorReadonlyInSession.LABEL, 'reset');
    }
}
//# sourceMappingURL=fileActions.js.map