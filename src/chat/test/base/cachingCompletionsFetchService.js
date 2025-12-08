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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CachingCompletionsFetchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingCompletionsFetchService = exports.CacheableCompletionRequest = void 0;
const outdent_1 = require("outdent");
const yaml = __importStar(require("yaml"));
const authentication_1 = require("../../src/platform/authentication/common/authentication");
const completionsFetchServiceImpl_1 = require("../../src/platform/nesFetch/node/completionsFetchServiceImpl");
const fetcherService_1 = require("../../src/platform/networking/common/fetcherService");
const result_1 = require("../../src/util/common/result");
const async_1 = require("../../src/util/vs/base/common/async");
const cache_1 = require("../../src/util/vs/base/common/cache");
const jsonOutputPrinter_1 = require("../jsonOutputPrinter");
const sharedTypes_1 = require("../simulation/shared/sharedTypes");
const lock_1 = require("../../src/util/common/lock");
const types_1 = require("../../src/util/vs/base/common/types");
const cacheSalt_1 = require("../cacheSalt");
const completionsCache_1 = require("./completionsCache");
const hash_1 = require("./hash");
const simulationContext_1 = require("./simulationContext");
const stdout_1 = require("./stdout");
class CacheableCompletionRequest {
    constructor(url, options) {
        const cacheSalt = cacheSalt_1.OPENAI_FETCHER_CACHE_SALT.getByUrl(url);
        this.obj = { url, body: options.body };
        this.hash = (0, hash_1.computeSHA256)(cacheSalt + JSON.stringify(this.obj));
    }
    toJSON() {
        return this.obj;
    }
}
exports.CacheableCompletionRequest = CacheableCompletionRequest;
let CachingCompletionsFetchService = class CachingCompletionsFetchService extends completionsFetchServiceImpl_1.CompletionsFetchService {
    static { CachingCompletionsFetchService_1 = this; }
    static { this.Locks = new lock_1.LockMap(); }
    /** Throttle per URL (currently set to send a request only once a second) */
    static { this.throttlers = new cache_1.CachedFunction(function createThrottler(url) {
        const delayMs = 1000; // milliseconds
        const options = {
            maxBufferedWork: undefined, // We want to hold as many requests as possible
            maxWorkChunkSize: 1,
            waitThrottleDelayBetweenWorkUnits: true,
            throttleDelay: delayMs,
        };
        return new async_1.ThrottledWorker(options, async (tasks) => {
            for (const task of tasks) {
                task();
            }
        });
    }); }
    constructor(nesCache, testInfo, cacheMode, requestCollector, isNoFetchModeEnabled, jsonOutputPrinter, authService, fetcherService) {
        super(authService, fetcherService);
        this.nesCache = nesCache;
        this.testInfo = testInfo;
        this.cacheMode = cacheMode;
        this.requestCollector = requestCollector;
        this.isNoFetchModeEnabled = isNoFetchModeEnabled;
        this.jsonOutputPrinter = jsonOutputPrinter;
        this.requests = new Map(); // this's dirty hack to pass info from lower layer _fetchFromUrl to _fetch -- needs rewriting
    }
    async fetch(url, secretKey, params, requestId, ct, headerOverrides) {
        const interceptedRequest = new async_1.DeferredPromise();
        this.requestCollector.addInterceptedRequest(interceptedRequest.p);
        const r = await super.fetch(url, secretKey, params, requestId, ct, headerOverrides);
        const request = params.prompt;
        const requestOptions = {
            ...params,
            request
        };
        const requestCachingInfo = this.requests.get(requestId);
        this.requests.delete(requestId);
        (0, types_1.assertType)(requestCachingInfo, 'request must be set');
        const requestHitsCache = requestCachingInfo.hitsCache;
        const cacheKey = requestCachingInfo.request.hash;
        const model = inventModelFromURI(url);
        if (r.isOk()) {
            const startTime = new Date();
            const requestTime = startTime.toISOString();
            r.val.response.then(response => {
                const elapsedTime = Date.now() - startTime.valueOf();
                const cacheMetadata = {
                    requestDuration: elapsedTime,
                    requestTime
                };
                const serializedResponse = response.isOk()
                    ? {
                        type: 'success',
                        cacheKey,
                        isCacheHit: requestHitsCache,
                        cacheMetadata,
                        requestId,
                        value: [response.val.choices[0].text ?? ''],
                    }
                    : {
                        type: response.err.name,
                        cacheKey,
                        isCacheHit: requestHitsCache,
                        requestId,
                        value: [response.err.stack ? response.err.stack : response.err.message],
                    };
                interceptedRequest.complete(new sharedTypes_1.InterceptedRequest(request, requestOptions, serializedResponse, cacheKey, model));
            });
        }
        else {
            const response = {
                type: r.err.kind,
                cacheKey,
                isCacheHit: requestHitsCache,
                requestId,
                value: [r.err.kind],
            };
            interceptedRequest.complete(new sharedTypes_1.InterceptedRequest(request, requestOptions, response, cacheKey, model));
        }
        return r;
    }
    async _fetchFromUrl(url, options, ct) {
        const request = new CacheableCompletionRequest(url, options);
        if (this.cacheMode === simulationContext_1.CacheMode.Disable) {
            this.requests.set(options.requestId, { request, hitsCache: false });
            return this._fetchFromUrlAndCache(request, url, options, ct);
        }
        return CachingCompletionsFetchService_1.Locks.withLock(request.hash, async () => {
            const cachedValue = await this.nesCache.get(request, this.testInfo.cacheSlot);
            if (cachedValue) {
                this.requests.set(options.requestId, { request, hitsCache: true });
                return result_1.Result.ok(completionsCache_1.ICacheableCompletionsResponse.toFetchResponse(cachedValue));
            }
            if (this.cacheMode === simulationContext_1.CacheMode.Require) {
                console.log(JSON.stringify(options.body, (key, value) => {
                    if (typeof value === 'string') {
                        const split = value.split(/\n/g);
                        return split.length > 1 ? split : value;
                    }
                    return value;
                }, 4));
                await this.throwCacheMissing(request);
            }
            try {
                this.requests.set(options.requestId, { request, hitsCache: false });
            }
            catch (err) {
                if (/Key already exists/.test(err.message)) {
                    console.log(JSON.stringify(options.body, (key, value) => {
                        if (typeof value === 'string') {
                            const split = value.split(/\n/g);
                            return split.length > 1 ? split : value;
                        }
                        return value;
                    }, 4));
                    console.log(`\n✗ ${err.message}`);
                    await (0, stdout_1.drainStdoutAndExit)(1);
                }
                throw err;
            }
            return this._fetchFromUrlAndCache(request, url, options, ct);
        });
    }
    async _fetchFromUrlAndCache(request, url, options, ct) {
        const throttler = CachingCompletionsFetchService_1.throttlers.get(url);
        let startTime;
        const fetchResult = this.isNoFetchModeEnabled
            ? result_1.Result.ok({
                status: 200,
                statusText: '',
                headers: {},
                body: async_1.AsyncIterableObject.fromArray(['']),
            })
            : await new Promise((resolve, reject) => {
                throttler.work([
                    async () => {
                        try {
                            startTime = Date.now();
                            const r = await super._fetchFromUrl(url, options, ct);
                            resolve(r);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                ]);
            });
        if (fetchResult.isError() || fetchResult.val.status !== 200) { // don't cache a failure
            console.log('Fetch failed', JSON.stringify(fetchResult, null, '\t'));
            return fetchResult;
        }
        const response = fetchResult.val;
        const stream = response.body;
        const isCachingEnabled = this.cacheMode !== simulationContext_1.CacheMode.Disable && !this.isNoFetchModeEnabled;
        let body = '';
        const cachingStream = new async_1.AsyncIterableObject(async (emitter) => {
            // I specifically don't wrap in try-catch to not cache if this throws
            for await (const chunk of stream) {
                body += chunk.toString();
                emitter.emitOne(chunk);
            }
            if (isCachingEnabled) {
                const fetchingResponseTimeInMs = Date.now() - startTime;
                const cacheMetadata = {
                    testName: this.testInfo.testName,
                    requestDuration: fetchingResponseTimeInMs,
                    requestTime: new Date().toISOString()
                };
                this.nesCache
                    .set(request, this.testInfo.cacheSlot, completionsCache_1.ICacheableCompletionsResponse.create(options.requestId, cacheMetadata, response.status, response.statusText, body))
                    .catch(err => {
                    console.error(err);
                    console.log('Failed to cache response', JSON.stringify(fetchResult, null, '\t'));
                });
            }
        });
        // Replace response.body with the caching stream
        response.body = cachingStream;
        return fetchResult;
    }
    throwCacheMissing(request) {
        const message = (0, outdent_1.outdent) `
            ✗ Cache entry not found for a request generated by test "${this.testInfo.testName}"!
            - Valid cache entries are currently required for all requests!
            - The missing request has the hash: ${request.hash} (cache slot ${this.testInfo.cacheSlot}, make sure to call simulate -- -n=10).`;
        console.log(message);
        yaml.stringify(request);
        const reason = (0, outdent_1.outdent) `
            Terminated because of --require-cache
            ${message}`;
        this.jsonOutputPrinter.print({ type: sharedTypes_1.OutputType.terminated, reason });
        return (0, stdout_1.drainStdoutAndExit)(1);
    }
};
exports.CachingCompletionsFetchService = CachingCompletionsFetchService;
exports.CachingCompletionsFetchService = CachingCompletionsFetchService = CachingCompletionsFetchService_1 = __decorate([
    __param(5, jsonOutputPrinter_1.IJSONOutputPrinter),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, fetcherService_1.IFetcherService)
], CachingCompletionsFetchService);
function inventModelFromURI(uri) {
    const lastSlash = uri.lastIndexOf('/');
    if (lastSlash === -1) {
        return uri;
    }
    const secondLastSlash = uri.lastIndexOf('/', lastSlash - 1);
    return uri.substring(secondLastSlash + 1);
}
//# sourceMappingURL=cachingCompletionsFetchService.js.map