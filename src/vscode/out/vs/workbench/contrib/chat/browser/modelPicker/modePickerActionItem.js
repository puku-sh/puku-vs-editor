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
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { coalesce } from '../../../../../base/common/arrays.js';
import { groupBy } from '../../../../../base/common/collections.js';
import { autorun } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { getFlatActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatMode, IChatModeService } from '../../common/chatModes.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { PromptsStorage } from '../../common/promptSyntax/service/promptsService.js';
import { getOpenChatActionIdForMode } from '../actions/chatActions.js';
import { ToggleAgentModeActionId } from '../actions/chatExecuteActions.js';
let ModePickerActionItem = class ModePickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, delegate, actionWidgetService, chatAgentService, keybindingService, contextKeyService, chatModeService, menuService, commandService, productService) {
        const builtInCategory = { label: localize('built-in', "Built-In"), order: 0 };
        const customCategory = { label: localize('custom', "Custom"), order: 1 };
        const makeAction = (mode, currentMode) => ({
            ...action,
            id: getOpenChatActionIdForMode(mode),
            label: mode.label.get(),
            class: undefined,
            enabled: true,
            checked: currentMode.id === mode.id,
            tooltip: chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode.kind)?.description ?? action.tooltip,
            run: async () => {
                const result = await commandService.executeCommand(ToggleAgentModeActionId, { modeId: mode.id, sessionResource: this.delegate.sessionResource() });
                this.renderLabel(this.element);
                return result;
            },
            category: builtInCategory
        });
        const makeActionFromCustomMode = (mode, currentMode) => ({
            ...makeAction(mode, currentMode),
            tooltip: mode.description.get() ?? chatAgentService.getDefaultAgent(ChatAgentLocation.Chat, mode.kind)?.description ?? action.tooltip,
            category: customCategory
        });
        const actionProvider = {
            getActions: () => {
                const modes = chatModeService.getModes();
                const currentMode = delegate.currentMode.get();
                const agentMode = modes.builtin.find(mode => mode.id === ChatMode.Agent.id);
                const otherBuiltinModes = modes.builtin.filter(mode => mode.id !== ChatMode.Agent.id);
                const customModes = groupBy(modes.custom, mode => mode.source?.storage === PromptsStorage.extension && mode.source.extensionId.value === productService.defaultChatAgent?.chatExtensionId ?
                    'builtin' : 'custom');
                const customBuiltinModeActions = customModes.builtin?.map(mode => {
                    const action = makeActionFromCustomMode(mode, currentMode);
                    action.category = builtInCategory;
                    return action;
                }) ?? [];
                const orderedModes = coalesce([
                    agentMode && makeAction(agentMode, currentMode),
                    ...customBuiltinModeActions,
                    ...otherBuiltinModes.map(mode => mode && makeAction(mode, currentMode)),
                    ...customModes.custom?.map(mode => makeActionFromCustomMode(mode, currentMode)) ?? []
                ]);
                return orderedModes;
            }
        };
        const modePickerActionWidgetOptions = {
            actionProvider,
            actionBarActionProvider: {
                getActions: () => this.getModePickerActionBarActions()
            },
            showItemKeybindings: true
        };
        super(action, modePickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.delegate = delegate;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        // Listen to changes in the current mode and its properties
        this._register(autorun(reader => {
            this.delegate.currentMode.read(reader).label.read(reader); // use the reader so autorun tracks it
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    getModePickerActionBarActions() {
        const menuActions = this.menuService.createMenu(MenuId.ChatModePicker, this.contextKeyService);
        const menuContributions = getFlatActionBarActions(menuActions.getActions({ renderShortTitle: true }));
        menuActions.dispose();
        return menuContributions;
    }
    renderLabel(element) {
        this.setAriaLabelAttributes(element);
        const state = this.delegate.currentMode.get().label.get();
        dom.reset(element, dom.$('span.chat-model-label', undefined, state), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModePickerActionItem = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IChatAgentService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, IChatModeService),
    __param(7, IMenuService),
    __param(8, ICommandService),
    __param(9, IProductService)
], ModePickerActionItem);
export { ModePickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZVBpY2tlckFjdGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvbW9kZWxQaWNrZXIvbW9kZVBpY2tlckFjdGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxPQUFPLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDbkksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0VBQW9FLENBQUM7QUFDN0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQWtCLE1BQU0sbURBQW1ELENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFFcEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUs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