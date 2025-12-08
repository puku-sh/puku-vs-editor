"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugOutputServiceImpl = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const debugOutputListener_1 = require("./debugOutputListener");
class DebugOutputServiceImpl extends lifecycle_1.Disposable {
    constructor() {
        super();
        for (const l of (0, debugOutputListener_1.installDebugOutputListeners)()) {
            this._register(l);
        }
    }
    get consoleOutput() {
        return (0, debugOutputListener_1.getMostRecentDebugOutput)();
    }
}
exports.DebugOutputServiceImpl = DebugOutputServiceImpl;
//# sourceMappingURL=debugOutputServiceImpl.js.map