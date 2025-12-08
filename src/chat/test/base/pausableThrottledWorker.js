"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PausableThrottledWorker = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const async_1 = require("../../src/util/vs/base/common/async");
/**
 * A ThrottledWorker that supports pausing and resuming work processing.
 * When paused, work items will still be buffered but not processed until resumed.
 * Work that was in progress when paused will be completed before pausing takes effect.
 */
class PausableThrottledWorker extends async_1.ThrottledWorker {
    constructor(options, handler) {
        super(options, (units) => {
            if (this._paused) {
                // If paused, store the work for later
                this._pausedWork.push(...units);
            }
            else {
                handler(units);
            }
        });
        this._paused = false;
        this._pausedWork = [];
    }
    /**
     * Whether the worker is currently paused
     */
    isPaused() {
        return this._paused;
    }
    /**
     * Pause processing of work items. Any work items received while paused
     * will be buffered until resume() is called.
     */
    pause() {
        this._paused = true;
    }
    /**
     * Resume processing of work items, including any that were buffered
     * while the worker was paused.
     */
    resume() {
        this._paused = false;
        // Process any work that was buffered while paused
        if (this._pausedWork.length > 0) {
            const work = this._pausedWork;
            this._pausedWork = [];
            this.work(work);
        }
    }
    dispose() {
        this._pausedWork = [];
        super.dispose();
    }
}
exports.PausableThrottledWorker = PausableThrottledWorker;
//# sourceMappingURL=pausableThrottledWorker.js.map