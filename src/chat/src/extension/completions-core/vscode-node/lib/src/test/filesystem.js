"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeFileSystem = void 0;
const path_1 = require("path");
const fileSystem_1 = require("../fileSystem");
const uri_1 = require("../util/uri");
class FakeFileNode {
}
class FakeFile extends FakeFileNode {
    constructor(content, stats) {
        super();
        this.content = content;
        this.stats = stats;
        this.isDir = false;
    }
}
class FakeDir extends FakeFileNode {
    constructor(stats) {
        super();
        this.stats = stats;
        this.isDir = true;
        this.entries = {};
    }
}
/**
 * A fake for FileSystem that returns content and stats for a set of files
 * and folders configured for testing purposes.
 *
 * Accepts a configuration like the following:
 *
 * ```js
 *   {
 *     "/path/to/file": "file content",
 *     "/path/to/folder": {
 *       "file1": "file1 content",
 *       "file2": "file2 content",
 *     }
 *   }
 * ```
 *
 * It is also possible to control the results of `stat` by using `.file` and
 * `.directory` to create fakes:
 *
 * ```js
 *   {
 *     "/bigFile.txt": FakeFileSystem.file({ctime: 0, mtime: 0, size: 1000000}),
 *     "/futureFolder": FakeFileSystem.directory({
 *       ctime: Date.now() + 3600000,
 *       mtime: Date.now() + 3600000,
 *       size: 64}),
 *   }
 * ```
 */
class FakeFileSystem {
    constructor(fileConfig) {
        this.root = new FakeDir({ ctime: 0, mtime: 0, size: 0, type: fileSystem_1.FileType.Directory });
        this.createFiles('', fileConfig);
    }
    createFiles(parent, config) {
        for (const [key, value] of Object.entries(config)) {
            const path = (0, path_1.join)(parent, key);
            if (value instanceof FakeFileNode) {
                this.mkdir((0, path_1.dirname)(path));
                this.writeNode(path, value);
            }
            else if (typeof value === 'string') {
                this.mkdir((0, path_1.dirname)(path));
                this.writeFile(path, value);
            }
            else {
                this.mkdir(path);
                this.createFiles(path, value);
            }
        }
    }
    /** Recursively creates directories in path */
    mkdir(path) {
        if (!this.getNode(this.root, this.pathParts(path), true, 'mkdir').isDir) {
            throw this.noEntryError(`mkdir '${path}'`);
        }
    }
    writeFile(path, data) {
        this.writeNode(path, new FakeFile(data, { ctime: 0, mtime: 0, size: data.length, type: fileSystem_1.FileType.File }));
    }
    writeNode(path, node) {
        const parts = this.pathParts(path);
        const filename = parts.pop() || '';
        const parent = this.getNode(this.root, parts, false, 'writeFile');
        if (!(parent instanceof FakeDir)) {
            throw this.noEntryError(`writeFile '${path}'`);
        }
        else if (parent.entries[filename]?.isDir) {
            throw this.isDirectoryError(`open '${path}'`);
        }
        parent.entries[filename] = node;
    }
    async readFileString(uri) {
        const fsPath = (0, uri_1.getFsPath)(uri) ?? '<invalid file URI>';
        const file = this.getNode(this.root, this.pathParts(fsPath), false, 'open');
        if (file.isDir) {
            throw this.isDirectoryError(`open '${fsPath}'`);
        }
        return Promise.resolve(file.content);
    }
    stat(uri) {
        return Promise.resolve(this.getNode(this.root, this.pathParts((0, uri_1.getFsPath)(uri)), false, 'stat').stats);
    }
    async readDirectory(uri) {
        const fsPath = (0, uri_1.getFsPath)(uri) ?? '<invalid file URI>';
        const node = this.getNode(this.root, this.pathParts(fsPath), false, 'readDirectory');
        if (!(node instanceof FakeDir)) {
            throw this.noEntryError(`readDirectory '${fsPath}'`);
        }
        return Promise.resolve(Object.entries(node.entries).map(([name, entry]) => [
            name,
            entry.isDir ? fileSystem_1.FileType.Directory : fileSystem_1.FileType.File,
        ]));
    }
    getNode(parent, parts, createPath, command) {
        let current = parent;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!(current instanceof FakeDir) || current.entries[part] === undefined) {
                if (createPath && current instanceof FakeDir) {
                    current.entries[part] = new FakeDir({ ctime: 0, mtime: 0, size: 0, type: fileSystem_1.FileType.Directory });
                }
                else {
                    throw this.noEntryError(`${command} '${parts.join('/')}'`);
                }
            }
            current = current.entries[part];
        }
        return current;
    }
    pathParts(path) {
        const parts = (0, path_1.normalize)(path).split(/[\\/]+/);
        if (parts[0] === '') {
            parts.shift();
        }
        if (parts[parts.length - 1] === '') {
            parts.pop();
        }
        return parts;
    }
    noEntryError(description) {
        const err = new Error(`ENOENT: no such file or directory, ${description}`);
        err.errno = -2;
        err.code = 'ENOENT';
        return err;
    }
    isDirectoryError(description) {
        const err = new Error(`EISDIR: illegal operation on a directory, ${description}`);
        err.errno = -21;
        err.code = 'EISDIR';
        return err;
    }
    static file(content = '', stats) {
        return new FakeFile(content, Object.assign({ ctime: 0, mtime: 0, size: content.length, type: fileSystem_1.FileType.File }, stats));
    }
    static directory(stats) {
        return new FakeDir(Object.assign({ ctime: 0, mtime: 0, size: 0, type: fileSystem_1.FileType.Directory }, stats));
    }
}
exports.FakeFileSystem = FakeFileSystem;
//# sourceMappingURL=filesystem.js.map