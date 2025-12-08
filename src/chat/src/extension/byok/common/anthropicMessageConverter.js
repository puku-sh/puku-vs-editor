"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiMessageToAnthropicMessage = apiMessageToAnthropicMessage;
exports.anthropicMessagesToRawMessagesForLogging = anthropicMessagesToRawMessagesForLogging;
exports.anthropicMessagesToRawMessages = anthropicMessagesToRawMessages;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const endpointTypes_1 = require("../../../platform/endpoint/common/endpointTypes");
const types_1 = require("../../../util/vs/base/common/types");
const vscodeTypes_1 = require("../../../vscodeTypes");
function apiContentToAnthropicContent(content) {
    const convertedContent = [];
    for (const part of content) {
        if (part instanceof vscodeTypes_1.LanguageModelThinkingPart) {
            // Check if this is a redacted thinking block
            if (part.metadata?.redactedData) {
                convertedContent.push({
                    type: 'redacted_thinking',
                    data: part.metadata.redactedData,
                });
            }
            else if (part.metadata?._completeThinking) {
                // Only push thinking block when we have the complete thinking marker
                convertedContent.push({
                    type: 'thinking',
                    thinking: part.metadata._completeThinking,
                    signature: part.metadata.signature || '',
                });
            }
            // Skip incremental thinking parts - we only care about the complete one
        }
        else if (part instanceof vscodeTypes_1.LanguageModelToolCallPart) {
            convertedContent.push({
                type: 'tool_use',
                id: part.callId,
                input: part.input,
                name: part.name,
            });
        }
        else if (part instanceof vscodeTypes_1.LanguageModelDataPart && part.mimeType === endpointTypes_1.CustomDataPartMimeTypes.CacheControl && part.data.toString() === 'ephemeral') {
            const previousBlock = convertedContent.at(-1);
            if (previousBlock && contentBlockSupportsCacheControl(previousBlock)) {
                previousBlock.cache_control = { type: 'ephemeral' };
            }
            else {
                // Empty string is invalid
                convertedContent.push({
                    type: 'text',
                    text: ' ',
                    cache_control: { type: 'ephemeral' }
                });
            }
        }
        else if (part instanceof vscodeTypes_1.LanguageModelDataPart) {
            if (part.mimeType !== endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker) {
                convertedContent.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        data: Buffer.from(part.data).toString('base64'),
                        media_type: part.mimeType
                    }
                });
            }
        }
        else if (part instanceof vscodeTypes_1.LanguageModelToolResultPart || part instanceof vscodeTypes_1.LanguageModelToolResultPart2) {
            convertedContent.push({
                type: 'tool_result',
                tool_use_id: part.callId,
                content: part.content.map((p) => {
                    if (p instanceof vscodeTypes_1.LanguageModelTextPart) {
                        return { type: 'text', text: p.value };
                    }
                    else if (p instanceof vscodeTypes_1.LanguageModelDataPart && p.mimeType === endpointTypes_1.CustomDataPartMimeTypes.CacheControl && p.data.toString() === 'ephemeral') {
                        // Empty string is invalid
                        return { type: 'text', text: ' ', cache_control: { type: 'ephemeral' } };
                    }
                    else if (p instanceof vscodeTypes_1.LanguageModelDataPart) {
                        return { type: 'image', source: { type: 'base64', media_type: p.mimeType, data: Buffer.from(p.data).toString('base64') } };
                    }
                }).filter(types_1.isDefined),
            });
        }
        else {
            // Anthropic errors if we have text parts with empty string text content
            if (part.value === '') {
                continue;
            }
            convertedContent.push({
                type: 'text',
                text: part.value
            });
        }
    }
    return convertedContent;
}
function apiMessageToAnthropicMessage(messages) {
    const unmergedMessages = [];
    const systemMessage = {
        type: 'text',
        text: ''
    };
    for (const message of messages) {
        if (message.role === vscodeTypes_1.LanguageModelChatMessageRole.Assistant) {
            unmergedMessages.push({
                role: 'assistant',
                content: apiContentToAnthropicContent(message.content),
            });
        }
        else if (message.role === vscodeTypes_1.LanguageModelChatMessageRole.User) {
            unmergedMessages.push({
                role: 'user',
                content: apiContentToAnthropicContent(message.content),
            });
        }
        else {
            systemMessage.text += message.content.map(p => {
                // For some reason instance of doesn't work
                if (p instanceof vscodeTypes_1.LanguageModelTextPart) {
                    return p.value;
                }
                else if (p instanceof vscodeTypes_1.LanguageModelDataPart && p.mimeType === endpointTypes_1.CustomDataPartMimeTypes.CacheControl && p.data.toString() === 'ephemeral') {
                    systemMessage.cache_control = { type: 'ephemeral' };
                }
                return '';
            }).join('');
        }
    }
    // Merge messages of the same type that are adjacent together, this is what anthropic expects
    const mergedMessages = [];
    for (const message of unmergedMessages) {
        if (mergedMessages.length === 0 || mergedMessages[mergedMessages.length - 1].role !== message.role) {
            mergedMessages.push(message);
        }
        else {
            // Merge with the previous message of the same role
            const prevMessage = mergedMessages[mergedMessages.length - 1];
            // Concat the content arrays if they're both arrays - They always will be due to the way apiContentToAnthropicContent works
            if (Array.isArray(prevMessage.content) && Array.isArray(message.content)) {
                prevMessage.content.push(...message.content);
            }
        }
    }
    return { messages: mergedMessages, system: systemMessage };
}
function contentBlockSupportsCacheControl(block) {
    return block.type !== 'thinking' && block.type !== 'redacted_thinking';
}
function anthropicMessagesToRawMessagesForLogging(messages, system) {
    // Start with full-fidelity conversion, then sanitize for logging
    const fullMessages = anthropicMessagesToRawMessages(messages, system);
    // Replace bulky content with placeholders
    return fullMessages.map(message => {
        const content = message.content.map(part => {
            if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image) {
                // Replace actual image URLs with placeholder for logging
                return {
                    ...part,
                    imageUrl: { url: '(image)' }
                };
            }
            return part;
        });
        if (message.role === prompt_tsx_1.Raw.ChatRole.Tool) {
            // Replace tool result content with placeholder for logging
            return {
                ...message,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: '(tool result)' }]
            };
        }
        return {
            ...message,
            content
        };
    });
}
/**
 * Full-fidelity conversion of Anthropic MessageParam[] + system to Raw.ChatMessage[] suitable for sending to endpoints.
 * Compared to the logging variant, this preserves tool_result content and image data (as data URLs when possible).
 */
function anthropicMessagesToRawMessages(messages, system) {
    const rawMessages = [];
    if (system) {
        const systemContent = [];
        if (system.text) {
            systemContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: system.text });
        }
        if (system.cache_control) {
            systemContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint, cacheType: system.cache_control.type });
        }
        if (systemContent.length) {
            rawMessages.push({ role: prompt_tsx_1.Raw.ChatRole.System, content: systemContent });
        }
    }
    for (const message of messages) {
        const content = [];
        let toolCalls;
        let toolCallId;
        const toRawImage = (img) => {
            if (img.source.type === 'base64') {
                return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image, imageUrl: { url: `data:${img.source.media_type};base64,${img.source.data}` } };
            }
            else if (img.source.type === 'url') {
                return { type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image, imageUrl: { url: img.source.url } };
            }
        };
        const pushImage = (img) => {
            const imagePart = toRawImage(img);
            if (imagePart) {
                content.push(imagePart);
            }
        };
        const pushCache = (block) => {
            if (block && contentBlockSupportsCacheControl(block) && block.cache_control) {
                content.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint, cacheType: block.cache_control.type });
            }
        };
        if (Array.isArray(message.content)) {
            for (const block of message.content) {
                if (block.type === 'text') {
                    content.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: block.text });
                    pushCache(block);
                }
                else if (block.type === 'image') {
                    pushImage(block);
                    pushCache(block);
                }
                else if (block.type === 'thinking') {
                    // Include thinking content for logging
                    content.push({
                        type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text,
                        text: `[THINKING: ${block.thinking}]`
                    });
                }
                else if (block.type === 'redacted_thinking') {
                    content.push({
                        type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text,
                        text: '[REDACTED THINKING]'
                    });
                }
                else if (block.type === 'tool_use') {
                    // tool_use appears in assistant messages; represent as toolCalls on assistant message
                    toolCalls ??= [];
                    toolCalls.push({
                        id: block.id,
                        type: 'function',
                        function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) }
                    });
                    // no content part, tool call is separate
                    pushCache(block);
                }
                else if (block.type === 'tool_result') {
                    // tool_result appears in user role; we'll emit a Raw.Tool message later with this toolCallId and content
                    toolCallId = block.tool_use_id;
                    // Translate tool result content to raw parts
                    const toolContent = [];
                    if (typeof block.content === 'string') {
                        toolContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: block.content });
                    }
                    else {
                        for (const c of block.content ?? []) {
                            if (c.type === 'text') {
                                toolContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: c.text });
                            }
                            else if (c.type === 'image') {
                                const imagePart = toRawImage(c);
                                if (imagePart) {
                                    toolContent.push(imagePart);
                                }
                            }
                        }
                    }
                    // Emit the tool result message now and continue to next message
                    rawMessages.push({ role: prompt_tsx_1.Raw.ChatRole.Tool, content: toolContent.length ? toolContent : [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: '' }], toolCallId });
                    toolCallId = undefined;
                }
                else {
                    // thinking or unsupported types are ignored
                }
            }
        }
        else if (typeof message.content === 'string') {
            content.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: message.content });
        }
        if (message.role === 'assistant') {
            const msg = { role: prompt_tsx_1.Raw.ChatRole.Assistant, content };
            if (toolCalls && toolCalls.length > 0) {
                msg.toolCalls = toolCalls;
            }
            rawMessages.push(msg);
        }
        else if (message.role === 'user') {
            // note: tool_result handled earlier; here we push standard user content if any
            if (content.length) {
                rawMessages.push({ role: prompt_tsx_1.Raw.ChatRole.User, content });
            }
        }
    }
    return rawMessages;
}
//# sourceMappingURL=anthropicMessageConverter.js.map