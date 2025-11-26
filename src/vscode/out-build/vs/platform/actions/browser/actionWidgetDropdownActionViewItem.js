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
import { $, append } from '../../../base/browser/dom.js';
import { BaseActionViewItem } from '../../../base/browser/ui/actionbar/actionViewItems.js';
import { getBaseLayerHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegate2.js';
import { getDefaultHoverDelegate } from '../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IActionWidgetService } from '../../actionWidget/browser/actionWidget.js';
import { ActionWidgetDropdown } from '../../actionWidget/browser/actionWidgetDropdown.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
/**
 * Action view item for the custom action widget dropdown widget.
 * Very closely based off of `DropdownMenuActionViewItem`, would be good to have some code re-use in the future
 */
let ActionWidgetDropdownActionViewItem = class ActionWidgetDropdownActionViewItem extends BaseActionViewItem {
    constructor(action, actionWidgetOptions, _actionWidgetService, _keybindingService, _contextKeyService) {
        super(undefined, action);
        this.actionWidgetOptions = actionWidgetOptions;
        this._actionWidgetService = _actionWidgetService;
        this._keybindingService = _keybindingService;
        this._contextKeyService = _contextKeyService;
        this.actionItem = null;
    }
    render(container) {
        this.actionItem = container;
        const labelRenderer = (el) => {
            this.element = append(el, $('a.action-label'));
            return this.renderLabel(this.element);
        };
        this.actionWidgetDropdown = this._register(new ActionWidgetDropdown(container, { ...this.actionWidgetOptions, labelRenderer }, this._actionWidgetService, this._keybindingService));
        this._register(this.actionWidgetDropdown.onDidChangeVisibility(visible => {
            this.element?.setAttribute('aria-expanded', `${visible}`);
        }));
        this.updateTooltip();
        this.updateEnabled();
    }
    renderLabel(element) {
        // todo@aeschli: remove codicon, should come through `this.options.classNames`
        element.classList.add('codicon');
        if (this._action.label) {
            this._register(getBaseLayerHoverDelegate().setupManagedHover(this.options.hoverDelegate ?? getDefaultHoverDelegate('mouse'), element, this._action.label));
        }
        return null;
    }
    updateAriaLabel() {
        if (this.element) {
            this.setAriaLabelAttributes(this.element);
        }
    }
    setAriaLabelAttributes(element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-haspopup', 'true');
        element.setAttribute('aria-expanded', 'false');
        element.ariaLabel = (this.getTooltip() + ' - ' + (element.textContent || this._action.label)) || '';
    }
    getTooltip() {
        const keybinding = this._keybindingService.lookupKeybinding(this.action.id, this._contextKeyService);
        const keybindingLabel = keybinding && keybinding.getLabel();
        const tooltip = this.action.tooltip ?? this.action.label;
        return keybindingLabel
            ? `${tooltip} (${keybindingLabel})`
            : tooltip;
    }
    show() {
        this.actionWidgetDropdown?.show();
    }
    updateEnabled() {
        const disabled = !this.action.enabled;
        this.actionItem?.classList.toggle('disabled', disabled);
        this.element?.classList.toggle('disabled', disabled);
        this.actionWidgetDropdown?.setEnabled(!disabled);
    }
};
ActionWidgetDropdownActionViewItem = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IKeybindingService),
    __param(4, IContextKeyService)
], ActionWidgetDropdownActionViewItem);
export { ActionWidgetDropdownActionViewItem };
//# sourceMappingURL=actionWidgetDropdownActionViewItem.js.map