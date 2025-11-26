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
import { Lazy } from '../../../../../base/common/lazy.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { getCurrentAuthenticationSessionInfo } from '../../../../services/authentication/browser/authenticationService.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
export class ManageAccountsAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.manageAccounts',
            title: localize2(4871, "Manage Accounts"),
            category: localize2(4872, "Accounts"),
            f1: true
        });
    }
    run(accessor) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageAccountsActionImpl).run();
    }
}
let ManageAccountsActionImpl = class ManageAccountsActionImpl {
    constructor(quickInputService, authenticationService, commandService, secretStorageService, productService) {
        this.quickInputService = quickInputService;
        this.authenticationService = authenticationService;
        this.commandService = commandService;
        this.secretStorageService = secretStorageService;
        this.productService = productService;
    }
    async run() {
        const placeHolder = localize(4864, null);
        const accounts = await this.listAccounts();
        if (!accounts.length) {
            await this.quickInputService.pick([{ label: localize(4865, null) }], { placeHolder });
            return;
        }
        const account = await this.quickInputService.pick(accounts, { placeHolder, matchOnDescription: true });
        if (!account) {
            return;
        }
        await this.showAccountActions(account);
    }
    async listAccounts() {
        const activeSession = new Lazy(() => getCurrentAuthenticationSessionInfo(this.secretStorageService, this.productService));
        const accounts = [];
        for (const providerId of this.authenticationService.getProviderIds()) {
            const provider = this.authenticationService.getProvider(providerId);
            for (const { label, id } of await this.authenticationService.getAccounts(providerId)) {
                accounts.push({
                    label,
                    description: provider.label,
                    providerId,
                    canUseMcp: !!provider.authorizationServers?.length,
                    canSignOut: async () => this.canSignOut(provider, id, await activeSession.value)
                });
            }
        }
        return accounts;
    }
    async canSignOut(provider, accountId, session) {
        if (session && !session.canSignOut && session.providerId === provider.id) {
            const sessions = await this.authenticationService.getSessions(provider.id);
            return !sessions.some(o => o.id === session.id && o.account.id === accountId);
        }
        return true;
    }
    async showAccountActions(account) {
        const { providerId, label: accountLabel, canUseMcp, canSignOut } = account;
        const store = new DisposableStore();
        const quickPick = store.add(this.quickInputService.createQuickPick());
        quickPick.title = localize(4866, null, accountLabel);
        quickPick.placeholder = localize(4867, null);
        quickPick.buttons = [this.quickInputService.backButton];
        const items = [{
                label: localize(4868, null),
                action: () => this.commandService.executeCommand('_manageTrustedExtensionsForAccount', { providerId, accountLabel })
            }];
        if (canUseMcp) {
            items.push({
                label: localize(4869, null),
                action: () => this.commandService.executeCommand('_manageTrustedMCPServersForAccount', { providerId, accountLabel })
            });
        }
        if (await canSignOut()) {
            items.push({
                label: localize(4870, null),
                action: () => this.commandService.executeCommand('_signOutOfAccount', { providerId, accountLabel })
            });
        }
        quickPick.items = items;
        store.add(quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            if (selected) {
                quickPick.hide();
                selected.action();
            }
        }));
        store.add(quickPick.onDidTriggerButton((button) => {
            if (button === this.quickInputService.backButton) {
                void this.run();
            }
        }));
        store.add(quickPick.onDidHide(() => store.dispose()));
        quickPick.show();
    }
};
ManageAccountsActionImpl = __decorate([
    __param(0, IQuickInputService),
    __param(1, IAuthenticationService),
    __param(2, ICommandService),
    __param(3, ISecretStorageService),
    __param(4, IProductService)
], ManageAccountsActionImpl);
//# sourceMappingURL=manageAccountsAction.js.map