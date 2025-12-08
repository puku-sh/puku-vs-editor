"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.InlineChatTelemetry = exports.PanelChatTelemetry = exports.ChatTelemetry = exports.ChatTelemetryBuilder = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const diagnosticsTelemetry_1 = require("../../inlineChat/node/diagnosticsTelemetry");
const agentIntent_1 = require("../../intents/node/agentIntent");
const editCodeIntent_1 = require("../../intents/node/editCodeIntent");
const editCodeIntent2_1 = require("../../intents/node/editCodeIntent2");
const customInstructions_1 = require("../../prompts/node/panel/customInstructions");
const parseApplyPatch_1 = require("../../tools/node/applyPatch/parseApplyPatch");
const repoInfoTelemetry_1 = require("./repoInfoTelemetry");
const telemetry_2 = require("./telemetry");
//#endregion
let ChatTelemetryBuilder = class ChatTelemetryBuilder {
    get telemetryMessageId() {
        return this.baseUserTelemetry.properties.messageId;
    }
    constructor(_startTime, _sessionId, _documentContext, _firstTurn, _request, instantiationService) {
        this._startTime = _startTime;
        this._sessionId = _sessionId;
        this._documentContext = _documentContext;
        this._firstTurn = _firstTurn;
        this._request = _request;
        this.instantiationService = instantiationService;
        this.baseUserTelemetry = (0, telemetry_2.createTelemetryWithId)();
        // Repo info telemetry is held here as the begin event should be sent only by the first PanelChatTelemetry instance created for a user request.
        // and a new PanelChatTelemetry instance is created per step in the request.
        this._repoInfoTelemetry = this.instantiationService.createInstance(repoInfoTelemetry_1.RepoInfoTelemetry, this.baseUserTelemetry.properties.messageId);
    }
    makeRequest(intent, location, conversation, messages, promptTokenLength, references, endpoint, telemetryData, availableToolCount) {
        if (location === commonTypes_1.ChatLocation.Editor) {
            return this.instantiationService.createInstance(InlineChatTelemetry, this._sessionId, this._documentContext, this._firstTurn, this._request, this._startTime, this.baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, telemetryData, availableToolCount, this._repoInfoTelemetry);
        }
        else {
            return this.instantiationService.createInstance(PanelChatTelemetry, this._sessionId, this._documentContext, this._firstTurn, this._request, this._startTime, this.baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, telemetryData, availableToolCount, this._repoInfoTelemetry);
        }
    }
};
exports.ChatTelemetryBuilder = ChatTelemetryBuilder;
exports.ChatTelemetryBuilder = ChatTelemetryBuilder = __decorate([
    __param(5, instantiation_1.IInstantiationService)
], ChatTelemetryBuilder);
let ChatTelemetry = class ChatTelemetry {
    get telemetryMessageId() {
        return this._userTelemetry.properties.messageId;
    }
    get editCount() {
        return this._editCount;
    }
    get editLineCount() {
        return this._editLineCount;
    }
    constructor(_location, _sessionId, _documentContext, _firstTurn, _request, _startTime, baseUserTelemetry, _conversation, _intent, _messages, _references, _endpoint, promptTokenLength, _genericTelemetryData, _availableToolCount, _repoInfoTelemetry, _telemetryService) {
        this._location = _location;
        this._sessionId = _sessionId;
        this._documentContext = _documentContext;
        this._firstTurn = _firstTurn;
        this._request = _request;
        this._startTime = _startTime;
        this._conversation = _conversation;
        this._intent = _intent;
        this._messages = _messages;
        this._references = _references;
        this._endpoint = _endpoint;
        this._genericTelemetryData = _genericTelemetryData;
        this._availableToolCount = _availableToolCount;
        this._repoInfoTelemetry = _repoInfoTelemetry;
        this._telemetryService = _telemetryService;
        this._requestStartTime = Date.now();
        this._firstTokenTime = 0;
        this._addedLinkCount = 0;
        this._markdownCharCount = 0;
        this._editCount = 0;
        this._editLineCount = 0;
        // todo@connor4312: temporary event to track occurences of patches in response
        // text, ref https://github.com/microsoft/vscode-copilot/issues/16608
        this._didSeePatchInResponse = false;
        this._lastMarkdownLine = '';
        // Extend the base user telemetry with message and prompt information.
        // We don't send this telemetry yet, but we will need it later to include the off topic scores.
        this._userTelemetry = (0, telemetry_2.extendUserMessageTelemetryData)(this._conversation, this._sessionId, this._location, this._request.prompt, promptTokenLength, 
        // this._tokenizer.countMessagesTokens(this._messages),
        this._intent.id, baseUserTelemetry);
        // we are in a super-ctor and use a microtask to give sub-classes a change to initialize properties
        // that might be used in their _sendInternalRequestTelemetryEvent-method
        queueMicrotask(() => this._sendInternalRequestTelemetryEvent());
    }
    markReceivedToken() {
        if (this._firstTokenTime === 0) {
            this._firstTokenTime = Date.now();
        }
    }
    markAddedLinks(n) {
        this._addedLinkCount += n;
    }
    markEmittedMarkdown(str) {
        this._markdownCharCount += str.value.length;
        this._lastMarkdownLine += str.value;
        if (this._lastMarkdownLine.includes(parseApplyPatch_1.PATCH_PREFIX.trim())) {
            this._didSeePatchInResponse = true;
        }
        const i = this._lastMarkdownLine.lastIndexOf('\n');
        this._lastMarkdownLine = this._lastMarkdownLine.slice(i + 1);
    }
    markEmittedEdits(uri, edits) {
        this._editCount += edits.length;
        this._editLineCount += edits.reduce((acc, edit) => acc + edit.newText.split('\n').length, 0);
    }
    async sendTelemetry(requestId, responseType, response, interactionOutcome, toolCalls) {
        // We can send the user message telemetry event now that the response is returned, including off-topic prediction.
        (0, telemetry_2.sendUserMessageTelemetry)(this._telemetryService, this._location, requestId, this._request.prompt, responseType === commonTypes_1.ChatFetchResponseType.OffTopic ? true : false, this._documentContext?.document, this._userTelemetry, this._getModeName());
        if (responseType === commonTypes_1.ChatFetchResponseType.OffTopic) {
            (0, telemetry_2.sendOffTopicMessageTelemetry)(this._telemetryService, this._conversation, this._location, this._request.prompt, this.telemetryMessageId, // That's the message id of the user message
            this._documentContext?.document, this._userTelemetry);
        }
        if (responseType === commonTypes_1.ChatFetchResponseType.Success) {
            (0, telemetry_2.sendModelMessageTelemetry)(this._telemetryService, this._conversation, this._location, response, this.telemetryMessageId, // That's the message id of the user message
            this._documentContext?.document, this._userTelemetry.extendedBy({ replyType: interactionOutcome.kind }), this._getModeName());
        }
        await this._sendResponseTelemetryEvent(responseType, response, interactionOutcome, toolCalls);
        this._sendResponseInternalTelemetryEvent(responseType, response);
        // todo@connor4312: temporary event to track occurences of patches in response
        // text, ref https://github.com/microsoft/vscode-copilot/issues/16608
        if (this._didSeePatchInResponse) {
            /* __GDPR__
                "applyPatch.inResponse" : {
                    "owner": "digitarald",
                    "comment": "Metadata about an inline response from the model",
                    "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." }
                }
            */
            this._telemetryService.sendMSFTTelemetryEvent('applyPatch.inResponse', {
                model: this._endpoint.model
            });
        }
    }
    _getModeName() {
        return this._request.modeInstructions2 ? 'custom' :
            this._intent.id === agentIntent_1.AgentIntent.ID ? 'agent' :
                (this._intent.id === editCodeIntent_1.EditCodeIntent.ID || this._intent.id === editCodeIntent2_1.EditCode2Intent.ID) ? 'edit' :
                    (this._intent.id === "inlineChat" /* Intent.InlineChat */) ? 'inlineChatIntent' :
                        'ask';
    }
    sendToolCallingTelemetry(toolCallRounds, availableTools, responseType) {
        if (availableTools.length === 0) {
            return;
        }
        const toolCounts = toolCallRounds.reduce((acc, round) => {
            round.toolCalls.forEach(call => {
                acc[call.name] = (acc[call.name] || 0) + 1;
            });
            return acc;
        }, {});
        const invalidToolCallCount = toolCallRounds.reduce((acc, round) => {
            if (round.toolInputRetry > 0) {
                acc++;
            }
            return acc;
        }, 0);
        const toolCallProperties = {
            intentId: this._intent.id,
            conversationId: this._conversation.sessionId,
            responseType,
            toolCounts: JSON.stringify(toolCounts),
            model: this._endpoint.model
        };
        const toolCallMeasurements = {
            numRequests: toolCallRounds.length, // This doesn't include cancelled requests
            turnIndex: this._conversation.turns.length,
            sessionDuration: Date.now() - this._conversation.turns[0].startTime,
            turnDuration: Date.now() - this._conversation.getLatestTurn().startTime,
            promptTokenCount: this._userTelemetry.measurements.promptTokenLen,
            messageCharLen: this._userTelemetry.measurements.messageCharLen,
            availableToolCount: availableTools.length,
            invalidToolCallCount
        };
        /* __GDPR__
            "toolCallDetails" : {
                "owner": "roblourens",
                "comment": "Records information about tool calls during a request.",
                "intentId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the invoked intent." },
                "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the current chat conversation." },
                "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request succeeded or failed." },
                "numRequests": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The total number of requests made" },
                "turnIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The conversation turn index" },
                "toolCounts": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The number of times each tool was used" },
                "sessionDuration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time since the session started" },
                "turnDuration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time since the turn started" },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many tokens were in the last generated prompt." },
                "messageCharLen": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters were in the user message." },
                "availableToolCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How number of tools that were available." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the final response was successful or how it failed." },
                "invalidToolCallCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The number of tool call rounds that had an invalid tool call." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('toolCallDetails', toolCallProperties, toolCallMeasurements);
        this._telemetryService.sendInternalMSFTTelemetryEvent('toolCallDetailsInternal', {
            ...toolCallProperties,
            messageId: this.telemetryMessageId,
            availableTools: JSON.stringify(availableTools.map(tool => tool.name))
        }, toolCallMeasurements);
        this._telemetryService.sendEnhancedGHTelemetryEvent('toolCallDetailsExternal', {
            ...toolCallProperties,
            messageId: this.telemetryMessageId,
            availableTools: JSON.stringify(availableTools.map(tool => tool.name))
        }, toolCallMeasurements);
        // Send internal repo info telemetry at the end of the tool loop
        this._repoInfoTelemetry.sendEndTelemetry();
    }
    _getTelemetryData(ctor) {
        return this._genericTelemetryData.find(d => d instanceof ctor);
    }
};
exports.ChatTelemetry = ChatTelemetry;
exports.ChatTelemetry = ChatTelemetry = __decorate([
    __param(16, telemetry_1.ITelemetryService)
], ChatTelemetry);
let PanelChatTelemetry = class PanelChatTelemetry extends ChatTelemetry {
    constructor(sessionId, documentContext, firstTurn, request, startTime, baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, genericTelemetryData, availableToolCount, repoInfoTelemetry, telemetryService, _configurationService) {
        super(commonTypes_1.ChatLocation.Panel, sessionId, documentContext, firstTurn, request, startTime, baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, genericTelemetryData, availableToolCount, repoInfoTelemetry, telemetryService);
        this._configurationService = _configurationService;
    }
    _sendInternalRequestTelemetryEvent() {
        // Capture the created prompt in internal telemetry
        this._telemetryService.sendInternalMSFTTelemetryEvent('interactiveSessionMessage', {
            chatLocation: 'panel',
            sessionId: this._sessionId,
            requestId: this.telemetryMessageId,
            baseModel: this._endpoint.model,
            apiType: this._endpoint.apiType,
            intent: this._intent.id,
            isParticipantDetected: String(this._request.isParticipantDetected),
            detectedIntent: this._request.enableCommandDetection ? this._intent?.id : 'none',
            contextTypes: 'none', // TODO this is defunct
            query: this._request.prompt
        }, {
            turnNumber: this._conversation.turns.length,
        });
        // Send the begin telemetry for repo info, this uses the same repo info telemetry instance held by the builder class
        // as the begin event need to be sent only once per user request and PanelChatTelemetry is recreated per step. The class is
        // guarded to only send one time.
        this._repoInfoTelemetry.sendBeginTelemetryIfNeeded();
    }
    async _sendResponseTelemetryEvent(responseType, response, interactionOutcome, toolCalls = []) {
        const turn = this._conversation.getLatestTurn();
        const roundIndex = turn.rounds.length - 1;
        const codeBlocks = response ? (0, telemetry_2.getCodeBlocks)(response) : [];
        const codeBlockLanguages = codeBlocks.map(block => block.languageId);
        // TBD@digitarald: This is a first cheap way to detect off-topic LLM responses.
        const offTopicHints = ['programming-related tasks', 'programming related questions', 'software development topics', 'related to programming', 'expertise is limited', 'sorry, i can\'t assist with that'];
        let maybeOffTopic = 0;
        if (responseType === commonTypes_1.ChatFetchResponseType.Success && !response.trim().includes('\n')) {
            // Check responseMessage
            if (offTopicHints.some(flag => response.toLowerCase().includes(flag))) {
                maybeOffTopic = 1;
            }
        }
        const toolCounts = toolCalls.reduce((acc, call) => {
            acc[call.name] = (acc[call.name] || 0) + 1;
            return acc;
        }, {});
        const messageTokenCount = await this._endpoint.acquireTokenizer().tokenLength(turn.request.message);
        const promptTokenCount = await this._endpoint.acquireTokenizer().countMessagesTokens(this._messages);
        const responseTokenCount = await this._endpoint.acquireTokenizer().tokenLength(response) ?? 0;
        /* __GDPR__
            "panel.request" : {
                "owner": "digitarald",
                "comment": "Metadata about one message turn in a chat conversation.",
                "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command which was used in providing the response." },
                "contextTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The context parts which were used in providing the response." },
                "promptTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The prompt types and their length which were used in providing the response." },
                "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the current chat conversation." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message request." },
                "responseId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message response." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "If the response was successful or how it failed." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The language of the active editor." },
                "codeBlocks": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Code block languages in the response." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." },
                "apiType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The API type used in the endpoint- responses or chatCompletions" },
                "turn": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many turns have been made in the conversation." },
                "round": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The current round index of the turn." },
                "textBlocks": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "For text-only responses (no code), how many paragraphs were in the response." },
                "links": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Symbol and file links in the response.", "isMeasurement": true },
                "maybeOffTopic": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the response sounds like it got rejected due to the request being off-topic." },
                "messageTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters were in the user message." },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters were in the generated prompt." },
                "userPromptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many user messages were in the generated prompt." },
                "responseTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters were in the response." },
                "timeToRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to start the final request." },
                "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to get the first token." },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to complete the request." },
                "codeGenInstructionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions are in the request." },
                "codeGenInstructionsLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whats the length of the code generation instructions that were added to request." },
                "codeGenInstructionsFilteredCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions were filtered." },
                "codeGenInstructionFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instruction files were read." },
                "codeGenInstructionSettingsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions originated from settings." },
                "toolCounts": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The number of times each tool was used" },
                "numToolCalls": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The total number of tool calls" },
                "availableToolCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How number of tools that were available." },
                "summarizationEnabled" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "Whether summarization is enabled (the default) or disabled (via user setting)" }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('panel.request', {
            command: this._intent.id,
            contextTypes: 'none', // TODO this is defunct
            promptTypes: this._messages.map(msg => `${msg.role}${'name' in msg && msg.name ? `-${msg.name}` : ''}:${msg.content?.length}`).join(','),
            conversationId: this._sessionId,
            requestId: turn.id,
            responseId: turn.id, // SAME as fetchResult.requestId ,
            responseType,
            languageId: this._documentContext?.document.languageId,
            codeBlocks: codeBlockLanguages.join(','),
            model: this._endpoint.model,
            apiType: this._endpoint.apiType,
            isParticipantDetected: String(this._request.isParticipantDetected),
            toolCounts: JSON.stringify(toolCounts),
        }, {
            turn: this._conversation.turns.length,
            round: roundIndex,
            textBlocks: codeBlocks.length ? -1 : response.split(/\n{2,}/).length ?? 0,
            links: this._addedLinkCount,
            maybeOffTopic: maybeOffTopic,
            messageTokenCount,
            promptTokenCount,
            userPromptCount: this._messages.filter(msg => msg.role === prompt_tsx_1.Raw.ChatRole.User).length,
            responseTokenCount,
            timeToRequest: this._requestStartTime - this._startTime,
            timeToFirstToken: this._firstTokenTime ? this._firstTokenTime - this._startTime : -1,
            timeToComplete: Date.now() - this._startTime,
            ...(0, customInstructions_1.getCustomInstructionTelemetry)(turn.references),
            numToolCalls: toolCalls.length,
            availableToolCount: this._availableToolCount,
            summarizationEnabled: this._configurationService.getConfig(configurationService_1.ConfigKey.SummarizeAgentConversationHistory) ? 1 : 0
        });
        const modeName = this._getModeName();
        (0, telemetry_2.sendUserActionTelemetry)(this._telemetryService, undefined, {
            command: this._intent.id,
            conversationId: this._sessionId,
            requestId: turn.id,
            responseType,
            languageId: this._documentContext?.document.languageId ?? '',
            model: this._endpoint.model,
            isParticipantDetected: String(this._request.isParticipantDetected),
            toolCounts: JSON.stringify(toolCounts),
            mode: modeName,
            codeBlocks: JSON.stringify(codeBlocks),
        }, {
            isAgent: this._intent.id === agentIntent_1.AgentIntent.ID ? 1 : 0,
            turn: this._conversation.turns.length,
            round: roundIndex,
            textBlocks: codeBlocks.length ? -1 : response.split(/\n{2,}/).length ?? 0,
            links: this._addedLinkCount,
            maybeOffTopic,
            messageTokenCount,
            promptTokenCount,
            userPromptCount: this._messages.filter(msg => msg.role === prompt_tsx_1.Raw.ChatRole.User).length,
            responseTokenCount,
            timeToRequest: this._requestStartTime - this._startTime,
            timeToFirstToken: this._firstTokenTime ? this._firstTokenTime - this._startTime : -1,
            timeToComplete: Date.now() - this._startTime,
            numToolCalls: toolCalls.length,
            availableToolCount: this._availableToolCount,
        }, 'panel_request');
    }
    _sendResponseInternalTelemetryEvent(_responseType, response) {
        this._telemetryService.sendInternalMSFTTelemetryEvent('interactiveSessionResponse', {
            // shared
            chatLocation: 'panel',
            requestId: this.telemetryMessageId,
            intent: this._intent.id,
            request: this._request.prompt,
            response: response ?? '',
            baseModel: this._endpoint.model,
            apiType: this._endpoint.apiType,
            // shareable but NOT
            isParticipantDetected: String(this._request.isParticipantDetected),
            sessionId: this._sessionId,
        }, {
            turnNumber: this._conversation.turns.length,
        });
    }
};
exports.PanelChatTelemetry = PanelChatTelemetry;
exports.PanelChatTelemetry = PanelChatTelemetry = __decorate([
    __param(15, telemetry_1.ITelemetryService),
    __param(16, configurationService_1.IConfigurationService)
], PanelChatTelemetry);
let InlineChatTelemetry = class InlineChatTelemetry extends ChatTelemetry {
    get _isNotebookDocument() {
        return (0, notebooks_1.isNotebookCellOrNotebookChatInput)(this._documentContext.document.uri) ? 1 : 0;
    }
    constructor(sessionId, documentContext, firstTurn, request, startTime, baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, genericTelemetryData, availableToolCount, repoInfoTelemetry, telemetryService, _languageDiagnosticsService) {
        super(commonTypes_1.ChatLocation.Editor, sessionId, documentContext, firstTurn, request, startTime, baseUserTelemetry, conversation, intent, messages, references, endpoint, promptTokenLength, genericTelemetryData, availableToolCount, repoInfoTelemetry, telemetryService);
        this._languageDiagnosticsService = _languageDiagnosticsService;
        this._diagnosticsTelemetryData = (0, diagnosticsTelemetry_1.findDiagnosticsTelemetry)(this._documentContext.selection, this._languageDiagnosticsService.getDiagnostics(this._documentContext.document.uri));
    }
    _sendInternalRequestTelemetryEvent() {
        // Capture the created prompt in internal telemetry
        this._telemetryService.sendInternalMSFTTelemetryEvent('interactiveSessionRequest', {
            conversationId: this._sessionId,
            requestId: this.telemetryMessageId,
            chatLocation: 'inline',
            intent: this._intent.id,
            language: this._documentContext.document.languageId,
            prompt: this._messages.map(m => `${(0, globalStringUtils_1.roleToString)(m.role).toUpperCase()}:\n${m.content}`).join('\n---\n'),
            model: this._endpoint.model,
            apiType: this._endpoint.apiType
        }, {
            isNotebook: this._isNotebookDocument,
            turnNumber: this._conversation.turns.length,
        });
    }
    async _sendResponseTelemetryEvent(responseType, response, interactionOutcome) {
        /* __GDPR__
            "inline.request" : {
                "owner": "digitarald",
                "comment": "Metadata about an inline response from the model",
                "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command which was used in providing the response." },
                "contextTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The context parts which were used in providing the response." },
                "promptTypes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The prompt types and their length which were used in providing the response." },
                "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the conversation." },
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message request." },
                "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The language of the current document." },
                "responseType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The result type of the response." },
                "replyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How response is shown in the interface." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that is used in the endpoint." },
                "apiType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The API type used in the endpoint- responses or chatCompletions" },
                "diagnosticsProvider": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The diagnostics provider." },
                "diagnosticCodes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The diagnostics codes in the file." },
                "selectionDiagnosticCodes": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The selected diagnostics codes." },
                "firstTurn": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether this is the first turn in the conversation." },
                "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether this is a notebook document." },
                "messageTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many tokens are in the rest of the query, without the command." },
                "promptTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many tokens are in the overall prompt." },
                "responseTokenCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many tokens were in the response." },
                "implicitCommand": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the command was implictly detected or provided by the user." },
                "attemptCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many times the user has retried." },
                "selectionLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the current selection." },
                "wholeRangeLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the expanded whole range." },
                "editCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many edits are suggested." },
                "editLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in all suggested edits." },
                "markdownCharCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many characters were emitted as markdown to vscode in the response stream." },
                "problemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current document." },
                "selectionProblemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current selected code." },
                "diagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current ." },
                "selectionDiagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the code at the selection." },
                "outcomeAnnotations": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Annotations about the outcome of the request." },
                "timeToRequest": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to start the final request." },
                "timeToFirstToken": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to get the first token." },
                "timeToComplete": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "isMeasurement": true, "comment": "How long it took to complete the request." },
                "codeGenInstructionsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions are in the request." },
                "codeGenInstructionsLength": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The length of the code generation instructions that were added to request." },
                "codeGenInstructionsFilteredCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions were filtered." },
                "codeGenInstructionFileCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instruction files were read." },
                "codeGenInstructionSettingsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many code generation instructions originated from settings." }
            }
        */
        this._telemetryService.sendMSFTTelemetryEvent('inline.request', {
            command: this._intent.id,
            contextTypes: 'none', // TODO@jrieken intentResult.contexts.map(part => part.kind).join(',') ?? 'none',
            promptTypes: this._messages.map(msg => `${msg.role}${'name' in msg && msg.name ? `-${msg.name}` : ''}:${msg.content.length}`).join(','),
            conversationId: this._sessionId,
            requestId: this.telemetryMessageId,
            languageId: this._documentContext.document.languageId,
            responseType: responseType,
            replyType: interactionOutcome.kind,
            model: this._endpoint.model,
            apiType: this._endpoint.apiType,
            diagnosticsProvider: this._diagnosticsTelemetryData.diagnosticsProvider,
            diagnosticCodes: this._diagnosticsTelemetryData.fileDiagnosticsTelemetry.diagnosticCodes,
            selectionDiagnosticCodes: this._diagnosticsTelemetryData.selectionDiagnosticsTelemetry.diagnosticCodes,
            outcomeAnnotations: interactionOutcome.annotations?.map(a => a.label).join(','),
        }, {
            firstTurn: this._firstTurn ? 1 : 0,
            isNotebook: this._isNotebookDocument,
            withIntentDetection: this._request.enableCommandDetection ? 1 : 0,
            messageTokenCount: await this._endpoint.acquireTokenizer().tokenLength(this._request.prompt),
            promptTokenCount: await this._endpoint.acquireTokenizer().countMessagesTokens(this._messages),
            responseTokenCount: responseType === commonTypes_1.ChatFetchResponseType.Success ? await this._endpoint.acquireTokenizer().tokenLength(response) : -1,
            implicitCommand: (!this._request.prompt.trim().startsWith(`/${this._intent.id}`) ? 1 : 0),
            attemptCount: this._request.attempt || 0,
            selectionLineCount: Math.abs(this._documentContext.selection.end.line - this._documentContext.selection.start.line) + 1,
            wholeRangeLineCount: Math.abs(this._documentContext.wholeRange.end.line - this._documentContext.wholeRange.start.line) + 1,
            editCount: this._editCount > 0 ? this._editCount : -1,
            editLineCount: this._editLineCount > 0 ? this._editLineCount : -1,
            markdownCharCount: this._markdownCharCount,
            problemsCount: this._diagnosticsTelemetryData.fileDiagnosticsTelemetry.problemsCount,
            selectionProblemsCount: this._diagnosticsTelemetryData.selectionDiagnosticsTelemetry.problemsCount,
            diagnosticsCount: this._diagnosticsTelemetryData.fileDiagnosticsTelemetry.diagnosticsCount,
            selectionDiagnosticsCount: this._diagnosticsTelemetryData.selectionDiagnosticsTelemetry.diagnosticsCount,
            timeToRequest: this._requestStartTime - this._startTime,
            timeToFirstToken: this._firstTokenTime ? this._firstTokenTime - this._startTime : -1,
            timeToComplete: Date.now() - this._startTime,
            ...(0, customInstructions_1.getCustomInstructionTelemetry)(this._references),
        });
    }
    _sendResponseInternalTelemetryEvent(responseType, response) {
        this._telemetryService.sendInternalMSFTTelemetryEvent('interactiveSessionResponse', {
            chatLocation: 'inline',
            intent: this._intent.id,
            request: this._request.prompt,
            response,
            conversationId: this._sessionId,
            requestId: this.telemetryMessageId,
            baseModel: this._endpoint.model,
            apiType: this._endpoint.apiType,
            responseType,
            problems: this._diagnosticsTelemetryData.fileDiagnosticsTelemetry.problems,
            selectionProblems: this._diagnosticsTelemetryData.selectionDiagnosticsTelemetry.problems,
            diagnosticCodes: this._diagnosticsTelemetryData.fileDiagnosticsTelemetry.diagnosticCodes,
            selectionDiagnosticCodes: this._diagnosticsTelemetryData.selectionDiagnosticsTelemetry.diagnosticCodes,
            diagnosticsProvider: this._diagnosticsTelemetryData.diagnosticsProvider,
            language: this._documentContext.document.languageId,
        }, {
            isNotebook: this._isNotebookDocument,
            turnNumber: this._conversation.turns.length,
        });
    }
};
exports.InlineChatTelemetry = InlineChatTelemetry;
exports.InlineChatTelemetry = InlineChatTelemetry = __decorate([
    __param(15, telemetry_1.ITelemetryService),
    __param(16, languageDiagnosticsService_1.ILanguageDiagnosticsService)
], InlineChatTelemetry);
//# sourceMappingURL=chatParticipantTelemetry.js.map