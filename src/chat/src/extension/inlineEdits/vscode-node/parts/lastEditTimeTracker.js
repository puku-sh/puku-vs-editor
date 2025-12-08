"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastEditTimeTracker = void 0;
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observable_1 = require("../../../../util/vs/base/common/observable");
class LastEditTimeTracker extends lifecycle_1.Disposable {
    get hadEditsRecently() {
        const lastEditTime = this._lastEditTime.get();
        return lastEditTime !== undefined && (Date.now() - lastEditTime < 30 * 1000 /* 30 seconds */);
    }
    constructor(workspace) {
        super();
        this._lastEditTime = (0, observable_1.observableValue)(this, undefined);
        (0, observable_1.mapObservableArrayCached)(this, workspace.openDocuments, (doc, store) => {
            store.add((0, observable_1.runOnChange)(doc.value, (_curState, _oldState, deltas) => {
                if (deltas.length > 0 && deltas.some(edit => edit.replacements.length > 0)) {
                    this._lastEditTime.set(Date.now(), undefined);
                }
            }));
        }).recomputeInitiallyAndOnChange(this._store);
    }
}
exports.LastEditTimeTracker = LastEditTimeTracker;
//# sourceMappingURL=lastEditTimeTracker.js.map