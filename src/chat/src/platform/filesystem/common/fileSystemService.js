"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FS_READ_MAX_FILE_SIZE = exports.fileSystemServiceReadAsJSON = exports.IFileSystemService = void 0;
exports.assertReadFileSizeLimit = assertReadFileSizeLimit;
const cache_1 = require("../../../util/common/cache");
const services_1 = require("../../../util/common/services");
exports.IFileSystemService = (0, services_1.createServiceIdentifier)('IFileSystemService');
/**
 * This is here to allow us to reuse the same readFile/JSON.parse across multiple invocations during simulations.
 * This is disabled in production.
 */
exports.fileSystemServiceReadAsJSON = new class {
    constructor() {
        this._cache = null;
    }
    enable() {
        this._cache = new cache_1.LRUCache(10);
    }
    async readJSON(fileSystemService, uri) {
        if (!this._cache) {
            return this._readJSON(fileSystemService, uri);
        }
        const cachedValue = this._cache.get(uri.toString());
        if (cachedValue !== undefined) {
            return cachedValue;
        }
        const value = await this._readJSON(fileSystemService, uri);
        this._cache.put(uri.toString(), value);
        return value;
    }
    async _readJSON(fileSystemService, uri) {
        const buffer = await fileSystemService.readFile(uri, true);
        return JSON.parse(buffer.toString());
    }
}();
exports.FS_READ_MAX_FILE_SIZE = 1024 * 1024 * 5; // 5 MB
async function assertReadFileSizeLimit(fileSystemService, uri, onlyWarn) {
    const stat = await fileSystemService.stat(uri);
    if (stat.size > exports.FS_READ_MAX_FILE_SIZE) {
        if (!onlyWarn) {
            const message = `[FileSystemService] ${uri.toString()} EXCEEDS max file size. FAILED to read ${Math.round(stat.size / (1024 * 1024))}MB > ${Math.round(exports.FS_READ_MAX_FILE_SIZE / (1024 * 1024))}MB`;
            throw new Error(message);
        }
        else {
            const message = `[FileSystemService] ${uri.toString()} is a LARGE file (${Math.round(stat.size / (1024 * 1024))}MB > ${Math.round(exports.FS_READ_MAX_FILE_SIZE / (1024 * 1024))}MB)`;
            console.warn(message);
        }
    }
}
//# sourceMappingURL=fileSystemService.js.map