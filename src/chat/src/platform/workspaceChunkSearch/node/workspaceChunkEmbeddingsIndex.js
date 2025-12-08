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
exports.WorkspaceChunkEmbeddingsIndex = void 0;
const glob_1 = require("../../../util/common/glob");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClient_1 = require("../../chunking/common/chunkingEndpointClient");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceChunkAndEmbeddingCache_1 = require("./workspaceChunkAndEmbeddingCache");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
let WorkspaceChunkEmbeddingsIndex = class WorkspaceChunkEmbeddingsIndex extends lifecycle_1.Disposable {
    constructor(_embeddingType, vsExtensionContext, instantiationService, _authService, _logService, _simulationTestContext, _telemetryService, _workspaceIndex, _chunkingEndpointClient) {
        super();
        this._embeddingType = _embeddingType;
        this._authService = _authService;
        this._logService = _logService;
        this._simulationTestContext = _simulationTestContext;
        this._telemetryService = _telemetryService;
        this._workspaceIndex = _workspaceIndex;
        this._chunkingEndpointClient = _chunkingEndpointClient;
        this._onDidChangeWorkspaceIndexState = this._register(new event_1.Emitter());
        this.onDidChangeWorkspaceIndexState = event_1.Event.debounce(this._onDidChangeWorkspaceIndexState.event, () => { }, 2500, undefined, undefined, undefined, this._store);
        this._cacheRoot = vsExtensionContext.storageUri;
        this._cache = new lazy_1.Lazy(async () => {
            const cache = this._register(await instantiationService.invokeFunction(accessor => (0, workspaceChunkAndEmbeddingCache_1.createWorkspaceChunkAndEmbeddingCache)(accessor, this._embeddingType, this._cacheRoot, this._workspaceIndex)));
            this._onDidChangeWorkspaceIndexState.fire();
            return cache;
        });
        this._register(event_1.Event.any(this._workspaceIndex.onDidChangeFiles, this._workspaceIndex.onDidCreateFiles, this._workspaceIndex.onDidDeleteFiles)(() => {
            this._onDidChangeWorkspaceIndexState.fire();
        }));
    }
    async getIndexState() {
        if (!this._cache.hasValue) {
            return undefined;
        }
        const cache = await this._cache.value;
        const allWorkspaceFiles = Array.from(this._workspaceIndex.values());
        let indexedCount = 0;
        await Promise.all(allWorkspaceFiles.map(async (file) => {
            if (await cache.isIndexed(file)) {
                indexedCount++;
            }
        }));
        return {
            totalFileCount: allWorkspaceFiles.length,
            indexedFileCount: indexedCount,
        };
    }
    get fileCount() {
        return this._workspaceIndex.fileCount;
    }
    async isUpToDateAndIndexed(uri) {
        const fileRep = this._workspaceIndex.get(uri);
        if (!fileRep) {
            return false;
        }
        const cache = await this._cache.value;
        return cache.isIndexed(fileRep);
    }
    initialize() {
        this._initializePromise ??= this._workspaceIndex.initialize();
        return this._initializePromise;
    }
    async triggerIndexingOfWorkspace(trigger, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkEmbeddingIndex.triggerIndexingOfWorkspace', async () => {
            await (0, async_1.raceCancellationError)(this._workspaceIndex.initialize(), token);
            await this.getAllWorkspaceEmbeddings(trigger, {}, telemetryInfo.addCaller('WorkspaceChunkEmbeddingIndex::triggerIndexingOfWorkspace'), token);
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkEmbeddingsIndex.perf.triggerIndexingOfWorkspace" : {
                    "owner": "mjbvz",
                    "comment": "Total time for triggerIndexingOfWorkspace to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "trigger": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What triggered the call" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.perf.triggerIndexingOfWorkspace', {
                status,
                trigger,
            }, { execTime });
        });
    }
    async triggerIndexingOfFile(uri, telemetryInfo, token) {
        if (!await this._workspaceIndex.shouldIndexWorkspaceFile(uri, token)) {
            return;
        }
        await (0, async_1.raceCancellationError)(this._workspaceIndex.initialize(), token);
        const file = this._workspaceIndex.get(uri);
        if (!file) {
            return;
        }
        const authToken = await this.tryGetAuthToken({ createIfNone: false });
        if (authToken) {
            await this.getChunksAndEmbeddings(authToken, file, new chunkingEndpointClient_1.ComputeBatchInfo(), chunkingEndpointClient_1.EmbeddingsComputeQos.Batch, telemetryInfo.callTracker.add('WorkspaceChunkEmbeddingsIndex::triggerIndexingOfFile'), token);
        }
    }
    async searchWorkspace(query, maxResults, options, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkEmbeddingIndex.searchWorkspace', async () => {
            const [queryEmbedding, fileChunksAndEmbeddings] = await (0, async_1.raceCancellationError)(Promise.all([
                query,
                this.getAllWorkspaceEmbeddings('manual', options.globPatterns ?? {}, telemetryInfo, token)
            ]), token);
            return this.rankEmbeddings(queryEmbedding, fileChunksAndEmbeddings, maxResults);
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkEmbeddingsIndex.perf.searchWorkspace" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchWorkspace to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.perf.searchWorkspace', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    async searchSubsetOfFiles(files, query, maxResults, options, telemetry, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkEmbeddingIndex.searchSubsetOfFiles', async () => {
            const [queryEmbedding, fileChunksAndEmbeddings] = await (0, async_1.raceCancellationError)(Promise.all([
                query,
                this.getEmbeddingsForFiles(files, options.globPatterns ?? {}, chunkingEndpointClient_1.EmbeddingsComputeQos.Batch, telemetry, token)
            ]), token);
            return this.rankEmbeddings(queryEmbedding, fileChunksAndEmbeddings, maxResults);
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkEmbeddingsIndex.perf.searchSubsetOfFiles" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchSubsetOfFiles to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.perf.searchSubsetOfFiles', {
                status,
                workspaceSearchSource: telemetry.info.callTracker.toString(),
                workspaceSearchCorrelationId: telemetry.info.correlationId,
            }, { execTime });
        });
    }
    async toSemanticChunks(query, tfidfResults, options, token) {
        const chunksByFile = new map_1.ResourceMap();
        for (const chunk of tfidfResults) {
            const existingChunks = chunksByFile.get(chunk.file);
            if (existingChunks) {
                existingChunks.push(chunk);
            }
            else {
                chunksByFile.set(chunk.file, [chunk]);
            }
        }
        const authToken = await this.tryGetAuthToken();
        const allResolvedChunks = new Set();
        const batchInfo = new chunkingEndpointClient_1.ComputeBatchInfo();
        await Promise.all(Array.from(chunksByFile.entries(), async ([uri, chunks]) => {
            const file = this._workspaceIndex.get(uri);
            if (!file) {
                console.error('Could not load file', uri);
                return;
            }
            // TODO scope this to just get embeddings for the desired ranges
            const qos = this._simulationTestContext.isInSimulationTests ? chunkingEndpointClient_1.EmbeddingsComputeQos.Batch : chunkingEndpointClient_1.EmbeddingsComputeQos.Online;
            let semanticChunks;
            if (authToken) {
                const cts = new cancellation_1.CancellationTokenSource(token);
                try {
                    semanticChunks = await (0, async_1.raceTimeout)(this.getChunksWithOptionalEmbeddings(authToken, file, batchInfo, qos, options.telemetryInfo.callTracker.add('toSemanticChunks'), cts.token), options.semanticTimeout ?? Infinity, () => cts.cancel());
                }
                finally {
                    cts.dispose();
                }
            }
            const resolvedFileSemanticChunks = new Map();
            if (!semanticChunks) {
                this._logService.error(`toSemanticChunks - Could not get semantic chunks for ${uri}`);
                for (const chunk of chunks) {
                    const key = chunk.range.toString();
                    if (!resolvedFileSemanticChunks.has(key)) {
                        resolvedFileSemanticChunks.set(key, { chunk, distance: undefined });
                    }
                }
            }
            else {
                for (const chunk of chunks) {
                    for (const semanticChunk of semanticChunks) {
                        if (semanticChunk.chunk.range.intersectRanges(chunk.range)) {
                            const key = semanticChunk.chunk.range.toString();
                            resolvedFileSemanticChunks.set(key, {
                                chunk: semanticChunk.chunk,
                                distance: semanticChunk.embedding ? (0, embeddingsComputer_1.distance)(await query, semanticChunk.embedding) : undefined
                            });
                        }
                    }
                    // If we didn't find any semantic chunks we still want to make sure the original chunk is included
                    if (!resolvedFileSemanticChunks.size) {
                        this._logService.error(`No semantic chunk found for in ${uri} for chunk ${chunk.range}`);
                        const key = chunk.range.toString();
                        if (!resolvedFileSemanticChunks.has(key)) {
                            resolvedFileSemanticChunks.set(key, { chunk, distance: undefined });
                        }
                        /* __GDPR__
                            "workspaceChunkEmbeddingsIndex.toSemanticChunks.noSemanticChunkFound" : {
                                "owner": "mjbvz",
                                "comment": "Tracks errors related to mapping to semantic chunks",
                                "extname": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The file's extension" },
                                "semanticChunkCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of semantic chunks returned" }
                            }
                        */
                        this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.toSemanticChunks.noSemanticChunkFound', {
                            extname: (0, resources_1.extname)(file.uri),
                        }, {
                            semanticChunkCount: semanticChunks.length,
                        });
                    }
                }
            }
            for (const chunk of resolvedFileSemanticChunks.values()) {
                allResolvedChunks.add(chunk);
            }
        }));
        return Array.from(allResolvedChunks);
    }
    rankEmbeddings(queryEmbedding, fileChunksAndEmbeddings, maxResults) {
        return (0, embeddingsComputer_1.rankEmbeddings)(queryEmbedding, fileChunksAndEmbeddings.map(x => [x.chunk, x.embedding]), maxResults)
            .map((x) => ({ chunk: x.value, distance: x.distance }));
    }
    async getAllWorkspaceEmbeddings(trigger, include, telemetryInfo, token) {
        const allWorkspaceFiles = Array.from(this._workspaceIndex.values());
        const batchInfo = new chunkingEndpointClient_1.ComputeBatchInfo();
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkEmbeddingIndex.getAllWorkspaceEmbeddings', async () => {
            const authToken = await this.tryGetAuthToken({ createIfNone: true, silent: trigger === 'auto' });
            if (!authToken) {
                throw new Error('Unable to get auth token');
            }
            let processedFiles = 0;
            const result = await Promise.all(allWorkspaceFiles.map(async (file) => {
                try {
                    if ((0, glob_1.shouldInclude)(file.uri, include)) {
                        return await this.getChunksAndEmbeddings(authToken, file, batchInfo, chunkingEndpointClient_1.EmbeddingsComputeQos.Batch, telemetryInfo.callTracker.add('WorkspaceChunkEmbeddingsIndex::getAllWorkspaceEmbeddings'), token);
                    }
                }
                finally {
                    ++processedFiles;
                }
            }));
            return (0, arrays_1.coalesce)(result).flat();
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkEmbeddingsIndex.perf.getAllWorkspaceEmbeddings" : {
                    "owner": "mjbvz",
                    "comment": "Total time for getAllWorkspaceEmbeddings to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "totalFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files we have in the workspace" },
                    "recomputedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files that were not in the cache" },
                    "recomputedTotalContentLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of text for recomputed files" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.perf.getAllWorkspaceEmbeddings', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                execTime,
                totalFileCount: allWorkspaceFiles.length,
                recomputedFileCount: batchInfo.recomputedFileCount,
                recomputedTotalContentLength: batchInfo.sentContentTextLength,
            });
        });
    }
    async getEmbeddingsForFiles(files, include, qos, telemetry, token) {
        const batchInfo = telemetry.batchInfo ?? new chunkingEndpointClient_1.ComputeBatchInfo();
        return (0, logExecTime_1.logExecTime)(this._logService, 'workspaceChunkEmbeddingsIndex.getEmbeddingsForFiles', async () => {
            this._logService.trace(`workspaceChunkEmbeddingsIndex: Getting auth token `);
            const authToken = await this.tryGetAuthToken();
            if (!authToken) {
                throw new Error('Unable to get auth token');
            }
            const chunksAndEmbeddings = await Promise.all(files.map(async (uri) => {
                if (!(0, glob_1.shouldInclude)(uri, include)) {
                    return;
                }
                const file = await (0, async_1.raceCancellationError)(this._workspaceIndex.tryLoad(uri), token);
                if (!file) {
                    return;
                }
                return (0, async_1.raceCancellationError)(this.getChunksAndEmbeddings(authToken, file, batchInfo, qos, telemetry.info.callTracker.add('WorkspaceChunkEmbeddingsIndex::getEmbeddingsForFiles'), token), token);
            }));
            return (0, arrays_1.coalesce)(chunksAndEmbeddings).flat();
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkEmbeddingsIndex.perf.getEmbeddingsForFiles" : {
                    "owner": "mjbvz",
                    "comment": "Total time for getEmbeddingsForFiles to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "totalFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files we are searching" },
                    "recomputedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files that were not in the cache" },
                    "recomputedTotalContentLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total length of text for recomputed files" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkEmbeddingsIndex.perf.getEmbeddingsForFiles', {
                status,
                workspaceSearchSource: telemetry.info.callTracker,
                workspaceSearchCorrelationId: telemetry.info.correlationId,
            }, {
                execTime,
                totalFileCount: files.length,
                recomputedFileCount: batchInfo.recomputedFileCount,
                recomputedTotalContentLength: batchInfo.sentContentTextLength,
            });
        });
    }
    /**
     * Get the chunks and embeddings for a file.
    */
    async getChunksAndEmbeddings(authToken, file, batchInfo, qos, telemetryInfo, token) {
        const cache = await (0, async_1.raceCancellationError)(this._cache.value, token);
        const existing = await (0, async_1.raceCancellationError)(cache.get(file), token);
        if (existing) {
            return existing;
        }
        const cachedChunks = cache.getCurrentChunksForUri(file.uri);
        const chunksAndEmbeddings = await cache.update(file, async (token) => {
            return this._chunkingEndpointClient.computeChunksAndEmbeddings(authToken, this._embeddingType, file, batchInfo, qos, cachedChunks, telemetryInfo, token);
        });
        this._onDidChangeWorkspaceIndexState.fire();
        return chunksAndEmbeddings;
    }
    /**
     * Get the chunks for a file as well as the embeddings if we have them already
     */
    async getChunksWithOptionalEmbeddings(authToken, file, batchInfo, qos, telemetryInfo, token) {
        const cache = await (0, async_1.raceCancellationError)(this._cache.value, token);
        const existing = await (0, async_1.raceCancellationError)(cache.get(file), token);
        if (existing) {
            return existing;
        }
        const cachedChunks = cache.getCurrentChunksForUri(file.uri);
        return this._chunkingEndpointClient.computeChunks(authToken, this._embeddingType, file, batchInfo, qos, cachedChunks, telemetryInfo, token);
    }
    async tryGetAuthToken(options = { createIfNone: true }) {
        return (await this._authService.getAnyGitHubSession(options))?.accessToken;
    }
};
exports.WorkspaceChunkEmbeddingsIndex = WorkspaceChunkEmbeddingsIndex;
exports.WorkspaceChunkEmbeddingsIndex = WorkspaceChunkEmbeddingsIndex = __decorate([
    __param(1, extensionContext_1.IVSCodeExtensionContext),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, authentication_1.IAuthenticationService),
    __param(4, logService_1.ILogService),
    __param(5, simulationTestContext_1.ISimulationTestContext),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, workspaceFileIndex_1.IWorkspaceFileIndex),
    __param(8, chunkingEndpointClient_1.IChunkingEndpointClient)
], WorkspaceChunkEmbeddingsIndex);
//# sourceMappingURL=workspaceChunkEmbeddingsIndex.js.map