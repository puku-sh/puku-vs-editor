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
exports.GithubRepositoryService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const authentication_1 = require("../../authentication/common/authentication");
const logService_1 = require("../../log/common/logService");
const fetcherService_1 = require("../../networking/common/fetcherService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const githubAPI_1 = require("../common/githubAPI");
let GithubRepositoryService = class GithubRepositoryService {
    constructor(_fetcherService, _authenticationService, _logService, _telemetryService) {
        this._fetcherService = _fetcherService;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this.githubRepositoryInfoCache = new Map();
    }
    async _doGetRepositoryInfo(owner, repo) {
        const authToken = this._authenticationService.permissiveGitHubSession?.accessToken ?? this._authenticationService.anyGitHubSession?.accessToken;
        return (0, githubAPI_1.makeGitHubAPIRequest)(this._fetcherService, this._logService, this._telemetryService, 'https://api.github.com', `repos/${owner}/${repo}`, 'GET', authToken);
    }
    async getRepositoryInfo(owner, repo) {
        const cachedInfo = this.githubRepositoryInfoCache.get(`${owner}/${repo}`);
        if (cachedInfo) {
            return cachedInfo;
        }
        const response = await this._doGetRepositoryInfo(owner, repo);
        if (response) {
            this.githubRepositoryInfoCache.set(`${owner}/${repo}`, response);
            return response;
        }
        throw new Error(`Failed to fetch repository info for ${owner}/${repo}`);
    }
    async isAvailable(org, repo) {
        try {
            const response = await this._doGetRepositoryInfo(org, repo);
            return response !== undefined;
        }
        catch (e) {
            return false;
        }
    }
    async getRepositoryItems(org, repo, path) {
        const paths = [];
        try {
            const authToken = this._authenticationService.permissiveGitHubSession?.accessToken;
            const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
            const response = await (0, githubAPI_1.makeGitHubAPIRequest)(this._fetcherService, this._logService, this._telemetryService, 'https://api.github.com', `repos/${org}/${repo}/contents/${encodedPath}`, 'GET', authToken);
            if (response.ok) {
                const data = (await response.json());
                if (Array.isArray(data)) {
                    for (const child of data) {
                        if ('name' in child && 'path' in child && 'type' in child && 'html_url' in child) {
                            paths.push({ name: child.name, path: child.path, type: child.type, html_url: child.html_url });
                            if (child.type === 'dir') {
                                paths.push(...await this.getRepositoryItems(org, repo, child.path));
                            }
                        }
                    }
                }
            }
            else {
                console.error(`Failed to fetch contents from ${org}:${repo}:${path}`);
                return [];
            }
        }
        catch {
            console.error(`Failed to fetch contents from ${org}:${repo}:${path}`);
            return [];
        }
        return paths;
    }
    async getRepositoryItemContent(org, repo, path) {
        try {
            const authToken = this._authenticationService.permissiveGitHubSession?.accessToken;
            const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
            const response = await (0, githubAPI_1.makeGitHubAPIRequest)(this._fetcherService, this._logService, this._telemetryService, 'https://api.github.com', `repos/${org}/${repo}/contents/${encodedPath}`, 'GET', authToken);
            if (response.ok) {
                const data = (await response.json());
                if ('content' in data) {
                    const content = Buffer.from(data.content, 'base64');
                    return new Uint8Array(content);
                }
                throw new Error('Unexpected data from GitHub');
            }
        }
        catch {
            console.error(`Failed to contents from ${org}:${repo}:${path}`);
        }
    }
};
exports.GithubRepositoryService = GithubRepositoryService;
exports.GithubRepositoryService = GithubRepositoryService = __decorate([
    __param(0, fetcherService_1.IFetcherService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService)
], GithubRepositoryService);
//# sourceMappingURL=githubRepositoryService.js.map