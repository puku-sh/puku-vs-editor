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
var PRContentProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRContentProvider = exports.PR_SCHEME = void 0;
exports.toPRContentUri = toPRContentUri;
exports.fromPRContentUri = fromPRContentUri;
const vscode = __importStar(require("vscode"));
const githubService_1 = require("../../../platform/github/common/githubService");
const logService_1 = require("../../../platform/log/common/logService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
/**
 * URI scheme for PR content
 */
exports.PR_SCHEME = 'copilot-pr';
/**
 * Create a URI for PR file content
 */
function toPRContentUri(fileName, params) {
    return vscode.Uri.from({
        scheme: exports.PR_SCHEME,
        path: `/${fileName}`,
        query: JSON.stringify({ ...params, fileName })
    });
}
/**
 * Parse parameters from a PR content URI
 */
function fromPRContentUri(uri) {
    if (uri.scheme !== exports.PR_SCHEME) {
        return undefined;
    }
    try {
        return JSON.parse(uri.query);
    }
    catch (e) {
        return undefined;
    }
}
function isMissingOnSide(status, isBase) {
    if (!status) {
        return false;
    }
    if (isBase) {
        return status === 'added';
    }
    return status === 'removed';
}
/**
 * TextDocumentContentProvider for PR content that fetches file content from GitHub
 */
let PRContentProvider = class PRContentProvider extends lifecycle_1.Disposable {
    static { PRContentProvider_1 = this; }
    static { this.ID = 'PRContentProvider'; }
    constructor(_octoKitService, logService) {
        super();
        this._octoKitService = _octoKitService;
        this.logService = logService;
        this._onDidChange = this._register(new vscode.EventEmitter());
        this.onDidChange = this._onDidChange.event;
        // Register text document content provider for PR scheme
        this._register(vscode.workspace.registerTextDocumentContentProvider(exports.PR_SCHEME, this));
    }
    async provideTextDocumentContent(uri) {
        const params = fromPRContentUri(uri);
        if (!params) {
            this.logService.error(`[${PRContentProvider_1.ID}] Invalid PR content URI: ${uri.toString()}`);
            return '';
        }
        if (isMissingOnSide(params.status, params.isBase)) {
            this.logService.trace(`[${PRContentProvider_1.ID}] Skipping fetch for ${params.fileName} because it does not exist on the ${params.isBase ? 'base' : 'head'} side (status: ${params.status})`);
            return '';
        }
        try {
            this.logService.trace(`[${PRContentProvider_1.ID}] Fetching ${params.isBase ? 'base' : 'head'} content for ${params.fileName} ` +
                `from ${params.owner}/${params.repo}#${params.prNumber} at ${params.commitSha}`);
            // Fetch file content from GitHub
            const content = await this._octoKitService.getFileContent(params.owner, params.repo, params.commitSha, params.fileName);
            return content;
        }
        catch (error) {
            this.logService.error(`[${PRContentProvider_1.ID}] Failed to fetch PR file content: ${error instanceof Error ? error.message : String(error)}`);
            // Return empty content instead of throwing to avoid breaking the diff view
            return '';
        }
    }
};
exports.PRContentProvider = PRContentProvider;
exports.PRContentProvider = PRContentProvider = PRContentProvider_1 = __decorate([
    __param(0, githubService_1.IOctoKitService),
    __param(1, logService_1.ILogService)
], PRContentProvider);
//# sourceMappingURL=prContentProvider.js.map