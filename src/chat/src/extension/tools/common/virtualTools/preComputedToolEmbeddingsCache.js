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
exports.PreComputedToolEmbeddingsCache = exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING = void 0;
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const embeddingsIndex_1 = require("../../../../platform/embeddings/common/embeddingsIndex");
const envService_1 = require("../../../../platform/env/common/envService");
const logService_1 = require("../../../../platform/log/common/logService");
const vscodeVersion_1 = require("../../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING = embeddingsComputer_1.EmbeddingType.text3small_512;
let PreComputedToolEmbeddingsCache = class PreComputedToolEmbeddingsCache {
    constructor(_logService, instantiationService, envService) {
        this._logService = _logService;
        const cacheVersion = (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version);
        this.cache = instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'toolEmbeddings', cacheVersion, exports.EMBEDDING_TYPE_FOR_TOOL_GROUPING, embeddingsIndex_1.RemoteCacheType.Tools);
    }
    get embeddingType() {
        return this.cache.embeddingType;
    }
    async initialize() {
        this.embeddingsMap = await this._loadEmbeddings();
    }
    get(tool) {
        return this.embeddingsMap?.get(tool.name);
    }
    set() {
        // Read-only cache
    }
    async _loadEmbeddings() {
        try {
            const embeddingsData = await this.cache.getCache();
            const embeddingsMap = new Map();
            if (embeddingsData) {
                for (const [key, embeddingVector] of Object.entries(embeddingsData)) {
                    if (embeddingVector === undefined) {
                        this._logService.warn(`Tool embedding missing for key: ${key}`);
                        continue;
                    }
                    embeddingsMap.set(key, {
                        type: this.embeddingType,
                        value: embeddingVector.embedding
                    });
                }
            }
            return embeddingsMap;
        }
        catch (e) {
            this._logService.error('Failed to load pre-computed tool embeddings', e);
            return new Map();
        }
    }
};
exports.PreComputedToolEmbeddingsCache = PreComputedToolEmbeddingsCache;
exports.PreComputedToolEmbeddingsCache = PreComputedToolEmbeddingsCache = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, envService_1.IEnvService)
], PreComputedToolEmbeddingsCache);
//# sourceMappingURL=preComputedToolEmbeddingsCache.js.map