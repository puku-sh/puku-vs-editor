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
const instantiation_1 = require("../../../../../../util/vs/platform/instantiation/common/instantiation");
const uri_1 = require("../util/uri");
const context_1 = require("./context");
const textDocument_1 = require("./textDocument");
suite('TextDocumentManager base class', () => {
    let textDocumentManager;
    let accessor;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        textDocumentManager = accessor.get(instantiation_1.IInstantiationService).createInstance(textDocument_1.SimpleTestTextDocumentManager);
    });
    test('should return the relative path of the document without workspaces', () => {
        const mockDocument = (0, textDocument_1.createTextDocument)((0, uri_1.makeFsUri)('/path/to/file.txt'), '', 0, '');
        const relativePath = textDocumentManager.getRelativePath(mockDocument);
        assert_1.default.strictEqual(relativePath, 'file.txt');
    });
    test('should return the relative path of the document in workspace', () => {
        textDocumentManager.init([{ uri: 'file:///path/to/workspace' }]);
        const mockDocument = (0, textDocument_1.createTextDocument)((0, uri_1.makeFsUri)('/path/to/workspace/folder/file.txt'), '', 0, '');
        const relativePath = textDocumentManager.getRelativePath(mockDocument);
        assert_1.default.strictEqual(relativePath, 'folder/file.txt');
    });
    test('should return the relative path of the document in workspace with trailing slash', () => {
        textDocumentManager.init([{ uri: 'file:///path/to/workspace/' }]);
        const mockDocument = (0, textDocument_1.createTextDocument)((0, uri_1.makeFsUri)('/path/to/workspace/folder/file.txt'), '', 0, '');
        const relativePath = textDocumentManager.getRelativePath(mockDocument);
        assert_1.default.strictEqual(relativePath, 'folder/file.txt');
    });
    test('should return undefined for untitled documents', () => {
        const mockDocument = (0, textDocument_1.createTextDocument)('untitled:Untitled-1', '', 0, '');
        const relativePath = textDocumentManager.getRelativePath(mockDocument);
        assert_1.default.strictEqual(relativePath, undefined);
    });
    test('.getTextDocumentUnsafe() returns an existing document', function () {
        textDocumentManager.setTextDocument('file:///path/to/file.txt', 'plaintext', 'file content');
        const result = textDocumentManager.getTextDocumentUnsafe({ uri: 'file:///path/to/file.txt' });
        assert_1.default.ok(result);
        assert_1.default.strictEqual(result?.getText(), 'file content');
    });
    test('.getTextDocumentUnsafe() returns undefined for an unopened document', function () {
        const result = textDocumentManager.getTextDocumentUnsafe({ uri: 'file:///path/to/file.txt' });
        assert_1.default.strictEqual(result, undefined);
    });
    test('.getTextDocumentUnsafe() normalizes URIs', function () {
        textDocumentManager.setTextDocument('file:///c%3A/file', 'plaintext', 'file content');
        const result = textDocumentManager.getTextDocumentUnsafe({ uri: 'file:///C:/file' });
        assert_1.default.ok(result);
        assert_1.default.strictEqual(result?.getText(), 'file content');
    });
    test('.getTextDocument() finds documents by normalized URI', async function () {
        const saved = textDocumentManager.setTextDocument('file:///c%3A/file', 'plaintext', 'file content');
        const retrieved = await textDocumentManager.getTextDocument({ uri: 'file:///C:/file' });
        assert_1.default.strictEqual(retrieved, saved);
    });
    test('.getTextDocument() returns undefined for anything other than an open document', async function () {
        const result = await textDocumentManager.getTextDocument({ uri: 'file:///path/to/file.txt' });
        assert_1.default.strictEqual(result, undefined);
    });
    test('.getTextDocument() retrieves the document synchronously', async function () {
        textDocumentManager.setTextDocument('file:///path/to/file.txt', 'plaintext', 'file content');
        const thenable = textDocumentManager.getTextDocument({ uri: 'file:///path/to/file.txt' });
        textDocumentManager.updateTextDocument('file:///path/to/file.txt', 'new content');
        const document = await thenable;
        assert_1.default.strictEqual(document?.version, 0);
        assert_1.default.strictEqual(document?.getText(), 'file content');
    });
});
//# sourceMappingURL=textDocumentManager.test.js.map