"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vitest_1 = require("vitest");
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const uri_1 = require("../../../../util/vs/base/common/uri");
const range_1 = require("../../../../util/vs/editor/common/core/range");
const combinedRank_1 = require("../combinedRank");
(0, vitest_1.suite)('combineRankingInsights', () => {
    // Helper function to create a FileChunk object
    function createFileChunk(path, text, startLine, endLine) {
        return {
            file: uri_1.URI.file(path),
            text,
            rawText: undefined,
            range: new range_1.Range(startLine, 1, endLine, 1),
        };
    }
    // Helper function to create a FileChunkAndScore object
    function createFileChunkAndScore(path, text, startLine, endLine, distance) {
        return {
            chunk: createFileChunk(path, text, startLine, endLine),
            distance: typeof distance === 'number' ? { value: distance, embeddingType: embeddingsComputer_1.EmbeddingType.text3small_512 } : undefined,
        };
    }
    (0, vitest_1.it)('correctly computes best and worst rank when LLM selects multiple chunks', () => {
        const chunks = [
            createFileChunkAndScore('/file1', 'function foo() {}', 1, 5, 0.9),
            createFileChunkAndScore('/file2', 'const bar = 42;', 1, 1, 0.8),
            createFileChunkAndScore('/file3', 'class Baz {}', 1, 3, 0.7),
            createFileChunkAndScore('/file4', 'let x = 10;', 1, 1, 0.6),
        ];
        const llmResponse = [
            {
                file: 'file1',
                query: 'function foo() {}',
            },
            {
                file: 'file3',
                query: 'class Baz {}',
            }
        ];
        const result = (0, combinedRank_1.combineRankingInsights)(chunks, llmResponse);
        (0, vitest_1.expect)(result.llmBestRank).toBe(0); // 'file1' is at index 0
        (0, vitest_1.expect)(result.llmWorstRank).toBe(2); // 'file3' is at index 2
    });
    (0, vitest_1.it)('returns -1 when no LLM selections match', () => {
        const chunks = [
            createFileChunkAndScore('/file1', 'function foo() {}', 1, 5, 0.9),
            createFileChunkAndScore('/file2', 'const bar = 42;', 1, 1, 0.8),
        ];
        const llmResponse = [
            {
                file: 'file3',
                query: 'class Baz {}',
            }
        ];
        const result = (0, combinedRank_1.combineRankingInsights)(chunks, llmResponse);
        (0, vitest_1.expect)(result.llmBestRank).toBe(-1);
        (0, vitest_1.expect)(result.llmWorstRank).toBe(-1);
    });
    (0, vitest_1.it)('handles cases with partial matches correctly', () => {
        const chunks = [
            createFileChunkAndScore('/fileA', 'let test = 5;', 1, 2, 0.95),
            createFileChunkAndScore('/fileB', 'console.log(test);', 3, 4, 0.85),
            createFileChunkAndScore('/fileC', 'function run() {}', 5, 8, 0.75),
            createFileChunkAndScore('/fileD', 'return true;', 9, 10, 0.65),
        ];
        const llmResponse = [
            {
                file: 'fileA',
                query: 'let test = 5;',
            },
            {
                file: 'fileD',
                query: 'return true;',
            }
        ];
        const result = (0, combinedRank_1.combineRankingInsights)(chunks, llmResponse);
        (0, vitest_1.expect)(result.llmBestRank).toBe(0); // 'fileA' at index 0
        (0, vitest_1.expect)(result.llmWorstRank).toBe(3); // 'fileD' at index 3
    });
});
//# sourceMappingURL=ranking.spec.js.map