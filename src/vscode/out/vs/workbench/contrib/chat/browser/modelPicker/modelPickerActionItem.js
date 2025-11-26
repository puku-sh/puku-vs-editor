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
import { localize } from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ChatEntitlement, IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
import { ManageModelsAction } from '../actions/manageModelsActions.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { MANAGE_CHAT_COMMAND_ID } from '../../common/constants.js';
import { TelemetryTrustedValue } from '../../../../../platform/telemetry/common/telemetryUtils.js';
function modelDelegateToWidgetActionsProvider(delegate, telemetryService) {
    return {
        getActions: () => {
            return delegate.getModels().map(model => {
                return {
                    id: model.metadata.id,
                    enabled: true,
                    icon: model.metadata.statusIcon,
                    checked: model.identifier === delegate.getCurrentModel()?.identifier,
                    category: model.metadata.modelPickerCategory || DEFAULT_MODEL_PICKER_CATEGORY,
                    class: undefined,
                    description: model.metadata.detail,
                    tooltip: model.metadata.tooltip ?? model.metadata.name,
                    label: model.metadata.name,
                    run: () => {
                        const previousModel = delegate.getCurrentModel();
                        telemetryService.publicLog2('chat.modelChange', {
                            fromModel: previousModel?.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(previousModel.identifier) : 'unknown',
                            toModel: model.metadata.vendor === 'copilot' ? new TelemetryTrustedValue(model.identifier) : 'unknown'
                        });
                        delegate.setModel(model);
                    }
                };
            });
        }
    };
}
function getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService) {
    const actionProvider = {
        getActions: () => {
            const additionalActions = [];
            if (chatEntitlementService.entitlement === ChatEntitlement.Free ||
                chatEntitlementService.entitlement === ChatEntitlement.Pro ||
                chatEntitlementService.entitlement === ChatEntitlement.ProPlus ||
                chatEntitlementService.isInternal) {
                additionalActions.push({
                    id: 'manageModels',
                    label: localize('chat.manageModels', "Manage Models..."),
                    enabled: true,
                    tooltip: localize('chat.manageModels.tooltip', "Manage Language Models"),
                    class: undefined,
                    run: () => {
                        const commandId = ManageModelsAction.ID;
                        commandService.executeCommand(productService.quality === 'stable' ? commandId : MANAGE_CHAT_COMMAND_ID);
                    }
                });
            }
            // Add sign-in / upgrade option if entitlement is anonymous / free / new user
            const isNewOrAnonymousUser = !chatEntitlementService.sentiment.installed ||
                chatEntitlementService.entitlement === ChatEntitlement.Available ||
                chatEntitlementService.anonymous ||
                chatEntitlementService.entitlement === ChatEntitlement.Unknown;
            if (isNewOrAnonymousUser || chatEntitlementService.entitlement === ChatEntitlement.Free) {
                additionalActions.push({
                    id: 'moreModels',
                    label: isNewOrAnonymousUser ? localize('chat.moreModels', "Add Language Models") : localize('chat.morePremiumModels', "Add Premium Models"),
                    enabled: true,
                    tooltip: isNewOrAnonymousUser ? localize('chat.moreModels.tooltip', "Add Language Models") : localize('chat.morePremiumModels.tooltip', "Add Premium Models"),
                    class: undefined,
                    run: () => {
                        const commandId = isNewOrAnonymousUser ? 'workbench.action.chat.triggerSetup' : 'workbench.action.chat.upgradePlan';
                        commandService.executeCommand(commandId);
                    }
                });
            }
            return additionalActions;
        }
    };
    return actionProvider;
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
let ModelPickerActionItem = class ModelPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, currentModel, widgetOptions, delegate, actionWidgetService, contextKeyService, commandService, chatEntitlementService, keybindingService, telemetryService, productService) {
        // Modify the original action with a different label and make it show the current model
        const actionWithLabel = {
            ...action,
            label: currentModel?.metadata.name ?? localize('chat.modelPicker.label', "Pick Model"),
            tooltip: localize('chat.modelPicker.label', "Pick Model"),
            run: () => { }
        };
        const modelPickerActionWidgetOptions = {
            actionProvider: modelDelegateToWidgetActionsProvider(delegate, telemetryService),
            actionBarActionProvider: getModelPickerActionBarActionProvider(commandService, chatEntitlementService, productService)
        };
        super(actionWithLabel, widgetOptions ?? modelPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.currentModel = currentModel;
        // Listen for model changes from the delegate
        this._register(delegate.onDidChangeModel(model => {
            this.currentModel = model;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        const domChildren = [];
        if (this.currentModel?.metadata.statusIcon) {
            domChildren.push(...renderLabelWithIcons(`\$(${this.currentModel.metadata.statusIcon.id})`));
        }
        domChildren.push(dom.$('span.chat-model-label', undefined, this.currentModel?.metadata.name ?? localize('chat.modelPicker.label', "Pick Model")));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionItem = __decorate([
    __param(4, IActionWidgetService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, IChatEntitlementService),
    __param(8, IKeybindingService),
    __param(9, ITelemetryService),
    __param(10, IProductService)
], ModelPickerActionItem);
export { ModelPickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxQaWNrZXJBY3Rpb25JdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL21vZGVsUGlja2VyL21vZGVsUGlja2VyQWN0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUNuSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ3RILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNuRSxP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