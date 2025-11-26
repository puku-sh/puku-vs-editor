/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../editor/common/core/range.js';
import { LineRange } from '../../../../../editor/common/core/ranges/lineRange.js';
/**
 * TODO: Deprecate in favor of LineRange!
 */
export class MergeEditorLineRange extends LineRange {
    static fromLineNumbers(startLineNumber, endExclusiveLineNumber) {
        return MergeEditorLineRange.fromLength(startLineNumber, endExclusiveLineNumber - startLineNumber);
    }
    static fromLength(startLineNumber, length) {
        return new MergeEditorLineRange(startLineNumber, startLineNumber + length);
    }
    join(other) {
        return MergeEditorLineRange.fromLineNumbers(Math.min(this.startLineNumber, other.startLineNumber), Math.max(this.endLineNumberExclusive, other.endLineNumberExclusive));
    }
    isAfter(range) {
        return this.startLineNumber >= range.endLineNumberExclusive;
    }
    isBefore(range) {
        return range.startLineNumber >= this.endLineNumberExclusive;
    }
    delta(lineDelta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber + lineDelta, this.length);
    }
    deltaEnd(delta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber, this.length + delta);
    }
    deltaStart(lineDelta) {
        return MergeEditorLineRange.fromLength(this.startLineNumber + lineDelta, this.length - lineDelta);
    }
    getLines(model) {
        const result = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = model.getLineContent(this.startLineNumber + i);
        }
        return result;
    }
    toInclusiveRangeOrEmpty() {
        if (this.isEmpty) {
            return new Range(this.startLineNumber, 1, this.startLineNumber, 1);
        }
        return new Range(this.startLineNumber, 1, this.endLineNumberExclusive - 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    }
}
//# sourceMappingURL=lineRange.js.map