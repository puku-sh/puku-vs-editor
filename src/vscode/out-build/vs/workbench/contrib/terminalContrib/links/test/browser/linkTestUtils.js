/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { hasKey } from '../../../../../../base/common/types.js';
export async function assertLinkHelper(text, expected, detector, expectedType) {
    detector.xterm.reset();
    // Write the text and wait for the parser to finish
    await new Promise(r => detector.xterm.write(text, r));
    const textSplit = text.split('\r\n');
    const lastLineIndex = textSplit.filter((e, i) => i !== textSplit.length - 1).reduce((p, c) => {
        return p + Math.max(Math.ceil(c.length / 80), 1);
    }, 0);
    // Ensure all links are provided
    const lines = [];
    for (let i = 0; i < detector.xterm.buffer.active.cursorY + 1; i++) {
        lines.push(detector.xterm.buffer.active.getLine(i));
    }
    // Detect links always on the last line with content
    const actualLinks = (await detector.detect(lines, lastLineIndex, detector.xterm.buffer.active.cursorY)).map(e => {
        return {
            link: e.uri?.toString() ?? e.text,
            type: expectedType,
            bufferRange: e.bufferRange
        };
    });
    const expectedLinks = expected.map(e => {
        return {
            type: expectedType,
            link: hasKey(e, { uri: true }) ? e.uri.toString() : e.text,
            bufferRange: {
                start: { x: e.range[0][0], y: e.range[0][1] },
                end: { x: e.range[1][0], y: e.range[1][1] },
            }
        };
    });
    deepStrictEqual(actualLinks, expectedLinks);
}
//# sourceMappingURL=linkTestUtils.js.map