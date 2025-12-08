"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticWorkspaceTracker = void 0;
class StaticWorkspaceTracker {
    constructor(edits) {
        this.edits = edits;
    }
    getHistoryContext(_docId) {
        return this.edits;
    }
}
exports.StaticWorkspaceTracker = StaticWorkspaceTracker;
//# sourceMappingURL=staticWorkspaceEditTracker.js.map