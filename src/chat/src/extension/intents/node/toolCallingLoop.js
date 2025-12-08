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
var ToolCallingLoop_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyPromptError = exports.ToolCallingLoop = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const chatMLFetcher_1 = require("../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const logService_1 = require("../../../platform/log/common/logService");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const chatResponseStreamImpl_1 = require("../../../util/common/chatResponseStreamImpl");
const errors_1 = require("../../../util/vs/base/common/errors");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptCraftingTypes_1 = require("../../inlineChat/node/promptCraftingTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../prompt/common/conversation");
const intents_1 = require("../../prompt/common/intents");
const toolCallRound_1 = require("../../prompt/common/toolCallRound");
const pseudoStartStopConversationCallback_1 = require("../../prompt/node/pseudoStartStopConversationCallback");
const responseProcessorContext_1 = require("../../prompt/node/responseProcessorContext");
const summarizedConversationHistory_1 = require("../../prompts/node/agent/summarizedConversationHistory");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const pauseController_1 = require("./pauseController");
const specialRequestTypes_1 = require("../../prompt/common/specialRequestTypes");
/**
 * This is a base class that can be used to implement a tool calling loop
 * against a model. It requires only that you build a prompt and is decoupled
 * from intents (i.e. the {@link DefaultIntentRequestHandler}), allowing easier
 * programmatic use.
 */
let ToolCallingLoop = class ToolCallingLoop extends lifecycle_1.Disposable {
    static { ToolCallingLoop_1 = this; }
    static { this.NextToolCallId = Date.now(); }
    get turn() {
        return this.options.conversation.getLatestTurn();
    }
    constructor(options, _instantiationService, _endpointProvider, _logService, _requestLogger, _authenticationChatUpgradeService, _telemetryService) {
        super();
        this.options = options;
        this._instantiationService = _instantiationService;
        this._endpointProvider = _endpointProvider;
        this._logService = _logService;
        this._requestLogger = _requestLogger;
        this._authenticationChatUpgradeService = _authenticationChatUpgradeService;
        this._telemetryService = _telemetryService;
        this.toolCallResults = Object.create(null);
        this.toolCallRounds = [];
        this._onDidBuildPrompt = this._register(new event_1.Emitter());
        this.onDidBuildPrompt = this._onDidBuildPrompt.event;
        this._onDidReceiveResponse = this._register(new event_1.Emitter());
        this.onDidReceiveResponse = this._onDidReceiveResponse.event;
    }
    /** Creates the prompt context for the request. */
    createPromptContext(availableTools, outputStream) {
        const { request } = this.options;
        const chatVariables = new chatVariablesCollection_1.ChatVariablesCollection(request.references);
        const isContinuation = this.turn.isContinuation;
        const query = isContinuation ?
            'Please continue' :
            this.turn.request.message;
        // exclude turns from the history that errored due to prompt filtration
        const history = this.options.conversation.turns.slice(0, -1).filter(turn => turn.responseStatus !== conversation_1.TurnStatus.PromptFiltered);
        return {
            requestId: this.turn.id,
            query,
            history,
            toolCallResults: this.toolCallResults,
            toolCallRounds: this.toolCallRounds,
            editedFileEvents: this.options.request.editedFileEvents,
            request: this.options.request,
            stream: outputStream,
            conversation: this.options.conversation,
            chatVariables,
            tools: {
                toolReferences: request.toolReferences.map(intents_1.InternalToolReference.from),
                toolInvocationToken: request.toolInvocationToken,
                availableTools
            },
            isContinuation,
            modeInstructions: this.options.request.modeInstructions2,
        };
    }
    async throwIfCancelled(token) {
        if (await this.checkAsync(token)) {
            throw new errors_1.CancellationError();
        }
    }
    async run(outputStream, token) {
        let i = 0;
        let lastResult;
        let lastRequestMessagesStartingIndexForRun;
        while (true) {
            if (lastResult && i++ >= this.options.toolCallLimit) {
                lastResult = this.hitToolCallLimit(outputStream, lastResult);
                break;
            }
            try {
                const result = await this.runOne(outputStream, i, token);
                if (lastRequestMessagesStartingIndexForRun === undefined) {
                    lastRequestMessagesStartingIndexForRun = result.lastRequestMessages.length - 1;
                }
                lastResult = {
                    ...result,
                    hadIgnoredFiles: lastResult?.hadIgnoredFiles || result.hadIgnoredFiles
                };
                this.toolCallRounds.push(result.round);
                if (!result.round.toolCalls.length || result.response.type !== commonTypes_1.ChatFetchResponseType.Success) {
                    lastResult = lastResult;
                    break;
                }
            }
            catch (e) {
                if ((0, errors_1.isCancellationError)(e) && lastResult) {
                    lastResult = lastResult;
                    break;
                }
                throw e;
            }
        }
        this.emitReadFileTrajectories().catch(err => {
            this._logService.error('Error emitting read file trajectories', err);
        });
        const toolCallRoundsToDisplay = lastResult.lastRequestMessages.slice(lastRequestMessagesStartingIndexForRun ?? 0).filter((m) => m.role === prompt_tsx_1.Raw.ChatRole.Tool);
        for (const toolRound of toolCallRoundsToDisplay) {
            const result = this.toolCallResults[toolRound.toolCallId];
            if (result instanceof vscodeTypes_1.LanguageModelToolResult2) {
                for (const part of result.content) {
                    if (part instanceof vscodeTypes_1.LanguageModelDataPart2 && part.mimeType === 'application/pull-request+json' && part.audience?.includes(vscodeTypes_1.LanguageModelPartAudience.User)) {
                        const data = JSON.parse(part.data.toString());
                        outputStream?.push(new vscodeTypes_1.ChatResponsePullRequestPart(uri_1.URI.parse(data.uri), data.title, data.description, data.author, data.linkTag));
                    }
                }
            }
        }
        return { ...lastResult, toolCallRounds: this.toolCallRounds, toolCallResults: this.toolCallResults };
    }
    async emitReadFileTrajectories() {
        // We are tuning our `read_file` tool to read files more effectively and efficiently.
        // This is a likely-temporary function that emits trajectory telemetry read_files
        // at the end of each agentic loop so that we can do so, in addition to the
        // per-call telemetry in ReadFileTool
        function tryGetRFArgs(call) {
            if (call.name !== toolNames_1.ToolName.ReadFile) {
                return undefined;
            }
            try {
                return JSON.parse(call.arguments);
            }
            catch {
                return undefined;
            }
        }
        const consumed = new Set();
        const tcrs = this.toolCallRounds;
        for (let i = 0; i < tcrs.length; i++) {
            const { toolCalls } = tcrs[i];
            for (const call of toolCalls) {
                if (consumed.has(call.id)) {
                    continue;
                }
                const args = tryGetRFArgs(call);
                if (!args) {
                    continue;
                }
                const seqArgs = [args];
                consumed.add(call.id);
                for (let k = i + 1; k < tcrs.length; k++) {
                    for (const call2 of tcrs[k].toolCalls) {
                        if (consumed.has(call2.id)) {
                            continue;
                        }
                        const args2 = tryGetRFArgs(call2);
                        if (!args2 || args2.filePath !== args.filePath) {
                            continue;
                        }
                        consumed.add(call2.id);
                        seqArgs.push(args2);
                    }
                }
                let chunkSizeTotal = 0;
                let chunkSizeNo = 0;
                for (const arg of seqArgs) {
                    if ('startLine' in arg) {
                        chunkSizeNo++;
                        chunkSizeTotal += arg.endLine - arg.startLine + 1;
                    }
                    else if (arg.limit) {
                        chunkSizeNo++;
                        chunkSizeTotal += arg.limit;
                    }
                }
                /* __GDPR__
                    "readFileTrajectory" : {
                        "owner": "connor4312",
                        "comment": "read_file tool invokation trajectory",
                        "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                        "rounds": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of times the file was read sequentially" },
                        "avgChunkSize": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of lines read at a time" }
                    }
                */
                this._telemetryService.sendMSFTTelemetryEvent('readFileTrajectory', {
                    // model will be undefined in the simulator
                    model: this.options.request.model?.id,
                }, {
                    rounds: seqArgs.length,
                    avgChunkSize: chunkSizeNo > 0 ? Math.round(chunkSizeTotal / chunkSizeNo) : -1,
                });
            }
        }
    }
    hitToolCallLimit(stream, lastResult) {
        if (stream && this.options.onHitToolCallLimit === 0 /* ToolCallLimitBehavior.Confirm */) {
            const messageString = new vscodeTypes_1.MarkdownString(l10n.t({
                message: 'Copilot has been working on this problem for a while. It can continue to iterate, or you can send a new message to refine your prompt. [Configure max requests]({0}).',
                args: [`command:workbench.action.openSettings?${encodeURIComponent('["chat.agent.maxRequests"]')}`],
                comment: 'Link to workbench settings for chat.maxRequests, which controls the maximum number of requests Copilot will make before stopping. This is used in the tool calling loop to determine when to stop iterating on a problem.'
            }));
            messageString.isTrusted = { enabledCommands: ['workbench.action.openSettings'] };
            stream.confirmation(l10n.t('Continue to iterate?'), messageString, { copilotRequestedRoundLimit: Math.round(this.options.toolCallLimit * 3 / 2) }, [
                l10n.t('Continue'),
                (0, specialRequestTypes_1.cancelText)(),
            ]);
        }
        lastResult.chatResult = {
            ...lastResult.chatResult,
            metadata: {
                ...lastResult.chatResult?.metadata,
                maxToolCallsExceeded: true
            },
        };
        return lastResult;
    }
    /** Runs a single iteration of the tool calling loop. */
    async runOne(outputStream, iterationNumber, token) {
        let availableTools = await this.getAvailableTools(outputStream, token);
        const context = this.createPromptContext(availableTools, outputStream);
        const isContinuation = context.isContinuation || false;
        const buildPromptResult = await this.buildPrompt2(context, outputStream, token);
        await this.throwIfCancelled(token);
        this.turn.addReferences(buildPromptResult.references);
        // Possible the tool call resulted in new tools getting added.
        availableTools = await this.getAvailableTools(outputStream, token);
        const isToolInputFailure = buildPromptResult.metadata.get(toolCalling_1.ToolFailureEncountered);
        const conversationSummary = buildPromptResult.metadata.get(summarizedConversationHistory_1.SummarizedConversationHistoryMetadata);
        if (conversationSummary) {
            this.turn.setMetadata(conversationSummary);
        }
        const promptTokenLength = await (await this._endpointProvider.getChatEndpoint(this.options.request)).acquireTokenizer().countMessagesTokens(buildPromptResult.messages);
        await this.throwIfCancelled(token);
        this._onDidBuildPrompt.fire({ result: buildPromptResult, tools: availableTools, promptTokenLength });
        this._logService.trace('Built prompt');
        // todo@connor4312: can interaction outcome logic be implemented in a more generic way?
        const interactionOutcomeComputer = new promptCraftingTypes_1.InteractionOutcomeComputer(this.options.interactionContext);
        const that = this;
        const responseProcessor = new class {
            constructor() {
                this.context = new responseProcessorContext_1.ResponseProcessorContext(that.options.conversation.sessionId, that.turn, buildPromptResult.messages, interactionOutcomeComputer);
            }
            async processResponse(_context, inputStream, responseStream, token) {
                let chatResult = undefined;
                if (that.options.responseProcessor) {
                    chatResult = await that.options.responseProcessor.processResponse(this.context, inputStream, responseStream, token);
                }
                else {
                    const responseProcessor = that._instantiationService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [], undefined);
                    await responseProcessor.processResponse(this.context, inputStream, responseStream, token);
                }
                return chatResult;
            }
        }();
        this._logService.trace('Sending prompt to model');
        const streamParticipants = outputStream ? [outputStream] : [];
        let fetchStreamSource;
        let processResponsePromise;
        let stopEarly = false;
        if (outputStream) {
            this.options.streamParticipants?.forEach(fn => {
                streamParticipants.push(fn(streamParticipants[streamParticipants.length - 1]));
            });
            const stream = streamParticipants[streamParticipants.length - 1];
            fetchStreamSource = new chatMLFetcher_1.FetchStreamSource();
            processResponsePromise = responseProcessor.processResponse(undefined, fetchStreamSource.stream, stream, token);
            const disposables = new lifecycle_1.DisposableStore();
            if (token instanceof pauseController_1.PauseController) {
                disposables.add(token.onDidChangePause(isPaused => {
                    if (isPaused) {
                        fetchStreamSource?.pause();
                    }
                    else {
                        fetchStreamSource?.unpause();
                    }
                }));
            }
            // Allows the response processor to do an early stop of the LLM request.
            processResponsePromise.finally(() => {
                // The response processor indicates that it has finished processing the response,
                // so let's stop the request if it's still in flight.
                stopEarly = true;
                disposables.dispose();
            });
        }
        if (buildPromptResult.messages.length === 0) {
            // /fixTestFailure relies on this check running after processResponse
            fetchStreamSource?.resolve();
            await processResponsePromise;
            await finalizeStreams(streamParticipants);
            throw new EmptyPromptError();
        }
        const promptContextTools = availableTools.length ? availableTools.map(toolInfo => {
            return {
                name: toolInfo.name,
                description: toolInfo.description,
                parameters: toolInfo.inputSchema,
            };
        }) : undefined;
        let statefulMarker;
        const toolCalls = [];
        let thinkingItem;
        const fetchResult = await this.fetch({
            messages: this.applyMessagePostProcessing(buildPromptResult.messages),
            finishedCb: async (text, index, delta) => {
                fetchStreamSource?.update(text, delta);
                if (delta.copilotToolCalls) {
                    toolCalls.push(...delta.copilotToolCalls.map((call) => ({
                        ...call,
                        id: this.createInternalToolCallId(call.id),
                        arguments: call.arguments === '' ? '{}' : call.arguments
                    })));
                }
                if (delta.statefulMarker) {
                    statefulMarker = delta.statefulMarker;
                }
                if (delta.thinking) {
                    thinkingItem = toolCallRound_1.ThinkingDataItem.createOrUpdate(thinkingItem, delta.thinking);
                }
                return stopEarly ? text.length : undefined;
            },
            requestOptions: {
                tools: promptContextTools?.map(tool => ({
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters && Object.keys(tool.parameters).length ? tool.parameters : undefined
                    },
                    type: 'function',
                })),
            },
            userInitiatedRequest: iterationNumber === 0 && !isContinuation && !this.options.request.isSubagent
        }, token);
        fetchStreamSource?.resolve();
        const chatResult = await processResponsePromise ?? undefined;
        // Validate authentication session upgrade and handle accordingly
        if (outputStream &&
            toolCalls.some(tc => tc.name === toolNames_1.ToolName.Codebase) &&
            await this._authenticationChatUpgradeService.shouldRequestPermissiveSessionUpgrade()) {
            this._authenticationChatUpgradeService.showPermissiveSessionUpgradeInChat(outputStream, this.options.request);
            throw new toolsService_1.ToolCallCancelledError(new errors_1.CancellationError());
        }
        await finalizeStreams(streamParticipants);
        this._onDidReceiveResponse.fire({ interactionOutcome: interactionOutcomeComputer, response: fetchResult, toolCalls });
        this.turn.setMetadata(interactionOutcomeComputer.interactionOutcome);
        const toolInputRetry = isToolInputFailure ? (this.toolCallRounds.at(-1)?.toolInputRetry || 0) + 1 : 0;
        if (fetchResult.type === commonTypes_1.ChatFetchResponseType.Success) {
            thinkingItem?.updateWithFetchResult(fetchResult);
            return {
                response: fetchResult,
                round: toolCallRound_1.ToolCallRound.create({
                    response: fetchResult.value,
                    toolCalls,
                    toolInputRetry,
                    statefulMarker,
                    thinking: thinkingItem
                }),
                chatResult,
                hadIgnoredFiles: buildPromptResult.hasIgnoredFiles,
                lastRequestMessages: buildPromptResult.messages,
                availableTools,
            };
        }
        return {
            response: fetchResult,
            hadIgnoredFiles: buildPromptResult.hasIgnoredFiles,
            lastRequestMessages: buildPromptResult.messages,
            availableTools,
            round: new toolCallRound_1.ToolCallRound('', toolCalls, toolInputRetry)
        };
    }
    /**
     * Sometimes 4o reuses tool call IDs, so make sure they are unique. Really we should restructure how tool calls and results are represented
     * to not expect them to be globally unique.
     */
    createInternalToolCallId(toolCallId) {
        // Note- if this code is ever removed, these IDs will still exist in persisted session metadata!
        return toolCallId + `__vscode-${ToolCallingLoop_1.NextToolCallId++}`;
    }
    applyMessagePostProcessing(messages) {
        return this.validateToolMessages(ToolCallingLoop_1.stripInternalToolCallIds(messages));
    }
    static stripInternalToolCallIds(messages) {
        return messages.map(m => {
            if (m.role === prompt_tsx_1.Raw.ChatRole.Assistant) {
                return {
                    ...m,
                    toolCalls: m.toolCalls?.map(tc => ({
                        ...tc,
                        id: tc.id.split('__vscode-')[0]
                    }))
                };
            }
            else if (m.role === prompt_tsx_1.Raw.ChatRole.Tool) {
                return {
                    ...m,
                    toolCallId: m.toolCallId?.split('__vscode-')[0]
                };
            }
            return m;
        });
    }
    /**
     * Apparently we can render prompts which have a tool message which is out of place. Don't know why this is happening, but try to detect this and fix it up.
     */
    validateToolMessages(messages) {
        const filterReasons = [];
        let previousAssistantMessage;
        const filtered = messages.filter((m, i) => {
            if (m.role === prompt_tsx_1.Raw.ChatRole.Assistant) {
                previousAssistantMessage = m;
            }
            else if (m.role === prompt_tsx_1.Raw.ChatRole.Tool) {
                if (!previousAssistantMessage) {
                    // No previous assistant message
                    filterReasons.push('noPreviousAssistantMessage');
                    return false;
                }
                if (!previousAssistantMessage.toolCalls?.length) {
                    // The assistant did not call any tools
                    filterReasons.push('noToolCalls');
                    return false;
                }
                const toolCall = previousAssistantMessage.toolCalls.find(tc => tc.id === m.toolCallId);
                if (!toolCall) {
                    // This tool call is excluded
                    return false;
                }
            }
            return true;
        });
        if (filterReasons.length) {
            const filterReasonsStr = filterReasons.join(', ');
            this._logService.warn('Filtered invalid tool messages: ' + filterReasonsStr);
            /* __GDPR__
                    "toolCalling.invalidToolMessages" : {
                        "owner": "roblourens",
                        "comment": "Provides info about invalid tool messages that were rendered in a prompt",
                        "filterReasons": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reasons for filtering the messages." },
                        "filterCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Count of filtered messages." }
                    }
                */
            this._telemetryService.sendMSFTTelemetryEvent('toolCalling.invalidToolMessages', {
                filterReasons: filterReasonsStr,
            }, {
                filterCount: filterReasons.length
            });
        }
        return filtered;
    }
    /**
     * Should be called between async operations. It cancels the operations and
     * returns true if the operation should be aborted, and waits for pausing otherwise.
     */
    async checkAsync(token) {
        if (token instanceof pauseController_1.PauseController && token.isPaused) {
            await token.waitForUnpause();
        }
        if (token.isCancellationRequested) {
            this.turn.setResponse(conversation_1.TurnStatus.Cancelled, undefined, undefined, commonTypes_1.CanceledResult);
            return true;
        }
        return false;
    }
    async buildPrompt2(buildPromptContext, stream, token) {
        const progress = {
            report(obj) {
                stream?.push(obj);
            }
        };
        const buildPromptResult = await this.buildPrompt(buildPromptContext, progress, token);
        for (const metadata of buildPromptResult.metadata.getAll(toolCalling_1.ToolResultMetadata)) {
            this.logToolResult(buildPromptContext, metadata);
            this.toolCallResults[metadata.toolCallId] = metadata.result;
        }
        if (buildPromptResult.metadata.getAll(toolCalling_1.ToolResultMetadata).some(r => r.isCancelled)) {
            throw new errors_1.CancellationError();
        }
        return buildPromptResult;
    }
    logToolResult(buildPromptContext, metadata) {
        if (this.toolCallResults[metadata.toolCallId]) {
            return; // already logged this on a previous turn
        }
        const lastTurn = this.toolCallRounds.at(-1);
        let originalCall = lastTurn?.toolCalls.find(tc => tc.id === metadata.toolCallId);
        if (!originalCall) {
            const byRef = buildPromptContext.tools?.toolReferences.find(r => r.id === metadata.toolCallId);
            if (byRef) {
                originalCall = { id: byRef.id, arguments: JSON.stringify(byRef.input), name: byRef.name };
            }
        }
        if (originalCall) {
            this._requestLogger.logToolCall(originalCall.id || (0, uuid_1.generateUuid)(), originalCall.name, originalCall.arguments, metadata.result, lastTurn?.thinking);
        }
    }
};
exports.ToolCallingLoop = ToolCallingLoop;
exports.ToolCallingLoop = ToolCallingLoop = ToolCallingLoop_1 = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, endpointProvider_1.IEndpointProvider),
    __param(3, logService_1.ILogService),
    __param(4, requestLogger_1.IRequestLogger),
    __param(5, authenticationUpgrade_1.IAuthenticationChatUpgradeService),
    __param(6, telemetry_1.ITelemetryService)
], ToolCallingLoop);
async function finalizeStreams(streams) {
    for (const stream of streams) {
        await (0, chatResponseStreamImpl_1.tryFinalizeResponseStream)(stream);
    }
}
class EmptyPromptError extends Error {
    constructor() {
        super('Empty prompt');
    }
}
exports.EmptyPromptError = EmptyPromptError;
//# sourceMappingURL=toolCallingLoop.js.map