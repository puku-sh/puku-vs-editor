/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
export class ToggleReactionsAction extends Action {
    static { this.ID = 'toolbar.toggle.pickReactions'; }
    constructor(toggleDropdownMenu, title) {
        super(ToggleReactionsAction.ID, title || nls.localize(6961, null), 'toggle-reactions', true);
        this._menuActions = [];
        this.toggleDropdownMenu = toggleDropdownMenu;
    }
    run() {
        this.toggleDropdownMenu();
        return Promise.resolve(true);
    }
    get menuActions() {
        return this._menuActions;
    }
    set menuActions(actions) {
        this._menuActions = actions;
    }
}
export class ReactionActionViewItem extends ActionViewItem {
    constructor(action) {
        super(null, action, {});
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        const action = this.action;
        if (action.class) {
            this.label.classList.add(action.class);
        }
        if (!action.icon) {
            const reactionLabel = dom.append(this.label, dom.$('span.reaction-label'));
            reactionLabel.innerText = action.label;
        }
        else {
            const reactionIcon = dom.append(this.label, dom.$('.reaction-icon'));
            const uri = URI.revive(action.icon);
            reactionIcon.style.backgroundImage = cssJs.asCSSUrl(uri);
        }
        if (action.count) {
            const reactionCount = dom.append(this.label, dom.$('span.reaction-count'));
            reactionCount.innerText = `${action.count}`;
        }
    }
    getTooltip() {
        const action = this.action;
        const toggleMessage = action.enabled ? nls.localize(6962, null) : '';
        if (action.count === undefined) {
            return nls.localize(6963, null, toggleMessage, action.label);





        }
        else if (action.reactors === undefined || action.reactors.length === 0) {
            if (action.count === 1) {
                return nls.localize(6964, null, toggleMessage, action.label);






            }
            else if (action.count > 1) {
                return nls.localize(6965, null, toggleMessage, action.count, action.label);






            }
        }
        else {
            if (action.reactors.length <= 10 && action.reactors.length === action.count) {
                return nls.localize(6966, null, toggleMessage, action.reactors.join(', '), action.label);






            }
            else if (action.count > 1) {
                const displayedReactors = action.reactors.slice(0, 10);
                return nls.localize(6967, null, toggleMessage, displayedReactors.join(', '), action.count - displayedReactors.length, action.label);






            }
        }
        return undefined;
    }
}
export class ReactionAction extends Action {
    static { this.ID = 'toolbar.toggle.reaction'; }
    constructor(id, label = '', cssClass = '', enabled = true, actionCallback, reactors, icon, count) {
        super(ReactionAction.ID, label, cssClass, enabled, actionCallback);
        this.reactors = reactors;
        this.icon = icon;
        this.count = count;
    }
}
//# sourceMappingURL=reactionsAction.js.map