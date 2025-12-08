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
exports.TerminalStatePromptElement = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const tasksService_1 = require("../../../../platform/tasks/common/tasksService");
const terminalService_1 = require("../../../../platform/terminal/common/terminalService");
/**
 * PromptElement that gets the current task and terminal state for the chat context.
 */
let TerminalStatePromptElement = class TerminalStatePromptElement extends prompt_tsx_1.PromptElement {
    constructor(props, tasksService, terminalService) {
        super(props);
        this.tasksService = tasksService;
        this.terminalService = terminalService;
    }
    async render() {
        const allTasks = this.tasksService.getTasks()?.[0]?.[1] ?? [];
        const tasks = Array.isArray(allTasks) ? allTasks : [];
        const activeTaskNames = tasks.filter(t => this.tasksService.isTaskActive(t)).map(t => t.label);
        if (this.terminalService && Array.isArray(this.terminalService.terminals)) {
            const terminals = await Promise.all(this.terminalService.terminals.map(async (term) => {
                const lastCommand = await this.terminalService.getLastCommandForTerminal(term);
                return {
                    name: term.name,
                    lastCommand: lastCommand ? {
                        commandLine: lastCommand.commandLine ?? '(no last command)',
                        cwd: lastCommand.cwd?.toString() ?? '(unknown)',
                        exitCode: lastCommand.exitCode,
                    } : undefined
                };
            }));
            const resultTerminals = terminals.filter(t => !!t && !activeTaskNames.includes(t.name));
            if (resultTerminals.length === 0) {
                return;
            }
            const renderTerminals = () => (vscpp(vscppf, null, resultTerminals.length > 0 && (vscpp(vscppf, null,
                "Terminals:",
                vscpp("br", null),
                resultTerminals.map((term) => (vscpp(vscppf, null,
                    "Terminal: ",
                    term.name,
                    vscpp("br", null),
                    term.lastCommand ? (vscpp(vscppf, null,
                        "Last Command: ",
                        term.lastCommand.commandLine ?? '(no last command)',
                        vscpp("br", null),
                        "Cwd: ",
                        term.lastCommand.cwd ?? '(unknown)',
                        vscpp("br", null),
                        "Exit Code: ",
                        term.lastCommand.exitCode ?? '(unknown)',
                        vscpp("br", null))) : '')))))));
            return (vscpp(vscppf, null, resultTerminals.length > 0 ? renderTerminals() : 'Terminals: No terminals found.\n'));
        }
    }
};
exports.TerminalStatePromptElement = TerminalStatePromptElement;
exports.TerminalStatePromptElement = TerminalStatePromptElement = __decorate([
    __param(1, tasksService_1.ITasksService),
    __param(2, terminalService_1.ITerminalService)
], TerminalStatePromptElement);
//# sourceMappingURL=terminalState.js.map