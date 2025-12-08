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
var EmbeddingsChunkSearch_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingsChunkSearch = exports.LocalEmbeddingsIndexStatus = void 0;
const l10n_1 = require("@vscode/l10n");
const result_1 = require("../../../util/common/result");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const authentication_1 = require("../../authentication/common/authentication");
const configurationService_1 = require("../../configuration/common/configurationService");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const codeSearchRepoAuth_1 = require("../../remoteCodeSearch/node/codeSearchRepoAuth");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
var LocalEmbeddingsIndexStatus;
(function (LocalEmbeddingsIndexStatus) {
    LocalEmbeddingsIndexStatus["Disabled"] = "disabled";
    LocalEmbeddingsIndexStatus["Unknown"] = "unknown";
    LocalEmbeddingsIndexStatus["UpdatingIndex"] = "updatingIndex";
    LocalEmbeddingsIndexStatus["Ready"] = "ready";
    LocalEmbeddingsIndexStatus["TooManyFilesForAutomaticIndexing"] = "tooManyFilesForAutomaticIndexing";
    LocalEmbeddingsIndexStatus["TooManyFilesForAnyIndexing"] = "tooManyFilesForAnyIndexing";
})(LocalEmbeddingsIndexStatus || (exports.LocalEmbeddingsIndexStatus = LocalEmbeddingsIndexStatus = {}));
/**
 * Uses a locally stored index of embeddings to find the most similar chunks from the workspace.
 *
 * This can be costly so it is only available for smaller workspaces.
 */
let EmbeddingsChunkSearch = class EmbeddingsChunkSearch extends lifecycle_1.Disposable {
    static { EmbeddingsChunkSearch_1 = this; }
    /** Max workspace size that will be automatically indexed. */
    static { this.defaultAutomaticIndexingFileCap = 750; }
    /** Max workspace size for automatic for clients with expanded capabilities. */
    static { this.defaultExpandedAutomaticIndexingFileCap = 50_000; }
    /** Max workspace size that can indexed if requested by the user. */
    static { this.defaultManualIndexingFileCap = 2500; }
    constructor(embeddingsIndex, _simulationTestContext, _authService, _codeSearchAuthService, _configService, _experimentationService, _logService, _telemetryService, _extensionContext, _workspaceIndex) {
        super();
        this._authService = _authService;
        this._codeSearchAuthService = _codeSearchAuthService;
        this._configService = _configService;
        this._experimentationService = _experimentationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._extensionContext = _extensionContext;
        this._workspaceIndex = _workspaceIndex;
        this.id = workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.Embeddings;
        this._state = LocalEmbeddingsIndexStatus.Unknown;
        this._disposeCts = this._register(new cancellation_1.CancellationTokenSource());
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
        this._reindexDisposables = this._register(new lifecycle_1.DisposableStore());
        this._reindexRequests = new map_1.ResourceMap;
        this._hasRequestedManualIndexingKey = 'copilot.embeddingsChunkSearch.hasRequestedManualIndexing';
        this._hasPromptedExpandedIndexingKey = 'copilot.embeddingsChunkSearch.hasRequestedExpandedIndexing';
        this._embeddingsIndex = embeddingsIndex;
        this._register(this._embeddingsIndex.onDidChangeWorkspaceIndexState(() => {
            return this._onDidChangeIndexState.fire();
        }));
    }
    dispose() {
        super.dispose();
        (0, lifecycle_1.dispose)(this._reindexRequests.values());
        this._reindexRequests.clear();
    }
    async triggerLocalIndexing(trigger) {
        await this.initialize();
        if (trigger === 'manual') {
            this._extensionContext.workspaceState.update(this._hasRequestedManualIndexingKey, true);
        }
        // TODO: we need to re-check the workspace state here since it may have changed
        if (this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing) {
            const fileCap = await this.getManualIndexFileCap();
            return result_1.Result.error({
                id: 'too-many-files',
                userMessage: (0, l10n_1.t)('@workspace\'s indexing currently is limited to {0} files. Found {1} potential files to index in the workspace.\n\nA sparse local index will be used to answer question instead.', fileCap, this._embeddingsIndex.fileCount)
            });
        }
        if (this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing && trigger === 'auto') {
            return result_1.Result.ok(true);
        }
        await this.triggerIndexingOfWorkspace(trigger, new telemetryCorrelationId_1.TelemetryCorrelationId('EmbeddingsChunkSearch::triggerLocalIndexing'));
        return result_1.Result.ok(true);
    }
    async prepareSearchWorkspace(telemetryInfo, token) {
        if (!this.isEmbeddingSearchEnabled()) {
            return;
        }
        // We're potentially going to index a lot of files due to expanded indexing, prompt the user to confirm first.
        // This both informs them that indexing may take some time and also reduces load for cases when
        // the extra indexing was unexpected.
        if (!await (0, async_1.raceCancellationError)(this.getExpandedClientSideIndexingStatus(), token)) {
            return;
        }
        if (this._embeddingsIndex.fileCount < await this.getManualIndexFileCap()) {
            return;
        }
        // Only auto prompt once per workspace
        const hasPrompted = this._extensionContext.workspaceState.get(this._hasPromptedExpandedIndexingKey);
        if (hasPrompted) {
            return;
        }
        this._extensionContext.workspaceState.update(this._hasPromptedExpandedIndexingKey, true);
        const shouldIndex = await this._codeSearchAuthService.promptForExpandedLocalIndexing(this._embeddingsIndex.fileCount);
        if (shouldIndex) {
            // Don't await, just kick off
            this.triggerIndexingOfWorkspace('manual', telemetryInfo.addCaller('EmbeddingsChunkSearch::prepareSearchWorkspace'));
        }
    }
    async searchWorkspace(sizing, query, options, telemetryInfo, token) {
        if (!this.isEmbeddingSearchEnabled()) {
            return undefined;
        }
        return (0, logExecTime_1.logExecTime)(this._logService, 'EmbeddingsChunkSearch.searchWorkspace', async () => {
            // kick off resolve early but don't await it until actually needed
            const resolvedQuery = query.resolveQueryEmbeddings(token);
            const innerTelemetryInfo = telemetryInfo.addCaller('EmbeddingsChunkSearch::searchWorkspace');
            await (0, async_1.raceCancellationError)(this.doInitialIndexing('manual', innerTelemetryInfo), token);
            if (this._state === LocalEmbeddingsIndexStatus.UpdatingIndex || this._state === LocalEmbeddingsIndexStatus.Ready) {
                return { chunks: await this._embeddingsIndex.searchWorkspace(resolvedQuery, sizing.maxResultCountHint, options, innerTelemetryInfo, token) };
            }
            else {
                return undefined;
            }
        }, (execTime, status) => {
            /* __GDPR__
                "embeddingsChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('embeddingsChunkSearch.perf.searchFileChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, { execTime });
        });
    }
    isEmbeddingSearchEnabled() {
        return this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableEmbeddingsSearch, this._experimentationService);
    }
    async searchSubsetOfFiles(sizing, query, files, options, telemetry, token) {
        if (!files.length) {
            return { chunks: [] };
        }
        return (0, logExecTime_1.logExecTime)(this._logService, 'EmbeddingsChunkSearch::searchSubsetOfFiles', async () => {
            await (0, async_1.raceCancellationError)(this._embeddingsIndex.initialize(), token);
            // kick off resolve early but don't await it until actually needed
            const resolvedQuery = query.resolveQueryEmbeddings(token);
            return {
                chunks: await this._embeddingsIndex.searchSubsetOfFiles(files, resolvedQuery, sizing.maxResultCountHint, options, { info: telemetry.info.addCaller('EmbeddingsChunkSearch::searchSubsetOfFiles'), batchInfo: telemetry.batchInfo }, token)
            };
        }, (execTime, status) => {
            /* __GDPR__
                "embeddingsChunkSearch.perf.searchSubsetOfFiles" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchSubsetOfFiles to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('embeddingsChunkSearch.perf.searchSubsetOfFiles', {
                status,
                workspaceSearchSource: telemetry.info.callTracker.toString(),
                workspaceSearchCorrelationId: telemetry.info.correlationId,
            }, { execTime });
        });
    }
    async getState() {
        await this.initialize();
        return {
            status: this._state,
            getState: () => this._embeddingsIndex.getIndexState()
        };
    }
    async initialize() {
        this._init ??= (async () => {
            await this._embeddingsIndex.initialize();
            if (this._disposeCts.token.isCancellationRequested) {
                return;
            }
            const limitStatus = await this.checkIndexSizeLimits();
            if (limitStatus) {
                if (limitStatus === LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing) {
                    this._logService.debug(`EmbeddingsChunkSearch: Disabling all local embedding indexing due to too many files. Found ${this._embeddingsIndex.fileCount} files. Max: ${await this.getManualIndexFileCap()}`);
                }
                else if (limitStatus === LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing) {
                    this._logService.debug(`EmbeddingsChunkSearch: skipping automatic indexing due to too many files. Found ${this._embeddingsIndex.fileCount} files. Max: ${await this.getAutoIndexFileCap()}`);
                }
                this.setState(limitStatus);
                return;
            }
            this._logService.debug(`EmbeddingsChunkSearch: initialize found ${this._embeddingsIndex.fileCount} files. Max: ${await this.getAutoIndexFileCap()}`);
            this.setState(LocalEmbeddingsIndexStatus.Ready);
        })();
        await this._init;
    }
    async checkIndexSizeLimits() {
        // First check if we have too many files to do any indexing
        const manualEmbeddingsCacheFileCap = await this.getManualIndexFileCap();
        if (this._embeddingsIndex.fileCount > manualEmbeddingsCacheFileCap) {
            return LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing;
        }
        // Then see if we can still trigger automatically
        const autoFileCap = await this.getAutoIndexFileCap();
        if (this._embeddingsIndex.fileCount > autoFileCap) {
            const hasRequestedManualIndexing = this._extensionContext.workspaceState.get(this._hasRequestedManualIndexingKey, false);
            if (!hasRequestedManualIndexing) {
                return LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing;
            }
        }
        return undefined;
    }
    async doInitialIndexing(trigger, telemetryInfo) {
        this._initialIndexing ??= (async () => {
            await this.initialize();
            if (this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing
                || this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing) {
                return;
            }
            // Kick off indexing but don't block on it by waiting
            this.triggerIndexingOfWorkspace(trigger, telemetryInfo.addCaller('EmbeddingsChunkSearch::doInitialIndexing'));
            this.registerAutomaticReindexListeners();
        })();
        await this._initialIndexing;
    }
    async triggerIndexingOfWorkspace(trigger, telemetryInfo) {
        this._logService.debug('EmbeddingsChunkSearch::triggerIndexingOfWorkspace()');
        this.setState(LocalEmbeddingsIndexStatus.UpdatingIndex);
        try {
            await this._embeddingsIndex.triggerIndexingOfWorkspace(trigger, telemetryInfo, this._disposeCts.token);
            this.setState(LocalEmbeddingsIndexStatus.Ready);
            this._logService.debug('Workspace Chunk Embeddings Index initialized.');
        }
        catch (e) {
            this._logService.warn(`Failed to index workspace: ${e}`);
        }
    }
    registerAutomaticReindexListeners() {
        this._reindexDisposables.clear();
        (0, lifecycle_1.dispose)(this._reindexRequests.values());
        this._reindexRequests.clear();
        const updateIndexState = async () => {
            const limitStatus = await this.checkIndexSizeLimits();
            if (limitStatus) {
                this.setState(limitStatus);
            }
        };
        this._reindexDisposables.add(this._workspaceIndex.onDidCreateFiles(async (_uris) => {
            updateIndexState();
        }));
        this._reindexDisposables.add(this._workspaceIndex.onDidDeleteFiles(uris => {
            for (const uri of uris) {
                this._reindexRequests.get(uri)?.dispose();
                this._reindexRequests.delete(uri);
            }
            updateIndexState();
        }));
    }
    async getAutoIndexFileCap() {
        if (await this.getExpandedClientSideIndexingStatus() === 'enabled') {
            return this._experimentationService.getTreatmentVariable('workspace.expandedEmbeddingsCacheFileCap') ?? EmbeddingsChunkSearch_1.defaultExpandedAutomaticIndexingFileCap;
        }
        return this._experimentationService.getTreatmentVariable('workspace.embeddingsCacheFileCap') ?? EmbeddingsChunkSearch_1.defaultAutomaticIndexingFileCap;
    }
    async getManualIndexFileCap() {
        let manualCap = this._experimentationService.getTreatmentVariable('workspace.manualEmbeddingsCacheFileCap') ?? EmbeddingsChunkSearch_1.defaultManualIndexingFileCap;
        if (await this.getExpandedClientSideIndexingStatus() === 'available') {
            manualCap = this._experimentationService.getTreatmentVariable('workspace.expandedEmbeddingsCacheFileCap') ?? EmbeddingsChunkSearch_1.defaultExpandedAutomaticIndexingFileCap;
        }
        // The manual cap should never be lower than the auto cap
        return Math.max(manualCap, await this.getAutoIndexFileCap());
    }
    async getExpandedClientSideIndexingStatus() {
        try {
            const token = await this._authService.getCopilotToken();
            if (!token?.isExpandedClientSideIndexingEnabled()) {
                return 'disabled';
            }
        }
        catch {
            // noop
        }
        const cache = this._extensionContext.workspaceState.get(this._hasPromptedExpandedIndexingKey);
        return cache === true ? 'enabled' : 'available';
    }
    setState(status) {
        if (this._state !== status) {
            this._state = status;
            this._onDidChangeIndexState.fire();
        }
    }
    tryTriggerReindexing(uris, telemetryInfo) {
        if (this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing
            || this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing) {
            return;
        }
        for (const uri of uris) {
            let delayer = this._reindexRequests.get(uri);
            if (!delayer) {
                delayer = new async_1.Delayer(0);
                this._reindexRequests.set(uri, delayer);
            }
            delayer.trigger(async () => {
                await this.initialize();
                if (this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing
                    || this._state === LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing) {
                    return;
                }
                return this._embeddingsIndex.triggerIndexingOfFile(uri, telemetryInfo.addCaller('EmbeddingChunkSearch::tryTriggerReindexing'), this._disposeCts.token);
            }, 0);
        }
    }
};
exports.EmbeddingsChunkSearch = EmbeddingsChunkSearch;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'EmbeddingsChunkSearch::searchSubsetOfFiles')
], EmbeddingsChunkSearch.prototype, "searchSubsetOfFiles", null);
exports.EmbeddingsChunkSearch = EmbeddingsChunkSearch = EmbeddingsChunkSearch_1 = __decorate([
    __param(1, simulationTestContext_1.ISimulationTestContext),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, codeSearchRepoAuth_1.ICodeSearchAuthenticationService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, nullExperimentationService_1.IExperimentationService),
    __param(6, logService_1.ILogService),
    __param(7, telemetry_1.ITelemetryService),
    __param(8, extensionContext_1.IVSCodeExtensionContext),
    __param(9, workspaceFileIndex_1.IWorkspaceFileIndex)
], EmbeddingsChunkSearch);
//# sourceMappingURL=embeddingsChunkSearch.js.map