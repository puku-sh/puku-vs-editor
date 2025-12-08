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
exports.ConversationHistoryWithTools = exports.ConversationHistory = exports.HistoryWithInstructions = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const chatModelCapabilities_1 = require("../../../../platform/endpoint/common/chatModelCapabilities");
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../../prompt/common/conversation");
const agentConversationHistory_1 = require("../agent/agentConversationHistory");
const agentPrompt_1 = require("../agent/agentPrompt");
const instructionMessage_1 = require("../base/instructionMessage");
const promptRenderer_1 = require("../base/promptRenderer");
const chatVariables_1 = require("./chatVariables");
const toolCalling_1 = require("./toolCalling");
/**
 * This element should wrap instructions specific to any given model. It should
 * include any {@link InstructionMessage}, and depending on the model it
 * either includes the history before or after the instruction message.
 *
 * You should use `passPriority` with this: https://github.com/microsoft/vscode-prompt-tsx?tab=readme-ov-file#passing-priority
 *
 * @example
 *
 * <HistoryWithInstructions passPriority priority={700} history={history}>
 *   <InstructionMessage>Do the thing</InstructionMessage>
 * </HistoryWithInstructions>
 */
let HistoryWithInstructions = class HistoryWithInstructions extends prompt_tsx_1.PromptElement {
    constructor(props, promptEndpoint) {
        super(props);
        this.promptEndpoint = promptEndpoint;
    }
    render(_state, sizing) {
        const ep = this.promptEndpoint;
        const { children, ...props } = this.props;
        if (!children?.some(c => typeof c === 'object' && c.ctor === instructionMessage_1.InstructionMessage)) {
            // This is a sanity check, and could be removed if we eventually want to
            // have wrappers around InstructionMessages, but for now this is useful.
            throw new Error(`HistoryWithInstructions must have an InstructionMessage child`);
        }
        const after = (0, chatModelCapabilities_1.modelPrefersInstructionsAfterHistory)(ep.family);
        return vscpp(vscppf, null,
            after ? vscpp(ConversationHistory, { ...props, passPriority: false, priority: this.props.historyPriority }) : undefined,
            ...children,
            after ? undefined : vscpp(ConversationHistory, { ...props, passPriority: false, priority: this.props.historyPriority }));
    }
};
exports.HistoryWithInstructions = HistoryWithInstructions;
exports.HistoryWithInstructions = HistoryWithInstructions = __decorate([
    __param(1, promptRenderer_1.IPromptEndpoint)
], HistoryWithInstructions);
/**
 * @deprecated use `HistoryWithInstructions` instead
 */
class ConversationHistory extends prompt_tsx_1.PromptElement {
    render(_state, _sizing) {
        // exclude turns from the history that errored due to prompt filtration
        let turnHistory = this.props.history.filter(turn => turn.responseStatus !== conversation_1.TurnStatus.PromptFiltered);
        if (this.props.inline && turnHistory.length > 0) {
            const historyMessage = `The current code is a result of a previous interaction with you. Here are my previous messages: \n- ${turnHistory.map(r => r.request.message).join('\n- ')}`;
            turnHistory = [new conversation_1.Turn(undefined, { message: historyMessage, type: 'user' }, undefined)];
        }
        const history = [];
        turnHistory.forEach((turn, index) => {
            if (turn.request.type === 'user') {
                const promptVariables = (turn.promptVariables && !this.props.omitPromptVariables) ? this.removeDuplicateVars(turn.promptVariables, this.props.currentTurnVars, turnHistory.slice(index + 1)) : new chatVariablesCollection_1.ChatVariablesCollection([]);
                history.push(vscpp(chatVariables_1.ChatVariablesAndQuery, { priority: 900, chatVariables: promptVariables, query: turn.request.message, omitReferences: true, embeddedInsideUserMessage: false }));
            }
            if (turn.responseMessage?.type === 'model' && ![conversation_1.TurnStatus.OffTopic, conversation_1.TurnStatus.Filtered].includes(turn.responseStatus)) {
                history.push(vscpp(prompt_tsx_1.AssistantMessage, { name: turn.responseMessage.name }, turn.responseMessage.message));
            }
        });
        return (
        // Conversation history is currently limited to 32k tokens to avoid
        // unnecessarily pushing into the larger and slower token SKUs
        vscpp(prompt_tsx_1.TokenLimit, { max: 32768 },
            vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: false }, history)));
    }
    removeDuplicateVars(historyVars, currentTurnVars, followingMessages) {
        // TODO this is very simple, maybe we could use getUniqueReferences to merge ranges and be smarter. But it would take some rewriting of history for the model to
        // understand what each history message was referring to.
        return historyVars.filter(v1 => {
            if (followingMessages.some(m => m.promptVariables?.find(v2 => variableEquals(v1, v2)))) {
                return false;
            }
            if (currentTurnVars?.find(v2 => variableEquals(v1, v2))) {
                return false;
            }
            return true;
        });
    }
}
exports.ConversationHistory = ConversationHistory;
function variableEquals(v1, v2) {
    if (v1.uniqueName !== v2.uniqueName) {
        return false;
    }
    if (uri_1.URI.isUri(v1.value) && uri_1.URI.isUri(v2.value)) {
        return v1.value.toString() === v2.value.toString();
    }
    if (v1.value instanceof vscodeTypes_1.Location && v2.value instanceof vscodeTypes_1.Location) {
        return JSON.stringify(v1.value) === JSON.stringify(v2.value);
    }
    return false;
}
/**
 * This is conversation history including tool calls, but not summaries. New usages should use SummarizedConversationHistory instead.
 */
class ConversationHistoryWithTools extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        const history = [];
        const contextHistory = this.props.promptContext.history;
        for (const [i, turn] of contextHistory.entries()) {
            const metadata = turn.responseChatResult?.metadata;
            if (metadata?.renderedUserMessage) {
                history.push(vscpp(prompt_tsx_1.UserMessage, null,
                    vscpp(prompt_tsx_1.Chunk, null, (0, agentPrompt_1.renderedMessageToTsxChildren)(metadata.renderedUserMessage, false))));
            }
            else {
                history.push(vscpp(agentConversationHistory_1.AgentUserMessageInHistory, { turn: turn }));
            }
            if (Array.isArray(metadata?.toolCallRounds) && metadata.toolCallRounds?.length > 0) {
                // If a tool call limit is exceeded, the tool call from this turn will
                // have been aborted and any result should be found in the next turn.
                const toolCallResultInNextTurn = metadata.maxToolCallsExceeded;
                let toolCallResults = metadata.toolCallResults;
                if (toolCallResultInNextTurn) {
                    const nextMetadata = contextHistory.at(i + 1)?.responseChatResult?.metadata;
                    const mergeFrom = i === contextHistory.length - 1 ? this.props.promptContext.toolCallResults : nextMetadata?.toolCallResults;
                    toolCallResults = { ...toolCallResults, ...mergeFrom };
                }
                history.push(vscpp(toolCalling_1.ChatToolCalls, { promptContext: this.props.promptContext, toolCallRounds: metadata.toolCallRounds, toolCallResults: toolCallResults, isHistorical: !(toolCallResultInNextTurn && i === contextHistory.length - 1) }));
            }
            else if (turn.responseMessage) {
                history.push(vscpp(prompt_tsx_1.AssistantMessage, null, turn.responseMessage?.message));
            }
        }
        return (vscpp(prompt_tsx_1.PrioritizedList, { priority: this.props.priority, descending: false }, history));
    }
}
exports.ConversationHistoryWithTools = ConversationHistoryWithTools;
//# sourceMappingURL=conversationHistory.js.map