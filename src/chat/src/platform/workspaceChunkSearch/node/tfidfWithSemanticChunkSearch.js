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
exports.TfIdfWithSemanticChunkSearch = void 0;
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
/**
 * Uses tf-idf to find a set of basic chunks then converts them to semantic chunks.
 */
let TfIdfWithSemanticChunkSearch = class TfIdfWithSemanticChunkSearch extends lifecycle_1.Disposable {
    constructor(_tfidf, _workspaceChunkEmbeddingsIndex, _logService, _telemetryService) {
        super();
        this._tfidf = _tfidf;
        this._workspaceChunkEmbeddingsIndex = _workspaceChunkEmbeddingsIndex;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this.id = workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.Tfidf;
    }
    async searchWorkspace(sizing, query, options, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'TfIdfWithSemanticChunkSearch.perf.searchFileChunks', async () => {
            const tfidfResult = await (0, async_1.raceCancellationError)(this._tfidf.searchWorkspace(sizing, query, options, telemetryInfo.addCaller('TfIdfWithSemanticChunkSearch::searchWorkspace'), token), token);
            const semanticChunks = await this.toSemanticChunks(query, tfidfResult.chunks.map(x => x.chunk), telemetryInfo, token);
            return { chunks: semanticChunks };
        }, (execTime, status) => {
            /* __GDPR__
                "tfIdfWithSemanticChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfIdfWithSemanticChunkSearch.perf.searchFileChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    async searchSubsetOfFiles(sizing, query, files, options, telemetryInfo, token) {
        if (!files.length) {
            return { chunks: [] };
        }
        const tfidfResult = await (0, async_1.raceCancellationError)(this._tfidf.searchSubsetOfFiles(sizing, query, files, options, telemetryInfo.addCaller('TfidfChunkSearch::searchSubsetOfFiles'), token), token);
        const semanticChunks = await this.toSemanticChunks(query, tfidfResult.chunks.map(x => x.chunk), telemetryInfo, token);
        return { chunks: semanticChunks };
    }
    async toSemanticChunks(query, tfidfResults, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'TfIdfWithSemanticChunkSearch.perf.toSemanticChunks', async () => {
            return this._workspaceChunkEmbeddingsIndex.toSemanticChunks(query.resolveQueryEmbeddings(token), tfidfResults, { semanticTimeout: 5000, telemetryInfo }, token);
        }, (execTime, status) => {
            /* __GDPR__
                "tfIdfWithSemanticChunkSearch.perf.toSemanticChunks" : {
                    "owner": "mjbvz",
                    "comment": "Time for the toSemantic part of searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfIdfWithSemanticChunkSearch.perf.toSemanticChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
};
exports.TfIdfWithSemanticChunkSearch = TfIdfWithSemanticChunkSearch;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'TfIdfWithSemanticChunkSearch::searchSubsetOfFiles')
], TfIdfWithSemanticChunkSearch.prototype, "searchSubsetOfFiles", null);
exports.TfIdfWithSemanticChunkSearch = TfIdfWithSemanticChunkSearch = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService)
], TfIdfWithSemanticChunkSearch);
//# sourceMappingURL=tfidfWithSemanticChunkSearch.js.map