"use strict";
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
var SemanticSearchTextSearchProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearchTextSearchProvider = void 0;
exports.getSearchResults = getSearchResults;
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const logService_1 = require("../../../platform/log/common/logService");
const parserService_1 = require("../../../platform/parser/node/parserService");
const searchService_1 = require("../../../platform/search/common/searchService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const rerankerService_1 = require("../../../platform/workspaceChunkSearch/common/rerankerService");
const workspaceChunkSearchService_1 = require("../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const strings = __importStar(require("../../../util/vs/base/common/strings"));
const uuid_1 = require("../../../util/vs/base/common/uuid");
const vscodeTypes_1 = require("../../../vscodeTypes");
const intentService_1 = require("../../intents/node/intentService");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const workspaceContext_1 = require("../../prompts/node/panel/workspace/workspaceContext");
const combinedRank_1 = require("./combinedRank");
let SemanticSearchTextSearchProvider = class SemanticSearchTextSearchProvider {
    static { SemanticSearchTextSearchProvider_1 = this; }
    static { this.feedBackSentKey = 'puku.search.feedback.sent'; }
    static { this.latestQuery = undefined; }
    static { this.feedBackTelemetry = {}; }
    constructor(_endpointProvider, workspaceChunkSearch, _logService, _telemetryService, _intentService, _commandService, searchService, workspaceService, _parserService, _rerankerService) {
        this._endpointProvider = _endpointProvider;
        this.workspaceChunkSearch = workspaceChunkSearch;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._intentService = _intentService;
        this._commandService = _commandService;
        this.searchService = searchService;
        this.workspaceService = workspaceService;
        this._parserService = _parserService;
        this._rerankerService = _rerankerService;
        this._endpoint = undefined;
        this.name = 'Copilot';
    }
    async getEndpoint() {
        this._endpoint = this._endpoint ?? await this._endpointProvider.getChatEndpoint('copilot-fast');
        return this._endpoint;
    }
    getKeywordsForContent(text) {
        // extract all identifiers in the selected text
        const identifiers = new Set();
        for (const match of text.matchAll(/(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g)) {
            identifiers.add(match[0]);
        }
        return Array.from(identifiers.values(), k => ({ keyword: k, variations: [] }));
    }
    resetFeedbackContext() {
        this._commandService.executeCommand('setContext', SemanticSearchTextSearchProvider_1.feedBackSentKey, false);
    }
    getPreviewRange(previewText, symbolsToHighlight) {
        if (!previewText) {
            return new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(0, 0));
        }
        if (symbolsToHighlight && symbolsToHighlight.length > 0) {
            // Find the first symbol that actually exists in the previewText
            for (const symbol of symbolsToHighlight) {
                const index = previewText.indexOf(symbol.text);
                if (index !== -1) {
                    return new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, index), new vscodeTypes_1.Position(0, index + symbol.text.length));
                }
            }
            // If no symbol is found, fall through to default below
        }
        const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(previewText);
        const startIndex = firstNonWhitespaceIndex !== -1 && firstNonWhitespaceIndex !== previewText.length ?
            firstNonWhitespaceIndex : 0;
        return new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, startIndex), new vscodeTypes_1.Position(0, previewText.length));
    }
    provideAITextSearchResults(query, options, progress, token) {
        this.resetFeedbackContext();
        const sw = new stopwatch_1.StopWatch();
        const getResults = async () => {
            const chatProgress = {
                report(_obj) { }
            };
            this._logService.trace(`Starting semantic search for ${query}`);
            SemanticSearchTextSearchProvider_1.latestQuery = query;
            const includes = new Set();
            const excludes = new Set();
            for (const folder of options.folderOptions) {
                if (folder.includes) {
                    folder.includes.forEach(e => {
                        if (!e.startsWith('*')) {
                            includes.add(new fileTypes_1.RelativePattern(folder.folder, e));
                        }
                        else {
                            includes.add(e);
                        }
                    });
                }
                if (folder.excludes) {
                    folder.excludes.forEach(e => {
                        if (typeof e === 'string' && !e.startsWith('*')) {
                            excludes.add(new fileTypes_1.RelativePattern(folder.folder, e));
                        }
                        else {
                            excludes.add(e);
                        }
                    });
                }
            }
            let searchResult = '';
            const chunkSearchDuration = Date.now();
            const result = await this.workspaceChunkSearch.searchFileChunks({
                endpoint: await this.getEndpoint(),
                tokenBudget: workspaceContext_1.MAX_CHUNK_TOKEN_COUNT,
                fullWorkspaceTokenBudget: workspaceContext_1.MAX_CHUNK_TOKEN_COUNT,
                maxResults: workspaceContext_1.MAX_CHUNKS_RESULTS,
            }, {
                rawQuery: query,
                resolveQueryAndKeywords: async () => ({
                    rephrasedQuery: query,
                    keywords: this.getKeywordsForContent(query),
                }),
                resolveQuery: async () => query,
            }, {
                globPatterns: {
                    include: includes.size > 0 ? Array.from(includes) : undefined,
                    exclude: excludes.size > 0 ? Array.from(excludes) : undefined,
                },
            }, new telemetryCorrelationId_1.TelemetryCorrelationId('copilotSearchPanel'), chatProgress, token);
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.chunkSearchDuration = Date.now() - chunkSearchDuration;
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.chunkCount = result.chunks.length;
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.strategy = result.strategy;
            this.treeSitterAIKeywords(query, progress, result.chunks.map(chunk => chunk.chunk), token);
            const chunkResults = result.chunks.map(c => c.chunk);
            const intent = this._intentService.getIntent('searchPanel', commonTypes_1.ChatLocation.Other);
            if (intent) {
                const request = {
                    location: vscodeTypes_1.ChatLocation.Panel,
                    location2: undefined,
                    command: 'searchPanel',
                    prompt: '',
                    references: [],
                    attempt: 0,
                    enableCommandDetection: false,
                    isParticipantDetected: false,
                    toolReferences: [],
                    toolInvocationToken: undefined,
                    model: null,
                    tools: new Map(),
                    id: '1',
                    sessionId: '1'
                };
                const intentInvocation = await intent.invoke({ location: commonTypes_1.ChatLocation.Other, request });
                const progress = {
                    report(_obj) { }
                };
                const buildPromptContext = {
                    query,
                    history: [],
                    chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                    tools: { toolReferences: [], toolInvocationToken: undefined, availableTools: [] },
                    chunkResults,
                };
                const prompt = await intentInvocation.buildPrompt(buildPromptContext, progress, token);
                const llmFilteringDuration = Date.now();
                const fetchResult = await intentInvocation.endpoint.makeChatRequest('searchPanel', prompt.messages, async (text, _, delta) => {
                    return undefined;
                }, token, commonTypes_1.ChatLocation.Other, undefined, {
                    temperature: 0.1,
                }, false, {
                    messageId: (0, uuid_1.generateUuid)(),
                    messageSource: 'search.workspace'
                });
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmFilteringDuration = Date.now() - llmFilteringDuration;
                searchResult = fetchResult.type === 'success' ? fetchResult.value : (fetchResult.type === 'length' ? fetchResult.truncatedValue : '');
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.rankResult = fetchResult.type;
            }
            searchResult = searchResult.replace(/```(?:json)?/g, '').trim();
            let rankingResults = [];
            try {
                rankingResults = JSON.parse(searchResult);
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.parseResult = 'success';
            }
            catch (error) {
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.parseResult = 'failed';
            }
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.rawLlmRankingResultsCount = rankingResults.length;
            const combinedRank = (0, combinedRank_1.combinedRanking)([...result.chunks], rankingResults);
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.rankResultsCount = rankingResults.length;
            SemanticSearchTextSearchProvider_1.feedBackTelemetry.combinedResultsCount = combinedRank.length;
            if (rankingResults.length > 0) {
                const rankingInsights = (0, combinedRank_1.combineRankingInsights)([...result.chunks], rankingResults);
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank = rankingInsights.llmBestRank;
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank = rankingInsights.llmWorstRank;
                SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmSelectedCount = combinedRank.filter(chunk => chunk.llmSelected).length;
            }
            const combinedChunks = combinedRank.map(chunk => chunk.chunk);
            await this.reportSearchResults(rankingResults, combinedChunks, progress, token);
            // call workspace chunk search service with options to do reranking
            if (this._rerankerService.isAvailable) {
                try {
                    this.workspaceChunkSearch.searchFileChunks({
                        endpoint: await this.getEndpoint(),
                        tokenBudget: workspaceContext_1.MAX_CHUNK_TOKEN_COUNT,
                        fullWorkspaceTokenBudget: workspaceContext_1.MAX_CHUNK_TOKEN_COUNT,
                        maxResults: workspaceContext_1.MAX_CHUNKS_RESULTS,
                    }, {
                        rawQuery: query,
                        resolveQueryAndKeywords: async () => ({
                            rephrasedQuery: query,
                            keywords: this.getKeywordsForContent(query),
                        }),
                        resolveQuery: async () => query,
                    }, {
                        globPatterns: {
                            include: includes.size > 0 ? Array.from(includes) : undefined,
                            exclude: excludes.size > 0 ? Array.from(excludes) : undefined,
                        },
                        enableRerank: true
                    }, new telemetryCorrelationId_1.TelemetryCorrelationId('copilotSearchPanel'), chatProgress, token).then(rerankResult => {
                        if (rerankResult && rankingResults.length > 0) {
                            const rerankInsights = (0, combinedRank_1.combineRankingInsights)([...rerankResult.chunks], rankingResults);
                            SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank = rerankInsights.llmBestRank;
                            SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank = rerankInsights.llmWorstRank;
                        }
                        this.reportTelemetry();
                    });
                }
                catch (ex) {
                    // ignore rerank errors
                    this._logService.error(`SemanticSearchTextSearchProvider::provideAITextSearchResults rerank failed. error=${ex}`);
                }
            }
            else {
                this.reportTelemetry();
            }
            this._logService.debug(`Semantic search took ${sw.elapsed()}ms`);
            return { limitHit: false };
        };
        return getResults();
    }
    reportTelemetry() {
        /* __GDPR__
        "copilot.search.request" : {
            "owner": "osortega",
            "comment": "Puku AI search request.",
            "chunkCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of copilot search code chunks." },
            "rankResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Result of the copilot search ranking." },
            "rankResultsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of the results from copilot search ranking." },
            "combinedResultsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of combined results from copilot search." },
            "chunkSearchDuration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Duration of the chunk search" },
            "llmFilteringDuration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Duration of the LLM filtering" },
            "llmBestRank": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Best rank (lowest index) among LLM-selected chunks in the original retrieval ranking." },
            "llmWorstRank": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Worst rank (highest index) among LLM-selected chunks in the original retrieval ranking." },
            "llmSelectedCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of chunks selected by LLM from the initial retrieval." },
            "rawLlmRankingResultsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of raw results returned by the LLM." },
            "parseResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates the result of parsing the LLM response." },
            "strategy": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates the strategy used for the search." },
            "llmBestInRerank": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Best rank (lowest index) among LLM-selected chunks in the reranked results." },
            "llmWorstInRerank": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Worst rank (highest index) among LLM-selected chunks in the reranked results." }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('copilot.search.request', {
            rankResult: SemanticSearchTextSearchProvider_1.feedBackTelemetry.rankResult,
            parseResult: SemanticSearchTextSearchProvider_1.feedBackTelemetry.parseResult,
            strategy: SemanticSearchTextSearchProvider_1.feedBackTelemetry.strategy,
        }, {
            chunkCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.chunkCount,
            rankResultsCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.rankResultsCount,
            combinedResultsCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.combinedResultsCount,
            chunkSearchDuration: SemanticSearchTextSearchProvider_1.feedBackTelemetry.chunkSearchDuration,
            llmFilteringDuration: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmFilteringDuration,
            llmBestRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank,
            llmWorstRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank,
            llmSelectedCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmSelectedCount,
            rawLlmRankingResultsCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.rawLlmRankingResultsCount,
            llmBestInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank ?? -1,
            llmWorstInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank ?? -1,
        });
        if (SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank !== undefined
            && SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank !== undefined
            && SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmSelectedCount !== undefined) {
            /* __GDPR__
            "semanticSearch.ranking" : {
                "owner": "rebornix",
                "comment": "Semantic search request ranking.",
                "llmBestRank": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Best rank (lowest index) among LLM-selected chunks in the original retrieval ranking."
                },
                "llmWorstRank": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Worst rank (highest index) among LLM-selected chunks in the original retrieval ranking."
                },
                "llmSelectedCount": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Number of chunks selected by LLM from the initial retrieval."
                },
                "rawLlmRankingResultsCount": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Number of raw results returned by the LLM."
                },
                "llmBestInRerank": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Best rank (lowest index) among LLM-selected chunks in the reranked results."
                },
                "llmWorstInRerank": {
                    "classification": "SystemMetaData",
                    "purpose": "FeatureInsight",
                    "isMeasurement": true,
                    "comment": "Worst rank (highest index) among LLM-selected chunks in the reranked results."
                }
            }
            */
            this._telemetryService.sendMSFTTelemetryEvent('semanticSearch.ranking', {}, {
                llmBestRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank,
                llmWorstRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank,
                llmSelectedCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmSelectedCount,
                rawLlmRankingResultsCount: SemanticSearchTextSearchProvider_1.feedBackTelemetry.rawLlmRankingResultsCount,
                llmBestInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank,
                llmWorstInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank,
            });
            if (SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank !== undefined
                && SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank !== undefined
                && (SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank > SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank
                    || SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank > SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank)) {
                this._telemetryService.sendInternalMSFTTelemetryEvent('semanticSearch.rerankImprovement', {
                    keyword: SemanticSearchTextSearchProvider_1.latestQuery || '',
                }, {
                    llmBestRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestRank,
                    llmWorstRank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstRank,
                    llmBestInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmBestInRerank,
                    llmWorstInRerank: SemanticSearchTextSearchProvider_1.feedBackTelemetry.llmWorstInRerank,
                });
            }
        }
    }
    async reportSearchResults(rankingResults, combinedChunks, progress, token) {
        const onResult = {
            report: async (result) => {
                const docContainingRef = await this.workspaceService.openTextDocumentAndSnapshot(result.uri);
                const resultAST = this._parserService.getTreeSitterAST({ languageId: docContainingRef.languageId, getText: () => docContainingRef.getText() });
                const symbolsToHighlight = await resultAST?.getSymbols({
                    startIndex: docContainingRef.offsetAt(result.ranges instanceof Array ? result.ranges[0].start : result.ranges.start),
                    endIndex: docContainingRef.offsetAt(result.ranges instanceof Array ? result.ranges[0].end : result.ranges.end),
                });
                const ranges = result.ranges instanceof Array
                    ? result.ranges.map(r => {
                        return {
                            sourceRange: new vscodeTypes_1.Range(new vscodeTypes_1.Position(r.start.line, r.start.character), new vscodeTypes_1.Position(r.end.line, (result.preview.text?.length || 0) + r.end.character)),
                            previewRange: this.getPreviewRange(result.preview.text, symbolsToHighlight),
                        };
                    })
                    : [{
                            sourceRange: new vscodeTypes_1.Range(new vscodeTypes_1.Position(result.ranges.start.line, result.ranges.start.character), new vscodeTypes_1.Position(result.ranges.end.line, (result.preview.text?.length || 0) + result.ranges.end.character)),
                            previewRange: this.getPreviewRange(result.preview.text, symbolsToHighlight),
                        }];
                const match = new vscodeTypes_1.TextSearchMatch2(result.uri, ranges, result.preview.text);
                progress.report(match);
            }
        };
        await Promise.all(rankingResults.map(result => {
            return this.searchService.findTextInFiles({
                pattern: result.query,
                isRegExp: false,
            }, {
                useDefaultExcludes: true,
                maxResults: 20,
                include: result.file,
            }, onResult, token);
        }));
        //report the rest of the combined results without the LLM ranked ones
        for (const chunk of combinedChunks.slice(rankingResults.length)) {
            const docContainingRef = await this.workspaceService.openTextDocumentAndSnapshot(chunk.file);
            const resultAST = this._parserService.getTreeSitterAST({ languageId: docContainingRef.languageId, getText: () => docContainingRef.getText() });
            const symbolsToHighlight = await resultAST?.getSymbols({
                startIndex: docContainingRef.offsetAt(new vscodeTypes_1.Position(chunk.range.startLineNumber, chunk.range.startColumn)),
                endIndex: docContainingRef.offsetAt(new vscodeTypes_1.Position(chunk.range.endLineNumber, chunk.range.endColumn)),
            });
            const rangeText = docContainingRef.getText().split('\n').slice(chunk.range.startLineNumber, chunk.range.endLineNumber).join('\n');
            const match = new vscodeTypes_1.TextSearchMatch2(chunk.file, [{
                    sourceRange: new vscodeTypes_1.Range(chunk.range.startLineNumber, chunk.range.startColumn, chunk.range.endLineNumber, chunk.range.endColumn),
                    previewRange: this.getPreviewRange(rangeText, symbolsToHighlight),
                }], rangeText);
            progress.report(match);
        }
    }
    async treeSitterAIKeywords(query, progress, chunks, token) {
        const keywordSearchDuration = Date.now();
        const symbols = new Set();
        for (const chunk of chunks) {
            const docContainingRef = await this.workspaceService.openTextDocumentAndSnapshot(chunk.file);
            const resultAST = this._parserService.getTreeSitterAST({ languageId: docContainingRef.languageId, getText: () => docContainingRef.getText() });
            const symbolsToHighlight = await resultAST?.getSymbols({
                startIndex: docContainingRef.offsetAt(new vscodeTypes_1.Position(chunk.range.startLineNumber, chunk.range.startColumn)),
                endIndex: docContainingRef.offsetAt(new vscodeTypes_1.Position(chunk.range.endLineNumber, chunk.range.endColumn)),
            });
            symbolsToHighlight?.forEach(symbol => symbols.add(symbol.text));
        }
        const searchKeywordsIntent = this._intentService.getIntent('searchKeywords', commonTypes_1.ChatLocation.Other);
        if (searchKeywordsIntent) {
            const request = {
                location: vscodeTypes_1.ChatLocation.Panel,
                location2: undefined,
                command: 'searchKeywords',
                prompt: '',
                references: [],
                attempt: 0,
                enableCommandDetection: false,
                isParticipantDetected: false,
                toolReferences: [],
                toolInvocationToken: undefined,
                model: null,
                tools: new Map(),
                id: '1',
                sessionId: '1'
            };
            const intentInvocation = await searchKeywordsIntent.invoke({ location: commonTypes_1.ChatLocation.Other, request });
            const fakeProgress = {
                report(_obj) { }
            };
            const buildPromptContext = {
                query,
                history: [],
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                tools: { toolReferences: [], toolInvocationToken: undefined, availableTools: [] },
                symbols: Array.from(symbols),
            };
            const prompt = await intentInvocation.buildPrompt(buildPromptContext, fakeProgress, token);
            const fetchResult = await intentInvocation.endpoint.makeChatRequest('searchKeywords', prompt.messages, async (text, _, delta) => {
                return undefined;
            }, token, commonTypes_1.ChatLocation.Other, undefined, {
                temperature: 0.1,
            }, false, {
                messageId: (0, uuid_1.generateUuid)(),
                messageSource: 'search.keywords'
            });
            const keywordResult = fetchResult.type === 'success' ? fetchResult.value : (fetchResult.type === 'length' ? fetchResult.truncatedValue : '');
            const usedResults = [];
            keywordResult.split('\n')
                .map(entry => {
                const trimmedEntry = entry.trim();
                if (trimmedEntry !== '' && !trimmedEntry.startsWith('```')) {
                    const cleanedKeyword = this.processKeyword(trimmedEntry, chunks);
                    if (cleanedKeyword) {
                        progress.report(new vscodeTypes_1.AISearchKeyword(cleanedKeyword));
                        usedResults.push(cleanedKeyword);
                    }
                }
            });
            /* __GDPR__
        "copilot.search.keywords" : {
            "owner": "osortega",
            "comment": "Puku AI keywords request.",
            "keywordResult": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Result of the copilot keywords request." },
            "keywordsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of keywords found by copilot search." },
            "keywordSearchDuration": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Duration of the keyword search" }
            }
        */
            this._telemetryService.sendMSFTTelemetryEvent('copilot.search.keywords', {
                keywordResult: fetchResult.type,
            }, {
                keywordsCount: usedResults.length,
                keywordSearchDuration: Date.now() - keywordSearchDuration,
            });
        }
    }
    processKeyword(keyword, chunks) {
        // Clean up keyword if it ends with any kind of bracket pairs
        const cleanedKeyword = keyword.replace(/[\(\[\{].*[\)\]\}]/g, '').trim();
        if (cleanedKeyword.length === 0) {
            return undefined;
        }
        // Make sure the keyword exists in any chunk
        const foundChunk = chunks.find(chunk => {
            return chunk.text.includes(cleanedKeyword);
        });
        if (foundChunk) {
            return cleanedKeyword;
        }
        return undefined;
    }
};
exports.SemanticSearchTextSearchProvider = SemanticSearchTextSearchProvider;
exports.SemanticSearchTextSearchProvider = SemanticSearchTextSearchProvider = SemanticSearchTextSearchProvider_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, workspaceChunkSearchService_1.IWorkspaceChunkSearchService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService),
    __param(4, intentService_1.IIntentService),
    __param(5, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(6, searchService_1.ISearchService),
    __param(7, workspaceService_1.IWorkspaceService),
    __param(8, parserService_1.IParserService),
    __param(9, rerankerService_1.IRerankerService)
], SemanticSearchTextSearchProvider);
function getMatchRanges(fileResults) {
    const ranges = [];
    fileResults.forEach(snippet => {
        const range = new vscodeTypes_1.Range(new vscodeTypes_1.Position(snippet.range.startLineNumber, snippet.range.startColumn), new vscodeTypes_1.Position(snippet.range.endLineNumber, snippet.range.endColumn));
        ranges.push({ sourceRange: range, previewRange: range });
    });
    return ranges;
}
async function getSearchResults(fileReader, fileResults, token = cancellation_1.CancellationToken.None, logService, telemetryService) {
    const results = [];
    const getResultsRanges = async () => {
        // get all chunks per file
        const fileChunks = {};
        fileResults.forEach(fileResult => {
            const filePath = fileResult.file.path;
            if (!fileChunks[filePath]) {
                fileChunks[filePath] = [];
            }
            fileChunks[filePath].push(fileResult);
        });
        await Promise.all(Object.keys(fileChunks).map(async (filePath) => {
            const file = fileChunks[filePath][0].file;
            const fileContent = await fileReader(file);
            const ranges = getMatchRanges(fileChunks[filePath]);
            if (ranges.length) {
                results.push(new vscodeTypes_1.TextSearchMatch2(file, ranges, fileContent.toString()));
            }
        }));
        return results;
    };
    return await (0, async_1.raceCancellation)(getResultsRanges(), token) ?? [];
}
//# sourceMappingURL=semanticSearchTextSearchProvider.js.map