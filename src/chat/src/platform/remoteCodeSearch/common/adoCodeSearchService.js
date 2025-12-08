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
exports.AdoCodeSearchService = exports.IAdoCodeSearchService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const glob_1 = require("../../../util/common/glob");
const result_1 = require("../../../util/common/result");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClientImpl_1 = require("../../chunking/common/chunkingEndpointClientImpl");
const chunkingStringUtils_1 = require("../../chunking/common/chunkingStringUtils");
const configurationService_1 = require("../../configuration/common/configurationService");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const capiClient_1 = require("../../endpoint/common/capiClient");
const envService_1 = require("../../env/common/envService");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const telemetry_1 = require("../../telemetry/common/telemetry");
const remoteCodeSearch_1 = require("./remoteCodeSearch");
exports.IAdoCodeSearchService = (0, instantiation_1.createDecorator)('IAdoCodeSearchService');
/**
 * Ado currently uses their own scoring system for embeddings.
 */
const adoCustomEmbeddingScoreType = new embeddingsComputer_1.EmbeddingType('adoCustomEmbeddingScore');
let AdoCodeSearchService = class AdoCodeSearchService extends lifecycle_1.Disposable {
    constructor(_authenticationService, _configurationService, _capiClientService, _envService, _logService, _fetcherService, _ignoreService, _telemetryService) {
        super();
        this._authenticationService = _authenticationService;
        this._configurationService = _configurationService;
        this._capiClientService = _capiClientService;
        this._envService = _envService;
        this._logService = _logService;
        this._fetcherService = _fetcherService;
        this._ignoreService = _ignoreService;
        this._telemetryService = _telemetryService;
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
    }
    getAdoAlmStatusUrl(repoId) {
        return `https://almsearch.dev.azure.com/${repoId.org}/${repoId.project}/_apis/search/semanticsearchstatus/${repoId.repo}?api-version=7.1-preview`;
    }
    getAdoAlmSearchUrl(repo) {
        return `https://almsearch.dev.azure.com/${repo.org}/${repo.project}/_apis/search/embeddings?api-version=7.1-preview`;
    }
    async getRemoteIndexState(auth, repoId, token) {
        return (0, logExecTime_1.measureExecTime)(() => this.getRemoteIndexStateImpl(auth, repoId, token), (execTime, status, result) => {
            /* __GDPR__
                "adoCodeSearch.getRemoteIndexState" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed remote index state requests",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "ok": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Details on successful calls" },
                    "err": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Details on failed calls" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('adoCodeSearch.getRemoteIndexState', {
                status,
                ok: result?.isOk() ? result.val.status : undefined,
                error: result?.isError() ? result.err.type : undefined,
            }, {
                execTime
            });
        });
    }
    async getRemoteIndexStateImpl(auth, repoId, token) {
        const authToken = await this.getAdoAuthToken(auth.silent);
        if (!authToken) {
            this._logService.error(`AdoCodeSearchService::getRemoteIndexState(${repoId}). Failed to fetch indexing status. No valid ADO auth token.`);
            return result_1.Result.error({ type: 'not-authorized' });
        }
        const endpoint = this.getAdoAlmStatusUrl(repoId);
        const additionalHeaders = {
            Accept: 'application/json',
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
            ...(0, chunkingEndpointClientImpl_1.getGithubMetadataHeaders)(new telemetryCorrelationId_1.CallTracker('AdoCodeSearchService::getRemoteIndexState'), this._envService)
        };
        const result = await (0, async_1.raceCancellationError)((0, networking_1.getRequest)(this._fetcherService, this._telemetryService, this._capiClientService, endpoint, authToken, undefined, 'copilot-panel', '', undefined, additionalHeaders, token), token);
        if (!result.ok) {
            /* __GDPR__
                "adoCodeSearch.getRemoteIndexState.requestError" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed remote index state requests",
                    "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('adoCodeSearch.getRemoteIndexState.requestError', {}, {
                statusCode: result.status,
            });
            // TODO: how can we tell the difference between no access to repo and semantic search not being enabled?
            return result_1.Result.error({ type: 'generic-error', error: new Error(`ADO code search index status request failed with status: ${result.status}`) });
        }
        const body = await result.json();
        if (!body.semanticSearchEnabled) {
            return result_1.Result.ok({
                status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.NotIndexable,
            });
        }
        const indexedCommit = body.indexedBranches.at(0)?.lastIndexedChangeId;
        return result_1.Result.ok({
            indexedCommit,
            status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready,
        });
    }
    async triggerIndexing(auth, _triggerReason, repoId, telemetryInfo) {
        // ADO doesn't support explicit indexing. Just use the status and assume it's always ready
        const status = await this.getRemoteIndexState(auth, repoId, cancellation_1.CancellationToken.None);
        if (status.isOk()) {
            return result_1.Result.ok(true);
        }
        return status;
    }
    async searchRepo(auth, repo, searchQuery, maxResults, options, telemetryInfo, token) {
        const totalSw = new stopwatch_1.StopWatch();
        const authToken = await this.getAdoAuthToken(auth.silent);
        if (!authToken) {
            this._logService.error(`AdoCodeSearchService::searchRepo(${repo.adoRepoId}). Failed to search repo. No valid ADO auth token.`);
            throw new Error('No valid auth token');
        }
        let endpoint = this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.WorkspacePrototypeAdoCodeSearchEndpointOverride);
        if (!endpoint) {
            endpoint = this.getAdoAlmSearchUrl(repo.adoRepoId);
        }
        const additionalHeaders = {
            Accept: 'application/json',
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
            ...(0, chunkingEndpointClientImpl_1.getGithubMetadataHeaders)(new telemetryCorrelationId_1.CallTracker('AdoCodeSearchService::searchRepo'), this._envService)
        };
        const requestSw = new stopwatch_1.StopWatch();
        const response = await (0, async_1.raceCancellationError)((0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, endpoint, authToken, undefined, 'copilot-panel', '', {
            // TODO: Unclear what's ADO's actual limit is
            prompt: searchQuery.slice(0, 10000),
            scoping_query: `repo:${repo.adoRepoId.project}/${repo.adoRepoId.repo}`,
            limit: maxResults,
        }, additionalHeaders, token), token);
        const requestExecTime = requestSw.elapsed();
        if (!response.ok) {
            /* __GDPR__
                "adoCodeSearch.searchRepo.error" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed code ado searches",
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The total time for the search call" },
                    "requestExecTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The request execution time" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('adoCodeSearch.searchRepo.error', {
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                statusCode: response.status,
                execTime: totalSw.elapsed(),
                requestExecTime: requestExecTime,
            });
            this._logService.trace(`AdoCodeSearchService::searchRepo: Failed. Status code: ${response.status}`);
            throw new Error(`Ado code search semantic search failed with status: ${response.status}`);
        }
        const body = await (0, async_1.raceCancellationError)(response.json(), token);
        if (!Array.isArray(body.results)) {
            throw new Error(`Code search semantic search unexpected response json shape`);
        }
        const rawResultCount = body.results.length;
        const returnedEmbeddingsType = body.embedding_model ? new embeddingsComputer_1.EmbeddingType(body.embedding_model) : adoCustomEmbeddingScoreType;
        const outChunks = [];
        let outOfSync = false;
        await Promise.all(body.results.map(async (result) => {
            let fileUri;
            if (repo.localRepoRoot) {
                fileUri = uri_1.URI.joinPath(repo.localRepoRoot, result.location.path.replace('%repo%/', ''));
                if (await this._ignoreService.isCopilotIgnored(fileUri)) {
                    return;
                }
            }
            else {
                // Non-local repo, make up a URI
                fileUri = uri_1.URI.from({
                    scheme: 'githubRepoResult',
                    path: '/' + result.location.path
                });
            }
            if (!(0, glob_1.shouldInclude)(fileUri, options.globPatterns)) {
                return;
            }
            outOfSync ||= !!repo.indexedCommit && result.location.commit_sha !== repo.indexedCommit;
            outChunks.push({
                chunk: {
                    file: fileUri,
                    text: (0, chunkingStringUtils_1.stripChunkTextMetadata)(result.chunk.text),
                    rawText: undefined,
                    range: new range_1.Range(result.chunk.line_range.start, 0, result.chunk.line_range.end, 0),
                    isFullFile: false, // TODO: not provided
                },
                distance: {
                    embeddingType: returnedEmbeddingsType,
                    value: result.distance,
                }
            });
        }));
        /* __GDPR__
            "adoCodeSearch.searchRepo.success" : {
                "owner": "mjbvz",
                "comment": "Information about successful ado code search searches",
                "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                "resultCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of returned chunks from the search after filtering" },
                "rawResultCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Original number of returned chunks from the search before filtering" },
                "resultOutOfSync": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Tracks if the commit we think code search has indexed matches the commit code search returns results from" },
                "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The total time for the search call" },
                "requestExecTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The request execution time" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('adoCodeSearch.searchRepo.success', {
            workspaceSearchSource: telemetryInfo.callTracker.toString(),
            workspaceSearchCorrelationId: telemetryInfo.correlationId,
        }, {
            resultCount: body.results.length,
            rawResultCount,
            resultOutOfSync: outOfSync ? 1 : 0,
            execTime: totalSw.elapsed(),
            requestExecTime: requestExecTime,
        });
        this._logService.trace(`AdoCodeSearchService::searchRepo: Returning ${outChunks.length} chunks. Raw result count: ${rawResultCount}`);
        return { chunks: outChunks, outOfSync };
    }
    getAdoAuthToken(silent) {
        return this._authenticationService.getAdoAccessTokenBase64({ silent });
    }
};
exports.AdoCodeSearchService = AdoCodeSearchService;
exports.AdoCodeSearchService = AdoCodeSearchService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, envService_1.IEnvService),
    __param(4, logService_1.ILogService),
    __param(5, fetcherService_1.IFetcherService),
    __param(6, ignoreService_1.IIgnoreService),
    __param(7, telemetry_1.ITelemetryService)
], AdoCodeSearchService);
//# sourceMappingURL=adoCodeSearchService.js.map