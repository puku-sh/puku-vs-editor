"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const async_1 = require("../../../../util/vs/base/common/async");
const streamingEdits_1 = require("../streamingEdits");
(0, vitest_1.suite)('streamLinesInCodeBlock', function () {
    (0, vitest_1.test)('no code', async function () {
        const source = new async_1.AsyncIterableSource();
        source.emitOne('Hello');
        source.emitOne('World');
        source.resolve();
        const stream = streamLinesInCodeBlock(source.asyncIterable);
        const actual = await async_1.AsyncIterableObject.toPromise(stream);
        vitest_1.assert.deepStrictEqual(actual, []);
    });
    (0, vitest_1.test)('emits no lines outside code block', async function () {
        const source = new async_1.AsyncIterableSource();
        const input = [
            'Hello World',
            '```py',
            '# Hello World',
            'foo',
            '```',
            'END',
        ];
        source.emitOne(input.join('\n'));
        source.resolve();
        const stream = streamLinesInCodeBlock(source.asyncIterable);
        const actual = await async_1.AsyncIterableObject.toPromise(stream);
        vitest_1.assert.deepStrictEqual(actual, input.slice(2, 4));
    });
    vitest_1.test.skip('emits no lines outside code block, N blocks', async function () {
        const source = new async_1.AsyncIterableSource();
        const input = [
            'Hello World',
            '```py',
            '# Hello World',
            'foo',
            '```',
            'MID',
            '```ts',
            'type Foo = number',
            'console.log()',
            '```',
        ];
        source.emitOne(input.join('\n'));
        source.resolve();
        const stream = streamLinesInCodeBlock(source.asyncIterable);
        const actual = await async_1.AsyncIterableObject.toPromise(stream);
        vitest_1.assert.deepStrictEqual(actual, [input[2], input[3], input[7], input[8]]);
    });
});
/**
 * Extract just the lines that are inside a code block.
 */
function streamLinesInCodeBlock(source) {
    return ((0, streamingEdits_1.streamLines)(source)
        .filter(streamingEdits_1.LineFilters.createCodeBlockFilter())
        .map(line => line.value));
}
//# sourceMappingURL=streamingEdits.spec.js.map