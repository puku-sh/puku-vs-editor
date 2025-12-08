"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const stream_1 = require("../../../networking/node/stream");
(0, vitest_1.suite)('splitChunk', () => {
    (0, vitest_1.test)('splits correctly with one newline in between', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\nbar');
        vitest_1.assert.deepStrictEqual(lines, ['foo']);
        vitest_1.assert.strictEqual(extra, 'bar');
    });
    (0, vitest_1.test)('splits correctly with one newline in between and trailing', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\nbar\n');
        vitest_1.assert.deepStrictEqual(lines, ['foo', 'bar']);
        vitest_1.assert.strictEqual(extra, '');
    });
    (0, vitest_1.test)('splits correctly with two newlines in between', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\n\nbar');
        vitest_1.assert.deepStrictEqual(lines, ['foo']);
        vitest_1.assert.strictEqual(extra, 'bar');
    });
    (0, vitest_1.test)('splits correctly with two newlines in between and trailing', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\n\nbar\n\n');
        vitest_1.assert.deepStrictEqual(lines, ['foo', 'bar']);
        vitest_1.assert.strictEqual(extra, '');
    });
    (0, vitest_1.test)('splits correctly with three newlines in between', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\n\n\nbar');
        vitest_1.assert.deepStrictEqual(lines, ['foo']);
        vitest_1.assert.strictEqual(extra, 'bar');
    });
    (0, vitest_1.test)('splits correctly with three newlines in between and trailing', function () {
        const [lines, extra] = (0, stream_1.splitChunk)('foo\n\n\nbar\n\n\n');
        vitest_1.assert.deepStrictEqual(lines, ['foo', 'bar']);
        vitest_1.assert.strictEqual(extra, '');
    });
});
//# sourceMappingURL=stream.splitChunk.spec.js.map