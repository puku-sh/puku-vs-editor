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
exports.FindFilesResult = exports.FindFilesTool = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const l10n = __importStar(require("@vscode/l10n"));
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const searchService_1 = require("../../../platform/search/common/searchService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const racePromise_1 = require("../../../util/common/racePromise");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
let FindFilesTool = class FindFilesTool {
    static { this.toolName = toolNames_1.ToolName.FindFiles; }
    constructor(instantiationService, searchService, workspaceService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.searchService = searchService;
        this.workspaceService = workspaceService;
        this.endpointProvider = endpointProvider;
    }
    async invoke(options, token) {
        (0, toolUtils_1.checkCancellation)(token);
        // TODO strict input validation
        // Certain models just really want to pass incorrect input
        if (options.input.path) {
            throw new Error('The property "path" is not supported');
        }
        const endpoint = options.model && (await this.endpointProvider.getChatEndpoint(options.model));
        const modelFamily = endpoint?.family;
        // The input _should_ be a pattern matching inside a workspace, folder, but sometimes we get absolute paths, so try to resolve them
        const pattern = (0, toolUtils_1.inputGlobToPattern)(options.input.query, this.workspaceService, modelFamily);
        // try find text with a timeout of 20s
        const timeoutInMs = 20_000;
        const results = await (0, racePromise_1.raceTimeoutAndCancellationError)((searchToken) => Promise.resolve(this.searchService.findFiles(pattern, undefined, searchToken)), token, timeoutInMs, 'Timeout in searching files, try a more specific search pattern');
        (0, toolUtils_1.checkCancellation)(token);
        const maxResults = options.input.maxResults ?? 20;
        const resultsToShow = results.slice(0, maxResults);
        // Render the prompt element with a timeout
        const prompt = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, FindFilesResult, { fileResults: resultsToShow, totalResults: results.length }, options.tokenizationOptions, token);
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([new vscodeTypes_1.LanguageModelPromptTsxPart(prompt)]);
        const query = `\`${options.input.query}\``;
        result.toolResultMessage = resultsToShow.length === 0 ?
            new vscodeTypes_1.MarkdownString(l10n.t `Searched for files matching ${query}, no matches`) :
            resultsToShow.length === 1 ?
                new vscodeTypes_1.MarkdownString(l10n.t `Searched for files matching ${query}, 1 match`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Searched for files matching ${query}, ${resultsToShow.length} matches`);
        result.toolResultDetails = resultsToShow;
        return result;
    }
    prepareInvocation(options, token) {
        const query = `\`${options.input.query}\``;
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Searching for files matching ${query}`)
        };
    }
    async resolveInput(input, _promptContext, mode) {
        let query = input.query;
        if (!query.startsWith('**/')) {
            query = `**/${query}`;
        }
        if (query.endsWith('/')) {
            query = `${query}**`;
        }
        return {
            ...input,
            query,
            maxResults: mode === toolsRegistry_1.CopilotToolMode.FullContext ?
                Math.max(input.maxResults ?? 0, 200) :
                input.maxResults ?? 20,
        };
    }
};
exports.FindFilesTool = FindFilesTool;
exports.FindFilesTool = FindFilesTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, searchService_1.ISearchService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, endpointProvider_1.IEndpointProvider)
], FindFilesTool);
toolsRegistry_1.ToolRegistry.registerTool(FindFilesTool);
let FindFilesResult = class FindFilesResult extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render(state, sizing) {
        if (this.props.fileResults.length === 0) {
            return vscpp(vscppf, null, "No files found");
        }
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, { priority: 20 }, this.props.totalResults === 1 ? '1 total result' : `${this.props.totalResults} total results`),
            this.props.fileResults.map(file => vscpp(prompt_tsx_1.TextChunk, { priority: 10 },
                vscpp("references", { value: [new prompt_tsx_1.PromptReference(file, undefined, { isFromTool: true })] }),
                this.promptPathRepresentationService.getFilePath(file))),
            this.props.totalResults > this.props.fileResults.length && vscpp(prompt_tsx_1.TextChunk, { priority: 20 }, '...'));
    }
};
exports.FindFilesResult = FindFilesResult;
exports.FindFilesResult = FindFilesResult = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], FindFilesResult);
//# sourceMappingURL=findFilesTool.js.map