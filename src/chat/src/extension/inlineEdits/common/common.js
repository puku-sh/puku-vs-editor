"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTimeout = createTimeout;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const positionToOffset_1 = require("../../../util/vs/editor/common/core/text/positionToOffset");
function createTimeout(ms, cb) {
    const t = setTimeout(cb, ms);
    return (0, lifecycle_1.toDisposable)(() => clearTimeout(t));
}
(0, positionToOffset_1.ensureDependenciesAreSet)();
//# sourceMappingURL=common.js.map