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
import { CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES } from '../../../../chat/common/constants.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
let TerminalCommandArtifactCollector = class TerminalCommandArtifactCollector {
    constructor(_logService) {
        this._logService = _logService;
    }
    async capture(toolSpecificData, instance, commandId, fallbackOutput) {
        if (commandId) {
            try {
                toolSpecificData.terminalCommandUri = this._createTerminalCommandUri(instance, commandId);
            }
            catch (error) {
                this._logService.warn(`RunInTerminalTool: Failed to create terminal command URI for ${commandId}`, error);
            }
            const serialized = await this._tryGetSerializedCommandOutput(toolSpecificData, instance, commandId);
            if (serialized) {
                toolSpecificData.terminalCommandOutput = { text: serialized.text, truncated: serialized.truncated };
                toolSpecificData.terminalCommandState = {
                    exitCode: serialized.exitCode,
                    timestamp: serialized.timestamp,
                    duration: serialized.duration
                };
                this._applyTheme(toolSpecificData, instance);
                return;
            }
        }
        if (fallbackOutput !== undefined) {
            const normalized = fallbackOutput.replace(/\r\n/g, '\n');
            toolSpecificData.terminalCommandOutput = { text: normalized, truncated: false };
            this._applyTheme(toolSpecificData, instance);
        }
    }
    _applyTheme(toolSpecificData, instance) {
        const theme = instance.xterm?.getXtermTheme();
        if (theme) {
            toolSpecificData.terminalTheme = { background: theme.background, foreground: theme.foreground };
        }
    }
    _createTerminalCommandUri(instance, commandId) {
        const params = new URLSearchParams(instance.resource.query);
        params.set('command', commandId);
        return instance.resource.with({ query: params.toString() });
    }
    async _tryGetSerializedCommandOutput(toolSpecificData, instance, commandId) {
        const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const command = commandDetection?.commands.find(c => c.id === commandId);
        if (!command?.endMarker) {
            return undefined;
        }
        const xterm = await instance.xtermReadyPromise;
        if (!xterm) {
            return undefined;
        }
        try {
            const result = await xterm.getCommandOutputAsHtml(command, CHAT_TERMINAL_OUTPUT_MAX_PREVIEW_LINES);
            return {
                text: result.text,
                truncated: result.truncated,
                exitCode: command.exitCode,
                timestamp: command.timestamp,
                duration: command.duration
            };
        }
        catch (error) {
            this._logService.warn(`RunInTerminalTool: Failed to serialize command output for ${commandId}`, error);
            return undefined;
        }
    }
};
TerminalCommandArtifactCollector = __decorate([
    __param(0, ITerminalLogService)
], TerminalCommandArtifactCollector);
export { TerminalCommandArtifactCollector };
//# sourceMappingURL=terminalCommandArtifactCollector.js.map