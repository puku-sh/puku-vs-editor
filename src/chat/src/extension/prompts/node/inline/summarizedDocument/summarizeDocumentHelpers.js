"use strict";
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
exports.DocumentSummarizer = exports.NotebookDocumentSummarizer = void 0;
exports.getCharLimit = getCharLimit;
exports.adjustSelectionAndSummarizeDocument = adjustSelectionAndSummarizeDocument;
exports.summarizeDocument = summarizeDocument;
exports.summarizeDocumentSync = summarizeDocumentSync;
exports.summarizeDocuments = summarizeDocuments;
const abstractText_1 = require("../../../../../platform/editing/common/abstractText");
const parserService_1 = require("../../../../../platform/parser/node/parserService");
const stringEdit_1 = require("../../../../../util/vs/editor/common/core/edits/stringEdit");
const selectionContextHelpers_1 = require("../../../../context/node/resolvers/selectionContextHelpers");
const adjustSelection_1 = require("../adjustSelection");
const summarizeDocument_1 = require("./summarizeDocument");
function getCharLimit(tokensBudget) {
    return tokensBudget * 4; // roughly 4 chars per token
}
/**
 * The selection is first adjusted {@link getAdjustedSelection} and then the document is summarized using the adjusted selection.
*/
async function adjustSelectionAndSummarizeDocument(parserService, document, formattingOptions, selection, tokensBudget, settings) {
    const structure = await (0, selectionContextHelpers_1.getStructure)(parserService, document, formattingOptions);
    const result = (0, adjustSelection_1.getAdjustedSelection)(structure, new abstractText_1.VsCodeTextDocument(document), selection);
    const doc = summarizeDocumentSync(getCharLimit(tokensBudget), document, selection, structure, settings);
    return {
        document: doc,
        adjustedSelection: doc.projectOffsetRange(result.adjusted),
        selection: doc.projectOffsetRange(result.original),
    };
}
class NotebookDocumentSummarizer {
    constructor() { }
    async summarizeDocument(document, _formattingOptions, _selection, _tokensBudget, _settings) {
        return new summarizeDocument_1.ProjectedDocument(document.getText(), stringEdit_1.StringEdit.empty, document.languageId);
    }
}
exports.NotebookDocumentSummarizer = NotebookDocumentSummarizer;
let DocumentSummarizer = class DocumentSummarizer {
    constructor(_parserService) {
        this._parserService = _parserService;
    }
    summarizeDocument(document, formattingOptions, selection, tokensBudget, settings) {
        return summarizeDocument(this._parserService, document, formattingOptions, selection, tokensBudget, settings);
    }
};
exports.DocumentSummarizer = DocumentSummarizer;
exports.DocumentSummarizer = DocumentSummarizer = __decorate([
    __param(0, parserService_1.IParserService)
], DocumentSummarizer);
async function summarizeDocument(parserService, document, formattingOptions, selection, tokensBudget, settings) {
    const structure = await (0, selectionContextHelpers_1.getStructure)(parserService, document, formattingOptions);
    return summarizeDocumentSync(getCharLimit(tokensBudget), document, selection, structure, settings);
}
function summarizeDocumentSync(charLimit, document, selection, overlayNodeRoot, settings = {}) {
    const result = (0, summarizeDocument_1.summarizeDocumentsSync)(charLimit, settings, [{ document, overlayNodeRoot, selection }]);
    return result[0];
}
/**
 * Summarizes multiple tokens against a shared token budget
 */
async function summarizeDocuments(parserService, documentData, tokensBudget, settings) {
    const items = [];
    await Promise.all(documentData.map(async (data) => {
        const overlayNodeRoot = await (0, selectionContextHelpers_1.getStructure)(parserService, data.document, data.formattingOptions);
        items.push({
            document: data.document,
            selection: data.selection,
            overlayNodeRoot
        });
    }));
    return (0, summarizeDocument_1.summarizeDocumentsSync)(tokensBudget, settings ?? {}, items);
}
//# sourceMappingURL=summarizeDocumentHelpers.js.map