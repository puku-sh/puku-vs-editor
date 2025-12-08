"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalExplainPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const copilotIdentity_1 = require("../base/copilotIdentity");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const chatVariables_1 = require("./chatVariables");
const conversationHistory_1 = require("./conversationHistory");
const customInstructions_1 = require("./customInstructions");
const editorIntegrationRules_1 = require("./editorIntegrationRules");
const terminalLastCommand_1 = require("./terminalLastCommand");
const terminalSelection_1 = require("./terminalSelection");
class TerminalExplainPrompt extends prompt_tsx_1.PromptElement {
    render(state) {
        const { history, chatVariables, } = this.props.promptContext;
        const query = this.props.promptContext.query || 'What did the last command do?';
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a programmer who specializes in using the command line. Your task is to help the Developer by giving a detailed answer to their query.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, historyPriority: 600, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    `Generate a response that clearly and accurately answers the user's question. In your response, follow the following:
- Provide any command suggestions using the active shell and operating system.
- Say "I'm not quite sure how to do that." when you aren't confident in your explanation`,
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 750 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                "The active terminal's shell type is:",
                vscpp("br", null),
                this.props.shellType),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                "The active operating system is:",
                vscpp("br", null),
                this.props.osName),
            vscpp(terminalSelection_1.TerminalSelection, { flexGrow: 1, priority: 800 }),
            vscpp(terminalLastCommand_1.TerminalLastCommand, { flexGrow: 1, priority: 800 }),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false })));
    }
}
exports.TerminalExplainPrompt = TerminalExplainPrompt;
//# sourceMappingURL=terminalExplain.js.map