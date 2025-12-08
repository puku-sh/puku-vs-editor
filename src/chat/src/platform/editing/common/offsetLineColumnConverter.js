"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffsetLineColumnConverter = void 0;
const position_1 = require("../../../util/vs/editor/common/core/position");
class OffsetLineColumnConverter {
    /** 1-based number of lines in the source text. */
    get lines() {
        return this._lineStartOffsets.length;
    }
    constructor(text) {
        this._lineStartOffsets = [0];
        let index = 0;
        while (index < text.length) {
            const ch = text.charCodeAt(index);
            index++; // go to next index
            if (ch === 13 /* CharCode.CarriageReturn */ || ch === 10 /* CharCode.LineFeed */) {
                if (ch === 13 /* CharCode.CarriageReturn */ && index < text.length && text.charCodeAt(index) === 10 /* CharCode.LineFeed */) {
                    index++;
                }
                this._lineStartOffsets.push(index);
            }
        }
    }
    lineOffset(lineNumber) {
        return this._lineStartOffsets[lineNumber - 1];
    }
    offsetToPosition(offset) {
        let lineNumber = 1;
        for (; lineNumber < this._lineStartOffsets.length; lineNumber++) {
            if (this._lineStartOffsets[lineNumber] > offset) {
                break;
            }
        }
        const column = offset - this._lineStartOffsets[lineNumber - 1];
        return new position_1.Position(lineNumber, column + 1);
    }
    startOffsetOfLineContaining(offset) {
        let lineNumber = 1;
        for (; lineNumber < this._lineStartOffsets.length; lineNumber++) {
            if (this._lineStartOffsets[lineNumber] > offset) {
                break;
            }
        }
        return this._lineStartOffsets[lineNumber - 1];
    }
    positionToOffset(position) {
        if (position.lineNumber >= this._lineStartOffsets.length) {
            return this._lineStartOffsets[this._lineStartOffsets.length - 1] + position.column - 1;
        }
        return this._lineStartOffsets[position.lineNumber - 1] + position.column - 1;
    }
}
exports.OffsetLineColumnConverter = OffsetLineColumnConverter;
//# sourceMappingURL=offsetLineColumnConverter.js.map