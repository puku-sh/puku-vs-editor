"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceMetaPrompt = void 0;
exports.buildWorkspaceMetaPrompt = buildWorkspaceMetaPrompt;
exports.parseMetaPromptResponse = parseMetaPromptResponse;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const textDocumentSnapshot_1 = require("../../../../../platform/editing/common/textDocumentSnapshot");
const tabsAndEditorsService_1 = require("../../../../../platform/tabs/common/tabsAndEditorsService");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const instructionMessage_1 = require("../../base/instructionMessage");
const promptRenderer_1 = require("../../base/promptRenderer");
const chatVariables_1 = require("../chatVariables");
const conversationHistory_1 = require("../conversationHistory");
const workspaceStructure_1 = require("./workspaceStructure");
class WorkspaceMetaPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { scopedDirectories } = this.props;
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a coding assistant who help the user answer questions about code in their workspace by providing a list of relevant keywords they can search for to answer the question.",
                vscpp("br", null),
                "The user will provide you with potentially relevant information from the workspace. This information may be incomplete.",
                vscpp("br", null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { historyPriority: 500, passPriority: true, history: this.props.history || [] },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "Respond in Markdown. First under a `# Question` header, output a rephrased version of the user's question that resolves all pronouns and ambiguous words like 'this' to the specific nouns they stand for.",
                    vscpp("br", null),
                    "Then under a `# Keywords` header, output a short markdown list of up to 8 relevant keywords that the user can search for to answer the question. You may include variations after each keyword.",
                    vscpp("br", null),
                    "DO NOT ask the user for additional information or clarification.",
                    vscpp("br", null),
                    "DO NOT answer the user's question directly.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Additional Rules",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Think step by step:",
                    vscpp("br", null),
                    "1. Read the user's question to understand what they are asking about their workspace.",
                    vscpp("br", null),
                    "2. If the question contains pronouns such as 'it' or 'that', try to understand what the pronoun refers to by looking at the rest of the question and the conversation history.",
                    vscpp("br", null),
                    "3. If the question contains an ambiguous word such as 'this', try to understand what is refers to by looking at the rest of the question, the user's active selection, and the conversation history.",
                    vscpp("br", null),
                    "4. After a `# Question` header, output a precise version of question that resolves all pronouns and ambiguous words like 'this' to the specific nouns they stand for. Be sure to preserve the exact meaning of the question by only changing ambiguous pronouns and words like 'this'.",
                    vscpp("br", null),
                    "5. Then after a `# Keywords` header, output a short markdown list of up to 8 relevant keywords that user could try searching for to answer their question. These keywords could used as file name, symbol names, abbreviations, or comments in the relevant code. Put the keywords most relevant to the question first. Do not include overly generic keywords. Do not repeat keywords.",
                    vscpp("br", null),
                    "6. For each keyword in the markdown list of related keywords, if applicable add a comma separated list of variations after it. For example: for 'encode' possible variations include 'encoding', 'encoded', 'encoder', 'encoders'. Consider synonyms and plural forms. Do not repeat variations.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Examples",
                    vscpp("br", null),
                    vscpp("br", null),
                    "User: Where's the code for base64 encoding?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Assistant:",
                    vscpp("br", null),
                    "# Question",
                    vscpp("br", null),
                    "Where's the code for base64 encoding?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Keywords",
                    vscpp("br", null),
                    "- base64 encoding, base64 encoder, base64 encode",
                    vscpp("br", null),
                    "- base64, base 64",
                    vscpp("br", null),
                    "- encode, encoded, encoder, encoders")),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 }, scopedDirectories ?
                scopedDirectories.map(dir => vscpp(workspaceStructure_1.DirectoryStructure, { maxSize: 1000 / scopedDirectories.length, directory: dir })) :
                vscpp(workspaceStructure_1.WorkspaceStructure, { maxSize: 1000 })),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 1000, chatVariables: this.props.chatVariables, query: this.props.query, embeddedInsideUserMessage: false }));
    }
}
exports.WorkspaceMetaPrompt = WorkspaceMetaPrompt;
async function buildWorkspaceMetaPrompt(accessor, { query, history, chatVariables }, endpoint, scopedDirectories) {
    const editor = accessor.get(tabsAndEditorsService_1.ITabsAndEditorsService).activeTextEditor;
    const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, WorkspaceMetaPrompt, {
        chatVariables,
        query,
        history,
        scopedDirectories,
        document: editor ? textDocumentSnapshot_1.TextDocumentSnapshot.create(editor?.document) : undefined,
        selection: editor?.selection
    });
    return renderer.render();
}
const keywordLineRegexp = /^[\*\-]\s*(.+)/m;
function parseMetaPromptResponse(originalQuestion, response) {
    const match = response.match(/#+\s*Question\n(?<question>.+?)#+\s*Keywords\n(?<keywords>.+)/si);
    if (!match?.groups) {
        return { rephrasedQuestion: originalQuestion.trim(), keywords: [] };
    }
    const keywords = [];
    for (const line of match.groups['keywords'].trim().split('\n')) {
        const match = line.match(keywordLineRegexp);
        if (match) {
            const terms = match[1].split(/,/g).map(x => x.trim());
            if (terms.length) {
                keywords.unshift({ keyword: terms[0], variations: terms.slice(1) });
            }
        }
    }
    return { rephrasedQuestion: match.groups['question'].trim(), keywords };
}
//# sourceMappingURL=metaPrompt.js.map