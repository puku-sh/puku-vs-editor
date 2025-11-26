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
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
export class ManageTrustedExtensionsForAccountAction extends Action2 {
    constructor() {
        super({
            id: '_manageTrustedExtensionsForAccount',
            title: localize2(4894, "Manage Trusted Extensions For Account"),
            category: localize2(4895, "Accounts"),
            f1: true
        });
    }
    run(accessor, options) {
        const instantiationService = accessor.get(IInstantiationService);
        return instantiationService.createInstance(ManageTrustedExtensionsForAccountActionImpl).run(options);
    }
}
let ManageTrustedExtensionsForAccountActionImpl = class ManageTrustedExtensionsForAccountActionImpl {
    constructor(_extensionService, _dialogService, _quickInputService, _authenticationService, _authenticationQueryService, _commandService, _extensionsWorkbenchService) {
        this._extensionService = _extensionService;
        this._dialogService = _dialogService;
        this._quickInputService = _quickInputService;
        this._authenticationService = _authenticationService;
        this._authenticationQueryService = _authenticationQueryService;
        this._commandService = _commandService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._viewDetailsButton = {
            tooltip: localize(4883, null),
            iconClass: ThemeIcon.asClassName(Codicon.info),
        };
        this._managePreferencesButton = {
            tooltip: localize(4884, null),
            iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
        };
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
            placeHolder: localize(4885, null),
            matchOnDescription: true,
        });
        return pick ? this._authenticationQueryService.provider(pick.providerId).account(pick.label) : undefined;
    }
    async _getAllAvailableAccounts() {
        const accounts = [];
        for (const providerId of this._authenticationService.getProviderIds()) {
            const provider = this._authenticationService.getProvider(providerId);
            const sessions = await this._authenticationService.getSessions(providerId);
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
        const allowedExtensions = accountQuery.extensions().getAllowedExtensions();
        const extensionIdToDisplayName = new Map();
        // Get display names for all allowed extensions
        const resolvedExtensions = await Promise.all(allowedExtensions.map(ext => this._extensionService.getExtension(ext.id)));
        resolvedExtensions.forEach((resolved, i) => {
            if (resolved) {
                extensionIdToDisplayName.set(allowedExtensions[i].id, resolved.displayName || resolved.name);
            }
        });
        // Filter out extensions that are not currently installed and enrich with display names
        const filteredExtensions = allowedExtensions
            .filter(ext => extensionIdToDisplayName.has(ext.id))
            .map(ext => {
            const usage = accountQuery.extension(ext.id).getUsage();
            return {
                ...ext,
                // Use the extension display name from the extension service
                name: extensionIdToDisplayName.get(ext.id),
                lastUsed: usage.length > 0 ? Math.max(...usage.map(u => u.lastUsed)) : ext.lastUsed
            };
        });
        if (!filteredExtensions.length) {
            this._dialogService.info(localize(4886, null));
            return [];
        }
        const trustedExtensions = filteredExtensions.filter(e => e.trusted);
        const otherExtensions = filteredExtensions.filter(e => !e.trusted);
        const sortByLastUsed = (a, b) => (b.lastUsed || 0) - (a.lastUsed || 0);
        const _toQuickPickItem = this._toQuickPickItem.bind(this);
        return [
            ...otherExtensions.sort(sortByLastUsed).map(_toQuickPickItem),
            { type: 'separator', label: localize(4887, null) },
            ...trustedExtensions.sort(sortByLastUsed).map(_toQuickPickItem)
        ];
    }
    _toQuickPickItem(extension) {
        const lastUsed = extension.lastUsed;
        const description = lastUsed
            ? localize(4888, null, fromNow(lastUsed, true))
            : localize(4889, null);
        let tooltip;
        let disabled;
        if (extension.trusted) {
            tooltip = localize(4890, null);
            disabled = true;
        }
        return {
            label: extension.name,
            extension,
            description,
            tooltip,
            disabled,
            buttons: [this._viewDetailsButton, this._managePreferencesButton],
            picked: extension.allowed === undefined || extension.allowed
        };
    }
    _createQuickPick(accountQuery) {
        const disposableStore = new DisposableStore();
        const quickPick = disposableStore.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        // Configure quick pick
        quickPick.canSelectMany = true;
        quickPick.customButton = true;
        quickPick.customLabel = localize(4891, null);
        quickPick.title = localize(4892, null);
        quickPick.placeholder = localize(4893, null);
        // Set up event handlers
        disposableStore.add(quickPick.onDidAccept(() => {
            const updatedAllowedList = quickPick.items
                .filter((item) => item.type !== 'separator')
                .map(i => i.extension);
            const allowedExtensionsSet = new Set(quickPick.selectedItems.map(i => i.extension));
            for (const extension of updatedAllowedList) {
                const allowed = allowedExtensionsSet.has(extension);
                accountQuery.extension(extension.id).setAccessAllowed(allowed, extension.name);
            }
            quickPick.hide();
        }));
        disposableStore.add(quickPick.onDidHide(() => disposableStore.dispose()));
        disposableStore.add(quickPick.onDidCustom(() => quickPick.hide()));
        disposableStore.add(quickPick.onDidTriggerItemButton(e => {
            if (e.button === this._managePreferencesButton) {
                this._commandService.executeCommand('_manageAccountPreferencesForExtension', e.item.extension.id, accountQuery.providerId);
            }
            else if (e.button === this._viewDetailsButton) {
                this._extensionsWorkbenchService.open(e.item.extension.id);
            }
        }));
        return quickPick;
    }
};
ManageTrustedExtensionsForAccountActionImpl = __decorate([
    __param(0, IExtensionService),
    __param(1, IDialogService),
    __param(2, IQuickInputService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationQueryService),
    __param(5, ICommandService),
    __param(6, IExtensionsWorkbenchService)
], ManageTrustedExtensionsForAccountActionImpl);
//# sourceMappingURL=manageTrustedExtensionsForAccountAction.js.map