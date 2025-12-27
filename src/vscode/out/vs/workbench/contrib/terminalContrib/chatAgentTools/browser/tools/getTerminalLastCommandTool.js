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
    displayName: localize('terminalLastCommandTool.displayName', 'Get Terminal Last Command'),
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
            invocationMessage: localize('getTerminalLastCommand.progressive', "Getting last terminal command"),
            pastTenseMessage: localize('getTerminalLastCommand.past', "Got last terminal command"),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGVybWluYWxMYXN0Q29tbWFuZFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy9nZXRUZXJtaW5hbExhc3RDb21tYW5kVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsY0FBYyxFQUE2TCxNQUFNLHNEQUFzRCxDQUFDO0FBQ2pSLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTVFLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFjO0lBQ3hELEVBQUUsRUFBRSx1QkFBdUI7SUFDM0IsaUJBQWlCLEVBQUUscUJBQXFCO0lBQ3hDLDRCQUE0QixFQUFFLENBQUMsaUNBQWlDLENBQUM7SUFDakUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSwyQkFBMkIsQ0FBQztJQUN6RixnQkFBZ0IsRUFBRSxrREFBa0Q7SUFDcEUsTUFBTSxFQUFFLGNBQWMsQ0FBQyxRQUFRO0lBQy9CLElBQUksRUFBRSxPQUFPLENBQUMsUUFBUTtDQUN0QixDQUFDO0FBRUssSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBRXpELFlBQ29DLGdCQUFrQztRQUVyRSxLQUFLLEVBQUUsQ0FBQztRQUYyQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO0lBR3RFLENBQUM7SUFF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