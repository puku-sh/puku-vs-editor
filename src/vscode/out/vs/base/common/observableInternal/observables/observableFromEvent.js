/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { subtransaction } from '../transaction.js';
import { strictEquals } from '../commonFacade/deps.js';
import { DebugNameData } from '../debugName.js';
import { getLogger } from '../logging/logging.js';
import { BaseObservable } from './baseObservable.js';
import { DebugLocation } from '../debugLocation.js';
export function observableFromEvent(...args) {
    let owner;
    let event;
    let getValue;
    let debugLocation;
    if (args.length === 2) {
        [event, getValue] = args;
    }
    else {
        [owner, event, getValue, debugLocation] = args;
    }
    return new FromEventObservable(new DebugNameData(owner, undefined, getValue), event, getValue, () => FromEventObservable.globalTransaction, strictEquals, debugLocation ?? DebugLocation.ofCaller());
}
export function observableFromEventOpts(options, event, getValue, debugLocation = DebugLocation.ofCaller()) {
    return new FromEventObservable(new DebugNameData(options.owner, options.debugName, options.debugReferenceFn ?? getValue), event, getValue, () => FromEventObservable.globalTransaction, options.equalsFn ?? strictEquals, debugLocation);
}
export class FromEventObservable extends BaseObservable {
    constructor(_debugNameData, event, _getValue, _getTransaction, _equalityComparator, debugLocation) {
        super(debugLocation);
        this._debugNameData = _debugNameData;
        this.event = event;
        this._getValue = _getValue;
        this._getTransaction = _getTransaction;
        this._equalityComparator = _equalityComparator;
        this._hasValue = false;
        this.handleEvent = (args) => {
            const newValue = this._getValue(args);
            const oldValue = this._value;
            const didChange = !this._hasValue || !(this._equalityComparator(oldValue, newValue));
            let didRunTransaction = false;
            if (didChange) {
                this._value = newValue;
                if (this._hasValue) {
                    didRunTransaction = true;
                    subtransaction(this._getTransaction(), (tx) => {
                        getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
                        for (const o of this._observers) {
                            tx.updateObserver(o, this);
                            o.handleChange(this, undefined);
                        }
                    }, () => {
                        const name = this.getDebugName();
                        return 'Event fired' + (name ? `: ${name}` : '');
                    });
                }
                this._hasValue = true;
            }
            if (!didRunTransaction) {
                getLogger()?.handleObservableUpdated(this, { oldValue, newValue, change: undefined, didChange, hadValue: this._hasValue });
            }
        };
    }
    getDebugName() {
        return this._debugNameData.getDebugName(this);
    }
    get debugName() {
        const name = this.getDebugName();
        return 'From Event' + (name ? `: ${name}` : '');
    }
    onFirstObserverAdded() {
        this._subscription = this.event(this.handleEvent);
    }
    onLastObserverRemoved() {
        this._subscription.dispose();
        this._subscription = undefined;
        this._hasValue = false;
        this._value = undefined;
    }
    get() {
        if (this._subscription) {
            if (!this._hasValue) {
                this.handleEvent(undefined);
            }
            return this._value;
        }
        else {
            // no cache, as there are no subscribers to keep it updated
            const value = this._getValue(undefined);
            return value;
        }
    }
    debugSetValue(value) {
        // eslint-disable-next-line local/code-no-any-casts
        this._value = value;
    }
    debugGetState() {
        return { value: this._value, hasValue: this._hasValue };
    }
}
(function (observableFromEvent) {
    observableFromEvent.Observer = FromEventObservable;
    function batchEventsGlobally(tx, fn) {
        let didSet = false;
        if (FromEventObservable.globalTransaction === undefined) {
            FromEventObservable.globalTransaction = tx;
            didSet = true;
        }
        try {
            fn();
        }
        finally {
            if (didSet) {
                FromEventObservable.globalTransaction = undefined;
            }
        }
    }
    observableFromEvent.batchEventsGlobally = batchEventsGlobally;
})(observableFromEvent || (observableFromEvent = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZUZyb21FdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9vYnNlcnZhYmxlcy9vYnNlcnZhYmxlRnJvbUV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRCxPQUFPLEVBQXdDLFlBQVksRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdGLE9BQU8sRUFBYyxhQUFhLEVBQWtCLE1BQU0saUJBQWlCLENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFhcEQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLEdBQUcsSUFFdUI7SUFFN0QsSUFBSSxLQUFLLENBQUM7SUFDVixJQUFJLEtBQUssQ0FBQztJQUNWLElBQUksUUFBUSxDQUFDO0lBQ2IsSUFBSSxhQUFhLENBQUM7SUFDbEIsSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQztJQUMxQixDQUFDO1NBQU0sQ0FBQztRQUNQLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDO0lBQ2hELENBQUM7SUFDRCxPQUFPLElBQUksbUJBQW1CLENBQzdCLElBQUksYUFBYSxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQzdDLEtBQUssRUFD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