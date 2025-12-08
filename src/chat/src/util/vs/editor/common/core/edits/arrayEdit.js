"use strict";
//!!! DO NOT modify, this file was COPIED from 'microsoft/vscode'
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayReplacement = exports.ArrayEdit = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const offsetRange_1 = require("../ranges/offsetRange");
const edit_1 = require("./edit");
/**
 * Represents a set of replacements to an array.
 * All these replacements are applied at once.
*/
class ArrayEdit extends edit_1.BaseEdit {
    static { this.empty = new ArrayEdit([]); }
    static create(replacements) {
        return new ArrayEdit(replacements);
    }
    static single(replacement) {
        return new ArrayEdit([replacement]);
    }
    static replace(range, replacement) {
        return new ArrayEdit([new ArrayReplacement(range, replacement)]);
    }
    static insert(offset, replacement) {
        return new ArrayEdit([new ArrayReplacement(offsetRange_1.OffsetRange.emptyAt(offset), replacement)]);
    }
    static delete(range) {
        return new ArrayEdit([new ArrayReplacement(range, [])]);
    }
    _createNew(replacements) {
        return new ArrayEdit(replacements);
    }
    apply(data) {
        const resultData = [];
        let pos = 0;
        for (const edit of this.replacements) {
            resultData.push(...data.slice(pos, edit.replaceRange.start));
            resultData.push(...edit.newValue);
            pos = edit.replaceRange.endExclusive;
        }
        resultData.push(...data.slice(pos));
        return resultData;
    }
    /**
     * Creates an edit that reverts this edit.
     */
    inverse(baseVal) {
        const edits = [];
        let offset = 0;
        for (const e of this.replacements) {
            edits.push(new ArrayReplacement(offsetRange_1.OffsetRange.ofStartAndLength(e.replaceRange.start + offset, e.newValue.length), baseVal.slice(e.replaceRange.start, e.replaceRange.endExclusive)));
            offset += e.newValue.length - e.replaceRange.length;
        }
        return new ArrayEdit(edits);
    }
}
exports.ArrayEdit = ArrayEdit;
class ArrayReplacement extends edit_1.BaseReplacement {
    constructor(range, newValue) {
        super(range);
        this.newValue = newValue;
    }
    equals(other) {
        return this.replaceRange.equals(other.replaceRange) && this.newValue.length === other.newValue.length && this.newValue.every((v, i) => v === other.newValue[i]);
    }
    getNewLength() { return this.newValue.length; }
    tryJoinTouching(other) {
        return new ArrayReplacement(this.replaceRange.joinRightTouching(other.replaceRange), this.newValue.concat(other.newValue));
    }
    slice(range, rangeInReplacement) {
        return new ArrayReplacement(range, rangeInReplacement.slice(this.newValue));
    }
}
exports.ArrayReplacement = ArrayReplacement;
//# sourceMappingURL=arrayEdit.js.map