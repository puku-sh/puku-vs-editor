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
exports.RepoInfoTelemetry = void 0;
const copilotTokenStore_1 = require("../../../platform/authentication/common/copilotTokenStore");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const gitDiffService_1 = require("../../../platform/git/common/gitDiffService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const logService_1 = require("../../../platform/log/common/logService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceFileIndex_1 = require("../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
// Create a mapping for the git status enum to put the actual status string in telemetry
// The enum is a const enum and part of the public git extension API, so the order should stay stable
const STATUS_TO_STRING = {
    0: 'INDEX_MODIFIED',
    1: 'INDEX_ADDED',
    2: 'INDEX_DELETED',
    3: 'INDEX_RENAMED',
    4: 'INDEX_COPIED',
    5: 'MODIFIED',
    6: 'DELETED',
    7: 'UNTRACKED',
    8: 'IGNORED',
    9: 'INTENT_TO_ADD',
    10: 'INTENT_TO_RENAME',
    11: 'TYPE_CHANGED',
    12: 'ADDED_BY_US',
    13: 'ADDED_BY_THEM',
    14: 'DELETED_BY_US',
    15: 'DELETED_BY_THEM',
    16: 'BOTH_ADDED',
    17: 'BOTH_DELETED',
    18: 'BOTH_MODIFIED',
};
// Max telemetry payload size is 1MB, we add shared properties in further code and JSON structure overhead to that
// so check our diff JSON size against 900KB to be conservative with space
const MAX_DIFFS_JSON_SIZE = 900 * 1024;
// Max changes to avoid degenerate cases like mass renames
const MAX_CHANGES = 100;
// Only send ending telemetry on states where we capture repo info or no changes currently
function shouldSendEndTelemetry(result) {
    return result === 'success' || result === 'noChanges';
}
/*
* Handles sending internal only telemetry about the current git repository
*/
let RepoInfoTelemetry = class RepoInfoTelemetry {
    constructor(_telemetryMessageId, _telemetryService, _gitService, _gitDiffService, _gitExtensionService, _copilotTokenStore, _logService, _fileSystemService, _workspaceFileIndex) {
        this._telemetryMessageId = _telemetryMessageId;
        this._telemetryService = _telemetryService;
        this._gitService = _gitService;
        this._gitDiffService = _gitDiffService;
        this._gitExtensionService = _gitExtensionService;
        this._copilotTokenStore = _copilotTokenStore;
        this._logService = _logService;
        this._fileSystemService = _fileSystemService;
        this._workspaceFileIndex = _workspaceFileIndex;
        this._beginTelemetrySent = false;
    }
    /*
    * Sends the begin event telemetry, make sure to only send one time, as multiple PanelChatTelemetry instances
    * are created per user request.
    */
    async sendBeginTelemetryIfNeeded() {
        if (this._beginTelemetrySent) {
            // Already sent or in progress
            await this._beginTelemetryPromise;
            return;
        }
        try {
            this._beginTelemetrySent = true;
            this._beginTelemetryPromise = this._sendRepoInfoTelemetry('begin');
            const gitInfo = await this._beginTelemetryPromise;
            this._beginTelemetryResult = gitInfo?.properties.result;
        }
        catch (error) {
            this._logService.warn(`Failed to send begin repo info telemetry ${error}`);
        }
    }
    /*
    * Sends the end event telemetry
    */
    async sendEndTelemetry() {
        await this._beginTelemetryPromise;
        // Skip end telemetry if begin wasn't successful
        if (!shouldSendEndTelemetry(this._beginTelemetryResult)) {
            return;
        }
        try {
            await this._sendRepoInfoTelemetry('end');
        }
        catch (error) {
            this._logService.warn(`Failed to send end repo info telemetry ${error}`);
        }
    }
    async _sendRepoInfoTelemetry(location) {
        if (this._copilotTokenStore.copilotToken?.isInternal !== true) {
            return undefined;
        }
        const repoInfo = await this._getRepoInfoTelemetry();
        if (!repoInfo) {
            return undefined;
        }
        const properties = {
            ...repoInfo.properties,
            location,
            telemetryMessageId: this._telemetryMessageId
        };
        this._telemetryService.sendInternalMSFTTelemetryEvent('request.repoInfo', properties, repoInfo.measurements);
        return repoInfo;
    }
    async _getRepoInfoTelemetry() {
        const repoContext = this._gitService.activeRepository.get();
        if (!repoContext) {
            return;
        }
        // Get our best repo info from the active repository context
        const repoInfo = Array.from((0, gitService_1.getOrderedRepoInfosFromContext)(repoContext))[0];
        if (!repoInfo || !repoInfo.fetchUrl) {
            return;
        }
        const normalizedFetchUrl = (0, gitService_1.normalizeFetchUrl)(repoInfo.fetchUrl);
        // Get the upstream commit from the repository
        const gitAPI = this._gitExtensionService.getExtensionApi();
        const repository = gitAPI?.getRepository(repoContext.rootUri);
        if (!repository) {
            return;
        }
        let upstreamCommit = await repository.getMergeBase('HEAD', '@{upstream}');
        if (!upstreamCommit) {
            const baseBranch = await repository.getBranchBase('HEAD');
            if (baseBranch) {
                const baseRef = `${baseBranch.remote}/${baseBranch.name}`;
                upstreamCommit = await repository.getMergeBase('HEAD', baseRef);
            }
        }
        if (!upstreamCommit) {
            return;
        }
        // Before we calculate our async diffs, sign up for file system change events
        // Any changes during the async operations will invalidate our diff data and we send it
        // as a failure without a diffs
        const watcher = this._fileSystemService.createFileSystemWatcher('**/*');
        let filesChanged = false;
        const createDisposable = watcher.onDidCreate(() => filesChanged = true);
        const changeDisposable = watcher.onDidChange(() => filesChanged = true);
        const deleteDisposable = watcher.onDidDelete(() => filesChanged = true);
        try {
            const baseProperties = {
                remoteUrl: normalizedFetchUrl,
                repoType: repoInfo.repoId.type,
                headCommitHash: upstreamCommit,
            };
            // Workspace file index will be used to get a rough count of files in the repository
            // We need to call initialize here to have the count, but after first initialize call
            // further calls are no-ops so only a hit first time.
            await this._workspaceFileIndex.initialize();
            const measurements = {
                workspaceFileCount: this._workspaceFileIndex.fileCount,
                changedFileCount: 0, // Will be updated
                diffSizeBytes: 0, // Will be updated
            };
            // Combine our diff against the upstream commit with untracked changes, and working tree changes
            // A change like a new untracked file could end up in either the untracked or working tree changes and won't be in the diffWith.
            const diffChanges = await this._gitService.diffWith(repoContext.rootUri, upstreamCommit) ?? [];
            const changeMap = new Map();
            // Prority to the diffWith changes, then working tree changes, then untracked changes.
            for (const change of diffChanges) {
                changeMap.set(change.uri.toString(), change);
            }
            for (const change of repository.state.workingTreeChanges) {
                if (!changeMap.has(change.uri.toString())) {
                    changeMap.set(change.uri.toString(), change);
                }
            }
            for (const change of repository.state.untrackedChanges) {
                if (!changeMap.has(change.uri.toString())) {
                    changeMap.set(change.uri.toString(), change);
                }
            }
            const changes = Array.from(changeMap.values());
            if (!changes || changes.length === 0) {
                return {
                    properties: { ...baseProperties, diffsJSON: undefined, result: 'noChanges' },
                    measurements
                };
            }
            measurements.changedFileCount = changes.length;
            // Check if there are too many changes (e.g., mass renames)
            if (changes.length > MAX_CHANGES) {
                return {
                    properties: { ...baseProperties, diffsJSON: undefined, result: 'tooManyChanges' },
                    measurements
                };
            }
            // Check if files changed during the git diff operation
            if (filesChanged) {
                return {
                    properties: { ...baseProperties, diffsJSON: undefined, result: 'filesChanged' },
                    measurements
                };
            }
            const diffs = (await this._gitDiffService.getWorkingTreeDiffsFromRef(repoContext.rootUri, changes, upstreamCommit)).map(diff => {
                return {
                    uri: diff.uri.toString(),
                    originalUri: diff.originalUri.toString(),
                    renameUri: diff.renameUri?.toString(),
                    status: STATUS_TO_STRING[diff.status] ?? `UNKNOWN_${diff.status}`,
                    diff: diff.diff,
                };
            });
            // Check if files changed during the individual file diffs
            if (filesChanged) {
                return {
                    properties: { ...baseProperties, diffsJSON: undefined, result: 'filesChanged' },
                    measurements
                };
            }
            const diffsJSON = diffs.length > 0 ? JSON.stringify(diffs) : undefined;
            // Check against our size limit to make sure our telemetry fits in the 1MB limit
            if (diffsJSON) {
                const diffSizeBytes = Buffer.byteLength(diffsJSON, 'utf8');
                measurements.diffSizeBytes = diffSizeBytes;
                if (diffSizeBytes > MAX_DIFFS_JSON_SIZE) {
                    return {
                        properties: { ...baseProperties, diffsJSON: undefined, result: 'diffTooLarge' },
                        measurements
                    };
                }
            }
            return {
                properties: { ...baseProperties, diffsJSON, result: 'success' },
                measurements
            };
        }
        finally {
            createDisposable.dispose();
            changeDisposable.dispose();
            deleteDisposable.dispose();
            watcher.dispose();
        }
    }
};
exports.RepoInfoTelemetry = RepoInfoTelemetry;
exports.RepoInfoTelemetry = RepoInfoTelemetry = __decorate([
    __param(1, telemetry_1.ITelemetryService),
    __param(2, gitService_1.IGitService),
    __param(3, gitDiffService_1.IGitDiffService),
    __param(4, gitExtensionService_1.IGitExtensionService),
    __param(5, copilotTokenStore_1.ICopilotTokenStore),
    __param(6, logService_1.ILogService),
    __param(7, fileSystemService_1.IFileSystemService),
    __param(8, workspaceFileIndex_1.IWorkspaceFileIndex)
], RepoInfoTelemetry);
//# sourceMappingURL=repoInfoTelemetry.js.map