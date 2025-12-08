"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionTextDocumentManager = void 0;
exports.wrapDoc = wrapDoc;
const vscode_1 = require("vscode");
const languageDetection_1 = require("../../lib/src/language/languageDetection");
const textDocument_1 = require("../../lib/src/textDocument");
const textDocumentManager_1 = require("../../lib/src/textDocumentManager");
const event_1 = require("../../lib/src/util/event");
const uri_1 = require("../../lib/src/util/uri");
// List of document URI schemes that avoid ghost text suggestions
const ignoreUriSchemes = new Set([
    'output', // vscode output pane (important: avoids infinite log loop)
    'search-editor', // search results virtual document
    'comment', // very little context available and suggestions are often bad
    'git', // virtual file tracked by git
    'chat-editing-snapshot-text-model', // VS Code Chat temporary editing snapshot
]);
function wrapDoc(doc) {
    if (ignoreUriSchemes.has(doc.uri.scheme)) {
        return;
    }
    let text;
    try {
        text = doc.getText();
    }
    catch (e) {
        // "Invalid string length", it's too big to fit in a string
        if (e instanceof RangeError) {
            return;
        }
        throw e;
    }
    const languageId = (0, languageDetection_1.detectLanguage)({ uri: doc.uri.toString(), languageId: doc.languageId });
    return textDocument_1.CopilotTextDocument.create(doc.uri.toString(), doc.languageId, doc.version, text, languageId);
}
class ExtensionTextDocumentManager extends textDocumentManager_1.TextDocumentManager {
    constructor() {
        super(...arguments);
        this.onDidFocusTextDocument = (0, event_1.transformEvent)(vscode_1.window.onDidChangeActiveTextEditor, event => {
            return { document: event && { uri: event.document.uri.toString() } };
        });
        this.onDidChangeTextDocument = (0, event_1.transformEvent)(vscode_1.workspace.onDidChangeTextDocument, e => {
            const document = wrapDoc(e.document);
            return document && { document, contentChanges: e.contentChanges };
        });
        this.onDidOpenTextDocument = (0, event_1.transformEvent)(vscode_1.workspace.onDidOpenTextDocument, e => {
            // use wrapDoc() to handle the "Invalid string length" case
            const text = wrapDoc(e)?.getText();
            if (text === undefined) {
                return;
            }
            return { document: { uri: e.uri.toString(), languageId: e.languageId, version: e.version, text } };
        });
        this.onDidCloseTextDocument = (0, event_1.transformEvent)(vscode_1.workspace.onDidCloseTextDocument, e => {
            return { document: { uri: (0, uri_1.normalizeUri)(e.uri.toString()) } };
        });
        this.onDidChangeWorkspaceFolders = (0, event_1.transformEvent)(vscode_1.workspace.onDidChangeWorkspaceFolders, (e) => {
            return {
                workspaceFolders: this.getWorkspaceFolders(),
                added: e.added.map(f => ({ uri: f.uri.toString(), name: f.name })),
                removed: e.removed.map(f => ({ uri: f.uri.toString(), name: f.name })),
            };
        });
    }
    getTextDocumentsUnsafe() {
        const docs = [];
        for (const vscodeDoc of vscode_1.workspace.textDocuments) {
            const doc = wrapDoc(vscodeDoc);
            if (doc) {
                docs.push(doc);
            }
        }
        return docs;
    }
    findNotebook(doc) {
        for (const notebook of vscode_1.workspace.notebookDocuments) {
            if (notebook.getCells().some(cell => cell.document.uri.toString() === doc.uri.toString())) {
                return {
                    getCells: () => notebook.getCells().map(cell => this.wrapCell(cell)),
                    getCellFor: ({ uri }) => {
                        const cell = notebook.getCells().find(cell => cell.document.uri.toString() === uri.toString());
                        return cell ? this.wrapCell(cell) : undefined;
                    },
                };
            }
        }
    }
    wrapCell(cell) {
        return {
            ...cell,
            get document() {
                return textDocument_1.CopilotTextDocument.create(cell.document.uri.toString(), cell.document.languageId, cell.document.version, cell.document.getText(), 
                // use the original language id as cells have no metadata to leverage for language detection
                cell.document.languageId);
            },
        };
    }
    getWorkspaceFolders() {
        return (vscode_1.workspace.workspaceFolders?.map(f => {
            return { uri: f.uri.toString(), name: f.name };
        }) ?? []);
    }
}
exports.ExtensionTextDocumentManager = ExtensionTextDocumentManager;
//# sourceMappingURL=textDocumentManager.js.map