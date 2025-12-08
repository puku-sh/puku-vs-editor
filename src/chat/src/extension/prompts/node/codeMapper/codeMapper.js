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
var CodeMapper_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeMapper = void 0;
exports.processFullRewriteNotebook = processFullRewriteNotebook;
exports.processFullRewriteNotebookEdits = processFullRewriteNotebookEdits;
exports.processFullRewriteNewNotebook = processFullRewriteNewNotebook;
exports.processFullRewrite = processFullRewrite;
exports.processPatchResponse = processPatchResponse;
exports.isNewDocument = isNewDocument;
exports.getTrailingArrayEmptyLineCount = getTrailingArrayEmptyLineCount;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const chatMLFetcher_1 = require("../../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const diffService_1 = require("../../../../platform/diff/common/diffService");
const notebookDocumentSnapshot_1 = require("../../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const proxy4oEndpoint_1 = require("../../../../platform/endpoint/node/proxy4oEndpoint");
const proxyInstantApplyShortEndpoint_1 = require("../../../../platform/endpoint/node/proxyInstantApplyShortEndpoint");
const logService_1 = require("../../../../platform/log/common/logService");
const editLogService_1 = require("../../../../platform/multiFileEdit/common/editLogService");
const multiFileEditQualityTelemetry_1 = require("../../../../platform/multiFileEdit/common/multiFileEditQualityTelemetry");
const completionsAPI_1 = require("../../../../platform/nesFetch/common/completionsAPI");
const completionsFetchService_1 = require("../../../../platform/nesFetch/common/completionsFetchService");
const openai_1 = require("../../../../platform/networking/common/openai");
const alternativeContentEditGenerator_1 = require("../../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const nullTelemetryService_1 = require("../../../../platform/telemetry/common/nullTelemetryService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const tokenizer_1 = require("../../../../platform/tokenizer/node/tokenizer");
const languages_1 = require("../../../../util/common/languages");
const markdown_1 = require("../../../../util/common/markdown");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const assert_1 = require("../../../../util/vs/base/common/assert");
const async_1 = require("../../../../util/vs/base/common/async");
const map_1 = require("../../../../util/vs/base/common/map");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uuid_1 = require("../../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptCraftingTypes_1 = require("../../../inlineChat/node/promptCraftingTypes");
const editGeneration_1 = require("../../../prompt/node/editGeneration");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const codeBlockFormattingRules_1 = require("../panel/codeBlockFormattingRules");
const codeMapperPrompt_1 = require("./codeMapperPrompt");
const patchEditGeneration_1 = require("./patchEditGeneration");
async function processFullRewriteNotebook(document, inputStream, outputStream, alternativeNotebookEditGenerator, telemetryOptions, token) {
    for await (const edit of processFullRewriteNotebookEdits(document, inputStream, alternativeNotebookEditGenerator, telemetryOptions, token)) {
        if (Array.isArray(edit)) {
            outputStream.textEdit(edit[0], edit[1]);
        }
        else {
            outputStream.notebookEdit(document.uri, edit); // changed this.outputStream to outputStream
        }
    }
    return undefined;
}
async function* processFullRewriteNotebookEdits(document, inputStream, alternativeNotebookEditGenerator, telemetryOptions, token) {
    // emit start of notebook
    const cellMap = new map_1.ResourceMap();
    for await (const edit of alternativeNotebookEditGenerator.generateNotebookEdits(document, inputStream, telemetryOptions, token)) {
        if (Array.isArray(edit)) {
            const cellUri = edit[0];
            const cell = cellMap.get(cellUri) || document.getCells().find(cell => (0, resources_1.isEqual)(cell.document.uri, cellUri));
            if (cell) {
                cellMap.set(cellUri, cell);
                if (edit[1].length === 1 && edit[1][0].range.isSingleLine && cell.document.lineCount > edit[1][0].range.start.line) {
                    if (cell.document.lineAt(edit[1][0].range.start.line).text === edit[1][0].newText) {
                        continue;
                    }
                }
                yield [cellUri, edit[1]];
            }
        }
        else {
            yield edit;
        }
    }
    return undefined;
}
async function processFullRewriteNewNotebook(uri, source, outputStream, alternativeNotebookEditGenerator, telemetryOptions, token) {
    for await (const edit of alternativeNotebookEditGenerator.generateNotebookEdits(uri, source, telemetryOptions, token)) {
        if (!Array.isArray(edit)) {
            outputStream.notebookEdit(uri, edit);
        }
    }
    return undefined;
}
function emitCodeLine(line, uri, existingDocument, outputStream, pushedLines, token) {
    if (token.isCancellationRequested) {
        return undefined;
    }
    const lineCount = existingDocument ? existingDocument.lineCount : 0;
    const currentLineIndex = pushedLines.length;
    pushedLines.push(line);
    if (currentLineIndex < lineCount) {
        // this line exists in the doc => replace it
        const currentLineLength = existingDocument ? existingDocument.lineAt(currentLineIndex).text.length : 0;
        outputStream.textEdit(uri, [vscodeTypes_1.TextEdit.replace(new vscodeTypes_1.Range(currentLineIndex, 0, currentLineIndex, currentLineLength), line)]);
    }
    else {
        // we are at the end of the document
        const addedText = currentLineIndex === 0 ? line : `\n` + line;
        outputStream.textEdit(uri, [vscodeTypes_1.TextEdit.replace(new vscodeTypes_1.Range(currentLineIndex, 0, currentLineIndex, 0), addedText)]);
    }
}
async function processFullRewrite(uri, document, newContent, outputStream, token, pushedLines) {
    for (const line of newContent.split(/\r?\n/)) {
        emitCodeLine(line, uri, document, outputStream, pushedLines, token);
    }
    await handleTrailingLines(uri, document, outputStream, pushedLines, token);
}
async function processFullRewriteStream(uri, existingDocument, inputStream, outputStream, token, pushedLines = []) {
    for await (const line of inputStream) {
        emitCodeLine(line.value, uri, existingDocument, outputStream, pushedLines, token);
    }
    return pushedLines;
}
async function handleTrailingLines(uri, existingDocument, outputStream, pushedLines, token) {
    const lineCount = existingDocument ? existingDocument.lineCount : 0;
    const initialTrailingEmptyLineCount = existingDocument ? getTrailingDocumentEmptyLineCount(existingDocument) : 0;
    // The LLM does not want to produce trailing newlines
    // Here we try to maintain the exact same tralining newlines count as the original document had
    const pushedTrailingEmptyLineCount = getTrailingArrayEmptyLineCount(pushedLines);
    for (let i = pushedTrailingEmptyLineCount; i < initialTrailingEmptyLineCount; i++) {
        emitCodeLine('', uri, existingDocument, outputStream, pushedLines, token);
    }
    // Make sure we delete everything after the changed lines
    const currentLineIndex = pushedLines.length;
    if (currentLineIndex < lineCount) {
        const from = currentLineIndex === 0 ? new vscodeTypes_1.Position(0, 0) : new vscodeTypes_1.Position(currentLineIndex - 1, pushedLines[pushedLines.length - 1].length);
        outputStream.textEdit(uri, [vscodeTypes_1.TextEdit.delete(new vscodeTypes_1.Range(from, new vscodeTypes_1.Position(lineCount, 0)))]);
    }
}
async function processFullRewriteResponseCode(uri, existingDocument, inputStream, outputStream, token) {
    const pushedLines = await processFullRewriteStream(uri, existingDocument, inputStream, outputStream, token);
    if (token.isCancellationRequested) {
        return;
    }
    await handleTrailingLines(uri, existingDocument, outputStream, pushedLines, token);
}
/**
 * Extract a fenced code block from a reply and emit the lines in the code block one-by-one.
 */
function extractCodeBlock(inputStream, token) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        const fence = '```';
        const textStream = async_1.AsyncIterableObject.map(inputStream, part => part.delta.text);
        const reader = new streamingEdits_1.PartialAsyncTextReader(textStream[Symbol.asyncIterator]());
        let inCodeBlock = false;
        while (!reader.endOfStream) {
            // Skip everything until we hit a fence
            if (token.isCancellationRequested) {
                break;
            }
            const line = await reader.readLine();
            if (line.startsWith(fence) && inCodeBlock) {
                // Done reading code block, stop reading
                inCodeBlock = false;
                break;
            }
            else if (line.startsWith(fence)) {
                inCodeBlock = true;
            }
            else if (inCodeBlock) {
                emitter.emitOne(new streamingEdits_1.LineOfText(line));
            }
        }
    });
}
async function processPatchResponse(uri, originalText, inputStream, outputStream, token) {
    let documentLines = originalText ? editGeneration_1.Lines.fromString(originalText) : [];
    function processAndEmitPatch(patch) {
        // Make sure it's valid, otherwise emit
        if ((0, arrays_1.equals)(patch.find, patch.replace)) {
            return;
        }
        const res = (0, patchEditGeneration_1.findEdit)(documentLines, (0, patchEditGeneration_1.getCodeBlock)(patch.find), (0, patchEditGeneration_1.getCodeBlock)(patch.replace), 0);
        if (res instanceof editGeneration_1.LinesEdit) {
            outputStream.textEdit(uri, res.toTextEdit());
            documentLines = res.apply(documentLines);
        }
    }
    let original, filePath;
    const otherSections = [];
    for await (const section of (0, patchEditGeneration_1.iterateSectionsForResponse)(inputStream)) {
        switch (section.marker) {
            case undefined:
                break;
            case patchEditGeneration_1.Marker.FILEPATH:
                filePath = section.content.join('\n').trim();
                break;
            case patchEditGeneration_1.Marker.FIND:
                original = section.content;
                break;
            case patchEditGeneration_1.Marker.REPLACE: {
                if (section.content && original && filePath) {
                    processAndEmitPatch({ filePath, find: original, replace: section.content });
                }
                break;
            }
            case patchEditGeneration_1.Marker.COMPLETE:
                break;
            default:
                otherSections.push(section);
                break;
        }
    }
}
function isNewDocument(input) {
    return input.createNew;
}
let CodeMapper = class CodeMapper {
    static { CodeMapper_1 = this; }
    static { this.closingXmlTag = 'copilot-edited-file'; }
    constructor(endpointProvider, instantiationService, tokenizerProvider, logService, telemetryService, editLogService, experimentationService, diffService, multiFileEditInternalTelemetryService, alternativeNotebookEditGenerator, authenticationService, notebookService, configurationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.tokenizerProvider = tokenizerProvider;
        this.logService = logService;
        this.telemetryService = telemetryService;
        this.editLogService = editLogService;
        this.experimentationService = experimentationService;
        this.diffService = diffService;
        this.multiFileEditInternalTelemetryService = multiFileEditInternalTelemetryService;
        this.alternativeNotebookEditGenerator = alternativeNotebookEditGenerator;
        this.authenticationService = authenticationService;
        this.notebookService = notebookService;
        this.gpt4oProxyEndpoint = this.experimentationService.hasTreatments().then(() => this.instantiationService.createInstance(proxy4oEndpoint_1.Proxy4oEndpoint));
        this.shortIAEndpoint = this.experimentationService.hasTreatments().then(() => this.instantiationService.createInstance(proxyInstantApplyShortEndpoint_1.ProxyInstantApplyShortEndpoint));
        this.shortContextLimit = configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.InstantApplyShortContextLimit, experimentationService) ?? 8000;
    }
    async mapCode(request, resultStream, telemetryInfo, token) {
        const fastEdit = await this.mapCodeUsingFastEdit(request, resultStream, telemetryInfo, token);
        if (!(fastEdit instanceof CodeMapperRefusal)) {
            return fastEdit;
        }
        // continue with "slow rewrite endpoint" when fast rewriting was not possible
        // use gpt-4.1 as fallback
        const chatEndpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        // Only attempt a full file rewrite if the original document fits into 3/4 of the max output token limit, leaving space for the model to add code. The limit is currently a flat 4K tokens from CAPI across all our models.
        // If there are multiple input documents, pick the longest one to base the limit on
        const longestDocumentContext = isNewDocument(request) ? request.workingSet.reduce((prev, curr) => (prev && (prev.getText().length > curr.getText().length)) ? prev : curr, undefined) : request.existingDocument;
        const doFullRewrite = longestDocumentContext ? await chatEndpoint.acquireTokenizer().tokenLength(longestDocumentContext.getText()) < (4096 / 4 * 3) : true;
        const existingDocument = request.existingDocument;
        const fetchStreamSource = new chatMLFetcher_1.FetchStreamSource();
        const cb = async (text, index, delta) => {
            fetchStreamSource.update(text, delta);
            return undefined;
        };
        let responsePromise;
        if (doFullRewrite) {
            if (existingDocument && existingDocument instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot) { // TODO@joyceerhl: Handle notebook document response processing
                const telemtryOptions = {
                    source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.codeMapperEditNotebook,
                    requestId: undefined,
                    model: chatEndpoint.model
                };
                responsePromise = processFullRewriteNotebook(existingDocument.document, extractCodeBlock(fetchStreamSource.stream, token), resultStream, this.alternativeNotebookEditGenerator, telemtryOptions, token);
            }
            else {
                responsePromise = processFullRewriteResponseCode(request.uri, existingDocument, extractCodeBlock(fetchStreamSource.stream, token), resultStream, token);
            }
        }
        else {
            responsePromise = processPatchResponse(request.uri, existingDocument?.getText(), fetchStreamSource.stream, resultStream, token);
        }
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, chatEndpoint, doFullRewrite ? codeMapperPrompt_1.CodeMapperFullRewritePrompt : codeMapperPrompt_1.CodeMapperPatchRewritePrompt, { request });
        const prompt = await promptRenderer.render(undefined, token);
        if (token.isCancellationRequested) {
            return undefined;
        }
        const fetchResult = await chatEndpoint.makeChatRequest('codeMapper', prompt.messages, cb, token, commonTypes_1.ChatLocation.Other, undefined, { temperature: 0 });
        fetchStreamSource.resolve();
        await responsePromise; // Make sure we push all text edits to the response stream
        let result;
        const createOutcome = (annotations, errorDetails) => {
            return ({ errorDetails, annotations, telemetry: { requestId: String(telemetryInfo?.chatRequestId), speculationRequestId: fetchResult.requestId, requestSource: String(telemetryInfo?.chatRequestSource), mapper: doFullRewrite ? 'full' : 'patch' } });
        };
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Success) {
            result = createOutcome([], undefined);
        }
        else {
            if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Canceled) {
                return undefined;
            }
            const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this.authenticationService.getCopilotToken()).copilotPlan);
            result = createOutcome([{ label: errorDetails.message, message: `request ${fetchResult.type}`, severity: 'error' }], errorDetails);
        }
        if (result.annotations.length || result.errorDetails) {
            this.logService.info(`[code mapper] Problems generating edits: ${result.annotations.map(a => `${a.message} [${a.label}]`).join(', ')}, ${result.errorDetails?.message}`);
        }
        return result;
    }
    //#region Full file rewrite with speculation / predicted outputs
    async buildPrompt(request, token) {
        let endpoint = await this.gpt4oProxyEndpoint;
        const tokenizer = this.tokenizerProvider.acquireTokenizer(endpoint);
        const requestId = (0, uuid_1.generateUuid)();
        const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, codeMapperPrompt_1.CodeMapperFullRewritePrompt, { request, shouldTrimCodeBlocks: true });
        const uri = request.uri;
        const promptRendererResult = await promptRenderer.render(undefined, token);
        const fence = isNewDocument(request) ? '```' : (0, markdown_1.getFenceForCodeBlock)(request.existingDocument.getText());
        const languageId = isNewDocument(request) ? (0, languages_1.getLanguageForResource)(uri).languageId : request.existingDocument.languageId;
        const speculation = isNewDocument(request) ? '' : request.existingDocument.getText();
        const messages = [{
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: [(0, globalStringUtils_1.toTextPart)(promptRendererResult.messages.reduce((prev, curr) => {
                        const content = (0, globalStringUtils_1.getTextPart)(curr.content);
                        if (curr.role === prompt_tsx_1.Raw.ChatRole.System) {
                            const currentContent = content.endsWith('\n') ? content : `${content}\n`;
                            return `${prev}<SYSTEM>\n${currentContent}</SYSTEM>\n\n\n`;
                        }
                        return prev + content;
                    }, ''))]
            }];
        const prompt = promptRendererResult.messages.reduce((prev, curr) => {
            const content = (0, globalStringUtils_1.getTextPart)(curr.content);
            if (curr.role === prompt_tsx_1.Raw.ChatRole.System) {
                const currentContent = content.endsWith('\n') ? content : `${content}\n`;
                return `${prev}<SYSTEM>\n${currentContent}\nEnd your response with </${CodeMapper_1.closingXmlTag}>.\n</SYSTEM>\n\n\n`;
            }
            return prev + content;
        }, '').trimEnd() + `\n\n\nThe resulting document:\n<${CodeMapper_1.closingXmlTag}>\n${fence}${(0, markdown_1.languageIdToMDCodeBlockLang)(languageId)}\n`;
        if (prompt.length < this.shortContextLimit) {
            endpoint = await this.shortIAEndpoint;
        }
        const promptTokenCount = await tokenizer.tokenLength(prompt);
        const speculationTokenCount = await tokenizer.tokenLength(speculation);
        const stopTokens = [`${fence}\n</${CodeMapper_1.closingXmlTag}>`, `${fence}\r\n</${CodeMapper_1.closingXmlTag}>`, `</${CodeMapper_1.closingXmlTag}>`];
        return { prompt, requestId, messages, speculation, stopTokens, promptTokenCount, speculationTokenCount, endpoint, tokenizer, languageId };
    }
    async logDoneInfo(request, prompt, response, telemetryInfo, mapper, annotations) {
        if (this.telemetryService instanceof nullTelemetryService_1.NullTelemetryService) {
            // noo need to make all the computation
            return;
        }
        const { speculation, tokenizer, promptTokenCount, speculationTokenCount } = prompt;
        const { firstTokenTime, startTime, responseText, requestId } = response;
        const timeToFirstToken = firstTokenTime === -1 ? -1 : firstTokenTime - startTime;
        const timeToComplete = Date.now() - startTime;
        this.logService.info(`srequest done: ${timeToComplete}ms, chatRequestId: [${telemetryInfo?.requestId}], speculationRequestId: [${requestId}]`);
        const isNoopEdit = responseText.trim() === speculation.trim();
        const { addedLines, removedLines } = await computeAdditionsAndDeletions(this.diffService, speculation, responseText);
        /* __GDPR__
            "speculation.response.success" : {
                "owner": "alexdima",
                "comment": "Report quality details for a successful speculative response.",
                "chatRequestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the current turn request" },
                "chatRequestSource": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Source of the current turn request" },
                "isNoopEdit": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the response text is identical to the speculation." },
                "speculationRequestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the current turn request" },
                "containsElidedCodeComments": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the response text contains elided code comments." },
                "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "The model used for this speculation request" },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens", "isMeasurement": true },
                "speculationTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of speculation tokens", "isMeasurement": true },
                "responseTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of response tokens", "isMeasurement": true },
                "addedLines": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of lines added", "isMeasurement": true },
                "removedLines": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of lines removed", "isMeasurement": true },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether this is a notebook", "isMeasurement": true },
                "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to first token", "isMeasurement": true },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Time to complete the request", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('speculation.response.success', {
            chatRequestId: telemetryInfo?.requestId,
            chatRequestSource: telemetryInfo?.requestSource,
            speculationRequestId: requestId,
            isNoopEdit: String(isNoopEdit),
            containsElidedCodeComments: String(responseText.includes(codeBlockFormattingRules_1.EXISTING_CODE_MARKER)),
            model: mapper
        }, {
            promptTokenCount,
            speculationTokenCount,
            responseTokenCount: await tokenizer.tokenLength(responseText),
            timeToFirstToken,
            timeToComplete,
            addedLines,
            removedLines,
            isNotebook: this.notebookService.hasSupportedNotebooks(request.uri) ? 1 : 0
        });
        if (isNoopEdit) {
            const message = 'Speculative response is identical to speculation, srequest: ' + requestId + ',  URI: ' + request.uri.toString();
            annotations.push({ label: promptCraftingTypes_1.OutcomeAnnotationLabel.NOOP_EDITS, message, severity: 'error' });
        }
    }
    async logError(request, prompt, response, telemetryInfo, mapper, errorMessage, error) {
        const { promptTokenCount, speculationTokenCount } = prompt;
        const { startTime, requestId } = response;
        this.logService.error(`srequest failed: ${Date.now() - startTime}ms, chatRequestId: [${telemetryInfo?.requestId}], speculationRequestId: [${requestId}] error: [${errorMessage}]`);
        if (error) {
            this.logService.error(error);
        }
        /* __GDPR__
            "speculation.response.error" : {
                "owner": "alexdima",
                "comment": "Report quality issue for when a speculative response failed.",
                "errorMessage": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "The name of the error" },
                "chatRequestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the current turn request" },
                "speculationRequestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the speculation request" },
                "chatRequestSource": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Source of the current turn request" },
                "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "The model used for this speculation request" },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of prompt tokens", "isMeasurement": true },
                "speculationTokenCount": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of speculation tokens", "isMeasurement": true },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether this is a notebook", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('speculation.response.error', {
            errorMessage,
            chatRequestId: telemetryInfo?.requestId,
            chatRequestSource: telemetryInfo?.requestSource,
            speculationRequestId: requestId,
            model: mapper
        }, {
            promptTokenCount,
            speculationTokenCount,
            isNotebook: this.notebookService.hasSupportedNotebooks(request.uri) ? 1 : 0
        });
    }
    async mapCodeUsingFastEdit(request, resultStream, telemetryInfo, token) {
        // When generating edits for notebooks that are from location=panel, do not use fast edit.
        // location = panel, is when user is applying code displayed in chat panel into notebook.
        // Fast apply doesn't work well when we have only a part of the code and no code markers.
        if (!request.createNew && request.location === 'panel' && this.notebookService.hasSupportedNotebooks(request.uri)) {
            this.logService.error(`srequest | refuse | SD | refusing notebook from Panel | [codeMapper]`);
            return new CodeMapperRefusal();
        }
        const combinedDocumentLength = isNewDocument(request) ? request.workingSet.reduce((prev, curr) => prev + curr.getText().length, 0) : request.existingDocument.getText().length;
        const promptLimit = 256_000; // (256K is roughly 64k tokens) and documents longer than this will surely not fit
        if (combinedDocumentLength > promptLimit) {
            this.logService.error(`srequest | refuse | SD | refusing huge document | [codeMapper]`);
            return new CodeMapperRefusal();
        }
        const builtPrompt = await this.buildPrompt(request, token);
        const { promptTokenCount, speculation, requestId, endpoint } = builtPrompt;
        // `prompt` includes the whole document, the codeblock and some prosa. we leave space
        // for the document again and the whole codeblock (assuming it's all insertions)
        // const codeBlockTokenCount = promptTokenCount - speculationTokenCount;
        // if (promptTokenCount > 128_000 - speculationTokenCount - codeBlockTokenCount) {
        if (promptTokenCount > 64_000) {
            this.logService.error(`srequest | refuse | SD | exceeds token limit | [codeMapper]`);
            return new CodeMapperRefusal();
        }
        const mapper = endpoint.model;
        const outcomeCorrelationTelemetry = {
            requestId: String(telemetryInfo?.chatRequestId),
            requestSource: String(telemetryInfo?.chatRequestSource),
            chatRequestModel: String(telemetryInfo?.chatRequestModel),
            speculationRequestId: requestId,
            mapper,
        };
        const res = await this.fetchNativePredictedOutputs(request, builtPrompt, resultStream, outcomeCorrelationTelemetry, token, true);
        if (isCodeMapperOutcome(res)) {
            return res;
        }
        const { allResponseText, finishReason, annotations, firstTokenTime, startTime } = res;
        try {
            this.ensureFinishReasonStopOrThrow(requestId, finishReason);
            const response = { responseText: allResponseText.join(''), startTime, firstTokenTime, requestId };
            await this.logDoneInfo(request, builtPrompt, response, outcomeCorrelationTelemetry, mapper, annotations);
            if (telemetryInfo?.chatRequestId) {
                const prompt = JSON.stringify(builtPrompt.messages);
                this.editLogService.logSpeculationRequest(telemetryInfo.chatRequestId, request.uri, prompt, speculation, response.responseText);
                this.multiFileEditInternalTelemetryService.storeEditPrompt({ prompt, uri: request.uri, isAgent: telemetryInfo.isAgent, document: request.existingDocument?.document }, { chatRequestId: telemetryInfo.chatRequestId, chatSessionId: telemetryInfo.chatSessionId, speculationRequestId: requestId, mapper });
            }
            return { annotations, telemetry: outcomeCorrelationTelemetry };
        }
        catch (err) {
            const annotations = [{ label: err.message, message: `request failed`, severity: 'error' }];
            let errorDetails;
            if (err instanceof completionsFetchService_1.CompletionsFetchError) {
                if (err.type === 'stop_content_filter') {
                    errorDetails = {
                        message: (0, commonTypes_1.getFilteredMessage)(openai_1.FilterReason.Prompt),
                        responseIsFiltered: true
                    };
                }
                else if (err.type === 'stop_length') {
                    errorDetails = {
                        message: l10n.t(`Sorry, the response hit the length limit. Please rephrase your prompt.`)
                    };
                }
                this.logError(request, builtPrompt, { startTime, firstTokenTime, requestId }, outcomeCorrelationTelemetry, mapper, err.type);
            }
            else {
                this.logError(request, builtPrompt, { startTime, firstTokenTime, requestId }, outcomeCorrelationTelemetry, mapper, err.message, err);
            }
            errorDetails = errorDetails ?? {
                message: l10n.t(`Sorry, your request failed. Please try again. Request id: {0}`, requestId)
            };
            return { errorDetails, annotations, telemetry: outcomeCorrelationTelemetry };
        }
    }
    async sendModelResponseInternalAndEnhancedTelemetry(useGPT4oProxy, builtPrompt, result, outcomeTelemetry, mapper) {
        const payload = {
            headerRequestId: builtPrompt.requestId,
            baseModel: outcomeTelemetry.chatRequestModel,
            providerId: mapper,
            languageId: builtPrompt.languageId,
            messageText: useGPT4oProxy ? JSON.stringify(builtPrompt.messages) : builtPrompt.prompt,
            completionTextJson: result.allResponseText.join(''),
        };
        this.telemetryService.sendEnhancedGHTelemetryEvent('fastApply/successfulEdit', (0, telemetry_1.multiplexProperties)(payload));
        this.telemetryService.sendInternalMSFTTelemetryEvent('fastApply/successfulEdit', payload);
    }
    async fetchNativePredictedOutputs(request, builtPrompt, resultStream, outcomeTelemetry, token, applyEdits) {
        const { messages, speculation, requestId, endpoint } = builtPrompt;
        const startTime = Date.now();
        const fetchResult = await this.fetchAndContinueOnLengthError(endpoint, messages, speculation, request, resultStream, token, applyEdits);
        if (fetchResult.result.type !== commonTypes_1.ChatFetchResponseType.Success) {
            this.logError(request, builtPrompt, { startTime, firstTokenTime: fetchResult.firstTokenTime, requestId }, outcomeTelemetry, builtPrompt.endpoint.model, fetchResult.result.type);
            return {
                annotations: fetchResult.annotations,
                telemetry: outcomeTelemetry,
                errorDetails: { message: fetchResult.result.reason }
            };
        }
        const res = { allResponseText: fetchResult.allResponseText, firstTokenTime: fetchResult.firstTokenTime, startTime, finishReason: completionsAPI_1.Completion.FinishReason.Stop, annotations: fetchResult.annotations, requestId };
        this.sendModelResponseInternalAndEnhancedTelemetry(true, builtPrompt, res, outcomeTelemetry, builtPrompt.endpoint.model);
        return res;
    }
    async fetchAndContinueOnLengthError(endpoint, promptMessages, speculation, request, resultStream, token, applyEdits) {
        const allResponseText = [];
        let responseLength = 0;
        let firstTokenTime = -1;
        const existingDocument = request.existingDocument;
        const documentLength = existingDocument ? existingDocument.getText().length : 0;
        const uri = request.uri;
        const maxLength = documentLength + request.codeBlock.length + 1000; // add 1000 to be safe
        //const { codeBlock, uri, documentContext, markdownBeforeBlock } = codemapperRequestInput;
        const pushedLines = [];
        const fetchStreamSource = new chatMLFetcher_1.FetchStreamSource();
        const textStream = fetchStreamSource.stream.map((part) => part.delta.text);
        let processPromise;
        if (applyEdits) {
            processPromise = existingDocument instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot
                ? processFullRewriteNotebook(existingDocument.document, readLineByLine(textStream, token), resultStream, this.alternativeNotebookEditGenerator, { source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.codeMapperFastApply, model: endpoint.model, requestId: undefined }, token) // corrected parameter passing
                : processFullRewriteStream(uri, existingDocument, readLineByLine(textStream, token), resultStream, token, pushedLines);
        }
        else {
            processPromise = textStream.toPromise();
        }
        while (true) {
            const result = await endpoint.makeChatRequest('editingSession/speculate', promptMessages, async (text, _, delta) => {
                if (firstTokenTime === -1) {
                    firstTokenTime = Date.now();
                }
                fetchStreamSource.update(text, delta);
                allResponseText.push(delta.text);
                responseLength += delta.text.length;
                return undefined;
            }, token, commonTypes_1.ChatLocation.EditingSession, undefined, { stream: true, temperature: 0, prediction: { type: 'content', content: speculation } });
            if (result.type === commonTypes_1.ChatFetchResponseType.Length) {
                if (responseLength > maxLength) {
                    fetchStreamSource.resolve();
                    await processPromise; // Flush all received text as edits to the response stream
                    this.logCodemapperLoopTelemetry(request, result, uri, endpoint.model, documentLength, responseLength, true);
                    return {
                        result, firstTokenTime, allResponseText, annotations: [{
                                label: 'codemapper loop', message: `Code mapper might be in a loop: Rewritten length: ${responseLength}, Document length: ${documentLength}, Code block length ${request.codeBlock.length}`, severity: 'error'
                            }]
                    };
                }
                const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, codeMapperPrompt_1.CodeMapperFullRewritePrompt, { request, shouldTrimCodeBlocks: true, inProgressRewriteContent: result.truncatedValue });
                const response = await promptRenderer.render(undefined, token);
                promptMessages = response.messages;
            }
            else if (result.type === commonTypes_1.ChatFetchResponseType.Success) {
                fetchStreamSource.resolve();
                await processPromise; // Flush all received text as edits to the response stream
                if (applyEdits && (!existingDocument || existingDocument instanceof textDocumentSnapshot_1.TextDocumentSnapshot)) {
                    await handleTrailingLines(uri, existingDocument, resultStream, pushedLines, token);
                }
                this.logCodemapperLoopTelemetry(request, result, uri, endpoint.model, documentLength, responseLength, false);
                return { result, firstTokenTime, allResponseText, annotations: [] };
            }
            else {
                // error or cancelled
                fetchStreamSource.resolve();
                await processPromise; // Flush all received text as edits to the response stream
                return { result, firstTokenTime, allResponseText: [], annotations: [] };
            }
        }
    }
    logCodemapperLoopTelemetry(request, result, uri, model, documentLength, responseLength, hasLoop) {
        /* __GDPR__
            "speculation.response.loop" : {
                "owner": "joyceerhl",
                "comment": "Report when the model appears to have gone into a loop.",
                "hasLoop": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the model appears to have gone into a loop." },
                "speculationRequestId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Id of the current turn request" },
                "languageId": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "The language id of the document" },
                "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "The model used for this speculation request" },
                "documentLength": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Length of original file", "isMeasurement": true },
                "rewrittenLength": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Length of original file", "isMeasurement": true }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('speculation.response.loop', {
            speculationRequestId: result.requestId,
            languageId: isNewDocument(request) ? (0, languages_1.getLanguageForResource)(uri).languageId : request.existingDocument.languageId,
            model,
            hasLoop: String(hasLoop)
        }, {
            documentLength,
            rewrittenLength: responseLength
        });
    }
    ensureFinishReasonStopOrThrow(requestId, finishReason) {
        switch (finishReason) {
            case undefined:
                break;
            case completionsAPI_1.Completion.FinishReason.ContentFilter:
                throw new completionsFetchService_1.CompletionsFetchError('stop_content_filter', requestId, 'Content filter');
            case completionsAPI_1.Completion.FinishReason.Length:
                throw new completionsFetchService_1.CompletionsFetchError('stop_length', requestId, 'Length limit');
            case completionsAPI_1.Completion.FinishReason.Stop:
                break; // No error for 'Stop' finish reason
            default:
                (0, assert_1.assertNever)(finishReason);
        }
    }
};
exports.CodeMapper = CodeMapper;
exports.CodeMapper = CodeMapper = CodeMapper_1 = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, tokenizer_1.ITokenizerProvider),
    __param(3, logService_1.ILogService),
    __param(4, telemetry_1.ITelemetryService),
    __param(5, editLogService_1.IEditLogService),
    __param(6, nullExperimentationService_1.IExperimentationService),
    __param(7, diffService_1.IDiffService),
    __param(8, multiFileEditQualityTelemetry_1.IMultiFileEditInternalTelemetryService),
    __param(9, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator),
    __param(10, authentication_1.IAuthenticationService),
    __param(11, notebookService_1.INotebookService),
    __param(12, configurationService_1.IConfigurationService)
], CodeMapper);
function readLineByLine(source, token) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        const reader = new streamingEdits_1.PartialAsyncTextReader(source[Symbol.asyncIterator]());
        let previousLineWasEmpty = false; // avoid emitting a trailing empty line all the time
        while (!reader.endOfStream) {
            // Skip everything until we hit a fence
            if (token.isCancellationRequested) {
                break;
            }
            const line = (await reader.readLine()).replace(/\r$/g, '');
            if (previousLineWasEmpty) {
                // Emit the previous held back empty line
                emitter.emitOne(new streamingEdits_1.LineOfText(''));
            }
            if (line === '') {
                // Hold back empty lines and emit them with the next iteration
                previousLineWasEmpty = true;
            }
            else {
                previousLineWasEmpty = false;
                emitter.emitOne(new streamingEdits_1.LineOfText(line));
            }
        }
    });
}
function isCodeMapperOutcome(thing) {
    return typeof thing === 'object' && !!thing && 'annotations' in thing && 'telemetry' in thing;
}
class CodeMapperRefusal {
}
function getTrailingDocumentEmptyLineCount(document) {
    let trailingEmptyLines = 0;
    for (let i = document.lineCount - 1; i >= 0; i--) {
        const line = document.lineAt(i);
        if (line.text.trim() === '') {
            trailingEmptyLines++;
        }
        else {
            break;
        }
    }
    return trailingEmptyLines;
}
function getTrailingArrayEmptyLineCount(lines) {
    let trailingEmptyLines = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim() === '') {
            trailingEmptyLines++;
        }
        else {
            break;
        }
    }
    return trailingEmptyLines;
}
async function computeAdditionsAndDeletions(diffService, original, modified) {
    const diffResult = await diffService.computeDiff(original, modified, {
        ignoreTrimWhitespace: true,
        maxComputationTimeMs: 10000,
        computeMoves: false
    });
    let addedLines = 0;
    let removedLines = 0;
    for (const change of diffResult.changes) {
        removedLines += change.original.endLineNumberExclusive - change.original.startLineNumber;
        addedLines += change.modified.endLineNumberExclusive - change.modified.startLineNumber;
    }
    return { addedLines, removedLines };
}
//# sourceMappingURL=codeMapper.js.map