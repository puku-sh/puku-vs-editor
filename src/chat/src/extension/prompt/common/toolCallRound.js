"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThinkingDataItem = exports.ToolCallRound = void 0;
const thinking_1 = require("../../../platform/thinking/common/thinking");
const uuid_1 = require("../../../util/vs/base/common/uuid");
/**
 * Represents a round of tool calling from the AI assistant.
 * Each round contains the assistant's response text, any tool calls it made,
 * and retry information if there were input validation issues.
 */
class ToolCallRound {
    /**
     * Creates a ToolCallRound from an existing IToolCallRound object.
     * Prefer this over using a constructor overload to keep construction explicit.
     */
    static create(params) {
        const round = new ToolCallRound(params.response, params.toolCalls, params.toolInputRetry, params.id, params.statefulMarker, params.thinking);
        round.summary = params.summary;
        return round;
    }
    /**
     * @param response The text response from the assistant
     * @param toolCalls The tool calls made by the assistant
     * @param toolInputRetry The number of times this round has been retried due to tool input validation failures
     * @param id A stable identifier for this round
     * @param statefulMarker Optional stateful marker used with the responses API
     */
    constructor(response, toolCalls = [], toolInputRetry = 0, id = ToolCallRound.generateID(), statefulMarker, thinking) {
        this.response = response;
        this.toolCalls = toolCalls;
        this.toolInputRetry = toolInputRetry;
        this.id = id;
        this.statefulMarker = statefulMarker;
        this.thinking = thinking;
    }
    static generateID() {
        return (0, uuid_1.generateUuid)();
    }
}
exports.ToolCallRound = ToolCallRound;
class ThinkingDataItem {
    static createOrUpdate(item, delta) {
        if (!item) {
            item = new ThinkingDataItem(delta.id ?? (0, uuid_1.generateUuid)());
        }
        item.update(delta);
        return item;
    }
    constructor(id) {
        this.id = id;
        this.text = '';
    }
    update(delta) {
        if (delta.id && this.id !== delta.id) {
            this.id = delta.id;
        }
        if ((0, thinking_1.isEncryptedThinkingDelta)(delta)) {
            this.encrypted = delta.encrypted;
        }
        if (delta.text !== undefined) {
            // handles all possible text states
            if (Array.isArray(delta.text)) {
                if (Array.isArray(this.text)) {
                    this.text.push(...delta.text);
                }
                else if (this.text) {
                    this.text = [this.text, ...delta.text];
                }
                else {
                    this.text = [...delta.text];
                }
            }
            else {
                if (Array.isArray(this.text)) {
                    this.text.push(delta.text);
                }
                else {
                    this.text += delta.text;
                }
            }
        }
        if (delta.metadata) {
            this.metadata = delta.metadata;
        }
    }
    updateWithFetchResult(fetchResult) {
        this.tokens = fetchResult.usage?.completion_tokens_details?.reasoning_tokens;
    }
}
exports.ThinkingDataItem = ThinkingDataItem;
//# sourceMappingURL=toolCallRound.js.map