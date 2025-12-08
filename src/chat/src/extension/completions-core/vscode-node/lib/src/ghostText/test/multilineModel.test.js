"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const multilineModel_1 = require("../multilineModel");
suite('multilineModel tests', function () {
    this.timeout(10000);
    test('hasComment correctly identifies presence of comment for a given string, line, and language', function () {
        const testCases = [
            {
                string: 'def test_fn(x):\n    # Print x\n    print(x)',
                language: 'python',
                lineNumber: 0,
                expected: false,
            },
            {
                string: 'def test_fn(x):\n    # Print x\n    print(x)',
                language: 'python',
                lineNumber: 1,
                expected: true,
            },
            {
                string: 'def test_fn(x):\n    # Print x\n    print(x)',
                language: 'python',
                lineNumber: -2,
                expected: true,
            },
            {
                string: '',
                language: 'python',
                lineNumber: 0,
                expected: false,
            },
            {
                string: '// Comment\nconst x = 1;',
                language: 'javascript',
                lineNumber: 0,
                expected: true,
            },
            {
                string: '// Comment\nconst x = 1;',
                language: 'javascript',
                lineNumber: 1,
                expected: false,
            },
            {
                string: '// Comment\nconst x = 1;',
                language: 'javascript',
                lineNumber: 2,
                expected: false,
            },
        ];
        for (const testCase of testCases) {
            const { string, language, lineNumber, expected } = testCase;
            assert.strictEqual((0, multilineModel_1.hasComment)(string, lineNumber, language), expected);
        }
    });
    test('PromptFeatures correctly parses prompt text', function () {
        const testCases = [
            {
                string: 'def test_fn(x):\n    # Print x\n    print(x)',
                language: 'python',
                length: 42,
                firstLineLength: 15,
                lastLineLength: 12,
                lastLineRstripLength: 12,
                lastLineStripLength: 8,
                rstripLength: 42,
                stripLength: 42,
                rstripLastLineLength: 12,
                rstripLastLineStripLength: 8,
                secondToLastLineHasComment: true,
                rstripSecondToLastLineHasComment: true,
                prefixEndsWithNewline: false,
                lastChar: ')',
                rstripLastChar: ')',
                firstChar: 'd',
                lstripFirstChar: 'd',
            },
            {
                string: ' ',
                language: 'python',
                length: 1,
                firstLineLength: 1,
                lastLineLength: 1,
                lastLineRstripLength: 0,
                lastLineStripLength: 0,
                rstripLength: 0,
                stripLength: 0,
                rstripLastLineLength: 0,
                rstripLastLineStripLength: 0,
                secondToLastLineHasComment: false,
                rstripSecondToLastLineHasComment: false,
                prefixEndsWithNewline: false,
                lastChar: ' ',
                rstripLastChar: '',
                firstChar: ' ',
                lstripFirstChar: '',
            },
            {
                string: '// Comment\nconst x = 1;\n',
                language: 'javascript',
                length: 24,
                firstLineLength: 10,
                lastLineLength: 12,
                lastLineRstripLength: 12,
                lastLineStripLength: 12,
                rstripLength: 23,
                stripLength: 23,
                rstripLastLineLength: 12,
                rstripLastLineStripLength: 12,
                secondToLastLineHasComment: true,
                rstripSecondToLastLineHasComment: true,
                prefixEndsWithNewline: true,
                lastChar: '\n',
                rstripLastChar: ';',
                firstChar: '/',
                lstripFirstChar: '/',
            },
        ];
        for (const testCase of testCases) {
            const { string, language, length, firstLineLength, lastLineLength, lastLineRstripLength, lastLineStripLength, rstripLength, stripLength, rstripLastLineLength, rstripLastLineStripLength, secondToLastLineHasComment, rstripSecondToLastLineHasComment, prefixEndsWithNewline, lastChar, rstripLastChar, firstChar, lstripFirstChar, } = testCase;
            const promptFeatures = new multilineModel_1.PromptFeatures(string, language);
            assert.strictEqual(promptFeatures.length, length);
            assert.strictEqual(promptFeatures.firstLineLength, firstLineLength);
            assert.strictEqual(promptFeatures.lastLineLength, lastLineLength);
            assert.strictEqual(promptFeatures.lastLineRstripLength, lastLineRstripLength);
            assert.strictEqual(promptFeatures.lastLineStripLength, lastLineStripLength);
            assert.strictEqual(promptFeatures.rstripLength, rstripLength);
            assert.strictEqual(promptFeatures.stripLength, stripLength);
            assert.strictEqual(promptFeatures.rstripLastLineLength, rstripLastLineLength);
            assert.strictEqual(promptFeatures.rstripLastLineStripLength, rstripLastLineStripLength);
            assert.strictEqual(promptFeatures.secondToLastLineHasComment, secondToLastLineHasComment);
            assert.strictEqual(promptFeatures.rstripSecondToLastLineHasComment, rstripSecondToLastLineHasComment);
            assert.strictEqual(promptFeatures.prefixEndsWithNewline, prefixEndsWithNewline);
            assert.strictEqual(promptFeatures.lastChar, lastChar);
            assert.strictEqual(promptFeatures.rstripLastChar, rstripLastChar);
            assert.strictEqual(promptFeatures.firstChar, firstChar);
            assert.strictEqual(promptFeatures.lstripFirstChar, lstripFirstChar);
        }
    });
    test('MultilineModelFeatures has expected prefix and suffix features', function () {
        const prefix = 'def test_fn(x):\n    # Print x\n    print(x)';
        const suffix = ' ';
        const language = 'python';
        const prefixFeatures = {
            string: 'def test_fn(x):\n    # Print x\n    print(x)',
            language: 'python',
            length: 42,
            firstLineLength: 15,
            lastLineLength: 12,
            lastLineRstripLength: 12,
            lastLineStripLength: 8,
            rstripLength: 42,
            stripLength: 42,
            rstripLastLineLength: 12,
            rstripLastLineStripLength: 8,
            secondToLastLineHasComment: true,
            rstripSecondToLastLineHasComment: true,
            prefixEndsWithNewline: false,
            lastChar: ')',
            rstripLastChar: ')',
            firstChar: 'd',
            lstripFirstChar: 'd',
        };
        const suffixFeatures = {
            string: ' ',
            language: 'python',
            length: 1,
            firstLineLength: 1,
            lastLineLength: 1,
            lastLineRstripLength: 0,
            lastLineStripLength: 0,
            rstripLength: 0,
            stripLength: 0,
            rstripLastLineLength: 0,
            rstripLastLineStripLength: 0,
            secondToLastLineHasComment: false,
            rstripSecondToLastLineHasComment: false,
            prefixEndsWithNewline: false,
            lastChar: ' ',
            rstripLastChar: '',
            firstChar: ' ',
            lstripFirstChar: '',
        };
        const multilineFeatures = new multilineModel_1.MultilineModelFeatures(prefix, suffix, language);
        assert.strictEqual(multilineFeatures.language, language);
        assert.strictEqual(multilineFeatures.prefixFeatures.firstLineLength, prefixFeatures.firstLineLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.lastLineLength, prefixFeatures.lastLineLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.lastLineRstripLength, prefixFeatures.lastLineRstripLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.lastLineStripLength, prefixFeatures.lastLineStripLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.rstripLength, prefixFeatures.rstripLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.stripLength, prefixFeatures.stripLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.rstripLastLineLength, prefixFeatures.rstripLastLineLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.rstripLastLineStripLength, prefixFeatures.rstripLastLineStripLength);
        assert.strictEqual(multilineFeatures.prefixFeatures.secondToLastLineHasComment, prefixFeatures.secondToLastLineHasComment);
        assert.strictEqual(multilineFeatures.prefixFeatures.rstripSecondToLastLineHasComment, prefixFeatures.rstripSecondToLastLineHasComment);
        assert.strictEqual(multilineFeatures.prefixFeatures.prefixEndsWithNewline, prefixFeatures.prefixEndsWithNewline);
        assert.strictEqual(multilineFeatures.prefixFeatures.lastChar, prefixFeatures.lastChar);
        assert.strictEqual(multilineFeatures.prefixFeatures.rstripLastChar, prefixFeatures.rstripLastChar);
        assert.strictEqual(multilineFeatures.prefixFeatures.firstChar, prefixFeatures.firstChar);
        assert.strictEqual(multilineFeatures.prefixFeatures.lstripFirstChar, prefixFeatures.lstripFirstChar);
        assert.strictEqual(multilineFeatures.suffixFeatures.firstLineLength, suffixFeatures.firstLineLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.lastLineLength, suffixFeatures.lastLineLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.lastLineRstripLength, suffixFeatures.lastLineRstripLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.lastLineStripLength, suffixFeatures.lastLineStripLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.rstripLength, suffixFeatures.rstripLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.stripLength, suffixFeatures.stripLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.rstripLastLineLength, suffixFeatures.rstripLastLineLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.rstripLastLineStripLength, suffixFeatures.rstripLastLineStripLength);
        assert.strictEqual(multilineFeatures.suffixFeatures.secondToLastLineHasComment, suffixFeatures.secondToLastLineHasComment);
        assert.strictEqual(multilineFeatures.suffixFeatures.rstripSecondToLastLineHasComment, suffixFeatures.rstripSecondToLastLineHasComment);
        assert.strictEqual(multilineFeatures.suffixFeatures.prefixEndsWithNewline, suffixFeatures.prefixEndsWithNewline);
        assert.strictEqual(multilineFeatures.suffixFeatures.lastChar, suffixFeatures.lastChar);
        assert.strictEqual(multilineFeatures.suffixFeatures.rstripLastChar, suffixFeatures.rstripLastChar);
        assert.strictEqual(multilineFeatures.suffixFeatures.firstChar, suffixFeatures.firstChar);
        assert.strictEqual(multilineFeatures.suffixFeatures.lstripFirstChar, suffixFeatures.lstripFirstChar);
    });
    test('MultilineModelFeatures.constructFeatures() returns correct feature array', function () {
        const prefix = 'def test_fn(x):\n    # Print x\n    print(x)';
        const suffix = ' ';
        const language = 'python';
        const prefixFeatures = {
            string: 'def test_fn(x):\n    # Print x\n    print(x)',
            language: 'python',
            length: 42,
            firstLineLength: 15,
            lastLineLength: 12,
            lastLineRstripLength: 12,
            lastLineStripLength: 8,
            rstripLength: 42,
            stripLength: 42,
            rstripLastLineLength: 12,
            rstripLastLineStripLength: 8,
            secondToLastLineHasComment: true,
            rstripSecondToLastLineHasComment: true,
            prefixEndsWithNewline: false,
            lastChar: ')',
            rstripLastChar: ')',
            firstChar: 'd',
            lstripFirstChar: 'd',
        };
        const suffixFeatures = {
            string: ' ',
            language: 'python',
            length: 1,
            firstLineLength: 1,
            lastLineLength: 1,
            lastLineRstripLength: 0,
            lastLineStripLength: 0,
            rstripLength: 0,
            stripLength: 0,
            rstripLastLineLength: 0,
            rstripLastLineStripLength: 0,
            secondToLastLineHasComment: false,
            rstripSecondToLastLineHasComment: false,
            prefixEndsWithNewline: false,
            lastChar: ' ',
            rstripLastChar: '',
            firstChar: ' ',
            lstripFirstChar: '',
        };
        const expectedNumericFeatures = [
            prefixFeatures.length,
            prefixFeatures.firstLineLength,
            prefixFeatures.lastLineLength,
            prefixFeatures.lastLineRstripLength,
            prefixFeatures.lastLineStripLength,
            prefixFeatures.rstripLength,
            prefixFeatures.rstripLastLineLength,
            prefixFeatures.rstripLastLineStripLength,
            suffixFeatures.length,
            suffixFeatures.firstLineLength,
            suffixFeatures.lastLineLength,
            prefixFeatures.secondToLastLineHasComment ? 1 : 0,
            prefixFeatures.rstripSecondToLastLineHasComment ? 1 : 0,
            prefixFeatures.prefixEndsWithNewline ? 1 : 0,
        ];
        const expectedLangFeatures = new Array(8).fill(0);
        expectedLangFeatures[5] = 1;
        const expectedPrefixLastCharFeatures = new Array(96).fill(0);
        expectedPrefixLastCharFeatures[10] = 1;
        const expectedPrefiRstripLastCharFeatures = new Array(96).fill(0);
        expectedPrefiRstripLastCharFeatures[10] = 1;
        const expectedSuffixFirstCharFeatures = new Array(96).fill(0);
        expectedSuffixFirstCharFeatures[1] = 1;
        const expectedSuffixLstripFirstCharFeatures = new Array(96).fill(0);
        expectedSuffixLstripFirstCharFeatures[0] = 1;
        const multilineFeatures = new multilineModel_1.MultilineModelFeatures(prefix, suffix, language);
        const multilineFeatureArray = multilineFeatures.constructFeatures();
        // Numeric features match
        assert.deepStrictEqual(multilineFeatureArray.slice(0, expectedNumericFeatures.length), expectedNumericFeatures);
        // Language features match
        assert.deepStrictEqual(multilineFeatureArray.slice(expectedNumericFeatures.length, expectedNumericFeatures.length + 8), expectedLangFeatures);
        // Prefix last char features match
        assert.deepStrictEqual(multilineFeatureArray.slice(expectedNumericFeatures.length + 8, expectedNumericFeatures.length + 8 + 96), expectedPrefixLastCharFeatures);
        // Prefix rstrip last char features match
        assert.deepStrictEqual(multilineFeatureArray.slice(expectedNumericFeatures.length + 8 + 96, expectedNumericFeatures.length + 8 + 96 * 2), expectedPrefiRstripLastCharFeatures);
        // Suffix first char features match
        assert.deepStrictEqual(multilineFeatureArray.slice(expectedNumericFeatures.length + 8 + 96 * 2, expectedNumericFeatures.length + 8 + 96 * 3), expectedSuffixFirstCharFeatures);
        // Suffix lstrip first char features match
        assert.deepStrictEqual(multilineFeatureArray.slice(expectedNumericFeatures.length + 8 + 96 * 3, expectedNumericFeatures.length + 8 + 96 * 4), expectedSuffixLstripFirstCharFeatures);
        // All features match
        assert.deepStrictEqual(multilineFeatureArray, expectedNumericFeatures.concat(expectedLangFeatures, expectedPrefixLastCharFeatures, expectedPrefiRstripLastCharFeatures, expectedSuffixFirstCharFeatures, expectedSuffixLstripFirstCharFeatures));
    });
    test('requestMultilineScore() returns expected score', function () {
        const testCases = [
            {
                prompt: {
                    prefix: '// Language: javascript\nexport function(x) {',
                    suffix: '',
                    isFimEnabled: true,
                },
                language: 'javascript',
                score: 0.32191348,
            },
            {
                prompt: {
                    prefix: '#!/usr/bin/env python3\n# Function that adds two numbers\n',
                    suffix: '',
                    isFimEnabled: true,
                },
                language: 'python',
                score: 0.45744361,
            },
            {
                prompt: {
                    prefix: '#!/usr/bin/env python3\nclass Test:\n    # Function that adds two numbers\n',
                    suffix: '',
                    isFimEnabled: true,
                },
                language: 'python',
                score: 0.40182054,
            },
            {
                prompt: {
                    prefix: '// Language: typescript\nconst testConst = ',
                    suffix: 'const testConst2 = 2',
                    isFimEnabled: true,
                },
                language: 'typescript',
                score: 0.45507183,
            },
            {
                prompt: {
                    prefix: '// Language: typescript\nconst testConst = ',
                    suffix: 'const testConst2 = 2\nconst testConst3 = 3',
                    isFimEnabled: true,
                },
                language: 'typescript',
                score: 0.45507183,
            },
            {
                prompt: {
                    prefix: '// Language: typescript\nconst testConst = \nconst testConst2 = 2\nconst testConst3 = 3    ',
                    suffix: '',
                    isFimEnabled: true,
                },
                language: 'typescript',
                score: 0.30417124,
            },
        ];
        for (const testCase of testCases) {
            const { prompt, language, score } = testCase;
            assert.strictEqual((0, multilineModel_1.requestMultilineScore)(prompt, language).toFixed(4), score.toFixed(4));
        }
    });
});
//# sourceMappingURL=multilineModel.test.js.map