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
import * as dom from '../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize, localize2 } from '../../../../../nls.js';
import { MenuWorkbenchToolBar } from '../../../../../platform/actions/browser/toolbar.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../../files/browser/fileConstants.js';
import { getAttachableImageExtension } from '../../common/chatModel.js';
import { ChatAttachmentsContentPart } from './chatAttachmentsContentPart.js';
/**
 * A reusable component for rendering tool output consisting of code blocks and/or resources.
 * This is used by both ChatCollapsibleInputOutputContentPart and ChatToolPostExecuteConfirmationPart.
 */
let ChatToolOutputContentSubPart = class ChatToolOutputContentSubPart extends Disposable {
    constructor(context, parts, contextKeyService, _instantiationService, _contextMenuService, _fileService) {
        super();
        this.context = context;
        this.parts = parts;
        this.contextKeyService = contextKeyService;
        this._instantiationService = _instantiationService;
        this._contextMenuService = _contextMenuService;
        this._fileService = _fileService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this._currentWidth = 0;
        this._editorReferences = [];
        this.codeblocks = [];
        this.domNode = this.createOutputContents();
        this._currentWidth = context.currentWidth();
    }
    createOutputContents() {
        const container = dom.$('div');
        for (let i = 0; i < this.parts.length; i++) {
            const part = this.parts[i];
            if (part.kind === 'code') {
                this.addCodeBlock(part, container);
                continue;
            }
            const group = [];
            for (let k = i; k < this.parts.length; k++) {
                const part = this.parts[k];
                if (part.kind !== 'data') {
                    break;
                }
                group.push(part);
            }
            this.addResourceGroup(group, container);
            i += group.length - 1; // Skip the parts we just added
        }
        return container;
    }
    addResourceGroup(parts, container) {
        const el = dom.h('.chat-collapsible-io-resource-group', [
            dom.h('.chat-collapsible-io-resource-items@items'),
            dom.h('.chat-collapsible-io-resource-actions@actions'),
        ]);
        this.fillInResourceGroup(parts, el.items, el.actions).then(() => this._onDidChangeHeight.fire());
        container.appendChild(el.root);
        return el.root;
    }
    async fillInResourceGroup(parts, itemsContainer, actionsContainer) {
        const entries = await Promise.all(parts.map(async (part) => {
            if (part.mimeType && getAttachableImageExtension(part.mimeType)) {
                const value = part.value ?? await this._fileService.readFile(part.uri).then(f => f.value.buffer, () => undefined);
                return { kind: 'image', id: generateUuid(), name: basename(part.uri), value, mimeType: part.mimeType, isURL: false, references: [{ kind: 'reference', reference: part.uri }] };
            }
            else {
                return { kind: 'file', id: generateUuid(), name: basename(part.uri), fullName: part.uri.path, value: part.uri };
            }
        }));
        const attachments = this._register(this._instantiationService.createInstance(ChatAttachmentsContentPart, {
            variables: entries,
            limit: 5,
            contentReferences: undefined,
            domNode: undefined
        }));
        attachments.contextMenuHandler = (attachment, event) => {
            const index = entries.indexOf(attachment);
            const part = parts[index];
            if (part) {
                event.preventDefault();
                event.stopPropagation();
                this._contextMenuService.showContextMenu({
                    menuId: MenuId.ChatToolOutputResourceContext,
                    menuActionOptions: { shouldForwardArgs: true },
                    getAnchor: () => ({ x: event.pageX, y: event.pageY }),
                    getActionsContext: () => ({ parts: [part] }),
                });
            }
        };
        itemsContainer.appendChild(attachments.domNode);
        const toolbar = this._register(this._instantiationService.createInstance(MenuWorkbenchToolBar, actionsContainer, MenuId.ChatToolOutputResourceToolbar, {
            menuOptions: {
                shouldForwardArgs: true,
            },
        }));
        toolbar.context = { parts };
    }
    addCodeBlock(part, container) {
        const data = {
            languageId: part.languageId,
            textModel: Promise.resolve(part.textModel),
            codeBlockIndex: part.codeBlockInfo.codeBlockIndex,
            codeBlockPartIndex: 0,
            element: this.context.element,
            parentContextKeyService: this.contextKeyService,
            renderOptions: part.options,
            chatSessionResource: this.context.element.sessionResource,
        };
        const editorReference = this._register(this.context.editorPool.get());
        editorReference.object.render(data, this._currentWidth || 300);
        this._register(editorReference.object.onDidChangeContentHeight(() => this._onDidChangeHeight.fire()));
        container.appendChild(editorReference.object.element);
        this._editorReferences.push(editorReference);
        this.codeblocks.push(part.codeBlockInfo);
    }
    layout(width) {
        this._currentWidth = width;
        this._editorReferences.forEach(r => r.object.layout(width));
    }
};
ChatToolOutputContentSubPart = __decorate([
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, IContextMenuService),
    __param(5, IFileService)
], ChatToolOutputContentSubPart);
export { ChatToolOutputContentSubPart };
class SaveResourcesAction extends Action2 {
    static { this.ID = 'chat.toolOutput.save'; }
    constructor() {
        super({
            id: SaveResourcesAction.ID,
            title: localize2('chat.saveResources', "Save As..."),
            icon: Codicon.cloudDownload,
            menu: [{
                    id: MenuId.ChatToolOutputResourceToolbar,
                    group: 'navigation',
                    order: 1
                }, {
                    id: MenuId.ChatToolOutputResourceContext,
                }]
        });
    }
    async run(accessor, context) {
        const fileDialog = accessor.get(IFileDialogService);
        const fileService = accessor.get(IFileService);
        const notificationService = accessor.get(INotificationService);
        const progressService = accessor.get(IProgressService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const commandService = accessor.get(ICommandService);
        const labelService = accessor.get(ILabelService);
        const defaultFilepath = await fileDialog.defaultFilePath();
        const savePart = async (part, isFolder, uri) => {
            const target = isFolder ? joinPath(uri, basename(part.uri)) : uri;
            try {
                if (part.kind === 'data') {
                    await fileService.copy(part.uri, target, true);
                }
                else {
                    // MCP doesn't support streaming data, so no sense trying
                    const contents = await fileService.readFile(part.uri);
                    await fileService.writeFile(target, contents.value);
                }
            }
            catch (e) {
                notificationService.error(localize('chat.saveResources.error', "Failed to save {0}: {1}", basename(part.uri), e));
            }
        };
        const withProgress = async (thenReveal, todo) => {
            await progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                delay: 5_000,
                title: localize('chat.saveResources.progress', "Saving resources..."),
            }, async (report) => {
                for (const task of todo) {
                    await task();
                    report.report({ increment: 1, total: todo.length });
                }
            });
            if (workspaceContextService.isInsideWorkspace(thenReveal)) {
                commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, thenReveal);
            }
            else {
                notificationService.info(localize('chat.saveResources.reveal', "Saved resources to {0}", labelService.getUriLabel(thenReveal)));
            }
        };
        if (context.parts.length === 1) {
            const part = context.parts[0];
            const uri = await fileDialog.pickFileToSave(joinPath(defaultFilepath, basename(part.uri)));
            if (!uri) {
                return;
            }
            await withProgress(uri, [() => savePart(part, false, uri)]);
        }
        else {
            const uris = await fileDialog.showOpenDialog({
                title: localize('chat.saveResources.title', "Pick folder to save resources"),
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: workspaceContextService.getWorkspace().folders[0]?.uri,
            });
            if (!uris?.length) {
                return;
            }
            await withProgress(uris[0], context.parts.map(part => () => savePart(part, true, uris[0])));
        }
    }
}
registerAction2(SaveResourcesAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xPdXRwdXRDb250ZW50U3ViUGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRUb29sT3V0cHV0Q29udGVudFN1YlBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsWUFBWSxF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