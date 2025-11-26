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
//# sourceMappingURL=toolTerminalCreator.js.map