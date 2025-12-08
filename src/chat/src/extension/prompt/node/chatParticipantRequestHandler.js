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
exports.ChatParticipantRequestHandler = void 0;
exports.addHistoryToConversation = addHistoryToConversation;
const l10n = __importStar(require("@vscode/l10n"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const openai_1 = require("../../../platform/networking/common/openai");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const fileTree_1 = require("../../../util/common/fileTree");
const types_1 = require("../../../util/common/types");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const network_1 = require("../../../util/vs/base/common/network");
const objects_1 = require("../../../util/vs/base/common/objects");
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const commandService_1 = require("../../commands/node/commandService");
const constants_1 = require("../../common/constants");
const conversationStore_1 = require("../../conversationStore/node/conversationStore");
const intentService_1 = require("../../intents/node/intentService");
const unknownIntent_1 = require("../../intents/node/unknownIntent");
const chatVariablesCollection_1 = require("../common/chatVariablesCollection");
const conversation_1 = require("../common/conversation");
const intents_1 = require("../common/intents");
const chatParticipantTelemetry_1 = require("./chatParticipantTelemetry");
const defaultIntentRequestHandler_1 = require("./defaultIntentRequestHandler");
const documentContext_1 = require("./documentContext");
const intentDetector_1 = require("./intentDetector");
/**
 * Handles a single chat request:
 * 1) selects intent
 * 2) invoke intent via `IIntentRequestHandler/AbstractIntentRequestHandler`
 */
let ChatParticipantRequestHandler = class ChatParticipantRequestHandler {
    constructor(rawHistory, request, stream, token, chatAgentArgs, onPaused, _instantiationService, _endpointProvider, _commandService, _ignoreService, _intentService, _conversationStore, tabsAndEditorsService, _logService, _authService) {
        this.rawHistory = rawHistory;
        this.request = request;
        this.token = token;
        this.chatAgentArgs = chatAgentArgs;
        this.onPaused = onPaused;
        this._instantiationService = _instantiationService;
        this._endpointProvider = _endpointProvider;
        this._commandService = _commandService;
        this._ignoreService = _ignoreService;
        this._intentService = _intentService;
        this._conversationStore = _conversationStore;
        this._logService = _logService;
        this._authService = _authService;
        this.location = this.getLocation(request);
        this.intentDetector = this._instantiationService.createInstance(intentDetector_1.IntentDetector);
        this.stream = stream;
        if (request.location2 instanceof vscodeTypes_1.ChatRequestEditorData) {
            // don't send back references that are the same as the document as the one from which
            // the request has been made
            const documentUri = request.location2.document.uri;
            this.stream = chatResponseStreamImpl_1.ChatResponseStreamImpl.filter(stream, part => {
                if (part instanceof vscodeTypes_1.ChatResponseReferencePart || part instanceof vscodeTypes_1.ChatResponseProgressPart2) {
                    const uri = uri_1.URI.isUri(part.value) ? part.value : part.value.uri;
                    return !(0, resources_1.isEqual)(uri, documentUri);
                }
                return true;
            });
        }
        const { turns, sessionId } = _instantiationService.invokeFunction(accessor => addHistoryToConversation(accessor, rawHistory));
        (0, conversation_1.normalizeSummariesOnRounds)(turns);
        const actualSessionId = sessionId ?? (0, uuid_1.generateUuid)();
        this.documentContext = documentContext_1.IDocumentContext.inferDocumentContext(request, tabsAndEditorsService.activeTextEditor, turns);
        this.chatTelemetry = this._instantiationService.createInstance(chatParticipantTelemetry_1.ChatTelemetryBuilder, Date.now(), actualSessionId, this.documentContext, turns.length === 0, this.request);
        const latestTurn = conversation_1.Turn.fromRequest(this.chatTelemetry.telemetryMessageId, this.request);
        this.conversation = new conversation_1.Conversation(actualSessionId, turns.concat(latestTurn));
        this.turn = latestTurn;
    }
    getLocation(request) {
        if (request.location2 instanceof vscodeTypes_1.ChatRequestEditorData) {
            return commonTypes_1.ChatLocation.Editor;
        }
        else if (request.location2 instanceof vscodeTypes_1.ChatRequestNotebookData) {
            return commonTypes_1.ChatLocation.Notebook;
        }
        switch (request.location) { // deprecated, but location2 does not yet allow to distinguish between panel, editing session and others
            case vscodeTypes_1.ChatLocation.Editor:
                return commonTypes_1.ChatLocation.Editor;
            case vscodeTypes_1.ChatLocation.Panel:
                return commonTypes_1.ChatLocation.Panel;
            case vscodeTypes_1.ChatLocation.Terminal:
                return commonTypes_1.ChatLocation.Terminal;
            default:
                return commonTypes_1.ChatLocation.Other;
        }
    }
    async sanitizeVariables() {
        const variablePromises = this.request.references.map(async (ref) => {
            const uri = (0, types_1.isLocation)(ref.value) ? ref.value.uri : uri_1.URI.isUri(ref.value) ? ref.value : undefined;
            if (!uri) {
                return ref;
            }
            if (uri.scheme === network_1.Schemas.untitled) {
                return ref;
            }
            let removeVariable;
            try {
                // Filter out variables which contain paths which are ignored
                removeVariable = await this._ignoreService.isCopilotIgnored(uri);
            }
            catch {
                // Non-existent files will be handled elsewhere. This might be a virtual document so it's ok if the fs service can't find it.
            }
            if (removeVariable && ref.range) {
                // Also sanitize the user message since file paths are sensitive
                this.turn.request.message = this.turn.request.message.slice(0, ref.range[0]) + this.turn.request.message.slice(ref.range[1]);
            }
            return removeVariable ? null : ref;
        });
        const newVariables = (0, arrays_1.coalesce)(await Promise.all(variablePromises));
        return { ...this.request, references: newVariables };
    }
    async _shouldAskForPermissiveAuth() {
        // The user has confirmed that they want to auth, so prompt them.
        const findConfirmRequest = this.request.acceptedConfirmationData?.find(ref => ref?.authPermissionPrompted);
        if (findConfirmRequest) {
            this.turn.request.message = this.request.prompt;
            return false;
        }
        // GitHub authentication removed - always return false
        return false;
    }
    async getResult() {
        if (await this._shouldAskForPermissiveAuth()) {
            // Return a random response
            return {
                metadata: {
                    modelMessageId: this.turn.responseId ?? '',
                    responseId: this.turn.id,
                    sessionId: this.conversation.sessionId,
                    agentId: this.chatAgentArgs.agentId,
                    command: this.request.command,
                }
            };
        }
        this._logService.trace(`[${commonTypes_1.ChatLocation.toStringShorter(this.location)}] chat request received from extension host`);
        try {
            // sanitize the variables of all requests
            // this is done here because all intents must honor ignored files
            this.request = await this.sanitizeVariables();
            const command = this.chatAgentArgs.intentId ?
                this._commandService.getCommand(this.chatAgentArgs.intentId, this.location) :
                undefined;
            let result = this.checkCommandUsage(command);
            if (!result) {
                // this is norm-case, e.g checkCommandUsage didn't produce an error-result
                // and we proceed with the actual intent invocation
                const history = this.conversation.turns.slice(0, -1);
                const intent = await this.selectIntent(command, history);
                let chatResult;
                if (typeof intent.handleRequest === 'function') {
                    chatResult = intent.handleRequest(this.conversation, this.request, this.stream, this.token, this.documentContext, this.chatAgentArgs.agentName, this.location, this.chatTelemetry, this.onPaused);
                }
                else {
                    const intentHandler = this._instantiationService.createInstance(defaultIntentRequestHandler_1.DefaultIntentRequestHandler, intent, this.conversation, this.request, this.stream, this.token, this.documentContext, this.location, this.chatTelemetry, undefined, this.onPaused);
                    chatResult = intentHandler.getResult();
                }
                if (!this.request.isParticipantDetected) {
                    this.intentDetector.collectIntentDetectionContextInternal(this.turn.request.message, this.request.enableCommandDetection ? intent.id : 'none', new chatVariablesCollection_1.ChatVariablesCollection(this.request.references), this.location, history, this.documentContext?.document);
                }
                result = await chatResult;
                const endpoint = await this._endpointProvider.getChatEndpoint(this.request);
                result.details = this._authService.copilotToken?.isNoAuthUser ?
                    `${endpoint.name}` :
                    `${endpoint.name} • ${endpoint.multiplier ?? 0}x`;
            }
            this._conversationStore.addConversation(this.turn.id, this.conversation);
            // mixin fixed metadata shape into result. Modified in place because the object is already
            // cached in the conversation store and we want the full information when looking this up
            // later
            (0, objects_1.mixin)(result, {
                metadata: {
                    modelMessageId: this.turn.responseId ?? '',
                    responseId: this.turn.id,
                    sessionId: this.conversation.sessionId,
                    agentId: this.chatAgentArgs.agentId,
                    command: this.request.command
                }
            }, true);
            return result;
        }
        catch (err) {
            // TODO This method should not throw at all, but return a result with errorDetails, and call the IConversationStore
            throw err;
        }
    }
    async selectIntent(command, history) {
        if (!command?.intent && this.location === commonTypes_1.ChatLocation.Editor) { // TODO@jrieken do away with location specific code
            let preferredIntent;
            if (this.documentContext && this.request.attempt === 0 && history.length === 0) {
                if (this.documentContext.selection.isEmpty && this.documentContext.document.lineAt(this.documentContext.selection.start.line).text.trim() === '') {
                    preferredIntent = "generate" /* Intent.Generate */;
                }
                else if (!this.documentContext.selection.isEmpty && this.documentContext.selection.start.line !== this.documentContext.selection.end.line) {
                    preferredIntent = "edit" /* Intent.Edit */;
                }
            }
            if (preferredIntent) {
                return this._intentService.getIntent(preferredIntent, this.location) ?? this._intentService.unknownIntent;
            }
        }
        return command?.intent ?? this._intentService.unknownIntent;
    }
    checkCommandUsage(command) {
        if (command?.intent && !(command.intent.commandInfo?.allowsEmptyArgs ?? true) && !this.turn.request.message) {
            const commandAgent = (0, constants_1.getAgentForIntent)(command.intent.id, this.location);
            let usage = '';
            if (commandAgent) {
                // If the command was used, it must have an agent
                usage = `@${commandAgent.agent} `;
                if (commandAgent.command) {
                    usage += ` /${commandAgent.command}`;
                }
                usage += ` ${command.details}`;
            }
            const message = l10n.t(`Please specify a question when using this command.\n\nUsage: {0}`, usage);
            const chatResult = { errorDetails: { message } };
            this.turn.setResponse(conversation_1.TurnStatus.Error, { type: 'meta', message }, undefined, chatResult);
            return chatResult;
        }
    }
};
exports.ChatParticipantRequestHandler = ChatParticipantRequestHandler;
exports.ChatParticipantRequestHandler = ChatParticipantRequestHandler = __decorate([
    __param(6, instantiation_1.IInstantiationService),
    __param(7, endpointProvider_1.IEndpointProvider),
    __param(8, commandService_1.ICommandService),
    __param(9, ignoreService_1.IIgnoreService),
    __param(10, intentService_1.IIntentService),
    __param(11, conversationStore_1.IConversationStore),
    __param(12, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(13, logService_1.ILogService),
    __param(14, authentication_1.IAuthenticationService)
], ChatParticipantRequestHandler);
function addHistoryToConversation(accessor, history) {
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const turns = [];
    let sessionId;
    let previousChatRequestTurn;
    for (const entry of history) {
        // The extension API model technically supports arbitrary requests/responses not in pairs, but this isn't used anywhere,
        // so we can just fit this to our Conversation model for now.
        if (entry instanceof vscodeTypes_1.ChatRequestTurn) {
            previousChatRequestTurn = entry;
        }
        else {
            const existingTurn = instaService.invokeFunction(findExistingTurnFromVSCodeChatHistoryTurn, entry);
            if (existingTurn) {
                turns.push(existingTurn);
            }
            else {
                if (previousChatRequestTurn) {
                    const deserializedTurn = instaService.invokeFunction(createTurnFromVSCodeChatHistoryTurns, previousChatRequestTurn, entry);
                    previousChatRequestTurn = undefined;
                    turns.push(deserializedTurn);
                }
            }
            const copilotResult = entry.result;
            if (typeof copilotResult.metadata?.sessionId === 'string') {
                sessionId = copilotResult.metadata.sessionId;
            }
        }
    }
    return { turns, sessionId };
}
/**
 * Try to find an existing `Turn` instance that we created previously based on the responseId of a vscode turn.
 */
function findExistingTurnFromVSCodeChatHistoryTurn(accessor, turn) {
    const conversationStore = accessor.get(conversationStore_1.IConversationStore);
    const responseId = getResponseIdFromVSCodeChatHistoryTurn(turn);
    const conversation = responseId ? conversationStore.getConversation(responseId) : undefined;
    return conversation?.turns.find(turn => turn.id === responseId);
}
function getResponseIdFromVSCodeChatHistoryTurn(turn) {
    if (turn instanceof vscodeTypes_1.ChatResponseTurn) {
        const lastEntryResult = turn.result;
        return lastEntryResult?.metadata?.responseId;
    }
    return undefined;
}
/**
 * Try as best as possible to create a `Turn` object from data that comes from vscode.
 */
function createTurnFromVSCodeChatHistoryTurns(accessor, chatRequestTurn, chatResponseTurn) {
    const commandService = accessor.get(commandService_1.ICommandService);
    const workspaceService = accessor.get(workspaceService_1.IWorkspaceService);
    const instaService = accessor.get(instantiation_1.IInstantiationService);
    const currentTurn = new conversation_1.Turn(undefined, { message: chatRequestTurn.prompt, type: 'user' }, new chatVariablesCollection_1.ChatVariablesCollection(chatRequestTurn.references), chatRequestTurn.toolReferences.map(intents_1.InternalToolReference.from), chatRequestTurn.editedFileEvents);
    // Take just the content messages
    const content = chatResponseTurn.response.map(r => {
        if (r instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
            return r.value.value;
        }
        else if (r instanceof vscodeTypes_1.ChatResponseFileTreePart) {
            return (0, fileTree_1.fileTreePartToMarkdown)(r);
        }
        else if ('content' in r) {
            return r.content;
        }
        else if (r instanceof vscodeTypes_1.ChatResponseAnchorPart) {
            return anchorPartToMarkdown(workspaceService, r);
        }
        else {
            return null;
        }
    }).filter(Boolean).join('');
    const intentId = chatResponseTurn.command || (0, chatAgents_1.getChatParticipantNameFromId)(chatResponseTurn.participant);
    const command = commandService.getCommand(intentId, commonTypes_1.ChatLocation.Panel);
    let status;
    if (!chatResponseTurn.result.errorDetails) {
        status = conversation_1.TurnStatus.Success;
    }
    else if (chatResponseTurn.result.errorDetails?.responseIsFiltered) {
        if (chatResponseTurn.result.metadata?.category === openai_1.FilterReason.Prompt) {
            status = conversation_1.TurnStatus.PromptFiltered;
        }
        else {
            status = conversation_1.TurnStatus.Filtered;
        }
    }
    else if (chatResponseTurn.result.errorDetails.message === 'Cancelled' || chatResponseTurn.result.errorDetails.message === commonTypes_1.CanceledMessage.message) {
        status = conversation_1.TurnStatus.Cancelled;
    }
    else {
        status = conversation_1.TurnStatus.Error;
    }
    currentTurn.setResponse(status, { message: content, type: 'model', name: command?.commandId || unknownIntent_1.UnknownIntent.ID }, undefined, chatResponseTurn.result);
    const turnMetadata = chatResponseTurn.result.metadata;
    if (turnMetadata?.renderedGlobalContext) {
        const cacheKey = turnMetadata.globalContextCacheKey ?? instaService.invokeFunction(conversation_1.getGlobalContextCacheKey);
        currentTurn.setMetadata(new conversation_1.GlobalContextMessageMetadata(turnMetadata?.renderedGlobalContext, cacheKey));
    }
    if (turnMetadata?.renderedUserMessage) {
        currentTurn.setMetadata(new conversation_1.RenderedUserMessageMetadata(turnMetadata.renderedUserMessage));
    }
    return currentTurn;
}
function anchorPartToMarkdown(workspaceService, anchor) {
    let text;
    let path;
    if (uri_1.URI.isUri(anchor.value)) {
        path = (0, workspaceService_1.getWorkspaceFileDisplayPath)(workspaceService, anchor.value);
        text = `\`${path}\``;
    }
    else if ((0, types_1.isLocation)(anchor.value)) {
        path = (0, workspaceService_1.getWorkspaceFileDisplayPath)(workspaceService, anchor.value.uri);
        text = `\`${path}\``;
    }
    else if ((0, types_1.isSymbolInformation)(anchor.value)) {
        path = (0, workspaceService_1.getWorkspaceFileDisplayPath)(workspaceService, anchor.value.location.uri);
        text = `\`${anchor.value.name}\``;
    }
    else {
        // Unknown anchor type
        return '';
    }
    return `[${text}](${path} ${anchor.title ? `"${anchor.title}"` : ''})`;
}
//# sourceMappingURL=chatParticipantRequestHandler.js.map