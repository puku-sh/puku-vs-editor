"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFetchFetcher = void 0;
const stream_1 = require("stream");
const fetcherService_1 = require("../common/fetcherService");
const networking_1 = require("../common/networking");
const logService_1 = require("../../log/common/logService");
class BaseFetchFetcher {
    constructor(_fetchImpl, _envService, userAgentLibraryUpdate) {
        this._fetchImpl = _fetchImpl;
        this._envService = _envService;
        this.userAgentLibraryUpdate = userAgentLibraryUpdate;
    }
    async fetch(url, options) {
        const headers = { ...options.headers };
        if (!headers['User-Agent']) {
            headers['User-Agent'] = `GitHubCopilotChat/${this._envService.getVersion()}`;
        }
        headers[networking_1.userAgentLibraryHeader] = this.userAgentLibraryUpdate ? this.userAgentLibraryUpdate(this.getUserAgentLibrary()) : this.getUserAgentLibrary();
        let body = options.body;
        if (options.json) {
            if (options.body) {
                throw new Error(`Illegal arguments! Cannot pass in both 'body' and 'json'!`);
            }
            headers['Content-Type'] = 'application/json';
            body = JSON.stringify(options.json);
        }
        const method = options.method || 'GET';
        if (method !== 'GET' && method !== 'POST') {
            throw new Error(`Illegal arguments! 'method' must be either 'GET' or 'POST'!`);
        }
        const signal = options.signal ?? new AbortController().signal;
        if (signal && !(signal instanceof AbortSignal)) {
            throw new Error(`Illegal arguments! 'signal' must be an instance of AbortSignal!`);
        }
        return this._fetch(url, method, headers, body, signal);
    }
    async _fetch(url, method, headers, body, signal) {
        const resp = await this._fetchImpl(url, { method, headers, body, signal });
        return new fetcherService_1.Response(resp.status, resp.statusText, resp.headers, () => resp.text(), () => resp.json(), async () => {
            if (!resp.body) {
                return stream_1.Readable.from([]);
            }
            return stream_1.Readable.fromWeb(resp.body);
        });
    }
    async disconnectAll() {
        // Nothing to do
    }
    makeAbortController() {
        return new AbortController();
    }
    isAbortError(e) {
        // see https://github.com/nodejs/node/issues/38361#issuecomment-1683839467
        return e && e.name === "AbortError";
    }
    getUserMessageForFetcherError(err) {
        return `Please check your firewall rules and network connection then try again. Error Code: ${(0, logService_1.collectSingleLineErrorMessage)(err)}.`;
    }
}
exports.BaseFetchFetcher = BaseFetchFetcher;
//# sourceMappingURL=baseFetchFetcher.js.map