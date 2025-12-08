"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodebaseAgentPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const workspaceChunkSearchService_1 = require("../../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const toolNames_1 = require("../../../tools/common/toolNames");
const toolsRegistry_1 = require("../../../tools/common/toolsRegistry");
const instructionMessage_1 = require("../base/instructionMessage");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("./chatVariables");
const conversationHistory_1 = require("./conversationHistory");
const toolCalling_1 = require("./toolCalling");
const workspaceContext_1 = require("./workspace/workspaceContext");
const workspaceFoldersHint_1 = require("./workspace/workspaceFoldersHint");
const workspaceStructure_1 = require("./workspace/workspaceStructure");
let CodebaseAgentPrompt = class CodebaseAgentPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceChunkSearch, promptEndpoint) {
        super(props);
        this.workspaceChunkSearch = workspaceChunkSearch;
        this.promptEndpoint = promptEndpoint;
    }
    async render(state, sizing) {
        const { query, chatVariables, history, toolCallRounds, toolCallResults } = this.props.promptContext;
        const isCodesearchFast = await this.workspaceChunkSearch.hasFastSearch({ endpoint: this.promptEndpoint, tokenBudget: sizing.tokenBudget, fullWorkspaceTokenBudget: sizing.tokenBudget, maxResultCountHint: workspaceContext_1.MAX_CHUNKS_RESULTS });
        return (vscpp(vscppf, null,
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, passPriority: true, historyPriority: 700, history: history },
                vscpp(instructionMessage_1.InstructionMessage, null,
                    vscpp(tag_1.Tag, { name: 'context' },
                        vscpp(workspaceFoldersHint_1.WorkspaceFoldersHint, null),
                        vscpp(workspaceStructure_1.MultirootWorkspaceStructure, { maxSize: 2000, excludeDotFiles: true }),
                        vscpp("br", null),
                        "This view of the workspace structure may be truncated. You can use tools to collect more context if needed."),
                    vscpp(tag_1.Tag, { name: 'instructions' },
                        "You are a code search expert.",
                        vscpp("br", null),
                        "A developer needs to find some code in their codebase so that they can resolve a question or complete a task. You have full access to their codebase and can run tools to find code in it. Their request may contain hints for some of the files needed. It may require just one tool or many tools to collect the full context required.",
                        vscpp("br", null),
                        "First, analyze the developer's request to determine how complicated their task is. Keep your search focused on the developer's request, and don't run extra tools if the developer's request clearly can be satisfied by just one.",
                        vscpp("br", null),
                        "If the developer wants to implement a feature and they have not specified the relevant files, first break down the developer's request into smaller concepts and think about the kinds of files you need to grasp each concept.",
                        vscpp("br", null),
                        "If you cannot infer the project type (languages, frameworks, and libraries) from the developer's request or the context that you have, run the `",
                        toolNames_1.ToolName.ReadProjectStructure,
                        "` tool to get the lay of the land and read additional files to understand the project setup.",
                        vscpp("br", null),
                        "If you aren't sure which tool is relevant, you can call multiple tools. You can call tools repeatedly to take actions or gather as much context as needed.",
                        vscpp("br", null),
                        "Don't make assumptions about the situation. Gather enough context to address the developer's request without going overboard.",
                        vscpp("br", null),
                        "Your only task is to help the developer find context. Do not write code for the developer's request.",
                        vscpp("br", null),
                        "Your response will be read by your colleague who is an expert in editing files, not the developer, so do not offer to edit files or perform additional follow up actions at the end of your response."),
                    vscpp(tag_1.Tag, { name: 'toolUseInstructions' },
                        "Remember that you can call multiple tools in one response.",
                        vscpp("br", null),
                        "If you think running multiple tools can answer the user's question, prefer calling them in parallel whenever possible, but do not call `",
                        toolNames_1.ToolName.Codebase,
                        "` in parallel.",
                        vscpp("br", null),
                        "Use `",
                        toolNames_1.ToolName.Codebase,
                        "` to search for high level concepts or descriptions of functionality in the user's question.",
                        !isCodesearchFast && ` Note that '${toolNames_1.ToolName.Codebase}' is slow, so you should only run it if you are confident its results will be relevant.`,
                        vscpp("br", null),
                        "Prefer `",
                        toolNames_1.ToolName.SearchWorkspaceSymbols,
                        "` over `",
                        toolNames_1.ToolName.FindTextInFiles,
                        "` when you have precise code identifiers to search for.",
                        vscpp("br", null),
                        "Prefer `",
                        toolNames_1.ToolName.FindTextInFiles,
                        "` over `",
                        toolNames_1.ToolName.Codebase,
                        "` when you have precise keywords to search for.",
                        vscpp("br", null),
                        "When using a tool, follow the JSON schema very carefully and make sure to include all required fields.",
                        vscpp("br", null),
                        "If a tool exists to do a task, use the tool instead of asking the developer to manually take an action.",
                        vscpp("br", null),
                        "If you say that you will take an action, then go ahead and use the tool to do it.",
                        vscpp("br", null),
                        "The tools `",
                        toolNames_1.ToolName.FindFiles,
                        "`, `",
                        toolNames_1.ToolName.FindTextInFiles,
                        "`, and `",
                        toolNames_1.ToolName.GetScmChanges,
                        "` are deterministic and comprehensive, so do not repeatedly invoke them with the same arguments.",
                        vscpp("br", null),
                        "If the tool `",
                        toolNames_1.ToolName.Codebase,
                        "` returns the full contents of the text files in the workspace, you have all the workspace context.",
                        vscpp("br", null),
                        "Never use multi_tool_use.parallel or any tool that does not exist. Use tools using the proper procedure. DO NOT write out a JSON codeblock with the tool inputs."))),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext, toolCallRounds: toolCallRounds, toolCallResults: toolCallResults, toolCallMode: toolsRegistry_1.CopilotToolMode.FullContext }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: `The developer's request is: ${query}\n\nFind all code in the workspace relevant to the following request.`, includeFilepath: true, embeddedInsideUserMessage: false })));
    }
};
exports.CodebaseAgentPrompt = CodebaseAgentPrompt;
exports.CodebaseAgentPrompt = CodebaseAgentPrompt = __decorate([
    __param(1, workspaceChunkSearchService_1.IWorkspaceChunkSearchService),
    __param(2, promptRenderer_1.IPromptEndpoint)
], CodebaseAgentPrompt);
//# sourceMappingURL=codebaseAgentPrompt.js.map