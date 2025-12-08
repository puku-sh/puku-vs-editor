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
exports.FindMatch = exports.FindTextInFilesResult = exports.FindTextInFilesTool = void 0;
exports.isTextSearchMatch = isTextSearchMatch;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const offsetLineColumnConverter_1 = require("../../../platform/editing/common/offsetLineColumnConverter");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const searchService_1 = require("../../../platform/search/common/searchService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const racePromise_1 = require("../../../util/common/racePromise");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const strings_1 = require("../../../util/vs/base/common/strings");
const position_1 = require("../../../util/vs/editor/common/core/position");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("./toolUtils");
const MaxResultsCap = 200;
let FindTextInFilesTool = class FindTextInFilesTool {
    static { this.toolName = toolNames_1.ToolName.FindTextInFiles; }
    constructor(instantiationService, searchService, workspaceService, endpointProvider) {
        this.instantiationService = instantiationService;
        this.searchService = searchService;
        this.workspaceService = workspaceService;
        this.endpointProvider = endpointProvider;
    }
    async invoke(options, token) {
        // TODO strict input validation
        // Certain models just really want to pass incorrect input
        if (options.input.pattern) {
            throw new Error('The property "pattern" is not supported, please use "query"');
        }
        const endpoint = options.model && (await this.endpointProvider.getChatEndpoint(options.model));
        const modelFamily = endpoint?.family;
        // The input _should_ be a pattern matching inside a workspace, folder, but sometimes we get absolute paths, so try to resolve them
        const patterns = options.input.includePattern ? (0, toolUtils_1.inputGlobToPattern)(options.input.includePattern, this.workspaceService, modelFamily) : undefined;
        (0, toolUtils_1.checkCancellation)(token);
        const askedForTooManyResults = options.input.maxResults && options.input.maxResults > MaxResultsCap;
        const maxResults = Math.min(options.input.maxResults ?? 20, MaxResultsCap);
        const isRegExp = options.input.isRegexp ?? true;
        const queryIsValidRegex = this.isValidRegex(options.input.query);
        // try find text with a timeout of 20s
        const timeoutInMs = 20_000;
        let results = await (0, racePromise_1.raceTimeoutAndCancellationError)((searchToken) => this.searchAndCollectResults(options.input.query, isRegExp, patterns, maxResults, searchToken), token, timeoutInMs, 
        // embed message to give LLM hint about what to do next
        `Timeout in searching text in files with ${isRegExp ? 'regex' : 'literal'} search, try a more specific search pattern or change regex/literal mode`);
        // If we still have no results, we need to try the opposite regex mode
        if (!results.length && queryIsValidRegex) {
            results = await (0, racePromise_1.raceTimeoutAndCancellationError)((searchToken) => this.searchAndCollectResults(options.input.query, !isRegExp, patterns, maxResults, searchToken), token, timeoutInMs, 
            // embed message to give LLM hint about what to do next
            `Find ${results.length} results in searching text in files with ${isRegExp ? 'regex' : 'literal'} search, and then another searching hits timeout in with ${!isRegExp ? 'regex' : 'literal'} search, try a more specific search pattern`);
        }
        const prompt = await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, FindTextInFilesResult, { textResults: results, maxResults, askedForTooManyResults: Boolean(askedForTooManyResults) }, options.tokenizationOptions, token);
        const result = new vscodeTypes_1.ExtendedLanguageModelToolResult([new vscodeTypes_1.LanguageModelPromptTsxPart(prompt)]);
        const textMatches = results.flatMap(r => {
            if ('ranges' in r) {
                return (0, arrays_1.asArray)(r.ranges).map(rangeInfo => new vscodeTypes_1.Location(r.uri, rangeInfo.sourceRange));
            }
            return [];
        }).slice(0, maxResults);
        const query = this.formatQueryString(options.input);
        result.toolResultMessage = this.getResultMessage(isRegExp, query, textMatches.length);
        result.toolResultDetails = textMatches;
        return result;
    }
    getResultMessage(isRegExp, query, count) {
        if (count === 0) {
            return isRegExp
                ? new vscodeTypes_1.MarkdownString(l10n.t `Searched for regex ${query}, no results`)
                : new vscodeTypes_1.MarkdownString(l10n.t `Searched for text ${query}, no results`);
        }
        else if (count === 1) {
            return isRegExp
                ? new vscodeTypes_1.MarkdownString(l10n.t `Searched for regex ${query}, 1 result`)
                : new vscodeTypes_1.MarkdownString(l10n.t `Searched for text ${query}, 1 result`);
        }
        else {
            return isRegExp
                ? new vscodeTypes_1.MarkdownString(l10n.t `Searched for regex ${query}, ${count} results`)
                : new vscodeTypes_1.MarkdownString(l10n.t `Searched for text ${query}, ${count} results`);
        }
    }
    isValidRegex(pattern) {
        try {
            new RegExp(pattern);
            return true;
        }
        catch {
            return false;
        }
    }
    async searchAndCollectResults(query, isRegExp, patterns, maxResults, token) {
        const searchResult = this.searchService.findTextInFiles2({
            pattern: query,
            isRegExp,
        }, {
            include: patterns ? patterns : undefined,
            maxResults: maxResults + 1
        }, token);
        const results = [];
        for await (const item of searchResult.results) {
            (0, toolUtils_1.checkCancellation)(token);
            results.push(item);
        }
        // Necessary in case it was rejected
        await searchResult.complete;
        return results;
    }
    prepareInvocation(options, token) {
        const isRegExp = options.input.isRegexp ?? true;
        const query = this.formatQueryString(options.input);
        return {
            invocationMessage: isRegExp ?
                new vscodeTypes_1.MarkdownString(l10n.t `Searching for regex ${query}`) :
                new vscodeTypes_1.MarkdownString(l10n.t `Searching for text ${query}`),
        };
    }
    /**
     * Formats text as a Markdown inline code span that is resilient to backticks within the text.
     * It chooses a backtick fence one longer than the longest run of backticks in the content,
     * and pads with a space when the content begins or ends with a backtick as per CommonMark.
     */
    formatCodeSpan(text) {
        const matches = text.match(/`+/g);
        const maxRun = matches ? matches.reduce((m, s) => Math.max(m, s.length), 0) : 0;
        const fence = '`'.repeat(maxRun + 1);
        const needsPadding = text.startsWith('`') || text.endsWith('`');
        const inner = needsPadding ? ` ${text} ` : text;
        return `${fence}${inner}${fence}`;
    }
    formatQueryString(input) {
        const querySpan = this.formatCodeSpan(input.query);
        if (input.includePattern && input.includePattern !== '**/*') {
            const patternSpan = this.formatCodeSpan(input.includePattern);
            return `${querySpan} (${patternSpan})`;
        }
        return querySpan;
    }
    async resolveInput(input, _promptContext, mode) {
        let includePattern = input.includePattern;
        if (includePattern === '**') {
            includePattern = undefined;
        }
        if (includePattern && !includePattern.startsWith('**/')) {
            includePattern = `**/${includePattern}`;
        }
        if (includePattern && includePattern.endsWith('/')) {
            includePattern = `${includePattern}**`;
        }
        return {
            maxResults: mode === toolsRegistry_1.CopilotToolMode.FullContext ? 200 : 20,
            ...input,
            includePattern,
        };
    }
};
exports.FindTextInFilesTool = FindTextInFilesTool;
exports.FindTextInFilesTool = FindTextInFilesTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, searchService_1.ISearchService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, endpointProvider_1.IEndpointProvider)
], FindTextInFilesTool);
toolsRegistry_1.ToolRegistry.registerTool(FindTextInFilesTool);
/** Max number of characters between matching ranges. */
const MAX_CHARS_BETWEEN_MATCHES = 500;
/** Start priority for findFiles lines so that context is gradually trimmed. */
const FIND_FILES_START_PRIORITY = 1000;
class FindTextInFilesResult extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        const textMatches = this.props.textResults.filter(isTextSearchMatch);
        if (textMatches.length === 0) {
            return vscpp(vscppf, null, "No matches found");
        }
        const numResults = textMatches.reduce((acc, result) => acc + result.ranges.length, 0);
        const resultCountToDisplay = Math.min(numResults, this.props.maxResults);
        const numResultsText = numResults === 1 ? '1 match' : `${resultCountToDisplay} matches`;
        const maxResultsTooLargeText = this.props.askedForTooManyResults ? ` (maxResults capped at ${MaxResultsCap})` : '';
        const maxResultsText = numResults > this.props.maxResults ? ` (more results are available)` : '';
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.TextChunk, { priority: 20 },
                numResultsText,
                maxResultsText,
                maxResultsTooLargeText),
            textMatches.flatMap(result => {
                // The result preview line always ends in a newline, I think that makes sense but don't display an extra empty line
                const previewText = result.previewText.replace(/\n$/, '');
                return result.ranges.map((rangeInfo, i) => {
                    return vscpp(FindMatch, { passPriority: true, preview: previewText, rangeInPreview: rangeInfo.previewRange, rangeInDocument: rangeInfo.sourceRange, uri: result.uri });
                });
            }));
    }
}
exports.FindTextInFilesResult = FindTextInFilesResult;
/**
 * 1. Removes excessive extra character data from the match, e.g. avoiding
 * giant minified lines
 * 2. Wraps the match in a <match> tag
 * 3. Prioritizes lines in the middle of the match where the range lies
 */
let FindMatch = class FindMatch extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render() {
        const { uri, preview, rangeInDocument, rangeInPreview } = this.props;
        const convert = new offsetLineColumnConverter_1.OffsetLineColumnConverter(preview);
        const start = convert.positionToOffset(new position_1.Position(rangeInPreview.start.line + 1, rangeInPreview.start.character + 1));
        const end = convert.positionToOffset(new position_1.Position(rangeInPreview.end.line + 1, rangeInPreview.end.character + 1));
        let toPreview = preview;
        let lineStartsAt = (rangeInDocument.start.line + 1) - (0, strings_1.count)(preview.slice(0, start), '\n');
        if (preview.length - end > MAX_CHARS_BETWEEN_MATCHES) {
            toPreview = preview.slice(0, end + MAX_CHARS_BETWEEN_MATCHES) + '...';
        }
        if (start > MAX_CHARS_BETWEEN_MATCHES) {
            lineStartsAt += (0, strings_1.count)(preview.slice(0, start - MAX_CHARS_BETWEEN_MATCHES), '\n');
            toPreview = '...' + toPreview.slice(start - MAX_CHARS_BETWEEN_MATCHES);
        }
        const toPreviewLines = toPreview.split('\n');
        const center = Math.floor(toPreviewLines.length / 2);
        return vscpp(tag_1.Tag, { name: "match", attrs: {
                path: this.promptPathRepresentationService.getFilePath(uri),
                line: rangeInDocument.start.line + 1,
            } },
            vscpp("references", { value: [new prompt_tsx_1.PromptReference(new vscodeTypes_1.Location(this.props.uri, rangeInDocument), undefined, { isFromTool: true })] }),
            toPreviewLines.map((line, i) => vscpp(prompt_tsx_1.TextChunk, { priority: FIND_FILES_START_PRIORITY - Math.abs(i - center) }, line)));
    }
};
exports.FindMatch = FindMatch;
exports.FindMatch = FindMatch = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService)
], FindMatch);
function isTextSearchMatch(obj) {
    return 'ranges' in obj;
}
//# sourceMappingURL=findTextInFilesTool.js.map