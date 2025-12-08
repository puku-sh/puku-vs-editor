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
exports.DefaultIntentRequestHandler = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const copilotTokenStore_1 = require("../../../platform/authentication/common/copilotTokenStore");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const editSurvivalTrackerService_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const openai_1 = require("../../../platform/networking/common/openai");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const surveyService_1 = require("../../../platform/survey/common/surveyService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const objects_1 = require("../../../util/vs/base/common/objects");
const types_1 = require("../../../util/vs/base/common/types");
const nls_1 = require("../../../util/vs/nls");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const codeBlockProcessor_1 = require("../../codeBlocks/node/codeBlockProcessor");
const promptCraftingTypes_1 = require("../../inlineChat/node/promptCraftingTypes");
const pauseController_1 = require("../../intents/node/pauseController");
const toolCallingLoop_1 = require("../../intents/node/toolCallingLoop");
const unknownIntent_1 = require("../../intents/node/unknownIntent");
const responseStreamWithLinkification_1 = require("../../linkify/common/responseStreamWithLinkification");
const summarizedConversationHistory_1 = require("../../prompts/node/agent/summarizedConversationHistory");
const toolSchemaNormalizer_1 = require("../../tools/common/toolSchemaNormalizer");
const toolsService_1 = require("../../tools/common/toolsService");
const virtualToolTypes_1 = require("../../tools/common/virtualTools/virtualToolTypes");
const chatVariablesCollection_1 = require("../common/chatVariablesCollection");
const conversation_1 = require("../common/conversation");
const conversation_2 = require("./conversation");
const telemetry_2 = require("./telemetry");
const specialRequestTypes_1 = require("../common/specialRequestTypes");
/*
* Handles a single chat-request via an intent-invocation.
*/
let DefaultIntentRequestHandler = class DefaultIntentRequestHandler {
    constructor(intent, conversation, request, stream, token, documentContext, location, chatTelemetryBuilder, handlerOptions = { maxToolCallIterations: 15 }, onPaused, _instantiationService, options, _telemetryService, _logService, _surveyService, _requestLogger, _editSurvivalTrackerService, _authenticationService) {
        this.intent = intent;
        this.conversation = conversation;
        this.request = request;
        this.stream = stream;
        this.token = token;
        this.documentContext = documentContext;
        this.location = location;
        this.chatTelemetryBuilder = chatTelemetryBuilder;
        this.handlerOptions = handlerOptions;
        this.onPaused = onPaused;
        this._instantiationService = _instantiationService;
        this.options = options;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._surveyService = _surveyService;
        this._requestLogger = _requestLogger;
        this._editSurvivalTrackerService = _editSurvivalTrackerService;
        this._authenticationService = _authenticationService;
        this._editSurvivalTracker = new editSurvivalTrackerService_1.NullEditSurvivalTrackingSession();
        // Initialize properties
        this.turn = conversation.getLatestTurn();
    }
    async getResult() {
        if ((0, specialRequestTypes_1.isToolCallLimitCancellation)(this.request)) {
            // Just some friendly text instead of an empty message on cancellation:
            this.stream.markdown(l10n.t("Let me know if there's anything else I can help with!"));
            return {};
        }
        try {
            if (this.token.isCancellationRequested) {
                return commonTypes_1.CanceledResult;
            }
            this._logService.trace('Processing intent');
            const intentInvocation = await this.intent.invoke({ location: this.location, documentContext: this.documentContext, request: this.request });
            if (this.token.isCancellationRequested) {
                return commonTypes_1.CanceledResult;
            }
            this._logService.trace('Processed intent');
            this.turn.setMetadata(new conversation_2.IntentInvocationMetadata(intentInvocation));
            const confirmationResult = await this.handleConfirmationsIfNeeded();
            if (confirmationResult) {
                return confirmationResult;
            }
            const resultDetails = await this._requestLogger.captureInvocation(this.request, () => this.runWithToolCalling(intentInvocation));
            let chatResult = resultDetails.chatResult || {};
            this._surveyService.signalUsage(`${this.location === commonTypes_1.ChatLocation.Editor ? 'inline' : 'panel'}.${this.intent.id}`, this.documentContext?.document.languageId);
            const responseMessage = resultDetails.toolCallRounds.at(-1)?.response ?? '';
            const metadataFragment = {
                toolCallRounds: resultDetails.toolCallRounds,
                toolCallResults: this._collectRelevantToolCallResults(resultDetails.toolCallRounds, resultDetails.toolCallResults),
            };
            (0, objects_1.mixin)(chatResult, { metadata: metadataFragment }, true);
            const baseModelTelemetry = (0, telemetry_2.createTelemetryWithId)();
            chatResult = await this.processResult(resultDetails.response, responseMessage, chatResult, metadataFragment, baseModelTelemetry, resultDetails.toolCallRounds);
            if (chatResult.errorDetails && intentInvocation.modifyErrorDetails) {
                chatResult.errorDetails = intentInvocation.modifyErrorDetails(chatResult.errorDetails, resultDetails.response);
            }
            if (resultDetails.hadIgnoredFiles) {
                this.stream.markdown(ignoreService_1.HAS_IGNORED_FILES_MESSAGE);
            }
            return chatResult;
        }
        catch (err) {
            if (err instanceof toolsService_1.ToolCallCancelledError) {
                this.turn.setResponse(conversation_1.TurnStatus.Cancelled, { message: err.message, type: 'meta' }, undefined, {});
                return {};
            }
            else if ((0, errors_1.isCancellationError)(err)) {
                return commonTypes_1.CanceledResult;
            }
            else if (err instanceof toolCallingLoop_1.EmptyPromptError) {
                return {};
            }
            this._logService.error(err);
            this._telemetryService.sendGHTelemetryException(err, 'Error');
            const errorMessage = err.message;
            const chatResult = { errorDetails: { message: errorMessage } };
            this.turn.setResponse(conversation_1.TurnStatus.Error, { message: errorMessage, type: 'meta' }, undefined, chatResult);
            return chatResult;
        }
    }
    _collectRelevantToolCallResults(toolCallRounds, toolCallResults) {
        const resultsUsedInThisTurn = {};
        for (const round of toolCallRounds) {
            for (const toolCall of round.toolCalls) {
                resultsUsedInThisTurn[toolCall.id] = toolCallResults[toolCall.id];
            }
        }
        return Object.keys(resultsUsedInThisTurn).length ? resultsUsedInThisTurn : undefined;
    }
    _sendInitialChatReferences({ result: buildPromptResult }) {
        const [includedVariableReferences, ignoredVariableReferences] = [(0, conversation_1.getUniqueReferences)(buildPromptResult.references), (0, conversation_1.getUniqueReferences)(buildPromptResult.omittedReferences)].map((refs) => refs.reduce((acc, ref) => {
            if ('variableName' in ref.anchor) {
                acc.add(ref.anchor.variableName);
            }
            return acc;
        }, new Set()));
        for (const reference of buildPromptResult.references) {
            // Report variables which were partially sent to the model
            const options = reference.options ?? ('variableName' in reference.anchor && ignoredVariableReferences.has(reference.anchor.variableName)
                ? { status: { kind: 2, description: l10n.t('Part of this attachment was not sent to the model due to context window limitations.') } }
                : undefined);
            if (!reference.options?.isFromTool) {
                // References reported by a tool result will be shown in a separate list, don't need to be reported as references
                this.stream.reference2(reference.anchor, undefined, options);
            }
        }
        for (const omittedReference of buildPromptResult.omittedReferences) {
            if ('variableName' in omittedReference.anchor && !includedVariableReferences.has(omittedReference.anchor.variableName)) {
                this.stream.reference2(omittedReference.anchor, undefined, { status: { kind: 3, description: l10n.t('This attachment was not sent to the model due to context window limitations.') } });
            }
        }
    }
    makeResponseStreamParticipants(intentInvocation) {
        const participants = [];
        // 1. Tracking of code blocks. Currently used in stests. todo@connor4312:
        // can we simplify this so it's not used otherwise?
        participants.push(stream => {
            const codeBlockTrackingResponseStream = this._instantiationService.createInstance(codeBlockProcessor_1.CodeBlockTrackingChatResponseStream, stream, intentInvocation.codeblocksRepresentEdits);
            return chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(codeBlockTrackingResponseStream, v => v, () => {
                const codeBlocksMetaData = codeBlockTrackingResponseStream.finish();
                this.turn.setMetadata(codeBlocksMetaData);
            });
        });
        // 2. Track the survival of edits made in the editor
        if (this.documentContext && this.location === commonTypes_1.ChatLocation.Editor) {
            participants.push(stream => {
                const firstTurnWithAIEditCollector = this.conversation.turns.find(turn => turn.getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse)?.editSurvivalTracker);
                this._editSurvivalTracker = firstTurnWithAIEditCollector?.getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse)?.editSurvivalTracker ?? this._editSurvivalTrackerService.initialize(this.documentContext.document.document);
                return chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(stream, value => {
                    if (value instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                        this._editSurvivalTracker.collectAIEdits(value.edits);
                    }
                });
            });
        }
        // 3. Track the survival of other(?) interactions
        // todo@connor4312: can these two streams be combined?
        const interactionOutcomeComputer = new promptCraftingTypes_1.InteractionOutcomeComputer(this.documentContext?.document.uri);
        participants.push(stream => interactionOutcomeComputer.spyOnStream(stream));
        // 4. Linkify the stream unless told otherwise
        if (!intentInvocation.linkification?.disable) {
            participants.push(stream => {
                const linkStream = this._instantiationService.createInstance(responseStreamWithLinkification_1.ResponseStreamWithLinkification, { requestId: this.turn.id, references: this.turn.references }, stream, intentInvocation.linkification?.additionaLinkifiers ?? [], this.token);
                return chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(linkStream, p => p, () => {
                    this._loop.telemetry.markAddedLinks(linkStream.totalAddedLinkCount);
                });
            });
        }
        // 5. General telemetry on emitted components
        participants.push(stream => chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(stream, (part) => {
            if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
                this._loop.telemetry.markEmittedMarkdown(part.value);
            }
            if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                this._loop.telemetry.markEmittedEdits(part.uri, part.edits);
            }
        }));
        return participants;
    }
    async _onDidReceiveResponse({ response, toolCalls, interactionOutcome }) {
        const responseMessage = (response.type === commonTypes_1.ChatFetchResponseType.Success ? response.value : '');
        await this._loop.telemetry.sendTelemetry(response.requestId, response.type, responseMessage, interactionOutcome.interactionOutcome, toolCalls);
        if (this.documentContext) {
            this.turn.setMetadata(new promptCraftingTypes_1.CopilotInteractiveEditorResponse('ok', interactionOutcome.store, { ...this.documentContext, intent: this.intent, query: this.request.prompt }, this.chatTelemetryBuilder.telemetryMessageId, this._loop.telemetry, this._editSurvivalTracker));
            const documentText = this.documentContext?.document.getText();
            this.turn.setMetadata(new conversation_1.RequestDebugInformation(this.documentContext.document.uri, this.intent.id, this.documentContext.document.languageId, documentText, this.request.prompt, this.documentContext.selection));
        }
    }
    async runWithToolCalling(intentInvocation) {
        const store = new lifecycle_1.DisposableStore();
        const loop = this._loop = store.add(this._instantiationService.createInstance(DefaultToolCallingLoop, {
            conversation: this.conversation,
            intent: this.intent,
            invocation: intentInvocation,
            toolCallLimit: this.handlerOptions.maxToolCallIterations,
            onHitToolCallLimit: this.handlerOptions.confirmOnMaxToolIterations !== false
                ? 0 /* ToolCallLimitBehavior.Confirm */ : 1 /* ToolCallLimitBehavior.Stop */,
            request: this.request,
            documentContext: this.documentContext,
            streamParticipants: this.makeResponseStreamParticipants(intentInvocation),
            temperature: this.handlerOptions.temperature ?? this.options.temperature,
            location: this.location,
            overrideRequestLocation: this.handlerOptions.overrideRequestLocation,
            interactionContext: this.documentContext?.document.uri,
            responseProcessor: typeof intentInvocation.processResponse === 'function' ? intentInvocation : undefined,
        }, this.chatTelemetryBuilder));
        store.add(event_1.Event.once(loop.onDidBuildPrompt)(this._sendInitialChatReferences, this));
        // We need to wait for all response handlers to finish before
        // we can dispose the store. This is because the telemetry machine
        // still needs the tokenizers to count tokens. There was a case in vitests
        // in which the store, and the tokenizers, were disposed before the telemetry
        // machine could count the tokens, which resulted in an error.
        // src/extension/prompt/node/chatParticipantTelemetry.ts#L521-L522
        //
        // cc @lramos15
        const responseHandlers = [];
        store.add(loop.onDidReceiveResponse(res => {
            const promise = this._onDidReceiveResponse(res);
            responseHandlers.push(promise);
            return promise;
        }, this));
        const pauseCtrl = store.add(new pauseController_1.PauseController(this.onPaused, this.token));
        try {
            const result = await loop.run(this.stream, pauseCtrl);
            if (!result.round.toolCalls.length || result.response.type !== commonTypes_1.ChatFetchResponseType.Success) {
                loop.telemetry.sendToolCallingTelemetry(result.toolCallRounds, result.availableTools, this.token.isCancellationRequested ? 'cancelled' : result.response.type);
            }
            result.chatResult ??= {};
            if (result.chatResult.metadata?.maxToolCallsExceeded) {
                loop.telemetry.sendToolCallingTelemetry(result.toolCallRounds, result.availableTools, 'maxToolCalls');
            }
            // TODO need proper typing for all chat metadata and a better pattern to build it up from random places
            result.chatResult = this.resultWithMetadatas(result.chatResult);
            return { ...result, lastRequestTelemetry: loop.telemetry };
        }
        finally {
            await Promise.allSettled(responseHandlers);
            store.dispose();
        }
    }
    resultWithMetadatas(chatResult) {
        const codeBlocks = this.turn.getMetadata(codeBlockProcessor_1.CodeBlocksMetadata);
        const summarizedConversationHistory = this.turn.getMetadata(summarizedConversationHistory_1.SummarizedConversationHistoryMetadata);
        const renderedUserMessageMetadata = this.turn.getMetadata(conversation_1.RenderedUserMessageMetadata);
        const globalContextMetadata = this.turn.getMetadata(conversation_1.GlobalContextMessageMetadata);
        return codeBlocks || summarizedConversationHistory || renderedUserMessageMetadata || globalContextMetadata ?
            {
                ...chatResult,
                metadata: {
                    ...chatResult?.metadata,
                    ...codeBlocks,
                    ...summarizedConversationHistory && { summary: summarizedConversationHistory },
                    ...renderedUserMessageMetadata,
                    ...globalContextMetadata,
                },
            } : chatResult;
    }
    async handleConfirmationsIfNeeded() {
        const intentInvocation = this.turn.getMetadata(conversation_2.IntentInvocationMetadata)?.value;
        (0, types_1.assertType)(intentInvocation);
        if ((this.request.acceptedConfirmationData?.length || this.request.rejectedConfirmationData?.length) && intentInvocation.confirmationHandler) {
            await intentInvocation.confirmationHandler(this.request.acceptedConfirmationData, this.request.rejectedConfirmationData, this.stream);
            return {};
        }
    }
    async processSuccessfulFetchResult(appliedText, requestId, chatResult, baseModelTelemetry, rounds) {
        if (appliedText.length === 0 && !rounds.some(r => r.toolCalls.length)) {
            const message = l10n.t('The model unexpectedly did not return a response. Request ID: {0}', requestId);
            this.turn.setResponse(conversation_1.TurnStatus.Error, { type: 'meta', message }, baseModelTelemetry.properties.messageId, chatResult);
            return {
                errorDetails: {
                    message
                },
            };
        }
        this.turn.setResponse(conversation_1.TurnStatus.Success, { type: 'model', message: appliedText }, baseModelTelemetry.properties.messageId, chatResult);
        baseModelTelemetry.markAsDisplayed();
        (0, telemetry_2.sendModelMessageTelemetry)(this._telemetryService, this.conversation, this.location, appliedText, requestId, this.documentContext?.document, baseModelTelemetry, this.getModeName());
        return chatResult;
    }
    getModeName() {
        return this.request.modeInstructions2 ? 'custom' :
            this.intent.id === 'editAgent' ? 'agent' :
                (this.intent.id === 'edit' || this.intent.id === 'edit2') ? 'edit' :
                    'ask';
    }
    processOffTopicFetchResult(baseModelTelemetry) {
        // Create starting off topic telemetry and mark event as issued and displayed
        this.stream.markdown(this.options.rejectionMessage);
        this.turn.setResponse(conversation_1.TurnStatus.OffTopic, { message: this.options.rejectionMessage, type: 'offtopic-detection' }, baseModelTelemetry.properties.messageId, {});
        return {};
    }
    async processResult(fetchResult, responseMessage, chatResult, metadataFragment, baseModelTelemetry, rounds) {
        switch (fetchResult.type) {
            case commonTypes_1.ChatFetchResponseType.Success:
                return await this.processSuccessfulFetchResult(responseMessage, fetchResult.requestId, chatResult ?? {}, baseModelTelemetry, rounds);
            case commonTypes_1.ChatFetchResponseType.OffTopic:
                return this.processOffTopicFetchResult(baseModelTelemetry);
            case commonTypes_1.ChatFetchResponseType.Canceled: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Cancelled, { message: errorDetails.message, type: 'user' }, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.QuotaExceeded:
            case commonTypes_1.ChatFetchResponseType.RateLimited: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan, this.handlerOptions.hideRateLimitTimeEstimate);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.BadRequest:
            case commonTypes_1.ChatFetchResponseType.NetworkError:
            case commonTypes_1.ChatFetchResponseType.Failed: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Error, { message: errorDetails.message, type: 'server' }, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.Filtered: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: { ...metadataFragment, filterReason: fetchResult.category } };
                this.turn.setResponse(conversation_1.TurnStatus.Filtered, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.PromptFiltered: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: { ...metadataFragment, filterReason: openai_1.FilterReason.Prompt } };
                this.turn.setResponse(conversation_1.TurnStatus.PromptFiltered, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.AgentUnauthorized: {
                const chatResult = {};
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.AgentFailedDependency: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.Length: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.NotFound: // before we had `NotFound`, it would fall into Unknown, so behavior should be consistent
            case commonTypes_1.ChatFetchResponseType.Unknown: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.ExtensionBlocked: {
                const errorDetails = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
                const chatResult = { errorDetails, metadata: metadataFragment };
                // This shouldn't happen, only 3rd party extensions should be blocked
                this.turn.setResponse(conversation_1.TurnStatus.Error, undefined, baseModelTelemetry.properties.messageId, chatResult);
                return chatResult;
            }
            case commonTypes_1.ChatFetchResponseType.InvalidStatefulMarker:
                throw new Error('unreachable'); // retried within the endpoint
        }
    }
};
exports.DefaultIntentRequestHandler = DefaultIntentRequestHandler;
exports.DefaultIntentRequestHandler = DefaultIntentRequestHandler = __decorate([
    __param(10, instantiation_1.IInstantiationService),
    __param(11, conversationOptions_1.IConversationOptions),
    __param(12, telemetry_1.ITelemetryService),
    __param(13, logService_1.ILogService),
    __param(14, surveyService_1.ISurveyService),
    __param(15, requestLogger_1.IRequestLogger),
    __param(16, editSurvivalTrackerService_1.IEditSurvivalTrackerService),
    __param(17, authentication_1.IAuthenticationService)
], DefaultIntentRequestHandler);
let DefaultToolCallingLoop = class DefaultToolCallingLoop extends toolCallingLoop_1.ToolCallingLoop {
    constructor(options, telemetryBuilder, instantiationService, logService, requestLogger, endpointProvider, authenticationChatUpgradeService, telemetryService, toolGroupingService, _experimentationService, _copilotTokenStore) {
        super(options, instantiationService, endpointProvider, logService, requestLogger, authenticationChatUpgradeService, telemetryService);
        this.toolGroupingService = toolGroupingService;
        this._experimentationService = _experimentationService;
        this._copilotTokenStore = _copilotTokenStore;
        this._register(this.onDidBuildPrompt(({ result, tools, promptTokenLength }) => {
            if (result.metadata.get(summarizedConversationHistory_1.SummarizedConversationHistoryMetadata)) {
                this.toolGrouping?.didInvalidateCache();
            }
            this.telemetry = telemetryBuilder.makeRequest(options.intent, options.location, options.conversation, result.messages, promptTokenLength, result.references, options.invocation.endpoint, result.telemetryData ?? [], tools.length);
        }));
        this._register(this.onDidReceiveResponse(() => {
            this.toolGrouping?.didTakeTurn();
        }));
    }
    createPromptContext(availableTools, outputStream) {
        const context = super.createPromptContext(availableTools, outputStream);
        this._handleVirtualCalls(context);
        const extraVars = this.options.invocation.getAdditionalVariables?.(context);
        if (extraVars?.hasVariables()) {
            return {
                ...context,
                chatVariables: chatVariablesCollection_1.ChatVariablesCollection.merge(context.chatVariables, extraVars),
            };
        }
        return context;
    }
    async _doMirroredCallWithVirtualTools(delta, messages, requestOptions) {
        const shouldDo = !this._didParallelToolCallLoop
            && this._copilotTokenStore.copilotToken?.isInternal;
        if (!shouldDo) {
            return;
        }
        const candidateCall = delta.copilotToolCalls?.find(tc => tc.name.startsWith('mcp_'));
        if (!candidateCall) {
            return;
        }
        this._didParallelToolCallLoop = true;
        if (this._experimentationService.getTreatmentVariable('copilotchat.noParallelToolLoop')) {
            return;
        }
        const token = cancellation_1.CancellationToken.None;
        const allTools = await this.options.invocation.getAvailableTools?.() ?? [];
        const grouping = this.toolGroupingService.create(this.options.conversation.sessionId, allTools);
        const computed = await grouping.compute(this.options.request.prompt, token);
        const container = grouping.getContainerFor(candidateCall.name);
        let state = container ? (container.isExpanded ? 'defaultExpanded' : 'collapsed') : 'topLevel';
        if (state === 'collapsed') {
            await this.options.invocation.endpoint.makeChatRequest(`${commonTypes_1.ChatLocation.toStringShorter(this.options.location)}/${this.options.intent?.id}/virtualParallelEval`, messages, (_text, _index, delta) => {
                if (delta.copilotToolCalls?.some(tc => tc.name === container.name)) {
                    state = 'expanded';
                    return Promise.resolve(1);
                }
                return Promise.resolve(undefined);
            }, token, this.options.overrideRequestLocation ?? this.options.location, undefined, {
                ...requestOptions,
                tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(this.options.invocation.endpoint.family, computed.map(tool => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema && Object.keys(tool.inputSchema).length ? tool.inputSchema : undefined
                    },
                })), (tool, rule) => {
                    this._logService.warn(`Tool ${tool} failed validation: ${rule}`);
                }),
                temperature: this.calculateTemperature(),
            }, false);
        }
        /* __GDPR__
            "virtualTools.parallelCall" : {
                "owner": "connor4312",
                "comment": "Reports information about the generation of virtual tools.",
                "toolCallName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the original tool call" },
                "toolGroupName": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Name of the containing tool group" },
                "toolGroupState": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If/how the tool call was expanded" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('virtualTools.parallelCall', {
            toolCallName: candidateCall.name,
            toolGroupName: container?.name,
            toolGroupState: state,
        });
    }
    _handleVirtualCalls(context) {
        if (!this.toolGrouping) {
            return;
        }
        for (const call of context.toolCallRounds?.at(-1)?.toolCalls || iterator_1.Iterable.empty()) {
            if (context.toolCallResults?.[call.id]) {
                continue;
            }
            const expanded = this.toolGrouping.didCall(context.toolCallRounds.length, call.name);
            if (expanded) {
                context.toolCallResults ??= {};
                context.toolCallResults[call.id] = expanded;
            }
        }
    }
    async buildPrompt(buildPromptContext, progress, token) {
        const buildPromptResult = await this.options.invocation.buildPrompt(buildPromptContext, progress, token);
        this.fixMessageNames(buildPromptResult.messages);
        return buildPromptResult;
    }
    async fetch(opts, token) {
        const messageSourcePrefix = this.options.location === commonTypes_1.ChatLocation.Editor ? 'inline' : 'chat';
        const debugName = this.options.request.isSubagent ?
            `tool/runSubagent` :
            `${commonTypes_1.ChatLocation.toStringShorter(this.options.location)}/${this.options.intent?.id}`;
        return this.options.invocation.endpoint.makeChatRequest2({
            ...opts,
            debugName,
            finishedCb: (text, index, delta) => {
                this.telemetry.markReceivedToken();
                this._doMirroredCallWithVirtualTools(delta, opts.messages, opts.requestOptions);
                return opts.finishedCb(text, index, delta);
            },
            location: this.options.overrideRequestLocation ?? this.options.location,
            requestOptions: {
                ...opts.requestOptions,
                tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(this.options.invocation.endpoint.family, opts.requestOptions.tools, (tool, rule) => {
                    this._logService.warn(`Tool ${tool} failed validation: ${rule}`);
                }),
                temperature: this.calculateTemperature(),
            },
            telemetryProperties: {
                messageId: this.telemetry.telemetryMessageId,
                conversationId: this.options.conversation.sessionId,
                messageSource: this.options.intent?.id && this.options.intent.id !== unknownIntent_1.UnknownIntent.ID ? `${messageSourcePrefix}.${this.options.intent.id}` : `${messageSourcePrefix}.user`,
            },
            enableRetryOnFilter: true
        }, token);
    }
    async getAvailableTools(outputStream, token) {
        const tools = await this.options.invocation.getAvailableTools?.() ?? [];
        if (this.toolGrouping) {
            this.toolGrouping.tools = tools;
        }
        else {
            this.toolGrouping = this.toolGroupingService.create(this.options.conversation.sessionId, tools);
            for (const ref of this.options.request.toolReferences) {
                this.toolGrouping.ensureExpanded(ref.name);
            }
        }
        const computePromise = this.toolGrouping.compute(this.options.request.prompt, token); // Show progress if this takes a moment...
        const timeout = setTimeout(() => {
            outputStream?.progress((0, nls_1.localize)('computingTools', 'Optimizing tool selection...'), async () => {
                await computePromise;
            });
        }, 1000);
        try {
            return await computePromise;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    fixMessageNames(messages) {
        messages.forEach(m => {
            if (m.role !== prompt_tsx_1.Raw.ChatRole.System && 'name' in m && m.name === this.options.intent?.id) {
                // Assistant messages from the current intent should not have 'name' set.
                // It's not well-documented how this works in OpenAI models but this seems to be the expectation
                m.name = undefined;
            }
        });
    }
    calculateTemperature() {
        if (this.options.request.attempt > 0) {
            return Math.min(this.options.temperature * (this.options.request.attempt + 1), 2 /* MAX temperature - https://platform.openai.com/docs/api-reference/chat/create#chat/create-temperature */);
        }
        else {
            return this.options.temperature;
        }
    }
};
DefaultToolCallingLoop = __decorate([
    __param(2, instantiation_1.IInstantiationService),
    __param(3, logService_1.ILogService),
    __param(4, requestLogger_1.IRequestLogger),
    __param(5, endpointProvider_1.IEndpointProvider),
    __param(6, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(7, telemetry_1.ITelemetryService),
    __param(8, virtualToolTypes_1.IToolGroupingService),
    __param(9, nullExperimentationService_1.IExperimentationService),
    __param(10, copilotTokenStore_1.ICopilotTokenStore)
], DefaultToolCallingLoop);
//# sourceMappingURL=defaultIntentRequestHandler.js.map