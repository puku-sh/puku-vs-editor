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
exports.GitRelatedFilesProvider = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const embeddingsComputer_1 = require("../../../platform/embeddings/common/embeddingsComputer");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const gitService_1 = require("../../../platform/git/common/gitService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const collections_1 = require("../../../util/vs/base/common/collections");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const resources_1 = require("../../../util/vs/base/common/resources");
let GitRelatedFilesProvider = class GitRelatedFilesProvider extends lifecycle_1.Disposable {
    constructor(_gitService, _fileSystemService, _embeddingsComputer, _workspaceService, _configurationService) {
        super();
        this._gitService = _gitService;
        this._fileSystemService = _fileSystemService;
        this._embeddingsComputer = _embeddingsComputer;
        this._workspaceService = _workspaceService;
        this._configurationService = _configurationService;
        this.cachedCommitsByRepositoryRoot = new map_1.ResourceMap();
        this.cachedCommitsWithEmbeddingsByRepositoryRoot = new map_1.ResourceMap();
        if (this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.GitHistoryRelatedFilesUsingEmbeddings)) {
            // Index the latest 200 commits in the background
            // TODO@joyceerhl reindex incrementally when repository state changes
            // TODO@joyceerhl use only the changes from main branch?
            this.cachePromise = this.indexRecentCommits(200);
            this._register(this._workspaceService.onDidChangeWorkspaceFolders(() => {
                // Reindex if a folder is added to or removed from the workspace
                this.cachePromise = this.indexRecentCommits(200);
            }));
        }
    }
    isEnabled() {
        return this._configurationService.getConfig(configurationService_1.ConfigKey.GitHistoryRelatedFilesProvider) === true;
    }
    async provideRelatedFiles(chatRequest, token) {
        if (!this.isEnabled()) {
            return;
        }
        if (chatRequest.files.length === 0 && !chatRequest.prompt) {
            return this.getChangedFiles();
        }
        // The user has not added any files to the working set, so we only have the prompt to go off of
        if (chatRequest.files.length === 0) {
            return this.getCommitsForPromptWithoutFiles(chatRequest, token);
        }
        if (this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.GitHistoryRelatedFilesUsingEmbeddings)) {
            return this.computeRelevantCommits(chatRequest, token);
        }
        return [...this.getChangedFiles(), ...await this.computeRelevantFiles(chatRequest)];
    }
    getChangedFiles() {
        const changes = [];
        for (const repository of this._gitService.repositories) {
            if (!repository.changes) {
                continue;
            }
            changes.push(...repository.changes.indexChanges.map(c => ({ uri: c.uri, description: l10n.t('Git staged file') })), ...repository.changes.untrackedChanges.map(c => ({ uri: c.uri, description: l10n.t('Git untracked file') })), ...repository.changes.workingTree.map(c => ({ uri: c.uri, description: l10n.t('Git working tree file') })));
        }
        return changes;
    }
    async getCommitsForPromptWithoutFiles(chatRequest, token) {
        if (chatRequest.prompt === '' || !this.cachePromise) {
            return undefined;
        }
        await this.cachePromise;
        // Calculate the embedding of the prompt
        // TODO@joyceerhl do local semantic search instead?
        const result = await this.computeCommitMessageEmbeddings([], chatRequest.prompt, token);
        if (!result) {
            return undefined;
        }
        // Do a semantic similarity search by query over the indexed commit messages
        const cachedCommits = [];
        for (const repo of this.cachedCommitsWithEmbeddingsByRepositoryRoot.values()) {
            cachedCommits.push(...repo.values());
        }
        const ranked = (0, embeddingsComputer_1.rankEmbeddings)(result.promptEmbedding, cachedCommits, cachedCommits.length);
        const rerankedCommits = ranked.map((r) => r.value);
        // Suggest 10 files at most
        return this.getRelevantFilesFromCommits(rerankedCommits, chatRequest.files, 10);
    }
    getRelevantFilesFromCommits(commits, workingSetFiles, limit) {
        const relatedFiles = [];
        const files = new map_1.ResourceSet();
        for (const file of commits.map((c) => c.changedFiles).flat()) {
            if (files.has(file.uri) || workingSetFiles.find((f) => (0, resources_1.isEqual)(f, file.uri))) {
                continue;
            }
            files.add(file.uri);
            relatedFiles.push(file);
            if (files.size >= limit) {
                break;
            }
        }
        return relatedFiles;
    }
    async computeCommitMessageEmbeddings(commits, prompt, token) {
        // Separate the commits into ones that we already have cached embeddings for and ones we need to compute embeddings for
        const commitsToComputeEmbeddingsFor = [];
        const cachedCommitsWithEmbeddings = [];
        for (const commit of commits) {
            const cached = this.getCachedCommitWithEmbedding(commit.repositoryRoot, commit.commit);
            if (cached) {
                cachedCommitsWithEmbeddings.push(cached);
            }
            else {
                commitsToComputeEmbeddingsFor.push(commit);
            }
        }
        // Calculate the embeddings for the commits we don't have cached embeddings for
        const commitMessages = commitsToComputeEmbeddingsFor.map((commit) => commit.commit.message);
        const text = prompt ? [prompt, ...commitMessages] : commitMessages;
        const result = await this._embeddingsComputer.computeEmbeddings(embeddingsComputer_1.EmbeddingType.text3small_512, text, {}, new telemetryCorrelationId_1.TelemetryCorrelationId('GitRelatedFilesProvider::computeCommitMessageEmbeddings'), token);
        const embeddings = result.values;
        const promptEmbedding = prompt ? embeddings[0] : undefined;
        const commitEmbeddings = prompt ? embeddings.slice(1) : embeddings;
        // Merge the embeddings we just calculated with the cached ones
        const commitsWithEmbeddings = cachedCommitsWithEmbeddings;
        for (let i = 0; i < commitMessages.length; i++) {
            const commit = commits[i];
            const embedding = commitEmbeddings[i];
            // Add the embeddings we just calculated to the cache
            const repoMap = this.cachedCommitsWithEmbeddingsByRepositoryRoot.get(commit.repositoryRoot) ?? new Map();
            repoMap.set(commit.commit.hash, [commit, embedding]);
            this.cachedCommitsWithEmbeddingsByRepositoryRoot.set(commit.repositoryRoot, repoMap);
            // Add them to the result
            commitsWithEmbeddings.push([commit, embedding]);
        }
        return {
            promptEmbedding,
            commitsWithEmbeddings
        };
    }
    getCachedCommitWithEmbedding(repositoryRoot, commit) {
        const repoMap = this.cachedCommitsWithEmbeddingsByRepositoryRoot.get(repositoryRoot);
        return repoMap?.get(commit.hash);
    }
    async computeRelevantFiles(chatRequest) {
        const commitsModifyingRequestFiles = await Promise.all(chatRequest.files.map((uri) => this._gitService.log(uri, { path: uri.fsPath }).then(commits => ({ uri, commits }))));
        // KEY: a potentially relevant file file
        // VALUE: resource map from working set file URI to commits that coedited it
        const candidateFiles = new map_1.ResourceMap();
        const seenCommits = new Set();
        // For each of the files in the chat request, look up all the files that were modified with it in the same commit
        for (const { uri, commits } of commitsModifyingRequestFiles) {
            if (!commits) {
                continue;
            }
            for (const commit of commits) {
                // Don't process the same commit twice
                if (seenCommits.has(commit.hash)) {
                    continue;
                }
                seenCommits.add(commit.hash);
                const repository = await this._gitService.getRepository(uri);
                const repositoryRoot = repository?.rootUri;
                if (!repositoryRoot) { // Shouldn't happen
                    continue;
                }
                const commitWithChanges = await this.getCommitWithChanges(commit, repositoryRoot, uri, chatRequest);
                for (const changedFile of commitWithChanges.changedFiles) {
                    if (!(0, resources_1.isEqual)(uri, changedFile.uri)) {
                        // Add to the existing set of working set files for this candidate related file
                        const workingSetFiles = candidateFiles.get(changedFile.uri) ?? new map_1.ResourceMap();
                        // Add the commit to the set of commits that coedited this file
                        const commitsForWorkingSetFile = workingSetFiles.get(uri) ?? new collections_1.SetWithKey([], (c) => c.hash);
                        commitsForWorkingSetFile.add(commit);
                        workingSetFiles.set(uri, commitsForWorkingSetFile);
                        candidateFiles.set(changedFile.uri, workingSetFiles);
                    }
                }
            }
        }
        // Sort the candidate files by the number of associated working set files and the frequency with which this file was edited with the working set files
        const files = [];
        for (const [candidateFile, coeditedFiles] of candidateFiles) {
            const coeditedCommits = new collections_1.SetWithKey([], (c) => c.hash);
            for (const commits of coeditedFiles.values()) {
                for (const commit of commits) {
                    coeditedCommits.add(commit);
                }
            }
            const associatedWorkingSetFiles = new map_1.ResourceSet([...coeditedFiles.keys()]);
            files.push({ uri: candidateFile, associatedWorkingSetFiles, coeditingCommits: coeditedCommits });
        }
        const sortedFiles = files.sort((a, b) => (b.associatedWorkingSetFiles.size + b.coeditingCommits.size) - (a.associatedWorkingSetFiles.size + a.coeditingCommits.size));
        return sortedFiles.slice(0, 10).map((f) => {
            const fileBasename = (0, resources_1.basename)([...f.associatedWorkingSetFiles.values()][0]);
            return {
                uri: f.uri, description: f.associatedWorkingSetFiles.size === 1
                    ? l10n.t('Often edited with {0}', fileBasename)
                    : l10n.t('Often edited with {0} and {1} other files in your working set', fileBasename, f.associatedWorkingSetFiles.size)
            };
        });
    }
    // Look for all commits that touch the files in this request and rank their relevance to the prompt using
    // embeddings and the overlap between the commit's changelist and the working set contents
    async computeRelevantCommits(chatRequest, token) {
        await this.cachePromise;
        const commitsModifyingRequestFiles = await Promise.all(chatRequest.files.map((uri) => this._gitService.log(uri, { path: uri.fsPath }).then(commits => ({ uri, commits }))));
        const seenCommits = new Set();
        const commitsWithChanges = [];
        for (const { uri, commits } of commitsModifyingRequestFiles) {
            if (!commits) {
                continue;
            }
            for (const commit of commits) {
                if (seenCommits.has(commit.hash)) {
                    continue;
                }
                seenCommits.add(commit.hash);
                const repository = await this._gitService.getRepository(uri);
                const repositoryRoot = repository?.rootUri;
                if (!repositoryRoot) { // Shouldn't happen
                    continue;
                }
                // Skip potentially expensive git log if we already have the commit in the cache
                const cachedCommit = this.getCachedCommitWithEmbedding(repositoryRoot, commit);
                if (!cachedCommit) {
                    const commitWithChanges = await this.getCommitWithChanges(commit, repositoryRoot, uri, chatRequest);
                    commitsWithChanges.push(commitWithChanges);
                }
                else {
                    commitsWithChanges.push(cachedCommit[0]);
                }
            }
        }
        // We want to prioritize commits that modify multiple files from the request
        // Note, overlap should always be at least 1 since this came from a git log over the attached files
        const sortedCommits = commitsWithChanges
            .sort((a, b) => b.overlap - a.overlap);
        // TODO@joyceerhl what if one of the working set files isn't present in a commit that is otherwise highly relevant based on commit message?
        const commitsWithLargestOverlap = sortedCommits.filter((commit) => commit.overlap === sortedCommits[0].overlap);
        // Break ties by reranking based on commit messages which seem most relevant to the request
        const rerankedCommits = await this.rankCommitsByMessageRelevance(chatRequest, commitsWithLargestOverlap, token);
        // Suggest 10 files at most
        return this.getRelevantFilesFromCommits(rerankedCommits, chatRequest.files, 10);
    }
    async rankCommitsByMessageRelevance(chatRequest, commits, token) {
        if (chatRequest.prompt === '') {
            return commits;
        }
        const result = await this.computeCommitMessageEmbeddings(commits, chatRequest.prompt, token);
        if (!result) {
            return commits;
        }
        const { promptEmbedding, commitsWithEmbeddings } = result;
        const ranked = (0, embeddingsComputer_1.rankEmbeddings)(promptEmbedding, commitsWithEmbeddings, commits.length);
        return ranked.map((r) => r.value);
    }
    cacheAndReturnCommit(commitWithChanges) {
        let repoMap = this.cachedCommitsByRepositoryRoot.get(commitWithChanges.repositoryRoot);
        if (!repoMap) {
            repoMap = new Map();
            this.cachedCommitsByRepositoryRoot.set(commitWithChanges.repositoryRoot, repoMap);
        }
        repoMap.set(commitWithChanges.commit.hash, commitWithChanges);
        return commitWithChanges;
    }
    async getCommitWithChanges(commit, repositoryRoot, fileUri, chatRequest) {
        const cachedCommit = this.cachedCommitsByRepositoryRoot.get(repositoryRoot)?.get(commit.hash);
        if (cachedCommit) {
            return cachedCommit;
        }
        const filesChangedInCommit = new map_1.ResourceSet();
        const parentCommit = commit.parents[0];
        if (!parentCommit) {
            // This is the first commit in the history
            // TODO@joyceerhl Git extension needs to expose Repository#getEmptyTree
            return this.cacheAndReturnCommit({ commit, repositoryRoot, overlap: 0, changedFiles: [] });
        }
        const changes = await this._gitService.diffBetween(fileUri ?? repositoryRoot, parentCommit, commit.hash);
        if (!changes) {
            // Empty commit
            return this.cacheAndReturnCommit({ commit, repositoryRoot, overlap: 0, changedFiles: [] });
        }
        const changedFiles = [];
        for (const change of changes) {
            try {
                // Make sure the file still exists, it could have been deleted in a later commit
                await this._fileSystemService.stat(change.uri);
                filesChangedInCommit.add(change.uri);
                changedFiles.push({
                    uri: change.uri,
                    description: l10n.t('Previously edited together in related Git commit {0} ("{1}")', commit.hash.substring(0, 8), commit.message.split('\n')[0])
                });
            }
            catch { }
        }
        const overlap = chatRequest ? (0, collections_1.intersection)(filesChangedInCommit, chatRequest.files).size : 0;
        return this.cacheAndReturnCommit({ commit, repositoryRoot, overlap, changedFiles });
    }
    async indexRecentCommits(limit) {
        if (!this.isEnabled()) {
            return;
        }
        await this._gitService.initialize();
        const repositories = new map_1.ResourceSet();
        for (const folder of this._workspaceService.getWorkspaceFolders()) {
            const repository = await this._gitService.getRepository(folder);
            if (repository) {
                repositories.add(repository.rootUri);
            }
        }
        for (const repositoryRoot of repositories) {
            let repoMap = this.cachedCommitsWithEmbeddingsByRepositoryRoot.get(repositoryRoot);
            if (repoMap) {
                continue;
            }
            repoMap = new Map();
            this.cachedCommitsWithEmbeddingsByRepositoryRoot.set(repositoryRoot, repoMap); // Record that we already tried to index commits in this repo
            const commits = await this._gitService.log(repositoryRoot, { maxEntries: Math.round(limit / repositories.size) });
            if (!commits) {
                continue;
            }
            // Get changes
            const commitsWithChanges = await Promise.all(commits.map((commit) => this.getCommitWithChanges(commit, repositoryRoot)));
            // Get embeddings for commit messages
            const res = await this.computeCommitMessageEmbeddings(commitsWithChanges, undefined);
            if (res) {
                for (const commit of res.commitsWithEmbeddings) {
                    repoMap.set(commit[0].commit.hash, commit);
                }
                this.cachedCommitsWithEmbeddingsByRepositoryRoot.set(repositoryRoot, repoMap);
            }
        }
    }
};
exports.GitRelatedFilesProvider = GitRelatedFilesProvider;
exports.GitRelatedFilesProvider = GitRelatedFilesProvider = __decorate([
    __param(0, gitService_1.IGitService),
    __param(1, fileSystemService_1.IFileSystemService),
    __param(2, embeddingsComputer_1.IEmbeddingsComputer),
    __param(3, workspaceService_1.IWorkspaceService),
    __param(4, configurationService_1.IConfigurationService)
], GitRelatedFilesProvider);
//# sourceMappingURL=gitRelatedFilesProvider.js.map