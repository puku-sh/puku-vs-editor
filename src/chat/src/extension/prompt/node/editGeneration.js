"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lines = exports.LinesEdit = void 0;
exports.isLines = isLines;
exports.trimLeadingWhitespace = trimLeadingWhitespace;
const vscodeTypes_1 = require("../../../vscodeTypes");
class LinesEdit {
    constructor(firstLineIndex, endLineIndex, lines, prefix = '', suffix = '\n') {
        this.firstLineIndex = firstLineIndex;
        this.endLineIndex = endLineIndex;
        this.lines = lines;
        this.prefix = prefix;
        this.suffix = suffix;
    }
    toTextEdit() {
        const text = this.lines.length > 0 ? (this.prefix + this.lines.join('\n') + this.suffix) : '';
        return vscodeTypes_1.TextEdit.replace(new vscodeTypes_1.Range(this.firstLineIndex, 0, this.endLineIndex, 0), text);
    }
    apply(lines) {
        const before = lines.slice(0, this.firstLineIndex);
        const after = lines.slice(this.endLineIndex);
        return before.concat(this.lines, after);
    }
    static insert(line, lines) {
        return new LinesEdit(line, line, lines);
    }
    static replace(firstLineIndex, endLineIndex, lines, isLastLine = false) {
        if (isLastLine) {
            return new LinesEdit(firstLineIndex, endLineIndex, lines, '', '');
        }
        return new LinesEdit(firstLineIndex, endLineIndex, lines);
    }
}
exports.LinesEdit = LinesEdit;
var Lines;
(function (Lines) {
    function fromString(code) {
        if (code.length === 0) {
            return [];
        }
        return code.split(/\r\n|\r|\n/g);
    }
    Lines.fromString = fromString;
    function fromDocument(doc) {
        if (doc.lineCount === 0) {
            return [];
        }
        const result = [];
        for (let i = 0; i < doc.lineCount; i++) {
            result.push(doc.lineAt(i).text);
        }
        return result;
    }
    Lines.fromDocument = fromDocument;
})(Lines || (exports.Lines = Lines = {}));
function isLines(lines) {
    return Array.isArray(lines) && typeof lines[0] === 'string';
}
function trimLeadingWhitespace(str) {
    return str.replace(/^\s+/g, '');
}
//# sourceMappingURL=editGeneration.js.map