"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PauseController = void 0;
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
class PauseController extends lifecycle_1.Disposable {
    get onCancellationRequested() {
        return this.token.onCancellationRequested;
    }
    get isCancellationRequested() {
        return this.token.isCancellationRequested;
    }
    get isPaused() {
        return !this._pausePromise.isSettled;
    }
    constructor(onDidChangePause, token) {
        super();
        this.onDidChangePause = onDidChangePause;
        this.token = token;
        this._pausePromise = new async_1.DeferredPromise();
        this._pausePromise.complete(); // requests are initially unpaused
        this._register(onDidChangePause(isPaused => {
            if (isPaused) {
                this._pausePromise = new async_1.DeferredPromise();
            }
            else {
                this._pausePromise.complete();
            }
        }));
        this._register(token.onCancellationRequested(() => {
            this.dispose();
        }));
    }
    /** Waits to be unpaused or cancelled. */
    waitForUnpause() {
        return this._pausePromise.p;
    }
    dispose() {
        this._pausePromise.complete();
        super.dispose();
    }
}
exports.PauseController = PauseController;
//# sourceMappingURL=pauseController.js.map