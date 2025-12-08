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
exports.OctoKitService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const authentication_1 = require("../../authentication/common/authentication");
const capiClient_1 = require("../../endpoint/common/capiClient");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const githubService_1 = require("./githubService");
let OctoKitService = class OctoKitService extends githubService_1.BaseOctoKitService {
    constructor(_authService, capiClientService, fetcherService, logService, telemetryService) {
        super(capiClientService, fetcherService, logService, telemetryService);
        this._authService = _authService;
    }
    async getCurrentAuthedUser() {
        const authToken = (await this._authService.getAnyGitHubSession())?.accessToken;
        if (!authToken) {
            return undefined;
        }
        return await this.getCurrentAuthedUserWithToken(authToken);
    }
    async getCopilotPullRequestsForUser(owner, repo) {
        const auth = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }));
        if (!auth?.accessToken) {
            return [];
        }
        const response = await this.getCopilotPullRequestForUserWithToken(owner, repo, auth.account.label, auth.accessToken);
        return response;
    }
    async getCopilotSessionsForPR(prId) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return [];
        }
        const response = await this.getCopilotSessionsForPRWithToken(prId, authToken);
        const { sessions } = response;
        return sessions;
    }
    async getSessionLogs(sessionId) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return '';
        }
        const response = await this.getSessionLogsWithToken(sessionId, authToken);
        return response;
    }
    async getSessionInfo(sessionId) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        const response = await this.getSessionInfoWithToken(sessionId, authToken);
        if (typeof response === 'string') {
            return JSON.parse(response);
        }
        return response;
    }
    async postCopilotAgentJob(owner, name, apiVersion, payload) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        return this.postCopilotAgentJobWithToken(owner, name, apiVersion, 'vscode-copilot-chat', payload, authToken);
    }
    async getJobByJobId(owner, repo, jobId, userAgent) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        return this.getJobByJobIdWithToken(owner, repo, jobId, userAgent, authToken);
    }
    async getJobBySessionId(owner, repo, sessionId, userAgent) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        return this.getJobBySessionIdWithToken(owner, repo, sessionId, userAgent, authToken);
    }
    async addPullRequestComment(pullRequestId, commentBody) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        return this.addPullRequestCommentWithToken(pullRequestId, commentBody, authToken);
    }
    async getAllOpenSessions(nwo) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return [];
        }
        return this.getAllOpenSessionsWithToken(nwo, authToken);
    }
    async getPullRequestFromGlobalId(globalId) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No authentication token available');
        }
        return this.getPullRequestFromSessionWithToken(globalId, authToken);
    }
    async getCustomAgents(owner, repo) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return [];
        }
        const { agents } = await this.getCustomAgentsWithToken(owner, repo, authToken);
        if (!Array.isArray(agents)) {
            return [];
        }
        return agents;
    }
    async getPullRequestFiles(owner, repo, pullNumber) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return [];
        }
        return this.getPullRequestFilesWithToken(owner, repo, pullNumber, authToken);
    }
    async closePullRequest(owner, repo, pullNumber) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            return false;
        }
        return this.closePullRequestWithToken(owner, repo, pullNumber, authToken);
    }
    async getFileContent(owner, repo, ref, path) {
        const authToken = (await this._authService.getPermissiveGitHubSession({ createIfNone: true }))?.accessToken;
        if (!authToken) {
            throw new Error('No GitHub authentication available');
        }
        return this.getFileContentWithToken(owner, repo, ref, path, authToken);
    }
};
exports.OctoKitService = OctoKitService;
exports.OctoKitService = OctoKitService = __decorate([
    __param(0, authentication_1.IAuthenticationService),
    __param(1, capiClient_1.ICAPIClientService),
    __param(2, fetcherService_1.IFetcherService),
    __param(3, logService_1.ILogService),
    __param(4, telemetry_1.ITelemetryService)
], OctoKitService);
//# sourceMappingURL=octoKitServiceImpl.js.map