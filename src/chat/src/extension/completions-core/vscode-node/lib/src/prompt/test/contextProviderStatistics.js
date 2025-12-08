"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestContextProviderStatistics = void 0;
const contextProviderStatistics_1 = require("../contextProviderStatistics");
class TestContextProviderStatistics extends contextProviderStatistics_1.PerCompletionContextProviderStatistics {
    constructor() {
        super();
    }
    get expectations() {
        return this._expectations;
    }
    get statistics() {
        return this._statistics;
    }
    get lastResolution() {
        return this._lastResolution;
    }
}
exports.TestContextProviderStatistics = TestContextProviderStatistics;
//# sourceMappingURL=contextProviderStatistics.js.map