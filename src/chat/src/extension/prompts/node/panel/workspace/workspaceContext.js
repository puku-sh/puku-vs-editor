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
exports.WorkspaceContext = exports.WorkspaceChunkList = exports.WorkspaceChunks = exports.MAX_TOOL_CHUNK_TOKEN_COUNT = exports.MAX_CHUNK_TOKEN_COUNT = exports.MAX_CHUNKS_RESULTS = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../../../platform/endpoint/common/endpointProvider");
const logExecTime_1 = require("../../../../../platform/log/common/logExecTime");
const logService_1 = require("../../../../../platform/log/common/logService");
const promptPathRepresentationService_1 = require("../../../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const embeddingsChunkSearch_1 = require("../../../../../platform/workspaceChunkSearch/node/embeddingsChunkSearch");
const workspaceChunkSearchService_1 = require("../../../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const markdown_1 = require("../../../../../util/common/markdown");
const async_1 = require("../../../../../util/vs/base/common/async");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../../../util/vs/base/common/errors");
const lazy_1 = require("../../../../../util/vs/base/common/lazy");
const map_1 = require("../../../../../util/vs/base/common/map");
const range_1 = require("../../../../../util/vs/editor/common/core/range");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const conversation_1 = require("../../../../prompt/common/conversation");
const promptRenderer_1 = require("../../base/promptRenderer");
const metaPrompt_1 = require("./metaPrompt");
const workspaceStructure_1 = require("./workspaceStructure");
/**
 * Maximum number of chunks that we can provide to the model.
 */
exports.MAX_CHUNKS_RESULTS = 128;
/**
 * Maximum number of tokens we will ever use for chunks.
 */
exports.MAX_CHUNK_TOKEN_COUNT = 32_000;
exports.MAX_TOOL_CHUNK_TOKEN_COUNT = 20_000;
let WorkspaceChunks = class WorkspaceChunks extends prompt_tsx_1.PromptElement {
    constructor(props, logService, telemetryService, workspaceChunkSearch, promptEndpoint) {
        super(props);
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.workspaceChunkSearch = workspaceChunkSearch;
        this.promptEndpoint = promptEndpoint;
    }
    async prepare(sizing, progress, token = cancellation_1.CancellationToken.None) {
        const indexState = await this.workspaceChunkSearch.getIndexState();
        if (indexState.localIndexState.status === embeddingsChunkSearch_1.LocalEmbeddingsIndexStatus.Disabled && indexState.remoteIndexState.status === 'disabled') {
            return {};
        }
        const searchResult = await (0, logExecTime_1.logExecTime)(this.logService, 'workspaceContext.perf.prepareWorkspaceChunks', () => {
            return (0, async_1.raceCancellationError)(this.workspaceChunkSearch.searchFileChunks({
                endpoint: this.promptEndpoint,
                tokenBudget: this.props.isToolCall ? exports.MAX_TOOL_CHUNK_TOKEN_COUNT : exports.MAX_CHUNK_TOKEN_COUNT,
                // For full workspace, always use the full workspace token budget since it can be included quickly
                fullWorkspaceTokenBudget: exports.MAX_CHUNK_TOKEN_COUNT,
                maxResults: this.props.maxResults ?? exports.MAX_CHUNKS_RESULTS,
            }, this.props.query, {
                globPatterns: this.props.globPatterns,
            }, this.props.telemetryInfo, progress, token), token);
        }, (execTime, status, result) => {
            /* __GDPR__
                "workspaceContext.perf.prepareWorkspaceChunks" : {
                    "owner": "mjbvz",
                    "comment": "Understanding the performance of including workspace context",
                    "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                    "workspaceSearchSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Caller of the search" },
                    "workspaceSearchCorrelationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight",  "comment": "Correlation id for the search" },
                    "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" },
                    "resultChunkCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of chunks returned" }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('workspaceContext.perf.prepareWorkspaceChunks', {
                status,
                workspaceSearchSource: this.props.telemetryInfo.callTracker.toString(),
                workspaceSearchCorrelationId: this.props.telemetryInfo.correlationId,
            }, {
                execTime,
                resultChunkCount: result?.chunks.length ?? 0,
            });
        });
        for (const alert of searchResult.alerts ?? []) {
            progress?.report(alert);
        }
        return { result: searchResult };
    }
    render(state, sizing) {
        if (state.result === undefined) {
            return vscpp(prompt_tsx_1.TextChunk, null, "The workspace index is not available at this time.");
        }
        return vscpp(WorkspaceChunkList, { result: state.result, referencesOut: this.props.referencesOut, absolutePaths: !!this.props.absolutePaths, priority: this.props.priority, isToolCall: !!this.props.isToolCall, lines1Indexed: this.props.lines1Indexed });
    }
};
exports.WorkspaceChunks = WorkspaceChunks;
exports.WorkspaceChunks = WorkspaceChunks = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, workspaceChunkSearchService_1.IWorkspaceChunkSearchService),
    __param(4, promptRenderer_1.IPromptEndpoint)
], WorkspaceChunks);
let WorkspaceChunkList = class WorkspaceChunkList extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, promptPathRepresentationService) {
        super(props);
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    render(_state, _sizing) {
        const references = this.toReferences(this.props.result);
        this.props.referencesOut?.push(...references);
        // TODO: references should be tied to user message. However we've deduplicated them so we need to make sure we
        // return the correct references based on which user message we're rendering.
        return vscpp(vscppf, null,
            vscpp("references", { value: references }),
            this.props.result.isFullWorkspace ? vscpp(prompt_tsx_1.TextChunk, null,
                "Here are the full contents of the text files in my workspace:",
                vscpp("br", null)) : vscpp(vscppf, null),
            this.props.result.chunks
                .map((chunk, i) => {
                // Give chunks a scaled priority from `X` to `X + 1` with the earliest chunks having the highest priority
                const priority = typeof this.props.priority !== 'undefined'
                    ? this.props.priority + (1 - ((i + 1) / this.props.result.chunks.length))
                    : undefined;
                return { chunk, priority };
            })
                // Send chunks in reverse order with most relevant chunks last
                .reverse()
                .filter(x => x.chunk.chunk.text)
                .map(({ chunk, priority }) => {
                const filePath = this.promptPathRepresentationService.getFilePath(chunk.chunk.file);
                const fileLabel = this.props.absolutePaths ? filePath : (0, workspaceService_1.getWorkspaceFileDisplayPath)(this.workspaceService, chunk.chunk.file);
                const lineForDisplay = this.props.lines1Indexed ?
                    chunk.chunk.range.startLineNumber + 1 :
                    chunk.chunk.range.startLineNumber;
                return vscpp(prompt_tsx_1.TextChunk, { priority: priority },
                    chunk.chunk.isFullFile
                        ? `Here is the full text of \`${fileLabel}\`:`
                        : `Here is a potentially relevant text excerpt in \`${fileLabel}\` starting at line ${lineForDisplay}:`,
                    vscpp("br", null),
                    (0, markdown_1.createFencedCodeBlock)((0, markdown_1.getLanguageId)(chunk.chunk.file), chunk.chunk.text, undefined, filePath),
                    vscpp("br", null),
                    vscpp("br", null));
            }));
    }
    toReferences(searchResult) {
        const chunksByFile = new map_1.ResourceMap();
        for (const chunk of searchResult.chunks) {
            let fileChunks = chunksByFile.get(chunk.chunk.file) ?? [];
            if (chunk.chunk.isFullFile) {
                fileChunks = [chunk.chunk];
            }
            else if (fileChunks.some(c => c.isFullFile || c.range.containsRange(chunk.chunk.range))) {
                // Chunk is contained by another chunk, skip
            }
            else {
                // Add chunk to list and remove any chunks that are contained by this chunk
                fileChunks = [...fileChunks.filter(c => !chunk.chunk.range.containsRange(c.range)), chunk.chunk];
            }
            chunksByFile.set(chunk.chunk.file, fileChunks);
        }
        const references = Array.from(chunksByFile.values()).flatMap(chunks => {
            return chunks
                .sort((a, b) => range_1.Range.compareRangesUsingStarts(a.range, b.range)) // compare ranges by starts, then ends
                .map(chunk => new conversation_1.PromptReference(chunk.isFullFile
                ? chunk.file
                : new vscodeTypes_1.Location(chunk.file, new vscodeTypes_1.Range(chunk.range.startLineNumber, chunk.range.startColumn, chunk.range.endLineNumber, chunk.range.endColumn)), undefined, { isFromTool: this.props.isToolCall }));
        });
        return references;
    }
};
exports.WorkspaceChunkList = WorkspaceChunkList;
exports.WorkspaceChunkList = WorkspaceChunkList = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], WorkspaceChunkList);
let WorkspaceContext = class WorkspaceContext extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, logService, telemetryService, endpointProvider) {
        super(props);
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
    }
    async prepare(sizing, progress, token) {
        const props = this.props;
        const message = props.promptContext.query;
        if (!message) {
            return;
        }
        const contextEndpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        const { messages } = await this.instantiationService.invokeFunction(accessor => (0, metaPrompt_1.buildWorkspaceMetaPrompt)(accessor, this.props.promptContext, contextEndpoint, this.props.scopedDirectories));
        if (token.isCancellationRequested) {
            throw new errors_1.CancellationError();
        }
        const metaPrompt = new lazy_1.Lazy(() => {
            this.logService.debug('[Workspace Resolver] Asking the model to update the user question and provide queries...');
            const keywordTokenBudget = 200;
            // Just the rephrased question
            const queryP = new async_1.DeferredPromise();
            // Get the token length first
            const questionTokenLengthP = contextEndpoint.acquireTokenizer().tokenLength(message);
            // The entire response
            const requestP = questionTokenLengthP.then(questionTokenLength => contextEndpoint.makeChatRequest('workspaceContext', messages, async (text) => {
                if (!queryP.isSettled && /^#+\s*Keywords/gm.test(text)) {
                    queryP.complete((0, metaPrompt_1.parseMetaPromptResponse)(message, text).rephrasedQuestion);
                }
                return undefined;
            }, token, commonTypes_1.ChatLocation.Panel, undefined, {
                temperature: 0,
                max_tokens: questionTokenLength + keywordTokenBudget,
            })).then(fetchResult => {
                if (token.isCancellationRequested) {
                    throw new errors_1.CancellationError();
                }
                let fetchMessage;
                if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
                    /* __GDPR__
                        "workspaceResolver.error" : {
                            "owner": "mjbvz",
                            "comment": "Tracks errors for resolving workspace information",
                            "type": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Error type" },
                            "reason": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Detailed error reason" },
                            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." }
                        }
                    */
                    this.telemetryService.sendMSFTTelemetryEvent('workspaceResolver.error', {
                        type: fetchResult.type,
                        reason: fetchResult.reason,
                        requestId: fetchResult.requestId,
                    });
                    if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Length) {
                        fetchMessage = fetchResult.truncatedValue;
                    }
                    else {
                        // Fall back to using the original message
                        const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
                        return {
                            rephrasedQuery: message,
                            keywords: Array.from(segmenter.segment(message)).map((x) => ({ keyword: x.segment, variations: [] })),
                        };
                    }
                }
                else {
                    fetchMessage = fetchResult.value;
                }
                const metaResponse = (0, metaPrompt_1.parseMetaPromptResponse)(message, fetchMessage);
                /* __GDPR__
                    "workspaceResolver.success" : {
                        "owner": "mjbvz",
                        "comment": "Tracks errors for resolving workspace information",
                        "type": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Success type" },
                        "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                        "totalKeywordCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of keywords returned." }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('workspaceResolver.success', {
                    type: fetchResult.type,
                    requestId: fetchResult.requestId,
                }, {
                    totalKeywordCount: metaResponse.keywords.flatMap(x => [x.keyword, x.variations]).length
                });
                return {
                    rephrasedQuery: metaResponse.rephrasedQuestion,
                    keywords: metaResponse.keywords,
                };
            });
            return {
                query: queryP.p,
                queryAndKeywords: requestP,
            };
        });
        const maySkipResolve = () => {
            if (props.isToolCall) {
                return true;
            }
            const rewrittenMessage = props.promptContext.chatVariables.substituteVariablesWithReferences(message);
            if (rewrittenMessage !== message) {
                return false;
            }
            const containsAmbiguousWord = /\b(it|that|this)\b/i.test(message);
            return !containsAmbiguousWord;
        };
        return {
            rawQuery: message,
            resolveQueryAndKeywords(token) {
                return metaPrompt.value.queryAndKeywords;
            },
            async resolveQuery(token) {
                if (maySkipResolve()) {
                    return message;
                }
                else {
                    return (await (0, async_1.raceCancellation)(Promise.race([
                        metaPrompt.value?.query,
                        metaPrompt.value.queryAndKeywords.then(x => x?.rephrasedQuery),
                    ]), token)) ?? message;
                }
            },
        };
    }
    render(state, sizing) {
        if (!state) {
            return;
        }
        const include = this.props.include ?? {
            workspaceStructure: true,
            workspaceChunks: true,
        };
        const { scopedDirectories } = this.props;
        const includePatterns = this.props.scopedDirectories ? this.props.scopedDirectories.map(dir => `**${dir.path}/**`) : undefined;
        return vscpp(vscppf, null,
            include.workspaceStructure && (scopedDirectories ?
                scopedDirectories.map(dir => vscpp(workspaceStructure_1.DirectoryStructure, { flexGrow: 1, maxSize: 500 / scopedDirectories.length, directory: dir, ...this.props })) :
                vscpp(workspaceStructure_1.WorkspaceStructure, { flexGrow: 1, maxSize: 500, ...this.props })),
            include.workspaceChunks && vscpp(WorkspaceChunks, { priority: this.props.priority, telemetryInfo: this.props.telemetryInfo, query: state, globPatterns: { include: includePatterns }, referencesOut: this.props.referencesOut, isToolCall: this.props.isToolCall, absolutePaths: this.props.absolutePaths, lines1Indexed: this.props.lines1Indexed, maxResults: this.props.maxResults }));
    }
};
exports.WorkspaceContext = WorkspaceContext;
__decorate([
    (0, logExecTime_1.MeasureExecTime)(function (execTime, status) {
        /* __GDPR__
            "workspaceContext.perf.prepare" : {
                "owner": "mjbvz",
                "comment": "Understanding how effective ADA re-ranking is",
                "status": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the call succeeded or failed" },
                "execTime": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Time in milliseconds that the call took" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('workspaceContext.perf.prepare', { status }, { execTime });
    })
], WorkspaceContext.prototype, "prepare", null);
exports.WorkspaceContext = WorkspaceContext = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, endpointProvider_1.IEndpointProvider)
], WorkspaceContext);
//# sourceMappingURL=workspaceContext.js.map