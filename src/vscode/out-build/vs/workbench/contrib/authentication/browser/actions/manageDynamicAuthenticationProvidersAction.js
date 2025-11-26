/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IDynamicAuthenticationProviderStorageService } from '../../../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { IAuthenticationService } from '../../../../services/authentication/common/authentication.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
export class RemoveDynamicAuthenticationProvidersAction extends Action2 {
    static { this.ID = 'workbench.action.removeDynamicAuthenticationProviders'; }
    constructor() {
        super({
            id: RemoveDynamicAuthenticationProvidersAction.ID,
            title: localize2(4881, 'Remove Dynamic Authentication Providers'),
            category: localize2(4882, 'Authentication'),
            f1: true
        });
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const dynamicAuthStorageService = accessor.get(IDynamicAuthenticationProviderStorageService);
        const authenticationService = accessor.get(IAuthenticationService);
        const dialogService = accessor.get(IDialogService);
        const interactedProviders = dynamicAuthStorageService.getInteractedProviders();
        if (interactedProviders.length === 0) {
            await dialogService.info(localize(4873, null), localize(4874, null));
            return;
        }
        const items = interactedProviders.map(provider => ({
            label: provider.label,
            description: localize(4875, null, provider.clientId),
            provider
        }));
        const selected = await quickInputService.pick(items, {
            placeHolder: localize(4876, null),
            canPickMany: true
        });
        if (!selected || selected.length === 0) {
            return;
        }
        // Confirm deletion
        const providerNames = selected.map(item => item.provider.label).join(', ');
        const message = selected.length === 1
            ? localize(4877, null, providerNames)
            : localize(4878, null, selected.length, providerNames);
        const result = await dialogService.confirm({
            message,
            detail: localize(4879, null),
            primaryButton: localize(4880, null),
            type: 'warning'
        });
        if (!result.confirmed) {
            return;
        }
        // Remove the selected providers
        for (const item of selected) {
            const providerId = item.provider.providerId;
            // Unregister from authentication service if still registered
            if (authenticationService.isAuthenticationProviderRegistered(providerId)) {
                authenticationService.unregisterAuthenticationProvider(providerId);
            }
            // Remove from dynamic storage service
            await dynamicAuthStorageService.removeDynamicProvider(providerId);
        }
    }
}
//# sourceMappingURL=manageDynamicAuthenticationProvidersAction.js.map