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
            title: localize2('mcp.list', 'List Servers'),
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
        pick.placeholder = localize('mcp.selectServer', 'Select an MCP Server');
        mcpService.activateCollections();
        store.add(pick);
        store.add(autorun(reader => {
            const servers = groupBy(mcpService.servers.read(reader).slice().sort((a, b) => (a.collection.presentation?.order || 0) - (b.collection.presentation?.order || 0)), s => s.collection.id);
            const firstRun = pick.items.length === 0;
            pick.items = [
                { id: '$add', label: localize('mcp.addServer', 'Add Server'), description: localize('mcp.addServer.description', 'Add a new server configuration'), alwaysShow: true, iconClass: ThemeIcon.asClassName(Codicon.add) },
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
            title: localize2('mcp.options', 'Server Options'),
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
            title: localize2('mcp.options', 'Server Options'),
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
        items.push({ type: 'separator', label: localize('mcp.actions.status', 'Status') });
        // Only show start when server is stopped or in error state
        if (McpConnectionState.canBeStarted(serverState.state)) {
            items.push({
                label: localize('mcp.start', 'Start Server'),
                action: 'start'
            });
        }
        else {
            items.push({
                label: localize('mcp.stop', 'Stop Server'),
                action: 'stop'
            });
            items.push({
                label: localize('mcp.restart', 'Restart Server'),
                action: 'restart'
            });
        }
        items.push(...this._getAuthActions(authenticationQueryService, server.definition.id));
        const configTarget = serverDefinition?.presentation?.origin || collection?.presentation?.origin;
        if (configTarget) {
            items.push({
                label: localize('mcp.config', 'Show Configuration'),
                action: 'config',
            });
        }
        items.push({
            label: localize('mcp.showOutput', 'Show Output'),
            action: 'showOutput'
        });
        items.push({ type: 'separator', label: localize('mcp.actions.sampling', 'Sampling') }, {
            label: localize('mcp.configAccess', 'Configure Model Access'),
            description: localize('mcp.showOutput.description', 'Set the models the server can use via MCP sampling'),
            action: 'configSampling'
        });
        if (samplingService.hasLogs(server)) {
            items.push({
                label: localize('mcp.samplingLog', 'Show Sampling Requests'),
                description: localize('mcp.samplingLog.description', 'Show the sampling requests for this server'),
                action: 'samplingLog',
            });
        }
        const capabilities = server.capabilities.get();
        if (capabilities === undefined || (capabilities & 16 /* McpCapability.Resources */)) {
            items.push({ type: 'separator', label: localize('mcp.actions.resources', 'Resources') });
            items.push({
                label: localize('mcp.resources', 'Browse Resources'),
                action: 'resources',
            });
        }
        const pick = await quickInputService.pick(items, {
            placeHolder: localize('mcp.selectAction', 'Select action for \'{0}\'', server.definition.label),
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
                    label: localize('mcp.samplingLog.title', 'MCP Sampling: {0}', server.definition.label),
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
                    label: localize('mcp.disconnect', 'Disconnect Account'),
                    description: `(${accountName})`,
                    accountQuery
                });
            }
            else {
                result.push({
                    action: 'signout',
                    label: localize('mcp.signOut', 'Sign Out'),
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
                            ? localize('mcp.newTools.md.single', "MCP server {0} has been updated and may have new tools available.", names)
                            : localize('mcp.newTools.md.multi', "MCP servers have been updated and may have new tools available:\n\n{0}", names));
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        markdown = new MarkdownString(single
                            ? localize('mcp.err.md.single', "MCP server {0} was unable to start successfully.", names)
                            : localize('mcp.err.md.multi', "Multiple MCP servers were unable to start successfully:\n\n{0}", names));
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
                            const settingLabelStr = localize('mcp.autoStart', "Automatically start MCP servers when sending a chat message");
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
                        return localize('mcp.newTools', "New tools available ({0})", servers.length || 1);
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        return localize('mcp.toolError', "Error loading {0} tool(s)", servers.length || 1);
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        return localize('mcp.toolRefresh', "Discovering tools...");
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
            title: localize2('mcp.resetTrust', "Reset Trust"),
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
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
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
            title: localize2('mcp.addConfiguration', "Add Server..."),
            metadata: {
                description: localize2('mcp.addConfiguration.description', "Installs a new Model Context protocol to the mcp.json settings"),
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
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
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
            title: localize2('mcp.editStoredInput', "Edit Stored Input"),
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
            title: localize2('mcp.command.showConfiguration', "Show Configuration"),
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
            title: localize2('mcp.command.showOutput', "Show Output"),
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
            title: localize2('mcp.command.restartServer', "Restart Server"),
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
            title: localize2('mcp.command.startServer', "Start Server"),
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
            title: localize2('mcp.command.stopServer', "Stop Server"),
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
            title: localize2('mcp.command.browse', "MCP Servers"),
            tooltip: localize2('mcp.command.browse.tooltip', "Browse MCP Servers"),
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
        title: localize2('mcp.command.browse.mcp', "Browse MCP Servers"),
        category,
        precondition: ChatContextKeys.Setup.hidden.negate(),
    },
});
export class ShowInstalledMcpServersCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showInstalledServers" /* McpCommandIds.ShowInstalled */,
            title: localize2('mcp.command.show.installed', "Show Installed Servers"),
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
        title: localize2('mcp.servers', "MCP Servers")
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
            title: localize2('mcp.command.openUserMcp', "Open User Configuration"),
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
            title: localize2('mcp.command.openRemoteUserMcp', "Open Remote User Configuration"),
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
            title: localize2('mcp.command.openWorkspaceFolderMcp', "Open Workspace Folder MCP Configuration"),
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
            title: localize2('mcp.command.openWorkspaceMcp', "Open Workspace MCP Configuration"),
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
            title: localize2('mcp.browseResources', "Browse Resources..."),
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
            title: localize2('mcp.configureSamplingModels', "Configure SamplingModel"),
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
            placeHolder: localize('mcp.configureSamplingModels.ph', 'Pick the models {0} can access via MCP sampling', server.definition.label),
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
            title: localize2('mcp.startPromptingServer', "Start Prompting Server"),
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
            title: localize2('mcp.skipCurrentAutostart', "Skip Current Autostart"),
            category,
            f1: false,
        });
    }
    async run(accessor) {
        accessor.get(IMcpService).cancelAutostart();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNuRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsU0FB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