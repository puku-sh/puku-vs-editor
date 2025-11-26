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
var SetupAgent_1, AINewSymbolNamesProvider_1, ChatCodeActionsProvider_1, ChatSetup_1, ChatTeardownContribution_1;
import './media/chatSetup.css';
import { $ } from '../../../../base/browser/dom.js';
import { Dialog, DialogContentsAlignment } from '../../../../base/browser/ui/dialog/dialog.js';
import { timeout } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, markAsSingleton, MutableDisposable } from '../../../../base/common/lifecycle.js';
import Severity from '../../../../base/common/severity.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { equalsIgnoreCase } from '../../../../base/common/strings.js';
import { isObject } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IMarkdownRendererService } from '../../../../platform/markdown/browser/markdownRenderer.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, MenuId, MenuRegistry, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import product from '../../../../platform/product/common/product.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IActivityService, ProgressBadge } from '../../../services/activity/common/activity.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { ExtensionUrlHandlerOverrideRegistry } from '../../../services/extensions/browser/extensionUrlHandler.js';
import { IExtensionService, nullExtensionDescription } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { ChatContextKeys } from '../common/chatContextKeys.js';
import { ChatEntitlement, ChatEntitlementRequests, IChatEntitlementService, isProUser } from '../../../services/chat/common/chatEntitlementService.js';
import { ChatRequestModel } from '../common/chatModel.js';
import { ChatMode, IChatModeService } from '../common/chatModes.js';
import { ChatRequestAgentPart, ChatRequestToolPart } from '../common/chatParserTypes.js';
import { IChatService } from '../common/chatService.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from '../common/constants.js';
import { ILanguageModelsService } from '../common/languageModels.js';
import { CHAT_CATEGORY, CHAT_OPEN_ACTION_ID, CHAT_SETUP_ACTION_ID, CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID } from './actions/chatActions.js';
import { ChatViewId, IChatWidgetService } from './chat.js';
import { CHAT_SIDEBAR_PANEL_ID } from './chatViewPane.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { chatViewsWelcomeRegistry } from './viewsWelcome/chatViewsWelcome.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { CodeActionKind } from '../../../../editor/contrib/codeAction/common/types.js';
import { ACTION_START as INLINE_CHAT_START } from '../../inlineChat/common/inlineChat.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { EditorContextKeys } from '../../../../editor/common/editorContextKeys.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IPukuAuthService } from '../../../services/chat/common/pukuAuthService.js';
const defaultChat = {
    extensionId: product.defaultChatAgent?.extensionId ?? '',
    chatExtensionId: product.defaultChatAgent?.chatExtensionId ?? '',
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
    manageOveragesUrl: product.defaultChatAgent?.manageOverageUrl ?? '',
    upgradePlanUrl: product.defaultChatAgent?.upgradePlanUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { id: '', name: '' }, enterprise: { id: '', name: '' }, apple: { id: '', name: '' }, google: { id: '', name: '' } },
    providerUriSetting: product.defaultChatAgent?.providerUriSetting ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    completionsAdvancedSetting: product.defaultChatAgent?.completionsAdvancedSetting ?? '',
    completionsRefreshTokenCommand: product.defaultChatAgent?.completionsRefreshTokenCommand ?? '',
    chatRefreshTokenCommand: product.defaultChatAgent?.chatRefreshTokenCommand ?? '',
    termsStatementUrl: product.defaultChatAgent?.termsStatementUrl ?? '',
    privacyStatementUrl: product.defaultChatAgent?.privacyStatementUrl ?? ''
};
var ChatSetupAnonymous;
(function (ChatSetupAnonymous) {
    ChatSetupAnonymous[ChatSetupAnonymous["Disabled"] = 0] = "Disabled";
    ChatSetupAnonymous[ChatSetupAnonymous["EnabledWithDialog"] = 1] = "EnabledWithDialog";
    ChatSetupAnonymous[ChatSetupAnonymous["EnabledWithoutDialog"] = 2] = "EnabledWithoutDialog";
})(ChatSetupAnonymous || (ChatSetupAnonymous = {}));
//#region Contribution
const ToolsAgentContextKey = ContextKeyExpr.and(ContextKeyExpr.equals(`config.${ChatConfiguration.AgentEnabled}`, true), ContextKeyExpr.not(`previewFeaturesDisabled`) // Set by extension
);
let SetupAgent = class SetupAgent extends Disposable {
    static { SetupAgent_1 = this; }
    static registerDefaultAgents(instantiationService, location, mode, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const chatAgentService = accessor.get(IChatAgentService);
            let id;
            let description = ChatMode.Ask.description.get();
            switch (location) {
                case ChatAgentLocation.Chat:
                    if (mode === ChatModeKind.Ask) {
                        id = 'setup.chat';
                    }
                    else if (mode === ChatModeKind.Edit) {
                        id = 'setup.edits';
                        description = ChatMode.Edit.description.get();
                    }
                    else {
                        id = 'setup.agent';
                        description = ChatMode.Agent.description.get();
                    }
                    break;
                case ChatAgentLocation.Terminal:
                    id = 'setup.terminal';
                    break;
                case ChatAgentLocation.EditorInline:
                    id = 'setup.editor';
                    break;
                case ChatAgentLocation.Notebook:
                    id = 'setup.notebook';
                    break;
            }
            return SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, id, `${defaultChat.provider.default.name} Copilot` /* Do NOT change, this hides the username altogether in Chat */, true, description, location, mode, context, controller);
        });
    }
    static registerBuiltInAgents(instantiationService, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const chatAgentService = accessor.get(IChatAgentService);
            const disposables = new DisposableStore();
            // Register VSCode agent
            const { disposable: vscodeDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.vscode', 'vscode', false, localize2(6045, "Ask questions about VS Code").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(vscodeDisposable);
            // Register workspace agent
            const { disposable: workspaceDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.workspace', 'workspace', false, localize2(6046, "Ask about your workspace").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(workspaceDisposable);
            // Register terminal agent
            const { disposable: terminalDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.terminal.agent', 'terminal', false, localize2(6047, "Ask how to do something in the terminal").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(terminalDisposable);
            // Register tools
            disposables.add(SetupTool.registerTool(instantiationService, {
                id: 'setup_tools_createNewWorkspace',
                source: ToolDataSource.Internal,
                icon: Codicon.newFolder,
                displayName: localize(5996, null),
                modelDescription: 'Scaffold a new workspace in VS Code',
                userDescription: localize(5997, null),
                canBeReferencedInPrompt: true,
                toolReferenceName: 'new',
                when: ContextKeyExpr.true(),
            }));
            return disposables;
        });
    }
    static doRegisterAgent(instantiationService, chatAgentService, id, name, isDefault, description, location, mode, context, controller) {
        const disposables = new DisposableStore();
        disposables.add(chatAgentService.registerAgent(id, {
            id,
            name,
            isDefault,
            isCore: true,
            modes: mode ? [mode] : [ChatModeKind.Ask],
            when: mode === ChatModeKind.Agent ? ToolsAgentContextKey?.serialize() : undefined,
            slashCommands: [],
            disambiguation: [],
            locations: [location],
            metadata: { helpTextPrefix: SetupAgent_1.SETUP_NEEDED_MESSAGE },
            description,
            extensionId: nullExtensionDescription.identifier,
            extensionVersion: undefined,
            extensionDisplayName: nullExtensionDescription.name,
            extensionPublisherId: nullExtensionDescription.publisher
        }));
        const agent = disposables.add(instantiationService.createInstance(SetupAgent_1, context, controller, location));
        disposables.add(chatAgentService.registerAgentImplementation(id, agent));
        if (mode === ChatModeKind.Agent) {
            chatAgentService.updateAgent(id, { themeIcon: Codicon.tools });
        }
        return { agent, disposable: disposables };
    }
    static { this.SETUP_NEEDED_MESSAGE = new MarkdownString(localize(5998, null)); }
    static { this.TRUST_NEEDED_MESSAGE = new MarkdownString(localize(5999, null)); }
    constructor(context, controller, location, instantiationService, logService, configurationService, telemetryService, environmentService, workspaceTrustManagementService, chatEntitlementService) {
        super();
        this.context = context;
        this.controller = controller;
        this.location = location;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.telemetryService = telemetryService;
        this.environmentService = environmentService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.chatEntitlementService = chatEntitlementService;
        this._onUnresolvableError = this._register(new Emitter());
        this.onUnresolvableError = this._onUnresolvableError.event;
        this.pendingForwardedRequests = new ResourceMap();
    }
    async invoke(request, progress) {
        return this.instantiationService.invokeFunction(async (accessor /* using accessor for lazy loading */) => {
            const chatService = accessor.get(IChatService);
            const languageModelsService = accessor.get(ILanguageModelsService);
            const chatWidgetService = accessor.get(IChatWidgetService);
            const chatAgentService = accessor.get(IChatAgentService);
            const languageModelToolsService = accessor.get(ILanguageModelToolsService);
            return this.doInvoke(request, part => progress([part]), chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
        });
    }
    async doInvoke(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        if (!this.context.state.installed || // Extension not installed: run setup to install
            this.context.state.disabled || // Extension disabled: run setup to enable
            this.context.state.untrusted || // Workspace untrusted: run setup to ask for trust
            this.context.state.entitlement === ChatEntitlement.Available || // Entitlement available: run setup to sign up
            (this.context.state.entitlement === ChatEntitlement.Unknown && // Entitlement unknown: run setup to sign in / sign up
                !this.chatEntitlementService.anonymous // unless anonymous access is enabled
            )) {
            return this.doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
        }
        return this.doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService);
    }
    async doInvokeWithoutSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        const requestModel = chatWidgetService.getWidgetBySessionResource(request.sessionResource)?.viewModel?.model.getRequests().at(-1);
        if (!requestModel) {
            this.logService.error('[chat setup] Request model not found, cannot redispatch request.');
            return {}; // this should not happen
        }
        progress({
            kind: 'progressMessage',
            content: new MarkdownString(localize(6000, null)),
        });
        await this.forwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        return {};
    }
    async forwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        try {
            await this.doForwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        }
        catch (error) {
            progress({
                kind: 'warning',
                content: new MarkdownString(localize(6001, null))
            });
        }
    }
    async doForwardRequestToChat(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        if (this.pendingForwardedRequests.has(requestModel.session.sessionResource)) {
            throw new Error('Request already in progress');
        }
        const forwardRequest = this.doForwardRequestToChatWhenReady(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
        this.pendingForwardedRequests.set(requestModel.session.sessionResource, forwardRequest);
        try {
            await forwardRequest;
        }
        finally {
            this.pendingForwardedRequests.delete(requestModel.session.sessionResource);
        }
    }
    async doForwardRequestToChatWhenReady(requestModel, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService) {
        const widget = chatWidgetService.getWidgetBySessionResource(requestModel.session.sessionResource);
        const modeInfo = widget?.input.currentModeInfo;
        // We need a signal to know when we can resend the request to
        // Chat. Waiting for the registration of the agent is not
        // enough, we also need a language/tools model to be available.
        let agentReady = false;
        let languageModelReady = false;
        let toolsModelReady = false;
        const whenAgentReady = this.whenAgentReady(chatAgentService, modeInfo?.kind)?.then(() => agentReady = true);
        const whenLanguageModelReady = this.whenLanguageModelReady(languageModelsService, requestModel.modelId)?.then(() => languageModelReady = true);
        const whenToolsModelReady = this.whenToolsModelReady(languageModelToolsService, requestModel)?.then(() => toolsModelReady = true);
        if (whenLanguageModelReady instanceof Promise || whenAgentReady instanceof Promise || whenToolsModelReady instanceof Promise) {
            const timeoutHandle = setTimeout(() => {
                progress({
                    kind: 'progressMessage',
                    content: new MarkdownString(localize(6002, null)),
                });
            }, 10000);
            try {
                const ready = await Promise.race([
                    timeout(this.environmentService.remoteAuthority ? 60000 /* increase for remote scenarios */ : 20000).then(() => 'timedout'),
                    this.whenDefaultAgentActivated(chatService),
                    Promise.allSettled([whenLanguageModelReady, whenAgentReady, whenToolsModelReady])
                ]);
                if (ready === 'timedout') {
                    let warningMessage;
                    if (this.chatEntitlementService.anonymous) {
                        warningMessage = localize(6003, null, defaultChat.chatExtensionId);
                    }
                    else {
                        warningMessage = localize(6004, null, defaultChat.provider.default.name, defaultChat.chatExtensionId);
                    }
                    this.logService.warn(warningMessage, {
                        agentReady: whenAgentReady ? agentReady : undefined,
                        languageModelReady: whenLanguageModelReady ? languageModelReady : undefined,
                        toolsModelReady: whenToolsModelReady ? toolsModelReady : undefined
                    });
                    progress({
                        kind: 'warning',
                        content: new MarkdownString(warningMessage)
                    });
                    // This means Chat is unhealthy and we cannot retry the
                    // request. Signal this to the outside via an event.
                    this._onUnresolvableError.fire();
                    return;
                }
            }
            finally {
                clearTimeout(timeoutHandle);
            }
        }
        await chatService.resendRequest(requestModel, {
            ...widget?.getModeRequestOptions(),
            modeInfo,
            userSelectedModelId: widget?.input.currentLanguageModel
        });
    }
    whenLanguageModelReady(languageModelsService, modelId) {
        const hasModelForRequest = () => {
            if (modelId) {
                return !!languageModelsService.lookupLanguageModel(modelId);
            }
            for (const id of languageModelsService.getLanguageModelIds()) {
                const model = languageModelsService.lookupLanguageModel(id);
                if (model?.isDefault) {
                    return true;
                }
            }
            return false;
        };
        if (hasModelForRequest()) {
            return;
        }
        return Event.toPromise(Event.filter(languageModelsService.onDidChangeLanguageModels, () => hasModelForRequest()));
    }
    whenToolsModelReady(languageModelToolsService, requestModel) {
        const needsToolsModel = requestModel.message.parts.some(part => part instanceof ChatRequestToolPart);
        if (!needsToolsModel) {
            return; // No tools in this request, no need to check
        }
        // check that tools other than setup. and internal tools are registered.
        for (const tool of languageModelToolsService.getTools()) {
            if (tool.id.startsWith('copilot_')) {
                return; // we have tools!
            }
        }
        return Event.toPromise(Event.filter(languageModelToolsService.onDidChangeTools, () => {
            for (const tool of languageModelToolsService.getTools()) {
                if (tool.id.startsWith('copilot_')) {
                    return true; // we have tools!
                }
            }
            return false; // no external tools found
        }));
    }
    whenAgentReady(chatAgentService, mode) {
        const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
        if (defaultAgent && !defaultAgent.isCore) {
            return; // we have a default agent from an extension!
        }
        return Event.toPromise(Event.filter(chatAgentService.onDidChangeAgents, () => {
            const defaultAgent = chatAgentService.getDefaultAgent(this.location, mode);
            return Boolean(defaultAgent && !defaultAgent.isCore);
        }));
    }
    async whenDefaultAgentActivated(chatService) {
        try {
            await chatService.activateDefaultAgent(this.location);
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async doInvokeWithSetup(request, progress, chatService, languageModelsService, chatWidgetService, chatAgentService, languageModelToolsService) {
        this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'chat' });
        const widget = chatWidgetService.getWidgetBySessionResource(request.sessionResource);
        const requestModel = widget?.viewModel?.model.getRequests().at(-1);
        const setupListener = Event.runAndSubscribe(this.controller.value.onDidChange, (() => {
            switch (this.controller.value.step) {
                case ChatSetupStep.SigningIn:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize(6005, null, ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name)),
                    });
                    break;
                case ChatSetupStep.Installing:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize(6006, null)),
                    });
                    break;
            }
        }));
        let result = undefined;
        try {
            result = await ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run({
                disableChatViewReveal: true, // we are already in a chat context
                forceAnonymous: this.chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithoutDialog : undefined // only enable anonymous selectively
            });
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
        }
        finally {
            setupListener.dispose();
        }
        // User has agreed to run the setup
        if (typeof result?.success === 'boolean') {
            if (result.success) {
                if (result.dialogSkipped) {
                    await widget?.clear(); // make room for the Chat welcome experience
                }
                else if (requestModel) {
                    let newRequest = this.replaceAgentInRequestModel(requestModel, chatAgentService); // Replace agent part with the actual Chat agent...
                    newRequest = this.replaceToolInRequestModel(newRequest); // ...then replace any tool parts with the actual Chat tools
                    await this.forwardRequestToChat(newRequest, progress, chatService, languageModelsService, chatAgentService, chatWidgetService, languageModelToolsService);
                }
            }
            else {
                progress({
                    kind: 'warning',
                    content: new MarkdownString(localize(6007, null))
                });
            }
        }
        // User has cancelled the setup
        else {
            progress({
                kind: 'markdownContent',
                content: this.workspaceTrustManagementService.isWorkspaceTrusted() ? SetupAgent_1.SETUP_NEEDED_MESSAGE : SetupAgent_1.TRUST_NEEDED_MESSAGE
            });
        }
        return {};
    }
    replaceAgentInRequestModel(requestModel, chatAgentService) {
        const agentPart = requestModel.message.parts.find((r) => r instanceof ChatRequestAgentPart);
        if (!agentPart) {
            return requestModel;
        }
        const agentId = agentPart.agent.id.replace(/setup\./, `${defaultChat.extensionId}.`.toLowerCase());
        const githubAgent = chatAgentService.getAgent(agentId);
        if (!githubAgent) {
            return requestModel;
        }
        const newAgentPart = new ChatRequestAgentPart(agentPart.range, agentPart.editorRange, githubAgent);
        return new ChatRequestModel({
            session: requestModel.session,
            message: {
                parts: requestModel.message.parts.map(part => {
                    if (part instanceof ChatRequestAgentPart) {
                        return newAgentPart;
                    }
                    return part;
                }),
                text: requestModel.message.text
            },
            variableData: requestModel.variableData,
            timestamp: Date.now(),
            attempt: requestModel.attempt,
            modeInfo: requestModel.modeInfo,
            confirmation: requestModel.confirmation,
            locationData: requestModel.locationData,
            attachedContext: requestModel.attachedContext,
            isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
        });
    }
    replaceToolInRequestModel(requestModel) {
        const toolPart = requestModel.message.parts.find((r) => r instanceof ChatRequestToolPart);
        if (!toolPart) {
            return requestModel;
        }
        const toolId = toolPart.toolId.replace(/setup.tools\./, `copilot_`.toLowerCase());
        const newToolPart = new ChatRequestToolPart(toolPart.range, toolPart.editorRange, toolPart.toolName, toolId, toolPart.displayName, toolPart.icon);
        const chatRequestToolEntry = {
            id: toolId,
            name: 'new',
            range: toolPart.range,
            kind: 'tool',
            value: undefined
        };
        const variableData = {
            variables: [chatRequestToolEntry]
        };
        return new ChatRequestModel({
            session: requestModel.session,
            message: {
                parts: requestModel.message.parts.map(part => {
                    if (part instanceof ChatRequestToolPart) {
                        return newToolPart;
                    }
                    return part;
                }),
                text: requestModel.message.text
            },
            variableData: variableData,
            timestamp: Date.now(),
            attempt: requestModel.attempt,
            modeInfo: requestModel.modeInfo,
            confirmation: requestModel.confirmation,
            locationData: requestModel.locationData,
            attachedContext: [chatRequestToolEntry],
            isCompleteAddedRequest: requestModel.isCompleteAddedRequest,
        });
    }
};
SetupAgent = SetupAgent_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, ITelemetryService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IWorkspaceTrustManagementService),
    __param(9, IChatEntitlementService)
], SetupAgent);
class SetupTool {
    static registerTool(instantiationService, toolData) {
        return instantiationService.invokeFunction(accessor => {
            const toolService = accessor.get(ILanguageModelToolsService);
            const tool = instantiationService.createInstance(SetupTool);
            return toolService.registerTool(toolData, tool);
        });
    }
    async invoke(invocation, countTokens, progress, token) {
        const result = {
            content: [
                {
                    kind: 'text',
                    value: ''
                }
            ]
        };
        return result;
    }
    async prepareToolInvocation(parameters, token) {
        return undefined;
    }
}
let AINewSymbolNamesProvider = AINewSymbolNamesProvider_1 = class AINewSymbolNamesProvider {
    static registerProvider(instantiationService, context, controller) {
        return instantiationService.invokeFunction(accessor => {
            const languageFeaturesService = accessor.get(ILanguageFeaturesService);
            const provider = instantiationService.createInstance(AINewSymbolNamesProvider_1, context, controller);
            return languageFeaturesService.newSymbolNamesProvider.register('*', provider);
        });
    }
    constructor(context, controller, instantiationService, chatEntitlementService) {
        this.context = context;
        this.controller = controller;
        this.instantiationService = instantiationService;
        this.chatEntitlementService = chatEntitlementService;
    }
    async provideNewSymbolNames(model, range, triggerKind, token) {
        await this.instantiationService.invokeFunction(accessor => {
            return ChatSetup.getInstance(this.instantiationService, this.context, this.controller).run({
                forceAnonymous: this.chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithDialog : undefined
            });
        });
        return [];
    }
};
AINewSymbolNamesProvider = AINewSymbolNamesProvider_1 = __decorate([
    __param(2, IInstantiationService),
    __param(3, IChatEntitlementService)
], AINewSymbolNamesProvider);
let ChatCodeActionsProvider = ChatCodeActionsProvider_1 = class ChatCodeActionsProvider {
    static registerProvider(instantiationService) {
        return instantiationService.invokeFunction(accessor => {
            const languageFeaturesService = accessor.get(ILanguageFeaturesService);
            const provider = instantiationService.createInstance(ChatCodeActionsProvider_1);
            return languageFeaturesService.codeActionProvider.register('*', provider);
        });
    }
    constructor(markerService) {
        this.markerService = markerService;
    }
    async provideCodeActions(model, range) {
        const actions = [];
        // "Generate" if the line is whitespace only
        // "Modify" if there is a selection
        let generateOrModifyTitle;
        let generateOrModifyCommand;
        if (range.isEmpty()) {
            const textAtLine = model.getLineContent(range.startLineNumber);
            if (/^\s*$/.test(textAtLine)) {
                generateOrModifyTitle = localize(6008, null);
                generateOrModifyCommand = AICodeActionsHelper.generate(range);
            }
        }
        else {
            const textInSelection = model.getValueInRange(range);
            if (!/^\s*$/.test(textInSelection)) {
                generateOrModifyTitle = localize(6009, null);
                generateOrModifyCommand = AICodeActionsHelper.modify(range);
            }
        }
        if (generateOrModifyTitle && generateOrModifyCommand) {
            actions.push({
                kind: CodeActionKind.RefactorRewrite.append('copilot').value,
                isAI: true,
                title: generateOrModifyTitle,
                command: generateOrModifyCommand,
            });
        }
        const markers = AICodeActionsHelper.warningOrErrorMarkersAtRange(this.markerService, model.uri, range);
        if (markers.length > 0) {
            // "Fix" if there are diagnostics in the range
            actions.push({
                kind: CodeActionKind.QuickFix.append('copilot').value,
                isAI: true,
                diagnostics: markers,
                title: localize(6010, null),
                command: AICodeActionsHelper.fixMarkers(markers, range)
            });
            // "Explain" if there are diagnostics in the range
            actions.push({
                kind: CodeActionKind.QuickFix.append('explain').append('copilot').value,
                isAI: true,
                diagnostics: markers,
                title: localize(6011, null),
                command: AICodeActionsHelper.explainMarkers(markers)
            });
        }
        return {
            actions,
            dispose() { }
        };
    }
};
ChatCodeActionsProvider = ChatCodeActionsProvider_1 = __decorate([
    __param(0, IMarkerService)
], ChatCodeActionsProvider);
class AICodeActionsHelper {
    static warningOrErrorMarkersAtRange(markerService, resource, range) {
        return markerService
            .read({ resource, severities: MarkerSeverity.Error | MarkerSeverity.Warning })
            .filter(marker => range.startLineNumber <= marker.endLineNumber && range.endLineNumber >= marker.startLineNumber);
    }
    static modify(range) {
        return {
            id: INLINE_CHAT_START,
            title: localize(6012, null),
            arguments: [
                {
                    initialSelection: this.rangeToSelection(range),
                    initialRange: range,
                    position: range.getStartPosition()
                }
            ]
        };
    }
    static generate(range) {
        return {
            id: INLINE_CHAT_START,
            title: localize(6013, null),
            arguments: [
                {
                    initialSelection: this.rangeToSelection(range),
                    initialRange: range,
                    position: range.getStartPosition()
                }
            ]
        };
    }
    static rangeToSelection(range) {
        return new Selection(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
    }
    static explainMarkers(markers) {
        return {
            id: CHAT_OPEN_ACTION_ID,
            title: localize(6014, null),
            arguments: [
                {
                    query: `@workspace /explain ${markers.map(marker => marker.message).join(', ')}`
                }
            ]
        };
    }
    static fixMarkers(markers, range) {
        return {
            id: INLINE_CHAT_START,
            title: localize(6015, null),
            arguments: [
                {
                    message: `/fix ${markers.map(marker => marker.message).join(', ')}`,
                    autoSend: true,
                    initialSelection: this.rangeToSelection(range),
                    initialRange: range,
                    position: range.getStartPosition()
                }
            ]
        };
    }
}
var ChatSetupStrategy;
(function (ChatSetupStrategy) {
    ChatSetupStrategy[ChatSetupStrategy["Canceled"] = 0] = "Canceled";
    ChatSetupStrategy[ChatSetupStrategy["DefaultSetup"] = 1] = "DefaultSetup";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithoutEnterpriseProvider"] = 2] = "SetupWithoutEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithEnterpriseProvider"] = 3] = "SetupWithEnterpriseProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithGoogleProvider"] = 4] = "SetupWithGoogleProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithAppleProvider"] = 5] = "SetupWithAppleProvider";
    ChatSetupStrategy[ChatSetupStrategy["SetupWithGitHubProvider"] = 6] = "SetupWithGitHubProvider";
})(ChatSetupStrategy || (ChatSetupStrategy = {}));
let ChatSetup = class ChatSetup {
    static { ChatSetup_1 = this; }
    static { this.instance = undefined; }
    static getInstance(instantiationService, context, controller) {
        let instance = ChatSetup_1.instance;
        if (!instance) {
            instance = ChatSetup_1.instance = instantiationService.invokeFunction(accessor => {
                return new ChatSetup_1(context, controller, accessor.get(ITelemetryService), accessor.get(IWorkbenchLayoutService), accessor.get(IKeybindingService), accessor.get(IChatEntitlementService), accessor.get(ILogService), accessor.get(IConfigurationService), accessor.get(IChatWidgetService), accessor.get(IWorkspaceTrustRequestService), accessor.get(IMarkdownRendererService));
            });
        }
        return instance;
    }
    constructor(context, controller, telemetryService, layoutService, keybindingService, chatEntitlementService, logService, configurationService, widgetService, workspaceTrustRequestService, markdownRendererService) {
        this.context = context;
        this.controller = controller;
        this.telemetryService = telemetryService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.chatEntitlementService = chatEntitlementService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.widgetService = widgetService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.markdownRendererService = markdownRendererService;
        this.pendingRun = undefined;
        this.skipDialogOnce = false;
    }
    skipDialog() {
        this.skipDialogOnce = true;
    }
    async run(options) {
        if (this.pendingRun) {
            return this.pendingRun;
        }
        this.pendingRun = this.doRun(options);
        try {
            return await this.pendingRun;
        }
        finally {
            this.pendingRun = undefined;
        }
    }
    async doRun(options) {
        this.context.update({ later: false });
        const dialogSkipped = this.skipDialogOnce;
        this.skipDialogOnce = false;
        const trusted = await this.workspaceTrustRequestService.requestWorkspaceTrust({
            message: localize(6016, null)
        });
        if (!trusted) {
            this.context.update({ later: true });
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotTrusted', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
            return { dialogSkipped, success: undefined /* canceled */ };
        }
        let setupStrategy;
        if (!options?.forceSignInDialog && (dialogSkipped || isProUser(this.chatEntitlementService.entitlement) || this.chatEntitlementService.entitlement === ChatEntitlement.Free)) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // existing pro/free users setup without a dialog
        }
        else if (options?.forceAnonymous === ChatSetupAnonymous.EnabledWithoutDialog) {
            setupStrategy = ChatSetupStrategy.DefaultSetup; // anonymous setup without a dialog
        }
        else {
            setupStrategy = await this.showDialog(options);
        }
        if (setupStrategy === ChatSetupStrategy.DefaultSetup && ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id) {
            setupStrategy = ChatSetupStrategy.SetupWithEnterpriseProvider; // users with a configured provider go through provider setup
        }
        if (setupStrategy !== ChatSetupStrategy.Canceled && !options?.disableChatViewReveal) {
            // Show the chat view now to better indicate progress
            // while installing the extension or returning from sign in
            this.widgetService.revealWidget();
        }
        let success = undefined;
        try {
            switch (setupStrategy) {
                case ChatSetupStrategy.SetupWithEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: true, useSocialProvider: undefined, additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithoutEnterpriseProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: undefined, additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithAppleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'apple', additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithGoogleProvider:
                    success = await this.controller.value.setupWithProvider({ useEnterpriseProvider: false, useSocialProvider: 'google', additionalScopes: options?.additionalScopes, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.SetupWithGitHubProvider:
                    // Reserved for future use when Puku API supports GitHub OAuth
                    this.logService.info('[chat setup] GitHub sign-in not yet supported');
                    success = false;
                    break;
                case ChatSetupStrategy.DefaultSetup:
                    success = await this.controller.value.setup({ ...options, forceAnonymous: options?.forceAnonymous });
                    break;
                case ChatSetupStrategy.Canceled:
                    this.context.update({ later: true });
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedMaybeLater', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
                    break;
            }
        }
        catch (error) {
            this.logService.error(`[chat setup] Error during setup: ${toErrorMessage(error)}`);
            success = false;
        }
        return { success, dialogSkipped };
    }
    async showDialog(options) {
        const disposables = new DisposableStore();
        const buttons = this.getButtons(options);
        const dialog = disposables.add(new Dialog(this.layoutService.activeContainer, this.getDialogTitle(options), buttons.map(button => button[0]), createWorkbenchDialogOptions({
            type: 'none',
            extraClasses: ['chat-setup-dialog'],
            detail: ' ', // workaround allowing us to render the message in large
            icon: Codicon.sparkle,
            alignment: DialogContentsAlignment.Vertical,
            cancelId: buttons.length - 1,
            disableCloseButton: true,
            renderFooter: footer => footer.appendChild(this.createDialogFooter(disposables, options)),
            buttonOptions: buttons.map(button => button[2])
        }, this.keybindingService, this.layoutService)));
        const { button } = await dialog.show();
        disposables.dispose();
        return buttons[button]?.[1] ?? ChatSetupStrategy.Canceled;
    }
    getButtons(options) {
        const styleButton = (...classes) => ({ styleButton: (button) => button.element.classList.add(...classes) });
        let buttons;
        if (!options?.forceAnonymous && (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog)) {
            // Puku Editor: Show Google sign-in button only (GitHub will be added when Puku API supports it)
            const googleProviderButton = [localize(6017, null), ChatSetupStrategy.SetupWithGoogleProvider, styleButton('continue-button', 'google')];
            buttons = [googleProviderButton];
        }
        else {
            buttons = [[localize(6018, null), ChatSetupStrategy.DefaultSetup, undefined]];
        }
        buttons.push([localize(6019, null), ChatSetupStrategy.Canceled, styleButton('link-button', 'skip-button')]);
        return buttons;
    }
    getDialogTitle(options) {
        if (this.chatEntitlementService.anonymous) {
            if (options?.forceAnonymous) {
                return localize(6020, null);
            }
            else {
                return localize(6021, null);
            }
        }
        if (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog) {
            return localize(6022, null);
        }
        return localize(6023, null);
    }
    createDialogFooter(disposables, options) {
        const element = $('.chat-setup-dialog-footer');
        let footer;
        if (options?.forceAnonymous || this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */) {
            footer = localize(6024, null, defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        }
        else {
            footer = localize(6025, null, defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl, defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
        }
        element.appendChild($('p', undefined, disposables.add(this.markdownRendererService.render(new MarkdownString(footer, { isTrusted: true }))).element));
        return element;
    }
};
ChatSetup = ChatSetup_1 = __decorate([
    __param(2, ITelemetryService),
    __param(3, ILayoutService),
    __param(4, IKeybindingService),
    __param(5, IChatEntitlementService),
    __param(6, ILogService),
    __param(7, IConfigurationService),
    __param(8, IChatWidgetService),
    __param(9, IWorkspaceTrustRequestService),
    __param(10, IMarkdownRendererService)
], ChatSetup);
let ChatSetupContribution = class ChatSetupContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chatSetup'; }
    constructor(productService, instantiationService, commandService, telemetryService, chatEntitlementService, chatModeService, logService, contextKeyService, extensionEnablementService, extensionsWorkbenchService, extensionService, environmentService, configurationService) {
        super();
        this.productService = productService;
        this.instantiationService = instantiationService;
        this.commandService = commandService;
        this.telemetryService = telemetryService;
        this.chatModeService = chatModeService;
        this.logService = logService;
        this.contextKeyService = contextKeyService;
        this.extensionEnablementService = extensionEnablementService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionService = extensionService;
        this.environmentService = environmentService;
        this.configurationService = configurationService;
        const context = chatEntitlementService.context?.value;
        const requests = chatEntitlementService.requests?.value;
        if (!context || !requests) {
            return; // disabled
        }
        const controller = new Lazy(() => this._register(this.instantiationService.createInstance(ChatSetupController, context, requests)));
        this.registerSetupAgents(context, controller);
        this.registerActions(context, requests, controller);
        this.registerUrlLinkHandler();
        this.checkExtensionInstallation(context);
    }
    registerSetupAgents(context, controller) {
        if (this.configurationService.getValue('chat.experimental.disableCoreAgents')) {
            return; // TODO@bpasero eventually remove this when we figured out extension activation issues
        }
        const defaultAgentDisposables = markAsSingleton(new MutableDisposable()); // prevents flicker on window reload
        const vscodeAgentDisposables = markAsSingleton(new MutableDisposable());
        const renameProviderDisposables = markAsSingleton(new MutableDisposable());
        const codeActionsProviderDisposables = markAsSingleton(new MutableDisposable());
        const updateRegistration = () => {
            // Agent + Tools
            {
                if (!context.state.hidden && !context.state.disabled) {
                    // Default Agents (always, even if installed to allow for speedy requests right on startup)
                    if (!defaultAgentDisposables.value) {
                        const disposables = defaultAgentDisposables.value = new DisposableStore();
                        // Panel Agents
                        const panelAgentDisposables = disposables.add(new DisposableStore());
                        for (const mode of [ChatModeKind.Ask, ChatModeKind.Edit, ChatModeKind.Agent]) {
                            const { agent, disposable } = SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Chat, mode, context, controller);
                            panelAgentDisposables.add(disposable);
                            panelAgentDisposables.add(agent.onUnresolvableError(() => {
                                const panelAgentHasGuidance = chatViewsWelcomeRegistry.get().some(descriptor => this.contextKeyService.contextMatchesRules(descriptor.when));
                                if (panelAgentHasGuidance) {
                                    // An unresolvable error from our agent registrations means that
                                    // Chat is unhealthy for some reason. We clear our panel
                                    // registration to give Chat a chance to show a custom message
                                    // to the user from the views and stop pretending as if there was
                                    // a functional agent.
                                    this.logService.error('[chat setup] Unresolvable error from Chat agent registration, clearing registration.');
                                    panelAgentDisposables.dispose();
                                }
                            }));
                        }
                        // Inline Agents
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Terminal, undefined, context, controller).disposable);
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.Notebook, undefined, context, controller).disposable);
                        disposables.add(SetupAgent.registerDefaultAgents(this.instantiationService, ChatAgentLocation.EditorInline, undefined, context, controller).disposable);
                    }
                    // Built-In Agent + Tool (unless installed, signed-in and enabled)
                    if ((!context.state.installed || context.state.entitlement === ChatEntitlement.Unknown || context.state.entitlement === ChatEntitlement.Unresolved) && !vscodeAgentDisposables.value) {
                        const disposables = vscodeAgentDisposables.value = new DisposableStore();
                        disposables.add(SetupAgent.registerBuiltInAgents(this.instantiationService, context, controller));
                    }
                }
                else {
                    defaultAgentDisposables.clear();
                    vscodeAgentDisposables.clear();
                }
                if (context.state.installed && !context.state.disabled) {
                    vscodeAgentDisposables.clear(); // we need to do this to prevent showing duplicate agent/tool entries in the list
                }
            }
            // Rename Provider
            {
                if (!context.state.installed && !context.state.hidden && !context.state.disabled) {
                    if (!renameProviderDisposables.value) {
                        renameProviderDisposables.value = AINewSymbolNamesProvider.registerProvider(this.instantiationService, context, controller);
                    }
                }
                else {
                    renameProviderDisposables.clear();
                }
            }
            // Code Actions Provider
            {
                if (!context.state.installed && !context.state.hidden && !context.state.disabled) {
                    if (!codeActionsProviderDisposables.value) {
                        codeActionsProviderDisposables.value = ChatCodeActionsProvider.registerProvider(this.instantiationService);
                    }
                }
                else {
                    codeActionsProviderDisposables.clear();
                }
            }
        };
        this._register(Event.runAndSubscribe(context.onDidChange, () => updateRegistration()));
    }
    registerActions(context, requests, controller) {
        //#region Global Chat Setup Actions
        class ChatSetupTriggerAction extends Action2 {
            static { this.CHAT_SETUP_ACTION_LABEL = localize2(6048, "Use AI Features with Copilot for free..."); }
            constructor() {
                super({
                    id: CHAT_SETUP_ACTION_ID,
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL,
                    category: CHAT_CATEGORY,
                    f1: true,
                    precondition: ContextKeyExpr.or(ChatContextKeys.Setup.hidden, ChatContextKeys.Setup.disabled, ChatContextKeys.Setup.untrusted, ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.canSignUp)
                });
            }
            async run(accessor, mode, options) {
                const widgetService = accessor.get(IChatWidgetService);
                const instantiationService = accessor.get(IInstantiationService);
                const dialogService = accessor.get(IDialogService);
                const commandService = accessor.get(ICommandService);
                const lifecycleService = accessor.get(ILifecycleService);
                const configurationService = accessor.get(IConfigurationService);
                await context.update({ hidden: false });
                configurationService.updateValue(ChatTeardownContribution.CHAT_DISABLED_CONFIGURATION_KEY, false);
                if (mode) {
                    const chatWidget = await widgetService.revealWidget();
                    chatWidget?.input.setChatMode(mode);
                }
                const setup = ChatSetup.getInstance(instantiationService, context, controller);
                const { success } = await setup.run(options);
                if (success === false && !lifecycleService.willShutdown) {
                    const { confirmed } = await dialogService.confirm({
                        type: Severity.Error,
                        message: localize(6026, null),
                        primaryButton: localize(6027, null),
                    });
                    if (confirmed) {
                        return Boolean(await commandService.executeCommand(CHAT_SETUP_ACTION_ID, mode, options));
                    }
                }
                return Boolean(success);
            }
        }
        class ChatSetupTriggerSupportAnonymousAction extends Action2 {
            constructor() {
                super({
                    id: CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID,
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                const chatEntitlementService = accessor.get(IChatEntitlementService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, {
                    forceAnonymous: chatEntitlementService.anonymous ? ChatSetupAnonymous.EnabledWithDialog : undefined
                });
            }
        }
        class ChatSetupTriggerForceSignInDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupForceSignIn',
                    title: localize2(6049, "Sign in to use AI features")
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true });
            }
        }
        class ChatSetupTriggerAnonymousWithoutDialogAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupAnonymousWithoutDialog',
                    title: ChatSetupTriggerAction.CHAT_SETUP_ACTION_LABEL
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'api' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceAnonymous: ChatSetupAnonymous.EnabledWithoutDialog });
            }
        }
        class ChatSetupFromAccountsAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.triggerSetupFromAccounts',
                    title: localize2(6050, "Sign in to use AI features..."),
                    menu: {
                        id: MenuId.AccountsContext,
                        group: '2_copilot',
                        when: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.installed.negate(), ChatContextKeys.Entitlement.signedOut)
                    }
                });
            }
            async run(accessor) {
                const commandService = accessor.get(ICommandService);
                const telemetryService = accessor.get(ITelemetryService);
                telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'accounts' });
                return commandService.executeCommand(CHAT_SETUP_ACTION_ID);
            }
        }
        const windowFocusListener = this._register(new MutableDisposable());
        class UpgradePlanAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.upgradePlan',
                    title: localize2(6051, "Upgrade to Puku AI Pro"),
                    category: localize2(6052, 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ContextKeyExpr.or(ChatContextKeys.Entitlement.canSignUp, ChatContextKeys.Entitlement.planFree)),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ChatContextKeys.Entitlement.planFree, ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                const hostService = accessor.get(IHostService);
                const commandService = accessor.get(ICommandService);
                openerService.open(URI.parse(defaultChat.upgradePlanUrl));
                const entitlement = context.state.entitlement;
                if (!isProUser(entitlement)) {
                    // If the user is not yet Pro, we listen to window focus to refresh the token
                    // when the user has come back to the window assuming the user signed up.
                    windowFocusListener.value = hostService.onDidChangeFocus(focus => this.onWindowFocus(focus, commandService));
                }
            }
            async onWindowFocus(focus, commandService) {
                if (focus) {
                    windowFocusListener.clear();
                    const entitlements = await requests.forceResolveEntitlement(undefined);
                    if (entitlements?.entitlement && isProUser(entitlements?.entitlement)) {
                        refreshTokens(commandService);
                    }
                }
            }
        }
        class EnableOveragesAction extends Action2 {
            constructor() {
                super({
                    id: 'workbench.action.chat.manageOverages',
                    title: localize2(6053, "Manage Puku AI Overages"),
                    category: localize2(6054, 'Chat'),
                    f1: true,
                    precondition: ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ContextKeyExpr.or(ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus)),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'a_first',
                        order: 1,
                        when: ContextKeyExpr.and(ContextKeyExpr.or(ChatContextKeys.Entitlement.planPro, ChatContextKeys.Entitlement.planProPlus), ContextKeyExpr.or(ChatContextKeys.chatQuotaExceeded, ChatContextKeys.completionsQuotaExceeded))
                    }
                });
            }
            async run(accessor) {
                const openerService = accessor.get(IOpenerService);
                openerService.open(URI.parse(defaultChat.manageOveragesUrl));
            }
        }
        registerAction2(ChatSetupTriggerAction);
        registerAction2(ChatSetupTriggerForceSignInDialogAction);
        registerAction2(ChatSetupFromAccountsAction);
        registerAction2(ChatSetupTriggerAnonymousWithoutDialogAction);
        registerAction2(ChatSetupTriggerSupportAnonymousAction);
        registerAction2(UpgradePlanAction);
        registerAction2(EnableOveragesAction);
        // Puku Editor: Register puku.signIn command to trigger sign-in dialog
        CommandsRegistry.registerCommand('puku.signIn', async (accessor) => {
            const commandService = accessor.get(ICommandService);
            const telemetryService = accessor.get(ITelemetryService);
            telemetryService.publicLog2('workbenchActionExecuted', { id: 'puku.signIn', from: 'status-bar' });
            return commandService.executeCommand(CHAT_SETUP_ACTION_ID, undefined, { forceSignInDialog: true });
        });
        // Puku Editor: Internal commands to bridge VS Code layer auth with extension layer
        CommandsRegistry.registerCommand('_puku.getSessionToken', async (accessor) => {
            const pukuAuthService = accessor.get(IPukuAuthService);
            const token = pukuAuthService.getSessionToken();
            return token ? { token } : undefined;
        });
        CommandsRegistry.registerCommand('_puku.getUserInfo', async (accessor) => {
            const pukuAuthService = accessor.get(IPukuAuthService);
            return pukuAuthService.session?.user;
        });
        CommandsRegistry.registerCommand('_puku.isAuthenticated', async (accessor) => {
            const pukuAuthService = accessor.get(IPukuAuthService);
            return pukuAuthService.isAuthenticated();
        });
        CommandsRegistry.registerCommand('_puku.signIn', async (accessor) => {
            const pukuAuthService = accessor.get(IPukuAuthService);
            return pukuAuthService.signInWithGoogle();
        });
        //#endregion
        //#region Editor Context Menu
        // TODO@bpasero remove these when Chat extension is built-in
        {
            function registerGenerateCodeCommand(coreCommand, actualCommand) {
                CommandsRegistry.registerCommand(coreCommand, async (accessor) => {
                    const commandService = accessor.get(ICommandService);
                    const codeEditorService = accessor.get(ICodeEditorService);
                    const markerService = accessor.get(IMarkerService);
                    switch (coreCommand) {
                        case 'chat.internal.explain':
                        case 'chat.internal.fix': {
                            const textEditor = codeEditorService.getActiveCodeEditor();
                            const uri = textEditor?.getModel()?.uri;
                            const range = textEditor?.getSelection();
                            if (!uri || !range) {
                                return;
                            }
                            const markers = AICodeActionsHelper.warningOrErrorMarkersAtRange(markerService, uri, range);
                            const actualCommand = coreCommand === 'chat.internal.explain'
                                ? AICodeActionsHelper.explainMarkers(markers)
                                : AICodeActionsHelper.fixMarkers(markers, range);
                            await commandService.executeCommand(actualCommand.id, ...(actualCommand.arguments ?? []));
                            break;
                        }
                        case 'chat.internal.review':
                        case 'chat.internal.generateDocs':
                        case 'chat.internal.generateTests': {
                            const result = await commandService.executeCommand(CHAT_SETUP_SUPPORT_ANONYMOUS_ACTION_ID);
                            if (result) {
                                await commandService.executeCommand(actualCommand);
                            }
                        }
                    }
                });
            }
            registerGenerateCodeCommand('chat.internal.explain', 'github.copilot.chat.explain');
            registerGenerateCodeCommand('chat.internal.fix', 'github.copilot.chat.fix');
            registerGenerateCodeCommand('chat.internal.review', 'github.copilot.chat.review');
            registerGenerateCodeCommand('chat.internal.generateDocs', 'github.copilot.chat.generateDocs');
            registerGenerateCodeCommand('chat.internal.generateTests', 'github.copilot.chat.generateTests');
            const internalGenerateCodeContext = ContextKeyExpr.and(ChatContextKeys.Setup.hidden.negate(), ChatContextKeys.Setup.disabled.negate(), ChatContextKeys.Setup.installed.negate());
            MenuRegistry.appendMenuItem(MenuId.EditorContext, {
                command: {
                    id: 'chat.internal.explain',
                    title: localize(6028, null),
                },
                group: '1_chat',
                order: 4,
                when: internalGenerateCodeContext
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.fix',
                    title: localize(6029, null),
                },
                group: '1_action',
                order: 1,
                when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.review',
                    title: localize(6030, null),
                },
                group: '1_action',
                order: 2,
                when: internalGenerateCodeContext
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.generateDocs',
                    title: localize(6031, null),
                },
                group: '2_generate',
                order: 1,
                when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.generateTests',
                    title: localize(6032, null),
                },
                group: '2_generate',
                order: 2,
                when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
            });
        }
    }
    registerUrlLinkHandler() {
        this._register(ExtensionUrlHandlerOverrideRegistry.registerHandler({
            canHandleURL: url => {
                return url.scheme === this.productService.urlProtocol && equalsIgnoreCase(url.authority, defaultChat.chatExtensionId);
            },
            handleURL: async (url) => {
                const params = new URLSearchParams(url.query);
                this.telemetryService.publicLog2('workbenchActionExecuted', { id: CHAT_SETUP_ACTION_ID, from: 'url', detail: params.get('referrer') ?? undefined });
                const agentParam = params.get('agent') ?? params.get('mode');
                if (agentParam) {
                    const agents = this.chatModeService.getModes();
                    const allAgents = [...agents.builtin, ...agents.custom];
                    // check if the given param is a valid mode ID
                    let foundAgent = allAgents.find(agent => agent.id === agentParam);
                    if (!foundAgent) {
                        // if not, check if the given param is a valid mode name, note the parameter as name is case insensitive
                        const nameLower = agentParam.toLowerCase();
                        foundAgent = allAgents.find(agent => agent.name.get().toLowerCase() === nameLower);
                    }
                    // execute the command to change the mode in panel, note that the command only supports mode IDs, not names
                    await this.commandService.executeCommand(CHAT_SETUP_ACTION_ID, foundAgent?.id);
                    return true;
                }
                return false;
            }
        }));
    }
    async checkExtensionInstallation(context) {
        // When developing extensions, await registration and then check
        if (this.environmentService.isExtensionDevelopment) {
            await this.extensionService.whenInstalledExtensionsRegistered();
            if (this.extensionService.extensions.find(ext => ExtensionIdentifier.equals(ext.identifier, defaultChat.chatExtensionId))) {
                context.update({ installed: true, disabled: false, untrusted: false });
                return;
            }
        }
        // Await extensions to be ready to be queried
        await this.extensionsWorkbenchService.queryLocal();
        // Listen to extensions change and process extensions once
        this._register(Event.runAndSubscribe(this.extensionsWorkbenchService.onChange, e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.chatExtensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
            const installed = !!defaultChatExtension?.local;
            let disabled;
            let untrusted = false;
            if (installed) {
                disabled = !this.extensionEnablementService.isEnabled(defaultChatExtension.local);
                if (disabled) {
                    const state = this.extensionEnablementService.getEnablementState(defaultChatExtension.local);
                    if (state === 0 /* EnablementState.DisabledByTrustRequirement */) {
                        disabled = false; // not disabled by user choice but
                        untrusted = true; // by missing workspace trust
                    }
                }
            }
            else {
                disabled = false;
            }
            context.update({ installed, disabled, untrusted });
        }));
    }
};
ChatSetupContribution = __decorate([
    __param(0, IProductService),
    __param(1, IInstantiationService),
    __param(2, ICommandService),
    __param(3, ITelemetryService),
    __param(4, IChatEntitlementService),
    __param(5, IChatModeService),
    __param(6, ILogService),
    __param(7, IContextKeyService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IExtensionsWorkbenchService),
    __param(10, IExtensionService),
    __param(11, IEnvironmentService),
    __param(12, IConfigurationService)
], ChatSetupContribution);
export { ChatSetupContribution };
let ChatTeardownContribution = class ChatTeardownContribution extends Disposable {
    static { ChatTeardownContribution_1 = this; }
    static { this.ID = 'workbench.contrib.chatTeardown'; }
    static { this.CHAT_DISABLED_CONFIGURATION_KEY = 'chat.disableAIFeatures'; }
    constructor(chatEntitlementService, configurationService, extensionsWorkbenchService, extensionEnablementService, viewDescriptorService, layoutService) {
        super();
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.extensionEnablementService = extensionEnablementService;
        this.viewDescriptorService = viewDescriptorService;
        this.layoutService = layoutService;
        const context = chatEntitlementService.context?.value;
        if (!context) {
            return; // disabled
        }
        this.registerListeners();
        this.registerActions();
        this.handleChatDisabled(false);
    }
    handleChatDisabled(fromEvent) {
        const chatDisabled = this.configurationService.inspect(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY);
        if (chatDisabled.value === true) {
            this.maybeEnableOrDisableExtension(typeof chatDisabled.workspaceValue === 'boolean' ? 11 /* EnablementState.DisabledWorkspace */ : 10 /* EnablementState.DisabledGlobally */);
            if (fromEvent) {
                this.maybeHideAuxiliaryBar();
            }
        }
        else if (chatDisabled.value === false && fromEvent /* do not enable extensions unless its an explicit settings change */) {
            this.maybeEnableOrDisableExtension(typeof chatDisabled.workspaceValue === 'boolean' ? 13 /* EnablementState.EnabledWorkspace */ : 12 /* EnablementState.EnabledGlobally */);
        }
    }
    async registerListeners() {
        // Configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (!e.affectsConfiguration(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY)) {
                return;
            }
            this.handleChatDisabled(true);
        }));
        // Extension installation
        await this.extensionsWorkbenchService.queryLocal();
        this._register(this.extensionsWorkbenchService.onChange(e => {
            if (e && !ExtensionIdentifier.equals(e.identifier.id, defaultChat.chatExtensionId)) {
                return; // unrelated event
            }
            const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
            if (defaultChatExtension?.local && this.extensionEnablementService.isEnabled(defaultChatExtension.local)) {
                this.configurationService.updateValue(ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY, false);
            }
        }));
    }
    async maybeEnableOrDisableExtension(state) {
        const defaultChatExtension = this.extensionsWorkbenchService.local.find(value => ExtensionIdentifier.equals(value.identifier.id, defaultChat.chatExtensionId));
        if (!defaultChatExtension) {
            return;
        }
        await this.extensionsWorkbenchService.setEnablement([defaultChatExtension], state);
        await this.extensionsWorkbenchService.updateRunningExtensions(state === 12 /* EnablementState.EnabledGlobally */ || state === 13 /* EnablementState.EnabledWorkspace */ ? localize(6033, null) : localize(6034, null));
    }
    maybeHideAuxiliaryBar() {
        const activeContainers = this.viewDescriptorService.getViewContainersByLocation(2 /* ViewContainerLocation.AuxiliaryBar */).filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);
        if ((activeContainers.length === 0) || // chat view is already gone but we know it was there before
            (activeContainers.length === 1 && activeContainers.at(0)?.id === CHAT_SIDEBAR_PANEL_ID) // chat view is the only view which is going to go away
        ) {
            this.layoutService.setPartHidden(true, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */); // hide if there are no views in the secondary sidebar
        }
    }
    registerActions() {
        class ChatSetupHideAction extends Action2 {
            static { this.ID = 'workbench.action.chat.hideSetup'; }
            static { this.TITLE = localize2(6055, "Learn How to Hide AI Features"); }
            constructor() {
                super({
                    id: ChatSetupHideAction.ID,
                    title: ChatSetupHideAction.TITLE,
                    f1: true,
                    category: CHAT_CATEGORY,
                    precondition: ChatContextKeys.Setup.hidden.negate(),
                    menu: {
                        id: MenuId.ChatTitleBarMenu,
                        group: 'z_hide',
                        order: 1,
                        when: ChatContextKeys.Setup.installed.negate()
                    }
                });
            }
            async run(accessor) {
                const preferencesService = accessor.get(IPreferencesService);
                preferencesService.openSettings({ jsonEditor: false, query: `@id:${ChatTeardownContribution_1.CHAT_DISABLED_CONFIGURATION_KEY}` });
            }
        }
        registerAction2(ChatSetupHideAction);
    }
};
ChatTeardownContribution = ChatTeardownContribution_1 = __decorate([
    __param(0, IChatEntitlementService),
    __param(1, IConfigurationService),
    __param(2, IExtensionsWorkbenchService),
    __param(3, IWorkbenchExtensionEnablementService),
    __param(4, IViewDescriptorService),
    __param(5, IWorkbenchLayoutService)
], ChatTeardownContribution);
export { ChatTeardownContribution };
var ChatSetupStep;
(function (ChatSetupStep) {
    ChatSetupStep[ChatSetupStep["Initial"] = 1] = "Initial";
    ChatSetupStep[ChatSetupStep["SigningIn"] = 2] = "SigningIn";
    ChatSetupStep[ChatSetupStep["Installing"] = 3] = "Installing";
})(ChatSetupStep || (ChatSetupStep = {}));
let ChatSetupController = class ChatSetupController extends Disposable {
    get step() { return this._step; }
    constructor(context, requests, telemetryService, authenticationService, _extensionsWorkbenchService, _productService, logService, progressService, activityService, commandService, dialogService, configurationService, lifecycleService, quickInputService) {
        super();
        this.context = context;
        this.requests = requests;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this._extensionsWorkbenchService = _extensionsWorkbenchService;
        this._productService = _productService;
        this.logService = logService;
        this.progressService = progressService;
        this.activityService = activityService;
        this.commandService = commandService;
        this.dialogService = dialogService;
        this.configurationService = configurationService;
        this.lifecycleService = lifecycleService;
        this.quickInputService = quickInputService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._step = ChatSetupStep.Initial;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.context.onDidChange(() => this._onDidChange.fire()));
    }
    setStep(step) {
        if (this._step === step) {
            return;
        }
        this._step = step;
        this._onDidChange.fire();
    }
    async setup(options = {}) {
        const watch = new StopWatch(false);
        const title = localize(6035, null);
        const badge = this.activityService.showViewContainerActivity(CHAT_SIDEBAR_PANEL_ID, {
            badge: new ProgressBadge(() => title),
        });
        try {
            return await this.progressService.withProgress({
                location: 10 /* ProgressLocation.Window */,
                command: CHAT_OPEN_ACTION_ID,
                title,
            }, () => this.doSetup(options, watch));
        }
        finally {
            badge.dispose();
        }
    }
    async doSetup(options, watch) {
        this.context.suspend(); // reduces flicker
        let success = false;
        try {
            const providerId = ChatEntitlementRequests.providerId(this.configurationService);
            let session;
            let entitlement;
            let signIn;
            if (options.forceSignIn) {
                signIn = true; // forced to sign in
            }
            else if (this.context.state.entitlement === ChatEntitlement.Unknown) {
                if (options.forceAnonymous) {
                    signIn = false; // forced to anonymous without sign in
                }
                else {
                    signIn = true; // sign in since we are signed out
                }
            }
            else {
                signIn = false; // already signed in
            }
            if (signIn) {
                this.setStep(ChatSetupStep.SigningIn);
                const result = await this.signIn(options);
                if (!result.session) {
                    this.doInstall(); // still install the extension in the background to remind the user to sign-in eventually
                    const provider = options.useSocialProvider ?? (options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id);
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNotSignedIn', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                    return undefined; // treat as cancelled because signing in already triggers an error dialog
                }
                session = result.session;
                entitlement = result.entitlement;
            }
            // Await Install
            this.setStep(ChatSetupStep.Installing);
            success = await this.install(session, entitlement ?? this.context.state.entitlement, providerId, watch, options);
        }
        finally {
            this.setStep(ChatSetupStep.Initial);
            this.context.resume();
        }
        return success;
    }
    async signIn(options) {
        let session;
        let entitlements;
        try {
            ({ session, entitlements } = await this.requests.signIn(options));
        }
        catch (e) {
            this.logService.error(`[chat setup] signIn: error ${e}`);
        }
        if (!session && !this.lifecycleService.willShutdown) {
            const { confirmed } = await this.dialogService.confirm({
                type: Severity.Error,
                message: localize(6036, null, ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name),
                detail: localize(6037, null),
                primaryButton: localize(6038, null)
            });
            if (confirmed) {
                return this.signIn(options);
            }
        }
        return { session, entitlement: entitlements?.entitlement };
    }
    async install(session, entitlement, providerId, watch, options) {
        const wasRunning = this.context.state.installed && !this.context.state.disabled;
        let signUpResult = undefined;
        let provider;
        if (options.forceAnonymous && entitlement === ChatEntitlement.Unknown) {
            provider = 'anonymous';
        }
        else {
            provider = options.useSocialProvider ?? (options.useEnterpriseProvider ? defaultChat.provider.enterprise.id : defaultChat.provider.default.id);
        }
        let sessions = session ? [session] : undefined;
        try {
            if (!options.forceAnonymous && // User is not asking for anonymous access
                entitlement !== ChatEntitlement.Free && // User is not signed up to Puku Free
                !isProUser(entitlement) && // User is not signed up for a Copilot subscription
                entitlement !== ChatEntitlement.Unavailable // User is eligible for Puku Free
            ) {
                if (!sessions) {
                    try {
                        // Consider all sessions for the provider to be suitable for signing up
                        const existingSessions = await this.authenticationService.getSessions(providerId);
                        sessions = existingSessions.length > 0 ? [...existingSessions] : undefined;
                    }
                    catch (error) {
                        // ignore - errors can throw if a provider is not registered
                    }
                    if (!sessions || sessions.length === 0) {
                        this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedNoSession', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
                        return false; // unexpected
                    }
                }
                signUpResult = await this.requests.signUpFree(sessions);
                if (typeof signUpResult !== 'boolean' /* error */) {
                    this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedSignUp', installDuration: watch.elapsed(), signUpErrorCode: signUpResult.errorCode, provider });
                }
            }
            await this.doInstallWithRetry();
        }
        catch (error) {
            this.logService.error(`[chat setup] install: error ${error}`);
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: isCancellationError(error) ? 'cancelled' : 'failedInstall', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
            return false;
        }
        if (typeof signUpResult === 'boolean' /* not an error case */ || typeof signUpResult === 'undefined' /* already signed up */) {
            this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: wasRunning && !signUpResult ? 'alreadyInstalled' : 'installed', installDuration: watch.elapsed(), signUpErrorCode: undefined, provider });
        }
        if (wasRunning) {
            // We always trigger refresh of tokens to help the user
            // get out of authentication issues that can happen when
            // for example the sign-up ran after the extension tried
            // to use the authentication information to mint a token
            refreshTokens(this.commandService);
        }
        return true;
    }
    async doInstallWithRetry() {
        let error;
        try {
            await this.doInstall();
        }
        catch (e) {
            this.logService.error(`[chat setup] install: error ${error}`);
            error = e;
        }
        if (error) {
            if (!this.lifecycleService.willShutdown) {
                const { confirmed } = await this.dialogService.confirm({
                    type: Severity.Error,
                    message: localize(6039, null),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize(6040, null)
                });
                if (confirmed) {
                    return this.doInstallWithRetry();
                }
            }
            throw error;
        }
    }
    async doInstall() {
        // Skip extension installation for Puku - extension is loaded via development mode
        // The Puku extension (Puku.puku-editor) is not available in marketplace
        this.logService.info('[chat setup] Skipping extension installation - Puku extension is loaded in development mode');
        // Keep references to prevent unused variable errors
        void this._extensionsWorkbenchService;
        void this._productService;
        void ChatViewId;
        return;
    }
    async setupWithProvider(options) {
        const registry = Registry.as(ConfigurationExtensions.Configuration);
        registry.registerConfiguration({
            'id': 'copilot.setup',
            'type': 'object',
            'properties': {
                [defaultChat.completionsAdvancedSetting]: {
                    'type': 'object',
                    'properties': {
                        'authProvider': {
                            'type': 'string'
                        }
                    }
                },
                [defaultChat.providerUriSetting]: {
                    'type': 'string'
                }
            }
        });
        if (options.useEnterpriseProvider) {
            const success = await this.handleEnterpriseInstance();
            if (!success) {
                this.telemetryService.publicLog2('commandCenter.chatInstall', { installResult: 'failedEnterpriseSetup', installDuration: 0, signUpErrorCode: undefined, provider: undefined });
                return success; // not properly configured, abort
            }
        }
        let existingAdvancedSetting = this.configurationService.inspect(defaultChat.completionsAdvancedSetting).user?.value;
        if (!isObject(existingAdvancedSetting)) {
            existingAdvancedSetting = {};
        }
        if (options.useEnterpriseProvider) {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, {
                ...existingAdvancedSetting,
                'authProvider': defaultChat.provider.enterprise.id
            }, 2 /* ConfigurationTarget.USER */);
        }
        else {
            await this.configurationService.updateValue(`${defaultChat.completionsAdvancedSetting}`, Object.keys(existingAdvancedSetting).length > 0 ? {
                ...existingAdvancedSetting,
                'authProvider': undefined
            } : undefined, 2 /* ConfigurationTarget.USER */);
        }
        return this.setup({ ...options, forceSignIn: true });
    }
    async handleEnterpriseInstance() {
        const domainRegEx = /^[a-zA-Z\-_]+$/;
        const fullUriRegEx = /^(https:\/\/)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.ghe\.com\/?$/;
        const uri = this.configurationService.getValue(defaultChat.providerUriSetting);
        if (typeof uri === 'string' && fullUriRegEx.test(uri)) {
            return true; // already setup with a valid URI
        }
        let isSingleWord = false;
        const result = await this.quickInputService.input({
            prompt: localize(6041, null, defaultChat.provider.enterprise.name),
            placeHolder: localize(6042, null),
            ignoreFocusLost: true,
            value: uri,
            validateInput: async (value) => {
                isSingleWord = false;
                if (!value) {
                    return undefined;
                }
                if (domainRegEx.test(value)) {
                    isSingleWord = true;
                    return {
                        content: localize(6043, null, `https://${value}.ghe.com`),
                        severity: Severity.Info
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize(6044, null, defaultChat.provider.enterprise.name),
                        severity: Severity.Error
                    };
                }
                return undefined;
            }
        });
        if (!result) {
            return undefined; // canceled
        }
        let resolvedUri = result;
        if (isSingleWord) {
            resolvedUri = `https://${resolvedUri}.ghe.com`;
        }
        else {
            const normalizedUri = result.toLowerCase();
            const hasHttps = normalizedUri.startsWith('https://');
            if (!hasHttps) {
                resolvedUri = `https://${result}`;
            }
        }
        await this.configurationService.updateValue(defaultChat.providerUriSetting, resolvedUri, 2 /* ConfigurationTarget.USER */);
        return true;
    }
};
ChatSetupController = __decorate([
    __param(2, ITelemetryService),
    __param(3, IAuthenticationService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IProductService),
    __param(6, ILogService),
    __param(7, IProgressService),
    __param(8, IActivityService),
    __param(9, ICommandService),
    __param(10, IDialogService),
    __param(11, IConfigurationService),
    __param(12, ILifecycleService),
    __param(13, IQuickInputService)
], ChatSetupController);
//#endregion
function refreshTokens(commandService) {
    // ugly, but we need to signal to the extension that entitlements changed
    commandService.executeCommand(defaultChat.completionsRefreshTokenCommand);
    commandService.executeCommand(defaultChat.chatRefreshTokenCommand);
}
//# sourceMappingURL=chatSetup.js.map