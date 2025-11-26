/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../base/common/event.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { localize } from '../../../../nls.js';
import { QuickInput } from '../quickInput.js';
import { getParentNodeState } from './quickInputTree.js';
// Contains the API
export class QuickTree extends QuickInput {
    static { this.DEFAULT_ARIA_LABEL = localize('quickInputBox.ariaLabel', "Type to narrow down results."); }
    constructor(ui) {
        super(ui);
        this.type = "quickTree" /* QuickInputType.QuickTree */;
        this._value = observableValue('value', '');
        this._ariaLabel = observableValue('ariaLabel', undefined);
        this._placeholder = observableValue('placeholder', undefined);
        this._matchOnDescription = observableValue('matchOnDescription', false);
        this._matchOnLabel = observableValue('matchOnLabel', true);
        this._sortByLabel = observableValue('sortByLabel', true);
        this._activeItems = observableValue('activeItems', []);
        this._itemTree = observableValue('itemTree', []);
        this.onDidChangeValue = Event.fromObservable(this._value, this._store);
        this.onDidChangeActive = Event.fromObservable(this._activeItems, this._store);
        this._onDidChangeCheckedLeafItems = this._register(new Emitter());
        this.onDidChangeCheckedLeafItems = this._onDidChangeCheckedLeafItems.event;
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
        this.onDidAccept = ui.onDidAccept;
        this._registerAutoruns();
        this._register(ui.tree.onDidChangeCheckedLeafItems(e => this._onDidChangeCheckedLeafItems.fire(e)));
        this._register(ui.tree.onDidChangeCheckboxState(e => this._onDidChangeCheckboxState.fire(e.item)));
        // Sync active items with tree focus changes
        this._register(ui.tree.tree.onDidChangeFocus(e => {
            this._activeItems.set(ui.tree.getActiveItems(), undefined);
        }));
    }
    get value() { return this._value.get(); }
    set value(value) { this._value.set(value, undefined); }
    get ariaLabel() { return this._ariaLabel.get(); }
    set ariaLabel(ariaLabel) { this._ariaLabel.set(ariaLabel, undefined); }
    get placeholder() { return this._placeholder.get(); }
    set placeholder(placeholder) { this._placeholder.set(placeholder, undefined); }
    get matchOnDescription() { return this._matchOnDescription.get(); }
    set matchOnDescription(matchOnDescription) { this._matchOnDescription.set(matchOnDescription, undefined); }
    get matchOnLabel() { return this._matchOnLabel.get(); }
    set matchOnLabel(matchOnLabel) { this._matchOnLabel.set(matchOnLabel, undefined); }
    get sortByLabel() { return this._sortByLabel.get(); }
    set sortByLabel(sortByLabel) { this._sortByLabel.set(sortByLabel, undefined); }
    get activeItems() { return this._activeItems.get(); }
    set activeItems(activeItems) { this._activeItems.set(activeItems, undefined); }
    get itemTree() { return this._itemTree.get(); }
    get onDidTriggerItemButton() {
        // Is there a cleaner way to avoid the `as` cast here?
        return this.ui.tree.onDidTriggerButton;
    }
    // TODO: Fix the any casting
    // eslint-disable-next-line local/code-no-any-casts, @typescript-eslint/no-explicit-any
    get checkedLeafItems() { return this.ui.tree.getCheckedLeafItems(); }
    setItemTree(itemTree) {
        this._itemTree.set(itemTree, undefined);
    }
    getParent(element) {
        return this.ui.tree.tree.getParentElement(element) ?? undefined;
    }
    setCheckboxState(element, checked) {
        this.ui.tree.check(element, checked);
    }
    expand(element) {
        this.ui.tree.tree.expand(element);
    }
    collapse(element) {
        this.ui.tree.tree.collapse(element);
    }
    isCollapsed(element) {
        return this.ui.tree.tree.isCollapsed(element);
    }
    focusOnInput() {
        this.ui.inputBox.setFocus();
    }
    show() {
        if (!this.visible) {
            const visibilities = {
                title: !!this.title || !!this.step || !!this.titleButtons.length,
                description: !!this.description,
                checkAll: true,
                checkBox: true,
                inputBox: true,
                progressBar: true,
                visibleCount: true,
                count: true,
                ok: true,
                list: false,
                tree: true,
                message: !!this.validationMessage,
                customButton: false
            };
            this.ui.setVisibilities(visibilities);
            this.visibleDisposables.add(this.ui.inputBox.onDidChange(value => {
                this._value.set(value, undefined);
            }));
            this.visibleDisposables.add(this.ui.tree.onDidChangeCheckboxState((e) => {
                const checkAllState = getParentNodeState([...this.ui.tree.tree.getNode().children]);
                if (this.ui.checkAll.checked !== checkAllState) {
                    this.ui.checkAll.checked = checkAllState;
                }
            }));
            this.visibleDisposables.add(this.ui.checkAll.onChange(_e => {
                const checked = this.ui.checkAll.checked;
                this.ui.tree.checkAll(checked);
            }));
            this.visibleDisposables.add(this.ui.tree.onDidChangeCheckedLeafItems(e => {
                this.ui.count.setCount(e.length);
            }));
        }
        super.show(); // TODO: Why have show() bubble up while update() trickles down?
        // Initial state
        // TODO@TylerLeonhardt: Without this setTimeout, the screen reader will not read out
        // the final count of checked items correctly. Investigate a better way
        // to do this. ref https://github.com/microsoft/vscode/issues/258617
        setTimeout0(() => this.ui.count.setCount(this.ui.tree.getCheckedLeafItems().length));
        const checkAllState = getParentNodeState([...this.ui.tree.tree.getNode().children]);
        if (this.ui.checkAll.checked !== checkAllState) {
            this.ui.checkAll.checked = checkAllState;
        }
    }
    update() {
        if (!this.visible) {
            return;
        }
        const visibilities = {
            title: !!this.title || !!this.step || !!this.titleButtons.length,
            description: !!this.description,
            checkAll: true,
            checkBox: true,
            inputBox: true,
            progressBar: true,
            visibleCount: true,
            count: true,
            ok: true,
            tree: true,
            message: !!this.validationMessage
        };
        this.ui.setVisibilities(visibilities);
        super.update();
    }
    _registerListeners() {
    }
    // TODO: Move to using autoruns instead of update function
    _registerAutoruns() {
        this.registerVisibleAutorun(reader => {
            const value = this._value.read(reader);
            this.ui.inputBox.value = value;
            this.ui.tree.filter(value);
        });
        this.registerVisibleAutorun(reader => {
            let ariaLabel = this._ariaLabel.read(reader);
            if (!ariaLabel) {
                ariaLabel = this.placeholder || QuickTree.DEFAULT_ARIA_LABEL;
                // If we have a title, include it in the aria label.
                if (this.title) {
                    ariaLabel += ` - ${this.title}`;
                }
            }
            if (this.ui.list.ariaLabel !== ariaLabel) {
                this.ui.list.ariaLabel = ariaLabel ?? null;
            }
            if (this.ui.inputBox.ariaLabel !== ariaLabel) {
                this.ui.inputBox.ariaLabel = ariaLabel ?? 'input';
            }
        });
        this.registerVisibleAutorun(reader => {
            const placeholder = this._placeholder.read(reader);
            if (this.ui.inputBox.placeholder !== placeholder) {
                this.ui.inputBox.placeholder = placeholder ?? '';
            }
        });
        this.registerVisibleAutorun((reader) => {
            const matchOnLabel = this._matchOnLabel.read(reader);
            const matchOnDescription = this._matchOnDescription.read(reader);
            this.ui.tree.updateFilterOptions({ matchOnLabel, matchOnDescription });
        });
        this.registerVisibleAutorun((reader) => {
            const sortByLabel = this._sortByLabel.read(reader);
            this.ui.tree.sortByLabel = sortByLabel;
        });
        this.registerVisibleAutorun((reader) => {
            const itemTree = this._itemTree.read(reader);
            this.ui.tree.setTreeData(itemTree);
        });
    }
    registerVisibleAutorun(fn) {
        this._register(autorun((reader) => {
            if (this._visible.read(reader)) {
                fn(reader);
            }
        }));
    }
    focus(focus) {
        this.ui.tree.focus(focus);
        // To allow things like space to check/uncheck items
        this.ui.tree.tree.domFocus();
    }
    /**
     * Programmatically accepts an item. Used internally for keyboard navigation.
     * @param inBackground Whether you are accepting an item in the background and keeping the picker open.
     */
    accept(_inBackground) {
        // No-op for now since we expect only multi-select quick trees which don't need
        // the speed of accept.
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3RyZWUvcXVpY2tUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBVyxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxVQUFVLEVBQThCLE1BQU0sa0JBQWtCLENBQUM7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFekQsbUJBQW1CO0FBRW5CLE1BQU0sT0FBTyxTQUFvQyxTQUFRLFVBQVU7YUFDMUMsdUJBQWtCLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDhCQUE4QixDQUFDLEFBQXRFLENBQXVFO0lBd0JqSCxZQUFZLEVBQWdCO1FBQzNCLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQXZCRixTQUFJLDhDQUE0QjtRQUV4QixXQUFNLEdBQUcsZUFBZSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QyxlQUFVLEdBQUcsZUFBZSxDQUFxQixXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekUsaUJBQVksR0FBRyxlQUFlLENBQXFCLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM3RSx3QkFBbUIsR0FBRyxlQUFlLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkUsa0JB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