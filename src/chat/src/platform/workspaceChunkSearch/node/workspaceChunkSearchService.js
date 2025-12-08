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
exports.NullWorkspaceChunkSearchService = exports.WorkspaceChunkSearchService = exports.IWorkspaceChunkSearchService = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const markdown_1 = require("../../../util/common/markdown");
const result_1 = require("../../../util/common/result");
const services_1 = require("../../../util/common/services");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const tokenizer_1 = require("../../../util/common/tokenizer");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const authentication_1 = require("../../authentication/common/authentication");
const naiveChunker_1 = require("../../chunking/node/naiveChunker");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const ignoreService_js_1 = require("../../ignore/common/ignoreService.js");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const codeSearchRepoTracker_1 = require("../../remoteCodeSearch/node/codeSearchRepoTracker");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const githubAvailableEmbeddingTypes_1 = require("../common/githubAvailableEmbeddingTypes");
const rerankerService_1 = require("../common/rerankerService");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
const codeSearchChunkSearch_1 = require("./codeSearchChunkSearch");
const embeddingsChunkSearch_1 = require("./embeddingsChunkSearch");
const fullWorkspaceChunkSearch_1 = require("./fullWorkspaceChunkSearch");
const tfidfChunkSearch_1 = require("./tfidfChunkSearch");
const tfidfWithSemanticChunkSearch_1 = require("./tfidfWithSemanticChunkSearch");
const workspaceChunkEmbeddingsIndex_1 = require("./workspaceChunkEmbeddingsIndex");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
const maxEmbeddingSpread = 0.65;
exports.IWorkspaceChunkSearchService = (0, services_1.createServiceIdentifier)('IWorkspaceChunkSearchService');
let WorkspaceChunkSearchService = class WorkspaceChunkSearchService extends lifecycle_1.Disposable {
    constructor(_instantiationService, _authenticationService, _availableEmbeddingTypes, _logService) {
        super();
        this._instantiationService = _instantiationService;
        this._authenticationService = _authenticationService;
        this._availableEmbeddingTypes = _availableEmbeddingTypes;
        this._logService = _logService;
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
        this.tryInit(true);
        this._register(this._authenticationService.onDidAuthenticationChange(() => {
            this.tryInit(true);
        }));
    }
    async tryInit(silent) {
        if (!this._authenticationService.copilotToken || this._authenticationService.copilotToken.isNoAuthUser) {
            return undefined;
        }
        if (this._impl) {
            return this._impl;
        }
        try {
            const best = await this._availableEmbeddingTypes.getPreferredType(silent);
            // Double check that we haven't initialized in the meantime
            if (this._impl) {
                return this._impl;
            }
            if (best) {
                this._logService.info(`WorkspaceChunkSearchService: using embedding type ${best}`);
                this._impl = this._register(this._instantiationService.createInstance(WorkspaceChunkSearchServiceImpl, best));
                this._register(this._impl.onDidChangeIndexState(() => this._onDidChangeIndexState.fire()));
                this._onDidChangeIndexState.fire();
                return this._impl;
            }
        }
        catch {
            return undefined;
        }
    }
    async getIndexState() {
        const impl = await this.tryInit(true);
        if (!impl) {
            return {
                remoteIndexState: {
                    status: 'disabled',
                    repos: [],
                },
                localIndexState: {
                    status: !this._authenticationService.copilotToken || this._authenticationService.copilotToken.isNoAuthUser ? embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Disabled : embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Unknown,
                    getState: async () => undefined,
                }
            };
        }
        return impl.getIndexState();
    }
    async hasFastSearch(sizing) {
        if (!this._impl) {
            return false;
        }
        return this._impl.hasFastSearch(sizing);
    }
    async searchFileChunks(sizing, query, options, telemetryInfo, progress, token) {
        const impl = await this.tryInit(false);
        if (!impl) {
            throw new Error('Workspace chunk search service not available');
        }
        return impl.searchFileChunks(sizing, query, options, telemetryInfo, progress, token);
    }
    async triggerLocalIndexing(trigger, telemetryInfo) {
        const impl = await this.tryInit(false);
        if (!impl) {
            throw new Error('Workspace chunk search service not available');
        }
        return impl.triggerLocalIndexing(trigger, telemetryInfo);
    }
    async triggerRemoteIndexing(trigger, telemetryInfo) {
        const impl = await this.tryInit(false);
        if (!impl) {
            throw new Error('Workspace chunk search service not available');
        }
        return impl.triggerRemoteIndexing(trigger, telemetryInfo);
    }
};
exports.WorkspaceChunkSearchService = WorkspaceChunkSearchService;
exports.WorkspaceChunkSearchService = WorkspaceChunkSearchService = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService),
    __param(3, logService_1.ILogService)
], WorkspaceChunkSearchService);
let WorkspaceChunkSearchServiceImpl = class WorkspaceChunkSearchServiceImpl extends lifecycle_1.Disposable {
    constructor(_embeddingType, instantiationService, _authUpgradeService, _embeddingsComputer, _experimentationService, _ignoreService, _logService, _rerankerService, _simulationTestContext, _telemetryService, _extensionContext, _workspaceService, _workspaceFileIndex) {
        super();
        this._embeddingType = _embeddingType;
        this._authUpgradeService = _authUpgradeService;
        this._embeddingsComputer = _embeddingsComputer;
        this._experimentationService = _experimentationService;
        this._ignoreService = _ignoreService;
        this._logService = _logService;
        this._rerankerService = _rerankerService;
        this._simulationTestContext = _simulationTestContext;
        this._telemetryService = _telemetryService;
        this._extensionContext = _extensionContext;
        this._workspaceService = _workspaceService;
        this._workspaceFileIndex = _workspaceFileIndex;
        this.shouldEagerlyIndexKey = 'workspaceChunkSearch.shouldEagerlyIndex';
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
        this._isDisposed = false;
        this._embeddingsIndex = instantiationService.createInstance(workspaceChunkEmbeddingsIndex_1.WorkspaceChunkEmbeddingsIndex, this._embeddingType);
        this._embeddingsChunkSearch = this._register(instantiationService.createInstance(embeddingsChunkSearch_1.EmbeddingsChunkSearch, this._embeddingsIndex));
        this._fullWorkspaceChunkSearch = this._register(instantiationService.createInstance(fullWorkspaceChunkSearch_1.FullWorkspaceChunkSearch));
        this._tfidfChunkSearch = this._register(instantiationService.createInstance(tfidfChunkSearch_1.TfidfChunkSearch, { tokenizer: tokenizer_1.TokenizerType.O200K })); // TODO mjbvz: remove hardcoding
        this._tfIdfWithSemanticChunkSearch = this._register(instantiationService.createInstance(tfidfWithSemanticChunkSearch_1.TfIdfWithSemanticChunkSearch, this._tfidfChunkSearch, this._embeddingsIndex));
        this._codeSearchChunkSearch = this._register(instantiationService.createInstance(codeSearchChunkSearch_1.CodeSearchChunkSearch, this._embeddingType, this._embeddingsChunkSearch, this._tfIdfWithSemanticChunkSearch));
        this._register(event_1.Event.debounce(event_1.Event.any(this._embeddingsChunkSearch.onDidChangeIndexState, this._codeSearchChunkSearch.onDidChangeIndexState), () => { }, 250)(() => this._onDidChangeIndexState.fire()));
        if (this._extensionContext.workspaceState.get(this.shouldEagerlyIndexKey, false)
            && (this._experimentationService.getTreatmentVariable('copilotchat.workspaceChunkSearch.shouldEagerlyInitLocalIndex') ?? true)) {
            this._codeSearchChunkSearch.isAvailable().then(async (hasCodeSearch) => {
                if (!hasCodeSearch && !this._isDisposed) {
                    try {
                        await this._embeddingsChunkSearch.triggerLocalIndexing('auto');
                    }
                    catch {
                        // noop
                    }
                }
            });
        }
        this._register(this._authUpgradeService.onDidGrantAuthUpgrade(() => {
            if (this._experimentationService.getTreatmentVariable('copilotchat.workspaceChunkSearch.shouldRemoteIndexOnAuthUpgrade') ?? true) {
                void this.triggerRemoteIndexing('auto', new telemetryCorrelationId_1.TelemetryCorrelationId('onDidGrantAuthUpgrade')).catch(e => {
                    // noop
                });
            }
        }));
        /* __GDPR__
            "workspaceChunkSearch.created" : {
                "owner": "mjbvz",
                "comment": "Metadata about workspace chunk search",
                "embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of embeddings used" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkSearch.created', {
            embeddingType: this._embeddingType.id,
        });
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
    async getIndexState() {
        const localState = await this._embeddingsChunkSearch.getState();
        return {
            remoteIndexState: this._codeSearchChunkSearch.getRemoteIndexState(),
            localIndexState: localState,
        };
    }
    async hasFastSearch(sizing) {
        if (this._experimentationService.getTreatmentVariable('copilotchat.workspaceChunkSearch.markAllSearchesSlow')) {
            return false;
        }
        const indexState = await this.getIndexState();
        return (indexState.remoteIndexState.status === 'loaded' && indexState.remoteIndexState.repos.length > 0 && indexState.remoteIndexState.repos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.Ready))
            || indexState.localIndexState.status === embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Ready
            || await this._fullWorkspaceChunkSearch.mayBeAvailable(sizing);
    }
    async triggerLocalIndexing(trigger, _telemetryInfo) {
        if (await this._codeSearchChunkSearch.isAvailable()) {
            await this._codeSearchChunkSearch.triggerDiffIndexing();
            return result_1.Result.ok(true);
        }
        else {
            return this._embeddingsChunkSearch.triggerLocalIndexing(trigger);
        }
    }
    triggerRemoteIndexing(trigger, telemetryInfo) {
        return this._codeSearchChunkSearch.triggerRemoteIndexing(trigger, telemetryInfo);
    }
    async searchFileChunks(sizing, query, options, telemetryInfo, progress, token) {
        const wasFirstSearchInWorkspace = !this._extensionContext.workspaceState.get(this.shouldEagerlyIndexKey, false);
        this._extensionContext.workspaceState.update(this.shouldEagerlyIndexKey, true);
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkSearch.searchFileChunks', async () => {
            // Kick off (but do not wait on) query embedding resolve as soon as possible because almost all strategies will ultimately need it
            const queryWithEmbeddings = this.toQueryWithEmbeddings(query, token);
            const stratSizing = {
                endpoint: sizing.endpoint,
                tokenBudget: sizing.tokenBudget,
                fullWorkspaceTokenBudget: sizing.fullWorkspaceTokenBudget,
                maxResultCountHint: this.getMaxChunks(sizing),
            };
            const searchTask = this.doSearchFileChunks(stratSizing, queryWithEmbeddings, options, telemetryInfo, token);
            progress?.report(new vscodeTypes_1.ChatResponseProgressPart2(l10n.t('Collecting workspace information'), async () => { await searchTask; }));
            const searchSw = new stopwatch_1.StopWatch();
            const searchResult = await (0, async_1.raceCancellationError)(searchTask, token);
            if (token.isCancellationRequested) {
                throw new errors_1.CancellationError();
            }
            /* __GDPR__
                "workspaceChunkSearchStrategy" : {
                    "owner": "mjbvz",
                    "comment": "Understanding which workspace chunk search strategy is used",
                    "strategy": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The chosen strategy" },
                    "errorDiagMessage": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The reason why the search failed" },
                    "embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "The type of embeddings used" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total time in ms for workspace chunk search" },
                    "workspaceIndexFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of files in our workspace index" },
                    "wasFirstSearchInWorkspace": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Tracks if this was the first time we triggered a workspace search" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkSearchStrategy', {
                strategy: searchResult.isOk() ? searchResult.val.strategy : 'none',
                errorDiagMessage: searchResult.isError() ? searchResult.err.errorDiagMessage : undefined,
                embeddingType: this._embeddingType.id,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                execTime: searchSw.elapsed(),
                workspaceIndexFileCount: this._workspaceFileIndex.fileCount,
                wasFirstSearchInWorkspace: wasFirstSearchInWorkspace ? 1 : 0,
            });
            if (searchResult.isError()) {
                this._logService.error(`WorkspaceChunkSearch.searchFileChunks: no strategies succeeded`);
                if (this._simulationTestContext.isInSimulationTests) {
                    throw new Error('All workspace search strategies failed');
                }
                return {
                    chunks: [],
                    isFullWorkspace: false,
                    alerts: searchResult.err.alerts,
                };
            }
            this._logService.trace(`WorkspaceChunkSearch.searchFileChunks: found ${searchResult.val.result.chunks.length} chunks using '${searchResult.val.strategy}'`);
            const filteredChunks = await (0, async_1.raceCancellationError)(this.filterIgnoredChunks(searchResult.val.result.chunks), token);
            if (this._simulationTestContext.isInSimulationTests) {
                if (!filteredChunks.length) {
                    throw new Error('No chunks returned');
                }
            }
            const filteredResult = {
                ...searchResult.val,
                result: {
                    alerts: searchResult.val.result.alerts,
                    chunks: filteredChunks,
                    isFullWorkspace: searchResult.val.strategy === workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.FullWorkspace
                }
            };
            // If explicit rerank is enabled, use the remote reranker
            if (options.enableRerank && this._rerankerService.isAvailable) {
                try {
                    const queryString = await query.resolveQuery(token);
                    const reranked = await this._rerankerService.rerank(queryString, filteredResult.result.chunks, token);
                    return {
                        chunks: reranked.slice(0, this.getMaxChunks(sizing)),
                        isFullWorkspace: filteredResult.result.isFullWorkspace,
                        alerts: filteredResult.result.alerts,
                        strategy: filteredResult.strategy,
                    };
                }
                catch (e) {
                    this._logService.error(e, 'Reranker service failed; falling back to local rerank');
                }
            }
            return this.rerankResultIfNeeded(queryWithEmbeddings, filteredResult, this.getMaxChunks(sizing), telemetryInfo, progress, token);
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of embeddings used" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkSearch.perf.searchFileChunks', {
                status,
                embeddingType: this._embeddingType.id,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                execTime
            });
        });
    }
    toQueryWithEmbeddings(query, token) {
        const queryEmbeddings = (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkSearch.resolveQueryEmbeddings', () => query.resolveQuery(token).then(async (queryStr) => {
            const result = await this.computeEmbeddings('query', [queryStr], token);
            const first = result.values.at(0);
            if (!first) {
                throw new Error('Could not resolve query embeddings');
            }
            return first;
        }));
        return {
            ...query,
            resolveQueryEmbeddings: (_token) => queryEmbeddings
        };
    }
    async doSearchFileChunks(sizing, query, options, telemetryInfo, token) {
        this._logService.debug(`Searching for ${sizing.maxResultCountHint} chunks in workspace`);
        // First try full workspace
        try {
            const fullWorkspaceResults = await this.runSearchStrategy(this._fullWorkspaceChunkSearch, sizing, query, options, telemetryInfo, token);
            if (fullWorkspaceResults.isOk()) {
                return fullWorkspaceResults;
            }
        }
        catch (e) {
            if ((0, errors_1.isCancellationError)(e)) {
                throw e;
            }
            this._logService.error(e, `Error during full workspace search`);
        }
        // Then try code search but fallback to local search on error or timeout
        const codeSearchTimeout = this._simulationTestContext.isInSimulationTests ? 1_000_000 : 12_500;
        return this.runSearchStrategyWithFallback(this._codeSearchChunkSearch, () => (0, async_1.createCancelablePromise)(token => this.doSearchFileChunksLocally(sizing, query, options, telemetryInfo, token)), codeSearchTimeout, sizing, query, options, telemetryInfo, token);
    }
    /**
     * Tries to run {@link mainStrategy} but falls back to {@link fallback} if it fails or times out.
     *
     * On timeout, the main strategy will continue to run in the background and will be cancelled if the fallback finishes first.
     */
    async runSearchStrategyWithFallback(mainStrategy, fallback, mainTimeout, sizing, query, options, telemetryInfo, token) {
        // Run prepare before starting the actual timeout
        if (mainStrategy.prepareSearchWorkspace) {
            await (0, async_1.raceCancellationError)(mainStrategy.prepareSearchWorkspace?.(telemetryInfo, token), token);
        }
        const mainOp = (0, async_1.createCancelablePromise)(token => this.runSearchStrategy(mainStrategy, sizing, query, options, telemetryInfo, token));
        token.onCancellationRequested(() => mainOp.cancel());
        const mainResult = await (0, async_1.raceCancellationError)((0, async_1.raceTimeout)(mainOp, mainTimeout), token);
        if (mainResult?.isOk()) {
            return mainResult;
        }
        // If main op failed or timed out, fallback but continue with the main too in case it finishes before the fallback
        const fallBackOp = fallback();
        token.onCancellationRequested(() => fallBackOp.cancel());
        return this.raceSearchOperations([mainOp, fallBackOp]);
    }
    async raceSearchOperations(ops) {
        for (const op of ops) {
            // if any op finishes, cancel the others
            op.then(result => {
                if (result.isOk()) {
                    ops.forEach(op => op.cancel());
                }
            }, () => { });
        }
        const result = await Promise.allSettled(ops);
        for (const r of result) {
            if (r.status === 'fulfilled' && r.value.isOk()) {
                return r.value;
            }
        }
        // Check known failures
        {
            const errors = [];
            for (const r of result) {
                if (r.status === 'fulfilled' && r.value.isError()) {
                    errors.push(r.value.err.errorDiagMessage);
                }
            }
            if (errors.length) {
                return result_1.Result.error({
                    errorDiagMessage: errors.join(', ')
                });
            }
        }
        // Check exceptions
        if (result.every(r => r.status === 'rejected' && (0, errors_1.isCancellationError)(r.reason))) {
            return result_1.Result.error({
                errorDiagMessage: 'cancelled',
            });
        }
        for (const r of result) {
            if (r.status === 'rejected' && !(0, errors_1.isCancellationError)(r.reason)) {
                return result_1.Result.error({
                    errorDiagMessage: r.reason + ''
                });
            }
        }
        return result_1.Result.error({
            errorDiagMessage: 'unknown error',
        });
    }
    async doSearchFileChunksLocally(sizing, query, options, telemetryInfo, token) {
        const embeddingStatus = (await this._embeddingsChunkSearch.getState()).status;
        if (embeddingStatus === embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Ready || embeddingStatus === embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.UpdatingIndex) {
            const embeddingsTimeout = 8000;
            return this.runSearchStrategyWithFallback(this._embeddingsChunkSearch, () => (0, async_1.createCancelablePromise)(token => this.runSearchStrategy(this._tfIdfWithSemanticChunkSearch, sizing, query, options, telemetryInfo, token)), embeddingsTimeout, sizing, query, options, telemetryInfo, token);
        }
        else if (this._simulationTestContext.isInSimulationTests && embeddingStatus === embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Unknown) {
            return this.runSearchStrategy(this._embeddingsChunkSearch, sizing, query, options, telemetryInfo, token);
        }
        else {
            return this.runSearchStrategy(this._tfIdfWithSemanticChunkSearch, sizing, query, options, telemetryInfo, token);
        }
    }
    async runSearchStrategy(strategy, sizing, query, options, telemetryInfo, token) {
        try {
            if (strategy.prepareSearchWorkspace) {
                await (0, async_1.raceCancellationError)(strategy.prepareSearchWorkspace(telemetryInfo, token), token);
            }
            const result = await (0, async_1.raceCancellationError)(strategy.searchWorkspace(sizing, query, options, telemetryInfo, token), token);
            if (result) {
                return result_1.Result.ok({
                    strategy: strategy.id,
                    result: result,
                });
            }
            else {
                return result_1.Result.error({
                    errorDiagMessage: `${strategy.id}: no result`,
                });
            }
        }
        catch (e) {
            if ((0, errors_1.isCancellationError)(e)) {
                throw e;
            }
            this._logService.error(e, `Error during ${strategy.id} search`);
            return result_1.Result.error({
                errorDiagMessage: `${strategy.id} error: ` + e,
            });
        }
    }
    getMaxChunks(sizing) {
        let maxResults;
        if (typeof sizing.tokenBudget === 'number') {
            maxResults = Math.floor(sizing.tokenBudget / naiveChunker_1.MAX_CHUNK_SIZE_TOKENS);
        }
        if (typeof sizing.maxResults === 'number') {
            maxResults = typeof maxResults === 'number' ? Math.min(sizing.maxResults, maxResults) : sizing.maxResults;
        }
        if (typeof maxResults !== 'number') {
            throw new Error('Either maxResults or tokenBudget must be provided');
        }
        return maxResults;
    }
    async filterIgnoredChunks(chunks) {
        return (0, arrays_1.coalesce)(await Promise.all(chunks.map(async (entry) => {
            const isIgnored = await this._ignoreService.isCopilotIgnored(entry.chunk.file);
            return isIgnored ? null : entry;
        })));
    }
    async rerankResultIfNeeded(query, result, maxResults, telemetryInfo, progress, token) {
        // If we have full workspace results, use those directly without re-ranking
        if (result.strategy === workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.FullWorkspace) {
            return {
                // No slice. We care more about token budget here
                chunks: result.result.chunks,
                isFullWorkspace: true,
                alerts: result.result.alerts,
                strategy: result.strategy,
            };
        }
        const chunks = result.result.chunks;
        const orderedChunks = await this.rerankChunks(query, chunks, maxResults, telemetryInfo, progress, token);
        return {
            chunks: orderedChunks,
            isFullWorkspace: false,
            alerts: result.result.alerts,
            strategy: result.strategy,
        };
    }
    async rerankChunks(query, inChunks, maxResults, telemetryInfo, progress, token) {
        if (!inChunks.length) {
            return [];
        }
        try {
            let sortedChunks;
            // Handle special case where all chunks have the same embedding type even if this doesn't match the current embedding type.
            // Since we don't care about raw scores, we'll sort them by the distance value instead of recomputing the embeddings.
            const firstChunkEmbeddingType = inChunks.at(0)?.distance?.embeddingType;
            if (firstChunkEmbeddingType && inChunks.every(x => typeof x.distance !== 'undefined' && x.distance.embeddingType.equals(firstChunkEmbeddingType))) {
                sortedChunks = [...inChunks]
                    .sort((a, b) => b.distance.value - a.distance.value);
            }
            else {
                // In this case, we are either missing a distance value or have a mix of embedding types
                const chunksPlusIndexes = inChunks.map((x, i) => ({ ...x.chunk, distance: x.distance, index: i }));
                const unscoredChunks = chunksPlusIndexes.filter(entry => typeof entry.distance === 'undefined' || !entry.distance.embeddingType.equals(this._embeddingType));
                let newlyScoredChunks;
                if (unscoredChunks.length) {
                    this._logService.debug(`WorkspaceChunkSearch.rerankChunks. Scoring ${unscoredChunks.length} new chunks`);
                    // Only show progress when we're doing a potentially long running operation
                    const scoreTask = this.scoreChunks(query, unscoredChunks, telemetryInfo, token);
                    progress?.report(new vscodeTypes_1.ChatResponseProgressPart2(l10n.t('Filtering to most relevant information'), async () => { await scoreTask; }));
                    newlyScoredChunks = await (0, async_1.raceCancellationError)(scoreTask, token);
                }
                const out = [];
                for (let i = 0; i < inChunks.length; i++) {
                    const entry = inChunks[i];
                    if (typeof entry.distance !== 'undefined') {
                        out[i] = { chunk: entry.chunk, distance: entry.distance };
                    }
                }
                for (const entry of newlyScoredChunks ?? []) {
                    out[entry.chunk.index] = entry;
                }
                for (let i = 0; i < inChunks.length; i++) {
                    if (!out[i]) {
                        this._logService.error(`Missing out chunk ${i}`);
                    }
                }
                sortedChunks = out
                    .filter(chunk => chunk?.distance?.embeddingType.equals(this._embeddingType))
                    .sort((a, b) => b.distance.value - a.distance.value);
            }
            if (!sortedChunks.length) {
                return sortedChunks;
            }
            sortedChunks = sortedChunks.slice(0, maxResults);
            // Filter out low quality results based on the top result
            const topScore = sortedChunks[0].distance.value;
            const lowestAllowedScore = topScore * maxEmbeddingSpread;
            const filteredChunks = sortedChunks.filter(x => x.distance.value >= lowestAllowedScore);
            this._logService.debug(`Eagerly filtered out ${sortedChunks.length - filteredChunks.length} chunks due to low quality`);
            return filteredChunks;
        }
        catch (e) {
            if (!(0, errors_1.isCancellationError)(e)) {
                this._logService.error(e, 'Failed to search chunk embeddings index');
            }
            return inChunks.slice(0, maxResults);
        }
    }
    async scoreChunks(query, chunks, telemetryInfo, token) {
        return (0, logExecTime_1.logExecTime)(this._logService, 'WorkspaceChunkSearch.scoreChunks', async () => {
            if (!chunks.length) {
                return [];
            }
            const chunkStrings = chunks.map(chunk => this.chunkToIndexString(chunk));
            const [queryEmbeddings, chunkEmbeddings] = await (0, async_1.raceCancellationError)(Promise.all([
                query.resolveQueryEmbeddings(token),
                this.computeEmbeddings('document', chunkStrings, token)
            ]), token);
            return chunkEmbeddings.values.map((embedding, index) => ({
                chunk: chunks[index],
                distance: (0, embeddingsComputer_1.distance)(queryEmbeddings, embedding),
            }));
        }, (execTime, status) => {
            /* __GDPR__
                "workspaceChunkSearch.perf.adaRerank" : {
                    "owner": "mjbvz",
                    "comment": "Understanding how effective ADA re-ranking is",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "embeddingType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Type of embeddings used" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('workspaceChunkSearch.perf.adaRerank', {
                status,
                embeddingType: this._embeddingType.id,
                workspaceSearchSource: telemetryInfo.callTracker,
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    computeEmbeddings(inputType, strings, token) {
        return this._embeddingsComputer.computeEmbeddings(this._embeddingType, strings, { inputType }, new telemetryCorrelationId_1.TelemetryCorrelationId('WorkspaceChunkSearchService::computeEmbeddings'), token);
    }
    /**
     * Get the string used to used to calculate embeddings for a chunk.
     */
    chunkToIndexString(chunk) {
        // TODO: could performance be improved here if we process chunks per file first?
        const displayPath = (0, workspaceService_1.getWorkspaceFileDisplayPath)(this._workspaceService, chunk.file);
        return this.toStringForEmbeddingsComputer(chunk, displayPath);
    }
    toStringForEmbeddingsComputer(chunk, displayPath) {
        return `File: \`${displayPath}\`\n${(0, markdown_1.createFencedCodeBlock)((0, markdown_1.getLanguageId)(chunk.file), chunk.text)}`;
    }
};
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'WorkspaceChunkSearch::rerankResultIfNeeded')
], WorkspaceChunkSearchServiceImpl.prototype, "rerankResultIfNeeded", null);
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'WorkspaceChunkSearch::rerankChunks')
], WorkspaceChunkSearchServiceImpl.prototype, "rerankChunks", null);
WorkspaceChunkSearchServiceImpl = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(3, embeddingsComputer_1.IEmbeddingsComputer),
    __param(4, nullExperimentationService_1.IExperimentationService),
    __param(5, ignoreService_js_1.IIgnoreService),
    __param(6, logService_1.ILogService),
    __param(7, rerankerService_1.IRerankerService),
    __param(8, simulationTestContext_1.ISimulationTestContext),
    __param(9, telemetry_1.ITelemetryService),
    __param(10, extensionContext_1.IVSCodeExtensionContext),
    __param(11, workspaceService_1.IWorkspaceService),
    __param(12, workspaceFileIndex_1.IWorkspaceFileIndex)
], WorkspaceChunkSearchServiceImpl);
class NullWorkspaceChunkSearchService {
    constructor() {
        this.onDidChangeIndexState = event_1.Event.None;
    }
    hasFastSearch(sizing) {
        return Promise.resolve(false);
    }
    getIndexState() {
        throw new Error('Method not implemented.');
    }
    searchFileChunks(sizing, query, options, telemetryInfo, progress, token) {
        throw new Error('Method not implemented.');
    }
    async triggerLocalIndexing() {
        return result_1.Result.ok(true);
    }
    triggerRemoteIndexing() {
        return Promise.resolve(result_1.Result.ok(true));
    }
    dispose() {
        // noop
    }
}
exports.NullWorkspaceChunkSearchService = NullWorkspaceChunkSearchService;
//# sourceMappingURL=workspaceChunkSearchService.js.map