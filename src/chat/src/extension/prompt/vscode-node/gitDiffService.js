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
exports.GitDiffService = void 0;
const vscode_1 = require("vscode");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const types_1 = require("../../../util/common/types");
const path = __importStar(require("../../../util/vs/base/common/path"));
const resources_1 = require("../../../util/vs/base/common/resources");
let GitDiffService = class GitDiffService {
    constructor(_gitExtensionService, _ignoreService, _logService) {
        this._gitExtensionService = _gitExtensionService;
        this._ignoreService = _ignoreService;
        this._logService = _logService;
    }
    async _resolveRepository(repositoryOrUri) {
        if ((0, types_1.isUri)(repositoryOrUri)) {
            const extensionApi = this._gitExtensionService.getExtensionApi();
            return extensionApi?.getRepository(repositoryOrUri) ?? await extensionApi?.openRepository(repositoryOrUri) ?? extensionApi?.repositories.find((repo) => (0, resources_1.isEqual)(repo.rootUri, repositoryOrUri));
        }
        return repositoryOrUri;
    }
    // Get the diff between the current state of the repository and the specified ref for each of the provided changes
    async getWorkingTreeDiffsFromRef(repositoryOrUri, changes, ref) {
        this._logService.debug(`[GitDiffService] Getting working tree diffs from ref ${ref} for ${changes.length} file(s)`);
        const repository = await this._resolveRepository(repositoryOrUri);
        if (!repository) {
            this._logService.debug(`[GitDiffService] Repository not found for uri: ${repositoryOrUri.toString()}`);
            return [];
        }
        const diffs = [];
        for (const change of changes) {
            if (await this._ignoreService.isCopilotIgnored(change.uri)) {
                this._logService.debug(`[GitDiffService] Ignoring change due to content exclusion rule based on uri: ${change.uri.toString()}`);
                continue;
            }
            let diff;
            if (change.status === 7 /* UNTRACKED */) {
                // For untracked files, generate a patch showing all content as additions
                diff = await this._getUntrackedChangePatch(repository, change.uri);
            }
            else {
                // For all other changes, get diff from ref to current working tree state
                diff = await repository.diffWith(ref, change.uri.fsPath);
            }
            diffs.push({
                originalUri: change.originalUri,
                renameUri: change.renameUri,
                status: change.status,
                uri: change.uri,
                diff
            });
        }
        this._logService.debug(`[GitDiffService] Working tree diffs from ref (after context exclusion): ${diffs.length} file(s)`);
        return diffs;
    }
    async getChangeDiffs(repositoryOrUri, changes) {
        this._logService.debug(`[GitDiffService] Changes (before context exclusion): ${changes.length} file(s)`);
        const repository = await this._resolveRepository(repositoryOrUri);
        if (!repository) {
            this._logService.debug(`[GitDiffService] Repository not found for uri: ${repositoryOrUri.toString()}`);
            return [];
        }
        const diffs = [];
        for (const change of changes) {
            if (await this._ignoreService.isCopilotIgnored(change.uri)) {
                this._logService.debug(`[GitDiffService] Ignoring change due to content exclusion rule based on uri: ${change.uri.toString()}`);
                continue;
            }
            switch (change.status) {
                case 0 /* INDEX_ADDED */:
                case 1 /* INDEX_COPIED */:
                case 2 /* INDEX_DELETED */:
                case 3 /* INDEX_MODIFIED */:
                case 4 /* INDEX_RENAMED */:
                    diffs.push({ originalUri: change.originalUri, renameUri: change.renameUri, status: change.status, uri: change.uri, diff: await repository.diffIndexWithHEAD(change.uri.fsPath) });
                    break;
                case 7 /* UNTRACKED */:
                    diffs.push({ originalUri: change.originalUri, renameUri: change.renameUri, status: change.status, uri: change.uri, diff: await this._getUntrackedChangePatch(repository, change.uri) });
                    break;
                default:
                    diffs.push({ originalUri: change.originalUri, renameUri: change.renameUri, status: change.status, uri: change.uri, diff: await repository.diffWithHEAD(change.uri.fsPath) });
                    break;
            }
        }
        this._logService.debug(`[GitDiffService] Changes (after context exclusion): ${diffs.length} file(s)`);
        return diffs;
    }
    async _getUntrackedChangePatch(repository, resource) {
        const patch = [];
        try {
            const buffer = await vscode_1.workspace.fs.readFile(resource);
            const relativePath = path.relative(repository.rootUri.fsPath, resource.fsPath);
            // Header
            patch.push(`diff --git a/${relativePath} b/${relativePath}`);
            // Add original/modified file paths
            patch.push('--- /dev/null', `+++ b/${relativePath}`);
            // Add range header
            patch.push(`@@ -0,0 +1,${buffer.length} @@`);
            // Add content
            patch.push(...buffer.toString().split('\n').map(line => `+${line}`));
        }
        catch (err) {
            console.error(err, `Failed to generate patch file for untracked file: ${resource.toString()}`);
        }
        return patch.join('\n');
    }
};
exports.GitDiffService = GitDiffService;
exports.GitDiffService = GitDiffService = __decorate([
    __param(0, gitExtensionService_1.IGitExtensionService),
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, logService_1.ILogService)
], GitDiffService);
//# sourceMappingURL=gitDiffService.js.map