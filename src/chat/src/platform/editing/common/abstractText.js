"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringTextDocumentWithLanguageId = exports.StringTextDocument = exports.VsCodeTextDocument = exports.AbstractDocument = void 0;
const lazy_1 = require("../../../util/vs/base/common/lazy");
const position_1 = require("../../../util/vs/editor/common/core/position");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const positionToOffset_1 = require("../../../util/vs/editor/common/core/text/positionToOffset");
const vscodeTypes_1 = require("../../../vscodeTypes");
/**
 * Represents an immutable view of a string with line/column characteristics.
 * Offers many methods to work with various data types (ranges, positions, offsets, ...).
*/
class AbstractDocument {
    rangeToOffsetRange(range) {
        return new offsetRange_1.OffsetRange(this.getOffsetAtPosition(range.start), this.getOffsetAtPosition(range.end));
    }
    offsetRangeToRange(offsetRange) {
        return new vscodeTypes_1.Range(this.getPositionAtOffset(offsetRange.start), this.getPositionAtOffset(offsetRange.endExclusive));
    }
    get length() {
        return this.getText().length;
    }
}
exports.AbstractDocument = AbstractDocument;
class VsCodeTextDocument extends AbstractDocument {
    constructor(document) {
        super();
        this.document = document;
        this.uri = this.document.uri;
        this.languageId = this.document.languageId;
        this._transformer = new lazy_1.Lazy(() => new positionToOffset_1.PositionOffsetTransformer(this.document.getText()));
    }
    getLineText(lineIndex) {
        return this.document.lineAt(lineIndex).text;
    }
    getLineLength(lineIndex) {
        return this.document.lineAt(lineIndex).text.length;
    }
    getLineCount() {
        return this.document.lineCount;
    }
    getText() {
        return this.document.getText();
    }
    getTextInOffsetRange(offsetRange) {
        return offsetRange.substring(this.document.getText());
    }
    getPositionAtOffset(offset) {
        return this.document.positionAt(offset);
    }
    getOffsetAtPosition(position) {
        return this.document.offsetAt(position);
    }
    getPositionOffsetTransformer() {
        return this._transformer.value;
    }
}
exports.VsCodeTextDocument = VsCodeTextDocument;
class StringTextDocument extends AbstractDocument {
    constructor(value) {
        super();
        this.value = value;
        this._transformer = new positionToOffset_1.PositionOffsetTransformer(this.value);
    }
    getText() {
        return this.value;
    }
    getLineText(lineIndex) {
        const startOffset = this._transformer.getOffset(new position_1.Position(lineIndex + 1, 1));
        const endOffset = startOffset + this.getLineLength(lineIndex);
        return this.value.substring(startOffset, endOffset);
    }
    getLineLength(lineIndex) {
        return this._transformer.getLineLength(lineIndex + 1);
    }
    getLineCount() {
        return this._transformer.textLength.lineCount + 1;
    }
    getTextInOffsetRange(offsetRange) {
        return offsetRange.substring(this.value);
    }
    getPositionAtOffset(offset) {
        return corePositionToVSCodePosition(this._transformer.getPosition(offset));
    }
    getOffsetAtPosition(position) {
        position = this._validatePosition(position);
        return this._transformer.getOffset(vsCodePositionToCorePosition(position));
    }
    _validatePosition(position) {
        if (position.line < 0) {
            return new vscodeTypes_1.Position(0, 0);
        }
        const lineCount = this._transformer.textLength.lineCount + 1;
        if (position.line >= lineCount) {
            const lineLength = this._transformer.getLineLength(lineCount);
            return new vscodeTypes_1.Position(lineCount - 1, lineLength);
        }
        if (position.character < 0) {
            return new vscodeTypes_1.Position(position.line, 0);
        }
        const lineLength = this._transformer.getLineLength(position.line + 1);
        if (position.character > lineLength) {
            return new vscodeTypes_1.Position(position.line, lineLength);
        }
        return position;
    }
    getPositionOffsetTransformer() {
        return this._transformer;
    }
}
exports.StringTextDocument = StringTextDocument;
class StringTextDocumentWithLanguageId extends StringTextDocument {
    constructor(value, languageId) {
        super(value);
        this.languageId = languageId;
    }
}
exports.StringTextDocumentWithLanguageId = StringTextDocumentWithLanguageId;
function corePositionToVSCodePosition(position) {
    return new vscodeTypes_1.Position(position.lineNumber - 1, position.column - 1);
}
function vsCodePositionToCorePosition(position) {
    return new position_1.Position(position.line + 1, position.character + 1);
}
//# sourceMappingURL=abstractText.js.map