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
var ToolTerminalCreator_1;
import { DeferredPromise, disposableTimeout, raceTimeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { hasKey, isNumber, isObject, isString } from '../../../../../base/common/types.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { getShellIntegrationTimeout } from '../../../terminal/common/terminalEnvironment.js';
var ShellLaunchType;
(function (ShellLaunchType) {
    ShellLaunchType[ShellLaunchType["Unknown"] = 0] = "Unknown";
    ShellLaunchType[ShellLaunchType["Default"] = 1] = "Default";
    ShellLaunchType[ShellLaunchType["Fallback"] = 2] = "Fallback";
})(ShellLaunchType || (ShellLaunchType = {}));
export var ShellIntegrationQuality;
(function (ShellIntegrationQuality) {
    ShellIntegrationQuality["None"] = "none";
    ShellIntegrationQuality["Basic"] = "basic";
    ShellIntegrationQuality["Rich"] = "rich";
})(ShellIntegrationQuality || (ShellIntegrationQuality = {}));
let ToolTerminalCreator = class ToolTerminalCreator {
    static { ToolTerminalCreator_1 = this; }
    /**
     * The shell preference cached for the lifetime of the window. This allows skipping previous
     * shell approaches that failed in previous runs to save time.
     */
    static { this._lastSuccessfulShell = 0 /* ShellLaunchType.Unknown */; }
    constructor(_configurationService, _logService, _terminalService) {
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._terminalService = _terminalService;
    }
    async createTerminal(shellOrProfile, token) {
        const instance = await this._createCopilotTerminal(shellOrProfile);
        const toolTerminal = {
            instance,
            shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */,
        };
        let processReadyTimestamp = 0;
        // Ensure the shell process launches successfully
        const initResult = await Promise.any([
            instance.processReady.then(() => processReadyTimestamp = Date.now()),
            Event.toPromise(instance.onExit),
        ]);
        if (!isNumber(initResult) && isObject(initResult) && hasKey(initResult, { message: true })) {
            throw new Error(initResult.message);
        }
        // Wait for shell integration when the fallback case has not been hit or when shell
        // integration injection is enabled. Note that it's possible for the fallback case to happen
        // and then for SI to activate again later in the session.
        const siInjectionEnabled = this._configurationService.getValue("terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */) === true;
        // Get the configurable timeout to wait for shell integration
        const waitTime = getShellIntegrationTimeout(this._configurationService, siInjectionEnabled, instance.hasRemoteAuthority, processReadyTimestamp);
        if (ToolTerminalCreator_1._lastSuccessfulShell !== 2 /* ShellLaunchType.Fallback */ ||
            siInjectionEnabled) {
            this._logService.info(`ToolTerminalCreator#createTerminal: Waiting ${waitTime}ms for shell integration`);
            const shellIntegrationQuality = await this._waitForShellIntegration(instance, waitTime);
            if (token.isCancellationRequested) {
                instance.dispose();
                throw new CancellationError();
            }
            // If SI is rich, wait for the prompt state to change. This prevents an issue with pwsh
            // in particular where shell startup can swallow `\r` input events, preventing the
            // command from executing.
            if (shellIntegrationQuality === "rich" /* ShellIntegrationQuality.Rich */) {
                const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                if (commandDetection?.promptInputModel.state === 0 /* PromptInputState.Unknown */) {
                    this._logService.info(`ToolTerminalCreator#createTerminal: Waiting up to 2s for PromptInputModel state to change`);
                    await raceTimeout(Event.toPromise(commandDetection.onCommandStarted), 2000);
                }
            }
            if (shellIntegrationQuality !== "none" /* ShellIntegrationQuality.None */) {
                ToolTerminalCreator_1._lastSuccessfulShell = 1 /* ShellLaunchType.Default */;
                toolTerminal.shellIntegrationQuality = shellIntegrationQuality;
                return toolTerminal;
            }
        }
        else {
            this._logService.info(`ToolTerminalCreator#createTerminal: Skipping wait for shell integration - last successful launch type ${ToolTerminalCreator_1._lastSuccessfulShell}`);
        }
        // Fallback case: No shell integration in default profile
        ToolTerminalCreator_1._lastSuccessfulShell = 2 /* ShellLaunchType.Fallback */;
        return toolTerminal;
    }
    /**
     * Synchronously update shell integration quality based on the terminal instance's current
     * capabilities. This is a defensive change to avoid no shell integration being sticky
     * https://github.com/microsoft/vscode/issues/260880
     *
     * Only upgrade quality just in case.
     */
    refreshShellIntegrationQuality(toolTerminal) {
        const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (commandDetection) {
            if (toolTerminal.shellIntegrationQuality === "none" /* ShellIntegrationQuality.None */ ||
                toolTerminal.shellIntegrationQuality === "basic" /* ShellIntegrationQuality.Basic */) {
                toolTerminal.shellIntegrationQuality = commandDetection.hasRichCommandDetection ? "rich" /* ShellIntegrationQuality.Rich */ : "basic" /* ShellIntegrationQuality.Basic */;
            }
        }
    }
    _createCopilotTerminal(shellOrProfile) {
        const config = {
            icon: ThemeIcon.fromId(Codicon.chatSparkle.id),
            hideFromUser: true,
            forcePersist: true,
            env: {
                // Avoid making `git diff` interactive when called from copilot
                GIT_PAGER: 'cat',
            }
        };
        if (isString(shellOrProfile)) {
            config.executable = shellOrProfile;
        }
        else {
            config.executable = shellOrProfile.path;
            config.args = shellOrProfile.args;
            config.icon = shellOrProfile.icon ?? config.icon;
            config.color = shellOrProfile.color;
            config.env = {
                ...config.env,
                ...shellOrProfile.env
            };
        }
        return this._terminalService.createTerminal({ config });
    }
    _waitForShellIntegration(instance, timeoutMs) {
        const store = new DisposableStore();
        const result = new DeferredPromise();
        const siNoneTimer = store.add(new MutableDisposable());
        siNoneTimer.value = disposableTimeout(() => {
            this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Timed out ${timeoutMs}ms, using no SI`);
            result.complete("none" /* ShellIntegrationQuality.None */);
        }, timeoutMs);
        if (instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.hasRichCommandDetection) {
            // Rich command detection is available immediately.
            siNoneTimer.clear();
            this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Rich SI available immediately`);
            result.complete("rich" /* ShellIntegrationQuality.Rich */);
        }
        else {
            const onSetRichCommandDetection = store.add(this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, e => e.onSetRichCommandDetection));
            store.add(onSetRichCommandDetection.event((e) => {
                if (e.instance !== instance) {
                    return;
                }
                siNoneTimer.clear();
                // Rich command detection becomes available some time after the terminal is created.
                this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Rich SI available eventually`);
                result.complete("rich" /* ShellIntegrationQuality.Rich */);
            }));
            const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                siNoneTimer.clear();
                // When SI lights up, allow up to 200ms for the rich command
                // detection sequence to come in before declaring it as basic shell integration.
                store.add(disposableTimeout(() => {
                    this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Timed out 200ms, using basic SI`);
                    result.complete("basic" /* ShellIntegrationQuality.Basic */);
                }, 200));
            }
            else {
                store.add(instance.capabilities.onDidAddCommandDetectionCapability(e => {
                    siNoneTimer.clear();
                    // When command detection lights up, allow up to 200ms for the rich command
                    // detection sequence to come in before declaring it as basic shell
                    // integration.
                    store.add(disposableTimeout(() => {
                        this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Timed out 200ms, using basic SI (via listener)`);
                        result.complete("basic" /* ShellIntegrationQuality.Basic */);
                    }, 200));
                }));
            }
        }
        result.p.finally(() => {
            this._logService.info(`ToolTerminalCreator#_waitForShellIntegration: Promise complete, disposing store`);
            store.dispose();
        });
        return result.p;
    }
};
ToolTerminalCreator = ToolTerminalCreator_1 = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalLogService),
    __param(2, ITerminalService)
], ToolTerminalCreator);
export { ToolTerminalCreator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbFRlcm1pbmFsQ3JlYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3Rvb2xUZXJtaW5hbENyZWF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUd0RyxPQUFPLEVBQUUsbUJBQW1CLEVBQWdFLE1BQU0scURBQXFELENBQUM7QUFDeEosT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLHVDQUF1QyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRTdGLElBQVcsZUFJVjtBQUpELFdBQVcsZUFBZTtJQUN6QiwyREFBVyxDQUFBO0lBQ1gsMkRBQVcsQ0FBQTtJQUNYLDZEQUFZ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