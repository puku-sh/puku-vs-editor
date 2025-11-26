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
            ? localize('chatMultiDiff.oneFile', 'Changed 1 file')
            : localize('chatMultiDiff.manyFiles', 'Changed {0} files', fileCount);
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
        button.title = localize('chatMultiDiff.openAllChanges', 'Open Changes');
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
                getWidgetAriaLabel: () => localize('chatMultiDiffList', "File Changes")
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
            changesSummary.setAttribute('aria-label', localize('chatEditingSession.fileCounts', '{0} lines added, {1} lines removed', element.diff.added, element.diff.removed));
        }
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE11bHRpRGlmZkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdE11bHRpRGlmZkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSx1REFBdUQsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFFakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFakgsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQWtCLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUtsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHeEQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQU9oQixNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUM7QUFDMUIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFDO0FBRW5CLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQVV2RCxZQUNrQixPQUEyQixFQUM1QyxRQUFzQixFQUNDLG9CQUE0RCxFQUNuRSxhQUE4QyxFQUMvQyxZQUE0QyxFQUM3QyxXQUEwQyxFQUNwQyxpQkFBc0Q7UUFFMUUsS0FBSyxFQUFFLENBQUM7UUFSUyxZQUFPLEdBQVAsT0FBTyxDQUFvQjtRQUVKLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzlCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQzVCLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBQ25CLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFkMUQsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDMUQsc0JBQWlCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUcxRCxnQkFBVyxHQUFZLEtBQUssQ0FBQztRQWNwQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDO1FBRTFDLE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ25FLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMvRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFFMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFTyxZQUFZLENBQUMsU0FBc0I7UUFDMUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUU5RCxNQUFNLHVCQUF1QixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLGNBQWMsR0FBRyxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RSxjQUFjLENBQUMsS0FBSyxHQUFHLFNBQVMsS0FBSyxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZ0JBQWdCLENBQUM7WUFDckQsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV2RSxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtZQUM5QixjQUFjLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7WUFDcEYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLDZCQUE2QixFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMvRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDaEMsQ0FBQyxDQUFDO1FBQ0YsaUJBQWlCLEVBQUUsQ0FBQztRQUVwQixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDaEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUM5QyxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNyQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN2RSxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBRU8sOEJBQThCLENBQUMsU0FBc0I7UUFDNUQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDO1FBQ25FLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzFFLE1BQU0sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXhFLE9BQU8sR0FBRyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN2RCxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixJQUFJLElBQUksRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEgsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDckQsb0JBQW9CLEVBQ3BCLE1BQU0sRUFDTixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksWUFBWSxFQUNoRCxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxtQkFBbUIsQ0FDM0UsUUFBUSxDQUFDLFdBQVcsRUFDcEIsUUFBUSxDQUFDLFdBQVcsRUFDcEIsUUFBUSxDQUFDLFdBQVcsQ0FDcEIsQ0FBQyxFQUNGLEtBQUssQ0FDTCxDQUFDO1lBQ0YsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzdFLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxTQUFzQjtRQUN0RCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDLENBQUMsQ0FBQztRQUN6RixNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLEVBQUU7WUFDakUsV0FBVyx1Q0FBK0I7U0FDMUMsQ0FBQyxDQUFDLENBQUM7UUFDSixNQUFNLGNBQWMsR0FBRyxHQUFHLEVBQUU7WUFDM0IsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRWxCLElBQUksYUFBYSxHQUFvQixTQUFTLENBQUM7WUFDL0MsSUFBSSxpQkFBaUIsR0FBdUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ25FLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLFlBQVksZUFBZSxFQUFFLENBQUM7Z0JBQ2hFLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUM7b0JBQ3hELENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7aUJBQ25GLENBQUMsQ0FBQztnQkFFSCxhQUFhLEdBQUc7b0JBQ2YsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxRQUFRO29CQUMzQyxJQUFJLDBCQUFrQjtpQkFDdEIsQ0FBQztZQUNILENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FDOUMsTUFBTSxDQUFDLG9CQUFvQixFQUMzQixpQkFBaUIsRUFDakIsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUMvQyxDQUFDO1lBQ0YsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDN0QsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzQixTQUFTLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDMUQsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUNGLGNBQWMsRUFBRSxDQUFDO1FBQ2pCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBc0I7UUFDN0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUVwQyxNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDckUsS0FBSyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDdEYsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxFQUFFLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFbEksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzdELENBQUEsYUFBaUMsQ0FBQSxFQUNqQyxtQkFBbUIsRUFDbkIsYUFBYSxFQUNiLElBQUkseUJBQXlCLEVBQUUsRUFDL0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQ3JGO1lBQ0MsZ0JBQWdCLEVBQUU7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDLE9BQTJCLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO2FBQzlEO1lBQ0QsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixtQkFBbUIsRUFBRSxLQUFLO1lBQzFCLHFCQUFxQixFQUFFLEtBQUs7WUFDNUIsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVE7WUFDNUIsdUJBQXVCLEVBQUUsS0FBSztZQUM5QixxQkFBcUIsRUFBRTtnQkFDdEIsWUFBWSxFQUFFLENBQUMsT0FBMkIsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJO2dCQUMvRCxrQkFBa0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDO2FBQ3ZFO1NBQ0QsQ0FDRCxDQUFDLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBeUIsRUFBRSxDQUFDO1FBQ3ZDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDN0QsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUM7WUFDakYsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQXVCLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFFekMsSUFBSSxRQUFRLENBQUMsV0FBVyxJQUFJLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLElBQUksR0FBRztvQkFDWCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7b0JBQ2pDLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztvQkFDakMsT0FBTyxFQUFFLElBQUk7b0JBQ2IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDO29CQUMxQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDO2lCQUM5QixDQUFDO1lBQ0gsQ0FBQztZQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsZUFBZSxDQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3pCLGFBQWEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsTUFBTSxJQUFJLENBQUM7UUFFM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2hCLE9BQU87Z0JBQ1IsQ0FBQztnQkFFRCxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO3dCQUM3QixRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO3dCQUNsRCxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFO3dCQUNsRCxPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO3FCQUNoQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO3dCQUM3QixRQUFRLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHO3dCQUN2QixPQUFPLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO3FCQUNoQyxDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQTJCO1FBQ3pDLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxlQUFlO1lBQ3BDLEtBQUssQ0FBQyxhQUFhLEVBQUUsU0FBUyxFQUFFLE1BQU0sS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO0lBQ3pGLENBQUM7SUFFRCxhQUFhLENBQUMsVUFBdUI7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0QsQ0FBQTtBQWxOWSx3QkFBd0I7SUFhbEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLGtCQUFrQixDQUFBO0dBakJSLHdCQUF3QixDQWtOcEM7O0FBRUQsTUFBTSx5QkFBeUI7SUFDOUIsU0FBUztRQUNSLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7Q0FDRDtBQU1ELE1BQU0seUJBQXlCO2FBQ2QsZ0JBQVcsR0FBRyxtQkFBbUIsQUFBdEIsQ0FBdUI7YUFDbEMsK0JBQTBCLEdBQUcsMEJBQTBCLEFBQTdCLENBQThCO0lBSXhFLFlBQW9CLE1BQXNCO1FBQXRCLFdBQU0sR0FBTixNQUFNLENBQWdCO1FBRmpDLGVBQVUsR0FBVyx5QkFBeUIsQ0FBQyxXQUFXLENBQUM7SUFFdEIsQ0FBQztJQUUvQyxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBRTdGLE9BQU87WUFDTixLQUFLO1lBQ0wsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUU7U0FDOUIsQ0FBQztJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsT0FBMkIsRUFBRSxNQUFjLEVBQUUsWUFBd0M7UUFDbEcsWUFBWSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUN2QyxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDdkIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSTtTQUN2QixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUNoRCxnREFBZ0Q7UUFDaEQsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLHlCQUF5QixDQUFDLDBCQUEwQixFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUVqRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDbEQsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSx5QkFBeUIsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUvRyxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ2xFLFlBQVksQ0FBQyxXQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRXBELE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDbkUsY0FBYyxDQUFDLFdBQVcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFFeEQsY0FBYyxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLCtCQUErQixFQUFFLG9DQUFvQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN0SyxDQUFDO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUF3QztRQUN2RCxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDeEIsQ0FBQyJ9