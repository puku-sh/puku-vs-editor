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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { ToolDataSource } from '../../../../chat/common/languageModelToolsService.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
export const GetTerminalLastCommandToolData = {
    id: 'terminal_last_command',
    toolReferenceName: 'terminalLastCommand',
    legacyToolReferenceFullNames: ['runCommands/terminalLastCommand'],
    displayName: localize(13131, null),
    modelDescription: 'Get the last command run in the active terminal.',
    source: ToolDataSource.Internal,
    icon: Codicon.terminal,
};
let GetTerminalLastCommandTool = class GetTerminalLastCommandTool extends Disposable {
    constructor(_terminalService) {
        super();
        this._terminalService = _terminalService;
    }
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize(13132, null),
            pastTenseMessage: localize(13133, null),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const activeInstance = this._terminalService.activeInstance;
        if (!activeInstance) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No active terminal instance found.'
                    }]
            };
        }
        const commandDetection = activeInstance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandDetection) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No command detection capability available in the active terminal.'
                    }]
            };
        }
        const executingCommand = commandDetection.executingCommand;
        if (executingCommand) {
            const userPrompt = [];
            userPrompt.push('The following command is currently executing in the terminal:');
            userPrompt.push(executingCommand);
            const cwd = commandDetection.cwd;
            if (cwd) {
                userPrompt.push('It is running in the directory:');
                userPrompt.push(cwd);
            }
            return {
                content: [{
                        kind: 'text',
                        value: userPrompt.join('\n')
                    }]
            };
        }
        const commands = commandDetection.commands;
        if (!commands || commands.length === 0) {
            return {
                content: [{
                        kind: 'text',
                        value: 'No command has been run in the active terminal.'
                    }]
            };
        }
        const lastCommand = commands[commands.length - 1];
        const userPrompt = [];
        if (lastCommand.command) {
            userPrompt.push('The following is the last command run in the terminal:');
            userPrompt.push(lastCommand.command);
        }
        if (lastCommand.cwd) {
            userPrompt.push('It was run in the directory:');
            userPrompt.push(lastCommand.cwd);
        }
        if (lastCommand.exitCode !== undefined) {
            userPrompt.push(`It exited with code: ${lastCommand.exitCode}`);
        }
        if (lastCommand.hasOutput() && lastCommand.getOutput) {
            const output = lastCommand.getOutput();
            if (output && output.trim().length > 0) {
                userPrompt.push('It has the following output:');
                userPrompt.push(output);
            }
        }
        return {
            content: [{
                    kind: 'text',
                    value: userPrompt.join('\n')
                }]
        };
    }
};
GetTerminalLastCommandTool = __decorate([
    __param(0, ITerminalService)
], GetTerminalLastCommandTool);
export { GetTerminalLastCommandTool };
//# sourceMappingURL=getTerminalLastCommandTool.js.map