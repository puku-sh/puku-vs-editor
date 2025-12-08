"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatAgentService = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const chatQuotaService_1 = require("../../../platform/chat/common/chatQuotaService");
const interactionService_1 = require("../../../platform/chat/common/interactionService");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const githubService_1 = require("../../../platform/github/common/githubService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const constants_1 = require("../../common/constants");
const chatParticipantRequestHandler_1 = require("../../prompt/node/chatParticipantRequestHandler");
const feedbackReporter_1 = require("../../prompt/node/feedbackReporter");
const summarizer_1 = require("../../prompt/node/summarizer");
const title_1 = require("../../prompt/node/title");
const userActions_1 = require("./userActions");
const welcomeMessageProvider_1 = require("./welcomeMessageProvider");
let ChatAgentService = class ChatAgentService {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
    }
    debugGetCurrentChatAgents() {
        return this._lastChatAgents;
    }
    register() {
        const chatAgents = this.instantiationService.createInstance(ChatAgents);
        chatAgents.register();
        this._lastChatAgents = chatAgents;
        return {
            dispose: () => {
                chatAgents.dispose();
                this._lastChatAgents = undefined;
            }
        };
    }
};
exports.ChatAgentService = ChatAgentService;
exports.ChatAgentService = ChatAgentService = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], ChatAgentService);
let ChatAgents = class ChatAgents {
    constructor(octoKitService, authenticationService, instantiationService, userFeedbackService, endpointProvider, feedbackReporter, interactionService, _chatQuotaService, configurationService, experimentationService) {
        this.octoKitService = octoKitService;
        this.authenticationService = authenticationService;
        this.instantiationService = instantiationService;
        this.userFeedbackService = userFeedbackService;
        this.endpointProvider = endpointProvider;
        this.feedbackReporter = feedbackReporter;
        this.interactionService = interactionService;
        this._chatQuotaService = _chatQuotaService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
        this._disposables = new lifecycle_1.DisposableStore();
    }
    dispose() {
        this._disposables.dispose();
    }
    register() {
        this.additionalWelcomeMessage = this.instantiationService.invokeFunction(welcomeMessageProvider_1.getAdditionalWelcomeMessage);
        this._disposables.add(this.registerDefaultAgent());
        this._disposables.add(this.registerEditingAgent());
        this._disposables.add(this.registerEditingAgent2());
        this._disposables.add(this.registerEditingAgentEditor());
        this._disposables.add(this.registerEditsAgent());
        this._disposables.add(this.registerEditorDefaultAgent());
        this._disposables.add(this.registerNotebookEditorDefaultAgent());
        this._disposables.add(this.registerNotebookDefaultAgent());
        this._disposables.add(this.registerWorkspaceAgent());
        this._disposables.add(this.registerVSCodeAgent());
        this._disposables.add(this.registerTerminalAgent());
        this._disposables.add(this.registerTerminalPanelAgent());
    }
    createAgent(name, defaultIntentIdOrGetter, options) {
        const id = options?.id || (0, chatAgents_1.getChatParticipantIdFromName)(name);
        const onRequestPaused = new event_1.Relay();
        const agent = vscode.chat.createChatParticipant(id, this.getChatParticipantHandler(id, name, defaultIntentIdOrGetter, onRequestPaused.event));
        agent.onDidReceiveFeedback(e => {
            this.userFeedbackService.handleFeedback(e, id);
        });
        agent.onDidPerformAction(e => {
            this.userFeedbackService.handleUserAction(e, id);
        });
        if (agent.onDidChangePauseState) {
            onRequestPaused.input = agent.onDidChangePauseState;
        }
        this._disposables.add((0, observableInternal_1.autorun)(reader => {
            agent.supportIssueReporting = this.feedbackReporter.canReport.read(reader);
        }));
        return agent;
    }
    registerWorkspaceAgent() {
        const workspaceAgent = this.createAgent(chatAgents_1.workspaceAgentName, "workspace" /* Intent.Workspace */);
        workspaceAgent.iconPath = new vscode.ThemeIcon('code');
        return workspaceAgent;
    }
    registerVSCodeAgent() {
        const useInsidersIcon = vscode.env.appName.includes('Insiders') || vscode.env.appName.includes('OSS');
        const vscodeAgent = this.createAgent(chatAgents_1.vscodeAgentName, "vscode" /* Intent.VSCode */);
        vscodeAgent.iconPath = useInsidersIcon ? new vscode.ThemeIcon('vscode-insiders') : new vscode.ThemeIcon('vscode');
        return vscodeAgent;
    }
    registerTerminalAgent() {
        const terminalAgent = this.createAgent(chatAgents_1.terminalAgentName, "terminal" /* Intent.Terminal */);
        terminalAgent.iconPath = new vscode.ThemeIcon('terminal');
        return terminalAgent;
    }
    registerTerminalPanelAgent() {
        const terminalPanelAgent = this.createAgent(chatAgents_1.terminalAgentName, "terminal" /* Intent.Terminal */, { id: 'puku.terminalPanel' });
        terminalPanelAgent.iconPath = new vscode.ThemeIcon('terminal');
        return terminalPanelAgent;
    }
    async initDefaultAgentRequestorProps(defaultAgent) {
        const tryToSetRequestorProps = async () => {
            const user = await this.octoKitService.getCurrentAuthedUser();
            if (!user) {
                return false;
            }
            defaultAgent.requester = {
                name: user.login,
                icon: uri_1.URI.parse(user?.avatar_url ?? `https://avatars.githubusercontent.com/${user.login}`)
            };
            return true;
        };
        if (!(await tryToSetRequestorProps())) {
            // Not logged in yet, wait for login
            const listener = this.authenticationService.onDidAuthenticationChange(async () => {
                if (await tryToSetRequestorProps()) {
                    listener.dispose();
                }
            });
        }
    }
    registerEditingAgent() {
        const editingAgent = this.createAgent(chatAgents_1.editingSessionAgentName, "edit" /* Intent.Edit */);
        editingAgent.iconPath = new vscode.ThemeIcon('copilot');
        editingAgent.additionalWelcomeMessage = this.additionalWelcomeMessage;
        editingAgent.titleProvider = this.instantiationService.createInstance(title_1.ChatTitleProvider);
        return editingAgent;
    }
    registerEditingAgentEditor() {
        const editingAgent = this.createAgent(chatAgents_1.editingSessionAgentEditorName, "inlineChat" /* Intent.InlineChat */);
        editingAgent.iconPath = new vscode.ThemeIcon('copilot');
        editingAgent.additionalWelcomeMessage = this.additionalWelcomeMessage;
        return editingAgent;
    }
    registerEditingAgent2() {
        const editingAgent = this.createAgent(chatAgents_1.editingSessionAgent2Name, "edit2" /* Intent.Edit2 */);
        editingAgent.iconPath = new vscode.ThemeIcon('copilot');
        editingAgent.additionalWelcomeMessage = this.additionalWelcomeMessage;
        editingAgent.titleProvider = this.instantiationService.createInstance(title_1.ChatTitleProvider);
        return editingAgent;
    }
    registerEditsAgent() {
        const editingAgent = this.createAgent(chatAgents_1.editsAgentName, "editAgent" /* Intent.Agent */);
        editingAgent.iconPath = new vscode.ThemeIcon('tools');
        editingAgent.additionalWelcomeMessage = this.additionalWelcomeMessage;
        editingAgent.titleProvider = this.instantiationService.createInstance(title_1.ChatTitleProvider);
        return editingAgent;
    }
    registerDefaultAgent() {
        const intentGetter = (request) => {
            if (this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.AskAgent, this.experimentationService) && request.model.capabilities.supportsToolCalling && this.configurationService.getNonExtensionConfig('chat.agent.enabled')) {
                return "askAgent" /* Intent.AskAgent */;
            }
            return "unknown" /* Intent.Unknown */;
        };
        const defaultAgent = this.createAgent(chatAgents_1.defaultAgentName, intentGetter);
        defaultAgent.iconPath = new vscode.ThemeIcon('copilot');
        this.initDefaultAgentRequestorProps(defaultAgent);
        defaultAgent.helpTextPrefix = vscode.l10n.t('You can ask me general programming questions, or chat with the following participants which have specialized expertise and can perform actions:');
        const helpPostfix = vscode.l10n.t({
            message: `To have a great conversation, ask me questions as if I was a real programmer:

* **Show me the code** you want to talk about by having the files open and selecting the most important lines.
* **Make refinements** by asking me follow-up questions, adding clarifications, providing errors, etc.
* **Review my suggested code** and tell me about issues or improvements, so I can iterate on it.

You can also ask me questions about your editor selection by [starting an inline chat session](command:inlineChat.start).

Learn more about [GitHub Copilot](https://docs.github.com/copilot/using-github-copilot/getting-started-with-github-copilot?tool=vscode&utm_source=editor&utm_medium=chat-panel&utm_campaign=2024q3-em-MSFT-getstarted) in [Visual Studio Code](https://code.visualstudio.com/docs/copilot/overview). Or explore the [Copilot walkthrough](command:puku.open.walkthrough).`,
            comment: "{Locked='](command:inlineChat.start)'}"
        });
        const markdownString = new vscode.MarkdownString(helpPostfix);
        markdownString.isTrusted = { enabledCommands: ['inlineChat.start', 'puku.open.walkthrough'] };
        defaultAgent.helpTextPostfix = markdownString;
        defaultAgent.additionalWelcomeMessage = this.additionalWelcomeMessage;
        defaultAgent.titleProvider = this.instantiationService.createInstance(title_1.ChatTitleProvider);
        defaultAgent.summarizer = this.instantiationService.createInstance(summarizer_1.ChatSummarizerProvider);
        return defaultAgent;
    }
    registerEditorDefaultAgent() {
        const defaultAgent = this.createAgent(chatAgents_1.editorAgentName, "editor" /* Intent.Editor */);
        defaultAgent.iconPath = new vscode.ThemeIcon('copilot');
        return defaultAgent;
    }
    registerNotebookEditorDefaultAgent() {
        const defaultAgent = this.createAgent('notebook', "editor" /* Intent.Editor */);
        defaultAgent.iconPath = new vscode.ThemeIcon('copilot');
        return defaultAgent;
    }
    registerNotebookDefaultAgent() {
        const defaultAgent = this.createAgent(chatAgents_1.notebookEditorAgentName, "notebookEditor" /* Intent.notebookEditor */);
        defaultAgent.iconPath = new vscode.ThemeIcon('copilot');
        return defaultAgent;
    }
    getChatParticipantHandler(id, name, defaultIntentIdOrGetter, onRequestPaused) {
        return async (request, context, stream, token) => {
            // If we need privacy confirmation, i.e with 3rd party models. We will return a confirmation response and return early
            const privacyConfirmation = await this.requestPolicyConfirmation(request, stream);
            if (typeof privacyConfirmation === 'boolean') {
                return {};
            }
            request = privacyConfirmation;
            // If we need to switch to the base model, this function will handle it
            // Otherwise it just returns the same request passed into it
            request = await this.switchToBaseModel(request, stream);
            // The user is starting an interaction with the chat
            this.interactionService.startInteraction();
            const defaultIntentId = typeof defaultIntentIdOrGetter === 'function' ?
                defaultIntentIdOrGetter(request) :
                defaultIntentIdOrGetter;
            // empty chatAgentArgs will force InteractiveSession to not use a command or try to parse one out of the query
            const commandsForAgent = constants_1.agentsToCommands[defaultIntentId];
            const intentId = request.command && commandsForAgent ?
                commandsForAgent[request.command] :
                defaultIntentId;
            const onPause = event_1.Event.chain(onRequestPaused, $ => $.filter(e => e.request === request).map(e => e.isPaused));
            const handler = this.instantiationService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, context.history, request, stream, token, { agentName: name, agentId: id, intentId }, onPause);
            try {
                return await handler.getResult();
            }
            catch (error) {
                // Puku Editor: Suppress PukuLoginRequired error - sign-in flow will be triggered automatically
                if (error instanceof Error && error.name === 'PukuLoginRequired') {
                    // Return empty result, sign-in flow will handle authentication
                    return {};
                }
                // Re-throw other errors
                throw error;
            }
        };
    }
    /**
     * Handles showing the privacy confirmation in cases such as 3rd party models
     * @param request The current chat request
     * @param stream The chat response stream
     * @returns True if a privacy confirmation is shown, otherwise a chat request object. This is used sometimes to modify the prompt
     */
    async requestPolicyConfirmation(request, stream) {
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        if (endpoint.policy === 'enabled') {
            return request;
        }
        // Accept the policy and agree to the terms. Then send the request through so the LLM can answer it
        if (request.acceptedConfirmationData?.[0]?.prompt && (await endpoint.acceptChatPolicy())) {
            return { ...request, prompt: request.acceptedConfirmationData[0].prompt };
        }
        // User is being prompted for the first time to acknowledge
        stream.confirmation(`Enable ${endpoint.name} for all clients`, endpoint.policy.terms, { prompt: request.prompt }, ['Enable']);
        return true;
    }
    async switchToBaseModel(request, stream) {
        // Puku Editor: Skip base model switching when using Ollama
        const ollamaEndpoint = this.configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
        if (ollamaEndpoint) {
            return request;
        }
        const endpoint = await this.endpointProvider.getChatEndpoint(request);
        const baseEndpoint = await this.endpointProvider.getChatEndpoint('copilot-base');
        // If it has a 0x multipler, it's free so don't switch them. If it's BYOK or Puku AI, it's free so don't switch them.
        if (endpoint.multiplier === 0 || (request.model.vendor !== 'copilot' && request.model.vendor !== 'pukuai') || endpoint.multiplier === undefined) {
            return request;
        }
        if (this._chatQuotaService.overagesEnabled || !this._chatQuotaService.quotaExhausted) {
            return request;
        }
        // Support both copilot and pukuai vendors
        const baseLmModel = (await vscode.lm.selectChatModels({ id: baseEndpoint.model, family: baseEndpoint.family, vendor: request.model.vendor }))[0];
        if (!baseLmModel) {
            return request;
        }
        await vscode.commands.executeCommand('workbench.action.chat.changeModel', { vendor: baseLmModel.vendor, id: baseLmModel.id, family: baseLmModel.family });
        // Switch to the base model and show a warning
        request = { ...request, model: baseLmModel };
        let messageString;
        if (this.authenticationService.copilotToken?.isIndividual) {
            messageString = new vscode.MarkdownString(vscode.l10n.t({
                message: 'You have exceeded your premium request allowance. We have automatically switched you to {0} which is included with your plan. [Enable additional paid premium requests]({1}) to continue using premium models.',
                args: [baseEndpoint.name, 'command:chat.enablePremiumOverages'],
                // To make sure the translators don't break the link
                comment: ["{Locked=']({'}"]
            }));
            messageString.isTrusted = { enabledCommands: ['chat.enablePremiumOverages'] };
        }
        else {
            messageString = new vscode.MarkdownString(vscode.l10n.t('You have exceeded your premium request allowance. We have automatically switched you to {0} which is included with your plan. To enable additional paid premium requests, contact your organization admin.', baseEndpoint.name));
        }
        stream.warning(messageString);
        return request;
    }
};
ChatAgents = __decorate([
    __param(0, githubService_1.IOctoKitService),
    __param(1, authentication_1.IAuthenticationService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, userActions_1.IUserFeedbackService),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, feedbackReporter_1.IFeedbackReporter),
    __param(6, interactionService_1.IInteractionService),
    __param(7, chatQuotaService_1.IChatQuotaService),
    __param(8, configurationService_1.IConfigurationService),
    __param(9, nullExperimentationService_1.IExperimentationService)
], ChatAgents);
//# sourceMappingURL=chatParticipants.js.map