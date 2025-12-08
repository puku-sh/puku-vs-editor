"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAstNode = toAstNode;
exports.subtractRange = subtractRange;
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
function toAstNode(node, fn) {
    const data = fn(node);
    return {
        ...data,
        range: [data.range.start, data.range.endExclusive],
        children: data.children?.map(child => toAstNode(child, fn)),
    };
}
function subtractRange(range, ranges) {
    // idx of first element that touches range or that is after range
    const joinRangeStartIdx = (0, arraysFind_1.findFirstIdxMonotonousOrArrLen)(ranges, r => r.endExclusive >= range.start);
    // idx of element after { last element that touches range or that is before range }
    const joinRangeEndIdxExclusive = (0, arraysFind_1.findLastIdxMonotonous)(ranges, r => r.start <= range.endExclusive) + 1;
    if (joinRangeStartIdx === joinRangeEndIdxExclusive) {
        return [range];
    }
    const result = [];
    let start = range.start;
    for (let i = joinRangeStartIdx; i < joinRangeEndIdxExclusive; i++) {
        const r = ranges[i];
        if (r.start > start) {
            result.push(new offsetRange_1.OffsetRange(start, r.start));
        }
        start = r.endExclusive;
    }
    if (start < range.endExclusive) {
        result.push(new offsetRange_1.OffsetRange(start, range.endExclusive));
    }
    return result;
}
//# sourceMappingURL=visualization.js.map