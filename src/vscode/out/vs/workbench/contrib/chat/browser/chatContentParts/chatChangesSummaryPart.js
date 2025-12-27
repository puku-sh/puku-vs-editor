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
            content: localize2('chat.viewFileChangesSummary', 'View All File Changes')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENoYW5nZXNTdW1tYXJ5UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDaGFuZ2VzU3VtbWFyeVBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFrRCxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEQsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFF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