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
import { IActionWidgetService } from './actionWidget.js';
import { BaseDropdown } from '../../../base/browser/ui/dropdown/dropdown.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Codicon } from '../../../base/common/codicons.js';
import { getActiveElement, isHTMLElement } from '../../../base/browser/dom.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
/**
 * Action widget dropdown is a dropdown that uses the action widget under the hood to simulate a native dropdown menu
 * The benefits of this include non native features such as headers, descriptions, icons, and button bar
 */
let ActionWidgetDropdown = class ActionWidgetDropdown extends BaseDropdown {
    constructor(container, _options, actionWidgetService, keybindingService) {
        super(container, _options);
        this._options = _options;
        this.actionWidgetService = actionWidgetService;
        this.keybindingService = keybindingService;
        this.enabled = true;
    }
    show() {
        if (!this.enabled) {
            return;
        }
        let actionBarActions = this._options.actionBarActions ?? this._options.actionBarActionProvider?.getActions() ?? [];
        const actions = this._options.actions ?? this._options.actionProvider?.getActions() ?? [];
        const actionWidgetItems = [];
        const actionsByCategory = new Map();
        for (const action of actions) {
            let category = action.category;
            if (!category) {
                category = { label: '', order: Number.MIN_SAFE_INTEGER };
            }
            if (!actionsByCategory.has(category.label)) {
                actionsByCategory.set(category.label, []);
            }
            actionsByCategory.get(category.label).push(action);
        }
        // Sort categories by order
        const sortedCategories = Array.from(actionsByCategory.entries())
            .sort((a, b) => {
            const aOrder = a[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            const bOrder = b[1][0]?.category?.order ?? Number.MAX_SAFE_INTEGER;
            return aOrder - bOrder;
        });
        for (let i = 0; i < sortedCategories.length; i++) {
            const [, categoryActions] = sortedCategories[i];
            // Push actions for each category
            for (const action of categoryActions) {
                actionWidgetItems.push({
                    item: action,
                    tooltip: action.tooltip,
                    description: action.description,
                    kind: "action" /* ActionListItemKind.Action */,
                    canPreview: false,
                    group: { title: '', icon: action.icon ?? ThemeIcon.fromId(action.checked ? Codicon.check.id : Codicon.blank.id) },
                    disabled: false,
                    hideIcon: false,
                    label: action.label,
                    keybinding: this._options.showItemKeybindings ?
                        this.keybindingService.lookupKeybinding(action.id) :
                        undefined,
                });
            }
            // Add separator at the end of each category except the last one
            if (i < sortedCategories.length - 1) {
                actionWidgetItems.push({
                    label: '',
                    kind: "separator" /* ActionListItemKind.Separator */,
                    canPreview: false,
                    disabled: false,
                    hideIcon: false,
                });
            }
        }
        const previouslyFocusedElement = getActiveElement();
        const actionWidgetDelegate = {
            onSelect: (action, preview) => {
                this.actionWidgetService.hide();
                action.run();
            },
            onHide: () => {
                if (isHTMLElement(previouslyFocusedElement)) {
                    previouslyFocusedElement.focus();
                }
            }
        };
        actionBarActions = actionBarActions.map(action => ({
            ...action,
            run: async (...args) => {
                this.actionWidgetService.hide();
                return action.run(...args);
            }
        }));
        const accessibilityProvider = {
            isChecked(element) {
                return element.kind === "action" /* ActionListItemKind.Action */ && !!element?.item?.checked;
            },
            getRole: (e) => {
                switch (e.kind) {
                    case "action" /* ActionListItemKind.Action */:
                        return 'menuitemcheckbox';
                    case "separator" /* ActionListItemKind.Separator */:
                        return 'separator';
                    default:
                        return 'separator';
                }
            },
            getWidgetRole: () => 'menu',
        };
        this.actionWidgetService.show(this._options.label ?? '', false, actionWidgetItems, actionWidgetDelegate, this.element, undefined, actionBarActions, accessibilityProvider);
    }
    setEnabled(enabled) {
        this.enabled = enabled;
    }
};
ActionWidgetDropdown = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IKeybindingService)
], ActionWidgetDropdown);
export { ActionWidgetDropdown };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uV2lkZ2V0RHJvcGRvd24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25XaWRnZXQvYnJvd3Nlci9hY3Rpb25XaWRnZXREcm9wZG93bi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUV6RCxPQUFPLEVBQUUsWUFBWSxFQUF5QyxNQUFNLCtDQUErQyxDQUFDO0FBRXBILE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGFBQWEsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBeUIzRTs7O0dBR0c7QUFDSSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFlBQVk7SUFJckQsWUFDQyxTQUFzQixFQUNMLFFBQXNDLEVBQ2pDLG1CQUEwRCxFQUM1RCxpQkFBc0Q7UUFFMUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUpWLGFBQVEsR0FBUixRQUFRLENBQThCO1FBQ2hCLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBc0I7UUFDM0Msc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQU5uRSxZQUFPLEdBQVksSUFBSSxDQUFDO0lBU2hDLENBQUM7SUFFUSxJQUFJO1FBQ1osSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksZ0JBQWdCLEdBQUcs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