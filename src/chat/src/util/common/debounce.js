"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Debouncer = void 0;
exports.debounce = debounce;
/**
 * Debouncer class for async code.
 *
 * Implements "trailing" debouncing as described here:
 * https://css-tricks.com/debouncing-throttling-explained-examples/#aa-debounce
 *
 * For a given instance of this class, at most one call to `debounce` can be
 * in progress at a time. A subsequent call will trigger rejection of the promise returned
 * by the previous call.
 */
class Debouncer {
    /**
     * Wait for the specified number of milliseconds, then resolve.
     * Rejects if another call is made to `debounce` on this object in the meantime.
     */
    async debounce(ms) {
        if (this.state) {
            clearTimeout(this.state.timer);
            this.state.reject();
            this.state = undefined;
        }
        return new Promise((resolve, reject) => {
            this.state = {
                timer: setTimeout(() => resolve(), ms),
                reject,
            };
        });
    }
}
exports.Debouncer = Debouncer;
/** Debounce function for sync functions */
function debounce(ms, callback) {
    let timer;
    return (...args) => {
        if (timer) {
            clearTimeout(timer);
        }
        return new Promise(resolve => {
            timer = setTimeout(() => {
                const returnValue = callback(...args);
                resolve(returnValue);
            }, ms);
        });
    };
}
//# sourceMappingURL=debounce.js.map