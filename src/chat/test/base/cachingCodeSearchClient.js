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
exports.CachingCodeOrDocSearchClient = exports.CodeOrDocSearchSQLiteCache = void 0;
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const cacheSalt_1 = require("../cacheSalt");
const cache_1 = require("./cache");
const hash_1 = require("./hash");
class CacheableCodeOrDocSearchRequest {
    constructor(query, scopingQuery, requestOptions) {
        this.query = query;
        this.scopingQuery = scopingQuery;
        this.requestOptions = requestOptions;
        this.obj = { query, scopingQuery, requestOptions };
        this.hash = (0, hash_1.computeSHA256)(cacheSalt_1.CODE_SEARCH_CACHE_SALT + JSON.stringify(this.obj));
    }
    toJSON() {
        return this.obj;
    }
}
class CodeOrDocSearchSQLiteCache extends cache_1.SQLiteCache {
    constructor(salt, currentTestRunInfo) {
        super('docs-search', salt, currentTestRunInfo);
    }
}
exports.CodeOrDocSearchSQLiteCache = CodeOrDocSearchSQLiteCache;
let CachingCodeOrDocSearchClient = class CachingCodeOrDocSearchClient {
    constructor(searchClientDesc, cache, instantiationService) {
        this.cache = cache;
        this.searchClient = instantiationService.createInstance(searchClientDesc);
    }
    async search(query, scopingQuery, options = {}, cancellationToken) {
        options.limit ??= 6;
        options.similarity ??= 0.766;
        const req = new CacheableCodeOrDocSearchRequest(query, scopingQuery, options);
        const cacheValue = await this.cache.get(req);
        if (cacheValue) {
            return cacheValue;
        }
        let result;
        if (Array.isArray(scopingQuery.repo)) {
            result = await this.searchClient.search(query, scopingQuery, options, cancellationToken);
        }
        else {
            result = await this.searchClient.search(query, scopingQuery, options, cancellationToken);
        }
        await this.cache.set(req, result);
        return result;
    }
};
exports.CachingCodeOrDocSearchClient = CachingCodeOrDocSearchClient;
exports.CachingCodeOrDocSearchClient = CachingCodeOrDocSearchClient = __decorate([
    __param(2, instantiation_1.IInstantiationService)
], CachingCodeOrDocSearchClient);
//# sourceMappingURL=cachingCodeSearchClient.js.map