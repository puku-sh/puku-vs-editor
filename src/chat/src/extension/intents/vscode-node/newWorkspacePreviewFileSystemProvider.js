"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewWorkspacePreviewFileSystemProvider = void 0;
const vscode_1 = require("vscode");
class NewWorkspacePreviewFileSystemProvider {
    constructor(contentManager) {
        this.contentManager = contentManager;
        // #region not implemented since this filesystem impl is readonly
        this._onDidChangeFile = new vscode_1.EventEmitter();
        this.onDidChangeFile = this._onDidChangeFile.event;
    }
    async stat(uri) {
        const node = this.contentManager.get(uri);
        if (!node) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        const size = await node.content?.then((content) => content?.length) ?? 0;
        return {
            ctime: node.ctime ?? 0,
            mtime: node.ctime ?? 0,
            size: size,
            type: node.children ? vscode_1.FileType.Directory : vscode_1.FileType.File
        };
    }
    readDirectory(uri) {
        const node = this.contentManager.get(uri);
        if (!node) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        return node.children?.map((child) => [child.name, child.children ? vscode_1.FileType.Directory : vscode_1.FileType.File]) ?? [];
    }
    async readFile(uri) {
        const node = this.contentManager.get(uri);
        if (!node) {
            throw vscode_1.FileSystemError.FileNotFound(uri);
        }
        let content;
        try {
            content = await node.content;
        }
        catch { }
        return content ?? new Uint8Array();
    }
    watch(uri, options) {
        return { dispose() { } };
    }
    createDirectory(uri) {
        throw vscode_1.FileSystemError.NoPermissions(uri);
    }
    writeFile(uri, content, options) {
        throw vscode_1.FileSystemError.NoPermissions(uri);
    }
    delete(uri, options) {
        throw vscode_1.FileSystemError.NoPermissions(uri);
    }
    rename(oldUri, newUri, options) {
        throw vscode_1.FileSystemError.NoPermissions(newUri);
    }
    copy(source, destination, options) {
        throw vscode_1.FileSystemError.NoPermissions(destination);
    }
}
exports.NewWorkspacePreviewFileSystemProvider = NewWorkspacePreviewFileSystemProvider;
//# sourceMappingURL=newWorkspacePreviewFileSystemProvider.js.map