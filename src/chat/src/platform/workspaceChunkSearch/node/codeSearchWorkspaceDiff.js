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
var CodeSearchWorkspaceDiffTracker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeSearchWorkspaceDiffTracker = void 0;
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const resources_1 = require("../../../util/vs/base/common/resources");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const codeSearchRepoTracker_1 = require("../../remoteCodeSearch/node/codeSearchRepoTracker");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const workspaceFileIndex_1 = require("./workspaceFileIndex");
var RepoState;
(function (RepoState) {
    RepoState[RepoState["Initializing"] = 0] = "Initializing";
    RepoState[RepoState["Error"] = 1] = "Error";
    RepoState[RepoState["Ready"] = 2] = "Ready";
})(RepoState || (RepoState = {}));
let CodeSearchWorkspaceDiffTracker = class CodeSearchWorkspaceDiffTracker extends lifecycle_1.Disposable {
    static { CodeSearchWorkspaceDiffTracker_1 = this; }
    static { this._diffRefreshInterval = 1000 * 60 * 2; } // 2 minutes
    static { this._maxDiffFiles = 10000; }
    constructor(repoTracker, _logService, _workspaceFileIndex, _simulationTestContext) {
        super();
        this._logService = _logService;
        this._workspaceFileIndex = _workspaceFileIndex;
        this._simulationTestContext = _simulationTestContext;
        this._repos = new map_1.ResourceMap();
        /**
         * Tracks all files that have been changed in the workspace during this session.
         */
        this._locallyChangedFiles = new map_1.ResourceSet();
        this._onDidChangeDiffFiles = this._register(new event_1.Emitter());
        this.onDidChangeDiffFiles = this._onDidChangeDiffFiles.event;
        this._diffRefreshTimer = this._register(new async_1.IntervalTimer());
        this._initialized = new async_1.DeferredPromise();
        this.initialized = this._initialized.p;
        this._repoTracker = repoTracker;
        this._register(this._repoTracker.onDidAddOrUpdateRepo(repoEntry => {
            if (repoEntry.status !== codeSearchRepoTracker_1.RepoStatus.Ready) {
                return;
            }
            const entry = this._repos.get(repoEntry.repo.rootUri);
            if (entry) {
                this.refreshRepoDiff(entry);
            }
            else {
                this.openRepo(repoEntry);
            }
        }));
        this._register(this._repoTracker.onDidRemoveRepo(repo => this.closeRepo(repo)));
        this._register(event_1.Event.any(this._workspaceFileIndex.onDidCreateFiles, this._workspaceFileIndex.onDidChangeFiles)(async (uris) => {
            for (const uri of uris) {
                this._locallyChangedFiles.add(uri);
            }
            this._onDidChangeDiffFiles.fire(uris);
        }));
        this._diffRefreshTimer.cancelAndSet(() => {
            this.refreshRepoDiffs();
        }, CodeSearchWorkspaceDiffTracker_1._diffRefreshInterval);
        this.init();
    }
    async init() {
        try {
            await Promise.all([
                this._workspaceFileIndex.initialize(),
                this._repoTracker.initialize()
            ]);
            await Promise.allSettled(Array.from(this._repoTracker.getAllRepos(), repo => {
                if (repo.status === codeSearchRepoTracker_1.RepoStatus.Ready || repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed) {
                    return this.openRepo(repo);
                }
            }));
        }
        finally {
            this._initialized.complete();
        }
    }
    /**
     * Get a list of files that have changed in the workspace.
     *
     * @returns A list of URIs for files that have changed vs our indexed commit. Return undefined if we don't know that status of the workspace.
     */
    getDiffFiles() {
        if (!this._repos.size) {
            return undefined;
        }
        const seenFiles = new map_1.ResourceSet();
        for (const file of this._locallyChangedFiles) {
            if (this._workspaceFileIndex.get(file)) {
                seenFiles.add(file);
            }
        }
        for (const repoEntry of this._repos.values()) {
            if (repoEntry.state === RepoState.Ready) {
                for (const file of repoEntry.initialChanges) {
                    if (this._workspaceFileIndex.get(file)) {
                        seenFiles.add(file);
                    }
                }
            }
        }
        return seenFiles;
    }
    async openRepo(info) {
        this._repos.delete(info.repo.rootUri);
        const repoEntry = {
            state: RepoState.Initializing,
            info: info,
            initialChanges: new map_1.ResourceSet(),
        };
        this._repos.set(info.repo.rootUri, repoEntry);
        this.refreshRepoDiff(repoEntry);
    }
    closeRepo(info) {
        this._repos.delete(info.repo.rootUri);
    }
    async tryGetDiffedIndexedFiles(info) {
        const diff = await this.tryGetDiff(info);
        this._logService.trace(`CodeSearchWorkspaceDiff::tryGetDiffedIndexedFiles() Got ${diff?.changes.length ?? 0} initially changed files for ${info.repo.rootUri}`);
        if (!diff) {
            return;
        }
        const initialChanges = new map_1.ResourceSet();
        await Promise.all(diff.changes.slice(0, CodeSearchWorkspaceDiffTracker_1._maxDiffFiles).map(async (change) => {
            if (await this._workspaceFileIndex.shouldIndexWorkspaceFile(change.uri, cancellation_1.CancellationToken.None)) {
                initialChanges.add(change.uri);
            }
        }));
        this._logService.trace(`CodeSearchWorkspaceDiff::tryGetDiffedIndexedFiles() Returning ${initialChanges} changes for ${info.repo.rootUri}`);
        return Array.from(initialChanges);
    }
    async tryGetDiff(repoInfo) {
        return this._repoTracker.diffWithIndexedCommit(repoInfo);
    }
    async refreshRepoDiffs() {
        await Promise.all(Array.from(this._repos.values(), repo => this.refreshRepoDiff(repo)));
        this._logService.trace(`CodeSearchWorkspaceDiff: Refreshed all diffs. New local diffs count: ${this._locallyChangedFiles.size}`);
    }
    async refreshRepoDiff(repo) {
        this._logService.trace(`CodeSearchWorkspaceDiff: refreshing diff for ${repo.info.repo.rootUri}`);
        if (this._simulationTestContext.isInSimulationTests) {
            // In simulation tests, we don't want to refresh the diff
            this._logService.trace(`CodeSearchWorkspaceDiff: Skipping diff refresh for ${repo.info.repo.rootUri} in simulation tests`);
            repo.state = RepoState.Ready;
            return;
        }
        try {
            const diff = await this.tryGetDiffedIndexedFiles(repo.info);
            if (diff) {
                // Update initial changes for repo
                repo.initialChanges.clear();
                for (const changedFile of diff) {
                    repo.initialChanges.add(changedFile);
                }
                this._logService.trace(`CodeSearchWorkspaceDiff: Refreshed diff for ${repo.info.repo.rootUri}. New diff count: ${repo.initialChanges.size}`);
                // Delete any local changes that have no longer changed
                for (const locallyChangedFile of this._locallyChangedFiles) {
                    if ((0, resources_1.isEqualOrParent)(locallyChangedFile, repo.info.repo.rootUri)) {
                        const file = this._workspaceFileIndex.get(locallyChangedFile);
                        if (file) {
                            // The diff git returns to use only includes the files from disk.
                            // Any dirty files still have to be considered changed.
                            if (!file.isDirty()) {
                                this._locallyChangedFiles.delete(locallyChangedFile);
                            }
                        }
                    }
                }
                repo.state = RepoState.Ready;
            }
            else {
                this._logService.error(`CodeSearchWorkspaceDiff: Failed to get new diff for ${repo.info.repo.rootUri}.`);
                repo.state = RepoState.Error;
            }
        }
        catch (e) {
            this._logService.error(`CodeSearchWorkspaceDiff: Failed to refresh diff for ${repo.info.repo.rootUri}.`, e);
            repo.state = RepoState.Error;
        }
    }
};
exports.CodeSearchWorkspaceDiffTracker = CodeSearchWorkspaceDiffTracker;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchWorkspaceDiff::init')
], CodeSearchWorkspaceDiffTracker.prototype, "init", null);
exports.CodeSearchWorkspaceDiffTracker = CodeSearchWorkspaceDiffTracker = CodeSearchWorkspaceDiffTracker_1 = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, workspaceFileIndex_1.IWorkspaceFileIndex),
    __param(3, simulationTestContext_1.ISimulationTestContext)
], CodeSearchWorkspaceDiffTracker);
//# sourceMappingURL=codeSearchWorkspaceDiff.js.map