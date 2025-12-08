"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullTestProvider = void 0;
const event_1 = require("../../../util/vs/base/common/event");
class NullTestProvider {
    constructor() {
        this.onDidChangeResults = event_1.Event.None;
    }
    getAllFailures() {
        return [];
    }
    getFailureAtPosition(uri, position) {
        return undefined;
    }
    getLastFailureFor(testItem) {
        return undefined;
    }
    hasTestsInUri() {
        return Promise.resolve(false);
    }
    hasAnyTests() {
        return Promise.resolve(false);
    }
}
exports.NullTestProvider = NullTestProvider;
//# sourceMappingURL=nullTestProvider.js.map