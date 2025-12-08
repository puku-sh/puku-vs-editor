"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSingler = void 0;
/**
 * Taken from https://github.com/microsoft/vscode/blob/e8e6e1f69c34232ea2668d3ea2c1c0393303474f/src/vs/workbench/api/common/extHostAuthentication.ts#L122-L136
 * Given a task with the same key, it will only run one at a time and will return the same promise for all calls with the same key.
 */
class TaskSingler {
    constructor() {
        this._inFlightPromises = new Map();
    }
    getOrCreate(key, promiseFactory) {
        const inFlight = this._inFlightPromises.get(key);
        if (inFlight) {
            return inFlight;
        }
        const promise = promiseFactory().finally(() => this._inFlightPromises.delete(key));
        this._inFlightPromises.set(key, promise);
        return promise;
    }
}
exports.TaskSingler = TaskSingler;
//# sourceMappingURL=taskSingler.js.map