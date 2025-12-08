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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CopilotCloudSessionsProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotCloudSessionsProvider = exports.UncommittedChangesStep = void 0;
const markdown_it_1 = __importDefault(require("markdown-it"));
const pathLib = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const authentication_1 = require("../../../platform/authentication/common/authentication");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const logService_1 = require("../../../platform/log/common/logService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const copilotCodingAgentUtils_1 = require("../vscode/copilotCodingAgentUtils");
const copilotCloudSessionContentBuilder_1 = require("./copilotCloudSessionContentBuilder");
const pullRequestFileChangesService_1 = require("./pullRequestFileChangesService");
exports.UncommittedChangesStep = 'uncommitted-changes';
const AGENTS_OPTION_GROUP_ID = 'agents';
const DEFAULT_AGENT_ID = '___vscode_default___';
const BACKGROUND_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Custom renderer for markdown-it that converts markdown to plain text
 */
class PlainTextRenderer {
    constructor() {
        this.md = new markdown_it_1.default();
    }
    /**
     * Renders markdown text as plain text by extracting text content from all tokens
     */
    render(markdown) {
        const tokens = this.md.parse(markdown, {});
        return this.renderTokens(tokens).trim();
    }
    renderTokens(tokens) {
        let result = '';
        for (const token of tokens) {
            // Process child tokens recursively
            if (token.children) {
                result += this.renderTokens(token.children);
            }
            // Handle different token types
            switch (token.type) {
                case 'text':
                case 'code_inline':
                    // Only add content if no children were processed
                    if (!token.children) {
                        result += token.content;
                    }
                    break;
                case 'softbreak':
                case 'hardbreak':
                    result += ' '; // Space instead of newline to match original
                    break;
                case 'paragraph_close':
                    result += '\n'; // Newline after paragraphs for separation
                    break;
                case 'heading_close':
                    result += '\n'; // Newline after headings
                    break;
                case 'list_item_close':
                    result += '\n'; // Newline after list items
                    break;
                case 'fence':
                case 'code_block':
                case 'hr':
                    // Skip these entirely
                    break;
                // Don't add default case - only explicitly handle what we want
            }
        }
        return result;
    }
}
let CopilotCloudSessionsProvider = class CopilotCloudSessionsProvider extends lifecycle_1.Disposable {
    static { CopilotCloudSessionsProvider_1 = this; }
    static { this.TYPE = 'copilot-cloud-agent'; }
    constructor(_octoKitService, _gitService, telemetry, logService, _gitExtensionService, _prFileChangesService, _authenticationService) {
        super();
        this._octoKitService = _octoKitService;
        this._gitService = _gitService;
        this.telemetry = telemetry;
        this.logService = logService;
        this._gitExtensionService = _gitExtensionService;
        this._prFileChangesService = _prFileChangesService;
        this._authenticationService = _authenticationService;
        this.DELEGATE_MODAL_DETAILS = vscode.l10n.t('The agent will work asynchronously to create a pull request with your requested changes. This chat\'s history will be summarized and appended to the pull request as context.');
        this._onDidChangeChatSessionItems = this._register(new vscode.EventEmitter());
        this.onDidChangeChatSessionItems = this._onDidChangeChatSessionItems.event;
        this._onDidCommitChatSessionItem = this._register(new vscode.EventEmitter());
        this.onDidCommitChatSessionItem = this._onDidCommitChatSessionItem.event;
        this.chatSessions = new Map();
        this.sessionAgentMap = new map_1.ResourceMap();
        this.sessionReferencesMap = new map_1.ResourceMap();
        this.chatParticipant = vscode.chat.createChatParticipant(CopilotCloudSessionsProvider_1.TYPE, async (request, context, stream, token) => await this.chatParticipantImpl(request, context, stream, token));
        this.cachedSessionsSize = 0;
        this.plainTextRenderer = new PlainTextRenderer();
        const interval = setInterval(async () => {
            const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
            if (repoId) {
                // TODO: handle no auth token case more gracefully
                if (!this._authenticationService.permissiveGitHubSession) {
                    return;
                }
                const sessions = await this._octoKitService.getAllOpenSessions(`${repoId.org}/${repoId.repo}`);
                if (this.cachedSessionsSize !== sessions.length) {
                    this.refresh();
                }
            }
        }, BACKGROUND_REFRESH_INTERVAL_MS);
        this._register((0, lifecycle_1.toDisposable)(() => clearInterval(interval)));
        this._register(this._authenticationService.onDidAuthenticationChange(() => {
            this.refresh();
        }));
    }
    refresh() {
        this._onDidChangeChatSessionItems.fire();
    }
    async provideChatSessionProviderOptions(token) {
        const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
        if (!repoId) {
            return { optionGroups: [] };
        }
        // TODO: handle no auth token case more gracefully
        if (!this._authenticationService.permissiveGitHubSession) {
            return { optionGroups: [] };
        }
        try {
            const customAgents = await this._octoKitService.getCustomAgents(repoId.org, repoId.repo);
            const agentItems = [
                { id: DEFAULT_AGENT_ID, name: vscode.l10n.t('Default Agent') },
                ...customAgents.map(agent => ({
                    id: agent.name,
                    name: agent.display_name || agent.name
                }))
            ];
            return {
                optionGroups: [
                    {
                        id: AGENTS_OPTION_GROUP_ID,
                        name: vscode.l10n.t('Custom Agents'),
                        description: vscode.l10n.t('Select which agent to use'),
                        items: agentItems,
                    }
                ]
            };
        }
        catch (error) {
            this.logService.error(`Error fetching custom agents: ${error}`);
            return { optionGroups: [] };
        }
    }
    provideHandleOptionsChange(resource, updates, token) {
        for (const update of updates) {
            if (update.optionId === AGENTS_OPTION_GROUP_ID) {
                if (update.value) {
                    this.sessionAgentMap.set(resource, update.value);
                    this.logService.info(`Agent changed for session ${resource}: ${update.value}`);
                }
                else {
                    this.sessionAgentMap.delete(resource);
                    this.logService.info(`Agent cleared for session ${resource}`);
                }
            }
        }
    }
    async provideChatSessionItems(token) {
        if (this.chatSessionItemsPromise) {
            return this.chatSessionItemsPromise;
        }
        this.chatSessionItemsPromise = (async () => {
            const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
            if (!repoId) {
                return [];
            }
            // TODO: handle no auth token case more gracefully
            if (!this._authenticationService.permissiveGitHubSession) {
                return [];
            }
            const sessions = await this._octoKitService.getAllOpenSessions(`${repoId.org}/${repoId.repo}`);
            this.cachedSessionsSize = sessions.length;
            // Group sessions by resource_id and keep only the latest per resource_id
            const latestSessionsMap = new Map();
            for (const session of sessions) {
                const existing = latestSessionsMap.get(session.resource_id);
                if (!existing || this.shouldPushSession(session, existing)) {
                    latestSessionsMap.set(session.resource_id, session);
                }
            }
            // Fetch PRs for all unique resource_global_ids in parallel
            const uniqueGlobalIds = new Set(Array.from(latestSessionsMap.values()).map(s => s.resource_global_id));
            const prFetches = Array.from(uniqueGlobalIds).map(async (globalId) => {
                const pr = await this._octoKitService.getPullRequestFromGlobalId(globalId);
                return { globalId, pr };
            });
            const prResults = await Promise.all(prFetches);
            const prMap = new Map(prResults.filter(r => r.pr).map(r => [r.globalId, r.pr]));
            // Create session items from latest sessions
            const sessionItems = await Promise.all(Array.from(latestSessionsMap.values()).map(async (sessionItem) => {
                const pr = prMap.get(sessionItem.resource_global_id);
                if (!pr) {
                    return undefined;
                }
                const session = {
                    resource: vscode.Uri.from({ scheme: CopilotCloudSessionsProvider_1.TYPE, path: '/' + pr.number }),
                    label: pr.title,
                    status: this.getSessionStatusFromSession(sessionItem),
                    description: this.getPullRequestDescription(pr),
                    tooltip: this.createPullRequestTooltip(pr),
                    timing: {
                        startTime: new Date(sessionItem.created_at).getTime(),
                        endTime: sessionItem.completed_at ? new Date(sessionItem.completed_at).getTime() : undefined
                    },
                    statistics: {
                        files: pr.files.totalCount,
                        insertions: pr.additions,
                        deletions: pr.deletions
                    },
                    fullDatabaseId: pr.fullDatabaseId.toString(),
                    pullRequestDetails: pr,
                };
                this.chatSessions.set(pr.number, pr);
                return session;
            }));
            const filteredSessions = sessionItems
                // Remove any undefined sessions
                .filter(item => item !== undefined)
                // Only keep sessions with attached PRs not CLOSED or MERGED
                .filter(item => {
                const pr = item.pullRequestDetails;
                const state = pr.state.toUpperCase();
                return state !== 'CLOSED' && state !== 'MERGED';
            });
            vscode.commands.executeCommand('setContext', 'puku.chat.cloudSessionsEmpty', filteredSessions.length === 0);
            return filteredSessions;
        })().finally(() => {
            this.chatSessionItemsPromise = undefined;
        });
        return this.chatSessionItemsPromise;
    }
    shouldPushSession(sessionItem, existing) {
        if (!existing) {
            return true;
        }
        const existingDate = new Date(existing.last_updated_at);
        const newDate = new Date(sessionItem.last_updated_at);
        return newDate > existingDate;
    }
    async provideChatSessionContent(resource, token) {
        const indexedSessionId = copilotCodingAgentUtils_1.SessionIdForPr.parse(resource);
        let pullRequestNumber;
        if (indexedSessionId) {
            pullRequestNumber = indexedSessionId.prNumber;
        }
        if (typeof pullRequestNumber === 'undefined') {
            pullRequestNumber = copilotCodingAgentUtils_1.SessionIdForPr.parsePullRequestNumber(resource);
            if (isNaN(pullRequestNumber)) {
                this.logService.error(`Invalid pull request number: ${resource}`);
                return this.createEmptySession(resource);
            }
        }
        const pr = await this.findPR(pullRequestNumber);
        const getProblemStatement = async (sessions) => {
            if (sessions.length === 0) {
                return undefined;
            }
            const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
            if (!repoId) {
                return undefined;
            }
            const jobInfo = await this._octoKitService.getJobBySessionId(repoId.org, repoId.repo, sessions[0].id, 'vscode-copilot-chat');
            let prompt = jobInfo?.problem_statement || 'Initial Implementation';
            const titleMatch = prompt.match(/TITLE: \s*(.*)/i);
            if (titleMatch && titleMatch[1]) {
                prompt = titleMatch[1].trim();
            }
            else {
                const split = prompt.split('\n');
                if (split.length > 0) {
                    prompt = split[0].trim();
                }
            }
            return prompt.replace(/@copilot\s*/gi, '').trim();
        };
        if (!pr) {
            this.logService.error(`Session not found for ID: ${resource}`);
            return this.createEmptySession(resource);
        }
        const sessions = await this._octoKitService.getCopilotSessionsForPR(pr.fullDatabaseId.toString());
        const sortedSessions = sessions
            .filter((session, index, array) => array.findIndex(s => s.id === session.id) === index)
            .slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        // Get stored references for this session
        const storedReferences = this.sessionReferencesMap.get(resource);
        const sessionContentBuilder = new copilotCloudSessionContentBuilder_1.ChatSessionContentBuilder(CopilotCloudSessionsProvider_1.TYPE, this._gitService, this._prFileChangesService);
        const history = await sessionContentBuilder.buildSessionHistory(getProblemStatement(sortedSessions), sortedSessions, pr, (sessionId) => this._octoKitService.getSessionLogs(sessionId), storedReferences);
        const selectedAgent = 
        // Local cache of session -> custom agent
        this.sessionAgentMap.get(resource)
            // Query for the sub-agent that the remote reports for this session
            || undefined; /* TODO: Needs API to support this. */
        return {
            history,
            options: selectedAgent ? { [AGENTS_OPTION_GROUP_ID]: selectedAgent } : undefined,
            activeResponseCallback: this.findActiveResponseCallback(sessions, pr),
            requestHandler: undefined
        };
    }
    async openSessionsInBrowser(chatSessionItem) {
        const session = copilotCodingAgentUtils_1.SessionIdForPr.parse(chatSessionItem.resource);
        let prNumber = session?.prNumber;
        if (typeof prNumber === 'undefined' || isNaN(prNumber)) {
            prNumber = copilotCodingAgentUtils_1.SessionIdForPr.parsePullRequestNumber(chatSessionItem.resource);
            if (isNaN(prNumber)) {
                vscode.window.showErrorMessage(vscode.l10n.t('Invalid pull request number: {0}', chatSessionItem.resource));
                this.logService.error(`Invalid pull request number: ${chatSessionItem.resource}`);
                return;
            }
        }
        const pr = await this.findPR(prNumber);
        if (!pr) {
            vscode.window.showErrorMessage(vscode.l10n.t('Could not find pull request #{0}', prNumber));
            this.logService.error(`Could not find pull request #${prNumber}`);
            return;
        }
        const url = `https://github.com/copilot/tasks/pull/${pr.id}`;
        await vscode.env.openExternal(vscode.Uri.parse(url));
    }
    async openChanges(chatSessionItemResource) {
        const session = copilotCodingAgentUtils_1.SessionIdForPr.parse(chatSessionItemResource);
        let prNumber = session?.prNumber;
        if (typeof prNumber === 'undefined' || isNaN(prNumber)) {
            prNumber = copilotCodingAgentUtils_1.SessionIdForPr.parsePullRequestNumber(chatSessionItemResource);
            if (isNaN(prNumber)) {
                vscode.window.showErrorMessage(vscode.l10n.t('Could not parse PR number from session resource'));
                this.logService.error(`Could not parse PR number from session resource: ${chatSessionItemResource}`);
                return;
            }
        }
        const pr = await this.findPR(prNumber);
        if (!pr) {
            vscode.window.showErrorMessage(vscode.l10n.t('Could not find pull request #{0}', prNumber));
            this.logService.error(`Could not find pull request #${prNumber}`);
            return;
        }
        const multiDiffPart = await this._prFileChangesService.getFileChangesMultiDiffPart(pr);
        if (!multiDiffPart) {
            vscode.window.showWarningMessage(vscode.l10n.t('No file changes found for pull request #{0}', prNumber));
            this.logService.warn(`No file changes found for PR #${prNumber}`);
            return;
        }
        await vscode.commands.executeCommand('_workbench.openMultiDiffEditor', {
            multiDiffSourceUri: vscode.Uri.parse(`copilotcloud-pr-changes:/${prNumber}`),
            title: vscode.l10n.t('Pull Request #{0}', prNumber),
            resources: multiDiffPart.value
        });
    }
    findActiveResponseCallback(sessions, pr) {
        // Only the latest in-progress session gets activeResponseCallback
        const pendingSession = sessions
            .slice()
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .find(session => session.state === 'in_progress' || session.state === 'queued');
        if (pendingSession) {
            return this.createActiveResponseCallback(pr, pendingSession.id);
        }
        return undefined;
    }
    createActiveResponseCallback(pr, sessionId) {
        return async (stream, token) => {
            await this.waitForQueuedToInProgress(sessionId, token);
            return this.streamSessionLogs(stream, pr, sessionId, token);
        };
    }
    createEmptySession(resource) {
        const sessionId = resource ? resource.path.slice(1) : undefined;
        return {
            history: [],
            ...(sessionId && sessionId.startsWith('untitled-')
                ? {
                    options: {
                        [AGENTS_OPTION_GROUP_ID]: this.sessionAgentMap.get(resource)
                            ?? (this.sessionAgentMap.set(resource, DEFAULT_AGENT_ID), DEFAULT_AGENT_ID)
                    }
                }
                : {}),
            requestHandler: undefined
        };
    }
    async findPR(prNumber) {
        let pr = this.chatSessions.get(prNumber);
        if (pr) {
            return pr;
        }
        const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
        if (!repoId) {
            this.logService.warn('Failed to determine GitHub repo from workspace');
            return undefined;
        }
        const pullRequests = await this._octoKitService.getCopilotPullRequestsForUser(repoId.org, repoId.repo);
        pr = pullRequests.find(pr => pr.number === prNumber);
        if (!pr) {
            this.logService.warn(`Pull request not found for number: ${prNumber}`);
            return undefined;
        }
        return pr;
    }
    getSessionStatusFromSession(session) {
        // Map session state to ChatSessionStatus
        switch (session.state) {
            case 'failed':
                return vscode.ChatSessionStatus.Failed;
            case 'in_progress':
            case 'queued':
                return vscode.ChatSessionStatus.InProgress;
            case 'completed':
                return vscode.ChatSessionStatus.Completed;
            default:
                return vscode.ChatSessionStatus.Completed;
        }
    }
    getPullRequestDescription(pr) {
        let descriptionText;
        switch (pr.state) {
            case 'failed':
                descriptionText = vscode.l10n.t('$(git-pull-request) Failed in PR {0}', `#${pr.number}`);
                break;
            case 'in_progress':
                descriptionText = vscode.l10n.t('$(git-pull-request) In progress in PR {0}', `#${pr.number}`);
                break;
            case 'queued':
                descriptionText = vscode.l10n.t('$(git-pull-request) Queued in PR {0}', `#${pr.number}`);
                break;
            default:
                descriptionText = vscode.l10n.t('$(git-pull-request) Finished in PR {0}', `#${pr.number}`);
                break;
        }
        const description = new vscode.MarkdownString(descriptionText);
        description.supportThemeIcons = true;
        return description;
    }
    createPullRequestTooltip(pr) {
        const markdown = new vscode.MarkdownString(undefined, true);
        markdown.supportHtml = true;
        // Repository and date
        const date = new Date(pr.createdAt);
        const ownerName = `${pr.repository.owner.login}/${pr.repository.name}`;
        markdown.appendMarkdown(`[${ownerName}](https://github.com/${ownerName}) on ${date.toLocaleString('default', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })}  \n`);
        // Icon, title, and PR number
        const icon = this.getIconMarkdown(pr);
        // Strip markdown from title for plain text display
        const title = this.plainTextRenderer.render(pr.title);
        markdown.appendMarkdown(`${icon} **${title}** [#${pr.number}](${pr.url})  \n`);
        // Body/Description (truncated if too long)
        markdown.appendMarkdown('  \n');
        const maxBodyLength = 200;
        let body = this.plainTextRenderer.render(pr.body || '');
        // Convert plain text newlines to markdown line breaks (two spaces + newline)
        body = body.replace(/\n/g, '  \n');
        body = body.length > maxBodyLength ? body.substring(0, maxBodyLength) + '...' : body;
        markdown.appendMarkdown(body + '  \n');
        return markdown;
    }
    getIconMarkdown(pr) {
        const state = pr.state.toUpperCase();
        return state === 'MERGED' ? '$(git-merge)' : '$(git-pull-request)';
    }
    async startSession(stream, token, source, prompt, history, references, customAgentName) {
        /* __GDPR__
            "copilot.codingAgent.editor.invoke" : {
                "promptLength" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "historyLength" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "referencesCount" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
                "source" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
        */
        this.telemetry.sendTelemetryEvent('copilot.codingAgent.editor.invoke', { microsoft: true, github: false }, {
            promptLength: prompt.length.toString() ?? '0',
            historyLength: history?.length.toString() ?? '0',
            referencesCount: references?.length.toString() ?? '0',
            source,
        });
        const result = await this.invokeRemoteAgent(prompt, [
            await this.extractFileReferences(references),
            history
        ].join('\n\n').trim(), token, false, stream, customAgentName);
        if (!result) {
            return;
        }
        if (result.state !== 'success') {
            this.logService.error(`Failed to provide new chat session item: ${result.error}${result.innerError ? `\nInner Error: ${result.innerError}` : ''}`);
            stream.warning(result.error);
            return;
        }
        return result.number;
    }
    async handleConfirmationData(request, stream, context, token) {
        const results = [];
        results.push(...(request.acceptedConfirmationData?.filter(data => !data?.authPermissionPrompted).map(data => ({ step: data.step, accepted: true, metadata: data?.metadata })) ?? []));
        results.push(...((request.rejectedConfirmationData ?? []).filter(data => !results.some(r => r.step === data.step)).map(data => ({ step: data.step, accepted: false, metadata: data?.metadata }))));
        for (const data of results) {
            switch (data.step) {
                case 'create':
                    {
                        if (!data.accepted || !data.metadata) {
                            stream.markdown(vscode.l10n.t('Cloud agent request cancelled.'));
                            return {};
                        }
                        if (!await this.tryHandleUncommittedChanges(data.metadata, stream, token)) {
                            // We are NOT handling an uncommitted changes case, so no confirmation was pushed.
                            // This means we (the caller) should continue processing the request.
                            await this.createDelegatedChatSession(data.metadata, stream, token);
                        }
                        break;
                    }
                case exports.UncommittedChangesStep:
                    {
                        if (!data.accepted || !data.metadata) {
                            stream.markdown(vscode.l10n.t('Cloud agent request cancelled due to uncommitted changes.'));
                            return {};
                        }
                        if (data.metadata.chatContext?.chatSessionContext?.isUntitled) {
                            await this.doUntitledCreation(data.metadata, stream, token);
                        }
                        else {
                            await this.createDelegatedChatSession(data.metadata, stream, token);
                        }
                        break;
                    }
                default:
                    stream.warning(`Unknown confirmation step: ${data.step}\n\n`);
                    break;
            }
        }
        return {};
    }
    async createDelegatedChatSession(metadata, stream, token) {
        const { prompt, history, references } = metadata;
        const number = await this.startSession(stream, token, 'chat', prompt, history, references);
        if (!number) {
            return undefined;
        }
        const pullRequest = await this.findPR(number);
        if (!pullRequest) {
            stream.warning(vscode.l10n.t('Could not find the associated pull request {0} for this chat session.', number));
            return undefined;
        }
        // Store references for this session
        const sessionUri = vscode.Uri.from({ scheme: CopilotCloudSessionsProvider_1.TYPE, path: '/' + number });
        if (references && references.length > 0) {
            this.sessionReferencesMap.set(sessionUri, references);
        }
        const uri = await (0, copilotCodingAgentUtils_1.toOpenPullRequestWebviewUri)({ owner: pullRequest.repository.owner.login, repo: pullRequest.repository.name, pullRequestNumber: pullRequest.number });
        const card = new vscode.ChatResponsePullRequestPart(uri, pullRequest.title, pullRequest.body, (0, copilotCodingAgentUtils_1.getAuthorDisplayName)(pullRequest.author), `#${pullRequest.number}`);
        stream.push(card);
        stream.markdown(vscode.l10n.t('GitHub Copilot cloud agent has begun working on your request. Follow its progress in the associated chat and pull request.'));
        await vscode.commands.executeCommand('vscode.open', sessionUri);
        // Return PR info for embedding in session history
        return {
            uri: uri.toString(),
            title: pullRequest.title,
            description: pullRequest.body,
            author: (0, copilotCodingAgentUtils_1.getAuthorDisplayName)(pullRequest.author),
            linkTag: `#${pullRequest.number}`,
            number,
        };
    }
    /**
     * Checks for uncommitted changes in the current repository and prompts the user for confirmation if any are found.
     * @returns 'true' if handling was performed.  This will push a chat confirmation and initiate a new chat request (handled in handleConfirmationData())
     * otherwise 'false', meaning the caller should continue handling the request
     */
    async tryHandleUncommittedChanges(metadata, stream, token) {
        try {
            const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
            if (!repoId) {
                throw new Error('Repository information is not available.');
            }
            const currentRepository = this._gitService.activeRepository.get();
            if (!currentRepository) {
                throw new Error('No active repository found.');
            }
            const git = this._gitExtensionService.getExtensionApi();
            const repo = git?.getRepository(currentRepository?.rootUri);
            if (!repo) {
                throw new Error(vscode.l10n.t('Unable to access {0}. Please check your permissions and try again.', `${repoId.org}/${repoId.repo}`));
            }
            // Check for uncommitted changes and prompt user if checking is enabled
            const hasChanges = repo.state.workingTreeChanges.length > 0 || repo.state.indexChanges.length > 0;
            if (hasChanges) {
                this.logService.warn('Uncommitted changes detected, prompting user for confirmation.');
                stream.confirmation(vscode.l10n.t('Uncommitted changes detected'), vscode.l10n.t('You have uncommitted changes in your workspace. Consider committing them if you would like to include them in the cloud agent\'s work.'), {
                    step: exports.UncommittedChangesStep,
                    metadata: metadata, // Forward metadata
                }, ['Proceed', 'Cancel']);
                return true; // A confirmation was pushed, meaning a new request will be sent to handleConfirmationData(). The caller should STOP processing.
            }
        }
        catch (error) {
            this.logService.warn(`Skipping detection of uncommitted changes due to error: ${error}`);
        }
        return false; // No chat confirmation was pushed, meaning the caller should CONTINUE processing.
    }
    async doUntitledCreation(metadata, stream, token) {
        if (!metadata.chatContext?.chatSessionContext?.isUntitled) {
            return {};
        }
        const selectedAgent = this.sessionAgentMap.get(metadata.chatContext.chatSessionContext.chatSessionItem.resource);
        const number = await this.startSession(stream, token, 'untitledChatSession', metadata.prompt, metadata.history, metadata.references, selectedAgent);
        if (!number) {
            return {};
        }
        // Store references for this session
        const sessionUri = vscode.Uri.from({ scheme: CopilotCloudSessionsProvider_1.TYPE, path: '/' + number });
        if (metadata.references && metadata.references.length > 0) {
            this.sessionReferencesMap.set(sessionUri, metadata.references);
        }
        // Tell UI to the new chat session
        this._onDidCommitChatSessionItem.fire({
            original: metadata.chatContext.chatSessionContext.chatSessionItem,
            modified: {
                resource: sessionUri,
                label: `Pull Request ${number}`
            }
        });
    }
    async chatParticipantImpl(request, context, stream, token) {
        if (request.acceptedConfirmationData || request.rejectedConfirmationData) {
            const findAuthConfirmRequest = request.acceptedConfirmationData?.find(ref => ref?.authPermissionPrompted);
            const findAuthRejectRequest = request.rejectedConfirmationData?.find(ref => ref?.authPermissionPrompted);
            if (findAuthRejectRequest) {
                stream.markdown(vscode.l10n.t('Cloud agent authentication requirements not met. Please allow access to proceed.'));
                return {};
            }
            if (findAuthConfirmRequest) {
                request = result.request;
                context = result.context ?? context;
            }
            else {
                return await this.handleConfirmationData(request, stream, context, token);
            }
        }
        const accessToken = this._authenticationService.permissiveGitHubSession;
        if (!accessToken) {
            // NOTE: Temporarily suppress the permissive session upgrade prompt to avoid showing
            // the "Additional GitHub permissions required" banner in the UI.
            // If authentication is required again in the future, re-enable the call below.
            // 	stream,
            // 	request,
            // 	vscode.l10n.t('GitHub Copilot Cloud Agent requires access to your repositories on GitHub for handling requests.'),
            // 	context
            // );
            return {};
        }
        /* __GDPR__
            "copilotcloud.chat.invoke" : {
                "owner": "joshspicer",
                "comment": "Event sent when a Copilot Cloud chat request is made.",
                "hasChatSessionItem": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Invoked with a chat session item." },
                "isUntitled": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Indicates if the chat session is untitled." }
            }
        */
        this.telemetry.sendMSFTTelemetryEvent('copilotcloud.chat.invoke', {
            hasChatSessionItem: String(!!context.chatSessionContext?.chatSessionItem),
            isUntitled: String(context.chatSessionContext?.isUntitled)
        });
        if (context.chatSessionContext?.isUntitled) {
            /* Generate new cloud agent session from an 'untitled' session */
            const handledUncommittedChanges = await this.tryHandleUncommittedChanges({
                prompt: context.chatSummary?.prompt ?? request.prompt,
                history: context.chatSummary?.history,
                chatContext: context
            }, stream, token);
            // If uncommitted changes were detected and a confirmation was shown,
            // don't proceed with creation yet - wait for user response
            if (handledUncommittedChanges) {
                return {};
            }
            await this.doUntitledCreation({
                prompt: context.chatSummary?.prompt ?? request.prompt,
                history: context.chatSummary?.history,
                references: request.references,
                chatContext: context,
            }, stream, token);
        }
        else if (context.chatSessionContext) {
            /* Follow up to an existing cloud agent session */
            try {
                if (token.isCancellationRequested) {
                    return {};
                }
                // Validate user input
                const userPrompt = request.prompt;
                if (!userPrompt || userPrompt.trim().length === 0) {
                    stream.markdown(vscode.l10n.t('Please provide a message for the cloud agent.'));
                    return {};
                }
                stream.progress(vscode.l10n.t('Preparing'));
                const session = copilotCodingAgentUtils_1.SessionIdForPr.parse(context.chatSessionContext.chatSessionItem.resource);
                let prNumber = session?.prNumber;
                if (!prNumber) {
                    prNumber = copilotCodingAgentUtils_1.SessionIdForPr.parsePullRequestNumber(context.chatSessionContext.chatSessionItem.resource);
                    if (!prNumber) {
                        return {};
                    }
                }
                const pullRequest = await this.findPR(prNumber);
                if (!pullRequest) {
                    stream.warning(vscode.l10n.t('Could not find the associated pull request {0} for this chat session.', context.chatSessionContext.chatSessionItem.resource));
                    return {};
                }
                stream.progress(vscode.l10n.t('Delegating request to cloud agent'));
                const result = await this.addFollowUpToExistingPR(pullRequest.number, userPrompt);
                if (!result) {
                    stream.markdown(vscode.l10n.t('Failed to add follow-up comment to the pull request.'));
                    return {};
                }
                // Show initial success message
                stream.markdown(result);
                stream.markdown('\n\n');
                stream.progress(vscode.l10n.t('Attaching to session'));
                // Wait for new session and stream its progress
                const newSession = await this.waitForNewSession(pullRequest, stream, token, true);
                if (!newSession) {
                    return {};
                }
                // Stream the new session logs
                stream.markdown(vscode.l10n.t('Cloud agent has begun work on your request'));
                stream.markdown('\n\n');
                await this.streamSessionLogs(stream, pullRequest, newSession.id, token);
                return {};
            }
            catch (error) {
                this.logService.error(`Error in request handler: ${error}`);
                stream.markdown(vscode.l10n.t('An error occurred while processing your request.'));
                return { errorDetails: { message: error.message } };
            }
        }
        else {
            /* @copilot invoked from a 'normal' chat or 'cloud button' */
            stream.confirmation(vscode.l10n.t('Delegate to cloud agent'), this.DELEGATE_MODAL_DETAILS, {
                step: 'create',
                metadata: {
                    prompt: context.chatSummary?.prompt ?? request.prompt,
                    history: context.chatSummary?.history,
                    references: request.references,
                    chatContext: context,
                }
            }, ['Delegate', 'Cancel']);
        }
    }
    async extractFileReferences(references) {
        if (!references || references.length === 0) {
            return;
        }
        // 'file:///Users/jospicer/dev/joshbot/.github/workflows/build-vsix.yml'  -> '.github/workflows/build-vsix.yml'
        const fileRefs = [];
        const fullFileParts = [];
        const git = this._gitExtensionService.getExtensionApi();
        for (const ref of references) {
            if (ref.value instanceof vscode.Uri && ref.value.scheme === 'file') { // TODO: Add support for more kinds of references
                const fileUri = ref.value;
                const repositoryForFile = git?.getRepository(fileUri);
                if (repositoryForFile) {
                    const relativePath = pathLib.relative(repositoryForFile.rootUri.fsPath, fileUri.fsPath);
                    if (repositoryForFile.state.workingTreeChanges.some(change => change.uri.fsPath === fileUri.fsPath)) {
                        try {
                            // TODO: Consider just showing the file diffs
                            const document = await vscode.workspace.openTextDocument(fileUri);
                            const content = document.getText();
                            fullFileParts.push(`<file-start>${relativePath}</file-start>`);
                            fullFileParts.push(content);
                            fullFileParts.push(`<file-end>${relativePath}</file-end>`);
                        }
                        catch (error) {
                            this.logService.error(`Error reading file content for reference: ${fileUri.toString()}: ${error}`);
                        }
                    }
                    else {
                        fileRefs.push(` - ${relativePath}`);
                    }
                }
            }
            else if (ref.value instanceof vscode.Uri && ref.value.scheme === 'untitled') {
                // Get full content of untitled file
                try {
                    const document = await vscode.workspace.openTextDocument(ref.value);
                    const content = document.getText();
                    fullFileParts.push(`<file-start>${ref.value.path}</file-start>`);
                    fullFileParts.push(content);
                    fullFileParts.push(`<file-end>${ref.value.path}</file-end>`);
                }
                catch (error) {
                    this.logService.error(`Error reading untitled file content for reference: ${ref.value.toString()}: ${error}`);
                }
            }
        }
        const parts = [
            ...(fullFileParts.length ? ['The user has attached the following uncommitted or modified files as relevant context:', ...fullFileParts] : []),
            ...(fileRefs.length ? ['The user has attached the following file paths as relevant context:', ...fileRefs] : [])
        ];
        if (!parts.length) {
            return;
        }
        return parts.join('\n');
    }
    async streamSessionLogs(stream, pullRequest, sessionId, token) {
        let lastLogLength = 0;
        let lastProcessedLength = 0;
        let hasActiveProgress = false;
        const pollingInterval = 3000; // 3 seconds
        return new Promise((resolve, reject) => {
            let isCompleted = false;
            const complete = async () => {
                if (isCompleted) {
                    return;
                }
                isCompleted = true;
                this.logService.info(`Session completed, attempting to get file changes for PR #${pullRequest.number}`);
                const multiDiffPart = await this._prFileChangesService.getFileChangesMultiDiffPart(pullRequest);
                if (multiDiffPart) {
                    stream.push(multiDiffPart);
                }
                resolve();
            };
            const pollForUpdates = async () => {
                try {
                    if (token.isCancellationRequested) {
                        complete();
                        return;
                    }
                    // Get the specific session info
                    const sessionInfo = await this._octoKitService.getSessionInfo(sessionId);
                    if (!sessionInfo || token.isCancellationRequested) {
                        complete();
                        return;
                    }
                    // Get session logs
                    const logs = await this._octoKitService.getSessionLogs(sessionId);
                    // Check if session is still in progress
                    if (sessionInfo.state !== 'in_progress') {
                        if (logs.length > lastProcessedLength) {
                            const newLogContent = logs.slice(lastProcessedLength);
                            const streamResult = await this.streamNewLogContent(pullRequest, stream, newLogContent);
                            if (streamResult.hasStreamedContent) {
                                hasActiveProgress = false;
                            }
                        }
                        hasActiveProgress = false;
                        complete();
                        return;
                    }
                    if (logs.length > lastLogLength) {
                        this.logService.trace(`New logs detected, attempting to stream content`);
                        const newLogContent = logs.slice(lastProcessedLength);
                        const streamResult = await this.streamNewLogContent(pullRequest, stream, newLogContent);
                        lastProcessedLength = logs.length;
                        if (streamResult.hasStreamedContent) {
                            this.logService.trace(`Content was streamed, resetting hasActiveProgress to false`);
                            hasActiveProgress = false;
                        }
                        else if (streamResult.hasSetupStepProgress) {
                            this.logService.trace(`Setup step progress detected, keeping progress active`);
                            // Keep hasActiveProgress as is, don't reset it
                        }
                        else {
                            this.logService.trace(`No content was streamed, keeping hasActiveProgress as ${hasActiveProgress}`);
                        }
                    }
                    lastLogLength = logs.length;
                    if (!token.isCancellationRequested && sessionInfo.state === 'in_progress') {
                        if (!hasActiveProgress) {
                            this.logService.trace(`Showing progress indicator (hasActiveProgress was false)`);
                            stream.progress('Working...');
                            hasActiveProgress = true;
                        }
                        else {
                            this.logService.trace(`NOT showing progress indicator (hasActiveProgress was true)`);
                        }
                        setTimeout(pollForUpdates, pollingInterval);
                    }
                    else {
                        complete();
                    }
                }
                catch (error) {
                    this.logService.error(`Error polling for session updates: ${error}`);
                    if (!token.isCancellationRequested) {
                        setTimeout(pollForUpdates, pollingInterval);
                    }
                    else {
                        reject(error);
                    }
                }
            };
            // Start polling
            setTimeout(pollForUpdates, pollingInterval);
        });
    }
    async streamNewLogContent(pullRequest, stream, newLogContent) {
        try {
            if (!newLogContent.trim()) {
                return { hasStreamedContent: false, hasSetupStepProgress: false };
            }
            // Parse the new log content
            const contentBuilder = new copilotCloudSessionContentBuilder_1.ChatSessionContentBuilder(CopilotCloudSessionsProvider_1.TYPE, this._gitService, this._prFileChangesService);
            const logChunks = contentBuilder.parseSessionLogs(newLogContent);
            let hasStreamedContent = false;
            let hasSetupStepProgress = false;
            for (const chunk of logChunks) {
                for (const choice of chunk.choices) {
                    const delta = choice.delta;
                    if (delta.role === 'assistant') {
                        // Handle special case for run_custom_setup_step/run_setup
                        if (choice.finish_reason === 'tool_calls' && delta.tool_calls?.length && (delta.tool_calls[0].function.name === 'run_custom_setup_step' || delta.tool_calls[0].function.name === 'run_setup')) {
                            const toolCall = delta.tool_calls[0];
                            let args = {};
                            try {
                                args = JSON.parse(toolCall.function.arguments);
                            }
                            catch {
                                // fallback to empty args
                            }
                            if (delta.content && delta.content.trim()) {
                                // Finished setup step - create/update tool part
                                const toolPart = contentBuilder.createToolInvocationPart(pullRequest, toolCall, args.name || delta.content);
                                if (toolPart) {
                                    stream.push(toolPart);
                                    hasStreamedContent = true;
                                    if (toolPart instanceof vscode.ChatResponseThinkingProgressPart) {
                                        stream.push(new vscode.ChatResponseThinkingProgressPart('', '', { vscodeReasoningDone: true }));
                                    }
                                }
                            }
                            else {
                                // Running setup step - just track progress
                                hasSetupStepProgress = true;
                                this.logService.trace(`Setup step in progress: ${args.name || 'Unknown step'}`);
                            }
                        }
                        else {
                            if (delta.content) {
                                if (!delta.content.startsWith('<pr_title>')) {
                                    stream.markdown(delta.content);
                                    hasStreamedContent = true;
                                }
                            }
                            if (delta.tool_calls) {
                                for (const toolCall of delta.tool_calls) {
                                    const toolPart = contentBuilder.createToolInvocationPart(pullRequest, toolCall, delta.content || '');
                                    if (toolPart) {
                                        stream.push(toolPart);
                                        hasStreamedContent = true;
                                        if (toolPart instanceof vscode.ChatResponseThinkingProgressPart) {
                                            stream.push(new vscode.ChatResponseThinkingProgressPart('', '', { vscodeReasoningDone: true }));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Handle finish reasons
                    if (choice.finish_reason && choice.finish_reason !== 'null') {
                        this.logService.trace(`Streaming finish_reason: ${choice.finish_reason}`);
                    }
                }
            }
            if (hasStreamedContent) {
                this.logService.trace(`Streamed content (markdown or tool parts), progress should be cleared`);
            }
            else if (hasSetupStepProgress) {
                this.logService.trace(`Setup step progress detected, keeping progress indicator`);
            }
            else {
                this.logService.trace(`No actual content streamed, progress may still be showing`);
            }
            return { hasStreamedContent, hasSetupStepProgress };
        }
        catch (error) {
            this.logService.error(`Error streaming new log content: ${error}`);
            return { hasStreamedContent: false, hasSetupStepProgress: false };
        }
    }
    async waitForQueuedToInProgress(sessionId, token) {
        let sessionInfo;
        const waitForQueuedMaxRetries = 3;
        const waitForQueuedDelay = 5_000; // 5 seconds
        // Allow for a short delay before the session is marked as 'queued'
        let waitForQueuedCount = 0;
        do {
            sessionInfo = await this._octoKitService.getSessionInfo(sessionId);
            if (sessionInfo && sessionInfo.state === 'queued') {
                this.logService.trace('Queued session found');
                break;
            }
            if (waitForQueuedCount < waitForQueuedMaxRetries) {
                this.logService.trace('Session not yet queued, waiting...');
                await new Promise(resolve => setTimeout(resolve, waitForQueuedDelay));
            }
            ++waitForQueuedCount;
        } while (waitForQueuedCount <= waitForQueuedMaxRetries && (!token || !token.isCancellationRequested));
        if (!sessionInfo || sessionInfo.state !== 'queued') {
            if (sessionInfo?.state === 'in_progress') {
                this.logService.trace('Session already in progress');
                return sessionInfo;
            }
            // Failure
            this.logService.trace('Failed to find queued session');
            return;
        }
        const maxWaitTime = 2 * 60 * 1_000; // 2 minutes
        const pollInterval = 3_000; // 3 seconds
        const startTime = Date.now();
        this.logService.trace(`Session ${sessionInfo.id} is queued, waiting for transition to in_progress...`);
        while (Date.now() - startTime < maxWaitTime && (!token || !token.isCancellationRequested)) {
            const sessionInfo = await this._octoKitService.getSessionInfo(sessionId);
            if (sessionInfo?.state === 'in_progress') {
                this.logService.trace(`Session ${sessionInfo.id} now in progress.`);
                return sessionInfo;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        this.logService.error(`Timed out waiting for session ${sessionId} to transition from queued to in_progress.`);
    }
    async waitForNewSession(pullRequest, stream, token, waitForTransitionToInProgress = false) {
        // Get the current number of sessions
        const initialSessions = await this._octoKitService.getCopilotSessionsForPR(pullRequest.fullDatabaseId.toString());
        const initialSessionCount = initialSessions.length;
        // Poll for a new session to start
        const maxWaitTime = 5 * 60 * 1000; // 5 minutes
        const pollInterval = 3000; // 3 seconds
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitTime && !token.isCancellationRequested) {
            const currentSessions = await this._octoKitService.getCopilotSessionsForPR(pullRequest.fullDatabaseId.toString());
            // Check if a new session has started
            if (currentSessions.length > initialSessionCount) {
                const newSession = currentSessions
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                if (!waitForTransitionToInProgress) {
                    return newSession;
                }
                const inProgressSession = await this.waitForQueuedToInProgress(newSession.id, token);
                if (!inProgressSession) {
                    stream.markdown(vscode.l10n.t('Timed out waiting for cloud agent to begin work. Please try again shortly.'));
                    return;
                }
                return inProgressSession;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        stream.markdown(vscode.l10n.t('Timed out waiting for the cloud agent to respond. The agent may still be processing your request.'));
        return;
    }
    async addFollowUpToExistingPR(pullRequestNumber, userPrompt, summary) {
        try {
            const pr = await this.findPR(pullRequestNumber);
            if (!pr) {
                this.logService.error(`Could not find pull request #${pullRequestNumber}`);
                return;
            }
            // Add a comment tagging @copilot with the user's prompt
            const commentBody = `@copilot ${userPrompt} ${summary ? '\n\n' + summary : ''}`;
            const commentResult = await this._octoKitService.addPullRequestComment(pr.id, commentBody);
            if (!commentResult) {
                this.logService.error(`Failed to add comment to PR #${pullRequestNumber}`);
                return;
            }
            // allow-any-unicode-next-line
            return vscode.l10n.t('🚀 Follow-up comment added to [#{0}]({1})', pullRequestNumber, commentResult.url);
        }
        catch (err) {
            this.logService.error(`Failed to add follow-up comment to PR #${pullRequestNumber}: ${err}`);
            return;
        }
    }
    // https://github.com/github/sweagentd/blob/main/docs/adr/0001-create-job-api.md
    validateRemoteAgentJobResponse(response) {
        return typeof response === 'object' && response !== null && 'job_id' in response && 'session_id' in response;
    }
    async waitForJobWithPullRequest(owner, repo, jobId, token) {
        const maxWaitTime = 30 * 1000; // 30 seconds
        const pollInterval = 2000; // 2 seconds
        const startTime = Date.now();
        this.logService.trace(`Waiting for job ${jobId} to have pull request information...`);
        while (Date.now() - startTime < maxWaitTime && (!token || !token.isCancellationRequested)) {
            const jobInfo = await this._octoKitService.getJobByJobId(owner, repo, jobId, 'vscode-copilot-chat');
            if (jobInfo && jobInfo.pull_request && jobInfo.pull_request.number) {
                this.logService.trace(`Job ${jobId} now has pull request #${jobInfo.pull_request.number}`);
                return jobInfo;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        this.logService.warn(`Timed out waiting for job ${jobId} to have pull request information`);
        return undefined;
    }
    async invokeRemoteAgent(prompt, problemContext, token, autoPushAndCommit = true, chatStream, customAgentName) {
        // TODO: support selecting remote
        // await this.promptAndUpdatePreferredGitHubRemote(true);
        const repoId = await (0, copilotCodingAgentUtils_1.getRepoId)(this._gitService);
        if (!repoId) {
            return { error: vscode.l10n.t('Repository information is not available.'), state: 'error' };
        }
        const currentRepository = this._gitService.activeRepository.get();
        if (!currentRepository) {
            return { error: vscode.l10n.t('No active repository found.'), state: 'error' };
        }
        const git = this._gitExtensionService.getExtensionApi();
        const repo = git?.getRepository(currentRepository?.rootUri);
        // Check if user has permission to access the repository
        if (!repo) {
            return {
                error: vscode.l10n.t('Unable to access {0}. Please check your permissions and try again.', `\`${repoId.org}/${repoId.repo}\``),
                state: 'error',
            };
        }
        // NOTE: This is as unobtrusive as possible with the current high-level APIs.
        // Get the current branch as base_ref (the ref the PR will merge into)
        const base_ref = repo.state.HEAD?.name;
        if (!base_ref) {
            return { error: vscode.l10n.t('Unable to determine the current branch.'), state: 'error' };
        }
        let head_ref; // TODO: UNUSED! This is the ref cloud agent starts work from (omitted unless we push local changes)
        // TODO: Make this automatic instead of a fatal error.
        const remoteName = repo?.state.HEAD?.upstream?.remote ??
            currentRepository?.upstreamRemote ??
            repo?.state.remotes?.[0]?.name;
        if (repo && remoteName && base_ref) {
            try {
                const remoteBranches = (await repo.getBranches({ remote: true }))
                    .filter(b => b.remote); // Has an associated remote
                const expectedRemoteBranch = `${remoteName}/${base_ref}`;
                const alternateNames = new Set([
                    expectedRemoteBranch,
                    `refs/remotes/${expectedRemoteBranch}`,
                    base_ref
                ]);
                const hasRemoteBranch = remoteBranches.some(branch => {
                    if (!branch.name) {
                        return false;
                    }
                    if (branch.remote && branch.remote !== remoteName) {
                        return false;
                    }
                    const candidateName = (branch.remote && branch.name.startsWith(branch.remote + '/'))
                        ? branch.name
                        : `${branch.remote}/${branch.name}`;
                    return alternateNames.has(candidateName);
                });
                if (!hasRemoteBranch) {
                    this.logService.warn(`Base branch '${expectedRemoteBranch}' not found on remote.`);
                    return {
                        error: vscode.l10n.t('The branch \'{0}\' does not exist on remote \'{1}\'. Please push the branch and try again.', base_ref, remoteName),
                        state: 'error'
                    };
                }
            }
            catch (error) {
                this.logService.error(`Failed to verify remote branch for cloud agent: ${error instanceof Error ? error.message : String(error)}`);
                return {
                    error: vscode.l10n.t('Unable to verify that branch \'{0}\' exists on remote \'{1}\'. Please ensure the remote branch is available and try again.', base_ref, remoteName),
                    innerError: error instanceof Error ? error.message : undefined,
                    state: 'error'
                };
            }
        }
        const title = (0, copilotCodingAgentUtils_1.extractTitle)(prompt, problemContext);
        const { problemStatement, isTruncated } = (0, copilotCodingAgentUtils_1.truncatePrompt)(this.logService, prompt, problemContext);
        if (isTruncated) {
            chatStream?.progress(vscode.l10n.t('Truncating context'));
            const truncationResult = await vscode.window.showWarningMessage(vscode.l10n.t('Prompt size exceeded'), { modal: true, detail: vscode.l10n.t('Your prompt will be truncated to fit within cloud agent\'s context window. This may affect the quality of the response.') }, copilotCodingAgentUtils_1.CONTINUE_TRUNCATION);
            const userCancelled = token?.isCancellationRequested || !truncationResult || truncationResult !== copilotCodingAgentUtils_1.CONTINUE_TRUNCATION;
            /* __GDPR__
                "copilot.codingAgent.truncation" : {
                    "isCancelled" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            this.telemetry.sendTelemetryEvent('copilot.codingAgent.truncation', { microsoft: true, github: false }, {
                isCancelled: String(userCancelled),
            });
            if (userCancelled) {
                return { error: vscode.l10n.t('User cancelled due to truncation.'), state: 'error' };
            }
        }
        const payload = {
            problem_statement: problemStatement,
            event_type: 'visual_studio_code_remote_agent_tool_invoked',
            ...(customAgentName && customAgentName !== DEFAULT_AGENT_ID && { custom_agent: customAgentName }),
            pull_request: {
                title,
                body_placeholder: (0, copilotCodingAgentUtils_1.formatBodyPlaceholder)(title),
                base_ref,
                body_suffix: copilotCodingAgentUtils_1.body_suffix,
                ...(head_ref && { head_ref }),
            }
        };
        try {
            chatStream?.progress(vscode.l10n.t('Delegating to cloud agent'));
            this.logService.trace(`Invoking cloud agent job with payload: ${JSON.stringify(payload)}`);
            const response = await this._octoKitService.postCopilotAgentJob(repoId.org, repoId.repo, copilotCodingAgentUtils_1.JOBS_API_VERSION, payload);
            if (!this.validateRemoteAgentJobResponse(response)) {
                const statusCode = response?.status;
                switch (statusCode) {
                    case 422:
                        // NOTE: Although earlier checks should prevent this, ensure that if we end up
                        //       with a 422 from the API, we give a useful error message
                        return {
                            error: vscode.l10n.t('The cloud agent was unable to create a pull request with the specified base branch \'{0}\'. Please push branch to the remote and try again.', base_ref),
                            innerError: `Status code 422 received from cloud agent.`,
                            state: 'error',
                        };
                    default:
                        return {
                            error: vscode.l10n.t('Received invalid response {0}from cloud agent.', statusCode ? statusCode + ' ' : ''),
                            innerError: `Response ${JSON.stringify(response)}`,
                            state: 'error',
                        };
                }
            }
            // For v1 API, we need to fetch the job details to get the PR info
            // Since the PR might not be created immediately, we need to poll for it
            chatStream?.progress(vscode.l10n.t('Creating pull request'));
            const jobInfo = await this.waitForJobWithPullRequest(repoId.org, repoId.repo, response.job_id, token);
            if (!jobInfo || !jobInfo.pull_request) {
                return { error: vscode.l10n.t('Failed to retrieve pull request information from job'), state: 'error' };
            }
            const { number } = jobInfo.pull_request;
            // Find the actual PR to get the HTML URL
            const pullRequest = await this.findPR(number);
            if (!pullRequest) {
                return { error: vscode.l10n.t('Failed to find pull request'), state: 'error' };
            }
            const htmlUrl = pullRequest.url;
            const webviewUri = await (0, copilotCodingAgentUtils_1.toOpenPullRequestWebviewUri)({ owner: pullRequest.repository.owner.login, repo: pullRequest.repository.name, pullRequestNumber: number });
            const prLlmString = `The remote agent has begun work and has created a pull request. Details about the pull request are being shown to the user. If the user wants to track progress or iterate on the agent's work, they should use the pull request.`;
            return {
                state: 'success',
                number,
                link: htmlUrl,
                webviewUri,
                llmDetails: head_ref ? `Local pending changes have been pushed to branch '${head_ref}'. ${prLlmString}` : prLlmString,
                sessionId: response.session_id
            };
        }
        catch (error) {
            return { error: vscode.l10n.t('Failed delegating to cloud agent. Please try again later.'), innerError: error.message, state: 'error' };
        }
    }
};
exports.CopilotCloudSessionsProvider = CopilotCloudSessionsProvider;
exports.CopilotCloudSessionsProvider = CopilotCloudSessionsProvider = CopilotCloudSessionsProvider_1 = __decorate([
    __param(0, githubService_1.IOctoKitService),
    __param(1, gitService_1.IGitService),
    __param(2, telemetry_1.ITelemetryService),
    __param(3, logService_1.ILogService),
    __param(4, gitExtensionService_1.IGitExtensionService),
    __param(5, pullRequestFileChangesService_1.IPullRequestFileChangesService),
    __param(6, authentication_1.IAuthenticationService)
], CopilotCloudSessionsProvider);
//# sourceMappingURL=copilotCloudSessionsProvider.js.map