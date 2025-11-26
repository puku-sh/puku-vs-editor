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
import { $ } from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ResourcePool } from './chatCollections.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { Emitter } from '../../../../../base/common/event.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { localize2 } from '../../../../../nls.js';
import { LocalChatSessionUri } from '../../common/chatUri.js';
let ChatCheckpointFileChangesSummaryContentPart = class ChatCheckpointFileChangesSummaryContentPart extends Disposable {
    constructor(content, context, hoverService, chatService, editorService, editorGroupsService, instantiationService) {
        super();
        this.hoverService = hoverService;
        this.chatService = chatService;
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        this.instantiationService = instantiationService;
        this.ELEMENT_HEIGHT = 22;
        this.MAX_ITEMS_SHOWN = 6;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.diffsBetweenRequests = new Map();
        this.isCollapsed = true;
        this.fileChanges = content.fileChanges;
        this.fileChangesDiffsObservable = this.computeFileChangesDiffs(context, content.fileChanges);
        const headerDomNode = $('.checkpoint-file-changes-summary-header');
        this.domNode = $('.checkpoint-file-changes-summary', undefined, headerDomNode);
        this.domNode.tabIndex = 0;
        this._register(this.renderHeader(headerDomNode));
        this._register(this.renderFilesList(this.domNode));
    }
    changeID(change) {
        return `${change.sessionId}-${change.requestId}-${change.reference.path}`;
    }
    computeFileChangesDiffs(context, changes) {
        return derived((r) => {
            const fileChangesDiffs = new Map();
            const firstRequestId = changes[0].requestId;
            const lastRequestId = changes[changes.length - 1].requestId;
            for (const change of changes) {
                const sessionId = change.sessionId;
                const session = this.chatService.getSession(LocalChatSessionUri.forSession(sessionId));
                if (!session || !session.editingSession) {
                    continue;
                }
                const diff = this.getCachedEntryDiffBetweenRequests(session.editingSession, change.reference, firstRequestId, lastRequestId)?.read(r);
                if (!diff) {
                    continue;
                }
                fileChangesDiffs.set(this.changeID(change), diff);
            }
            return fileChangesDiffs;
        });
    }
    getCachedEntryDiffBetweenRequests(editSession, uri, startRequestId, stopRequestId) {
        const key = `${uri}\0${startRequestId}\0${stopRequestId}`;
        let observable = this.diffsBetweenRequests.get(key);
        if (!observable) {
            observable = editSession.getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId);
            this.diffsBetweenRequests.set(key, observable);
        }
        return observable;
    }
    renderHeader(container) {
        const viewListButtonContainer = container.appendChild($('.chat-file-changes-label'));
        const viewListButton = new ButtonWithIcon(viewListButtonContainer, {});
        viewListButton.label = this.fileChanges.length === 1 ? `Changed 1 file` : `Changed ${this.fileChanges.length} files`;
        const setExpansionState = () => {
            viewListButton.icon = this.isCollapsed ? Codicon.chevronRight : Codicon.chevronDown;
            this.domNode.classList.toggle('chat-file-changes-collapsed', this.isCollapsed);
            this._onDidChangeHeight.fire();
        };
        setExpansionState();
        const disposables = new DisposableStore();
        disposables.add(viewListButton);
        disposables.add(viewListButton.onDidClick(() => {
            this.isCollapsed = !this.isCollapsed;
            setExpansionState();
        }));
        disposables.add(this.renderViewAllFileChangesButton(viewListButton.element));
        return toDisposable(() => disposables.dispose());
    }
    renderViewAllFileChangesButton(container) {
        const button = container.appendChild($('.chat-view-changes-icon'));
        this.hoverService.setupDelayedHover(button, () => ({
            content: localize2(5515, 'View All File Changes')
        }));
        button.classList.add(...ThemeIcon.asClassNameArray(Codicon.diffMultiple));
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
        return dom.addDisposableListener(button, 'click', (e) => {
            const resources = [];
            for (const fileChange of this.fileChanges) {
                const diffEntry = this.fileChangesDiffsObservable.get().get(this.changeID(fileChange));
                if (diffEntry) {
                    resources.push({
                        originalUri: diffEntry.originalURI,
                        modifiedUri: diffEntry.modifiedURI
                    });
                }
                else {
                    resources.push({
                        originalUri: fileChange.reference
                    });
                }
            }
            const source = URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
            const input = this.instantiationService.createInstance(MultiDiffEditorInput, source, 'Checkpoint File Changes', resources.map(resource => {
                return new MultiDiffEditorItem(resource.originalUri, resource.modifiedUri, undefined);
            }), false);
            this.editorGroupsService.activeGroup.openEditor(input);
            dom.EventHelper.stop(e, true);
        });
    }
    renderFilesList(container) {
        const store = new DisposableStore();
        this.list = store.add(this.instantiationService.createInstance(CollapsibleChangesSummaryListPool)).get();
        const listNode = this.list.getHTMLElement();
        const itemsShown = Math.min(this.fileChanges.length, this.MAX_ITEMS_SHOWN);
        const height = itemsShown * this.ELEMENT_HEIGHT;
        this.list.layout(height);
        listNode.style.height = height + 'px';
        this.updateList(this.fileChanges, this.fileChangesDiffsObservable.get());
        container.appendChild(listNode.parentElement);
        store.add(this.list.onDidOpen((item) => {
            const element = item.element;
            if (!element) {
                return;
            }
            const diff = this.fileChangesDiffsObservable.get().get(this.changeID(element));
            if (diff) {
                const input = {
                    original: { resource: diff.originalURI },
                    modified: { resource: diff.modifiedURI },
                    options: { preserveFocus: true }
                };
                this.editorService.openEditor(input);
            }
            else {
                this.editorService.openEditor({ resource: element.reference, options: { preserveFocus: true } });
            }
        }));
        store.add(this.list.onContextMenu(e => {
            dom.EventHelper.stop(e.browserEvent, true);
        }));
        store.add(autorun((r) => {
            this.updateList(this.fileChanges, this.fileChangesDiffsObservable.read(r));
        }));
        return store;
    }
    updateList(fileChanges, fileChangesDiffs) {
        this.list.splice(0, this.list.length, this.computeFileChangeSummaryItems(fileChanges, fileChangesDiffs));
    }
    computeFileChangeSummaryItems(fileChanges, fileChangesDiffs) {
        const items = [];
        for (const fileChange of fileChanges) {
            const diffEntry = fileChangesDiffs.get(this.changeID(fileChange));
            if (diffEntry) {
                const additionalLabels = [];
                if (diffEntry) {
                    additionalLabels.push({
                        description: ` +${diffEntry.added} `,
                        className: 'insertions',
                    });
                    additionalLabels.push({
                        description: ` -${diffEntry.removed} `,
                        className: 'deletions',
                    });
                }
                const item = {
                    ...fileChange,
                    additionalLabels
                };
                items.push(item);
            }
            else {
                items.push(fileChange);
            }
        }
        return items;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'changesSummary' && other.fileChanges.length === this.fileChanges.length;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatCheckpointFileChangesSummaryContentPart = __decorate([
    __param(2, IHoverService),
    __param(3, IChatService),
    __param(4, IEditorService),
    __param(5, IEditorGroupsService),
    __param(6, IInstantiationService)
], ChatCheckpointFileChangesSummaryContentPart);
export { ChatCheckpointFileChangesSummaryContentPart };
let CollapsibleChangesSummaryListPool = class CollapsibleChangesSummaryListPool extends Disposable {
    constructor(instantiationService, themeService) {
        super();
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this._resourcePool = this._register(new ResourcePool(() => this.listFactory()));
    }
    listFactory() {
        const container = $('.chat-summary-list');
        const store = new DisposableStore();
        store.add(createFileIconThemableTreeContainerScope(container, this.themeService));
        const resourceLabels = store.add(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: () => Disposable.None }));
        const list = store.add(this.instantiationService.createInstance((WorkbenchList), 'ChatListRenderer', container, new CollapsibleChangesSummaryListDelegate(), [this.instantiationService.createInstance(CollapsibleChangesSummaryListRenderer, resourceLabels)], {
            alwaysConsumeMouseWheel: false
        }));
        return {
            list: list,
            dispose: () => {
                store.dispose();
            }
        };
    }
    get() {
        return this._resourcePool.get().list;
    }
};
CollapsibleChangesSummaryListPool = __decorate([
    __param(0, IInstantiationService),
    __param(1, IThemeService)
], CollapsibleChangesSummaryListPool);
class CollapsibleChangesSummaryListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return CollapsibleChangesSummaryListRenderer.TEMPLATE_ID;
    }
}
class CollapsibleChangesSummaryListRenderer {
    static { this.TEMPLATE_ID = 'collapsibleChangesSummaryListRenderer'; }
    static { this.CHANGES_SUMMARY_CLASS_NAME = 'insertions-and-deletions'; }
    constructor(labels) {
        this.labels = labels;
        this.templateId = CollapsibleChangesSummaryListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true, supportIcons: true });
        return { label, dispose: () => label.dispose() };
    }
    renderElement(data, index, templateData) {
        const label = templateData.label;
        label.setFile(data.reference, {
            fileKind: FileKind.FILE,
            title: data.reference.path
        });
        const labelElement = label.element;
        // eslint-disable-next-line no-restricted-syntax
        labelElement.querySelector(`.${CollapsibleChangesSummaryListRenderer.CHANGES_SUMMARY_CLASS_NAME}`)?.remove();
        if (!data.additionalLabels) {
            return;
        }
        const changesSummary = labelElement.appendChild($(`.${CollapsibleChangesSummaryListRenderer.CHANGES_SUMMARY_CLASS_NAME}`));
        for (const additionalLabel of data.additionalLabels) {
            const element = changesSummary.appendChild($(`.${additionalLabel.className}`));
            element.textContent = additionalLabel.description;
        }
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//# sourceMappingURL=chatChangesSummaryPart.js.map