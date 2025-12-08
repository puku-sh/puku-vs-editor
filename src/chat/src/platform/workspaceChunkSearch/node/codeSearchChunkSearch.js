"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.CodeSearchChunkSearch = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const glob_1 = require("../../../util/common/glob");
const result_1 = require("../../../util/common/result");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const lazy_1 = require("../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../util/vs/base/common/resources");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chunkingEndpointClient_1 = require("../../chunking/common/chunkingEndpointClient");
const configurationService_1 = require("../../configuration/common/configurationService");
const fileTypes_1 = require("../../filesystem/common/fileTypes");
const gitService_1 = require("../../git/common/gitService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const adoCodeSearchService_1 = require("../../remoteCodeSearch/common/adoCodeSearchService");
const githubCodeSearchService_1 = require("../../remoteCodeSearch/common/githubCodeSearchService");
const codeSearchRepoTracker_1 = require("../../remoteCodeSearch/node/codeSearchRepoTracker");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
const codeSearchWorkspaceDiff_1 = require("./codeSearchWorkspaceDiff");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
/**
 * ChunkSearch strategy that first calls the Github code search API to get a context window of files that are similar to the query.
 * Then it uses the embeddings index to find the most similar chunks in the context window.
 */
let CodeSearchChunkSearch = class CodeSearchChunkSearch extends lifecycle_1.Disposable {
    constructor(_embeddingType, embeddingsChunkSearch, tfIdfChunkSearch, instantiationService, _authUpgradeService, _configService, _experimentationService, _logService, _telemetryService, _workspaceChunkIndex, _githubCodeSearchService, _adoCodeSearchService, _workspaceService) {
        super();
        this._embeddingType = _embeddingType;
        this._authUpgradeService = _authUpgradeService;
        this._configService = _configService;
        this._experimentationService = _experimentationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._workspaceChunkIndex = _workspaceChunkIndex;
        this._githubCodeSearchService = _githubCodeSearchService;
        this._adoCodeSearchService = _adoCodeSearchService;
        this._workspaceService = _workspaceService;
        this.id = workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.CodeSearch;
        /**
         * Maximum number of locally changed, un-updated files that we should still use embeddings search for
         */
        this.maxEmbeddingsDiffSize = 300;
        /**
         * Maximum number of files that have changed from what code search has indexed
         *
         * This is used to avoid doing code search when the diff is too large.
         */
        this.maxDiffSize = 2000;
        /**
         * Maximum percent of files that have changed from what code search has indexed.
         *
         * If a majority of files have been changed there's no point to doing a code search
         */
        this.maxDiffPercentage = 0.70;
        /**
         * How long we should wait on the local diff before giving up.
         */
        this.localDiffSearchTimeout = 15_000;
        /**
         * How long we should wait for the embeddings search before falling back to tfidf.
         */
        this.embeddingsSearchFallbackTimeout = 8_000;
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
        this._isDisposed = false;
        this.didRunPrepare = false;
        this._embeddingsChunkSearch = embeddingsChunkSearch;
        this._tfIdfChunkSearch = tfIdfChunkSearch;
        this._repoTracker = new lazy_1.Lazy(() => {
            if (this._isDisposed) {
                throw new Error('Disposed');
            }
            const tracker = this._register(instantiationService.createInstance(codeSearchRepoTracker_1.CodeSearchRepoTracker));
            this._register(event_1.Event.any(tracker.onDidFinishInitialization, tracker.onDidRemoveRepo, tracker.onDidAddOrUpdateRepo)(() => this._onDidChangeIndexState.fire()));
            return tracker;
        });
        this._workspaceDiffTracker = new lazy_1.Lazy(() => {
            return this._register(instantiationService.createInstance(codeSearchWorkspaceDiff_1.CodeSearchWorkspaceDiffTracker, this._repoTracker.value));
        });
        if (this.isCodeSearchEnabled()) {
            this._repoTracker.value.initialize();
        }
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
    }
    async isAvailable(searchTelemetryInfo, canPrompt = false, token = cancellation_1.CancellationToken.None) {
        const sw = new stopwatch_1.StopWatch();
        const checkResult = await this.doIsAvailableCheck(canPrompt, token);
        // Track where indexed repos are located related to the workspace
        const indexedRepoLocation = {
            workspaceFolder: 0,
            parentFolder: 0,
            subFolder: 0,
            unknownFolder: 0,
        };
        if (checkResult.isOk()) {
            const workspaceFolder = this._workspaceService.getWorkspaceFolders();
            for (const repo of checkResult.val.indexedRepos) {
                if (workspaceFolder.some(folder => (0, resources_1.isEqual)(repo.repo.rootUri, folder))) {
                    indexedRepoLocation.workspaceFolder++;
                }
                else if (workspaceFolder.some(folder => (0, resources_1.isEqualOrParent)(folder, repo.repo.rootUri))) {
                    indexedRepoLocation.parentFolder++;
                }
                else if (workspaceFolder.some(folder => (0, resources_1.isEqualOrParent)(repo.repo.rootUri, folder))) {
                    indexedRepoLocation.subFolder++;
                }
                else {
                    indexedRepoLocation.unknownFolder++;
                }
            }
        }
        /* __GDPR__
            "codeSearchChunkSearch.isAvailable" : {
                "owner": "mjbvz",
                "comment": "Metadata about the code search availability check",
                "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                "unavailableReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                "repoStatues": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Detailed info about the statues of the repos in the workspace" },
                "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How long the check too to complete" },
                "indexedRepoCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of indexed repositories" },
                "notYetIndexedRepoCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of repositories that have not yet been indexed" },

                "indexedRepoLocation.workspace": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of repositories that map exactly to a workspace folder" },
                "indexedRepoLocation.parent": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of repositories that map to a parent folder" },
                "indexedRepoLocation.sub": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of repositories that map to a sub-folder" },
                "indexedRepoLocation.unknown": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of repositories that map to an unknown folder" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.isAvailable', {
            workspaceSearchSource: searchTelemetryInfo?.callTracker,
            workspaceSearchCorrelationId: searchTelemetryInfo?.correlationId,
            unavailableReason: checkResult.isError() ? checkResult.err.unavailableReason : undefined,
            repoStatues: JSON.stringify(checkResult.isOk() ? checkResult.val.repoStatuses : checkResult.err.repoStatuses),
        }, {
            execTime: sw.elapsed(),
            indexedRepoCount: checkResult.isOk() ? checkResult.val.indexedRepos.length : 0,
            notYetIndexedRepoCount: checkResult.isOk() ? checkResult.val.notYetIndexedRepos.length : 0,
            'indexedRepoLocation.workspace': indexedRepoLocation.workspaceFolder,
            'indexedRepoLocation.parent': indexedRepoLocation.parentFolder,
            'indexedRepoLocation.sub': indexedRepoLocation.subFolder,
            'indexedRepoLocation.unknown': indexedRepoLocation.unknownFolder,
        });
        if (checkResult.isError()) {
            this._logService.debug(`CodeSearchChunkSearch.isAvailable: false. ${checkResult.err.unavailableReason}`);
        }
        else {
            this._logService.debug(`CodeSearchChunkSearch.isAvailable: true`);
        }
        return checkResult.isOk();
    }
    async doIsAvailableCheck(canPrompt = false, token) {
        if (!this.isCodeSearchEnabled()) {
            return result_1.Result.error({ unavailableReason: 'Disabled by experiment', repoStatuses: {} });
        }
        await this._repoTracker.value.initialize();
        if (this._isDisposed) {
            return result_1.Result.error({ unavailableReason: 'Disposed', repoStatuses: {} });
        }
        let allRepos = Array.from(this._repoTracker.value.getAllRepos());
        if (canPrompt) {
            if (allRepos.some(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.CouldNotCheckIndexStatus || repo.status === codeSearchRepoTracker_1.RepoStatus.NotAuthorized)) {
                if (await (0, async_1.raceCancellationError)(this._authUpgradeService.shouldRequestPermissiveSessionUpgrade(), token)) { // Needs more thought
                    if (await (0, async_1.raceCancellationError)(this._authUpgradeService.shouldRequestPermissiveSessionUpgrade(), token)) {
                        await (0, async_1.raceCancellationError)(this._repoTracker.value.updateRepoStatuses(), token);
                        allRepos = Array.from(this._repoTracker.value.getAllRepos());
                    }
                }
            }
        }
        const repoStatuses = allRepos.reduce((sum, repo) => { sum[repo.status] = (sum[repo.status] ?? 0) + 1; return sum; }, {});
        const indexedRepos = allRepos.filter(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.Ready);
        const notYetIndexedRepos = allRepos.filter(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed);
        if (!indexedRepos.length && !notYetIndexedRepos.length) {
            // Get detailed info about why we failed
            if (!allRepos.length) {
                return result_1.Result.error({ unavailableReason: 'No repos', repoStatuses });
            }
            if (allRepos.some(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.CheckingStatus || repo.status === codeSearchRepoTracker_1.RepoStatus.Initializing)) {
                return result_1.Result.error({ unavailableReason: 'Checking status', repoStatuses });
            }
            if (allRepos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotResolvable)) {
                return result_1.Result.error({ unavailableReason: 'Repos not resolvable', repoStatuses });
            }
            if (allRepos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotIndexable)) {
                return result_1.Result.error({ unavailableReason: 'Repos not indexable', repoStatuses });
            }
            if (allRepos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed)) {
                return result_1.Result.error({ unavailableReason: 'Not yet indexed', repoStatuses });
            }
            if (allRepos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.CouldNotCheckIndexStatus || repo.status === codeSearchRepoTracker_1.RepoStatus.NotAuthorized)) {
                return result_1.Result.error({ unavailableReason: 'Could not check index status', repoStatuses });
            }
            // Generic error
            return result_1.Result.error({ unavailableReason: `No indexed repos`, repoStatuses });
        }
        const diffArray = await this.getLocalDiff();
        if (!Array.isArray(diffArray)) {
            switch (diffArray) {
                case 'unknown': {
                    return result_1.Result.error({ unavailableReason: 'Diff not available', repoStatuses });
                }
                case 'tooLarge': {
                    return result_1.Result.error({ unavailableReason: 'Diff too large', repoStatuses });
                }
            }
            return result_1.Result.error({ unavailableReason: 'Unknown diff error', repoStatuses });
        }
        return result_1.Result.ok({ indexedRepos, notYetIndexedRepos, repoStatuses });
    }
    isCodeSearchEnabled() {
        return this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableCodeSearch, this._experimentationService);
    }
    getRemoteIndexState() {
        if (!this.isCodeSearchEnabled()) {
            return {
                status: 'disabled',
                repos: [],
            };
        }
        // Kick of request but do not wait for it to finish
        this._repoTracker.value.initialize();
        if (this._repoTracker.value.isInitializing()) {
            return {
                status: 'initializing',
                repos: [],
            };
        }
        const allResolvedRepos = Array.from(this._repoTracker.value.getAllRepos())
            .filter(repo => repo.status !== codeSearchRepoTracker_1.RepoStatus.NotResolvable);
        return {
            status: 'loaded',
            repos: allResolvedRepos,
        };
    }
    async prepareSearchWorkspace(telemetryInfo, token) {
        if (this.didRunPrepare) {
            return;
        }
        this.didRunPrepare = true;
        return this._repoTracker.value.tryAuthIfNeeded(telemetryInfo, token);
    }
    async searchWorkspace(sizing, query, options, telemetryInfo, token) {
        if (!(await (0, async_1.raceCancellationError)(this.isAvailable(telemetryInfo, true, token), token))) {
            return;
        }
        const allRepos = Array.from(this._repoTracker.value.getAllRepos());
        const indexedRepos = allRepos.filter(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.Ready);
        const notYetIndexedRepos = allRepos.filter((repo) => repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed);
        if (!indexedRepos.length && !notYetIndexedRepos.length) {
            return;
        }
        return (0, logExecTime_1.logExecTime)(this._logService, 'CodeSearchChunkSearch.searchWorkspace', async () => {
            const diffArray = await (0, async_1.raceCancellationError)(this.getLocalDiff(), token);
            if (!Array.isArray(diffArray)) {
                return;
            }
            if (notYetIndexedRepos.length) {
                const instantIndexResults = await Promise.all(notYetIndexedRepos.map(repo => this.tryToInstantIndexRepo(repo, telemetryInfo, token)));
                if (!instantIndexResults.every(x => x)) {
                    this._logService.error(`Instant indexing failed for some repos. Will not try code search.`);
                    return;
                }
            }
            const diffFilePatten = diffArray.map(uri => new fileTypes_1.RelativePattern(uri, '*'));
            const localSearchCts = new cancellation_1.CancellationTokenSource(token);
            // Kick off remote and local searches in parallel
            const innerTelemetryInfo = telemetryInfo.addCaller('CodeSearchChunkSearch::searchWorkspace');
            // Trigger code search for all files without any excludes for diffed files.
            // This is needed incase local diff times out
            const codeSearchOperation = this.doCodeSearch(query, [...indexedRepos, ...notYetIndexedRepos], sizing, options, innerTelemetryInfo, token).catch(e => {
                if (!(0, errors_1.isCancellationError)(e)) {
                    this._logService.error(`Code search failed`, e);
                }
                // If code search fails, cancel local search too because we won't be able to merge
                localSearchCts.cancel();
                throw e;
            });
            const localSearchOperation = (0, async_1.raceTimeout)(this.searchLocalDiff(diffArray, sizing, query, options, innerTelemetryInfo, localSearchCts.token), this.localDiffSearchTimeout, () => {
                localSearchCts.cancel();
            });
            let codeSearchResults;
            let localResults;
            try {
                // However await them in sequence since if code search fails we don't care about local result
                codeSearchResults = await (0, async_1.raceCancellationError)(codeSearchOperation, token);
                if (codeSearchResults) {
                    localResults = await (0, async_1.raceCancellationError)(localSearchOperation, token);
                }
                else {
                    // No need to do local search if code search failed
                    localSearchCts.cancel();
                }
            }
            finally {
                localSearchCts.dispose(true);
            }
            /* __GDPR__
                "codeSearchChunkSearch.search.success" : {
                    "owner": "mjbvz",
                    "comment": "Information about successful code searches",
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "diffSearchStrategy": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Search strategy for the diff" },
                    "chunkCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of returned chunks just from code search" },
                    "locallyChangedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files that are different than the code search index" },
                    "codeSearchOutOfSync": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Tracks if the local commit we think code search has indexed matches what code search actually has indexed" },
                    "embeddingsRecomputedFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of files that needed to have their embeddings recomputed. Only logged when embeddings search is used" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.search.success', {
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
                diffSearchStrategy: localResults?.strategyId ?? 'none',
            }, {
                chunkCount: codeSearchResults?.chunks.length ?? 0,
                locallyChangedFileCount: diffArray.length,
                codeSearchOutOfSync: codeSearchResults?.outOfSync ? 1 : 0,
                embeddingsRecomputedFileCount: localResults?.embeddingsComputeInfo?.recomputedFileCount ?? 0,
            });
            this._logService.trace(`CodeSearchChunkSearch.searchWorkspace: codeSearchResults: ${codeSearchResults?.chunks.length}, localResults: ${localResults?.chunks.length}`);
            if (!codeSearchResults) {
                return;
            }
            const mergedChunks = localResults ?
                [
                    ...codeSearchResults.chunks
                        .filter(x => (0, glob_1.shouldInclude)(x.chunk.file, { exclude: diffFilePatten })),
                    ...(localResults?.chunks ?? [])
                        .filter(x => (0, glob_1.shouldInclude)(x.chunk.file, { include: diffFilePatten })),
                ]
                // If there are no local results, use the full code search results without filtering
                : codeSearchResults.chunks;
            const outChunks = mergedChunks
                .filter(x => (0, glob_1.shouldInclude)(x.chunk.file, options.globPatterns));
            return {
                chunks: outChunks,
                alerts: !localResults
                    ? [new vscodeTypes_1.ChatResponseWarningPart(l10n.t('Still updating workspace index. Falling back to using the latest remote code index only. Response may be less accurate.'))]
                    : undefined
            };
        }, (execTime, status) => {
            /* __GDPR__
                "codeSearchChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.perf.searchFileChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    async getLocalDiff() {
        await this._workspaceDiffTracker.value.initialized;
        const diff = this._workspaceDiffTracker.value.getDiffFiles();
        if (!diff) { // undefined means we don't know the state of the workspace
            return 'unknown';
        }
        const diffArray = Array.from(diff);
        if (diffArray.length > this.maxDiffSize
            || (diffArray.length / iterator_1.Iterable.reduce(this._workspaceChunkIndex.values(), sum => sum + 1, 0)) > this.maxDiffPercentage) {
            return 'tooLarge';
        }
        return diffArray;
    }
    async searchLocalDiff(diffArray, sizing, query, options, telemetryInfo, token) {
        if (!diffArray.length) {
            return { chunks: [], strategyId: 'skipped' };
        }
        const subSearchOptions = {
            ...options,
            globPatterns: {
                exclude: options.globPatterns?.exclude,
                include: diffArray.map(uri => new fileTypes_1.RelativePattern(uri, '*')),
            }
        };
        const innerTelemetryInfo = telemetryInfo.addCaller('CodeSearchChunkSearch::searchLocalDiff');
        const outdatedFiles = await (0, async_1.raceCancellationError)(this.getLocalDiff(), token);
        if (outdatedFiles.length > this.maxEmbeddingsDiffSize) {
            // Too many files, only do tfidf search
            const result = await this._tfIdfChunkSearch.searchSubsetOfFiles(sizing, query, diffArray, subSearchOptions, innerTelemetryInfo, token);
            return { ...result, strategyId: this._tfIdfChunkSearch.id };
        }
        // Kick off embeddings search of diff
        const batchInfo = new chunkingEndpointClient_1.ComputeBatchInfo();
        const embeddingsSearch = this._embeddingsChunkSearch.searchSubsetOfFiles(sizing, query, diffArray, subSearchOptions, { info: innerTelemetryInfo, batchInfo }, token)
            .then((result) => ({ ...result, strategyId: this._embeddingsChunkSearch.id, embeddingsComputeInfo: batchInfo }));
        const embeddingsSearchResult = await (0, async_1.raceCancellationError)((0, async_1.raceTimeout)(embeddingsSearch, this.embeddingsSearchFallbackTimeout), token);
        if (embeddingsSearchResult) {
            return embeddingsSearchResult;
        }
        // Start tfidf too but keep embeddings search running in parallel
        const tfIdfSearch = this._tfIdfChunkSearch.searchSubsetOfFiles(sizing, query, diffArray, subSearchOptions, innerTelemetryInfo, token)
            .then((result) => ({ ...result, strategyId: this._tfIdfChunkSearch.id }));
        return Promise.race([embeddingsSearch, tfIdfSearch]);
    }
    async doCodeSearch(query, repos, sizing, options, telemetryInfo, token) {
        const resolvedQuery = await (0, async_1.raceCancellationError)(query.resolveQuery(token), token);
        const results = await Promise.all(repos.map(async (repo) => {
            if (repo.remoteInfo.repoId instanceof gitService_1.GithubRepoId) {
                return this._githubCodeSearchService.searchRepo({ silent: true }, this._embeddingType, {
                    githubRepoId: repo.remoteInfo.repoId,
                    localRepoRoot: repo.repo.rootUri,
                    indexedCommit: repo.status === codeSearchRepoTracker_1.RepoStatus.Ready ? repo.indexedCommit : undefined,
                }, resolvedQuery, sizing.maxResultCountHint, options, telemetryInfo, token);
            }
            else {
                return this._adoCodeSearchService.searchRepo({ silent: true }, {
                    adoRepoId: repo.remoteInfo.repoId,
                    localRepoRoot: repo.repo.rootUri,
                    indexedCommit: repo.status === codeSearchRepoTracker_1.RepoStatus.Ready ? repo.indexedCommit : undefined,
                }, resolvedQuery, sizing.maxResultCountHint, options, telemetryInfo, token);
            }
        }));
        return {
            chunks: (0, arrays_1.coalesce)(results).flatMap(x => x.chunks),
            outOfSync: (0, arrays_1.coalesce)(results).some(x => x.outOfSync),
        };
    }
    async tryToInstantIndexRepo(repo, telemetryInfo, token) {
        // Amount of time we'll wait for instant indexing to finish before giving up
        const unindexRepoInitTimeout = 8_000;
        const startRepoStatus = this._repoTracker.value.getRepoStatus(repo);
        await (0, logExecTime_1.measureExecTime)(() => (0, async_1.raceTimeout)((async () => {
            // Trigger indexing if we have not already
            if (startRepoStatus === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed) {
                const triggerResult = await (0, async_1.raceCancellationError)(this._repoTracker.value.triggerRemoteIndexingOfRepo(repo, 'auto', telemetryInfo), token);
                if (triggerResult.isError()) {
                    throw new Error(`CodeSearchChunkSearch: Triggering indexing of '${repo.remoteInfo.repoId}' failed: ${triggerResult.err.id}`);
                }
            }
            if (this._repoTracker.value.getRepoStatus(repo) === codeSearchRepoTracker_1.RepoStatus.BuildingIndex) {
                // Poll rapidly using endpoint to check if instant indexing has completed
                let attemptsRemaining = 5;
                const delayBetweenAttempts = 1000;
                while (attemptsRemaining-- > 0) {
                    const currentStatus = (await (0, async_1.raceCancellationError)(this._repoTracker.value.updateRepoStateFromEndpoint(repo.repo, repo.remoteInfo, false, token), token)).status;
                    if (currentStatus === codeSearchRepoTracker_1.RepoStatus.Ready) {
                        // We're good to start searching
                        break;
                    }
                    else if (currentStatus !== codeSearchRepoTracker_1.RepoStatus.BuildingIndex) {
                        throw new Error(`CodeSearchChunkSearch: Checking instant indexing status of '${repo.remoteInfo.repoId}' failed. Found unexpected status: '${currentStatus}'`);
                    }
                    await (0, async_1.raceCancellationError)((0, async_1.timeout)(delayBetweenAttempts), token);
                }
            }
        })(), unindexRepoInitTimeout), (execTime, status) => {
            const endRepoStatus = this._repoTracker.value.getRepoStatus(repo);
            /* __GDPR__
                "codeSearchChunkSearch.perf.tryToInstantIndexRepo" : {
                    "owner": "mjbvz",
                    "comment": "Total time for instant indexing to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "startRepoStatus": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Initial status of the repo" },
                    "endRepoStatus": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Final status of the repo" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.perf.tryToInstantIndexRepo', {
                status,
                startRepoStatus,
                endRepoStatus,
            }, { execTime });
        });
        const currentStatus = this._repoTracker.value.getRepoStatus(repo);
        return currentStatus === codeSearchRepoTracker_1.RepoStatus.Ready || currentStatus === codeSearchRepoTracker_1.RepoStatus.BuildingIndex;
    }
    async triggerRemoteIndexing(triggerReason, telemetryInfo) {
        const triggerResult = await this._repoTracker.value.triggerRemoteIndexing(triggerReason, telemetryInfo);
        if (triggerResult.isOk()) {
            this._logService.trace(`CodeSearch.triggerRemoteIndexing(${triggerReason}) succeeded`);
        }
        else {
            this._logService.trace(`CodeSearch.triggerRemoteIndexing(${triggerReason}) failed. ${triggerResult.err.id}`);
        }
        /* __GDPR__
            "codeSearchChunkSearch.triggerRemoteIndexing" : {
                "owner": "mjbvz",
                "comment": "Triggers of remote indexing",
                "triggerReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How the call was triggered" },
                "error": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How the trigger call failed" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.triggerRemoteIndexing', {
            triggerReason: triggerReason,
            error: triggerResult.isError() ? triggerResult.err.id : undefined,
        });
        return triggerResult;
    }
    async triggerDiffIndexing() {
        const diffArray = await this.getLocalDiff();
        if (Array.isArray(diffArray)) {
            this._embeddingsChunkSearch.tryTriggerReindexing(diffArray, new telemetryCorrelationId_1.TelemetryCorrelationId('CodeSearchChunkSearch::triggerDiffIndexing'));
        }
    }
};
exports.CodeSearchChunkSearch = CodeSearchChunkSearch;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchChunkSearch::isAvailable')
], CodeSearchChunkSearch.prototype, "isAvailable", null);
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchChunkSearch::getLocalDiff')
], CodeSearchChunkSearch.prototype, "getLocalDiff", null);
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchChunkSearch::doCodeSearch', function (execTime, status) {
        // Old name used for backwards compatibility with old telemetry
        /* __GDPR__
            "codeSearchChunkSearch.perf.doCodeSearchWithRetry" : {
                "owner": "mjbvz",
                "comment": "Total time for doCodeSearch to complete",
                "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('codeSearchChunkSearch.perf.doCodeSearchWithRetry', { status }, { execTime });
    })
], CodeSearchChunkSearch.prototype, "doCodeSearch", null);
exports.CodeSearchChunkSearch = CodeSearchChunkSearch = __decorate([
    __param(3, instantiation_1.IInstantiationService),
    __param(4, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(5, configurationService_1.IConfigurationService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, logService_1.ILogService),
    __param(8, telemetry_1.ITelemetryService),
    __param(9, workspaceFileIndex_1.IWorkspaceFileIndex),
    __param(10, githubCodeSearchService_1.IGithubCodeSearchService),
    __param(11, adoCodeSearchService_1.IAdoCodeSearchService),
    __param(12, workspaceService_1.IWorkspaceService)
], CodeSearchChunkSearch);
//# sourceMappingURL=codeSearchChunkSearch.js.map