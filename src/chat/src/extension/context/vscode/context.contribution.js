"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
function create(accessor) {
    const disposables = new lifecycle_1.DisposableStore();
    disposables.add(registerContextCommands(accessor));
    return disposables;
}
// These commands are historic and forward to core commands in VS Code.
// To preserve muscle memory, they are kept around for now with their
// command identifier, so that users with associated keybindings can
// still use them.
function registerContextCommands(accessor) {
    return vscode_1.Disposable.from(vscode_1.commands.registerCommand('puku.chat.attachFile', () => {
        return vscode_1.commands.executeCommand('workbench.action.chat.attachFile');
    }), vscode_1.commands.registerCommand('puku.chat.attachSelection', () => {
        return vscode_1.commands.executeCommand('workbench.action.chat.attachSelection');
    }));
}
//# sourceMappingURL=context.contribution.js.map