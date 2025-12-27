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
            const { disposable: vscodeDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.vscode', 'vscode', false, localize2('vscodeAgentDescription', "Ask questions about VS Code").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(vscodeDisposable);
            // Register workspace agent
            const { disposable: workspaceDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.workspace', 'workspace', false, localize2('workspaceAgentDescription', "Ask about your workspace").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(workspaceDisposable);
            // Register terminal agent
            const { disposable: terminalDisposable } = SetupAgent_1.doRegisterAgent(instantiationService, chatAgentService, 'setup.terminal.agent', 'terminal', false, localize2('terminalAgentDescription', "Ask how to do something in the terminal").value, ChatAgentLocation.Chat, undefined, context, controller);
            disposables.add(terminalDisposable);
            // Register tools
            disposables.add(SetupTool.registerTool(instantiationService, {
                id: 'setup_tools_createNewWorkspace',
                source: ToolDataSource.Internal,
                icon: Codicon.newFolder,
                displayName: localize('setupToolDisplayName', "New Workspace"),
                modelDescription: 'Scaffold a new workspace in VS Code',
                userDescription: localize('setupToolsDescription', "Scaffold a new workspace in VS Code"),
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
    static { this.SETUP_NEEDED_MESSAGE = new MarkdownString(localize('settingUpCopilotNeeded', "You need to set up Puku AI and be signed in to use Chat.")); }
    static { this.TRUST_NEEDED_MESSAGE = new MarkdownString(localize('trustNeeded', "You need to trust this workspace to use Chat.")); }
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
            content: new MarkdownString(localize('waitingChat', "Getting chat ready...")),
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
                content: new MarkdownString(localize('copilotUnavailableWarning', "Failed to get a response. Please try again."))
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
                    content: new MarkdownString(localize('waitingChat2', "Chat is almost ready...")),
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
                        warningMessage = localize('chatTookLongWarningAnonymous', "Chat took too long to get ready. Please ensure that the extension `{0}` is installed and enabled.", defaultChat.chatExtensionId);
                    }
                    else {
                        warningMessage = localize('chatTookLongWarning', "Chat took too long to get ready. Please ensure you are signed in to {0} and that the extension `{1}` is installed and enabled.", defaultChat.provider.default.name, defaultChat.chatExtensionId);
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
                        content: new MarkdownString(localize('setupChatSignIn2', "Signing in to {0}...", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name)),
                    });
                    break;
                case ChatSetupStep.Installing:
                    progress({
                        kind: 'progressMessage',
                        content: new MarkdownString(localize('installingChat', "Getting chat ready...")),
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
                    content: new MarkdownString(localize('chatSetupError', "Chat setup failed."))
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
                generateOrModifyTitle = localize('generate', "Generate");
                generateOrModifyCommand = AICodeActionsHelper.generate(range);
            }
        }
        else {
            const textInSelection = model.getValueInRange(range);
            if (!/^\s*$/.test(textInSelection)) {
                generateOrModifyTitle = localize('modify', "Modify");
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
                title: localize('fix', "Fix"),
                command: AICodeActionsHelper.fixMarkers(markers, range)
            });
            // "Explain" if there are diagnostics in the range
            actions.push({
                kind: CodeActionKind.QuickFix.append('explain').append('copilot').value,
                isAI: true,
                diagnostics: markers,
                title: localize('explain', "Explain"),
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
            title: localize('modify', "Modify"),
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
            title: localize('generate', "Generate"),
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
            title: localize('explain', "Explain"),
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
            title: localize('fix', "Fix"),
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
            message: localize('chatWorkspaceTrust', "AI features are currently only supported in trusted workspaces.")
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
            const googleProviderButton = [localize('signInWithGoogle', "Sign in with Google"), ChatSetupStrategy.SetupWithGoogleProvider, styleButton('continue-button', 'google')];
            buttons = [googleProviderButton];
        }
        else {
            buttons = [[localize('setupAIButton', "Use AI Features"), ChatSetupStrategy.DefaultSetup, undefined]];
        }
        buttons.push([localize('skipForNow', "Skip for now"), ChatSetupStrategy.Canceled, styleButton('link-button', 'skip-button')]);
        return buttons;
    }
    getDialogTitle(options) {
        if (this.chatEntitlementService.anonymous) {
            if (options?.forceAnonymous) {
                return localize('startUsing', "Start using AI Features");
            }
            else {
                return localize('enableMore', "Enable more AI features");
            }
        }
        if (this.context.state.entitlement === ChatEntitlement.Unknown || options?.forceSignInDialog) {
            return localize('signIn', "Sign in to use AI Features");
        }
        return localize('startUsing', "Start using AI Features");
    }
    createDialogFooter(disposables, options) {
        const element = $('.chat-setup-dialog-footer');
        let footer;
        if (options?.forceAnonymous || this.telemetryService.telemetryLevel === 0 /* TelemetryLevel.NONE */) {
            footer = localize({ key: 'settingsAnonymous', comment: ['{Locked="["}', '{Locked="]({1})"}', '{Locked="]({2})"}'] }, "By continuing, you agree to {0}'s [Terms]({1}) and [Privacy Statement]({2}).", defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl);
        }
        else {
            footer = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({1})"}', '{Locked="]({2})"}', '{Locked="]({4})"}', '{Locked="]({5})"}'] }, "By continuing, you agree to {0}'s [Terms]({1}) and [Privacy Statement]({2}). {3} Copilot may show [public code]({4}) suggestions and use your data to improve the product. You can change these [settings]({5}) anytime.", defaultChat.provider.default.name, defaultChat.termsStatementUrl, defaultChat.privacyStatementUrl, defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
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
            static { this.CHAT_SETUP_ACTION_LABEL = localize2('triggerChatSetup', "Use AI Features with Copilot for free..."); }
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
                        message: localize('setupErrorDialog', "Chat setup failed. Would you like to try again?"),
                        primaryButton: localize('retry', "Retry"),
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
                    title: localize2('forceSignIn', "Sign in to use AI features")
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
                    title: localize2('triggerChatSetupFromAccounts', "Sign in to use AI features..."),
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
                    title: localize2('managePlan', "Upgrade to Puku AI Pro"),
                    category: localize2('chat.category', 'Chat'),
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
                    title: localize2('manageOverages', "Manage Puku AI Overages"),
                    category: localize2('chat.category', 'Chat'),
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
                    title: localize('explain', "Explain"),
                },
                group: '1_chat',
                order: 4,
                when: internalGenerateCodeContext
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.fix',
                    title: localize('fix', "Fix"),
                },
                group: '1_action',
                order: 1,
                when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.review',
                    title: localize('review', "Code Review"),
                },
                group: '1_action',
                order: 2,
                when: internalGenerateCodeContext
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.generateDocs',
                    title: localize('generateDocs', "Generate Docs"),
                },
                group: '2_generate',
                order: 1,
                when: ContextKeyExpr.and(internalGenerateCodeContext, EditorContextKeys.readOnly.negate())
            });
            MenuRegistry.appendMenuItem(MenuId.ChatTextEditorMenu, {
                command: {
                    id: 'chat.internal.generateTests',
                    title: localize('generateTests', "Generate Tests"),
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
        await this.extensionsWorkbenchService.updateRunningExtensions(state === 12 /* EnablementState.EnabledGlobally */ || state === 13 /* EnablementState.EnabledWorkspace */ ? localize('restartExtensionHost.reason.enable', "Enabling AI features") : localize('restartExtensionHost.reason.disable', "Disabling AI features"));
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
            static { this.TITLE = localize2('hideChatSetup', "Learn How to Hide AI Features"); }
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
        const title = localize('setupChatProgress', "Getting chat ready...");
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
                message: localize('unknownSignInError', "Failed to sign in to {0}. Would you like to try again?", ChatEntitlementRequests.providerId(this.configurationService) === defaultChat.provider.enterprise.id ? defaultChat.provider.enterprise.name : defaultChat.provider.default.name),
                detail: localize('unknownSignInErrorDetail', "You must be signed in to use AI features."),
                primaryButton: localize('retry', "Retry")
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
                    message: localize('unknownSetupError', "An error occurred while setting up chat. Would you like to try again?"),
                    detail: error && !isCancellationError(error) ? toErrorMessage(error) : undefined,
                    primaryButton: localize('retry', "Retry")
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
            prompt: localize('enterpriseInstance', "What is your {0} instance?", defaultChat.provider.enterprise.name),
            placeHolder: localize('enterpriseInstancePlaceholder', 'i.e. "octocat" or "https://octocat.ghe.com"...'),
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
                        content: localize('willResolveTo', "Will resolve to {0}", `https://${value}.ghe.com`),
                        severity: Severity.Info
                    };
                }
                if (!fullUriRegEx.test(value)) {
                    return {
                        content: localize('invalidEnterpriseInstance', 'You must enter a valid {0} instance (i.e. "octocat" or "https://octocat.ghe.com")', defaultChat.provider.enterprise.name),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNldHVwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQztBQUMvQixPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFcEQsT0FBTyxFQUFFLE1BQU0sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRS9GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNwSSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVE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