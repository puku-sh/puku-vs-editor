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
exports.NaiveChunkingService = exports.INaiveChunkingService = void 0;
const services_1 = require("../../../util/common/services");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
const naiveChunker_1 = require("./naiveChunker");
exports.INaiveChunkingService = (0, services_1.createServiceIdentifier)('INaiveChunkingService');
let NaiveChunkingService = class NaiveChunkingService {
    constructor(tokenizerProvider) {
        this.tokenizerProvider = tokenizerProvider;
        this.naiveChunkers = new Map();
    }
    async chunkFile(endpoint, uri, text, options, token) {
        const maxTokenLength = options?.maxTokenLength ?? naiveChunker_1.MAX_CHUNK_SIZE_TOKENS;
        const out = await this.getNaiveChunker(endpoint).chunkFile(uri, text, { maxTokenLength }, token);
        if (options?.validateChunkLengths) {
            await this.validateChunkLengths(out, maxTokenLength, endpoint);
        }
        return out.filter(x => x.text);
    }
    getNaiveChunker(endpoint) {
        const cached = this.naiveChunkers.get(endpoint.tokenizer);
        if (cached) {
            return cached;
        }
        const chunker = new naiveChunker_1.NaiveChunker(endpoint, this.tokenizerProvider);
        this.naiveChunkers.set(endpoint.tokenizer, chunker);
        return chunker;
    }
    async validateChunkLengths(chunks, maxTokenLength, endpoint) {
        for (const chunk of chunks) {
            const tokenLength = await this.tokenizerProvider.acquireTokenizer(endpoint).tokenLength(chunk.text);
            if (tokenLength > maxTokenLength * 1.2) {
                console.warn('Produced chunk that is over length limit', { file: chunk.file + '', range: chunk.range, chunkTokenLength: tokenLength, maxLength: maxTokenLength });
            }
        }
    }
};
exports.NaiveChunkingService = NaiveChunkingService;
exports.NaiveChunkingService = NaiveChunkingService = __decorate([
    __param(0, tokenizer_1.ITokenizerProvider)
], NaiveChunkingService);
//# sourceMappingURL=naiveChunkerService.js.map