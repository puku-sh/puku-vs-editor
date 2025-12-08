"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFetcher = void 0;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const fetcherService_1 = require("../common/fetcherService");
const networking_1 = require("../common/networking");
const logService_1 = require("../../log/common/logService");
class NodeFetcher {
    constructor(_envService, _userAgentLibraryUpdate) {
        this._envService = _envService;
        this._userAgentLibraryUpdate = _userAgentLibraryUpdate;
    }
    getUserAgentLibrary() {
        return 'node-http';
    }
    fetch(url, options) {
        const headers = { ...options.headers };
        if (!headers['User-Agent']) {
            headers['User-Agent'] = `GitHubCopilotChat/${this._envService.getVersion()}`;
        }
        headers[networking_1.userAgentLibraryHeader] = this._userAgentLibraryUpdate ? this._userAgentLibraryUpdate(this.getUserAgentLibrary()) : this.getUserAgentLibrary();
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
    _fetch(url, method, headers, body, signal) {
        return new Promise((resolve, reject) => {
            const module = url.startsWith('https:') ? https : http;
            const req = module.request(url, { method, headers }, res => {
                if (signal.aborted) {
                    res.destroy();
                    req.destroy();
                    reject(makeAbortError(signal));
                    return;
                }
                const nodeFetcherResponse = new NodeFetcherResponse(req, res, signal);
                resolve(new fetcherService_1.Response(res.statusCode || 0, res.statusMessage || '', nodeFetcherResponse.headers, async () => nodeFetcherResponse.text(), async () => nodeFetcherResponse.json(), async () => nodeFetcherResponse.body()));
            });
            req.setTimeout(60 * 1000); // time out after 60s of receiving no data
            req.on('error', reject);
            if (body) {
                req.write(body);
            }
            req.end();
        });
    }
    async disconnectAll() {
        // Nothing to do
    }
    makeAbortController() {
        return new AbortController();
    }
    isAbortError(e) {
        return isAbortError(e);
    }
    isInternetDisconnectedError(_e) {
        return false;
    }
    isFetcherError(e) {
        return e && ['EADDRINUSE', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EPIPE', 'ETIMEDOUT'].includes(e.code);
    }
    getUserMessageForFetcherError(err) {
        return `Please check your firewall rules and network connection then try again. Error Code: ${(0, logService_1.collectSingleLineErrorMessage)(err)}.`;
    }
}
exports.NodeFetcher = NodeFetcher;
function makeAbortError(signal) {
    // see https://github.com/nodejs/node/issues/38361#issuecomment-1683839467
    return signal.reason;
}
function isAbortError(e) {
    // see https://github.com/nodejs/node/issues/38361#issuecomment-1683839467
    return e && e.name === "AbortError";
}
class NodeFetcherResponse {
    constructor(req, res, signal) {
        this.req = req;
        this.res = res;
        this.signal = signal;
        this.headers = new class {
            get(name) {
                const result = res.headers[name];
                return Array.isArray(result) ? result[0] : result ?? null;
            }
            [Symbol.iterator]() {
                const keys = Object.keys(res.headers);
                let index = 0;
                return {
                    next: () => {
                        if (index >= keys.length) {
                            return { done: true, value: undefined };
                        }
                        const key = keys[index++];
                        return { done: false, value: [key, this.get(key)] };
                    }
                };
            }
        };
    }
    text() {
        return new Promise((resolve, reject) => {
            const chunks = [];
            this.res.on('data', chunk => chunks.push(chunk));
            this.res.on('end', () => resolve(Buffer.concat(chunks).toString()));
            this.res.on('error', reject);
            this.signal.addEventListener('abort', () => {
                this.res.destroy();
                this.req.destroy();
                reject(makeAbortError(this.signal));
            });
        });
    }
    async json() {
        const text = await this.text();
        return JSON.parse(text);
    }
    async body() {
        this.signal.addEventListener('abort', () => {
            this.res.emit('error', makeAbortError(this.signal));
            this.res.destroy();
            this.req.destroy();
        });
        return this.res;
    }
}
//# sourceMappingURL=nodeFetcher.js.map