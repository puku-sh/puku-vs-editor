"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingResourceFetcher = exports.usedResourceCaches = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const cache_1 = require("./cache");
const simulationContext_1 = require("./simulationContext");
exports.usedResourceCaches = new Set();
class Request {
    constructor(input, cacheScope, cacheSalt, inputCacheKey) {
        this.input = input;
        this.cacheScope = cacheScope;
        this.cacheSalt = cacheSalt;
        this.inputCacheKey = inputCacheKey;
    }
    get hash() {
        return `${this.cacheScope}:${this.cacheSalt}:${this.inputCacheKey}`;
    }
    toJSON() {
        return this.input;
    }
}
class ResourceFetcherSQLiteCache extends cache_1.SQLiteCache {
    constructor(currentTestRunInfo) {
        super('resource', undefined, currentTestRunInfo);
    }
}
class CachingResourceFetcher {
    // needs to be static, otherwise concurrent writes will happen, since
    // many instances of this will be created
    static { this.Queues = new Map(); }
    constructor(currentTestRunInfo, cacheMode) {
        this.cache = cacheMode !== simulationContext_1.CacheMode.Disable
            ? new ResourceFetcherSQLiteCache(currentTestRunInfo)
            : undefined;
    }
    async invokeWithCache(cacheScope, input, cacheSalt, inputCacheKey, fn) {
        if (!this.cache) {
            return await fn(input);
        }
        // serialize accesses to the same cache key
        const promise = Promise.resolve(CachingResourceFetcher.Queues.get(inputCacheKey)).then(async () => {
            const request = new Request(input, cacheScope, cacheSalt, inputCacheKey);
            let result = await this.cache.get(request);
            if (result === undefined) {
                result = await fn(input);
                await this.cache.set(request, result);
            }
            return result;
        });
        CachingResourceFetcher.Queues.set(inputCacheKey, promise.catch(() => { }));
        return promise;
    }
}
exports.CachingResourceFetcher = CachingResourceFetcher;
//# sourceMappingURL=cachingResourceFetcher.js.map