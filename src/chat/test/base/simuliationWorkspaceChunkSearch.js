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
exports.SimulationCodeSearchChunkSearchService = void 0;
const embeddingsComputer_1 = require("../../src/platform/embeddings/common/embeddingsComputer");
const gitService_1 = require("../../src/platform/git/common/gitService");
const ignoreService_1 = require("../../src/platform/ignore/common/ignoreService");
const logService_1 = require("../../src/platform/log/common/logService");
const githubCodeSearchService_1 = require("../../src/platform/remoteCodeSearch/common/githubCodeSearchService");
const remoteCodeSearch_1 = require("../../src/platform/remoteCodeSearch/common/remoteCodeSearch");
const fullWorkspaceChunkSearch_1 = require("../../src/platform/workspaceChunkSearch/node/fullWorkspaceChunkSearch");
const result_1 = require("../../src/util/common/result");
const event_1 = require("../../src/util/vs/base/common/event");
const lifecycle_1 = require("../../src/util/vs/base/common/lifecycle");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const searchEndpoint = 'http://localhost:4443/api/embeddings/code/search';
let SimulationGithubCodeSearchService = class SimulationGithubCodeSearchService extends lifecycle_1.Disposable {
    constructor(_ignoreService, _logService) {
        super();
        this._ignoreService = _ignoreService;
        this._logService = _logService;
    }
    async searchRepo(authOptions, embeddingType, repo, query, maxResults, options, _telemetryInfo, token) {
        this._logService.trace(`SimulationGithubCodeSearchService::searchRepo(${repo.githubRepoId}, ${query})`);
        const response = await fetch(searchEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                scoping_query: `repo:msbench/workspace`,
                prompt: query,
                limit: maxResults
            })
        });
        if (!response.ok) {
            this._logService.trace(`SimulationGithubCodeSearchService::searchRepo(${repo.githubRepoId}, ${query}) failed. status: ${response.status}`);
            const body = await response.text();
            throw new Error(`Error fetching index status: ${response.status} - ${body}`);
        }
        const json = await response.json();
        const result = await (0, githubCodeSearchService_1.parseGithubCodeSearchResponse)(json, repo, { ...options, skipVerifyRepo: true }, this._ignoreService);
        this._logService.trace(`SimulationGithubCodeSearchService::searchRepo(${repo.githubRepoId}, ${query}) success. Found ${result.chunks.length} chunks`);
        return result;
    }
    async getRemoteIndexState(authOptions, githubRepoId, token) {
        return result_1.Result.ok({ status: remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready, indexedCommit: 'HEAD' });
    }
    triggerIndexing(authOptions, triggerReason, githubRepoId) {
        throw new Error('Method not implemented.');
    }
};
SimulationGithubCodeSearchService = __decorate([
    __param(0, ignoreService_1.IIgnoreService),
    __param(1, logService_1.ILogService)
], SimulationGithubCodeSearchService);
let SimulationCodeSearchChunkSearchService = class SimulationCodeSearchChunkSearchService extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        this.onDidChangeIndexState = event_1.Event.None;
        this._fullworkspaceChunkSearch = instantiationService.createInstance(fullWorkspaceChunkSearch_1.FullWorkspaceChunkSearch);
        this._githubCodeSearchService = instantiationService.createInstance(SimulationGithubCodeSearchService);
    }
    getIndexState() {
        throw new Error('Method not implemented.');
    }
    async hasFastSearch(_sizing) {
        return true;
    }
    async searchFileChunks(sizing, query, options, telemetryInfo, progress, token) {
        const fullResults = await this._fullworkspaceChunkSearch.searchWorkspace({
            endpoint: sizing.endpoint,
            tokenBudget: sizing.tokenBudget,
            fullWorkspaceTokenBudget: sizing.fullWorkspaceTokenBudget,
            maxResultCountHint: sizing.maxResults ?? 128
        }, query, options, telemetryInfo, token);
        if (fullResults) {
            return {
                chunks: fullResults.chunks,
                isFullWorkspace: true
            };
        }
        const repo = new gitService_1.GithubRepoId('test-org', 'test-repo');
        try {
            const results = await this._githubCodeSearchService.searchRepo({ silent: true }, embeddingsComputer_1.EmbeddingType.text3small_512, {
                githubRepoId: repo,
                indexedCommit: undefined,
                localRepoRoot: undefined,
            }, await query.resolveQuery(token), sizing.maxResults ?? 128, options, telemetryInfo, token);
            return {
                chunks: results.chunks,
                isFullWorkspace: false
            };
        }
        catch (error) {
            console.error('Error searching repo:', error);
        }
        return {
            chunks: [],
            isFullWorkspace: false
        };
    }
    triggerLocalIndexing(trigger) {
        throw new Error('Method not implemented.');
    }
    triggerRemoteIndexing(trigger) {
        throw new Error('Method not implemented.');
    }
};
exports.SimulationCodeSearchChunkSearchService = SimulationCodeSearchChunkSearchService;
exports.SimulationCodeSearchChunkSearchService = SimulationCodeSearchChunkSearchService = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], SimulationCodeSearchChunkSearchService);
//# sourceMappingURL=simuliationWorkspaceChunkSearch.js.map