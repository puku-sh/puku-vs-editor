"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyRecentEditsProvider = void 0;
class EmptyRecentEditsProvider {
    isEnabled() {
        return false;
    }
    start() {
        return;
    }
    getRecentEdits() {
        return [];
    }
    getEditSummary(edit) {
        return null;
    }
}
exports.EmptyRecentEditsProvider = EmptyRecentEditsProvider;
//# sourceMappingURL=emptyRecentEditsProvider.js.map