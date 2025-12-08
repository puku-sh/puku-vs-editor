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
exports.PullRequestFileChangesService = exports.IPullRequestFileChangesService = void 0;
const vscode = __importStar(require("vscode"));
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const logService_1 = require("../../../platform/log/common/logService");
const services_1 = require("../../../util/common/services");
const copilotCodingAgentUtils_1 = require("../vscode/copilotCodingAgentUtils");
const prContentProvider_1 = require("./prContentProvider");
exports.IPullRequestFileChangesService = (0, services_1.createServiceIdentifier)('IPullRequestFileChangesService');
let PullRequestFileChangesService = class PullRequestFileChangesService {
    constructor(_gitService, _octoKitService, logService) {
        this._gitService = _gitService;
        this._octoKitService = _octoKitService;
        this.logService = logService;
    }
    async getFileChangesMultiDiffPart(pullRequest) {
        try {
            this.logService.trace(`Getting file changes for PR #${pullRequest.number}`);
            const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
            if (!repoId) {
                this.logService.warn('No repo ID available for fetching PR file changes');
                return undefined;
            }
            this.logService.trace(`Fetching PR files from ${repoId.org}/${repoId.repo} for PR #${pullRequest.number}`);
            const files = await this._octoKitService.getPullRequestFiles(repoId.org, repoId.repo, pullRequest.number);
            this.logService.trace(`Got ${files?.length || 0} files from API`);
            if (!files || files.length === 0) {
                this.logService.trace('No file changes found for pull request');
                return undefined;
            }
            // Check if we have base and head commit SHAs
            if (!pullRequest.baseRefOid || !pullRequest.headRefOid) {
                this.logService.warn('PR missing base or head commit SHA, cannot create diff URIs');
                return undefined;
            }
            const diffEntries = [];
            for (const file of files) {
                // Always use remote URIs to ensure we show the exact PR content
                // Local files may be on different branches or have different changes
                this.logService.trace(`Creating remote URIs for ${file.filename}`);
                const originalUri = (0, prContentProvider_1.toPRContentUri)(file.previous_filename || file.filename, {
                    owner: repoId.org,
                    repo: repoId.repo,
                    prNumber: pullRequest.number,
                    commitSha: pullRequest.baseRefOid,
                    isBase: true,
                    previousFileName: file.previous_filename,
                    status: file.status
                });
                const modifiedUri = (0, prContentProvider_1.toPRContentUri)(file.filename, {
                    owner: repoId.org,
                    repo: repoId.repo,
                    prNumber: pullRequest.number,
                    commitSha: pullRequest.headRefOid,
                    isBase: false,
                    status: file.status
                });
                this.logService.trace(`DiffEntry -> original='${originalUri.toString()}' modified='${modifiedUri.toString()}' (+${file.additions} -${file.deletions})`);
                diffEntries.push({
                    originalUri,
                    modifiedUri,
                    goToFileUri: modifiedUri,
                    added: file.additions,
                    removed: file.deletions,
                });
            }
            const title = `Changes in Pull Request #${pullRequest.number}`;
            return new vscode.ChatResponseMultiDiffPart(diffEntries, title, false);
        }
        catch (error) {
            this.logService.error(`Failed to get file changes multi diff part: ${error}`);
            return undefined;
        }
    }
};
exports.PullRequestFileChangesService = PullRequestFileChangesService;
exports.PullRequestFileChangesService = PullRequestFileChangesService = __decorate([
    __param(0, gitService_1.IGitService),
    __param(1, githubService_1.IOctoKitService),
    __param(2, logService_1.ILogService)
], PullRequestFileChangesService);
//# sourceMappingURL=pullRequestFileChangesService.js.map