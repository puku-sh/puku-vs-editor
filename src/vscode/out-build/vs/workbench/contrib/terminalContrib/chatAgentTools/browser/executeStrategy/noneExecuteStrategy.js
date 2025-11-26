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
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { waitForIdle, waitForIdleWithPromptHeuristics } from './executeStrategy.js';
import { setupRecreatingStartMarker } from './strategyHelpers.js';
/**
 * This strategy is used when no shell integration is available. There are very few extension APIs
 * available in this case. This uses similar strategies to the basic integration strategy, but
 * with `sendText` instead of `shellIntegration.executeCommand` and relying on idle events instead
 * of execution events.
 */
let NoneExecuteStrategy = class NoneExecuteStrategy {
    constructor(_instance, _hasReceivedUserInput, _logService) {
        this._instance = _instance;
        this._hasReceivedUserInput = _hasReceivedUserInput;
        this._logService = _logService;
        this.type = 'none';
        this._startMarker = new MutableDisposable();
        this._onDidCreateStartMarker = new Emitter;
        this.onDidCreateStartMarker = this._onDidCreateStartMarker.event;
    }
    async execute(commandLine, token, commandId) {
        const store = new DisposableStore();
        try {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Ensure xterm is available
            this._log('Waiting for xterm');
            const xterm = await this._instance.xtermReadyPromise;
            if (!xterm) {
                throw new Error('Xterm is not available');
            }
            // Wait for the terminal to idle before executing the command
            this._log('Waiting for idle');
            await waitForIdle(this._instance.onData, 1000);
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            setupRecreatingStartMarker(xterm, this._startMarker, m => this._onDidCreateStartMarker.fire(m), store, this._log.bind(this));
            if (this._hasReceivedUserInput()) {
                this._log('Command timed out, sending SIGINT and retrying');
                // Send SIGINT (Ctrl+C)
                await this._instance.sendText('\x03', false);
                await waitForIdle(this._instance.onData, 100);
            }
            // Execute the command
            // IMPORTANT: This uses `sendText` not `runCommand` since when no shell integration
            // is used as sending ctrl+c before a shell is initialized (eg. PSReadLine) can result
            // in failure (https://github.com/microsoft/vscode/issues/258989)
            this._log(`Executing command line \`${commandLine}\``);
            this._instance.sendText(commandLine, true);
            // Assume the command is done when it's idle
            this._log('Waiting for idle with prompt heuristics');
            const promptResult = await waitForIdleWithPromptHeuristics(this._instance.onData, this._instance, 1000, 10000);
            this._log(`Prompt detection result: ${promptResult.detected ? 'detected' : 'not detected'} - ${promptResult.reason}`);
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            const endMarker = store.add(xterm.raw.registerMarker());
            // Assemble final result - exit code is not available without shell integration
            let output;
            const additionalInformationLines = [];
            try {
                output = xterm.getContentsAsText(this._startMarker.value, endMarker);
                this._log('Fetched output via markers');
            }
            catch {
                this._log('Failed to fetch output via markers');
                additionalInformationLines.push('Failed to retrieve command output');
            }
            return {
                output,
                additionalInformation: additionalInformationLines.length > 0 ? additionalInformationLines.join('\n') : undefined,
                exitCode: undefined,
            };
        }
        finally {
            store.dispose();
        }
    }
    _log(message) {
        this._logService.debug(`RunInTerminalTool#None: ${message}`);
    }
};
NoneExecuteStrategy = __decorate([
    __param(2, ITerminalLogService)
], NoneExecuteStrategy);
export { NoneExecuteStrategy };
//# sourceMappingURL=noneExecuteStrategy.js.map