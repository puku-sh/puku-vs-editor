"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const l10n = __importStar(require("@vscode/l10n"));
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const logService_1 = require("../../../platform/log/common/logService");
const workbenchService_1 = require("../../../platform/workbench/common/workbenchService");
const vscodeTypes_1 = require("../../../vscodeTypes");
const commands_1 = require("../../linkify/common/commands");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
let VSCodeCmdTool = class VSCodeCmdTool {
    static { this.toolName = toolNames_1.ToolName.RunVscodeCmd; }
    constructor(_commandService, _workbenchService, _logService) {
        this._commandService = _commandService;
        this._workbenchService = _workbenchService;
        this._logService = _logService;
    }
    async invoke(options, token) {
        const command = options.input.commandId;
        const args = options.input.args ?? [];
        const allCommands = (await this._workbenchService.getAllCommands(/* filterByPreCondition */ true));
        const commandItem = allCommands.find(commandItem => commandItem.command === command);
        if (!commandItem) {
            // Try again but without filtering by preconditions to see if the command exists at all
            const allCommandsNoFilter = (await this._workbenchService.getAllCommands(/* filterByPreCondition */ false));
            const commandItemNoFilter = allCommandsNoFilter.find(commandItem => commandItem.command === command);
            if (commandItemNoFilter) {
                return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Command \`${options.input.name}\` exists, but its preconditions are not currently met. Ask the user to try running it manually via the command palette.`)]);
            }
            else {
                return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Failed to find command \`${options.input.name}\`.`)]);
            }
        }
        try {
            await this._commandService.executeCommand(command, ...args);
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Finished running command \`${options.input.name}\`.`)]);
        }
        catch (error) {
            this._logService.error(`[VSCodeCmdTool] ${error}`);
            return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart(`Failed to run command \`${options.input.name}\`.`)]);
        }
    }
    async prepareInvocation(options, token) {
        const commandId = options.input.commandId;
        if (!commandId) {
            throw new Error('Command ID undefined');
        }
        const quickOpenCommand = 'workbench.action.quickOpen';
        // Populate the Quick Open box with command ID rather than command name to avoid issues where Copilot didn't use the precise name,
        // or when the Copilot response language (Spanish, French, etc.) might be different here than the UI one.
        const commandStr = (0, commands_1.commandUri)(quickOpenCommand, [">" + commandId]);
        const markdownString = new vscodeTypes_1.MarkdownString(l10n.t(`Copilot will execute the [{0}]({1}) command.`, options.input.name, commandStr));
        markdownString.isTrusted = { enabledCommands: [quickOpenCommand] };
        return {
            invocationMessage: l10n.t `Running command \`${options.input.name}\``,
            confirmationMessages: {
                title: l10n.t `Run Command \`${options.input.name}\`?`,
                message: markdownString,
            },
        };
    }
};
VSCodeCmdTool = __decorate([
    __param(0, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(1, workbenchService_1.IWorkbenchService),
    __param(2, logService_1.ILogService)
], VSCodeCmdTool);
toolsRegistry_1.ToolRegistry.registerTool(VSCodeCmdTool);
//# sourceMappingURL=vscodeCmdTool.js.map