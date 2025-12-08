"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntentRegistry = void 0;
exports.IntentRegistry = new class {
    constructor() {
        this._descriptors = [];
    }
    setIntents(intentDescriptors) {
        this._descriptors = this._descriptors.concat(intentDescriptors);
    }
    getIntents() {
        return this._descriptors;
    }
}();
//# sourceMappingURL=intentRegistry.js.map