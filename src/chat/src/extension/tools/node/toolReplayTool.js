"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolReplayTool = void 0;
const vscodeTypes_1 = require("../../../vscodeTypes");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const chatReplayResponses_1 = require("../../replay/common/chatReplayResponses");
class ToolReplayTool {
    static { this.toolName = toolNames_1.ToolName.ToolReplay; }
    invoke(options, token) {
        const replay = chatReplayResponses_1.ChatReplayResponses.getInstance();
        const { toolCallId } = options.input;
        const toolResults = replay.getToolResult(toolCallId) ?? [];
        return new vscodeTypes_1.LanguageModelToolResult(toolResults.map(result => new vscodeTypes_1.LanguageModelTextPart(result)));
    }
    prepareInvocation(options, token) {
        return {
            invocationMessage: options.input.toolName
        };
    }
}
exports.ToolReplayTool = ToolReplayTool;
toolsRegistry_1.ToolRegistry.registerTool(ToolReplayTool);
//# sourceMappingURL=toolReplayTool.js.map