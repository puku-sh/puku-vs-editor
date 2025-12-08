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
var GitServiceImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepoContextImpl = exports.GitServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const async_1 = require("../../../util/common/async");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const cache_1 = require("../../../util/vs/base/common/cache");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const logService_1 = require("../../log/common/logService");
const gitExtensionService_1 = require("../common/gitExtensionService");
const utils_1 = require("../common/utils");
let GitServiceImpl = GitServiceImpl_1 = class GitServiceImpl extends lifecycle_1.Disposable {
    constructor(gitExtensionService, logService) {
        super();
        this.gitExtensionService = gitExtensionService;
        this.logService = logService;
        this.activeRepository = (0, observableInternal_1.observableValue)(this, undefined);
        this._onDidOpenRepository = new event_1.Emitter();
        this.onDidOpenRepository = this._onDidOpenRepository.event;
        this._onDidCloseRepository = new event_1.Emitter();
        this.onDidCloseRepository = this._onDidCloseRepository.event;
        this._onDidFinishInitialRepositoryDiscovery = new event_1.Emitter();
        this.onDidFinishInitialization = this._onDidFinishInitialRepositoryDiscovery.event;
        this._isInitialized = (0, observableInternal_1.observableValue)(this, false);
        this._register(this._onDidOpenRepository);
        this._register(this._onDidCloseRepository);
        this._register(this._onDidFinishInitialRepositoryDiscovery);
        const gitAPI = this.gitExtensionService.getExtensionApi();
        if (gitAPI) {
            this.registerGitAPIListeners(gitAPI);
        }
        else {
            this._register(this.gitExtensionService.onDidChange((status) => {
                if (status.enabled) {
                    const gitAPI = this.gitExtensionService.getExtensionApi();
                    if (gitAPI) {
                        this.registerGitAPIListeners(gitAPI);
                        return;
                    }
                }
                // Extension is disabled / git is not available so we say all repositories are discovered
                this._onDidFinishInitialRepositoryDiscovery.fire();
            }));
        }
    }
    registerGitAPIListeners(gitAPI) {
        this._register(gitAPI.onDidOpenRepository(repository => this.doOpenRepository(repository)));
        this._register(gitAPI.onDidCloseRepository(repository => this.doCloseRepository(repository)));
        for (const repository of gitAPI.repositories) {
            this.doOpenRepository(repository);
        }
        // Initial repository discovery
        const stateObs = (0, observableInternal_1.observableFromEvent)(this, gitAPI.onDidChangeState, () => gitAPI.state);
        this._register((0, observableInternal_1.autorun)(async (reader) => {
            const state = stateObs.read(reader);
            if (state !== 'initialized') {
                return;
            }
            // Wait for all discovered repositories to be initialized
            await Promise.all(gitAPI.repositories.map(repository => {
                const HEAD = (0, observableInternal_1.observableFromEvent)(this, repository.state.onDidChange, () => repository.state.HEAD);
                return (0, observableInternal_1.waitForState)(HEAD, state => state !== undefined, undefined, (0, cancellation_1.cancelOnDispose)(this._store));
            }));
            this._isInitialized.set(true, undefined);
            this._onDidFinishInitialRepositoryDiscovery.fire();
            this.logService.trace(`[GitServiceImpl] Initial repository discovery finished: ${this.repositories.length} repositories found.`);
        }));
    }
    get isInitialized() {
        return this._isInitialized.get();
    }
    async getRepository(uri) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        if (!gitAPI) {
            return undefined;
        }
        if (!(uri instanceof vscode.Uri)) {
            // The git extension API expects a vscode.Uri, so we convert it if necessary
            uri = vscode.Uri.parse(uri.toString());
        }
        // Query opened repositories
        let repository = gitAPI.getRepository(uri);
        if (repository) {
            await this.waitForRepositoryState(repository);
            return GitServiceImpl_1.repoToRepoContext(repository);
        }
        // Open repository
        repository = await gitAPI.openRepository(uri);
        if (!repository) {
            return undefined;
        }
        await this.waitForRepositoryState(repository);
        return GitServiceImpl_1.repoToRepoContext(repository);
    }
    async getRepositoryFetchUrls(uri) {
        this.logService.trace(`[GitServiceImpl][getRepositoryFetchUrls] URI: ${uri.toString()}`);
        const gitAPI = this.gitExtensionService.getExtensionApi();
        if (!gitAPI) {
            return undefined;
        }
        // Query opened repositories
        const repository = gitAPI.getRepository(uri);
        if (repository) {
            await this.waitForRepositoryState(repository);
            const remotes = {
                rootUri: repository.rootUri,
                remoteFetchUrls: repository.state.remotes.map(r => r.fetchUrl),
            };
            this.logService.trace(`[GitServiceImpl][getRepositoryFetchUrls] Remotes (open repository): ${JSON.stringify(remotes)}`);
            return remotes;
        }
        try {
            const uriStat = await vscode.workspace.fs.stat(uri);
            if (uriStat.type !== vscode.FileType.Directory) {
                uri = uri_1.URI.file(path.dirname(uri.fsPath));
            }
            // Get repository root
            const repositoryRoot = await gitAPI.getRepositoryRoot(uri);
            if (!repositoryRoot) {
                this.logService.trace(`[GitServiceImpl][getRepositoryFetchUrls] No repository root found`);
                return undefined;
            }
            this.logService.trace(`[GitServiceImpl][getRepositoryFetchUrls] Repository root: ${repositoryRoot.toString()}`);
            const buffer = await vscode.workspace.fs.readFile(uri_1.URI.file(path.join(repositoryRoot.fsPath, '.git', 'config')));
            const remotes = {
                rootUri: repositoryRoot,
                remoteFetchUrls: (0, utils_1.parseGitRemotes)(buffer.toString()).map(remote => remote.fetchUrl)
            };
            this.logService.trace(`[GitServiceImpl][getRepositoryFetchUrls] Remotes (.git/config): ${JSON.stringify(remotes)}`);
            return remotes;
        }
        catch (error) {
            this.logService.error(`[GitServiceImpl][getRepositoryFetchUrls] Failed to read remotes from .git/config: ${error.message}`);
            return undefined;
        }
    }
    async add(uri, paths) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        await repository?.add(paths);
    }
    async log(uri, options) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        if (!gitAPI) {
            return undefined;
        }
        const repository = gitAPI.getRepository(uri);
        if (!repository) {
            return undefined;
        }
        return repository.log(options);
    }
    async diffBetween(uri, ref1, ref2) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        return repository?.diffBetween(ref1, ref2);
    }
    async diffWith(uri, ref) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        return repository?.diffWith(ref);
    }
    async diffIndexWithHEADShortStats(uri) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        if (!repository?.diffIndexWithHEADShortStats) {
            return undefined;
        }
        return await repository?.diffIndexWithHEADShortStats();
    }
    async fetch(uri, remote, ref, depth) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        return repository?.fetch(remote, ref, depth);
    }
    async getMergeBase(uri, ref1, ref2) {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(uri);
        return repository?.getMergeBase(ref1, ref2);
    }
    async initialize() {
        if (this._isInitialized.get()) {
            return;
        }
        await (0, observableInternal_1.waitForState)(this._isInitialized, state => state, undefined, (0, cancellation_1.cancelOnDispose)(this._store));
    }
    async doOpenRepository(repository) {
        this.logService.trace(`[GitServiceImpl][doOpenRepository] Repository: ${repository.rootUri.toString()}`);
        // The `gitAPI.onDidOpenRepository` event is fired before `git status` completes and the repository
        // state is initialized. `IGitService.onDidOpenRepository` will only fire after the repository state
        // is initialized.
        const HEAD = (0, observableInternal_1.observableFromEvent)(this, repository.state.onDidChange, () => repository.state.HEAD);
        await (0, observableInternal_1.waitForState)(HEAD, state => state !== undefined, undefined, (0, cancellation_1.cancelOnDispose)(this._store));
        this.logService.trace(`[GitServiceImpl][doOpenRepository] Repository initialized: ${JSON.stringify(HEAD.get())}`);
        // Active repository
        const selectedObs = (0, observableInternal_1.observableFromEvent)(this, repository.ui.onDidChange, () => repository.ui.selected);
        const onDidChangeStateSignal = (0, observableInternal_1.observableSignalFromEvent)(this, repository.state.onDidChange);
        this._register((0, observableInternal_1.autorun)(reader => {
            onDidChangeStateSignal.read(reader);
            const selected = selectedObs.read(reader);
            const activeRepository = this.activeRepository.get();
            if (activeRepository && !selected) {
                return;
            }
            const repositoryContext = GitServiceImpl_1.repoToRepoContext(repository);
            this.logService.trace(`[GitServiceImpl][doOpenRepository] Active repository: ${JSON.stringify(repositoryContext)}`);
            this.activeRepository.set(repositoryContext, undefined);
        }));
        // Open repository event
        const repositoryContext = GitServiceImpl_1.repoToRepoContext(repository);
        if (repositoryContext) {
            this._onDidOpenRepository.fire(repositoryContext);
        }
    }
    doCloseRepository(repository) {
        this.logService.trace(`[GitServiceImpl][doCloseRepository] Repository: ${repository.rootUri.toString()}`);
        const repositoryContext = GitServiceImpl_1.repoToRepoContext(repository);
        if (repositoryContext) {
            this._onDidCloseRepository.fire(repositoryContext);
        }
    }
    async waitForRepositoryState(repository) {
        if (repository.state.HEAD) {
            return;
        }
        const HEAD = (0, observableInternal_1.observableFromEvent)(this, repository.state.onDidChange, () => repository.state.HEAD);
        await (0, observableInternal_1.waitForState)(HEAD, state => state !== undefined, undefined, (0, cancellation_1.cancelOnDispose)(this._store));
    }
    static repoToRepoContext(repo) {
        if (!repo) {
            return undefined;
        }
        return new RepoContextImpl(repo);
    }
    get repositories() {
        const gitAPI = this.gitExtensionService.getExtensionApi();
        if (!gitAPI) {
            return [];
        }
        return (0, arrays_1.coalesce)(gitAPI.repositories
            .filter(repository => repository.state.HEAD !== undefined)
            .map(repository => GitServiceImpl_1.repoToRepoContext(repository)));
    }
};
exports.GitServiceImpl = GitServiceImpl;
exports.GitServiceImpl = GitServiceImpl = GitServiceImpl_1 = __decorate([
    __param(0, gitExtensionService_1.IGitExtensionService),
    __param(1, logService_1.ILogService)
], GitServiceImpl);
class RepoContextImpl {
    isIgnored(uri) {
        return this._isIgnored.get(uri.toString());
    }
    constructor(_repo) {
        this._repo = _repo;
        this.rootUri = this._repo.rootUri;
        this.headBranchName = this._repo.state.HEAD?.name;
        this.headCommitHash = this._repo.state.HEAD?.commit;
        this.upstreamBranchName = this._repo.state.HEAD?.upstream?.name;
        this.upstreamRemote = this._repo.state.HEAD?.upstream?.remote;
        this.isRebasing = this._repo.state.rebaseCommit !== null;
        this.remotes = this._repo.state.remotes.map(r => r.name);
        this.remoteFetchUrls = this._repo.state.remotes.map(r => r.fetchUrl);
        this.changes = {
            mergeChanges: this._repo.state.mergeChanges,
            indexChanges: this._repo.state.indexChanges,
            workingTree: this._repo.state.workingTreeChanges,
            untrackedChanges: this._repo.state.untrackedChanges
        };
        this._onDidChangeSignal = (0, observableInternal_1.observableSignalFromEvent)(this, this._repo.state.onDidChange);
        this.headBranchNameObs = this._onDidChangeSignal.map(() => this._repo.state.HEAD?.name);
        this.headCommitHashObs = this._onDidChangeSignal.map(() => this._repo.state.HEAD?.commit);
        this.upstreamBranchNameObs = this._onDidChangeSignal.map(() => this._repo.state.HEAD?.upstream?.name);
        this.upstreamRemoteObs = this._onDidChangeSignal.map(() => this._repo.state.HEAD?.upstream?.remote);
        this.isRebasingObs = this._onDidChangeSignal.map(() => this._repo.state.rebaseCommit !== null);
        this._checkIsIgnored = new async_1.BatchedProcessor(async (paths) => {
            const result = await this._repo.checkIgnore(paths);
            return paths.map(p => result.has(p));
        }, 1000);
        this._isIgnored = new cache_1.CachedFunction(async (documentUri) => {
            const path = vscode_1.Uri.parse(documentUri).fsPath;
            const result = await this._checkIsIgnored.request(path);
            return result;
        });
    }
}
exports.RepoContextImpl = RepoContextImpl;
//# sourceMappingURL=gitServiceImpl.js.map