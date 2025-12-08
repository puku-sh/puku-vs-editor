"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvideFeedbackPrompt = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const copilotIdentity_1 = require("../base/copilotIdentity");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const chatVariables_1 = require("../panel/chatVariables");
const customInstructions_1 = require("../panel/customInstructions");
const editorIntegrationRules_1 = require("../panel/editorIntegrationRules");
const projectLabels_1 = require("../panel/projectLabels");
const symbolDefinitions_1 = require("../panel/symbolDefinitions");
const currentChange_1 = require("./currentChange");
class ProvideFeedbackPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1001 },
                "You are a world-class software engineer and the author and maintainer of the discussed code. Your feedback prefectly combines detailed feedback and explanation of context.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                vscpp("br", null),
                "Additional Rules",
                vscpp("br", null),
                "Think step by step:",
                vscpp("br", null),
                "1. Examine the provided code and any other context like user question, related errors, project details, class definitions, etc.",
                vscpp("br", null),
                "2. Provide feedback on the current ",
                this.props.input[0]?.change ? vscpp(vscppf, null, "change") : vscpp(vscppf, null, "selection"),
                " on where it can be improved or introduces a problem.",
                vscpp("br", null),
                "2a. Avoid commenting on correct code.",
                vscpp("br", null),
                "2b. Avoid commenting on commented out code.",
                vscpp("br", null),
                "2c. Keep scoping rules in mind.",
                vscpp("br", null),
                "3. Reply with an enumerated list of feedback with source line number, filepath, kind (bug, performance, consistency, documentation, naming, readability, style, other), severity (low, medium, high), and feedback text.",
                vscpp("br", null),
                "3a. E.g.: 1. Line 357 in src/flow.js, bug, high severity: `i` is not incremented.",
                vscpp("br", null),
                "3b. E.g.: 2. Line 361 in src/arrays.js, documentation, low severity: Function `binarySearch` is not documented.",
                vscpp("br", null),
                "3c. E.g.: 3. Line 176 in src/vs/platform/actionWidget/browser/actionWidget.ts, consistency, medium severity: The color id `'background.actionBar'` is not consistent with the other color ids used. Use `'actionBar.background'` instead.",
                vscpp("br", null),
                "3d. E.g.: 4. Line 410 in src/search.js, documentation, medium severity: Returning `-1` when the target is not found is a common convention, but it should be documented.",
                vscpp("br", null),
                "3e. E.g.: 5. Line 51 in src/account.py, bug, high severity: The deposit method is not thread-safe. You should use a lock to ensure that the balance update is an atomic operation.",
                vscpp("br", null),
                "3f. E.g.: 6. Line 220 in src/account.py, readability, low severity: The withdraw method is very long and combines multipe logical steps, consider splitting it into multiple methods.",
                vscpp("br", null),
                "4. Try to sort the feedback by file and line number.",
                vscpp("br", null),
                "5. When there is no feedback to provide, reply with \"No feedback to provide.\"",
                vscpp("br", null),
                vscpp("br", null),
                "Focus on being clear, helpful, and thorough.",
                vscpp("br", null),
                "Use developer-friendly terms and analogies in your explanations.",
                vscpp("br", null),
                "Provide clear and relevant examples when helpful."),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1 },
                vscpp(projectLabels_1.ProjectLabels, { flexGrow: 1, priority: 700 }),
                vscpp(customInstructions_1.CustomInstructions, { chatVariables: this.props.chatVariables, priority: 850, languageId: this.props.input[0]?.document.languageId, customIntroduction: 'When providing feedback for code, please check for these user provided coding guidelines.', includeCodeFeedbackInstructions: true }),
                vscpp(currentChange_1.CurrentChange, { input: this.props.input, logService: this.props.logService, priority: 1000, flexGrow: 2 }),
                this.props.input.map(input => (vscpp(symbolDefinitions_1.SymbolDefinitions, { document: input.document, range: input.selection, priority: 800 }))),
                this.props.chatVariables && this.props.query && vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, priority: 900, chatVariables: this.props.chatVariables, query: this.props.query }))));
    }
}
exports.ProvideFeedbackPrompt = ProvideFeedbackPrompt;
//# sourceMappingURL=provideFeedback.js.map