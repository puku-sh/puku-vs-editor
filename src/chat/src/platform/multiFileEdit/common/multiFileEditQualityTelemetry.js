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
exports.MultiFileEditInternalTelemetryService = exports.IMultiFileEditInternalTelemetryService = void 0;
const services_1 = require("../../../util/common/services");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const chatSessionService_1 = require("../../chat/common/chatSessionService");
const logService_1 = require("../../log/common/logService");
const alternativeContent_1 = require("../../notebook/common/alternativeContent");
const notebookService_1 = require("../../notebook/common/notebookService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const workspaceService_1 = require("../../workspace/common/workspaceService");
exports.IMultiFileEditInternalTelemetryService = (0, services_1.createServiceIdentifier)('IMultiFileEditInternalTelemetryService');
let MultiFileEditInternalTelemetryService = class MultiFileEditInternalTelemetryService extends lifecycle_1.Disposable {
    constructor(telemetryService, workspaceService, notebookService, logService, alternativeNotebookContent, chatSessionService) {
        super();
        this.telemetryService = telemetryService;
        this.workspaceService = workspaceService;
        this.notebookService = notebookService;
        this.logService = logService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.chatSessionService = chatSessionService;
        // URI -> chatResponseId -> edits
        this.editedFiles = new map_1.ResourceMap();
        // sessionId -> (URI -> TextDocument | NotebookDocument)
        this.editedDocuments = new Map();
        this._register(this.chatSessionService.onDidDisposeChatSession(sessionId => {
            this.editedDocuments.delete(sessionId);
        }));
    }
    storeEditPrompt(edit, telemetryOptions) {
        this.logService.debug(`Storing edit prompt for ${edit.uri.toString()} with request ID ${telemetryOptions.chatRequestId}`);
        const existingEditsForUri = this.editedFiles.get(edit.uri) ?? new Map();
        const existingEditsForUriInRequest = existingEditsForUri.get(telemetryOptions.chatRequestId) ?? [];
        existingEditsForUriInRequest.push({ ...edit, ...telemetryOptions });
        existingEditsForUri.set(telemetryOptions.chatRequestId, existingEditsForUriInRequest);
        this.editedFiles.set(edit.uri, existingEditsForUri);
        if (edit.document && telemetryOptions.chatSessionId) {
            let sessionMap = this.editedDocuments.get(telemetryOptions.chatSessionId);
            if (!sessionMap) {
                sessionMap = new map_1.ResourceMap();
                this.editedDocuments.set(telemetryOptions.chatSessionId, sessionMap);
            }
            sessionMap.set(edit.uri, edit.document);
        }
    }
    async sendEditPromptAndResult(telemetry, uri, outcome) {
        const editsForUri = this.editedFiles.get(uri);
        if (!editsForUri) {
            return;
        }
        if (editsForUri.size > 1) {
            // Multiple edit turns have affected this file
            // i.e. edit -> edit -> accept/reject
            // Skip sending telemetry for files which originated from multiple SD prompts
            // and reset our tracking
            this.logService.debug(`Skipping telemetry for ${uri.toString()} with request ID ${telemetry.chatRequestId} due to multiple edit turns`);
            this.editedFiles.delete(uri);
            return;
        }
        const editsForUriInChatRequest = editsForUri.get(telemetry.chatRequestId);
        if (!editsForUriInChatRequest) {
            return;
        }
        if (editsForUriInChatRequest.length > 1) {
            // This file has been edited twice in one edit turn,
            // which can happen if the LLM iterates on a file in agentic edit mode
            // and can also happen when the LLM ignores instructions in non-agentic edits.
            // Again, skip sending telemetry for files which originated from multiple SD prompts
            // and reset our tracking
            this.logService.debug(`Skipping telemetry for ${uri.toString()} with request ID ${telemetry.chatRequestId} due to multiple edits in one turn`);
            this.editedFiles.delete(uri);
            return;
        }
        try {
            const edit = editsForUriInChatRequest[0];
            // NOTE: this may not be what's on disk, but should reflect the outcome of accepting/rejecting
            // regardless of whether the user is an autosave user / has saved the edits by now
            let languageId = undefined;
            let documentText = undefined;
            if (edit.chatSessionId) {
                const editedDocument = this.editedDocuments.get(edit.chatSessionId)?.get(uri);
                if (editedDocument && 'getText' in editedDocument) {
                    languageId = editedDocument.languageId;
                    documentText = editedDocument.getText();
                }
            }
            if (!documentText && !languageId) {
                if (this.notebookService.hasSupportedNotebooks(uri)) {
                    const snapshot = await this.workspaceService.openNotebookDocumentAndSnapshot(uri, this.alternativeNotebookContent.getFormat(undefined));
                    languageId ??= snapshot.languageId;
                    documentText ??= snapshot.getText();
                }
                else {
                    const textDocument = await this.workspaceService.openTextDocument(uri);
                    languageId = textDocument.languageId;
                    documentText = textDocument.getText();
                }
            }
            this.telemetryService.sendInternalMSFTTelemetryEvent('multiFileEditQuality', {
                requestId: telemetry.chatRequestId,
                speculationRequestId: edit.speculationRequestId,
                // NOTE: for now this will always be false because in agent mode the edits are invoked via the MappedEditsProvider, so we lose the turn ID
                isAgent: String(edit.isAgent),
                outcome,
                prompt: edit.prompt,
                languageId,
                file: documentText, // Note that this is not necessarily the same as the model output because the user may have made manual edits
                mapper: edit.mapper
            }, {
                isNotebook: this.notebookService.hasSupportedNotebooks(uri) ? 1 : 0
            });
            const gitHubEnhancedTelemetryProperties = (0, telemetry_1.multiplexProperties)({
                headerRequestId: edit.speculationRequestId,
                providerId: edit.mapper,
                languageId: languageId,
                messageText: edit.prompt,
                suggestion: outcome,
                completionTextJson: documentText, // Note that this is not necessarily the same as the model output because the user may have made manual edits
                conversationId: edit.chatSessionId,
                messageId: edit.chatRequestId,
            });
            this.telemetryService.sendEnhancedGHTelemetryEvent('fastApply/editOutcome', gitHubEnhancedTelemetryProperties);
            this.logService.debug(`Sent telemetry for ${uri.toString()} with request ID ${edit.chatRequestId}, SD request ID ${edit.speculationRequestId}, and outcome ${outcome}`);
        }
        catch (e) {
            this.logService.error('Error sending multi-file edit telemetry', JSON.stringify(e));
        }
        finally {
            this.editedFiles.delete(uri);
        }
    }
};
exports.MultiFileEditInternalTelemetryService = MultiFileEditInternalTelemetryService;
exports.MultiFileEditInternalTelemetryService = MultiFileEditInternalTelemetryService = __decorate([
    __param(0, telemetry_1.ITelemetryService),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, notebookService_1.INotebookService),
    __param(3, logService_1.ILogService),
    __param(4, alternativeContent_1.IAlternativeNotebookContentService),
    __param(5, chatSessionService_1.IChatSessionService)
], MultiFileEditInternalTelemetryService);
//# sourceMappingURL=multiFileEditQualityTelemetry.js.map