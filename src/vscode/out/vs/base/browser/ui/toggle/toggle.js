/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../common/codicons.js';
import { Emitter } from '../../../common/event.js';
import { ThemeIcon } from '../../../common/themables.js';
import { $, addDisposableListener, EventType, isActiveElement } from '../../dom.js';
import { BaseActionViewItem } from '../actionbar/actionViewItems.js';
import { getBaseLayerHoverDelegate } from '../hover/hoverDelegate2.js';
import { Widget } from '../widget.js';
import './toggle.css';
export const unthemedToggleStyles = {
    inputActiveOptionBorder: '#007ACC00',
    inputActiveOptionForeground: '#FFFFFF',
    inputActiveOptionBackground: '#0E639C50'
};
export class ToggleActionViewItem extends BaseActionViewItem {
    constructor(context, action, options) {
        super(context, action, options);
        const title = this.options.keybinding ?
            `${this._action.label} (${this.options.keybinding})` : this._action.label;
        this.toggle = this._register(new Toggle({
            actionClassName: this._action.class,
            isChecked: !!this._action.checked,
            title,
            notFocusable: true,
            inputActiveOptionBackground: options.toggleStyles?.inputActiveOptionBackground,
            inputActiveOptionBorder: options.toggleStyles?.inputActiveOptionBorder,
            inputActiveOptionForeground: options.toggleStyles?.inputActiveOptionForeground,
        }));
        this._register(this.toggle.onChange(() => {
            this._action.checked = !!this.toggle && this.toggle.checked;
        }));
    }
    render(container) {
        this.element = container;
        this.element.appendChild(this.toggle.domNode);
        this.updateChecked();
        this.updateEnabled();
    }
    updateEnabled() {
        if (this.toggle) {
            if (this.isEnabled()) {
                this.toggle.enable();
                this.element?.classList.remove('disabled');
            }
            else {
                this.toggle.disable();
                this.element?.classList.add('disabled');
            }
        }
    }
    updateChecked() {
        this.toggle.checked = !!this._action.checked;
    }
    updateLabel() {
        const title = this.options.keybinding ?
            `${this._action.label} (${this.options.keybinding})` : this._action.label;
        this.toggle.setTitle(title);
    }
    focus() {
        this.toggle.domNode.tabIndex = 0;
        this.toggle.focus();
    }
    blur() {
        this.toggle.domNode.tabIndex = -1;
        this.toggle.domNode.blur();
    }
    setFocusable(focusable) {
        this.toggle.domNode.tabIndex = focusable ? 0 : -1;
    }
}
export class Toggle extends Widget {
    get onChange() { return this._onChange.event; }
    get onKeyDown() { return this._onKeyDown.event; }
    constructor(opts) {
        super();
        this._onChange = this._register(new Emitter());
        this._onKeyDown = this._register(new Emitter());
        this._opts = opts;
        this._title = this._opts.title;
        this._checked = this._opts.isChecked;
        const classes = ['monaco-custom-toggle'];
        if (this._opts.icon) {
            this._icon = this._opts.icon;
            classes.push(...ThemeIcon.asClassNameArray(this._icon));
        }
        if (this._opts.actionClassName) {
            classes.push(...this._opts.actionClassName.split(' '));
        }
        if (this._checked) {
            classes.push('checked');
        }
        this.domNode = document.createElement('div');
        this._register(getBaseLayerHoverDelegate().setupDelayedHover(this.domNode, () => ({
            content: this._title,
            style: 1 /* HoverStyle.Pointer */,
        }), this._opts.hoverLifecycleOptions));
        this.domNode.classList.add(...classes);
        if (!this._opts.notFocusable) {
            this.domNode.tabIndex = 0;
        }
        this.domNode.setAttribute('role', 'checkbox');
        this.domNode.setAttribute('aria-checked', String(this._checked));
        this.setTitle(this._opts.title);
        this.applyStyles();
        this.onclick(this.domNode, (ev) => {
            if (this.enabled) {
                this.checked = !this._checked;
                this._onChange.fire(false);
                ev.preventDefault();
            }
        });
        this._register(this.ignoreGesture(this.domNode));
        this.onkeydown(this.domNode, (keyboardEvent) => {
            if (!this.enabled) {
                return;
            }
            if (keyboardEvent.keyCode === 10 /* KeyCode.Space */ || keyboardEvent.keyCode === 3 /* KeyCode.Enter */) {
                this.checked = !this._checked;
                this._onChange.fire(true);
                keyboardEvent.preventDefault();
                keyboardEvent.stopPropagation();
                return;
            }
            this._onKeyDown.fire(keyboardEvent);
        });
    }
    get enabled() {
        return this.domNode.getAttribute('aria-disabled') !== 'true';
    }
    focus() {
        this.domNode.focus();
    }
    get checked() {
        return this._checked;
    }
    set checked(newIsChecked) {
        this._checked = newIsChecked;
        this.domNode.setAttribute('aria-checked', String(this._checked));
        this.domNode.classList.toggle('checked', this._checked);
        this.applyStyles();
    }
    setIcon(icon) {
        if (this._icon) {
            this.domNode.classList.remove(...ThemeIcon.asClassNameArray(this._icon));
        }
        this._icon = icon;
        if (this._icon) {
            this.domNode.classList.add(...ThemeIcon.asClassNameArray(this._icon));
        }
    }
    width() {
        return 2 /*margin left*/ + 2 /*border*/ + 2 /*padding*/ + 16 /* icon width */;
    }
    applyStyles() {
        if (this.domNode) {
            this.domNode.style.borderColor = (this._checked && this._opts.inputActiveOptionBorder) || '';
            this.domNode.style.color = (this._checked && this._opts.inputActiveOptionForeground) || 'inherit';
            this.domNode.style.backgroundColor = (this._checked && this._opts.inputActiveOptionBackground) || '';
        }
    }
    enable() {
        this.domNode.setAttribute('aria-disabled', String(false));
        this.domNode.classList.remove('disabled');
    }
    disable() {
        this.domNode.setAttribute('aria-disabled', String(true));
        this.domNode.classList.add('disabled');
    }
    setTitle(newTitle) {
        this._title = newTitle;
        this.domNode.setAttribute('aria-label', newTitle);
    }
    set visible(visible) {
        this.domNode.style.display = visible ? '' : 'none';
    }
    get visible() {
        return this.domNode.style.display !== 'none';
    }
}
class BaseCheckbox extends Widget {
    static { this.CLASS_NAME = 'monaco-checkbox'; }
    constructor(checkbox, domNode, styles) {
        super();
        this.checkbox = checkbox;
        this.domNode = domNode;
        this.styles = styles;
        this._onChange = this._register(new Emitter());
        this.onChange = this._onChange.event;
        this.applyStyles();
    }
    get enabled() {
        return this.checkbox.enabled;
    }
    focus() {
        this.domNode.focus();
    }
    hasFocus() {
        return isActiveElement(this.domNode);
    }
    enable() {
        this.checkbox.enable();
        this.applyStyles(true);
    }
    disable() {
        this.checkbox.disable();
        this.applyStyles(false);
    }
    setTitle(newTitle) {
        this.checkbox.setTitle(newTitle);
    }
    applyStyles(enabled = this.enabled) {
        this.domNode.style.color = (enabled ? this.styles.checkboxForeground : this.styles.checkboxDisabledForeground) || '';
        this.domNode.style.backgroundColor = (enabled ? this.styles.checkboxBackground : this.styles.checkboxDisabledBackground) || '';
        this.domNode.style.borderColor = (enabled ? this.styles.checkboxBorder : this.styles.checkboxDisabledBackground) || '';
        const size = this.styles.size || 18;
        this.domNode.style.width =
            this.domNode.style.height =
                this.domNode.style.fontSize = `${size}px`;
        this.domNode.style.fontSize = `${size - 2}px`;
    }
}
export class Checkbox extends BaseCheckbox {
    constructor(title, isChecked, styles) {
        const toggle = new Toggle({ title, isChecked, icon: Codicon.check, actionClassName: BaseCheckbox.CLASS_NAME, hoverLifecycleOptions: styles.hoverLifecycleOptions, ...unthemedToggleStyles });
        super(toggle, toggle.domNode, styles);
        this._register(toggle);
        this._register(this.checkbox.onChange(keyboard => {
            this.applyStyles();
            this._onChange.fire(keyboard);
        }));
    }
    get checked() {
        return this.checkbox.checked;
    }
    set checked(newIsChecked) {
        this.checkbox.checked = newIsChecked;
        this.applyStyles();
    }
    applyStyles(enabled) {
        if (this.checkbox.checked) {
            this.checkbox.setIcon(Codicon.check);
        }
        else {
            this.checkbox.setIcon(undefined);
        }
        super.applyStyles(enabled);
    }
}
export class TriStateCheckbox extends BaseCheckbox {
    constructor(title, _state, styles) {
        let icon;
        switch (_state) {
            case true:
                icon = Codicon.check;
                break;
            case 'mixed':
                icon = Codicon.dash;
                break;
            case false:
                icon = undefined;
                break;
        }
        const checkbox = new Toggle({
            title,
            isChecked: _state === true,
            icon,
            actionClassName: Checkbox.CLASS_NAME,
            hoverLifecycleOptions: styles.hoverLifecycleOptions,
            ...unthemedToggleStyles
        });
        super(checkbox, checkbox.domNode, styles);
        this._state = _state;
        this._register(checkbox);
        this._register(this.checkbox.onChange(keyboard => {
            this._state = this.checkbox.checked;
            this.applyStyles();
            this._onChange.fire(keyboard);
        }));
    }
    get checked() {
        return this._state;
    }
    set checked(newState) {
        if (this._state !== newState) {
            this._state = newState;
            this.checkbox.checked = newState === true;
            this.applyStyles();
        }
    }
    applyStyles(enabled) {
        switch (this._state) {
            case true:
                this.checkbox.setIcon(Codicon.check);
                break;
            case 'mixed':
                this.checkbox.setIcon(Codicon.dash);
                break;
            case false:
                this.checkbox.setIcon(undefined);
                break;
        }
        super.applyStyles(enabled);
    }
}
export class CheckboxActionViewItem extends BaseActionViewItem {
    constructor(context, action, options) {
        super(context, action, options);
        this.toggle = this._register(new Checkbox(this._action.label, !!this._action.checked, options.checkboxStyles));
        this._register(this.toggle.onChange(() => this.onChange()));
    }
    render(container) {
        this.element = container;
        this.element.classList.add('checkbox-action-item');
        this.element.appendChild(this.toggle.domNode);
        if (this.options.label && this._action.label) {
            const label = this.element.appendChild($('span.checkbox-label', undefined, this._action.label));
            this._register(addDisposableListener(label, EventType.CLICK, (e) => {
                this.toggle.checked = !this.toggle.checked;
                e.stopPropagation();
                e.preventDefault();
                this.onChange();
            }));
        }
        this.updateEnabled();
        this.updateClass();
        this.updateChecked();
    }
    onChange() {
        this._action.checked = !!this.toggle && this.toggle.checked;
        this.actionRunner.run(this._action, this._context);
    }
    updateEnabled() {
        if (this.isEnabled()) {
            this.toggle.enable();
        }
        else {
            this.toggle.disable();
        }
        if (this.action.enabled) {
            this.element?.classList.remove('disabled');
        }
        else {
            this.element?.classList.add('disabled');
        }
    }
    updateChecked() {
        this.toggle.checked = !!this._action.checked;
    }
    updateClass() {
        if (this.cssClass) {
            this.toggle.domNode.classList.remove(...this.cssClass.split(' '));
        }
        this.cssClass = this.getClass();
        if (this.cssClass) {
            this.toggle.domNode.classList.add(...this.cssClass.split(' '));
        }
    }
    focus() {
        this.toggle.domNode.tabIndex = 0;
        this.toggle.focus();
    }
    blur() {
        this.toggle.domNode.tabIndex = -1;
        this.toggle.domNode.blur();
    }
    setFocusable(focusable) {
        this.toggle.domNode.tabIndex = focusable ? 0 : -1;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL3RvZ2dsZS90b2dnbGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwwQkFBMEIsQ0FBQztBQUUxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDekQsT0FBTyxFQUFFLENBQUMsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBRXBGLE9BQU8sRUFBRSxrQkFBa0IsRUFBMEIsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sY0FBYyxDQUFDO0FBQ3RDLE9BQU8sY0FBYyxDQUFDO0FBMkJ0QixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRztJQUNuQyx1QkFBdUIsRUFBRSxXQUFXO0lBQ3BDLDJCQUEyQixFQUFFLFNBQVM7SUFDdEMsMkJBQTJCLEVBQUUsV0FBVztDQUN4QyxDQUFDO0FBRUYsTUFBTSxPQUFPLG9CQUFxQixTQUFRLGtCQUFrQjtJQUkzRCxZQUFZLE9BQWdCLEVBQUUsTUFBZSxFQUFFLE9BQStCO1FBQzdFLEtBQUssQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhDLE1BQU0sS0FBSyxHQUE0QixJQUFJLENBQUMsT0FBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEtBQThCLElB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