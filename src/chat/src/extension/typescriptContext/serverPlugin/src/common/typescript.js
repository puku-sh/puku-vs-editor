"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
let _ts;
function TS() {
    if (_ts === undefined) {
        throw new Error('tsserverlibrary not loaded yet');
    }
    return _ts;
}
(function (TS) {
    function install(ts) {
        _ts = ts;
    }
    TS.install = install;
})(TS || (TS = {}));
exports.default = TS;
//# sourceMappingURL=typescript.js.map