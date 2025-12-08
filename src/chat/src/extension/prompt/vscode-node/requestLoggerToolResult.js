"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderToolResultToStringNoBudget = renderToolResultToStringNoBudget;
exports.renderDataPartToString = renderDataPartToString;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const languageModelChatMessageHelpers_1 = require("../../conversation/common/languageModelChatMessageHelpers");
async function renderToolResultToStringNoBudget(part) {
    const r = await (0, prompt_tsx_1.renderPrompt)(class extends prompt_tsx_1.PromptElement {
        render() {
            return vscpp(prompt_tsx_1.UserMessage, null,
                vscpp("elementJSON", { data: part.value }));
        }
    }, {}, {
        modelMaxPromptTokens: Infinity,
    }, { mode: prompt_tsx_1.OutputMode.Raw, countMessageTokens: () => 0, tokenLength: () => 0 });
    const c = r.messages[0].content;
    return typeof c === 'string' ? c : c.map(p => p.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text ? p.text : p.type === prompt_tsx_1.Raw.ChatCompletionContentPartKind.Image ? `<promptTsxImg src="${p.imageUrl}" />` : undefined).join('');
}
function renderDataPartToString(part) {
    const isImage = Object.values(languageModelChatMessageHelpers_1.ChatImageMimeType).includes(part.mimeType);
    if (isImage) {
        // return a string of data uri schema
        const base64 = btoa(String.fromCharCode(...part.data));
        return `data:${part.mimeType};base64,${base64}`;
    }
    else {
        // return a string of the decoded data
        try {
            const nonImageStr = new TextDecoder().decode(part.data);
            return nonImageStr;
        }
        catch {
            return `<decode error: ${part.data.length} bytes>`;
        }
    }
}
//# sourceMappingURL=requestLoggerToolResult.js.map