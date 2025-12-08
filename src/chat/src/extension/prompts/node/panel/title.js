"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TitlePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const conversationHistory_1 = require("./conversationHistory");
class TitlePrompt extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an expert in crafting pithy titles for chatbot conversations. You are presented with a chat conversation, and you reply with a brief title that captures the main topic of discussion in that conversation.",
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { historyPriority: 800, passPriority: true, history: this.props.history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    "The title should not be wrapped in quotes. It should about 8 words or fewer.",
                    vscpp("br", null),
                    "Here are some examples of good titles:",
                    vscpp("br", null),
                    "- Git rebase question",
                    vscpp("br", null),
                    "- Installing Python packages",
                    vscpp("br", null),
                    "- Location of LinkedList implentation in codebase",
                    vscpp("br", null),
                    "- Adding a tree view to a VS Code extension",
                    vscpp("br", null),
                    "- React useState hook usage")),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900 }, "Please write a brief title for the chat conversation above. If the conversation covers multiple topics, you can just focus on the last one.")));
    }
}
exports.TitlePrompt = TitlePrompt;
//# sourceMappingURL=title.js.map