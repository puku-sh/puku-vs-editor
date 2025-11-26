/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../base/common/observable.js';
export class ChatElicitationRequestPart extends Disposable {
    constructor(title, message, subtitle, acceptButtonLabel, rejectButtonLabel, 
    // True when the primary action is accepted, otherwise the action that was selected
    _accept, reject, source, moreActions, onHide) {
        super();
        this.title = title;
        this.message = message;
        this.subtitle = subtitle;
        this.acceptButtonLabel = acceptButtonLabel;
        this.rejectButtonLabel = rejectButtonLabel;
        this._accept = _accept;
        this.source = source;
        this.moreActions = moreActions;
        this.onHide = onHide;
        this.kind = 'elicitation2';
        this.state = observableValue('state', "pending" /* ElicitationState.Pending */);
        this._isHiddenValue = observableValue('isHidden', false);
        this.isHidden = this._isHiddenValue;
        if (reject) {
            this.reject = async () => {
                const state = await reject();
                this.state.set(state, undefined);
            };
        }
    }
    accept(value) {
        return this._accept(value).then(state => {
            this.state.set(state, undefined);
        });
    }
    hide() {
        if (this._isHiddenValue.get()) {
            return;
        }
        this._isHiddenValue.set(true, undefined, undefined);
        this.onHide?.();
        this.dispose();
    }
    toJSON() {
        const state = this.state.get();
        return {
            kind: 'elicitationSerialized',
            title: this.title,
            message: this.message,
            state: state === "pending" /* ElicitationState.Pending */ ? "rejected" /* ElicitationState.Rejected */ : state,
            acceptedResult: this.acceptedResult,
            subtitle: this.subtitle,
            source: this.source,
            isHidden: this._isHiddenValue.get(),
        };
    }
}
//# sourceMappingURL=chatElicitationRequestPart.js.map