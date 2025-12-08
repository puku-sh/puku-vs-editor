"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeContextRegion = exports.CodeContextTracker = void 0;
const selectionContextHelpers_1 = require("../../context/node/resolvers/selectionContextHelpers");
/**
 * A tracker for the number of characters in a sequence of lines.
 */
class CodeContextTracker {
    constructor(charLimit) {
        this.charLimit = charLimit;
        this._totalChars = 0;
    }
    get totalChars() {
        return this._totalChars;
    }
    addLine(line) {
        this._totalChars += line.length + 1;
    }
    lineWouldFit(line) {
        return this._totalChars + line.length + 1 < this.charLimit;
    }
}
exports.CodeContextTracker = CodeContextTracker;
/**
 * Represents a sequence of lines in the document.
 */
class CodeContextRegion {
    get hasContent() {
        if (this.lines.length === 0 || this.nonTrimWhitespaceCharCount === 0) {
            return false;
        }
        return this.lines.length > 0;
    }
    constructor(tracker, document, language) {
        this.tracker = tracker;
        this.document = document;
        this.language = language;
        this.lines = [];
        this.firstLineIndex = this.document.lineCount;
        this.lastLineIndex = -1;
        this.isComplete = false;
        this.nonTrimWhitespaceCharCount = 0;
        this.lines = [];
        this.firstLineIndex = document.lineCount;
        this.lastLineIndex = -1;
    }
    generatePrompt() {
        if (!this.hasContent) {
            return [];
        }
        const result = [];
        result.push('```' + this.language.languageId); // TODO@ulugbekna: use languageIdToMDCodeBlockLang & createFencedCodeBlock
        result.push(selectionContextHelpers_1.FilePathCodeMarker.forDocument(this.language, this.document)); //
        result.push(...this.lines);
        result.push('```');
        return result;
    }
    prependLine(lineIndex) {
        const line = this.document.lineAt(lineIndex);
        const lineText = line.text;
        if (!this.tracker.lineWouldFit(lineText)) {
            return false;
        }
        this.firstLineIndex = Math.min(this.firstLineIndex, lineIndex);
        this.lastLineIndex = Math.max(this.lastLineIndex, lineIndex);
        this.lines.unshift(lineText);
        this.tracker.addLine(lineText);
        this.nonTrimWhitespaceCharCount += lineText.trim().length;
        return true;
    }
    appendLine(lineIndex) {
        const line = this.document.lineAt(lineIndex);
        const lineText = line.text;
        if (!this.tracker.lineWouldFit(lineText)) {
            return false;
        }
        this.firstLineIndex = Math.min(this.firstLineIndex, lineIndex);
        this.lastLineIndex = Math.max(this.lastLineIndex, lineIndex);
        this.lines.push(lineText);
        this.tracker.addLine(lineText);
        this.nonTrimWhitespaceCharCount += lineText.trim().length;
        return true;
    }
    /**
     * Trims the empty lines from the beginning and end of the code context region.
     * If a `rangeToNotModify` is provided, it will not trim away lines included in that range.
     * @param rangeToNotModify Optional range to not modify while trimming.
     */
    trim(rangeToNotModify) {
        // remove empty lines from the beginning
        // but do not trim away lines included in `rangeToNotModify`
        const maxFirstLineIndex = rangeToNotModify ? Math.min(this.lastLineIndex, rangeToNotModify.start.line) : this.lastLineIndex;
        while (this.firstLineIndex < maxFirstLineIndex && this.lines.length > 0 && this.lines[0].trim().length === 0) {
            this.firstLineIndex++;
            this.lines.shift();
        }
        // remove empty lines from the end
        // but do not trim away lines included in `rangeToNotModify`
        const minLastLineIndex = rangeToNotModify ? Math.max(this.firstLineIndex, rangeToNotModify.end.line) : this.firstLineIndex;
        while (minLastLineIndex < this.lastLineIndex &&
            this.lines.length > 0 &&
            this.lines[this.lines.length - 1].trim().length === 0) {
            this.lastLineIndex--;
            this.lines.pop();
        }
    }
    toString() {
        return `{${this.firstLineIndex} -> ${this.lastLineIndex}}`;
    }
}
exports.CodeContextRegion = CodeContextRegion;
//# sourceMappingURL=codeContextRegion.js.map