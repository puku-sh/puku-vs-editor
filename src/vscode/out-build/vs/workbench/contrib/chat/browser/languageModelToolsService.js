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
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { assertNever } from '../../../../base/common/assert.js';
import { RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { encodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { createMarkdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ObservableSet } from '../../../../base/common/observable.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize, localize2 } from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import * as JSONContributionRegistry from '../../../../platform/jsonschemas/common/jsonContributionRegistry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatToolInvocation } from '../common/chatProgressTypes/chatToolInvocation.js';
import { IChatService, IChatToolInvocation } from '../common/chatService.js';
import { toToolSetVariableEntry, toToolVariableEntry } from '../common/chatVariableEntries.js';
import { ChatConfiguration } from '../common/constants.js';
import { ILanguageModelToolsConfirmationService } from '../common/languageModelToolsConfirmationService.js';
import { createToolSchemaUri, GithubCopilotToolReference, stringifyPromptTsxPart, ToolDataSource, ToolSet, VSCodeToolReference } from '../common/languageModelToolsService.js';
import { Target } from '../common/promptSyntax/promptFileParser.js';
import { getToolConfirmationAlert } from './chatAccessibilityProvider.js';
const jsonSchemaRegistry = Registry.as(JSONContributionRegistry.Extensions.JSONContribution);
var AutoApproveStorageKeys;
(function (AutoApproveStorageKeys) {
    AutoApproveStorageKeys["GlobalAutoApproveOptIn"] = "chat.tools.global.autoApprove.optIn";
})(AutoApproveStorageKeys || (AutoApproveStorageKeys = {}));
const SkipAutoApproveConfirmationKey = 'vscode.chat.tools.global.autoApprove.testMode';
export const globalAutoApproveDescription = localize2(6220, 'Global auto approve also known as "YOLO mode" disables manual approval completely for _all tools in all workspaces_, allowing the agent to act fully autonomously. This is extremely dangerous and is *never* recommended, even containerized environments like [Codespaces](https://github.com/features/codespaces) and [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) have user keys forwarded into the container that could be compromised.\n\n**This feature disables [critical security protections](https://code.visualstudio.com/docs/copilot/security) and makes it much easier for an attacker to compromise the machine.**');








let LanguageModelToolsService = class LanguageModelToolsService extends Disposable {
    constructor(_instantiationService, _extensionService, _contextKeyService, _chatService, _dialogService, _telemetryService, _logService, _configurationService, _accessibilityService, _accessibilitySignalService, _storageService, _confirmationService) {
        super();
        this._instantiationService = _instantiationService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._dialogService = _dialogService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._accessibilityService = _accessibilityService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._storageService = _storageService;
        this._confirmationService = _confirmationService;
        this._onDidChangeTools = this._register(new Emitter());
        this.onDidChangeTools = this._onDidChangeTools.event;
        this._onDidPrepareToolCallBecomeUnresponsive = this._register(new Emitter());
        this.onDidPrepareToolCallBecomeUnresponsive = this._onDidPrepareToolCallBecomeUnresponsive.event;
        /** Throttle tools updates because it sends all tools and runs on context key updates */
        this._onDidChangeToolsScheduler = new RunOnceScheduler(() => this._onDidChangeTools.fire(), 750);
        this._tools = new Map();
        this._toolContextKeys = new Set();
        this._callsByRequestId = new Map();
        this._githubToVSCodeToolMap = {
            [GithubCopilotToolReference.shell]: VSCodeToolReference.shell,
            [GithubCopilotToolReference.customAgent]: VSCodeToolReference.runSubagent,
            'github/*': 'github/github-mcp-server/*',
            'playwright/*': 'microsoft/playwright-mcp/*',
        };
        this._githubPrefixToVSCodePrefix = [['github', 'github/github-mcp-server'], ['playwright', 'microsoft/playwright-mcp']];
        this._toolSets = new ObservableSet();
        this.toolSets = this._toolSets.observable;
        this._register(this._contextKeyService.onDidChangeContext(e => {
            if (e.affectsSome(this._toolContextKeys)) {
                // Not worth it to compute a delta here unless we have many tools changing often
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.ExtensionToolsEnabled)) {
                this._onDidChangeToolsScheduler.schedule();
            }
        }));
        // Clear out warning accepted state if the setting is disabled
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, e => {
            if (!e || e.affectsConfiguration(ChatConfiguration.GlobalAutoApprove)) {
                if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) !== true) {
                    this._storageService.remove("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */);
                }
            }
        }));
        this._ctxToolsCount = ChatContextKeys.Tools.toolsCount.bindTo(_contextKeyService);
        // Create the internal VS Code tool set
        this.vscodeToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'vscode', VSCodeToolReference.vscode, {
            icon: ThemeIcon.fromId(Codicon.vscode.id),
            description: localize(6211, null),
        }));
        // Create the internal Launch tool set
        this.launchToolSet = this._register(this.createToolSet(ToolDataSource.Internal, 'launch', VSCodeToolReference.launch, {
            icon: ThemeIcon.fromId(Codicon.rocket.id),
            description: localize(6212, null),
        }));
    }
    dispose() {
        super.dispose();
        this._callsByRequestId.forEach(calls => calls.forEach(call => call.store.dispose()));
        this._ctxToolsCount.reset();
    }
    registerToolData(toolData) {
        if (this._tools.has(toolData.id)) {
            throw new Error(`Tool "${toolData.id}" is already registered.`);
        }
        this._tools.set(toolData.id, { data: toolData });
        this._ctxToolsCount.set(this._tools.size);
        this._onDidChangeToolsScheduler.schedule();
        toolData.when?.keys().forEach(key => this._toolContextKeys.add(key));
        let store;
        if (toolData.inputSchema) {
            store = new DisposableStore();
            const schemaUrl = createToolSchemaUri(toolData.id).toString();
            jsonSchemaRegistry.registerSchema(schemaUrl, toolData.inputSchema, store);
            store.add(jsonSchemaRegistry.registerSchemaAssociation(schemaUrl, `/lm/tool/${toolData.id}/tool_input.json`));
        }
        return toDisposable(() => {
            store?.dispose();
            this._tools.delete(toolData.id);
            this._ctxToolsCount.set(this._tools.size);
            this._refreshAllToolContextKeys();
            this._onDidChangeToolsScheduler.schedule();
        });
    }
    flushToolUpdates() {
        this._onDidChangeToolsScheduler.flush();
    }
    _refreshAllToolContextKeys() {
        this._toolContextKeys.clear();
        for (const tool of this._tools.values()) {
            tool.data.when?.keys().forEach(key => this._toolContextKeys.add(key));
        }
    }
    registerToolImplementation(id, tool) {
        const entry = this._tools.get(id);
        if (!entry) {
            throw new Error(`Tool "${id}" was not contributed.`);
        }
        if (entry.impl) {
            throw new Error(`Tool "${id}" already has an implementation.`);
        }
        entry.impl = tool;
        return toDisposable(() => {
            entry.impl = undefined;
        });
    }
    registerTool(toolData, tool) {
        return combinedDisposable(this.registerToolData(toolData), this.registerToolImplementation(toolData.id, tool));
    }
    getTools(includeDisabled) {
        const toolDatas = Iterable.map(this._tools.values(), i => i.data);
        const extensionToolsEnabled = this._configurationService.getValue(ChatConfiguration.ExtensionToolsEnabled);
        return Iterable.filter(toolDatas, toolData => {
            const satisfiesWhenClause = includeDisabled || !toolData.when || this._contextKeyService.contextMatchesRules(toolData.when);
            const satisfiesExternalToolCheck = toolData.source.type !== 'extension' || !!extensionToolsEnabled;
            return satisfiesWhenClause && satisfiesExternalToolCheck;
        });
    }
    getTool(id) {
        return this._getToolEntry(id)?.data;
    }
    _getToolEntry(id) {
        const entry = this._tools.get(id);
        if (entry && (!entry.data.when || this._contextKeyService.contextMatchesRules(entry.data.when))) {
            return entry;
        }
        else {
            return undefined;
        }
    }
    getToolByName(name, includeDisabled) {
        for (const tool of this.getTools(!!includeDisabled)) {
            if (tool.toolReferenceName === name) {
                return tool;
            }
        }
        return undefined;
    }
    async invokeTool(dto, countTokens, token) {
        this._logService.trace(`[LanguageModelToolsService#invokeTool] Invoking tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}`);
        // When invoking a tool, don't validate the "when" clause. An extension may have invoked a tool just as it was becoming disabled, and just let it go through rather than throw and break the chat.
        let tool = this._tools.get(dto.toolId);
        if (!tool) {
            throw new Error(`Tool ${dto.toolId} was not contributed`);
        }
        if (!tool.impl) {
            await this._extensionService.activateByEvent(`onLanguageModelTool:${dto.toolId}`);
            // Extension should activate and register the tool implementation
            tool = this._tools.get(dto.toolId);
            if (!tool?.impl) {
                throw new Error(`Tool ${dto.toolId} does not have an implementation registered.`);
            }
        }
        // Shortcut to write to the model directly here, but could call all the way back to use the real stream.
        let toolInvocation;
        let requestId;
        let store;
        let toolResult;
        let prepareTimeWatch;
        let invocationTimeWatch;
        let preparedInvocation;
        try {
            if (dto.context) {
                store = new DisposableStore();
                const model = this._chatService.getSession(dto.context.sessionResource);
                if (!model) {
                    throw new Error(`Tool called for unknown chat session`);
                }
                const request = model.getRequests().at(-1);
                requestId = request.id;
                dto.modelId = request.modelId;
                dto.userSelectedTools = request.userSelectedTools;
                // Replace the token with a new token that we can cancel when cancelToolCallsForRequest is called
                if (!this._callsByRequestId.has(requestId)) {
                    this._callsByRequestId.set(requestId, []);
                }
                const trackedCall = { store };
                this._callsByRequestId.get(requestId).push(trackedCall);
                const source = new CancellationTokenSource();
                store.add(toDisposable(() => {
                    source.dispose(true);
                }));
                store.add(token.onCancellationRequested(() => {
                    IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
                    source.cancel();
                }));
                store.add(source.token.onCancellationRequested(() => {
                    IChatToolInvocation.confirmWith(toolInvocation, { type: 0 /* ToolConfirmKind.Denied */ });
                }));
                token = source.token;
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocation(tool, dto, token);
                prepareTimeWatch.stop();
                toolInvocation = new ChatToolInvocation(preparedInvocation, tool.data, dto.callId, dto.fromSubAgent, dto.parameters);
                trackedCall.invocation = toolInvocation;
                const autoConfirmed = await this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters);
                if (autoConfirmed) {
                    IChatToolInvocation.confirmWith(toolInvocation, autoConfirmed);
                }
                this._chatService.appendProgress(request, toolInvocation);
                dto.toolSpecificData = toolInvocation?.toolSpecificData;
                if (preparedInvocation?.confirmationMessages?.title) {
                    if (!IChatToolInvocation.executionConfirmedOrDenied(toolInvocation) && !autoConfirmed) {
                        this.playAccessibilitySignal([toolInvocation]);
                    }
                    const userConfirmed = await IChatToolInvocation.awaitConfirmation(toolInvocation, token);
                    if (userConfirmed.type === 0 /* ToolConfirmKind.Denied */) {
                        throw new CancellationError();
                    }
                    if (userConfirmed.type === 5 /* ToolConfirmKind.Skipped */) {
                        toolResult = {
                            content: [{
                                    kind: 'text',
                                    value: 'The user chose to skip the tool call, they want to proceed without running it'
                                }]
                        };
                        return toolResult;
                    }
                    if (dto.toolSpecificData?.kind === 'input') {
                        dto.parameters = dto.toolSpecificData.rawInput;
                        dto.toolSpecificData = undefined;
                    }
                }
            }
            else {
                prepareTimeWatch = StopWatch.create(true);
                preparedInvocation = await this.prepareToolInvocation(tool, dto, token);
                prepareTimeWatch.stop();
                if (preparedInvocation?.confirmationMessages?.title && !(await this.shouldAutoConfirm(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters))) {
                    const result = await this._dialogService.confirm({ message: renderAsPlaintext(preparedInvocation.confirmationMessages.title), detail: renderAsPlaintext(preparedInvocation.confirmationMessages.message) });
                    if (!result.confirmed) {
                        throw new CancellationError();
                    }
                }
                dto.toolSpecificData = preparedInvocation?.toolSpecificData;
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            invocationTimeWatch = StopWatch.create(true);
            toolResult = await tool.impl.invoke(dto, countTokens, {
                report: step => {
                    toolInvocation?.acceptProgress(step);
                }
            }, token);
            invocationTimeWatch.stop();
            this.ensureToolDetails(dto, toolResult, tool.data);
            if (toolInvocation?.didExecuteTool(toolResult).type === 2 /* IChatToolInvocation.StateKind.WaitingForPostApproval */) {
                const autoConfirmedPost = await this.shouldAutoConfirmPostExecution(tool.data.id, tool.data.runsInWorkspace, tool.data.source, dto.parameters);
                if (autoConfirmedPost) {
                    IChatToolInvocation.confirmWith(toolInvocation, autoConfirmedPost);
                }
                const postConfirm = await IChatToolInvocation.awaitPostConfirmation(toolInvocation, token);
                if (postConfirm.type === 0 /* ToolConfirmKind.Denied */) {
                    throw new CancellationError();
                }
                if (postConfirm.type === 5 /* ToolConfirmKind.Skipped */) {
                    toolResult = {
                        content: [{
                                kind: 'text',
                                value: 'The tool executed but the user chose not to share the results'
                            }]
                    };
                }
            }
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result: 'success',
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            return toolResult;
        }
        catch (err) {
            const result = isCancellationError(err) ? 'userCancelled' : 'error';
            this._telemetryService.publicLog2('languageModelToolInvoked', {
                result,
                chatSessionId: dto.context?.sessionId,
                toolId: tool.data.id,
                toolExtensionId: tool.data.source.type === 'extension' ? tool.data.source.extensionId.value : undefined,
                toolSourceKind: tool.data.source.type,
                prepareTimeMs: prepareTimeWatch?.elapsed(),
                invocationTimeMs: invocationTimeWatch?.elapsed(),
            });
            this._logService.error(`[LanguageModelToolsService#invokeTool] Error from tool ${dto.toolId} with parameters ${JSON.stringify(dto.parameters)}:\n${toErrorMessage(err, true)}`);
            toolResult ??= { content: [] };
            toolResult.toolResultError = err instanceof Error ? err.message : String(err);
            if (tool.data.alwaysDisplayInputOutput) {
                toolResult.toolResultDetails = { input: this.formatToolInput(dto), output: [{ type: 'embed', isText: true, value: String(err) }], isError: true };
            }
            throw err;
        }
        finally {
            toolInvocation?.didExecuteTool(toolResult, true);
            if (store) {
                this.cleanupCallDisposables(requestId, store);
            }
        }
    }
    async prepareToolInvocation(tool, dto, token) {
        let prepared;
        if (tool.impl.prepareToolInvocation) {
            const preparePromise = tool.impl.prepareToolInvocation({
                parameters: dto.parameters,
                chatRequestId: dto.chatRequestId,
                chatSessionId: dto.context?.sessionId,
                chatInteractionId: dto.chatInteractionId
            }, token);
            const raceResult = await Promise.race([
                timeout(3000, token).then(() => 'timeout'),
                preparePromise
            ]);
            if (raceResult === 'timeout') {
                this._onDidPrepareToolCallBecomeUnresponsive.fire({
                    sessionId: dto.context?.sessionId ?? '',
                    toolData: tool.data
                });
            }
            prepared = await preparePromise;
        }
        const isEligibleForAutoApproval = this.isToolEligibleForAutoApproval(tool.data);
        // Default confirmation messages if tool is not eligible for auto-approval
        if (!isEligibleForAutoApproval && !prepared?.confirmationMessages?.title) {
            if (!prepared) {
                prepared = {};
            }
            const toolReferenceName = getToolReferenceFullName(tool.data);
            // TODO: This should be more detailed per tool.
            prepared.confirmationMessages = {
                ...prepared.confirmationMessages,
                title: localize(6213, null),
                message: localize(6214, null, toolReferenceName),
                disclaimer: new MarkdownString(localize(6215, null, getToolReferenceFullName(tool.data), createMarkdownCommandLink({ title: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval] }, false)), { isTrusted: true }),
                allowAutoConfirm: false,
            };
        }
        if (!isEligibleForAutoApproval && prepared?.confirmationMessages?.title) {
            // Always overwrite the disclaimer if not eligible for auto-approval
            prepared.confirmationMessages.disclaimer = new MarkdownString(localize(6216, null, getToolReferenceFullName(tool.data), createMarkdownCommandLink({ title: '`' + ChatConfiguration.EligibleForAutoApproval + '`', id: 'workbench.action.openSettings', arguments: [ChatConfiguration.EligibleForAutoApproval] }, false)), { isTrusted: true });
        }
        if (prepared?.confirmationMessages?.title) {
            if (prepared.toolSpecificData?.kind !== 'terminal' && prepared.confirmationMessages.allowAutoConfirm !== false) {
                prepared.confirmationMessages.allowAutoConfirm = isEligibleForAutoApproval;
            }
            if (!prepared.toolSpecificData && tool.data.alwaysDisplayInputOutput) {
                prepared.toolSpecificData = {
                    kind: 'input',
                    rawInput: dto.parameters,
                };
            }
        }
        return prepared;
    }
    playAccessibilitySignal(toolInvocations) {
        const autoApproved = this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove);
        if (autoApproved) {
            return;
        }
        const setting = this._configurationService.getValue(AccessibilitySignal.chatUserActionRequired.settingsKey);
        if (!setting) {
            return;
        }
        const soundEnabled = setting.sound === 'on' || (setting.sound === 'auto' && (this._accessibilityService.isScreenReaderOptimized()));
        const announcementEnabled = this._accessibilityService.isScreenReaderOptimized() && setting.announcement === 'auto';
        if (soundEnabled || announcementEnabled) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.chatUserActionRequired, { customAlertMessage: this._instantiationService.invokeFunction(getToolConfirmationAlert, toolInvocations), userGesture: true, modality: !soundEnabled ? 'announcement' : undefined });
        }
    }
    ensureToolDetails(dto, toolResult, toolData) {
        if (!toolResult.toolResultDetails && toolData.alwaysDisplayInputOutput) {
            toolResult.toolResultDetails = {
                input: this.formatToolInput(dto),
                output: this.toolResultToIO(toolResult),
            };
        }
    }
    formatToolInput(dto) {
        return JSON.stringify(dto.parameters, undefined, 2);
    }
    toolResultToIO(toolResult) {
        return toolResult.content.map(part => {
            if (part.kind === 'text') {
                return { type: 'embed', isText: true, value: part.value };
            }
            else if (part.kind === 'promptTsx') {
                return { type: 'embed', isText: true, value: stringifyPromptTsxPart(part) };
            }
            else if (part.kind === 'data') {
                return { type: 'embed', value: encodeBase64(part.value.data), mimeType: part.value.mimeType };
            }
            else {
                assertNever(part);
            }
        });
    }
    getEligibleForAutoApprovalSpecialCase(toolData) {
        if (toolData.id === 'vscode_fetchWebPage_internal') {
            return 'fetch';
        }
        return undefined;
    }
    isToolEligibleForAutoApproval(toolData) {
        const toolReferenceName = this.getEligibleForAutoApprovalSpecialCase(toolData) ?? getToolReferenceFullName(toolData);
        if (toolData.id === 'copilot_fetchWebPage') {
            // Special case, this fetch will call an internal tool 'vscode_fetchWebPage_internal'
            return true;
        }
        const eligibilityConfig = this._configurationService.getValue(ChatConfiguration.EligibleForAutoApproval);
        if (eligibilityConfig && typeof eligibilityConfig === 'object' && toolReferenceName) {
            // Direct match
            if (Object.prototype.hasOwnProperty.call(eligibilityConfig, toolReferenceName)) {
                return eligibilityConfig[toolReferenceName];
            }
            // Back compat with legacy names
            if (toolData.legacyToolReferenceFullNames) {
                for (const legacyName of toolData.legacyToolReferenceFullNames) {
                    if (Object.prototype.hasOwnProperty.call(eligibilityConfig, legacyName)) {
                        return eligibilityConfig[legacyName];
                    }
                }
            }
        }
        // Default true
        return true;
    }
    async shouldAutoConfirm(toolId, runsInWorkspace, source, parameters) {
        const tool = this._tools.get(toolId);
        if (!tool) {
            return undefined;
        }
        if (!this.isToolEligibleForAutoApproval(tool.data)) {
            return undefined;
        }
        const reason = this._confirmationService.getPreConfirmAction({ toolId, source, parameters });
        if (reason) {
            return reason;
        }
        const config = this._configurationService.inspect(ChatConfiguration.GlobalAutoApprove);
        // If we know the tool runs at a global level, only consider the global config.
        // If we know the tool runs at a workspace level, use those specific settings when appropriate.
        let value = config.value ?? config.defaultValue;
        if (typeof runsInWorkspace === 'boolean') {
            value = config.userLocalValue ?? config.applicationValue;
            if (runsInWorkspace) {
                value = config.workspaceValue ?? config.workspaceFolderValue ?? config.userRemoteValue ?? value;
            }
        }
        const autoConfirm = value === true || (typeof value === 'object' && value.hasOwnProperty(toolId) && value[toolId] === true);
        if (autoConfirm) {
            if (await this._checkGlobalAutoApprove()) {
                return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
            }
        }
        return undefined;
    }
    async shouldAutoConfirmPostExecution(toolId, runsInWorkspace, source, parameters) {
        if (this._configurationService.getValue(ChatConfiguration.GlobalAutoApprove) && await this._checkGlobalAutoApprove()) {
            return { type: 2 /* ToolConfirmKind.Setting */, id: ChatConfiguration.GlobalAutoApprove };
        }
        return this._confirmationService.getPostConfirmAction({ toolId, source, parameters });
    }
    async _checkGlobalAutoApprove() {
        const optedIn = this._storageService.getBoolean("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, -1 /* StorageScope.APPLICATION */, false);
        if (optedIn) {
            return true;
        }
        if (this._contextKeyService.getContextKeyValue(SkipAutoApproveConfirmationKey) === true) {
            return true;
        }
        const promptResult = await this._dialogService.prompt({
            type: Severity.Warning,
            message: localize(6217, null),
            buttons: [
                {
                    label: localize(6218, null),
                    run: () => true
                },
                {
                    label: localize(6219, null),
                    run: () => false
                },
            ],
            custom: {
                icon: Codicon.warning,
                disableCloseAction: true,
                markdownDetails: [{
                        markdown: new MarkdownString(globalAutoApproveDescription.value),
                    }],
            }
        });
        if (promptResult.result !== true) {
            await this._configurationService.updateValue(ChatConfiguration.GlobalAutoApprove, false);
            return false;
        }
        this._storageService.store("chat.tools.global.autoApprove.optIn" /* AutoApproveStorageKeys.GlobalAutoApproveOptIn */, true, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
        return true;
    }
    cleanupCallDisposables(requestId, store) {
        if (requestId) {
            const disposables = this._callsByRequestId.get(requestId);
            if (disposables) {
                const index = disposables.findIndex(d => d.store === store);
                if (index > -1) {
                    disposables.splice(index, 1);
                }
                if (disposables.length === 0) {
                    this._callsByRequestId.delete(requestId);
                }
            }
        }
        store.dispose();
    }
    cancelToolCallsForRequest(requestId) {
        const calls = this._callsByRequestId.get(requestId);
        if (calls) {
            calls.forEach(call => call.store.dispose());
            this._callsByRequestId.delete(requestId);
        }
    }
    mapGithubToolName(name) {
        const mapped = this._githubToVSCodeToolMap[name];
        if (mapped) {
            return mapped;
        }
        for (const [fromPrefix, toPrefix] of this._githubPrefixToVSCodePrefix) {
            const regexp = new RegExp(`^${fromPrefix}(/[^/]+)$`);
            const m = name.match(regexp);
            if (m) {
                return toPrefix + m[1];
            }
        }
        return name;
    }
    /**
     * Create a map that contains all tools and toolsets with their enablement state.
     * @param toolOrToolSetNames A list of tool or toolset names that are enabled.
     * @returns A map of tool or toolset instances to their enablement state.
     */
    toToolAndToolSetEnablementMap(enabledQualifiedToolOrToolSetNames, target) {
        if (target === undefined || target === Target.GitHubCopilot) {
            enabledQualifiedToolOrToolSetNames = enabledQualifiedToolOrToolSetNames.map(name => this.mapGithubToolName(name));
        }
        const toolOrToolSetNames = new Set(enabledQualifiedToolOrToolSetNames);
        const result = new Map();
        for (const [tool, toolReferenceName] of this.getPromptReferencableTools()) {
            if (tool instanceof ToolSet) {
                const enabled = Boolean(toolOrToolSetNames.has(toolReferenceName) ||
                    toolOrToolSetNames.has(tool.referenceName) ||
                    tool.legacyFullNames?.some(name => toolOrToolSetNames.has(name)));
                result.set(tool, enabled);
                if (enabled) {
                    for (const memberTool of tool.getTools()) {
                        result.set(memberTool, true);
                    }
                }
            }
            else {
                if (!result.has(tool)) { // already set via an enabled toolset
                    const enabled = Boolean(toolOrToolSetNames.has(toolReferenceName) ||
                        toolOrToolSetNames.has(tool.toolReferenceName ?? tool.displayName) ||
                        tool.legacyToolReferenceFullNames?.some(toolFullName => {
                            // enable tool if either the legacy fully qualified name or just the legacy tool set name is present
                            const toolSetFullName = toolFullName.substring(0, toolFullName.lastIndexOf('/'));
                            return toolOrToolSetNames.has(toolFullName) ||
                                (toolSetFullName && toolOrToolSetNames.has(toolSetFullName));
                        }));
                    result.set(tool, enabled);
                }
            }
        }
        // also add all user tool sets (not part of the prompt referencable tools)
        for (const toolSet of this._toolSets) {
            if (toolSet.source.type === 'user') {
                const enabled = Iterable.every(toolSet.getTools(), t => result.get(t) === true);
                result.set(toolSet, enabled);
            }
        }
        return result;
    }
    toQualifiedToolNames(map) {
        const result = [];
        const toolsCoveredByEnabledToolSet = new Set();
        for (const [tool, toolReferenceName] of this.getPromptReferencableTools()) {
            if (tool instanceof ToolSet) {
                if (map.get(tool)) {
                    result.push(toolReferenceName);
                    for (const memberTool of tool.getTools()) {
                        toolsCoveredByEnabledToolSet.add(memberTool);
                    }
                }
            }
            else {
                if (map.get(tool) && !toolsCoveredByEnabledToolSet.has(tool)) {
                    result.push(toolReferenceName);
                }
            }
        }
        return result;
    }
    toToolReferences(variableReferences) {
        const toolsOrToolSetByName = new Map();
        for (const [tool, toolReferenceName] of this.getPromptReferencableTools()) {
            toolsOrToolSetByName.set(toolReferenceName, tool);
        }
        const result = [];
        for (const ref of variableReferences) {
            const toolOrToolSet = toolsOrToolSetByName.get(ref.name);
            if (toolOrToolSet) {
                if (toolOrToolSet instanceof ToolSet) {
                    result.push(toToolSetVariableEntry(toolOrToolSet, ref.range));
                }
                else {
                    result.push(toToolVariableEntry(toolOrToolSet, ref.range));
                }
            }
        }
        return result;
    }
    getToolSet(id) {
        for (const toolSet of this._toolSets) {
            if (toolSet.id === id) {
                return toolSet;
            }
        }
        return undefined;
    }
    getToolSetByName(name) {
        for (const toolSet of this._toolSets) {
            if (toolSet.referenceName === name) {
                return toolSet;
            }
        }
        return undefined;
    }
    createToolSet(source, id, referenceName, options) {
        const that = this;
        const result = new class extends ToolSet {
            dispose() {
                if (that._toolSets.has(result)) {
                    this._tools.clear();
                    that._toolSets.delete(result);
                }
            }
        }(id, referenceName, options?.icon ?? Codicon.tools, source, options?.description, options?.legacyFullNames);
        this._toolSets.add(result);
        return result;
    }
    *getPromptReferencableTools() {
        const coveredByToolSets = new Set();
        for (const toolSet of this.toolSets.get()) {
            if (toolSet.source.type !== 'user') {
                yield [toolSet, getToolSetReferenceName(toolSet)];
                for (const tool of toolSet.getTools()) {
                    yield [tool, getToolReferenceFullName(tool, toolSet)];
                    coveredByToolSets.add(tool);
                }
            }
        }
        for (const tool of this.getTools()) {
            if (tool.canBeReferencedInPrompt && !coveredByToolSets.has(tool)) {
                yield [tool, getToolReferenceFullName(tool)];
            }
        }
    }
    *getQualifiedToolNames() {
        for (const [, toolReferenceName] of this.getPromptReferencableTools()) {
            yield toolReferenceName;
        }
    }
    getDeprecatedQualifiedToolNames() {
        const result = new Map();
        const knownToolSetNames = new Set();
        const add = (name, toolReferenceName) => {
            if (name !== toolReferenceName) {
                if (!result.has(name)) {
                    result.set(name, new Set());
                }
                result.get(name).add(toolReferenceName);
            }
        };
        for (const [tool, _] of this.getPromptReferencableTools()) {
            if (tool instanceof ToolSet) {
                knownToolSetNames.add(tool.referenceName);
                if (tool.legacyFullNames) {
                    for (const legacyName of tool.legacyFullNames) {
                        knownToolSetNames.add(legacyName);
                    }
                }
            }
        }
        for (const [tool, toolReferenceName] of this.getPromptReferencableTools()) {
            if (tool instanceof ToolSet) {
                add(tool.referenceName, toolReferenceName);
                if (tool.legacyFullNames) {
                    for (const legacyName of tool.legacyFullNames) {
                        add(legacyName, toolReferenceName);
                    }
                }
            }
            else {
                add(tool.toolReferenceName ?? tool.displayName, toolReferenceName);
                if (tool.legacyToolReferenceFullNames) {
                    for (const legacyName of tool.legacyToolReferenceFullNames) {
                        add(legacyName, toolReferenceName);
                        // for any 'orphaned' toolsets (toolsets that no longer exist and
                        // do not have an explicit legacy mapping), we should
                        // just point them to the list of tools directly
                        if (legacyName.includes('/')) {
                            const toolSetFullName = legacyName.substring(0, legacyName.lastIndexOf('/'));
                            if (!knownToolSetNames.has(toolSetFullName)) {
                                add(toolSetFullName, toolReferenceName);
                            }
                        }
                    }
                }
            }
        }
        return result;
    }
    getToolByQualifiedName(qualifiedName) {
        for (const [tool, toolReferenceName] of this.getPromptReferencableTools()) {
            if (qualifiedName === toolReferenceName) {
                return tool;
            }
            // legacy: check for the old name
            if (qualifiedName === (tool instanceof ToolSet ? tool.referenceName : tool.toolReferenceName ?? tool.displayName)) {
                return tool;
            }
        }
        return undefined;
    }
    getQualifiedToolName(tool, toolSet) {
        if (tool instanceof ToolSet) {
            return getToolSetReferenceName(tool);
        }
        return getToolReferenceFullName(tool, toolSet);
    }
};
LanguageModelToolsService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IExtensionService),
    __param(2, IContextKeyService),
    __param(3, IChatService),
    __param(4, IDialogService),
    __param(5, ITelemetryService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IAccessibilityService),
    __param(9, IAccessibilitySignalService),
    __param(10, IStorageService),
    __param(11, ILanguageModelToolsConfirmationService)
], LanguageModelToolsService);
export { LanguageModelToolsService };
function getToolReferenceFullName(tool, toolSet) {
    const toolName = tool.toolReferenceName ?? tool.displayName;
    if (toolSet) {
        return `${toolSet.referenceName}/${toolName}`;
    }
    else if (tool.source.type === 'extension') {
        return `${tool.source.extensionId.value.toLowerCase()}/${toolName}`;
    }
    return toolName;
}
function getToolSetReferenceName(toolSet) {
    if (toolSet.source.type === 'mcp') {
        return `${toolSet.referenceName}/*`;
    }
    return toolSet.referenceName;
}
//# sourceMappingURL=languageModelToolsService.js.map