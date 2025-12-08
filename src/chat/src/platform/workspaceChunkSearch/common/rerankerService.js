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
exports.RerankerService = exports.IRerankerService = void 0;
const services_1 = require("../../../util/common/services");
const async_1 = require("../../../util/vs/base/common/async");
const logService_1 = require("../../log/common/logService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
exports.IRerankerService = (0, services_1.createServiceIdentifier)('IRerankerService');
function buildQueryPrompt(userQuery) {
    return '<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be "yes" or "no".<|im_end|>\n'
        + '<|im_start|>user\n'
        + '<Instruct>: Given a web search query, retrieve relevant passages that answer the query\n'
        + `<Query>: ${userQuery}\n`;
}
function wrapDocument(text) {
    return `<Document>: ${text}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`;
}
let RerankerService = class RerankerService {
    constructor(_logService, _expService) {
        this._logService = _logService;
        this._expService = _expService;
    }
    get _endpoint() {
        return this._expService.getTreatmentVariable('rerankEndpointUrl')?.trim();
    }
    get isAvailable() {
        return !!this._endpoint;
    }
    async rerank(query, documents, token) {
        if (!documents.length || !this.isAvailable || !this._endpoint) {
            return documents;
        }
        const payload = {
            query: buildQueryPrompt(query),
            documents: documents.map(d => wrapDocument(d.chunk.text))
        };
        try {
            const response = await (0, async_1.raceCancellationError)(fetch(this._endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }), token);
            if (!response.ok) {
                this._logService.error(`RerankerService::rerank request failed. status=${response.status}`);
                throw new Error(`Reranker request failed with status ${response.status}`);
            }
            const json = await (0, async_1.raceCancellationError)(response.json(), token);
            const results = json.results;
            if (!Array.isArray(results) || results.length === 0) {
                throw new Error('Reranker returned no results');
            }
            // Sort descending by relevance (higher score = more relevant). If scores missing, treat as 0.
            const sorted = [...results].sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0));
            const used = new Set();
            const reordered = [];
            for (const entry of sorted) {
                if (typeof entry.index === 'number' && entry.index >= 0 && entry.index < documents.length && !used.has(entry.index)) {
                    used.add(entry.index);
                    reordered.push(documents[entry.index]);
                }
            }
            // Preserve any documents that were not returned by the reranker (defensive)
            for (let i = 0; i < documents.length; i++) {
                if (!used.has(i)) {
                    reordered.push(documents[i]);
                }
            }
            return reordered;
        }
        catch (e) {
            this._logService.error(e, 'RerankerService::rerank exception');
            throw e;
        }
    }
};
exports.RerankerService = RerankerService;
exports.RerankerService = RerankerService = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, nullExperimentationService_1.IExperimentationService)
], RerankerService);
//# sourceMappingURL=rerankerService.js.map