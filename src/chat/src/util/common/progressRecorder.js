"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecordedProgress = void 0;
class RecordedProgress {
    get items() {
        return this._items;
    }
    constructor(_progress) {
        this._progress = _progress;
        this._items = [];
    }
    report(value) {
        this._items.push(value);
        this._progress.report(value);
    }
}
exports.RecordedProgress = RecordedProgress;
//# sourceMappingURL=progressRecorder.js.map