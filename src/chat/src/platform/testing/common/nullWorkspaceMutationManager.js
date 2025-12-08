"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullWorkspaceMutationManager = void 0;
class NullWorkspaceMutationManager {
    create(requestId, options) {
        return null;
    }
    get(requestId) {
        throw new Error('Method not implemented.');
    }
}
exports.NullWorkspaceMutationManager = NullWorkspaceMutationManager;
//# sourceMappingURL=nullWorkspaceMutationManager.js.map