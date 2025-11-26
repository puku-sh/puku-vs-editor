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
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IChatEntitlementService } from '../../../../services/chat/common/chatEntitlementService.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { localize } from '../../../../../nls.js';
/**
 * Action view item for making an option selection for a contributed chat session
 * These options are provided by the relevant ChatSession Provider
 */
let ChatSessionPickerActionItem = class ChatSessionPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, initialState, delegate, actionWidgetService, contextKeyService, commandService, chatEntitlementService, keybindingService, telemetryService) {
        const { group, item } = initialState;
        const actionWithLabel = {
            ...action,
            label: item?.name || group.name,
            tooltip: group.description || group.name,
            run: () => { }
        };
        const sessionPickerActionWidgetOptions = {
            actionProvider: {
                getActions: () => {
                    // if locked, show the current option only
                    const currentOption = this.delegate.getCurrentOption();
                    if (currentOption?.locked) {
                        return [{
                                id: currentOption.id,
                                enabled: false,
                                icon: undefined,
                                checked: true,
                                class: undefined,
                                description: undefined,
                                tooltip: currentOption.name,
                                label: currentOption.name,
                                run: () => { }
                            }];
                    }
                    else {
                        return this.delegate.getAllOptions().map(optionItem => {
                            const isCurrent = optionItem.id === this.delegate.getCurrentOption()?.id;
                            return {
                                id: optionItem.id,
                                enabled: true,
                                icon: undefined,
                                checked: isCurrent,
                                class: undefined,
                                description: undefined,
                                tooltip: optionItem.name,
                                label: optionItem.name,
                                run: () => {
                                    this.delegate.setOption(optionItem);
                                }
                            };
                        });
                    }
                }
            },
            actionBarActionProvider: undefined,
        };
        super(actionWithLabel, sessionPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.delegate = delegate;
        this.currentOption = item;
        this._register(this.delegate.onDidChangeOption(newOption => {
            this.currentOption = newOption;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        const domChildren = [];
        domChildren.push(dom.$('span.chat-session-option-label', undefined, this.currentOption?.name ?? localize(5979, null)));
        domChildren.push(...renderLabelWithIcons(`$(chevron-down)`));
        dom.reset(element, ...domChildren);
        this.setAriaLabelAttributes(element);
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-sessionPicker-item');
    }
};
ChatSessionPickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IContextKeyService),
    __param(5, ICommandService),
    __param(6, IChatEntitlementService),
    __param(7, IKeybindingService),
    __param(8, ITelemetryService)
], ChatSessionPickerActionItem);
export { ChatSessionPickerActionItem };
//# sourceMappingURL=chatSessionPickerActionItem.js.map