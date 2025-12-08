"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const fileTypes_1 = require("../../../../../../platform/filesystem/common/fileTypes");
const uri_1 = require("../../../../../../util/vs/base/common/uri");
const visualFileTree_1 = require("../visualFileTree");
function joinLines(...lines) {
    return lines.join('\n');
}
function file(name) {
    return { type: fileTypes_1.FileType.File, uri: uri_1.URI.file(`/${name}`), name };
}
function dir(name, children) {
    return { type: fileTypes_1.FileType.Directory, uri: uri_1.URI.file(`/${name}`), name, getChildren: async () => children };
}
(0, vitest_1.suite)('Truncated file tree', () => {
    (0, vitest_1.test)('Empty file tree', async () => {
        const files = [];
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, Infinity)).tree, '');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 10)).tree, '');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 0)).tree, '');
    });
    (0, vitest_1.test)('Should print file nodes', async () => {
        const files = [
            file('abc'),
            file('longName'),
        ];
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, Infinity)).tree, 'abc\nlongName');
    });
    (0, vitest_1.test)('Should truncate file list', async () => {
        const files = [
            file('aa'),
            file('bb'),
            file('cc'),
        ];
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 0)).tree, '');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 2)).tree, '');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 3)).tree, '...');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 4)).tree, '...');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 5)).tree, '...');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 6)).tree, 'aa\n...');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 7)).tree, 'aa\n...');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 8)).tree, 'aa\nbb\ncc');
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, Infinity)).tree, 'aa\nbb\ncc');
    });
    (0, vitest_1.test)('Should print directories nodes', async () => {
        const files = [
            file('abc'),
            dir('dir', [file('def')]),
        ];
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, Infinity)).tree, joinLines('abc', 'dir/', '\tdef'));
    });
    (0, vitest_1.test)('Should expand breadth first', async () => {
        const files = [
            dir('dir1', [
                dir('dir2', [
                    file('file1')
                ])
            ]),
            dir('dir3', [
                file('file2')
            ]),
        ];
        // Make sure that dir3 is expanded before dir2
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 25)).tree, joinLines('dir1/', '\tdir2/', 'dir3/', '\tfile2'));
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files)).tree, joinLines('dir1/', '\tdir2/', '\t\tfile1', 'dir3/', '\tfile2'));
    });
    (0, vitest_1.test)('Should expand multi-lists breadth first', async () => {
        const files = [
            file('file1'),
            dir('dir1', [file('file2'), file('file3')]),
            dir('dir2', [file('file4')]),
        ];
        assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, Infinity)).tree, joinLines('file1', 'dir1/', '\tfile2', '\tfile3', 'dir2/', '\tfile4'));
        for (let i = 9; i < 15; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, i)).tree, joinLines('file1', '...'));
        }
        for (let i = 15; i < 18; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, 15)).tree, joinLines('file1', 'dir1/', '...'));
        }
        for (let i = 18; i < 22; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, i)).tree, joinLines('file1', 'dir1/', 'dir2/'));
        }
        for (let i = 22; i < 27; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, i)).tree, joinLines('file1', 'dir1/', '\t...', 'dir2/'));
        }
        for (let i = 27; i < 29; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, i)).tree, joinLines('file1', 'dir1/', '\t...', 'dir2/', '\t...'));
        }
        for (let i = 29; i < 31; ++i) {
            assert_1.default.deepStrictEqual((await (0, visualFileTree_1.visualFileTree)(files, i)).tree, joinLines('file1', 'dir1/', '\tfile2', '\t...', 'dir2/'));
        }
    });
});
//# sourceMappingURL=visualFileTree.spec.js.map