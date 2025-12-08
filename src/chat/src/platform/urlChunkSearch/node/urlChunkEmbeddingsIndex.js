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
exports.UrlChunkEmbeddingsIndex = void 0;
const crypto_1 = require("../../../util/common/crypto");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClient_1 = require("../../chunking/common/chunkingEndpointClient");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const logService_1 = require("../../log/common/logService");
const githubAvailableEmbeddingTypes_1 = require("../../workspaceChunkSearch/common/githubAvailableEmbeddingTypes");
/**
 * The maximum content length to sent to the chunking endpoint.
 */
const maxContentLength = 1.5 * 1024 * 1024; // 1.5 MB
class UrlContent {
    constructor(uri, _originalText) {
        this.uri = uri;
        this._originalText = _originalText;
        // Markdown - https://github.com/github-linguist/linguist/blob/c27ac0c1daf3865e2b45ee3908d06b5825161d17/lib/linguist/languages.yml#L4323
        this.githubLanguageId = 222;
    }
    async getText() {
        return this._originalText.slice(0, maxContentLength);
    }
    async getContentHash() {
        return (0, crypto_1.createSha256Hash)(await this.getText());
    }
}
let UrlChunkEmbeddingsIndex = class UrlChunkEmbeddingsIndex extends lifecycle_1.Disposable {
    constructor(_authService, _logService, _embeddingsComputer, _chunkingEndpointClient, _availableEmbeddingTypesService) {
        super();
        this._authService = _authService;
        this._logService = _logService;
        this._embeddingsComputer = _embeddingsComputer;
        this._chunkingEndpointClient = _chunkingEndpointClient;
        this._availableEmbeddingTypesService = _availableEmbeddingTypesService;
        this._cache = new SimpleUrlContentCache();
    }
    async findInUrls(files, query, token) {
        const embeddingType = await (0, async_1.raceCancellationError)(this._availableEmbeddingTypesService.getPreferredType(/*silent*/ false), token);
        if (!embeddingType) {
            throw new Error('No embedding types available');
        }
        const [queryEmbedding, fileChunksAndEmbeddings] = await (0, async_1.raceCancellationError)(Promise.all([
            this.computeEmbeddings(embeddingType, query, 'query', token),
            this.getEmbeddingsForFiles(embeddingType, files.map(file => new UrlContent(file.uri, file.content)), chunkingEndpointClient_1.EmbeddingsComputeQos.Batch, token)
        ]), token);
        return this.computeChunkScores(fileChunksAndEmbeddings, queryEmbedding);
    }
    async computeEmbeddings(embeddingType, str, inputType, token) {
        const embeddings = await this._embeddingsComputer.computeEmbeddings(embeddingType, [str], { inputType }, new telemetryCorrelationId_1.TelemetryCorrelationId('UrlChunkEmbeddingsIndex::computeEmbeddings'), token);
        return embeddings.values[0];
    }
    async getEmbeddingsForFiles(embeddingType, files, qos, token) {
        if (!files.length) {
            return [];
        }
        const batchInfo = new chunkingEndpointClient_1.ComputeBatchInfo();
        this._logService.trace(`urlChunkEmbeddingsIndex: Getting auth token `);
        const authToken = await this.tryGetAuthToken();
        if (!authToken) {
            this._logService.error('urlChunkEmbeddingsIndex: Unable to get auth token');
            throw new Error('Unable to get auth token');
        }
        const result = await Promise.all(files.map(async (file) => {
            const result = await this.getChunksAndEmbeddings(authToken, embeddingType, file, batchInfo, qos, token);
            if (!result) {
                return [];
            }
            return result;
        }));
        return result;
    }
    computeChunkScores(fileChunksAndEmbeddings, queryEmbedding) {
        return fileChunksAndEmbeddings
            .map(file => file
            .map(({ chunk, embedding }) => ({
            chunk,
            distance: (0, embeddingsComputer_1.distance)(embedding, queryEmbedding),
        })));
    }
    async getChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, token) {
        const existing = await (0, async_1.raceCancellationError)(this._cache.get(content), token);
        if (existing) {
            return existing;
        }
        const chunksAndEmbeddings = await (0, async_1.raceCancellationError)(this._chunkingEndpointClient.computeChunksAndEmbeddings(authToken, embeddingType, content, batchInfo, qos, new Map(), new telemetryCorrelationId_1.CallTracker('UrlChunkEmbeddingsIndex::getChunksAndEmbeddings'), token), token);
        if (chunksAndEmbeddings) {
            this._cache.set(content, chunksAndEmbeddings);
        }
        return chunksAndEmbeddings;
    }
    async tryGetAuthToken(createIfNone = true) {
        return (await this._authService.getAnyGitHubSession({ createIfNone }))?.accessToken;
    }
};
exports.UrlChunkEmbeddingsIndex = UrlChunkEmbeddingsIndex;
exports.UrlChunkEmbeddingsIndex = UrlChunkEmbeddingsIndex = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, logService_1.ILogService),
    __param(2, embeddingsComputer_1.IEmbeddingsComputer),
    __param(3, chunkingEndpointClient_1.IChunkingEndpointClient),
    __param(4, githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService)
], UrlChunkEmbeddingsIndex);
class SimpleUrlContentCache {
    constructor() {
        this._cache = new map_1.ResourceMap();
    }
    async get(content) {
        const entry = this._cache.get(content.uri);
        if (!entry) {
            return undefined;
        }
        if (entry.hash !== await content.getContentHash()) {
            return undefined;
        }
        return entry.value;
    }
    async set(content, value) {
        const hash = await content.getContentHash();
        this._cache.set(content.uri, { hash, value });
    }
}
//# sourceMappingURL=urlChunkEmbeddingsIndex.js.map