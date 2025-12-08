"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const jaccardMatching_1 = require("../snippetInclusion/jaccardMatching");
const selectRelevance_1 = require("../snippetInclusion/selectRelevance");
const similarFiles_1 = require("../snippetInclusion/similarFiles");
const tokenization_1 = require("../tokenization");
async function retrieveAllSnippetsWithJaccardScore(objectDoc, referenceDoc, windowLength, sortOption) {
    const referenceDocWithOffset = {
        ...referenceDoc,
        languageId: '',
        offset: referenceDoc.source.length,
    };
    const matcher = jaccardMatching_1.FixedWindowSizeJaccardMatcher.FACTORY(windowLength).to(referenceDocWithOffset);
    const match = await matcher.retrieveAllSnippets(objectDoc, sortOption);
    return match;
}
async function findBestJaccardMatch(objectDoc, referenceDoc, windowLength) {
    const referenceDocWithOffset = {
        ...referenceDoc,
        languageId: '',
        offset: referenceDoc.source.length,
    };
    const matcher = jaccardMatching_1.FixedWindowSizeJaccardMatcher.FACTORY(windowLength).to(referenceDocWithOffset);
    const match = await matcher.findBestMatch(objectDoc, similarFiles_1.defaultCppSimilarFilesOptions.maxSnippetsPerFile);
    return match;
}
suite('selectRelevance Test Suite', function () {
    setup(async function () {
        await tokenization_1.initializeTokenizers;
    });
    test('findBestJaccardMatch computes correct score of two single lines', async function () {
        // 100% match if equal
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'good morning', uri: 'file:///home/user/test.js' }, 1))[0].score, 1);
        // no match if different
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'bad night', uri: 'file:///home/user/test.js' }, 1)).length, 0);
        // 33% match if 1 same, 1 different (because it's 1 overlap of 3 tokens in total)
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'good night', uri: 'file:///home/user/test.js' }, 1))[0].score, 1 / 3);
        // 50% match if half the tokens are missing (because it's 1 overlap of 2 tokens in total)
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'good', uri: 'file:///home/user/test.js' }, 1))[0].score, 0.5);
        // order is ignored
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'morning good', uri: 'file:///home/user/test.js' }, 1))[0].score, 1);
        // so are stop words
        assert.strictEqual((await findBestJaccardMatch({ source: 'good morning', uri: 'file:///home/user/test.js' }, { source: 'morning is good', uri: 'file:///home/user/test.js' }, 1))[0].score, 1);
        // and non alphanumeric_ characters
        assert.strictEqual((await findBestJaccardMatch({ source: 'good !morning   sunshine', uri: 'file:///home/user/test.js' }, { source: 'goodâ‚¬morning,sunshine', uri: 'file:///home/user/test.js' }, 1))[0].score, 1);
    });
    /**
     * When requesting matches with a certain length,
     * the returns have that length
     */
    test('findBestJaccardMatch respects windowLength', async function () {
        // no window no match
        assert.strictEqual((await findBestJaccardMatch({
            source: 'good morning\ngood night\nthe day\nis bright',
            uri: 'file:///home/user/test.js',
        }, {
            source: 'good morning\ngood night\nthe day\nis bright',
            uri: 'file:///home/user/test.js',
        }, 0)).length, 0);
        // for identical object and reference docs
        for (const n of [1, 2]) {
            assert.strictEqual((await findBestJaccardMatch({
                source: 'good morning\ngood night\nthe day\nis bright',
                uri: 'file:///home/user/test.js',
            }, {
                source: 'good morning\ngood night\nthe day\nis bright',
                uri: 'file:///home/user/test.js',
            }, n))[0].snippet.split('\n').length, n);
        }
        // if the ref doc is shorter
        for (const n of [1, 2]) {
            assert.strictEqual((await findBestJaccardMatch({
                source: 'good morning\ngood night\nthe day\nis bright',
                uri: 'file:///home/user/test.js',
            }, { source: 'good night', uri: 'file:///home/user/test.js' }, n))[0].snippet.split('\n').length, n);
        }
        // if the ref doc is longer
        for (const n of [1, 2]) {
            const matches = await findBestJaccardMatch({
                source: 'good morning\ngood night\nthe day\nis bright',
                uri: 'file:///home/user/test.js',
            }, {
                source: 'good morning\ngood night\nthe day\nis bright\nthe sun',
                uri: 'file:///home/user/test.js',
            }, n);
            if (n === 1) {
                assert.strictEqual(matches.length, 0);
            }
            else if (n === 2) {
                assert.strictEqual(matches.length, 1);
                assert.strictEqual(matches[0].snippet.split('\n').length, n > 1 ? n : []);
            }
            else {
                throw new Error('Unexpected value for `n`');
            }
        }
    });
    test('findBestJaccardMatch returns the best match', async function () {
        assert.strictEqual((await findBestJaccardMatch({
            source: ['abcd', 'efgh', 'ijkl', 'mnop', 'qrst', 'uvwx', 'yz'].join('\n'),
            uri: 'file:///home/user/test.js',
        }, { source: ['ijkl', 'qrst'].join('\n'), uri: 'file:///home/user/test.js' }, 3))[0].snippet, ['ijkl', 'mnop', 'qrst'].join('\n'));
    });
    test('findBestJaccardMatch works on strings with or without a newline at the end', async function () {
        assert.strictEqual((await findBestJaccardMatch({
            source: ['abcd', 'efgh', 'ijkl', 'mnop', 'qrst', 'uvwx', 'yz'].join('\n'),
            uri: 'file:///home/user/test.js',
        }, { source: ['ijkl', 'qrst'].join('\n'), uri: 'file:///home/user/test.js' }, 3))[0].snippet, ['ijkl', 'mnop', 'qrst'].join('\n'));
    });
    test('Tokenization splits words on whitespace', function () {
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)('def hello'), ['def', 'hello']);
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)('def   hello'), ['def', 'hello']);
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)('def \n\t hello'), ['def', 'hello']);
    });
    test('Tokenization keeps numbers attached to words', function () {
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)('def hello1:\n\treturn world49'), ['def', 'hello1', 'return', 'world49']);
    });
    test('Tokenization splits words on special characters', function () {
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)('def hello(world):\n\treturn a.b+1'), [
            'def',
            'hello',
            'world',
            'return',
            'a',
            'b',
            '1',
        ]);
    });
    test('Tokenization splits words on underscores', function () {
        assert.deepStrictEqual((0, selectRelevance_1.splitIntoWords)("def hello_world:\n\treturn 'I_am_a_sentence!'"), [
            'def',
            'hello',
            'world',
            'return',
            'I',
            'am',
            'a',
            'sentence',
        ]);
    });
    test('Find all snippets.', async function () {
        const windowLength = 2;
        const doc1 = {
            source: 'or not\ngood morning\ngood night\nthe day\nis bright\nthe morning sun\nis hot',
            uri: 'file:///home/user/test.js',
        };
        const refDoc = {
            source: 'good morning good night the day is bright',
            languageId: '',
            uri: 'file:///home/user/test.js',
        };
        assert.deepStrictEqual(await retrieveAllSnippetsWithJaccardScore(doc1, refDoc, windowLength, selectRelevance_1.SortOptions.None), [
            { score: 0.6, startLine: 1, endLine: 3 },
            { score: 0.4, startLine: 3, endLine: 5 },
            { score: 0.14285714285714285, startLine: 5, endLine: 7 },
        ]);
        assert.deepStrictEqual(await retrieveAllSnippetsWithJaccardScore(doc1, refDoc, windowLength, selectRelevance_1.SortOptions.Ascending), [
            { score: 0.14285714285714285, startLine: 5, endLine: 7 },
            { score: 0.4, startLine: 3, endLine: 5 },
            { score: 0.6, startLine: 1, endLine: 3 },
        ]);
        assert.deepStrictEqual(await retrieveAllSnippetsWithJaccardScore(doc1, refDoc, windowLength, selectRelevance_1.SortOptions.Descending), [
            { score: 0.6, startLine: 1, endLine: 3 },
            { score: 0.4, startLine: 3, endLine: 5 },
            { score: 0.14285714285714285, startLine: 5, endLine: 7 },
        ]);
    });
    test('Test Jaccard similarity.', function () {
        const bagOfWords1 = 'one two three four five';
        const bagOfWords2 = 'zone ztwo zthree zfour zfive';
        const bagOfWords3 = 'one two three four five six'; // single word difference with bagOfWords1
        const bagOfWords4 = 'one ztwo zthree zfour zfive'; // single word intersection with bagOfWords1
        const bagOfWords5 = 'one ztwo ztwo zthree zfour zfive'; // repeated words
        assert.strictEqual((0, jaccardMatching_1.computeScore)(new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1)), new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords2))), 0);
        assert.strictEqual((0, jaccardMatching_1.computeScore)(new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1)), new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1))), 1);
        assert.strictEqual((0, jaccardMatching_1.computeScore)(new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1)), new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords3))), 5 / 6);
        assert.strictEqual((0, jaccardMatching_1.computeScore)(new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1)), new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords4))), 1 / 9);
        assert.strictEqual((0, jaccardMatching_1.computeScore)(new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords1)), new Set((0, selectRelevance_1.splitIntoWords)(bagOfWords5))), 1 / 9);
    });
    test('Snippets never overlap, the highest score wins.', async function () {
        // When overlapping snippets are found, the snippet with the highest score wins and the others are dropped, e.g.:
        // given the ref doc of "the speed of light is incredibly fast", the doc "the light is incredibly fast" matches
        // with score 0.75, but the next "The speed of light is incredibly fast" matches with score 1, so the previous overlapping
        // snippet is dropped.
        const windowLength = 2;
        const doc1 = {
            source: 'the light\nis incredibly fast\nthe speed of light\nis incredibly fast\nexcessively bright, the morning sun\n was hot casting elongated shadows',
            uri: 'file:///home/user/test.js',
        };
        const refDoc = {
            source: 'the speed of light\nis incredibly fast',
            languageId: '',
            uri: 'file:///home/user/test2.js',
        };
        assert.deepStrictEqual(await retrieveAllSnippetsWithJaccardScore(doc1, refDoc, windowLength, selectRelevance_1.SortOptions.None), [
            { score: 1, startLine: 1, endLine: 3 },
            { score: 0.25, startLine: 3, endLine: 5 },
        ]);
    });
});
suite('Test getSimilarSnippets function', function () {
    const docSource = (0, ts_dedent_1.default) `
		A
			B
			C
		D|
			E
		F
		G`;
    const doc = {
        relativePath: 'source1',
        uri: 'source1',
        source: docSource,
        languageId: 'python',
        offset: docSource.indexOf('|'), // reference snippet will be A B C D
    };
    const similarFiles = [
        {
            relativePath: 'similarFile1',
            uri: 'similarFile1',
            source: (0, ts_dedent_1.default) `
				A
					B
					C
					H
				X
					Y
					Z
				`,
        },
        {
            relativePath: 'similarFile2',
            uri: 'similarFile2',
            source: (0, ts_dedent_1.default) `
		  D
			  H
		  `,
        },
    ];
    setup(async function () {
        await tokenization_1.initializeTokenizers;
    });
    test('Returns correct snippet in conservative mode', async function () {
        const options = similarFiles_1.conservativeFilesOptions;
        const snippetLocations = (await (0, similarFiles_1.getSimilarSnippets)(doc, similarFiles, options)).map(snippet => [
            snippet.startLine,
            snippet.endLine,
        ]);
        const correctSnippetLocations = [
            [0, 7], // A B C H X Y Z
        ];
        assert.deepStrictEqual(snippetLocations, correctSnippetLocations);
    });
    test('Returns correct snippets in eager mode', async function () {
        const options = similarFiles_1.defaultSimilarFilesOptions;
        const snippetLocations = (await (0, similarFiles_1.getSimilarSnippets)(doc, similarFiles, options)).map(snippet => [
            snippet.startLine,
            snippet.endLine,
        ]);
        const correctSnippetLocations = [
            [0, 7], // A B C H X Y Z
            [0, 2], // D H - included as get up to 4 similar docs
        ];
        assert.deepStrictEqual(snippetLocations.sort(), correctSnippetLocations.sort());
    });
    test('Returns no snippet in None mode', async function () {
        const options = similarFiles_1.nullSimilarFilesOptions;
        const snippetLocations = (await (0, similarFiles_1.getSimilarSnippets)(doc, similarFiles, options)).map(snippet => [
            snippet.startLine,
            snippet.endLine,
        ]);
        const correctSnippetLocations = [];
        assert.deepStrictEqual(snippetLocations, correctSnippetLocations);
    });
});
suite('Test trimming reference document', function () {
    const docSource = (0, ts_dedent_1.default) `
		1
			2
			3
		4
			5
		6|
		7`;
    const doc = {
        relativePath: 'source1',
        uri: 'source1',
        source: docSource,
        languageId: 'python',
        offset: docSource.indexOf('|'),
    };
    test('FixedWindowSizeJaccardMatcher trims reference document correctly', async function () {
        for (let windowLength = 1; windowLength < 7; windowLength++) {
            const matcherFactory = jaccardMatching_1.FixedWindowSizeJaccardMatcher.FACTORY(windowLength);
            const matcher = matcherFactory.to(doc);
            const referenceTokens = [...(await matcher.referenceTokens)];
            // Don't get 7 because it's after the cursor
            const correctReferenceTokens = ['1', '2', '3', '4', '5', '6'].slice(-windowLength);
            assert.deepStrictEqual(referenceTokens, correctReferenceTokens);
        }
    });
});
//# sourceMappingURL=similarFiles.test.js.map