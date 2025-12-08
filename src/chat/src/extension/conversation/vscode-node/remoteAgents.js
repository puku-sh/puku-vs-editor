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
exports.RemoteAgentContribution = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const pukuRequestTypes_1 = require("../../../platform/api/common/pukuRequestTypes");
const authenticationUpgrade_1 = require("../../../platform/authentication/common/authenticationUpgrade");
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vscode_1 = require("vscode");
const authentication_1 = require("../../../platform/authentication/common/authentication");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const capiClient_1 = require("../../../platform/endpoint/common/capiClient");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const chatEndpoint_1 = require("../../../platform/endpoint/node/chatEndpoint");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const gitService_1 = require("../../../platform/git/common/gitService");
const githubService_1 = require("../../../platform/github/common/githubService");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../platform/log/common/logService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../util/vs/base/common/path"));
const uri_1 = require("../../../util/vs/base/common/uri");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptVariablesService_1 = require("../../prompt/node/promptVariablesService");
const userActions_1 = require("./userActions");
const agentRegistrations = new Map();
const GITHUB_PLATFORM_AGENT_NAME = 'github';
const GITHUB_PLATFORM_AGENT_ID = 'platform';
const GITHUB_PLATFORM_AGENT_SKILLS = {
    web: 'bing-search',
};
let RemoteAgentContribution = class RemoteAgentContribution {
    constructor(logService, endpointProvider, capiClientService, promptVariablesService, workspaceService, tabsAndEditorsService, ignoreService, gitService, githubRepositoryService, vscodeExtensionContext, authenticationService, userFeedbackService, instantiationService, authenticationChatUpgradeService) {
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.capiClientService = capiClientService;
        this.promptVariablesService = promptVariablesService;
        this.workspaceService = workspaceService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.ignoreService = ignoreService;
        this.gitService = gitService;
        this.githubRepositoryService = githubRepositoryService;
        this.vscodeExtensionContext = vscodeExtensionContext;
        this.authenticationService = authenticationService;
        this.userFeedbackService = userFeedbackService;
        this.instantiationService = instantiationService;
        this.authenticationChatUpgradeService = authenticationChatUpgradeService;
        this.disposables = new lifecycle_1.DisposableStore();
        this.disposables.add(new vscode_1.Disposable(() => agentRegistrations.forEach(agent => agent.dispose())));
        this.refreshRemoteAgents();
        // Refresh remote agents whenever auth changes, e.g. in case the user was initially not signed in
        this.disposables.add(this.authenticationService.onDidAccessTokenChange(() => {
            this.refreshRemoteAgents();
        }));
    }
    dispose() {
        this.disposables.dispose();
    }
    async refreshRemoteAgents() {
        if (!this.refreshRemoteAgentsP) {
            this.refreshRemoteAgentsP = this._doRefreshRemoteAgents();
        }
        return this.refreshRemoteAgentsP.finally(() => this.refreshRemoteAgentsP = undefined);
    }
    async _doRefreshRemoteAgents() {
        const existingAgents = new Set(agentRegistrations.keys());
        try {
            const authToken = this.authenticationService.anyGitHubSession?.accessToken;
            if (!authToken) {
                // We have to silently wait for auth to become available so we can fetch remote agents
                this.logService.warn('Unable to fetch remote agents because user is not signed in.');
                return;
            }
            try {
                // First try to register the default platform agent
                if (!existingAgents.delete(GITHUB_PLATFORM_AGENT_ID)) { // Don't reregister it
                    this.logService.info('Registering default platform agent...');
                    agentRegistrations.set(GITHUB_PLATFORM_AGENT_ID, this.registerAgent(null));
                }
            }
            catch (ex) {
                this.logService.info(`Encountered error while registering platform agent: ${JSON.stringify(ex)}`);
            }
            const response = await this.capiClientService.makeRequest({
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`
                }
            }, { type: pukuRequestTypes_1.RequestType.RemoteAgent });
            const text = await response.text();
            let newAgents;
            try {
                newAgents = JSON.parse(text).agents;
                if (!Array.isArray(newAgents)) {
                    throw new Error(`Expected 'agents' to be an array`);
                }
            }
            catch (e) {
                if (!text.includes('access denied')) {
                    this.logService.warn(`Invalid remote agent response: ${text} (${e})`);
                }
                return;
            }
            for (const agent of newAgents) {
                if (!existingAgents.delete(agent.slug)) {
                    // only register if we haven't seen them yet
                    agentRegistrations.set(agent.slug, this.registerAgent(agent));
                }
            }
        }
        catch (e) {
            this.logService.error(e, 'Failed to load remote copilot agents');
        }
        for (const item of existingAgents) {
            agentRegistrations.get(item).dispose();
            agentRegistrations.delete(item);
        }
    }
    checkAuthorized(agent) {
        if (agent === GITHUB_PLATFORM_AGENT_NAME) {
            return true;
        }
        const key = `copilot.agent.${agent}.authorized`;
        return this.vscodeExtensionContext.globalState.get(key, false) || this.vscodeExtensionContext.workspaceState.get(key, false);
    }
    async setAuthorized(agent, isGlobal = false) {
        const memento = isGlobal ? this.vscodeExtensionContext.globalState : this.vscodeExtensionContext.workspaceState;
        await memento.update(`copilot.agent.${agent}.authorized`, true);
    }
    registerAgent(agentData) {
        const store = new lifecycle_1.DisposableStore();
        const participantId = `puku-dynamic.${agentData?.slug ?? GITHUB_PLATFORM_AGENT_ID}`;
        const slug = agentData?.slug ?? GITHUB_PLATFORM_AGENT_NAME;
        const description = agentData?.description ?? vscode_1.l10n.t("Get answers grounded in web search and code search");
        const dynamicProps = {
            name: slug,
            description,
            publisherName: agentData?.owner_login ?? 'GitHub',
            fullName: agentData?.name ?? 'GitHub',
        };
        let hasShownImplicitContextAuthorizationForSession = false;
        const agent = store.add(vscode_1.chat.createDynamicChatParticipant(participantId, dynamicProps, async (request, context, responseStream, token) => {
            const sessionId = getOrCreateSessionId(context);
            const responseId = (0, uuid_1.generateUuid)();
            // This isn't used anywhere but is needed to fix the IChatResult shape which the remote agents follow
            const modelMessageId = (0, uuid_1.generateUuid)();
            const metadata = {
                sessionId,
                modelMessageId,
                responseId,
                agentId: participantId,
                command: request.command,
            };
            let accessToken;
            if (request.acceptedConfirmationData) {
                for (const data of request.acceptedConfirmationData) {
                    if (data?.url) {
                        // Store that the user has authorized the agent
                        await this.setAuthorized(slug, request.prompt.startsWith(vscode_1.l10n.t('Authorize for all workspaces')));
                        await vscode_1.commands.executeCommand('vscode.open', vscodeTypes_1.Uri.parse(data.url));
                        responseStream.markdown(vscode_1.l10n.t('Please complete authorization in your browser and resend your question.'));
                        return { metadata };
                    }
                    else if (data?.hasAcknowledgedImplicitReferences) {
                        // Store that the user has acknowledged implicit references
                        await this.setAuthorized(slug, request.prompt.startsWith(vscode_1.l10n.t('Allow for All Workspaces')));
                        responseStream.markdown(vscode_1.l10n.t('Your preference has been saved.'));
                        return { metadata };
                        // This property is set by the confirmation in the Upgrade service
                    }
                    else if (data?.authPermissionPrompted) {
                        request = await this.authenticationChatUpgradeService.handleConfirmationRequest(responseStream, request, context.history);
                        metadata.command = request.command;
                        accessToken = (await this.authenticationService.getPermissiveGitHubSession({ silent: true }))?.accessToken;
                        if (!accessToken) {
                            responseStream.markdown(vscode_1.l10n.t('The additional permissions are required for this feature.'));
                            return { metadata };
                        }
                    }
                }
            }
            // Slugless means it's the platform agent
            if (!agentData?.slug) {
                accessToken = this.authenticationService.permissiveGitHubSession?.accessToken;
                if (!accessToken) {
                    if (this.authenticationService.isMinimalMode) {
                        responseStream.markdown(vscode_1.l10n.t('Minimal mode is enabled. You will need to change `puku.advanced.authPermissions` to `default` to use this feature.'));
                        responseStream.button({
                            title: vscode_1.l10n.t('Open Settings (JSON)'),
                            command: 'workbench.action.openSettingsJson',
                            arguments: [{ revealSetting: { key: 'puku.advanced.authPermissions' } }]
                        });
                    }
                    else {
                        // Otherwise, show the permissive session upgrade prompt because it's required
                        this.authenticationChatUpgradeService.showPermissiveSessionUpgradeInChat(responseStream, request, vscode_1.l10n.t('`@github` requires access to your repositories on GitHub for handling requests.'));
                    }
                    return { metadata };
                }
            }
            // Use the basic access token as a fallback
            if (!accessToken) {
                accessToken = this.authenticationService.anyGitHubSession?.accessToken;
            }
            try {
                const selectedEndpoint = await this.endpointProvider.getChatEndpoint(request);
                // Converts the selected endpoint to a remote agent endpoint so we can request the model the user selected to the agent
                const endpoint = this.instantiationService.createInstance(chatEndpoint_1.RemoteAgentChatEndpoint, {
                    model_picker_enabled: false,
                    is_chat_default: false,
                    billing: selectedEndpoint.isPremium && selectedEndpoint.multiplier ? { is_premium: selectedEndpoint.isPremium, multiplier: selectedEndpoint.multiplier, restricted_to: selectedEndpoint.restrictedToSkus } : undefined,
                    is_chat_fallback: false,
                    capabilities: {
                        supports: { tool_calls: selectedEndpoint.supportsToolCalls, vision: selectedEndpoint.supportsVision, streaming: true },
                        type: 'chat',
                        tokenizer: selectedEndpoint.tokenizer,
                        family: selectedEndpoint.family,
                    },
                    id: selectedEndpoint.model,
                    name: selectedEndpoint.name,
                    version: selectedEndpoint.version,
                }, agentData ? { type: pukuRequestTypes_1.RequestType.RemoteAgentChat, slug: agentData.slug } : { type: pukuRequestTypes_1.RequestType.RemoteAgentChat });
                // This flattens the docs agent's variables and ignores other variable values for now
                const resolved = await this.promptVariablesService.resolveVariablesInPrompt(request.prompt, request.references);
                // Collect copilot skills and references to be sent in the request
                const copilotReferences = [];
                const { copilot_skills } = await this.resolveCopilotSkills(slug, request);
                let hasIgnoredFiles = false;
                try {
                    const result = await this.prepareClientPlatformReferences([...request.references], slug);
                    hasIgnoredFiles = result.hasIgnoredFiles;
                    if (result.clientReferences) {
                        copilotReferences.push(...result.clientReferences);
                    }
                    for (const ref of result.vscodeReferences) {
                        responseStream.reference(ref);
                    }
                }
                catch (ex) {
                    if (ex instanceof Error && ex.message.includes('File seems to be binary and cannot be opened as text')) {
                        responseStream.markdown(vscode_1.l10n.t("Sorry, binary files are not currently supported."));
                        return { metadata };
                    }
                    else {
                        return {
                            errorDetails: { message: (ex.message) },
                            metadata
                        };
                    }
                }
                // Note: the platform agent will deal with token counting for us
                const reportedReferences = new Map();
                const agentReferences = [];
                const confirmations = prepareConfirmations(request);
                let reportedProgress = undefined;
                let pendingProgress;
                let hadCopilotErrorsOrConfirmations = false;
                const response = await endpoint.makeChatRequest('remoteAgent', [
                    ...prepareRemoteAgentHistory(participantId, context),
                    {
                        role: prompt_tsx_1.Raw.ChatRole.User,
                        content: (request.acceptedConfirmationData?.length || request.rejectedConfirmationData?.length)
                            ? []
                            : [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: resolved.message }],
                        ...(copilotReferences.length ? { copilot_references: copilotReferences } : undefined),
                        ...(confirmations?.length ? { copilot_confirmations: confirmations } : undefined),
                    }
                ], async (result, _, delta) => {
                    if (delta.copilotReferences) {
                        const processReference = (reference, parentReference) => {
                            const url = 'url' in reference ? reference.url : 'url' in reference.data ? reference.data.url : 'html_url' in reference.data ? reference.data.html_url : undefined;
                            if (url && typeof url === 'string') {
                                if (!reportedReferences.has(url)) {
                                    let icon = undefined;
                                    const parsed = new URL(url);
                                    if (parsed.hostname === 'github.com') {
                                        icon = new vscode_1.ThemeIcon('github');
                                    }
                                    else {
                                        icon = new vscode_1.ThemeIcon('globe');
                                    }
                                    if (reportedProgress) {
                                        reportedProgress?.report(new vscode_1.ChatResponseReferencePart(vscodeTypes_1.Uri.parse(url), icon));
                                    }
                                    else {
                                        responseStream.reference(vscodeTypes_1.Uri.parse(url), icon);
                                    }
                                    // Keep track of the parent reference and not the individual URL used, as this will be sent again in history
                                    reportedReferences.set(url, parentReference ?? reference);
                                }
                            }
                            else if (reference.metadata) {
                                const icon = reference.metadata.display_icon ? vscodeTypes_1.Uri.parse(reference.metadata.display_icon) : new vscode_1.ThemeIcon('globe');
                                const value = reference.metadata.display_url ? vscodeTypes_1.Uri.parse(reference.metadata.display_url) : reference.metadata.display_name;
                                if (reportedProgress) {
                                    reportedProgress.report(new vscodeTypes_1.ChatResponseReferencePart2(value, icon));
                                }
                                else {
                                    responseStream.reference2(value, icon);
                                }
                                reportedReferences.set(reference.metadata.display_url ?? reference.metadata.display_name, parentReference ?? reference);
                            }
                        };
                        // Report web references
                        for (const reference of delta.copilotReferences) {
                            if (Array.isArray(reference.data.results)) {
                                reference.data.results.forEach((r) => {
                                    processReference(r, reference);
                                });
                            }
                            else if (reference.data.type === 'github.agent') {
                                agentReferences.push(reference);
                            }
                            else if (reference.type === 'github.text') {
                                continue;
                            }
                            else if ('html_url' in reference.data || 'url' in reference.data && typeof reference.data.url === 'string' || reference.metadata) {
                                processReference(reference);
                            }
                        }
                    }
                    const reportProgress = (progress, resolvedMessage) => {
                        pendingProgress?.deferred.complete(pendingProgress.resolvedMessage);
                        reportedProgress = progress;
                        const deferred = new async_1.DeferredPromise();
                        pendingProgress = { deferred, resolvedMessage };
                        return deferred.p;
                    };
                    if (delta._deprecatedCopilotFunctionCalls) {
                        for (const call of delta._deprecatedCopilotFunctionCalls) {
                            switch (call.name) {
                                case 'bing-search': {
                                    try {
                                        const data = JSON.parse(call.arguments);
                                        responseStream.progress(vscode_1.l10n.t('Searching Bing for "{0}"...', data.query), async (progress) => reportProgress(progress, vscode_1.l10n.t('Bing search results for "{0}"', data.query)));
                                    }
                                    catch (ex) { }
                                    break;
                                }
                                case 'codesearch': {
                                    try {
                                        const data = JSON.parse(call.arguments);
                                        responseStream.progress(vscode_1.l10n.t('Searching {0} for "{1}"...', data.scopingQuery, data.query), async (progress) => reportProgress(progress, vscode_1.l10n.t('Code search results for "{0}" in {1}', data.query, data.scopingQuery)));
                                    }
                                    catch (ex) { }
                                    break;
                                }
                            }
                        }
                    }
                    if (delta.copilotErrors && typeof responseStream.warning === 'function') {
                        hadCopilotErrorsOrConfirmations = true;
                        for (const error of delta.copilotErrors) {
                            if (reportedProgress) {
                                reportedProgress?.report(new vscode_1.ChatResponseWarningPart(error.message));
                            }
                            else {
                                responseStream.warning(error.message);
                            }
                        }
                    }
                    if (delta.copilotConfirmation) {
                        hadCopilotErrorsOrConfirmations = true;
                        const confirm = delta.copilotConfirmation;
                        responseStream.confirmation(confirm.title, confirm.message, confirm.confirmation);
                    }
                    if (delta.text) {
                        pendingProgress?.deferred.complete(pendingProgress.resolvedMessage);
                        const md = new vscode_1.MarkdownString(delta.text);
                        md.supportHtml = true;
                        responseStream.markdown(md);
                    }
                    return undefined;
                }, token, commonTypes_1.ChatLocation.Panel, undefined, {
                    secretKey: accessToken,
                    copilot_thread_id: sessionId,
                    ...(copilot_skills ? { copilot_skills } : undefined)
                }, true, {
                    messageSource: `serverAgent.${agentData?.slug ?? GITHUB_PLATFORM_AGENT_ID}`,
                });
                metadata['copilot_references'] = [...new Set(reportedReferences.values()).values(), ...agentReferences];
                if (response.type === commonTypes_1.ChatFetchResponseType.Success && hasIgnoredFiles) {
                    responseStream.markdown(ignoreService_1.HAS_IGNORED_FILES_MESSAGE);
                }
                if (response.type !== commonTypes_1.ChatFetchResponseType.Success) {
                    this.logService.warn(`Bad response from remote agent "${slug}": ${response.type} ${response.reason}`);
                    if (response.reason.includes('400 no docs found')) {
                        return {
                            errorDetails: { message: 'No docs found' },
                            metadata
                        };
                    }
                    else if (response.type === commonTypes_1.ChatFetchResponseType.AgentUnauthorized) {
                        const url = new URL(response.authorizationUrl);
                        const editorContext = agentData?.editor_context ? vscode_1.l10n.t('**@{0}** will read your active file and selection.', slug) : '';
                        responseStream.confirmation(vscode_1.l10n.t('Authorize agent'), editorContext + '\n' +
                            vscode_1.l10n.t({
                                message: 'Please authorize usage of **@{0}** on {1} and resend your question. [Learn more]({2}).',
                                args: [slug, url.hostname, 'https://aka.ms/vscode-github-chat-extension-editor-context'],
                                comment: ["{Locked=']({'}"]
                            }), { url: response.authorizationUrl }, [vscode_1.l10n.t("Authorize"), vscode_1.l10n.t('Authorize for All Workspaces')]);
                        return { metadata, nextQuestion: { prompt: request.prompt, participant: participantId, command: request.command } };
                    }
                    else if (response.type === commonTypes_1.ChatFetchResponseType.AgentFailedDependency) {
                        return {
                            errorDetails: { message: vscode_1.l10n.t('Sorry, an error occurred: {0}', response.reason) },
                            metadata
                        };
                    }
                    else if (response.type !== commonTypes_1.ChatFetchResponseType.Unknown || !hadCopilotErrorsOrConfirmations) {
                        return {
                            errorDetails: { message: response.reason },
                            metadata
                        };
                    }
                }
                // Ask the user to authorize implicit context
                if (!this.checkAuthorized(slug) && agentData?.editor_context && !hasShownImplicitContextAuthorizationForSession) {
                    responseStream.confirmation(vscode_1.l10n.t('Grant access to editor context'), vscode_1.l10n.t({
                        message: '**@{0}** would like to read your active file and selection. [Learn More]({1})',
                        args: [slug, 'https://aka.ms/vscode-github-chat-extension-editor-context'],
                        comment: ["{Locked=']({'}"]
                    }), { hasAcknowledgedImplicitReferences: true }, [vscode_1.l10n.t("Allow"), vscode_1.l10n.t("Allow for All Workspaces")]);
                    hasShownImplicitContextAuthorizationForSession = true;
                }
                return { metadata };
            }
            catch (e) {
                this.logService.error(`/agents/${slug} failed: ${e}`);
                return { metadata };
            }
        }));
        agent.iconPath = agentData ? vscodeTypes_1.Uri.parse(agentData.avatar_url) : new vscode_1.ThemeIcon('github');
        if (slug === GITHUB_PLATFORM_AGENT_NAME) {
            agent.participantVariableProvider = {
                triggerCharacters: ['#'],
                provider: {
                    provideCompletionItems: async (query, token) => {
                        const items = await this.getPlatformAgentSkills();
                        return items.map(i => {
                            const item = new vscode_1.ChatCompletionItem(`copilot.${i.name}`, '#' + i.name, [{ value: i.insertText, level: vscode_1.ChatVariableLevel.Full, description: i.description }]);
                            item.command = i.command;
                            item.detail = i.description;
                            return item;
                        });
                    },
                }
            };
        }
        store.add(agent.onDidReceiveFeedback(e => this.userFeedbackService.handleFeedback(e, participantId)));
        return store;
    }
    async prepareClientPlatformReferences(variables, slug) {
        const clientReferences = [];
        const vscodeReferences = [];
        let hasIgnoredFiles = false;
        let hasSentImplicitSelectionReference = false;
        const redactFileContents = async (document, range) => {
            const filename = path.basename(document.uri.toString());
            let content = document.getText(range);
            if (await this.ignoreService.isCopilotIgnored(document.uri)) {
                hasIgnoredFiles = true;
                content = 'content-exclusion';
            }
            else if (filename.startsWith('.')) {
                content = 'hidden-file'; // e.g. .env
            }
            else if (Buffer.byteLength(content, 'utf8') > 1024 ** 3) {
                content = 'file-too-large'; // exceeds 1GB
            }
            return content;
        };
        const getImplicitContextId = async (uri) => {
            // The ID of the file should be relative to the root of the repository if we're in a repository
            // falling back to a workspace folder-relative path if we're not in a repository
            // and finally falling back to the file basename e.g. if it's an untracked file that doesn't belong to the open workspace or repo
            const repository = await this.gitService.getRepository(uri);
            const baseUri = repository ? repository.rootUri.toString() : this.workspaceService.getWorkspaceFolder(uri)?.toString();
            return baseUri ? path.relative(baseUri, uri.toString()) : path.basename(uri.path);
        };
        const addFileReference = async (document, variableName, isImplicit) => {
            clientReferences.push({
                type: 'client.file',
                data: {
                    language: document.languageId,
                    content: await redactFileContents(document)
                },
                is_implicit: Boolean(isImplicit),
                id: await getImplicitContextId(document.uri)
            });
            vscodeReferences.push(variableName
                ? { variableName, value: document.uri }
                : document.uri);
        };
        const addSelectionReference = async (activeTextEditor, variableName, reportReference = false, isImplicit) => {
            const selectionStart = activeTextEditor.selection.start.line;
            const selection = activeTextEditor.selection.isEmpty ? new vscode_1.Range(new vscode_1.Position(selectionStart, 0), new vscode_1.Position(selectionStart + 1, 0)) : activeTextEditor.selection;
            clientReferences.push({
                type: 'client.selection',
                data: {
                    start: { line: selection.start.line, col: selection.start.character },
                    end: { line: selection.end.line, col: selection.end.character },
                    content: await redactFileContents(activeTextEditor.document, selection)
                },
                is_implicit: Boolean(isImplicit),
                id: await getImplicitContextId(activeTextEditor.document.uri)
            });
            if (reportReference) {
                vscodeReferences.push(variableName
                    ? { variableName, value: new vscode_1.Location(activeTextEditor.document.uri, selection) }
                    : new vscode_1.Location(activeTextEditor.document.uri, selection));
            }
        };
        // Check whether we can send file and selection data implicitly
        if (this.checkAuthorized(slug)) {
            const { activeTextEditor } = this.tabsAndEditorsService;
            if (activeTextEditor && variables.find(v => v.id.startsWith('vscode.implicit'))) {
                await addFileReference(activeTextEditor.document, undefined, true);
                await addSelectionReference(activeTextEditor, undefined, undefined, true);
                hasSentImplicitSelectionReference = true;
            }
        }
        for (const variable of variables) {
            if (uri_1.URI.isUri(variable.value)) {
                const textDocument = await this.workspaceService.openTextDocument(variable.value);
                await addFileReference(textDocument, variable.name);
            }
            else if (variable.name === 'selection') {
                const { activeTextEditor } = this.tabsAndEditorsService;
                if (!activeTextEditor) {
                    throw new Error(vscode_1.l10n.t({ message: 'Please open a text editor to use the `#selection` variable.', comment: "{Locked='`#selection`'}" }));
                }
                if (!hasSentImplicitSelectionReference) {
                    await addSelectionReference(activeTextEditor, variable.name, true);
                }
            }
            else if (variable.name === 'editor' && this.tabsAndEditorsService.activeTextEditor) {
                await addFileReference(this.tabsAndEditorsService.activeTextEditor.document, variable.name);
            }
        }
        // Always send the open GitHub repositories
        if (!this.gitService.isInitialized) {
            await this.gitService.initialize();
        }
        const repositories = this.gitService.repositories;
        for (const repository of repositories) {
            const repoId = (0, gitService_1.getGitHubRepoInfoFromContext)(repository)?.id;
            if (!repoId) {
                continue; // Not a GitHub repository
            }
            try {
                const repo = await this.githubRepositoryService.getRepositoryInfo(repoId.org, repoId.repo);
                clientReferences.push({
                    type: 'github.repository',
                    id: (0, gitService_1.toGithubNwo)(repoId),
                    data: {
                        type: "repository",
                        name: repoId.repo,
                        ownerLogin: repoId.org,
                        id: repo.id
                    }
                });
            }
            catch (ex) {
                if (ex instanceof Error && ex.message.includes('Failed to fetch repository info')) {
                    // TODO display a merged confirmation to reauthorize with the repo scope
                    // For now, raise a reauth badge so the user has a way out of this state
                    void this.authenticationService.getPermissiveGitHubSession({ silent: true });
                }
                this.logService.error(ex, 'Failed to fetch info about current GitHub repository');
            }
        }
        return { clientReferences, vscodeReferences, hasIgnoredFiles };
    }
    async listEnabledSkills(authToken) {
        if (!this.enabledSkillsPromise) {
            this.enabledSkillsPromise = this.capiClientService.makeRequest({
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                }
            }, { type: pukuRequestTypes_1.RequestType.ListSkills })
                .then(response => response.json())
                .then((json) => json?.['skills'].reduce((acc, skill) => acc.add(skill.slug), new Set()));
        }
        return this.enabledSkillsPromise;
    }
    async resolveCopilotSkills(agent, request) {
        if (agent === GITHUB_PLATFORM_AGENT_NAME) {
            const skills = new Set();
            for (const variable of request.references) {
                if (GITHUB_PLATFORM_AGENT_SKILLS[variable.name]) {
                    skills.add(GITHUB_PLATFORM_AGENT_SKILLS[variable.name]);
                }
            }
            return { copilot_skills: [...skills] };
        }
        return { copilot_skills: [] };
    }
    async getPlatformAgentSkills() {
        const authToken = this.authenticationService.anyGitHubSession?.accessToken;
        if (!authToken) {
            return [];
        }
        // Register platform agent-specific native skills
        const skills = await this.listEnabledSkills(authToken);
        return [
            { name: 'web', insertText: `#web`, description: 'Search Bing for real-time context', kind: 'bing-search', command: undefined },
        ].filter((skill) => skills.has(skill.kind));
    }
};
exports.RemoteAgentContribution = RemoteAgentContribution;
exports.RemoteAgentContribution = RemoteAgentContribution = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, endpointProvider_1.IEndpointProvider),
    __param(2, capiClient_1.ICAPIClientService),
    __param(3, promptVariablesService_1.IPromptVariablesService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(6, ignoreService_1.IIgnoreService),
    __param(7, gitService_1.IGitService),
    __param(8, githubService_1.IGithubRepositoryService),
    __param(9, extensionContext_1.IVSCodeExtensionContext),
    __param(10, authentication_1.IAuthenticationService),
    __param(11, userActions_1.IUserFeedbackService),
    __param(12, instantiation_1.IInstantiationService),
    __param(13, authenticationUpgrade_1.IAuthenticationChatUpgradeService)
], RemoteAgentContribution);
function prepareConfirmations(request) {
    const confirmations = [
        ...(request.acceptedConfirmationData?.map(c => ({ state: 'accepted', confirmation: c })) ?? []),
        ...(request.rejectedConfirmationData?.map(c => ({ state: 'dismissed', confirmation: c })) ?? []),
    ];
    return confirmations;
}
function prepareRemoteAgentHistory(agentId, context) {
    const result = [];
    for (const h of context.history) {
        if (h.participant !== agentId) {
            continue;
        }
        if (h instanceof vscode_1.ChatRequestTurn) {
            result.push({
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: h.prompt }],
            });
        }
        if (h instanceof vscode_1.ChatResponseTurn) {
            const copilot_references = h.result.metadata?.['copilot_references'];
            const content = h.response.map(r => {
                if (r instanceof vscode_1.ChatResponseMarkdownPart) {
                    return r.value.value;
                }
                else if ('content' in r) {
                    return r.content;
                }
                else {
                    return null;
                }
            }).filter(r => !!r).join('');
            result.push({
                role: prompt_tsx_1.Raw.ChatRole.Assistant,
                content: [{ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text: content }],
                ...(copilot_references ? { copilot_references } : undefined)
            });
        }
    }
    return result;
}
function getOrCreateSessionId(context) {
    let sessionId;
    for (const h of context.history) {
        if (h instanceof vscode_1.ChatResponseTurn) {
            const maybeSessionId = h.result.metadata?.sessionId;
            if (typeof maybeSessionId === 'string') {
                sessionId = maybeSessionId;
                break;
            }
        }
    }
    return sessionId ?? (0, uuid_1.generateUuid)();
}
//# sourceMappingURL=remoteAgents.js.map