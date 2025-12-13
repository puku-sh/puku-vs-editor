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
        domChildren.push(dom.$('span.chat-session-option-label', undefined, this.currentOption?.name ?? localize('chat.sessionPicker.label', "Pick Option")));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25QaWNrZXJBY3Rpb25JdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXNzaW9ucy9jaGF0U2Vzc2lvblBpY2tlckFjdGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDckcsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFHbkksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBVWpEOzs7R0FHRztBQUNJLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsa0NBQWtDO0lBRWxGLFlBQ0MsTUFBZSxFQUNmLFlBQTBHLEVBQ3pGLFFBQW9DLEVBQy9CLG1CQUF5QyxFQUMzQyxpQkFBcUMsRUFDeEMsY0FBK0IsRUFDdkIsc0JBQStDLEVBQ3BELGlCQUFxQyxFQUN0QyxnQkFBbUM7UUFFdEQsTUFBTSxFQUFF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