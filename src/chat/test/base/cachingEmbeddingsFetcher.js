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
exports.CachingEmbeddingsComputer = exports.CacheableEmbeddingRequest = void 0;
const authentication_1 = require("../../src/platform/authentication/common/authentication");
const embeddingsComputer_1 = require("../../src/platform/embeddings/common/embeddingsComputer");
const remoteEmbeddingsComputer_1 = require("../../src/platform/embeddings/common/remoteEmbeddingsComputer");
const capiClient_1 = require("../../src/platform/endpoint/common/capiClient");
const endpointProvider_1 = require("../../src/platform/endpoint/common/endpointProvider");
const envService_1 = require("../../src/platform/env/common/envService");
const logService_1 = require("../../src/platform/log/common/logService");
const fetcherService_1 = require("../../src/platform/networking/common/fetcherService");
const telemetry_1 = require("../../src/platform/telemetry/common/telemetry");
const hash_1 = require("./hash");
class CacheableEmbeddingRequest {
    constructor(embeddingQuery, model) {
        this.query = embeddingQuery;
        this.model = model;
        this.hash = (0, hash_1.computeSHA256)(this.query + model);
    }
    toJSON() {
        return {
            query: this.query,
            model: this.model,
        };
    }
}
exports.CacheableEmbeddingRequest = CacheableEmbeddingRequest;
let CachingEmbeddingsComputer = class CachingEmbeddingsComputer extends remoteEmbeddingsComputer_1.RemoteEmbeddingsComputer {
    constructor(cache, authService, capiClientService, envService, fetcherService, logService, telemetryService, endpointProvider) {
        super(authService, capiClientService, envService, fetcherService, logService, telemetryService, endpointProvider);
        this.cache = cache;
    }
    async computeEmbeddings(type, inputs, options, telemetryInfo, token) {
        const embeddingEntries = new Map();
        const nonCached = [];
        const model = (0, embeddingsComputer_1.getWellKnownEmbeddingTypeInfo)(type)?.model;
        if (!model) {
            throw new Error(`Unknown embedding type: ${type.id}`);
        }
        for (const input of inputs) {
            const embeddingRequest = new CacheableEmbeddingRequest(input, model);
            const cacheEntry = await this.cache.get(embeddingRequest);
            if (!cacheEntry) {
                nonCached.push(embeddingRequest.query);
            }
            else {
                embeddingEntries.set(embeddingRequest.query, { type, value: cacheEntry });
            }
        }
        if (nonCached.length) {
            const embeddingsResult = await super.computeEmbeddings(type, nonCached, options, telemetryInfo, token);
            // Update the cache with the newest entries
            for (let i = 0; i < nonCached.length; i++) {
                const embeddingRequest = new CacheableEmbeddingRequest(nonCached[i], model);
                const embedding = embeddingsResult.values[i];
                embeddingEntries.set(embeddingRequest.query, embedding);
                await this.cache.set(embeddingRequest, embedding.value);
            }
        }
        // This reconstructs the output array such that each embedding is at the right index to match the input array
        const out = [];
        for (const input of inputs) {
            const embedding = embeddingEntries.get(input);
            if (embedding) {
                out.push(embedding);
            }
        }
        return { type, values: out };
    }
};
exports.CachingEmbeddingsComputer = CachingEmbeddingsComputer;
exports.CachingEmbeddingsComputer = CachingEmbeddingsComputer = __decorate([
    __param(1, authentication_1.IAuthenticationService),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, envService_1.IEnvService),
    __param(4, fetcherService_1.IFetcherService),
    __param(5, logService_1.ILogService),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, endpointProvider_1.IEndpointProvider)
], CachingEmbeddingsComputer);
//# sourceMappingURL=cachingEmbeddingsFetcher.js.map