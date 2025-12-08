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
var FullWorkspaceChunkSearch_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullWorkspaceChunkSearch = void 0;
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const range_1 = require("../../../util/vs/editor/common/core/range");
const configurationService_1 = require("../../configuration/common/configurationService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const tokenizer_1 = require("../../tokenizer/node/tokenizer");
const workspaceChunkSearch_1 = require("../common/workspaceChunkSearch");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
/**
 * Tries including the entire workspace if there's enough budget for it.
 *
 * This always either succeeds with the full workspace or returns no results.
 */
let FullWorkspaceChunkSearch = class FullWorkspaceChunkSearch extends lifecycle_1.Disposable {
    static { FullWorkspaceChunkSearch_1 = this; }
    /**
     * Upper bound on number of files we can use full workspace search for.
     *
     * This is is an optimization so we don't even try to compute the workspace token count if it has a ton of files.
     */
    static { this.maxFileCount = 100; }
    constructor(_configService, _experimentationService, _logService, _telemetryService, _tokenizationProvider, _workspaceIndex) {
        super();
        this._configService = _configService;
        this._experimentationService = _experimentationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._tokenizationProvider = _tokenizationProvider;
        this._workspaceIndex = _workspaceIndex;
        this.id = workspaceChunkSearch_1.WorkspaceChunkSearchStrategyId.FullWorkspace;
        this._previousHitWholeWorkspaceTokenCount = 0;
    }
    /**
     * Does a fast check to see if full workspace search may be available.
     */
    async mayBeAvailable(sizing, globPatterns) {
        if (!this.isEnabled()) {
            return false;
        }
        if (!sizing.tokenBudget || (!globPatterns && !this.mayBeUnderGlobalTokenBudget(sizing))) {
            return false;
        }
        await this._workspaceIndex.initialize();
        let count = 0;
        for (const _ of this._workspaceIndex.values(globPatterns)) {
            count++;
            if (count >= FullWorkspaceChunkSearch_1.maxFileCount) {
                return false;
            }
        }
        return true;
    }
    async searchWorkspace(sizing, _query, options, telemetryInfo, token) {
        if (!(await this.mayBeAvailable(sizing, options.globPatterns))) {
            return;
        }
        let errorReason;
        return (0, logExecTime_1.logExecTime)(this._logService, 'FullWorkspaceChunkSearch.searchWorkspace', async () => {
            const tokenBudget = sizing.fullWorkspaceTokenBudget ?? sizing.tokenBudget;
            if (!tokenBudget) {
                return undefined;
            }
            try {
                const tokenizer = this._tokenizationProvider.acquireTokenizer(sizing.endpoint);
                const chunks = [];
                let usedTokenBudget = 0;
                const cts = new cancellation_1.CancellationTokenSource(token);
                try {
                    await (0, async_1.raceCancellationError)(Promise.all(Array.from(this._workspaceIndex.values(options.globPatterns), async (file) => {
                        let text;
                        try {
                            text = await (0, async_1.raceCancellationError)(file.getText(), cts.token);
                        }
                        catch (e) {
                            if (!(0, errors_1.isCancellationError)(e)) {
                                errorReason = 'error-reading-file';
                                this._logService.error(`FullWorkspaceChunkSearch: Error getting text for file ${file.uri}: ${e}`);
                            }
                            throw e;
                        }
                        let fileTokens;
                        try {
                            fileTokens = await (0, async_1.raceCancellationError)(tokenizer.tokenLength(text), cts.token);
                        }
                        catch (e) {
                            if (!(0, errors_1.isCancellationError)(e)) {
                                errorReason = 'error-tokenizing-file';
                                this._logService.error(`FullWorkspaceChunkSearch: Error tokenizing file ${file.uri}: ${e}`);
                            }
                            throw e;
                        }
                        usedTokenBudget += fileTokens;
                        if (usedTokenBudget >= tokenBudget) {
                            cts.cancel();
                            return;
                        }
                        chunks.push({
                            // TODO: get proper range
                            chunk: { file: file.uri, range: new range_1.Range(0, 0, Number.MAX_SAFE_INTEGER, 0), isFullFile: true, text, rawText: text },
                            distance: undefined
                        });
                    })), token);
                }
                catch (e) {
                    // If only the inner cts was cancelled, we want to ignore it
                    // All other errors should be propagated
                    if (!(0, errors_1.isCancellationError)(e) || ((0, errors_1.isCancellationError)(e) && token.isCancellationRequested)) {
                        throw e;
                    }
                }
                finally {
                    cts.dispose();
                }
                if (usedTokenBudget >= tokenBudget) {
                    if (!options.globPatterns) {
                        this._previousHitWholeWorkspaceTokenCount = Math.max(usedTokenBudget, this._previousHitWholeWorkspaceTokenCount);
                    }
                    this._logService.debug(`FullWorkspaceChunkSearch: Workspace too large. Found at least ${usedTokenBudget} of ${tokenBudget} token limit`);
                    errorReason = 'too-large';
                    return undefined;
                }
                else {
                    this._logService.debug(`FullWorkspaceChunkSearch: Found ${usedTokenBudget} of ${sizing.tokenBudget} token limit`);
                    return { chunks };
                }
            }
            catch (e) {
                if (!(0, errors_1.isCancellationError)(e)) {
                    this._logService.error(e, `Error collecting info for full workspace search`);
                    if (e instanceof Error) {
                        errorReason ??= e.message;
                    }
                }
                throw e;
            }
        }, (execTime, status) => {
            /* __GDPR__
                "fullWorkspaceChunkSearch.perf.searchFileChunks" : {
                    "owner": "mjbvz",
                    "comment": "Total time for searchFileChunks to complete",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "failureReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "why did we fail" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('fullWorkspaceChunkSearch.perf.searchFileChunks', {
                status,
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
                failureReason: errorReason,
            }, { execTime });
        });
    }
    mayBeUnderGlobalTokenBudget(sizing) {
        const tokenBudget = sizing.fullWorkspaceTokenBudget ?? sizing.tokenBudget;
        return !!tokenBudget && this._previousHitWholeWorkspaceTokenCount < tokenBudget;
    }
    isEnabled() {
        return this._configService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.WorkspaceEnableFullWorkspace, this._experimentationService);
    }
};
exports.FullWorkspaceChunkSearch = FullWorkspaceChunkSearch;
exports.FullWorkspaceChunkSearch = FullWorkspaceChunkSearch = FullWorkspaceChunkSearch_1 = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, tokenizer_1.ITokenizerProvider),
    __param(5, workspaceFileIndex_1.IWorkspaceFileIndex)
], FullWorkspaceChunkSearch);
//# sourceMappingURL=fullWorkspaceChunkSearch.js.map