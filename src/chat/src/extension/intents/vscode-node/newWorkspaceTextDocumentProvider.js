"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewWorkspaceTextDocumentProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode_1 = require("vscode");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const newIntent_1 = require("../node/newIntent");
class NewWorkspaceTextDocumentProvider extends lifecycle_1.Disposable {
    constructor(contentManager) {
        super();
        this.contentManager = contentManager;
        this.onDidChangeEmitter = new vscode_1.EventEmitter();
        this.onDidChange = this.onDidChangeEmitter.event;
        this._register(vscode_1.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.scheme === newIntent_1.CopilotFileScheme) {
                this.onDidChangeEmitter.fire(e.document.uri);
            }
        }));
    }
    async provideTextDocumentContent(uri, token) {
        const node = this.contentManager.get(uri);
        if (!node) {
            return '';
        }
        let contentArray;
        try {
            contentArray = await node.content;
        }
        catch { }
        return new TextDecoder().decode(contentArray) ?? '';
    }
}
exports.NewWorkspaceTextDocumentProvider = NewWorkspaceTextDocumentProvider;
//# sourceMappingURL=newWorkspaceTextDocumentProvider.js.map