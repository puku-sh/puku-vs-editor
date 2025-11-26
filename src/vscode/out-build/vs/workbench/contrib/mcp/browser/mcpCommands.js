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
import { $, addDisposableListener, disposableWindowInterval, EventType } from '../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Event } from '../../../../base/common/event.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, derivedObservableWithCache, observableValue } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { mcpAutoStartConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { ActiveEditorContext, RemoteNameContext, ResourceContextKey, WorkbenchStateContext, WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { MCP_CONFIGURATION_KEY, WORKSPACE_STANDALONE_CONFIGURATIONS } from '../../../services/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IRemoteUserDataProfilesService } from '../../../services/userDataProfile/common/remoteUserDataProfiles.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { CHAT_CONFIG_MENU_ID } from '../../chat/browser/actions/chatActions.js';
import { ChatViewId, IChatWidgetService } from '../../chat/browser/chat.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatModeKind } from '../../chat/common/constants.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { ILanguageModelToolsService } from '../../chat/common/languageModelToolsService.js';
import { VIEW_CONTAINER } from '../../extensions/browser/extensions.contribution.js';
import { extensionsFilterSubMenu, IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { McpContextKeys } from '../common/mcpContextKeys.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { HasInstalledMcpServersContext, IMcpSamplingService, IMcpService, InstalledMcpServersViewId, McpConnectionState, mcpPromptPrefix, McpStartServerInteraction } from '../common/mcpTypes.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
import { McpResourceQuickAccess, McpResourceQuickPick } from './mcpResourceQuickAccess.js';
import './media/mcpServerAction.css';
import { openPanelChatAndGetWidget } from './openPanelChatAndGetWidget.js';
// acroynms do not get localized
const category = {
    original: 'MCP',
    value: 'MCP',
};
export class ListMcpServerCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.listServer" /* McpCommandIds.ListServer */,
            title: localize2(9552, 'List Servers'),
            icon: Codicon.server,
            category,
            f1: true,
            precondition: ChatContextKeys.Setup.hidden.negate(),
            menu: [{
                    when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals(`config.${mcpAutoStartConfig}`, "never" /* McpAutoStartValue.Never */), McpContextKeys.hasUnknownTools), McpContextKeys.hasServersWithErrors), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent), ChatContextKeys.lockedToCodingAgent.negate(), ChatContextKeys.Setup.hidden.negate()),
                    id: MenuId.ChatInput,
                    group: 'navigation',
                    order: 101,
                }],
        });
    }
    async run(accessor) {
        const mcpService = accessor.get(IMcpService);
        const commandService = accessor.get(ICommandService);
        const quickInput = accessor.get(IQuickInputService);
        const store = new DisposableStore();
        const pick = quickInput.createQuickPick({ useSeparators: true });
        pick.placeholder = localize(9523, null);
        mcpService.activateCollections();
        store.add(pick);
        store.add(autorun(reader => {
            const servers = groupBy(mcpService.servers.read(reader).slice().sort((a, b) => (a.collection.presentation?.order || 0) - (b.collection.presentation?.order || 0)), s => s.collection.id);
            const firstRun = pick.items.length === 0;
            pick.items = [
                { id: '$add', label: localize(9524, null), description: localize(9525, null), alwaysShow: true, iconClass: ThemeIcon.asClassName(Codicon.add) },
                ...Object.values(servers).filter(s => s.length).flatMap((servers) => [
                    { type: 'separator', label: servers[0].collection.label, id: servers[0].collection.id },
                    ...servers.map(server => ({
                        id: server.definition.id,
                        label: server.definition.label,
                        description: McpConnectionState.toString(server.connectionState.read(reader)),
                    })),
                ]),
            ];
            if (firstRun && pick.items.length > 3) {
                pick.activeItems = pick.items.slice(2, 3); // select the first server by default
            }
        }));
        const picked = await new Promise(resolve => {
            store.add(pick.onDidAccept(() => {
                resolve(pick.activeItems[0]);
            }));
            store.add(pick.onDidHide(() => {
                resolve(undefined);
            }));
            pick.show();
        });
        store.dispose();
        if (!picked) {
            // no-op
        }
        else if (picked.id === '$add') {
            commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }
        else {
            commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, picked.id);
        }
    }
}
export class McpConfirmationServerOptionsCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.serverOptionsInConfirmation" /* McpCommandIds.ServerOptionsInConfirmation */,
            title: localize2(9553, 'Server Options'),
            category,
            icon: Codicon.settingsGear,
            f1: false,
            menu: [{
                    id: MenuId.ChatConfirmationMenu,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('chatConfirmationPartSource', 'mcp'), ContextKeyExpr.or(ContextKeyExpr.equals('chatConfirmationPartType', 'chatToolConfirmation'), ContextKeyExpr.equals('chatConfirmationPartType', 'elicitation'))),
                    group: 'navigation'
                }],
        });
    }
    async run(accessor, arg) {
        const toolsService = accessor.get(ILanguageModelToolsService);
        if (arg.kind === 'toolInvocation') {
            const tool = toolsService.getTool(arg.toolId);
            if (tool?.source.type === 'mcp') {
                accessor.get(ICommandService).executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, tool.source.definitionId);
            }
        }
        else if (arg.kind === 'elicitation2') {
            if (arg.source?.type === 'mcp') {
                accessor.get(ICommandService).executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, arg.source.definitionId);
            }
        }
        else {
            assertNever(arg);
        }
    }
}
export class McpServerOptionsCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
            title: localize2(9554, 'Server Options'),
            category,
            f1: false,
        });
    }
    async run(accessor, id) {
        const mcpService = accessor.get(IMcpService);
        const quickInputService = accessor.get(IQuickInputService);
        const mcpRegistry = accessor.get(IMcpRegistry);
        const editorService = accessor.get(IEditorService);
        const commandService = accessor.get(ICommandService);
        const samplingService = accessor.get(IMcpSamplingService);
        const authenticationQueryService = accessor.get(IAuthenticationQueryService);
        const authenticationService = accessor.get(IAuthenticationService);
        const server = mcpService.servers.get().find(s => s.definition.id === id);
        if (!server) {
            return;
        }
        const collection = mcpRegistry.collections.get().find(c => c.id === server.collection.id);
        const serverDefinition = collection?.serverDefinitions.get().find(s => s.id === server.definition.id);
        const items = [];
        const serverState = server.connectionState.get();
        items.push({ type: 'separator', label: localize(9526, null) });
        // Only show start when server is stopped or in error state
        if (McpConnectionState.canBeStarted(serverState.state)) {
            items.push({
                label: localize(9527, null),
                action: 'start'
            });
        }
        else {
            items.push({
                label: localize(9528, null),
                action: 'stop'
            });
            items.push({
                label: localize(9529, null),
                action: 'restart'
            });
        }
        items.push(...this._getAuthActions(authenticationQueryService, server.definition.id));
        const configTarget = serverDefinition?.presentation?.origin || collection?.presentation?.origin;
        if (configTarget) {
            items.push({
                label: localize(9530, null),
                action: 'config',
            });
        }
        items.push({
            label: localize(9531, null),
            action: 'showOutput'
        });
        items.push({ type: 'separator', label: localize(9532, null) }, {
            label: localize(9533, null),
            description: localize(9534, null),
            action: 'configSampling'
        });
        if (samplingService.hasLogs(server)) {
            items.push({
                label: localize(9535, null),
                description: localize(9536, null),
                action: 'samplingLog',
            });
        }
        const capabilities = server.capabilities.get();
        if (capabilities === undefined || (capabilities & 16 /* McpCapability.Resources */)) {
            items.push({ type: 'separator', label: localize(9537, null) });
            items.push({
                label: localize(9538, null),
                action: 'resources',
            });
        }
        const pick = await quickInputService.pick(items, {
            placeHolder: localize(9539, null, server.definition.label),
        });
        if (!pick) {
            return;
        }
        switch (pick.action) {
            case 'start':
                await server.start({ promptType: 'all-untrusted' });
                server.showOutput();
                break;
            case 'stop':
                await server.stop();
                break;
            case 'restart':
                await server.stop();
                await server.start({ promptType: 'all-untrusted' });
                break;
            case 'disconnect':
                await server.stop();
                await this._handleAuth(authenticationService, pick.accountQuery, server.definition, false);
                break;
            case 'signout':
                await server.stop();
                await this._handleAuth(authenticationService, pick.accountQuery, server.definition, true);
                break;
            case 'showOutput':
                server.showOutput();
                break;
            case 'config':
                editorService.openEditor({
                    resource: URI.isUri(configTarget) ? configTarget : configTarget.uri,
                    options: { selection: URI.isUri(configTarget) ? undefined : configTarget.range }
                });
                break;
            case 'configSampling':
                return commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, server);
            case 'resources':
                return commandService.executeCommand("workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */, server);
            case 'samplingLog':
                editorService.openEditor({
                    resource: undefined,
                    contents: samplingService.getLogText(server),
                    label: localize(9540, null, server.definition.label),
                });
                break;
            default:
                assertNever(pick);
        }
    }
    _getAuthActions(authenticationQueryService, serverId) {
        const result = [];
        // Really, this should only ever have one entry.
        for (const [providerId, accountName] of authenticationQueryService.mcpServer(serverId).getAllAccountPreferences()) {
            const accountQuery = authenticationQueryService.provider(providerId).account(accountName);
            if (!accountQuery.mcpServer(serverId).isAccessAllowed()) {
                continue; // skip accounts that are not allowed
            }
            // If there are multiple allowed servers/extensions, other things are using this provider
            // so we show a disconnect action, otherwise we show a sign out action.
            if (accountQuery.entities().getEntityCount().total > 1) {
                result.push({
                    action: 'disconnect',
                    label: localize(9541, null),
                    description: `(${accountName})`,
                    accountQuery
                });
            }
            else {
                result.push({
                    action: 'signout',
                    label: localize(9542, null),
                    description: `(${accountName})`,
                    accountQuery
                });
            }
        }
        return result;
    }
    async _handleAuth(authenticationService, accountQuery, definition, signOut) {
        const { providerId, accountName } = accountQuery;
        accountQuery.mcpServer(definition.id).setAccessAllowed(false, definition.label);
        if (signOut) {
            const accounts = await authenticationService.getAccounts(providerId);
            const account = accounts.find(a => a.label === accountName);
            if (account) {
                const sessions = await authenticationService.getSessions(providerId, undefined, { account });
                for (const session of sessions) {
                    await authenticationService.removeSession(providerId, session.id);
                }
            }
        }
    }
}
let MCPServerActionRendering = class MCPServerActionRendering extends Disposable {
    constructor(actionViewItemService, mcpService, instaService, commandService, configurationService) {
        super();
        const hoverIsOpen = observableValue(this, false);
        const config = observableConfigValue(mcpAutoStartConfig, "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */, configurationService);
        let DisplayedState;
        (function (DisplayedState) {
            DisplayedState[DisplayedState["None"] = 0] = "None";
            DisplayedState[DisplayedState["NewTools"] = 1] = "NewTools";
            DisplayedState[DisplayedState["Error"] = 2] = "Error";
            DisplayedState[DisplayedState["Refreshing"] = 3] = "Refreshing";
        })(DisplayedState || (DisplayedState = {}));
        function isServer(s) {
            return typeof s.start === 'function';
        }
        const displayedStateCurrent = derived((reader) => {
            const servers = mcpService.servers.read(reader);
            const serversPerState = [];
            for (const server of servers) {
                let thisState = 0 /* DisplayedState.None */;
                switch (server.cacheState.read(reader)) {
                    case 0 /* McpServerCacheState.Unknown */:
                    case 2 /* McpServerCacheState.Outdated */:
                        thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 1 /* DisplayedState.NewTools */;
                        break;
                    case 3 /* McpServerCacheState.RefreshingFromUnknown */:
                        thisState = 3 /* DisplayedState.Refreshing */;
                        break;
                    default:
                        thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 0 /* DisplayedState.None */;
                        break;
                }
                serversPerState[thisState] ??= [];
                serversPerState[thisState].push(server);
            }
            const unknownServerStates = mcpService.lazyCollectionState.read(reader);
            if (unknownServerStates.state === 1 /* LazyCollectionState.LoadingUnknown */) {
                serversPerState[3 /* DisplayedState.Refreshing */] ??= [];
                serversPerState[3 /* DisplayedState.Refreshing */].push(...unknownServerStates.collections);
            }
            else if (unknownServerStates.state === 0 /* LazyCollectionState.HasUnknown */) {
                serversPerState[1 /* DisplayedState.NewTools */] ??= [];
                serversPerState[1 /* DisplayedState.NewTools */].push(...unknownServerStates.collections);
            }
            let maxState = (serversPerState.length - 1);
            if (maxState === 1 /* DisplayedState.NewTools */ && config.read(reader) !== "never" /* McpAutoStartValue.Never */) {
                maxState = 0 /* DisplayedState.None */;
            }
            return { state: maxState, servers: serversPerState[maxState] || [] };
        });
        // avoid hiding the hover if a state changes while it's open:
        const displayedState = derivedObservableWithCache(this, (reader, last) => {
            if (last && hoverIsOpen.read(reader)) {
                return last;
            }
            else {
                return displayedStateCurrent.read(reader);
            }
        });
        const actionItemState = displayedState.map(s => s.state);
        this._store.add(actionViewItemService.register(MenuId.ChatInput, "workbench.mcp.listServer" /* McpCommandIds.ListServer */, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    super.render(container);
                    container.classList.add('chat-mcp');
                    container.style.position = 'relative';
                    const stateIndicator = container.appendChild($('.chat-mcp-state-indicator'));
                    stateIndicator.style.display = 'none';
                    this._register(autorun(r => {
                        const displayed = displayedState.read(r);
                        const { state } = displayed;
                        this.updateTooltip();
                        stateIndicator.ariaLabel = this.getLabelForState(displayed);
                        stateIndicator.className = 'chat-mcp-state-indicator';
                        if (state === 1 /* DisplayedState.NewTools */) {
                            stateIndicator.style.display = 'block';
                            stateIndicator.classList.add('chat-mcp-state-new', ...ThemeIcon.asClassNameArray(Codicon.refresh));
                        }
                        else if (state === 2 /* DisplayedState.Error */) {
                            stateIndicator.style.display = 'block';
                            stateIndicator.classList.add('chat-mcp-state-error', ...ThemeIcon.asClassNameArray(Codicon.warning));
                        }
                        else if (state === 3 /* DisplayedState.Refreshing */) {
                            stateIndicator.style.display = 'block';
                            stateIndicator.classList.add('chat-mcp-state-refreshing', ...ThemeIcon.asClassNameArray(spinningLoading));
                        }
                        else {
                            stateIndicator.style.display = 'none';
                        }
                    }));
                }
                async onClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const { state, servers } = displayedStateCurrent.get();
                    if (state === 1 /* DisplayedState.NewTools */) {
                        const interaction = new McpStartServerInteraction();
                        servers.filter(isServer).forEach(server => server.stop().then(() => server.start({ interaction })));
                        mcpService.activateCollections();
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        findLast(servers, isServer)?.showOutput();
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        const server = findLast(servers, isServer);
                        if (server) {
                            await server.showOutput(true);
                            commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, server.definition.id);
                        }
                    }
                    else {
                        commandService.executeCommand("workbench.mcp.listServer" /* McpCommandIds.ListServer */);
                    }
                }
                getTooltip() {
                    return this.getLabelForState() || super.getTooltip();
                }
                getHoverContents({ state, servers } = displayedStateCurrent.get()) {
                    const link = (s) => createMarkdownCommandLink({
                        title: s.definition.label,
                        id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
                        arguments: [s.definition.id],
                    });
                    const single = servers.length === 1;
                    const names = servers.map(s => isServer(s) ? link(s) : '`' + s.label + '`').map(l => single ? l : `- ${l}`).join('\n');
                    let markdown;
                    if (state === 1 /* DisplayedState.NewTools */) {
                        markdown = new MarkdownString(single
                            ? localize(9543, null, names)
                            : localize(9544, null, names));
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        markdown = new MarkdownString(single
                            ? localize(9545, null, names)
                            : localize(9546, null, names));
                    }
                    else {
                        return this.getLabelForState() || undefined;
                    }
                    return {
                        element: (token) => {
                            hoverIsOpen.set(true, undefined);
                            const store = new DisposableStore();
                            store.add(toDisposable(() => hoverIsOpen.set(false, undefined)));
                            store.add(token.onCancellationRequested(() => {
                                store.dispose();
                            }));
                            // todo@connor4312/@benibenj: workaround for #257923
                            store.add(disposableWindowInterval(mainWindow, () => {
                                if (!container.isConnected) {
                                    store.dispose();
                                }
                            }, 2000));
                            const container = $('div.mcp-hover-contents');
                            // Render markdown content
                            markdown.isTrusted = true;
                            const markdownResult = store.add(renderMarkdown(markdown));
                            container.appendChild(markdownResult.element);
                            // Add divider
                            const divider = $('hr.mcp-hover-divider');
                            container.appendChild(divider);
                            // Add checkbox for mcpAutoStartConfig setting
                            const checkboxContainer = $('div.mcp-hover-setting');
                            const settingLabelStr = localize(9547, null);
                            const checkbox = store.add(new Checkbox(settingLabelStr, config.get() !== "never" /* McpAutoStartValue.Never */, { ...defaultCheckboxStyles }));
                            checkboxContainer.appendChild(checkbox.domNode);
                            // Add label next to checkbox
                            const settingLabel = $('span.mcp-hover-setting-label', undefined, settingLabelStr);
                            checkboxContainer.appendChild(settingLabel);
                            const onChange = () => {
                                const newValue = checkbox.checked ? "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */ : "never" /* McpAutoStartValue.Never */;
                                configurationService.updateValue(mcpAutoStartConfig, newValue);
                            };
                            store.add(checkbox.onChange(onChange));
                            store.add(addDisposableListener(settingLabel, EventType.CLICK, () => {
                                checkbox.checked = !checkbox.checked;
                                onChange();
                            }));
                            container.appendChild(checkboxContainer);
                            return container;
                        },
                    };
                }
                getLabelForState({ state, servers } = displayedStateCurrent.get()) {
                    if (state === 1 /* DisplayedState.NewTools */) {
                        return localize(9548, null, servers.length || 1);
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        return localize(9549, null, servers.length || 1);
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        return localize(9550, null);
                    }
                    else {
                        return null;
                    }
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, Event.fromObservableLight(actionItemState)));
    }
};
MCPServerActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IMcpService),
    __param(2, IInstantiationService),
    __param(3, ICommandService),
    __param(4, IConfigurationService)
], MCPServerActionRendering);
export { MCPServerActionRendering };
export class ResetMcpTrustCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.resetTrust" /* McpCommandIds.ResetTrust */,
            title: localize2(9555, "Reset Trust"),
            category,
            f1: true,
            precondition: ContextKeyExpr.and(McpContextKeys.toolsCount.greater(0), ChatContextKeys.Setup.hidden.negate()),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetTrust();
    }
}
export class ResetMcpCachedTools extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.resetCachedTools" /* McpCommandIds.ResetCachedTools */,
            title: localize2(9556, "Reset Cached Tools"),
            category,
            f1: true,
            precondition: ContextKeyExpr.and(McpContextKeys.toolsCount.greater(0), ChatContextKeys.Setup.hidden.negate()),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetCaches();
    }
}
export class AddConfigurationAction extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */,
            title: localize2(9557, "Add Server..."),
            metadata: {
                description: localize2(9558, "Installs a new Model Context protocol to the mcp.json settings"),
            },
            category,
            f1: true,
            precondition: ChatContextKeys.Setup.hidden.negate(),
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]mcp\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), ChatContextKeys.Setup.hidden.negate())
            }
        });
    }
    async run(accessor, configUri) {
        const instantiationService = accessor.get(IInstantiationService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const target = configUri ? workspaceService.getWorkspaceFolder(URI.parse(configUri)) : undefined;
        return instantiationService.createInstance(McpAddConfigurationCommand, target ?? undefined).run();
    }
}
export class RemoveStoredInput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */,
            title: localize2(9559, "Reset Cached Tools"),
            category,
            f1: false,
        });
    }
    run(accessor, scope, id) {
        accessor.get(IMcpRegistry).clearSavedInputs(scope, id);
    }
}
export class EditStoredInput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.editStoredInput" /* McpCommandIds.EditStoredInput */,
            title: localize2(9560, "Edit Stored Input"),
            category,
            f1: false,
        });
    }
    run(accessor, inputId, uri, configSection, target) {
        const workspaceFolder = uri && accessor.get(IWorkspaceContextService).getWorkspaceFolder(uri);
        accessor.get(IMcpRegistry).editSavedInput(inputId, workspaceFolder || undefined, configSection, target);
    }
}
export class ShowConfiguration extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showConfiguration" /* McpCommandIds.ShowConfiguration */,
            title: localize2(9561, "Show Configuration"),
            category,
            f1: false,
        });
    }
    run(accessor, collectionId, serverId) {
        const collection = accessor.get(IMcpRegistry).collections.get().find(c => c.id === collectionId);
        if (!collection) {
            return;
        }
        const server = collection?.serverDefinitions.get().find(s => s.id === serverId);
        const editorService = accessor.get(IEditorService);
        if (server?.presentation?.origin) {
            editorService.openEditor({
                resource: server.presentation.origin.uri,
                options: { selection: server.presentation.origin.range }
            });
        }
        else if (collection.presentation?.origin) {
            editorService.openEditor({
                resource: collection.presentation.origin,
            });
        }
    }
}
export class ShowOutput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
            title: localize2(9562, "Show Output"),
            category,
            f1: false,
        });
    }
    run(accessor, serverId) {
        accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId)?.showOutput();
    }
}
export class RestartServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
            title: localize2(9563, "Restart Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId, opts) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        s?.showOutput();
        await s?.stop();
        await s?.start({ promptType: 'all-untrusted', ...opts });
    }
}
export class StartServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
            title: localize2(9564, "Start Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId, opts) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.start({ promptType: 'all-untrusted', ...opts });
    }
}
export class StopServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
            title: localize2(9565, "Stop Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.stop();
    }
}
export class McpBrowseCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.browseServers" /* McpCommandIds.Browse */,
            title: localize2(9566, "MCP Servers"),
            tooltip: localize2(9567, "Browse MCP Servers"),
            category,
            icon: Codicon.search,
            precondition: ChatContextKeys.Setup.hidden.negate(),
            menu: [{
                    id: extensionsFilterSubMenu,
                    group: '1_predefined',
                    order: 1,
                    when: ChatContextKeys.Setup.hidden.negate(),
                }, {
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.and(ContextKeyExpr.equals('view', InstalledMcpServersViewId), ChatContextKeys.Setup.hidden.negate()),
                    group: 'navigation',
                }],
        });
    }
    async run(accessor) {
        accessor.get(IExtensionsWorkbenchService).openSearch('@mcp ');
    }
}
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.mcp.browseServers" /* McpCommandIds.Browse */,
        title: localize2(9568, "Browse MCP Servers"),
        category,
        precondition: ChatContextKeys.Setup.hidden.negate(),
    },
});
export class ShowInstalledMcpServersCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showInstalledServers" /* McpCommandIds.ShowInstalled */,
            title: localize2(9569, "Show Installed Servers"),
            category,
            precondition: ContextKeyExpr.and(HasInstalledMcpServersContext, ChatContextKeys.Setup.hidden.negate()),
            f1: true,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await viewsService.openView(InstalledMcpServersViewId, true);
        if (!view) {
            await viewsService.openViewContainer(VIEW_CONTAINER.id);
            await viewsService.openView(InstalledMcpServersViewId, true);
        }
    }
}
MenuRegistry.appendMenuItem(CHAT_CONFIG_MENU_ID, {
    command: {
        id: "workbench.mcp.showInstalledServers" /* McpCommandIds.ShowInstalled */,
        title: localize2(9570, "MCP Servers")
    },
    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
    order: 10,
    group: '2_level'
});
class OpenMcpResourceCommand extends Action2 {
    async run(accessor) {
        const fileService = accessor.get(IFileService);
        const editorService = accessor.get(IEditorService);
        const resource = await this.getURI(accessor);
        if (!(await fileService.exists(resource))) {
            await fileService.createFile(resource, VSBuffer.fromString(JSON.stringify({ servers: {} }, null, '\t')));
        }
        await editorService.openEditor({ resource });
    }
}
export class OpenUserMcpResourceCommand extends OpenMcpResourceCommand {
    constructor() {
        super({
            id: "workbench.mcp.openUserMcpJson" /* McpCommandIds.OpenUserMcp */,
            title: localize2(9571, "Open User Configuration"),
            category,
            f1: true,
            precondition: ChatContextKeys.Setup.hidden.negate(),
        });
    }
    getURI(accessor) {
        const userDataProfileService = accessor.get(IUserDataProfileService);
        return Promise.resolve(userDataProfileService.currentProfile.mcpResource);
    }
}
export class OpenRemoteUserMcpResourceCommand extends OpenMcpResourceCommand {
    constructor() {
        super({
            id: "workbench.mcp.openRemoteUserMcpJson" /* McpCommandIds.OpenRemoteUserMcp */,
            title: localize2(9572, "Open Remote User Configuration"),
            category,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), RemoteNameContext.notEqualsTo(''))
        });
    }
    async getURI(accessor) {
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const remoteUserDataProfileService = accessor.get(IRemoteUserDataProfilesService);
        const remoteProfile = await remoteUserDataProfileService.getRemoteProfile(userDataProfileService.currentProfile);
        return remoteProfile.mcpResource;
    }
}
export class OpenWorkspaceFolderMcpResourceCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.openWorkspaceFolderMcpJson" /* McpCommandIds.OpenWorkspaceFolderMcp */,
            title: localize2(9573, "Open Workspace Folder MCP Configuration"),
            category,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), WorkspaceFolderCountContext.notEqualsTo(0))
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        const workspaceFolders = workspaceContextService.getWorkspace().folders;
        const workspaceFolder = workspaceFolders.length === 1 ? workspaceFolders[0] : await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        if (workspaceFolder) {
            await editorService.openEditor({ resource: workspaceFolder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]) });
        }
    }
}
export class OpenWorkspaceMcpResourceCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.openWorkspaceMcpJson" /* McpCommandIds.OpenWorkspaceMcp */,
            title: localize2(9574, "Open Workspace MCP Configuration"),
            category,
            f1: true,
            precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), WorkbenchStateContext.isEqualTo('workspace'))
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const editorService = accessor.get(IEditorService);
        const workspaceConfiguration = workspaceContextService.getWorkspace().configuration;
        if (workspaceConfiguration) {
            await editorService.openEditor({ resource: workspaceConfiguration });
        }
    }
}
export class McpBrowseResourcesCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */,
            title: localize2(9575, "Browse Resources..."),
            category,
            precondition: ContextKeyExpr.and(McpContextKeys.serverCount.greater(0), ChatContextKeys.Setup.hidden.negate()),
            f1: true,
        });
    }
    run(accessor, server) {
        if (server) {
            accessor.get(IInstantiationService).createInstance(McpResourceQuickPick, server).pick();
        }
        else {
            accessor.get(IQuickInputService).quickAccess.show(McpResourceQuickAccess.PREFIX);
        }
    }
}
export class McpConfigureSamplingModels extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */,
            title: localize2(9576, "Configure SamplingModel"),
            category,
        });
    }
    async run(accessor, server) {
        const quickInputService = accessor.get(IQuickInputService);
        const lmService = accessor.get(ILanguageModelsService);
        const mcpSampling = accessor.get(IMcpSamplingService);
        const existingIds = new Set(mcpSampling.getConfig(server).allowedModels);
        const allItems = lmService.getLanguageModelIds().map(id => {
            const model = lmService.lookupLanguageModel(id);
            if (!model.isUserSelectable) {
                return undefined;
            }
            return {
                label: model.name,
                description: model.tooltip,
                id,
                picked: existingIds.size ? existingIds.has(id) : model.isDefault,
            };
        }).filter(isDefined);
        allItems.sort((a, b) => (b.picked ? 1 : 0) - (a.picked ? 1 : 0) || a.label.localeCompare(b.label));
        // do the quickpick selection
        const picked = await quickInputService.pick(allItems, {
            placeHolder: localize(9551, null, server.definition.label),
            canPickMany: true,
        });
        if (picked) {
            await mcpSampling.updateConfig(server, c => c.allowedModels = picked.map(p => p.id));
        }
        return picked?.length || 0;
    }
}
export class McpStartPromptingServerCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.startPromptForServer" /* McpCommandIds.StartPromptForServer */,
            title: localize2(9577, "Start Prompting Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, server) {
        const widget = await openPanelChatAndGetWidget(accessor.get(IViewsService), accessor.get(IChatWidgetService));
        if (!widget) {
            return;
        }
        const editor = widget.inputEditor;
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const range = (editor.getSelection() || model.getFullModelRange()).collapseToEnd();
        const text = mcpPromptPrefix(server.definition) + '.';
        model.applyEdits([{ range, text }]);
        editor.setSelection(Range.fromPositions(range.getEndPosition().delta(0, text.length)));
        widget.focusInput();
        SuggestController.get(editor)?.triggerSuggest();
    }
}
export class McpSkipCurrentAutostartCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.skipAutostart" /* McpCommandIds.SkipCurrentAutostart */,
            title: localize2(9578, "Skip Current Autostart"),
            category,
            f1: false,
        });
    }
    async run(accessor) {
        accessor.get(IMcpService).cancelAutostart();
    }
}
//# sourceMappingURL=mcpCommands.js.map