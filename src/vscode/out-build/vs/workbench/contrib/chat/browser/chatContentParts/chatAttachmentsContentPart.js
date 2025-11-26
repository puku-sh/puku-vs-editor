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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { basename } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { isElementVariableEntry, isImageVariableEntry, isNotebookOutputVariableEntry, isPasteVariableEntry, isPromptFileVariableEntry, isPromptTextVariableEntry, isSCMHistoryItemChangeRangeVariableEntry, isSCMHistoryItemChangeVariableEntry, isSCMHistoryItemVariableEntry, isTerminalVariableEntry, isWorkspaceVariableEntry } from '../../common/chatVariableEntries.js';
import { ChatResponseReferencePartStatusKind } from '../../common/chatService.js';
import { DefaultChatAttachmentWidget, ElementChatAttachmentWidget, FileAttachmentWidget, ImageAttachmentWidget, NotebookCellOutputChatAttachmentWidget, PasteAttachmentWidget, PromptFileAttachmentWidget, PromptTextAttachmentWidget, SCMHistoryItemAttachmentWidget, SCMHistoryItemChangeAttachmentWidget, SCMHistoryItemChangeRangeAttachmentWidget, TerminalCommandAttachmentWidget, ToolSetOrToolItemAttachmentWidget } from '../chatAttachmentWidgets.js';
let ChatAttachmentsContentPart = class ChatAttachmentsContentPart extends Disposable {
    constructor(options, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.attachedContextDisposables = this._register(new DisposableStore());
        this._onDidChangeVisibility = this._register(new Emitter());
        this._showingAll = false;
        this.variables = options.variables;
        this.contentReferences = options.contentReferences ?? [];
        this.limit = options.limit;
        this.domNode = options.domNode ?? dom.$('.chat-attached-context');
        this._contextResourceLabels = this._register(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this._onDidChangeVisibility.event }));
        this.initAttachedContext(this.domNode);
        if (!this.domNode.childElementCount) {
            this.domNode = undefined;
        }
    }
    initAttachedContext(container) {
        dom.clearNode(container);
        this.attachedContextDisposables.clear();
        const visibleAttachments = this.getVisibleAttachments();
        const hasMoreAttachments = this.limit && this.variables.length > this.limit && !this._showingAll;
        for (const attachment of visibleAttachments) {
            this.renderAttachment(attachment, container);
        }
        if (hasMoreAttachments) {
            this.renderShowMoreButton(container);
        }
    }
    getVisibleAttachments() {
        if (!this.limit || this._showingAll) {
            return this.variables;
        }
        return this.variables.slice(0, this.limit);
    }
    renderShowMoreButton(container) {
        const remainingCount = this.variables.length - (this.limit ?? 0);
        // Create a button that looks like the attachment pills
        const showMoreButton = dom.$('div.chat-attached-context-attachment.chat-attachments-show-more-button');
        showMoreButton.setAttribute('role', 'button');
        showMoreButton.setAttribute('tabindex', '0');
        showMoreButton.style.cursor = 'pointer';
        // Add pill icon (ellipsis)
        const pillIcon = dom.$('div.chat-attached-context-pill', {}, dom.$('span.codicon.codicon-ellipsis'));
        // Add text label
        const textLabel = dom.$('span.chat-attached-context-custom-text');
        textLabel.textContent = `${remainingCount} more`;
        showMoreButton.appendChild(pillIcon);
        showMoreButton.appendChild(textLabel);
        // Add click and keyboard event handlers
        const clickHandler = () => {
            this._showingAll = true;
            this.initAttachedContext(container);
        };
        this.attachedContextDisposables.add(dom.addDisposableListener(showMoreButton, 'click', clickHandler));
        this.attachedContextDisposables.add(dom.addDisposableListener(showMoreButton, 'keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
            }
        }));
        container.appendChild(showMoreButton);
        this.attachedContextDisposables.add({ dispose: () => showMoreButton.remove() });
    }
    renderAttachment(attachment, container) {
        const resource = URI.isUri(attachment.value) ? attachment.value : attachment.value && typeof attachment.value === 'object' && 'uri' in attachment.value && URI.isUri(attachment.value.uri) ? attachment.value.uri : undefined;
        const range = attachment.value && typeof attachment.value === 'object' && 'range' in attachment.value && Range.isIRange(attachment.value.range) ? attachment.value.range : undefined;
        const correspondingContentReference = this.contentReferences.find((ref) => (typeof ref.reference === 'object' && 'variableName' in ref.reference && ref.reference.variableName === attachment.name) || (URI.isUri(ref.reference) && basename(ref.reference.path) === attachment.name));
        const isAttachmentOmitted = correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Omitted;
        const isAttachmentPartialOrOmitted = isAttachmentOmitted || correspondingContentReference?.options?.status?.kind === ChatResponseReferencePartStatusKind.Partial;
        let widget;
        if (attachment.kind === 'tool' || attachment.kind === 'toolset') {
            widget = this.instantiationService.createInstance(ToolSetOrToolItemAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isElementVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(ElementChatAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isImageVariableEntry(attachment)) {
            attachment.omittedState = isAttachmentPartialOrOmitted ? 2 /* OmittedState.Full */ : attachment.omittedState;
            widget = this.instantiationService.createInstance(ImageAttachmentWidget, resource, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isPromptFileVariableEntry(attachment)) {
            if (attachment.automaticallyAdded) {
                return; // Skip automatically added prompt files
            }
            widget = this.instantiationService.createInstance(PromptFileAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isPromptTextVariableEntry(attachment)) {
            if (attachment.automaticallyAdded) {
                return; // Skip automatically added prompt text
            }
            widget = this.instantiationService.createInstance(PromptTextAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (resource && (attachment.kind === 'file' || attachment.kind === 'directory')) {
            widget = this.instantiationService.createInstance(FileAttachmentWidget, resource, range, attachment, correspondingContentReference, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isTerminalVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(TerminalCommandAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isPasteVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(PasteAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (resource && isNotebookOutputVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(NotebookCellOutputChatAttachmentWidget, resource, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isSCMHistoryItemVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(SCMHistoryItemAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isSCMHistoryItemChangeVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(SCMHistoryItemChangeAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isSCMHistoryItemChangeRangeVariableEntry(attachment)) {
            widget = this.instantiationService.createInstance(SCMHistoryItemChangeRangeAttachmentWidget, attachment, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        else if (isWorkspaceVariableEntry(attachment)) {
            // skip workspace attachments
            return;
        }
        else {
            widget = this.instantiationService.createInstance(DefaultChatAttachmentWidget, resource, range, attachment, correspondingContentReference, undefined, { shouldFocusClearButton: false, supportsDeletion: false }, container, this._contextResourceLabels);
        }
        let ariaLabel = null;
        if (isAttachmentPartialOrOmitted) {
            widget.element.classList.add('warning');
        }
        const description = correspondingContentReference?.options?.status?.description;
        if (isAttachmentPartialOrOmitted) {
            ariaLabel = `${ariaLabel}${description ? ` ${description}` : ''}`;
            for (const selector of ['.monaco-icon-suffix-container', '.monaco-icon-name-container']) {
                // eslint-disable-next-line no-restricted-syntax
                const element = widget.label.element.querySelector(selector);
                if (element) {
                    element.classList.add('warning');
                }
            }
        }
        this._register(dom.addDisposableListener(widget.element, 'contextmenu', e => this.contextMenuHandler?.(attachment, e)));
        if (this.attachedContextDisposables.isDisposed) {
            widget.dispose();
            return;
        }
        if (ariaLabel) {
            widget.element.ariaLabel = ariaLabel;
        }
        this.attachedContextDisposables.add(widget);
    }
};
ChatAttachmentsContentPart = __decorate([
    __param(1, IInstantiationService)
], ChatAttachmentsContentPart);
export { ChatAttachmentsContentPart };
//# sourceMappingURL=chatAttachmentsContentPart.js.map