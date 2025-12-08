"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockFileSystemService = void 0;
const fileTypes_1 = require("../../common/fileTypes");
class MockFileSystemService {
    constructor() {
        this.mockDirs = new Map();
        this.mockFiles = new Map();
        this.mockErrors = new Map();
        this.mockMtimes = new Map();
        this.statCalls = 0;
    }
    mockDirectory(uri, entries) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockDirs.set(uriString, entries);
    }
    mockFile(uri, contents, mtime) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockFiles.set(uriString, contents);
        if (mtime !== undefined) {
            this.mockMtimes.set(uriString, mtime);
        }
    }
    mockError(uri, error) {
        const uriString = typeof uri === 'string' ? uri : uri.toString();
        this.mockErrors.set(uriString, error);
    }
    getStatCallCount() {
        return this.statCalls;
    }
    resetStatCallCount() {
        this.statCalls = 0;
    }
    async readDirectory(uri) {
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        return this.mockDirs.get(uriString) || [];
    }
    async readFile(uri) {
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        const contents = this.mockFiles.get(uriString);
        if (contents === undefined) {
            throw new Error('ENOENT');
        }
        return new TextEncoder().encode(contents);
    }
    async stat(uri) {
        this.statCalls++; // Track stat calls to verify caching
        const uriString = uri.toString();
        if (this.mockErrors.has(uriString)) {
            throw this.mockErrors.get(uriString);
        }
        if (this.mockFiles.has(uriString)) {
            const contents = this.mockFiles.get(uriString);
            const mtime = this.mockMtimes.get(uriString) ?? Date.now();
            return { type: fileTypes_1.FileType.File, ctime: Date.now() - 1000, mtime, size: contents.length };
        }
        if (this.mockDirs.has(uriString)) {
            return { type: fileTypes_1.FileType.Directory, ctime: Date.now() - 1000, mtime: Date.now(), size: 0 };
        }
        throw new Error('ENOENT');
    }
    // Required interface methods
    isWritableFileSystem() { return true; }
    createFileSystemWatcher() { throw new Error('not implemented'); }
    async createDirectory(uri) {
        const uriString = uri.toString();
        // Mark as directory by adding empty entry list
        if (!this.mockDirs.has(uriString)) {
            this.mockDirs.set(uriString, []);
        }
    }
    async writeFile(uri, content) {
        const uriString = uri.toString();
        const text = new TextDecoder().decode(content);
        this.mockFiles.set(uriString, text);
        // add the file to the mock directory listing of its parent directory
        const parentUri = uriString.substring(0, uriString.lastIndexOf('/'));
        if (this.mockDirs.has(parentUri)) {
            const entries = this.mockDirs.get(parentUri);
            const fileName = uriString.substring(uriString.lastIndexOf('/') + 1);
            if (!entries.find(e => e[0] === fileName)) {
                entries.push([fileName, fileTypes_1.FileType.File]);
            }
        }
        else {
            this.mockDirs.set(parentUri, [[uriString.substring(uriString.lastIndexOf('/') + 1), fileTypes_1.FileType.File]]);
        }
    }
    async delete(uri, options) {
        const uriString = uri.toString();
        this.mockFiles.delete(uriString);
        this.mockDirs.delete(uriString);
        this.mockErrors.delete(uriString);
        this.mockMtimes.delete(uriString);
    }
    async rename(oldURI, newURI, options) {
        const oldUriString = oldURI.toString();
        const newUriString = newURI.toString();
        // Check if target exists and overwrite is not allowed
        if (!options?.overwrite && (this.mockFiles.has(newUriString) || this.mockDirs.has(newUriString))) {
            throw new Error('EEXIST: File exists');
        }
        // Move file or directory
        if (this.mockFiles.has(oldUriString)) {
            const content = this.mockFiles.get(oldUriString);
            this.mockFiles.set(newUriString, content);
            this.mockFiles.delete(oldUriString);
            if (this.mockMtimes.has(oldUriString)) {
                const mtime = this.mockMtimes.get(oldUriString);
                this.mockMtimes.set(newUriString, mtime);
                this.mockMtimes.delete(oldUriString);
            }
        }
        else if (this.mockDirs.has(oldUriString)) {
            const entries = this.mockDirs.get(oldUriString);
            this.mockDirs.set(newUriString, entries);
            this.mockDirs.delete(oldUriString);
        }
        else {
            throw new Error('ENOENT: File not found');
        }
    }
    copy(source, destination, options) {
        throw new Error('Method not implemented.');
    }
}
exports.MockFileSystemService = MockFileSystemService;
//# sourceMappingURL=mockFileSystemService.js.map