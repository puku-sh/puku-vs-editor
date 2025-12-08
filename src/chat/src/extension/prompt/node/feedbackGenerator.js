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
exports.FeedbackGenerator = void 0;
exports.parseReviewComments = parseReviewComments;
exports.parseFeedbackResponse = parseFeedbackResponse;
exports.sendReviewActionTelemetry = sendReviewActionTelemetry;
const l10n = __importStar(require("@vscode/l10n"));
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const editSurvivalReporter_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalReporter");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uuid_1 = require("../../../util/vs/base/common/uuid");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const provideFeedback_1 = require("../../prompts/node/feedback/provideFeedback");
const telemetry_2 = require("./telemetry");
let FeedbackGenerator = class FeedbackGenerator {
    constructor(telemetryService, endpointProvider, logService, instantiationService, ignoreService) {
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.logService = logService;
        this.instantiationService = instantiationService;
        this.ignoreService = ignoreService;
    }
    async generateComments(input, token, progress) {
        const startTime = Date.now();
        const ignoreService = this.ignoreService;
        const ignored = await Promise.all(input.map(i => ignoreService.isCopilotIgnored(i.document.uri)));
        const filteredInput = input.filter((_, i) => !ignored[i]);
        if (filteredInput.length === 0) {
            this.logService.info('All input documents are ignored. Skipping feedback generation.');
            return {
                type: 'error',
                severity: 'info',
                reason: l10n.t('All input documents are ignored by configuration. Check your .copilotignore file.')
            };
        }
        const endpoint = await this.endpointProvider.getChatEndpoint('gpt-4.1');
        const prompts = [];
        const batches = [filteredInput];
        while (batches.length) {
            const batch = batches.shift();
            try {
                const promptRenderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, provideFeedback_1.ProvideFeedbackPrompt, {
                    input: batch,
                    logService: this.logService,
                });
                const prompt = await promptRenderer.render();
                this.logService.debug(`[FeedbackGenerator] Rendered batch of ${batch.length} inputs.`);
                prompts.push(prompt);
            }
            catch (err) {
                if (err.code === 'split_input') {
                    const i = Math.floor(batch.length / 2);
                    batches.unshift(batch.slice(0, i), batch.slice(i));
                    this.logService.debug(`[FeedbackGenerator] Splitting in batches of ${batches[0].length} and ${batches[1].length} inputs due to token limit.`);
                }
                else {
                    throw err;
                }
            }
        }
        if (token.isCancellationRequested) {
            return { type: 'cancelled' };
        }
        const inputType = filteredInput[0]?.selection ? 'selection' : 'change';
        const maxPrompts = 10;
        if (prompts.length > maxPrompts) {
            return {
                type: 'error',
                reason: inputType === 'selection' ? l10n.t('There is too much text to review, try reviewing a smaller selection.') : l10n.t('There are too many changes to review, try reviewing a smaller set of changes.'),
            };
        }
        const request = {
            source: 'vscodeCopilotChat',
            promptCount: prompts.length,
            messageId: (0, uuid_1.generateUuid)(),
            inputType,
            inputRanges: filteredInput.map(input => ({
                uri: input.document.uri,
                ranges: input.selection ? [input.selection] : input.change?.hunks.map(hunk => hunk.range) || [],
            })),
        };
        const requestStartTime = Date.now();
        const results = await Promise.all(prompts.map(async (prompt) => {
            let receivedComments = [];
            const finishedCb = progress ? async (text) => {
                const comments = parseReviewComments(request, filteredInput, text, true);
                if (comments.length > receivedComments.length) {
                    progress.report(comments.slice(receivedComments.length));
                    receivedComments = comments;
                }
                return undefined;
            } : undefined;
            const fetchResult = await endpoint
                .makeChatRequest('feedbackGenerator', prompt.messages, finishedCb, token, commonTypes_1.ChatLocation.Other, undefined, undefined, false, {
                messageId: request.messageId,
            });
            const comments = fetchResult.type === 'success' ? parseReviewComments(request, filteredInput, fetchResult.value, false) : [];
            if (progress && comments && comments.length > receivedComments.length) {
                progress.report(comments.slice(receivedComments.length));
                receivedComments = comments;
            }
            return {
                fetchResult,
                comments,
            };
        }));
        const fetchResult = results.find(r => r.fetchResult.type !== 'success')?.fetchResult || results[0].fetchResult;
        const comments = results.map(r => r.comments).flat();
        /* __GDPR__
            "feedback.generateDiagnostics" : {
                "owner": "chrmarti",
                "comment": "Metadata about the code feedback generation",
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which backend generated the comment." },
                "messageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result type of the response." },
                "documentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of document (e.g., text or notebook)." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                "inputType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What type of input (e.g., selection or change)." },
                "commentTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of comment (e.g., correctness or performance)." },
                "promptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of prompts run." },
                "numberOfDiagnostics": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of diagnostics." },
                "inputDocumentCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many documents were part of the input." },
                "inputLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many (selected or changed) lines were part of the input." },
                "timeToRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to start the request." },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to complete the request." }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('feedback.generateDiagnostics', {
            model: endpoint.model,
            requestId: fetchResult.requestId,
            responseType: fetchResult.type,
            source: request.source,
            messageId: request.messageId,
            documentType: filteredInput[0] && (0, notebooks_1.isNotebookCellOrNotebookChatInput)(filteredInput[0]?.document.uri) ? 'notebook' : 'text',
            languageId: filteredInput[0]?.document.languageId,
            inputType: request.inputType,
            commentTypes: [...new Set(comments?.map(c => knownKinds.has(c.kind) ? c.kind : 'unknown')).values()
            ].sort().join(',') || undefined,
        }, {
            promptCount: prompts.length,
            numberOfDiagnostics: comments?.length ?? -1,
            inputDocumentCount: request.inputRanges.length,
            inputLineCount: request.inputRanges
                .reduce((acc, r) => acc + r.ranges
                .reduce((acc, r) => acc + (r.end.line - r.start.line), 0), 0),
            timeToRequest: requestStartTime - startTime,
            timeToComplete: Date.now() - startTime
        });
        return token.isCancellationRequested
            ? { type: 'cancelled' }
            : fetchResult.type === 'success'
                ? { type: 'success', comments: comments || [] }
                : { type: 'error', reason: fetchResult.reason };
    }
};
exports.FeedbackGenerator = FeedbackGenerator;
exports.FeedbackGenerator = FeedbackGenerator = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, logService_1.ILogService),
    __param(3, instantiation_1.IInstantiationService),
    __param(4, ignoreService_1.IIgnoreService)
], FeedbackGenerator);
const knownKinds = new Set(['bug', 'performance', 'consistency', 'documentation', 'naming', 'readability', 'style', 'other']);
function parseReviewComments(request, input, message, dropPartial = false) {
    const comments = [];
    // Extract the messages from the comment
    for (const match of parseFeedbackResponse(message, dropPartial)) {
        const { relativeDocumentPath, from, to, kind, severity, content } = match;
        if (!knownKinds.has(kind)) {
            continue;
        }
        const i = relativeDocumentPath && input.find(i => i.relativeDocumentPath === relativeDocumentPath);
        if (!i) {
            continue;
        }
        const document = i.document;
        const filterRanges = i.selection ? [i.selection] : i.change?.hunks.map(hunk => hunk.range);
        const fromLine = document.lineAt(from >= 0 ? from : 0);
        const toLine = document.lineAt((to <= document.lineCount ? to : document.lineCount) - 1);
        const lastNonWhitespaceCharacterIndex = toLine.text.trimEnd().length;
        // Create a Diagnostic object for each message
        const range = new vscodeTypes_1.Range(fromLine.lineNumber, fromLine.firstNonWhitespaceCharacterIndex, toLine.lineNumber, lastNonWhitespaceCharacterIndex);
        if (filterRanges && !filterRanges.some(r => r.intersection(range))) {
            continue;
        }
        const comment = {
            request,
            document,
            uri: document.uri,
            languageId: document.languageId,
            range,
            body: new vscodeTypes_1.MarkdownString(content),
            kind,
            severity,
            originalIndex: comments.length,
            actionCount: 0,
        };
        comments.push(comment);
    }
    return comments;
}
function parseFeedbackResponse(response, dropPartial = false) {
    const regex = /(?<num>\d+)\. Line (?<from>\d+)(-(?<to>\d+))?([^:]*)( in `?(?<relativeDocumentPath>[^,:`]+))`?(, (?<kind>\w+))?(, (?<severity>\w+) severity)?: (?<content>.+?)((?=\n\d+\.|\n\n)|(?<earlyEnd>$))/gs;
    return (0, arrays_1.coalesce)(Array.from(response.matchAll(regex), match => {
        const groups = match.groups;
        if (dropPartial && typeof groups.earlyEnd === 'string') {
            return undefined;
        }
        const from = parseInt(groups.from) - 1;
        const to = groups.to ? parseInt(groups.to) : from + 1;
        const relativeDocumentPath = groups.relativeDocumentPath?.replaceAll(path.sep === '/' ? '\\' : '/', path.sep);
        const kind = groups.kind || 'other';
        const severity = groups.severity || 'unknown';
        let content = groups.content.trim();
        // Remove trailing code block (which sometimes suggests a fix) because that interfers with the suggestion rendering later.
        if (content.endsWith('```')) {
            const i = content.lastIndexOf('```', content.length - 4);
            if (i !== -1) {
                content = content.substring(0, i)
                    .trim();
            }
        }
        // Remove broken block.
        const blockBorders = [...content.matchAll(/```/g)];
        if (blockBorders.length % 2) {
            const odd = blockBorders[blockBorders.length - 1];
            content = content.substring(0, odd.index)
                .trim();
        }
        return {
            relativeDocumentPath,
            from,
            to,
            linkOffset: match.index + groups.num.length + 2,
            linkLength: 5 + groups.from.length + (groups.to ? groups.to.length + 1 : 0),
            kind,
            severity,
            content
        };
    }));
}
function sendReviewActionTelemetry(reviewCommentOrComments, totalComments, userAction, logService, telemetryService, instantiationService) {
    logService.debug('[FeedbackGenerator] user feedback received');
    const reviewComments = Array.isArray(reviewCommentOrComments) ? reviewCommentOrComments : [reviewCommentOrComments];
    const reviewComment = reviewComments[0];
    if (!reviewComment) {
        logService.warn('[FeedbackGenerator] No review comment found for user feedback');
        return;
    }
    const userActionProperties = {
        source: reviewComment.request.source,
        messageId: reviewComment.request.messageId,
        userAction,
    };
    const commentType = knownKinds.has(reviewComment.kind) ? reviewComment.kind : 'unknown';
    const sharedProps = {
        source: reviewComment.request.source,
        requestId: reviewComment.request.messageId,
        documentType: (0, notebooks_1.isNotebookCellOrNotebookChatInput)(reviewComment.uri) ? 'notebook' : 'text',
        languageId: reviewComment.languageId,
        inputType: reviewComment.request.inputType,
        commentType,
        userAction,
    };
    const sharedMeasures = {
        commentIndex: reviewComment.originalIndex,
        actionCount: reviewComment.actionCount,
        inputDocumentCount: reviewComment.request.inputRanges.length,
        inputLineCount: reviewComment.request.inputRanges
            .reduce((acc, r) => acc + r.ranges
            .reduce((acc, r) => acc + (r.end.line - r.start.line), 0), 0),
        promptCount: reviewComment.request.promptCount,
        totalComments,
        comments: reviewComments.length,
        commentLength: reviewComments.reduce((acc, c) => acc + (typeof c.body === 'string' ? c.body.length : c.body.value.length), 0),
    };
    if (userAction === 'helpful' || userAction === 'unhelpful') {
        /* __GDPR__
            "review.comment.vote" : {
                "owner": "chrmarti",
                "comment": "Metadata about votes on review comments",
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which backend generated the comment." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "documentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of document (e.g., text or notebook)." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                "inputType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What type of input (e.g., selection or change)." },
                "commentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of comment (e.g., correctness or performance)." },
                "userAction": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What action the user triggered (e.g., helpful, unhelpful, apply or discard)." },
                "commentIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Original index of the comment in the generated comments." },
                "actionCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of previously logged actions on the comment." },
                "inputDocumentCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many documents were part of the input." },
                "inputLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many (selected or changed) lines were part of the input." },
                "promptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of prompts run." },
                "totalComments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of comments." },
                "comments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many comments are affected by the action." },
                "commentLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters long the review comment is." }
            }
        */
        telemetryService.sendMSFTTelemetryEvent('review.comment.vote', sharedProps, sharedMeasures);
        telemetryService.sendInternalMSFTTelemetryEvent('review.comment.vote', sharedProps);
        (0, telemetry_2.sendUserActionTelemetry)(telemetryService, undefined, userActionProperties, {}, 'review.comment.vote');
    }
    else {
        reviewComment.actionCount++;
        /* __GDPR__
            "review.comment.action" : {
                "owner": "chrmarti",
                "comment": "Metadata about actions on review comments",
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which backend generated the comment." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "documentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of document (e.g., text or notebook)." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                "inputType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What type of input (e.g., selection or change)." },
                "commentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of comment (e.g., correctness or performance)." },
                "userAction": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What action the user triggered (e.g., helpful, unhelpful, apply or discard)." },
                "commentIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Original index of the comment in the generated comments." },
                "actionCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of previously logged actions on the comment." },
                "inputDocumentCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many documents were part of the input." },
                "inputLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many (selected or changed) lines were part of the input." },
                "promptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of prompts run." },
                "totalComments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of comments." },
                "comments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many comments are affected by the action." },
                "commentLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters long the review comment is." }
            }
        */
        telemetryService.sendMSFTTelemetryEvent('review.comment.action', sharedProps, sharedMeasures);
        telemetryService.sendInternalMSFTTelemetryEvent('review.comment.action', sharedProps);
        (0, telemetry_2.sendUserActionTelemetry)(telemetryService, undefined, userActionProperties, {}, 'review.comment.action');
    }
    if (userAction === 'discardComment') {
        const { document, range } = reviewComment;
        const from = document.offsetAt(range.start);
        const to = document.offsetAt(range.end);
        const text = document.getText(range);
        instantiationService.createInstance(editSurvivalReporter_1.EditSurvivalReporter, document.document, document.getText(), stringEdit_1.StringEdit.replace(offsetRange_1.OffsetRange.ofStartAndLength(from, to - from), text), stringEdit_1.StringEdit.empty, {}, discardCommentSurvivalEvent(sharedProps, sharedMeasures));
    }
}
function discardCommentSurvivalEvent(sharedProps, sharedMeasures) {
    return (res) => {
        /* __GDPR__
            "review.discardCommentRangeSurvival" : {
                "owner": "chrmarti",
                "comment": "Tracks how much percent of the commented range surived after 5 minutes of discarding",
                "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
                "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
                "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
                "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." },
                "source": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Which backend generated the comment." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "documentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of document (e.g., text or notebook)." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                "inputType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What type of input (e.g., selection or change)." },
                "commentType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What kind of comment (e.g., correctness or performance)." },
                "userAction": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "What action the user triggered (e.g., helpful, unhelpful, apply or discard)." },
                "commentIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Original index of the comment in the generated comments." },
                "actionCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of previously logged actions on the comment." },
                "inputDocumentCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many documents were part of the input." },
                "inputLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many (selected or changed) lines were part of the input." },
                "promptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of prompts run." },
                "totalComments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Total number of comments." },
                "comments": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many comments are affected by the action." },
                "commentLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters long the review comment is." }
            }
        */
        res.telemetryService.sendMSFTTelemetryEvent('review.discardCommentRangeSurvival', sharedProps, {
            ...sharedMeasures,
            survivalRateFourGram: res.fourGram,
            survivalRateNoRevert: res.noRevert,
            timeDelayMs: res.timeDelayMs,
            didBranchChange: res.didBranchChange ? 1 : 0,
        });
    };
}
//# sourceMappingURL=feedbackGenerator.js.map