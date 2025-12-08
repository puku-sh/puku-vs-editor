"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleSummarizedHistory = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const strings_1 = require("../../../../util/vs/base/common/strings");
const tag_1 = require("../base/tag");
const toolCalling_1 = require("../panel/toolCalling");
const agentPrompt_1 = require("./agentPrompt");
/**
 * "SimpleSummarizedHistory" is a fallback for when the main history summarization fails, either due to the conversation history being longer than the context window, or some other reason.
 * We can end up with history too long to summarize normally in a few ways:
 * - User switched from a model with a larger context window to one with a smaller context window.
 * - The context window size was changed for a model.
 * - A previous summarization failed for some reason or was cancelled.
 * - Switching from ask mode (no summarization) to agent mode.
 * - Upgrading from an earlier version with no summarization.
 * - Toggling the summarization setting.
 *
 * We could deal with this by summarizing recursively over context-window-sized chunks, but I don't want to make the user wait for multiple rounds of summarization.
 * Instead, the fallback strategy is basically this:
 * - Render one UserMessage with a text-based summary of the conversation. Attachments and other large extra context is omitted.
 * - Very large tool results and arguments are truncated.
 * - Pack the context window with as much of the history as possible in a PrioritizedList, but give the first user message the highest priority.
 *
 * This should let us strike a balance between speed and reliability and summarization fidelity.
 */
class SimpleSummarizedHistory extends prompt_tsx_1.PromptElement {
    async render() {
        const historyEntries = this.getEntriesToRender();
        const firstEntry = historyEntries.at(0);
        const restEntries = historyEntries.slice(1);
        return vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
            "The following is a compressed version of the preceeding history in the current conversation. The first message is kept, some history may be truncated after that:",
            vscpp("br", null),
            firstEntry && this.renderEntry(firstEntry, Number.MAX_SAFE_INTEGER),
            vscpp(prompt_tsx_1.PrioritizedList, { priority: 5000, descending: false }, ...restEntries.map(entry => this.renderEntry(entry))));
    }
    getEntriesToRender() {
        const entries = [];
        for (const round of Array.from(this.props.promptContext.toolCallRounds ?? []).reverse()) {
            entries.unshift({ round, results: this.props.promptContext.toolCallResults });
            if (round.summary) {
                return entries;
            }
        }
        if (this.props.promptContext.query) {
            entries.unshift(this.props.promptContext.query);
        }
        for (const turn of Array.from(this.props.promptContext.history ?? []).reverse()) {
            for (const round of Array.from(turn.rounds).reverse()) {
                const results = turn.resultMetadata?.toolCallResults;
                entries.unshift({ round, results });
                if (round.summary) {
                    return entries;
                }
            }
            entries.unshift(turn.request.message);
        }
        return entries;
    }
    renderEntry(entry, priorityOverride) {
        if (typeof entry === 'string') {
            return vscpp(ChunkTag, { name: 'user', priority: priorityOverride }, entry);
        }
        if (entry.round.summary) {
            return vscpp(ChunkTag, { name: 'conversation-summary', priority: priorityOverride },
                entry.round.summary,
                this.props.endpoint.family === 'gpt-4.1' && vscpp(tag_1.Tag, { name: 'reminderInstructions' },
                    vscpp(agentPrompt_1.KeepGoingReminder, { modelFamily: this.props.endpoint.family })));
        }
        return this.renderRound(entry.round, entry.results ?? {});
    }
    renderRound(round, results) {
        const asstMsg = round.response ?
            vscpp(ChunkTag, { name: 'assistant' }, round.response) :
            vscpp(ChunkTag, { name: 'assistant' });
        return [
            asstMsg,
            ...round.toolCalls.map(toolCall => this.renderToolCall(toolCall, results[toolCall.id]))
        ];
    }
    renderToolCall(toolCall, result) {
        return vscpp(ChunkTag, { name: 'tool' },
            "Used tool \"",
            toolCall.name,
            "\" with arguments: ",
            (0, strings_1.truncate)(toolCall.arguments, 200),
            vscpp("br", null),
            result ?
                vscpp(toolCalling_1.ToolResult, { content: result.content, truncate: this.props.maxToolResultLength / 2 }) :
                vscpp(vscppf, null, "Tool result empty"));
    }
}
exports.SimpleSummarizedHistory = SimpleSummarizedHistory;
class ChunkTag extends prompt_tsx_1.PromptElement {
    render() {
        const { name, children, attrs = {} } = this.props;
        return vscpp(prompt_tsx_1.Chunk, null,
            vscpp(tag_1.Tag, { name: name, attrs: attrs }, children));
    }
}
//# sourceMappingURL=simpleSummarizedHistoryPrompt.js.map