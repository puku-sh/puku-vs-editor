"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const async_1 = require("../../../util/vs/base/common/async");
const streaming_1 = require("../../prompts/node/inline/utils/streaming");
(0, vitest_1.suite)('Streaming', () => {
    (0, vitest_1.it)('replaceStringInStream', async () => {
        const streamSrc = new async_1.AsyncIterableSource();
        const resultingStream = (0, streaming_1.replaceStringInStream)(streamSrc.asyncIterable, 'aba', 'xxx');
        const arr = [];
        (0, streaming_1.forEachStreamed)(resultingStream, value => arr.push(value));
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`[]`);
        arr.length = 0;
        streamSrc.emitOne('12345'); // nothing happens
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`
			[
			  "12345",
			]
		`);
        arr.length = 0;
        streamSrc.emitOne('1aba234aba5'); // aba's get replaced
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`
			[
			  "1xxx234xxx5",
			]
		`);
        arr.length = 0;
        streamSrc.emitOne('ab'); // waits for more data
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`[]`);
        arr.length = 0;
        streamSrc.emitOne('a'); // -> replace
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`
			[
			  "xxx",
			]
		`);
        arr.length = 0;
        streamSrc.emitOne('a'); // waits for more data
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`[]`);
        arr.length = 0;
        streamSrc.emitOne('a'); // cannot emit this a yet, but the previous one
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`
			[
			  "a",
			]
		`);
        arr.length = 0;
        streamSrc.emitOne('x'); // flush buffer
        await (0, async_1.timeout)(1);
        (0, vitest_1.expect)(arr).toMatchInlineSnapshot(`
			[
			  "ax",
			]
		`);
        arr.length = 0;
    });
});
//# sourceMappingURL=streaming.spec.js.map