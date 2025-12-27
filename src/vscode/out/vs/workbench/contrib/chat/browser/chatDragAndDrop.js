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
import { DataTransfers } from '../../../../base/browser/dnd.js';
import { $, DragAndDropObserver } from '../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { UriList } from '../../../../base/common/dataTransfer.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { Mimes } from '../../../../base/common/mime.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { CodeDataTransfers, containsDragType, extractEditorsDropData, extractMarkerDropData, extractNotebookCellOutputDropData, extractSymbolDropData } from '../../../../platform/dnd/browser/dnd.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { IChatWidgetService } from './chat.js';
import { IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { convertStringToUInt8Array } from './imageUtils.js';
import { extractSCMHistoryItemDropData } from '../../scm/browser/scmHistoryChatContext.js';
var ChatDragAndDropType;
(function (ChatDragAndDropType) {
    ChatDragAndDropType[ChatDragAndDropType["FILE_INTERNAL"] = 0] = "FILE_INTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FILE_EXTERNAL"] = 1] = "FILE_EXTERNAL";
    ChatDragAndDropType[ChatDragAndDropType["FOLDER"] = 2] = "FOLDER";
    ChatDragAndDropType[ChatDragAndDropType["IMAGE"] = 3] = "IMAGE";
    ChatDragAndDropType[ChatDragAndDropType["SYMBOL"] = 4] = "SYMBOL";
    ChatDragAndDropType[ChatDragAndDropType["HTML"] = 5] = "HTML";
    ChatDragAndDropType[ChatDragAndDropType["MARKER"] = 6] = "MARKER";
    ChatDragAndDropType[ChatDragAndDropType["NOTEBOOK_CELL_OUTPUT"] = 7] = "NOTEBOOK_CELL_OUTPUT";
    ChatDragAndDropType[ChatDragAndDropType["SCM_HISTORY_ITEM"] = 8] = "SCM_HISTORY_ITEM";
})(ChatDragAndDropType || (ChatDragAndDropType = {}));
const IMAGE_DATA_REGEX = /^data:image\/[a-z]+;base64,/;
const URL_REGEX = /^https?:\/\/.+/;
let ChatDragAndDrop = class ChatDragAndDrop extends Themable {
    constructor(attachmentModel, styles, themeService, extensionService, webContentExtractorService, chatWidgetService, logService, chatAttachmentResolveService) {
        super(themeService);
        this.attachmentModel = attachmentModel;
        this.styles = styles;
        this.extensionService = extensionService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatWidgetService = chatWidgetService;
        this.logService = logService;
        this.chatAttachmentResolveService = chatAttachmentResolveService;
        this.overlays = new Map();
        this.overlayTextBackground = '';
        this.disableOverlay = false;
        this.currentActiveTarget = undefined;
        this.updateStyles();
        this._register(toDisposable(() => {
            this.overlays.forEach(({ overlay, disposable }) => {
                disposable.dispose();
                overlay.remove();
            });
            this.overlays.clear();
            this.currentActiveTarget = undefined;
            this.overlayText?.remove();
            this.overlayText = undefined;
        }));
    }
    addOverlay(target, overlayContainer) {
        this.removeOverlay(target);
        const { overlay, disposable } = this.createOverlay(target, overlayContainer);
        this.overlays.set(target, { overlay, disposable });
    }
    removeOverlay(target) {
        if (this.currentActiveTarget === target) {
            this.currentActiveTarget = undefined;
        }
        const existingOverlay = this.overlays.get(target);
        if (existingOverlay) {
            existingOverlay.overlay.remove();
            existingOverlay.disposable.dispose();
            this.overlays.delete(target);
        }
    }
    setDisabledOverlay(disable) {
        this.disableOverlay = disable;
    }
    createOverlay(target, overlayContainer) {
        const overlay = document.createElement('div');
        overlay.classList.add('chat-dnd-overlay');
        this.updateOverlayStyles(overlay);
        overlayContainer.appendChild(overlay);
        const disposable = new DragAndDropObserver(target, {
            onDragOver: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                if (target === this.currentActiveTarget) {
                    return;
                }
                if (this.currentActiveTarget) {
                    this.setOverlay(this.currentActiveTarget, undefined);
                }
                this.currentActiveTarget = target;
                this.onDragEnter(e, target);
            },
            onDragLeave: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                if (target === this.currentActiveTarget) {
                    this.currentActiveTarget = undefined;
                }
                this.onDragLeave(e, target);
            },
            onDrop: (e) => {
                if (this.disableOverlay) {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
                if (target !== this.currentActiveTarget) {
                    return;
                }
                this.currentActiveTarget = undefined;
                this.onDrop(e, target);
            },
        });
        return { overlay, disposable };
    }
    onDragEnter(e, target) {
        const estimatedDropType = this.guessDropType(e);
        this.updateDropFeedback(e, target, estimatedDropType);
    }
    onDragLeave(e, target) {
        this.updateDropFeedback(e, target, undefined);
    }
    onDrop(e, target) {
        this.updateDropFeedback(e, target, undefined);
        this.drop(e);
    }
    async drop(e) {
        const contexts = await this.resolveAttachmentsFromDragEvent(e);
        if (contexts.length === 0) {
            return;
        }
        this.attachmentModel.addContext(...contexts);
    }
    updateDropFeedback(e, target, dropType) {
        const showOverlay = dropType !== undefined;
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = showOverlay ? 'copy' : 'none';
        }
        this.setOverlay(target, dropType);
    }
    guessDropType(e) {
        // This is an estimation based on the datatransfer types/items
        if (containsDragType(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT)) {
            return ChatDragAndDropType.NOTEBOOK_CELL_OUTPUT;
        }
        else if (containsDragType(e, CodeDataTransfers.SCM_HISTORY_ITEM)) {
            return ChatDragAndDropType.SCM_HISTORY_ITEM;
        }
        else if (containsImageDragType(e)) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? ChatDragAndDropType.IMAGE : undefined;
        }
        else if (containsDragType(e, 'text/html')) {
            return ChatDragAndDropType.HTML;
        }
        else if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            return ChatDragAndDropType.SYMBOL;
        }
        else if (containsDragType(e, CodeDataTransfers.MARKERS)) {
            return ChatDragAndDropType.MARKER;
        }
        else if (containsDragType(e, DataTransfers.FILES)) {
            return ChatDragAndDropType.FILE_EXTERNAL;
        }
        else if (containsDragType(e, CodeDataTransfers.EDITORS)) {
            return ChatDragAndDropType.FILE_INTERNAL;
        }
        else if (containsDragType(e, Mimes.uriList, CodeDataTransfers.FILES, DataTransfers.RESOURCES, DataTransfers.INTERNAL_URI_LIST)) {
            return ChatDragAndDropType.FOLDER;
        }
        return undefined;
    }
    isDragEventSupported(e) {
        // if guessed drop type is undefined, it means the drop is not supported
        const dropType = this.guessDropType(e);
        return dropType !== undefined;
    }
    getDropTypeName(type) {
        switch (type) {
            case ChatDragAndDropType.FILE_INTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FILE_EXTERNAL: return localize('file', 'File');
            case ChatDragAndDropType.FOLDER: return localize('folder', 'Folder');
            case ChatDragAndDropType.IMAGE: return localize('image', 'Image');
            case ChatDragAndDropType.SYMBOL: return localize('symbol', 'Symbol');
            case ChatDragAndDropType.MARKER: return localize('problem', 'Problem');
            case ChatDragAndDropType.HTML: return localize('url', 'URL');
            case ChatDragAndDropType.NOTEBOOK_CELL_OUTPUT: return localize('notebookOutput', 'Output');
            case ChatDragAndDropType.SCM_HISTORY_ITEM: return localize('scmHistoryItem', 'Change');
        }
    }
    async resolveAttachmentsFromDragEvent(e) {
        if (!this.isDragEventSupported(e)) {
            return [];
        }
        if (containsDragType(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT)) {
            const notebookOutputData = extractNotebookCellOutputDropData(e);
            if (notebookOutputData) {
                return this.chatAttachmentResolveService.resolveNotebookOutputAttachContext(notebookOutputData);
            }
        }
        if (containsDragType(e, CodeDataTransfers.SCM_HISTORY_ITEM)) {
            const scmHistoryItemData = extractSCMHistoryItemDropData(e);
            if (scmHistoryItemData) {
                return this.chatAttachmentResolveService.resolveSourceControlHistoryItemAttachContext(scmHistoryItemData);
            }
        }
        const markerData = extractMarkerDropData(e);
        if (markerData) {
            return this.chatAttachmentResolveService.resolveMarkerAttachContext(markerData);
        }
        if (containsDragType(e, CodeDataTransfers.SYMBOLS)) {
            const symbolsData = extractSymbolDropData(e);
            return this.chatAttachmentResolveService.resolveSymbolsAttachContext(symbolsData);
        }
        const editorDragData = extractEditorsDropData(e);
        if (editorDragData.length > 0) {
            return coalesce(await Promise.all(editorDragData.map(editorInput => {
                return this.chatAttachmentResolveService.resolveEditorAttachContext(editorInput);
            })));
        }
        const internal = e.dataTransfer?.getData(DataTransfers.INTERNAL_URI_LIST);
        if (internal) {
            const uriList = UriList.parse(internal);
            if (uriList.length) {
                return coalesce(await Promise.all(uriList.map(uri => this.chatAttachmentResolveService.resolveEditorAttachContext({ resource: URI.parse(uri) }))));
            }
        }
        if (!containsDragType(e, DataTransfers.INTERNAL_URI_LIST) && containsDragType(e, Mimes.uriList) && ((containsDragType(e, Mimes.html) || containsDragType(e, Mimes.text) /* Text mime needed for safari support */))) {
            return this.resolveHTMLAttachContext(e);
        }
        return [];
    }
    async downloadImageAsUint8Array(url) {
        try {
            const extractedImages = await this.webContentExtractorService.readImage(URI.parse(url), CancellationToken.None);
            if (extractedImages) {
                return extractedImages.buffer;
            }
        }
        catch (error) {
            this.logService.warn('Fetch failed:', error);
        }
        // TODO: use dnd provider to insert text @justschen
        const selection = this.chatWidgetService.lastFocusedWidget?.inputEditor.getSelection();
        if (selection && this.chatWidgetService.lastFocusedWidget) {
            this.chatWidgetService.lastFocusedWidget.inputEditor.executeEdits('chatInsertUrl', [{ range: selection, text: url }]);
        }
        this.logService.warn(`Image URLs must end in .jpg, .png, .gif, .webp, or .bmp. Failed to fetch image from this URL: ${url}`);
        return undefined;
    }
    async resolveHTMLAttachContext(e) {
        const existingAttachmentNames = new Set(this.attachmentModel.attachments.map(attachment => attachment.name));
        const createDisplayName = () => {
            const baseName = localize('dragAndDroppedImageName', 'Image from URL');
            let uniqueName = baseName;
            let baseNameInstance = 1;
            while (existingAttachmentNames.has(uniqueName)) {
                uniqueName = `${baseName} ${++baseNameInstance}`;
            }
            existingAttachmentNames.add(uniqueName);
            return uniqueName;
        };
        const getImageTransferDataFromUrl = async (url) => {
            const resource = URI.parse(url);
            if (IMAGE_DATA_REGEX.test(url)) {
                return { data: convertStringToUInt8Array(url), name: createDisplayName(), resource };
            }
            if (URL_REGEX.test(url)) {
                const data = await this.downloadImageAsUint8Array(url);
                if (data) {
                    return { data, name: createDisplayName(), resource, id: url };
                }
            }
            return undefined;
        };
        const getImageTransferDataFromFile = async (file) => {
            try {
                const buffer = await file.arrayBuffer();
                return { data: new Uint8Array(buffer), name: createDisplayName() };
            }
            catch (error) {
                this.logService.error('Error reading file:', error);
            }
            return undefined;
        };
        const imageTransferData = [];
        // Image Web File Drag and Drop
        const imageFiles = extractImageFilesFromDragEvent(e);
        if (imageFiles.length) {
            const imageTransferDataFromFiles = await Promise.all(imageFiles.map(file => getImageTransferDataFromFile(file)));
            imageTransferData.push(...imageTransferDataFromFiles.filter(data => !!data));
        }
        // Image Web URL Drag and Drop
        const imageUrls = extractUrlsFromDragEvent(e);
        if (imageUrls.length) {
            const imageTransferDataFromUrl = await Promise.all(imageUrls.map(getImageTransferDataFromUrl));
            imageTransferData.push(...imageTransferDataFromUrl.filter(data => !!data));
        }
        return await this.chatAttachmentResolveService.resolveImageAttachContext(imageTransferData);
    }
    setOverlay(target, type) {
        // Remove any previous overlay text
        this.overlayText?.remove();
        this.overlayText = undefined;
        const { overlay } = this.overlays.get(target);
        if (type !== undefined) {
            // Render the overlay text
            const iconAndtextElements = renderLabelWithIcons(`$(${Codicon.attach.id}) ${this.getOverlayText(type)}`);
            const htmlElements = iconAndtextElements.map(element => {
                if (typeof element === 'string') {
                    return $('span.overlay-text', undefined, element);
                }
                return element;
            });
            this.overlayText = $('span.attach-context-overlay-text', undefined, ...htmlElements);
            this.overlayText.style.backgroundColor = this.overlayTextBackground;
            overlay.appendChild(this.overlayText);
        }
        overlay.classList.toggle('visible', type !== undefined);
    }
    getOverlayText(type) {
        const typeName = this.getDropTypeName(type);
        return localize('attacAsContext', 'Attach {0} as Context', typeName);
    }
    updateOverlayStyles(overlay) {
        overlay.style.backgroundColor = this.getColor(this.styles.overlayBackground) || '';
        overlay.style.color = this.getColor(this.styles.listForeground) || '';
    }
    updateStyles() {
        this.overlays.forEach(overlay => this.updateOverlayStyles(overlay.overlay));
        this.overlayTextBackground = this.getColor(this.styles.listBackground) || '';
    }
};
ChatDragAndDrop = __decorate([
    __param(2, IThemeService),
    __param(3, IExtensionService),
    __param(4, ISharedWebContentExtractorService),
    __param(5, IChatWidgetService),
    __param(6, ILogService),
    __param(7, IChatAttachmentResolveService)
], ChatDragAndDrop);
export { ChatDragAndDrop };
function containsImageDragType(e) {
    // Image detection should not have false positives, only false negatives are allowed
    if (containsDragType(e, 'image')) {
        return true;
    }
    if (containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            return Array.from(files).some(file => file.type.startsWith('image/'));
        }
        const items = e.dataTransfer?.items;
        if (items && items.length > 0) {
            return Array.from(items).some(item => item.type.startsWith('image/'));
        }
    }
    return false;
}
function extractUrlsFromDragEvent(e, logService) {
    const textUrl = e.dataTransfer?.getData('text/uri-list');
    if (textUrl) {
        try {
            const urls = UriList.parse(textUrl);
            if (urls.length > 0) {
                return urls;
            }
        }
        catch (error) {
            logService?.error('Error parsing URI list:', error);
            return [];
        }
    }
    return [];
}
function extractImageFilesFromDragEvent(e) {
    const files = e.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return Array.from(files).filter(file => file.type.startsWith('image/'));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdERyYWdBbmREcm9wLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXREcmFnQW5kRHJvcC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEUsT0FBTyxFQUFFLENBQUMsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDeEQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsaUNBQWlDLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2TSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFR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