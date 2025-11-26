/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises } from '../../../base/common/async.js';
import { Event, Emitter } from '../../../base/common/event.js';
export class TestLifecycleMainService {
    constructor() {
        this.onBeforeShutdown = Event.None;
        this._onWillShutdown = new Emitter();
        this.onWillShutdown = this._onWillShutdown.event;
        this.onWillLoadWindow = Event.None;
        this.onBeforeCloseWindow = Event.None;
        this.wasRestarted = false;
        this.quitRequested = false;
        this.phase = 2 /* LifecycleMainPhase.Ready */;
    }
    async fireOnWillShutdown() {
        const joiners = [];
        this._onWillShutdown.fire({
            reason: 1 /* ShutdownReason.QUIT */,
            join(id, promise) {
                joiners.push(promise);
            }
        });
        await Promises.settled(joiners);
    }
    registerWindow(window) { }
    registerAuxWindow(auxWindow) { }
    async reload(window, cli) { }
    async unload(window, reason) { return true; }
    setRelaunchHandler(handler) { }
    async relaunch(options) { }
    async quit(willRestart) { return true; }
    async kill(code) { }
    async when(phase) { }
}
export class InMemoryTestStateMainService {
    constructor() {
        this.data = new Map();
    }
    setItem(key, data) {
        this.data.set(key, data);
    }
    setItems(items) {
        for (const { key, data } of items) {
            this.data.set(key, data);
        }
    }
    getItem(key) {
        return this.data.get(key);
    }
    removeItem(key) {
        this.data.delete(key);
    }
    async close() { }
}
//# sourceMappingURL=workbenchTestServices.js.map