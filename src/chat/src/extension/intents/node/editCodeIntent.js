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
var EditCodeIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditCodeIntentInvocation = exports.EditCodeIntent = void 0;
exports.getCodeBlocksFromResponse = getCodeBlocksFromResponse;
exports.toNewChatReferences = toNewChatReferences;
exports.mergeMetadata = mergeMetadata;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const notebookDocumentSnapshot_1 = require("../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const envService_1 = require("../../../platform/env/common/envService");
const editLogService_1 = require("../../../platform/multiFileEdit/common/editLogService");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../util/common/types");
const async_1 = require("../../../util/vs/base/common/async");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const resources_1 = require("../../../util/vs/base/common/resources");
const types_2 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const codeBlockProcessor_1 = require("../../codeBlocks/node/codeBlockProcessor");
const commandService_1 = require("../../commands/node/commandService");
const genericInlineIntentInvocation_1 = require("../../context/node/resolvers/genericInlineIntentInvocation");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../prompt/common/conversation");
const intents_1 = require("../../prompt/common/intents");
const codebaseToolCalling_1 = require("../../prompt/node/codebaseToolCalling");
const conversation_2 = require("../../prompt/node/conversation");
const defaultIntentRequestHandler_1 = require("../../prompt/node/defaultIntentRequestHandler");
const pseudoStartStopConversationCallback_1 = require("../../prompt/node/pseudoStartStopConversationCallback");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const codeMapperService_1 = require("../../prompts/node/codeMapper/codeMapperService");
const chatVariables_1 = require("../../prompts/node/panel/chatVariables");
const codeBlockFormattingRules_1 = require("../../prompts/node/panel/codeBlockFormattingRules");
const editCodePrompt_1 = require("../../prompts/node/panel/editCodePrompt");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const codebaseTool_1 = require("../../tools/node/codebaseTool");
const editNotebookTool_1 = require("../../tools/node/editNotebookTool");
const editCodeStep_1 = require("./editCodeStep");
let EditCodeIntent = class EditCodeIntent {
    static { EditCodeIntent_1 = this; }
    static { this.ID = "edit" /* Intent.Edit */; }
    constructor(instantiationService, endpointProvider, configurationService, expService, codeMapperService, workspaceService, intentOptions = { processCodeblocks: true, intentInvocation: EditCodeIntentInvocation }) {
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.configurationService = configurationService;
        this.expService = expService;
        this.codeMapperService = codeMapperService;
        this.workspaceService = workspaceService;
        this.intentOptions = intentOptions;
        this.id = EditCodeIntent_1.ID;
        this.description = l10n.t('Make changes to existing code');
        this.locations = [commonTypes_1.ChatLocation.Editor, commonTypes_1.ChatLocation.Panel];
    }
    async _handleCodesearch(conversation, request, location, stream, token, documentContext, chatTelemetry) {
        const foundReferences = [];
        if ((this.configurationService.getConfig(configurationService_1.ConfigKey.CodeSearchAgentEnabled) || this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CodeSearchAgentEnabled)) && request.toolReferences.find((r) => r.name === codebaseTool_1.CodebaseTool.toolName && !isDirectorySemanticSearch(r))) {
            const latestTurn = conversation.getLatestTurn();
            const codebaseTool = this.instantiationService.createInstance(codebaseToolCalling_1.CodebaseToolCallingLoop, {
                conversation,
                toolCallLimit: 5,
                request,
                location,
            });
            const toolCallLoopResult = await codebaseTool.run(stream, token);
            const toolCallResults = toolCallLoopResult.toolCallResults;
            if (!toolCallLoopResult.chatResult?.errorDetails && toolCallResults) {
                // TODO: do these new references need a lower priority?
                const variables = new chatVariablesCollection_1.ChatVariablesCollection(request.references);
                const endpoint = await this.endpointProvider.getChatEndpoint(request);
                const { references } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, toolCalling_1.ToolCallResultWrapper, { toolCallResults }, undefined, token);
                foundReferences.push(...toNewChatReferences(variables, references));
                // TODO: how should we splice in the assistant message?
                conversation = new conversation_1.Conversation(conversation.sessionId, [...conversation.turns.slice(0, -1), new conversation_1.Turn(latestTurn.id, latestTurn.request, undefined)]);
            }
            return { conversation, request: { ...request, references: [...request.references, ...foundReferences], toolReferences: request.toolReferences.filter((r) => r.name !== codebaseTool_1.CodebaseTool.toolName) } };
        }
        return { conversation, request };
    }
    async _handleApplyConfirmedEdits(edits, outputStream, token) {
        const hydrateMappedEditsRequest = async (request) => {
            const workingSet = await Promise.all(request.workingSet.map(async (ws) => {
                if ((0, textDocumentSnapshot_1.isTextDocumentSnapshotJSON)(ws.document)) {
                    const document = await this.workspaceService.openTextDocument(ws.document.uri);
                    return { ...ws, document: textDocumentSnapshot_1.TextDocumentSnapshot.fromJSON(document, ws.document) };
                }
                else if ((0, notebookDocumentSnapshot_1.isNotebookDocumentSnapshotJSON)(ws.document)) {
                    const document = await this.workspaceService.openNotebookDocument(ws.document.uri);
                    return { ...ws, document: notebookDocumentSnapshot_1.NotebookDocumentSnapshot.fromJSON(document, ws.document) };
                }
                return ws;
            }));
            return { ...request, workingSet };
        };
        await Promise.all(edits.map(async (requestDry) => {
            const request = await hydrateMappedEditsRequest(requestDry);
            const uri = request.codeBlock.resource;
            outputStream.markdown(l10n.t `Applying edits to \`${this.workspaceService.asRelativePath(uri)}\`...\n\n`);
            outputStream.textEdit(uri, []); // signal start of
            try {
                return await this.codeMapperService.mapCode(request, outputStream, { chatRequestId: requestDry.chatRequestId, chatRequestModel: requestDry.chatRequestModel, chatRequestSource: `confirmed_edits_${this.id}` }, token);
            }
            finally {
                if (!token.isCancellationRequested) {
                    outputStream.textEdit(uri, true);
                }
            }
        }));
    }
    async handleRequest(conversation, request, stream, token, documentContext, agentName, location, chatTelemetry, onPaused) {
        const applyEdits = request.acceptedConfirmationData?.filter(isEditsOkayConfirmation);
        if (applyEdits?.length) {
            await this._handleApplyConfirmedEdits(applyEdits.flatMap(e => ({ ...e.edits, chatRequestId: e.chatRequestId, chatRequestModel: request.model.id })), stream, token);
            return {};
        }
        ({ conversation, request } = await this._handleCodesearch(conversation, request, location, stream, token, documentContext, chatTelemetry));
        return this.instantiationService.createInstance(EditIntentRequestHandler, this, conversation, request, stream, token, documentContext, location, chatTelemetry, this.getIntentHandlerOptions(request), onPaused).getResult();
    }
    getIntentHandlerOptions(_request) {
        return undefined;
    }
    async invoke(invocationContext) {
        const { location, documentContext, request } = invocationContext;
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        if (location === commonTypes_1.ChatLocation.Panel || location === commonTypes_1.ChatLocation.Notebook) {
            return this.instantiationService.createInstance(this.intentOptions.intentInvocation, this, location, endpoint, request, this.intentOptions);
        }
        if (!documentContext) {
            throw new Error('Open a file to add code.');
        }
        return this.instantiationService.createInstance(genericInlineIntentInvocation_1.GenericInlineIntentInvocation, this, location, endpoint, documentContext, 2 /* EditStrategy.FallbackToReplaceRange */);
    }
};
exports.EditCodeIntent = EditCodeIntent;
exports.EditCodeIntent = EditCodeIntent = EditCodeIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, codeMapperService_1.ICodeMapperService),
    __param(5, workspaceService_1.IWorkspaceService)
], EditCodeIntent);
let EditIntentRequestHandler = class EditIntentRequestHandler {
    constructor(intent, conversation, request, stream, token, documentContext, location, chatTelemetry, handlerOptions, onPaused, instantiationService, telemetryService, editLogService) {
        this.intent = intent;
        this.conversation = conversation;
        this.request = request;
        this.stream = stream;
        this.token = token;
        this.documentContext = documentContext;
        this.location = location;
        this.chatTelemetry = chatTelemetry;
        this.handlerOptions = handlerOptions;
        this.onPaused = onPaused;
        this.instantiationService = instantiationService;
        this.telemetryService = telemetryService;
        this.editLogService = editLogService;
    }
    async getResult() {
        const actual = this.instantiationService.createInstance(defaultIntentRequestHandler_1.DefaultIntentRequestHandler, this.intent, this.conversation, this.request, this.stream, this.token, this.documentContext, this.location, this.chatTelemetry, this.handlerOptions, this.onPaused);
        const result = await actual.getResult();
        // Record telemetry for the edit code blocks in an editing session
        const turn = this.conversation.getLatestTurn();
        const currentTurnMetadata = turn.getMetadata(conversation_2.IntentInvocationMetadata)?.value;
        const editCodeStep = (currentTurnMetadata instanceof EditCodeIntentInvocation ? currentTurnMetadata._editCodeStep : undefined);
        if (editCodeStep?.telemetryInfo) {
            /* __GDPR__
                    "panel.edit.codeblocks" : {
                        "owner": "joyceerhl",
                        "comment": "Records information about the proposed edit codeblocks in an editing session",
                        "conversationId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Id for the current chat conversation." },
                        "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the request succeeded or failed." },
                        "workingSetCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of entries in the working set" },
                        "uniqueCodeblockUriCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of unique code block URIs" },
                        "codeblockCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of code blocks in the response" },
                        "codeblockWithUriCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of code blocks that had URIs" },
                        "codeblockWithElidedCodeCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of code blocks that had a ...existing code... comment" },
                        "shellCodeblockCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of shell code blocks in the response" },
                        "shellCodeblockWithUriCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of shell code blocks that had URIs" },
                        "shellCodeblockWithElidedCodeCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of shell code blocks that had a ...existing code... comment" },
                        "editStepCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of edit steps in the session so far" },
                        "sessionDuration": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The time since the session started" },
                        "intentId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The ID of the intent being executed" }
                    }
                */
            this.telemetryService.sendMSFTTelemetryEvent('panel.edit.codeblocks', {
                conversationId: this.conversation.sessionId,
                outcome: Boolean(result.errorDetails) ? 'error' : 'success',
                intentId: this.intent.id
            }, {
                workingSetCount: editCodeStep.workingSet.length,
                uniqueCodeblockUriCount: editCodeStep.telemetryInfo.codeblockUris.size,
                codeblockCount: editCodeStep.telemetryInfo.codeblockCount,
                codeblockWithUriCount: editCodeStep.telemetryInfo.codeblockWithUriCount,
                codeblockWithElidedCodeCount: editCodeStep.telemetryInfo.codeblockWithElidedCodeCount,
                shellCodeblockCount: editCodeStep.telemetryInfo.shellCodeblockCount,
                shellCodeblockWithUriCount: editCodeStep.telemetryInfo.shellCodeblockWithUriCount,
                shellCodeblockWithElidedCodeCount: editCodeStep.telemetryInfo.shellCodeblockWithElidedCodeCount,
                editStepCount: this.conversation.turns.length,
                sessionDuration: Date.now() - turn.startTime,
            });
        }
        await this.editLogService.markCompleted(turn.id, result.errorDetails ? 'error' : 'success');
        return result;
    }
};
EditIntentRequestHandler = __decorate([
    __param(10, instantiation_1.IInstantiationService),
    __param(11, telemetry_1.ITelemetryService),
    __param(12, editLogService_1.IEditLogService)
], EditIntentRequestHandler);
const makeEditsConfirmation = (chatRequestId, edits) => ({
    id: "4e6e0e05-5dab-48d0-b2cd-6a14c8e3e8a2" /* ConfirmationIds.EditsOkay */,
    chatRequestId,
    edits,
});
const isEditsOkayConfirmation = (obj) => (0, types_2.isObject)(obj) && obj.id === "4e6e0e05-5dab-48d0-b2cd-6a14c8e3e8a2" /* ConfirmationIds.EditsOkay */;
let EditCodeIntentInvocation = class EditCodeIntentInvocation {
    get linkification() {
        return { disable: false };
    }
    constructor(intent, location, endpoint, request, intentOptions, instantiationService, codeMapperService, envService, promptPathRepresentationService, endpointProvider, workspaceService, toolsService, configurationService, editLogService, commandService, telemetryService, notebookService) {
        this.intent = intent;
        this.location = location;
        this.endpoint = endpoint;
        this.request = request;
        this.intentOptions = intentOptions;
        this.instantiationService = instantiationService;
        this.codeMapperService = codeMapperService;
        this.envService = envService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.endpointProvider = endpointProvider;
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
        this.configurationService = configurationService;
        this.editLogService = editLogService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.notebookService = notebookService;
        this._editCodeStep = undefined;
        /**
         * Stable codebase invocation so that their {@link InternalToolReference.id ids}
         * are reused across multiple turns.
         */
        this.stableToolReferences = this.request.toolReferences.map(intents_1.InternalToolReference.from);
        this.codeblocksRepresentEdits = true;
    }
    getAvailableTools() {
        return undefined;
    }
    async buildPrompt(promptContext, progress, token) {
        // Add any references from the codebase invocation to the request
        const codebase = await this._getCodebaseReferences(promptContext, token);
        let variables = promptContext.chatVariables;
        let toolReferences = [];
        if (codebase) {
            toolReferences = toNewChatReferences(variables, codebase.references);
            variables = new chatVariablesCollection_1.ChatVariablesCollection([...this.request.references, ...toolReferences]);
        }
        if (this.request.location2 instanceof vscodeTypes_1.ChatRequestEditorData) {
            const editorRequestReference = {
                id: '',
                name: this.request.location2.document.fileName,
                value: new vscodeTypes_1.Location(this.request.location2.document.uri, this.request.location2.wholeRange)
            };
            variables = new chatVariablesCollection_1.ChatVariablesCollection([...this.request.references, ...toolReferences, editorRequestReference]);
        }
        const tools = await this.getAvailableTools();
        const toolTokens = tools?.length ? await this.endpoint.acquireTokenizer().countToolTokens(tools) : 0;
        const endpoint = toolTokens > 0 ? this.endpoint.cloneWithTokenOverride(Math.floor((this.endpoint.modelMaxPromptTokens - toolTokens) * 0.85)) : this.endpoint;
        const { editCodeStep, chatVariables } = await editCodeStep_1.EditCodeStep.create(this.instantiationService, promptContext.history, variables, endpoint);
        this._editCodeStep = editCodeStep;
        const commandToolReferences = [];
        let query = promptContext.query;
        const command = this.request.command && this.commandService.getCommand(this.request.command, this.location);
        if (command) {
            if (command.toolEquivalent) {
                commandToolReferences.push({
                    id: `${this.request.command}->${(0, uuid_1.generateUuid)()}`,
                    name: (0, toolNames_1.getToolName)(command.toolEquivalent)
                });
            }
            query = query ? `${command.details}.\n${query}` : command.details;
        }
        // Reserve extra space when tools are involved due to token counting issues
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, endpoint, editCodePrompt_1.EditCodePrompt, {
            endpoint,
            promptContext: {
                ...promptContext,
                query,
                chatVariables,
                workingSet: editCodeStep.workingSet,
                promptInstructions: editCodeStep.promptInstructions,
                toolCallResults: { ...promptContext.toolCallResults, ...codebase?.toolCallResults },
                tools: promptContext.tools && {
                    ...promptContext.tools,
                    toolReferences: this.stableToolReferences.filter((r) => r.name !== toolNames_1.ToolName.Codebase).concat(commandToolReferences),
                },
            },
            location: this.location
        });
        const start = Date.now();
        const result = await renderer.render(progress, token);
        const duration = Date.now() - start;
        this.sendPromptRenderTelemetry(duration);
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage.role === prompt_tsx_1.Raw.ChatRole.User) {
            this._editCodeStep.setUserMessage(lastMessage);
        }
        return {
            ...result,
            // The codebase tool is not actually called/referenced in the edit prompt, so we need to
            // merge its metadata so that its output is not lost and it's not called repeatedly every turn
            // todo@connor4312/joycerhl: this seems a bit janky
            metadata: codebase ? mergeMetadata(result.metadata, codebase.metadatas) : result.metadata,
            // Don't report file references that came in via chat variables in an editing session, unless they have warnings,
            // because they are already displayed as part of the working set
            references: result.references.filter((ref) => this.shouldKeepReference(editCodeStep, ref, toolReferences, chatVariables)),
        };
    }
    sendPromptRenderTelemetry(duration) {
        /* __GDPR__
            "editCodeIntent.promptRender" : {
                "owner": "roblourens",
                "comment": "Understanding the performance of the edit code intent rendering",
                "promptRenderDurationIncludingRunningTools": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Duration of the prompt rendering, includes running tools" },
                "isAgentMode": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the prompt was for agent mode" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('editCodeIntent.promptRender', {}, {
            promptRenderDurationIncludingRunningTools: duration,
            isAgentMode: this.intent.id === "editAgent" /* Intent.Agent */ ? 1 : 0,
        });
    }
    async _getCodebaseReferences(promptContext, token) {
        const codebaseTools = this.stableToolReferences.filter(t => t.name === toolNames_1.ToolName.Codebase);
        if (!codebaseTools.length) {
            return;
        }
        const history = promptContext.history;
        const endpoint = await this.endpointProvider.getChatEndpoint(this.request);
        const { references, metadatas } = await (0, promptRenderer_1.renderPromptElement)(this.instantiationService, endpoint, chatVariables_1.ChatToolReferences, { promptContext: { requestId: promptContext.requestId, query: this.request.prompt, chatVariables: promptContext.chatVariables, history, toolCallResults: promptContext.toolCallResults, tools: { toolReferences: codebaseTools, toolInvocationToken: this.request.toolInvocationToken, availableTools: promptContext.tools?.availableTools ?? [] } }, embeddedInsideUserMessage: false }, undefined, token);
        return { toolCallResults: getToolCallResults(metadatas), references, metadatas };
    }
    shouldKeepReference(editCodeStep, ref, toolReferences, chatVariables) {
        if (ref.options?.status && ref.options?.status?.kind !== prompt_tsx_1.ChatResponseReferencePartStatusKind.Complete) {
            // Always show references for files which have warnings
            return true;
        }
        const uri = getUriOfReference(ref);
        if (!uri) {
            // This reference doesn't have an URI
            return true;
        }
        if (toolReferences.find(entry => (uri_1.URI.isUri(entry.value) && (0, resources_1.isEqual)(entry.value, uri) || ((0, types_1.isLocation)(entry.value) && (0, resources_1.isEqual)(entry.value.uri, uri))))) {
            // If this reference came in via resolving #codebase, we should show it
            // TODO@joyceerhl if this reference is subsequently modified and joins the working set, should we suppress it again in the UI?
            return true;
        }
        const PROMPT_INSTRUCTION_PREFIX = 'vscode.prompt.instructions';
        const PROMPT_INSTRUCTION_ROOT_PREFIX = `${PROMPT_INSTRUCTION_PREFIX}.root`;
        const promptInstruction = chatVariables.find((variable) => (0, chatVariablesCollection_1.isPromptInstruction)(variable) && uri_1.URI.isUri(variable.value) && (0, resources_1.isEqual)(variable.value, uri));
        if (promptInstruction) {
            // Report references for root prompt instruction files and not their children
            return promptInstruction.reference.id.startsWith(PROMPT_INSTRUCTION_ROOT_PREFIX);
        }
        const workingSetEntry = editCodeStep.workingSet.find(entry => (0, resources_1.isEqual)(entry.document.uri, uri));
        if (!workingSetEntry) {
            // This reference wasn't part of the working set
            return true;
        }
        return false;
    }
    async shouldConfirmBeforeFileEdits(uri) {
        for (const tool of this.request.toolReferences) {
            const ownTool = this.toolsService.getCopilotTool(tool.name);
            if (!ownTool) {
                continue;
            }
            const filter = await ownTool.filterEdits?.(uri);
            if (filter) {
                return filter;
            }
        }
        const isReadonly = this.request.references.some(r => r.isReadonly && uri_1.URI.isUri(r.value) && (0, resources_1.isEqual)(r.value, uri));
        if (isReadonly) {
            return {
                title: l10n.t `Allow edits to readonly file?`,
                message: l10n.t `Do you want to allow edits to \`${this.workspaceService.asRelativePath(uri)}\`?`,
            };
        }
    }
    async processResponse(context, inputStream, outputStream, token) {
        (0, types_2.assertType)(this._editCodeStep);
        const codeMapperWork = [];
        const allReceivedMarkdown = [];
        const textStream = (async_1.AsyncIterableObject
            .map(inputStream, part => {
            (0, pseudoStartStopConversationCallback_1.reportCitations)(part.delta, outputStream);
            return part.delta.text;
        })
            .map(piece => {
            allReceivedMarkdown.push(piece);
            return piece;
        }));
        const remoteName = this.envService.remoteName;
        const createUriFromResponsePath = this._createUriFromResponsePath.bind(this);
        if (this.intentOptions.processCodeblocks) {
            for await (const codeBlock of getCodeBlocksFromResponse(textStream, outputStream, createUriFromResponsePath, remoteName)) {
                if (token.isCancellationRequested) {
                    break;
                }
                const isShellScript = codeBlock.language === 'sh';
                if ((0, codeBlockProcessor_1.isCodeBlockWithResource)(codeBlock)) {
                    this._editCodeStep.telemetryInfo.codeblockUris.add(codeBlock.resource);
                    this._editCodeStep.telemetryInfo.codeblockWithUriCount += 1;
                    if (isShellScript) {
                        this._editCodeStep.telemetryInfo.shellCodeblockWithUriCount += 1;
                    }
                    // The model proposed an edit for this URI
                    this._editCodeStep.setWorkingSetEntryState(codeBlock.resource, intents_1.WorkingSetEntryState.Undecided);
                    if (codeBlock.code.includes(codeBlockFormattingRules_1.EXISTING_CODE_MARKER)) {
                        this._editCodeStep.telemetryInfo.codeblockWithElidedCodeCount += 1;
                        if (isShellScript) {
                            this._editCodeStep.telemetryInfo.shellCodeblockWithElidedCodeCount += 1;
                        }
                    }
                    const request = {
                        workingSet: [...this._editCodeStep.workingSet],
                        codeBlock
                    };
                    const confirmEdits = await this.shouldConfirmBeforeFileEdits(codeBlock.resource);
                    if (confirmEdits) {
                        outputStream.confirmation(confirmEdits.title, confirmEdits.message, makeEditsConfirmation(context.turn.id, request));
                        continue;
                    }
                    const isNotebookDocument = this.notebookService.hasSupportedNotebooks(codeBlock.resource);
                    if (isNotebookDocument) {
                        outputStream.notebookEdit(codeBlock.resource, []);
                    }
                    else {
                        outputStream.textEdit(codeBlock.resource, []); // signal start
                    }
                    const task = this.codeMapperService.mapCode(request, outputStream, {
                        chatRequestId: context.turn.id,
                        chatRequestModel: this.endpoint.model,
                        chatSessionId: context.chatSessionId,
                        chatRequestSource: `${this.intent.id}_${commonTypes_1.ChatLocation.toString(this.location)}`,
                    }, token).finally(() => {
                        if (!token.isCancellationRequested) {
                            // signal being done with this uri
                            if (isNotebookDocument) {
                                outputStream.notebookEdit(codeBlock.resource, true);
                                (0, editNotebookTool_1.sendEditNotebookTelemetry)(this.telemetryService, undefined, 'editCodeIntent', codeBlock.resource, this.request.id, undefined, this.endpoint);
                            }
                            else {
                                outputStream.textEdit(codeBlock.resource, true);
                            }
                        }
                    });
                    codeMapperWork.push(task);
                }
                else {
                    this._editCodeStep.telemetryInfo.codeblockCount += 1;
                    if (isShellScript) {
                        this._editCodeStep.telemetryInfo.shellCodeblockCount += 1;
                    }
                }
            }
        }
        else {
            for await (const part of textStream) {
                if (token.isCancellationRequested) {
                    break;
                }
                outputStream.markdown(part);
            }
        }
        const results = await Promise.all(codeMapperWork);
        for (const result of results) {
            if (!result) {
                context.addAnnotations([{ severity: 'error', label: 'cancelled', message: 'CodeMapper cancelled' }]);
            }
            else if (result.annotations) {
                context.addAnnotations(result.annotations);
            }
        }
        for (const result of results) {
            if (result && result.errorDetails) {
                return {
                    errorDetails: result.errorDetails
                };
            }
        }
        const response = allReceivedMarkdown.join('');
        this._editCodeStep.setAssistantReply(response);
        this.editLogService.logEditChatRequest(context.turn.id, context.messages, response);
        const historyEditCodeStep = editCodeStep_1.PreviousEditCodeStep.fromEditCodeStep(this._editCodeStep);
        context.turn.setMetadata(new editCodeStep_1.EditCodeStepTurnMetaData(historyEditCodeStep));
        return {
            metadata: historyEditCodeStep.toChatResultMetaData(),
        };
    }
    _createUriFromResponsePath(path) {
        (0, types_2.assertType)(this._editCodeStep);
        // ok to modify entries from the working set
        for (const entry of this._editCodeStep.workingSet) {
            if (this.promptPathRepresentationService.getFilePath(entry.document.uri) === path) {
                return entry.document.uri;
            }
        }
        const uri = this.promptPathRepresentationService.resolveFilePath(path, this._editCodeStep.getPredominantScheme());
        if (!uri) {
            return undefined;
        }
        // ok to make changes in the workspace
        if (this.workspaceService.getWorkspaceFolder(uri)) {
            return uri;
        }
        if (uri.scheme === network_1.Schemas.file || uri.scheme === network_1.Schemas.vscodeRemote) {
            // do not directly modify files outside the workspace. Create an untitled file instead, let the user save when ok
            return uri_1.URI.from({ scheme: network_1.Schemas.untitled, path: uri.path });
        }
        return uri;
    }
};
exports.EditCodeIntentInvocation = EditCodeIntentInvocation;
exports.EditCodeIntentInvocation = EditCodeIntentInvocation = __decorate([
    __param(5, instantiation_1.IInstantiationService),
    __param(6, codeMapperService_1.ICodeMapperService),
    __param(7, envService_1.IEnvService),
    __param(8, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(9, endpointProvider_1.IEndpointProvider),
    __param(10, workspaceService_1.IWorkspaceService),
    __param(11, toolsService_1.IToolsService),
    __param(12, configurationService_1.IConfigurationService),
    __param(13, editLogService_1.IEditLogService),
    __param(14, commandService_1.ICommandService),
    __param(15, telemetry_1.ITelemetryService),
    __param(16, notebookService_1.INotebookService)
], EditCodeIntentInvocation);
const fileHeadingLineStart = '### ';
function getCodeBlocksFromResponse(textStream, outputStream, createUriFromResponsePath, remoteName) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let currentCodeBlock = undefined;
        const codeblockProcessor = new codeBlockProcessor_1.CodeBlockProcessor(path => {
            return createUriFromResponsePath(path);
        }, (markdown, codeBlockInfo, vulnerabilities) => {
            if (vulnerabilities) {
                outputStream.markdownWithVulnerabilities(markdown, vulnerabilities);
            }
            else {
                outputStream.markdown(markdown);
            }
            if (codeBlockInfo && codeBlockInfo.resource && codeBlockInfo !== currentCodeBlock) {
                // first time we see this code block
                currentCodeBlock = codeBlockInfo;
                outputStream.codeblockUri(codeBlockInfo.resource, true);
            }
        }, codeBlock => {
            emitter.emitOne(codeBlock);
        }, {
            matchesLineStart(linePart, inCodeBlock) {
                return !inCodeBlock && linePart.startsWith(fileHeadingLineStart.substring(0, linePart.length));
            },
            process(line, inCodeBlock) {
                const header = line.value.substring(fileHeadingLineStart.length).trim(); // remove the ### and trim
                let fileUri = createUriFromResponsePath(header);
                if (fileUri) {
                    if (remoteName) {
                        fileUri = uri_1.URI.from({ scheme: network_1.Schemas.vscodeRemote, authority: remoteName, path: fileUri.path });
                    }
                    const headerLine = `### [${(0, resources_1.basename)(fileUri)}](${fileUri.toString()})\n`;
                    return new vscodeTypes_1.MarkdownString(headerLine);
                }
                else {
                    // likely not a file path, just keep the original line
                    return line;
                }
            },
        });
        for await (const text of textStream) {
            codeblockProcessor.processMarkdown(text);
        }
        codeblockProcessor.flush();
    });
}
function getUriOfReference(ref) {
    if ('variableName' in ref.anchor) {
        return _extractUri(ref.anchor.value);
    }
    return _extractUri(ref.anchor);
}
function _extractUri(something) {
    if ((0, types_1.isLocation)(something)) {
        return something.uri;
    }
    return something;
}
function toNewChatReferences(chatVariables, promptReferences) {
    const toolReferences = [];
    const seen = new map_1.ResourceSet();
    for (const reference of promptReferences) {
        if ((0, types_1.isLocation)(reference.anchor)) {
            const uri = reference.anchor.uri;
            if (seen.has(uri) || chatVariables.find((v) => uri_1.URI.isUri(v.value) && (0, resources_1.isEqual)(v.value, uri))) {
                continue;
            }
            seen.add(uri);
            toolReferences.push({ id: uri.toString(), name: uri.toString(), value: reference.anchor });
        }
        else if ((0, uri_1.isUriComponents)(reference.anchor) || uri_1.URI.isUri(reference.anchor)) {
            const uri = uri_1.URI.revive(reference.anchor);
            if (seen.has(uri) || chatVariables.find((v) => uri_1.URI.isUri(v.value) && (0, resources_1.isEqual)(v.value, uri))) {
                continue;
            }
            seen.add(uri);
            toolReferences.push({ id: uri.toString(), name: uri.toString(), value: uri });
        }
    }
    return toolReferences;
}
function getToolCallResults(metadatas) {
    const toolCallResults = {};
    for (const metadata of metadatas.getAll(toolCalling_1.ToolResultMetadata)) {
        toolCallResults[metadata.toolCallId] = metadata.result;
    }
    return toolCallResults;
}
function mergeMetadata(m1, m2) {
    return {
        get: key => m1.get(key) ?? m2.get(key),
        getAll: key => m1.getAll(key).concat(m2.getAll(key)),
    };
}
function isDirectorySemanticSearch(toolCall) {
    if (toolCall.name !== toolNames_1.ToolName.Codebase) {
        return false;
    }
    const input = toolCall.input;
    if (!input) {
        return false;
    }
    const scopedDirectories = input.scopedDirectories;
    if (!Array.isArray(scopedDirectories)) {
        return false;
    }
    return scopedDirectories.length > 0;
}
//# sourceMappingURL=editCodeIntent.js.map