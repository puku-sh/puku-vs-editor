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
exports.ChatStatusWorkspaceIndexingStatus = exports.MockWorkspaceIndexStateReporter = void 0;
const l10n_1 = require("@vscode/l10n");
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../platform/log/common/logService");
const codeSearchRepoAuth_1 = require("../../../platform/remoteCodeSearch/node/codeSearchRepoAuth");
const codeSearchRepoTracker_1 = require("../../../platform/remoteCodeSearch/node/codeSearchRepoTracker");
const embeddingsChunkSearch_1 = require("../../../platform/workspaceChunkSearch/node/embeddingsChunkSearch");
const workspaceChunkSearchService_1 = require("../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const commands_1 = require("../../linkify/common/commands");
const commands_2 = require("./commands");
const reauthenticateCommandId = '_copilot.workspaceIndex.signInAgain';
const signInFirstTimeCommandId = '_copilot.workspaceIndex.signInToAnything';
class MockWorkspaceIndexStateReporter extends lifecycle_1.Disposable {
    constructor(initialState) {
        super();
        this._onDidChangeIndexState = this._register(new event_1.Emitter());
        this.onDidChangeIndexState = this._onDidChangeIndexState.event;
        this._indexState = initialState;
    }
    async getIndexState() {
        return this._indexState;
    }
    updateIndexState(newState) {
        this._indexState = newState;
        this._onDidChangeIndexState.fire();
    }
}
exports.MockWorkspaceIndexStateReporter = MockWorkspaceIndexStateReporter;
const spinnerCodicon = '$(loading~spin)';
const statusTitle = (0, l10n_1.t) `Workspace Index`;
let ChatStatusWorkspaceIndexingStatus = class ChatStatusWorkspaceIndexingStatus extends lifecycle_1.Disposable {
    constructor(workspaceChunkSearch, _codeSearchAuthService, _logService) {
        super();
        this._codeSearchAuthService = _codeSearchAuthService;
        this._logService = _logService;
        /**
         * Minimum number of outdated files to show.
         *
         * This prevents showing outdated files for normal editing. Small diffs can typically be recomputed very quickly
         * when a request is made.
         */
        this.minOutdatedFileCountToShow = 20;
        this.currentUpdateRequestId = 0;
        this._statusReporter = workspaceChunkSearch;
        this._statusItem = this._register(vscode.window.createChatStatusItem('copilot.workspaceIndexStatus'));
        this._statusItem.title = statusTitle;
        this._register(this._statusReporter.onDidChangeIndexState(() => this._updateStatusItem()));
        this._register(this.registerCommands());
        // Write an initial status
        this._writeStatusItem({
            title: {
                title: (0, l10n_1.t) `Checking index status`,
                learnMoreLink: 'https://aka.ms/copilot-chat-workspace-remote-index', // Top level overview of index
                busy: true
            },
            details: undefined
        });
        // And kick off async update to get the real status
        this._updateStatusItem();
    }
    async _updateStatusItem() {
        const id = ++this.currentUpdateRequestId;
        this._logService.trace(`ChatStatusWorkspaceIndexingStatus::updateStatusItem(id=${id}): starting`);
        const state = await this._statusReporter.getIndexState();
        // Make sure a new request hasn't come in since we started
        if (id !== this.currentUpdateRequestId) {
            this._logService.trace(`ChatStatusWorkspaceIndexingStatus::updateStatusItem(id=${id}): skipping`);
            return;
        }
        const remotelyIndexedMessage = Object.freeze({
            title: (0, l10n_1.t)('Remotely indexed'),
            learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-remote-index',
        });
        // If we have remote index info, prioritize showing information related to it
        switch (state.remoteIndexState.status) {
            case 'initializing':
                return this._writeStatusItem({
                    title: {
                        title: (0, l10n_1.t)('Remote index'),
                        learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-remote-index',
                    },
                    details: {
                        message: (0, l10n_1.t)('Discovering repos'),
                        busy: true,
                    },
                });
            case 'loaded': {
                if (state.remoteIndexState.repos.length > 0) {
                    if (state.remoteIndexState.repos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotIndexable)) {
                        break;
                    }
                    if (state.remoteIndexState.repos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.Ready)) {
                        return this._writeStatusItem({
                            title: remotelyIndexedMessage,
                            details: undefined
                        });
                    }
                    if (state.remoteIndexState.repos.some(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.CheckingStatus || repo.status === codeSearchRepoTracker_1.RepoStatus.Initializing)) {
                        return this._writeStatusItem({
                            title: {
                                title: (0, l10n_1.t)('Remote index'),
                                learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-remote-index',
                            },
                            details: {
                                message: (0, l10n_1.t)('Checking status'),
                                busy: true,
                            },
                        });
                    }
                    if (state.remoteIndexState.repos.some(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.BuildingIndex)) {
                        return this._writeStatusItem({
                            title: remotelyIndexedMessage,
                            details: {
                                message: (0, l10n_1.t)('Building'),
                                busy: true,
                            },
                        });
                    }
                    if (state.remoteIndexState.repos.some(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed)) {
                        const local = await this.getLocalIndexStatusItem(state);
                        if (id !== this.currentUpdateRequestId) {
                            return;
                        }
                        return this._writeStatusItem({
                            title: local ? local.title : {
                                title: state.remoteIndexState.repos.every(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.NotYetIndexed)
                                    ? (0, l10n_1.t)('Remote index not yet built')
                                    : (0, l10n_1.t)('Remote index not yet built for a repo in the workspace'),
                                learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-remote-index',
                            },
                            details: {
                                message: (local?.details?.message ? local?.details?.message + ' ' : '') + `[${(0, l10n_1.t) `Build remote index`}](command:${commands_2.buildRemoteIndexCommandId} "${(0, l10n_1.t)('Build Remote Workspace Index')}")`,
                                busy: local?.details?.busy ?? false,
                            }
                        });
                    }
                    // We have a potential mix of statuses
                    const readyRepos = state.remoteIndexState.repos.filter(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.Ready);
                    const errorRepos = state.remoteIndexState.repos.filter(repo => repo.status === codeSearchRepoTracker_1.RepoStatus.CouldNotCheckIndexStatus || repo.status === codeSearchRepoTracker_1.RepoStatus.NotAuthorized);
                    if (errorRepos.length > 0) {
                        const inaccessibleRepo = errorRepos[0];
                        return this._writeStatusItem({
                            title: {
                                title: readyRepos.length
                                    ? (0, l10n_1.t)('{0} repos with remote indexes', readyRepos.length)
                                    : (0, l10n_1.t)('Remote index unavailable'),
                                learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-remote-index',
                            },
                            details: {
                                message: readyRepos.length
                                    ? (0, l10n_1.t)(`[Try re-authenticating for {0} additional repos](${(0, commands_1.commandUri)(reauthenticateCommandId, [inaccessibleRepo])} "${(0, l10n_1.t)('Try signing in again to access the remote workspace index')}")`, errorRepos.length)
                                    : (0, l10n_1.t)(`[Try re-authenticating](${(0, commands_1.commandUri)(reauthenticateCommandId, [inaccessibleRepo])} "${(0, l10n_1.t)('Try signing in again to access the remote workspace index ')}")`),
                                busy: false,
                            },
                        });
                    }
                }
                break;
            }
        }
        // For local indexing
        const localStatus = await this.getLocalIndexStatusItem(state);
        if (id !== this.currentUpdateRequestId) {
            return;
        }
        this._writeStatusItem(localStatus);
    }
    async getLocalIndexStatusItem(state) {
        const getProgress = async () => {
            const localState = await state.localIndexState.getState();
            if (localState) {
                const remaining = localState.totalFileCount - localState.indexedFileCount;
                if (remaining > this.minOutdatedFileCountToShow) {
                    return {
                        message: (0, l10n_1.t) `${remaining} files to index`,
                        busy: true
                    };
                }
            }
            return undefined;
        };
        switch (state.localIndexState.status) {
            case embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Ready:
            case embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.UpdatingIndex:
                return {
                    title: {
                        title: (0, l10n_1.t)('Locally indexed'),
                        learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-local-index',
                    },
                    details: await getProgress()
                };
            case embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.TooManyFilesForAutomaticIndexing:
                return {
                    title: {
                        title: (0, l10n_1.t) `Basic index`,
                        learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-basic-index'
                    },
                    details: {
                        message: `[${(0, l10n_1.t) `Build local index`}](command:${commands_2.buildLocalIndexCommandId} "${(0, l10n_1.t)('Try to build a more advanced local index of the workspace.')}")`,
                        busy: false
                    },
                };
            case embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Disabled:
                return undefined;
            case embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.TooManyFilesForAnyIndexing:
            default:
                return {
                    title: {
                        title: (0, l10n_1.t) `Basic index`,
                        learnMoreLink: 'https://aka.ms/vscode-copilot-workspace-basic-index'
                    },
                    details: undefined
                };
        }
    }
    _writeStatusItem(values) {
        this._logService.trace(`ChatStatusWorkspaceIndexingStatus::_writeStatusItem()`);
        if (!values) {
            this._statusItem.hide();
            return;
        }
        this._statusItem.show();
        this._statusItem.title = {
            label: statusTitle,
            link: values.title.learnMoreLink
        };
        this._statusItem.description = (0, arrays_1.coalesce)([
            values.title.title,
            values.title.busy ? spinnerCodicon : undefined,
        ]).join(' ');
        if (values.details) {
            this._statusItem.detail = (0, arrays_1.coalesce)([
                values.details.message,
                values.details.busy ? spinnerCodicon : undefined
            ]).join(' ');
        }
        else {
            this._statusItem.detail = '';
        }
    }
    registerCommands() {
        const disposables = new lifecycle_1.DisposableStore();
        disposables.add(vscode.commands.registerCommand(signInFirstTimeCommandId, async (repo) => {
            if (!repo) {
                return;
            }
            return this._codeSearchAuthService.tryAuthenticating(repo);
        }));
        disposables.add(vscode.commands.registerCommand(reauthenticateCommandId, async (repo) => {
            if (!repo) {
                return;
            }
            return this._codeSearchAuthService.tryReauthenticating(repo);
        }));
        return disposables;
    }
};
exports.ChatStatusWorkspaceIndexingStatus = ChatStatusWorkspaceIndexingStatus;
exports.ChatStatusWorkspaceIndexingStatus = ChatStatusWorkspaceIndexingStatus = __decorate([
    __param(0, workspaceChunkSearchService_1.IWorkspaceChunkSearchService),
    __param(1, codeSearchRepoAuth_1.ICodeSearchAuthenticationService),
    __param(2, logService_1.ILogService)
], ChatStatusWorkspaceIndexingStatus);
//# sourceMappingURL=workspaceIndexingStatus.js.map