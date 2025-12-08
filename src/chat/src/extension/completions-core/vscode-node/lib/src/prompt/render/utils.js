"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ELISION_MARKER = void 0;
exports.getAvailableNodeId = getAvailableNodeId;
exports.DEFAULT_ELISION_MARKER = '[...]';
let nextNodeId = 0;
function getAvailableNodeId() {
    return nextNodeId++;
}
//# sourceMappingURL=utils.js.map