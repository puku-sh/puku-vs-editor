"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
exports.ConversationFeature = void 0;
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const chatAgents_1 = require("../../../platform/chat/common/chatAgents");
const conversationOptions_1 = require("../../../platform/chat/common/conversationOptions");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const devContainerConfigurationService_1 = require("../../../platform/devcontainer/common/devContainerConfigurationService");
const vscodeIndex_1 = require("../../../platform/embeddings/common/vscodeIndex");
const domainService_1 = require("../../../platform/endpoint/common/domainService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const gitCommitMessageService_1 = require("../../../platform/git/common/gitCommitMessageService");
const logService_1 = require("../../../platform/log/common/logService");
const settingsEditorSearchService_1 = require("../../../platform/settingsEditor/common/settingsEditorSearchService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const types_1 = require("../../../util/common/types");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const contributions_1 = require("../../common/contributions");
const contributions_2 = require("../../extension/vscode-node/contributions");
const mergeConflictService_1 = require("../../git/common/mergeConflictService");
const inlineChatCommands_1 = require("../../inlineChat/vscode-node/inlineChatCommands");
const newIntent_1 = require("../../intents/node/newIntent");
const terminalExplainIntent_1 = require("../../intents/node/terminalExplainIntent");
const linkifyService_1 = require("../../linkify/common/linkifyService");
const commands_1 = require("../../linkify/vscode-node/commands");
const inlineCodeSymbolLinkifier_1 = require("../../linkify/vscode-node/inlineCodeSymbolLinkifier");
const notebookCellLinkifier_1 = require("../../linkify/vscode-node/notebookCellLinkifier");
const symbolLinkifier_1 = require("../../linkify/vscode-node/symbolLinkifier");
const intentDetector_1 = require("../../prompt/node/intentDetector");
const semanticSearchTextSearchProvider_1 = require("../../workspaceSemanticSearch/node/semanticSearchTextSearchProvider");
const githubPullRequestProviders_1 = require("../node/githubPullRequestProviders");
const feedbackCollection_1 = require("./feedbackCollection");
const newWorkspaceFollowup_1 = require("./newWorkspaceFollowup");
const terminalFixGenerator_1 = require("./terminalFixGenerator");
/**
 * Class that checks if users are allowed to use the conversation feature,
 * and registers the relevant providers if they are.
 */
let ConversationFeature = class ConversationFeature {
    constructor(instantiationService, logService, configurationService, conversationOptions, chatAgentService, telemetryService, authenticationService, embeddingIndex, devContainerConfigurationService, gitCommitMessageService, mergeConflictService, linkifyService, extensionContext, newWorkspacePreviewContentManager, settingsEditorSearchService) {
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.configurationService = configurationService;
        this.conversationOptions = conversationOptions;
        this.chatAgentService = chatAgentService;
        this.telemetryService = telemetryService;
        this.authenticationService = authenticationService;
        this.embeddingIndex = embeddingIndex;
        this.devContainerConfigurationService = devContainerConfigurationService;
        this.gitCommitMessageService = gitCommitMessageService;
        this.mergeConflictService = mergeConflictService;
        this.linkifyService = linkifyService;
        this.extensionContext = extensionContext;
        this.newWorkspacePreviewContentManager = newWorkspacePreviewContentManager;
        this.settingsEditorSearchService = settingsEditorSearchService;
        /** Disposables that exist for the lifetime of this object */
        this._disposables = new lifecycle_1.DisposableStore();
        /** Disposables that are cleared whenever feature enablement is toggled */
        this._activatedDisposables = new lifecycle_1.DisposableStore();
        /** Whether or not the search provider has been registered */
        this._searchProviderRegistered = false;
        /** Whether or not the settings search provider has been registered */
        this._settingsSearchProviderRegistered = false;
        this.id = 'conversationFeature';
        this._enabled = false;
        this._activated = false;
        // Register Copilot token listener
        this.registerCopilotTokenListener();
        const activationBlockerDeferred = new async_1.DeferredPromise();
        this.activationBlocker = activationBlockerDeferred.p;
        // Puku Editor: Enable chat if copilot token OR Ollama endpoint is configured
        const ollamaEndpoint = configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
        if (authenticationService.copilotToken || ollamaEndpoint) {
            this.logService.debug(`ConversationFeature: Copilot token or Ollama endpoint available`);
            this.activated = true;
            activationBlockerDeferred.complete();
        }
        this._disposables.add(authenticationService.onDidAuthenticationChange(async () => {
            const hasSession = !!authenticationService.copilotToken;
            const ollamaEndpoint = configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
            this.logService.debug(`ConversationFeature: onDidAuthenticationChange has token: ${hasSession}, ollama: ${!!ollamaEndpoint}`);
            if (hasSession || ollamaEndpoint) {
                this.activated = true;
            }
            else {
                this.activated = false;
            }
            activationBlockerDeferred.complete();
        }));
    }
    get enabled() {
        return this._enabled;
    }
    set enabled(value) {
        if (value && !this.activated) {
            this.activated = true;
        }
        this._enabled = value;
        // Set context value that is used to show/hide th sidebar icon
        vscode.commands.executeCommand('setContext', 'puku.interactiveSession.disabled', !value);
    }
    get activated() {
        return this._activated;
    }
    set activated(value) {
        if (this._activated === value) {
            return;
        }
        this._activated = value;
        if (!value) {
            this._activatedDisposables.clear();
        }
        else {
            const options = this.conversationOptions;
            this._activatedDisposables.add(this.registerProviders());
            this._activatedDisposables.add(this.registerCommands(options));
            this._activatedDisposables.add(this.registerRelatedInformationProviders());
            this._activatedDisposables.add(this.registerParticipants(options));
            this._activatedDisposables.add(this.instantiationService.createInstance(contributions_1.ContributionCollection, contributions_2.vscodeNodeChatContributions));
        }
    }
    dispose() {
        this._activated = false;
        this._activatedDisposables.dispose();
        this._disposables?.dispose();
    }
    [Symbol.dispose]() { this.dispose(); }
    registerParticipants(options) {
        return this.chatAgentService.register(options);
    }
    registerSearchProvider() {
        if (this._searchProviderRegistered) {
            return;
        }
        else {
            this._searchProviderRegistered = true;
            // Don't register for no auth user
            if (this.authenticationService.copilotToken?.isNoAuthUser) {
                this.logService.debug('ConversationFeature: Skipping search provider registration - no GitHub session available');
                return;
            }
            return vscode.workspace.registerAITextSearchProvider('file', this.instantiationService.createInstance(semanticSearchTextSearchProvider_1.SemanticSearchTextSearchProvider));
        }
    }
    registerSettingsSearchProvider() {
        if (this._settingsSearchProviderRegistered) {
            return;
        }
        this._settingsSearchProviderRegistered = true;
        return vscode.ai.registerSettingsSearchProvider(this.settingsEditorSearchService);
    }
    registerProviders() {
        const disposables = new lifecycle_1.DisposableStore();
        try {
            const detectionProvider = this.registerParticipantDetectionProvider();
            if (detectionProvider) {
                disposables.add(detectionProvider);
            }
            const searchDisposable = this.registerSearchProvider();
            if (searchDisposable) {
                disposables.add(searchDisposable);
            }
            const settingsSearchDisposable = this.registerSettingsSearchProvider();
            if (settingsSearchDisposable) {
                disposables.add(settingsSearchDisposable);
            }
        }
        catch (err) {
            this.logService.error(err, 'Registration of interactive providers failed');
        }
        return disposables;
    }
    registerParticipantDetectionProvider() {
        if ('registerChatParticipantDetectionProvider' in vscode.chat) {
            const provider = this.instantiationService.createInstance(intentDetector_1.IntentDetector);
            return vscode.chat.registerChatParticipantDetectionProvider(provider);
        }
    }
    registerCommands(options) {
        const disposables = new lifecycle_1.DisposableStore();
        [
            vscode.commands.registerCommand('puku.interactiveSession.feedback', async () => {
                return vscode.env.openExternal(vscode.Uri.parse(domainService_1.FEEDBACK_URL));
            }),
            vscode.commands.registerCommand('puku.terminal.explainTerminalLastCommand', async () => this.triggerTerminalChat({ query: `/${terminalExplainIntent_1.TerminalExplainIntent.intentName} #terminalLastCommand` })),
            vscode.commands.registerCommand('puku.terminal.fixTerminalLastCommand', async () => (0, terminalFixGenerator_1.generateTerminalFixes)(this.instantiationService)),
            vscode.commands.registerCommand('puku.terminal.generateCommitMessage', async () => {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders?.length) {
                    return;
                }
                const uri = workspaceFolders.length === 1 ? workspaceFolders[0].uri : await vscode.window.showWorkspaceFolderPick().then(folder => folder?.uri);
                if (!uri) {
                    return;
                }
                const repository = this.gitCommitMessageService.getRepository(uri);
                if (!repository) {
                    return;
                }
                const commitMessage = await this.gitCommitMessageService.generateCommitMessage(repository, cancellation_1.CancellationToken.None);
                if (commitMessage) {
                    // Sanitize the message by escaping double quotes, backslashes, and $ characters
                    const sanitizedMessage = commitMessage.replace(/"/g, '\\"').replace(/\\/g, '\\\\').replace(/\$/g, '\\$'); // CodeQL [SM02383] Backslashes are escaped as part of the second replace.
                    const message = `git commit -m "${sanitizedMessage}"`;
                    vscode.window.activeTerminal?.sendText(message, false);
                }
            }),
            vscode.commands.registerCommand('puku.git.generateCommitMessage', async (rootUri, _, cancellationToken) => {
                const repository = this.gitCommitMessageService.getRepository(rootUri);
                if (!repository) {
                    return;
                }
                const commitMessage = await this.gitCommitMessageService.generateCommitMessage(repository, cancellationToken);
                if (commitMessage) {
                    repository.inputBox.value = commitMessage;
                }
            }),
            vscode.commands.registerCommand('puku.git.resolveMergeConflicts', async (...resourceStates) => {
                const resources = resourceStates.filter(r => !!r).map(r => (0, types_1.isUri)(r) ? r : r.resourceUri);
                await this.mergeConflictService.resolveMergeConflicts(resources, undefined);
            }),
            vscode.commands.registerCommand('puku.devcontainer.generateDevContainerConfig', async (args, cancellationToken = new vscode.CancellationTokenSource().token) => {
                return this.devContainerConfigurationService.generateConfiguration(args, cancellationToken);
            }),
            vscode.commands.registerCommand('puku.chat.openUserPreferences', async () => {
                const uri = uri_1.URI.joinPath(this.extensionContext.globalStorageUri, 'copilotUserPreferences.md');
                return vscode.commands.executeCommand('vscode.open', uri);
            }),
            this.instantiationService.invokeFunction(feedbackCollection_1.startFeedbackCollection),
            (0, commands_1.registerLinkCommands)(this.telemetryService),
            this.linkifyService.registerGlobalLinkifier({
                create: () => this.instantiationService.createInstance(inlineCodeSymbolLinkifier_1.InlineCodeSymbolLinkifier)
            }),
            this.linkifyService.registerGlobalLinkifier({
                create: () => this.instantiationService.createInstance(symbolLinkifier_1.SymbolLinkifier)
            }),
            this.linkifyService.registerGlobalLinkifier({
                create: () => disposables.add(this.instantiationService.createInstance(notebookCellLinkifier_1.NotebookCellLinkifier))
            }),
            this.instantiationService.invokeFunction(inlineChatCommands_1.registerInlineChatCommands),
            this.registerTerminalQuickFixProviders(),
            (0, newWorkspaceFollowup_1.registerNewWorkspaceIntentCommand)(this.newWorkspacePreviewContentManager, this.logService, options),
            registerGitHubPullRequestTitleAndDescriptionProvider(this.instantiationService),
            registerSearchIntentCommand(),
        ].forEach(d => disposables.add(d));
        return disposables;
    }
    async triggerTerminalChat(options) {
        const chatLocation = this.configurationService.getConfig(configurationService_1.ConfigKey.TerminalChatLocation);
        let commandId;
        switch (chatLocation) {
            case 'quickChat':
                commandId = 'workbench.action.quickchat.toggle';
                options.query = `@${chatAgents_1.terminalAgentName} ` + options.query;
                break;
            case 'terminal':
                commandId = 'workbench.action.terminal.chat.start';
                // HACK: Currently @terminal is hardcoded in core
                break;
            case 'chatView':
            default:
                commandId = 'workbench.action.chat.open';
                options.query = `@${chatAgents_1.terminalAgentName} ` + options.query;
                break;
        }
        await vscode.commands.executeCommand(commandId, options);
    }
    registerRelatedInformationProviders() {
        const disposables = new lifecycle_1.DisposableStore();
        [
            vscode.ai.registerRelatedInformationProvider(vscode.RelatedInformationType.CommandInformation, this.embeddingIndex.commandIdIndex),
            vscode.ai.registerRelatedInformationProvider(vscode.RelatedInformationType.SettingInformation, this.embeddingIndex.settingsIndex)
        ].forEach(d => disposables.add(d));
        return disposables;
    }
    registerCopilotTokenListener() {
        this._disposables.add(this.authenticationService.onDidAuthenticationChange(() => {
            const chatEnabled = this.authenticationService.copilotToken?.isChatEnabled();
            // Puku Editor: Allow chat when Ollama endpoint is configured (BYOK mode)
            const ollamaEndpoint = this.configurationService.getConfig(configurationService_1.ConfigKey.OllamaEndpoint);
            const isByokEnabled = !!ollamaEndpoint;
            const shouldEnableChat = (chatEnabled ?? false) || isByokEnabled;
            this.logService.info(`copilot token chat_enabled: ${chatEnabled}, sku: ${this.authenticationService.copilotToken?.sku ?? ''}, byok_enabled: ${isByokEnabled}`);
            this.enabled = shouldEnableChat;
        }));
    }
    registerTerminalQuickFixProviders() {
        const isEnabled = () => this.enabled;
        return (0, lifecycle_1.combinedDisposable)(vscode.window.registerTerminalQuickFixProvider('copilot-chat.fixWithCopilot', {
            provideTerminalQuickFixes(commandMatchResult, token) {
                if (!isEnabled() || commandMatchResult.commandLine.endsWith('^C')) {
                    return [];
                }
                (0, terminalFixGenerator_1.setLastCommandMatchResult)(commandMatchResult);
                return [
                    {
                        command: 'puku.terminal.fixTerminalLastCommand',
                        title: vscode.l10n.t('Fix using Copilot')
                    },
                    {
                        command: 'puku.terminal.explainTerminalLastCommand',
                        title: vscode.l10n.t('Explain using Copilot')
                    }
                ];
            }
        }), vscode.window.registerTerminalQuickFixProvider('copilot-chat.generateCommitMessage', {
            provideTerminalQuickFixes: (commandMatchResult, token) => {
                return this.enabled ? [{
                        command: 'puku.terminal.generateCommitMessage',
                        title: vscode.l10n.t('Generate Commit Message')
                    }] : [];
            },
        }));
    }
};
exports.ConversationFeature = ConversationFeature;
exports.ConversationFeature = ConversationFeature = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService),
    __param(2, configurationService_1.IConfigurationService),
    __param(3, conversationOptions_1.IConversationOptions),
    __param(4, chatAgents_1.IChatAgentService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, authentication_1.IAuthenticationService),
    __param(7, vscodeIndex_1.ICombinedEmbeddingIndex),
    __param(8, devContainerConfigurationService_1.IDevContainerConfigurationService),
    __param(9, gitCommitMessageService_1.IGitCommitMessageService),
    __param(10, mergeConflictService_1.IMergeConflictService),
    __param(11, linkifyService_1.ILinkifyService),
    __param(12, extensionContext_1.IVSCodeExtensionContext),
    __param(13, newIntent_1.INewWorkspacePreviewContentManager),
    __param(14, settingsEditorSearchService_1.ISettingsEditorSearchService)
], ConversationFeature);
function registerSearchIntentCommand() {
    return vscode.commands.registerCommand('puku.executeSearch', async (arg) => {
        const show = arg.filesToExclude.length > 0 || arg.filesToInclude.length > 0;
        vscode.commands.executeCommand('workbench.view.search.focus').then(() => vscode.commands.executeCommand('workbench.action.search.toggleQueryDetails', { show }));
        vscode.commands.executeCommand('workbench.action.findInFiles', arg);
    });
}
function registerGitHubPullRequestTitleAndDescriptionProvider(instantiationService) {
    return instantiationService.createInstance(githubPullRequestProviders_1.GitHubPullRequestProviders);
}
//# sourceMappingURL=conversationFeature.js.map