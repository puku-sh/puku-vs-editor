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
exports.UserFeedbackService = exports.IUserFeedbackService = void 0;
const vscode = __importStar(require("vscode"));
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const multiFileEditQualityTelemetry_1 = require("../../../platform/multiFileEdit/common/multiFileEditQualityTelemetry");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const surveyService_1 = require("../../../platform/survey/common/surveyService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const notebooks_1 = require("../../../util/common/notebooks");
const services_1 = require("../../../util/common/services");
const network_1 = require("../../../util/vs/base/common/network");
const conversationStore_1 = require("../../conversationStore/node/conversationStore");
const diagnosticsTelemetry_1 = require("../../inlineChat/node/diagnosticsTelemetry");
const promptCraftingTypes_1 = require("../../inlineChat/node/promptCraftingTypes");
const intents_1 = require("../../intents/common/intents");
const editCodeStep_1 = require("../../intents/node/editCodeStep");
const conversation_1 = require("../../prompt/common/conversation");
const conversation_2 = require("../../prompt/node/conversation");
const feedbackReporter_1 = require("../../prompt/node/feedbackReporter");
const telemetry_2 = require("../../prompt/node/telemetry");
exports.IUserFeedbackService = (0, services_1.createServiceIdentifier)('IUserFeedbackService');
let UserFeedbackService = class UserFeedbackService {
    constructor(telemetryService, conversationStore, feedbackReporter, surveyService, languageDiagnosticsService, multiFileEditTelemetryService, notebookService) {
        this.telemetryService = telemetryService;
        this.conversationStore = conversationStore;
        this.feedbackReporter = feedbackReporter;
        this.surveyService = surveyService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.multiFileEditTelemetryService = multiFileEditTelemetryService;
        this.notebookService = notebookService;
    }
    handleUserAction(e, agentId) {
        const document = vscode.window.activeTextEditor?.document;
        const selection = vscode.window.activeTextEditor?.selection;
        const result = e.result;
        const conversation = result.metadata?.responseId && this.conversationStore.getConversation(result.metadata.responseId);
        if (typeof conversation === 'object' && conversation.getLatestTurn().getMetadata(conversation_2.IntentInvocationMetadata)?.value?.location === commonTypes_1.ChatLocation.Editor) {
            this._handleChatUserAction(result.metadata?.sessionId, agentId, conversation, e, undefined);
            return;
        }
        // Don't use e.action.responseId, it will go away
        switch (e.action.kind) {
            case 'copy':
                /* __GDPR__
                    "panel.action.copy" : {
                        "owner": "digitarald",
                        "comment": "Counts copied code blocks from a chat panel response",
                        "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                        "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message request." },
                        "codeBlockIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Index of the code block in the response." },
                        "copyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the copy was done via the context menu or the toolbar." },
                        "characterCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of characters copied." },
                        "lineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of lines copied." },
                        "participant": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The name of the chat participant for this message." },
                        "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The command used for the chat participant." }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('panel.action.copy', {
                    languageId: document?.languageId,
                    requestId: result.metadata?.responseId,
                    participant: agentId,
                    command: result.metadata?.command,
                }, {
                    codeBlockIndex: e.action.codeBlockIndex,
                    copyType: e.action.copyKind,
                    characterCount: e.action.copiedCharacters,
                    lineCount: e.action.copiedText.split('\n').length,
                });
                break;
            case 'insert':
                /* __GDPR__
                    "panel.action.insert" : {
                        "owner": "digitarald",
                        "comment": "Counts inserts on a chat panel response",
                        "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                        "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message request." },
                        "codeBlockIndex": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Index of the code block in the response." },
                        "characterCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of characters copied." },
                        "participant": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The name of the chat participant for this message." },
                        "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The command used for the chat participant." },
                        "newFile": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the insert was done in a new file." }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('panel.action.insert', {
                    languageId: document?.languageId,
                    requestId: result.metadata?.responseId,
                    participant: agentId,
                    command: result.metadata?.command,
                }, {
                    codeBlockIndex: e.action.codeBlockIndex,
                    characterCount: e.action.totalCharacters,
                    newFile: e.action.newFile ? 1 : 0
                });
                break;
            case 'followUp':
                /* __GDPR__
                    "panel.action.followup" : {
                        "owner": "digitarald",
                        "comment": "Counts generic actions on a chat panel response",
                        "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                        "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the message request that is being followed-up." },
                        "participant": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the chat participant for this message." },
                        "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command used for the chat participant." }
                    }
                */
                this.telemetryService.sendMSFTTelemetryEvent('panel.action.followup', {
                    languageId: document?.languageId,
                    requestId: result.metadata?.responseId,
                    participant: agentId,
                    command: result.metadata?.command,
                });
                break;
            case 'bug':
                if (conversation) {
                    this.feedbackReporter.reportChat(conversation.getLatestTurn());
                }
                else {
                    vscode.window.showInformationMessage('Conversation not found, is it restored? Please try again.');
                }
                break;
            case 'chatEditingSessionAction':
                if (conversation instanceof conversation_1.Conversation) {
                    const editCodeStep = conversation.getLatestTurn().getMetadata(editCodeStep_1.EditCodeStepTurnMetaData)?.value;
                    if (editCodeStep && (e.action.outcome === vscode.ChatEditingSessionActionOutcome.Accepted || e.action.outcome === vscode.ChatEditingSessionActionOutcome.Rejected)) {
                        editCodeStep.setWorkingSetEntryState(e.action.uri, {
                            accepted: e.action.outcome === vscode.ChatEditingSessionActionOutcome.Accepted,
                            hasRemainingEdits: e.action.hasRemainingEdits
                        });
                    }
                    /* __GDPR__
                        "panel.edit.feedback" : {
                            "owner": "joyceerhl",
                            "comment": "Counts accept/reject actions for a proposed edit from panel chat",
                            "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
                            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the message request that is being followed-up." },
                            "participant": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The name of the chat participant for this message." },
                            "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command used for the chat participant." },
                            "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The user decision taken for the edited file" },
                            "hasRemainingEdits": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether there are additional unactioned edits in the file." },
                            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook." },
                            "isNotebookCell": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook cell." }
                        }
                    */
                    this.telemetryService.sendMSFTTelemetryEvent('panel.edit.feedback', {
                        languageId: document?.languageId,
                        requestId: result.metadata?.responseId,
                        participant: agentId,
                        command: result.metadata?.command,
                        outcome: outcomes.get(e.action.outcome) ?? 'unknown',
                        hasRemainingEdits: String(e.action.hasRemainingEdits),
                    }, {
                        isNotebook: this.notebookService.hasSupportedNotebooks(e.action.uri) ? 1 : 0,
                        isNotebookCell: e.action.uri.scheme === network_1.Schemas.vscodeNotebookCell ? 1 : 0
                    });
                    this.telemetryService.sendGHTelemetryEvent('panel.edit.feedback', {
                        languageId: document?.languageId,
                        requestId: result.metadata?.responseId,
                        participant: agentId,
                        command: result.metadata?.command,
                        outcome: outcomes.get(e.action.outcome) ?? 'unknown',
                        hasRemainingEdits: String(e.action.hasRemainingEdits),
                    }, {
                        isNotebook: this.notebookService.hasSupportedNotebooks(e.action.uri) ? 1 : 0,
                        isNotebookCell: e.action.uri.scheme === network_1.Schemas.vscodeNotebookCell ? 1 : 0
                    });
                    this.telemetryService.sendInternalMSFTTelemetryEvent('panel.edit.feedback', {
                        languageId: document?.languageId,
                        requestId: result.metadata?.responseId,
                        participant: agentId,
                        command: result.metadata?.command,
                        outcome: outcomes.get(e.action.outcome) ?? 'unknown',
                        hasRemainingEdits: String(e.action.hasRemainingEdits),
                    }, {
                        isNotebook: this.notebookService.hasSupportedNotebooks(e.action.uri) ? 1 : 0,
                        isNotebookCell: e.action.uri.scheme === network_1.Schemas.vscodeNotebookCell ? 1 : 0
                    });
                    if (result.metadata?.responseId
                        && (e.action.outcome === vscode.ChatEditingSessionActionOutcome.Accepted
                            || e.action.outcome === vscode.ChatEditingSessionActionOutcome.Rejected)) {
                        const outcome = e.action.outcome === vscode.ChatEditingSessionActionOutcome.Accepted ? 'accept' : 'reject';
                        this.multiFileEditTelemetryService.sendEditPromptAndResult({ chatRequestId: result.metadata.responseId }, e.action.uri, outcome);
                    }
                }
                break;
            case 'chatEditingHunkAction': {
                const outcome = outcomes.get(e.action.outcome);
                if (outcome) {
                    const properties = {
                        requestId: result.metadata?.responseId ?? '',
                        languageId: document?.languageId ?? '',
                        outcome,
                    };
                    const measurements = {
                        hasRemainingEdits: e.action.hasRemainingEdits ? 1 : 0,
                        isNotebook: this.notebookService.hasSupportedNotebooks(e.action.uri) ? 1 : 0,
                        isNotebookCell: e.action.uri.scheme === network_1.Schemas.vscodeNotebookCell ? 1 : 0,
                        lineCount: e.action.lineCount,
                        linesAdded: e.action.linesAdded,
                        linesRemoved: e.action.linesRemoved,
                    };
                    (0, telemetry_2.sendUserActionTelemetry)(this.telemetryService, document ?? vscode.window.activeTextEditor?.document, properties, measurements, 'edit.hunk.action');
                }
                break;
            }
        }
        if (e.action.kind === 'copy' || e.action.kind === 'insert') {
            let measurements = {};
            // Both copy and insert actions have a totalCharacters property
            measurements = {
                totalCharacters: e.action.totalCharacters,
                totalLines: e.action.totalLines,
                isAgent: agentId === (0, chatAgents_1.getChatParticipantIdFromName)(chatAgents_1.editsAgentName) ? 1 : 0,
            };
            // Copy actions have a copiedCharacters/Lines property since this includes manual copying which can be partial
            let compType = 'full';
            if (e.action.kind === 'copy') {
                measurements = {
                    ...measurements,
                    copiedCharacters: e.action.copiedCharacters,
                    copiedLines: e.action.copiedLines,
                };
                if (e.action.copiedCharacters !== e.action.totalCharacters) {
                    compType = 'partial';
                }
            }
            // If there is a document and selection, include cursor location
            if (document && selection) {
                measurements = {
                    ...measurements,
                    cursorLocation: document.offsetAt(selection.active),
                };
            }
            (0, telemetry_2.sendUserActionTelemetry)(this.telemetryService, vscode.window.activeTextEditor?.document, {
                codeBlockIndex: e.action.codeBlockIndex.toString(),
                messageId: result.metadata?.modelMessageId ?? '',
                headerRequestId: result.metadata?.responseId ?? '',
                participant: agentId,
                languageId: e.action.languageId ?? '',
                modelId: e.action.modelId ?? '',
                comp_type: compType,
                mode: (0, intents_1.participantIdToModeName)(agentId),
            }, measurements, e.action.kind === 'copy' ? 'conversation.acceptedCopy' : 'conversation.acceptedInsert');
        }
        if (e.action.kind === 'apply') {
            // Note- this event is fired after a "keep"
            this.handleApplyAction(e.action, agentId, result);
        }
    }
    handleApplyAction(e, agentId, result) {
        (0, telemetry_2.sendUserActionTelemetry)(this.telemetryService, vscode.window.activeTextEditor?.document, {
            codeBlockIndex: e.codeBlockIndex.toString(),
            messageId: result.metadata?.modelMessageId ?? '',
            headerRequestId: result.metadata?.responseId ?? '',
            participant: agentId,
            languageId: e.languageId ?? '',
            modelId: e.modelId,
            mode: (0, intents_1.participantIdToModeName)(agentId),
        }, {
            isAgent: agentId === (0, chatAgents_1.getChatParticipantIdFromName)(chatAgents_1.editsAgentName) ? 1 : 0,
            totalLines: e.totalLines,
        }, 'conversation.appliedCodeblock');
    }
    handleFeedback(e, agentId) {
        const document = vscode.window.activeTextEditor?.document;
        const result = e.result;
        const conversation = result.metadata?.responseId && this.conversationStore.getConversation(result.metadata.responseId);
        if (typeof conversation === 'object' && conversation.getLatestTurn().getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse)) {
            this._handleChatUserAction(result.metadata?.sessionId, agentId, conversation, undefined, e);
            return;
        }
        // Note- we can get the agentId from a cancelled request, but not the command, because it can only be retrieved from the result
        /* __GDPR__
        "panel.action.vote" : {
            "owner": "digitarald",
            "comment": "Counts votes on a chat panel response",
            "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Language of the currently open document." },
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for this message request." },
            "direction": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "If the vote was positive or negative." },
            "participant": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The name of the chat participant for this message." },
            "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "The command used for the chat participant." },
            "reason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "Preset value for why the user found the response unhelpful." }
        }
        */
        this.telemetryService.sendMSFTTelemetryEvent('panel.action.vote', {
            languageId: document?.languageId,
            requestId: result.metadata?.responseId,
            participant: agentId,
            command: result.metadata?.command,
            reason: e.unhelpfulReason
        }, {
            direction: e.kind === vscode.ChatResultFeedbackKind.Helpful ? 1 : 2, // map to previous enum values
        });
        (0, telemetry_2.sendUserActionTelemetry)(this.telemetryService, document, {
            rating: e.kind === vscode.ChatResultFeedbackKind.Helpful ? 'positive' : 'negative',
            messageId: result.metadata?.modelMessageId ?? '',
            headerRequestId: result.metadata?.responseId ?? '',
            reason: e.unhelpfulReason ?? ''
        }, {}, 'conversation.messageRating');
    }
    // --- inline
    _handleChatUserAction(sessionId, _agentId, conversation, event, feedback) {
        let InteractiveEditorResponseFeedbackKind;
        (function (InteractiveEditorResponseFeedbackKind) {
            InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Unhelpful"] = 0] = "Unhelpful";
            InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Helpful"] = 1] = "Helpful";
            InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Undone"] = 2] = "Undone";
            InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Accepted"] = 3] = "Accepted";
            InteractiveEditorResponseFeedbackKind[InteractiveEditorResponseFeedbackKind["Bug"] = 4] = "Bug";
        })(InteractiveEditorResponseFeedbackKind || (InteractiveEditorResponseFeedbackKind = {}));
        if (!sessionId) {
            return;
        }
        const response = conversation.getLatestTurn().getMetadata(promptCraftingTypes_1.CopilotInteractiveEditorResponse);
        if (!response) {
            return;
        }
        const interactionOutcome = conversation.getLatestTurn().getMetadata(promptCraftingTypes_1.InteractionOutcome);
        if (!interactionOutcome) {
            return;
        }
        let kind;
        if (event?.action.kind === 'editor') {
            kind = event.action.accepted ? InteractiveEditorResponseFeedbackKind.Accepted : InteractiveEditorResponseFeedbackKind.Undone;
        }
        else if (event?.action.kind === 'bug') {
            kind = InteractiveEditorResponseFeedbackKind.Bug;
        }
        else if (feedback?.kind === vscode.ChatResultFeedbackKind.Helpful) {
            kind = InteractiveEditorResponseFeedbackKind.Helpful;
        }
        else if (feedback?.kind === vscode.ChatResultFeedbackKind.Unhelpful) {
            kind = InteractiveEditorResponseFeedbackKind.Unhelpful;
        }
        if (kind === undefined) {
            return;
        }
        if (kind === InteractiveEditorResponseFeedbackKind.Bug && conversation) {
            this.feedbackReporter.reportInline(conversation, response.promptQuery, interactionOutcome);
            return;
        }
        const userActionProperties = {
            messageId: response.messageId,
        };
        let telemetryEventName;
        const { selection, wholeRange, intent, query } = response.promptQuery;
        // For panel requests, conversation.getLatestTurn() refers to the turn that was voted on
        // (i.e. last message in the conversation _up to this point_), not the last message shown in the panel.
        const requestId = conversation?.getLatestTurn().id;
        const intentId = intent?.id;
        const languageId = response.promptQuery.document.languageId;
        // TODO: Only collect for /fix
        const diagnosticsTelemetryData = (intentId === "fix" /* Intent.Fix */
            ? (0, diagnosticsTelemetry_1.findDiagnosticsTelemetry)(selection, this.languageDiagnosticsService.getDiagnostics(response.promptQuery.document.uri))
            : undefined);
        const isNotebookDocument = (0, notebooks_1.isNotebookCellOrNotebookChatInput)(response.promptQuery.document.uri) ? 1 : 0;
        // TODO: Fix the telemetry event name. This is hit by both inline and panel requests.
        this.surveyService.signalUsage(`inline.${intentId ?? 'default'}`, languageId);
        const sharedProps = {
            languageId: languageId,
            replyType: interactionOutcome.kind,
            conversationId: sessionId,
            requestId: requestId,
            command: intentId
        };
        const editCount = response.telemetry?.editCount ?? 0;
        const editLineCount = response.telemetry?.editLineCount ?? 0;
        const sharedMeasures = {
            selectionLineCount: selection ? Math.abs(selection.end.line - selection.start.line) : -1,
            wholeRangeLineCount: wholeRange ? Math.abs(wholeRange.end.line - wholeRange.start.line) : -1,
            editCount: editCount > 0 ? editCount : -1,
            editLineCount: editLineCount > 0 ? editLineCount : -1,
            isNotebook: isNotebookDocument,
            problemsCount: diagnosticsTelemetryData?.fileDiagnosticsTelemetry.problemsCount ?? 0,
            selectionProblemsCount: diagnosticsTelemetryData?.selectionDiagnosticsTelemetry.problemsCount ?? 0,
            diagnosticsCount: diagnosticsTelemetryData?.fileDiagnosticsTelemetry.diagnosticsCount ?? 0,
            selectionDiagnosticsCount: diagnosticsTelemetryData?.selectionDiagnosticsTelemetry.diagnosticsCount ?? 0,
        };
        const sendInternalTelemetryEvent = (eventName, measurement) => {
            this.telemetryService.sendInternalMSFTTelemetryEvent(eventName, {
                language: languageId,
                intent: intentId,
                query: query,
                conversationId: sessionId,
                requestId: requestId,
                replyType: interactionOutcome.kind,
                problems: diagnosticsTelemetryData?.fileDiagnosticsTelemetry.problems ?? '',
                selectionProblems: diagnosticsTelemetryData?.selectionDiagnosticsTelemetry.problems ?? '',
                diagnosticCodes: diagnosticsTelemetryData?.fileDiagnosticsTelemetry.diagnosticCodes ?? '',
                selectionDiagnosticCodes: diagnosticsTelemetryData?.selectionDiagnosticsTelemetry.diagnosticCodes ?? '',
            }, { isNotebook: isNotebookDocument, ...measurement });
        };
        if (kind === InteractiveEditorResponseFeedbackKind.Accepted && response.editSurvivalTracker) {
            response.editSurvivalTracker.startReporter(res => reportInlineEditSurvivalEvent(res, sharedProps, sharedMeasures));
        }
        response.editSurvivalTracker = undefined; // TODO@jrieken
        if (kind === InteractiveEditorResponseFeedbackKind.Helpful || kind === InteractiveEditorResponseFeedbackKind.Unhelpful) {
            const vote = (kind === InteractiveEditorResponseFeedbackKind.Helpful) ? 1 : 0;
            /* __GDPR__
                "inline.action.vote" : {
                    "owner": "digitarald",
                    "comment": "Metadata about votes on inline code conversations",
                    "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                    "replyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How response is shown in the interface." },
                    "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the inline assistant conversation." },
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                    "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command which was used in providing the response." },
                    "reason": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": false, "comment": "Preset value for why the user found the response unhelpful." },
                    "vote": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the user found the response helpful." },
                    "selectionLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the current selection." },
                    "wholeRangeLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the expanded whole range." },
                    "editCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many edits are suggested." },
                    "editLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in all suggested edits." },
                    "problemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current code." },
                    "selectionProblemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current selected code." },
                    "diagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current code." },
                    "selectionDiagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current selected code." },
                    "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook" }
                }
            */
            // TODO: Fix the telemetry event name. This is hit by both inline and panel requests.
            this.telemetryService.sendMSFTTelemetryEvent('inline.action.vote', {
                ...sharedProps,
                reason: feedback?.unhelpfulReason,
            }, {
                ...sharedMeasures, vote
            });
            sendInternalTelemetryEvent('interactiveSessionVote', { vote });
        }
        else if (kind === InteractiveEditorResponseFeedbackKind.Undone || kind === InteractiveEditorResponseFeedbackKind.Accepted) {
            const accepted = (kind === InteractiveEditorResponseFeedbackKind.Accepted) ? 1 : 0;
            /* __GDPR__
                "inline.done" : {
                    "owner": "digitarald",
                    "comment": "Metadata about an inline code suggestion being accepted or undone",
                    "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
                    "replyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How response is shown in the interface." },
                    "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the inline assistant conversation." },
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                    "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command which was used in providing the response." },
                    "accepted": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the user accepted the suggested code or discarded it." },
                    "selectionLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the current selection." },
                    "wholeRangeLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the expanded whole range." },
                    "editCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many edits are suggested." },
                    "editLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in all suggested edits." },
                    "problemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current code." },
                    "selectionProblemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current selected code." },
                    "diagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current code." },
                    "selectionDiagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current code." },
                    "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook." }
                }
            */
            // TODO: Fix the telemetry event name. This may be hit by both inline and panel requests.
            this.telemetryService.sendMSFTTelemetryEvent('inline.done', sharedProps, {
                ...sharedMeasures, accepted
            });
            sendInternalTelemetryEvent('interactiveSessionDone', { accepted });
        }
        // TODO: Fix the telemetry event name. This is hit by both inline and panel requests.
        switch (kind) {
            case InteractiveEditorResponseFeedbackKind.Helpful:
                userActionProperties['rating'] = 'positive';
                telemetryEventName = 'inlineConversation.messageRating';
                break;
            case InteractiveEditorResponseFeedbackKind.Unhelpful:
                userActionProperties['rating'] = 'negative';
                telemetryEventName = 'inlineConversation.messageRating';
                break;
            case InteractiveEditorResponseFeedbackKind.Undone:
                userActionProperties['action'] = 'undo';
                telemetryEventName = 'inlineConversation.undo';
                break;
            case InteractiveEditorResponseFeedbackKind.Accepted:
                userActionProperties['action'] = 'accept';
                telemetryEventName = 'inlineConversation.accept';
                break;
            case InteractiveEditorResponseFeedbackKind.Bug:
                // internal
                telemetryEventName = '';
                break;
        }
        if (telemetryEventName) {
            (0, telemetry_2.sendUserActionTelemetry)(this.telemetryService, response.promptQuery.document, userActionProperties, {}, telemetryEventName);
        }
    }
};
exports.UserFeedbackService = UserFeedbackService;
exports.UserFeedbackService = UserFeedbackService = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, conversationStore_1.IConversationStore),
    __param(2, feedbackReporter_1.IFeedbackReporter),
    __param(3, surveyService_1.ISurveyService),
    __param(4, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(5, multiFileEditQualityTelemetry_1.IMultiFileEditInternalTelemetryService),
    __param(6, notebookService_1.INotebookService)
], UserFeedbackService);
function reportInlineEditSurvivalEvent(res, sharedProps, sharedMeasures) {
    /* __GDPR__
        "inline.trackEditSurvival" : {
            "owner": "hediet",
            "comment": "Tracks how much percent of the AI edits surived after 5 minutes of accepting",
            "languageId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The current file language." },
            "replyType": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "How response is shown in the interface." },
            "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the inline assistant conversation." },
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "command": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The command which was used in providing the response." },
            "survivalRateFourGram": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the AI edit is still present in the document." },
            "survivalRateNoRevert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The rate between 0 and 1 of how much of the ranges the AI touched ended up being reverted." },
            "didBranchChange": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Indicates if the branch changed in the meantime. If the branch changed (value is 1), this event should probably be ignored." },
            "timeDelayMs": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time delay between the user accepting the edit and measuring the survival rate." },
            "selectionLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the current selection." },
            "wholeRangeLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in the expanded whole range." },
            "editCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many edits are suggested." },
            "editLineCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many lines are in all suggested edits." },
            "problemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current code." },
            "selectionProblemsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many problems are in the current selected code." },
            "diagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current code." },
            "selectionDiagnosticsCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "How many diagnostic codes are in the current selected code." },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook" }
        }
    */
    res.telemetryService.sendMSFTTelemetryEvent('inline.trackEditSurvival', sharedProps, {
        ...sharedMeasures,
        survivalRateFourGram: res.fourGram,
        survivalRateNoRevert: res.noRevert,
        timeDelayMs: res.timeDelayMs,
        didBranchChange: res.didBranchChange ? 1 : 0,
    });
}
const outcomes = new Map([
    [vscode.ChatEditingSessionActionOutcome.Accepted, 'accepted'],
    [vscode.ChatEditingSessionActionOutcome.Rejected, 'rejected'],
    [vscode.ChatEditingSessionActionOutcome.Saved, 'saved']
]);
//# sourceMappingURL=userActions.js.map