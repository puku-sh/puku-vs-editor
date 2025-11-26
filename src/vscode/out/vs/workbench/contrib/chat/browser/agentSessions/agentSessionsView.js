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
import './media/agentsessionsview.css';
import { Codicon } from '../../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { ViewPaneContainer } from '../../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions, IViewDescriptorService } from '../../../../common/views.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatConfiguration } from '../../common/constants.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../../platform/list/browser/listService.js';
import { $, append } from '../../../../../base/browser/dom.js';
import { AgentSessionsViewModel, isLocalAgentSessionItem } from './agentSessionViewModel.js';
import { AgentSessionRenderer, AgentSessionsAccessibilityProvider, AgentSessionsCompressionDelegate, AgentSessionsDataSource, AgentSessionsDragAndDrop, AgentSessionsIdentityProvider, AgentSessionsKeyboardNavigationLabelProvider, AgentSessionsListDelegate, AgentSessionsSorter } from './agentSessionsViewer.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { ButtonWithDropdown } from '../../../../../base/browser/ui/button/button.js';
import { Separator, toAction } from '../../../../../base/common/actions.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { getSessionItemContextOverlay, NEW_CHAT_SESSION_ACTION_ID } from '../chatSessions/common.js';
import { ACTION_ID_OPEN_CHAT } from '../actions/chatActions.js';
import { IProgressService } from '../../../../../platform/progress/common/progress.js';
import { assertReturnsDefined } from '../../../../../base/common/types.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { getActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IChatService } from '../../common/chatService.js';
import { IChatWidgetService } from '../chat.js';
import { AGENT_SESSIONS_VIEW_ID, AGENT_SESSIONS_VIEW_CONTAINER_ID, AgentSessionProviders } from './agentSessions.js';
import { TreeFindMode } from '../../../../../base/browser/ui/tree/abstractTree.js';
import { SIDE_GROUP } from '../../../../services/editor/common/editorService.js';
let AgentSessionsView = class AgentSessionsView extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, chatSessionsService, commandService, progressService, editorGroupsService, chatService, menuService, chatWidgetService) {
        super({ ...options, titleMenuId: MenuId.AgentSessionsTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.chatSessionsService = chatSessionsService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.editorGroupsService = editorGroupsService;
        this.chatService = chatService;
        this.menuService = menuService;
        this.chatWidgetService = chatWidgetService;
    }
    renderBody(container) {
        super.renderBody(container);
        container.classList.add('agent-sessions-view');
        // New Session
        if (!this.configurationService.getValue('chat.hideNewButtonInAgentSessionsView')) {
            this.createNewSessionButton(container);
        }
        // Sessions List
        this.createList(container);
        this.registerListeners();
    }
    registerListeners() {
        // Sessions List
        const list = assertReturnsDefined(this.list);
        this._register(this.onDidChangeBodyVisibility(visible => {
            if (!visible || this.sessionsViewModel) {
                return;
            }
            if (!this.sessionsViewModel) {
                this.createViewModel();
            }
            else {
                this.list?.updateChildren();
            }
        }));
        this._register(list.onDidOpen(e => {
            this.openAgentSession(e);
        }));
        this._register(list.onMouseDblClick(({ element }) => {
            if (element === null) {
                this.commandService.executeCommand(ACTION_ID_OPEN_CHAT);
            }
        }));
        this._register(list.onContextMenu((e) => {
            this.showContextMenu(e);
        }));
    }
    async openAgentSession(e) {
        const session = e.element;
        if (!session) {
            return;
        }
        let sessionOptions;
        if (isLocalAgentSessionItem(session)) {
            sessionOptions = {};
        }
        else {
            sessionOptions = { title: { preferred: session.label } };
        }
        sessionOptions.ignoreInView = true;
        const options = {
            preserveFocus: false,
            ...sessionOptions,
            ...e.editorOptions,
        };
        await this.chatSessionsService.activateChatSessionItemProvider(session.providerType); // ensure provider is activated before trying to open
        const group = e.sideBySide ? SIDE_GROUP : undefined;
        await this.chatWidgetService.openSession(session.resource, group, options);
    }
    async showContextMenu({ element: session, anchor }) {
        if (!session) {
            return;
        }
        const provider = await this.chatSessionsService.activateChatSessionItemProvider(session.providerType);
        const menu = this.menuService.createMenu(MenuId.ChatSessionsMenu, this.contextKeyService.createOverlay(getSessionItemContextOverlay(session, provider, this.chatWidgetService, this.chatService, this.editorGroupsService)));
        const marshalledSession = { session, $mid: 25 /* MarshalledId.ChatSessionContext */ };
        const { secondary } = getActionBarActions(menu.getActions({ arg: marshalledSession, shouldForwardArgs: true }), 'inline');
        this.contextMenuService.showContextMenu({
            getActions: () => secondary,
            getAnchor: () => anchor,
            getActionsContext: () => marshalledSession,
        });
        menu.dispose();
    }
    createNewSessionButton(container) {
        this.newSessionContainer = append(container, $('.agent-sessions-new-session-container'));
        const newSessionButton = this._register(new ButtonWithDropdown(this.newSessionContainer, {
            title: localize('agentSessions.newSession', "New Session"),
            ariaLabel: localize('agentSessions.newSessionAriaLabel', "New Session"),
            contextMenuProvider: this.contextMenuService,
            actions: {
                getActions: () => {
                    return this.getNewSessionActions();
                }
            },
            addPrimaryActionToDropdown: false,
            ...defaultButtonStyles,
        }));
        newSessionButton.label = localize('agentSessions.newSession', "New Session");
        this._register(newSessionButton.onDidClick(() => this.commandService.executeCommand(ACTION_ID_OPEN_CHAT)));
    }
    getNewSessionActions() {
        const actions = [];
        // Default action
        actions.push(toAction({
            id: 'newChatSession.default',
            label: localize('newChatSessionDefault', "New Local Session"),
            run: () => this.commandService.executeCommand(ACTION_ID_OPEN_CHAT)
        }));
        // Background (CLI)
        actions.push(toAction({
            id: 'newChatSessionFromProvider.background',
            label: localize('newBackgroundSession', "New Background Session"),
            run: () => this.commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${AgentSessionProviders.Background}`)
        }));
        // Cloud
        actions.push(toAction({
            id: 'newChatSessionFromProvider.cloud',
            label: localize('newCloudSession', "New Cloud Session"),
            run: () => this.commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${AgentSessionProviders.Cloud}`)
        }));
        let addedSeparator = false;
        for (const provider of this.chatSessionsService.getAllChatSessionContributions()) {
            if (provider.type === AgentSessionProviders.Background || provider.type === AgentSessionProviders.Cloud) {
                continue; // already added above
            }
            if (!addedSeparator) {
                actions.push(new Separator());
                addedSeparator = true;
            }
            const menuActions = this.menuService.getMenuActions(MenuId.ChatSessionsCreateSubMenu, this.scopedContextKeyService.createOverlay([
                [ChatContextKeys.sessionType.key, provider.type]
            ]));
            const primaryActions = getActionBarActions(menuActions, () => true).primary;
            // Prefer provider creation actions...
            if (primaryActions.length > 0) {
                actions.push(...primaryActions);
            }
            // ...over our generic one
            else {
                actions.push(toAction({
                    id: `newChatSessionFromProvider.${provider.type}`,
                    label: localize('newChatSessionFromProvider', "New {0}", provider.displayName),
                    run: () => this.commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${provider.type}`)
                }));
            }
        }
        // Install more
        actions.push(new Separator());
        actions.push(toAction({
            id: 'install-extensions',
            label: localize('chatSessions.installExtensions', "Install Chat Extensions..."),
            run: () => this.commandService.executeCommand('chat.sessions.gettingStarted')
        }));
        return actions;
    }
    createList(container) {
        this.listContainer = append(container, $('.agent-sessions-viewer'));
        this.list = this._register(this.instantiationService.createInstance(WorkbenchCompressibleAsyncDataTree, 'AgentSessionsView', this.listContainer, new AgentSessionsListDelegate(), new AgentSessionsCompressionDelegate(), [
            this.instantiationService.createInstance(AgentSessionRenderer)
        ], new AgentSessionsDataSource(), {
            accessibilityProvider: new AgentSessionsAccessibilityProvider(),
            dnd: this.instantiationService.createInstance(AgentSessionsDragAndDrop),
            identityProvider: new AgentSessionsIdentityProvider(),
            horizontalScrolling: false,
            multipleSelectionSupport: false,
            findWidgetEnabled: true,
            defaultFindMode: TreeFindMode.Filter,
            keyboardNavigationLabelProvider: new AgentSessionsKeyboardNavigationLabelProvider(),
            sorter: new AgentSessionsSorter(),
            paddingBottom: AgentSessionsListDelegate.ITEM_HEIGHT,
            twistieAdditionalCssClass: () => 'force-no-twistie',
        }));
    }
    createViewModel() {
        const sessionsViewModel = this.sessionsViewModel = this._register(this.instantiationService.createInstance(AgentSessionsViewModel, { filterMenuId: MenuId.AgentSessionsFilterSubMenu }));
        this.list?.setInput(sessionsViewModel);
        this._register(sessionsViewModel.onDidChangeSessions(() => {
            if (this.isBodyVisible()) {
                this.list?.updateChildren();
            }
        }));
        const didResolveDisposable = this._register(new MutableDisposable());
        this._register(sessionsViewModel.onWillResolve(() => {
            const didResolve = new DeferredPromise();
            didResolveDisposable.value = Event.once(sessionsViewModel.onDidResolve)(() => didResolve.complete());
            this.progressService.withProgress({
                location: this.id,
                title: localize('agentSessions.refreshing', 'Refreshing agent sessions...'),
                delay: 500
            }, () => didResolve.p);
        }));
    }
    //#endregion
    //#region Actions internal API
    openFind() {
        this.list?.openFind();
    }
    refresh() {
        this.sessionsViewModel?.resolve(undefined);
    }
    //#endregion
    layoutBody(height, width) {
        super.layoutBody(height, width);
        let treeHeight = height;
        treeHeight -= this.newSessionContainer?.offsetHeight ?? 0;
        this.list?.layout(treeHeight, width);
    }
    focus() {
        super.focus();
        if (this.list?.getFocus().length) {
            this.list.domFocus();
        }
    }
};
AgentSessionsView = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService),
    __param(10, IChatSessionsService),
    __param(11, ICommandService),
    __param(12, IProgressService),
    __param(13, IEditorGroupsService),
    __param(14, IChatService),
    __param(15, IMenuService),
    __param(16, IChatWidgetService)
], AgentSessionsView);
export { AgentSessionsView };
//#region View Registration
const chatAgentsIcon = registerIcon('chat-sessions-icon', Codicon.commentDiscussionSparkle, 'Icon for Agent Sessions View');
const AGENT_SESSIONS_VIEW_TITLE = localize2('agentSessions.view.label', "Agent Sessions");
const agentSessionsViewContainer = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
    id: AGENT_SESSIONS_VIEW_CONTAINER_ID,
    title: AGENT_SESSIONS_VIEW_TITLE,
    icon: chatAgentsIcon,
    ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AGENT_SESSIONS_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
    storageId: AGENT_SESSIONS_VIEW_CONTAINER_ID,
    hideIfEmpty: true,
    order: 6,
}, 2 /* ViewContainerLocation.AuxiliaryBar */);
const agentSessionsViewDescriptor = {
    id: AGENT_SESSIONS_VIEW_ID,
    containerIcon: chatAgentsIcon,
    containerTitle: AGENT_SESSIONS_VIEW_TITLE.value,
    singleViewPaneContainerTitle: AGENT_SESSIONS_VIEW_TITLE.value,
    name: AGENT_SESSIONS_VIEW_TITLE,
    canToggleVisibility: false,
    canMoveView: true,
    openCommandActionDescriptor: {
        id: AGENT_SESSIONS_VIEW_ID,
        title: AGENT_SESSIONS_VIEW_TITLE
    },
    ctorDescriptor: new SyncDescriptor(AgentSessionsView),
    when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate(), ContextKeyExpr.equals(`config.${ChatConfiguration.AgentSessionsViewLocation}`, 'single-view'))
};
Registry.as(ViewExtensions.ViewsRegistry).registerViews([agentSessionsViewDescriptor], agentSessionsViewContainer);
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLCtCQUErQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDN0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNwRixPQUFPLEVBQW9CLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pGLE9BQU8sRUFBMkIsVUFBVSxJQUFJLGNBQWMsRUFBMEQsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwTCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDOUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFD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