"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentConversationHistory = exports.AgentUserMessageInHistory = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("../panel/chatVariables");
const toolCalling_1 = require("../panel/toolCalling");
const agentPrompt_1 = require("./agentPrompt");
class AgentUserMessageInHistory extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    async render(state, sizing) {
        const turn = this.props.turn;
        return vscpp(prompt_tsx_1.UserMessage, null,
            turn.promptVariables && vscpp(chatVariables_1.ChatVariables, { flexGrow: 1, priority: 898, chatVariables: turn.promptVariables, isAgent: true, omitReferences: true }),
            turn.editedFileEvents?.length &&
                vscpp(tag_1.Tag, { name: 'context' },
                    vscpp(agentPrompt_1.EditedFileEvents, { flexGrow: 2, editedFileEvents: turn.editedFileEvents })),
            vscpp(tag_1.Tag, { name: 'userRequest' }, turn.request.message));
    }
}
exports.AgentUserMessageInHistory = AgentUserMessageInHistory;
/**
 * Agent conversation history for when summarization/cache breakpoints are disabled.
 */
class AgentConversationHistory extends prompt_tsx_1.PromptElement {
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
                history.push(vscpp(AgentUserMessageInHistory, { turn: turn }));
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
exports.AgentConversationHistory = AgentConversationHistory;
//# sourceMappingURL=agentConversationHistory.js.map