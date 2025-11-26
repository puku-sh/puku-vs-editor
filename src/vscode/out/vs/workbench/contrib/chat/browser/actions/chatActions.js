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
import { isAncestorOfActiveElement } from '../../../../../base/browser/dom.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { toAction } from '../../../../../base/common/actions.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNowByDay, safeIntl } from '../../../../../base/common/date.js';
import { Event } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, markAsSingleton } from '../../../../../base/common/lifecycle.js';
import { language } from '../../../../../base/common/platform.js';
import { basename, isEqual } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { localize, localize2 } from '../../../../../nls.js';
import { IActionViewItemService } from '../../../../../platform/actions/browser/actionViewItemService.js';
import { DropdownWithPrimaryActionViewItem } from '../../../../../platform/actions/browser/dropdownWithPrimaryActionViewItem.js';
import { getContextMenuActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2, SubmenuItemAction } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IsLinuxContext, IsWindowsContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import product from '../../../../../platform/product/common/product.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ToggleTitleBarConfigAction } from '../../../../browser/parts/titlebar/titlebarActions.js';
import { ActiveEditorContext, IsCompactTitleBarContext } from '../../../../common/contextkeys.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { ACTIVE_GROUP, AUX_WINDOW_GROUP, IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { IPreferencesService } from '../../../../services/preferences/common/preferences.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { EXTENSIONS_CATEGORY, IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { SCMHistoryItemChangeRangeContentProvider } from '../../../scm/browser/scmHistoryChatContext.js';
import { ISCMService } from '../../../scm/common/scm.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ChatMode, IChatModeService } from '../../common/chatModes.js';
import { IChatService } from '../../common/chatService.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { isRequestVM } from '../../common/chatViewModel.js';
import { IChatWidgetHistoryService } from '../../common/chatWidgetHistoryService.js';
import { LEGACY_AGENT_SESSIONS_VIEW_ID, ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../../common/constants.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CopilotUsageExtensionFeatureId } from '../../common/languageModelStats.js';
import { ILanguageModelToolsConfirmationService } from '../../common/languageModelToolsConfirmationService.js';
import { ILanguageModelToolsService } from '../../common/languageModelToolsService.js';
import { ChatViewId, IChatWidgetService } from '../chat.js';
import { ChatEditorInput, shouldShowClearEditingSessionConfirmation, showClearEditingSessionConfirmation } from '../chatEditorInput.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { clearChatEditor } from './chatClear.js';
export const CHAT_CATEGORY = localize2('chat.category', 'Chat');
export const ACTION_ID_NEW_CHAT = `workbench.action.chat.newChat`;
export const ACTION_ID_NEW_EDIT_SESSION = `workbench.action.chat.newEditSession`;
export const ACTION_ID_OPEN_CHAT = 'workbench.action.openChat';
export const CHAT_OPEN_ACTION_ID = 'workbench.action.chat.open';
export const CHAT_SETUP_ACTION_ID = 'workbench.action.chat.triggerSetup';
export const CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID = 'workbench.action.chat.triggerSetupSupportAnonymousAction';
const TOGGLE_CHAT_ACTION_ID = 'workbench.action.chat.toggle';
const CHAT_CLEAR_HISTORY_ACTION_ID = 'workbench.action.chat.clearHistory';
export const CHAT_CONFIG_MENU_ID = new MenuId('workbench.chat.menu.config');
const OPEN_CHAT_QUOTA_EXCEEDED_DIALOG = 'workbench.action.chat.openQuotaExceededDialog';
class OpenChatGlobalAction extends Action2 {
    constructor(overrides, mode) {
        super({
            ...overrides,
            icon: Codicon.chatSparkle,
            f1: true,
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
        });
        this.mode = mode;
    }
    async run(accessor, opts) {
        opts = typeof opts === 'string' ? { query: opts } : opts;
        const chatService = accessor.get(IChatService);
        const widgetService = accessor.get(IChatWidgetService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        const hostService = accessor.get(IHostService);
        const chatAgentService = accessor.get(IChatAgentService);
        const instaService = accessor.get(IInstantiationService);
        const commandService = accessor.get(ICommandService);
        const chatModeService = accessor.get(IChatModeService);
        const fileService = accessor.get(IFileService);
        const languageModelService = accessor.get(ILanguageModelsService);
        const scmService = accessor.get(ISCMService);
        let chatWidget = widgetService.lastFocusedWidget;
        // When this was invoked to switch to a mode via keybinding, and some chat widget is focused, use that one.
        // Otherwise, open the view.
        if (!this.mode || !chatWidget || !isAncestorOfActiveElement(chatWidget.domNode)) {
            chatWidget = await widgetService.revealWidget();
        }
        if (!chatWidget) {
            return;
        }
        const switchToMode = (opts?.mode ? chatModeService.findModeByName(opts?.mode) : undefined) ?? this.mode;
        if (switchToMode) {
            await this.handleSwitchToMode(switchToMode, chatWidget, instaService, commandService);
        }
        if (opts?.modelSelector) {
            const ids = await languageModelService.selectLanguageModels(opts.modelSelector, false);
            const id = ids.sort().at(0);
            if (!id) {
                throw new Error(`No language models found matching selector: ${JSON.stringify(opts.modelSelector)}.`);
            }
            const model = languageModelService.lookupLanguageModel(id);
            if (!model) {
                throw new Error(`Language model not loaded: ${id}.`);
            }
            chatWidget.input.setCurrentLanguageModel({ metadata: model, identifier: id });
        }
        if (opts?.previousRequests?.length && chatWidget.viewModel) {
            for (const { request, response } of opts.previousRequests) {
                chatService.addCompleteRequest(chatWidget.viewModel.sessionResource, request, undefined, 0, { message: response });
            }
        }
        if (opts?.attachScreenshot) {
            const screenshot = await hostService.getScreenshot();
            if (screenshot) {
                chatWidget.attachmentModel.addContext(convertBufferToScreenshotVariable(screenshot));
            }
        }
        if (opts?.attachFiles) {
            for (const file of opts.attachFiles) {
                const uri = file instanceof URI ? file : file.uri;
                const range = file instanceof URI ? undefined : file.range;
                if (await fileService.exists(uri)) {
                    chatWidget.attachmentModel.addFile(uri, range);
                }
            }
        }
        if (opts?.attachHistoryItemChanges) {
            for (const historyItemChange of opts.attachHistoryItemChanges) {
                const repository = scmService.getRepository(URI.file(historyItemChange.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!historyProvider) {
                    continue;
                }
                const historyItem = await historyProvider.resolveHistoryItem(historyItemChange.historyItemId);
                if (!historyItem) {
                    continue;
                }
                chatWidget.attachmentModel.addContext({
                    id: historyItemChange.uri.toString(),
                    name: `${basename(historyItemChange.uri)}`,
                    value: historyItemChange.uri,
                    historyItem: historyItem,
                    kind: 'scmHistoryItemChange'
                });
            }
        }
        if (opts?.attachHistoryItemChangeRanges) {
            for (const historyItemChangeRange of opts.attachHistoryItemChangeRanges) {
                const repository = scmService.getRepository(URI.file(historyItemChangeRange.end.uri.path));
                const historyProvider = repository?.provider.historyProvider.get();
                if (!repository || !historyProvider) {
                    continue;
                }
                const [historyItemStart, historyItemEnd] = await Promise.all([
                    historyProvider.resolveHistoryItem(historyItemChangeRange.start.historyItemId),
                    historyProvider.resolveHistoryItem(historyItemChangeRange.end.historyItemId),
                ]);
                if (!historyItemStart || !historyItemEnd) {
                    continue;
                }
                const uri = historyItemChangeRange.end.uri.with({
                    scheme: SCMHistoryItemChangeRangeContentProvider.scheme,
                    query: JSON.stringify({
                        repositoryId: repository.id,
                        start: historyItemStart.id,
                        end: historyItemChangeRange.end.historyItemId
                    })
                });
                chatWidget.attachmentModel.addContext({
                    id: uri.toString(),
                    name: `${basename(uri)}`,
                    value: uri,
                    historyItemChangeStart: {
                        uri: historyItemChangeRange.start.uri,
                        historyItem: historyItemStart
                    },
                    historyItemChangeEnd: {
                        uri: historyItemChangeRange.end.uri,
                        historyItem: {
                            ...historyItemEnd,
                            displayId: historyItemChangeRange.end.historyItemId
                        }
                    },
                    kind: 'scmHistoryItemChangeRange'
                });
            }
        }
        let resp;
        if (opts?.query) {
            chatWidget.setInput(opts.query);
            if (!opts.isPartialQuery) {
                if (!chatWidget.viewModel) {
                    await Event.toPromise(chatWidget.onDidChangeViewModel);
                }
                await waitForDefaultAgent(chatAgentService, chatWidget.input.currentModeKind);
                resp = chatWidget.acceptInput();
            }
        }
        if (opts?.toolIds && opts.toolIds.length > 0) {
            for (const toolId of opts.toolIds) {
                const tool = toolsService.getTool(toolId);
                if (tool) {
                    chatWidget.attachmentModel.addContext({
                        id: tool.id,
                        name: tool.displayName,
                        fullName: tool.displayName,
                        value: undefined,
                        icon: ThemeIcon.isThemeIcon(tool.icon) ? tool.icon : undefined,
                        kind: 'tool'
                    });
                }
            }
        }
        chatWidget.focusInput();
        if (opts?.blockOnResponse) {
            const response = await resp;
            if (response) {
                await new Promise(resolve => {
                    const d = response.onDidChange(async () => {
                        if (response.isComplete || response.isPendingConfirmation.get()) {
                            d.dispose();
                            resolve();
                        }
                    });
                });
                return { ...response.result, type: response.isPendingConfirmation.get() ? 'confirmation' : undefined };
            }
        }
        return undefined;
    }
    async handleSwitchToMode(switchToMode, chatWidget, instaService, commandService) {
        const currentMode = chatWidget.input.currentModeKind;
        if (switchToMode) {
            const editingSession = chatWidget.viewModel?.model.editingSession;
            const requestCount = chatWidget.viewModel?.model.getRequests().length ?? 0;
            const chatModeCheck = await instaService.invokeFunction(handleModeSwitch, currentMode, switchToMode.kind, requestCount, editingSession);
            if (!chatModeCheck) {
                return;
            }
            chatWidget.input.setChatMode(switchToMode.id);
            if (chatModeCheck.needToClearSession) {
                await commandService.executeCommand(ACTION_ID_NEW_CHAT);
            }
        }
    }
}
async function waitForDefaultAgent(chatAgentService, mode) {
    const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
    if (defaultAgent) {
        return;
    }
    await Promise.race([
        Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode);
            return Boolean(defaultAgent);
        })),
        timeout(60_000).then(() => { throw new Error('Timed out waiting for default agent'); })
    ]);
}
class PrimaryOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor() {
        super({
            id: CHAT_OPEN_ACTION_ID,
            title: localize2('openChat', "Open Chat"),
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 39 /* KeyCode.KeyI */,
                mac: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 256 /* KeyMod.WinCtrl */ | 39 /* KeyCode.KeyI */
                }
            },
            menu: [{
                    id: MenuId.ChatTitleBarMenu,
                    group: 'a_open',
                    order: 1
                }]
        });
    }
}
export function getOpenChatActionIdForMode(mode) {
    return `workbench.action.chat.open${mode.name.get()}`;
}
class ModeOpenChatGlobalAction extends OpenChatGlobalAction {
    constructor(mode, keybinding) {
        super({
            id: getOpenChatActionIdForMode(mode),
            title: localize2('openChatMode', "Open Chat ({0})", mode.label.get()),
            keybinding
        }, mode);
    }
}
export function registerChatActions() {
    registerAction2(PrimaryOpenChatGlobalAction);
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Ask); }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() {
            super(ChatMode.Agent, {
                when: ContextKeyExpr.has(`config.${ChatConfiguration.AgentEnabled}`),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */,
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 1024 /* KeyMod.Shift */ | 39 /* KeyCode.KeyI */
                }
            });
        }
    });
    registerAction2(class extends ModeOpenChatGlobalAction {
        constructor() { super(ChatMode.Edit); }
    });
    registerAction2(class ToggleChatAction extends Action2 {
        constructor() {
            super({
                id: TOGGLE_CHAT_ACTION_ID,
                title: localize2('toggleChat', "Toggle Chat"),
                category: CHAT_CATEGORY
            });
        }
        async run(accessor) {
            const layoutService = accessor.get(IWorkbenchLayoutService);
            const viewsService = accessor.get(IViewsService);
            const viewDescriptorService = accessor.get(IViewDescriptorService);
            const widgetService = accessor.get(IChatWidgetService);
            const chatLocation = viewDescriptorService.getViewLocationById(ChatViewId);
            if (viewsService.isViewVisible(ChatViewId)) {
                this.updatePartVisibility(layoutService, chatLocation, false);
            }
            else {
                this.updatePartVisibility(layoutService, chatLocation, true);
                (await widgetService.revealWidget())?.focusInput();
            }
        }
        updatePartVisibility(layoutService, location, visible) {
            let part;
            switch (location) {
                case 1 /* ViewContainerLocation.Panel */:
                    part = "workbench.parts.panel" /* Parts.PANEL_PART */;
                    break;
                case 0 /* ViewContainerLocation.Sidebar */:
                    part = "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */;
                    break;
                case 2 /* ViewContainerLocation.AuxiliaryBar */:
                    part = "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */;
                    break;
            }
            if (part) {
                layoutService.setPartHidden(!visible, part);
            }
        }
    });
    registerAction2(class ChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.history`,
                title: localize2('chat.history.label', "Show Chats..."),
                menu: [
                    {
                        id: MenuId.ViewTitle,
                        when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.inEmptyStateWithHistoryEnabled.negate()),
                        group: 'navigation',
                        order: 2
                    },
                    {
                        id: MenuId.EditorTitle,
                        when: ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID),
                    },
                    {
                        id: MenuId.ChatHistory,
                        when: ChatContextKeys.inEmptyStateWithHistoryEnabled,
                        group: 'navigation',
                    }
                ],
                category: CHAT_CATEGORY,
                icon: Codicon.history,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
            this.showLegacyPicker = async (chatService, quickInputService, commandService, editorService, view) => {
                const clearChatHistoryButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.clearAll),
                    tooltip: localize('interactiveSession.history.clear', "Clear All Workspace Chats"),
                };
                const openInEditorButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.file),
                    tooltip: localize('interactiveSession.history.editor', "Open in Editor"),
                };
                const deleteButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.x),
                    tooltip: localize('interactiveSession.history.delete', "Delete"),
                };
                const renameButton = {
                    iconClass: ThemeIcon.asClassName(Codicon.pencil),
                    tooltip: localize('chat.history.rename', "Rename"),
                };
                const getPicks = async () => {
                    const items = await chatService.getLocalSessionHistory();
                    items.sort((a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0));
                    let lastDate = undefined;
                    const picks = items.flatMap((i) => {
                        const timeAgoStr = fromNowByDay(i.lastMessageDate, true, true);
                        const separator = timeAgoStr !== lastDate ? {
                            type: 'separator', label: timeAgoStr,
                        } : undefined;
                        lastDate = timeAgoStr;
                        return [
                            separator,
                            {
                                label: i.title,
                                description: i.isActive ? `(${localize('currentChatLabel', 'current')})` : '',
                                chat: i,
                                buttons: i.isActive ? [renameButton] : [
                                    renameButton,
                                    openInEditorButton,
                                    deleteButton,
                                ]
                            }
                        ];
                    });
                    return coalesce(picks);
                };
                const store = new DisposableStore();
                const picker = store.add(quickInputService.createQuickPick({ useSeparators: true }));
                picker.title = localize('interactiveSession.history.title', "Workspace Chat History");
                picker.placeholder = localize('interactiveSession.history.pick', "Switch to chat");
                picker.buttons = [clearChatHistoryButton];
                const picks = await getPicks();
                picker.items = picks;
                store.add(picker.onDidTriggerButton(async (button) => {
                    if (button === clearChatHistoryButton) {
                        await commandService.executeCommand(CHAT_CLEAR_HISTORY_ACTION_ID);
                    }
                }));
                store.add(picker.onDidTriggerItemButton(async (context) => {
                    if (context.button === openInEditorButton) {
                        editorService.openEditor({
                            resource: context.item.chat.sessionResource,
                            options: { pinned: true }
                        }, ACTIVE_GROUP);
                        picker.hide();
                    }
                    else if (context.button === deleteButton) {
                        chatService.removeHistoryEntry(context.item.chat.sessionResource);
                        picker.items = await getPicks();
                    }
                    else if (context.button === renameButton) {
                        const title = await quickInputService.input({ title: localize('newChatTitle', "New chat title"), value: context.item.chat.title });
                        if (title) {
                            chatService.setChatSessionTitle(context.item.chat.sessionResource, title);
                        }
                        // The quick input hides the picker, it gets disposed, so we kick it off from scratch
                        await this.showLegacyPicker(chatService, quickInputService, commandService, editorService, view);
                    }
                }));
                store.add(picker.onDidAccept(async () => {
                    try {
                        const item = picker.selectedItems[0];
                        await view.loadSession(item.chat.sessionResource);
                    }
                    finally {
                        picker.hide();
                    }
                }));
                store.add(picker.onDidHide(() => store.dispose()));
                picker.show();
            };
        }
        async showIntegratedPicker(chatService, quickInputService, commandService, editorService, chatWidgetService, view, chatSessionsService, contextKeyService, menuService, showAllChats = false, showAllAgents = false) {
            const clearChatHistoryButton = {
                iconClass: ThemeIcon.asClassName(Codicon.clearAll),
                tooltip: localize('interactiveSession.history.clear', "Clear All Workspace Chats"),
            };
            const openInEditorButton = {
                iconClass: ThemeIcon.asClassName(Codicon.file),
                tooltip: localize('interactiveSession.history.editor', "Open in Editor"),
            };
            const deleteButton = {
                iconClass: ThemeIcon.asClassName(Codicon.x),
                tooltip: localize('interactiveSession.history.delete', "Delete"),
            };
            const renameButton = {
                iconClass: ThemeIcon.asClassName(Codicon.pencil),
                tooltip: localize('chat.history.rename', "Rename"),
            };
            function isChatPickerItem(item) {
                return hasKey(item, { chat: true });
            }
            function isCodingAgentPickerItem(item) {
                return isChatPickerItem(item) && hasKey(item, { session: true });
            }
            const showMorePick = {
                label: localize('chat.history.showMore', 'Show more...'),
            };
            const showMoreAgentsPick = {
                label: localize('chat.history.showMoreAgents', 'Show more...'),
            };
            const getPicks = async (showAllChats = false, showAllAgents = false) => {
                // Fast picks: Get cached/immediate items first
                const cachedItems = await chatService.getLocalSessionHistory();
                cachedItems.sort((a, b) => (b.lastMessageDate ?? 0) - (a.lastMessageDate ?? 0));
                const allFastPickItems = cachedItems.map((i) => {
                    const timeAgoStr = fromNowByDay(i.lastMessageDate, true, true);
                    const currentLabel = i.isActive ? localize('currentChatLabel', 'current') : '';
                    const description = currentLabel ? `${timeAgoStr} • ${currentLabel}` : timeAgoStr;
                    return {
                        label: i.title,
                        description: description,
                        chat: i,
                        buttons: i.isActive ? [renameButton] : [
                            renameButton,
                            openInEditorButton,
                            deleteButton,
                        ]
                    };
                });
                const fastPickItems = showAllChats ? allFastPickItems : allFastPickItems.slice(0, 5);
                const fastPicks = [];
                if (fastPickItems.length > 0) {
                    fastPicks.push({
                        type: 'separator',
                        label: localize('chat.history.recent', 'Recent Chats'),
                    });
                    fastPicks.push(...fastPickItems);
                    // Add "Show more..." if there are more items and we're not showing all chats
                    if (!showAllChats && allFastPickItems.length > 5) {
                        fastPicks.push(showMorePick);
                    }
                }
                // Slow picks: Get coding agents asynchronously via AsyncIterable
                const slowPicks = (async function* () {
                    try {
                        const agentPicks = [];
                        // Use the new Promise-based API to get chat sessions
                        const cancellationToken = new CancellationTokenSource();
                        try {
                            const providerNSessions = await chatSessionsService.getAllChatSessionItems(cancellationToken.token);
                            for (const { chatSessionType, items } of providerNSessions) {
                                for (const session of items) {
                                    const ckey = contextKeyService.createKey('chatSessionType', chatSessionType);
                                    const actions = menuService.getMenuActions(MenuId.ChatSessionsMenu, contextKeyService);
                                    const { primary } = getContextMenuActions(actions, 'inline');
                                    ckey.reset();
                                    // Use primary actions if available, otherwise fall back to secondary actions
                                    const buttons = primary.map(action => ({
                                        id: action.id,
                                        tooltip: action.tooltip,
                                        iconClass: action.class || ThemeIcon.asClassName(Codicon.symbolClass),
                                    }));
                                    // Create agent pick from the session content
                                    const agentPick = {
                                        label: session.label,
                                        description: chatSessionType,
                                        session: session,
                                        chat: {
                                            sessionResource: session.resource,
                                            title: session.label,
                                            isActive: false,
                                            lastMessageDate: 0,
                                        },
                                        buttons,
                                    };
                                    // Check if this agent already exists (update existing or add new)
                                    const existingIndex = agentPicks.findIndex(pick => isEqual(pick.chat.sessionResource, session.resource));
                                    if (existingIndex >= 0) {
                                        agentPicks[existingIndex] = agentPick;
                                    }
                                    else {
                                        agentPicks.push(agentPick);
                                    }
                                }
                            }
                            // Create current picks with separator if we have agents
                            const currentPicks = [];
                            if (agentPicks.length > 0) {
                                // Always add separator for coding agents section
                                currentPicks.push({
                                    type: 'separator',
                                    label: 'Chat Sessions',
                                });
                                const defaultMaxToShow = 5;
                                const maxToShow = showAllAgents ? Number.MAX_SAFE_INTEGER : defaultMaxToShow;
                                currentPicks.push(...agentPicks
                                    .toSorted((a, b) => (b.session.timing.endTime ?? b.session.timing.startTime) - (a.session.timing.endTime ?? a.session.timing.startTime))
                                    .slice(0, maxToShow));
                                // Add "Show more..." if needed and not showing all agents
                                if (!showAllAgents && agentPicks.length > defaultMaxToShow) {
                                    currentPicks.push(showMoreAgentsPick);
                                }
                            }
                            // Yield the current state
                            yield currentPicks;
                        }
                        finally {
                            cancellationToken.dispose();
                        }
                    }
                    catch (error) {
                        // Gracefully handle errors in async contributions
                        return;
                    }
                })();
                // Return fast picks immediately, add slow picks as async generator
                return {
                    fast: coalesce(fastPicks),
                    slow: slowPicks
                };
            };
            const store = new DisposableStore();
            const picker = store.add(quickInputService.createQuickPick({ useSeparators: true }));
            picker.title = (showAllChats || showAllAgents) ?
                localize('interactiveSession.history.titleAll', "All Workspace Chat History") :
                localize('interactiveSession.history.title', "Workspace Chat History");
            picker.placeholder = localize('interactiveSession.history.pick', "Switch to chat");
            picker.buttons = [clearChatHistoryButton];
            // Get fast and slow picks
            const { fast, slow } = await getPicks(showAllChats, showAllAgents);
            // Set fast picks immediately
            picker.items = fast;
            picker.busy = true;
            // Consume slow picks progressively
            (async () => {
                try {
                    for await (const slowPicks of slow) {
                        if (!store.isDisposed) {
                            picker.items = coalesce([...fast, ...slowPicks]);
                        }
                    }
                }
                catch (error) {
                    // Handle errors gracefully
                }
                finally {
                    if (!store.isDisposed) {
                        picker.busy = false;
                    }
                }
            })();
            store.add(picker.onDidTriggerButton(async (button) => {
                if (button === clearChatHistoryButton) {
                    await commandService.executeCommand(CHAT_CLEAR_HISTORY_ACTION_ID);
                }
            }));
            store.add(picker.onDidTriggerItemButton(async (context) => {
                if (!isChatPickerItem(context.item)) {
                    return;
                }
                if (context.button === openInEditorButton) {
                    const options = { pinned: true };
                    editorService.openEditor({
                        resource: context.item.chat.sessionResource,
                        options,
                    }, ACTIVE_GROUP);
                    picker.hide();
                }
                else if (context.button === deleteButton) {
                    chatService.removeHistoryEntry(context.item.chat.sessionResource);
                    // Refresh picker items after deletion
                    const { fast, slow } = await getPicks(showAllChats, showAllAgents);
                    picker.items = fast;
                    picker.busy = true;
                    // Consume slow picks progressively after deletion
                    (async () => {
                        try {
                            for await (const slowPicks of slow) {
                                if (!store.isDisposed) {
                                    picker.items = coalesce([...fast, ...slowPicks]);
                                }
                            }
                        }
                        catch (error) {
                            // Handle errors gracefully
                        }
                        finally {
                            if (!store.isDisposed) {
                                picker.busy = false;
                            }
                        }
                    })();
                }
                else if (context.button === renameButton) {
                    const title = await quickInputService.input({ title: localize('newChatTitle', "New chat title"), value: context.item.chat.title });
                    if (title) {
                        chatService.setChatSessionTitle(context.item.chat.sessionResource, title);
                    }
                    // The quick input hides the picker, it gets disposed, so we kick it off from scratch
                    await this.showIntegratedPicker(chatService, quickInputService, commandService, editorService, chatWidgetService, view, chatSessionsService, contextKeyService, menuService, showAllChats, showAllAgents);
                }
                else {
                    const buttonItem = context.button;
                    if (buttonItem.id) {
                        const contextItem = context.item;
                        if (contextItem.session) {
                            commandService.executeCommand(buttonItem.id, {
                                session: contextItem.session,
                                $mid: 25 /* MarshalledId.ChatSessionContext */
                            });
                        }
                        // dismiss quick picker
                        picker.hide();
                    }
                }
            }));
            store.add(picker.onDidAccept(async () => {
                try {
                    const item = picker.selectedItems[0];
                    // Handle "Show more..." options
                    if (item === showMorePick) {
                        picker.hide();
                        // Create a new picker with all chat items expanded
                        await this.showIntegratedPicker(chatService, quickInputService, commandService, editorService, chatWidgetService, view, chatSessionsService, contextKeyService, menuService, true, showAllAgents);
                        return;
                    }
                    else if (item === showMoreAgentsPick) {
                        picker.hide();
                        // Create a new picker with all agent items expanded
                        await this.showIntegratedPicker(chatService, quickInputService, commandService, editorService, chatWidgetService, view, chatSessionsService, contextKeyService, menuService, showAllChats, true);
                        return;
                    }
                    else if (isCodingAgentPickerItem(item)) {
                        // TODO: This is a temporary change that will be replaced by opening a new chat instance
                        if (item.session) {
                            await this.showChatSessionInEditor(item.session, editorService);
                        }
                    }
                    else if (isChatPickerItem(item)) {
                        await view.loadSession(item.chat.sessionResource);
                    }
                }
                finally {
                    picker.hide();
                }
            }));
            store.add(picker.onDidHide(() => store.dispose()));
            picker.show();
        }
        async run(accessor) {
            const chatService = accessor.get(IChatService);
            const quickInputService = accessor.get(IQuickInputService);
            const viewsService = accessor.get(IViewsService);
            const editorService = accessor.get(IEditorService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const dialogService = accessor.get(IDialogService);
            const commandService = accessor.get(ICommandService);
            const chatSessionsService = accessor.get(IChatSessionsService);
            const contextKeyService = accessor.get(IContextKeyService);
            const menuService = accessor.get(IMenuService);
            const view = await viewsService.openView(ChatViewId);
            if (!view?.widget.viewModel) {
                return;
            }
            const editingSession = view.widget.viewModel.model.editingSession;
            if (editingSession) {
                const phrase = localize('switchChat.confirmPhrase', "Switching chats will end your current edit session.");
                if (!await handleCurrentEditingSession(editingSession, phrase, dialogService)) {
                    return;
                }
            }
            // Check if there are any non-local chat session item providers registered
            const allProviders = chatSessionsService.getAllChatSessionItemProviders();
            const hasNonLocalProviders = allProviders.some(provider => provider.chatSessionType !== localChatSessionType);
            if (hasNonLocalProviders) {
                await this.showIntegratedPicker(chatService, quickInputService, commandService, editorService, chatWidgetService, view, chatSessionsService, contextKeyService, menuService);
            }
            else {
                await this.showLegacyPicker(chatService, quickInputService, commandService, editorService, view);
            }
        }
        async showChatSessionInEditor(session, editorService) {
            // Open the chat editor
            await editorService.openEditor({
                resource: session.resource,
                options: {}
            });
        }
    });
    registerAction2(class NewChatEditorAction extends Action2 {
        constructor() {
            super({
                id: ACTION_ID_OPEN_CHAT,
                title: localize2('interactiveSession.open', "New Chat Editor"),
                icon: Codicon.plus,
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                keybinding: {
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    primary: 2048 /* KeyMod.CtrlCmd */ | 44 /* KeyCode.KeyN */,
                    when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatEditor)
                },
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 0
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 2
                    }, {
                        id: MenuId.EditorTitle,
                        group: 'navigation',
                        when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(ChatEditorInput.EditorID), ChatContextKeys.lockedToCodingAgent.negate()),
                        order: 1
                    }],
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true } });
        }
    });
    registerAction2(class NewChatWindowAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.newChatWindow`,
                title: localize2('interactiveSession.newChatWindow', "New Chat Window"),
                f1: true,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: MenuId.ChatTitleBarMenu,
                        group: 'b_new',
                        order: 1
                    }, {
                        id: MenuId.ChatNewMenu,
                        group: '2_new',
                        order: 3
                    }]
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true, auxiliary: { compact: true, bounds: { width: 640, height: 640 } } } }, AUX_WINDOW_GROUP);
        }
    });
    registerAction2(class OpenChatEditorInNewWindowAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.newChatInNewWindow`,
                title: localize2('chatSessions.openNewChatInNewWindow', 'Open New Chat in New Window'),
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: {
                    id: MenuId.ViewTitle,
                    group: 'submenu',
                    order: 1,
                    when: ContextKeyExpr.equals('view', `${LEGACY_AGENT_SESSIONS_VIEW_ID}.local`),
                }
            });
        }
        async run(accessor) {
            const editorService = accessor.get(IEditorService);
            await editorService.openEditor({
                resource: ChatEditorInput.getNewEditorUri(),
                options: {
                    pinned: true,
                    auxiliary: { compact: true, bounds: { width: 800, height: 640 } }
                }
            }, AUX_WINDOW_GROUP);
        }
    });
    registerAction2(class NewChatInSideBarAction extends Action2 {
        constructor() {
            super({
                id: `workbench.action.chat.newChatInSideBar`,
                title: localize2('chatSessions.newChatInSideBar', 'Open New Chat in Side Bar'),
                f1: false,
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                menu: {
                    id: MenuId.ViewTitle,
                    group: 'submenu',
                    order: 1,
                    when: ContextKeyExpr.equals('view', `${LEGACY_AGENT_SESSIONS_VIEW_ID}.local`),
                }
            });
        }
        async run(accessor) {
            const widgetService = accessor.get(IChatWidgetService);
            // Open the chat view in the sidebar and get the widget
            const chatWidget = await widgetService.revealWidget();
            if (chatWidget) {
                // Clear the current chat to start a new one
                await chatWidget.clear();
                chatWidget.attachmentModel.clear(true);
                chatWidget.input.relatedFiles?.clear();
                // Focus the input area
                chatWidget.focusInput();
            }
        }
    });
    registerAction2(class OpenChatInNewEditorGroupAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openNewChatToTheSide',
                title: localize2('chat.openNewChatToTheSide.label', "Open New Chat Editor to the Side"),
                category: CHAT_CATEGORY,
                precondition: ChatContextKeys.enabled,
                f1: false,
                menu: {
                    id: MenuId.ViewTitle,
                    group: 'submenu',
                    order: 1,
                    when: ContextKeyExpr.equals('view', `${LEGACY_AGENT_SESSIONS_VIEW_ID}.local`),
                }
            });
        }
        async run(accessor, ...args) {
            const editorService = accessor.get(IEditorService);
            const editorGroupService = accessor.get(IEditorGroupsService);
            // Create a new editor group to the right
            const newGroup = editorGroupService.addGroup(editorGroupService.activeGroup, 3 /* GroupDirection.RIGHT */);
            editorGroupService.activateGroup(newGroup);
            // Open a new chat editor in the new group
            await editorService.openEditor({ resource: ChatEditorInput.getNewEditorUri(), options: { pinned: true } }, newGroup.id);
        }
    });
    registerAction2(class ClearChatInputHistoryAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.clearInputHistory',
                title: localize2('interactiveSession.clearHistory.label', "Clear Input History"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const historyService = accessor.get(IChatWidgetHistoryService);
            historyService.clearHistory();
        }
    });
    registerAction2(class ClearChatHistoryAction extends Action2 {
        constructor() {
            super({
                id: CHAT_CLEAR_HISTORY_ACTION_ID,
                title: localize2('chat.clear.label', "Clear All Workspace Chats"),
                precondition: ChatContextKeys.enabled,
                category: CHAT_CATEGORY,
                f1: true,
            });
        }
        async run(accessor, ...args) {
            const editorGroupsService = accessor.get(IEditorGroupsService);
            const chatService = accessor.get(IChatService);
            const instantiationService = accessor.get(IInstantiationService);
            const widgetService = accessor.get(IChatWidgetService);
            await chatService.clearAllHistoryEntries();
            await Promise.all(widgetService.getAllWidgets().map(widget => widget.clear()));
            // Clear all chat editors. Have to go this route because the chat editor may be in the background and
            // not have a ChatEditorInput.
            editorGroupsService.groups.forEach(group => {
                group.editors.forEach(editor => {
                    if (editor instanceof ChatEditorInput) {
                        instantiationService.invokeFunction(clearChatEditor, editor);
                    }
                });
            });
        }
    });
    registerAction2(class FocusChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'chat.action.focus',
                title: localize2('actions.interactiveSession.focus', 'Focus Chat List'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 100 /* KeybindingWeight.EditorContrib */,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem();
            }
        }
    });
    registerAction2(class FocusMostRecentlyFocusedChatAction extends EditorAction2 {
        constructor() {
            super({
                id: 'workbench.chat.action.focusLastFocused',
                title: localize2('actions.interactiveSession.focusLastFocused', 'Focus Last Focused Chat List Item'),
                precondition: ContextKeyExpr.and(ChatContextKeys.inChatInput),
                category: CHAT_CATEGORY,
                keybinding: [
                    // On mac, require that the cursor is at the top of the input, to avoid stealing cmd+up to move the cursor to the top
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inputCursorAtTop, ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    // On win/linux, ctrl+up can always focus the chat list
                    {
                        when: ContextKeyExpr.and(ContextKeyExpr.or(IsWindowsContext, IsLinuxContext), ChatContextKeys.inQuickChat.negate()),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 100 /* KeybindingWeight.EditorContrib */ + 1,
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */ | 1024 /* KeyMod.Shift */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 1,
                    }
                ]
            });
        }
        runEditorCommand(accessor, editor) {
            const editorUri = editor.getModel()?.uri;
            if (editorUri) {
                const widgetService = accessor.get(IChatWidgetService);
                widgetService.getWidgetByInputUri(editorUri)?.focusResponseItem(true);
            }
        }
    });
    registerAction2(class FocusChatInputAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.focusInput',
                title: localize2('interactiveSession.focusInput.label', "Focus Chat Input"),
                f1: false,
                keybinding: [
                    {
                        primary: 2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat.negate()),
                    },
                    {
                        when: ContextKeyExpr.and(ChatContextKeys.inChatSession, ChatContextKeys.inChatInput.negate(), ChatContextKeys.inQuickChat),
                        primary: 2048 /* KeyMod.CtrlCmd */ | 16 /* KeyCode.UpArrow */,
                        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                    }
                ]
            });
        }
        run(accessor, ...args) {
            const widgetService = accessor.get(IChatWidgetService);
            widgetService.lastFocusedWidget?.focusInput();
        }
    });
    const nonEnterpriseCopilotUsers = ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.notEquals(`config.${defaultChat.completionsAdvancedSetting}.authProvider`, defaultChat.provider.enterprise.id));
    registerAction2(class extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.manageSettings',
                title: localize2('manageChat', "Manage Chat"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus), nonEnterpriseCopilotUsers),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'y_manage',
                    order: 1,
                    when: nonEnterpriseCopilotUsers
                }
            });
        }
        async run(accessor) {
            const openerService = accessor.get(IOpenerService);
            openerService.open(URI.parse(defaultChat.manageSettingsUrl));
        }
    });
    registerAction2(class ShowExtensionsUsingCopilot extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.showExtensionsUsingCopilot',
                title: localize2('showCopilotUsageExtensions', "Show Extensions using Copilot"),
                f1: true,
                category: EXTENSIONS_CATEGORY,
                precondition: ChatContextKeys.enabled
            });
        }
        async run(accessor) {
            const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
            extensionsWorkbenchService.openSearch(`@feature:${CopilotUsageExtensionFeatureId}`);
        }
    });
    registerAction2(class ConfigureCopilotCompletions extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.configureCodeCompletions',
                title: localize2('configureCompletions', "Configure Inline Suggestions..."),
                precondition: ContextKeyExpr.and(ChatContextKeys.Setup.installed, ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.untrusted.negate()),
                menu: {
                    id: MenuId.ChatTitleBarMenu,
                    group: 'f_completions',
                    order: 10,
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            commandService.executeCommand(defaultChat.completionsMenuCommand);
        }
    });
    registerAction2(class ShowQuotaExceededDialogAction extends Action2 {
        constructor() {
            super({
                id: OPEN_CHAT_QUOTA_EXCEEDED_DIALOG,
                title: localize('upgradeChat', "Upgrade Puku AI Plan")
            });
        }
        async run(accessor) {
            const chatEntitlementService = accessor.get(IChatEntitlementService);
            const commandService = accessor.get(ICommandService);
            const dialogService = accessor.get(IDialogService);
            const telemetryService = accessor.get(ITelemetryService);
            let message;
            const chatQuotaExceeded = chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const completionsQuotaExceeded = chatEntitlementService.quotas.completions?.percentRemaining === 0;
            if (chatQuotaExceeded && !completionsQuotaExceeded) {
                message = localize('chatQuotaExceeded', "You've reached your monthly chat messages quota. You still have free inline suggestions available.");
            }
            else if (completionsQuotaExceeded && !chatQuotaExceeded) {
                message = localize('completionsQuotaExceeded', "You've reached your monthly inline suggestions quota. You still have free chat messages available.");
            }
            else {
                message = localize('chatAndCompletionsQuotaExceeded', "You've reached your monthly chat messages and inline suggestions quota.");
            }
            if (chatEntitlementService.quotas.resetDate) {
                const dateFormatter = chatEntitlementService.quotas.resetDateHasTime ? safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }) : safeIntl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric' });
                const quotaResetDate = new Date(chatEntitlementService.quotas.resetDate);
                message = [message, localize('quotaResetDate', "The allowance will reset on {0}.", dateFormatter.value.format(quotaResetDate))].join(' ');
            }
            const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
            const upgradeToPro = free ? localize('upgradeToPro', "Upgrade to Puku AI Pro (your first 30 days are free) for:\n- Unlimited inline suggestions\n- Unlimited chat messages\n- Access to premium models") : undefined;
            await dialogService.prompt({
                type: 'none',
                message: localize('copilotQuotaReached', "Puku AI Quota Reached"),
                cancelButton: {
                    label: localize('dismiss', "Dismiss"),
                    run: () => { }
                },
                buttons: [
                    {
                        label: free ? localize('upgradePro', "Upgrade to Puku AI Pro") : localize('upgradePlan', "Upgrade Puku AI Plan"),
                        run: () => {
                            const commandId = 'workbench.action.chat.upgradePlan';
                            telemetryService.publicLog2('workbenchActionExecuted', { id: commandId, from: 'chat-dialog' });
                            commandService.executeCommand(commandId);
                        }
                    },
                ],
                custom: {
                    icon: Codicon.copilotWarningLarge,
                    markdownDetails: coalesce([
                        { markdown: new MarkdownString(message, true) },
                        upgradeToPro ? { markdown: new MarkdownString(upgradeToPro, true) } : undefined
                    ])
                }
            });
        }
    });
    registerAction2(class ResetTrustedToolsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.resetTrustedTools',
                title: localize2('resetTrustedTools', "Reset Tool Confirmations"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled
            });
        }
        run(accessor) {
            accessor.get(ILanguageModelToolsConfirmationService).resetToolAutoConfirmation();
            accessor.get(INotificationService).info(localize('resetTrustedToolsSuccess', "Tool confirmation preferences have been reset."));
        }
    });
    registerAction2(class UpdateInstructionsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.generateInstructions',
                title: localize2('generateInstructions', "Generate Workspace Instructions File"),
                shortTitle: localize2('generateInstructions.short', "Generate Chat Instructions"),
                category: CHAT_CATEGORY,
                icon: Codicon.sparkle,
                f1: true,
                precondition: ChatContextKeys.enabled,
                menu: {
                    id: CHAT_CONFIG_MENU_ID,
                    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                    order: 11,
                    group: '1_level'
                }
            });
        }
        async run(accessor) {
            const commandService = accessor.get(ICommandService);
            // Use chat command to open and send the query
            const query = `Analyze this codebase to generate or update \`.github/copilot-instructions.md\` for guiding AI coding agents.

Focus on discovering the essential knowledge that would help an AI agents be immediately productive in this codebase. Consider aspects like:
- The "big picture" architecture that requires reading multiple files to understand - major components, service boundaries, data flows, and the "why" behind structural decisions
- Critical developer workflows (builds, tests, debugging) especially commands that aren't obvious from file inspection alone
- Project-specific conventions and patterns that differ from common practices
- Integration points, external dependencies, and cross-component communication patterns

Source existing AI conventions from \`**/{.github/copilot-instructions.md,AGENT.md,AGENTS.md,CLAUDE.md,.cursorrules,.windsurfrules,.clinerules,.cursor/rules/**,.windsurf/rules/**,.clinerules/**,README.md}\` (do one glob search).

Guidelines (read more at https://aka.ms/vscode-instructions-docs):
- If \`.github/copilot-instructions.md\` exists, merge intelligently - preserve valuable content while updating outdated sections
- Write concise, actionable instructions (~20-50 lines) using markdown structure
- Include specific examples from the codebase when describing patterns
- Avoid generic advice ("write tests", "handle errors") - focus on THIS project's specific approaches
- Document only discoverable patterns, not aspirational practices
- Reference key files/directories that exemplify important patterns

Update \`.github/copilot-instructions.md\` for the user, then ask for feedback on any unclear or incomplete sections to iterate.`;
            await commandService.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                query: query,
            });
        }
    });
    registerAction2(class OpenChatFeatureSettingsAction extends Action2 {
        constructor() {
            super({
                id: 'workbench.action.chat.openFeatureSettings',
                title: localize2('openChatFeatureSettings', "Chat Settings"),
                shortTitle: localize('openChatFeatureSettings.short', "Chat Settings"),
                category: CHAT_CATEGORY,
                f1: true,
                precondition: ChatContextKeys.enabled,
                menu: [{
                        id: CHAT_CONFIG_MENU_ID,
                        when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                        order: 15,
                        group: '3_configure'
                    },
                    {
                        id: MenuId.ChatWelcomeContext,
                        group: '2_settings',
                        order: 1
                    }]
            });
        }
        async run(accessor) {
            const preferencesService = accessor.get(IPreferencesService);
            preferencesService.openSettings({ query: '@feature:chat ' });
        }
    });
    MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
        submenu: CHAT_CONFIG_MENU_ID,
        title: localize2('config.label', "Configure Chat"),
        group: 'navigation',
        when: ContextKeyExpr.equals('view', ChatViewId),
        icon: Codicon.gear,
        order: 6
    });
}
export function stringifyItem(item, includeName = true) {
    if (isRequestVM(item)) {
        return (includeName ? `${item.username}: ` : '') + item.messageText;
    }
    else {
        return (includeName ? `${item.username}: ` : '') + item.response.toString();
    }
}
// --- Title Bar Chat Controls
const defaultChat = {
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { enterprise: { id: '' } },
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsMenuCommand: product.defaultChatAgent?.completionsMenuCommand ?? '',
};
// Add next to the command center if command center is disabled
MenuRegistry.appendMenuItem(MenuId.CommandCenter, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Chat"),
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.supported, ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), ContextKeyExpr.has('config.chat.commandCenter.enabled')),
    order: 10001 // to the right of command center
});
// Add to the global title bar if command center is disabled
MenuRegistry.appendMenuItem(MenuId.TitleBar, {
    submenu: MenuId.ChatTitleBarMenu,
    title: localize('title4', "Chat"),
    group: 'navigation',
    icon: Codicon.chatSparkle,
    when: ContextKeyExpr.and(ChatContextKeys.supported, ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), ContextKeyExpr.has('config.chat.commandCenter.enabled'), ContextKeyExpr.has('config.window.commandCenter').negate()),
    order: 1
});
registerAction2(class ToggleCopilotControl extends ToggleTitleBarConfigAction {
    constructor() {
        super('chat.commandCenter.enabled', localize('toggle.chatControl', 'Chat Controls'), localize('toggle.chatControlsDescription', "Toggle visibility of the Chat Controls in title bar"), 5, ContextKeyExpr.and(ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate()), IsCompactTitleBarContext.negate(), ChatContextKeys.supported));
    }
});
let CopilotTitleBarMenuRendering = class CopilotTitleBarMenuRendering extends Disposable {
    static { this.ID = 'workbench.contrib.copilotTitleBarMenuRendering'; }
    constructor(actionViewItemService, chatEntitlementService) {
        super();
        const disposable = actionViewItemService.register(MenuId.CommandCenter, MenuId.ChatTitleBarMenu, (action, options, instantiationService, windowId) => {
            if (!(action instanceof SubmenuItemAction)) {
                return undefined;
            }
            const dropdownAction = toAction({
                id: 'copilot.titleBarMenuRendering.more',
                label: localize('more', "More..."),
                run() { }
            });
            const chatSentiment = chatEntitlementService.sentiment;
            const chatQuotaExceeded = chatEntitlementService.quotas.chat?.percentRemaining === 0;
            const signedOut = chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            const anonymous = chatEntitlementService.anonymous;
            const free = chatEntitlementService.entitlement === ChatEntitlement.Free;
            const isAuxiliaryWindow = windowId !== mainWindow.vscodeWindowId;
            let primaryActionId = isAuxiliaryWindow ? CHAT_OPEN_ACTION_ID : TOGGLE_CHAT_ACTION_ID;
            let primaryActionTitle = isAuxiliaryWindow ? localize('openChat', "Open Chat") : localize('toggleChat', "Toggle Chat");
            let primaryActionIcon = Codicon.chatSparkle;
            if (chatSentiment.installed && !chatSentiment.disabled) {
                if (signedOut && !anonymous) {
                    primaryActionId = CHAT_SETUP_ACTION_ID;
                    primaryActionTitle = localize('signInToChatSetup', "Sign in to use AI features...");
                    primaryActionIcon = Codicon.chatSparkleError;
                }
                else if (chatQuotaExceeded && free) {
                    primaryActionId = OPEN_CHAT_QUOTA_EXCEEDED_DIALOG;
                    primaryActionTitle = localize('chatQuotaExceededButton', "Puku AI Free plan chat messages quota reached. Click for details.");
                    primaryActionIcon = Codicon.chatSparkleWarning;
                }
            }
            return instantiationService.createInstance(DropdownWithPrimaryActionViewItem, instantiationService.createInstance(MenuItemAction, {
                id: primaryActionId,
                title: primaryActionTitle,
                icon: primaryActionIcon,
            }, undefined, undefined, undefined, undefined), dropdownAction, action.actions, '', { ...options, skipTelemetry: true });
        }, Event.any(chatEntitlementService.onDidChangeSentiment, chatEntitlementService.onDidChangeQuotaExceeded, chatEntitlementService.onDidChangeEntitlement, chatEntitlementService.onDidChangeAnonymous));
        // Reduces flicker a bit on reload/restart
        markAsSingleton(disposable);
    }
};
CopilotTitleBarMenuRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IChatEntitlementService)
], CopilotTitleBarMenuRendering);
export { CopilotTitleBarMenuRendering };
/**
 * Returns whether we can continue clearing/switching chat sessions, false to cancel.
 */
export async function handleCurrentEditingSession(currentEditingSession, phrase, dialogService) {
    if (shouldShowClearEditingSessionConfirmation(currentEditingSession)) {
        return showClearEditingSessionConfirmation(currentEditingSession, dialogService, { messageOverride: phrase });
    }
    return true;
}
/**
 * Returns whether we can switch the agent, based on whether the user had to agree to clear the session, false to cancel.
 */
export async function handleModeSwitch(accessor, fromMode, toMode, requestCount, editingSession) {
    if (!editingSession || fromMode === toMode) {
        return { needToClearSession: false };
    }
    const configurationService = accessor.get(IConfigurationService);
    const dialogService = accessor.get(IDialogService);
    const needToClearEdits = (!configurationService.getValue(ChatConfiguration.Edits2Enabled) && (fromMode === ChatModeKind.Edit || toMode === ChatModeKind.Edit)) && requestCount > 0;
    if (needToClearEdits) {
        // If not using edits2 and switching into or out of edit mode, ask to discard the session
        const phrase = localize('switchMode.confirmPhrase', "Switching agents will end your current edit session.");
        const currentEdits = editingSession.entries.get();
        const undecidedEdits = currentEdits.filter((edit) => edit.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (undecidedEdits.length > 0) {
            if (!await handleCurrentEditingSession(editingSession, phrase, dialogService)) {
                return false;
            }
            return { needToClearSession: true };
        }
        else {
            const confirmation = await dialogService.confirm({
                title: localize('agent.newSession', "Start new session?"),
                message: localize('agent.newSessionMessage', "Changing the agent will end your current edit session. Would you like to change the agent?"),
                primaryButton: localize('agent.newSession.confirm', "Yes"),
                type: 'info'
            });
            if (!confirmation.confirmed) {
                return false;
            }
            return { needToClearSession: true };
        }
    }
    return { needToClearSession: false };
}
// --- Chat Submenus in various Components
MenuRegistry.appendMenuItem(MenuId.EditorContext, {
    submenu: MenuId.ChatTextEditorMenu,
    group: '1_chat',
    order: 5,
    title: localize('generateCode', "Generate Code"),
    when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate())
});
// --- Chat Default Visibility
registerAction2(class ToggleDefaultVisibilityAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleDefaultVisibility',
            title: localize2('chat.toggleDefaultVisibility.label', "Show View by Default"),
            toggled: ContextKeyExpr.equals('config.workbench.secondarySideBar.defaultVisibility', 'hidden').negate(),
            f1: false,
            menu: {
                id: MenuId.ViewTitle,
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', ChatViewId), ChatContextKeys.panelLocation.isEqualTo(2 /* ViewContainerLocation.AuxiliaryBar */)),
                order: 0,
                group: '5_configure'
            },
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const currentValue = configurationService.getValue('workbench.secondarySideBar.defaultVisibility');
        configurationService.updateValue('workbench.secondarySideBar.defaultVisibility', currentValue !== 'hidden' ? 'hidden' : 'visible');
    }
});
registerAction2(class EditToolApproval extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.editToolApproval',
            title: localize2('chat.editToolApproval.label', "Manage Tool Approval"),
            metadata: {
                description: localize2('chat.editToolApproval.description', "Edit/manage the tool approval and confirmation preferences for AI chat agents."),
            },
            precondition: ChatContextKeys.enabled,
            f1: true,
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, scope) {
        const confirmationService = accessor.get(ILanguageModelToolsConfirmationService);
        const toolsService = accessor.get(ILanguageModelToolsService);
        confirmationService.manageConfirmationPreferences([...toolsService.getTools()], scope ? { defaultScope: scope } : undefined);
    }
});
// Register actions for chat welcome history context menu
registerAction2(class ToggleChatHistoryVisibilityAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.chat.toggleChatHistoryVisibility',
            title: localize2('chat.toggleChatHistoryVisibility.label', "Chat History"),
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.enabled,
            toggled: ContextKeyExpr.equals('config.chat.emptyState.history.enabled', true),
            menu: {
                id: MenuId.ChatWelcomeContext,
                group: '1_modify',
                order: 1
            }
        });
    }
    async run(accessor) {
        const configurationService = accessor.get(IConfigurationService);
        const current = configurationService.getValue('chat.emptyState.history.enabled');
        await configurationService.updateValue('chat.emptyState.history.enabled', !current);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBdUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0SSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFM0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8s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