/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ProductQualityContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CHAT_CATEGORY } from './chatActions.js';
export class ManageModelsAction extends Action2 {
    static { this.ID = 'workbench.action.chat.manageLanguageModels'; }
    constructor() {
        super({
            id: ManageModelsAction.ID,
            title: localize2('manageLanguageModels', 'Manage Language Models...'),
            category: CHAT_CATEGORY,
            precondition: ContextKeyExpr.and(ProductQualityContext.isEqualTo('stable'), ChatContextKeys.enabled, ContextKeyExpr.or(ChatContextKeys.Entitlement.planFree, ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus, ChatContextKeys.Entitlement.internal)),
            f1: true
        });
    }
    async run(accessor, ...args) {
        const languageModelsService = accessor.get(ILanguageModelsService);
        const quickInputService = accessor.get(IQuickInputService);
        const commandService = accessor.get(ICommandService);
        const vendors = languageModelsService.getVendors();
        const store = new DisposableStore();
        const quickPickItems = vendors.sort((v1, v2) => v1.displayName.localeCompare(v2.displayName)).map(vendor => ({
            label: vendor.displayName,
            vendor: vendor.vendor,
            managementCommand: vendor.managementCommand,
            buttons: vendor.managementCommand ? [{
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: `Manage ${vendor.displayName}`
                }] : undefined
        }));
        const quickPick = store.add(quickInputService.createQuickPick());
        quickPick.title = 'Manage Language Models';
        quickPick.placeholder = 'Select a provider...';
        quickPick.items = quickPickItems;
        quickPick.show();
        store.add(quickPick.onDidAccept(async () => {
            quickPick.hide();
            const selectedItem = quickPick.selectedItems[0];
            if (selectedItem) {
                const models = coalesce((await languageModelsService.selectLanguageModels({ vendor: selectedItem.vendor }, true)).map(modelIdentifier => {
                    const modelMetadata = languageModelsService.lookupLanguageModel(modelIdentifier);
                    if (!modelMetadata) {
                        return undefined;
                    }
                    return {
                        metadata: modelMetadata,
                        identifier: modelIdentifier,
                    };
                })).sort((m1, m2) => m1.metadata.name.localeCompare(m2.metadata.name));
                await this.showModelSelectorQuickpick(models, quickInputService, languageModelsService);
            }
        }));
        store.add(quickPick.onDidTriggerItemButton(async (event) => {
            const selectedItem = event.item;
            const managementCommand = selectedItem.managementCommand;
            if (managementCommand) {
                commandService.executeCommand(managementCommand, selectedItem.vendor);
            }
        }));
        store.add(quickPick.onDidHide(() => {
            store.dispose();
        }));
    }
    async showModelSelectorQuickpick(modelsAndIdentifiers, quickInputService, languageModelsService) {
        const store = new DisposableStore();
        const modelItems = modelsAndIdentifiers.map(model => ({
            label: model.metadata.name,
            detail: model.metadata.id,
            modelId: model.identifier,
            vendor: model.metadata.vendor,
            picked: model.metadata.isUserSelectable
        }));
        if (modelItems.length === 0) {
            store.dispose();
            return;
        }
        const quickPick = quickInputService.createQuickPick();
        quickPick.items = modelItems;
        quickPick.title = 'Manage Language Models';
        quickPick.placeholder = 'Select language models...';
        quickPick.selectedItems = modelItems.filter(item => item.picked);
        quickPick.canSelectMany = true;
        quickPick.show();
        // Handle selection
        store.add(quickPick.onDidAccept(async () => {
            quickPick.hide();
            const items = quickPick.items;
            items.forEach(item => {
                languageModelsService.updateModelPickerPreference(item.modelId, quickPick.selectedItems.includes(item));
            });
        }));
        store.add(quickPick.onDidHide(() => {
            store.dispose();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlTW9kZWxzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL21hbmFnZU1vZGVsc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQWtCLE1BQU0seURBQXlELENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBMkMsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFZakQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLE9BQU87YUFDOUIsT0FBRSxHQUFHLDRDQUE0QyxDQUFDO0lBRWxFO1FBQ0MsS0FBSyxDQUFDO1lB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