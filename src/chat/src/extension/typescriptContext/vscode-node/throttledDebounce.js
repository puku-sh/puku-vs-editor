"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThrottledDebouncer = void 0;
/**
 * Adaptive debounce class that starts with a short delay and increases
 * the debounce time for subsequent events until reaching a maximum threshold.
 */
class ThrottledDebouncer {
    static { this.INITIAL_DELAY = 100; }
    static { this.DELAY_INCREMENT = 10; }
    static { this.MAX_DELAY = 500; }
    constructor(initialDelay = ThrottledDebouncer.INITIAL_DELAY, increment = ThrottledDebouncer.DELAY_INCREMENT, maxDelay = ThrottledDebouncer.MAX_DELAY) {
        this.currentDelay = initialDelay;
        this.initialDelay = initialDelay;
        this.increment = increment;
        this.maxDelay = maxDelay;
    }
    /**
     * Triggers the debounced function. If called again before the current
     * debounce period expires, it will cancel the previous call and schedule
     * a new one with an increased delay.
     *
     * @param fn The function to execute after the debounce period
     * @param args The arguments to pass to the function
     */
    trigger(fn, ...args) {
        // Cancel any existing timeout
        if (this.timeoutId !== undefined) {
            clearTimeout(this.timeoutId);
            // Increase delay for subsequent events, up to the maximum
            this.currentDelay = Math.min(this.currentDelay + this.increment, this.maxDelay);
        }
        // Schedule the function to run after the current delay
        this.timeoutId = setTimeout(() => {
            this.timeoutId = undefined;
            this.currentDelay = this.initialDelay; // Reset delay after execution
            fn(...args);
        }, this.currentDelay);
    }
    /**
     * Cancels any pending debounced function call and resets the delay.
     */
    cancel() {
        if (this.timeoutId !== undefined) {
            clearTimeout(this.timeoutId);
            this.timeoutId = undefined;
        }
        this.currentDelay = this.initialDelay;
    }
    /**
     * Returns whether there is a pending debounced function call.
     */
    get isPending() {
        return this.timeoutId !== undefined;
    }
    /**
     * Returns the current debounce delay in milliseconds.
     */
    get getCurrentDelay() {
        return this.currentDelay;
    }
    /**
     * Disposes of the debounce instance, canceling any pending calls.
     */
    dispose() {
        this.cancel();
    }
}
exports.ThrottledDebouncer = ThrottledDebouncer;
//# sourceMappingURL=throttledDebounce.js.map