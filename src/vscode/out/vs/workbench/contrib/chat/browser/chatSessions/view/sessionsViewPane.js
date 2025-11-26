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
        return nls.localize('chatSessions', 'Chat Sessions');
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
            label: nls.localize('chatSession.selectOption', 'More...'),
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
                title: nls.localize('chatSessions.refreshing', 'Refreshing chat sessions...'),
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
                title: nls.localize('chatSessions.loading', 'Loading chat sessions...'),
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
                    return nls.localize('chatSessions.dragLabel', "{0} agent sessions", elements.length);
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
                label: nls.localize('chatSessions.installExtensions', "Install Chat Extensions"),
                icon: Codicon.extensions,
                commandId: 'chat.sessions.gettingStarted'
            },
            {
                id: 'learn-more',
                label: nls.localize('chatSessions.learnMoreGHCodingAgent', "Learn More About Puku AI coding agent"),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Vzc2lvbnNWaWV3UGFuZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2Vzc2lvbnMvdmlldy9zZXNzaW9uc1ZpZXdQYW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUl2RixPQUFPLEVBQVcsUUFBUSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDN0UsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBR3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUNwSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcs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