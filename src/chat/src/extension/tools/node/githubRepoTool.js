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
exports.GithubRepoTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const githubCodeSearchService_1 = require("../../../platform/remoteCodeSearch/common/githubCodeSearchService");
const remoteCodeSearch_1 = require("../../../platform/remoteCodeSearch/common/remoteCodeSearch");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const githubAvailableEmbeddingTypes_1 = require("../../../platform/workspaceChunkSearch/common/githubAvailableEmbeddingTypes");
const result_1 = require("../../../util/common/result");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const types_1 = require("../../../util/common/types");
const async_1 = require("../../../util/vs/base/common/async");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const conversation_1 = require("../../prompt/common/conversation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const workspaceContext_1 = require("../../prompts/node/panel/workspace/workspaceContext");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let GithubRepoTool = class GithubRepoTool {
    static { this.toolName = toolNames_1.ToolName.GithubRepo; }
    constructor(_commandService, _instantiationService, _githubCodeSearch, _availableEmbeddingTypesManager, _telemetryService) {
        this._instantiationService = _instantiationService;
        this._githubCodeSearch = _githubCodeSearch;
        this._availableEmbeddingTypesManager = _availableEmbeddingTypesManager;
        this._telemetryService = _telemetryService;
    }
    async invoke(options, token) {
        const githubRepoId = gitService_1.GithubRepoId.parse(options.input.repo);
        if (!githubRepoId) {
            throw new Error('Invalid input. Could not parse repo');
        }
        const embeddingType = await this._availableEmbeddingTypesManager.getPreferredType(false);
        if (!embeddingType) {
            throw new Error('No embedding models available');
        }
        const searchResults = await this._githubCodeSearch.searchRepo({ silent: true }, embeddingType, { githubRepoId, localRepoRoot: undefined, indexedCommit: undefined }, options.input.query, 64, {}, new telemetryCorrelationId_1.TelemetryCorrelationId('github-repo-tool'), token);
        // Map the chunks to URIs
        // TODO: Won't work for proxima or branches not called main
        const chunks = searchResults.chunks.map((entry) => ({
            chunk: {
                ...entry.chunk,
                file: uri_1.URI.joinPath(uri_1.URI.parse('https://github.com'), (0, gitService_1.toGithubNwo)(githubRepoId), 'tree', 'main', entry.chunk.file.path).with({
                    fragment: `L${entry.chunk.range.startLineNumber}-L${entry.chunk.range.endLineNumber}`,
                }),
            },
            distance: entry.distance,
        }));
        let references = [];
        const json = await (0, promptRenderer_1.renderPromptElementJSON)(this._instantiationService, GithubChunkSearchResults, {
            chunks,
            referencesOut: references,
        });
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(json),
        ]);
        references = (0, conversation_1.getUniqueReferences)(references);
        result.toolResultMessage = references.length === 0 ?
            new vscodeTypes_1.MarkdownString(l10n.t `Searched ${githubRepoId.toString()} for "${options.input.query}", no results`) :
            references.length === 1 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Searched ${githubRepoId.toString()} for "${options.input.query}", 1 result`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Searched ${githubRepoId.toString()} for "${options.input.query}", ${references.length} results`);
        result.toolResultDetails = references
            .map(r => r.anchor)
            .filter(r => (0, types_1.isUri)(r) || (0, types_1.isLocation)(r));
        return result;
    }
    async prepareInvocation(options, token) {
        const prepareResult = await (0, async_1.raceCancellationError)(this.doPrepare(options, token), token);
        if (prepareResult.isOk()) {
            return {
                invocationMessage: l10n.t("Searching '{0}' for relevant code snippets", options.input.repo),
            };
        }
        /* __GDPR__
            "githubRepoTool.prepare.error" : {
                "owner": "mjbvz",
                "comment": "Tracks errors for the GitHub repo tool prepare step",
                "errorId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "General reason why the search failed" },
                "errorDetails": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "More detailed info about the failure" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('githubRepoTool.prepare.error', {
            errorId: prepareResult.err.id,
            errorDetails: prepareResult.err.details,
        });
        throw new Error(prepareResult.err.message);
    }
    async doPrepare(options, token) {
        if (!options.input.repo) {
            return result_1.Result.error({
                message: l10n.t `Invalid input. No 'repo' argument provided`,
                id: 'no-repo-arg',
            });
        }
        let githubRepoId = gitService_1.GithubRepoId.parse(options.input.repo);
        if (!githubRepoId) {
            // We may have been passed a full URL
            try {
                const uri = uri_1.URI.parse(options.input.repo);
                if (uri.scheme === 'https' && uri.authority === 'github.com') {
                    const pathParts = uri.path.split('/');
                    if (pathParts.length >= 3) {
                        githubRepoId = new gitService_1.GithubRepoId(pathParts[1], pathParts[2]);
                    }
                }
            }
            catch {
                // Noop
            }
        }
        if (!githubRepoId) {
            return result_1.Result.error({
                message: l10n.t `Invalid input. Could not parse 'repo' argument`,
                id: 'could-not-parse-repo',
            });
        }
        const checkIndexReady = async () => {
            const state = await (0, async_1.raceCancellationError)(this._githubCodeSearch.getRemoteIndexState({ silent: true }, githubRepoId, token), token);
            if (!state.isOk()) {
                if (state.err.type === 'not-authorized') {
                    return result_1.Result.error({
                        message: l10n.t `Not authenticated`,
                        id: 'no-auth-token',
                    });
                }
                else {
                    return result_1.Result.error({
                        message: l10n.t `Could not check status of Github repo index`,
                        id: 'could-not-check-status',
                    });
                }
            }
            if (state.val.status === remoteCodeSearch_1.RemoteCodeSearchIndexStatus.Ready) {
                return result_1.Result.ok(true);
            }
            return result_1.Result.error({
                message: l10n.t `GitHub repo index not yet ready`,
                id: 'unexpected-status',
                details: `status: ${state.val.status}`,
            });
        };
        if ((await checkIndexReady()).isOk()) {
            return result_1.Result.ok(githubRepoId);
        }
        if (!await this._githubCodeSearch.triggerIndexing({ silent: true }, 'tool', githubRepoId, new telemetryCorrelationId_1.TelemetryCorrelationId('GitHubRepoTool'))) {
            return result_1.Result.error({
                message: l10n.t `Could not index Github repo. Repo may not exist or you may not have access to it.`,
                id: 'trigger-indexing-failed',
            });
        }
        const pollAttempts = 10;
        const pollDelay = 1000;
        for (let i = 0; i < pollAttempts; i++) {
            await (0, async_1.raceCancellationError)((0, async_1.timeout)(pollDelay), token);
            if ((await (0, async_1.raceCancellationError)(checkIndexReady(), token)).isOk()) {
                return result_1.Result.ok(githubRepoId);
            }
        }
        return result_1.Result.error({
            message: l10n.t `Github repo index not yet. Please try again shortly`,
            id: 'not-ready-after-polling',
        });
    }
};
exports.GithubRepoTool = GithubRepoTool;
exports.GithubRepoTool = GithubRepoTool = __decorate([
    __param(0, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, githubCodeSearchService_1.IGithubCodeSearchService),
    __param(3, githubAvailableEmbeddingTypes_1.IGithubAvailableEmbeddingTypesService),
    __param(4, telemetry_1.ITelemetryService)
], GithubRepoTool);
class GithubChunkSearchResults extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render(_state, _sizing, _progress, _token) {
        return vscpp(workspaceContext_1.WorkspaceChunkList, { result: { chunks: this.props.chunks, isFullWorkspace: false }, referencesOut: this.props.referencesOut, absolutePaths: true, isToolCall: true });
    }
}
toolsRegistry_1.ToolRegistry.registerTool(GithubRepoTool);
//# sourceMappingURL=githubRepoTool.js.map