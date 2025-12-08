"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchPanelKeywordsPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const safetyRules_1 = require("../base/safetyRules");
const chatVariables_1 = require("./chatVariables");
const conversationHistory_1 = require("./conversationHistory");
class SearchPanelKeywordsPrompt extends prompt_tsx_1.PromptElement {
    // todo: get workspace resolver to share TSX prompt so that we can reuse here
    render(state, sizing) {
        const { query, history, chatVariables } = this.props.promptContext;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a software engineer with expert knowledge of the codebase the user has open in their workspace.",
                vscpp("br", null),
                "You will be provided with a few code symbols that have been extracted as very relevant to a user's search query.",
                vscpp("br", null),
                "The user will be searching code extracts using natural language queries.",
                vscpp("br", null),
                "Your job is to find the best symbols to search for in order to find the exact code the user is looking for.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 2, historyPriority: 400, history: history, passPriority: true },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "# Additional Rules",
                    vscpp("br", null),
                    "Think step by step:",
                    vscpp("br", null),
                    "1. Read the provided relevant workspace symbols to understand the code the user is searching for.",
                    vscpp("br", null),
                    "2. Provide concise keyword symbols that are the most relevant for what the user is searching for.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "The keywords MUST have enough characters for the user to search for and find the relevant piece of code.",
                    vscpp("br", null),
                    "You MUST NOT include decorators or any other characters in the response.",
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
                    "convertEncoding()",
                    vscpp("br", null),
                    "toBase64()",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "npm scripts",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "npm run test",
                    vscpp("br", null),
                    "npm run build",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "register result provider",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "export class ResultProvider",
                    vscpp("br", null),
                    "registerResultProvider()",
                    vscpp("br", null),
                    "IResultProvider",
                    vscpp("br", null),
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(vscppf, null,
                    "Here are all the relevant symbols for the user query:",
                    vscpp("br", null),
                    this.props.promptContext.symbols.join('\n'),
                    vscpp("br", null),
                    vscpp("br", null)),
                vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext }),
                vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, chatVariables: chatVariables, priority: 900, query: query }))));
    }
}
exports.SearchPanelKeywordsPrompt = SearchPanelKeywordsPrompt;
//# sourceMappingURL=searchPanelKeywordsPrompt.js.map