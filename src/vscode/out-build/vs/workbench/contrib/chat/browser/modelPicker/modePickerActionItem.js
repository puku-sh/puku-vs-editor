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
        const builtInCategory = { label: localize(6230, null), order: 0 };
        const customCategory = { label: localize(6231, null), order: 1 };
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
//# sourceMappingURL=modePickerActionItem.js.map