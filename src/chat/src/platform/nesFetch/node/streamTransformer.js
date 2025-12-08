"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamToLines = streamToLines;
exports.jsonlStreamToCompletions = jsonlStreamToCompletions;
const async_1 = require("../../../util/vs/base/common/async");
/**
 * Transforms a stream of strings into a stream of lines.
 *
 * Listener should handle the errors coming from the input stream.
 */
function streamToLines(stream) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let buffer = '';
        for await (const str of stream) {
            buffer += str;
            do {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    break;
                }
                // take the first line
                const line = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                emitter.emitOne(line);
            } while (true);
        }
        if (buffer.length > 0) {
            // last line which doesn't end with \n
            emitter.emitOne(buffer);
        }
    });
}
function jsonlStreamToCompletions(jsonlStream) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        for await (const line of jsonlStream) {
            if (line.trim() === 'data: [DONE]') {
                continue;
            }
            if (line.startsWith('data: ')) {
                try {
                    const message = JSON.parse(line.substring('data: '.length));
                    if (message.error) {
                        emitter.reject(new Error(message.error.message));
                        return;
                    }
                    emitter.emitOne(message);
                }
                catch (err) {
                    emitter.reject(err);
                    return;
                }
            }
        }
    });
}
// function replaceBytes(s: string): string {
// 	if (!s.startsWith('bytes:')) {
// 		return s;
// 	}
// 	const bytes: number[] = [];
// 	let i = 'bytes:'.length;
// 	const textEncoder = new TextEncoder();
// 	while (i < s.length) {
// 		if (s.slice(i, i + 3) === '\\\\x') {
// 			bytes.push(parseInt(s.slice(i + 3, i + 5), 16));
// 			i += 5;
// 		} else if (s.slice(i, i + 2) === '\\x') {
// 			bytes.push(parseInt(s.slice(i + 2, i + 4), 16));
// 			i += 4;
// 		} else {
// 			const encoded = textEncoder.encode(s.slice(i, i + 1));
// 			for (const b of encoded) {
// 				bytes.push(b);
// 			}
// 			i += 1;
// 		}
// 	}
// 	return new TextDecoder('utf8', { fatal: false }).decode(
// 		new Uint8Array(bytes)
// 	);
// }
//# sourceMappingURL=streamTransformer.js.map