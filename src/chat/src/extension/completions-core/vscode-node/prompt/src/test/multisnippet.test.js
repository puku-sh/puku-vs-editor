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
const similarFiles_1 = require("../snippetInclusion/similarFiles");
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
suite('Test Multiple Snippet Selection', function () {
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
    const fixedWinDocSrc = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz'
        .split('')
        .join('\n');
    const fixedWinDoc = {
        relativePath: 'source1',
        uri: 'source1',
        source: fixedWinDocSrc,
        languageId: 'python',
        offset: fixedWinDocSrc.length, // Reference doc qrstuvqxyz with conservative option (10 characters), stuv...abc...xyz with eager (60 characters)
    };
    const fixedWinSimilarFiles = [
        {
            relativePath: 'similarFile1',
            uri: 'similarFile1',
            source: 'abcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyzabcdefghijklmno1234567890abcdefghijklmnopqrstuvwxyz'
                .split('')
                .join('\n'),
        },
    ];
    test('FixedWindow Matcher None', async function () {
        /** Test under FixedWindow matcher no match gets picked up */
        const options = similarFiles_1.nullSimilarFilesOptions;
        const snippets = await (0, similarFiles_1.getSimilarSnippets)(doc, similarFiles, options);
        assert.deepStrictEqual(snippets, []);
    });
    test('FixedWindow Matcher Eager No Selection Option', async function () {
        /** This is to test Multisnippet selection with FixedWindow Matcher and Eager Neibhbortab
         * option. windows size for Eager option is 60 and minimum score threshold for inclusion is 0.0.
         * We expect only 1 match from line 0 to 60. WIth no selection option, we expect the best match to be returned.
         */
        const options = similarFiles_1.defaultSimilarFilesOptions;
        const snippetLocationsTop1 = (await (0, similarFiles_1.getSimilarSnippets)(fixedWinDoc, fixedWinSimilarFiles, options)).map(snippet => [snippet.startLine, snippet.endLine]);
        const correctSnippetLocations = [[0, 60]];
        assert.deepStrictEqual(snippetLocationsTop1.sort(), correctSnippetLocations.sort());
    });
});
//# sourceMappingURL=multisnippet.test.js.map