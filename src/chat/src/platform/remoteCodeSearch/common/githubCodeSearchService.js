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
exports.GithubCodeSearchService = exports.IGithubCodeSearchService = void 0;
exports.parseGithubCodeSearchResponse = parseGithubCodeSearchResponse;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const pukuRequestTypes_1 = require("../../api/common/pukuRequestTypes");
const crypto_1 = require("../../../util/common/crypto");
const glob_1 = require("../../../util/common/glob");
const result_1 = require("../../../util/common/result");
const async_1 = require("../../../util/vs/base/common/async");
const errors_1 = require("../../../util/vs/base/common/errors");
const process_1 = require("../../../util/vs/base/common/process");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const authentication_1 = require("../../authentication/common/authentication");
const chunkingEndpointClientImpl_1 = require("../../chunking/common/chunkingEndpointClientImpl");
const chunkingStringUtils_1 = require("../../chunking/common/chunkingStringUtils");
const embeddingsComputer_1 = require("../../embeddings/common/embeddingsComputer");
const capiClient_1 = require("../../endpoint/common/capiClient");
const envService_1 = require("../../env/common/envService");
const gitService_1 = require("../../git/common/gitService");
const ignoreService_1 = require("../../ignore/common/ignoreService");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const networking_1 = require("../../networking/common/networking");
const telemetry_1 = require("../../telemetry/common/telemetry");
const remoteCodeSearch_1 = require("./remoteCodeSearch");
exports.IGithubCodeSearchService = (0, instantiation_1.createDecorator)('IGithubCodeSearchService');
let GithubCodeSearchService = class GithubCodeSearchService {
    constructor(_authenticationService, _capiClientService, _envService, _fetcherService, _ignoreService, _logService, _telemetryService) {
        this._authenticationService = _authenticationService;
        this._capiClientService = _capiClientService;
        this._envService = _envService;
        this._fetcherService = _fetcherService;
        this._ignoreService = _ignoreService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
    }
    async getRemoteIndexState(auth, githubRepoId, token) {
        const repoNwo = (0, gitService_1.toGithubNwo)(githubRepoId);
        if (repoNwo.startsWith('microsoft/simuluation-test-')) {
            return result_1.Result.ok({ status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.NotYetIndexed });
        }
        const authToken = await this.getGithubAccessToken(auth.silent);
        if (!authToken) {
            this._logService.error(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Failed to fetch indexing status. No valid github auth token.`);
            return result_1.Result.error({ type: 'not-authorized' });
        }
        try {
            const statusRequest = await (0, async_1.raceCancellationError)(this._capiClientService.makeRequest({
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                }
            }, { type: pukuRequestTypes_1.RequestType.EmbeddingsIndex, repoWithOwner: repoNwo }), token);
            if (!statusRequest.ok) {
                /* __GDPR__
                    "githubCodeSearch.getRemoteIndexState.error" : {
                        "owner": "mjbvz",
                        "comment": "Information about failed remote index state requests",
                        "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('githubCodeSearch.getRemoteIndexState.error', {}, {
                    statusCode: statusRequest.status,
                });
                this._logService.error(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Failed to fetch indexing status. Response: ${statusRequest.status}. ${await statusRequest.text()}`);
                return result_1.Result.error({ type: 'generic-error', error: new Error(`Failed to fetch indexing status. Response: ${statusRequest.status}.`) });
            }
            const preCheckResult = await (0, async_1.raceCancellationError)(statusRequest.json(), token);
            if (preCheckResult.semantic_code_search_ok && preCheckResult.semantic_commit_sha) {
                const indexedCommit = preCheckResult.semantic_commit_sha;
                this._logService.trace(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Found indexed commit: ${indexedCommit}.`);
                return result_1.Result.ok({
                    status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready,
                    indexedCommit,
                });
            }
            if (preCheckResult.semantic_indexing_enabled) {
                if (await (0, async_1.raceCancellationError)(this.isEmptyRepo(authToken, githubRepoId, token), token)) {
                    this._logService.trace(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Semantic indexing enabled but repo is empty.`);
                    return result_1.Result.ok({
                        status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready,
                        indexedCommit: undefined
                    });
                }
                this._logService.trace(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Semantic indexing enabled but not yet indexed.`);
                return result_1.Result.ok({ status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.BuildingIndex });
            }
            else {
                this._logService.trace(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). semantic_indexing_enabled was false. Repo not yet indexed but possibly can be.`);
                return result_1.Result.ok({ status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.NotYetIndexed });
            }
        }
        catch (e) {
            if ((0, errors_1.isCancellationError)(e)) {
                throw e;
            }
            this._logService.error(`GithubCodeSearchService::getRemoteIndexState(${repoNwo}). Error: ${e}`);
            return result_1.Result.error({ type: 'generic-error', error: e instanceof Error ? e : new Error(String(e)) });
        }
    }
    async triggerIndexing(auth, triggerReason, githubRepoId, telemetryInfo) {
        const authToken = await this.getGithubAccessToken(auth.silent);
        if (!authToken) {
            return result_1.Result.error({ type: 'not-authorized' });
        }
        const response = await this._capiClientService.makeRequest({
            method: 'POST',
            headers: {
                Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
                auto: triggerReason === 'auto',
            })
        }, { type: pukuRequestTypes_1.RequestType.EmbeddingsIndex, repoWithOwner: (0, gitService_1.toGithubNwo)(githubRepoId) });
        if (!response.ok) {
            this._logService.error(`GithubCodeSearchService.triggerIndexing(${triggerReason}). Failed to request indexing for '${githubRepoId}'. Response: ${response.status}. ${await response.text()}`);
            /* __GDPR__
                "githubCodeSearch.triggerIndexing.error" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed trigger indexing requests",
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "triggerReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Reason why the indexing was triggered" },
                    "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('githubCodeSearch.triggerIndexing.error', {
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
                triggerReason
            }, {
                statusCode: response.status,
            });
            return result_1.Result.error({ type: 'generic-error', error: new Error(`Failed to request indexing for '${githubRepoId}'. Response: ${response.status}.`) });
        }
        /* __GDPR__
            "githubCodeSearch.getRemoteIndexState.success" : {
                "owner": "mjbvz",
                "comment": "Information about failed remote index state requests",
                "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                "triggerReason": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Reason why the indexing was triggered" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('githubCodeSearch.getRemoteIndexState.success', {
            workspaceSearchSource: telemetryInfo.callTracker.toString(),
            workspaceSearchCorrelationId: telemetryInfo.correlationId,
            triggerReason,
        }, {});
        return result_1.Result.ok(true);
    }
    async searchRepo(auth, embeddingType, repo, searchQuery, maxResults, options, telemetryInfo, token) {
        const authToken = await this.getGithubAccessToken(auth.silent);
        if (!authToken) {
            throw new Error('No valid auth token');
        }
        const response = await (0, async_1.raceCancellationError)((0, networking_1.postRequest)(this._fetcherService, this._telemetryService, this._capiClientService, { type: pukuRequestTypes_1.RequestType.EmbeddingsCodeSearch }, authToken, await (0, crypto_1.createRequestHMAC)(process_1.env.HMAC_SECRET), 'copilot-panel', '', {
            scoping_query: `repo:${(0, gitService_1.toGithubNwo)(repo.githubRepoId)}`,
            // The semantic search endpoint only supports prompts of up to 8k bytes (in utf8)
            // For now just truncate but we should consider a better way to handle this, such as having a model
            // generate a short prompt
            prompt: (0, chunkingStringUtils_1.truncateToMaxUtf8Length)(searchQuery, 7800),
            include_embeddings: false,
            limit: maxResults,
            embedding_model: embeddingType.id,
        }, (0, chunkingEndpointClientImpl_1.getGithubMetadataHeaders)(telemetryInfo.callTracker, this._envService), token), token);
        if (!response.ok) {
            /* __GDPR__
                "githubCodeSearch.searchRepo.error" : {
                    "owner": "mjbvz",
                    "comment": "Information about failed code searches",
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "statusCode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The response status code" }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('githubCodeSearch.searchRepo.error', {
                workspaceSearchSource: telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: telemetryInfo.correlationId,
            }, {
                statusCode: response.status,
            });
            throw new Error(`Code search semantic search failed with status: ${response.status}`);
        }
        const body = await (0, async_1.raceCancellationError)(response.json(), token);
        if (!Array.isArray(body.results)) {
            throw new Error(`Code search semantic search unexpected response json shape`);
        }
        const result = await (0, async_1.raceCancellationError)(parseGithubCodeSearchResponse(body, repo, options, this._ignoreService), token);
        /* __GDPR__
            "githubCodeSearch.searchRepo.success" : {
                "owner": "mjbvz",
                "comment": "Information about successful code searches",
                "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                "resultCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of returned chunks from the search" },
                "resultOutOfSync": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Tracks if the commit we think code search has indexed matches the commit code search returns results from" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('githubCodeSearch.searchRepo.success', {
            workspaceSearchSource: telemetryInfo.callTracker.toString(),
            workspaceSearchCorrelationId: telemetryInfo.correlationId,
        }, {
            resultCount: body.results.length,
            resultOutOfSync: result.outOfSync ? 1 : 0,
        });
        return result;
    }
    async getGithubAccessToken(silent) {
        return (await this._authenticationService.getPermissiveGitHubSession({ silent }))?.accessToken
            ?? (await this._authenticationService.getAnyGitHubSession({ silent }))?.accessToken;
    }
    async isEmptyRepo(authToken, githubRepoId, token) {
        const response = await (0, async_1.raceCancellationError)(fetch(this._capiClientService.dotcomAPIURL + `/repos/${(0, gitService_1.toGithubNwo)(githubRepoId)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        }), token);
        if (!response.ok) {
            this._logService.error(`GithubCodeSearchService.isEmptyRepo(${(0, gitService_1.toGithubNwo)(githubRepoId)}). Failed to fetch repo info. Response: ${response.status}. ${await response.text()}`);
            return false;
        }
        const data = await response.json();
        // Check multiple indicators of an empty repo:
        // - size of 0 indicates no content
        // - missing default_branch often means no commits
        return data.size === 0 || !data.default_branch;
    }
};
exports.GithubCodeSearchService = GithubCodeSearchService;
exports.GithubCodeSearchService = GithubCodeSearchService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, envService_1.IEnvService),
    __param(3, fetcherService_1.IFetcherService),
    __param(4, ignoreService_1.IIgnoreService),
    __param(5, logService_1.ILogService),
    __param(6, telemetry_1.ITelemetryService)
], GithubCodeSearchService);
async function parseGithubCodeSearchResponse(body, repo, options, ignoreService) {
    let outOfSync = false;
    const outChunks = [];
    const embeddingsType = new embeddingsComputer_1.EmbeddingType(body.embedding_model);
    await Promise.all(body.results.map(async (result) => {
        if (!options.skipVerifyRepo && result.location.repo.nwo.toLowerCase() !== (0, gitService_1.toGithubNwo)(repo.githubRepoId)) {
            return;
        }
        let fileUri;
        if (repo.localRepoRoot) {
            fileUri = uri_1.URI.joinPath(repo.localRepoRoot, result.location.path);
            if (await ignoreService.isCopilotIgnored(fileUri)) {
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
                isFullFile: false, // TODO: get this from github
            },
            distance: {
                embeddingType: embeddingsType,
                value: result.distance,
            }
        });
    }));
    return { chunks: outChunks, outOfSync };
}
//# sourceMappingURL=githubCodeSearchService.js.map