"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const promises_1 = require("fs/promises");
const os_1 = require("os");
const path_1 = require("path");
const fileSystem_1 = require("../fileSystem");
const localFileSystem_1 = require("../localFileSystem");
const uri_1 = require("../util/uri");
suite('LocalFileSystem', function () {
    let testDir;
    const defaultFileSystem = new localFileSystem_1.LocalFileSystem();
    // only do all the file system work once for the suite
    suiteSetup(async function () {
        testDir = await (0, promises_1.mkdtemp)((0, path_1.join)((0, os_1.tmpdir)(), 'copilot-unit-test-'));
        await (0, promises_1.mkdir)((0, path_1.join)(testDir, 'folder'));
        await (0, promises_1.symlink)((0, path_1.join)(testDir, 'folder'), (0, path_1.join)(testDir, 'folder-link'), 'dir');
        await (0, promises_1.writeFile)((0, path_1.join)(testDir, 'file'), '\n');
        await (0, promises_1.symlink)((0, path_1.join)(testDir, 'file'), (0, path_1.join)(testDir, 'file-link'));
        await (0, promises_1.writeFile)((0, path_1.join)(testDir, 'tempfile'), '');
        await (0, promises_1.symlink)((0, path_1.join)(testDir, 'tempfile'), (0, path_1.join)(testDir, 'dangling-link'));
        await (0, promises_1.rm)((0, path_1.join)(testDir, 'tempfile')); // leave the link dangling
    });
    suiteTeardown(async function () {
        await (0, promises_1.rm)(testDir, { recursive: true });
    });
    test('.readDirectory returns correct entries', async function () {
        const result = await defaultFileSystem.readDirectory((0, uri_1.makeFsUri)(testDir));
        assert_1.default.strictEqual(result.length, 5);
        const target = [
            ['folder', fileSystem_1.FileType.Directory],
            ['folder-link', fileSystem_1.FileType.Directory | fileSystem_1.FileType.SymbolicLink],
            ['file', fileSystem_1.FileType.File],
            ['file-link', fileSystem_1.FileType.File | fileSystem_1.FileType.SymbolicLink],
            ['dangling-link', fileSystem_1.FileType.Unknown],
        ];
        for (const entry of target) {
            assert_1.default.ok(result.some(([name, type]) => name === entry[0] && type === entry[1]), `Expected entry ${entry[0]} with type ${entry[1]} not found in result`);
        }
    });
    test('.stat returns correct stats for a normal file', async function () {
        const fsStats = await (0, promises_1.stat)((0, path_1.join)(testDir, 'file'));
        const result = await defaultFileSystem.stat((0, uri_1.makeFsUri)((0, path_1.join)(testDir, 'file')));
        assert_1.default.strictEqual(result.ctime, fsStats.ctimeMs);
        assert_1.default.strictEqual(result.mtime, fsStats.mtimeMs);
        assert_1.default.strictEqual(result.size, fsStats.size);
        assert_1.default.strictEqual(result.type, fileSystem_1.FileType.File);
    });
    test('.stat returns correct stats for a directory', async function () {
        const fsStats = await (0, promises_1.stat)((0, path_1.join)(testDir, 'folder'));
        const result = await defaultFileSystem.stat((0, uri_1.makeFsUri)((0, path_1.join)(testDir, 'folder')));
        assert_1.default.strictEqual(result.ctime, fsStats.ctimeMs);
        assert_1.default.strictEqual(result.mtime, fsStats.mtimeMs);
        assert_1.default.strictEqual(result.size, fsStats.size);
        assert_1.default.strictEqual(result.type, fileSystem_1.FileType.Directory);
    });
    test('.stat returns target stats and combined type for link to file', async function () {
        const fsStats = await (0, promises_1.stat)((0, path_1.join)(testDir, 'file'));
        const result = await defaultFileSystem.stat((0, uri_1.makeFsUri)((0, path_1.join)(testDir, 'file-link')));
        assert_1.default.strictEqual(result.ctime, fsStats.ctimeMs);
        assert_1.default.strictEqual(result.mtime, fsStats.mtimeMs);
        assert_1.default.strictEqual(result.size, fsStats.size);
        assert_1.default.strictEqual(result.type, fileSystem_1.FileType.File | fileSystem_1.FileType.SymbolicLink);
    });
    test('.stat returns target stats and combined type for link to directory', async function () {
        const fsStats = await (0, promises_1.stat)((0, path_1.join)(testDir, 'folder'));
        const result = await defaultFileSystem.stat((0, uri_1.makeFsUri)((0, path_1.join)(testDir, 'folder-link')));
        assert_1.default.strictEqual(result.ctime, fsStats.ctimeMs);
        assert_1.default.strictEqual(result.mtime, fsStats.mtimeMs);
        assert_1.default.strictEqual(result.size, fsStats.size);
        assert_1.default.strictEqual(result.type, fileSystem_1.FileType.Directory | fileSystem_1.FileType.SymbolicLink);
    });
    test('.stat returns Unknown type for a dangling link', async function () {
        const result = await defaultFileSystem.stat((0, uri_1.makeFsUri)((0, path_1.join)(testDir, 'dangling-link')));
        assert_1.default.strictEqual(result.type, fileSystem_1.FileType.Unknown);
    });
});
//# sourceMappingURL=localFileSystem.test.js.map