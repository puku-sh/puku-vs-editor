"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamSplitter = void 0;
// Do not edit, from https://github.com/microsoft/vscode-js-debug/blob/272c88ddf0b806325a1c723b6369d524d6e9409b/src/common/streamSplitter.ts#L1
const stream_1 = require("stream");
/**
 * A Transform stream that splits the input on the "splitter" substring.
 * The resulting chunks will contain (and trail with) the splitter match.
 * The last chunk when the stream ends will be emitted even if a splitter
 * is not encountered.
 */
class StreamSplitter extends stream_1.Transform {
    constructor(splitter) {
        super();
        this.prefix = [];
        /** Suffix added after each split chunk. */
        this.splitSuffix = Buffer.alloc(0);
        if (typeof splitter === 'string' && splitter.length === 1) {
            this.splitter = splitter.charCodeAt(0);
        }
        else if (typeof splitter === 'number') {
            this.splitter = splitter;
        }
        else {
            throw new Error('not implemented here');
        }
    }
    _transform(chunk, _encoding, callback) {
        let offset = 0;
        while (offset < chunk.length) {
            const index = chunk.indexOf(this.splitter, offset);
            if (index === -1) {
                break;
            }
            const thisChunk = chunk.subarray(offset, index);
            const toEmit = this.prefix.length || this.splitSuffix.length
                ? Buffer.concat([...this.prefix, thisChunk, this.splitSuffix])
                : thisChunk;
            this.push(toEmit);
            this.prefix.length = 0;
            offset = index + 1;
        }
        if (offset < chunk.length) {
            this.prefix.push(chunk.subarray(offset));
        }
        callback();
    }
    _flush(callback) {
        if (this.prefix.length) {
            this.push(Buffer.concat([...this.prefix, this.splitSuffix]));
        }
        callback();
    }
}
exports.StreamSplitter = StreamSplitter;
//# sourceMappingURL=streamSplitter.js.map