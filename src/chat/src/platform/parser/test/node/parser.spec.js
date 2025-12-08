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
const docGenParsing_1 = require("../../node/docGenParsing");
const parserImpl_1 = require("../../node/parserImpl");
const parserWithCaching_1 = require("../../node/parserWithCaching");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const treeSitterQueries_1 = require("../../node/treeSitterQueries");
const markers_1 = require("./markers");
(0, vitest_1.suite)('getDocumentableNodeIfOnIdentifier', () => {
    // TODO@ulugbekna: rewrite all tests using insertRangeMarkers for better visualization
    (0, vitest_1.test)('should return undefined for range not containing an identifier', async () => {
        const result = await (0, docGenParsing_1._getDocumentableNodeIfOnIdentifier)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'const x = 1;', {
            startIndex: 0,
            endIndex: 0,
        });
        (0, vitest_1.expect)(result).toBeUndefined();
    });
    (0, vitest_1.test)('should return object for range containing an identifier not in a definition or declaration', async () => {
        const result = await (0, docGenParsing_1._getDocumentableNodeIfOnIdentifier)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'const x = 1;', {
            startIndex: 6,
            endIndex: 7,
        });
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
		{
		  "identifier": "x",
		  "nodeRange": {
		    "endIndex": 11,
		    "startIndex": 6,
		  },
		}
	`);
        (0, vitest_1.expect)((0, markers_1.insertRangeMarkers)('const x = 1;', [result?.nodeRange])).toMatchInlineSnapshot(`"const <>x = 1</>;"`);
    });
    (0, vitest_1.test)('should return the identifier and node range for a range containing an identifier in a definition', async () => {
        const result = await (0, docGenParsing_1._getDocumentableNodeIfOnIdentifier)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'function foo() {}', { startIndex: 9, endIndex: 12 });
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
		{
		  "identifier": "foo",
		  "nodeRange": {
		    "endIndex": 17,
		    "startIndex": 0,
		  },
		}
	`);
        (0, vitest_1.expect)((0, markers_1.insertRangeMarkers)('function foo() {}', [result?.nodeRange])).toMatchInlineSnapshot(`"<>function foo() {}</>"`);
    });
    (0, vitest_1.test)('should return the identifier and node range for a range containing an identifier in a declaration', async () => {
        const result = await (0, docGenParsing_1._getDocumentableNodeIfOnIdentifier)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'const x = 1;', {
            startIndex: 6,
            endIndex: 7,
        });
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
		{
		  "identifier": "x",
		  "nodeRange": {
		    "endIndex": 11,
		    "startIndex": 6,
		  },
		}
	`);
    });
    (0, vitest_1.test)('should return the identifier and node range for a range containing an identifier in a var spec', async () => {
        const result = await (0, docGenParsing_1._getDocumentableNodeIfOnIdentifier)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'var x: number;', { startIndex: 4, endIndex: 5 });
        (0, vitest_1.expect)(result).toMatchInlineSnapshot(`
		{
		  "identifier": "x",
		  "nodeRange": {
		    "endIndex": 13,
		    "startIndex": 4,
		  },
		}
	`);
    });
});
(0, vitest_1.suite)('getParentScope', () => {
    (0, vitest_1.test)('Finding parent node in TypeScript', async () => {
        const result = await (0, parserImpl_1._getCoarseParentScope)(treeSitterLanguages_1.WASMLanguage.TypeScript, [
            'interface IFar {',
            '  bar(): void;',
            '  foo(): void;',
            '}'
        ].join('\n'), { startPosition: { row: 1, column: 2 }, endPosition: { row: 1, column: 5 } });
        (0, vitest_1.expect)(result).toStrictEqual({
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 3, column: 1 },
        });
    });
    (0, vitest_1.test)('Finding parent node in Python', async () => {
        const result = await (0, parserImpl_1._getCoarseParentScope)(treeSitterLanguages_1.WASMLanguage.Python, [
            '# some comment',
            'class Room:',
            '   length = 0.0',
            '   breadth = 0.0',
            '   def Area(abc):',
            '      print("The area is " + length*breadth)',
            '',
            '# some other comment',
        ].join('\n'), {
            startPosition: { row: 5, column: 5 },
            endPosition: { row: 5, column: 5 },
        });
        (0, vitest_1.expect)(result).toStrictEqual({
            startPosition: { row: 4, column: 3 },
            endPosition: { row: 5, column: 44 },
        });
    });
    (0, vitest_1.test)('Finding parent node in Java', async () => {
        const result = await (0, parserImpl_1._getCoarseParentScope)(treeSitterLanguages_1.WASMLanguage.Java, [
            '/*** comment',
            '',
            ' comment ***/ ',
            'public class Main {',
            '	public static void main(String[] args) {',
            '	  System.out.println("Hello World");',
            '	}',
            '}',
        ].join('\n'), {
            startPosition: { row: 5, column: 5 },
            endPosition: { row: 5, column: 5 },
        });
        (0, vitest_1.expect)(result).toStrictEqual({
            startPosition: { row: 4, column: 1 },
            endPosition: { row: 6, column: 2 },
        });
    });
});
(0, vitest_1.suite)('All Tree Sitter Queries are valid', () => {
    (0, vitest_1.afterAll)(() => (0, parserWithCaching_1._dispose)());
    for (const language in treeSitterQueries_1.allKnownQueries) {
        generateTest(language);
    }
    function generateTest(language) {
        (0, vitest_1.test)(`Valid queries for ${language}`, async () => {
            const queries = treeSitterQueries_1.allKnownQueries[language];
            const parseTreeRef = await (0, parserWithCaching_1._parse)(language, '');
            try {
                const lang = parseTreeRef.tree.getLanguage();
                for (const query of queries) {
                    try {
                        lang.query(query);
                    }
                    catch (err) {
                        assert_1.default.fail(`Query failed for ${query}: ${err}`);
                    }
                }
            }
            finally {
                parseTreeRef.dispose();
            }
        });
    }
});
//# sourceMappingURL=parser.spec.js.map