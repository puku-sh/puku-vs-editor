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
var XtabProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XtabProvider = void 0;
exports.findMergeConflictMarkersRange = findMergeConflictMarkersRange;
const pukuRequestTypes_1 = require("../../../platform/api/common/pukuRequestTypes");
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const rawTypes_1 = require("@vscode/prompt-tsx/dist/base/output/rawTypes");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const diffService_1 = require("../../../platform/diff/common/diffService");
const chatEndpoint_1 = require("../../../platform/endpoint/node/chatEndpoint");
const proxyXtabEndpoint_1 = require("../../../platform/endpoint/node/proxyXtabEndpoint");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const nextCursorLinePrediction_1 = require("../../../platform/inlineEdits/common/dataTypes/nextCursorLinePrediction");
const xtabPromptOptions = __importStar(require("../../../platform/inlineEdits/common/dataTypes/xtabPromptOptions"));
const responseProcessor_1 = require("../../../platform/inlineEdits/common/responseProcessor");
const statelessNextEditProvider_1 = require("../../../platform/inlineEdits/common/statelessNextEditProvider");
const statelessNextEditProviders_1 = require("../../../platform/inlineEdits/common/statelessNextEditProviders");
const languageContextProviderService_1 = require("../../../platform/languageContextProvider/common/languageContextProviderService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const languageContextService_1 = require("../../../platform/languageServer/common/languageContextService");
const logService_1 = require("../../../platform/log/common/logService");
const simulationTestContext_1 = require("../../../platform/simulationTestContext/common/simulationTestContext");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/common/async");
const errors = __importStar(require("../../../util/common/errors"));
const result_1 = require("../../../util/common/result");
const tokenizer_1 = require("../../../util/common/tokenizer");
const tracing_1 = require("../../../util/common/tracing");
const assert_1 = require("../../../util/vs/base/common/assert");
const async_2 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const stopwatch_1 = require("../../../util/vs/base/common/stopwatch");
const lineEdit_1 = require("../../../util/vs/editor/common/core/edits/lineEdit");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const position_1 = require("../../../util/vs/editor/common/core/position");
const range_1 = require("../../../util/vs/editor/common/core/range");
const lineRange_1 = require("../../../util/vs/editor/common/core/ranges/lineRange");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const delayer_1 = require("../../inlineEdits/common/delayer");
const nearbyCursorInlineEditProvider_1 = require("../../inlineEdits/common/nearbyCursorInlineEditProvider");
const importFiltering_1 = require("../../inlineEdits/node/importFiltering");
const promptCrafting_1 = require("../common/promptCrafting");
const systemMessages_1 = require("../common/systemMessages");
const tags_1 = require("../common/tags");
const xtabCurrentDocument_1 = require("../common/xtabCurrentDocument");
const xtabEndpoint_1 = require("./xtabEndpoint");
const xtabUtils_1 = require("./xtabUtils");
let XtabProvider = class XtabProvider {
    static { XtabProvider_1 = this; }
    static { this.ID = configurationService_1.XTabProviderId; }
    static { this.computeTokens = (s) => Math.floor(s.length / 4); }
    constructor(simulationCtx, instaService, workspaceService, diffService, configService, expService, logService, langCtxService, langDiagService, ignoreService, telemetryService) {
        this.simulationCtx = simulationCtx;
        this.instaService = instaService;
        this.workspaceService = workspaceService;
        this.diffService = diffService;
        this.configService = configService;
        this.expService = expService;
        this.logService = logService;
        this.langCtxService = langCtxService;
        this.langDiagService = langDiagService;
        this.ignoreService = ignoreService;
        this.telemetryService = telemetryService;
        this.ID = XtabProvider_1.ID;
        this.dependsOnSelection = true;
        this.showNextEditPreference = "always" /* ShowNextEditPreference.Always */;
        this.forceUseDefaultModel = false;
        this.delayer = new delayer_1.Delayer(this.configService, this.expService);
        this.tracer = (0, tracing_1.createTracer)(['NES', 'XtabProvider'], (s) => this.logService.trace(s));
    }
    handleAcceptance() {
        this.delayer.handleAcceptance();
    }
    handleRejection() {
        this.delayer.handleRejection();
    }
    provideNextEdit(request, pushEdit, logContext, cancellationToken) {
        const filteringPushEdit = (result) => {
            if (result.isError()) {
                pushEdit(result);
                return;
            }
            const { edit } = result.val;
            const filteredEdits = this.filterEdit(request.getActiveDocument(), [edit]);
            if (filteredEdits.length === 0) { // do not invoke pushEdit
                return;
            }
            pushEdit(result);
        };
        return this._provideNextEdit(request, filteringPushEdit, logContext, cancellationToken);
    }
    filterEdit(activeDoc, edits) {
        const filters = [
            (edits) => importFiltering_1.IgnoreImportChangesAspect.filterEdit(activeDoc, edits),
            (edits) => statelessNextEditProviders_1.IgnoreEmptyLineAndLeadingTrailingWhitespaceChanges.filterEdit(activeDoc, edits),
        ];
        if (!this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.InlineEditsAllowWhitespaceOnlyChanges, this.expService)) {
            filters.push((edits) => statelessNextEditProviders_1.IgnoreWhitespaceOnlyChanges.filterEdit(activeDoc, edits));
        }
        const undoInsertionFiltering = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsUndoInsertionFiltering, this.expService);
        if (undoInsertionFiltering !== undefined) {
            let filter;
            switch (undoInsertionFiltering) {
                case 'v1':
                    filter = statelessNextEditProviders_1.editWouldDeleteWhatWasJustInserted;
                    break;
                case 'v2':
                    filter = statelessNextEditProviders_1.editWouldDeleteWhatWasJustInserted2;
                    break;
                default:
                    (0, assert_1.assertNever)(undoInsertionFiltering);
            }
            filters.push((edits) => filter(activeDoc, new lineEdit_1.LineEdit(edits)) ? [] : edits);
        }
        return filters.reduce((acc, filter) => filter(acc), edits);
    }
    async _provideNextEdit(request, pushEdit, logContext, cancellationToken) {
        const telemetry = new statelessNextEditProvider_1.StatelessNextEditTelemetryBuilder(request);
        logContext.setProviderStartTime();
        try {
            if (request.xtabEditHistory.length === 0) {
                return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.ActiveDocumentHasNoEdits(), telemetry);
            }
            const delaySession = this.delayer.createDelaySession(request.providerRequestStartDateTime);
            const nextEditResult = await this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetry, 0 /* RetryState.NotRetrying */);
            if (nextEditResult.isError() && nextEditResult.err instanceof statelessNextEditProvider_1.NoNextEditReason.GotCancelled) {
                logContext.setIsSkipped();
            }
            if (nextEditResult.isOk()) {
                await this.enforceArtificialDelay(delaySession, telemetry);
            }
            return new statelessNextEditProvider_1.StatelessNextEditResult(nextEditResult, telemetry.build(nextEditResult));
        }
        catch (err) {
            return statelessNextEditProvider_1.StatelessNextEditResult.noEdit(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err)), telemetry);
        }
        finally {
            logContext.setProviderEndTime();
        }
    }
    async doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState) {
        return this.doGetNextEditWithSelection(request, (0, nearbyCursorInlineEditProvider_1.getOrDeduceSelectionFromLastEdit)(request.getActiveDocument()), pushEdit, delaySession, { showLabel: false }, logContext, cancellationToken, telemetryBuilder, retryState);
    }
    async doGetNextEditWithSelection(request, selection, pushEdit, delaySession, opts, logContext, cancellationToken, telemetryBuilder, retryState) {
        const tracer = this.tracer.sub('doGetNextEditWithSelection');
        const activeDocument = request.getActiveDocument();
        if (selection === null) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Uncategorized(new Error('NoSelection')));
        }
        const promptOptions = this.determineModelConfiguration(activeDocument);
        const endpoint = this.getEndpoint(promptOptions.modelName);
        logContext.setEndpointInfo(typeof endpoint.urlOrRequestMetadata === 'string' ? endpoint.urlOrRequestMetadata : JSON.stringify(endpoint.urlOrRequestMetadata.type), endpoint.model);
        telemetryBuilder.setModelName(endpoint.model);
        const cursorPosition = new position_1.Position(selection.endLineNumber, selection.endColumn);
        const currentDocument = new xtabCurrentDocument_1.CurrentDocument(activeDocument.documentAfterEdits, cursorPosition);
        const cursorLine = currentDocument.lines[currentDocument.cursorLineOffset];
        // check if there's any non-whitespace character after the cursor in the line
        const isCursorAtEndOfLine = cursorLine.substring(cursorPosition.column - 1).match(/^\s*$/) !== null;
        if (isCursorAtEndOfLine) {
            tracer.trace('Debouncing for cursor at end of line');
            delaySession.setExtraDebounce(this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsExtraDebounceEndOfLine, this.expService));
        }
        else {
            tracer.trace('Debouncing for cursor NOT at end of line');
        }
        telemetryBuilder.setIsCursorAtLineEnd(isCursorAtEndOfLine);
        const areaAroundEditWindowLinesRange = this.computeAreaAroundEditWindowLinesRange(currentDocument);
        const editWindowLinesRange = this.computeEditWindowLinesRange(currentDocument, request, retryState, telemetryBuilder);
        const cursorOriginalLinesOffset = Math.max(0, currentDocument.cursorLineOffset - editWindowLinesRange.start);
        const editWindowLastLineLength = currentDocument.transformer.getLineLength(editWindowLinesRange.endExclusive);
        const editWindow = currentDocument.transformer.getOffsetRange(new range_1.Range(editWindowLinesRange.start + 1, 1, editWindowLinesRange.endExclusive, editWindowLastLineLength + 1));
        const editWindowLines = currentDocument.lines.slice(editWindowLinesRange.start, editWindowLinesRange.endExclusive);
        const editWindowTokenLimit = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabEditWindowMaxTokens, this.expService);
        if (editWindowTokenLimit !== undefined && (0, promptCrafting_1.countTokensForLines)(editWindowLines, XtabProvider_1.computeTokens) > editWindowTokenLimit) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.PromptTooLarge('editWindow'));
        }
        // Expected: editWindow.substring(activeDocument.documentAfterEdits.value) === editWindowLines.join('\n')
        const doesIncludeCursorTag = editWindowLines.some(line => line.includes(tags_1.PromptTags.CURSOR));
        const shouldRemoveCursorTagFromResponse = !doesIncludeCursorTag; // we'd like to remove the tag only if the original edit-window didn't include the tag
        const taggedCurrentFileContentResult = this.constructTaggedFile(currentDocument, editWindowLinesRange, areaAroundEditWindowLinesRange, promptOptions, XtabProvider_1.computeTokens, { includeLineNumbers: false });
        if (taggedCurrentFileContentResult.isError()) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.PromptTooLarge('currentFile'));
        }
        const { taggedCurrentDocLines, areaAroundCodeToEdit } = taggedCurrentFileContentResult.val;
        telemetryBuilder.setNLinesOfCurrentFileInPrompt(taggedCurrentDocLines.length);
        const langCtx = await this.getAndProcessLanguageContext(request, delaySession, activeDocument, cursorPosition, promptOptions, logContext, cancellationToken);
        if (cancellationToken.isCancellationRequested) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterLanguageContextAwait'));
        }
        const promptPieces = new promptCrafting_1.PromptPieces(currentDocument, editWindowLinesRange, areaAroundEditWindowLinesRange, activeDocument, request.xtabEditHistory, taggedCurrentDocLines, areaAroundCodeToEdit, langCtx, XtabProvider_1.computeTokens, promptOptions);
        const userPrompt = (0, promptCrafting_1.getUserPrompt)(promptPieces);
        const responseFormat = xtabPromptOptions.ResponseFormat.fromPromptingStrategy(promptOptions.promptingStrategy);
        const prediction = this.getPredictedOutput(editWindowLines, responseFormat);
        const messages = constructMessages({
            systemMsg: this.pickSystemPrompt(promptOptions.promptingStrategy),
            userMsg: userPrompt,
        });
        logContext.setPrompt(messages);
        telemetryBuilder.setPrompt(messages);
        const HARD_CHAR_LIMIT = 30000 * 4; // 30K tokens, assuming 4 chars per token -- we use approximation here because counting tokens exactly is time-consuming
        const promptCharCount = charCount(messages);
        if (promptCharCount > HARD_CHAR_LIMIT) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.PromptTooLarge('final'));
        }
        await this.debounce(delaySession, telemetryBuilder);
        if (cancellationToken.isCancellationRequested) {
            return result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterDebounce'));
        }
        request.fetchIssued = true;
        const cursorLineOffset = cursorPosition.column;
        this.streamEdits(request, pushEdit, endpoint, messages, editWindow, editWindowLines, cursorOriginalLinesOffset, cursorLineOffset, editWindowLinesRange, promptPieces, prediction, {
            showLabel: opts.showLabel,
            shouldRemoveCursorTagFromResponse,
            responseFormat,
            retryState,
        }, delaySession, tracer, telemetryBuilder, logContext, cancellationToken);
        return result_1.Result.ok(undefined);
    }
    constructTaggedFile(currentDocument, editWindowLinesRange, areaAroundEditWindowLinesRange, promptOptions, computeTokens, opts) {
        const contentWithCursorAsLinesOriginal = (() => {
            const addCursorTagEdit = stringEdit_1.StringEdit.single(stringEdit_1.StringReplacement.insert(currentDocument.cursorOffset, tags_1.PromptTags.CURSOR));
            const contentWithCursor = addCursorTagEdit.applyOnText(currentDocument.content);
            return contentWithCursor.getLines();
        })();
        const addLineNumbers = (lines) => lines.map((line, idx) => `${idx}| ${line}`);
        const contentWithCursorAsLines = opts.includeLineNumbers
            ? addLineNumbers(contentWithCursorAsLinesOriginal)
            : contentWithCursorAsLinesOriginal;
        const editWindowWithCursorAsLines = contentWithCursorAsLines.slice(editWindowLinesRange.start, editWindowLinesRange.endExclusive);
        const areaAroundCodeToEdit = [
            tags_1.PromptTags.AREA_AROUND.start,
            ...contentWithCursorAsLines.slice(areaAroundEditWindowLinesRange.start, editWindowLinesRange.start),
            tags_1.PromptTags.EDIT_WINDOW.start,
            ...editWindowWithCursorAsLines,
            tags_1.PromptTags.EDIT_WINDOW.end,
            ...contentWithCursorAsLines.slice(editWindowLinesRange.endExclusive, areaAroundEditWindowLinesRange.endExclusive),
            tags_1.PromptTags.AREA_AROUND.end
        ].join('\n');
        const currentFileContentLines = opts.includeLineNumbers
            ? addLineNumbers(currentDocument.lines)
            : currentDocument.lines;
        let areaAroundCodeToEditForCurrentFile;
        if (promptOptions.currentFile.includeTags) {
            areaAroundCodeToEditForCurrentFile = areaAroundCodeToEdit;
        }
        else {
            const editWindowLines = currentFileContentLines.slice(editWindowLinesRange.start, editWindowLinesRange.endExclusive);
            areaAroundCodeToEditForCurrentFile = [
                ...contentWithCursorAsLines.slice(areaAroundEditWindowLinesRange.start, editWindowLinesRange.start),
                ...editWindowLines,
                ...contentWithCursorAsLines.slice(editWindowLinesRange.endExclusive, areaAroundEditWindowLinesRange.endExclusive),
            ].join('\n');
        }
        const taggedCurrentFileContentResult = (0, promptCrafting_1.createTaggedCurrentFileContentUsingPagedClipping)(currentFileContentLines, areaAroundCodeToEditForCurrentFile, areaAroundEditWindowLinesRange, computeTokens, promptOptions.pagedClipping.pageSize, promptOptions.currentFile);
        return taggedCurrentFileContentResult.map(taggedCurrentDocLines => ({
            taggedCurrentDocLines,
            areaAroundCodeToEdit,
        }));
    }
    getAndProcessLanguageContext(request, delaySession, activeDocument, cursorPosition, promptOptions, logContext, cancellationToken) {
        const recordingEnabled = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsLogContextRecorderEnabled);
        const diagnosticsContextProviderEnabled = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.DiagnosticsContextProvider, this.expService);
        if (!promptOptions.languageContext.enabled && !recordingEnabled && !diagnosticsContextProviderEnabled) {
            return Promise.resolve(undefined);
        }
        const langCtxPromise = this.getLanguageContext(request, delaySession, activeDocument, cursorPosition, logContext, cancellationToken);
        // if recording, add diagnostics for the file to the recording and hook up the language context promise to write to the recording
        if (recordingEnabled) {
            logContext.setFileDiagnostics(this.langDiagService.getAllDiagnostics());
            langCtxPromise.then(langCtxs => {
                if (langCtxs) {
                    logContext.setLanguageContext(langCtxs);
                }
            });
        }
        return promptOptions.languageContext.enabled
            ? langCtxPromise
            : Promise.resolve(undefined);
    }
    async getLanguageContext(request, delaySession, activeDocument, cursorPosition, logContext, cancellationToken) {
        try {
            const textDoc = this.workspaceService.textDocuments.find(doc => doc.uri.toString() === activeDocument.id.uri);
            if (textDoc === undefined) {
                return undefined;
            }
            const providers = this.langCtxService.getContextProviders(textDoc);
            if (providers.length < 1) {
                return undefined;
            }
            const debounceTime = delaySession.getDebounceTime();
            const cursorPositionVscode = new vscodeTypes_1.Position(cursorPosition.lineNumber - 1, cursorPosition.column - 1);
            const ctxRequest = {
                opportunityId: request.opportunityId,
                completionId: request.id,
                documentContext: {
                    uri: textDoc.uri.toString(),
                    languageId: textDoc.languageId,
                    version: textDoc.version,
                    offset: textDoc.offsetAt(cursorPositionVscode),
                    position: cursorPositionVscode
                },
                activeExperiments: new Map(),
                timeBudget: debounceTime,
                timeoutEnd: Date.now() + debounceTime,
                source: 'nes',
            };
            const isSnippetIgnored = async (item) => {
                const uris = [item.uri, ...(item.additionalUris ?? [])];
                const isIgnored = await (0, async_1.raceFilter)(uris.map(uri => this.ignoreService.isCopilotIgnored(uri)), r => r);
                return !!isIgnored;
            };
            const langCtxItems = [];
            const getContextPromise = async () => {
                const ctxIter = this.langCtxService.getContextItems(textDoc, ctxRequest, cancellationToken);
                for await (const item of ctxIter) {
                    if (item.kind === languageContextService_1.ContextKind.Snippet && await isSnippetIgnored(item)) {
                        // If the snippet is ignored, we don't want to include it in the context
                        continue;
                    }
                    langCtxItems.push({ context: item, timeStamp: Date.now(), onTimeout: false });
                }
            };
            const start = Date.now();
            await (0, async_2.raceTimeout)(getContextPromise(), debounceTime);
            const end = Date.now();
            const langCtxOnTimeout = this.langCtxService.getContextItemsOnTimeout(textDoc, ctxRequest);
            for (const item of langCtxOnTimeout) {
                if (item.kind === languageContextService_1.ContextKind.Snippet && await isSnippetIgnored(item)) {
                    // If the snippet is ignored, we don't want to include it in the context
                    continue;
                }
                langCtxItems.push({ context: item, timeStamp: end, onTimeout: true });
            }
            return { start, end, items: langCtxItems };
        }
        catch (error) {
            logContext.setError(errors.fromUnknown(error));
            this.tracer.trace(`Failed to fetch language context: ${error}`);
            return undefined;
        }
    }
    async streamEdits(request, pushEdit, endpoint, messages, editWindow, editWindowLines, cursorOriginalLinesOffset, cursorLineOffset, // cursor offset within the line it's in; 1-based
    editWindowLineRange, promptPieces, prediction, opts, delaySession, parentTracer, telemetryBuilder, logContext, cancellationToken) {
        const tracer = parentTracer.sub('streamEdits');
        const useFetcher = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.NextEditSuggestionsFetcher, this.expService) || undefined;
        const fetchStreamSource = new chatMLFetcher_1.FetchStreamSource();
        const fetchRequestStopWatch = new stopwatch_1.StopWatch();
        let responseSoFar = '';
        let chatResponseFailure;
        let ttft;
        const firstTokenReceived = new async_2.DeferredPromise();
        telemetryBuilder.setFetchStartedAt();
        logContext.setFetchStartTime();
        // we must not await this promise because we want to stream edits as they come in
        const fetchResultPromise = endpoint.makeChatRequest2({
            debugName: XtabProvider_1.ID,
            messages,
            finishedCb: async (text, _, delta) => {
                if (!firstTokenReceived.isSettled) {
                    firstTokenReceived.complete();
                }
                if (ttft === undefined) {
                    ttft = fetchRequestStopWatch.elapsed();
                    logContext.addLog(`TTFT ${ttft} ms`);
                }
                fetchStreamSource.update(text, delta);
                responseSoFar = text;
                logContext.setResponse(responseSoFar);
                return undefined;
            },
            location: commonTypes_1.ChatLocation.Other,
            source: undefined,
            requestOptions: {
                temperature: 0,
                stream: true,
                prediction,
            },
            userInitiatedRequest: undefined,
            telemetryProperties: {
                requestId: request.id,
            },
            useFetcher,
        }, cancellationToken);
        telemetryBuilder.setResponse(fetchResultPromise.then((response) => ({ response, ttft })));
        logContext.setFullResponse(fetchResultPromise.then((response) => response.type === commonTypes_1.ChatFetchResponseType.Success ? response.value : undefined));
        const fetchRes = await Promise.race([firstTokenReceived.p, fetchResultPromise]);
        if (fetchRes && fetchRes.type !== commonTypes_1.ChatFetchResponseType.Success) {
            if (fetchRes.type === commonTypes_1.ChatFetchResponseType.NotFound &&
                !this.forceUseDefaultModel // if we haven't already forced using the default model; otherwise, this could cause an infinite loop
            ) {
                this.forceUseDefaultModel = true;
                return this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState); // use the same retry state
            }
            pushEdit(result_1.Result.error(XtabProvider_1.mapChatFetcherErrorToNoNextEditReason(fetchRes)));
            return;
        }
        fetchResultPromise
            .then((response) => {
            // this's a way to signal the edit-pushing code to know if the request failed and
            // 	it shouldn't push edits constructed from an erroneous response
            chatResponseFailure = response.type !== commonTypes_1.ChatFetchResponseType.Success ? response : undefined;
        })
            .catch((err) => {
            // in principle this shouldn't happen because ChatMLFetcher's fetchOne should not throw
            logContext.setError(errors.fromUnknown(err));
            logContext.addLog(`ChatMLFetcher fetch call threw -- this's UNEXPECTED!`);
            // Properly handle the error by pushing it as a result
            pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err))));
        }).finally(() => {
            logContext.setFetchEndTime();
            if (!firstTokenReceived.isSettled) {
                firstTokenReceived.complete();
            }
            fetchStreamSource.resolve();
            logContext.setResponse(responseSoFar);
        });
        const llmLinesStream = (0, xtabUtils_1.toLines)(fetchStreamSource.stream);
        // logging of times
        // removal of cursor tag if option is set
        const linesStream = (() => {
            let i = 0;
            return llmLinesStream.map((v) => {
                const trace = `Line ${i++} emitted with latency ${fetchRequestStopWatch.elapsed()} ms`;
                logContext.addLog(trace);
                tracer.trace(trace);
                return opts.shouldRemoveCursorTagFromResponse
                    ? v.replaceAll(tags_1.PromptTags.CURSOR, '')
                    : v;
            });
        })();
        let cleanedLinesStream;
        if (opts.responseFormat === xtabPromptOptions.ResponseFormat.EditWindowOnly) {
            cleanedLinesStream = linesStream;
        }
        else if (opts.responseFormat === xtabPromptOptions.ResponseFormat.UnifiedWithXml) {
            const linesIter = linesStream[Symbol.asyncIterator]();
            const firstLine = await linesIter.next();
            if (chatResponseFailure !== undefined) { // handle fetch failure
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(chatResponseFailure))));
                return;
            }
            if (firstLine.done) { // no lines in response -- unexpected case but take as no suggestions
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                return;
            }
            const trimmedLines = firstLine.value.trim();
            if (trimmedLines === tags_1.ResponseTags.NO_CHANGE.start) {
                await this.pushNoSuggestionsOrRetry(request, editWindow, promptPieces, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState);
                return;
            }
            if (trimmedLines === tags_1.ResponseTags.INSERT.start) {
                const lineWithCursorContinued = await linesIter.next();
                if (lineWithCursorContinued.done || lineWithCursorContinued.value.includes(tags_1.ResponseTags.INSERT.end)) {
                    pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                    return;
                }
                const edit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(editWindowLineRange.start + cursorOriginalLinesOffset + 1 /* 0-based to 1-based */, editWindowLineRange.start + cursorOriginalLinesOffset + 2), [editWindowLines[cursorOriginalLinesOffset].slice(0, cursorLineOffset - 1) + lineWithCursorContinued.value + editWindowLines[cursorOriginalLinesOffset].slice(cursorLineOffset - 1)]);
                pushEdit(result_1.Result.ok({ edit, window: editWindow }));
                const lines = [];
                let v = await linesIter.next();
                while (!v.done) {
                    if (v.value.includes(tags_1.ResponseTags.INSERT.end)) {
                        break;
                    }
                    else {
                        lines.push(v.value);
                    }
                    v = await linesIter.next();
                }
                const line = editWindowLineRange.start + cursorOriginalLinesOffset + 2;
                pushEdit(result_1.Result.ok({
                    edit: new lineEdit_1.LineReplacement(new lineRange_1.LineRange(line, line), lines),
                    window: editWindow
                }));
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                return;
            }
            if (trimmedLines === tags_1.ResponseTags.EDIT.start) {
                cleanedLinesStream = new async_2.AsyncIterableObject(async (emitter) => {
                    let v = await linesIter.next();
                    while (!v.done) {
                        if (v.value.includes(tags_1.ResponseTags.EDIT.end)) {
                            return;
                        }
                        emitter.emitOne(v.value);
                        v = await linesIter.next();
                    }
                });
            }
            else {
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(new Error(`unexpected tag ${trimmedLines}`))));
                return;
            }
        }
        else if (opts.responseFormat === xtabPromptOptions.ResponseFormat.CodeBlock) {
            cleanedLinesStream = (0, xtabUtils_1.linesWithBackticksRemoved)(linesStream);
        }
        else {
            (0, assert_1.assertNever)(opts.responseFormat);
        }
        const diffOptions = {
            emitFastCursorLineChange: opts.showLabel
                ? false
                : this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderEmitFastCursorLineChange, this.expService),
            nLinesToConverge: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNNonSignificantLinesToConverge, this.expService),
            nSignificantLinesToConverge: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNSignificantLinesToConverge, this.expService),
        };
        (async () => {
            let i = 0;
            let hasBeenDelayed = false;
            try {
                for await (const edit of responseProcessor_1.ResponseProcessor.diff(editWindowLines, cleanedLinesStream, cursorOriginalLinesOffset, diffOptions)) {
                    const singleLineEdits = [];
                    if (edit.lineRange.startLineNumber === edit.lineRange.endLineNumberExclusive || // we don't want to run diff on insertion
                        edit.newLines.length === 0 || // we don't want to run diff on deletion
                        edit.lineRange.endLineNumberExclusive - edit.lineRange.startLineNumber === 1 && edit.newLines.length === 1 // we want to run diff on single line edits
                    ) {
                        const singleLineEdit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(edit.lineRange.startLineNumber + editWindowLineRange.start, edit.lineRange.endLineNumberExclusive + editWindowLineRange.start), edit.newLines);
                        singleLineEdits.push(singleLineEdit);
                    }
                    else {
                        const affectedOriginalLines = editWindowLines.slice(edit.lineRange.startLineNumber - 1, edit.lineRange.endLineNumberExclusive - 1).join('\n');
                        const diffResult = await this.diffService.computeDiff(affectedOriginalLines, edit.newLines.join('\n'), {
                            ignoreTrimWhitespace: false,
                            maxComputationTimeMs: 0,
                            computeMoves: false
                        });
                        const translateByNLines = editWindowLineRange.start + edit.lineRange.startLineNumber;
                        for (const change of diffResult.changes) {
                            const singleLineEdit = new lineEdit_1.LineReplacement(new lineRange_1.LineRange(translateByNLines + change.original.startLineNumber - 1, translateByNLines + change.original.endLineNumberExclusive - 1), edit.newLines.slice(change.modified.startLineNumber - 1, change.modified.endLineNumberExclusive - 1));
                            singleLineEdits.push(singleLineEdit);
                        }
                    }
                    if (chatResponseFailure) { // do not emit edits if chat response failed
                        break;
                    }
                    logContext.setResponse(responseSoFar);
                    for (const singleLineEdit of singleLineEdits) {
                        this.trace(`pushing edit #${i}:\n${singleLineEdit.toString()}`, logContext, tracer);
                        if (!hasBeenDelayed) { // delay only the first one
                            hasBeenDelayed = true;
                            await this.enforceArtificialDelay(delaySession, telemetryBuilder);
                        }
                        pushEdit(result_1.Result.ok({ edit: singleLineEdit, window: editWindow, showLabel: opts.showLabel }));
                        i++;
                    }
                }
                if (chatResponseFailure) {
                    pushEdit(result_1.Result.error(XtabProvider_1.mapChatFetcherErrorToNoNextEditReason(chatResponseFailure)));
                    return;
                }
                const hadEdits = i > 0;
                if (hadEdits) {
                    pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                }
                else {
                    await this.pushNoSuggestionsOrRetry(request, editWindow, promptPieces, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, opts.retryState);
                }
            }
            catch (err) {
                logContext.setError(err);
                // Properly handle the error by pushing it as a result
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.Unexpected(errors.fromUnknown(err))));
            }
        })();
    }
    async pushNoSuggestionsOrRetry(request, editWindow, promptPieces, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, retryState) {
        const allowRetryWithExpandedWindow = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderRetryWithNMoreLinesBelow, this.expService);
        // if allowed to retry and not retrying already, flip the retry state and try again
        if (allowRetryWithExpandedWindow && retryState === 0 /* RetryState.NotRetrying */ && request.expandedEditWindowNLines === undefined) {
            this.doGetNextEdit(request, pushEdit, delaySession, logContext, cancellationToken, telemetryBuilder, 1 /* RetryState.Retrying */);
            return;
        }
        let nextCursorLinePrediction = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsNextCursorPredictionEnabled, this.expService);
        nextCursorLinePrediction = (nextCursorLinePrediction === true ? nextCursorLinePrediction_1.NextCursorLinePrediction.OnlyWithEdit :
            (nextCursorLinePrediction === false ? undefined : nextCursorLinePrediction));
        if (nextCursorLinePrediction !== undefined && retryState === 0 /* RetryState.NotRetrying */) {
            const nextCursorLineR = await this.predictNextCursorPosition(promptPieces);
            if (cancellationToken.isCancellationRequested) {
                pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
                return;
            }
            if (nextCursorLineR.isError()) {
                this.tracer.trace(`Predicted next cursor line error: ${nextCursorLineR.err.message}`);
                telemetryBuilder.setNextCursorLineError(nextCursorLineR.err.message);
            }
            else {
                const nextCursorLineZeroBased = nextCursorLineR.val;
                const lineDistanceFromCursorLine = nextCursorLineZeroBased - promptPieces.currentDocument.cursorLineOffset;
                telemetryBuilder.setNextCursorLineDistance(lineDistanceFromCursorLine);
                this.tracer.trace(`Predicted next cursor line: ${nextCursorLineZeroBased}`);
                if (nextCursorLineZeroBased >= promptPieces.currentDocument.lines.length) { // >= because the line index is zero-based
                    this.tracer.trace(`Predicted next cursor line error: exceedsDocumentLines`);
                    telemetryBuilder.setNextCursorLineError('exceedsDocumentLines');
                }
                else if (promptPieces.editWindowLinesRange.contains(nextCursorLineZeroBased)) {
                    this.tracer.trace(`Predicted next cursor line error: withinEditWindow`);
                    telemetryBuilder.setNextCursorLineError('withinEditWindow');
                }
                else {
                    const nextCursorLineOneBased = nextCursorLineZeroBased + 1;
                    const nextCursorLine = promptPieces.activeDoc.documentAfterEditsLines.at(nextCursorLineZeroBased);
                    const nextCursorColumn = (nextCursorLine?.length ?? 0) + 1;
                    switch (nextCursorLinePrediction) {
                        case nextCursorLinePrediction_1.NextCursorLinePrediction.Jump: {
                            const nextCursorPosition = new position_1.Position(nextCursorLineOneBased, nextCursorColumn);
                            pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow, nextCursorPosition)));
                            return;
                        }
                        case nextCursorLinePrediction_1.NextCursorLinePrediction.OnlyWithEdit:
                        case nextCursorLinePrediction_1.NextCursorLinePrediction.LabelOnlyWithEdit: {
                            this.doGetNextEditWithSelection(request, new range_1.Range(nextCursorLineOneBased, nextCursorColumn, nextCursorLineOneBased, nextCursorColumn), pushEdit, delaySession, { showLabel: nextCursorLinePrediction === nextCursorLinePrediction_1.NextCursorLinePrediction.LabelOnlyWithEdit }, logContext, cancellationToken, telemetryBuilder, 1 /* RetryState.Retrying */);
                            return;
                        }
                        default: {
                            (0, assert_1.assertNever)(nextCursorLinePrediction);
                        }
                    }
                }
            }
        }
        pushEdit(result_1.Result.error(new statelessNextEditProvider_1.NoNextEditReason.NoSuggestions(request.documentBeforeEdits, editWindow)));
        return;
    }
    computeAreaAroundEditWindowLinesRange(currentDocument) {
        const cursorLine = currentDocument.cursorLineOffset;
        const areaAroundStart = Math.max(0, cursorLine - promptCrafting_1.N_LINES_AS_CONTEXT);
        const areaAroundEndExcl = Math.min(currentDocument.lines.length, cursorLine + promptCrafting_1.N_LINES_AS_CONTEXT + 1);
        return new offsetRange_1.OffsetRange(areaAroundStart, areaAroundEndExcl);
    }
    computeEditWindowLinesRange(currentDocument, request, retryState, telemetry) {
        const currentDocLines = currentDocument.lines;
        const cursorLineOffset = currentDocument.cursorLineOffset;
        let nLinesAbove;
        {
            const useVaryingLinesAbove = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUseVaryingLinesAbove, this.expService);
            if (useVaryingLinesAbove) {
                nLinesAbove = 0; // default
                for (let i = 0; i < 8; ++i) {
                    const lineIdx = cursorLineOffset - i;
                    if (lineIdx < 0) {
                        break;
                    }
                    if (currentDocLines[lineIdx].trim() !== '') {
                        nLinesAbove = i;
                        break;
                    }
                }
            }
            else {
                nLinesAbove = (this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesAbove, this.expService)
                    ?? promptCrafting_1.N_LINES_ABOVE);
            }
        }
        let nLinesBelow;
        if (request.expandedEditWindowNLines !== undefined) {
            this.tracer.trace(`Using expanded nLinesBelow: ${request.expandedEditWindowNLines}`);
            nLinesBelow = request.expandedEditWindowNLines;
        }
        else {
            const overriddenNLinesBelow = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderNLinesBelow, this.expService);
            if (overriddenNLinesBelow !== undefined) {
                this.tracer.trace(`Using overridden nLinesBelow: ${overriddenNLinesBelow}`);
                nLinesBelow = overriddenNLinesBelow;
            }
            else {
                this.tracer.trace(`Using default nLinesBelow: ${promptCrafting_1.N_LINES_BELOW}`);
                nLinesBelow = promptCrafting_1.N_LINES_BELOW; // default
            }
        }
        if (retryState === 1 /* RetryState.Retrying */) {
            nLinesBelow += this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderRetryWithNMoreLinesBelow, this.expService) ?? 0;
        }
        let codeToEditStart = Math.max(0, cursorLineOffset - nLinesAbove);
        let codeToEditEndExcl = Math.min(currentDocLines.length, cursorLineOffset + nLinesBelow + 1);
        const maxMergeConflictLines = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabMaxMergeConflictLines, this.expService);
        if (maxMergeConflictLines) {
            const tentativeEditWindow = new offsetRange_1.OffsetRange(codeToEditStart, codeToEditEndExcl);
            const mergeConflictRange = findMergeConflictMarkersRange(currentDocLines, tentativeEditWindow, maxMergeConflictLines);
            if (mergeConflictRange) {
                const onlyMergeConflictLines = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabOnlyMergeConflictLines, this.expService);
                telemetry.setMergeConflictExpanded(onlyMergeConflictLines ? 'only' : 'normal');
                if (onlyMergeConflictLines) {
                    this.tracer.trace(`Expanding edit window to include ONLY merge conflict markers: ${mergeConflictRange.toString()}`);
                    codeToEditStart = mergeConflictRange.start;
                    codeToEditEndExcl = mergeConflictRange.endExclusive;
                }
                else {
                    this.tracer.trace(`Expanding edit window to include merge conflict markers: ${mergeConflictRange.toString()}; edit window range [${codeToEditStart}, ${codeToEditEndExcl})`);
                    codeToEditEndExcl = Math.max(codeToEditEndExcl, mergeConflictRange.endExclusive);
                }
            }
        }
        return new offsetRange_1.OffsetRange(codeToEditStart, codeToEditEndExcl);
    }
    static mapChatFetcherErrorToNoNextEditReason(fetchError) {
        switch (fetchError.type) {
            case commonTypes_1.ChatFetchResponseType.Canceled:
                return new statelessNextEditProvider_1.NoNextEditReason.GotCancelled('afterFetchCall');
            case commonTypes_1.ChatFetchResponseType.OffTopic:
            case commonTypes_1.ChatFetchResponseType.Filtered:
            case commonTypes_1.ChatFetchResponseType.PromptFiltered:
            case commonTypes_1.ChatFetchResponseType.Length:
            case commonTypes_1.ChatFetchResponseType.RateLimited:
            case commonTypes_1.ChatFetchResponseType.QuotaExceeded:
            case commonTypes_1.ChatFetchResponseType.ExtensionBlocked:
            case commonTypes_1.ChatFetchResponseType.AgentUnauthorized:
            case commonTypes_1.ChatFetchResponseType.AgentFailedDependency:
            case commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker:
                return new statelessNextEditProvider_1.NoNextEditReason.Uncategorized(errors.fromUnknown(fetchError));
            case commonTypes_1.ChatFetchResponseType.BadRequest:
            case commonTypes_1.ChatFetchResponseType.NotFound:
            case commonTypes_1.ChatFetchResponseType.Failed:
            case commonTypes_1.ChatFetchResponseType.NetworkError:
            case commonTypes_1.ChatFetchResponseType.Unknown:
                return new statelessNextEditProvider_1.NoNextEditReason.FetchFailure(errors.fromUnknown(fetchError));
        }
    }
    determineModelConfiguration(activeDocument) {
        if (this.forceUseDefaultModel) {
            return {
                modelName: undefined,
                ...xtabPromptOptions.DEFAULT_OPTIONS,
            };
        }
        const sourcedModelConfig = {
            modelName: undefined,
            promptingStrategy: undefined,
            currentFile: {
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabCurrentFileMaxTokens, this.expService),
                includeTags: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabIncludeTagsInCurrentFile, this.expService),
                prioritizeAboveCursor: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabPrioritizeAboveCursor, this.expService)
            },
            pagedClipping: {
                pageSize: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabPageSize, this.expService)
            },
            recentlyViewedDocuments: {
                nDocuments: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabNRecentlyViewedDocuments, this.expService),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabRecentlyViewedDocumentsMaxTokens, this.expService),
                includeViewedFiles: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabIncludeViewedFiles, this.expService),
            },
            languageContext: this.determineLanguageContextOptions(activeDocument.languageId, {
                enabled: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextEnabled, this.expService),
                enabledLanguages: this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextEnabledLanguages),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabLanguageContextMaxTokens, this.expService),
            }),
            diffHistory: {
                nEntries: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffNEntries, this.expService),
                maxTokens: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffMaxTokens, this.expService),
                onlyForDocsInPrompt: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffOnlyForDocsInPrompt, this.expService),
                useRelativePaths: this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabDiffUseRelativePaths, this.expService),
            },
            includePostScript: true,
        };
        const localOverridingModelConfig = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderModelConfiguration);
        if (localOverridingModelConfig) {
            return XtabProvider_1.overrideModelConfig(sourcedModelConfig, localOverridingModelConfig);
        }
        const expBasedModelConfig = this.overrideByStringModelConfig(sourcedModelConfig, configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderModelConfigurationString);
        if (expBasedModelConfig) {
            return expBasedModelConfig;
        }
        const defaultModelConfig = this.overrideByStringModelConfig(sourcedModelConfig, configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderDefaultModelConfigurationString);
        if (defaultModelConfig) {
            return defaultModelConfig;
        }
        return sourcedModelConfig;
    }
    overrideByStringModelConfig(originalModelConfig, configKey) {
        const configString = this.configService.getExperimentBasedConfig(configKey, this.expService);
        if (configString === undefined) {
            return undefined;
        }
        let parsedConfig;
        try {
            parsedConfig = JSON.parse(configString);
        }
        catch (e) {
            /* __GDPR__
                "incorrectNesModelConfig" : {
                    "owner": "ulugbekna",
                    "comment": "Capture if model configuration string is invalid JSON.",
                    "configName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the configuration that failed to parse." },
                    "errorMessage": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Error message from JSON.parse." },
                    "configValue": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The invalid JSON string." }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('incorrectNesModelConfig', { configName: configKey.id, errorMessage: errors.toString(errors.fromUnknown(e)), configValue: configString });
        }
        if (parsedConfig) {
            return XtabProvider_1.overrideModelConfig(originalModelConfig, parsedConfig);
        }
        return undefined;
    }
    static overrideModelConfig(modelConfig, overridingConfig) {
        return {
            ...modelConfig,
            modelName: overridingConfig.modelName,
            promptingStrategy: overridingConfig.promptingStrategy,
            currentFile: {
                ...modelConfig.currentFile,
                includeTags: overridingConfig.includeTagsInCurrentFile,
            },
        };
    }
    async predictNextCursorPosition(promptPieces) {
        const tracer = this.tracer.sub('predictNextCursorPosition');
        const systemMessage = 'Your task is to predict the next line number in the current file where the developer is most likely to make their next edit, using the provided context.';
        const maxTokens = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InlineEditsNextCursorPredictionCurrentFileMaxTokens, this.expService);
        const currentFileContentR = this.constructTaggedFile(promptPieces.currentDocument, promptPieces.editWindowLinesRange, promptPieces.areaAroundEditWindowLinesRange, {
            ...promptPieces.opts,
            currentFile: {
                ...promptPieces.opts.currentFile,
                maxTokens,
                includeTags: false,
            }
        }, XtabProvider_1.computeTokens, { includeLineNumbers: true });
        if (currentFileContentR.isError()) {
            tracer.trace(`Failed to construct tagged file: ${currentFileContentR.err}`);
            return result_1.Result.fromString(currentFileContentR.err);
        }
        const { taggedCurrentDocLines, areaAroundCodeToEdit } = currentFileContentR.val;
        const newPromptPieces = new promptCrafting_1.PromptPieces(promptPieces.currentDocument, promptPieces.editWindowLinesRange, promptPieces.areaAroundEditWindowLinesRange, promptPieces.activeDoc, promptPieces.xtabHistory, taggedCurrentDocLines, areaAroundCodeToEdit, promptPieces.langCtx, XtabProvider_1.computeTokens, {
            ...promptPieces.opts,
            includePostScript: false,
        });
        const userMessage = (0, promptCrafting_1.getUserPrompt)(newPromptPieces);
        const messages = constructMessages({
            systemMsg: systemMessage,
            userMsg: userMessage
        });
        const modelName = this.configService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.InlineEditsNextCursorPredictionModelName, this.expService);
        if (modelName === undefined) {
            tracer.trace('Model name for cursor prediction is not defined; skipping prediction');
            return result_1.Result.fromString('modelNameNotDefined');
        }
        const url = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsNextCursorPredictionUrl);
        const secretKey = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsNextCursorPredictionApiKey);
        const endpoint = this.instaService.createInstance(chatEndpoint_1.ChatEndpoint, {
            id: modelName,
            name: 'nes.nextCursorPosition',
            urlOrRequestMetadata: url ? url : { type: pukuRequestTypes_1.RequestType.ProxyChatCompletions },
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            version: '',
            capabilities: {
                type: 'chat',
                family: '',
                tokenizer: tokenizer_1.TokenizerType.CL100K,
                limits: undefined,
                supports: {
                    parallel_tool_calls: false,
                    tool_calls: false,
                    streaming: true,
                    vision: false,
                    prediction: false,
                    thinking: false
                }
            },
        });
        const response = await endpoint.makeChatRequest2({
            messages,
            debugName: 'nes.nextCursorPosition',
            finishedCb: undefined,
            location: commonTypes_1.ChatLocation.Other,
            requestOptions: secretKey ? {
                secretKey,
            } : undefined,
        }, cancellation_1.CancellationToken.None);
        if (response.type !== commonTypes_1.ChatFetchResponseType.Success) {
            return result_1.Result.fromString(`fetchError:${response.type}`);
        }
        try {
            const trimmed = response.value.trim();
            const lineNumber = parseInt(trimmed, 10);
            if (isNaN(lineNumber)) {
                return result_1.Result.fromString(`gotNaN`);
            }
            if (lineNumber < 0) {
                return result_1.Result.fromString(`negativeLineNumber`);
            }
            return result_1.Result.ok(lineNumber);
        }
        catch (err) {
            tracer.trace(`Failed to parse predicted line number from response '${response.value}': ${err}`);
            return result_1.Result.fromString(`failedToParseLine:"${response.value}". Error ${errors.fromUnknown(err).message}`);
        }
    }
    pickSystemPrompt(promptingStrategy) {
        switch (promptingStrategy) {
            case xtabPromptOptions.PromptingStrategy.UnifiedModel:
                return systemMessages_1.unifiedModelSystemPrompt;
            case xtabPromptOptions.PromptingStrategy.Codexv21NesUnified:
            case xtabPromptOptions.PromptingStrategy.SimplifiedSystemPrompt:
                return systemMessages_1.simplifiedPrompt;
            case xtabPromptOptions.PromptingStrategy.Xtab275:
                return systemMessages_1.xtab275SystemPrompt;
            case xtabPromptOptions.PromptingStrategy.Nes41Miniv3:
                return systemMessages_1.nes41Miniv3SystemPrompt;
            default:
                return systemMessages_1.systemPromptTemplate;
        }
    }
    determineLanguageContextOptions(languageId, { enabled, enabledLanguages, maxTokens }) {
        // Some languages are
        if (languageId in enabledLanguages) {
            return { enabled: enabledLanguages[languageId], maxTokens };
        }
        return { enabled, maxTokens };
    }
    getEndpoint(configuredModelName) {
        const url = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUrl);
        const apiKey = this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderApiKey);
        const hasOverriddenUrlAndApiKey = url !== undefined && apiKey !== undefined;
        if (hasOverriddenUrlAndApiKey) {
            return this.instaService.createInstance(xtabEndpoint_1.XtabEndpoint, url, apiKey, configuredModelName);
        }
        return (0, proxyXtabEndpoint_1.createProxyXtabEndpoint)(this.instaService, configuredModelName);
    }
    getPredictedOutput(editWindowLines, responseFormat) {
        return this.configService.getConfig(configurationService_1.ConfigKey.Internal.InlineEditsXtabProviderUsePrediction)
            ? {
                type: 'content',
                content: XtabProvider_1.getPredictionContents(editWindowLines, responseFormat)
            }
            : undefined;
    }
    static getPredictionContents(editWindowLines, responseFormat) {
        if (responseFormat === xtabPromptOptions.ResponseFormat.UnifiedWithXml) {
            return ['<EDIT>', ...editWindowLines, '</EDIT>'].join('\n');
        }
        else if (responseFormat === xtabPromptOptions.ResponseFormat.EditWindowOnly) {
            return editWindowLines.join('\n');
        }
        else if (responseFormat === xtabPromptOptions.ResponseFormat.CodeBlock) {
            return ['```', ...editWindowLines, '```'].join('\n');
        }
        else {
            (0, assert_1.assertNever)(responseFormat);
        }
    }
    async debounce(delaySession, telemetry) {
        if (this.simulationCtx.isInSimulationTests) {
            return;
        }
        const debounceTime = delaySession.getDebounceTime();
        this.tracer.trace(`Debouncing for ${debounceTime} ms`);
        telemetry.setDebounceTime(debounceTime);
        await (0, async_2.timeout)(debounceTime);
    }
    async enforceArtificialDelay(delaySession, telemetry) {
        if (this.simulationCtx.isInSimulationTests) {
            return;
        }
        const artificialDelay = delaySession.getArtificialDelay();
        this.tracer.trace(`Enforcing artificial delay of ${artificialDelay} ms`);
        telemetry.setArtificialDelay(artificialDelay);
        if (artificialDelay > 0) {
            await (0, async_2.timeout)(artificialDelay);
        }
    }
    trace(msg, logContext, tracer) {
        tracer.trace(msg);
        logContext.addLog(msg);
    }
};
exports.XtabProvider = XtabProvider;
exports.XtabProvider = XtabProvider = XtabProvider_1 = __decorate([
    __param(0, simulationTestContext_1.ISimulationTestContext),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, diffService_1.IDiffService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, nullExperimentationService_1.IExperimentationService),
    __param(6, logService_1.ILogService),
    __param(7, languageContextProviderService_1.ILanguageContextProviderService),
    __param(8, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(9, ignoreService_1.IIgnoreService),
    __param(10, telemetry_1.ITelemetryService)
], XtabProvider);
/**
 * Finds the range of lines containing merge conflict markers within a specified edit window.
 *
 * @param lines - Array of strings representing the lines of text to search through
 * @param editWindowRange - The range within which to search for merge conflict markers
 * @param maxMergeConflictLines - Maximum number of lines to search for conflict markers
 * @returns An OffsetRange object representing the start and end of the conflict markers, or undefined if not found
 */
function findMergeConflictMarkersRange(lines, editWindowRange, maxMergeConflictLines) {
    for (let i = editWindowRange.start; i < Math.min(lines.length, editWindowRange.endExclusive); ++i) {
        if (!lines[i].startsWith('<<<<<<<')) {
            continue;
        }
        // found start of merge conflict markers -- now find the end
        for (let j = i + 1; j < lines.length && (j - i) < maxMergeConflictLines; ++j) {
            if (lines[j].startsWith('>>>>>>>')) {
                return new offsetRange_1.OffsetRange(i, j + 1 /* because endExclusive */);
            }
        }
    }
    return undefined;
}
function constructMessages({ systemMsg, userMsg }) {
    return [
        {
            role: prompt_tsx_1.Raw.ChatRole.System,
            content: (0, globalStringUtils_1.toTextParts)(systemMsg)
        },
        {
            role: prompt_tsx_1.Raw.ChatRole.User,
            content: (0, globalStringUtils_1.toTextParts)(userMsg)
        }
    ];
}
function charCount(messages) {
    const promptCharCount = messages.reduce((total, msg) => total + msg.content.reduce((subtotal, part) => subtotal + (part.type === rawTypes_1.ChatCompletionContentPartKind.Text ? part.text.length : 0), 0), 0);
    return promptCharCount;
}
//# sourceMappingURL=xtabProvider.js.map