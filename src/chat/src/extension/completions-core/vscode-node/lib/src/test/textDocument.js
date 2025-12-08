"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTextDocumentManager = exports.SimpleTestTextDocumentManager = exports.InMemoryNotebookDocument = void 0;
exports.createTextDocument = createTextDocument;
exports.parseNotebook = parseNotebook;
const textDocument_1 = require("../textDocument");
const textDocumentManager_1 = require("../textDocumentManager");
const event_1 = require("../util/event");
const uri_1 = require("../util/uri");
function createTextDocument(uri, clientAndDetectedLanguageId, version, text) {
    return textDocument_1.CopilotTextDocument.create((0, uri_1.validateUri)(uri), clientAndDetectedLanguageId, version, text, clientAndDetectedLanguageId);
}
function parseNotebook(doc) {
    const notebook = JSON.parse(doc.getText());
    const cells = notebook.cells.map((cell, index) => {
        const cellUri = `${doc.uri.replace(/#.*/, '')}#${index}`;
        const cellText = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
        const languageId = cell.metadata?.['vscode']?.['languageId'] ||
            (cell.cell_type === 'code' ? 'python' : 'markdown');
        const document = textDocument_1.CopilotTextDocument.create(cellUri, languageId, 0, cellText, languageId);
        return {
            index,
            document,
            metadata: cell.metadata,
            kind: cell.cell_type === 'code' ? 2 : 1,
        };
    });
    return new InMemoryNotebookDocument(cells);
}
class InMemoryNotebookDocument {
    constructor(_cells) {
        this._cells = _cells;
    }
    getCells() {
        return this._cells;
    }
    getCellFor({ uri }) {
        return this._cells.find(cell => cell.document.uri === uri);
    }
}
exports.InMemoryNotebookDocument = InMemoryNotebookDocument;
/**
 * A concrete implementation of TextDocumentManager intended for use with the FakeFileSystem.
 */
class SimpleTestTextDocumentManager extends textDocumentManager_1.TextDocumentManager {
    constructor() {
        super(...arguments);
        this._openTextDocuments = [];
        this._notebookDocuments = new Map();
        this._workspaceFolders = [];
        this.didFocusTextDocumentEmitter = new event_1.Emitter();
        this.onDidFocusTextDocument = this.didFocusTextDocumentEmitter.event;
        this.didChangeTextDocumentEmitter = new event_1.Emitter();
        this.onDidChangeTextDocument = this.didChangeTextDocumentEmitter.event;
        this.didOpenTextDocumentEmitter = new event_1.Emitter();
        this.onDidOpenTextDocument = this.didOpenTextDocumentEmitter.event;
        this.didCloseTextDocumentEmitter = new event_1.Emitter();
        this.onDidCloseTextDocument = this.didCloseTextDocumentEmitter.event;
        this.didChangeWorkspaceFoldersEmitter = new event_1.Emitter();
        this.onDidChangeWorkspaceFolders = this.didChangeWorkspaceFoldersEmitter.event;
    }
    init(workspaceFolders) {
        this._workspaceFolders = workspaceFolders.map(f => ({ uri: f.uri, name: f.name ?? (0, uri_1.basename)(f.uri) }));
    }
    // Make public to allow for stubbing
    async readTextDocumentFromDisk(uri) {
        return super.readTextDocumentFromDisk(uri);
    }
    getTextDocumentsUnsafe() {
        return this._openTextDocuments;
    }
    setTextDocument(uri, languageId, text) {
        const doc = createTextDocument(uri, languageId, 0, text);
        this._openTextDocuments.push(doc);
        return doc;
    }
    updateTextDocument(uri, newText) {
        const idx = this._openTextDocuments.findIndex(t => t.uri === uri.toString());
        if (idx < 0) {
            throw new Error('Document not found');
        }
        const oldDoc = this._openTextDocuments[idx];
        this._openTextDocuments[idx] = createTextDocument(uri, oldDoc.clientLanguageId, oldDoc.version + 1, newText);
    }
    setNotebookDocument(doc, notebook) {
        // Document URIs in the same notebook differ only by fragment
        this._notebookDocuments.set(doc.uri.replace(/#.*/, ''), notebook);
    }
    findNotebook({ uri }) {
        return this._notebookDocuments.get(uri.replace(/#.*/, ''));
    }
    getWorkspaceFolders() {
        return this._workspaceFolders;
    }
}
exports.SimpleTestTextDocumentManager = SimpleTestTextDocumentManager;
/**
 * An implementation of TextDocumentManager that is limited to documents you
 * provide it. It will not attempt to open documents from the file system, but
 * you may provide it with "closed" documents available for opening.
 */
class TestTextDocumentManager extends SimpleTestTextDocumentManager {
    constructor() {
        super(...arguments);
        this.contents = new Map();
    }
    readTextDocumentFromDisk(uri) {
        return Promise.resolve(this.contents.get(uri));
    }
    setDiskContents(uri, text) {
        this.contents.set(uri, text);
    }
}
exports.TestTextDocumentManager = TestTextDocumentManager;
//# sourceMappingURL=textDocument.js.map