"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = shuffle;
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const strings_1 = require("../../../../util/vs/base/common/strings");
const lineEdit_1 = require("../../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const textEdit_1 = require("../../../../util/vs/editor/common/core/edits/textEdit");
const lineRange_1 = require("../../../../util/vs/editor/common/core/ranges/lineRange");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const abstractText_1 = require("../../../../util/vs/editor/common/core/text/abstractText");
const edit_1 = require("../../common/dataTypes/edit");
const editUtils_1 = require("../../common/dataTypes/editUtils");
const permutation_1 = require("../../common/dataTypes/permutation");
const rootedLineEdit_1 = require("../../common/dataTypes/rootedLineEdit");
const random_1 = require("./random");
(0, vitest_1.suite)('Edit <-> LineEdit equivalence', () => {
    for (let i = 0; i < 100; i++) {
        (0, vitest_1.test)('case' + i, () => {
            testWithSeed(i);
        });
    }
    vitest_1.test.skip('fuzz', () => {
        for (let i = 0; i < 1_000_000; i++) {
            testWithSeed(i);
        }
    });
    function testWithSeed(seed) {
        const rand = random_1.Random.create(seed);
        const lineCount = rand.nextIntRange(1, 4);
        const str = rand.nextMultiLineString(lineCount, new offsetRange_1.OffsetRange(0, 5));
        const editCount = rand.nextIntRange(1, 4);
        const randomOffsetEdit = rand.nextOffsetEdit(str, editCount);
        const randomEdit = randomOffsetEdit;
        const rootedEdit = new edit_1.RootedEdit(new abstractText_1.StringText(str), randomEdit);
        const editApplied = rootedEdit.getEditedState().value;
        const rootedLineEdit = rootedLineEdit_1.RootedLineEdit.fromEdit(rootedEdit);
        const lineEditApplied = rootedLineEdit.getEditedState().join('\n');
        const editFromLineEditApplied = rootedLineEdit.toRootedEdit().getEditedState().value;
        assert_1.default.deepStrictEqual(lineEditApplied, editApplied);
        assert_1.default.deepStrictEqual(editFromLineEditApplied, editApplied);
    }
});
(0, vitest_1.suite)('Edit.compose', () => {
    for (let i = 0; i < 1000; i++) {
        (0, vitest_1.test)('case' + i, () => {
            runTest(i);
        });
    }
    vitest_1.test.skip('fuzz', () => {
        for (let i = 0; i < 1_000_000; i++) {
            runTest(i);
        }
    });
    function runTest(seed) {
        const rng = random_1.Random.create(seed);
        const s0 = 'abcde\nfghij\nklmno\npqrst\n';
        const edits1 = getRandomEdit(s0, rng.nextIntRange(1, 4), rng);
        const s1 = edits1.apply(s0);
        const edits2 = getRandomEdit(s1, rng.nextIntRange(1, 4), rng);
        const s2 = edits2.apply(s1);
        const combinedEdits = edits1.compose(edits2);
        const s2C = combinedEdits.apply(s0);
        assert_1.default.strictEqual(s2C, s2);
    }
});
function getRandomEdit(str, count, rng) {
    const edits = [];
    let i = 0;
    for (let j = 0; j < count; j++) {
        if (i >= str.length) {
            break;
        }
        edits.push(getRandomSingleEdit(str, i, rng));
        i = edits[j].replaceRange.endExclusive + 1;
    }
    return stringEdit_1.StringEdit.create(edits);
}
function getRandomSingleEdit(str, rangeOffsetStart, rng) {
    const offsetStart = rng.nextIntRange(rangeOffsetStart, str.length);
    const offsetEnd = rng.nextIntRange(offsetStart, str.length);
    const textStart = rng.nextIntRange(0, str.length);
    const textLen = rng.nextIntRange(0, Math.min(7, str.length - textStart));
    return stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(offsetStart, offsetEnd), str.substring(textStart, textStart + textLen));
}
(0, vitest_1.suite)('LineEdit', () => {
    (0, vitest_1.suite)('fromSingleTextEdit', () => {
        for (let i = 0; i < 100; i++) {
            (0, vitest_1.test)('case' + i, () => {
                testWithSeed(i);
            });
        }
        vitest_1.test.skip('fuzz', () => {
            for (let i = 0; i < 1_000_000; i++) {
                testWithSeed(i);
            }
        });
        function testWithSeed(seed) {
            const rand = random_1.Random.create(seed);
            const lineCount = rand.nextIntRange(1, 4);
            // Use unique letters to such that .shrink can be tested
            const str = rand.nextMultiLineString(lineCount, new offsetRange_1.OffsetRange(0, 5), (0, random_1.sequenceGenerator)([...random_1.Random.alphabetUppercase]));
            let randomOffsetEdit = rand.nextSingleOffsetEdit(str, random_1.Random.alphabetSmallLowercase + '\n');
            randomOffsetEdit = randomOffsetEdit.removeCommonSuffixPrefix(str);
            const randomEdit = randomOffsetEdit;
            const strVal = new abstractText_1.StringText(str);
            const singleTextEdit = textEdit_1.TextReplacement.fromStringReplacement(randomEdit, strVal);
            const singleLineEdit1 = lineEdit_1.LineReplacement.fromSingleTextEdit(singleTextEdit, strVal);
            const extendedEdit = singleTextEdit.extendToFullLine(strVal);
            const singleLineEdit2Full = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(extendedEdit.range.startLineNumber, extendedEdit.range.endLineNumber + 1), (0, strings_1.splitLines)(extendedEdit.text));
            const singleLineEdit2 = singleLineEdit2Full.removeCommonSuffixPrefixLines(strVal);
            if (singleLineEdit1.lineRange.isEmpty && singleLineEdit2.lineRange.isEmpty
                && singleLineEdit1.newLines.length === 0 && singleLineEdit2.newLines.length === 0) {
                return;
            }
            assert_1.default.deepStrictEqual(singleLineEdit1, singleLineEdit2);
        }
    });
    (0, vitest_1.suite)('RootedLineEdit.toString', () => {
        (0, vitest_1.test)('format normal edit 1', () => {
            const lineEdit = new rootedLineEdit_1.RootedLineEdit(new abstractText_1.StringText('abc\ndef\nghi'), new lineEdit_1.LineEdit([new lineEdit_1.LineReplacement(new lineRange_1.LineRange(2, 3), ['xyz'])]));
            (0, vitest_1.expect)(lineEdit.toString()).toMatchInlineSnapshot(`
			"    1   1 abc
			-   2     def
			+       2 xyz
			    3   3 ghi"
		`);
        });
        (0, vitest_1.test)('format normal edit 2', () => {
            const lineEdit = new rootedLineEdit_1.RootedLineEdit(new abstractText_1.StringText('abc\ndef\nghi'), new lineEdit_1.LineEdit([new lineEdit_1.LineReplacement(new lineRange_1.LineRange(3, 4), ['xyz'])]));
            (0, vitest_1.expect)(lineEdit.toString()).toMatchInlineSnapshot(`
			"    1   1 abc
			    2   2 def
			-   3     ghi
			+       3 xyz"
		`);
        });
        (0, vitest_1.test)('format invalid edit', () => {
            const lineEdit = new rootedLineEdit_1.RootedLineEdit(new abstractText_1.StringText('abc\ndef\nghi'), new lineEdit_1.LineEdit([new lineEdit_1.LineReplacement(new lineRange_1.LineRange(4, 5), ['xyz'])]));
            (0, vitest_1.expect)(lineEdit.toString()).toMatchInlineSnapshot(`
				"    2   2 def
				    3   3 ghi
				-   4     [[[[[ WARNING: LINE DOES NOT EXIST ]]]]]
				+       4 xyz"
			`);
        });
        (0, vitest_1.test)('format invalid edit', () => {
            const lineEdit = new rootedLineEdit_1.RootedLineEdit(new abstractText_1.StringText('abc\ndef\nghi'), new lineEdit_1.LineEdit([new lineEdit_1.LineReplacement(new lineRange_1.LineRange(6, 7), ['xyz'])]));
            (0, vitest_1.expect)(lineEdit.toString()).toMatchInlineSnapshot(`
				"    4   4 [[[[[ WARNING: LINE DOES NOT EXIST ]]]]]
				    5   5 [[[[[ WARNING: LINE DOES NOT EXIST ]]]]]
				-   6     [[[[[ WARNING: LINE DOES NOT EXIST ]]]]]
				+       6 xyz"
			`);
        });
    });
});
(0, vitest_1.suite)('Edit#decompose', () => {
    (0, vitest_1.test)('', () => {
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 5), '12345'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(10, 12), ''),
        ]);
        (0, vitest_1.expect)((0, editUtils_1.decomposeStringEdit)(edit).edits.toString()).toMatchInlineSnapshot(`"[0, 5) -> "12345",[10, 12) -> """`);
    });
    (0, vitest_1.test)('1', () => {
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 5), '12345'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(10, 12), ''),
        ]);
        (0, vitest_1.expect)((0, editUtils_1.decomposeStringEdit)(edit, new permutation_1.Permutation([1, 0])).edits.toString()).toMatchInlineSnapshot(`"[10, 12) -> "",[0, 5) -> "12345""`);
    });
    (0, vitest_1.test)('2', () => {
        const edit = stringEdit_1.StringEdit.create([
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(0, 5), '12345'),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(10, 22), ''),
            stringEdit_1.StringReplacement.replace(new offsetRange_1.OffsetRange(23, 24), ''),
        ]);
        const decomposedEdits = (0, editUtils_1.decomposeStringEdit)(edit, new permutation_1.Permutation([1, 0, 2]));
        const recomposedEdits = decomposedEdits.compose();
        (0, vitest_1.expect)(decomposedEdits.edits.toString()).toMatchInlineSnapshot(`"[10, 22) -> "",[0, 5) -> "12345",[11, 12) -> """`);
        (0, vitest_1.expect)(edit.toString()).toStrictEqual(recomposedEdits.toString());
    });
    vitest_1.test.each((0, arrays_1.range)(100))('fuzzing %i', (i) => {
        const rand = random_1.Random.create(i);
        const strLength = rand.nextIntRange(1, 100);
        const str = rand.nextString(strLength);
        const editCount = rand.nextIntRange(1, 10);
        const randomOffsetEdit = rand.nextOffsetEdit(str, editCount);
        const randomEdit = randomOffsetEdit;
        const shuffledEdits = shuffle((0, arrays_1.range)(randomEdit.replacements.length), i);
        const decomposedEdits = (0, editUtils_1.decomposeStringEdit)(randomEdit, shuffledEdits);
        const recomposedEdits = decomposedEdits.compose();
        (0, vitest_1.expect)(randomEdit.toString()).toStrictEqual(recomposedEdits.toString());
    });
});
function shuffle(array, _seed) {
    let rand;
    const indexMap = array.map((_, i) => i); // Create an index map that will be shuffled
    if (typeof _seed === 'number') {
        let seed = _seed;
        // Seeded random number generator in JS
        rand = () => {
            const x = Math.sin(seed++) * 179426549;
            return x - Math.floor(x);
        };
    }
    else {
        rand = Math.random;
    }
    for (let i = indexMap.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        // Swap elements in the index map
        [indexMap[i], indexMap[j]] = [indexMap[j], indexMap[i]];
    }
    // Return a new Permutation instance based on the shuffled index map
    return new permutation_1.Permutation(indexMap);
}
//# sourceMappingURL=edits.spec.js.map