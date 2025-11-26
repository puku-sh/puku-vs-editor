var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { dirname } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { IChatContextPickService } from '../chatContextPickService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { toToolSetVariableEntry, toToolVariableEntry } from '../../common/chatVariableEntries.js';
import { ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
import { imageToHash, isImage } from '../chatPasteProviders.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { ChatInstructionsPickerPick } from '../promptSyntax/attachInstructionsAction.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
let ChatContextContributions = class ChatContextContributions extends Disposable {
    static { this.ID = 'chat.contextContributions'; }
    constructor(instantiationService, contextPickService) {
        super();
        // ###############################################################################################
        //
        // Default context picks/values which are "native" to chat. This is NOT the complete list
        // and feature area specific context, like for notebooks, problems, etc, should be contributed
        // by the feature area.
        //
        // ###############################################################################################
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ToolsContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ChatInstructionsPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(OpenEditorContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(RelatedFilesContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ClipboardImageContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ScreenshotContextValuePick)));
    }
};
ChatContextContributions = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], ChatContextContributions);
export { ChatContextContributions };
class ToolsContextPickerPick {
    constructor() {
        this.type = 'pickerPick';
        this.label = localize('chatContext.tools', 'Tools...');
        this.icon = Codicon.tools;
        this.ordinal = -500;
    }
    isEnabled(widget) {
        return !!widget.attachmentCapabilities.supportsToolAttachments;
    }
    asPicker(widget) {
        const items = [];
        for (const [entry, enabled] of widget.input.selectedToolsModel.entriesMap.get()) {
            if (enabled) {
                if (entry instanceof ToolSet) {
                    items.push({
                        toolInfo: ToolDataSource.classify(entry.source),
                        label: entry.referenceName,
                        description: entry.description,
                        asAttachment: () => toToolSetVariableEntry(entry)
                    });
                }
                else {
                    items.push({
                        toolInfo: ToolDataSource.classify(entry.source),
                        label: entry.toolReferenceName ?? entry.displayName,
                        description: entry.userDescription ?? entry.modelDescription,
                        asAttachment: () => toToolVariableEntry(entry)
                    });
                }
            }
        }
        items.sort((a, b) => {
            let res = a.toolInfo.ordinal - b.toolInfo.ordinal;
            if (res === 0) {
                res = a.toolInfo.label.localeCompare(b.toolInfo.label);
            }
            if (res === 0) {
                res = a.label.localeCompare(b.label);
            }
            return res;
        });
        let lastGroupLabel;
        const picks = [];
        for (const item of items) {
            if (lastGroupLabel !== item.toolInfo.label) {
                picks.push({ type: 'separator', label: item.toolInfo.label });
                lastGroupLabel = item.toolInfo.label;
            }
            picks.push(item);
        }
        return {
            placeholder: localize('chatContext.tools.placeholder', 'Select a tool'),
            picks: Promise.resolve(picks)
        };
    }
}
let OpenEditorContextValuePick = class OpenEditorContextValuePick {
    constructor(_editorService, _labelService) {
        this._editorService = _editorService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize('chatContext.editors', 'Open Editors');
        this.icon = Codicon.file;
        this.ordinal = 800;
    }
    isEnabled() {
        return this._editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput).length > 0;
    }
    async asAttachment() {
        const result = [];
        for (const editor of this._editorService.editors) {
            if (!(editor instanceof FileEditorInput || editor instanceof DiffEditorInput || editor instanceof UntitledTextEditorInput || editor instanceof NotebookEditorInput)) {
                continue;
            }
            const uri = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (!uri) {
                continue;
            }
            result.push({
                kind: 'file',
                id: uri.toString(),
                value: uri,
                name: this._labelService.getUriBasenameLabel(uri),
            });
        }
        return result;
    }
};
OpenEditorContextValuePick = __decorate([
    __param(0, IEditorService),
    __param(1, ILabelService)
], OpenEditorContextValuePick);
let RelatedFilesContextPickerPick = class RelatedFilesContextPickerPick {
    constructor(_chatEditingService, _labelService) {
        this._chatEditingService = _chatEditingService;
        this._labelService = _labelService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.relatedFiles', 'Related Files');
        this.icon = Codicon.sparkle;
        this.ordinal = 300;
    }
    isEnabled(widget) {
        return this._chatEditingService.hasRelatedFilesProviders() && (Boolean(widget.getInput()) || widget.attachmentModel.fileAttachments.length > 0);
    }
    asPicker(widget) {
        const picks = (async () => {
            const chatSessionResource = widget.viewModel?.sessionResource;
            if (!chatSessionResource) {
                return [];
            }
            const relatedFiles = await this._chatEditingService.getRelatedFiles(chatSessionResource, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None);
            if (!relatedFiles) {
                return [];
            }
            const attachments = widget.attachmentModel.getAttachmentIDs();
            return this._chatEditingService.getRelatedFiles(chatSessionResource, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
                .then((files) => (files ?? []).reduce((acc, cur) => {
                acc.push({ type: 'separator', label: cur.group });
                for (const file of cur.files) {
                    const label = this._labelService.getUriBasenameLabel(file.uri);
                    acc.push({
                        label: label,
                        description: this._labelService.getUriLabel(dirname(file.uri), { relative: true }),
                        disabled: attachments.has(file.uri.toString()),
                        asAttachment: () => {
                            return {
                                kind: 'file',
                                id: file.uri.toString(),
                                value: file.uri,
                                name: label,
                                omittedState: 0 /* OmittedState.NotOmitted */
                            };
                        }
                    });
                }
                return acc;
            }, []));
        })();
        return {
            placeholder: localize('relatedFiles', 'Add related files to your working set'),
            picks,
        };
    }
};
RelatedFilesContextPickerPick = __decorate([
    __param(0, IChatEditingService),
    __param(1, ILabelService)
], RelatedFilesContextPickerPick);
let ClipboardImageContextValuePick = class ClipboardImageContextValuePick {
    constructor(_clipboardService) {
        this._clipboardService = _clipboardService;
        this.type = 'valuePick';
        this.label = localize('imageFromClipboard', 'Image from Clipboard');
        this.icon = Codicon.fileMedia;
    }
    async isEnabled(widget) {
        if (!widget.attachmentCapabilities.supportsImageAttachments) {
            return false;
        }
        if (!widget.input.selectedLanguageModel?.metadata.capabilities?.vision) {
            return false;
        }
        const imageData = await this._clipboardService.readImage();
        return isImage(imageData);
    }
    async asAttachment() {
        const fileBuffer = await this._clipboardService.readImage();
        return {
            id: await imageToHash(fileBuffer),
            name: localize('pastedImage', 'Pasted Image'),
            fullName: localize('pastedImage', 'Pasted Image'),
            value: fileBuffer,
            kind: 'image',
        };
    }
};
ClipboardImageContextValuePick = __decorate([
    __param(0, IClipboardService)
], ClipboardImageContextValuePick);
let TerminalContext = class TerminalContext {
    constructor(_resource, _terminalService) {
        this._resource = _resource;
        this._terminalService = _terminalService;
        this.type = 'valuePick';
        this.icon = Codicon.terminal;
        this.label = localize('terminal', 'Terminal');
    }
    isEnabled(widget) {
        const terminal = this._terminalService.getInstanceFromResource(this._resource);
        return !!widget.attachmentCapabilities.supportsTerminalAttachments && terminal?.isDisposed === false;
    }
    async asAttachment(widget) {
        const terminal = this._terminalService.getInstanceFromResource(this._resource);
        if (!terminal) {
            return;
        }
        const params = new URLSearchParams(this._resource.query);
        const command = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.commands.find(cmd => cmd.id === params.get('command'));
        if (!command) {
            return;
        }
        const attachment = {
            kind: 'terminalCommand',
            id: `terminalCommand:${Date.now()}}`,
            value: this.asValue(command),
            name: command.command,
            command: command.command,
            output: command.getOutput(),
            exitCode: command.exitCode,
            resource: this._resource
        };
        const cleanup = new DisposableStore();
        let disposed = false;
        const disposeCleanup = () => {
            if (disposed) {
                return;
            }
            disposed = true;
            cleanup.dispose();
        };
        cleanup.add(widget.attachmentModel.onDidChange(e => {
            if (e.deleted.includes(attachment.id)) {
                disposeCleanup();
            }
        }));
        cleanup.add(terminal.onDisposed(() => {
            widget.attachmentModel.delete(attachment.id);
            widget.refreshParsedInput();
            disposeCleanup();
        }));
        return attachment;
    }
    asValue(command) {
        let value = `Command: ${command.command}`;
        const output = command.getOutput();
        if (output) {
            value += `\nOutput:\n${output}`;
        }
        if (typeof command.exitCode === 'number') {
            value += `\nExit Code: ${command.exitCode}`;
        }
        return value;
    }
};
TerminalContext = __decorate([
    __param(1, ITerminalService)
], TerminalContext);
export { TerminalContext };
let ScreenshotContextValuePick = class ScreenshotContextValuePick {
    constructor(_hostService) {
        this._hostService = _hostService;
        this.type = 'valuePick';
        this.icon = Codicon.deviceCamera;
        this.label = (isElectron
            ? localize('chatContext.attachScreenshot.labelElectron.Window', 'Screenshot Window')
            : localize('chatContext.attachScreenshot.labelWeb', 'Screenshot'));
    }
    async isEnabled(widget) {
        return !!widget.attachmentCapabilities.supportsImageAttachments && !!widget.input.selectedLanguageModel?.metadata.capabilities?.vision;
    }
    async asAttachment() {
        const blob = await this._hostService.getScreenshot();
        return blob && convertBufferToScreenshotVariable(blob);
    }
};
ScreenshotContextValuePick = __decorate([
    __param(0, IHostService)
], ScreenshotContextValuePick);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN0RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDMUcsT0FBTyxFQUFFLGVBQWUsRUFB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