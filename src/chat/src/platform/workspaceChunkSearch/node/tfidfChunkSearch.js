"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TfidfChunkSearch = void 0;
const worker_1 = require("../../../util/node/worker");
const async_1 = require("../../../util/vs/base/common/async");
const event_1 = require("../../../util/vs/base/common/event");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const network_1 = require("../../../util/vs/base/common/network");
const path = __importStar(require("../../../util/vs/base/common/path"));
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const fileTypes_1 = require("../../filesystem/common/fileTypes");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const tfidfMessaging_1 = require("../../tfidf/node/tfidfMessaging");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
const workerPath = path.join(__dirname, 'tfidfWorker.js');
let TfidfChunkSearch = class TfidfChunkSearch extends lifecycle_1.Disposable {
    constructor(endpoint, _logService, _telemetryService, _workspaceIndex, vsExtensionContext) {
        super();
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._workspaceIndex = _workspaceIndex;
        this._maxInitialFileCount = 25_000;
        this.id = workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.Tfidf;
        this._isDisposed = false;
        this._tfIdfWorker = new lazy_1.Lazy(() => {
            const dbPath = vsExtensionContext.storageUri && vsExtensionContext.storageUri.scheme === network_1.Schemas.file
                ? uri_1.URI.joinPath(vsExtensionContext.storageUri, 'local-index.1.db')
                : ':memory:';
            return new worker_1.WorkerWithRpcProxy(workerPath, {
                name: 'TfIdf Worker',
                workerData: {
                    endpoint,
                    dbPath,
                }
            }, {
                readFile: async (uri) => {
                    const entry = this._workspaceIndex.get(revive(uri));
                    if (!entry) {
                        throw new Error('Could not find file in index');
                    }
                    return entry.getText();
                },
                getContentVersionId: async (uri) => {
                    const entry = this._workspaceIndex.get(revive(uri));
                    if (!entry) {
                        throw new Error('Could not find file in index');
                    }
                    return entry.getFastContentVersionId();
                },
            });
        });
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
        this._tfIdfWorker.rawValue?.terminate();
    }
    async searchWorkspace(sizing, query, options, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'tfIdfChunkSearch.searchWorkspace', async () => {
            const [_, resolved] = await (0, async_1.raceCancellationError)(Promise.all([
                this.initializeWholeWorkspace(),
                query.resolveQueryAndKeywords(token),
            ]), token);
            if (this._isDisposed) {
                throw new Error('TfidfChunkSearch is disposed');
            }
            const resolvedQuery = this.toQuery(resolved);
            this._logService.trace(`TfidfChunkSearch.searchWorkspace: Starting tfidf search for: ${resolvedQuery}`);
            const result = await (0, async_1.raceCancellationError)(this.doTfidfSearch(resolvedQuery, sizing.maxResultCountHint, options, telemetryInfo.addCaller('TfidfChunkSearch::searchWorkspace'), token), token);
            this._logService.trace(`TfidfChunkSearch.searchWorkspace: Found ${result.length} results`);
            return { chunks: result.map((chunk) => ({ chunk, distance: undefined })) };
        }, (execTime, status) => {
            /* __GDPR__
                "tfIdfChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfIdfChunkSearch.perf.searchFileChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    async searchSubsetOfFiles(sizing, query, files, options, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'tfIdfChunkSearch.searchSubsetOfFiles', async () => {
            if (!files.length) {
                return { chunks: [] };
            }
            const [_, resolved] = await (0, async_1.raceCancellationError)(Promise.all([
                this.initializeForSubsetFiles(files),
                query.resolveQueryAndKeywords(token),
            ]), token);
            if (this._isDisposed) {
                throw new Error('TfidfChunkSearch is disposed');
            }
            const maxResults = sizing.maxResultCountHint;
            const result = await (0, async_1.raceCancellationError)(this.doTfidfSearch(this.toQuery(resolved), maxResults, {
                ...options,
                globPatterns: {
                    include: files.map(uri => new fileTypes_1.RelativePattern(uri, '*')),
                    exclude: options.globPatterns?.exclude,
                }
            }, telemetryInfo.addCaller('TfidfChunkSearch::searchSubsetOfFiles'), token), token);
            return { chunks: result.map((chunk) => ({ chunk, distance: undefined })) };
        }, (execTime, status) => {
            /* __GDPR__
                "tfIdfChunkSearch.perf.searchSubsetOfFiles" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchSubsetOfFiles to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "files": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files being searched" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfIdfChunkSearch.perf.searchSubsetOfFiles', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                execTime,
                fileCount: files.length
            });
        });
    }
    doTfidfSearch(query, maxResults, options, telemetryInfo, token) {
        let results;
        return (0, logExecTime_1.logExecTime)(this._logService, 'tfIdfChunkSearch.doTfidfSearch', async () => {
            results = await (0, async_1.raceCancellationError)(this._tfIdfWorker.value.proxy.search(query, { maxResults, globPatterns: serialize(options.globPatterns), maxSpread: 0.75 }), token);
            return revive(results.results);
        }, (execTime, status) => {
            /* __GDPR__
                "tfIdfChunkSearch.perf.tfidfSearch" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "fileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files in the index" },
                    "updatedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files updated for this search" },
                    "updateTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that updating of the index took" },
                    "searchTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that searching the index took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfIdfChunkSearch.perf.tfidfSearch', {
                status: token.isCancellationRequested ? 'cancelled' : status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                execTime,
                fileCount: results?.telemetry.fileCount,
                updatedFileCount: results?.telemetry.updatedFileCount,
                updateTime: results?.telemetry.updateTime,
                searchTime: results?.telemetry.searchTime,
            });
        });
    }
    initializeWholeWorkspace() {
        this._initializePromise ??= this.initializeWorkspaceFiles();
        return this._initializePromise;
    }
    async initializeWorkspaceFiles() {
        const sw = new stopwatch_1.StopWatch();
        await (0, logExecTime_1.logExecTime)(this._logService, 'initialize workspaceIndex', () => this._workspaceIndex.initialize());
        const initWorkspaceIndexTime = sw.elapsed();
        if (this._isDisposed) {
            return;
        }
        let filesToIndex = [];
        let telemetryData;
        let readInitDocsTime = undefined;
        await (0, logExecTime_1.logExecTime)(this._logService, 'initialize tfidf', async () => {
            sw.reset();
            filesToIndex = Array.from(this._workspaceIndex.values()).slice(0, this._maxInitialFileCount);
            const initDocs = await Promise.all(filesToIndex.map(async (entry) => ({ uri: entry.uri, contentId: await entry.getFastContentVersionId() })));
            readInitDocsTime = sw.elapsed();
            if (this._isDisposed) {
                return;
            }
            telemetryData = await this._tfIdfWorker.value.proxy.initialize(initDocs);
        }, (execTime, status) => {
            /* __GDPR__
                "tfidfChunkSearch.perf.initializeTfidf" : {
                    "owner": "mjbvz",
                    "comment": "Understanding how long it took to initialize the tfidf index",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "initWorkspaceIndexTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that initializing the workspace index took" },
                    "readInitDocsTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that reading the initial documents took" },
                    "fileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files that we can index" },
                    "newFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of new files" },
                    "outOfSyncFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files that are out of sync" },
                    "deletedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files that have been deleted" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('tfidfChunkSearch.perf.initializeTfidf', { status }, {
                execTime,
                initWorkspaceIndexTime,
                readInitDocsTime: readInitDocsTime,
                fileCount: filesToIndex.length,
                newFileCount: telemetryData?.newFileCount,
                outOfSyncFileCount: telemetryData?.outOfSyncFileCount,
                deletedFileCount: telemetryData?.deletedFileCount
            });
        });
        if (this._isDisposed) {
            return;
        }
        this._register(event_1.Event.any(this._workspaceIndex.onDidCreateFiles, this._workspaceIndex.onDidChangeFiles)((uris) => {
            if (!this._isDisposed) {
                this.addOrUpdateTfidfEntries(uris);
            }
        }));
        this._register(this._workspaceIndex.onDidDeleteFiles(resources => {
            if (!this._isDisposed) {
                this._tfIdfWorker.value.proxy.delete(resources);
            }
        }));
    }
    /**
     * Initialize the index for a subset of files in the workspace.
     */
    async initializeForSubsetFiles(files) {
        await (0, logExecTime_1.logExecTime)(this._logService, 'initialize workspaceIndex', () => this._workspaceIndex.initialize());
        if (this._isDisposed) {
            return;
        }
        return this.addOrUpdateTfidfEntries(Array.from(this._workspaceIndex.values(), x => x.uri).filter(uri => files.includes(uri)));
    }
    async addOrUpdateTfidfEntries(files) {
        if (!files.length) {
            return;
        }
        this._tfIdfWorker.value.proxy.addOrUpdate(files);
    }
    toQuery(resolved) {
        const flattenedKeywords = resolved.keywords.flatMap(entry => [entry.keyword, ...entry.variations]);
        return flattenedKeywords.length ? flattenedKeywords.join(', ') : resolved.rephrasedQuery;
    }
};
exports.TfidfChunkSearch = TfidfChunkSearch;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'TfIdfChunkSearch::initializeWholeWorkspace')
], TfidfChunkSearch.prototype, "initializeWholeWorkspace", null);
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'TfIdfChunkSearch::initializeForSubsetFiles')
], TfidfChunkSearch.prototype, "initializeForSubsetFiles", null);
exports.TfidfChunkSearch = TfidfChunkSearch = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, workspaceFileIndex_1.IWorkspaceFileIndex),
    __param(4, extensionContext_1.IVSCodeExtensionContext)
], TfidfChunkSearch);
function serialize(value) {
    return (0, tfidfMessaging_1.rewriteObject)(value, obj => {
        if (uri_1.URI.isUri(obj)) {
            return {
                '$mid': 'uri',
                ...obj
            };
        }
        if (obj instanceof range_1.Range) {
            return {
                startLineNumber: obj.startLineNumber,
                startColumn: obj.startColumn,
                endLineNumber: obj.endLineNumber,
                endColumn: obj.endColumn,
            };
        }
    });
}
function revive(value) {
    return (0, tfidfMessaging_1.rewriteObject)(value, (obj) => {
        if (obj['$mid'] === 'range') {
            return new range_1.Range(obj.startLineNumber, obj.startColumn, obj.endLineNumber, obj.endColumn);
        }
        if (obj['$mid'] === 'uri') {
            return uri_1.URI.revive(obj);
        }
    });
}
//# sourceMappingURL=tfidfChunkSearch.js.map