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
import { timeout } from '../../../../../../../base/common/async.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { isObject, isString } from '../../../../../../../base/common/types.js';
import { localize } from '../../../../../../../nls.js';
import { ExtensionIdentifier } from '../../../../../../../platform/extensions/common/extensions.js';
import { IChatWidgetService } from '../../../../../chat/browser/chat.js';
import { ChatElicitationRequestPart } from '../../../../../chat/browser/chatElicitationRequestPart.js';
import { ChatModel } from '../../../../../chat/common/chatModel.js';
import { IChatService } from '../../../../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../../../../chat/common/constants.js';
import { ILanguageModelsService } from '../../../../../chat/common/languageModels.js';
import { ITaskService } from '../../../../../tasks/common/taskService.js';
import { OutputMonitorState } from './types.js';
import { getTextResponseFromStream } from './utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ILogService } from '../../../../../../../platform/log/common/log.js';
import { ITerminalService } from '../../../../../terminal/browser/terminal.js';
import { LocalChatSessionUri } from '../../../../../chat/common/chatUri.js';
let OutputMonitor = class OutputMonitor extends Disposable {
    get state() { return this._state; }
    get pollingResult() { return this._pollingResult; }
    get outputMonitorTelemetryCounters() { return this._outputMonitorTelemetryCounters; }
    constructor(_execution, _pollFn, invocationContext, token, command, _languageModelsService, _taskService, _chatService, _chatWidgetService, _configurationService, _logService, _terminalService) {
        super();
        this._execution = _execution;
        this._pollFn = _pollFn;
        this._languageModelsService = _languageModelsService;
        this._taskService = _taskService;
        this._chatService = _chatService;
        this._chatWidgetService = _chatWidgetService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._state = OutputMonitorState.PollingForIdle;
        this._outputMonitorTelemetryCounters = {
            inputToolManualAcceptCount: 0,
            inputToolManualRejectCount: 0,
            inputToolManualChars: 0,
            inputToolAutoAcceptCount: 0,
            inputToolAutoChars: 0,
            inputToolManualShownCount: 0,
            inputToolFreeFormInputShownCount: 0,
            inputToolFreeFormInputCount: 0,
        };
        this._onDidFinishCommand = this._register(new Emitter());
        this.onDidFinishCommand = this._onDidFinishCommand.event;
        // Start async to ensure listeners are set up
        timeout(0).then(() => {
            this._startMonitoring(command, invocationContext, token);
        });
    }
    async _startMonitoring(command, invocationContext, token) {
        const pollStartTime = Date.now();
        let modelOutputEvalResponse;
        let resources;
        let output;
        let extended = false;
        try {
            while (!token.isCancellationRequested) {
                switch (this._state) {
                    case OutputMonitorState.PollingForIdle: {
                        this._state = await this._waitForIdle(this._execution, extended, token);
                        continue;
                    }
                    case OutputMonitorState.Timeout: {
                        const shouldContinuePolling = await this._handleTimeoutState(command, invocationContext, extended, token);
                        if (shouldContinuePolling) {
                            extended = true;
                            continue;
                        }
                        else {
                            this._promptPart?.hide();
                            this._promptPart = undefined;
                            break;
                        }
                    }
                    case OutputMonitorState.Cancelled:
                        break;
                    case OutputMonitorState.Idle: {
                        const idleResult = await this._handleIdleState(token);
                        if (idleResult.shouldContinuePollling) {
                            this._state = OutputMonitorState.PollingForIdle;
                            continue;
                        }
                        else {
                            resources = idleResult.resources;
                            modelOutputEvalResponse = idleResult.modelOutputEvalResponse;
                            output = idleResult.output;
                        }
                        break;
                    }
                }
                if (this._state === OutputMonitorState.Idle || this._state === OutputMonitorState.Cancelled || this._state === OutputMonitorState.Timeout) {
                    break;
                }
            }
            if (token.isCancellationRequested) {
                this._state = OutputMonitorState.Cancelled;
            }
        }
        finally {
            this._pollingResult = {
                state: this._state,
                output: output ?? this._execution.getOutput(),
                modelOutputEvalResponse: token.isCancellationRequested ? 'Cancelled' : modelOutputEvalResponse,
                pollDurationMs: Date.now() - pollStartTime,
                resources
            };
            this._promptPart?.hide();
            this._promptPart = undefined;
            this._onDidFinishCommand.fire();
        }
    }
    async _handleIdleState(token) {
        const confirmationPrompt = await this._determineUserInputOptions(this._execution, token);
        if (confirmationPrompt?.detectedRequestForFreeFormInput) {
            this._outputMonitorTelemetryCounters.inputToolFreeFormInputShownCount++;
            const receivedTerminalInput = await this._requestFreeFormTerminalInput(token, this._execution, confirmationPrompt);
            if (receivedTerminalInput) {
                // Small delay to ensure input is processed
                await timeout(200);
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            else {
                // User declined
                return { shouldContinuePollling: false };
            }
        }
        if (confirmationPrompt?.options.length) {
            const suggestedOptionResult = await this._selectAndHandleOption(confirmationPrompt, token);
            if (suggestedOptionResult?.sentToTerminal) {
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            const confirmed = await this._confirmRunInTerminal(token, suggestedOptionResult?.suggestedOption ?? confirmationPrompt.options[0], this._execution, confirmationPrompt);
            if (confirmed) {
                // Continue polling as we sent the input
                return { shouldContinuePollling: true };
            }
            else {
                // User declined
                this._execution.instance.focus(true);
                return { shouldContinuePollling: false };
            }
        }
        // Let custom poller override if provided
        const custom = await this._pollFn?.(this._execution, token, this._taskService);
        const resources = custom?.resources;
        const modelOutputEvalResponse = await this._assessOutputForErrors(this._execution.getOutput(), token);
        return { resources, modelOutputEvalResponse, shouldContinuePollling: false, output: custom?.output };
    }
    async _handleTimeoutState(command, invocationContext, extended, token) {
        let continuePollingPart;
        if (extended) {
            this._state = OutputMonitorState.Cancelled;
            return false;
        }
        extended = true;
        const { promise: p, part } = await this._promptForMorePolling(command, token, invocationContext);
        let continuePollingDecisionP = p;
        continuePollingPart = part;
        // Start another polling pass and race it against the user's decision
        const nextPollP = this._waitForIdle(this._execution, extended, token)
            .catch(() => ({
            state: OutputMonitorState.Cancelled,
            output: this._execution.getOutput(),
            modelOutputEvalResponse: 'Cancelled'
        }));
        const race = await Promise.race([
            continuePollingDecisionP.then(v => ({ kind: 'decision', v })),
            nextPollP.then(r => ({ kind: 'poll', r }))
        ]);
        if (race.kind === 'decision') {
            try {
                continuePollingPart?.hide();
            }
            catch { /* noop */ }
            continuePollingPart = undefined;
            // User explicitly declined to keep waiting, so finish with the timed-out result
            if (race.v === false) {
                this._state = OutputMonitorState.Cancelled;
                return false;
            }
            // User accepted; keep polling (the loop iterates again).
            // Clear the decision so we don't race on a resolved promise.
            continuePollingDecisionP = undefined;
            return true;
        }
        else {
            // A background poll completed while waiting for a decision
            const r = race.r;
            if (r === OutputMonitorState.Idle || r === OutputMonitorState.Cancelled || r === OutputMonitorState.Timeout) {
                try {
                    continuePollingPart?.hide();
                }
                catch { /* noop */ }
                continuePollingPart = undefined;
                continuePollingDecisionP = undefined;
                return false;
            }
            // Still timing out; loop and race again with the same prompt.
            return true;
        }
    }
    /**
     * Single bounded polling pass that returns when:
     *  - terminal becomes inactive/idle, or
     *  - timeout window elapses.
     */
    async _waitForIdle(execution, extendedPolling, token) {
        const maxWaitMs = extendedPolling ? 120000 /* PollingConsts.ExtendedPollingMaxDuration */ : 20000 /* PollingConsts.FirstPollingMaxDuration */;
        const maxInterval = 2000 /* PollingConsts.MaxPollingIntervalDuration */;
        let currentInterval = 500 /* PollingConsts.MinPollingDuration */;
        let waited = 0;
        let consecutiveIdleEvents = 0;
        let hasReceivedData = false;
        const onDataDisposable = execution.instance.onData((_data) => {
            hasReceivedData = true;
        });
        try {
            while (!token.isCancellationRequested && waited < maxWaitMs) {
                const waitTime = Math.min(currentInterval, maxWaitMs - waited);
                await timeout(waitTime, token);
                waited += waitTime;
                currentInterval = Math.min(currentInterval * 2, maxInterval);
                const currentOutput = execution.getOutput();
                const promptResult = detectsInputRequiredPattern(currentOutput);
                if (promptResult) {
                    this._state = OutputMonitorState.Idle;
                    return this._state;
                }
                if (hasReceivedData) {
                    consecutiveIdleEvents = 0;
                    hasReceivedData = false;
                }
                else {
                    consecutiveIdleEvents++;
                }
                const recentlyIdle = consecutiveIdleEvents >= 2 /* PollingConsts.MinIdleEvents */;
                const isActive = execution.isActive ? await execution.isActive() : undefined;
                this._logService.trace(`OutputMonitor: waitForIdle check: waited=${waited}ms, recentlyIdle=${recentlyIdle}, isActive=${isActive}`);
                if (recentlyIdle && isActive !== true) {
                    this._state = OutputMonitorState.Idle;
                    return this._state;
                }
            }
        }
        finally {
            onDataDisposable.dispose();
        }
        if (token.isCancellationRequested) {
            return OutputMonitorState.Cancelled;
        }
        return OutputMonitorState.Timeout;
    }
    async _promptForMorePolling(command, token, context) {
        if (token.isCancellationRequested || this._state === OutputMonitorState.Cancelled) {
            return { promise: Promise.resolve(false) };
        }
        const result = this._createElicitationPart(token, context?.sessionId, new MarkdownString(localize(13140, null, command)), new MarkdownString(localize(13141, null)), '', localize(13142, null), localize(13143, null), async () => true, async () => { this._state = OutputMonitorState.Cancelled; return false; });
        return { promise: result.promise.then(p => p ?? false), part: result.part };
    }
    async _assessOutputForErrors(buffer, token) {
        const model = await this._getLanguageModel();
        if (!model) {
            return 'No models available';
        }
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('core'), [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: `Evaluate this terminal output to determine if there were errors. If there are errors, return them. Otherwise, return undefined: ${buffer}.` }] }], {}, token);
        try {
            const responseFromStream = getTextResponseFromStream(response);
            await Promise.all([response.result, responseFromStream]);
            return await responseFromStream;
        }
        catch (err) {
            return 'Error occurred ' + err;
        }
    }
    async _determineUserInputOptions(execution, token) {
        if (token.isCancellationRequested) {
            return;
        }
        const model = await this._getLanguageModel();
        if (!model) {
            return undefined;
        }
        const lastLines = execution.getOutput(this._lastPromptMarker).trimEnd().split('\n').slice(-15).join('\n');
        const promptText = `Analyze the following terminal output. If it contains a prompt requesting user input (such as a confirmation, selection, or yes/no question) and that prompt has NOT already been answered, extract the prompt text. The prompt may ask to choose from a set. If so, extract the possible options as a JSON object with keys 'prompt', 'options' (an array of strings or an object with option to description mappings), and 'freeFormInput': false. If no options are provided, and free form input is requested, for example: Password:, return the word freeFormInput. For example, if the options are "[Y] Yes  [A] Yes to All  [N] No  [L] No to All  [C] Cancel", the option to description mappings would be {"Y": "Yes", "A": "Yes to All", "N": "No", "L": "No to All", "C": "Cancel"}. If there is no such prompt, return null. If the option is ambiguous, return null.
			Examples:
			1. Output: "Do you want to overwrite? (y/n)"
				Response: {"prompt": "Do you want to overwrite?", "options": ["y", "n"], "freeFormInput": false}

			2. Output: "Confirm: [Y] Yes  [A] Yes to All  [N] No  [L] No to All  [C] Cancel"
				Response: {"prompt": "Confirm", "options": ["Y", "A", "N", "L", "C"], "freeFormInput": false}

			3. Output: "Accept license terms? (yes/no)"
				Response: {"prompt": "Accept license terms?", "options": ["yes", "no"], "freeFormInput": false}

			4. Output: "Press Enter to continue"
				Response: {"prompt": "Press Enter to continue", "options": ["Enter"], "freeFormInput": false}

			5. Output: "Type Yes to proceed"
				Response: {"prompt": "Type Yes to proceed", "options": ["Yes"], "freeFormInput": false}

			6. Output: "Continue [y/N]"
				Response: {"prompt": "Continue", "options": ["y", "N"], "freeFormInput": false}

			7. Output: "Press any key to close the terminal."
				Response: {"prompt": "Press any key to continue...", "options": ["a"], "freeFormInput": false}

			8. Output: "Terminal will be reused by tasks, press any key to close it."
				Response: {"prompt": "Terminal will be reused by tasks, press any key to close it.", "options": ["a"], "freeFormInput": false}

			9. Output: "Password:"
				Response: {"prompt": "Password:", "freeFormInput": true, "options": []}
			10. Output: "press ctrl-c to detach, ctrl-d to kill"
				Response: null

			Alternatively, the prompt may request free form input, for example:
			1. Output: "Enter your username:"
				Response: {"prompt": "Enter your username:", "freeFormInput": true, "options": []}
			2. Output: "Password:"
				Response: {"prompt": "Password:", "freeFormInput": true, "options": []}
			Now, analyze this output:
			${lastLines}
			`;
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('core'), [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: promptText }] }], {}, token);
        const responseText = await getTextResponseFromStream(response);
        try {
            const match = responseText.match(/\{[\s\S]*\}/);
            if (match) {
                const obj = JSON.parse(match[0]);
                if (isObject(obj) &&
                    'prompt' in obj && isString(obj.prompt) &&
                    'options' in obj &&
                    'options' in obj &&
                    'freeFormInput' in obj && typeof obj.freeFormInput === 'boolean') {
                    if (this._lastPrompt === obj.prompt) {
                        return;
                    }
                    if (obj.freeFormInput === true) {
                        return { prompt: obj.prompt, options: [], detectedRequestForFreeFormInput: true };
                    }
                    if (Array.isArray(obj.options) && obj.options.every(isString)) {
                        return { prompt: obj.prompt, options: obj.options, detectedRequestForFreeFormInput: obj.freeFormInput };
                    }
                    else if (isObject(obj.options) && Object.values(obj.options).every(isString)) {
                        const keys = Object.keys(obj.options);
                        if (keys.length === 0) {
                            return undefined;
                        }
                        const descriptions = keys.map(key => obj.options[key]);
                        return { prompt: obj.prompt, options: keys, descriptions, detectedRequestForFreeFormInput: obj.freeFormInput };
                    }
                }
            }
        }
        catch (err) {
            console.error('Failed to parse confirmation prompt from language model response:', err);
        }
        return undefined;
    }
    async _selectAndHandleOption(confirmationPrompt, token) {
        if (!confirmationPrompt?.options.length) {
            return undefined;
        }
        const model = this._chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Chat)[0]?.input.currentLanguageModel;
        if (!model) {
            return undefined;
        }
        const models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', family: model.replaceAll('copilot/', '') });
        if (!models.length) {
            return undefined;
        }
        const prompt = confirmationPrompt.prompt;
        const options = confirmationPrompt.options;
        const currentMarker = this._execution.instance.registerMarker();
        if (!currentMarker) {
            // Unable to register marker, so cannot track prompt location
            return undefined;
        }
        this._lastPromptMarker = currentMarker;
        this._lastPrompt = prompt;
        const promptText = `Given the following confirmation prompt and options from a terminal output, which option is the default?\nPrompt: "${prompt}"\nOptions: ${JSON.stringify(options)}\nRespond with only the option string.`;
        const response = await this._languageModelsService.sendChatRequest(models[0], new ExtensionIdentifier('core'), [
            { role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: promptText }] }
        ], {}, token);
        const suggestedOption = (await getTextResponseFromStream(response)).trim();
        if (!suggestedOption) {
            return;
        }
        const parsed = suggestedOption.replace(/['"`]/g, '').trim();
        const index = confirmationPrompt.options.indexOf(parsed);
        const validOption = confirmationPrompt.options.find(opt => parsed === 'any key' || parsed === opt.replace(/['"`]/g, '').trim());
        if (!validOption || index === -1) {
            return;
        }
        let sentToTerminal = false;
        if (this._configurationService.getValue("chat.tools.terminal.autoReplyToPrompts" /* TerminalChatAgentToolsSettingId.AutoReplyToPrompts */)) {
            await this._execution.instance.sendText(validOption, true);
            this._outputMonitorTelemetryCounters.inputToolAutoAcceptCount++;
            this._outputMonitorTelemetryCounters.inputToolAutoChars += validOption?.length || 0;
            sentToTerminal = true;
        }
        const description = confirmationPrompt.descriptions?.[index];
        return description ? { suggestedOption: { description, option: validOption }, sentToTerminal } : { suggestedOption: validOption, sentToTerminal };
    }
    async _requestFreeFormTerminalInput(token, execution, confirmationPrompt) {
        const focusTerminalSelection = Symbol('focusTerminalSelection');
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize(13144, null)), new MarkdownString(localize(13145, null, confirmationPrompt.prompt)), '', localize(13146, null), undefined, () => {
            this._showInstance(execution.instance.instanceId);
            return focusTerminalSelection;
        });
        let inputDataDisposable = Disposable.None;
        const inputPromise = new Promise(resolve => {
            inputDataDisposable = this._register(execution.instance.onDidInputData((data) => {
                if (!data || data === '\r' || data === '\n' || data === '\r\n') {
                    part.hide();
                    inputDataDisposable.dispose();
                    this._state = OutputMonitorState.PollingForIdle;
                    this._outputMonitorTelemetryCounters.inputToolFreeFormInputCount++;
                    resolve(true);
                }
            }));
        });
        const result = await Promise.race([userPrompt, inputPromise]);
        if (result === focusTerminalSelection) {
            return await inputPromise;
        }
        if (result === undefined) {
            inputDataDisposable.dispose();
            // Prompt was dismissed without providing input
            return false;
        }
        return !!result;
    }
    async _confirmRunInTerminal(token, suggestedOption, execution, confirmationPrompt) {
        let suggestedOptionValue = isString(suggestedOption) ? suggestedOption : suggestedOption.option;
        if (suggestedOptionValue === 'any key') {
            suggestedOptionValue = 'a';
        }
        const focusTerminalSelection = Symbol('focusTerminalSelection');
        let inputDataDisposable = Disposable.None;
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize(13147, null)), new MarkdownString(localize(13148, null, confirmationPrompt.prompt, suggestedOptionValue, isString(suggestedOption) ? '' : suggestedOption.description ? ' (' + suggestedOption.description + ')' : '')), '', localize(13149, null), localize(13150, null), async (value) => {
            let option = undefined;
            if (value === true) {
                option = suggestedOptionValue;
            }
            else if (typeof value === 'object' && 'label' in value) {
                option = value.label.split(' (')[0];
            }
            this._outputMonitorTelemetryCounters.inputToolManualAcceptCount++;
            this._outputMonitorTelemetryCounters.inputToolManualChars += option?.length || 0;
            return option;
        }, () => {
            this._showInstance(execution.instance.instanceId);
            this._outputMonitorTelemetryCounters.inputToolManualRejectCount++;
            return focusTerminalSelection;
        }, getMoreActions(suggestedOption, confirmationPrompt));
        const inputPromise = new Promise(resolve => {
            inputDataDisposable = this._register(execution.instance.onDidInputData(() => {
                part.hide();
                inputDataDisposable.dispose();
                this._state = OutputMonitorState.PollingForIdle;
                resolve(true);
            }));
        });
        const optionToRun = await Promise.race([userPrompt, inputPromise]);
        if (optionToRun === focusTerminalSelection) {
            return await inputPromise;
        }
        if (optionToRun === true) {
            return true;
        }
        if (typeof optionToRun === 'string' && optionToRun.length) {
            inputDataDisposable.dispose();
            await execution.instance.sendText(optionToRun, true);
            return optionToRun;
        }
        inputDataDisposable.dispose();
        return optionToRun;
    }
    _showInstance(instanceId) {
        if (!instanceId) {
            return;
        }
        const instance = this._terminalService.getInstanceFromId(instanceId);
        if (!instance) {
            return;
        }
        this._terminalService.setActiveInstance(instance);
        this._terminalService.revealActiveTerminal(true);
    }
    // Helper to create, register, and wire a ChatElicitationRequestPart. Returns the promise that
    // resolves when the part is accepted/rejected and the registered part itself so callers can
    // attach additional listeners (e.g., onDidRequestHide) or compose with other promises.
    _createElicitationPart(token, sessionId, title, detail, subtitle, acceptLabel, rejectLabel, onAccept, onReject, moreActions) {
        const chatModel = sessionId && this._chatService.getSession(LocalChatSessionUri.forSession(sessionId));
        if (!(chatModel instanceof ChatModel)) {
            throw new Error('No model');
        }
        const request = chatModel.getRequests().at(-1);
        if (!request) {
            throw new Error('No request');
        }
        let part;
        const promise = new Promise(resolve => {
            const thePart = part = this._register(new ChatElicitationRequestPart(title, detail, subtitle, acceptLabel, rejectLabel, async (value) => {
                thePart.hide();
                this._promptPart = undefined;
                try {
                    const r = await (onAccept ? onAccept(value) : undefined);
                    resolve(r);
                }
                catch {
                    resolve(undefined);
                }
                return "accepted" /* ElicitationState.Accepted */;
            }, async () => {
                thePart.hide();
                this._promptPart = undefined;
                try {
                    const r = await (onReject ? onReject() : undefined);
                    resolve(r);
                }
                catch {
                    resolve(undefined);
                }
                return "rejected" /* ElicitationState.Rejected */;
            }, undefined, // source
            moreActions, () => this._outputMonitorTelemetryCounters.inputToolManualShownCount++));
            chatModel.acceptResponseProgress(request, thePart);
            this._promptPart = thePart;
        });
        this._register(token.onCancellationRequested(() => part.hide()));
        return { promise, part };
    }
    async _getLanguageModel() {
        let models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', id: 'copilot-fast' });
        // Fallback to gpt-4o-mini if copilot-fast is not available for backwards compatibility
        if (!models.length) {
            models = await this._languageModelsService.selectLanguageModels({ vendor: 'copilot', family: 'gpt-4o-mini' });
        }
        return models.length ? models[0] : undefined;
    }
};
OutputMonitor = __decorate([
    __param(5, ILanguageModelsService),
    __param(6, ITaskService),
    __param(7, IChatService),
    __param(8, IChatWidgetService),
    __param(9, IConfigurationService),
    __param(10, ILogService),
    __param(11, ITerminalService)
], OutputMonitor);
export { OutputMonitor };
function getMoreActions(suggestedOption, confirmationPrompt) {
    const moreActions = [];
    const moreOptions = confirmationPrompt.options.filter(a => a !== (isString(suggestedOption) ? suggestedOption : suggestedOption.option));
    let i = 0;
    for (const option of moreOptions) {
        const label = option + (confirmationPrompt.descriptions ? ' (' + confirmationPrompt.descriptions[i] + ')' : '');
        const action = {
            label,
            tooltip: label,
            id: `terminal.poll.send.${option}`,
            class: undefined,
            enabled: true,
            run: async () => { }
        };
        i++;
        moreActions.push(action);
    }
    return moreActions.length ? moreActions : undefined;
}
export function detectsInputRequiredPattern(cursorLine) {
    return [
        // PowerShell-style multi-option line (supports [?] Help and optional default suffix) ending
        // in whitespace
        /\s*(?:\[[^\]]\]\s+[^\[]+\s*)+(?:\(default is\s+"[^"]+"\):)?\s+$/,
        // Bracketed/parenthesized yes/no pairs at end of line: (y/n), [Y/n], (yes/no), [no/yes]
        /(?:\(|\[)\s*(?:y(?:es)?\s*\/\s*n(?:o)?|n(?:o)?\s*\/\s*y(?:es)?)\s*(?:\]|\))\s+$/i,
        // Same as above but allows a preceding '?' or ':' and optional wrappers e.g.
        // "Continue? (y/n)" or "Overwrite: [yes/no]"
        /[?:]\s*(?:\(|\[)?\s*y(?:es)?\s*\/\s*n(?:o)?\s*(?:\]|\))?\s+$/i,
        // Confirmation prompts ending with (y) e.g. "Ok to proceed? (y)"
        /\(y\)\s*$/i,
        // Line ends with ':'
        /:\s*$/,
        // Line contains (END) which is common in pagers
        /\(END\)$/,
        // Password prompt
        /password[:]?$/i,
        // Line ends with '?'
        /\?\s*(?:\([a-z\s]+\))?$/i,
        // "Press a key" or "Press any key"
        /press a(?:ny)? key/i,
    ].some(e => e.test(cursorLine));
}
//# sourceMappingURL=outputMonitor.js.map