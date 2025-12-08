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
exports.PukuEmbeddingsCache = void 0;
/* eslint-disable header/header */
const uri_1 = require("../../../util/vs/base/common/uri");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const hash_1 = require("../../../util/vs/base/common/hash");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const logService_1 = require("../../log/common/logService");
const embeddingsComputer_1 = require("../common/embeddingsComputer");
let PukuEmbeddingsCache = class PukuEmbeddingsCache extends lifecycle_1.Disposable {
    constructor(storageUri, _fileSystemService, _logService) {
        super();
        this.storageUri = storageUri;
        this._fileSystemService = _fileSystemService;
        this._logService = _logService;
        this._cache = new Map();
        if (storageUri) {
            this._cacheFile = uri_1.URI.joinPath(storageUri, 'puku-embeddings-cache.json');
        }
    }
    async get(key, contentHash) {
        const entry = this._cache.get(key);
        if (entry && entry.hash === contentHash) {
            // Determine embedding type from stored type ID
            let embeddingType;
            if (entry.embeddingTypeId === embeddingsComputer_1.EmbeddingType.voyageCode3_1024.id) {
                embeddingType = embeddingsComputer_1.EmbeddingType.voyageCode3_1024;
            }
            else if (entry.embeddingTypeId === embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary.id) {
                embeddingType = embeddingsComputer_1.EmbeddingType.metis_1024_I16_Binary;
            }
            else {
                embeddingType = embeddingsComputer_1.EmbeddingType.text3small_512;
            }
            return {
                type: embeddingType,
                value: entry.embedding.slice(0),
            };
        }
        return undefined;
    }
    async set(key, contentHash, embedding) {
        this._cache.set(key, {
            embedding: [...embedding.value],
            hash: contentHash,
            timestamp: Date.now(),
            embeddingTypeId: embedding.type.id,
        });
    }
    /**
     * Compute a hash for the input content to use as cache key
     */
    static computeHash(content) {
        const sha = new hash_1.StringSHA1();
        sha.update(content);
        return sha.digest();
    }
    async persist() {
        if (!this._cacheFile || !this.storageUri) {
            return;
        }
        try {
            // Ensure directory exists
            try {
                await this._fileSystemService.stat(this.storageUri);
            }
            catch {
                await this._fileSystemService.createDirectory(this.storageUri);
            }
            // Write cache to disk
            const cacheData = Array.from(this._cache.entries()).map(([key, entry]) => ({
                key,
                embedding: entry.embedding,
                hash: entry.hash,
                timestamp: entry.timestamp,
                embeddingTypeId: entry.embeddingTypeId,
            }));
            await this._fileSystemService.writeFile(this._cacheFile, Buffer.from(JSON.stringify(cacheData, null, 2)));
            this._logService.trace(`PukuEmbeddingsCache: Persisted ${cacheData.length} entries to ${this._cacheFile.fsPath}`);
        }
        catch (error) {
            this._logService.error('PukuEmbeddingsCache: Failed to persist cache', error);
        }
    }
    async load() {
        if (!this._cacheFile) {
            return;
        }
        try {
            const fileContent = await this._fileSystemService.readFile(this._cacheFile);
            const cacheData = JSON.parse(fileContent.toString());
            this._cache.clear();
            for (const entry of cacheData) {
                this._cache.set(entry.key, {
                    embedding: entry.embedding,
                    hash: entry.hash,
                    timestamp: entry.timestamp,
                    embeddingTypeId: entry.embeddingTypeId || embeddingsComputer_1.EmbeddingType.text3small_512.id, // Default for backward compatibility
                });
            }
            this._logService.trace(`PukuEmbeddingsCache: Loaded ${cacheData.length} entries from ${this._cacheFile.fsPath}`);
        }
        catch (error) {
            // Cache file doesn't exist or is invalid, start with empty cache
            this._logService.trace('PukuEmbeddingsCache: No existing cache found, starting fresh');
        }
    }
    clear() {
        this._cache.clear();
    }
    get size() {
        return this._cache.size;
    }
};
exports.PukuEmbeddingsCache = PukuEmbeddingsCache;
exports.PukuEmbeddingsCache = PukuEmbeddingsCache = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, logService_1.ILogService)
], PukuEmbeddingsCache);
//# sourceMappingURL=pukuEmbeddingsCache.js.map