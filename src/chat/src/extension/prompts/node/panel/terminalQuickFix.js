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
exports.TerminalQuickFixPrompt = exports.TerminalQuickFixFileContextPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const envService_1 = require("../../../../platform/env/common/envService");
const terminalService_1 = require("../../../../platform/terminal/common/terminalService");
const path_1 = require("../../../../util/vs/base/common/path");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const fileVariable_1 = require("./fileVariable");
const terminalLastCommand_1 = require("./terminalLastCommand");
let TerminalQuickFixFileContextPrompt = class TerminalQuickFixFileContextPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _terminalService) {
        super(props);
        this._terminalService = _terminalService;
    }
    render() {
        const cwd = this._terminalService.terminalLastCommand?.cwd
            ? typeof this._terminalService.terminalLastCommand.cwd === 'string'
                ? this._terminalService.terminalLastCommand.cwd
                : this._terminalService.terminalLastCommand.cwd.path
            : undefined;
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a programmer who specializes in using the command line. Your task is to respond with a list of files that you need access to in order to fix the command. Carefully consider the command line, output and current working directory in your response.",
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                `
You MUST respond ONLY with a JSON array in the format:

\`\`\`json
[
	{
		fileName: string
	},
	...
]
\`\`\`

Follow these rules in your response:

- Use an absolute path if you know the exact location of the file.
- Do NOT include any introduction, description or prose. Only include the paths.
`),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 }, `Examples:

User: npm startt
Assistant:
- \`${cwd ? (0, path_1.join)(cwd, '.bin/startt') : '.bin/startt'}\`
- \`${cwd ? (0, path_1.join)(cwd, 'package.json') : 'package.json'}\`
`),
            vscpp(TerminalShellType, { priority: 800 }),
            vscpp(OperatingSystem, { priority: 600 }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 1100 }, !this._terminalService.terminalLastCommand
                ? `The following command just failed when run in the terminal \`${this.props.commandLine}\`.

Here is the output of the command:
${(this.props.output ?? []).join()}`
                : ''),
            vscpp(terminalLastCommand_1.TerminalLastCommand, { priority: 800 })));
    }
};
exports.TerminalQuickFixFileContextPrompt = TerminalQuickFixFileContextPrompt;
exports.TerminalQuickFixFileContextPrompt = TerminalQuickFixFileContextPrompt = __decorate([
    __param(1, terminalService_1.ITerminalService)
], TerminalQuickFixFileContextPrompt);
let TerminalQuickFixPrompt = class TerminalQuickFixPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _terminalService) {
        super(props);
        this._terminalService = _terminalService;
    }
    render(state) {
        // A low priority is used here as file references could be very large
        const fileVariables = this.props.verifiedContextUris.map(uri => {
            return vscpp(fileVariable_1.FileVariable, { variableName: (0, path_1.basename)(uri.path), variableValue: uri });
        });
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are a programmer who specializes in using the command line. Your task is to help the user fix a command that was run in the terminal by providing a list of fixed command suggestions. Carefully consider the command line, output and current working directory in your response.",
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp(responseTranslationRules_1.ResponseTranslationRules, null),
                `
You MUST respond ONLY with a JSON array containing HIGHLY RELEVANT command suggestions in the format:

\`\`\`json
[
	{
		command: string,
		description: string,
		relevance: 'low' | 'medium' | 'high'
	},
	...
]
\`\`\`

Follow these rules in your response:

- You MUST NOT suggest commands that use non-existent files.
- Under no circumstance will you include an summary, description or any prose whatsoever.
- Do NOT repeat the command and/or output.
- Provide a maximum of 10 suggestions, starting with the most relevant.
- When there is text that needs to be replaced in the suggestion, prefix the text with '{', suffix the text with '}' and use underscores instead of whitespace. Only do this when the replacement text is NOT provided.
- Avoid providing suggestions that do exactly the same thing like aliases.
- Only provide suggestions for the active shell and avoid shelling out where possible.
- The suggestions must be relevant. For example, if the command is a build command, the suggestions must look like build commands, not test commands.
- If the command is related to a particular programming language, do not include suggestions for different languages.
- NEVER suggest to change directory to the current working directory.
`),
            vscpp(prompt_tsx_1.SystemMessage, { priority: 700 }, `Examples:

User: lss
Assistant:
- \`ls\`

User: clone git
Assistant:
- \`git clone {repository}\`

User: .venv/bin/activate
Context: .venv/bin/activate DOES NOT exist
Assistant:
- \`python -m venv .venv\`

User: .venv/bin/activate
Context: .venv/bin/activate exists
Assistant:
- \`source .venv/bin/activate\`
`),
            vscpp(TerminalShellType, { priority: 800 }),
            vscpp(OperatingSystem, { priority: 800 }),
            vscpp(PythonModuleError, { priority: 600 }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 1100 }, !this._terminalService.terminalLastCommand
                ? `The following command just failed when run in the terminal \`${this.props.commandLine}\`.

Here is the output of the command:
${(this.props.output ?? []).join()}`
                : ''),
            vscpp(terminalLastCommand_1.TerminalLastCommand, { priority: 800 }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 }, `${this.props.verifiedContextDirectoryUris.length > 0 ?
                `The following directories exist:\n\n${this.props.verifiedContextDirectoryUris.map(uri => `- ${uri.path}`).join('\n')}`
                : ''}`),
            vscpp(prompt_tsx_1.UserMessage, { priority: 700 }, `${this.props.nonExistentContextUris.length > 0 ?
                `The following files DO NOT exist and cannot be used in the suggestion:\n\n${this.props.nonExistentContextUris.map(uri => `- ${uri.path}`).join('\n')}`
                : ''}`),
            ...fileVariables));
    }
};
exports.TerminalQuickFixPrompt = TerminalQuickFixPrompt;
exports.TerminalQuickFixPrompt = TerminalQuickFixPrompt = __decorate([
    __param(1, terminalService_1.ITerminalService)
], TerminalQuickFixPrompt);
class PythonModuleError extends prompt_tsx_1.PromptElement {
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: this.props.priority }, `
Follow these guidelines for python:
- NEVER recommend using "pip install" directly, always recommend "python -m pip install"
- The following are pypi modules: ruff, pylint, black, autopep8, etc
- If the error is module not found, recommend installing the module using "python -m pip install" command.
- If activate is not available create an environment using "python -m venv .venv".
`)));
    }
}
let TerminalShellType = class TerminalShellType extends prompt_tsx_1.PromptElement {
    constructor(props, _terminalService) {
        super(props);
        this._terminalService = _terminalService;
    }
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                "The active terminal's shell type is: ",
                this._terminalService.terminalShellType)));
    }
};
TerminalShellType = __decorate([
    __param(1, terminalService_1.ITerminalService)
], TerminalShellType);
let OperatingSystem = class OperatingSystem extends prompt_tsx_1.PromptElement {
    constructor(props, _envService) {
        super(props);
        this._envService = _envService;
    }
    render() {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                "The active operating system is: ",
                this._envService.OS)));
    }
};
OperatingSystem = __decorate([
    __param(1, envService_1.IEnvService)
], OperatingSystem);
//# sourceMappingURL=terminalQuickFix.js.map