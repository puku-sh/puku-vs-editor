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
exports.SearchPanelPrompt = exports.SearchChunkResult = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../../util/common/markdown");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const chatVariables_1 = require("./chatVariables");
const conversationHistory_1 = require("./conversationHistory");
const editorIntegrationRules_1 = require("./editorIntegrationRules");
let SearchChunkResult = class SearchChunkResult extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService) {
        super(props);
        this.workspaceService = workspaceService;
    }
    render() {
        if (!this.props.chunkResults.length) {
            return;
        }
        return vscpp(vscppf, null, this.props.chunkResults
            .map((chunk, i) => {
            // Give chunks a scaled priority from `X` to `X + 1` with the earliest chunks having the highest priority
            const priority = typeof this.props.priority !== 'undefined'
                ? this.props.priority + (1 - ((i + 1) / this.props.chunkResults.length))
                : undefined;
            return { chunk, priority };
        })
            // Send chunks in reverse order with most relevant chunks last
            .reverse()
            .filter(x => x.chunk.text)
            .map(({ chunk, priority }) => {
            const fileLabel = (0, workspaceService_1.getWorkspaceFileDisplayPath)(this.workspaceService, chunk.file);
            return vscpp(prompt_tsx_1.TextChunk, { priority: priority },
                chunk.isFullFile
                    ? `Here is the full text of \`${fileLabel}\`:`
                    : `Here is a potentially relevant text excerpt in \`${fileLabel}\` starting at line ${chunk.range.startLineNumber}:`,
                vscpp("br", null),
                (0, markdown_1.createFencedCodeBlock)((0, markdown_1.getLanguageId)(chunk.file), chunk.text),
                vscpp("br", null),
                vscpp("br", null));
        }));
    }
};
exports.SearchChunkResult = SearchChunkResult;
exports.SearchChunkResult = SearchChunkResult = __decorate([
    __param(1, workspaceService_1.IWorkspaceService)
], SearchChunkResult);
class SearchPanelPrompt extends prompt_tsx_1.PromptElement {
    constructor() {
        super(...arguments);
        this.base64Code = `
\`\`\`json
[
	{
		"file": "/src/encoders/base64.ts",
		"query": "/src/encoders/base64.ts:private async decodeFunction()"
	}
]
\`\`\`
`;
        this.npmCode = `
\`\`\`json
[
	{
		"file": "/package.json",
		"query": "npm run test"
	},
	{
		"file": "/src/second-package/package.json",
		"query": "npm run production"
	}
]
\`\`\`
`;
    }
    render(state, sizing) {
        const { query, history, chatVariables } = this.props.promptContext;
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a software engineer with expert knowledge of the codebase the user has open in their workspace.",
                vscpp("br", null),
                "You will be provided with a few code excerpts, file names, and symbols from the user's that have been extracted as important to the user's query.",
                vscpp("br", null),
                "Your job is to understand what the user is searching for and find the relevant piece of code.",
                vscpp("br", null),
                "That piece of code will be searched for using grep in the user's workspace.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 2, historyPriority: 400, history: history, passPriority: true },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    "# Additional Rules",
                    vscpp("br", null),
                    "Think step by step:",
                    vscpp("br", null),
                    "1. Read the provided relevant workspace information (code excerpts, file names, and symbols) to understand the user's workspace.",
                    vscpp("br", null),
                    "2. Select ONLY from the provided code excerpts, file names, and symbols any code snippets that are relevant to the user's query.",
                    vscpp("br", null),
                    "3. Provide ONE query FOR EACH code excerpt the user should search for in order to find the relevant wrapping code, prioritizing the most meaningful code, class names, functions, definitions, etc.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "You MUST ONLY consider the included code excerpts, file names and symbols to provide your answer.",
                    vscpp("br", null),
                    "You MUST only return the file path and the query or phrase to search for using grep",
                    vscpp("br", null),
                    "You MUST avoid returning queries that are too short and too generic that would return a lot of noisy results",
                    vscpp("br", null),
                    "You MUST return one query per code excerpt provided",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Examples",
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "base64 encoding",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    this.base64Code,
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "npm scripts",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    this.npmCode)),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(SearchChunkResult, { priority: 898, chunkResults: this.props.promptContext.chunkResults }),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, chatVariables: chatVariables, priority: 900, query: `Here is the user query: ${query}` })));
    }
}
exports.SearchPanelPrompt = SearchPanelPrompt;
//# sourceMappingURL=searchPanelPrompt.js.map