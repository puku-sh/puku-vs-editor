"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnnotatedLineRanges = exports.AnnotatedLineRange = void 0;
const lineRange_1 = require("../vs/editor/common/core/ranges/lineRange");
class AnnotatedLineRange extends lineRange_1.LineRange {
    static fromLineRange(range) {
        return new AnnotatedLineRange(range.startLineNumber, range.endLineNumberExclusive, undefined);
    }
    static fromLineRangeWithData(range, data) {
        return new AnnotatedLineRange(range.startLineNumber, range.endLineNumberExclusive, data);
    }
    constructor(startLineNumber, endLineNumberExclusive, data) {
        super(startLineNumber, endLineNumberExclusive);
        this.data = data;
    }
}
exports.AnnotatedLineRange = AnnotatedLineRange;
class AnnotatedLineRanges {
    constructor(
    /**
     * Have to be sorted and disjoined.
    */
    ranges) {
        this.ranges = ranges;
    }
    getFilled(range) {
        const filledRanges = [];
        let lastEndLineNumberExclusive = range.startLineNumber;
        for (const r of this.ranges) {
            if (r.startLineNumber > lastEndLineNumberExclusive) {
                filledRanges.push(new AnnotatedLineRange(lastEndLineNumberExclusive, r.startLineNumber, undefined));
            }
            filledRanges.push(r);
            lastEndLineNumberExclusive = r.endLineNumberExclusive;
        }
        if (lastEndLineNumberExclusive < range.endLineNumberExclusive) {
            filledRanges.push(new AnnotatedLineRange(lastEndLineNumberExclusive, range.endLineNumberExclusive, undefined));
        }
        return new AnnotatedLineRanges(filledRanges);
    }
    intersects(range) {
        for (const r of this.ranges) {
            if (r.intersectsStrict(range)) {
                return true;
            }
        }
        return false;
    }
    withAdded(range) {
        const newRanges = [...this.ranges];
        newRanges.push(range);
        newRanges.sort((a, b) => a.startLineNumber - b.startLineNumber);
        return new AnnotatedLineRanges(newRanges);
    }
}
exports.AnnotatedLineRanges = AnnotatedLineRanges;
//# sourceMappingURL=annotatedLineRange.js.map