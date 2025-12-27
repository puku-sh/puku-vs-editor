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
var QuickInputTreeRenderer_1;
import * as cssJs from '../../../../base/browser/cssValue.js';
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { TriStateCheckbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { defaultCheckboxStyles } from '../../../theme/browser/defaultStyles.js';
import { isDark } from '../../../theme/common/theme.js';
import { escape } from '../../../../base/common/strings.js';
import { IThemeService } from '../../../theme/common/themeService.js';
import { quickInputButtonToAction } from '../quickInputUtils.js';
const $ = dom.$;
export class QuickInputCheckboxStateHandler extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
    }
    setCheckboxState(node, checked) {
        this._onDidChangeCheckboxState.fire({ item: node, checked });
    }
}
let QuickInputTreeRenderer = class QuickInputTreeRenderer extends Disposable {
    static { QuickInputTreeRenderer_1 = this; }
    static { this.ID = 'quickInputTreeElement'; }
    constructor(_hoverDelegate, _buttonTriggeredEmitter, onCheckedEvent, _checkboxStateHandler, _themeService) {
        super();
        this._hoverDelegate = _hoverDelegate;
        this._buttonTriggeredEmitter = _buttonTriggeredEmitter;
        this.onCheckedEvent = onCheckedEvent;
        this._checkboxStateHandler = _checkboxStateHandler;
        this._themeService = _themeService;
        this.templateId = QuickInputTreeRenderer_1.ID;
    }
    renderTemplate(container) {
        const store = new DisposableStore();
        // Main entry container
        const entry = dom.append(container, $('.quick-input-tree-entry'));
        const checkbox = store.add(new TriStateCheckbox('', false, { ...defaultCheckboxStyles, size: 15 }));
        entry.appendChild(checkbox.domNode);
        const checkboxLabel = dom.append(entry, $('label.quick-input-tree-label'));
        const rows = dom.append(checkboxLabel, $('.quick-input-tree-rows'));
        const row1 = dom.append(rows, $('.quick-input-tree-row'));
        const icon = dom.prepend(row1, $('.quick-input-tree-icon'));
        const label = store.add(new IconLabel(row1, {
            supportHighlights: true,
            supportDescriptionHighlights: true,
            supportIcons: true,
            hoverDelegate: this._hoverDelegate
        }));
        const actionBar = store.add(new ActionBar(entry, this._hoverDelegate ? { hoverDelegate: this._hoverDelegate } : undefined));
        actionBar.domNode.classList.add('quick-input-tree-entry-action-bar');
        return {
            toDisposeTemplate: store,
            entry,
            checkbox,
            icon,
            label,
            actionBar,
            toDisposeElement: new DisposableStore(),
        };
    }
    renderElement(node, _index, templateData, _details) {
        const store = templateData.toDisposeElement;
        const quickTreeItem = node.element;
        // Checkbox
        if (quickTreeItem.pickable === false) {
            // Hide checkbox for non-pickable items
            templateData.checkbox.domNode.style.display = 'none';
        }
        else {
            const checkbox = templateData.checkbox;
            checkbox.domNode.style.display = '';
            checkbox.checked = quickTreeItem.checked ?? false;
            store.add(Event.filter(this.onCheckedEvent, e => e.item === quickTreeItem)(e => checkbox.checked = e.checked));
            if (quickTreeItem.disabled) {
                checkbox.disable();
            }
            store.add(checkbox.onChange((e) => this._checkboxStateHandler.setCheckboxState(quickTreeItem, checkbox.checked)));
        }
        // Icon
        if (quickTreeItem.iconPath) {
            const icon = isDark(this._themeService.getColorTheme().type) ? quickTreeItem.iconPath.dark : (quickTreeItem.iconPath.light ?? quickTreeItem.iconPath.dark);
            const iconUrl = URI.revive(icon);
            templateData.icon.className = 'quick-input-tree-icon';
            templateData.icon.style.backgroundImage = cssJs.asCSSUrl(iconUrl);
        }
        else {
            templateData.icon.style.backgroundImage = '';
            templateData.icon.className = quickTreeItem.iconClass ? `quick-input-tree-icon ${quickTreeItem.iconClass}` : '';
        }
        const { labelHighlights: matches, descriptionHighlights: descriptionMatches } = node.filterData || {};
        // Label and Description
        let descriptionTitle;
        // NOTE: If we bring back quick tool tips, we need to check that here like we do in the QuickInputListRenderer
        if (quickTreeItem.description) {
            descriptionTitle = {
                markdown: {
                    value: escape(quickTreeItem.description),
                    supportThemeIcons: true
                },
                markdownNotSupportedFallback: quickTreeItem.description
            };
        }
        templateData.label.setLabel(quickTreeItem.label, quickTreeItem.description, {
            matches,
            descriptionMatches,
            extraClasses: quickTreeItem.iconClasses,
            italic: quickTreeItem.italic,
            strikethrough: quickTreeItem.strikethrough,
            labelEscapeNewLines: true,
            descriptionTitle
        });
        // Action Bar
        const buttons = quickTreeItem.buttons;
        if (buttons && buttons.length) {
            templateData.actionBar.push(buttons.map((button, index) => quickInputButtonToAction(button, `tree-${index}`, () => this._buttonTriggeredEmitter.fire({ item: quickTreeItem, button }))), { icon: true, label: false });
            templateData.entry.classList.add('has-actions');
        }
        else {
            templateData.entry.classList.remove('has-actions');
        }
    }
    disposeElement(_element, _index, templateData, _details) {
        templateData.toDisposeElement.clear();
        templateData.actionBar.clear();
    }
    disposeTemplate(templateData) {
        templateData.toDisposeElement.dispose();
        templateData.toDisposeTemplate.dispose();
    }
};
QuickInputTreeRenderer = QuickInputTreeRenderer_1 = __decorate([
    __param(4, IThemeService)
], QuickInputTreeRenderer);
export { QuickInputTreeRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci90cmVlL3F1aWNrSW5wdXRUcmVlUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sc0NBQXNDLENBQUM7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFHL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRWhGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFHakUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQztBQVloQixNQUFNLE9BQU8sOEJBQWtDLFNBQVEsVUFBVTtJ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