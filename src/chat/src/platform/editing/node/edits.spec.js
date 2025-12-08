"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const vscodeTypes_1 = require("../../../vscodeTypes");
const edits_1 = require("../common/edits");
(0, vitest_1.suite)('findApproximateRangePostEdits', function () {
    let range;
    let editText;
    (0, vitest_1.beforeAll)(async function () {
        range = new vscodeTypes_1.Range(5, 1, 10, 1);
        editText = 'some text';
    });
    (0, vitest_1.test)('Edit range before range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(4, 1, 4, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(5, 0, 10, 0));
    });
    (0, vitest_1.test)('Edit range overlaps start of range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(4, 1, 6, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(4, 0, 8, 0));
    });
    (0, vitest_1.test)('Edit range is contained in range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(6, 1, 7, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(5, 0, 9, 0));
    });
    (0, vitest_1.test)('Edit range overlaps end of range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(9, 1, 11, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(5, 0, 9, 0));
    });
    (0, vitest_1.test)('Edit range is after end of range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(11, 1, 13, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(5, 0, 10, 0));
    });
    (0, vitest_1.test)('Edit range contains range of interest', async function () {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(3, 1, 13, 1), editText),
        ];
        const rangePostEdits = await (0, edits_1.computeUpdatedRange)(range, edits);
        assert_1.default.deepStrictEqual(rangePostEdits, new vscodeTypes_1.Range(3, 0, 3, 0));
    });
});
//# sourceMappingURL=edits.spec.js.map