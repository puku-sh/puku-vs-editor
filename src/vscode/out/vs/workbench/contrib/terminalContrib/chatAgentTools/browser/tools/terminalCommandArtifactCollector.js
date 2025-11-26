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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21tYW5kQXJ0aWZhY3RDb2xsZWN0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90b29scy90ZXJtaW5hbENvbW1hbmRBcnRpZmFjdENvbGxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUc5RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUV0RixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFnQztJQUM1QyxZQUN1QyxXQUFnQztRQUFoQyxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7SUFDbkUsQ0FBQztJQUVMLEtBQUssQ0FBQyxPQUFPLENBQ1osZ0JBQWlELEVBQ2pELFFBQTJCLEVBQzNCLFNBQTZCLEVBQzdCLGNBQXVCO1FBRXZCLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixJQUFJLENBQUM7Z0JBQ0osZ0JBQWdCLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMzRixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsZ0VBQWdFLFNBQVMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNHLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEcsSUFBSSxVQUFVLEVB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