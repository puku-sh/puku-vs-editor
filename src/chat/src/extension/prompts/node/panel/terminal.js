"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.TerminalPrompt = void 0;
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
class TerminalPrompt extends prompt_tsx_1.PromptElement {
    render(state) {
        const { query, history, chatVariables, } = this.props.promptContext;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a programmer who specializes in using the command line. Your task is to help the Developer craft a command to run on the command line.",
                vscpp("br", null),
                vscpp(copilotIdentity_1.CopilotIdentityRules, null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, historyPriority: 600, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    vscpp(editorIntegrationRules_1.EditorIntegrationRules, null),
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    `Think step by step:`,
                    `
1. Read the provided relevant workspace information (file names, project files in the project root) to understand the user's workspace.`,
                    `
2. Generate a response that clearly and accurately answers the user's question. In your response, follow the following:
    - Prefer single line commands.
    - Omit an explanation unless the suggestion is complex, if an explanation is included then be concise.
    - Provide the command suggestions using the active shell and operating system.
    - When there is text that needs to be replaced in the suggestion, prefix the text with '{', suffix the text with '}' and use underscores instead of whitespace. Only do this when the replacement text is NOT provided.
    - Say "I'm not quite sure how to do that." when you aren't confident in your explanation`,
                    isPowerShell(this.props.shellType)
                        ? `
    - Prefer idiomatic PowerShell over aliases for other shells or system utilities. For example use \`Stop-Process\` or \`Get-NetTCPConnection\` instead of \`kill\` or \`lsof\` respectively.
	- Only use unix utilities when there is no PowerShell equivalent.
    - Prefer cross-platform PowerShell scripting that works on any operating system.`
                        : `
    - Only use a tool like python or perl when it is not possible with the shell.`,
                    `
3. At the end of the response, list all text that needs to be replaced with associated descriptions in the form of a markdown list
`.trim(),
                    vscpp("br", null)),
                vscpp(instructionMessage_1.InstructionMessage, { priority: 700 },
                    "Examples:",
                    vscpp("br", null),
                    getShellExamples(this.props.shellType))),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 750 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: isPowerShell(this.props.shellType) ? 'ps1' : 'bash', chatVariables: chatVariables })),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                "The active terminal's shell type is:",
                vscpp("br", null),
                this.props.shellType),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                "The active operating system is:",
                vscpp("br", null),
                this.props.osName),
            vscpp(terminalLastCommand_1.TerminalLastCommand, { priority: 801 }),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false })));
    }
}
exports.TerminalPrompt = TerminalPrompt;
function getShellExamples(shellType) {
    const examples = [
        "User: How do I revert a specific commit?\nAssistant:\n```sh\ngit revert {commit_id}\n```\n\nUser: How do I commit in git?\nAssistant:\n```sh\ngit commit -m \"{message}\"\n```" /* ShellExamples.Generic */
    ];
    // Generic
    if (!isPowerShell(shellType)) {
        examples.push("User: go to the foo dir\nAssistant:\n```sh\ncd foo\n```" /* ShellExamples.GenericNonPwsh */);
    }
    // Shell-specific
    switch (shellType) {
        case 'ps1':
        case 'pwsh':
        case 'powershell': {
            examples.push("User: go to the foo dir\nAssistant:\n```pwsh\ncd .\\foo\\\n```\n\nUser: How do I delete a directory?\nAssistant:\n```pwsh\nRemove-Item {dir_name}\n```\n\nUser: create a file called foo\nAssistant:\n```pwsh\nNew-Item -ItemType File -Name foo\n```" /* ShellExamples.Pwsh */);
            break;
        }
        case 'bash': {
            examples.push("User: Print all files starting with \"pre\"\n```bash\nfind . -type f -name 'pre*'\n```" /* ShellExamples.Bash */);
            break;
        }
        default: {
            examples.push("\nUser: How do I print all files recursively within a directory?\nAssistant:\n```sh\nls -lR\n```" /* ShellExamples.Sh */);
            break;
        }
    }
    return examples.join('\n\n');
}
function isPowerShell(shellType) {
    return shellType === 'ps1' || shellType === 'pwsh' || shellType === 'powershell';
}
//# sourceMappingURL=terminal.js.map