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
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatEditorInput } from '../chatEditorInput.js';
const $ = dom.$;
const ELEMENT_HEIGHT = 22;
const MAX_ITEMS_SHOWN = 6;
let ChatMultiDiffContentPart = class ChatMultiDiffContentPart extends Disposable {
    constructor(content, _element, instantiationService, editorService, themeService, menuService, contextKeyService) {
        super();
        this.content = content;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.themeService = themeService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.isCollapsed = false;
        this.readOnly = content.readOnly ?? false;
        const headerDomNode = $('.checkpoint-file-changes-summary-header');
        this.domNode = $('.checkpoint-file-changes-summary', undefined, headerDomNode);
        this.domNode.tabIndex = 0;
        this._register(this.renderHeader(headerDomNode));
        this._register(this.renderFilesList(this.domNode));
    }
    renderHeader(container) {
        const fileCount = this.content.multiDiffData.resources.length;
        const viewListButtonContainer = container.appendChild($('.chat-file-changes-label'));
        const viewListButton = new ButtonWithIcon(viewListButtonContainer, {});
        viewListButton.label = fileCount === 1
            ? localize(5542, null)
            : localize(5543, null, fileCount);
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
        if (!this.readOnly) {
            disposables.add(this.renderViewAllFileChangesButton(viewListButton.element));
        }
        disposables.add(this.renderContributedButtons(viewListButton.element));
        return toDisposable(() => disposables.dispose());
    }
    renderViewAllFileChangesButton(container) {
        const button = container.appendChild($('.chat-view-changes-icon'));
        button.classList.add(...ThemeIcon.asClassNameArray(Codicon.diffMultiple));
        button.title = localize(5544, null);
        return dom.addDisposableListener(button, 'click', (e) => {
            const source = URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
            const input = this.instantiationService.createInstance(MultiDiffEditorInput, source, this.content.multiDiffData.title || 'Multi-Diff', this.content.multiDiffData.resources.map(resource => new MultiDiffEditorItem(resource.originalUri, resource.modifiedUri, resource.goToFileUri)), false);
            const sideBySide = e.altKey;
            this.editorService.openEditor(input, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
            dom.EventHelper.stop(e, true);
        });
    }
    renderContributedButtons(container) {
        const buttonsContainer = container.appendChild($('.chat-multidiff-contributed-buttons'));
        const disposables = new DisposableStore();
        const actionBar = disposables.add(new ActionBar(buttonsContainer, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */
        }));
        const setupActionBar = () => {
            actionBar.clear();
            let marshalledUri = undefined;
            let contextKeyService = this.contextKeyService;
            if (this.editorService.activeEditor instanceof ChatEditorInput) {
                contextKeyService = this.contextKeyService.createOverlay([
                    [ChatContextKeys.sessionType.key, this.editorService.activeEditor.getSessionType()]
                ]);
                marshalledUri = {
                    ...this.editorService.activeEditor.resource,
                    $mid: 1 /* MarshalledId.Uri */
                };
            }
            const actions = this.menuService.getMenuActions(MenuId.ChatMultiDiffContext, contextKeyService, { arg: marshalledUri, shouldForwardArgs: true });
            const allActions = actions.flatMap(([, actions]) => actions);
            if (allActions.length > 0) {
                actionBar.push(allActions, { icon: true, label: false });
            }
        };
        setupActionBar();
        return disposables;
    }
    renderFilesList(container) {
        const store = new DisposableStore();
        const listContainer = container.appendChild($('.chat-summary-list'));
        store.add(createFileIconThemableTreeContainerScope(listContainer, this.themeService));
        const resourceLabels = store.add(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: Event.None }));
        this.list = store.add(this.instantiationService.createInstance((WorkbenchList), 'ChatMultiDiffList', listContainer, new ChatMultiDiffListDelegate(), [this.instantiationService.createInstance(ChatMultiDiffListRenderer, resourceLabels)], {
            identityProvider: {
                getId: (element) => element.uri.toString()
            },
            setRowLineHeight: true,
            horizontalScrolling: false,
            supportDynamicHeights: false,
            mouseSupport: !this.readOnly,
            alwaysConsumeMouseWheel: false,
            accessibilityProvider: {
                getAriaLabel: (element) => element.uri.path,
                getWidgetAriaLabel: () => localize(5545, null)
            }
        }));
        const items = [];
        for (const resource of this.content.multiDiffData.resources) {
            const uri = resource.modifiedUri || resource.originalUri || resource.goToFileUri;
            if (!uri) {
                continue;
            }
            const item = { uri };
            if (resource.originalUri && resource.modifiedUri) {
                item.diff = {
                    originalURI: resource.originalUri,
                    modifiedURI: resource.modifiedUri,
                    isFinal: true,
                    quitEarly: false,
                    identical: false,
                    added: resource.added || 0,
                    removed: resource.removed || 0
                };
            }
            items.push(item);
        }
        this.list.splice(0, this.list.length, items);
        const height = Math.min(items.length, MAX_ITEMS_SHOWN) * ELEMENT_HEIGHT;
        this.list.layout(height);
        listContainer.style.height = `${height}px`;
        if (!this.readOnly) {
            store.add(this.list.onDidOpen((e) => {
                if (!e.element) {
                    return;
                }
                if (e.element.diff) {
                    this.editorService.openEditor({
                        original: { resource: e.element.diff.originalURI },
                        modified: { resource: e.element.diff.modifiedURI },
                        options: { preserveFocus: true }
                    });
                }
                else {
                    this.editorService.openEditor({
                        resource: e.element.uri,
                        options: { preserveFocus: true }
                    });
                }
            }));
        }
        return store;
    }
    hasSameContent(other) {
        return other.kind === 'multiDiffData' &&
            other.multiDiffData?.resources?.length === this.content.multiDiffData.resources.length;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatMultiDiffContentPart = __decorate([
    __param(2, IInstantiationService),
    __param(3, IEditorService),
    __param(4, IThemeService),
    __param(5, IMenuService),
    __param(6, IContextKeyService)
], ChatMultiDiffContentPart);
export { ChatMultiDiffContentPart };
class ChatMultiDiffListDelegate {
    getHeight() {
        return 22;
    }
    getTemplateId() {
        return 'chatMultiDiffItem';
    }
}
class ChatMultiDiffListRenderer {
    static { this.TEMPLATE_ID = 'chatMultiDiffItem'; }
    static { this.CHANGES_SUMMARY_CLASS_NAME = 'insertions-and-deletions'; }
    constructor(labels) {
        this.labels = labels;
        this.templateId = ChatMultiDiffListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true, supportIcons: true });
        return {
            label,
            dispose: () => label.dispose()
        };
    }
    renderElement(element, _index, templateData) {
        templateData.label.setFile(element.uri, {
            fileKind: FileKind.FILE,
            title: element.uri.path
        });
        const labelElement = templateData.label.element;
        // eslint-disable-next-line no-restricted-syntax
        labelElement.querySelector(`.${ChatMultiDiffListRenderer.CHANGES_SUMMARY_CLASS_NAME}`)?.remove();
        if (element.diff?.added || element.diff?.removed) {
            const changesSummary = labelElement.appendChild($(`.${ChatMultiDiffListRenderer.CHANGES_SUMMARY_CLASS_NAME}`));
            const addedElement = changesSummary.appendChild($('.insertions'));
            addedElement.textContent = `+${element.diff.added}`;
            const removedElement = changesSummary.appendChild($('.deletions'));
            removedElement.textContent = `-${element.diff.removed}`;
            changesSummary.setAttribute('aria-label', localize(5546, null, element.diff.added, element.diff.removed));
        }
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//# sourceMappingURL=chatMultiDiffContentPart.js.map