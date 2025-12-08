"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiMessageToGeminiMessage = apiMessageToGeminiMessage;
exports.geminiMessagesToRawMessagesForLogging = geminiMessagesToRawMessagesForLogging;
exports.geminiMessagesToRawMessages = geminiMessagesToRawMessages;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const endpointTypes_1 = require("../../../platform/endpoint/common/endpointTypes");
const vscodeTypes_1 = require("../../../vscodeTypes");
function apiContentToGeminiContent(content) {
    const convertedContent = [];
    for (const part of content) {
        if (part instanceof vscodeTypes_1.LanguageModelToolCallPart) {
            convertedContent.push({
                functionCall: {
                    name: part.name,
                    args: part.input || {}
                }
            });
        }
        else if (part instanceof vscodeTypes_1.LanguageModelDataPart) {
            if (part.mimeType !== endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker && part.mimeType !== endpointTypes_1.CustomDataPartMimeTypes.CacheControl) {
                convertedContent.push({
                    inlineData: {
                        data: Buffer.from(part.data).toString('base64'),
                        mimeType: part.mimeType
                    }
                });
            }
        }
        else if (part instanceof vscodeTypes_1.LanguageModelToolResultPart || part instanceof vscodeTypes_1.LanguageModelToolResultPart2) {
            // Convert tool result content - handle both text and image parts
            const textContent = part.content
                .filter((p) => p instanceof vscodeTypes_1.LanguageModelTextPart)
                .map(p => p.value)
                .join('');
            // Handle image parts in tool results
            const imageParts = part.content.filter((p) => p instanceof vscodeTypes_1.LanguageModelDataPart &&
                p.mimeType !== endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker &&
                p.mimeType !== endpointTypes_1.CustomDataPartMimeTypes.CacheControl);
            // If there are images, we need to handle them differently
            // For now, we'll include image info in the text response since Gemini function responses expect structured data
            let imageDescription = '';
            if (imageParts.length > 0) {
                imageDescription = `\n[Contains ${imageParts.length} image(s) with types: ${imageParts.map(p => p.mimeType).join(', ')}]`;
            }
            // extraction: functionName_timestamp => split on first underscore
            const functionName = part.callId?.split('_')[0] || 'unknown_function';
            // Preserve structured JSON if possible
            let responsePayload = {};
            if (textContent) {
                // Handle case with text content (may also have images)
                try {
                    responsePayload = JSON.parse(textContent);
                    if (typeof responsePayload !== 'object' || responsePayload === null) {
                        responsePayload = { result: responsePayload };
                    }
                }
                catch {
                    responsePayload = { result: textContent + imageDescription };
                }
                // Add image info if present
                if (imageParts.length > 0) {
                    responsePayload.images = imageParts.map(p => ({
                        mimeType: p.mimeType,
                        size: p.data.length,
                        data: Buffer.from(p.data).toString('base64')
                    }));
                }
            }
            else if (imageParts.length > 0) {
                // Only images, no text content
                responsePayload = {
                    images: imageParts.map(p => ({
                        mimeType: p.mimeType,
                        size: p.data.length,
                        data: Buffer.from(p.data).toString('base64')
                    }))
                };
            }
            const functionResponse = {
                name: functionName,
                response: responsePayload
            };
            convertedContent.push({ functionResponse });
        }
        else {
            // Text content - only filter completely empty strings, keep whitespace
            if (part.value !== '') {
                convertedContent.push({
                    text: part.value
                });
            }
        }
    }
    return convertedContent;
}
function apiMessageToGeminiMessage(messages) {
    const contents = [];
    let systemInstruction;
    // Track tool calls to match with their responses
    const pendingToolCalls = new Map();
    for (const message of messages) {
        if (message.role === vscodeTypes_1.LanguageModelChatMessageRole.System) {
            // Gemini uses system instruction separately
            const systemText = message.content
                .filter((p) => p instanceof vscodeTypes_1.LanguageModelTextPart)
                .map(p => p.value)
                .join('');
            if (systemText.trim()) {
                systemInstruction = {
                    role: 'user',
                    parts: [{ text: systemText }]
                };
            }
        }
        else if (message.role === vscodeTypes_1.LanguageModelChatMessageRole.Assistant) {
            const parts = apiContentToGeminiContent(message.content);
            // Store function calls for later matching with responses
            parts.forEach(part => {
                if (part.functionCall && part.functionCall.name) {
                    pendingToolCalls.set(part.functionCall.name, part.functionCall);
                }
            });
            contents.push({
                role: 'model',
                parts
            });
        }
        else if (message.role === vscodeTypes_1.LanguageModelChatMessageRole.User) {
            const parts = apiContentToGeminiContent(message.content);
            contents.push({
                role: 'user',
                parts
            });
        }
    }
    // Post-process: ensure functionResponse parts are not embedded in 'model' role messages.
    // Gemini expects tool responses to be supplied by the *user*/caller after the model issues a functionCall.
    // If upstream accidentally placed tool result parts inside an assistant/model role, we split them out here.
    for (let i = 0; i < contents.length; i++) {
        const c = contents[i];
        if (c.role === 'model' && c.parts && c.parts.some(p => 'functionResponse' in p)) {
            const modelParts = [];
            const toolResultParts = [];
            for (const p of c.parts) {
                if ('functionResponse' in p) {
                    toolResultParts.push(p);
                }
                else {
                    modelParts.push(p);
                }
            }
            // Replace original with model-only parts
            c.parts = modelParts;
            // Insert a new user role content immediately after with the function responses
            if (toolResultParts.length) {
                contents.splice(i + 1, 0, { role: 'user', parts: toolResultParts });
                i++; // Skip over inserted element
            }
        }
    }
    // Cleanup: remove any model messages that became empty after extraction
    for (let i = contents.length - 1; i >= 0; i--) {
        const c = contents[i];
        if (c.role === 'model' && (!c.parts || c.parts.length === 0)) {
            contents.splice(i, 1);
        }
    }
    return { contents, systemInstruction };
}
function geminiMessagesToRawMessagesForLogging(contents, systemInstruction) {
    const fullMessages = geminiMessagesToRawMessages(contents, systemInstruction);
    // Replace bulky content with placeholders for logging
    return fullMessages.map(message => {
        const content = message.content.map(part => {
            if (part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image) {
                return {
                    ...part,
                    imageUrl: { url: '(image)' }
                };
            }
            return part;
        });
        if (message.role === prompt_tsx_1.Raw.ChatRole.Tool) {
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
function geminiMessagesToRawMessages(contents, systemInstruction) {
    const rawMessages = [];
    // Add system instruction if present
    if (systemInstruction && systemInstruction.parts) {
        const systemContent = [];
        systemInstruction.parts.forEach((part) => {
            if (part.text) {
                systemContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: part.text });
            }
        });
        if (systemContent.length) {
            rawMessages.push({ role: prompt_tsx_1.Raw.ChatRole.System, content: systemContent });
        }
    }
    // Convert Gemini contents to raw messages
    for (const content of contents) {
        const messageParts = [];
        let toolCalls;
        if (content.parts) {
            content.parts.forEach((part) => {
                if (part.text) {
                    messageParts.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: part.text });
                }
                else if (part.inlineData) {
                    messageParts.push({
                        type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image,
                        imageUrl: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` }
                    });
                }
                else if (part.functionCall && part.functionCall.name) {
                    toolCalls ??= [];
                    toolCalls.push({
                        id: part.functionCall.name, // Gemini doesn't have call IDs, use name
                        type: 'function',
                        function: {
                            name: part.functionCall.name,
                            arguments: JSON.stringify(part.functionCall.args ?? {})
                        }
                    });
                }
                else if (part.functionResponse && part.functionResponse.name) {
                    // Function responses should be emitted as tool messages
                    const toolContent = [];
                    // Handle structured response that might contain image data
                    const response = part.functionResponse.response;
                    if (response && typeof response === 'object' && 'images' in response && Array.isArray(response.images)) {
                        // Extract images from structured response and convert to Raw format
                        for (const img of response.images) {
                            if (img && typeof img === 'object' && 'data' in img && 'mimeType' in img) {
                                toolContent.push({
                                    type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image,
                                    imageUrl: { url: `data:${img.mimeType};base64,${img.data}` }
                                });
                            }
                        }
                        // Create a clean response object without the raw image data for text content
                        const cleanResponse = { ...response };
                        if ('images' in cleanResponse) {
                            cleanResponse.images = response.images.map((img) => ({
                                mimeType: img.mimeType,
                                size: img.size || (img.data ? img.data.length : 0)
                            }));
                        }
                        toolContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: JSON.stringify(cleanResponse) });
                    }
                    else {
                        // Standard text-only response
                        toolContent.push({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: JSON.stringify(response) });
                    }
                    rawMessages.push({
                        role: prompt_tsx_1.Raw.ChatRole.Tool,
                        content: toolContent,
                        toolCallId: part.functionResponse.name
                    });
                }
            });
        }
        // Add the main message if it has content
        if (messageParts.length > 0 || toolCalls) {
            const role = content.role === 'model' ? prompt_tsx_1.Raw.ChatRole.Assistant : prompt_tsx_1.Raw.ChatRole.User;
            const msg = { role, content: messageParts };
            if (toolCalls && content.role === 'model') {
                msg.toolCalls = toolCalls;
            }
            rawMessages.push(msg);
        }
    }
    return rawMessages;
}
//# sourceMappingURL=geminiMessageConverter.js.map