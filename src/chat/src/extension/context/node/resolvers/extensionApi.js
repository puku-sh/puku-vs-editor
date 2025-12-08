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
exports.VSCodeAPIContextElement = exports.IApiEmbeddingsIndex = exports.ApiEmbeddingsIndex = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const embeddingsComputer_1 = require("../../../../platform/embeddings/common/embeddingsComputer");
const embeddingsIndex_1 = require("../../../../platform/embeddings/common/embeddingsIndex");
const envService_1 = require("../../../../platform/env/common/envService");
const markdown_1 = require("../../../../util/common/markdown");
const telemetryCorrelationId_1 = require("../../../../util/common/telemetryCorrelationId");
const vscodeVersion_1 = require("../../../../util/common/vscodeVersion");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
let ApiEmbeddingsIndex = class ApiEmbeddingsIndex {
    constructor(useRemoteCache = true, envService, instantiationService) {
        const cacheVersion = (0, vscodeVersion_1.sanitizeVSCodeVersion)(envService.getEditorInfo().version);
        this.embeddingsCache = useRemoteCache ?
            instantiationService.createInstance(embeddingsIndex_1.RemoteEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'api', cacheVersion, embeddingsComputer_1.EmbeddingType.text3small_512, embeddingsIndex_1.RemoteCacheType.Api) :
            instantiationService.createInstance(embeddingsIndex_1.LocalEmbeddingsCache, embeddingsIndex_1.EmbeddingCacheType.GLOBAL, 'api', cacheVersion, embeddingsComputer_1.EmbeddingType.text3small_512);
    }
    async updateIndex() {
        this.apiChunks = await this.embeddingsCache.getCache();
    }
    nClosestValues(queryEmbedding, n) {
        if (!this.apiChunks) {
            return [];
        }
        return (0, embeddingsComputer_1.rankEmbeddings)(queryEmbedding, this.apiChunks.map(item => [item, { type: this.embeddingsCache.embeddingType, value: item.embedding }]), n)
            .map(x => this.toContextString(x.value));
    }
    toContextString(context) {
        if (context.type === 'code') {
            return `API Reference Code Snippet from vscode.d.ts:\n${(0, markdown_1.createFencedCodeBlock)(context.lang, context.text)}`;
        }
        else if (context.type === 'command') {
            return `${context.text}`;
        }
        else if (context.type === 'documentationCodeBlock') {
            return `Example code from VS Code documentation:\n${(0, markdown_1.createFencedCodeBlock)(context.lang, context.text)}`;
        }
        return '';
    }
};
exports.ApiEmbeddingsIndex = ApiEmbeddingsIndex;
exports.ApiEmbeddingsIndex = ApiEmbeddingsIndex = __decorate([
    __param(1, envService_1.IEnvService),
    __param(2, instantiation_1.IInstantiationService)
], ApiEmbeddingsIndex);
exports.IApiEmbeddingsIndex = (0, instantiation_1.createDecorator)('IApiEmbeddingsIndex');
let VSCodeAPIContextElement = class VSCodeAPIContextElement extends prompt_tsx_1.PromptElement {
    constructor(props, apiEmbeddingsIndex, embeddingsComputer) {
        super(props);
        this.apiEmbeddingsIndex = apiEmbeddingsIndex;
        this.embeddingsComputer = embeddingsComputer;
    }
    async renderAsString() {
        const snippets = await this.getSnippets(undefined);
        return `Below are some potentially relevant code samples related to VS Code extension development. You may use information from these samples to help you answer the question if you believe it is relevant.\n${snippets.join('\n\n')}`;
    }
    async getSnippets(token) {
        await this.apiEmbeddingsIndex.updateIndex();
        if (token?.isCancellationRequested) {
            return [];
        }
        const embeddingResult = await this.embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, [this.props.query], {}, new telemetryCorrelationId_1.TelemetryCorrelationId('VSCodeAPIContextElement::getSnippets'), token);
        return this.apiEmbeddingsIndex.nClosestValues(embeddingResult.values[0], 5);
    }
    async render(state, sizing, progress, token) {
        const snippets = await this.getSnippets(token);
        if (snippets.length) {
            return vscpp(vscppf, null,
                "Below are some potentially relevant code samples related to VS Code extension development. You may use information from these samples to help you answer the question if you believe it is relevant.",
                vscpp("br", null),
                snippets.map(s => {
                    return vscpp(vscppf, null,
                        vscpp(prompt_tsx_1.TextChunk, null, s),
                        vscpp("br", null),
                        vscpp("br", null));
                }));
        }
    }
};
exports.VSCodeAPIContextElement = VSCodeAPIContextElement;
exports.VSCodeAPIContextElement = VSCodeAPIContextElement = __decorate([
    __param(1, exports.IApiEmbeddingsIndex),
    __param(2, embeddingsComputer_1.IEmbeddingsComputer)
], VSCodeAPIContextElement);
//# sourceMappingURL=extensionApi.js.map