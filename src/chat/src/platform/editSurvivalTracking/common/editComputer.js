"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentEditRecorder = exports.EditComputer = void 0;
const errors_1 = require("../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const diffService_1 = require("../../diff/common/diffService");
const edit_1 = require("../../editing/common/edit");
const workspaceService_1 = require("../../workspace/common/workspaceService");
let EditComputer = class EditComputer extends lifecycle_1.Disposable {
    constructor(_baseText, _document, _workspaceService, _diffService) {
        super();
        this._baseText = _baseText;
        this._document = _document;
        this._workspaceService = _workspaceService;
        this._diffService = _diffService;
        this._baseDocumentText = this._document.getText();
        /**
         * ```
         * _baseText
         * ----diffEdits---->
         * _baseDocumentText
         * ----_editsOnTop---->
         * _document.getText()
         * ```
        */
        this._editsOnTop = stringEdit_1.StringEdit.empty;
        this._register(this._workspaceService.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() !== this._document.uri.toString()) {
                return;
            }
            const edits = (0, edit_1.stringEditFromTextContentChange)(e.contentChanges);
            this._editsOnTop = this._editsOnTop.compose(edits);
        }));
    }
    async compute() {
        const diffEdits = await (0, edit_1.stringEditFromDiff)(this._baseText, this._baseDocumentText, this._diffService);
        return {
            document: this._document,
            baseText: this._baseText,
            getEditsSinceInitial: () => {
                if (this._store.isDisposed) {
                    throw new errors_1.BugIndicatingError('EditComputer has been disposed');
                }
                return diffEdits.compose(this._editsOnTop);
            }
        };
    }
};
exports.EditComputer = EditComputer;
exports.EditComputer = EditComputer = __decorate([
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, diffService_1.IDiffService)
], EditComputer);
let DocumentEditRecorder = class DocumentEditRecorder extends lifecycle_1.Disposable {
    constructor(textDocument, _workspaceService) {
        super();
        this.textDocument = textDocument;
        this._workspaceService = _workspaceService;
        this._edits = stringEdit_1.StringEdit.empty;
        this.initialTextVersion = this.textDocument.version;
        this._register(this._workspaceService.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === this.textDocument.uri.toString()) {
                const edits = (0, edit_1.stringEditFromTextContentChange)(e.contentChanges);
                this._edits = this._edits.compose(edits);
            }
        }));
    }
    /**
     * ```
     * this.initialTextVersion
     * ----this.getEdits()---->
     * this.textDocument.version
     * ```
    */
    getEdits() {
        if (this._store.isDisposed) {
            throw new errors_1.BugIndicatingError('DocumentEditRecorder has been disposed');
        }
        return this._edits;
    }
};
exports.DocumentEditRecorder = DocumentEditRecorder;
exports.DocumentEditRecorder = DocumentEditRecorder = __decorate([
    __param(1, workspaceService_1.IWorkspaceService)
], DocumentEditRecorder);
//# sourceMappingURL=editComputer.js.map