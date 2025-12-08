"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const os_1 = require("os");
const path = __importStar(require("path"));
const uri_1 = require("../uri");
suite('normalizeUri tests', function () {
    test('returns the canonical form of a URI as a string', function () {
        const result = (0, uri_1.normalizeUri)('file:///C:/path/to/file');
        assert_1.default.strictEqual(result, 'file:///c%3A/path/to/file');
    });
    test('does not alter canonical URI strings', function () {
        const result = (0, uri_1.normalizeUri)('file:///c%3A/path/to/file');
        assert_1.default.strictEqual(result, 'file:///c%3A/path/to/file');
    });
    test('returns the original string for unparsable URIs', function () {
        const result = (0, uri_1.normalizeUri)('not a:// uri');
        assert_1.default.strictEqual(result, 'not a:// uri');
    });
    test('returns the original string for unparsable URIs in strict mode', function () {
        const result = (0, uri_1.normalizeUri)('c:\\path');
        assert_1.default.strictEqual(result, 'c:\\path');
    });
});
suite('URI file system tests', function () {
    test('getFsPath returns the file path for file system URIs', function () {
        // Drive letter will get normalized to lowercase by makeFsUri
        assert_1.default.strictEqual((0, uri_1.getFsPath)((0, uri_1.makeFsUri)(__filename))?.toLowerCase(), __filename.toLowerCase());
    });
    test('getFsPath uses the platform-specific file separator', function () {
        assert_1.default.strictEqual((0, uri_1.getFsPath)('file:///some/path'), path.join(path.sep, 'some', 'path'));
    });
    test('getFsPath recognizes platform-specific absolute paths', function () {
        if ((0, os_1.platform)() === 'win32') {
            assert_1.default.strictEqual((0, uri_1.getFsPath)('file:///C:/Some/Path'), 'C:\\Some\\Path');
        }
        else {
            assert_1.default.strictEqual((0, uri_1.getFsPath)('file:///C:/Some/Path'), '/C:/Some/Path');
        }
    });
    test('getFsPath supports UNC paths on Windows', function () {
        if ((0, os_1.platform)() === 'win32') {
            assert_1.default.strictEqual((0, uri_1.getFsPath)('file://Server/Share/Some/Path'), '\\\\Server\\Share\\Some\\Path');
        }
        else {
            // on other platforms, this is the equivalent to smb://Server/Share/Some/Path,
            // which is not a file system path
            assert_1.default.strictEqual((0, uri_1.getFsPath)('file://Server/Share/Some/Path'), undefined);
        }
    });
    test('getFsPath supports device paths on Windows', function () {
        if ((0, os_1.platform)() !== 'win32') {
            this.skip();
        }
        const devicePath = '\\\\.\\c:\\Some\\Path';
        assert_1.default.strictEqual((0, uri_1.getFsPath)((0, uri_1.makeFsUri)(devicePath)), devicePath);
    });
    test('fsPath throws when the scheme does not represent a local file', function () {
        assert_1.default.throws(() => (0, uri_1.fsPath)('https://host.example/path'), /Copilot currently does not support URI with scheme/);
        assert_1.default.throws(() => (0, uri_1.fsPath)('untitled:Untitled-1'), /Copilot currently does not support URI with scheme/);
        assert_1.default.ok((0, uri_1.fsPath)('vscode-notebook-cell:///path/to/file'));
        assert_1.default.ok((0, uri_1.fsPath)('vscode-notebook:///path/to/file'));
        assert_1.default.ok((0, uri_1.fsPath)('notebook:///path/to/file'));
    });
    test('fsPath uses the platform-specific definition of a local file', function () {
        const uri = 'file://Server/Share/path';
        if ((0, os_1.platform)() === 'win32') {
            assert_1.default.strictEqual((0, uri_1.fsPath)(uri), '\\\\Server\\Share\\path');
        }
        else {
            assert_1.default.throws(() => (0, uri_1.fsPath)(uri), /Unsupported remote file path/);
        }
    });
});
suite('dirname tests', function () {
    test('dirname works for file URI', function () {
        const dir = (0, uri_1.dirname)('file:///path/to/file');
        assert_1.default.strictEqual(dir, 'file:///path/to');
    });
    test('dirname converts notebook URI to file dir', function () {
        const notebookUri = 'vscode-notebook-cell:///path/to/file#cell-id';
        const dir = (0, uri_1.dirname)(notebookUri);
        assert_1.default.strictEqual(dir, 'file:///path/to');
    });
    test('returns {uri: string} for {uri: string}', function () {
        assert_1.default.deepStrictEqual((0, uri_1.dirname)({ uri: 'file:///path/to/file' }), { uri: 'file:///path/to' });
    });
});
suite('basename tests', function () {
    function verifyBasename(fsPath) {
        const absolute = `file://${fsPath}`;
        const pathExpected = path.basename((0, uri_1.getFsPath)(absolute) || '');
        const actual = (0, uri_1.basename)(absolute);
        assert_1.default.equal(actual, pathExpected, `basename() returned '${actual}' but path.basename() returned '${pathExpected}'`);
        const utilsExpected = (0, uri_1.basename)(absolute);
        assert_1.default.equal(actual, utilsExpected, `basename() returned '${actual}' but Utils.basename() returned '${utilsExpected}'`);
    }
    [
        '/path/to/file',
        '/path/to/file?query',
        '/path/to/file#anchor',
        '/path/to/file?query#anchor',
        '/path/with%20valid%20%25%20encoding',
        '/path/with no % encoding',
        '/path/with invalid %80 encoding',
        '/path/to/directory/',
        '/path/to/directory/?query',
        '/path/to/directory/#anchor',
        '/path/to/directory/?query#anchor',
        '/',
        '/?query',
        '/#anchor',
        '/?query#anchor',
    ].forEach(fsPath => {
        test(fsPath, function () {
            verifyBasename(fsPath);
        });
    });
});
//# sourceMappingURL=uri.test.js.map