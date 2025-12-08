"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachingChunkingEndpointClient = exports.ChunkingEndpointClientSQLiteCache = void 0;
const chunkingEndpointClientImpl_1 = require("../../src/platform/chunking/common/chunkingEndpointClientImpl");
const crypto_1 = require("../../src/util/common/crypto");
const uri_1 = require("../../src/util/vs/base/common/uri");
const range_1 = require("../../src/util/vs/editor/common/core/range");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const cacheSalt_1 = require("../cacheSalt");
const cache_1 = require("./cache");
class CacheableChunkingEndpointClientRequest {
    static async create(content) {
        const hash = await (0, crypto_1.createSha256Hash)(cacheSalt_1.CHUNKING_ENDPOINT_CACHE_SALT + await content.getText());
        return new CacheableChunkingEndpointClientRequest(hash, content);
    }
    constructor(hash, content) {
        this.hash = hash;
        this.content = content;
    }
}
class ChunkingEndpointClientSQLiteCache extends cache_1.SQLiteCache {
    constructor(salt, currentTestRunInfo) {
        super('chunks-endpoint', salt, currentTestRunInfo);
    }
    async get(req) {
        const result = await super.get(req);
        // Revive objects from cache
        return result?.map(cachedResponse => {
            const chunk = {
                chunk: {
                    file: uri_1.URI.from(cachedResponse.chunk.file),
                    range: new range_1.Range(cachedResponse.chunk.range.startLineNumber, cachedResponse.chunk.range.startColumn, cachedResponse.chunk.range.endLineNumber, cachedResponse.chunk.range.endColumn),
                    isFullFile: cachedResponse.chunk.isFullFile,
                    text: cachedResponse.chunk.text,
                    rawText: cachedResponse.chunk.rawText,
                },
                chunkHash: cachedResponse.chunkHash,
                embedding: cachedResponse.embedding,
            };
            return chunk;
        });
    }
}
exports.ChunkingEndpointClientSQLiteCache = ChunkingEndpointClientSQLiteCache;
let CachingChunkingEndpointClient = class CachingChunkingEndpointClient {
    constructor(_cache, instantiationService) {
        this._cache = _cache;
        this._chunkingEndpointClient = instantiationService.createInstance(chunkingEndpointClientImpl_1.ChunkingEndpointClientImpl);
    }
    async computeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token) {
        const req = await CacheableChunkingEndpointClientRequest.create(content);
        const cacheValue = await this._cache.get(req);
        if (cacheValue) {
            return cacheValue;
        }
        const result = await this._chunkingEndpointClient.computeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token);
        if (result) {
            await this._cache.set(req, result);
        }
        return result;
    }
    computeChunks(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token) {
        return this.computeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, cache, telemetryInfo, token);
    }
};
exports.CachingChunkingEndpointClient = CachingChunkingEndpointClient;
exports.CachingChunkingEndpointClient = CachingChunkingEndpointClient = __decorate([
    __param(1, instantiation_1.IInstantiationService)
], CachingChunkingEndpointClient);
//# sourceMappingURL=cachingChunksEndpointClient.js.map