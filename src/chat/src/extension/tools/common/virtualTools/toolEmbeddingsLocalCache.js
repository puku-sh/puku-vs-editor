"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.ToolEmbeddingLocalCache = void 0;
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const embeddingsStorage_1 = require("../../../../platform/embeddings/common/embeddingsStorage");
const extensionContext_1 = require("../../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const variableLengthQuantity_1 = require("../../../../util/common/variableLengthQuantity");
const async_1 = require("../../../../util/vs/base/common/async");
const buffer_1 = require("../../../../util/vs/base/common/buffer");
const hash_1 = require("../../../../util/vs/base/common/hash");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../../util/vs/base/common/map");
const uri_1 = require("../../../../util/vs/base/common/uri");
const EMBEDDING_CACHE_FILE_NAME = 'toolEmbeddingsCache.bin';
const CACHE_VERSION = 1;
const SHA1_DIGEST_LENGTH = 20; // SHA-1 produces 20 bytes
/**
 * A local cache for tool embeddings that stores data in an efficient binary format.
 *
 * Binary format:
 * ```
 * [Version(VLQ)][TypeLen(VLQ)][TypeString][EntryCount(VLQ)]
 * [Entry1: Key(20bytes) + EmbedLen(VLQ) + EmbedData]
 * [Entry2: Key(20bytes) + EmbedLen(VLQ) + EmbedData]
 * ...
 * ```
 */
let ToolEmbeddingLocalCache = class ToolEmbeddingLocalCache extends lifecycle_1.Disposable {
    constructor(embeddingType, _fileSystemService, _context) {
        super();
        this._fileSystemService = _fileSystemService;
        this._lru = new map_1.LRUCache(1000);
        this._toolHashes = new WeakMap();
        this._storageScheduler = this._register(new async_1.RunOnceScheduler(() => this.save(), 5000));
        this._embeddingType = embeddingType;
        this._storageUri = uri_1.URI.joinPath(_context.globalStorageUri, EMBEDDING_CACHE_FILE_NAME);
    }
    async initialize() {
        try {
            const buffer = buffer_1.VSBuffer.wrap(await this._fileSystemService.readFile(this._storageUri, true));
            let offset = 0;
            // Read version
            const versionResult = (0, variableLengthQuantity_1.readVariableLengthQuantity)(buffer, offset);
            offset += versionResult.consumed;
            if (versionResult.value !== CACHE_VERSION) {
                return;
            }
            // Read embedding type and validate it matches
            const typeLengthResult = (0, variableLengthQuantity_1.readVariableLengthQuantity)(buffer, offset);
            offset += typeLengthResult.consumed;
            const typeLength = typeLengthResult.value;
            const typeBytes = buffer.slice(offset, offset + typeLength);
            offset += typeLength;
            const storedEmbeddingTypeId = new TextDecoder().decode(typeBytes.buffer);
            const storedEmbeddingType = new embeddingsComputer_1.EmbeddingType(storedEmbeddingTypeId);
            // If stored type doesn't match current type, discard the cache
            if (!storedEmbeddingType.equals(this._embeddingType)) {
                return;
            }
            // Read number of entries
            const entriesCountResult = (0, variableLengthQuantity_1.readVariableLengthQuantity)(buffer, offset);
            offset += entriesCountResult.consumed;
            const entriesCount = entriesCountResult.value;
            // Read each entry
            for (let i = 0; i < entriesCount; i++) {
                // Read key (fixed length SHA-1 digest)
                const keyBytes = buffer.slice(offset, offset + SHA1_DIGEST_LENGTH);
                offset += SHA1_DIGEST_LENGTH;
                const key = (0, buffer_1.encodeHex)(keyBytes);
                // Read embedding data length and data
                const embeddingLengthResult = (0, variableLengthQuantity_1.readVariableLengthQuantity)(buffer, offset);
                offset += embeddingLengthResult.consumed;
                const embeddingLength = embeddingLengthResult.value;
                const embeddingBytes = buffer.slice(offset, offset + embeddingLength);
                offset += embeddingLength;
                // Unpack embedding and store in cache
                const embedding = (0, embeddingsStorage_1.unpackEmbedding)(this._embeddingType, new Uint8Array(embeddingBytes.buffer));
                this._lru.set(key, embedding);
            }
        }
        catch {
            // ignored
        }
    }
    get(tool) {
        return this._lru.get(this._getKey(tool));
    }
    set(tool, embedding) {
        const key = this._getKey(tool);
        this._lru.set(key, embedding);
        this._storageScheduler.schedule();
    }
    _getKey(tool) {
        let hash = this._toolHashes.get(tool);
        if (!hash) {
            const sha = new hash_1.StringSHA1();
            sha.update(tool.name);
            sha.update('\0');
            sha.update(tool.description);
            hash = sha.digest();
            this._toolHashes.set(tool, hash);
        }
        return hash;
    }
    async save() {
        this._storageScheduler.cancel();
        if (!this._lru.size) {
            return;
        }
        const entries = this._lru.toJSON();
        const buffers = [];
        // Write version
        buffers.push((0, variableLengthQuantity_1.writeVariableLengthQuantity)(CACHE_VERSION));
        // Write embedding type at top level
        const typeBytes = new TextEncoder().encode(this._embeddingType.id);
        buffers.push((0, variableLengthQuantity_1.writeVariableLengthQuantity)(typeBytes.length));
        buffers.push(buffer_1.VSBuffer.wrap(typeBytes));
        // Write number of entries
        buffers.push((0, variableLengthQuantity_1.writeVariableLengthQuantity)(entries.length));
        // Write each entry
        for (const [key, embedding] of entries) {
            // Write key as binary (decode hex string to binary)
            const keyBinary = (0, buffer_1.decodeHex)(key);
            buffers.push(buffer_1.VSBuffer.wrap(keyBinary.buffer));
            // Pack and write embedding data (no need to store type per entry)
            const packedEmbedding = (0, embeddingsStorage_1.packEmbedding)(embedding);
            buffers.push((0, variableLengthQuantity_1.writeVariableLengthQuantity)(packedEmbedding.length));
            buffers.push(buffer_1.VSBuffer.wrap(packedEmbedding));
        }
        // Concatenate all buffers and write to file
        const totalBuffer = buffer_1.VSBuffer.concat(buffers);
        await this._fileSystemService.writeFile(this._storageUri, totalBuffer.buffer);
    }
};
exports.ToolEmbeddingLocalCache = ToolEmbeddingLocalCache;
exports.ToolEmbeddingLocalCache = ToolEmbeddingLocalCache = __decorate([
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, extensionContext_1.IVSCodeExtensionContext)
], ToolEmbeddingLocalCache);
//# sourceMappingURL=toolEmbeddingsLocalCache.js.map