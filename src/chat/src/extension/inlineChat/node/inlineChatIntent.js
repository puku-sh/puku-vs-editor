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
var InlineChatIntent_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InlineChatIntent = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const editSurvivalTrackerService_1 = require("../../../platform/editSurvivalTracking/common/editSurvivalTrackerService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const errorMessage_1 = require("../../../util/vs/base/common/errorMessage");
const types_1 = require("../../../util/vs/base/common/types");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const agentIntent_1 = require("../../intents/node/agentIntent");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const toolCallRound_1 = require("../../prompt/common/toolCallRound");
const conversation_1 = require("../../prompt/node/conversation");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const inlineChat2Prompt_1 = require("../../prompts/node/inline/inlineChat2Prompt");
const toolNames_1 = require("../../tools/common/toolNames");
const toolSchemaNormalizer_1 = require("../../tools/common/toolSchemaNormalizer");
const toolsRegistry_1 = require("../../tools/common/toolsRegistry");
const toolsService_1 = require("../../tools/common/toolsService");
const promptCraftingTypes_1 = require("./promptCraftingTypes");
const INLINE_CHAT_EXIT_TOOL_NAME = 'inline_chat_exit';
let InlineChatIntent = class InlineChatIntent {
    static { InlineChatIntent_1 = this; }
    static { this.ID = "inlineChat" /* Intent.InlineChat */; }
    static { this._EDIT_TOOLS = new Set([
        toolNames_1.ToolName.ApplyPatch,
        toolNames_1.ToolName.EditFile,
        toolNames_1.ToolName.ReplaceString,
        toolNames_1.ToolName.MultiReplaceString,
    ]); }
    constructor(_instantiationService, _endpointProvider, _authenticationService, _logService, _toolsService, _ignoreService, _editSurvivalTrackerService) {
        this._instantiationService = _instantiationService;
        this._endpointProvider = _endpointProvider;
        this._authenticationService = _authenticationService;
        this._logService = _logService;
        this._toolsService = _toolsService;
        this._ignoreService = _ignoreService;
        this._editSurvivalTrackerService = _editSurvivalTrackerService;
        this.id = InlineChatIntent_1.ID;
        this.locations = [commonTypes_1.ChatLocation.Editor];
        this.description = '';
    }
    async handleRequest(conversation, request, stream, token, documentContext, agentName, _location, chatTelemetry, onPaused) {
        (0, types_1.assertType)(request.location2 instanceof vscodeTypes_1.ChatRequestEditorData);
        (0, types_1.assertType)(documentContext);
        if (await this._ignoreService.isCopilotIgnored(request.location2.document.uri, token)) {
            return {
                errorDetails: {
                    message: l10n.t('inlineChat.ignored', "Puku AI is disabled for this file."),
                }
            };
        }
        const endpoint = await this._endpointProvider.getChatEndpoint(request);
        if (!endpoint.supportsToolCalls) {
            return {
                errorDetails: {
                    message: l10n.t('inlineChat.model', "{0} cannot be used for inline chat", endpoint.name),
                }
            };
        }
        const inlineChatTools = await this._getAvailableTools(request);
        const chatVariables = new chatVariablesCollection_1.ChatVariablesCollection([...request.references]);
        const renderer = promptRenderer_1.PromptRenderer.create(this._instantiationService, endpoint, inlineChat2Prompt_1.InlineChat2Prompt, {
            request,
            data: request.location2,
            exitToolName: INLINE_CHAT_EXIT_TOOL_NAME
        });
        const renderResult = await renderer.render(undefined, token, { trace: true });
        const telemetry = chatTelemetry.makeRequest(this, commonTypes_1.ChatLocation.Editor, conversation, renderResult.messages, renderResult.tokenCount, renderResult.references, endpoint, [], inlineChatTools.length);
        const outcomeComputer = new promptCraftingTypes_1.InteractionOutcomeComputer(request.location2.document.uri);
        const editSurvivalTracker = this._editSurvivalTrackerService.initialize(request.location2.document);
        stream = chatResponseStreamImpl_1.ChatResponseStreamImpl.spy(stream, part => {
            if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                editSurvivalTracker.collectAIEdits(part.edits);
                telemetry.markEmittedEdits(part.uri, part.edits);
            }
        });
        stream = outcomeComputer.spyOnStream(stream);
        const toolCalls = [];
        let toolError;
        const fetchResult = await endpoint.makeChatRequest2({
            debugName: 'InlineChat2Intent',
            messages: renderResult.messages,
            userInitiatedRequest: true,
            location: commonTypes_1.ChatLocation.Editor,
            finishedCb: async (_text, _index, delta) => {
                telemetry.markReceivedToken();
                let doneAfterToolCalls = false;
                if ((0, arrays_1.isNonEmptyArray)(delta.copilotToolCalls)) {
                    for (const toolCall of delta.copilotToolCalls) {
                        toolCalls.push(toolCall);
                        doneAfterToolCalls = doneAfterToolCalls
                            || InlineChatIntent_1._EDIT_TOOLS.has(toolCall.name)
                            || toolCall.name === INLINE_CHAT_EXIT_TOOL_NAME;
                        const validationResult = this._toolsService.validateToolInput(toolCall.name, toolCall.arguments);
                        if ((0, toolsService_1.isToolValidationError)(validationResult)) {
                            this._logService.warn(`Tool ${toolCall.name} invocation failed validation: ${validationResult}`);
                            break;
                        }
                        try {
                            let input = (0, toolsService_1.isValidatedToolInput)(validationResult)
                                ? validationResult.inputObj
                                : JSON.parse(toolCall.arguments);
                            const copilotTool = this._toolsService.getCopilotTool(toolCall.name);
                            if (copilotTool?.resolveInput) {
                                input = await copilotTool.resolveInput(input, {
                                    request,
                                    stream,
                                    query: request.prompt,
                                    chatVariables,
                                    history: [],
                                }, toolsRegistry_1.CopilotToolMode.FullContext);
                            }
                            const result = await this._toolsService.invokeTool(toolCall.name, {
                                input,
                                toolInvocationToken: request.toolInvocationToken,
                            }, token);
                            this._logService.trace(`Tool ${toolCall.name} invocation result: ${JSON.stringify(result)}`);
                        }
                        catch (err) {
                            this._logService.error(err, `Tool ${toolCall.name} invocation failed`);
                            toolError = err;
                        }
                    }
                }
                if (doneAfterToolCalls) {
                    return 1; // stop generating further
                }
                return undefined;
            },
            requestOptions: {
                tool_choice: 'auto',
                tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(endpoint.family, inlineChatTools.map(tool => ({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema && Object.keys(tool.inputSchema).length ? tool.inputSchema : undefined
                    },
                })), (tool, rule) => {
                    this._logService.warn(`Tool ${tool} failed validation: ${rule}`);
                })
            }
        }, token);
        // telemetry
        {
            const responseText = fetchResult.type === commonTypes_1.ChatFetchResponseType.Success ? fetchResult.value : '';
            const toolCallRound = toolCallRound_1.ToolCallRound.create({
                response: responseText,
                toolCalls: toolCalls,
                toolInputRetry: 0
            });
            telemetry.sendToolCallingTelemetry([toolCallRound], inlineChatTools, fetchResult.type);
            telemetry.sendTelemetry(fetchResult.requestId, fetchResult.type, responseText, outcomeComputer.interactionOutcome, toolCalls);
        }
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            const details = (0, commonTypes_1.getErrorDetailsFromChatFetchError)(fetchResult, (await this._authenticationService.getCopilotToken()).copilotPlan);
            return {
                errorDetails: {
                    message: details.message,
                    responseIsFiltered: details.responseIsFiltered
                }
            };
        }
        if (toolError) {
            return {
                errorDetails: {
                    message: (0, errorMessage_1.toErrorMessage)(toolError)
                }
            };
        }
        if (toolCalls.length === 0) {
            // when no tools were called, invoke the exit tool manually
            await this._toolsService.invokeTool(INLINE_CHAT_EXIT_TOOL_NAME, { toolInvocationToken: request.toolInvocationToken, input: undefined }, token);
        }
        // store metadata for telemetry sending
        const turn = conversation.getLatestTurn();
        turn.setMetadata(outcomeComputer.interactionOutcome);
        turn.setMetadata(new promptCraftingTypes_1.CopilotInteractiveEditorResponse('ok', outcomeComputer.store, { ...documentContext, query: request.prompt, intent: this }, telemetry.telemetryMessageId, telemetry, editSurvivalTracker));
        turn.setMetadata(new conversation_1.IntentInvocationMetadata({
            location: commonTypes_1.ChatLocation.Editor,
            intent: this,
            endpoint: endpoint,
            buildPrompt: () => { throw new Error(); },
        }));
        return {};
    }
    async _getAvailableTools(request) {
        const exitTool = this._toolsService.getTool(INLINE_CHAT_EXIT_TOOL_NAME);
        (0, types_1.assertType)(exitTool);
        const agentTools = await (0, agentIntent_1.getAgentTools)(this._instantiationService, request);
        const editTools = agentTools.filter(tool => InlineChatIntent_1._EDIT_TOOLS.has(tool.name));
        return [exitTool, ...editTools];
    }
    invoke() {
        throw new TypeError();
    }
};
exports.InlineChatIntent = InlineChatIntent;
exports.InlineChatIntent = InlineChatIntent = InlineChatIntent_1 = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, authentication_1.IAuthenticationService),
    __param(3, logService_1.ILogService),
    __param(4, toolsService_1.IToolsService),
    __param(5, ignoreService_1.IIgnoreService),
    __param(6, editSurvivalTrackerService_1.IEditSurvivalTrackerService)
], InlineChatIntent);
//# sourceMappingURL=inlineChatIntent.js.map