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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentEditor = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const notebookDocumentSnapshot_1 = require("../../../../platform/editing/common/notebookDocumentSnapshot");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const network_1 = require("../../../../util/vs/base/common/network");
const path = __importStar(require("../../../../util/vs/base/common/path"));
const vscodeTypes_1 = require("../../../../vscodeTypes");
const conversation_1 = require("../../../prompt/common/conversation");
const promptRenderer_1 = require("../base/promptRenderer");
const safeElements_1 = require("./safeElements");
let CurrentEditor = class CurrentEditor extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _tabsAndEditorsService, _alternativeNotebookContentService, _workspaceService, _promptEndpoint) {
        super(props);
        this._ignoreService = _ignoreService;
        this._tabsAndEditorsService = _tabsAndEditorsService;
        this._alternativeNotebookContentService = _alternativeNotebookContentService;
        this._workspaceService = _workspaceService;
        this._promptEndpoint = _promptEndpoint;
    }
    async render(state, sizing) {
        const editor = this._tabsAndEditorsService.activeTextEditor;
        if (editor) {
            // TODO@DonJayamanne, need to figure out places relying on this and how its used.
            // E.g. if problems were using this, then we need to translate positions in problems as well, & the like.
            // return editor.document.uri.scheme === Schemas.vscodeNotebookCell ?
            // 	this.renderActiveNotebookCellEditor(editor) :
            // 	this.renderActiveTextEditor(editor);
            return this.renderActiveTextEditor(editor);
        }
        const notebookEditor = this._tabsAndEditorsService.activeNotebookEditor;
        if (notebookEditor) {
            return this.renderActiveNotebookEditor(notebookEditor);
        }
        return undefined;
    }
    async renderActiveTextEditor(editor) {
        const ranges = editor.visibleRanges;
        const document = editor.document;
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        if (document.getText().trim().length === 0) {
            // The document is empty or contains only whitespace
            return (vscpp(vscppf, null,
                vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                    vscpp("references", { value: [new conversation_1.PromptReference(document.uri)] }),
                    "The active ",
                    document.languageId,
                    " file ",
                    path.basename(document.uri.path),
                    " is empty.")));
        }
        if (ranges.length === 0) {
            return undefined;
        }
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, ranges.map(range => (vscpp(vscppf, null,
                "Excerpt from active file ",
                path.basename(document.uri.path),
                ", lines ",
                range.start.line + 1,
                " to ",
                range.end.line + 1,
                ":",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { code: document.getText(range), languageId: document.languageId, uri: document.uri, references: [new conversation_1.PromptReference({ uri: document.uri, range })] }),
                vscpp("br", null),
                vscpp("br", null)))))));
    }
    async renderActiveNotebookCellEditor(editor) {
        if (editor.document.uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            return;
        }
        const notebook = (0, notebooks_1.findNotebook)(editor.document.uri, this._workspaceService.notebookDocuments);
        const cellIndex = notebook && (0, notebooks_1.findCell)(editor.document.uri, notebook)?.index;
        if (!notebook || typeof cellIndex === 'undefined' || cellIndex < 0) {
            return;
        }
        const format = this._alternativeNotebookContentService.getFormat(this._promptEndpoint);
        const document = notebookDocumentSnapshot_1.NotebookDocumentSnapshot.create(notebook, format);
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        if (document.getText().trim().length === 0) {
            // The document is empty or contains only whitespace
            return (vscpp(vscppf, null,
                vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                    vscpp("references", { value: [new conversation_1.PromptReference(document.uri)] }),
                    "The active ",
                    document.languageId,
                    " file ",
                    path.basename(document.uri.path),
                    " is empty.")));
        }
        if (editor.visibleRanges.length === 0) {
            return undefined;
        }
        const altDocument = this._alternativeNotebookContentService.create(format).getAlternativeDocument(notebook);
        const cell = notebook.cellAt(cellIndex);
        const ranges = editor.visibleRanges.map(range => {
            const start = altDocument.fromCellPosition(cell, range.start);
            const end = altDocument.fromCellPosition(cell, range.end);
            return new vscodeTypes_1.Range(start, end);
        });
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, ranges.map(range => (vscpp(vscppf, null,
                "Excerpt from active file ",
                path.basename(document.uri.path),
                ", lines ",
                range.start.line + 1,
                " to ",
                range.end.line + 1,
                ":",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { code: document.getText(range), languageId: document.languageId, uri: document.uri, references: [new conversation_1.PromptReference({ uri: document.uri, range })] }),
                vscpp("br", null),
                vscpp("br", null)))))));
    }
    async renderActiveNotebookEditor(editor) {
        const notebookRanges = editor.visibleRanges;
        const format = this._alternativeNotebookContentService.getFormat(this._promptEndpoint);
        const document = notebookDocumentSnapshot_1.NotebookDocumentSnapshot.create(editor.notebook, format);
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        if (document.getText().trim().length === 0) {
            // The document is empty or contains only whitespace
            return (vscpp(vscppf, null,
                vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                    vscpp("references", { value: [new conversation_1.PromptReference(document.uri)] }),
                    "The active ",
                    document.languageId,
                    " file ",
                    path.basename(document.uri.path),
                    " is empty.")));
        }
        if (notebookRanges.length === 0) {
            return undefined;
        }
        const altDocument = this._alternativeNotebookContentService.create(format).getAlternativeDocument(editor.notebook);
        const ranges = notebookRanges.map(range => {
            const cell = editor.notebook.cellAt(range.start);
            const lastLine = cell.document.lineAt(cell.document.lineCount - 1);
            const start = altDocument.fromCellPosition(cell, new vscodeTypes_1.Position(0, 0));
            const end = altDocument.fromCellPosition(cell, lastLine.range.end);
            return new vscodeTypes_1.Range(start, end);
        });
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, ranges.map(range => (vscpp(vscppf, null,
                "Excerpt from active file ",
                path.basename(document.uri.path),
                ", lines ",
                range.start.line + 1,
                " to ",
                range.end.line + 1,
                ":",
                vscpp("br", null),
                vscpp(safeElements_1.CodeBlock, { code: document.getText(range), languageId: document.languageId, uri: document.uri, references: [new conversation_1.PromptReference({ uri: document.uri, range })] }),
                vscpp("br", null),
                vscpp("br", null)))))));
    }
};
exports.CurrentEditor = CurrentEditor;
exports.CurrentEditor = CurrentEditor = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(3, alternativeContent_1.IAlternativeNotebookContentService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, promptRenderer_1.IPromptEndpoint)
], CurrentEditor);
//# sourceMappingURL=currentEditor.js.map