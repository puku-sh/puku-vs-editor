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
exports.ChatSessionsUriHandler = exports.UriHandlers = exports.UriHandlerPaths = exports.GHPR_EXTENSION_ID = void 0;
const vscode = __importStar(require("vscode"));
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const logService_1 = require("../../../platform/log/common/logService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const constants_1 = require("../../common/constants");
const copilotCodingAgentUtils_1 = require("./copilotCodingAgentUtils");
exports.GHPR_EXTENSION_ID = 'GitHub.vscode-pull-request-github';
const PENDING_CHAT_SESSION_STORAGE_KEY = 'puku.pendingChatSession';
var UriHandlerPaths;
(function (UriHandlerPaths) {
    UriHandlerPaths["OpenSession"] = "/openAgentSession";
    UriHandlerPaths["External_OpenPullRequestWebview"] = "/open-pull-request-webview";
})(UriHandlerPaths || (exports.UriHandlerPaths = UriHandlerPaths = {}));
exports.UriHandlers = {
    [UriHandlerPaths.OpenSession]: constants_1.EXTENSION_ID,
    [UriHandlerPaths.External_OpenPullRequestWebview]: exports.GHPR_EXTENSION_ID
};
let ChatSessionsUriHandler = class ChatSessionsUriHandler extends lifecycle_1.Disposable {
    constructor(_octoKitService, _gitService, _gitExtensionService, _extensionContext, _logService, fileSystemService, _telemetryService) {
        super();
        this._octoKitService = _octoKitService;
        this._gitService = _gitService;
        this._gitExtensionService = _gitExtensionService;
        this._extensionContext = _extensionContext;
        this._logService = _logService;
        this.fileSystemService = fileSystemService;
        this._telemetryService = _telemetryService;
    }
    async handleUri(uri) {
        switch (uri.path) {
            case UriHandlerPaths.OpenSession:
                {
                    const params = new URLSearchParams(uri.query);
                    const type = params.get('type');
                    const prId = params.get('id');
                    const url = decodeURIComponent(params.get('url') || '');
                    const branch = decodeURIComponent(params.get('branch') || '');
                    /* __GDPR__
                        "copilot.codingAgent.deeplink" : {
                            "owner": "rebornix",
                            "comment": "Reports when the ChatSessionsUriHandler handles a URI to open a chat session",
                            "sessionType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The type of chat session" },
                            "hasId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the session has an ID" }
                        }
                    */
                    this._telemetryService.sendTelemetryEvent('copilot.codingAgent.deeplink', { microsoft: true, github: false }, {
                        sessionType: type || 'unknown',
                        hasId: prId ? 'true' : 'false',
                    });
                    if (type?.startsWith('copilot') && prId) {
                        // For now we hardcode it to this type, eventually the full type should come in the URI
                        return this._openGitHubSession('copilot-cloud-agent', prId, url, branch);
                    }
                }
        }
    }
    async waitAndGetGlobalState() {
        let timeout = 500;
        let state = undefined;
        while (!state && timeout > 0) {
            state = this._extensionContext.globalState.get(PENDING_CHAT_SESSION_STORAGE_KEY);
            await new Promise(resolve => setTimeout(resolve, 100));
            timeout -= 100;
        }
        return state;
    }
    async _openGitHubSession(type, id, url, branch) {
        const gitAPI = this._gitExtensionService.getExtensionApi();
        if (gitAPI && url && branch) {
            // Check if we already have this repo open in the workspace
            const existingRepo = this._getAlreadyOpenWorkspace(gitAPI, url);
            if (existingRepo) {
                // Repo is already open, no need to clone
                await this.openPendingSession({ repo: existingRepo, branch, id, type });
                return;
            }
            // We're going to need a window reload, save the info to global state
            const pendingSession = {
                type,
                id,
                url,
                branch,
                timestamp: Date.now()
            };
            await this._extensionContext.globalState.update(PENDING_CHAT_SESSION_STORAGE_KEY, pendingSession);
            const pendingSessionUri = vscode.Uri.joinPath(this._extensionContext.globalStorageUri, '.pendingSession');
            try {
                this.fileSystemService.writeFile(pendingSessionUri, Buffer.from(`${id}\n${Date.now()}`, 'utf-8'));
            }
            catch {
            }
            // Check if we have workspaces associated with this repo
            const uri = vscode.Uri.parse(url);
            const cachedWorkspaces = await gitAPI.getRepositoryWorkspace(uri);
            let folderToOpen = null;
            if (!cachedWorkspaces || (cachedWorkspaces && cachedWorkspaces.length > 1)) {
                const selectFolderItem = {
                    label: 'Select Directory...',
                    description: 'Choose a directory to open',
                    uri: undefined
                };
                const cloneRepoItem = {
                    label: 'Clone Repository and Open',
                    description: 'Clone the repository to a new local folder and open it',
                    uri: undefined
                };
                const items = [selectFolderItem];
                items.push({
                    label: '',
                    kind: vscode.QuickPickItemKind.Separator
                });
                items.push(cloneRepoItem);
                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select how to open the repository',
                    ignoreFocusOut: true,
                    title: 'Open Repository'
                });
                if (selected) {
                    if (selected === selectFolderItem) {
                        const selectedFolder = await vscode.window.showOpenDialog({
                            canSelectFiles: false,
                            canSelectFolders: true,
                            canSelectMany: false,
                            openLabel: 'Select Directory',
                            title: 'Select directory to open'
                        });
                        if (selectedFolder && selectedFolder.length > 0) {
                            folderToOpen = selectedFolder[0];
                        }
                    }
                    else if (selected === cloneRepoItem) {
                        folderToOpen = await gitAPI.clone(vscode.Uri.parse(url), { postCloneAction: 'none', ref: branch });
                    }
                }
            }
            else {
                folderToOpen = cachedWorkspaces[0];
            }
            if (!folderToOpen) {
                return;
            }
            // Reuse the window if there are no folders open
            const forceReuseWindow = ((vscode.workspace.workspaceFile === undefined) && (vscode.workspace.workspaceFolders === undefined));
            vscode.commands.executeCommand('vscode.openFolder', folderToOpen, { forceReuseWindow });
            return;
        }
        this.openPendingSession();
    }
    canHandleUri(uri) {
        return Object.values(UriHandlerPaths).includes(uri.path);
    }
    /**
     * Check for pending chat sessions that were saved before cloning and opening workspace.
     * This should be called when the extension activates in a new workspace.
     */
    async openPendingSession(details) {
        let repository;
        let branchName = '';
        let prId = '';
        let type = '';
        if (!details) {
            const pendingSession = await this.waitAndGetGlobalState();
            if (!pendingSession) {
                return;
            }
            // Check if the pending session is recent (within 10 minutes)
            const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
            if (pendingSession.timestamp > tenMinutesAgo) {
                // Clear expired pending session
                const gitAPI = await this.waitForGitExtensionAPI(this._gitExtensionService);
                if (!gitAPI) {
                    return;
                }
                repository = this._getAlreadyOpenWorkspace(gitAPI, pendingSession.url);
                branchName = pendingSession.branch;
                prId = pendingSession.id;
                type = pendingSession.type;
            }
            else {
                this._logService.warn('Found pending sessions but they have expired at ' + new Date(pendingSession.timestamp).toISOString());
            }
        }
        else {
            repository = details.repo;
            branchName = details.branch;
            prId = details.id;
            type = details.type;
        }
        // Return if we still don't have the details.
        if (!repository || !branchName || !prId || !type) {
            return;
        }
        await repository.fetch({ ref: branchName });
        const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
        if (!repoId) {
            return;
        }
        const pullRequests = await this._octoKitService.getCopilotPullRequestsForUser(repoId.org, repoId.repo);
        const pullRequest = pullRequests.find(pr => pr.id === prId);
        if (!pullRequest) {
            return;
        }
        const uri = vscode.Uri.from({ scheme: 'copilot-cloud-agent', path: '/' + pullRequest.number.toString() });
        await this._extensionContext.globalState.update(PENDING_CHAT_SESSION_STORAGE_KEY, undefined);
        await vscode.commands.executeCommand('vscode.open', uri);
    }
    async waitForGitExtensionAPI(gitExtensionService) {
        let timeout = 5000;
        let api = gitExtensionService.getExtensionApi();
        while (!api || api.state === 'uninitialized') {
            api = gitExtensionService.getExtensionApi();
            await new Promise(resolve => setTimeout(resolve, 100));
            timeout -= 100;
            if (timeout <= 0) {
                break;
            }
        }
        return api;
    }
    _getAlreadyOpenWorkspace(gitApi, cloneUri) {
        const normalizedCloneUri = this._normalizeGitUri(cloneUri);
        for (const repo of gitApi.repositories) {
            // Check all remotes for this repository
            const remotes = repo.state.remotes;
            for (const remote of remotes) {
                for (const url of remote.fetchUrl ? [remote.fetchUrl] : []) {
                    const normalizedRemoteUri = this._normalizeGitUri(url);
                    if (normalizedRemoteUri === normalizedCloneUri) {
                        return repo;
                    }
                }
            }
        }
        return undefined;
    }
    _normalizeGitUri(uri) {
        return uri.toLowerCase()
            .replace(/\.git$/, '')
            .replace(/^git@github\.com:/, 'https://github.com/')
            .replace(/^https:\/\/github\.com\//, '')
            .replace(/\/$/, '');
    }
};
exports.ChatSessionsUriHandler = ChatSessionsUriHandler;
exports.ChatSessionsUriHandler = ChatSessionsUriHandler = __decorate([
    __param(0, githubService_1.IOctoKitService),
    __param(1, gitService_1.IGitService),
    __param(2, gitExtensionService_1.IGitExtensionService),
    __param(3, extensionContext_1.IVSCodeExtensionContext),
    __param(4, logService_1.ILogService),
    __param(5, fileSystemService_1.IFileSystemService),
    __param(6, telemetry_1.ITelemetryService)
], ChatSessionsUriHandler);
//# sourceMappingURL=chatSessionsUriHandler.js.map