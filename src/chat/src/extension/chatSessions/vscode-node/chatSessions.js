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
exports.ChatSessionsContrib = void 0;
const vscode = __importStar(require("vscode"));
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const octoKitServiceImpl_1 = require("../../../platform/github/common/octoKitServiceImpl");
const logService_1 = require("../../../platform/log/common/logService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const serviceCollection_1 = require("../../../util/vs/platform/instantiation/common/serviceCollection");
const claudeCodeAgent_1 = require("../../agents/claude/node/claudeCodeAgent");
const claudeCodeSdkService_1 = require("../../agents/claude/node/claudeCodeSdkService");
const claudeCodeSessionService_1 = require("../../agents/claude/node/claudeCodeSessionService");
const copilotCli_1 = require("../../agents/copilotcli/node/copilotCli");
const copilotcliPromptResolver_1 = require("../../agents/copilotcli/node/copilotcliPromptResolver");
const copilotcliSessionService_1 = require("../../agents/copilotcli/node/copilotcliSessionService");
const mcpHandler_1 = require("../../agents/copilotcli/node/mcpHandler");
const langModelServer_1 = require("../../agents/node/langModelServer");
const summarizer_1 = require("../../prompt/node/summarizer");
const claudeChatSessionContentProvider_1 = require("./claudeChatSessionContentProvider");
const claudeChatSessionItemProvider_1 = require("./claudeChatSessionItemProvider");
const claudeChatSessionParticipant_1 = require("./claudeChatSessionParticipant");
const copilotCLIChatSessionsContribution_1 = require("./copilotCLIChatSessionsContribution");
const copilotCLITerminalIntegration_1 = require("./copilotCLITerminalIntegration");
const copilotCloudSessionsProvider_1 = require("./copilotCloudSessionsProvider");
const prContentProvider_1 = require("./prContentProvider");
const pullRequestFileChangesService_1 = require("./pullRequestFileChangesService");
const CLOSE_SESSION_PR_CMD = 'puku.cloud.sessions.proxy.closeChatSessionPullRequest';
let ChatSessionsContrib = class ChatSessionsContrib extends lifecycle_1.Disposable {
    constructor(instantiationService, logService, octoKitService) {
        super();
        this.logService = logService;
        this.octoKitService = octoKitService;
        this.id = 'chatSessions';
        this.copilotcliSessionType = 'copilotcli';
        // #region Claude Code Chat Sessions
        const claudeAgentInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([claudeCodeSessionService_1.IClaudeCodeSessionService, new descriptors_1.SyncDescriptor(claudeCodeSessionService_1.ClaudeCodeSessionService)], [claudeCodeSdkService_1.IClaudeCodeSdkService, new descriptors_1.SyncDescriptor(claudeCodeSdkService_1.ClaudeCodeSdkService)], [langModelServer_1.ILanguageModelServer, new descriptors_1.SyncDescriptor(langModelServer_1.LanguageModelServer)]));
        const sessionItemProvider = this._register(claudeAgentInstaService.createInstance(claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider));
        this._register(vscode.chat.registerChatSessionItemProvider(claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider.claudeSessionType, sessionItemProvider));
        this._register(vscode.commands.registerCommand('puku.claude.sessions.refresh', () => {
            sessionItemProvider.refresh();
        }));
        const claudeAgentManager = this._register(claudeAgentInstaService.createInstance(claudeCodeAgent_1.ClaudeAgentManager));
        const chatSessionContentProvider = claudeAgentInstaService.createInstance(claudeChatSessionContentProvider_1.ClaudeChatSessionContentProvider);
        const claudeChatSessionParticipant = claudeAgentInstaService.createInstance(claudeChatSessionParticipant_1.ClaudeChatSessionParticipant, claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider.claudeSessionType, claudeAgentManager, sessionItemProvider);
        const chatParticipant = vscode.chat.createChatParticipant(claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider.claudeSessionType, claudeChatSessionParticipant.createHandler());
        this._register(vscode.chat.registerChatSessionContentProvider(claudeChatSessionItemProvider_1.ClaudeChatSessionItemProvider.claudeSessionType, chatSessionContentProvider, chatParticipant));
        // #endregion
        // Copilot Cloud Agent - conditionally register based on configuration
        this.copilotAgentInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([githubService_1.IOctoKitService, new descriptors_1.SyncDescriptor(octoKitServiceImpl_1.OctoKitService)], [pullRequestFileChangesService_1.IPullRequestFileChangesService, new descriptors_1.SyncDescriptor(pullRequestFileChangesService_1.PullRequestFileChangesService)]));
        const cloudSessionProvider = this.registerCopilotCloudAgent();
        const copilotcliAgentInstaService = instantiationService.createChild(new serviceCollection_1.ServiceCollection([copilotcliSessionService_1.ICopilotCLISessionService, new descriptors_1.SyncDescriptor(copilotcliSessionService_1.CopilotCLISessionService)], [copilotCli_1.ICopilotCLIModels, new descriptors_1.SyncDescriptor(copilotCli_1.CopilotCLIModels)], [copilotCli_1.ICopilotCLISDK, new descriptors_1.SyncDescriptor(copilotCli_1.CopilotCLISDK)], [langModelServer_1.ILanguageModelServer, new descriptors_1.SyncDescriptor(langModelServer_1.LanguageModelServer)], [copilotCLITerminalIntegration_1.ICopilotCLITerminalIntegration, new descriptors_1.SyncDescriptor(copilotCLITerminalIntegration_1.CopilotCLITerminalIntegration)], [mcpHandler_1.ICopilotCLIMCPHandler, new descriptors_1.SyncDescriptor(mcpHandler_1.CopilotCLIMCPHandler)]));
        const copilotCLIWorktreeManager = copilotcliAgentInstaService.createInstance(copilotCLIChatSessionsContribution_1.CopilotCLIWorktreeManager);
        const copilotcliSessionItemProvider = this._register(copilotcliAgentInstaService.createInstance(copilotCLIChatSessionsContribution_1.CopilotCLIChatSessionItemProvider, copilotCLIWorktreeManager));
        this._register(vscode.chat.registerChatSessionItemProvider(this.copilotcliSessionType, copilotcliSessionItemProvider));
        const promptResolver = copilotcliAgentInstaService.createInstance(copilotcliPromptResolver_1.CopilotCLIPromptResolver);
        const copilotcliChatSessionContentProvider = copilotcliAgentInstaService.createInstance(copilotCLIChatSessionsContribution_1.CopilotCLIChatSessionContentProvider, copilotCLIWorktreeManager);
        const summarizer = copilotcliAgentInstaService.createInstance(summarizer_1.ChatSummarizerProvider);
        const gitService = copilotcliAgentInstaService.invokeFunction(accessor => accessor.get(gitService_1.IGitService));
        const copilotcliChatSessionParticipant = this._register(copilotcliAgentInstaService.createInstance(copilotCLIChatSessionsContribution_1.CopilotCLIChatSessionParticipant, promptResolver, copilotcliSessionItemProvider, cloudSessionProvider, summarizer, copilotCLIWorktreeManager));
        const copilotCLISessionService = copilotcliAgentInstaService.invokeFunction(accessor => accessor.get(copilotcliSessionService_1.ICopilotCLISessionService));
        const copilotcliParticipant = vscode.chat.createChatParticipant(this.copilotcliSessionType, copilotcliChatSessionParticipant.createHandler());
        this._register(vscode.chat.registerChatSessionContentProvider(this.copilotcliSessionType, copilotcliChatSessionContentProvider, copilotcliParticipant));
        this._register((0, copilotCLIChatSessionsContribution_1.registerCLIChatCommands)(copilotcliSessionItemProvider, copilotCLISessionService, gitService));
    }
    registerCopilotCloudAgent() {
        if (!this.copilotAgentInstaService) {
            return;
        }
        if (this.copilotCloudRegistrations) {
            this.copilotCloudRegistrations.dispose();
            this.copilotCloudRegistrations = undefined;
        }
        this.copilotCloudRegistrations = new lifecycle_1.DisposableStore();
        this.copilotCloudRegistrations.add(this.copilotAgentInstaService.createInstance(prContentProvider_1.PRContentProvider));
        const cloudSessionsProvider = this.copilotCloudRegistrations.add(this.copilotAgentInstaService.createInstance(copilotCloudSessionsProvider_1.CopilotCloudSessionsProvider));
        this.copilotCloudRegistrations.add(vscode.chat.registerChatSessionItemProvider(copilotCloudSessionsProvider_1.CopilotCloudSessionsProvider.TYPE, cloudSessionsProvider));
        this.copilotCloudRegistrations.add(vscode.chat.registerChatSessionContentProvider(copilotCloudSessionsProvider_1.CopilotCloudSessionsProvider.TYPE, cloudSessionsProvider, cloudSessionsProvider.chatParticipant, { supportsInterruptions: true }));
        this.copilotCloudRegistrations.add(vscode.commands.registerCommand('puku.cloud.sessions.refresh', () => {
            cloudSessionsProvider.refresh();
        }));
        this.copilotCloudRegistrations.add(vscode.commands.registerCommand('puku.cloud.sessions.openInBrowser', async (chatSessionItem) => {
            cloudSessionsProvider.openSessionsInBrowser(chatSessionItem);
        }));
        this.copilotCloudRegistrations.add(vscode.commands.registerCommand('agentSession.copilot-cloud-agent.openChanges', async (sessionItemResource) => {
            await cloudSessionsProvider.openChanges(sessionItemResource);
        }));
        this.copilotCloudRegistrations.add(vscode.commands.registerCommand(CLOSE_SESSION_PR_CMD, async (ctx) => {
            try {
                const success = await this.octoKitService.closePullRequest(ctx.pullRequestDetails.repository.owner.login, ctx.pullRequestDetails.repository.name, ctx.pullRequestDetails.number);
                if (!success) {
                    this.logService.error(`${CLOSE_SESSION_PR_CMD}: Failed to close PR #${ctx.pullRequestDetails.number}`);
                }
                cloudSessionsProvider.refresh();
            }
            catch (e) {
                this.logService.error(`${CLOSE_SESSION_PR_CMD}: Exception ${e}`);
            }
        }));
        return cloudSessionsProvider;
    }
};
exports.ChatSessionsContrib = ChatSessionsContrib;
exports.ChatSessionsContrib = ChatSessionsContrib = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, logService_1.ILogService),
    __param(2, githubService_1.IOctoKitService)
], ChatSessionsContrib);
//# sourceMappingURL=chatSessions.js.map