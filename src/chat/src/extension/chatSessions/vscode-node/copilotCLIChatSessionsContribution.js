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
var CopilotCLIWorktreeManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotCLIChatSessionParticipant = exports.CopilotCLIChatSessionContentProvider = exports.CopilotCLIChatSessionItemProvider = exports.CopilotCLIWorktreeManager = void 0;
exports.registerCLIChatCommands = registerCLIChatCommands;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const runCommandExecutionService_1 = require("../../../platform/commands/common/runCommandExecutionService");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const gitService_1 = require("../../../platform/git/common/gitService");
const utils_1 = require("../../../platform/git/common/utils");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/vs/base/common/async");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const copilotCli_1 = require("../../agents/copilotcli/node/copilotCli");
const copilotcliSessionService_1 = require("../../agents/copilotcli/node/copilotcliSessionService");
const permissionHelpers_1 = require("../../agents/copilotcli/node/permissionHelpers");
const toolsService_1 = require("../../tools/common/toolsService");
const copilotCLITerminalIntegration_1 = require("./copilotCLITerminalIntegration");
const copilotCloudSessionsProvider_1 = require("./copilotCloudSessionsProvider");
const MODELS_OPTION_ID = 'model';
const ISOLATION_OPTION_ID = 'isolation';
// Track model selections per session
// TODO@rebornix: we should have proper storage for the session model preference (revisit with API)
const _sessionModel = new Map();
let CopilotCLIWorktreeManager = class CopilotCLIWorktreeManager {
    static { CopilotCLIWorktreeManager_1 = this; }
    static { this.COPILOT_CLI_DEFAULT_ISOLATION_MEMENTO_KEY = 'puku.cli.sessionIsolation'; }
    static { this.COPILOT_CLI_SESSION_WORKTREE_MEMENTO_KEY = 'puku.cli.sessionWorktrees'; }
    constructor(extensionContext, commandExecutionService) {
        this.extensionContext = extensionContext;
        this.commandExecutionService = commandExecutionService;
        this._sessionIsolation = new Map();
        this._sessionWorktrees = new Map();
    }
    async createWorktree(stream) {
        return new Promise((resolve) => {
            stream.progress(vscode.l10n.t('Creating isolated worktree for Copilot CLI session...'), async (progress) => {
                try {
                    const worktreePath = await this.commandExecutionService.executeCommand('git.createWorktreeWithDefaults');
                    if (worktreePath) {
                        resolve(worktreePath);
                        return vscode.l10n.t('Created isolated worktree at {0}', worktreePath);
                    }
                    else {
                        progress.report(new vscode.ChatResponseWarningPart(vscode.l10n.t('Failed to create worktree for isolation, using default workspace directory')));
                    }
                }
                catch (error) {
                    progress.report(new vscode.ChatResponseWarningPart(vscode.l10n.t('Error creating worktree for isolation: {0}', error instanceof Error ? error.message : String(error))));
                }
                resolve(undefined);
            });
        });
    }
    async storeWorktreePath(sessionId, workingDirectory) {
        this._sessionWorktrees.set(sessionId, workingDirectory);
        const sessionWorktrees = this.extensionContext.globalState.get(CopilotCLIWorktreeManager_1.COPILOT_CLI_SESSION_WORKTREE_MEMENTO_KEY, {});
        sessionWorktrees[sessionId] = workingDirectory;
        await this.extensionContext.globalState.update(CopilotCLIWorktreeManager_1.COPILOT_CLI_SESSION_WORKTREE_MEMENTO_KEY, sessionWorktrees);
    }
    getWorktreePath(sessionId) {
        let workingDirectory = this._sessionWorktrees.get(sessionId);
        if (!workingDirectory) {
            const sessionWorktrees = this.extensionContext.globalState.get(CopilotCLIWorktreeManager_1.COPILOT_CLI_SESSION_WORKTREE_MEMENTO_KEY, {});
            workingDirectory = sessionWorktrees[sessionId];
            if (workingDirectory) {
                this._sessionWorktrees.set(sessionId, workingDirectory);
            }
        }
        return workingDirectory;
    }
    getWorktreeRelativePath(sessionId) {
        const worktreePath = this.getWorktreePath(sessionId);
        if (!worktreePath) {
            return undefined;
        }
        // TODO@rebornix, @osortega: read the workingtree name from git extension
        const lastIndex = worktreePath.lastIndexOf('/');
        return worktreePath.substring(lastIndex + 1);
    }
    getIsolationPreference(sessionId) {
        if (!this._sessionIsolation.has(sessionId)) {
            const defaultIsolation = this.extensionContext.globalState.get(CopilotCLIWorktreeManager_1.COPILOT_CLI_DEFAULT_ISOLATION_MEMENTO_KEY, false);
            this._sessionIsolation.set(sessionId, defaultIsolation);
        }
        return this._sessionIsolation.get(sessionId) ?? false;
    }
    async setIsolationPreference(sessionId, enabled) {
        this._sessionIsolation.set(sessionId, enabled);
        await this.extensionContext.globalState.update(CopilotCLIWorktreeManager_1.COPILOT_CLI_DEFAULT_ISOLATION_MEMENTO_KEY, enabled);
    }
};
exports.CopilotCLIWorktreeManager = CopilotCLIWorktreeManager;
exports.CopilotCLIWorktreeManager = CopilotCLIWorktreeManager = CopilotCLIWorktreeManager_1 = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, runCommandExecutionService_1.IRunCommandExecutionService)
], CopilotCLIWorktreeManager);
var SessionIdForCLI;
(function (SessionIdForCLI) {
    function getResource(sessionId) {
        return vscode.Uri.from({
            scheme: 'copilotcli', path: `/${sessionId}`,
        });
    }
    SessionIdForCLI.getResource = getResource;
    function parse(resource) {
        return resource.path.slice(1);
    }
    SessionIdForCLI.parse = parse;
})(SessionIdForCLI || (SessionIdForCLI = {}));
/**
 * Escape XML special characters
 */
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
let CopilotCLIChatSessionItemProvider = class CopilotCLIChatSessionItemProvider extends lifecycle_1.Disposable {
    constructor(worktreeManager, copilotcliSessionService, terminalIntegration, gitService, commandExecutionService) {
        super();
        this.worktreeManager = worktreeManager;
        this.copilotcliSessionService = copilotcliSessionService;
        this.terminalIntegration = terminalIntegration;
        this.gitService = gitService;
        this.commandExecutionService = commandExecutionService;
        this._onDidChangeChatSessionItems = this._register(new event_1.Emitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._onDidCommitChatSessionItem = this._register(new event_1.Emitter());
        this.onDidCommitChatSessionItem = this._onDidCommitChatSessionItem.event;
        this._register(this.terminalIntegration);
        this._register(this.copilotcliSessionService.onDidChangeSessions(() => {
            this.refresh();
        }));
    }
    refresh() {
        this._onDidChangeChatSessionItems.fire();
    }
    swap(original, modified) {
        this._onDidCommitChatSessionItem.fire({ original, modified });
    }
    async provideChatSessionItems(token) {
        const sessions = await this.copilotcliSessionService.getAllSessions(token);
        const diskSessions = await Promise.all(sessions.map(async (session) => this._toChatSessionItem(session)));
        const count = diskSessions.length;
        this.commandExecutionService.executeCommand('setContext', 'puku.chat.cliSessionsEmpty', count === 0);
        return diskSessions;
    }
    async _toChatSessionItem(session) {
        const resource = SessionIdForCLI.getResource(session.id);
        const worktreePath = this.worktreeManager.getWorktreePath(session.id);
        const worktreeRelativePath = this.worktreeManager.getWorktreeRelativePath(session.id);
        const label = session.label ?? vscode.l10n.t('Background Agent Session');
        const tooltipLines = [vscode.l10n.t(`Background agent session: {0}`, label)];
        let description;
        let statistics;
        if (worktreePath && worktreeRelativePath) {
            // Description
            description = new vscode.MarkdownString(`$(list-tree) ${worktreeRelativePath}`);
            description.supportThemeIcons = true;
            // Tooltip
            tooltipLines.push(vscode.l10n.t(`Worktree: {0}`, worktreeRelativePath));
            // Statistics
            statistics = await this.gitService.diffIndexWithHEADShortStats(vscode_1.Uri.file(worktreePath));
        }
        const status = session.status ?? vscode.ChatSessionStatus.Completed;
        return {
            resource,
            label,
            description,
            tooltip: tooltipLines.join('\n'),
            timing: { startTime: session.timestamp.getTime() },
            statistics,
            status
        };
    }
    async createCopilotCLITerminal() {
        // TODO@rebornix should be set by CLI
        const terminalName = process.env.COPILOTCLI_TERMINAL_TITLE || vscode.l10n.t('Copilot CLI');
        await this.terminalIntegration.openTerminal(terminalName);
    }
    async resumeCopilotCLISessionInTerminal(sessionItem) {
        const id = SessionIdForCLI.parse(sessionItem.resource);
        const terminalName = sessionItem.label || id;
        const cliArgs = ['--resume', id];
        await this.terminalIntegration.openTerminal(terminalName, cliArgs);
    }
};
exports.CopilotCLIChatSessionItemProvider = CopilotCLIChatSessionItemProvider;
exports.CopilotCLIChatSessionItemProvider = CopilotCLIChatSessionItemProvider = __decorate([
    __param(1, copilotcliSessionService_1.ICopilotCLISessionService),
    __param(2, copilotCLITerminalIntegration_1.ICopilotCLITerminalIntegration),
    __param(3, gitService_1.IGitService),
    __param(4, runCommandExecutionService_1.IRunCommandExecutionService)
], CopilotCLIChatSessionItemProvider);
let CopilotCLIChatSessionContentProvider = class CopilotCLIChatSessionContentProvider {
    constructor(worktreeManager, copilotCLIModels, sessionService, configurationService) {
        this.worktreeManager = worktreeManager;
        this.copilotCLIModels = copilotCLIModels;
        this.sessionService = sessionService;
        this.configurationService = configurationService;
    }
    async provideChatSessionContent(resource, token) {
        const [models, defaultModel] = await Promise.all([
            this.copilotCLIModels.getAvailableModels(),
            this.copilotCLIModels.getDefaultModel()
        ]);
        const copilotcliSessionId = SessionIdForCLI.parse(resource);
        const preferredModelId = _sessionModel.get(copilotcliSessionId)?.id;
        const preferredModel = (preferredModelId ? models.find(m => m.id === preferredModelId) : undefined) ?? defaultModel;
        const workingDirectory = this.worktreeManager.getWorktreePath(copilotcliSessionId);
        const isolationEnabled = this.worktreeManager.getIsolationPreference(copilotcliSessionId);
        const existingSession = await this.sessionService.getSession(copilotcliSessionId, { workingDirectory, isolationEnabled, readonly: true }, token);
        const selectedModelId = await existingSession?.object?.getSelectedModelId();
        const selectedModel = selectedModelId ? models.find(m => m.id === selectedModelId) : undefined;
        const options = {
            [MODELS_OPTION_ID]: _sessionModel.get(copilotcliSessionId)?.id ?? defaultModel.id,
        };
        if (!existingSession && this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.CLIIsolationEnabled)) {
            options[ISOLATION_OPTION_ID] = isolationEnabled ? 'enabled' : 'disabled';
        }
        const history = existingSession?.object?.getChatHistory() || [];
        existingSession?.dispose();
        if (!_sessionModel.get(copilotcliSessionId)) {
            _sessionModel.set(copilotcliSessionId, selectedModel ?? preferredModel);
        }
        return {
            history,
            activeResponseCallback: undefined,
            requestHandler: undefined,
            options: options
        };
    }
    async provideChatSessionProviderOptions() {
        return {
            optionGroups: [
                {
                    id: MODELS_OPTION_ID,
                    name: 'Model',
                    description: 'Select the language model to use',
                    items: await this.copilotCLIModels.getAvailableModels()
                },
                {
                    id: ISOLATION_OPTION_ID,
                    name: 'Isolation',
                    description: 'Enable worktree isolation for this session',
                    items: [
                        { id: 'enabled', name: 'Isolated' },
                        { id: 'disabled', name: 'Workspace' }
                    ]
                }
            ]
        };
    }
    // Handle option changes for a session (store current state in a map)
    async provideHandleOptionsChange(resource, updates, token) {
        const sessionId = SessionIdForCLI.parse(resource);
        const models = await this.copilotCLIModels.getAvailableModels();
        for (const update of updates) {
            if (update.optionId === MODELS_OPTION_ID) {
                if (typeof update.value === 'undefined') {
                    _sessionModel.set(sessionId, undefined);
                }
                else {
                    const model = models.find(m => m.id === update.value);
                    _sessionModel.set(sessionId, model);
                    // Persist the user's choice to global state
                    if (model) {
                        this.copilotCLIModels.setDefaultModel(model);
                    }
                }
            }
            else if (update.optionId === ISOLATION_OPTION_ID) {
                // Handle isolation option changes
                await this.worktreeManager.setIsolationPreference(sessionId, update.value === 'enabled');
            }
        }
    }
};
exports.CopilotCLIChatSessionContentProvider = CopilotCLIChatSessionContentProvider;
exports.CopilotCLIChatSessionContentProvider = CopilotCLIChatSessionContentProvider = __decorate([
    __param(1, copilotCli_1.ICopilotCLIModels),
    __param(2, copilotcliSessionService_1.ICopilotCLISessionService),
    __param(3, configurationService_1.IConfigurationService)
], CopilotCLIChatSessionContentProvider);
const WAIT_FOR_NEW_SESSION_TO_GET_USED = 5 * 60 * 1000; // 5 minutes
let CopilotCLIChatSessionParticipant = class CopilotCLIChatSessionParticipant extends lifecycle_1.Disposable {
    constructor(promptResolver, sessionItemProvider, cloudSessionProvider, summarizer, worktreeManager, gitService, copilotCLIModels, sessionService, telemetryService, toolsService, commandExecutionService, workspaceService, instantiationService) {
        super();
        this.promptResolver = promptResolver;
        this.sessionItemProvider = sessionItemProvider;
        this.cloudSessionProvider = cloudSessionProvider;
        this.summarizer = summarizer;
        this.worktreeManager = worktreeManager;
        this.gitService = gitService;
        this.copilotCLIModels = copilotCLIModels;
        this.sessionService = sessionService;
        this.telemetryService = telemetryService;
        this.toolsService = toolsService;
        this.commandExecutionService = commandExecutionService;
        this.workspaceService = workspaceService;
        this.instantiationService = instantiationService;
    }
    createHandler() {
        return this.handleRequest.bind(this);
    }
    async handleRequest(request, context, stream, token) {
        const { chatSessionContext } = context;
        const disposables = new lifecycle_1.DisposableStore();
        try {
            /* __GDPR__
                "copilotcli.chat.invoke" : {
                    "owner": "joshspicer",
                    "comment": "Event sent when a CopilotCLI chat request is made.",
                    "hasChatSessionItem": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Invoked with a chat session item." },
                    "isUntitled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates if the chat session is untitled." },
                    "hasDelegatePrompt": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates if the prompt is a /delegate command." }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('copilotcli.chat.invoke', {
                hasChatSessionItem: String(!!chatSessionContext?.chatSessionItem),
                isUntitled: String(chatSessionContext?.isUntitled),
                hasDelegatePrompt: String(request.prompt.startsWith('/delegate'))
            });
            const confirmationResults = this.getAcceptedRejectedConfirmationData(request);
            if (!chatSessionContext) {
                if (confirmationResults.length) {
                    stream.warning(vscode.l10n.t('No chat session context available for confirmation data handling.'));
                    return {};
                }
                /* Invoked from a 'normal' chat or 'cloud button' without CLI session context */
                // Handle confirmation data
                return await this.handlePushConfirmationData(request, context, token);
            }
            const isUntitled = chatSessionContext.isUntitled;
            const { resource } = chatSessionContext.chatSessionItem;
            const id = SessionIdForCLI.parse(resource);
            const [{ prompt, attachments }, modelId] = await Promise.all([
                this.promptResolver.resolvePrompt(request, token),
                this.getModelId(id)
            ]);
            const session = await this.getOrCreateSession(request, chatSessionContext, prompt, modelId, stream, disposables, token);
            if (!session) {
                return {};
            }
            if (isUntitled) {
                // The SDK doesn't save the session as no messages were added,
                // If we dispose this here, then we will not be able to find this session later.
                // So leave this session alive till it gets used using the `getSession` API later
                this._register((0, async_1.disposableTimeout)(() => session.dispose(), WAIT_FOR_NEW_SESSION_TO_GET_USED));
            }
            else {
                disposables.add(session);
            }
            if (!isUntitled && confirmationResults.length) {
                return await this.handleConfirmationData(session.object, request.prompt, confirmationResults, context, stream, token);
            }
            if (request.prompt.startsWith('/delegate')) {
                await this.handleDelegateCommand(session.object, request, context, stream, token);
            }
            else {
                await session.object.handleRequest(prompt, attachments, modelId, token);
            }
            if (isUntitled) {
                this.sessionItemProvider.swap(chatSessionContext.chatSessionItem, { resource: SessionIdForCLI.getResource(session.object.sessionId), label: request.prompt ?? 'CopilotCLI' });
            }
            return {};
        }
        finally {
            disposables.dispose();
        }
    }
    async getOrCreateSession(request, chatSessionContext, prompt, model, stream, disposables, token) {
        const { resource } = chatSessionContext.chatSessionItem;
        const id = SessionIdForCLI.parse(resource);
        const workingDirectory = chatSessionContext.isUntitled ?
            (this.worktreeManager.getIsolationPreference(id) ? await this.worktreeManager.createWorktree(stream) : await this.getDefaultWorkingDirectory()) :
            this.worktreeManager.getWorktreePath(id);
        const isolationEnabled = this.worktreeManager.getIsolationPreference(id);
        const session = chatSessionContext.isUntitled ?
            await this.sessionService.createSession(prompt, { model, workingDirectory, isolationEnabled }, token) :
            await this.sessionService.getSession(id, { model, workingDirectory, isolationEnabled, readonly: false }, token);
        if (!session) {
            stream.warning(vscode.l10n.t('Chat session not found.'));
            return undefined;
        }
        if (chatSessionContext.isUntitled && workingDirectory) {
            await this.worktreeManager.storeWorktreePath(session.object.sessionId, workingDirectory);
        }
        disposables.add(session.object.attachStream(stream));
        disposables.add(session.object.attachPermissionHandler(async (permissionRequest, toolCall, token) => (0, permissionHelpers_1.requestPermission)(this.instantiationService, permissionRequest, toolCall, this.toolsService, request.toolInvocationToken, token)));
        return session;
    }
    async getDefaultWorkingDirectory() {
        if (this.workspaceService.getWorkspaceFolders().length === 0) {
            return undefined;
        }
        if (this.workspaceService.getWorkspaceFolders().length === 1) {
            return this.workspaceService.getWorkspaceFolders()[0].fsPath;
        }
        const folder = await this.workspaceService.showWorkspaceFolderPicker();
        return folder?.uri?.fsPath;
    }
    async getModelId(sessionId) {
        const defaultModel = await this.copilotCLIModels.getDefaultModel();
        const preferredModel = _sessionModel.get(sessionId);
        // For existing sessions we cannot fall back, as the model info would be updated in _sessionModel
        return this.copilotCLIModels.toModelProvider(preferredModel?.id || defaultModel.id);
    }
    async handleDelegateCommand(session, request, context, stream, token) {
        if (!this.cloudSessionProvider) {
            stream.warning(vscode.l10n.t('No cloud agent available'));
            return;
        }
        // Check for uncommitted changes
        const currentRepository = this.gitService.activeRepository.get();
        const hasChanges = (currentRepository?.changes?.indexChanges && currentRepository.changes.indexChanges.length > 0);
        if (hasChanges) {
            stream.warning(vscode.l10n.t('You have uncommitted changes in your workspace. The cloud agent will start from the last committed state. Consider committing your changes first if you want to include them.'));
        }
        const history = await this.summarizer.provideChatSummary(context, token);
        const prompt = request.prompt.substring('/delegate'.length).trim();
        if (!await this.cloudSessionProvider.tryHandleUncommittedChanges({
            prompt: prompt,
            history: history,
            chatContext: context
        }, stream, token)) {
            const prInfo = await this.cloudSessionProvider.createDelegatedChatSession({
                prompt,
                history,
                chatContext: context
            }, stream, token);
            if (prInfo) {
                await this.recordPushToSession(session, request.prompt, prInfo);
            }
        }
    }
    getAcceptedRejectedConfirmationData(request) {
        const results = [];
        results.push(...(request.acceptedConfirmationData?.map(data => ({ step: data.step, accepted: true, metadata: data?.metadata })) ?? []));
        results.push(...((request.rejectedConfirmationData ?? []).filter(data => !results.some(r => r.step === data.step)).map(data => ({ step: data.step, accepted: false, metadata: data?.metadata }))));
        return results;
    }
    async handleConfirmationData(session, prompt, results, context, stream, token) {
        const uncommittedChangesData = results.find(data => data.step === copilotCloudSessionsProvider_1.UncommittedChangesStep);
        if (!uncommittedChangesData) {
            stream.warning(`Unknown confirmation step: ${results.map(r => r.step).join(', ')}\n\n`);
            return {};
        }
        if (!uncommittedChangesData.accepted || !uncommittedChangesData.metadata) {
            stream.markdown(vscode.l10n.t('Cloud agent delegation request cancelled.'));
            return {};
        }
        const prInfo = await this.cloudSessionProvider?.createDelegatedChatSession({
            prompt: uncommittedChangesData.metadata.prompt,
            history: uncommittedChangesData.metadata.history,
            chatContext: context
        }, stream, token);
        if (prInfo) {
            await this.recordPushToSession(session, prompt, prInfo);
        }
        return {};
    }
    async handlePushConfirmationData(request, context, token) {
        const prompt = request.prompt;
        const history = context.chatSummary?.history ?? await this.summarizer.provideChatSummary(context, token);
        const requestPrompt = history ? `${prompt}\n**Summary**\n${history}` : prompt;
        const session = await this.sessionService.createSession(requestPrompt, {}, token);
        try {
            await this.commandExecutionService.executeCommand('vscode.open', SessionIdForCLI.getResource(session.object.sessionId));
            await this.commandExecutionService.executeCommand('workbench.action.chat.submit', { inputValue: requestPrompt });
            return {};
        }
        finally {
            // The SDK doesn't save the session as no messages were added,
            // If we dispose this here, then we will not be able to find this session later.
            // So leave this session alive till it gets used using the `getSession` API later
            this._register((0, async_1.disposableTimeout)(() => session.dispose(), WAIT_FOR_NEW_SESSION_TO_GET_USED));
        }
    }
    async recordPushToSession(session, userPrompt, prInfo) {
        // Add user message event
        session.addUserMessage(userPrompt);
        // Add assistant message event with embedded PR metadata
        const assistantMessage = `GitHub Copilot cloud agent has begun working on your request. Follow its progress in the associated chat and pull request.\n<pr_metadata uri="${prInfo.uri}" title="${escapeXml(prInfo.title)}" description="${escapeXml(prInfo.description)}" author="${escapeXml(prInfo.author)}" linkTag="${escapeXml(prInfo.linkTag)}"/>`;
        session.addUserAssistantMessage(assistantMessage);
    }
};
exports.CopilotCLIChatSessionParticipant = CopilotCLIChatSessionParticipant;
exports.CopilotCLIChatSessionParticipant = CopilotCLIChatSessionParticipant = __decorate([
    __param(5, gitService_1.IGitService),
    __param(6, copilotCli_1.ICopilotCLIModels),
    __param(7, copilotcliSessionService_1.ICopilotCLISessionService),
    __param(8, telemetry_1.ITelemetryService),
    __param(9, toolsService_1.IToolsService),
    __param(10, runCommandExecutionService_1.IRunCommandExecutionService),
    __param(11, workspaceService_1.IWorkspaceService),
    __param(12, instantiation_1.IInstantiationService)
], CopilotCLIChatSessionParticipant);
function registerCLIChatCommands(copilotcliSessionItemProvider, copilotCLISessionService, gitService) {
    const disposableStore = new lifecycle_1.DisposableStore();
    disposableStore.add(vscode.commands.registerCommand('puku.copilotcli.sessions.refresh', () => {
        copilotcliSessionItemProvider.refresh();
    }));
    disposableStore.add(vscode.commands.registerCommand('puku.cli.sessions.refresh', () => {
        copilotcliSessionItemProvider.refresh();
    }));
    disposableStore.add(vscode.commands.registerCommand('puku.cli.sessions.delete', async (sessionItem) => {
        if (sessionItem?.resource) {
            const id = SessionIdForCLI.parse(sessionItem.resource);
            const worktreePath = copilotcliSessionItemProvider.worktreeManager.getWorktreePath(id);
            const confirmMessage = worktreePath
                ? vscode_1.l10n.t('Are you sure you want to delete the session and its associated worktree?')
                : vscode_1.l10n.t('Are you sure you want to delete the session?');
            const deleteLabel = vscode_1.l10n.t('Delete');
            const result = await vscode.window.showWarningMessage(confirmMessage, { modal: true }, deleteLabel);
            if (result === deleteLabel) {
                await copilotCLISessionService.deleteSession(id);
                if (worktreePath) {
                    try {
                        await vscode.commands.executeCommand('git.deleteWorktree', vscode_1.Uri.file(worktreePath));
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(vscode.l10n.t('Failed to delete worktree: {0}', error instanceof Error ? error.message : String(error)));
                    }
                }
                copilotcliSessionItemProvider.refresh();
            }
        }
    }));
    disposableStore.add(vscode.commands.registerCommand('puku.cli.sessions.resumeInTerminal', async (sessionItem) => {
        if (sessionItem?.resource) {
            await copilotcliSessionItemProvider.resumeCopilotCLISessionInTerminal(sessionItem);
        }
    }));
    disposableStore.add(vscode.commands.registerCommand('puku.cli.sessions.newTerminalSession', async () => {
        await copilotcliSessionItemProvider.createCopilotCLITerminal();
    }));
    disposableStore.add(vscode.commands.registerCommand('agentSession.copilotcli.openChanges', async (sessionItemResource) => {
        if (!sessionItemResource) {
            return;
        }
        const sessionId = SessionIdForCLI.parse(sessionItemResource);
        const sessionWorktree = copilotcliSessionItemProvider.worktreeManager.getWorktreePath(sessionId);
        const sessionWorktreeName = copilotcliSessionItemProvider.worktreeManager.getWorktreeRelativePath(sessionId);
        if (!sessionWorktree || !sessionWorktreeName) {
            return;
        }
        const repository = await gitService.getRepository(vscode_1.Uri.file(sessionWorktree));
        if (!repository?.changes) {
            return;
        }
        const title = vscode.l10n.t('Copilot CLI ({0})', sessionWorktreeName);
        const multiDiffSourceUri = vscode_1.Uri.parse(`copilotcli-worktree-changes:/${sessionId}`);
        const resources = repository.changes.indexChanges.map(change => {
            switch (change.status) {
                case 1 /* Status.INDEX_ADDED */:
                    return {
                        originalUri: undefined,
                        modifiedUri: change.uri
                    };
                case 2 /* Status.INDEX_DELETED */:
                    return {
                        originalUri: (0, utils_1.toGitUri)(change.uri, 'HEAD'),
                        modifiedUri: undefined
                    };
                default:
                    return {
                        originalUri: (0, utils_1.toGitUri)(change.uri, 'HEAD'),
                        modifiedUri: change.uri
                    };
            }
        });
        await vscode.commands.executeCommand('_workbench.openMultiDiffEditor', { multiDiffSourceUri, title, resources });
    }));
    disposableStore.add(vscode.commands.registerCommand('puku.chat.applyCopilotCLIAgentSessionChanges', async (sessionItemResource) => {
        if (!sessionItemResource) {
            return;
        }
        const sessionId = SessionIdForCLI.parse(sessionItemResource);
        const sessionWorktree = copilotcliSessionItemProvider.worktreeManager.getWorktreePath(sessionId);
        if (!sessionWorktree) {
            return;
        }
        const sessionWorktreeUri = vscode_1.Uri.file(sessionWorktree);
        const activeRepository = gitService.activeRepository.get();
        if (!activeRepository) {
            return;
        }
        // Migrate the changes, and close the active multi-file diff editor
        await vscode.commands.executeCommand('git.migrateWorktreeChanges', activeRepository.rootUri, sessionWorktreeUri);
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }));
    return disposableStore;
}
//# sourceMappingURL=copilotCLIChatSessionsContribution.js.map