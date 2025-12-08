"use strict";
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
exports.CodeSearchRepoTracker = exports.TriggerRemoteIndexingError = exports.RepoStatus = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const result_1 = require("../../../util/common/result");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const authentication_1 = require("../../authentication/common/authentication");
const gitExtensionService_1 = require("../../git/common/gitExtensionService");
const gitService_1 = require("../../git/common/gitService");
const logExecTime_1 = require("../../log/common/logExecTime");
const logService_1 = require("../../log/common/logService");
const utils_1 = require("../../remoteRepositories/common/utils");
const simulationTestContext_1 = require("../../simulationTestContext/common/simulationTestContext");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const adoCodeSearchService_1 = require("../common/adoCodeSearchService");
const githubCodeSearchService_1 = require("../common/githubCodeSearchService");
const remoteCodeSearch_1 = require("../common/remoteCodeSearch");
const codeSearchRepoAuth_1 = require("./codeSearchRepoAuth");
var RepoStatus;
(function (RepoStatus) {
    /** We could not resolve this repo */
    RepoStatus["NotResolvable"] = "NotResolvable";
    RepoStatus["Initializing"] = "Initializing";
    /** We are checking the status of the remote index. */
    RepoStatus["CheckingStatus"] = "CheckingStatus";
    /** The remote index is indexable but not built yet */
    RepoStatus["NotYetIndexed"] = "NotYetIndexed";
    /** The remote index is not indexed and we cannot trigger indexing for it */
    RepoStatus["NotIndexable"] = "NotIndexable";
    /**
     * We failed to check the remote index status.
     *
     * This has a number of possible causes:
     *
     * - The repo doesn't exist
     * - The user cannot access the repo (most services won't differentiate with it not existing). If we know
     * 		for sure that the user cannot access the repo, we will instead use {@linkcode NotAuthorized}.
     * - The status endpoint returned an error.
     */
    RepoStatus["CouldNotCheckIndexStatus"] = "CouldNotCheckIndexStatus";
    /**
     * The user is not authorized to access the remote index.
     *
     * This is a special case of {@linkcode CouldNotCheckIndexStatus} that is shown when we know the user is not authorized.
     */
    RepoStatus["NotAuthorized"] = "NotAuthorized";
    /** The remote index is being build but is not ready for use  */
    RepoStatus["BuildingIndex"] = "BuildingIndex";
    /** The remote index is ready and usable */
    RepoStatus["Ready"] = "Ready";
})(RepoStatus || (exports.RepoStatus = RepoStatus = {}));
var TriggerRemoteIndexingError;
(function (TriggerRemoteIndexingError) {
    TriggerRemoteIndexingError.noGitRepos = {
        id: 'no-git-repos',
        userMessage: l10n.t("No git repos found")
    };
    TriggerRemoteIndexingError.stillResolving = {
        id: 'still-resolving',
        userMessage: l10n.t("Still resolving repos. Please try again shortly.")
    };
    TriggerRemoteIndexingError.noRemoteIndexableRepos = {
        id: 'no-remote-indexable-repos',
        userMessage: l10n.t("No remotely indexable repos found")
    };
    TriggerRemoteIndexingError.noValidAuthToken = {
        id: 'no-valid-auth-token',
        userMessage: l10n.t("No valid auth token")
    };
    TriggerRemoteIndexingError.alreadyIndexed = {
        id: 'already-indexed',
        userMessage: l10n.t("Already indexed")
    };
    TriggerRemoteIndexingError.alreadyIndexing = {
        id: 'already-indexing',
        userMessage: l10n.t("Already indexing")
    };
    TriggerRemoteIndexingError.couldNotCheckIndexStatus = {
        id: 'could-not-check-index-status',
        userMessage: l10n.t("Could not check the remote index status for this repo")
    };
    function errorTriggeringIndexing(repoId) {
        return {
            id: 'request-to-index-failed',
            userMessage: l10n.t `Request to index '${repoId.toString()}' failed`
        };
    }
    TriggerRemoteIndexingError.errorTriggeringIndexing = errorTriggeringIndexing;
})(TriggerRemoteIndexingError || (exports.TriggerRemoteIndexingError = TriggerRemoteIndexingError = {}));
/**
 * Ids used to identify the type of remote for telemetry purposes
 *
 * Do not change these values as they are used in telemetry.
 */
var GitRemoteTypeForTelemetry;
(function (GitRemoteTypeForTelemetry) {
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["NoRemotes"] = 0] = "NoRemotes";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["Unknown"] = 1] = "Unknown";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["Github"] = 2] = "Github";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["Ghe"] = 3] = "Ghe";
    // Unsupported
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["AzureDevOps"] = 4] = "AzureDevOps";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["VisualStudioDotCom"] = 5] = "VisualStudioDotCom";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["GitLab"] = 6] = "GitLab";
    GitRemoteTypeForTelemetry[GitRemoteTypeForTelemetry["BitBucket"] = 7] = "BitBucket";
})(GitRemoteTypeForTelemetry || (GitRemoteTypeForTelemetry = {}));
const remoteHostTelemetryIdMapping = new Map([
    ['github.com', GitRemoteTypeForTelemetry.Github],
    ['ghe.com', GitRemoteTypeForTelemetry.Ghe],
    ['dev.azure.com', GitRemoteTypeForTelemetry.AzureDevOps],
    ['visualstudio.com', GitRemoteTypeForTelemetry.VisualStudioDotCom],
    ['gitlab.com', GitRemoteTypeForTelemetry.GitLab],
    ['bitbucket.org', GitRemoteTypeForTelemetry.BitBucket],
]);
function getRemoteTypeForTelemetry(remoteHost) {
    remoteHost = remoteHost.toLowerCase();
    for (const [key, value] of remoteHostTelemetryIdMapping) {
        if (remoteHost === key || remoteHost.endsWith('.' + key)) {
            return value;
        }
    }
    return GitRemoteTypeForTelemetry.Unknown;
}
/**
 * Tracks all repositories in the workspace that have been indexed for code search.
 */
let CodeSearchRepoTracker = class CodeSearchRepoTracker extends lifecycle_1.Disposable {
    constructor(_adoCodeSearchService, _authenticationService, _codeSearchAuthService, _gitExtensionService, _githubCodeSearchService, _gitService, _logService, _simulationTestContext, _telemetryService, _workspaceService) {
        super();
        this._adoCodeSearchService = _adoCodeSearchService;
        this._authenticationService = _authenticationService;
        this._codeSearchAuthService = _codeSearchAuthService;
        this._gitExtensionService = _gitExtensionService;
        this._githubCodeSearchService = _githubCodeSearchService;
        this._gitService = _gitService;
        this._logService = _logService;
        this._simulationTestContext = _simulationTestContext;
        this._telemetryService = _telemetryService;
        this._workspaceService = _workspaceService;
        // TODO: Switch to use backoff instead of polling at fixed intervals
        this._repoIndexPollingInterval = 3000; // ms
        this.maxPollingAttempts = 120;
        this._repos = new map_1.ResourceMap();
        this._repoIndexPolling = new map_1.ResourceMap();
        this._onDidFinishInitialization = this._register(new event_1.Emitter());
        this.onDidFinishInitialization = this._onDidFinishInitialization.event;
        this._onDidAddOrUpdateRepo = this._register(new event_1.Emitter());
        this.onDidAddOrUpdateRepo = this._onDidAddOrUpdateRepo.event;
        this._onDidRemoveRepo = this._register(new event_1.Emitter());
        this.onDidRemoveRepo = this._onDidRemoveRepo.event;
        this._isDisposed = false;
        this._hasFinishedInitialization = false;
        this._initializedGitReposP = (0, async_1.createCancelablePromise)(async (token) => {
            this._logService.trace(`CodeSearchRepoTracker.tryInitGitRepos(): started`);
            try {
                if (!this._gitService.isInitialized) {
                    this._logService.trace(`CodeSearchRepoTracker.tryInitGitRepos(): Git service not initialized. Waiting for init signal.`);
                    const finishInitTimeout = 30_000;
                    await (0, async_1.raceCancellationError)((0, async_1.raceTimeout)(new Promise(resolve => this._gitService.onDidFinishInitialization(() => resolve())), finishInitTimeout), token);
                    if (this._isDisposed) {
                        return;
                    }
                }
                this._logService.trace(`CodeSearchRepoTracker.tryInitGitRepos(): Found initial repos: [${this._gitService.repositories.map(repo => repo.rootUri.toString())}].`);
                const openPromises = this._gitService.repositories.map(repo => this.openGitRepo(repo));
                this._register(this._gitService.onDidOpenRepository(repo => this.openGitRepo(repo)));
                this._register(this._gitService.onDidCloseRepository(repo => this.closeRepo(repo)));
                await (0, async_1.raceCancellationError)(Promise.allSettled(openPromises), token);
                this._logService.trace(`CodeSearchRepoTracker.tryInitGitRepos(): Complete`);
            }
            catch (e) {
                this._logService.error(`CodeSearchRepoTracker.tryInitGitRepos(): Error occurred during initialization: ${e}`);
            }
        });
        this._initializedGitHubRemoteReposP = (0, async_1.createCancelablePromise)(async (token) => {
            try {
                const githubRemoteRepos = this._workspaceService.getWorkspaceFolders().filter(utils_1.isGitHubRemoteRepository);
                if (!githubRemoteRepos.length) {
                    return;
                }
                this._logService.trace(`CodeSearchRepoTracker.initGithubRemoteRepos(): started`);
                await (0, async_1.raceCancellationError)(Promise.all(githubRemoteRepos.map(workspaceRoot => {
                    const githubRepoIdParts = workspaceRoot.path.slice(1).split('/');
                    return this.openGithubRemoteRepo(workspaceRoot, new gitService_1.GithubRepoId(githubRepoIdParts[0], githubRepoIdParts[1]));
                })), token);
                this._logService.trace(`CodeSearchRepoTracker.initGithubRemoteRepos(): complete`);
            }
            catch (e) {
                this._logService.error(`CodeSearchRepoTracker.initGithubRemoteRepos(): Error occurred during initialization: ${e}`);
            }
        });
        const refreshInterval = this._register(new async_1.IntervalTimer());
        refreshInterval.cancelAndSet(() => this.updateIndexedCommitForAllRepos(), 5 * 60 * 1000); // 5 minutes
        // When the authentication state changes, update repos
        this._register(event_1.Event.any(this._authenticationService.onDidAuthenticationChange, this._adoCodeSearchService.onDidChangeIndexState)(() => {
            this.updateRepoStatuses();
        }));
        this._register(event_1.Event.any(this._authenticationService.onDidAdoAuthenticationChange)(() => {
            this.updateRepoStatuses('ado');
        }));
    }
    async initialize() {
        this._initializePromise ??= (async () => {
            return (0, logExecTime_1.logExecTime)(this._logService, 'CodeSearchRepoTracker::initialize_impl', async () => {
                try {
                    // Wait for the initial repos to be found
                    // Find all initial repos
                    await Promise.all([
                        this._initializedGitReposP,
                        this._initializedGitHubRemoteReposP
                    ]);
                    if (this._isDisposed) {
                        return;
                    }
                    // And make sure they have done their initial checks.
                    // After this the repos may still be left polling github but we've done at least one check
                    await Promise.all(Array.from(this._repos.values(), async (repo) => {
                        if (repo.status === RepoStatus.Initializing || repo.status === RepoStatus.CheckingStatus) {
                            try {
                                await repo.initTask.p;
                            }
                            catch (error) {
                                this._logService.error(`Error during repo initialization: ${error}`);
                            }
                        }
                    }));
                }
                finally {
                    this._hasFinishedInitialization = true;
                    this._onDidFinishInitialization.fire();
                }
            });
        })();
        await this._initializePromise;
    }
    isInitializing() {
        return !this._hasFinishedInitialization;
    }
    dispose() {
        super.dispose();
        this._isDisposed = true;
        for (const entry of this._repoIndexPolling.values()) {
            entry.poll.dispose();
            if (!entry.deferredP.isSettled) {
                entry.deferredP.cancel().catch(() => { });
            }
        }
        this._repoIndexPolling.clear();
        for (const repo of this._repos.values()) {
            if (repo.status === RepoStatus.Initializing || repo.status === RepoStatus.CheckingStatus) {
                repo.initTask.cts.cancel();
            }
        }
        this._initializedGitReposP.cancel();
        this._initializedGitHubRemoteReposP.cancel();
    }
    getAllRepos() {
        return this._repos.values();
    }
    getRepoStatus(repo) {
        return this._repos.get(repo.repo.rootUri)?.status ?? repo.status;
    }
    async openGitRepo(repo) {
        this._logService.trace(`CodeSearchRepoTracker.openGitRepo(${repo.rootUri})`);
        const existing = this._repos.get(repo.rootUri);
        if (existing) {
            if (existing.status === RepoStatus.Initializing) {
                try {
                    return await existing.initTask.p;
                }
                catch (e) {
                    if ((0, errors_1.isCancellationError)(e)) {
                        return;
                    }
                    throw e;
                }
            }
        }
        const initDeferredP = new async_1.DeferredPromise();
        const initTask = {
            p: initDeferredP.p,
            cts: new cancellation_1.CancellationTokenSource(),
        };
        const initToken = initTask.cts.token;
        (async () => {
            try {
                // Do a status check to make sure the repo info is fully loaded
                // See #12954
                await this._gitExtensionService.getExtensionApi()?.getRepository(repo.rootUri)?.status();
            }
            catch {
                this._logService.trace(`CodeSearchRepoTracker.openRepo(${repo.rootUri}). git status check failed.`);
                // Noop, may still be ok even if the status check failed
            }
            if (initToken.isCancellationRequested) {
                return;
            }
            const updatedRepo = await this._gitService.getRepository(repo.rootUri);
            if (!updatedRepo && !this._simulationTestContext.isInSimulationTests) {
                this._logService.trace(`CodeSearchRepoTracker.openRepo(${repo.rootUri}). No current repo found after status check.`);
                /* __GDPR__
                    "codeSearchRepoTracker.openGitRepo.error.noCurrentRepo" : {
                        "owner": "mjbvz",
                        "comment": "Information about errors when trying to resolve a remote"
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('codeSearchRepoTracker.openGitRepo.error.noCurrentRepo');
                this.updateRepoEntry(repo, { status: RepoStatus.NotResolvable, repo });
                return;
            }
            if (updatedRepo) {
                repo = updatedRepo;
            }
            this._repos.set(repo.rootUri, { status: RepoStatus.Initializing, repo, initTask });
            const remoteInfos = await this.getRemoteInfosForRepo(repo);
            if (initToken.isCancellationRequested) {
                return;
            }
            let remoteTelemetryType;
            if (remoteInfos.length) {
                const primaryRemote = remoteInfos[0];
                const remoteHost = primaryRemote.fetchUrl ? (0, gitService_1.parseRemoteUrl)(primaryRemote.fetchUrl) : undefined;
                remoteTelemetryType = remoteHost ? getRemoteTypeForTelemetry(remoteHost.host) : GitRemoteTypeForTelemetry.Unknown;
            }
            else {
                const allRemotes = Array.from((0, gitService_1.getOrderedRemoteUrlsFromContext)(repo));
                if (allRemotes.length === 0) {
                    remoteTelemetryType = GitRemoteTypeForTelemetry.NoRemotes;
                }
                else {
                    for (const remote of allRemotes) {
                        if (remote) {
                            const remoteHost = (0, gitService_1.parseRemoteUrl)(remote);
                            if (remoteHost) {
                                const telemetryId = getRemoteTypeForTelemetry(remoteHost.host);
                                if (telemetryId !== GitRemoteTypeForTelemetry.Unknown) {
                                    remoteTelemetryType = telemetryId;
                                    break;
                                }
                            }
                        }
                    }
                }
                remoteTelemetryType ??= GitRemoteTypeForTelemetry.Unknown;
            }
            /* __GDPR__
                "codeSearchRepoTracker.openGitRepo.remoteInfo" : {
                    "owner": "mjbvz",
                    "comment": "Information about the remote",
                    "resolvedRemoteType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Identifies the primary remote's type " }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('codeSearchRepoTracker.openGitRepo.remoteInfo', {}, {
                resolvedRemoteType: remoteTelemetryType,
            });
            if (!remoteInfos.length) {
                this._logService.trace(`CodeSearchRepoTracker.openRepo(${repo.rootUri}). No valid github remote found. Remote urls: ${JSON.stringify(Array.from((0, gitService_1.getOrderedRemoteUrlsFromContext)(repo)))}.`);
                this._telemetryService.sendInternalMSFTTelemetryEvent('codeSearchRepoTracker.error.couldNotResolveRemote.internal', {
                    remoteUrls: JSON.stringify((0, arrays_1.coalesce)(repo.remoteFetchUrls ?? [])),
                });
                /* __GDPR__
                    "codeSearchRepoTracker.openGitRepo.error.couldNotResolveRemote" : {
                        "owner": "mjbvz",
                        "comment": "Information about errors when trying to resolve a remote",
                        "repoRemoteFetchUrlsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of remote fetch urls on the git repo" }
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('codeSearchRepoTracker.openGitRepo.error.couldNotResolveRemote', {}, {
                    repoRemoteFetchUrlsCount: repo.remoteFetchUrls?.length ?? 0,
                });
                this.updateRepoEntry(repo, { status: RepoStatus.NotResolvable, repo });
                return;
            }
            // TODO: Support checking index status for multiple remotes
            const primaryRemote = remoteInfos[0];
            this.updateRepoEntry(repo, {
                status: RepoStatus.CheckingStatus,
                repo,
                remoteInfo: primaryRemote,
                initTask,
            });
            await this.updateRepoStateFromEndpoint(repo, primaryRemote, false, initToken);
        })()
            .catch(() => { })
            .finally(() => {
            initDeferredP.complete();
        });
        this._repos.set(repo.rootUri, {
            status: RepoStatus.Initializing,
            repo,
            initTask
        });
    }
    openGithubRemoteRepo(rootUri, githubId) {
        this._logService.trace(`CodeSearchRepoTracker.openGithubRemoteRepo(${rootUri})`);
        const existing = this._repos.get(rootUri);
        if (existing) {
            if (existing.status === RepoStatus.Initializing) {
                return existing.initTask.p;
            }
        }
        const repo = { rootUri };
        const remoteInfo = {
            repoId: githubId,
            fetchUrl: undefined,
        };
        const initCancellationTokenSource = new cancellation_1.CancellationTokenSource();
        const initP = this.updateRepoStateFromEndpoint(repo, remoteInfo, false, initCancellationTokenSource.token).then(() => { });
        this._repos.set(rootUri, { status: RepoStatus.Initializing, repo, initTask: { p: initP, cts: initCancellationTokenSource } });
        return initP;
    }
    async getRemoteInfosForRepo(repo) {
        const remoteInfos = Array.from((0, gitService_1.getOrderedRepoInfosFromContext)(repo));
        // Fallback to checking the SSH config if no remotes were found
        if (!remoteInfos.length) {
            const other = await this.getGithubRemoteFromSshConfig(repo);
            if (other) {
                remoteInfos.push(other);
            }
        }
        // For now always prefer the github remotes
        remoteInfos.sort((a, b) => {
            if (a.repoId.type === 'github' && b.repoId.type !== 'github') {
                return -1;
            }
            else if (b.repoId.type === 'github' && a.repoId.type !== 'github') {
                return 1;
            }
            return 0;
        });
        return remoteInfos;
    }
    async getGithubRemoteFromSshConfig(repo) {
        if (repo.rootUri.scheme !== network_1.Schemas.file) {
            return;
        }
        try {
            const execAsync = (0, util_1.promisify)(child_process_1.exec);
            const { stdout, stderr } = await execAsync('git -c credential.interactive=never fetch --dry-run', {
                cwd: repo.rootUri.fsPath,
                env: {
                    GIT_SSH_COMMAND: 'ssh -v -o BatchMode=yes'
                }
            });
            const output = stdout + '\n' + stderr;
            const authMatch = output.match(/^Authenticated to ([^\s]+)\s/m);
            const fromMatch = output.match(/^From ([^:]+):([^/]+)\/([^\s]+)$/m);
            if (authMatch && fromMatch) {
                const authenticatedTo = authMatch[1];
                const owner = fromMatch[2];
                const repo = fromMatch[3].replace(/\.git$/, '');
                const remoteUrl = `ssh://${authenticatedTo}/${owner}/${repo}`;
                const githubRepoId = (0, gitService_1.getGithubRepoIdFromFetchUrl)(remoteUrl);
                if (githubRepoId) {
                    return {
                        repoId: githubRepoId,
                        fetchUrl: remoteUrl
                    };
                }
            }
            return undefined;
        }
        catch (e) {
            return undefined;
        }
    }
    async updateRepoStateFromEndpoint(repo, remoteInfo, force = false, token) {
        const existing = this._repos.get(repo.rootUri);
        if (!force && existing?.status === RepoStatus.Ready) {
            return existing;
        }
        this._logService.trace(`CodeSearchRepoTracker.updateRepoStateFromEndpoint(${repo.rootUri}). Checking status from endpoint.`);
        const newState = await (0, async_1.raceCancellationError)(this.getRepoIndexStatusFromEndpoint(repo, remoteInfo, token), token);
        this._logService.trace(`CodeSearchRepoTracker.updateRepoStateFromEndpoint(${repo.rootUri}). Updating state to ${newState.status}.`);
        this.updateRepoEntry(repo, newState);
        if (newState.status === RepoStatus.BuildingIndex) {
            // Trigger polling but don't block
            this.pollForRepoIndexingToComplete(repo).catch(() => { });
        }
        return newState;
    }
    async getRepoIndexStatusFromEndpoint(repo, remoteInfo, token) {
        this._logService.trace(`CodeSearchRepoTracker.getRepoIndexStatusFromEndpoint(${repo.rootUri}`);
        const couldNotCheckStatus = {
            status: RepoStatus.CouldNotCheckIndexStatus,
            repo,
            remoteInfo,
        };
        let statusResult;
        if (remoteInfo.repoId.type === 'github') {
            statusResult = await this._githubCodeSearchService.getRemoteIndexState({ silent: true }, remoteInfo.repoId, token);
        }
        else if (remoteInfo.repoId.type === 'ado') {
            statusResult = await this._adoCodeSearchService.getRemoteIndexState({ silent: true }, remoteInfo.repoId, token);
        }
        else {
            this._logService.error(`CodeSearchRepoTracker::getIndexedStatus(${remoteInfo.repoId}). Failed to fetch indexing status. Unknown repository type.`);
            return couldNotCheckStatus;
        }
        if (!statusResult.isOk()) {
            if (statusResult.err.type === 'not-authorized') {
                this._logService.error(`CodeSearchRepoTracker::getIndexedStatus(${remoteInfo.repoId}). Failed to fetch indexing status. Unauthorized.`);
                return {
                    status: RepoStatus.NotAuthorized,
                    repo,
                    remoteInfo,
                };
            }
            else {
                this._logService.error(`CodeSearchRepoTracker::getIndexedStatus(${remoteInfo.repoId}). Failed to fetch indexing status. Encountered eror: ${statusResult.err.error}`);
                return couldNotCheckStatus;
            }
        }
        switch (statusResult.val.status) {
            case remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready:
                return {
                    status: RepoStatus.Ready,
                    repo: repo,
                    remoteInfo,
                    indexedCommit: statusResult.val.indexedCommit,
                };
            case remoteCodeSearch_1.RemoteCodeSearchIndexStatus.BuildingIndex:
                return { status: RepoStatus.BuildingIndex, repo, remoteInfo };
            case remoteCodeSearch_1.RemoteCodeSearchIndexStatus.NotYetIndexed:
                return { status: RepoStatus.NotYetIndexed, repo, remoteInfo };
            case remoteCodeSearch_1.RemoteCodeSearchIndexStatus.NotIndexable:
                return { status: RepoStatus.NotIndexable, repo, remoteInfo };
        }
    }
    closeRepo(repo) {
        this._logService.trace(`CodeSearchRepoTracker.closeRepo(${repo.rootUri})`);
        const repoEntry = this._repos.get(repo.rootUri);
        if (!repoEntry) {
            return;
        }
        if (repoEntry.status === RepoStatus.Initializing || repoEntry.status === RepoStatus.CheckingStatus) {
            repoEntry.initTask.cts.cancel();
        }
        this._onDidRemoveRepo.fire(repoEntry);
        this._repos.delete(repo.rootUri);
    }
    async triggerRemoteIndexing(triggerReason, telemetryInfo) {
        this._logService.trace(`RepoTracker.TriggerRemoteIndexing(${triggerReason}).started`);
        await this.initialize();
        this._logService.trace(`RepoTracker.TriggerRemoteIndexing(${triggerReason}).Repos: ${JSON.stringify(Array.from(this._repos.values(), r => ({
            rootUri: r.repo.rootUri.toString(),
            status: r.status,
        })), null, 4)} `);
        const allRepos = Array.from(this._repos.values());
        if (!allRepos.length) {
            return result_1.Result.error(TriggerRemoteIndexingError.noGitRepos);
        }
        if (allRepos.every(repo => repo.status === RepoStatus.Initializing)) {
            return result_1.Result.error(TriggerRemoteIndexingError.stillResolving);
        }
        if (allRepos.every(repo => repo.status === RepoStatus.NotResolvable)) {
            return result_1.Result.error(TriggerRemoteIndexingError.noRemoteIndexableRepos);
        }
        const candidateRepos = allRepos.filter(repo => repo.status !== RepoStatus.NotResolvable && repo.status !== RepoStatus.Initializing);
        const authToken = await this.getGithubAuthToken();
        if (this._isDisposed) {
            return result_1.Result.ok(true);
        }
        if (!authToken) {
            return result_1.Result.error(TriggerRemoteIndexingError.noValidAuthToken);
        }
        if (candidateRepos.every(repo => repo.status === RepoStatus.Ready)) {
            return result_1.Result.error(TriggerRemoteIndexingError.alreadyIndexed);
        }
        if (candidateRepos.every(repo => repo.status === RepoStatus.BuildingIndex || repo.status === RepoStatus.Ready)) {
            return result_1.Result.error(TriggerRemoteIndexingError.alreadyIndexing);
        }
        if (candidateRepos.every(repo => repo.status === RepoStatus.CouldNotCheckIndexStatus || repo.status === RepoStatus.NotAuthorized)) {
            return result_1.Result.error(TriggerRemoteIndexingError.couldNotCheckIndexStatus);
        }
        const responses = await Promise.all(candidateRepos.map(repoEntry => {
            if (repoEntry.status === RepoStatus.NotYetIndexed) {
                return this.triggerRemoteIndexingOfRepo(repoEntry, triggerReason, telemetryInfo.addCaller('CodeSearchRepoTracker::triggerRemoteIndexing'));
            }
        }));
        const error = responses.find(r => r?.isError());
        return error ?? result_1.Result.ok(true);
    }
    async updateRepoStatuses(onlyReposOfType) {
        await Promise.all(Array.from(this._repos.values(), repo => {
            switch (repo.status) {
                case RepoStatus.NotResolvable:
                case RepoStatus.Initializing:
                case RepoStatus.CheckingStatus:
                    // Noop, nothing to refresh
                    return;
                case RepoStatus.NotYetIndexed:
                case RepoStatus.NotIndexable:
                case RepoStatus.BuildingIndex:
                case RepoStatus.Ready:
                case RepoStatus.CouldNotCheckIndexStatus:
                case RepoStatus.NotAuthorized: {
                    if (!onlyReposOfType || repo.remoteInfo.repoId.type === onlyReposOfType) {
                        return this.updateRepoStateFromEndpoint(repo.repo, repo.remoteInfo, true, cancellation_1.CancellationToken.None).catch(() => { });
                    }
                    break;
                }
            }
        }));
    }
    async getGithubAuthToken() {
        return (await this._authenticationService.getPermissiveGitHubSession({ silent: true }))?.accessToken
            ?? (await this._authenticationService.getAnyGitHubSession({ silent: true }))?.accessToken;
    }
    async triggerRemoteIndexingOfRepo(repoEntry, triggerReason, telemetryInfo) {
        this._logService.trace(`Triggering indexing for repo: ${repoEntry.remoteInfo.repoId} `);
        // Update UI state as soon as possible if triggered by the user
        if (triggerReason === 'manual') {
            this.updateRepoEntry(repoEntry.repo, {
                ...repoEntry,
                status: RepoStatus.BuildingIndex,
            });
        }
        const triggerSuccess = repoEntry.remoteInfo.repoId instanceof gitService_1.GithubRepoId
            ? await this._githubCodeSearchService.triggerIndexing({ silent: true }, triggerReason, repoEntry.remoteInfo.repoId, telemetryInfo)
            : await this._adoCodeSearchService.triggerIndexing({ silent: true }, triggerReason, repoEntry.remoteInfo.repoId, telemetryInfo);
        if (this._isDisposed) {
            return result_1.Result.ok(true);
        }
        if (!triggerSuccess) {
            this._logService.error(`RepoTracker::TriggerRemoteIndexing(${triggerReason}). Failed to request indexing for '${repoEntry.remoteInfo.repoId}'.`);
            this.updateRepoEntry(repoEntry.repo, {
                ...repoEntry,
                status: RepoStatus.NotYetIndexed,
            });
            return result_1.Result.error(TriggerRemoteIndexingError.errorTriggeringIndexing(repoEntry.remoteInfo.repoId));
        }
        this.updateRepoEntry(repoEntry.repo, {
            ...repoEntry,
            status: RepoStatus.BuildingIndex,
        });
        return result_1.Result.ok(true);
    }
    async tryAuthIfNeeded(_telemetryInfo, token) {
        await (0, async_1.raceCancellationError)(this.initialize(), token);
        if (this._isDisposed) {
            return;
        }
        // See if there are any repos that we know for sure we are not authorized for
        const allRepos = Array.from(this.getAllRepos());
        const notAuthorizedRepos = allRepos.filter(repo => repo.status === RepoStatus.NotAuthorized);
        if (!notAuthorizedRepos.length) {
            return;
        }
        // TODO: only handles first repos of each type, but our other services also don't track tokens for multiple
        // repos in a workspace right now
        const firstGithubRepo = notAuthorizedRepos.find(repo => repo.remoteInfo.repoId.type === 'github');
        if (firstGithubRepo) {
            await this._codeSearchAuthService.tryAuthenticating(firstGithubRepo);
        }
        const firstAdoRepo = notAuthorizedRepos.find(repo => repo.remoteInfo.repoId.type === 'ado');
        if (firstAdoRepo) {
            await this._codeSearchAuthService.tryAuthenticating(firstAdoRepo);
        }
    }
    updateRepoEntry(repo, entry) {
        this._repos.set(repo.rootUri, entry);
        this._onDidAddOrUpdateRepo.fire(entry);
    }
    pollForRepoIndexingToComplete(repo) {
        this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri})`);
        const repoKey = repo.rootUri;
        const existing = this._repoIndexPolling.get(repoKey);
        if (existing) {
            existing.attemptNumber = 0; // reset
            return existing.deferredP.p;
        }
        const deferredP = new async_1.DeferredPromise();
        const poll = new async_1.IntervalTimer();
        const pollEntry = { poll, deferredP, attemptNumber: 0 };
        this._repoIndexPolling.set(repoKey, pollEntry);
        const onComplete = () => {
            poll.cancel();
            deferredP.complete();
            this._repoIndexPolling.delete(repoKey);
        };
        poll.cancelAndSet(async () => {
            const currentRepoEntry = this._repos.get(repoKey);
            if (!currentRepoEntry || this._isDisposed) {
                // It's possible the repo has been closed since
                this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Repo no longer tracked.`);
                return onComplete();
            }
            if (currentRepoEntry.status === RepoStatus.BuildingIndex) {
                const attemptNumber = pollEntry.attemptNumber++;
                if (attemptNumber > this.maxPollingAttempts) {
                    this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Max attempts reached.Stopping polling.`);
                    if (!this._isDisposed) {
                        this.updateRepoEntry(repo, { status: RepoStatus.CouldNotCheckIndexStatus, repo: currentRepoEntry.repo, remoteInfo: currentRepoEntry.remoteInfo });
                    }
                    return onComplete();
                }
                this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Checking endpoint for status.`);
                let polledState;
                try {
                    polledState = await this.getRepoIndexStatusFromEndpoint(currentRepoEntry.repo, currentRepoEntry.remoteInfo, cancellation_1.CancellationToken.None);
                }
                catch {
                    // noop
                }
                this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Got back new status from endpoint: ${polledState?.status}.`);
                switch (polledState?.status) {
                    case RepoStatus.Ready: {
                        this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Repo indexed successfully.`);
                        if (!this._isDisposed) {
                            this.updateRepoEntry(repo, polledState);
                        }
                        return onComplete();
                    }
                    case RepoStatus.BuildingIndex: {
                        // Poll again
                        return;
                    }
                    default: {
                        // We got some other state, so stop polling
                        if (!this._isDisposed) {
                            this.updateRepoEntry(repo, polledState ?? { status: RepoStatus.CouldNotCheckIndexStatus, repo: currentRepoEntry.repo, remoteInfo: currentRepoEntry.remoteInfo });
                        }
                        return onComplete();
                    }
                }
            }
            else {
                this._logService.trace(`CodeSearchRepoTracker.startPollingForRepoIndexingComplete(${repo.rootUri}). Found unknown repo state: ${currentRepoEntry.status}. Stopping polling`);
                return onComplete();
            }
        }, this._repoIndexPollingInterval);
        return deferredP.p;
    }
    async diffWithIndexedCommit(repoInfo) {
        if ((0, utils_1.isGitHubRemoteRepository)(repoInfo.repo.rootUri)) {
            // TODO: always assumes no diff. Can we get a real diff somehow?
            return { changes: [] };
        }
        const doDiffWith = async (ref) => {
            try {
                return await this._gitService.diffWith(repoInfo.repo.rootUri, ref);
            }
            catch (e) {
                this._logService.trace(`CodeSearchRepoTracker.diffWithIndexedCommit(${repoInfo.repo.rootUri}).Could not compute diff against: ${ref}.Error: ${e} `);
            }
        };
        if (repoInfo.status === RepoStatus.NotYetIndexed) {
            const changes = await doDiffWith('@{upstream}');
            return changes ? { changes } : undefined;
        }
        if (repoInfo.status === RepoStatus.Ready) {
            const changesAgainstIndexedCommit = repoInfo.indexedCommit ? await doDiffWith(repoInfo.indexedCommit) : undefined;
            if (changesAgainstIndexedCommit) {
                return { changes: changesAgainstIndexedCommit, mayBeOutdated: false };
            }
            this._logService.trace(`CodeSearchRepoTracker.diffWithIndexedCommit(${repoInfo.repo.rootUri}).Falling back to diff against upstream.`);
            const changesAgainstUpstream = await doDiffWith('@{upstream}');
            if (changesAgainstUpstream) {
                return { changes: changesAgainstUpstream, mayBeOutdated: true };
            }
            this._logService.trace(`CodeSearchRepoTracker.diffWithIndexedCommit(${repoInfo.repo.rootUri}).Could not compute any diff.`);
        }
        return undefined;
    }
    updateIndexedCommitForAllRepos() {
        this._logService.trace(`CodeSearchRepoTracker.updateIndexedCommitForAllRepos`);
        for (const repo of this._repos.values()) {
            if (repo.status !== RepoStatus.Ready) {
                continue;
            }
            this.getRepoIndexStatusFromEndpoint(repo.repo, repo.remoteInfo, cancellation_1.CancellationToken.None)
                .then((newStatus) => {
                if (this._isDisposed) {
                    return;
                }
                if (newStatus.status === RepoStatus.Ready && newStatus.indexedCommit !== repo.indexedCommit) {
                    this.updateRepoEntry(repo.repo, newStatus);
                }
            }, () => {
                // Noop
            });
        }
    }
};
exports.CodeSearchRepoTracker = CodeSearchRepoTracker;
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchRepoTracker::initialize')
], CodeSearchRepoTracker.prototype, "initialize", null);
__decorate([
    (0, logExecTime_1.LogExecTime)(self => self._logService, 'CodeSearchRepoTracker::openGitRepo')
], CodeSearchRepoTracker.prototype, "openGitRepo", null);
exports.CodeSearchRepoTracker = CodeSearchRepoTracker = __decorate([
    __param(0, adoCodeSearchService_1.IAdoCodeSearchService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, codeSearchRepoAuth_1.ICodeSearchAuthenticationService),
    __param(3, gitExtensionService_1.IGitExtensionService),
    __param(4, githubCodeSearchService_1.IGithubCodeSearchService),
    __param(5, gitService_1.IGitService),
    __param(6, logService_1.ILogService),
    __param(7, simulationTestContext_1.ISimulationTestContext),
    __param(8, telemetry_1.ITelemetryService),
    __param(9, workspaceService_1.IWorkspaceService)
], CodeSearchRepoTracker);
//# sourceMappingURL=codeSearchRepoTracker.js.map