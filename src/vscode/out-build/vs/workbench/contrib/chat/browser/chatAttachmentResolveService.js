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
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { isUntitledResourceEditorInput } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { createNotebookOutputVariableEntry, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST } from '../../notebook/browser/contrib/chat/notebookChatUtils.js';
import { getOutputViewModelFromId } from '../../notebook/browser/controller/cellOutputActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebook/browser/notebookBrowser.js';
import { CHAT_ATTACHABLE_IMAGE_MIME_TYPES, getAttachableImageExtension } from '../common/chatModel.js';
import { IDiagnosticVariableEntryFilterData, toPromptFileVariableEntry, PromptFileVariableKind } from '../common/chatVariableEntries.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../common/promptSyntax/promptTypes.js';
import { imageToHash } from './chatPasteProviders.js';
import { resizeImage } from './imageUtils.js';
export const IChatAttachmentResolveService = createDecorator('IChatAttachmentResolveService');
let ChatAttachmentResolveService = class ChatAttachmentResolveService {
    constructor(fileService, editorService, textModelService, extensionService, dialogService) {
        this.fileService = fileService;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.extensionService = extensionService;
        this.dialogService = dialogService;
    }
    // --- EDITORS ---
    async resolveEditorAttachContext(editor) {
        // untitled editor
        if (isUntitledResourceEditorInput(editor)) {
            return await this.resolveUntitledEditorAttachContext(editor);
        }
        if (!editor.resource) {
            return undefined;
        }
        let stat;
        try {
            stat = await this.fileService.stat(editor.resource);
        }
        catch {
            return undefined;
        }
        if (!stat.isDirectory && !stat.isFile) {
            return undefined;
        }
        const imageContext = await this.resolveImageEditorAttachContext(editor.resource);
        if (imageContext) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? imageContext : undefined;
        }
        return await this.resolveResourceAttachContext(editor.resource, stat.isDirectory);
    }
    async resolveUntitledEditorAttachContext(editor) {
        // If the resource is known, we can use it directly
        if (editor.resource) {
            return await this.resolveResourceAttachContext(editor.resource, false);
        }
        // Otherwise, we need to check if the contents are already open in another editor
        const openUntitledEditors = this.editorService.editors.filter(editor => editor instanceof UntitledTextEditorInput);
        for (const canidate of openUntitledEditors) {
            const model = await canidate.resolve();
            const contents = model.textEditorModel?.getValue();
            if (contents === editor.contents) {
                return await this.resolveResourceAttachContext(canidate.resource, false);
            }
        }
        return undefined;
    }
    async resolveResourceAttachContext(resource, isDirectory) {
        let omittedState = 0 /* OmittedState.NotOmitted */;
        if (!isDirectory) {
            let languageId;
            try {
                const createdModel = await this.textModelService.createModelReference(resource);
                languageId = createdModel.object.getLanguageId();
                createdModel.dispose();
            }
            catch {
                omittedState = 2 /* OmittedState.Full */;
            }
            if (/\.(svg)$/i.test(resource.path)) {
                omittedState = 2 /* OmittedState.Full */;
            }
            if (languageId) {
                const promptsType = getPromptsTypeForLanguageId(languageId);
                if (promptsType === PromptsType.prompt) {
                    return toPromptFileVariableEntry(resource, PromptFileVariableKind.PromptFile);
                }
                else if (promptsType === PromptsType.instructions) {
                    return toPromptFileVariableEntry(resource, PromptFileVariableKind.Instruction);
                }
            }
        }
        return {
            kind: isDirectory ? 'directory' : 'file',
            value: resource,
            id: resource.toString(),
            name: basename(resource),
            omittedState
        };
    }
    // --- IMAGES ---
    async resolveImageEditorAttachContext(resource, data, mimeType) {
        if (!resource) {
            return undefined;
        }
        if (mimeType) {
            if (!getAttachableImageExtension(mimeType)) {
                return undefined;
            }
        }
        else {
            const match = SUPPORTED_IMAGE_EXTENSIONS_REGEX.exec(resource.path);
            if (!match) {
                return undefined;
            }
            mimeType = getMimeTypeFromPath(match);
        }
        const fileName = basename(resource);
        let dataBuffer;
        if (data) {
            dataBuffer = data;
        }
        else {
            let stat;
            try {
                stat = await this.fileService.stat(resource);
            }
            catch {
                return undefined;
            }
            const readFile = await this.fileService.readFile(resource);
            if (stat.size > 30 * 1024 * 1024) { // 30 MB
                this.dialogService.error(localize(5476, null), localize(5477, null, fileName));
                throw new Error('Image is too large');
            }
            dataBuffer = readFile.value;
        }
        const isPartiallyOmitted = /\.gif$/i.test(resource.path);
        const imageFileContext = await this.resolveImageAttachContext([{
                id: resource.toString(),
                name: fileName,
                data: dataBuffer.buffer,
                icon: Codicon.fileMedia,
                resource: resource,
                mimeType: mimeType,
                omittedState: isPartiallyOmitted ? 1 /* OmittedState.Partial */ : 0 /* OmittedState.NotOmitted */
            }]);
        return imageFileContext[0];
    }
    resolveImageAttachContext(images) {
        return Promise.all(images.map(async (image) => ({
            id: image.id || await imageToHash(image.data),
            name: image.name,
            fullName: image.resource ? image.resource.path : undefined,
            value: await resizeImage(image.data, image.mimeType),
            icon: image.icon,
            kind: 'image',
            isFile: false,
            isDirectory: false,
            omittedState: image.omittedState || 0 /* OmittedState.NotOmitted */,
            references: image.resource ? [{ reference: image.resource, kind: 'reference' }] : []
        })));
    }
    // --- MARKERS ---
    resolveMarkerAttachContext(markers) {
        return markers.map((marker) => {
            let filter;
            if (!('severity' in marker)) {
                filter = { filterUri: URI.revive(marker.uri), filterSeverity: MarkerSeverity.Warning };
            }
            else {
                filter = IDiagnosticVariableEntryFilterData.fromMarker(marker);
            }
            return IDiagnosticVariableEntryFilterData.toEntry(filter);
        });
    }
    // --- SYMBOLS ---
    resolveSymbolsAttachContext(symbols) {
        return symbols.map(symbol => {
            const resource = URI.file(symbol.fsPath);
            return {
                kind: 'symbol',
                id: symbolId(resource, symbol.range),
                value: { uri: resource, range: symbol.range },
                symbolKind: symbol.kind,
                icon: SymbolKinds.toIcon(symbol.kind),
                fullName: symbol.name,
                name: symbol.name,
            };
        });
    }
    // --- NOTEBOOKS ---
    resolveNotebookOutputAttachContext(data) {
        const notebookEditor = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane);
        if (!notebookEditor) {
            return [];
        }
        const outputViewModel = getOutputViewModelFromId(data.outputId, notebookEditor);
        if (!outputViewModel) {
            return [];
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        if (mimeType && NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST.includes(mimeType)) {
            const entry = createNotebookOutputVariableEntry(outputViewModel, mimeType, notebookEditor);
            if (!entry) {
                return [];
            }
            return [entry];
        }
        return [];
    }
    // --- SOURCE CONTROL ---
    resolveSourceControlHistoryItemAttachContext(data) {
        return data.map(d => ({
            id: d.historyItem.id,
            name: d.name,
            value: URI.revive(d.resource),
            historyItem: {
                ...d.historyItem,
                references: []
            },
            kind: 'scmHistoryItem'
        }));
    }
};
ChatAttachmentResolveService = __decorate([
    __param(0, IFileService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IExtensionService),
    __param(4, IDialogService)
], ChatAttachmentResolveService);
export { ChatAttachmentResolveService };
function symbolId(resource, range) {
    let rangePart = '';
    if (range) {
        rangePart = `:${range.startLineNumber}`;
        if (range.startLineNumber !== range.endLineNumber) {
            rangePart += `-${range.endLineNumber}`;
        }
    }
    return resource.fsPath + rangePart;
}
const SUPPORTED_IMAGE_EXTENSIONS_REGEX = new RegExp(`\\.(${Object.keys(CHAT_ATTACHABLE_IMAGE_MIME_TYPES).join('|')})$`, 'i');
function getMimeTypeFromPath(match) {
    const ext = match[1].toLowerCase();
    return CHAT_ATTACHABLE_IMAGE_MIME_TYPES[ext];
}
//# sourceMappingURL=chatAttachmentResolveService.js.map