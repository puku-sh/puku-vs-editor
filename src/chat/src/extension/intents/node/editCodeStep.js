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
exports.EditCodeStep = exports.EditCodeStepTurnMetaData = exports.PreviousEditCodeStep = exports.EditCodeStepTelemetryInfo = void 0;
exports.isNotebookVariable = isNotebookVariable;
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../util/common/notebooks");
const types_1 = require("../../../util/common/types");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const resources_1 = require("../../../util/vs/base/common/resources");
const types_2 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const intents_1 = require("../../prompt/common/intents");
class EditCodeStepTelemetryInfo {
    constructor() {
        this.codeblockUris = new map_1.ResourceSet();
        this.codeblockCount = 0;
        this.codeblockWithUriCount = 0;
        this.codeblockWithElidedCodeCount = 0;
        this.shellCodeblockCount = 0;
        this.shellCodeblockWithUriCount = 0;
        this.shellCodeblockWithElidedCodeCount = 0;
    }
}
exports.EditCodeStepTelemetryInfo = EditCodeStepTelemetryInfo;
class PreviousEditCodeStep {
    static fromChatResultMetaData(chatResult) {
        const edits = chatResult.metadata?.edits;
        if (isEditHistoryDTO(edits)) {
            const entries = edits.workingSet.map(entry => {
                return {
                    document: { uri: uri_1.URI.revive(entry.uri), languageId: entry.languageId, version: entry.version, text: entry.text },
                    state: entry.state,
                };
            });
            const promptInstructions = edits.promptInstructions?.map(entry => {
                return {
                    document: { uri: uri_1.URI.revive(entry.uri), version: entry.version, text: entry.text }
                };
            }) ?? [];
            return new PreviousEditCodeStep(entries, edits.request, edits.response, promptInstructions);
        }
        return undefined;
    }
    static fromTurn(turn) {
        let editCodeStep = turn.getMetadata(EditCodeStepTurnMetaData)?.value;
        if (!editCodeStep && turn.responseChatResult) {
            editCodeStep = PreviousEditCodeStep.fromChatResultMetaData(turn.responseChatResult);
            if (editCodeStep) {
                turn.setMetadata(new EditCodeStepTurnMetaData(editCodeStep));
            }
        }
        return editCodeStep;
    }
    static fromEditCodeStep(editCodeStep) {
        const workingSet = editCodeStep.workingSet.map(entry => ({
            document: { uri: entry.document.uri, languageId: entry.document.languageId, version: entry.document.version, text: entry.document.getText() },
            state: entry.state,
        }));
        const promptInstructions = editCodeStep.promptInstructions.map(entry => ({
            document: { uri: entry.uri, version: entry.version, text: entry.getText() }
        }));
        return new PreviousEditCodeStep(workingSet, editCodeStep.userMessage, editCodeStep.assistantReply, promptInstructions);
    }
    constructor(workingSet, request, response, promptInstructions) {
        this.workingSet = workingSet;
        this.request = request;
        this.response = response;
        this.promptInstructions = promptInstructions;
    }
    setWorkingSetEntryState(uri, state) {
        for (const entry of this.workingSet) {
            if ((0, resources_1.isEqual)(entry.document.uri, uri)) {
                entry.state = this._getUpdatedState(entry, state.accepted, state.hasRemainingEdits);
            }
        }
    }
    _getUpdatedState(workingSetEntry, accepted, hasRemainingEdits) {
        const { state } = workingSetEntry;
        if (state === intents_1.WorkingSetEntryState.Accepted || state === intents_1.WorkingSetEntryState.Rejected) {
            return state;
        }
        if (accepted && !hasRemainingEdits) {
            return intents_1.WorkingSetEntryState.Accepted;
        }
        if (!accepted && !hasRemainingEdits) {
            return intents_1.WorkingSetEntryState.Rejected;
        }
        // TODO: reflect partial accepts/rejects within a file when we add support for that
        return intents_1.WorkingSetEntryState.Undecided;
    }
    toChatResultMetaData() {
        const edits = {
            workingSet: this.workingSet.map(entry => {
                return {
                    uri: entry.document.uri,
                    text: entry.document.text,
                    languageId: entry.document.languageId,
                    version: entry.document.version,
                    state: entry.state,
                };
            }),
            promptInstructions: this.promptInstructions.map(entry => ({
                uri: entry.document.uri,
                text: entry.document.text,
                version: entry.document.version
            })),
            request: this.request,
            response: this.response
        };
        return { edits };
    }
}
exports.PreviousEditCodeStep = PreviousEditCodeStep;
class EditCodeStepTurnMetaData {
    constructor(value) {
        this.value = value;
    }
}
exports.EditCodeStepTurnMetaData = EditCodeStepTurnMetaData;
class EditCodeStep {
    static async create(instantiationService, history, chatVariables, endpoint) {
        const factory = instantiationService.createInstance(EditCodeStepFactory);
        return factory.createNextStep(history, chatVariables, endpoint);
    }
    get userMessage() {
        return this._userMessage;
    }
    get assistantReply() {
        return this._assistantReply;
    }
    get workingSet() {
        return this._workingSet;
    }
    get promptInstructions() {
        return this._promptInstructions;
    }
    constructor(previousStep, workingSet, _promptInstructions) {
        this.previousStep = previousStep;
        this._promptInstructions = _promptInstructions;
        /**
         * The user message that was sent with this step
         */
        this._userMessage = '';
        /**
         * The assistant reply that came back with this step
         */
        this._assistantReply = '';
        this.telemetryInfo = new EditCodeStepTelemetryInfo();
        this._workingSet = workingSet;
    }
    setUserMessage(userMessage) {
        this._userMessage = (0, globalStringUtils_1.getTextPart)(userMessage.content);
    }
    setAssistantReply(reply) {
        this._assistantReply = reply;
    }
    setWorkingSetEntryState(uri, state) {
        for (const entry of this._workingSet) {
            if ((0, resources_1.isEqual)(entry.document.uri, uri)) {
                entry.state = state;
            }
        }
    }
    getPredominantScheme() {
        const schemes = new Map();
        for (const entry of this._workingSet) {
            const scheme = entry.document.uri.scheme;
            schemes.set(scheme, (schemes.get(scheme) ?? 0) + 1);
        }
        let maxCount = 0;
        let maxScheme = undefined;
        for (const [scheme, count] of schemes) {
            if (count > maxCount) {
                maxCount = count;
                maxScheme = scheme;
            }
        }
        return maxScheme;
    }
}
exports.EditCodeStep = EditCodeStep;
let EditCodeStepFactory = class EditCodeStepFactory {
    constructor(_workspaceService, _notebookService, alternativeNotebookContentService) {
        this._workspaceService = _workspaceService;
        this._notebookService = _notebookService;
        this.alternativeNotebookContentService = alternativeNotebookContentService;
    }
    /**
     * Update the working set taking into account the passed in chat variables.
     * Returns the filtered chat variables that should be used for rendering
     */
    async createNextStep(history, chatVariables, endpoint) {
        const findPreviousStepEntry = () => {
            for (let i = history.length - 1; i >= 0; i--) {
                const entry = PreviousEditCodeStep.fromTurn(history[i]);
                if (entry) {
                    return entry;
                }
            }
            return null;
        };
        const prevStep = findPreviousStepEntry();
        const workingSet = [];
        const getWorkingSetEntry = (uri) => {
            return workingSet.find(entry => (0, resources_1.isEqual)(entry.document.uri, uri));
        };
        const getCurrentOrPreviousWorkingSetEntryState = (uri) => {
            const currentEntry = getWorkingSetEntry(uri);
            if (currentEntry) {
                return currentEntry.state;
            }
            if (prevStep) {
                const previousStepEntry = prevStep.workingSet.find(entry => (0, resources_1.isEqual)(entry.document.uri, uri));
                if (previousStepEntry) {
                    return previousStepEntry.state;
                }
            }
            return intents_1.WorkingSetEntryState.Initial;
        };
        const addWorkingSetEntry = async (documentOrCellUri, isMarkedReadonly, range) => {
            try {
                const uri = this._notebookService.hasSupportedNotebooks(documentOrCellUri) ? ((0, notebooks_1.findNotebook)(documentOrCellUri, this._workspaceService.notebookDocuments)?.uri ?? documentOrCellUri) : documentOrCellUri;
                if (!getWorkingSetEntry(uri)) {
                    const state = getCurrentOrPreviousWorkingSetEntryState(uri);
                    if (this._notebookService.hasSupportedNotebooks(uri)) {
                        const format = this.alternativeNotebookContentService.getFormat(endpoint);
                        const [document, notebook] = await Promise.all([
                            this._workspaceService.openNotebookDocumentAndSnapshot(uri, format),
                            this._workspaceService.openNotebookDocument(uri)
                        ]);
                        const cell = (0, notebooks_1.findCell)(documentOrCellUri, notebook);
                        if (cell) {
                            range = range ?? new vscodeTypes_1.Range(cell.document.lineAt(0).range.start, cell.document.lineAt(cell.document.lineCount - 1).range.end);
                            range = (0, alternativeContent_1.getAltNotebookRange)(range, cell.document.uri, document.document, format);
                        }
                        else {
                            range = undefined;
                        }
                        workingSet.push({
                            state: state,
                            document,
                            isMarkedReadonly,
                            range
                        });
                    }
                    else {
                        workingSet.push({
                            state: state,
                            document: await this._workspaceService.openTextDocumentAndSnapshot(uri),
                            isMarkedReadonly,
                            range
                        });
                    }
                }
            }
            catch (err) {
                return null;
            }
        };
        // here we reverse to account for the UI passing the elements in reversed order
        chatVariables = chatVariables.reverse();
        const promptInstructions = [];
        // We extract all files or selections from the chat variables
        const otherChatVariables = [];
        for (const chatVariable of chatVariables) {
            if ((0, chatVariablesCollection_1.isPromptInstruction)(chatVariable)) {
                otherChatVariables.push(chatVariable.reference);
                // take a snapshot of the prompt instruction file so we know if it changed
                if ((0, types_1.isUri)(chatVariable.value)) {
                    const textDocument = await this._workspaceService.openTextDocument(chatVariable.value);
                    promptInstructions.push(textDocumentSnapshot_1.TextDocumentSnapshot.create(textDocument));
                }
            }
            else if (isNotebookVariable(chatVariable.value)) {
                const [notebook,] = (0, notebooks_1.getNotebookAndCellFromUri)(chatVariable.value, this._workspaceService.notebookDocuments);
                if (!notebook) {
                    continue;
                }
                // No need to explicitly add the notebook to the working set, let the user do this.
                if (chatVariable.value.scheme !== network_1.Schemas.vscodeNotebookCellOutput) {
                    await addWorkingSetEntry(notebook.uri, false);
                }
                if (chatVariable.value.scheme === network_1.Schemas.vscodeNotebookCellOutput) {
                    otherChatVariables.push(chatVariable.reference);
                }
            }
            else if ((0, types_1.isUri)(chatVariable.value)) {
                await addWorkingSetEntry(chatVariable.value, chatVariable.isMarkedReadonly);
            }
            else if ((0, types_1.isLocation)(chatVariable.value)) {
                await addWorkingSetEntry(chatVariable.value.uri, chatVariable.isMarkedReadonly, chatVariable.value.range);
            }
            else {
                otherChatVariables.push(chatVariable.reference);
            }
        }
        return {
            editCodeStep: new EditCodeStep(prevStep, workingSet, promptInstructions),
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(otherChatVariables)
        };
    }
};
EditCodeStepFactory = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, notebookService_1.INotebookService),
    __param(2, alternativeContent_1.IAlternativeNotebookContentService)
], EditCodeStepFactory);
function isNotebookVariable(chatVariableValue) {
    if (!chatVariableValue || !(0, types_1.isUri)(chatVariableValue)) {
        return false;
    }
    return chatVariableValue.scheme === network_1.Schemas.vscodeNotebookCell || chatVariableValue.scheme === network_1.Schemas.vscodeNotebookCellOutput;
}
function isWorkingSetEntryDTO(data) {
    return data && (0, uri_1.isUriComponents)(data.uri) && (0, types_2.isString)(data.text) && (0, types_2.isNumber)(data.version) && (0, types_2.isString)(data.languageId) && (0, types_2.isNumber)(data.state);
}
function isEditHistoryDTO(data) {
    return data && Array.isArray(data.workingSet) && data.workingSet.every(isWorkingSetEntryDTO) && (0, types_2.isString)(data.request) && (0, types_2.isString)(data.response);
}
//# sourceMappingURL=editCodeStep.js.map