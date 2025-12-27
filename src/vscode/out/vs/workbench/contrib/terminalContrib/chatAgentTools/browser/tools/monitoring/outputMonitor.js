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
        const result = this._createElicitationPart(token, context?.sessionId, new MarkdownString(localize('poll.terminal.waiting', "Continue waiting for `{0}`?", command)), new MarkdownString(localize('poll.terminal.polling', "This will continue to poll for output to determine when the terminal becomes idle for up to 2 minutes.")), '', localize('poll.terminal.accept', 'Yes'), localize('poll.terminal.reject', 'No'), async () => true, async () => { this._state = OutputMonitorState.Cancelled; return false; });
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
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize('poll.terminal.inputRequest', "The terminal is awaiting input.")), new MarkdownString(localize('poll.terminal.requireInput', "{0}\nPlease provide the required input to the terminal.\n\n", confirmationPrompt.prompt)), '', localize('poll.terminal.enterInput', 'Focus terminal'), undefined, () => {
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
        const { promise: userPrompt, part } = this._createElicitationPart(token, execution.sessionId, new MarkdownString(localize('poll.terminal.confirmRequired', "The terminal is awaiting input.")), new MarkdownString(localize('poll.terminal.confirmRunDetail', "{0}\n Do you want to send `{1}`{2} followed by `Enter` to the terminal?", confirmationPrompt.prompt, suggestedOptionValue, isString(suggestedOption) ? '' : suggestedOption.description ? ' (' + suggestedOption.description + ')' : '')), '', localize('poll.terminal.acceptRun', 'Allow'), localize('poll.terminal.rejectRun', 'Focus Terminal'), async (value) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3Rvb2xzL21vbml0b3Jpbmcvb3V0cHV0TW9uaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsT0FBTyxFQUFxQixNQUFNLDJDQUEyQyxDQUFDO0FBRXZGLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLFVBQVUsRUFBb0IsTUFBTSwrQ0FBK0MsQ0FBQztBQUM3RixPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDcEUsT0FBTyxFQUFvQixZQUFZLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQW1CLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdkcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FB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