"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const range_1 = require("../../../../util/vs/editor/common/core/range");
const textLength_1 = require("../../../../util/vs/editor/common/core/text/textLength");
const textEditLength_1 = require("../../common/dataTypes/textEditLength");
(0, vitest_1.describe)('getRange', () => {
    (0, vitest_1.it)('should return undefined for empty edits', () => {
        const textLengthEdit = textEditLength_1.TextLengthEdit.empty;
        (0, vitest_1.expect)(textLengthEdit.getRange()).toMatchInlineSnapshot(`undefined`);
    });
    (0, vitest_1.it)('should return the correct range for single edit', () => {
        const range = new range_1.Range(1, 1, 1, 5);
        const textLength = new textLength_1.TextLength(0, 4);
        const singleEdit = new textEditLength_1.SingleTextEditLength(range, textLength);
        const textLengthEdit = new textEditLength_1.TextLengthEdit([singleEdit]);
        (0, vitest_1.expect)(textLengthEdit.getRange()?.toString()).toMatchInlineSnapshot(`"[1,1 -> 1,5]"`);
    });
    (0, vitest_1.it)('should return the correct range for multiple edits', () => {
        const range1 = new range_1.Range(1, 1, 1, 5);
        const textLength1 = new textLength_1.TextLength(0, 4);
        const singleEdit1 = new textEditLength_1.SingleTextEditLength(range1, textLength1);
        const range2 = new range_1.Range(2, 1, 2, 5);
        const textLength2 = new textLength_1.TextLength(0, 4);
        const singleEdit2 = new textEditLength_1.SingleTextEditLength(range2, textLength2);
        const textLengthEdit = new textEditLength_1.TextLengthEdit([singleEdit1, singleEdit2]);
        (0, vitest_1.expect)(textLengthEdit.getRange()?.toString()).toMatchInlineSnapshot(`"[1,1 -> 2,5]"`);
    });
});
(0, vitest_1.describe)('compose', () => {
    (0, vitest_1.it)('should return empty for composing two empty edits', () => {
        const edit1 = textEditLength_1.TextLengthEdit.empty;
        const edit2 = textEditLength_1.TextLengthEdit.empty;
        const composedEdit = edit1.compose(edit2);
        (0, vitest_1.expect)(composedEdit.edits).toMatchInlineSnapshot(`[]`);
    });
    (0, vitest_1.it)('should compose two non-overlapping edits correctly', () => {
        const range1 = new range_1.Range(1, 1, 1, 5);
        const textLength1 = new textLength_1.TextLength(0, 4);
        const singleEdit1 = new textEditLength_1.SingleTextEditLength(range1, textLength1);
        const edit1 = new textEditLength_1.TextLengthEdit([singleEdit1]);
        const range2 = new range_1.Range(2, 1, 2, 5);
        const textLength2 = new textLength_1.TextLength(0, 4);
        const singleEdit2 = new textEditLength_1.SingleTextEditLength(range2, textLength2);
        const edit2 = new textEditLength_1.TextLengthEdit([singleEdit2]);
        const composedEdit = edit1.compose(edit2);
        (0, vitest_1.expect)(composedEdit.edits.toString()).toMatchInlineSnapshot(`"{ range: [1,1 -> 1,5], newLength: 0,4 },{ range: [2,1 -> 2,5], newLength: 0,4 }"`);
    });
    (0, vitest_1.it)('should compose two non-overlapping edits correctly - 2', () => {
        const range1 = new range_1.Range(1, 1, 1, 5);
        const textLength1 = new textLength_1.TextLength(2, 4);
        const singleEdit1 = new textEditLength_1.SingleTextEditLength(range1, textLength1);
        const edit1 = new textEditLength_1.TextLengthEdit([singleEdit1]);
        const range2 = new range_1.Range(2, 1, 2, 5);
        const textLength2 = new textLength_1.TextLength(0, 4);
        const singleEdit2 = new textEditLength_1.SingleTextEditLength(range2, textLength2);
        const edit2 = new textEditLength_1.TextLengthEdit([singleEdit2]);
        const composedEdit = edit1.compose(edit2);
        (0, vitest_1.expect)(composedEdit.edits.toString()).toMatchInlineSnapshot(`"{ range: [1,1 -> 1,5], newLength: 2,4 }"`);
    });
    (0, vitest_1.it)('should compose two non-overlapping edits correctly - 3', () => {
        const range1 = new range_1.Range(1, 1, 1, 5);
        const textLength1 = new textLength_1.TextLength(2, 4);
        const singleEdit1 = new textEditLength_1.SingleTextEditLength(range1, textLength1);
        const edit1 = new textEditLength_1.TextLengthEdit([singleEdit1]);
        const range2 = new range_1.Range(12, 1, 12, 5);
        const textLength2 = new textLength_1.TextLength(4, 4);
        const singleEdit2 = new textEditLength_1.SingleTextEditLength(range2, textLength2);
        const edit2 = new textEditLength_1.TextLengthEdit([singleEdit2]);
        const composedEdit = edit1.compose(edit2);
        (0, vitest_1.expect)(composedEdit.edits.toString()).toMatchInlineSnapshot(`"{ range: [1,1 -> 1,5], newLength: 2,4 },{ range: [10,1 -> 10,5], newLength: 4,4 }"`);
        const composedEdit2 = edit2.compose(edit1);
        (0, vitest_1.expect)(composedEdit2.edits.toString()).toMatchInlineSnapshot(`"{ range: [1,1 -> 1,5], newLength: 2,4 },{ range: [12,1 -> 12,5], newLength: 4,4 }"`);
    });
    (0, vitest_1.it)('should compose overlapping edits correctly', () => {
        const range1 = new range_1.Range(1, 1, 1, 5);
        const textLength1 = new textLength_1.TextLength(0, 4);
        const singleEdit1 = new textEditLength_1.SingleTextEditLength(range1, textLength1);
        const edit1 = new textEditLength_1.TextLengthEdit([singleEdit1]);
        const range2 = new range_1.Range(1, 3, 1, 7);
        const textLength2 = new textLength_1.TextLength(0, 4);
        const singleEdit2 = new textEditLength_1.SingleTextEditLength(range2, textLength2);
        const edit2 = new textEditLength_1.TextLengthEdit([singleEdit2]);
        const composedEdit = edit1.compose(edit2);
        (0, vitest_1.expect)(composedEdit.edits.toString()).toMatchInlineSnapshot(`"{ range: [1,1 -> 1,7], newLength: 0,6 }"`);
    });
});
//# sourceMappingURL=textEditLength.spec.js.map