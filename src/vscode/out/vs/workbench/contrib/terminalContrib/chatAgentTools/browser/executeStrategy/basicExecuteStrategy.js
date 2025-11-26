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
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { isNumber } from '../../../../../../base/common/types.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { trackIdleOnPrompt, waitForIdle } from './executeStrategy.js';
import { setupRecreatingStartMarker } from './strategyHelpers.js';
/**
 * This strategy is used when shell integration is enabled, but rich command detection was not
 * declared by the shell script. This is the large spectrum between rich command detection and no
 * shell integration, here are some problems that are expected:
 *
 * - `133;C` command executed may not happen.
 * - `633;E` comamnd line reporting will likely not happen, so the command line contained in the
 *   execution start and end events will be of low confidence and chances are it will be wrong.
 * - Execution tracking may be incorrect, particularly when `executeCommand` calls are overlapped,
 *   such as Python activating the environment at the same time as Copilot executing a command. So
 *   the end event for the execution may actually correspond to a different command.
 *
 * This strategy focuses on trying to get the most accurate output given these limitations and
 * unknowns. Basically we cannot fully trust the extension APIs in this case, so polling of the data
 * stream is used to detect idling, and we listen to the terminal's data stream instead of the
 * execution's data stream.
 *
 * This is best effort with the goal being the output is accurate, though it may contain some
 * content above and below the command output, such as prompts or even possibly other command
 * output. We lean on the LLM to be able to differentiate the actual output from prompts and bad
 * output when it's not ideal.
 */
let BasicExecuteStrategy = class BasicExecuteStrategy {
    constructor(_instance, _hasReceivedUserInput, _commandDetection, _logService) {
        this._instance = _instance;
        this._hasReceivedUserInput = _hasReceivedUserInput;
        this._commandDetection = _commandDetection;
        this._logService = _logService;
        this.type = 'basic';
        this._startMarker = new MutableDisposable();
        this._onDidCreateStartMarker = new Emitter;
        this.onDidCreateStartMarker = this._onDidCreateStartMarker.event;
    }
    async execute(commandLine, token, commandId) {
        const store = new DisposableStore();
        try {
            const idlePromptPromise = trackIdleOnPrompt(this._instance, 1000, store);
            const onDone = Promise.race([
                Event.toPromise(this._commandDetection.onCommandFinished, store).then(e => {
                    // When shell integration is basic, it means that the end execution event is
                    // often misfired since we don't have command line verification. Because of this
                    // we make sure the prompt is idle after the end execution event happens.
                    this._log('onDone 1 of 2 via end event, waiting for short idle prompt');
                    return idlePromptPromise.then(() => {
                        this._log('onDone 2 of 2 via short idle prompt');
                        return {
                            'type': 'success',
                            command: e
                        };
                    });
                }),
                Event.toPromise(token.onCancellationRequested, store).then(() => {
                    this._log('onDone via cancellation');
                }),
                Event.toPromise(this._instance.onDisposed, store).then(() => {
                    this._log('onDone via terminal disposal');
                    return { type: 'disposal' };
                }),
                // A longer idle prompt event is used here as a catch all for unexpected cases where
                // the end event doesn't fire for some reason.
                trackIdleOnPrompt(this._instance, 3000, store).then(() => {
                    this._log('onDone long idle prompt');
                }),
            ]);
            // Ensure xterm is available
            this._log('Waiting for xterm');
            const xterm = await this._instance.xtermReadyPromise;
            if (!xterm) {
                throw new Error('Xterm is not available');
            }
            // Wait for the terminal to idle before executing the command
            this._log('Waiting for idle');
            await waitForIdle(this._instance.onData, 1000);
            setupRecreatingStartMarker(xterm, this._startMarker, m => this._onDidCreateStartMarker.fire(m), store, this._log.bind(this));
            if (this._hasReceivedUserInput()) {
                this._log('Command timed out, sending SIGINT and retrying');
                // Send SIGINT (Ctrl+C)
                await this._instance.sendText('\x03', false);
                await waitForIdle(this._instance.onData, 100);
            }
            // Execute the command
            // IMPORTANT: This uses `sendText` not `runCommand` since when basic shell integration
            // is used as it's more common to not recognize the prompt input which would result in
            // ^C being sent and also to return the exit code of 130 when from the shell when that
            // occurs.
            this._log(`Executing command line \`${commandLine}\``);
            this._instance.sendText(commandLine, true);
            // Wait for the next end execution event - note that this may not correspond to the actual
            // execution requested
            this._log('Waiting for done event');
            const onDoneResult = await onDone;
            if (onDoneResult && onDoneResult.type === 'disposal') {
                throw new Error('The terminal was closed');
            }
            const finishedCommand = onDoneResult && onDoneResult.type === 'success' ? onDoneResult.command : undefined;
            // Wait for the terminal to idle
            this._log('Waiting for idle');
            await waitForIdle(this._instance.onData, 1000);
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            const endMarker = store.add(xterm.raw.registerMarker());
            // Assemble final result
            let output;
            const additionalInformationLines = [];
            if (finishedCommand) {
                const commandOutput = finishedCommand?.getOutput();
                if (commandOutput !== undefined) {
                    this._log('Fetched output via finished command');
                    output = commandOutput;
                }
            }
            if (output === undefined) {
                try {
                    output = xterm.getContentsAsText(this._startMarker.value, endMarker);
                    this._log('Fetched output via markers');
                }
                catch {
                    this._log('Failed to fetch output via markers');
                    additionalInformationLines.push('Failed to retrieve command output');
                }
            }
            if (output !== undefined && output.trim().length === 0) {
                additionalInformationLines.push('Command produced no output');
            }
            const exitCode = finishedCommand?.exitCode;
            if (isNumber(exitCode) && exitCode > 0) {
                additionalInformationLines.push(`Command exited with code ${exitCode}`);
            }
            return {
                output,
                additionalInformation: additionalInformationLines.length > 0 ? additionalInformationLines.join('\n') : undefined,
                exitCode,
            };
        }
        finally {
            store.dispose();
        }
    }
    _log(message) {
        this._logService.debug(`RunInTerminalTool#Basic: ${message}`);
    }
};
BasicExecuteStrategy = __decorate([
    __param(3, ITerminalLogService)
], BasicExecuteStrategy);
export { BasicExecuteStrategy };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzaWNFeGVjdXRlU3RyYXRlZ3kuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9zYWhhbWVkL0Rlc2t0b3AvcHVrdS12cy1lZGl0b3IvcHVrdS1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9leGVjdXRlU3RyYXRlZ3kvYmFzaWNFeGVjdXRlU3RyYXRlZ3kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxXQUFXLEVBQXNFLE1BQU0sc0JBQXNCLENBQUM7QUFHMUksT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFbEU7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXFCRztBQUNJLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQW9CO0lBUWhDLFlBQ2tCLFNBQTRCLEVBQzVCLHFCQUFvQyxFQUNwQyxpQkFBOEMsRUFDMUMsV0FBaUQ7UUFIckQsY0FBUyxHQUFULFNBQVMsQ0FBbUI7UUFDNUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUFlO1FBQ3BDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBNkI7UUFDekIsZ0JBQVcsR0FBWCxXQUFXLENBQXFCO1FBWDlELFNBQUksR0FBRyxPQUFPLENB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