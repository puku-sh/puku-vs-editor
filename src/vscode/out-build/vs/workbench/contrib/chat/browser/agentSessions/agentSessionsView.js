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
            title: localize(5316, null),
            ariaLabel: localize(5317, null),
            contextMenuProvider: this.contextMenuService,
            actions: {
                getActions: () => {
                    return this.getNewSessionActions();
                }
            },
            addPrimaryActionToDropdown: false,
            ...defaultButtonStyles,
        }));
        newSessionButton.label = localize(5318, null);
        this._register(newSessionButton.onDidClick(() => this.commandService.executeCommand(ACTION_ID_OPEN_CHAT)));
    }
    getNewSessionActions() {
        const actions = [];
        // Default action
        actions.push(toAction({
            id: 'newChatSession.default',
            label: localize(5319, null),
            run: () => this.commandService.executeCommand(ACTION_ID_OPEN_CHAT)
        }));
        // Background (CLI)
        actions.push(toAction({
            id: 'newChatSessionFromProvider.background',
            label: localize(5320, null),
            run: () => this.commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${AgentSessionProviders.Background}`)
        }));
        // Cloud
        actions.push(toAction({
            id: 'newChatSessionFromProvider.cloud',
            label: localize(5321, null),
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
                    label: localize(5322, null, provider.displayName),
                    run: () => this.commandService.executeCommand(`${NEW_CHAT_SESSION_ACTION_ID}.${provider.type}`)
                }));
            }
        }
        // Install more
        actions.push(new Separator());
        actions.push(toAction({
            id: 'install-extensions',
            label: localize(5323, null),
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
                title: localize(5324, null),
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
const AGENT_SESSIONS_VIEW_TITLE = localize2(5325, "Agent Sessions");
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
//# sourceMappingURL=agentSessionsView.js.map