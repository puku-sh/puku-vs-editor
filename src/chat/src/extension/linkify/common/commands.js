"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.openSymbolInFileCommand = exports.openFileLinkCommand = void 0;
exports.commandUri = commandUri;
// TODO: keep these commands around for backwards compatibility, but remove them in the future
exports.openFileLinkCommand = '_puku.openRelativePath';
exports.openSymbolInFileCommand = '_puku.openSymbolInFile';
function commandUri(command, args) {
    return `command:${command}?${encodeURIComponent(JSON.stringify(args))}`;
}
//# sourceMappingURL=commands.js.map