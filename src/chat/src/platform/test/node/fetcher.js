"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeHeaders = void 0;
exports.createFakeResponse = createFakeResponse;
exports.createFakeStreamResponse = createFakeStreamResponse;
const stream_1 = require("stream");
const fetcherService_1 = require("../../networking/common/fetcherService");
function createFakeResponse(statusCode, response = 'body') {
    return new fetcherService_1.Response(statusCode, 'status text', new FakeHeaders(), () => Promise.resolve(JSON.stringify(response)), () => Promise.resolve(response), async () => null);
}
function createFakeStreamResponse(body, cts) {
    const chunks = Array.isArray(body) ? body : [body];
    return new fetcherService_1.Response(200, 'Success', new FakeHeaders(), async () => chunks.join(''), async () => null, async () => toStream(chunks, cts));
}
function toStream(strings, cts) {
    if (strings.length === 0 || typeof strings[0] === 'string') {
        const stream = new stream_1.Readable();
        stream._read = () => { };
        for (const s of strings) {
            stream.push(s);
        }
        stream.push(null);
        return stream;
    }
    else {
        return stream_1.Readable.from(function* yieldingStreamOfStringChunksWithCancellation() {
            for (const s of strings) {
                if (typeof s === 'string') {
                    yield s;
                }
                else {
                    yield s.chunk;
                    if (s.shouldCancelStream) {
                        cts?.cancel();
                    }
                }
            }
        }());
    }
}
class FakeHeaders {
    constructor() {
        this.headers = new Map();
    }
    get(name) {
        return this.headers.get(name) ?? null;
    }
    [Symbol.iterator]() {
        return this.headers.entries();
    }
}
exports.FakeHeaders = FakeHeaders;
//# sourceMappingURL=fetcher.js.map