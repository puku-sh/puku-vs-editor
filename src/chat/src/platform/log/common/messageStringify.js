"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageToMarkdown = messageToMarkdown;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const globalStringUtils_1 = require("../../chat/common/globalStringUtils");
const statefulMarkerContainer_1 = require("../../endpoint/common/statefulMarkerContainer");
const thinkingDataContainer_1 = require("../../endpoint/common/thinkingDataContainer");
function messageToMarkdown(message, ignoreStatefulMarker) {
    const role = (0, globalStringUtils_1.roleToString)(message.role);
    const capitalizedRole = role.charAt(0).toUpperCase() + role.slice(1);
    let str = `### ${capitalizedRole}\n~~~md\n`;
    if (message.role === prompt_tsx_1.Raw.ChatRole.Tool) {
        str += `🛠️ ${message.toolCallId}`;
        if (message.content) {
            str += '\n';
        }
    }
    if (Array.isArray(message.content)) {
        str += message.content.map(item => {
            if (item.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text) {
                return item.text;
            }
            else if (item.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image) {
                return JSON.stringify(item);
            }
            else if (item.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque) {
                const asThinking = (0, thinkingDataContainer_1.rawPartAsThinkingData)(item);
                if (asThinking?.encrypted?.length) {
                    return `[reasoning.encrypted_content=${asThinking.encrypted.length} chars, id=${asThinking.id}]\n`;
                }
            }
        }).join('\n');
    }
    else {
        str += message.content;
    }
    if (message.role === prompt_tsx_1.Raw.ChatRole.Assistant && message.toolCalls?.length) {
        if (message.content) {
            str += '\n';
        }
        str += message.toolCalls.map(c => {
            let argsStr = c.function.arguments;
            try {
                const parsedArgs = JSON.parse(c.function.arguments);
                argsStr = JSON.stringify(parsedArgs, undefined, 2)
                    .replace(/(?<!\\)\\n/g, '\n')
                    .replace(/(?<!\\)\\t/g, '\t');
            }
            catch (e) { }
            return `🛠️ ${c.function.name} (${c.id}) ${argsStr}`;
        }).join('\n');
    }
    if (message.content.some(part => part.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint)) {
        str += `\n[copilot_cache_control: { type: 'ephemeral' }]`;
    }
    const statefulMarker = (0, arraysFind_1.mapFindFirst)(message.content, c => c.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Opaque ? (0, statefulMarkerContainer_1.rawPartAsStatefulMarker)(c) : undefined);
    if (statefulMarker && !ignoreStatefulMarker) {
        str += `\n[response_id: ${statefulMarker.marker} with ${statefulMarker.modelId}]`;
    }
    str += '\n~~~\n';
    return str;
}
//# sourceMappingURL=messageStringify.js.map