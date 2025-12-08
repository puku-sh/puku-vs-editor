"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveSessionServiceImpl = void 0;
const vscode_1 = require("vscode");
class InteractiveSessionServiceImpl {
    transferActiveChat(workspaceUri) {
        vscode_1.interactive.transferActiveChat(workspaceUri);
    }
}
exports.InteractiveSessionServiceImpl = InteractiveSessionServiceImpl;
//# sourceMappingURL=interactiveSessionServiceImpl.js.map