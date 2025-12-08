"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncReader = exports.AsyncReaderEndOfStream = exports.PartialAsyncTextReader = exports.TextPieceClassifiers = exports.ClassifiedTextPiece = exports.LineOfText = exports.LineFilters = exports.StreamingWorkingCopyDocument = exports.LineRange = exports.SentLine = exports.StreamingEditsResult = exports.ReplaceSelectionStreamingEdits = exports.InsertionStreamingEdits = exports.InsertOrReplaceStreamingEdits = void 0;
exports.streamLines = streamLines;
const async_1 = require("../../../util/vs/base/common/async");
const vscodeTypes_1 = require("../../../vscodeTypes");
const codeGuesser_1 = require("../common/codeGuesser");
const importStatement_1 = require("../common/importStatement");
const editGeneration_1 = require("./editGeneration");
const indentationGuesser_1 = require("./indentationGuesser");
class InsertOrReplaceStreamingEdits {
    constructor(myDocument, initialSelection, adjustedSelection, editStrategy, collectImports = true, lineFilter = LineFilters.noop) {
        this.myDocument = myDocument;
        this.initialSelection = initialSelection;
        this.adjustedSelection = adjustedSelection;
        this.editStrategy = editStrategy;
        this.collectImports = collectImports;
        this.lineFilter = lineFilter;
        this.replyIndentationTracker = null;
    }
    async processStream(_stream) {
        // console.log();
        // console.log();
        let stream = async_1.AsyncIterableObject.filter(_stream, this.lineFilter);
        if (this.collectImports) {
            stream = collectImportsIfNoneWereSentInRange(stream, this.myDocument, this.adjustedSelection);
        }
        let anchorLineIndex = this.myDocument.firstSentLineIndex;
        for await (const el of this.findInitialAnchor(stream)) {
            if (el instanceof LineWithAnchorInfo) {
                anchorLineIndex = this.handleFirstReplyLine(el.anchor, el.line);
            }
            else {
                anchorLineIndex = this.handleSubsequentReplyLine(anchorLineIndex, el.value);
            }
        }
        if (this.myDocument.didReplaceEdits && anchorLineIndex <= this.adjustedSelection.end.line) {
            // anchorIndex hasn't reached the end of the ICodeContextInfo.range
            // Emit a deletion of all remaining lines in the selection block
            this.myDocument.deleteLines(anchorLineIndex, this.adjustedSelection.end.line);
        }
        return new StreamingEditsResult(this.myDocument.didNoopEdits, this.myDocument.didEdits, this.myDocument.additionalImports);
    }
    handleFirstReplyLine(anchor, line) {
        if (anchor) {
            this.replyIndentationTracker = new ReplyIndentationTracker(this.myDocument, anchor.lineIndex, line);
            const fixedLine = this.replyIndentationTracker.reindent(line, this.myDocument.indentStyle);
            if (this.myDocument.getLine(anchor.lineIndex).sentInCodeBlock === 2 /* SentInCodeBlock.Range */) {
                // Matched a line in the range => replace the entire sent range
                return this.myDocument.replaceLines(this.adjustedSelection.start.line, anchor.lineIndex, fixedLine);
            }
            else {
                return this.myDocument.replaceLine(anchor.lineIndex, fixedLine);
            }
        }
        // No anchor found
        const firstRangeLine = this.adjustedSelection.start.line;
        this.replyIndentationTracker = new ReplyIndentationTracker(this.myDocument, firstRangeLine, line);
        const fixedLine = this.replyIndentationTracker.reindent(line, this.myDocument.indentStyle);
        if (this.initialSelection.isEmpty) {
            const cursorLineContent = this.myDocument.getLine(firstRangeLine).content;
            if (/^\s*$/.test(cursorLineContent)
                || fixedLine.adjustedContent.startsWith(cursorLineContent)) {
                // Cursor sitting on an empty or whitespace only line or the reply continues the line
                return this.myDocument.replaceLine(firstRangeLine, fixedLine, /*isPreserving*/ true);
            }
        }
        if (this.editStrategy === 1 /* EditStrategy.FallbackToInsertAboveRange */) {
            return this.myDocument.insertLineBefore(firstRangeLine, fixedLine);
        }
        if (this.editStrategy === 3 /* EditStrategy.FallbackToInsertBelowRange */ || this.editStrategy === 4 /* EditStrategy.ForceInsertion */) {
            return this.myDocument.insertLineAfter(firstRangeLine, fixedLine);
        }
        // DefaultEditStrategy.ReplaceRange
        return this.myDocument.replaceLine(firstRangeLine, fixedLine);
    }
    handleSubsequentReplyLine(anchorLineIndex, line) {
        const fixedLine = this.replyIndentationTracker.reindent(line, this.myDocument.indentStyle);
        if (fixedLine.trimmedContent !== '' || this.myDocument.didReplaceEdits) {
            // search for a matching line only if the incoming line is not empty
            // or if we have already made destructive edits
            const matchedLine = this.matchReplyLine(fixedLine, anchorLineIndex);
            if (matchedLine) {
                return this.myDocument.replaceLines(anchorLineIndex, matchedLine.lineIndex, fixedLine);
            }
        }
        if (anchorLineIndex >= this.myDocument.getLineCount()) {
            // end of file => insert semantics!
            return this.myDocument.appendLineAtEndOfDocument(fixedLine);
        }
        const existingLine = this.myDocument.getLine(anchorLineIndex);
        if (!existingLine.isSent || existingLine.content === '' || fixedLine.trimmedContent === '') {
            // line not sent or dealing empty lines => insert semantics!
            return this.myDocument.insertLineBefore(anchorLineIndex, fixedLine);
        }
        if (existingLine.indentLevel < fixedLine.adjustedIndentLevel) {
            // do not leave current scope with the incoming line
            return this.myDocument.insertLineBefore(anchorLineIndex, fixedLine);
        }
        if (existingLine.indentLevel === fixedLine.adjustedIndentLevel && !this.myDocument.didReplaceEdits) {
            // avoid overwriting sibling scope if no destructive edits have been made so far
            return this.myDocument.insertLineBefore(anchorLineIndex, fixedLine);
        }
        return this.myDocument.replaceLine(anchorLineIndex, fixedLine);
    }
    matchReplyLine(replyLine, minimumLineIndex) {
        const isVeryShortReplyLine = replyLine.trimmedContent.length <= 3;
        for (let lineIndex = minimumLineIndex; lineIndex < this.myDocument.getLineCount(); lineIndex++) {
            const documentLine = this.myDocument.getLine(lineIndex);
            if (!documentLine.isSent) {
                continue;
            }
            if (documentLine.normalizedContent === replyLine.adjustedContent) {
                // bingo!
                return new MatchedDocumentLine(lineIndex);
            }
            if (documentLine.trimmedContent.length > 0 && documentLine.indentLevel < replyLine.adjustedIndentLevel) {
                // we shouldn't proceed with the search if we need to jump over original code that is more outdented
                return null;
            }
            if (isVeryShortReplyLine && documentLine.trimmedContent.length > 0) {
                // don't jump over original code with content if the reply is very short
                return null;
            }
        }
        return null;
    }
    /**
     * Waits until at least 10 non-whitespace characters are seen in the stream
     * Then tries to find a sequence of sent lines that match those first lines in the stream
     */
    findInitialAnchor(lineStream) {
        return new async_1.AsyncIterableObject(async (emitter) => {
            const accumulatedLines = [];
            let accumulatedRealChars = 0; // non whitespace chars
            let anchorFound = false;
            for await (const line of lineStream) {
                if (!anchorFound) {
                    accumulatedLines.push(line);
                    accumulatedRealChars += line.value.trim().length;
                    if (accumulatedRealChars > 10) {
                        const anchor = this.searchForEqualSentLines(accumulatedLines);
                        anchorFound = true;
                        emitter.emitOne(new LineWithAnchorInfo(accumulatedLines[0].value, anchor));
                        emitter.emitMany(accumulatedLines.slice(1));
                    }
                }
                else {
                    emitter.emitOne(line);
                }
            }
        });
    }
    /**
     * Search for a contiguous set of lines in the document that match the lines.
     * The equality is done with trimmed content.
     */
    searchForEqualSentLines(lines) {
        const trimmedLines = lines.map(line => line.value.trim());
        for (let i = this.myDocument.firstSentLineIndex, stopAt = this.myDocument.getLineCount() - lines.length; i <= stopAt; i++) {
            if (!this.myDocument.getLine(i).isSent) {
                continue;
            }
            let matchedAllLines = true;
            for (let j = 0; j < trimmedLines.length; j++) {
                const documentLine = this.myDocument.getLine(i + j);
                if (!documentLine.isSent || documentLine.trimmedContent !== trimmedLines[j]) {
                    matchedAllLines = false;
                    break;
                }
            }
            if (matchedAllLines) {
                return new MatchedDocumentLine(i);
            }
        }
        return null;
    }
}
exports.InsertOrReplaceStreamingEdits = InsertOrReplaceStreamingEdits;
class InsertionStreamingEdits {
    constructor(_myDocument, _cursorPosition, _lineFilter = LineFilters.noop) {
        this._myDocument = _myDocument;
        this._cursorPosition = _cursorPosition;
        this._lineFilter = _lineFilter;
        this.replyIndentationTracker = null;
    }
    async processStream(_stream) {
        let stream = async_1.AsyncIterableObject.filter(_stream, this._lineFilter);
        stream = collectImportsIfNoneWereSentInRange(stream, this._myDocument, new vscodeTypes_1.Range(this._cursorPosition, this._cursorPosition));
        let anchorLineIndex = 0;
        for await (const line of stream) {
            if (!this.replyIndentationTracker) {
                // This is the first line
                anchorLineIndex = this.handleFirstReplyLine(line.value);
            }
            else {
                anchorLineIndex = this.handleSubsequentReplyLine(anchorLineIndex, line.value);
            }
        }
        return new StreamingEditsResult(this._myDocument.didNoopEdits, this._myDocument.didEdits, this._myDocument.additionalImports);
    }
    handleFirstReplyLine(replyLine) {
        const firstRangeLine = this._cursorPosition.line;
        const cursorLineContent = this._myDocument.getLine(firstRangeLine).content;
        // Cursor sitting on an empty or whitespace only line or the reply continues the line
        const shouldLineBeReplaced = /^\s*$/.test(cursorLineContent) || replyLine.trimStart().startsWith(cursorLineContent.trimStart());
        const lineNumForIndentGuessing = shouldLineBeReplaced // @ulugbekna: if we are insert line "after" (ie using `insertLineAfter`) we should guess indentation starting from where we insert the line
            ? firstRangeLine
            : (this._myDocument.getLineCount() <= firstRangeLine + 1 ? firstRangeLine : firstRangeLine + 1);
        this.replyIndentationTracker = new ReplyIndentationTracker(this._myDocument, lineNumForIndentGuessing, replyLine);
        const fixedLine = this.replyIndentationTracker.reindent(replyLine, this._myDocument.indentStyle);
        if (shouldLineBeReplaced) {
            return this._myDocument.replaceLine(firstRangeLine, fixedLine, /*isPreserving*/ true);
        }
        return this._myDocument.insertLineAfter(firstRangeLine, fixedLine);
    }
    handleSubsequentReplyLine(anchorLineIndex, line) {
        const fixedLine = this.replyIndentationTracker.reindent(line, this._myDocument.indentStyle);
        return this._myDocument.insertLineBefore(anchorLineIndex, fixedLine);
    }
}
exports.InsertionStreamingEdits = InsertionStreamingEdits;
class ReplaceSelectionStreamingEdits {
    constructor(_myDocument, _selection, _lineFilter = LineFilters.noop) {
        this._myDocument = _myDocument;
        this._selection = _selection;
        this._lineFilter = _lineFilter;
        this.replyIndentationTracker = null;
    }
    async processStream(_stream) {
        let stream = async_1.AsyncIterableObject.filter(_stream, this._lineFilter);
        stream = collectImportsIfNoneWereSentInRange(stream, this._myDocument, this._selection);
        let anchorLineIndex = 0;
        let replaceLineCount;
        let initialTextOnLineAfterSelection = '';
        if (this._selection.end.line > this._selection.start.line && this._selection.end.character === 0) {
            replaceLineCount = this._selection.end.line - this._selection.start.line;
        }
        else {
            replaceLineCount = this._selection.end.line - this._selection.start.line + 1;
            initialTextOnLineAfterSelection = this._myDocument.getLine(this._selection.end.line).content.substring(this._selection.end.character);
        }
        for await (const line of stream) {
            if (!this.replyIndentationTracker) {
                // This is the first line
                // anchorLineIndex = this.handleFirstReplyLine(line);
                const firstRangeLine = this._selection.start.line;
                this.replyIndentationTracker = new ReplyIndentationTracker(this._myDocument, firstRangeLine, line.value);
                const fixedLine = this.replyIndentationTracker.reindent(line.value, this._myDocument.indentStyle);
                anchorLineIndex = this._myDocument.replaceLine(firstRangeLine, fixedLine);
                replaceLineCount--;
            }
            else {
                // anchorLineIndex = this.handleSubsequentReplyLine(anchorLineIndex, line);
                const fixedLine = this.replyIndentationTracker.reindent(line.value, this._myDocument.indentStyle);
                if (replaceLineCount > 0) {
                    anchorLineIndex = this._myDocument.replaceLine(anchorLineIndex, fixedLine);
                    replaceLineCount--;
                }
                else {
                    anchorLineIndex = this._myDocument.insertLineAfter(anchorLineIndex - 1, fixedLine);
                    // anchorLineIndex = this._myDocument.insertLineBefore(anchorLineIndex, fixedLine);
                }
            }
        }
        if (this._myDocument.didEdits && replaceLineCount > 0) {
            this._myDocument.deleteLines(anchorLineIndex, anchorLineIndex + replaceLineCount - 1);
        }
        if (this._myDocument.didEdits && initialTextOnLineAfterSelection.length > 0) {
            this._myDocument.replaceLine(anchorLineIndex - 1, this._myDocument.getLine(anchorLineIndex - 1).content + initialTextOnLineAfterSelection);
        }
        return new StreamingEditsResult(this._myDocument.didNoopEdits, this._myDocument.didEdits, this._myDocument.additionalImports);
    }
}
exports.ReplaceSelectionStreamingEdits = ReplaceSelectionStreamingEdits;
class StreamingEditsResult {
    constructor(didNoopEdits, didEdits, additionalImports) {
        this.didNoopEdits = didNoopEdits;
        this.didEdits = didEdits;
        this.additionalImports = additionalImports;
    }
}
exports.StreamingEditsResult = StreamingEditsResult;
/**
 * Keeps track of the indentation of the reply lines and is able to
 * reindent reply lines to match the document, keeping their relative indentation.
 */
class ReplyIndentationTracker {
    constructor(document, documentLineIdx, replyLine) {
        let docIndentLevel = 0;
        for (let i = documentLineIdx; i >= 0; i--) {
            const documentLine = document.getLine(i);
            // Use the indent of the first non-empty line
            if (documentLine.content.length > 0) {
                docIndentLevel = documentLine.indentLevel;
                if (i !== documentLineIdx) {
                    // The first non-empty line is not the current line, indent if necessary
                    if (documentLine.content.endsWith('{') ||
                        (document.languageId === 'python' && documentLine.content.endsWith(':'))) {
                        // TODO: this is language specific
                        docIndentLevel += 1;
                    }
                }
                break;
            }
        }
        this._replyIndentStyle = IndentUtils.guessIndentStyleFromLine(replyLine);
        const replyIndentLevel = (0, indentationGuesser_1.computeIndentLevel2)(replyLine, this._replyIndentStyle?.tabSize ?? 4);
        this.indentDelta = replyIndentLevel - docIndentLevel;
    }
    reindent(replyLine, desiredStyle) {
        if (replyLine === '') {
            // Do not indent empty lines artificially
            return new ReplyLine('', 0, '', 0);
        }
        if (!this._replyIndentStyle) {
            this._replyIndentStyle = IndentUtils.guessIndentStyleFromLine(replyLine);
        }
        let originalIndentLevel = 0;
        let adjustedIndentLevel = 0;
        const determineAdjustedIndentLevel = (currentIndentLevel) => {
            originalIndentLevel = currentIndentLevel;
            adjustedIndentLevel = Math.max(originalIndentLevel - this.indentDelta, 0);
            return adjustedIndentLevel;
        };
        const adjustedContent = IndentUtils.reindentLine(replyLine, this._replyIndentStyle ?? { insertSpaces: true, tabSize: 4 }, desiredStyle, determineAdjustedIndentLevel);
        return new ReplyLine(replyLine, originalIndentLevel, adjustedContent, adjustedIndentLevel);
    }
}
class LineWithAnchorInfo {
    constructor(line, anchor) {
        this.line = line;
        this.anchor = anchor;
    }
}
class SentLine {
    constructor(lineIndex, sentInCodeBlock) {
        this.lineIndex = lineIndex;
        this.sentInCodeBlock = sentInCodeBlock;
    }
}
exports.SentLine = SentLine;
class LineRange {
    constructor(startLineIndex, endLineIndex) {
        this.startLineIndex = startLineIndex;
        this.endLineIndex = endLineIndex;
    }
}
exports.LineRange = LineRange;
/**
 * Keeps track of the current document with edits applied immediately.
 */
class StreamingWorkingCopyDocument {
    get didNoopEdits() {
        return this._didNoopEdits;
    }
    get didEdits() {
        return this._didEdits;
    }
    get didReplaceEdits() {
        return this._didReplaceEdits;
    }
    get additionalImports() {
        return this._additionalImports;
    }
    constructor(outputStream, uri, sourceCode, sentLines, selection, languageId, fileIndentInfo) {
        this.outputStream = outputStream;
        this.uri = uri;
        this.languageId = languageId;
        this._originalLines = [];
        this.lines = [];
        this._didNoopEdits = false;
        this._didEdits = false;
        this._didReplaceEdits = false;
        this._additionalImports = [];
        // console.info(`---------\nNEW StreamingWorkingCopyDocument`);
        this.indentStyle = IndentUtils.getDocumentIndentStyle(sourceCode, fileIndentInfo);
        this._originalLines = sourceCode.split(/\r\n|\r|\n/g);
        for (let i = 0; i < this._originalLines.length; i++) {
            this.lines[i] = new DocumentLine(this._originalLines[i], this.indentStyle);
        }
        this.firstSentLineIndex = Number.MAX_SAFE_INTEGER;
        for (const sentLine of sentLines) {
            this.lines[sentLine.lineIndex].markSent(sentLine.sentInCodeBlock);
            this.firstSentLineIndex = Math.min(this.firstSentLineIndex, sentLine.lineIndex);
        }
        this.firstSentLineIndex = Math.min(this.firstSentLineIndex, selection.startLineIndex);
    }
    getText() {
        return this.lines.map(line => line.content).join('\n');
    }
    getLineCount() {
        return this.lines.length;
    }
    getLine(index) {
        if (index < 0 || index >= this.lines.length) {
            throw new Error(`Invalid index`);
        }
        return this.lines[index];
    }
    addAdditionalImport(importStatement) {
        this._additionalImports.push(importStatement);
    }
    replaceLine(index, line, isPreserving = false) {
        const newLineContent = typeof line === 'string' ? line : line.adjustedContent;
        // console.info(`replaceLine(${index}, ${this.lines[index].content}, ${newLineContent})`);
        if (this.lines[index].content === newLineContent) {
            this._didNoopEdits = true;
            // no need to really replace the line
            return index + 1;
        }
        this.lines[index] = new DocumentLine(newLineContent, this.indentStyle);
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(index, 0, index, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), newLineContent)]);
        this._didEdits = true;
        this._didReplaceEdits = this._didReplaceEdits || (isPreserving ? false : true);
        return index + 1;
    }
    replaceLines(fromIndex, toIndex, line) {
        if (fromIndex > toIndex) {
            throw new Error(`Invalid range`);
        }
        if (fromIndex === toIndex) {
            return this.replaceLine(fromIndex, line);
        }
        // console.info(`replaceLines(${fromIndex}, ${toIndex}, ${line.adjustedContent})`);
        this.lines.splice(fromIndex, toIndex - fromIndex + 1, new DocumentLine(line.adjustedContent, this.indentStyle));
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(fromIndex, 0, toIndex, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), line.adjustedContent)]);
        this._didEdits = true;
        this._didReplaceEdits = true;
        return fromIndex + 1;
    }
    appendLineAtEndOfDocument(line) {
        // console.info(`appendLine(${line.adjustedContent})`);
        this.lines.push(new DocumentLine(line.adjustedContent, this.indentStyle));
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(this.lines.length - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, this.lines.length - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), '\n' + line.adjustedContent)]);
        this._didEdits = true;
        return this.lines.length;
    }
    insertLineAfter(index, line) {
        // console.info(`insertLineAfter(${index}, ${this.lines[index].content}, ${line.adjustedContent})`);
        this.lines.splice(index + 1, 0, new DocumentLine(line.adjustedContent, this.indentStyle));
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(index, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, index, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), '\n' + line.adjustedContent)]);
        this._didEdits = true;
        return index + 2;
    }
    insertLineBefore(index, line) {
        if (index === this.lines.length) {
            // we must insert after the last line
            return this.insertLineAfter(index - 1, line);
        }
        // console.info(`insertLineBefore(${index}, ${this.lines[index].content}, ${line.adjustedContent})`);
        this.lines.splice(index, 0, new DocumentLine(line.adjustedContent, this.indentStyle));
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(index, 0, index, 0), line.adjustedContent + '\n')]);
        this._didEdits = true;
        return index + 1;
    }
    deleteLines(fromIndex, toIndex) {
        // console.info(`deleteLines(${fromIndex}, ${toIndex})`);
        this.lines.splice(fromIndex, toIndex - fromIndex + 1);
        this.outputStream.textEdit(this.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(fromIndex, 0, toIndex + 1, 0), '')]); // TODO: what about end of document??
        this._didEdits = true;
        this._didReplaceEdits = true;
        return fromIndex + 1;
    }
}
exports.StreamingWorkingCopyDocument = StreamingWorkingCopyDocument;
class ReplyLine {
    constructor(originalContent, // as returned from the LLM
    originalIndentLevel, adjustedContent, // adjusted for insertion in the document
    adjustedIndentLevel) {
        this.originalContent = originalContent;
        this.originalIndentLevel = originalIndentLevel;
        this.adjustedContent = adjustedContent;
        this.adjustedIndentLevel = adjustedIndentLevel;
        this.trimmedContent = this.originalContent.trim();
    }
}
class MatchedDocumentLine {
    constructor(lineIndex) {
        this.lineIndex = lineIndex;
    }
}
class DocumentLine {
    get isSent() {
        return this._sentInCodeBlock !== 0 /* SentInCodeBlock.None */;
    }
    get sentInCodeBlock() {
        return this._sentInCodeBlock;
    }
    get trimmedContent() {
        if (this._trimmedContent === null) {
            this._trimmedContent = this.content.trim();
        }
        return this._trimmedContent;
    }
    get normalizedContent() {
        if (this._normalizedContent === null) {
            this._normalizedContent = (0, indentationGuesser_1.normalizeIndentation)(this.content, this._indentStyle.tabSize, this._indentStyle.insertSpaces);
        }
        return this._normalizedContent;
    }
    get indentLevel() {
        if (this._indentLevel === -1) {
            this._indentLevel = (0, indentationGuesser_1.computeIndentLevel2)(this.content, this._indentStyle.tabSize);
        }
        return this._indentLevel;
    }
    constructor(content, _indentStyle) {
        this.content = content;
        this._indentStyle = _indentStyle;
        this._sentInCodeBlock = 0 /* SentInCodeBlock.None */;
        this._trimmedContent = null;
        this._normalizedContent = null;
        this._indentLevel = -1;
    }
    markSent(sentInCodeBlock) {
        this._sentInCodeBlock = sentInCodeBlock;
    }
}
class IndentUtils {
    static getDocumentIndentStyle(sourceCode, fileIndentInfo) {
        if (fileIndentInfo) {
            // the indentation is known
            return fileIndentInfo;
        }
        // we need to detect the indentation
        return (0, indentationGuesser_1.guessIndentation)(editGeneration_1.Lines.fromString(sourceCode), 4, false);
    }
    static guessIndentStyleFromLine(line) {
        const leadingWhitespace = IndentUtils._getLeadingWhitespace(line);
        if (leadingWhitespace === '' || leadingWhitespace === ' ') {
            // insufficient information
            return undefined;
        }
        return (0, indentationGuesser_1.guessIndentation)([line], 4, false);
    }
    static reindentLine(line, originalIndentStyle, desiredIndentStyle, getDesiredIndentLevel = (n) => n) {
        let indentLevel = (0, indentationGuesser_1.computeIndentLevel2)(line, originalIndentStyle.tabSize);
        const desiredIndentLevel = getDesiredIndentLevel(indentLevel);
        // First we outdent to 0 and then we indent to the desired level
        // This ensures that we normalize indentation in the process and that we
        // maintain any trailing spaces at the end of the tab stop
        while (indentLevel > 0) {
            line = this._outdent(line, originalIndentStyle);
            indentLevel--;
        }
        while (indentLevel < desiredIndentLevel) {
            line = '\t' + line;
            indentLevel++;
        }
        return (0, indentationGuesser_1.normalizeIndentation)(line, desiredIndentStyle.tabSize, desiredIndentStyle.insertSpaces);
    }
    static _outdent(line, indentStyle) {
        let chrIndex = 0;
        while (chrIndex < line.length) {
            const chr = line.charCodeAt(chrIndex);
            if (chr === 9 /* CharCode.Tab */) {
                // consume the tab and stop
                chrIndex++;
                break;
            }
            if (chr !== 32 /* CharCode.Space */) {
                // never remove non whitespace characters
                break;
            }
            if (chrIndex === indentStyle.tabSize) {
                // reached the maximum number of spaces
                break;
            }
            chrIndex++;
        }
        return line.substring(chrIndex);
    }
    /**
     * Gets all whitespace characters at the start of a string.
     */
    static _getLeadingWhitespace(line) {
        for (let i = 0; i < line.length; i++) {
            const char = line.charCodeAt(i);
            if (char !== 32 && char !== 9) { // 32 is ASCII for space and 9 is ASCII for tab
                return line.substring(0, i);
            }
        }
        return line;
    }
}
class LineFilters {
    static combine(...filters) {
        return (line) => filters.every(filter => filter ? filter(line) : true);
    }
    static { this.noop = () => true; }
    /**
     * Keeps only lines that are inside ``` code blocks.
     */
    static createCodeBlockFilter() {
        let state = 0 /* State.BeforeCodeBlock */;
        return (line) => {
            if (state === 0 /* State.BeforeCodeBlock */) {
                if (/^```/.test(line.value)) {
                    state = 1 /* State.InCodeBlock */;
                }
                return false;
            }
            if (state === 1 /* State.InCodeBlock */) {
                if (/^```/.test(line.value)) {
                    state = 2 /* State.AfterCodeBlock */;
                    return false;
                }
                return true;
            }
            // text after code block
            return false;
        };
    }
}
exports.LineFilters = LineFilters;
/**
 * A line of text. Does not include the newline character.
 */
class LineOfText {
    constructor(value) {
        this.__lineOfTextBrand = undefined;
        this.value = value.replace(/\r$/, '');
    }
}
exports.LineOfText = LineOfText;
class ClassifiedTextPiece {
    constructor(value, kind) {
        this.value = value;
        this.kind = kind;
    }
}
exports.ClassifiedTextPiece = ClassifiedTextPiece;
class TextPieceClassifiers {
    /**
     * Classifies lines using ``` code blocks.
     */
    static createCodeBlockClassifier() {
        return TextPieceClassifiers.attemptToRecoverFromMissingCodeBlock(TextPieceClassifiers.createFencedBlockClassifier('```'));
    }
    static attemptToRecoverFromMissingCodeBlock(classifier) {
        return (source) => {
            return new async_1.AsyncIterableObject(async (emitter) => {
                // We buffer all pieces until the first code block, then
                // we open the gate and start emitting all pieces immediately.
                const bufferedPieces = [];
                let sawOnlyLeadingText = true;
                for await (const piece of classifier(source)) {
                    if (!sawOnlyLeadingText) {
                        emitter.emitOne(piece);
                    }
                    else if (piece.kind === 0 /* TextPieceKind.OutsideCodeBlock */) {
                        bufferedPieces.push(piece);
                    }
                    else {
                        sawOnlyLeadingText = false;
                        for (const p of bufferedPieces) {
                            emitter.emitOne(p);
                        }
                        bufferedPieces.length = 0;
                        emitter.emitOne(piece);
                    }
                }
                // if we never found a code block, we emit all pieces at the end
                if (sawOnlyLeadingText) {
                    const allText = bufferedPieces.map(p => p.value).join('');
                    if ((0, codeGuesser_1.looksLikeCode)(allText)) {
                        emitter.emitOne(new ClassifiedTextPiece(allText, 1 /* TextPieceKind.InsideCodeBlock */));
                    }
                    else {
                        emitter.emitOne(new ClassifiedTextPiece(allText, 0 /* TextPieceKind.OutsideCodeBlock */));
                    }
                }
            });
        };
    }
    /**
     * Classifies lines using fenced blocks with the provided fence.
     */
    static createAlwaysInsideCodeBlockClassifier() {
        return (source) => {
            return async_1.AsyncIterableObject.map(source, line => new ClassifiedTextPiece(line, 1 /* TextPieceKind.InsideCodeBlock */));
        };
    }
    /**
     * Classifies lines using fenced blocks with the provided fence.
     */
    static createFencedBlockClassifier(fence) {
        return (source) => {
            return new async_1.AsyncIterableObject(async (emitter) => {
                const reader = new PartialAsyncTextReader(source[Symbol.asyncIterator]());
                let state = 0 /* TextPieceKind.OutsideCodeBlock */;
                while (!reader.endOfStream) {
                    const text = await reader.peek(fence.length);
                    if (text !== fence) {
                        // consume and emit immediately all pieces until newline or end of stream
                        while (!reader.endOfStream) {
                            // we want to consume any piece that is available in order to emit it immediately
                            const piece = reader.readImmediateExcept('\n');
                            if (piece.length > 0) {
                                emitter.emitOne(new ClassifiedTextPiece(piece, state));
                            }
                            const nextChar = await reader.peek(1);
                            if (nextChar === '\n') {
                                reader.readImmediate(1);
                                emitter.emitOne(new ClassifiedTextPiece('\n', state));
                                break;
                            }
                        }
                    }
                    else {
                        const lineWithFence = await reader.readLineIncludingLF();
                        state = state === 1 /* TextPieceKind.InsideCodeBlock */ ? 0 /* TextPieceKind.OutsideCodeBlock */ : 1 /* TextPieceKind.InsideCodeBlock */;
                        emitter.emitOne(new ClassifiedTextPiece(lineWithFence, 2 /* TextPieceKind.Delimiter */));
                    }
                }
            });
        };
    }
}
exports.TextPieceClassifiers = TextPieceClassifiers;
class PartialAsyncTextReader {
    get endOfStream() { return this._buffer.length === 0 && this._atEnd; }
    constructor(_source) {
        this._source = _source;
        this._buffer = '';
        this._atEnd = false;
    }
    async extendBuffer() {
        if (this._atEnd) {
            return;
        }
        const { value, done } = await this._source.next();
        if (done) {
            this._atEnd = true;
        }
        else {
            this._buffer += value;
        }
    }
    /**
     * Waits until n characters are available in the buffer or the end of the stream is reached.
     */
    async waitForLength(n) {
        while (this._buffer.length < n && !this._atEnd) {
            await this.extendBuffer();
        }
    }
    /**
     * Peeks `n` characters or less if the stream ends.
     */
    async peek(n) {
        await this.waitForLength(n);
        return this._buffer.substring(0, n);
    }
    /**
     * Reads `n` characters or less if the stream ends.
     */
    async read(n) {
        await this.waitForLength(n);
        const result = this._buffer.substring(0, n);
        this._buffer = this._buffer.substring(n);
        return result;
    }
    /**
     * Read all available characters until `char`
     */
    async readUntil(char) {
        let result = '';
        while (!this.endOfStream) {
            const piece = this.readImmediateExcept(char);
            result += piece;
            const nextChar = await this.peek(1);
            if (nextChar === char) {
                break;
            }
        }
        return result;
    }
    /**
     * Read an entire line including \n or until end of stream.
     */
    async readLineIncludingLF() {
        // consume all pieces until newline or end of stream
        let line = await this.readUntil('\n');
        // the next char should be \n or we're at end of stream
        line += await this.read(1);
        return line;
    }
    /**
     * Read an entire line until \n (excluding \n) or until end of stream.
     * The \n is consumed from the stream
     */
    async readLine() {
        // consume all pieces until newline or end of stream
        const line = await this.readUntil('\n');
        // the next char should be \n or we're at end of stream
        await this.read(1);
        return line;
    }
    /**
     * Returns immediately with all available characters until `char`.
     */
    readImmediateExcept(char) {
        const endIndex = this._buffer.indexOf(char);
        return this.readImmediate(endIndex === -1 ? this._buffer.length : endIndex);
    }
    /**
     * Returns immediately with all available characters, but at most `n` characters.
     */
    readImmediate(n) {
        const result = this._buffer.substring(0, n);
        this._buffer = this._buffer.substring(n);
        return result;
    }
}
exports.PartialAsyncTextReader = PartialAsyncTextReader;
class AsyncReaderEndOfStream {
}
exports.AsyncReaderEndOfStream = AsyncReaderEndOfStream;
class AsyncReader {
    static { this.EOS = new AsyncReaderEndOfStream(); }
    get endOfStream() { return this._buffer.length === 0 && this._atEnd; }
    constructor(_source) {
        this._source = _source;
        this._buffer = [];
        this._atEnd = false;
    }
    async extendBuffer() {
        if (this._atEnd) {
            return;
        }
        const { value, done } = await this._source.next();
        if (done) {
            this._atEnd = true;
        }
        else {
            this._buffer.push(value);
        }
    }
    async peek() {
        if (this._buffer.length === 0 && !this._atEnd) {
            await this.extendBuffer();
        }
        if (this._buffer.length === 0) {
            return AsyncReader.EOS;
        }
        return this._buffer[0];
    }
    async read() {
        if (this._buffer.length === 0 && !this._atEnd) {
            await this.extendBuffer();
        }
        if (this._buffer.length === 0) {
            return AsyncReader.EOS;
        }
        return this._buffer.shift();
    }
    async readWhile(predicate, callback) {
        do {
            const piece = await this.peek();
            if (piece instanceof AsyncReaderEndOfStream) {
                break;
            }
            if (!predicate(piece)) {
                break;
            }
            await this.read(); // consume
            await callback(piece);
        } while (true);
    }
    async consumeToEnd() {
        while (!this.endOfStream) {
            await this.read();
        }
    }
}
exports.AsyncReader = AsyncReader;
/**
 * Split an incoming stream of text to a stream of lines.
 */
function streamLines(source) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let buffer = '';
        for await (const str of source) {
            buffer += str;
            do {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    break;
                }
                // take the first line
                const line = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                emitter.emitOne(new LineOfText(line));
            } while (true);
        }
        if (buffer.length > 0) {
            // last line which doesn't end with \n
            emitter.emitOne(new LineOfText(buffer));
        }
    });
}
function hasImportsInRange(doc, range) {
    const startLine = (range.start.character === 0 ? range.start.line : range.start.line + 1);
    const endLine = (doc.getLine(range.end.line).content.length === range.end.character ? range.end.line : range.end.line - 1);
    for (let i = startLine; i <= endLine; i++) {
        if ((0, importStatement_1.isImportStatement)(doc.getLine(i).content, doc.languageId)) {
            return true;
        }
    }
    return false;
}
function collectImportsIfNoneWereSentInRange(stream, doc, rangeToCheckForImports) {
    if (hasImportsInRange(doc, rangeToCheckForImports)) {
        // there are imports in the sent code block
        // no need to collect imports
        return stream;
    }
    // collect imports separately
    let extractedImports = false;
    let hasCode = false;
    return stream.filter(line => {
        if ((0, importStatement_1.isImportStatement)(line.value, doc.languageId)) {
            doc.addAdditionalImport((0, editGeneration_1.trimLeadingWhitespace)(line.value));
            extractedImports = true;
            return false;
        }
        const isOnlyWhitespace = (line.value.trim().length === 0);
        if (isOnlyWhitespace && extractedImports) {
            // there are imports in the reply which we have moved up
            // survive the empty line if it is inside code
            return hasCode;
        }
        hasCode = true;
        return true;
    });
}
//# sourceMappingURL=streamingEdits.js.map