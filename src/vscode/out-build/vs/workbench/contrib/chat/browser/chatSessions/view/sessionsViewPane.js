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
import * as DOM from '../../../../../../base/browser/dom.js';
import { $, append } from '../../../../../../base/browser/dom.js';
import { renderAsPlaintext } from '../../../../../../base/browser/markdownRenderer.js';
import { toAction } from '../../../../../../base/common/actions.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { truncate } from '../../../../../../base/common/strings.js';
import { URI } from '../../../../../../base/common/uri.js';
import * as nls from '../../../../../../nls.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getActionBarActions } from '../../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction } from '../../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree, WorkbenchList } from '../../../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../../../platform/progress/common/progress.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { fillEditorsDragData } from '../../../../../browser/dnd.js';
import { ResourceLabels } from '../../../../../browser/labels.js';
import { ViewPane } from '../../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { IEditorGroupsService } from '../../../../../services/editor/common/editorGroupsService.js';
import { IChatService } from '../../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../../common/chatSessionsService.js';
import { ChatConfiguration, ChatEditorTitleMaxLength } from '../../../common/constants.js';
import { ACTION_ID_OPEN_CHAT } from '../../actions/chatActions.js';
import { IChatWidgetService } from '../../chat.js';
import { getSessionItemContextOverlay, NEW_CHAT_SESSION_ACTION_ID } from '../common.js';
import { LocalChatSessionsProvider } from '../localChatSessionsProvider.js';
import { ArchivedSessionItems, GettingStartedDelegate, GettingStartedRenderer, SessionsDataSource, SessionsDelegate, SessionsRenderer } from './sessionsTreeRenderer.js';
// Identity provider for session items
class SessionsIdentityProvider {
    getId(element) {
        if (element instanceof ArchivedSessionItems) {
            return 'archived-session-items';
        }
        return element.resource.toString();
    }
}
// Accessibility provider for session items
class SessionsAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize(5989, null);
    }
    getAriaLabel(element) {
        return element.label;
    }
}
let SessionsViewPane = class SessionsViewPane extends ViewPane {
    constructor(provider, sessionTracker, viewId, options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, chatService, logService, progressService, menuService, commandService, chatWidgetService, editorGroupsService, chatSessionsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.provider = provider;
        this.sessionTracker = sessionTracker;
        this.viewId = viewId;
        this.chatService = chatService;
        this.logService = logService;
        this.progressService = progressService;
        this.menuService = menuService;
        this.commandService = commandService;
        this.chatWidgetService = chatWidgetService;
        this.editorGroupsService = editorGroupsService;
        this.chatSessionsService = chatSessionsService;
        this._isEmpty = true;
        this.minimumBodySize = 44;
        // Listen for changes in the provider if it's a LocalChatSessionsProvider
        if (provider instanceof LocalChatSessionsProvider) {
            this._register(provider.onDidChange(() => {
                if (this.tree && this.isBodyVisible()) {
                    this.refreshTreeWithProgress();
                }
            }));
        }
        // Listen for configuration changes to refresh view when description display changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ShowAgentSessionsViewDescription)) {
                if (this.tree && this.isBodyVisible()) {
                    this.refreshTreeWithProgress();
                }
            }
        }));
        this._register(this.chatSessionsService.onDidChangeSessionItems((chatSessionType) => {
            if (provider.chatSessionType === chatSessionType && this.tree && this.isBodyVisible()) {
                this.refreshTreeWithProgress();
            }
        }));
        if (provider) { // TODO: Why can this be undefined?
            this.scopedContextKeyService.createKey('chatSessionType', provider.chatSessionType);
        }
    }
    shouldShowWelcome() {
        return this._isEmpty;
    }
    createActionViewItem(action, options) {
        if (action.id.startsWith(NEW_CHAT_SESSION_ACTION_ID)) {
            return this.getChatSessionDropdown(action, options);
        }
        return super.createActionViewItem(action, options);
    }
    getChatSessionDropdown(defaultAction, options) {
        const primaryAction = this.instantiationService.createInstance(MenuItemAction, {
            id: defaultAction.id,
            title: defaultAction.label,
            icon: Codicon.plus,
        }, undefined, undefined, undefined, undefined);
        const actions = this.menuService.getMenuActions(MenuId.ChatSessionsMenu, this.scopedContextKeyService, { shouldForwardArgs: true });
        const primaryActions = getActionBarActions(actions, 'submenu').primary.filter(action => {
            if (action instanceof MenuItemAction && defaultAction instanceof MenuItemAction) {
                if (!action.item.source?.id || !defaultAction.item.source?.id) {
                    return false;
                }
                if (action.item.source.id === defaultAction.item.source.id) {
                    return true;
                }
            }
            return false;
        });
        if (!primaryActions || primaryActions.length === 0) {
            return;
        }
        const dropdownAction = toAction({
            id: 'selectNewChatSessionOption',
            label: nls.localize(5990, null),
            class: 'codicon-chevron-down',
            run: () => { }
        });
        const dropdownActions = [];
        primaryActions.forEach(element => {
            dropdownActions.push(element);
        });
        return this.instantiationService.createInstance(DropdownWithPrimaryActionViewItem, primaryAction, dropdownAction, dropdownActions, '', options);
    }
    isEmpty() {
        // Check if the tree has the provider node and get its children count
        if (!this.tree?.hasNode(this.provider)) {
            return true;
        }
        const providerNode = this.tree.getNode(this.provider);
        const childCount = providerNode.children?.length || 0;
        return childCount === 0;
    }
    /**
     * Updates the empty state message based on current tree data.
     * Uses the tree's existing data to avoid redundant provider calls.
     */
    updateEmptyState() {
        try {
            const newEmptyState = this.isEmpty();
            if (newEmptyState !== this._isEmpty) {
                this._isEmpty = newEmptyState;
                this._onDidChangeViewWelcomeState.fire();
            }
        }
        catch (error) {
            this.logService.error('Error checking tree data for empty state:', error);
        }
    }
    /**
     * Refreshes the tree data with progress indication.
     * Shows a progress indicator while the tree updates its children from the provider.
     */
    async refreshTreeWithProgress() {
        if (!this.tree) {
            return;
        }
        try {
            await this.progressService.withProgress({
                location: this.id, // Use the view ID as the progress location
                title: nls.localize(5991, null),
            }, async () => {
                await this.tree.updateChildren(this.provider);
            });
            // Check for empty state after refresh using tree data
            this.updateEmptyState();
        }
        catch (error) {
            // Log error but don't throw to avoid breaking the UI
            this.logService.error('Error refreshing chat sessions tree:', error);
        }
    }
    /**
     * Loads initial tree data with progress indication.
     * Shows a progress indicator while the tree loads data from the provider.
     */
    async loadDataWithProgress() {
        if (!this.tree) {
            return;
        }
        try {
            await this.progressService.withProgress({
                location: this.id, // Use the view ID as the progress location
                title: nls.localize(5992, null),
            }, async () => {
                await this.tree.setInput(this.provider);
            });
            // Check for empty state after loading using tree data
            this.updateEmptyState();
        }
        catch (error) {
            // Log error but don't throw to avoid breaking the UI
            this.logService.error('Error loading chat sessions data:', error);
        }
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('chat-sessions-view');
        // For Getting Started view (null provider), show simple list
        if (this.provider === null) {
            this.renderGettingStartedList(container);
            return;
        }
        this.treeContainer = DOM.append(container, DOM.$('.chat-sessions-tree-container'));
        // Create message element for empty state
        this.messageElement = append(container, $('.chat-sessions-message'));
        this.messageElement.style.display = 'none';
        // Create the tree components
        const dataSource = new SessionsDataSource(this.provider, this.sessionTracker);
        const delegate = new SessionsDelegate(this.configurationService);
        const identityProvider = new SessionsIdentityProvider();
        const accessibilityProvider = new SessionsAccessibilityProvider();
        // Use the existing ResourceLabels service for consistent styling
        const renderer = this.instantiationService.createInstance(SessionsRenderer, this.viewDescriptorService.getViewLocationById(this.viewId));
        this._register(renderer);
        const getResourceForElement = (element) => {
            return element.resource;
        };
        this.tree = this.instantiationService.createInstance(WorkbenchAsyncDataTree, 'ChatSessions', this.treeContainer, delegate, [renderer], dataSource, {
            dnd: {
                onDragStart: (data, originalEvent) => {
                    try {
                        const elements = data.getData();
                        const uris = elements.map(getResourceForElement);
                        this.instantiationService.invokeFunction(accessor => fillEditorsDragData(accessor, uris, originalEvent));
                    }
                    catch {
                        // noop
                    }
                },
                getDragURI: (element) => {
                    if (element instanceof ArchivedSessionItems) {
                        return null;
                    }
                    return getResourceForElement(element).toString();
                },
                getDragLabel: (elements) => {
                    if (elements.length === 1) {
                        return elements[0].label;
                    }
                    return nls.localize(5993, null, elements.length);
                },
                drop: () => { },
                onDragOver: () => false,
                dispose: () => { },
            },
            accessibilityProvider,
            identityProvider,
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (session) => {
                    const parts = [
                        session.label || '',
                        typeof session.description === 'string' ? session.description : (session.description ? renderAsPlaintext(session.description) : '')
                    ];
                    return parts.filter(text => text.length > 0).join(' ');
                }
            },
            multipleSelectionSupport: false,
            overrideStyles: {
                listBackground: undefined
            },
            paddingBottom: SessionsDelegate.ITEM_HEIGHT,
            setRowLineHeight: false
        });
        // Set the input
        this.tree.setInput(this.provider);
        // Register tree events
        this._register(this.tree.onDidOpen((e) => {
            if (e.element) {
                this.openChatSession(e.element);
            }
        }));
        // Register context menu event for right-click actions
        this._register(this.tree.onContextMenu((e) => {
            if (e.element && !(e.element instanceof ArchivedSessionItems)) {
                this.showContextMenu(e);
            }
            if (e.element) {
                this.showContextMenu(e);
            }
        }));
        this._register(this.tree.onMouseDblClick(e => {
            const scrollingByPage = this.configurationService.getValue('workbench.list.scrollByPage');
            if (e.element === null && !scrollingByPage) {
                if (this.provider?.chatSessionType && this.provider.chatSessionType !== localChatSessionType) {
                    this.commandService.executeCommand(`workbench.action.chat.openNewSessionEditor.${this.provider?.chatSessionType}`);
                }
                else {
                    this.commandService.executeCommand(ACTION_ID_OPEN_CHAT);
                }
            }
        }));
        // Handle visibility changes to load data
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            if (visible && this.tree) {
                await this.loadDataWithProgress();
            }
        }));
        // Initially load data if visible
        if (this.isBodyVisible() && this.tree) {
            this.loadDataWithProgress();
        }
        this._register(this.tree);
    }
    renderGettingStartedList(container) {
        const listContainer = DOM.append(container, DOM.$('.getting-started-list-container'));
        const items = [
            {
                id: 'install-extensions',
                label: nls.localize(5994, null),
                icon: Codicon.extensions,
                commandId: 'chat.sessions.gettingStarted'
            },
            {
                id: 'learn-more',
                label: nls.localize(5995, null),
                commandId: 'vscode.open',
                icon: Codicon.book,
                args: [URI.parse('https://aka.ms/coding-agent-docs')]
            }
        ];
        const delegate = new GettingStartedDelegate();
        // Create ResourceLabels instance for the renderer
        const labels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this._register(labels);
        const renderer = new GettingStartedRenderer(labels);
        this.list = this.instantiationService.createInstance((WorkbenchList), 'GettingStarted', listContainer, delegate, [renderer], {
            horizontalScrolling: false,
        });
        this.list.splice(0, 0, items);
        this._register(this.list.onDidOpen(e => {
            if (e.element) {
                this.commandService.executeCommand(e.element.commandId, ...e.element.args ?? []);
            }
        }));
        this._register(this.list);
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        if (this.tree) {
            this.tree.layout(height, width);
        }
        if (this.list) {
            this.list.layout(height, width);
        }
    }
    async openChatSession(session) {
        try {
            if (session instanceof ArchivedSessionItems) {
                return;
            }
            const options = {
                pinned: true,
                ignoreInView: true,
                title: {
                    preferred: truncate(session.label, ChatEditorTitleMaxLength),
                },
                preserveFocus: true,
            };
            await this.chatWidgetService.openSession(session.resource, undefined, options);
        }
        catch (error) {
            this.logService.error('[SessionsViewPane] Failed to open chat session:', error);
        }
    }
    showContextMenu(e) {
        if (!e.element) {
            return;
        }
        const session = e.element;
        const sessionWithProvider = session;
        // Create context overlay for this specific session item
        const contextOverlay = getSessionItemContextOverlay(session, sessionWithProvider.provider, this.chatWidgetService, this.chatService, this.editorGroupsService);
        const contextKeyService = this.contextKeyService.createOverlay(contextOverlay);
        // Create marshalled context for command execution
        const marshalledSession = {
            session: session,
            $mid: 25 /* MarshalledId.ChatSessionContext */
        };
        // Create menu for this session item to get actions
        const menu = this.menuService.createMenu(MenuId.ChatSessionsMenu, contextKeyService);
        // Get actions and filter for context menu (all actions that are NOT inline)
        const actions = menu.getActions({ arg: marshalledSession, shouldForwardArgs: true });
        const { secondary } = getActionBarActions(actions, 'inline');
        this.contextMenuService.showContextMenu({
            getActions: () => secondary,
            getAnchor: () => e.anchor,
            getActionsContext: () => marshalledSession,
        });
        menu.dispose();
    }
};
SessionsViewPane = __decorate([
    __param(4, IKeybindingService),
    __param(5, IContextMenuService),
    __param(6, IConfigurationService),
    __param(7, IContextKeyService),
    __param(8, IViewDescriptorService),
    __param(9, IInstantiationService),
    __param(10, IOpenerService),
    __param(11, IThemeService),
    __param(12, IHoverService),
    __param(13, IChatService),
    __param(14, ILogService),
    __param(15, IProgressService),
    __param(16, IMenuService),
    __param(17, ICommandService),
    __param(18, IChatWidgetService),
    __param(19, IEditorGroupsService),
    __param(20, IChatSessionsService)
], SessionsViewPane);
export { SessionsViewPane };
//# sourceMappingURL=sessionsViewPane.js.map