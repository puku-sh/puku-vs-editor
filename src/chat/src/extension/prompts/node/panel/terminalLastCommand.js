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
exports.TerminalLastCommand = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const terminalService_1 = require("../../../../platform/terminal/common/terminalService");
let TerminalLastCommand = class TerminalLastCommand extends prompt_tsx_1.PromptElement {
    constructor(props, _terminalService) {
        super(props);
        this._terminalService = _terminalService;
    }
    async prepare() {
        return this._terminalService.terminalLastCommand;
    }
    render(state, sizing) {
        if (!state) {
            return undefined;
        }
        const userPrompt = [];
        if (state.commandLine) {
            userPrompt.push(`The following is the last command run in the terminal:`);
            userPrompt.push(state.commandLine);
        }
        if (state.cwd) {
            userPrompt.push(`It was run in the directory:`);
            userPrompt.push(typeof state.cwd === 'object' ? state.cwd.toString() : state.cwd);
        }
        if (state.output) {
            userPrompt.push(`It has the following output:`);
            userPrompt.push(state.output);
        }
        const prompt = userPrompt.join('\n');
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority },
                "The active terminal's last run command:",
                vscpp("br", null),
                prompt)));
    }
};
exports.TerminalLastCommand = TerminalLastCommand;
exports.TerminalLastCommand = TerminalLastCommand = __decorate([
    __param(1, terminalService_1.ITerminalService)
], TerminalLastCommand);
//# sourceMappingURL=terminalLastCommand.js.map