"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletionsSQLiteCache = exports.ICacheableCompletionsResponse = void 0;
const async_1 = require("../../src/util/vs/base/common/async");
const cache_1 = require("./cache");
const cachingChatMLFetcher_1 = require("./cachingChatMLFetcher");
var ICacheableCompletionsResponse;
(function (ICacheableCompletionsResponse) {
    function create(requestId, cacheMetadata, status, statusText, body) {
        return { requestId, cacheMetadata, status, statusText, body };
    }
    ICacheableCompletionsResponse.create = create;
    function isICacheableResponse(obj) {
        return (typeof obj === 'object' &&
            obj !== null &&
            'requestId' in obj &&
            typeof obj.requestId === 'string' &&
            'cacheMetadata' in obj &&
            cachingChatMLFetcher_1.CachedResponseMetadata.isCachedResponseMetadata(obj.cacheMetadata) &&
            'status' in obj &&
            typeof obj.status === 'number' &&
            'statusText' in obj &&
            typeof obj.statusText === 'string' &&
            'body' in obj &&
            typeof obj.body === 'string');
    }
    ICacheableCompletionsResponse.isICacheableResponse = isICacheableResponse;
    function toFetchResponse(v) {
        // @ulugbekna: currently, if we don't chunk up, the streaming logic errors out if the stream eventually errored (eg "response too long"),
        // 	but we want to be able to capture edits proposed before the error
        const bodyStream = stringToChunkedStream(v.body, 512 /* arbitrary chunk size to hit fast/correct balance */);
        return {
            status: v.status,
            statusText: v.statusText,
            body: bodyStream,
            headers: {} // @ulugbekna: we don't use headers, so this should be ok for now
        };
    }
    ICacheableCompletionsResponse.toFetchResponse = toFetchResponse;
    function stringToChunkedStream(str, chunkSize) {
        return new async_1.AsyncIterableObject(emitter => {
            for (let i = 0; i < str.length; i += chunkSize) {
                emitter.emitOne(str.slice(i, i + chunkSize));
            }
        });
    }
})(ICacheableCompletionsResponse || (exports.ICacheableCompletionsResponse = ICacheableCompletionsResponse = {}));
class CompletionsSQLiteCache extends cache_1.SQLiteSlottedCache {
    constructor(salt, info) {
        super('completions', salt, info);
    }
}
exports.CompletionsSQLiteCache = CompletionsSQLiteCache;
//# sourceMappingURL=completionsCache.js.map