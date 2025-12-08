"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineReplyInterpreter = exports.SummarizedDocumentSplit = exports.PromptingSummarizedDocument = void 0;
exports.createPromptingSummarizedDocument = createPromptingSummarizedDocument;
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptCraftingTypes_1 = require("../../../inlineChat/node/promptCraftingTypes");
const importStatement_1 = require("../../../prompt/common/importStatement");
const editGeneration_1 = require("../../../prompt/node/editGeneration");
const intents_1 = require("../../../prompt/node/intents");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const summarizeDocumentHelpers_1 = require("./summarizedDocument/summarizeDocumentHelpers");
const workingCopies_1 = require("./workingCopies");
async function createPromptingSummarizedDocument(parserService, document, formattingOptions, userSelection, tokensBudget) {
    const result = await (0, summarizeDocumentHelpers_1.adjustSelectionAndSummarizeDocument)(parserService, document, formattingOptions, userSelection, tokensBudget);
    return new PromptingSummarizedDocument(result.selection, result.adjustedSelection, result.document, document, formattingOptions);
}
class PromptingSummarizedDocument {
    get uri() {
        return this._document.uri;
    }
    get languageId() {
        return this._document.languageId;
    }
    constructor(_selection, _adjustedSelection, _projectedDocument, _document, _formattingOptions) {
        this._selection = _selection;
        this._adjustedSelection = _adjustedSelection;
        this._projectedDocument = _projectedDocument;
        this._document = _document;
        this._formattingOptions = _formattingOptions;
    }
    splitAroundAdjustedSelection() {
        return new SummarizedDocumentSplit(this._projectedDocument, this.uri, this._formattingOptions, this._adjustedSelection);
    }
    splitAroundOriginalSelectionEnd() {
        return new SummarizedDocumentSplit(this._projectedDocument, this.uri, this._formattingOptions, new offsetRange_1.OffsetRange(this._selection.endExclusive, this._selection.endExclusive));
    }
}
exports.PromptingSummarizedDocument = PromptingSummarizedDocument;
class SummarizedDocumentSplit {
    get hasCodeWithoutSelection() {
        return (this.codeAbove.trim().length > 0
            || this.codeBelow.trim().length > 0);
    }
    get hasContent() {
        return (this.codeAbove.trim().length > 0
            || this.codeSelected.trim().length > 0
            || this.codeBelow.trim().length > 0);
    }
    constructor(_projectedDocument, _uri, _formattingOptions, offsetSelection) {
        this._projectedDocument = _projectedDocument;
        this._uri = _uri;
        this._formattingOptions = _formattingOptions;
        this._selection = this._projectedDocument.positionOffsetTransformer.toRange(offsetSelection);
        this.codeAbove = this._projectedDocument.text.substring(0, offsetSelection.start);
        this.codeSelected = this._projectedDocument.text.substring(offsetSelection.start, offsetSelection.endExclusive);
        this.codeBelow = this._projectedDocument.text.substring(offsetSelection.endExclusive);
    }
    get replaceSelectionStreaming() {
        return (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.ReplaceSelectionStreamingEdits(streamingWorkingCopyDocument, this._selection, lineFilter);
    }
    get insertStreaming() {
        return (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.InsertionStreamingEdits(streamingWorkingCopyDocument, this._selection.end, lineFilter);
    }
    get insertOrReplaceStreaming() {
        return (lineFilter, streamingWorkingCopyDocument) => new streamingEdits_1.InsertOrReplaceStreamingEdits(streamingWorkingCopyDocument, this._selection, this._selection, 3 /* EditStrategy.FallbackToInsertBelowRange */, true, lineFilter);
    }
    createReplyInterpreter(leadingMarkdownStreaming, earlyStopping, streamingStrategyFactory, textPieceClassifier, lineFilter) {
        return new InlineReplyInterpreter(this._uri, this._projectedDocument, this._formattingOptions, leadingMarkdownStreaming, earlyStopping, streamingStrategyFactory, textPieceClassifier, lineFilter);
    }
}
exports.SummarizedDocumentSplit = SummarizedDocumentSplit;
class InlineReplyInterpreter {
    constructor(_uri, summarizedDoc, _fileIndentInfo, _leadingMarkdownStreaming, _earlyStopping, _streamingStrategyFactory, _textPieceClassifier, _lineFilter) {
        this._uri = _uri;
        this._fileIndentInfo = _fileIndentInfo;
        this._leadingMarkdownStreaming = _leadingMarkdownStreaming;
        this._earlyStopping = _earlyStopping;
        this._streamingStrategyFactory = _streamingStrategyFactory;
        this._textPieceClassifier = _textPieceClassifier;
        this._lineFilter = _lineFilter;
        this._lastText = '';
        this._initialDocumentSnapshot = new workingCopies_1.DocumentSnapshot(summarizedDoc.originalText);
        this._workingCopySummarizedDoc = new workingCopies_1.WorkingCopyDerivedDocument(summarizedDoc);
    }
    async processResponse(context, inputStream, _outputStream, token) {
        const outputStream = this._workingCopySummarizedDoc.createDerivedDocumentChatResponseStream(_outputStream);
        const streamingWorkingCopyDocument = new streamingEdits_1.StreamingWorkingCopyDocument(outputStream, this._uri, this._workingCopySummarizedDoc.text, this._workingCopySummarizedDoc.text.split('\n').map((_, index) => new streamingEdits_1.SentLine(index, 4 /* SentInCodeBlock.Other */)), // not used
        new streamingEdits_1.LineRange(0, 0), // not used
        this._workingCopySummarizedDoc.languageId, this._fileIndentInfo);
        const streaming = new intents_1.StreamingEditsController(outputStream, this._leadingMarkdownStreaming, this._earlyStopping, this._textPieceClassifier, this._streamingStrategyFactory(this._lineFilter, streamingWorkingCopyDocument));
        for await (const part of inputStream) {
            this._lastText += part.delta.text;
            const { shouldFinish } = streaming.update(this._lastText);
            if (shouldFinish) {
                break;
            }
        }
        const { didEdits, didNoopEdits, additionalImports } = await streaming.finish();
        if (didEdits) {
            const additionalImportsEdits = this._generateAdditionalImportsEdits(additionalImports);
            const reversedEdits = this._workingCopySummarizedDoc.allReportedEdits.inverse(this._initialDocumentSnapshot.text);
            const entireModifiedRangeOffsets = reversedEdits.replacements.reduce((prev, curr) => prev.join(curr.replaceRange), reversedEdits.replacements[0].replaceRange);
            const entireModifiedRange = this._workingCopySummarizedDoc.originalDocumentTransformer.toRange(entireModifiedRangeOffsets);
            const store = {
                lastDocumentContent: this._workingCopySummarizedDoc.originalText,
                lastWholeRange: entireModifiedRange,
            };
            _outputStream.textEdit(this._uri, additionalImportsEdits);
            context.storeInInlineSession(store);
            return;
        }
        if (additionalImports.length > 0) {
            // No edits, but imports encountered
            _outputStream.textEdit(this._uri, this._generateAdditionalImportsEdits(additionalImports));
            return;
        }
        if (didNoopEdits) {
            // we attempted to do edits, but they were not meaningful, i.e. they didn't change anything
            context.addAnnotations([{ label: promptCraftingTypes_1.OutcomeAnnotationLabel.NOOP_EDITS, message: 'Edits were not applied because they were having no actual effects.', severity: 'info' }]);
            return;
        }
        if (!this._lastText) {
            return;
        }
        outputStream.markdown(this._lastText);
    }
    _generateAdditionalImportsEdits(additionalImports) {
        if (additionalImports.length === 0) {
            return [];
        }
        const documentLines = this._workingCopySummarizedDoc.originalText.split(/\r\n|\r|\n/g);
        const lastImportStatementLineIdx = (0, arraysFind_1.findLastIdx)(documentLines, l => (0, importStatement_1.isImportStatement)(l, this._workingCopySummarizedDoc.languageId));
        if (lastImportStatementLineIdx === -1) {
            // no existing import statements, we insert it on line 0
            return [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(0, 0, 0, 0), additionalImports.join('\n') + '\n\n')];
        }
        // traverse lines upward starting at `lastImportStatementLineIdx` to capture all existing imports
        const existingImports = new Set();
        for (let i = lastImportStatementLineIdx; i >= 0; i--) {
            const line = documentLines[i];
            if (line.trim() === '') { // skip empty lines
                continue;
            }
            if ((0, importStatement_1.isImportStatement)(line, this._workingCopySummarizedDoc.languageId)) {
                existingImports.add((0, editGeneration_1.trimLeadingWhitespace)(line));
            }
            else {
                break;
            }
        }
        additionalImports = additionalImports.filter(i => !existingImports.has(i));
        if (additionalImports.length === 0) {
            return [];
        }
        const lastImportStatementLineLength = documentLines[lastImportStatementLineIdx].length;
        return [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(lastImportStatementLineIdx, lastImportStatementLineLength, lastImportStatementLineIdx, lastImportStatementLineLength), '\n' + additionalImports.join('\n'))];
    }
}
exports.InlineReplyInterpreter = InlineReplyInterpreter;
//# sourceMappingURL=promptingSummarizedDocument.js.map