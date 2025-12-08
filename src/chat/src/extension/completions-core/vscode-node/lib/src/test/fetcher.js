"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeAbortController = exports.NoFetchFetcher = exports.StaticFetcher = exports.FakeFetcher = void 0;
exports.createFakeResponse = createFakeResponse;
exports.createFakeJsonResponse = createFakeJsonResponse;
exports.createFakeStreamResponse = createFakeStreamResponse;
exports.createFakeCompletionResponse = createFakeCompletionResponse;
exports.fakeCodeReference = fakeCodeReference;
const stream_1 = require("stream");
const networking_1 = require("../networking");
function createFakeResponse(statusCode, response, headers) {
    const fakeHeaders = new FakeHeaders();
    fakeHeaders.set('x-github-request-id', '1');
    for (const [key, value] of Object.entries(headers || {})) {
        fakeHeaders.set(key, value);
    }
    return new networking_1.Response(statusCode, 'status text', fakeHeaders, () => Promise.resolve(response ?? ''), () => Promise.resolve(response ? JSON.parse(response) : {}), () => Promise.resolve(null));
}
function createFakeJsonResponse(statusCode, response, headers) {
    let text;
    if (typeof response === 'string') {
        text = response;
    }
    else {
        text = JSON.stringify(response);
    }
    return createFakeResponse(statusCode, text, Object.assign({ 'content-type': 'application/json' }, headers));
}
function createFakeStreamResponse(body) {
    return new networking_1.Response(200, 'Success', new FakeHeaders(), () => Promise.resolve(body), () => Promise.resolve(JSON.parse(body.replace(/^data: /gm, '').replace(/\n\[DONE\]\n$/, ''))), () => Promise.resolve(toStream(body)));
}
function createFakeCompletionResponse(completionText, options) {
    const now = Math.floor(Date.now() / 1000);
    if (typeof completionText === 'string') {
        completionText = [completionText];
    }
    const choices = completionText.map((text, i) => ({
        text,
        index: i,
        finishReason: 'stop',
        logprobs: null,
        copilot_annotations: options?.annotations,
        p: 'aaaaaa',
    }));
    const responseObject = {
        id: 'cmpl-AaZz1234',
        created: now,
        model: 'unit-test',
        choices,
    };
    const responseLines = [JSON.stringify(responseObject), `[DONE]`];
    return createFakeStreamResponse(responseLines.map(l => `data: ${l}\n`).join(''));
}
function fakeCodeReference(startOffset = 0, stopOffset = 1, license = 'MIT', url = 'https://github.com/github/example') {
    return {
        ip_code_citations: [
            {
                id: 5,
                start_offset: startOffset,
                stop_offset: stopOffset,
                details: {
                    citations: [
                        {
                            url,
                            license,
                        },
                    ],
                },
            },
        ],
    };
}
class FakeFetcher {
    getImplementation() {
        return this;
    }
    disconnectAll() {
        throw new Error('Method not implemented.');
    }
}
exports.FakeFetcher = FakeFetcher;
const SuccessResponseGenerator = () => createFakeResponse(200);
class StaticFetcher extends FakeFetcher {
    constructor(createResponse = SuccessResponseGenerator) {
        super();
        this.createResponse = createResponse;
    }
    fetch(url, options) {
        this.headerBuffer = options.headers;
        return Promise.resolve(this.createResponse(url, options));
    }
}
exports.StaticFetcher = StaticFetcher;
class NoFetchFetcher extends FakeFetcher {
    fetch(url, options) {
        throw new Error('NoFetchFetcher does not support fetching');
    }
}
exports.NoFetchFetcher = NoFetchFetcher;
function toStream(...strings) {
    const stream = new stream_1.Readable();
    stream._read = () => { };
    for (const s of strings) {
        stream.push(s);
    }
    stream.push(null);
    return stream;
}
class FakeHeaders {
    constructor() {
        this.headers = new Map();
    }
    append(name, value) {
        this.headers.set(name.toLowerCase(), value);
    }
    delete(name) {
        this.headers.delete(name.toLowerCase());
    }
    get(name) {
        return this.headers.get(name.toLowerCase()) ?? null;
    }
    has(name) {
        return this.headers.has(name.toLowerCase());
    }
    set(name, value) {
        this.headers.set(name.toLowerCase(), value);
    }
    entries() {
        return this.headers.entries();
    }
    keys() {
        return this.headers.keys();
    }
    values() {
        return this.headers.values();
    }
    [Symbol.iterator]() {
        return this.headers.entries();
    }
}
class FakeAbortController {
    constructor() {
        this.signal = { aborted: false, addEventListener: () => { }, removeEventListener: () => { } };
    }
    abort() {
        this.signal.aborted = true;
    }
}
exports.FakeAbortController = FakeAbortController;
//# sourceMappingURL=fetcher.js.map