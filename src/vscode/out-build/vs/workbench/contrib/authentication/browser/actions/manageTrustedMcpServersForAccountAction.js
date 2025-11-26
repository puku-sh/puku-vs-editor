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
import { Codicon } from '../../../../../base/common/codicons.js';
import { fromNow } from '../../../../../base/common/date.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../../services/authentication/common/authenticationQuery.js';
import { ChatContextKeys } from '../../../chat/common/chatContextKeys.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
export class ManageTrustedMcpServersForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedMCPServersForAccount',
            title: localize2(4906, "Manage Trusted MCP Servers For Account"),
            category: localize2(4907, "Accounts"),
            f1: true,
            precondition: ChatContextKeys.Setup.hidden.negate()
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageTrustedMcpServersForAccountActionImpl).run(options);
    }
}
let ManageTrustedMcpServersForAccountActionImpl = class ManageTrustedMcpServersForAccountActionImpl {
    constructor(_mcpServerService, _dialogService, _quickInputService, _mcpServerAuthenticationService, _authenticationQueryService, _commandService) {
        this._mcpServerService = _mcpServerService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._mcpServerAuthenticationService = _mcpServerAuthenticationService;
        this._authenticationQueryService = _authenticationQueryService;
        this._commandService = _commandService;
    }
    async run(options) {
        const accountQuery = await this._resolveAccountQuery(options?.providerId, options?.accountLabel);
        if (!accountQuery) {
            return;
        }
        const items = await this._getItems(accountQuery);
        if (!items.length) {
            return;
        }
        const picker = this._createQuickPick(accountQuery);
        picker.items = items;
        picker.selectedItems = items.filter((i) => i.type !== 'separator' && !!i.picked);
        picker.show();
    }
    //#region Account Query Resolution
    async _resolveAccountQuery(providerId, accountLabel) {
        if (providerId && accountLabel) {
            return this._authenticationQueryService.provider(providerId).account(accountLabel);
        }
        const accounts = await this._getAllAvailableAccounts();
        const pick = await this._quickInputService.pick(accounts, {
            placeHolder: localize(4896, null),
            matchOnDescription: true,
        });
        return pick ? this._authenticationQueryService.provider(pick.providerId).account(pick.label) : undefined;
    }
    async _getAllAvailableAccounts() {
        const accounts = [];
        for (const providerId of this._mcpServerAuthenticationService.getProviderIds()) {
            const provider = this._mcpServerAuthenticationService.getProvider(providerId);
            const sessions = await this._mcpServerAuthenticationService.getSessions(providerId);
            const uniqueLabels = new Set();
            for (const session of sessions) {
                if (!uniqueLabels.has(session.account.label)) {
                    uniqueLabels.add(session.account.label);
                    accounts.push({
                        providerId,
                        label: session.account.label,
                        description: provider.label
                    });
                }
            }
        }
        return accounts;
    }
    //#endregion
    //#region Item Retrieval and Quick Pick Creation
    async _getItems(accountQuery) {
        const allowedMcpServers = accountQuery.mcpServers().getAllowedMcpServers();
        const serverIdToLabel = new Map(this._mcpServerService.servers.get().map(s => [s.definition.id, s.definition.label]));
        const filteredMcpServers = allowedMcpServers
            // Filter out MCP servers that are not in the current list of servers
            .filter(server => serverIdToLabel.has(server.id))
            .map(server => {
            const usage = accountQuery.mcpServer(server.id).getUsage();
            return {
                ...server,
                // Use the server name from the MCP service
                name: serverIdToLabel.get(server.id),
                lastUsed: usage.length > 0 ? Math.max(...usage.map(u => u.lastUsed)) : server.lastUsed
            };
        });
        if (!filteredMcpServers.length) {
            this._dialogService.info(localize(4897, null));
            return [];
        }
        const trustedServers = filteredMcpServers.filter(s => s.trusted);
        const otherServers = filteredMcpServers.filter(s => !s.trusted);
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        return [
            ...otherServers.sort(sortByLastUsed).map(this._toQuickPickItem),
            { type: 'separator', label: localize(4898, null) },
            ...trustedServers.sort(sortByLastUsed).map(this._toQuickPickItem)
        ];
    }
    _toQuickPickItem(mcpServer) {
        const lastUsed = mcpServer.lastUsed;
        const description = lastUsed
            ? localize(4899, null, fromNow(lastUsed, true))
            : localize(4900, null);
        let tooltip;
        let disabled;
        if (mcpServer.trusted) {
            tooltip = localize(4901, null);
            disabled = true;
        }
        return {
            label: mcpServer.name,
            mcpServer,
            description,
            tooltip,
            disabled,
            buttons: [{
                    tooltip: localize(4902, null),
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                }],
            picked: mcpServer.allowed === undefined || mcpServer.allowed
        };
    }
    _createQuickPick(accountQuery) {
        const disposableStore = new DisposableStore();
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        // Configure quick pick
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize(4903, null);
        quickPick.title = localize(4904, null);
        quickPick.placeholder = localize(4905, null);
        // Set up event handlers
        disposableStore.add(quickPick.onDidAccept(() => {
            quickPick.hide();
            const allServers = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map((i) => i.mcpServer);
            const selectedServers = new Set(quickPick.selectedItems.map((i) => i.mcpServer));
            for (const mcpServer of allServers) {
                const isAllowed = selectedServers.has(mcpServer);
                accountQuery.mcpServer(mcpServer.id).setAccessAllowed(isAllowed, mcpServer.name);
            }
        }));
        disposableStore.add(quickPick.onDidHide(() => disposableStore.dispose()));
        disposableStore.add(quickPick.onDidCustom(() => quickPick.hide()));
        disposableStore.add(quickPick.onDidTriggerItemButton((e) => this._commandService.executeCommand('_manageAccountPreferencesForMcpServer', e.item.mcpServer.id, accountQuery.providerId)));
        return quickPick;
    }
};
ManageTrustedMcpServersForAccountActionImpl = __decorate([
    __param(0, IMcpService),
    __param(1, IDialogService),
    __param(2, IQuickInputService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationQueryService),
    __param(5, ICommandService)
], ManageTrustedMcpServersForAccountActionImpl);
//# sourceMappingURL=manageTrustedMcpServersForAccountAction.js.map