"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extensionFileSystem = void 0;
const vscode_1 = require("vscode");
class ExtensionFileSystem {
    async readFileString(uri) {
        if (typeof uri !== 'string') {
            uri = uri.uri;
        }
        return new TextDecoder().decode(await vscode_1.workspace.fs.readFile(vscode_1.Uri.parse(uri, true)));
    }
    async stat(uri) {
        if (typeof uri !== 'string') {
            uri = uri.uri;
        }
        return await vscode_1.workspace.fs.stat(vscode_1.Uri.parse(uri, true));
    }
    async readDirectory(uri) {
        if (typeof uri !== 'string') {
            uri = uri.uri;
        }
        return await vscode_1.workspace.fs.readDirectory(vscode_1.Uri.parse(uri, true));
    }
}
exports.extensionFileSystem = new ExtensionFileSystem();
//# sourceMappingURL=fileSystem.js.map