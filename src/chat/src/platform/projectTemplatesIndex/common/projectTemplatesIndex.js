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
exports.ProjectTemplatesIndex = exports.IProjectTemplatesIndex = void 0;
const services_1 = require("../../../util/common/services");
const vscodeVersion_1 = require("../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const embeddingsIndex_1 = require("../../embeddings/common/embeddingsIndex");
const envService_1 = require("../../env/common/envService");
exports.IProjectTemplatesIndex = (0, services_1.createServiceIdentifier)('IProjectTemplatesIndex');
let ProjectTemplatesIndex = class ProjectTemplatesIndex {
    constructor(useRemoteCache = true, envService, instantiationService) {
        this._isIndexLoaded = false;
        const cacheVersion = (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version);
        this.embeddingsCache = useRemoteCache ?
            instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'projectTemplateEmbeddings', cacheVersion, embeddingsComputer_1.EmbeddingType.text3small_512, embeddingsIndex_1.RemoteCacheType.ProjectTemplates)
            : instantiationService.createInstance(embeddingsIndex_1.LocalEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'projectTemplateEmbeddings', cacheVersion, embeddingsComputer_1.EmbeddingType.text3small_512);
    }
    async updateIndex() {
        if (this._isIndexLoaded) {
            return;
        }
        this._isIndexLoaded = true;
        this._embeddings = await this.embeddingsCache.getCache();
    }
    async nClosestValues(embedding, n) {
        await this.updateIndex();
        if (!this._embeddings) {
            return [];
        }
        return (0, embeddingsComputer_1.rankEmbeddings)(embedding, this._embeddings.filter(x => x.embedding).map(item => [`${item.key} `, { type: this.embeddingsCache.embeddingType, value: item.embedding }]), n)
            .map(x => x.value);
    }
};
exports.ProjectTemplatesIndex = ProjectTemplatesIndex;
exports.ProjectTemplatesIndex = ProjectTemplatesIndex = __decorate([
    __param(1, envService_1.IEnvService),
    __param(2, instantiation_1.IInstantiationService)
], ProjectTemplatesIndex);
//# sourceMappingURL=projectTemplatesIndex.js.map