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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitCommitMessageServiceImpl = void 0;
const vscode_1 = require("vscode");
const editSurvivalTracker_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTracker");
const gitDiffService_1 = require("../../../platform/git/common/gitDiffService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const gitCommitMessageGenerator_1 = require("../node/gitCommitMessageGenerator");
let GitCommitMessageServiceImpl = class GitCommitMessageServiceImpl {
    constructor(_gitExtensionService, _instantiationService, _telemetryService, _gitDiffService) {
        this._gitExtensionService = _gitExtensionService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._gitDiffService = _gitDiffService;
        this._commitMessages = new Map();
        this._disposables = new lifecycle_1.DisposableStore();
        this._repositoryDisposables = new lifecycle_1.DisposableMap();
        const initialize = () => {
            this._disposables.add(this._gitExtensionApi.onDidOpenRepository(this._onDidOpenRepository, this));
            this._disposables.add(this._gitExtensionApi.onDidCloseRepository(this._onDidCloseRepository, this));
            for (const repository of this._gitExtensionApi.repositories) {
                this._onDidOpenRepository(repository);
            }
        };
        this._gitExtensionApi = this._gitExtensionService.getExtensionApi();
        if (this._gitExtensionApi) {
            initialize();
        }
        else {
            this._disposables.add(this._gitExtensionService.onDidChange((status) => {
                if (status.enabled) {
                    this._gitExtensionApi = this._gitExtensionService.getExtensionApi();
                    initialize();
                }
            }));
        }
    }
    async generateCommitMessage(repository, cancellationToken = cancellation_1.CancellationToken.None) {
        if (cancellationToken.isCancellationRequested) {
            return undefined;
        }
        return vscode_1.window.withProgress({ location: vscode_1.ProgressLocation.SourceControl }, async () => {
            const indexChanges = repository.state.indexChanges.length;
            const workingTreeChanges = repository.state.workingTreeChanges.length;
            const untrackedChanges = repository.state.untrackedChanges?.length ?? 0;
            if (indexChanges + workingTreeChanges + untrackedChanges === 0) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('Cannot generate a commit message because there are no changes.'));
                return undefined;
            }
            const resources = repository.state.indexChanges.length > 0
                // Index
                ? repository.state.indexChanges
                // Working tree, untracked changes
                : [
                    ...repository.state.workingTreeChanges,
                    ...repository.state.untrackedChanges ?? []
                ];
            const changes = await this._gitDiffService.getChangeDiffs(repository, resources);
            if (changes.length === 0) {
                vscode_1.window.showInformationMessage(vscode_1.l10n.t('Cannot generate a commit message because the changes were excluded from the context due to content exclusion rules.'));
                return undefined;
            }
            const diffs = changes.map(diff => diff.diff);
            const attemptCount = this._getAttemptCount(repository, diffs);
            const recentCommitMessages = await this._getRecentCommitMessages(repository);
            const repositoryName = (0, resources_1.basename)(repository.rootUri);
            const branchName = repository.state.HEAD?.name ?? '';
            const gitCommitMessageGenerator = this._instantiationService.createInstance(gitCommitMessageGenerator_1.GitCommitMessageGenerator);
            const commitMessage = await gitCommitMessageGenerator.generateGitCommitMessage(repositoryName, branchName, changes, recentCommitMessages, attemptCount, cancellationToken);
            // Save generated commit message
            if (commitMessage && repository.state.HEAD && repository.state.HEAD.commit) {
                const commitMessages = this._commitMessages.get(repository.rootUri.toString()) ?? new Map();
                commitMessages.set(repository.state.HEAD.commit, { attemptCount, changes: diffs, message: commitMessage });
                this._commitMessages.set(repository.rootUri.toString(), commitMessages);
            }
            return commitMessage;
        });
    }
    getRepository(uri) {
        if (!this._gitExtensionApi) {
            return null;
        }
        if (this._gitExtensionApi.repositories.length === 1) {
            return this._gitExtensionApi.repositories[0];
        }
        uri = uri ?? vscode_1.window.activeTextEditor?.document.uri;
        return uri ? this._gitExtensionApi.getRepository(uri) : null;
    }
    _getAttemptCount(repository, changes) {
        const commitMessages = this._commitMessages.get(repository.rootUri.toString());
        const commitMessage = commitMessages?.get(repository.state.HEAD?.commit ?? '');
        if (!commitMessage || commitMessage.changes.length !== changes.length) {
            return 0;
        }
        for (let index = 0; index < changes.length; index++) {
            if (commitMessage.changes[index] !== changes[index]) {
                return 0;
            }
        }
        return commitMessage.attemptCount + 1;
    }
    async _getRecentCommitMessages(repository) {
        const repositoryCommitMessages = [];
        const userCommitMessages = [];
        try {
            // Last 5 commit messages (repository)
            const commits = await repository.log({ maxEntries: 5 });
            repositoryCommitMessages.push(...commits.map(commit => commit.message.split('\n')[0]));
            // Last 5 commit messages (user)
            const author = await repository.getConfig('user.name') ??
                await repository.getGlobalConfig('user.name');
            const userCommits = await repository.log({ maxEntries: 5, author });
            userCommitMessages.push(...userCommits.map(commit => commit.message.split('\n')[0]));
        }
        catch (err) { }
        return { repository: repositoryCommitMessages, user: userCommitMessages };
    }
    _onDidOpenRepository(repository) {
        if (typeof repository.onDidCommit !== undefined) {
            this._repositoryDisposables.set(repository, repository.onDidCommit(() => this._onDidCommit(repository), this));
        }
    }
    _onDidCloseRepository(repository) {
        this._repositoryDisposables.deleteAndDispose(repository);
        this._commitMessages.delete(repository.rootUri.toString());
    }
    async _onDidCommit(repository) {
        const HEAD = repository.state.HEAD;
        if (!HEAD?.commit) {
            return;
        }
        const commitMessages = this._commitMessages.get(repository.rootUri.toString());
        if (!commitMessages) {
            return;
        }
        // Commit details
        const commit = await repository.getCommit(HEAD.commit);
        const commitParent = commit.parents.length > 0 ? commit.parents[0] : '';
        const commitMessage = commitMessages.get(commitParent);
        if (!commitMessage) {
            return;
        }
        // Compute survival rate
        const survivalRateFourGram = (0, editSurvivalTracker_1.compute4GramTextSimilarity)(commit.message, commitMessage.message);
        /* __GDPR__
            "git.generateCommitMessageSurvival" : {
                "owner": "lszomoru",
                "comment": "Tracks how much of the generated git commit message has survived",
                "attemptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many times the user has retried." },
                "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the suggested git commit message was used when the code change was committed." }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('git.generateCommitMessageSurvival', undefined, { attemptCount: commitMessage.attemptCount, survivalRateFourGram });
        // Delete commit message
        commitMessages.delete(commitParent);
        this._commitMessages.set(repository.rootUri.toString(), commitMessages);
    }
    dispose() {
        this._repositoryDisposables.dispose();
        this._disposables.dispose();
    }
};
exports.GitCommitMessageServiceImpl = GitCommitMessageServiceImpl;
exports.GitCommitMessageServiceImpl = GitCommitMessageServiceImpl = __decorate([
    __param(0, gitExtensionService_1.IGitExtensionService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, gitDiffService_1.IGitDiffService)
], GitCommitMessageServiceImpl);
//# sourceMappingURL=gitCommitMessageServiceImpl.js.map