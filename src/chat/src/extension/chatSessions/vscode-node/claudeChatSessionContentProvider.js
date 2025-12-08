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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeChatSessionContentProvider = void 0;
const vscode = __importStar(require("vscode"));
const arrays_1 = require("../../../util/vs/base/common/arrays");
const vscodeTypes_1 = require("../../../vscodeTypes");
const claudeTools_1 = require("../../agents/claude/common/claudeTools");
const toolInvocationFormatter_1 = require("../../agents/claude/common/toolInvocationFormatter");
const claudeCodeSessionService_1 = require("../../agents/claude/node/claudeCodeSessionService");
let ClaudeChatSessionContentProvider = class ClaudeChatSessionContentProvider {
    constructor(sessionService) {
        this.sessionService = sessionService;
    }
    async provideChatSessionContent(sessionResource, token) {
        const existingSession = await this.sessionService.getSession(sessionResource, token);
        const toolContext = this._createToolContext();
        const history = existingSession ?
            this._buildChatHistory(existingSession, toolContext) :
            [];
        return {
            history,
            activeResponseCallback: undefined,
            requestHandler: undefined,
        };
    }
    _userMessageToRequest(message, toolContext) {
        const textContent = this._extractTextContent(message.content);
        this._processToolResults(message.content, toolContext);
        // If the user message only contains tool results and no visible text, don't create a request turn
        if (!textContent.trim()) {
            return;
        }
        return new vscodeTypes_1.ChatRequestTurn2(textContent, undefined, [], '', [], undefined);
    }
    _assistantMessageToResponse(message, toolContext) {
        const responseParts = (0, arrays_1.coalesce)(message.content.map(block => {
            if (block.type === 'text') {
                return new vscode.ChatResponseMarkdownPart(new vscode.MarkdownString(block.text));
            }
            else if (block.type === 'tool_use') {
                if (block.name === claudeTools_1.ClaudeToolNames.ExitPlanMode) {
                    return new vscode.ChatResponseMarkdownPart(new vscode.MarkdownString(`\`\`\`\`\n${block.input.plan}\`\`\`\n\n`));
                }
                toolContext.unprocessedToolCalls.set(block.id, block);
                const toolInvocation = (0, toolInvocationFormatter_1.createFormattedToolInvocation)(block);
                if (toolInvocation) {
                    toolContext.pendingToolInvocations.set(block.id, toolInvocation);
                }
                return toolInvocation;
            }
        }));
        return new vscode.ChatResponseTurn2(responseParts, {}, '');
    }
    _createToolContext() {
        return {
            unprocessedToolCalls: new Map(),
            pendingToolInvocations: new Map()
        };
    }
    _buildChatHistory(existingSession, toolContext) {
        if (!existingSession) {
            return [];
        }
        return (0, arrays_1.coalesce)(existingSession.messages.map((m) => {
            if (m.type === 'user') {
                return this._userMessageToRequest(m.message, toolContext);
            }
            else if (m.type === 'assistant') {
                return this._assistantMessageToResponse(m.message, toolContext);
            }
        }));
    }
    _extractTextContent(content) {
        if (typeof content === 'string') {
            return content;
        }
        return content
            .filter((block) => block.type === 'text')
            .map(block => block.text)
            .join('');
    }
    _processToolResults(content, toolContext) {
        if (typeof content === 'string') {
            return;
        }
        for (const block of content) {
            if (block.type === 'tool_result') {
                const toolResultBlock = block;
                const toolUse = toolContext.unprocessedToolCalls.get(toolResultBlock.tool_use_id);
                if (toolUse) {
                    toolContext.unprocessedToolCalls.delete(toolResultBlock.tool_use_id);
                    const pendingInvocation = toolContext.pendingToolInvocations.get(toolResultBlock.tool_use_id);
                    if (pendingInvocation) {
                        (0, toolInvocationFormatter_1.createFormattedToolInvocation)(toolUse, toolResultBlock, pendingInvocation);
                        toolContext.pendingToolInvocations.delete(toolResultBlock.tool_use_id);
                    }
                }
            }
        }
    }
};
exports.ClaudeChatSessionContentProvider = ClaudeChatSessionContentProvider;
exports.ClaudeChatSessionContentProvider = ClaudeChatSessionContentProvider = __decorate([
    __param(0, claudeCodeSessionService_1.IClaudeCodeSessionService)
], ClaudeChatSessionContentProvider);
//# sourceMappingURL=claudeChatSessionContentProvider.js.map