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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageModelAccessPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const endpointTypes_1 = require("../../../platform/endpoint/common/endpointTypes");
const statefulMarkerContainer_1 = require("../../../platform/endpoint/common/statefulMarkerContainer");
const thinkingDataContainer_1 = require("../../../platform/endpoint/common/thinkingDataContainer");
const safetyRules_1 = require("../../prompts/node/base/safetyRules");
const editorIntegrationRules_1 = require("../../prompts/node/panel/editorIntegrationRules");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const languageModelChatMessageHelpers_1 = require("../common/languageModelChatMessageHelpers");
class LanguageModelAccessPrompt extends prompt_tsx_1.PromptElement {
    async render() {
        const systemMessages = [];
        const chatMessages = [];
        for (const message of this.props.messages) {
            if (message.role === vscode.LanguageModelChatMessageRole.System) {
                // Filter out DataPart since it does not share the same value type and does not have callId, function, etc.
                const filteredContent = message.content.filter(part => !(part instanceof vscode.LanguageModelDataPart));
                systemMessages.push(filteredContent
                    .filter(part => part instanceof vscode.LanguageModelTextPart)
                    .map(part => part.value).join(''));
            }
            else if (message.role === vscode.LanguageModelChatMessageRole.Assistant) {
                const statefulMarkerPart = message.content.find(part => part instanceof vscode.LanguageModelDataPart && part.mimeType === endpointTypes_1.CustomDataPartMimeTypes.StatefulMarker);
                const statefulMarker = statefulMarkerPart && (0, statefulMarkerContainer_1.decodeStatefulMarker)(statefulMarkerPart.data);
                const filteredContent = message.content.filter(part => !(part instanceof vscode.LanguageModelDataPart));
                // There should only be one string part per message
                const content = filteredContent.find(part => part instanceof vscode_1.LanguageModelTextPart);
                const toolCalls = filteredContent.filter(part => part instanceof vscode.LanguageModelToolCallPart);
                const thinking = filteredContent.find(part => part instanceof vscode.LanguageModelThinkingPart);
                const statefulMarkerElement = statefulMarker && vscpp(statefulMarkerContainer_1.StatefulMarkerContainer, { statefulMarker: statefulMarker });
                const thinkingElement = thinking && thinking.id && vscpp(thinkingDataContainer_1.ThinkingDataContainer, { thinking: { id: thinking.id, text: thinking.value, metadata: thinking.metadata } });
                chatMessages.push(vscpp(prompt_tsx_1.AssistantMessage, { name: message.name, toolCalls: toolCalls.map(tc => ({ id: tc.callId, type: 'function', function: { name: tc.name, arguments: JSON.stringify(tc.input) } })) },
                    statefulMarkerElement,
                    content?.value,
                    thinkingElement));
            }
            else if (message.role === vscode.LanguageModelChatMessageRole.User) {
                for (const part of message.content) {
                    if (part instanceof vscode.LanguageModelToolResultPart2 || part instanceof vscode.LanguageModelToolResultPart) {
                        chatMessages.push(vscpp(prompt_tsx_1.ToolMessage, { toolCallId: part.callId },
                            vscpp(toolCalling_1.ToolResult, { content: part.content })));
                    }
                    else if ((0, languageModelChatMessageHelpers_1.isImageDataPart)(part)) {
                        const imageElement = await (0, toolCalling_1.imageDataPartToTSX)(part);
                        chatMessages.push(vscpp(prompt_tsx_1.UserMessage, { priority: 0 }, imageElement));
                    }
                    else if (part instanceof vscode.LanguageModelTextPart) {
                        chatMessages.push(vscpp(prompt_tsx_1.UserMessage, { name: message.name }, part.value));
                    }
                }
            }
        }
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, null, this.props.noSafety
                // Only custom system message
                ? systemMessages
                // Our and custom system message
                : vscpp(vscppf, null,
                    vscpp(safetyRules_1.SafetyRules, null),
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp("br", null),
                    systemMessages.join('\n'))),
            chatMessages));
    }
}
exports.LanguageModelAccessPrompt = LanguageModelAccessPrompt;
//# sourceMappingURL=languageModelAccessPrompt.js.map