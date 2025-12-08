"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.VirtualTextDocumentProvider = void 0;
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
class VirtualTextDocumentProvider extends lifecycle_1.Disposable {
    static { this.id = 0; }
    constructor(scheme) {
        super();
        this.scheme = scheme;
        this._documents = new Map();
        this._didChangeEmitter = new vscode_1.EventEmitter();
        this._register(vscode_1.workspace.registerTextDocumentContentProvider(scheme, {
            provideTextDocumentContent: (uri, token) => {
                const doc = this._documents.get(uri.toString());
                if (!doc) {
                    return '(document not found)';
                }
                return doc.content;
            },
            onDidChange: this._didChangeEmitter.event,
        }));
    }
    clear() {
        this._documents.clear();
    }
    createDocument(data = '', extension = 'txt') {
        const uri = vscode_1.Uri.parse(`${this.scheme}:///virtual-text-document/${VirtualTextDocumentProvider.id++}.${extension}`);
        const document = new VirtualDocument(uri, () => this._didChangeEmitter.fire(uri));
        document.setContent(data);
        this._documents.set(uri.toString(), document);
        return document;
    }
    createUriForData(data, extension = 'txt') {
        const d = this.createDocument(data, extension);
        return d.uri;
    }
    createDocumentForUri(uri) {
        if (uri.scheme !== this.scheme) {
            throw new Error(`Invalid scheme: ${uri.scheme}`);
        }
        const document = new VirtualDocument(uri, () => this._didChangeEmitter.fire(uri));
        this._documents.set(uri.toString(), document);
        return document;
    }
    openUri(uri) {
        vscode_1.commands.executeCommand('vscode.open', uri);
    }
}
exports.VirtualTextDocumentProvider = VirtualTextDocumentProvider;
class VirtualDocument {
    get content() {
        return this._content;
    }
    constructor(uri, _handleChanged) {
        this.uri = uri;
        this._handleChanged = _handleChanged;
        this._content = '';
    }
    setContent(content) {
        this._content = content;
        this._handleChanged();
    }
}
//# sourceMappingURL=virtualTextDocumentProvider.js.map