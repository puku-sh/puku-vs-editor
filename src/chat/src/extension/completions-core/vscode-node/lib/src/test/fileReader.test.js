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
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const sinon = __importStar(require("sinon"));
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const fileReader_1 = require("../fileReader");
const fileSystem_1 = require("../fileSystem");
const textDocumentManager_1 = require("../textDocumentManager");
const context_1 = require("./context");
const filesystem_1 = require("./filesystem");
suite('File Reader', function () {
    let sandbox;
    let accessor;
    setup(function () {
        sandbox = sinon.createSandbox();
        const serviceCollection = (0, context_1.createLibTestingContext)();
        serviceCollection.define(fileSystem_1.ICompletionsFileSystemService, new filesystem_1.FakeFileSystem({
            '/test.ts': filesystem_1.FakeFileSystem.file('const foo', { ctime: 0, mtime: 0, size: 0.1 * 1024 * 1024 }), // .1MB
            '/empty.ts': '',
            '/large.ts': filesystem_1.FakeFileSystem.file('very large file', { ctime: 0, mtime: 0, size: 1.1 * 1024 * 1024 }), // 1.1MB
        }));
        accessor = serviceCollection.createTestingAccessor();
    });
    teardown(function () {
        sandbox.restore();
    });
    test('reads file from text document manager', async function () {
        const tdm = accessor.get(textDocumentManager_1.ICompletionsTextDocumentManagerService);
        tdm.setTextDocument('file:///test.js', 'javascript', 'const abc =');
        const reader = accessor.get(instantiation_1.IInstantiationService).createInstance(fileReader_1.FileReader);
        const docResult = await reader.getOrReadTextDocument({ uri: 'file:///test.js' });
        assert.deepStrictEqual(docResult.status, 'valid');
        assert.deepStrictEqual(docResult.document?.getText(), 'const abc =');
        assert.deepStrictEqual(docResult.document?.detectedLanguageId, 'javascript');
    });
    test('reads file from file system', async function () {
        const reader = accessor.get(instantiation_1.IInstantiationService).createInstance(fileReader_1.FileReader);
        const docResult = await reader.getOrReadTextDocument({ uri: 'file:///test.ts' });
        assert.deepStrictEqual(docResult.status, 'valid');
        assert.deepStrictEqual(docResult.document?.getText(), 'const foo');
        assert.deepStrictEqual(docResult.document?.detectedLanguageId, 'typescript');
    });
    test('reads notfound from non existing file', async function () {
        const reader = accessor.get(instantiation_1.IInstantiationService).createInstance(fileReader_1.FileReader);
        const docResult = await reader.getOrReadTextDocument({ uri: 'file:///UNKNOWN.ts' });
        assert.deepStrictEqual(docResult.status, 'notfound');
        assert.deepStrictEqual(docResult.message, 'File not found');
    });
    test('reads notfound for file too large', async function () {
        const reader = accessor.get(instantiation_1.IInstantiationService).createInstance(fileReader_1.FileReader);
        const docResult = await reader.getOrReadTextDocument({ uri: 'file:///large.ts' });
        assert.deepStrictEqual(docResult.status, 'notfound');
        assert.deepStrictEqual(docResult.message, 'File too large');
    });
    test('reads empty files', async function () {
        const reader = accessor.get(instantiation_1.IInstantiationService).createInstance(fileReader_1.FileReader);
        const docResult = await reader.getOrReadTextDocument({ uri: 'file:///empty.ts' });
        assert.deepStrictEqual(docResult.status, 'valid');
        assert.deepStrictEqual(docResult.document.getText(), '');
    });
});
//# sourceMappingURL=fileReader.test.js.map