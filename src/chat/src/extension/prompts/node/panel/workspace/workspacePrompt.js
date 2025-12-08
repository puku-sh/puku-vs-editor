"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspacePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const telemetryCorrelationId_1 = require("../../../../../util/common/telemetryCorrelationId");
const copilotIdentity_1 = require("../../base/copilotIdentity");
const instructionMessage_1 = require("../../base/instructionMessage");
const responseTranslationRules_1 = require("../../base/responseTranslationRules");
const safetyRules_1 = require("../../base/safetyRules");
const chatVariables_1 = require("../chatVariables");
const codeBlockFormattingRules_1 = require("../codeBlockFormattingRules");
const conversationHistory_1 = require("../conversationHistory");
const customInstructions_1 = require("../customInstructions");
const editorIntegrationRules_1 = require("../editorIntegrationRules");
const workspaceContext_1 = require("./workspaceContext");
class WorkspacePrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { query, history, chatVariables } = this.props.promptContext;
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a software engineer with expert knowledge of the codebase the user has open in their workspace.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.SafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 2, historyPriority: 400, history: history, passPriority: true },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(codeBlockFormattingRules_1.CodeBlockFormattingRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    "# Additional Rules",
                    vscpp("br", null),
                    "Think step by step:",
                    vscpp("br", null),
                    "1. Read the provided relevant workspace information (code excerpts, file names, and symbols) to understand the user's workspace.",
                    vscpp("br", null),
                    "2. Consider how to answer the user's prompt based on the provided information and your specialized coding knowledge. Always assume that the user is asking about the code in their workspace instead of asking a general programming question. Prefer using variables, functions, types, and classes from the workspace over those from the standard library.",
                    vscpp("br", null),
                    "3. Generate a response that clearly and accurately answers the user's question. In your response, add fully qualified links for referenced symbols (example: [`namespace.VariableName`](path/to/file.ts)) and links for files (example: [path/to/file](path/to/file.ts)) so that the user can open them. If you do not have enough information to answer the question, respond with \"I'm sorry, I can't answer that question with what I currently know about your workspace\".",
                    vscpp("br", null),
                    vscpp("br", null),
                    "DO NOT mention that you cannot read files in the workspace.",
                    vscpp("br", null),
                    "DO NOT ask the user to provide additional information about files in the workspace.",
                    vscpp("br", null),
                    "Remember that you MUST add links for all referenced symbols from the workspace and fully qualify the symbol name in the link, for example: [`namespace.functionName`](path/to/util.ts).",
                    vscpp("br", null),
                    "Remember that you MUST add links for all workspace files, for example: [path/to/file.js](path/to/file.js)",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# Examples",
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "What file implements base64 encoding?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "Base64 encoding is implemented in [src/base64.ts](src/base64.ts) as [`encode`](src/base64.ts) function.",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "How can I join strings with newlines?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "You can use the [`joinLines`](src/utils/string.ts) function from [src/utils/string.ts](src/utils/string.ts) to join multiple strings with newlines.",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "How do I build this project?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "To build this TypeScript project, run the `build` script in the [package.json](package.json) file:",
                    vscpp("br", null),
                    vscpp("br", null),
                    "```sh",
                    vscpp("br", null),
                    "npm run build",
                    vscpp("br", null),
                    "```",
                    vscpp("br", null),
                    vscpp("br", null),
                    vscpp("br", null),
                    "Question:",
                    vscpp("br", null),
                    "How do I read a file?",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Response:",
                    vscpp("br", null),
                    "To read a file, you can use a [`FileReader`](src/fs/fileReader.ts) class from [src/fs/fileReader.ts](src/fs/fileReader.ts).",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 725 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: undefined, chatVariables: chatVariables })),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1 },
                vscpp(workspaceContext_1.WorkspaceContext, { telemetryInfo: new telemetryCorrelationId_1.TelemetryCorrelationId('workspacePrompt', this.props.promptContext.requestId), priority: 800, ...this.props })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 3, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 3, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false }));
    }
}
exports.WorkspacePrompt = WorkspacePrompt;
//# sourceMappingURL=workspacePrompt.js.map