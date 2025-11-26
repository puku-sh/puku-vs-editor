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
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { BugIndicatingError, ErrorNoTelemetry } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, derived, ObservableMap } from '../../../../base/common/observable.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { OffsetRange } from '../../../../editor/common/core/ranges/offsetRange.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IMcpService } from '../../mcp/common/mcpTypes.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatModel, ChatRequestModel, normalizeSerializableChatData, toChatHistoryContent, updateRanges } from './chatModel.js';
import { chatAgentLeader, ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestSlashCommandPart, ChatRequestTextPart, chatSubcommandLeader, getPromptText } from './chatParserTypes.js';
import { ChatRequestParser } from './chatRequestParser.js';
import { ChatMcpServersStarting } from './chatService.js';
import { ChatRequestTelemetry, ChatServiceTelemetry } from './chatServiceTelemetry.js';
import { IChatSessionsService } from './chatSessionsService.js';
import { ChatSessionStore } from './chatSessionStore.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatTransferService } from './chatTransferService.js';
import { LocalChatSessionUri } from './chatUri.js';
import { ChatAgentLocation, ChatConfiguration, ChatModeKind } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const serializedChatKey = 'interactive.sessions';
const TransferredGlobalChatKey = 'chat.workspaceTransfer';
const SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS = 1000 * 60;
let CancellableRequest = class CancellableRequest {
    constructor(cancellationTokenSource, requestId, toolsService) {
        this.cancellationTokenSource = cancellationTokenSource;
        this.requestId = requestId;
        this.toolsService = toolsService;
    }
    dispose() {
        this.cancellationTokenSource.dispose();
    }
    cancel() {
        if (this.requestId) {
            this.toolsService.cancelToolCallsForRequest(this.requestId);
        }
        this.cancellationTokenSource.cancel();
    }
};
CancellableRequest = __decorate([
    __param(2, ILanguageModelToolsService)
], CancellableRequest);
class ChatModelStore {
    constructor() {
        this._models = new ObservableMap();
    }
    get observable() {
        return this._models.observable;
    }
    values() {
        return this._models.values();
    }
    get(uri) {
        return this._models.get(this.toKey(uri));
    }
    has(uri) {
        return this._models.has(this.toKey(uri));
    }
    set(uri, value) {
        this._models.set(this.toKey(uri), value);
    }
    delete(uri) {
        return this._models.delete(this.toKey(uri));
    }
    toKey(uri) {
        return uri.toString();
    }
}
class DisposableResourceMap extends Disposable {
    constructor() {
        super(...arguments);
        this._map = this._register(new DisposableMap());
    }
    get(sessionResource) {
        return this._map.get(this.toKey(sessionResource));
    }
    set(sessionResource, value) {
        this._map.set(this.toKey(sessionResource), value);
    }
    has(sessionResource) {
        return this._map.has(this.toKey(sessionResource));
    }
    deleteAndLeak(sessionResource) {
        return this._map.deleteAndLeak(this.toKey(sessionResource));
    }
    deleteAndDispose(sessionResource) {
        this._map.deleteAndDispose(this.toKey(sessionResource));
    }
    toKey(uri) {
        return uri.toString();
    }
}
let ChatService = class ChatService extends Disposable {
    get transferredSessionData() {
        return this._transferredSessionData;
    }
    get edits2Enabled() {
        return this.configurationService.getValue(ChatConfiguration.Edits2Enabled);
    }
    get isEmptyWindow() {
        const workspace = this.workspaceContextService.getWorkspace();
        return !workspace.configuration && workspace.folders.length === 0;
    }
    constructor(storageService, logService, extensionService, instantiationService, workspaceContextService, chatSlashCommandService, chatAgentService, configurationService, chatTransferService, chatSessionService, mcpService) {
        super();
        this.storageService = storageService;
        this.logService = logService;
        this.extensionService = extensionService;
        this.instantiationService = instantiationService;
        this.workspaceContextService = workspaceContextService;
        this.chatSlashCommandService = chatSlashCommandService;
        this.chatAgentService = chatAgentService;
        this.configurationService = configurationService;
        this.chatTransferService = chatTransferService;
        this.chatSessionService = chatSessionService;
        this.mcpService = mcpService;
        this._sessionModels = new ChatModelStore();
        this._contentProviderSessionModels = this._register(new DisposableResourceMap());
        this._pendingRequests = this._register(new DisposableResourceMap());
        this._onDidSubmitRequest = this._register(new Emitter());
        this.onDidSubmitRequest = this._onDidSubmitRequest.event;
        this._onDidPerformUserAction = this._register(new Emitter());
        this.onDidPerformUserAction = this._onDidPerformUserAction.event;
        this._onDidDisposeSession = this._register(new Emitter());
        this.onDidDisposeSession = this._onDidDisposeSession.event;
        this._sessionFollowupCancelTokens = this._register(new DisposableResourceMap());
        this._chatServiceTelemetry = this.instantiationService.createInstance(ChatServiceTelemetry);
        const sessionData = storageService.get(serializedChatKey, this.isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */, '');
        if (sessionData) {
            this._persistedSessions = this.deserializeChats(sessionData);
            const countsForLog = Object.keys(this._persistedSessions).length;
            if (countsForLog > 0) {
                this.trace('constructor', `Restored ${countsForLog} persisted sessions`);
            }
        }
        else {
            this._persistedSessions = {};
        }
        const transferredData = this.getTransferredSessionData();
        const transferredChat = transferredData?.chat;
        if (transferredChat) {
            this.trace('constructor', `Transferred session ${transferredChat.sessionId}`);
            this._persistedSessions[transferredChat.sessionId] = transferredChat;
            this._transferredSessionData = {
                sessionId: transferredChat.sessionId,
                location: transferredData.location,
                inputState: transferredData.inputState
            };
        }
        this._chatSessionStore = this._register(this.instantiationService.createInstance(ChatSessionStore));
        this._chatSessionStore.migrateDataIfNeeded(() => this._persistedSessions);
        // When using file storage, populate _persistedSessions with session metadata from the index
        // This ensures that getPersistedSessionTitle() can find titles for inactive sessions
        this.initializePersistedSessionsFromFileStorage();
        this._register(storageService.onWillSaveState(() => this.saveState()));
        this.requestInProgressObs = derived(reader => {
            const models = this._sessionModels.observable.read(reader).values();
            return Iterable.some(models, model => model.requestInProgress.read(reader));
        });
    }
    get editingSessions() {
        return [...this._sessionModels.values()].map(v => v.editingSession).filter(isDefined);
    }
    isEnabled(location) {
        return this.chatAgentService.getContributedDefaultAgent(location) !== undefined;
    }
    saveState() {
        const liveChats = Array.from(this._sessionModels.values())
            .filter(session => {
            if (!LocalChatSessionUri.parseLocalSessionId(session.sessionResource)) {
                return false;
            }
            return session.initialLocation === ChatAgentLocation.Chat;
        });
        this._chatSessionStore.storeSessions(liveChats);
    }
    notifyUserAction(action) {
        this._chatServiceTelemetry.notifyUserAction(action);
        this._onDidPerformUserAction.fire(action);
        if (action.action.kind === 'chatEditingSessionAction') {
            const model = this._sessionModels.get(action.sessionResource);
            if (model) {
                model.notifyEditingAction(action.action);
            }
        }
    }
    async setChatSessionTitle(sessionResource, title) {
        const sessionId = this.toLocalSessionId(sessionResource);
        const model = this._sessionModels.get(sessionResource);
        if (model) {
            model.setCustomTitle(title);
        }
        // Update the title in the file storage
        await this._chatSessionStore.setSessionTitle(sessionId, title);
        // Trigger immediate save to ensure consistency
        this.saveState();
    }
    trace(method, message) {
        if (message) {
            this.logService.trace(`ChatService#${method}: ${message}`);
        }
        else {
            this.logService.trace(`ChatService#${method}`);
        }
    }
    error(method, message) {
        this.logService.error(`ChatService#${method} ${message}`);
    }
    deserializeChats(sessionData) {
        try {
            const arrayOfSessions = revive(JSON.parse(sessionData)); // Revive serialized URIs in session data
            if (!Array.isArray(arrayOfSessions)) {
                throw new Error('Expected array');
            }
            const sessions = arrayOfSessions.reduce((acc, session) => {
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                acc[session.sessionId] = normalizeSerializableChatData(session);
                return acc;
            }, {});
            return sessions;
        }
        catch (err) {
            this.error('deserializeChats', `Malformed session data: ${err}. [${sessionData.substring(0, 20)}${sessionData.length > 20 ? '...' : ''}]`);
            return {};
        }
    }
    getTransferredSessionData() {
        const data = this.storageService.getObject(TransferredGlobalChatKey, 0 /* StorageScope.PROFILE */, []);
        const workspaceUri = this.workspaceContextService.getWorkspace().folders[0]?.uri;
        if (!workspaceUri) {
            return;
        }
        const thisWorkspace = workspaceUri.toString();
        const currentTime = Date.now();
        // Only use transferred data if it was created recently
        const transferred = data.find(item => URI.revive(item.toWorkspace).toString() === thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        // Keep data that isn't for the current workspace and that hasn't expired yet
        const filtered = data.filter(item => URI.revive(item.toWorkspace).toString() !== thisWorkspace && (currentTime - item.timestampInMilliseconds < SESSION_TRANSFER_EXPIRATION_IN_MILLISECONDS));
        this.storageService.store(TransferredGlobalChatKey, JSON.stringify(filtered), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        return transferred;
    }
    async initializePersistedSessionsFromFileStorage() {
        const index = await this._chatSessionStore.getIndex();
        const sessionIds = Object.keys(index);
        for (const sessionId of sessionIds) {
            const metadata = index[sessionId];
            if (metadata && !this._persistedSessions[sessionId]) {
                // Create a minimal session entry with the title information
                // This allows getPersistedSessionTitle() to find the title without loading the full session
                const minimalSession = {
                    version: 3,
                    sessionId: sessionId,
                    customTitle: metadata.title,
                    creationDate: Date.now(), // Use current time as fallback
                    lastMessageDate: metadata.lastMessageDate,
                    isImported: metadata.isImported || false,
                    initialLocation: metadata.initialLocation,
                    requests: [], // Empty requests array - this is just for title lookup
                    responderUsername: '',
                    responderAvatarIconUri: undefined,
                };
                this._persistedSessions[sessionId] = minimalSession;
            }
        }
    }
    /**
     * Returns an array of chat details for all persisted chat sessions that have at least one request.
     * Chat sessions that have already been loaded into the chat view are excluded from the result.
     * Imported chat sessions are also excluded from the result.
     */
    async getLocalSessionHistory() {
        const liveSessionItems = this.getLiveSessionItems();
        const historySessionItems = await this.getHistorySessionItems();
        return [...liveSessionItems, ...historySessionItems];
    }
    /**
     * Returns an array of chat details for all local live chat sessions.
     */
    getLiveSessionItems() {
        return Array.from(this._sessionModels.values())
            .filter(session => this.shouldBeInHistory(session))
            .map((session) => {
            const title = session.title || localize('newChat', "New Chat");
            return {
                sessionResource: session.sessionResource,
                title,
                lastMessageDate: session.lastMessageDate,
                isActive: true,
            };
        });
    }
    /**
     * Returns an array of chat details for all local chat sessions in history (not currently loaded).
     */
    async getHistorySessionItems() {
        const index = await this._chatSessionStore.getIndex();
        return Object.values(index)
            .filter(entry => !this._sessionModels.has(LocalChatSessionUri.forSession(entry.sessionId)) && this.shouldBeInHistory(entry) && !entry.isEmpty)
            .map((entry) => {
            const sessionResource = LocalChatSessionUri.forSession(entry.sessionId);
            return ({
                ...entry,
                sessionResource,
                isActive: this._sessionModels.has(sessionResource),
            });
        });
    }
    shouldBeInHistory(entry) {
        if (entry.sessionResource) {
            return !entry.isImported && LocalChatSessionUri.parseLocalSessionId(entry.sessionResource) && entry.initialLocation === ChatAgentLocation.Chat;
        }
        return !entry.isImported && entry.initialLocation === ChatAgentLocation.Chat;
    }
    async removeHistoryEntry(sessionResource) {
        await this._chatSessionStore.deleteSession(this.toLocalSessionId(sessionResource));
    }
    async clearAllHistoryEntries() {
        await this._chatSessionStore.clearAllSessions();
    }
    startSession(location, token, options) {
        this.trace('startSession');
        return this._startSession(undefined, location, token, options);
    }
    _startSession(someSessionHistory, location, token, options, transferEditingSession) {
        const model = this.instantiationService.createInstance(ChatModel, someSessionHistory, { initialLocation: location, canUseTools: options?.canUseTools ?? true, resource: options?.sessionResource });
        if (location === ChatAgentLocation.Chat) {
            model.startEditingSession(true, transferEditingSession);
        }
        this._sessionModels.set(model.sessionResource, model);
        this.initializeSession(model, token);
        return model;
    }
    initializeSession(model, token) {
        this.trace('initializeSession', `Initialize session ${model.sessionResource}`);
        // Activate the default extension provided agent but do not wait
        // for it to be ready so that the session can be used immediately
        // without having to wait for the agent to be ready.
        this.activateDefaultAgent(model.initialLocation).catch(e => this.logService.error(e));
    }
    async activateDefaultAgent(location) {
        await this.extensionService.whenInstalledExtensionsRegistered();
        const defaultAgentData = this.chatAgentService.getContributedDefaultAgent(location) ?? this.chatAgentService.getContributedDefaultAgent(ChatAgentLocation.Chat);
        if (!defaultAgentData) {
            throw new ErrorNoTelemetry('No default agent contributed');
        }
        // Await activation of the extension provided agent
        // Using `activateById` as workaround for the issue
        // https://github.com/microsoft/vscode/issues/250590
        if (!defaultAgentData.isCore) {
            await this.extensionService.activateById(defaultAgentData.extensionId, {
                activationEvent: `onChatParticipant:${defaultAgentData.id}`,
                extensionId: defaultAgentData.extensionId,
                startup: false
            });
        }
        const defaultAgent = this.chatAgentService.getActivatedAgents().find(agent => agent.id === defaultAgentData.id);
        if (!defaultAgent) {
            throw new ErrorNoTelemetry('No default agent registered');
        }
    }
    getSession(sessionResource) {
        return this._sessionModels.get(sessionResource);
    }
    async getOrRestoreSession(sessionResource) {
        this.trace('getOrRestoreSession', `${sessionResource}`);
        const model = this._sessionModels.get(sessionResource);
        if (model) {
            return model;
        }
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            throw new Error(`Cannot restore non-local session ${sessionResource}`);
        }
        let sessionData;
        if (this.transferredSessionData?.sessionId === sessionId) {
            sessionData = revive(this._persistedSessions[sessionId]);
        }
        else {
            sessionData = revive(await this._chatSessionStore.readSession(sessionId));
        }
        if (!sessionData) {
            return undefined;
        }
        const session = this._startSession(sessionData, sessionData.initialLocation ?? ChatAgentLocation.Chat, CancellationToken.None, { canUseTools: true, sessionResource });
        const isTransferred = this.transferredSessionData?.sessionId === sessionId;
        if (isTransferred) {
            this._transferredSessionData = undefined;
        }
        return session;
    }
    /**
     * This is really just for migrating data from the edit session location to the panel.
     */
    isPersistedSessionEmpty(sessionResource) {
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            throw new Error(`Cannot restore non-local session ${sessionResource}`);
        }
        const session = this._persistedSessions[sessionId];
        if (session) {
            return session.requests.length === 0;
        }
        return this._chatSessionStore.isSessionEmpty(sessionId);
    }
    getPersistedSessionTitle(sessionResource) {
        const sessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!sessionId) {
            return undefined;
        }
        // First check the memory cache (_persistedSessions)
        const session = this._persistedSessions[sessionId];
        if (session) {
            const title = session.customTitle || ChatModel.getDefaultTitle(session.requests);
            return title;
        }
        // Try to read directly from file storage index
        // This handles the case where getName() is called before initialization completes
        // Access the internal synchronous index method via reflection
        // This is a workaround for the timing issue where initialization hasn't completed
        // eslint-disable-next-line local/code-no-any-casts
        const internalGetIndex = this._chatSessionStore.internalGetIndex;
        if (typeof internalGetIndex === 'function') {
            const indexData = internalGetIndex.call(this._chatSessionStore);
            const metadata = indexData.entries[sessionId];
            if (metadata && metadata.title) {
                return metadata.title;
            }
        }
        return undefined;
    }
    loadSessionFromContent(data) {
        return this._startSession(data, data.initialLocation ?? ChatAgentLocation.Chat, CancellationToken.None);
    }
    async loadSessionForResource(chatSessionResource, location, token) {
        // TODO: Move this into a new ChatModelService
        if (chatSessionResource.scheme === Schemas.vscodeLocalChatSession) {
            return this.getOrRestoreSession(chatSessionResource);
        }
        const existing = this._contentProviderSessionModels.get(chatSessionResource);
        if (existing) {
            return existing.model;
        }
        const providedSession = await this.chatSessionService.getOrCreateChatSession(chatSessionResource, CancellationToken.None);
        const chatSessionType = chatSessionResource.scheme;
        // Contributed sessions do not use UI tools
        const model = this._startSession(undefined, location, CancellationToken.None, { sessionResource: chatSessionResource, canUseTools: false }, providedSession.initialEditingSession);
        model.setContributedChatSession({
            chatSessionResource,
            chatSessionType,
            isUntitled: chatSessionResource.path.startsWith('/untitled-') //TODO(jospicer)
        });
        const disposables = new DisposableStore();
        this._contentProviderSessionModels.set(chatSessionResource, { model, dispose: () => disposables.dispose() });
        disposables.add(model.onDidDispose(() => {
            this._contentProviderSessionModels.deleteAndDispose(chatSessionResource);
            providedSession.dispose();
        }));
        let lastRequest;
        for (const message of providedSession.history) {
            if (message.type === 'request') {
                if (lastRequest) {
                    lastRequest.response?.complete();
                }
                const requestText = message.prompt;
                const parsedRequest = {
                    text: requestText,
                    parts: [new ChatRequestTextPart(new OffsetRange(0, requestText.length), { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: requestText.length + 1 }, requestText)]
                };
                const agent = message.participant
                    ? this.chatAgentService.getAgent(message.participant) // TODO(jospicer): Remove and always hardcode?
                    : this.chatAgentService.getAgent(chatSessionType);
                lastRequest = model.addRequest(parsedRequest, message.variableData ?? { variables: [] }, 0, // attempt
                undefined, agent, undefined, // slashCommand
                undefined, // confirmation
                undefined, // locationData
                undefined, // attachments
                true // isCompleteAddedRequest - this indicates it's a complete request, not user input
                );
            }
            else {
                // response
                if (lastRequest) {
                    for (const part of message.parts) {
                        model.acceptResponseProgress(lastRequest, part);
                    }
                }
            }
        }
        if (providedSession.progressObs && lastRequest && providedSession.interruptActiveResponseCallback) {
            const initialCancellationRequest = this.instantiationService.createInstance(CancellableRequest, new CancellationTokenSource(), undefined);
            this._pendingRequests.set(model.sessionResource, initialCancellationRequest);
            const cancellationListener = disposables.add(new MutableDisposable());
            const createCancellationListener = (token) => {
                return token.onCancellationRequested(() => {
                    providedSession.interruptActiveResponseCallback?.().then(userConfirmedInterruption => {
                        if (!userConfirmedInterruption) {
                            // User cancelled the interruption
                            const newCancellationRequest = this.instantiationService.createInstance(CancellableRequest, new CancellationTokenSource(), undefined);
                            this._pendingRequests.set(model.sessionResource, newCancellationRequest);
                            cancellationListener.value = createCancellationListener(newCancellationRequest.cancellationTokenSource.token);
                        }
                    });
                });
            };
            cancellationListener.value = createCancellationListener(initialCancellationRequest.cancellationTokenSource.token);
            let lastProgressLength = 0;
            disposables.add(autorun(reader => {
                const progressArray = providedSession.progressObs?.read(reader) ?? [];
                const isComplete = providedSession.isCompleteObs?.read(reader) ?? false;
                // Process only new progress items
                if (progressArray.length > lastProgressLength) {
                    const newProgress = progressArray.slice(lastProgressLength);
                    for (const progress of newProgress) {
                        model?.acceptResponseProgress(lastRequest, progress);
                    }
                    lastProgressLength = progressArray.length;
                }
                // Handle completion
                if (isComplete) {
                    lastRequest.response?.complete();
                    cancellationListener.clear();
                }
            }));
        }
        else {
            if (lastRequest) {
                lastRequest.response?.complete();
            }
        }
        return model;
    }
    getChatSessionFromInternalUri(sessionResource) {
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            return;
        }
        const { contributedChatSession } = model;
        return contributedChatSession;
    }
    async resendRequest(request, options) {
        const model = this._sessionModels.get(request.session.sessionResource);
        if (!model && model !== request.session) {
            throw new Error(`Unknown session: ${request.session.sessionResource}`);
        }
        const cts = this._pendingRequests.get(request.session.sessionResource);
        if (cts) {
            this.trace('resendRequest', `Session ${request.session.sessionResource} already has a pending request, cancelling...`);
            cts.cancel();
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const enableCommandDetection = !options?.noCommandDetection;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.modeInfo?.kind);
        model.removeRequest(request.id, 1 /* ChatRequestRemovalReason.Resend */);
        const resendOptions = {
            ...options,
            locationData: request.locationData,
            attachedContext: request.attachedContext,
        };
        await this._sendRequestAsync(model, model.sessionResource, request.message, attempt, enableCommandDetection, defaultAgent, location, resendOptions).responseCompletePromise;
    }
    async sendRequest(sessionResource, request, options) {
        this.trace('sendRequest', `sessionResource: ${sessionResource.toString()}, message: ${request.substring(0, 20)}${request.length > 20 ? '[...]' : ''}}`);
        if (!request.trim() && !options?.slashCommand && !options?.agentId && !options?.agentIdSilent) {
            this.trace('sendRequest', 'Rejected empty message');
            return;
        }
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        if (this._pendingRequests.has(sessionResource)) {
            this.trace('sendRequest', `Session ${sessionResource} already has a pending request`);
            return;
        }
        const requests = model.getRequests();
        for (let i = requests.length - 1; i >= 0; i -= 1) {
            const request = requests[i];
            if (request.shouldBeRemovedOnSend) {
                if (request.shouldBeRemovedOnSend.afterUndoStop) {
                    request.response?.finalizeUndoState();
                }
                else {
                    await this.removeRequest(sessionResource, request.id);
                }
            }
        }
        const location = options?.location ?? model.initialLocation;
        const attempt = options?.attempt ?? 0;
        const defaultAgent = this.chatAgentService.getDefaultAgent(location, options?.modeInfo?.kind);
        const parsedRequest = this.parseChatRequest(sessionResource, request, location, options);
        const silentAgent = options?.agentIdSilent ? this.chatAgentService.getAgent(options.agentIdSilent) : undefined;
        const agent = silentAgent ?? parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart)?.agent ?? defaultAgent;
        const agentSlashCommandPart = parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        // This method is only returning whether the request was accepted - don't block on the actual request
        return {
            ...this._sendRequestAsync(model, sessionResource, parsedRequest, attempt, !options?.noCommandDetection, silentAgent ?? defaultAgent, location, options),
            agent,
            slashCommand: agentSlashCommandPart?.command,
        };
    }
    parseChatRequest(sessionResource, request, location, options) {
        let parserContext = options?.parserContext;
        if (options?.agentId) {
            const agent = this.chatAgentService.getAgent(options.agentId);
            if (!agent) {
                throw new Error(`Unknown agent: ${options.agentId}`);
            }
            parserContext = { selectedAgent: agent, mode: options.modeInfo?.kind };
            const commandPart = options.slashCommand ? ` ${chatSubcommandLeader}${options.slashCommand}` : '';
            request = `${chatAgentLeader}${agent.name}${commandPart} ${request}`;
        }
        const parsedRequest = this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionResource, request, location, parserContext);
        return parsedRequest;
    }
    refreshFollowupsCancellationToken(sessionResource) {
        this._sessionFollowupCancelTokens.get(sessionResource)?.cancel();
        const newTokenSource = new CancellationTokenSource();
        this._sessionFollowupCancelTokens.set(sessionResource, newTokenSource);
        return newTokenSource.token;
    }
    _sendRequestAsync(model, sessionResource, parsedRequest, attempt, enableCommandDetection, defaultAgent, location, options) {
        const followupsCancelToken = this.refreshFollowupsCancellationToken(sessionResource);
        let request;
        const agentPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentPart);
        const agentSlashCommandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
        const commandPart = 'kind' in parsedRequest ? undefined : parsedRequest.parts.find((r) => r instanceof ChatRequestSlashCommandPart);
        const requests = [...model.getRequests()];
        const requestTelemetry = this.instantiationService.createInstance(ChatRequestTelemetry, {
            agent: agentPart?.agent ?? defaultAgent,
            agentSlashCommandPart,
            commandPart,
            sessionId: model.sessionId,
            location: model.initialLocation,
            options,
            enableCommandDetection
        });
        let gotProgress = false;
        const requestType = commandPart ? 'slashCommand' : 'string';
        const responseCreated = new DeferredPromise();
        let responseCreatedComplete = false;
        function completeResponseCreated() {
            if (!responseCreatedComplete && request?.response) {
                responseCreated.complete(request.response);
                responseCreatedComplete = true;
            }
        }
        const store = new DisposableStore();
        const source = store.add(new CancellationTokenSource());
        const token = source.token;
        const sendRequestInternal = async () => {
            const progressCallback = (progress) => {
                if (token.isCancellationRequested) {
                    return;
                }
                gotProgress = true;
                for (let i = 0; i < progress.length; i++) {
                    const isLast = i === progress.length - 1;
                    const progressItem = progress[i];
                    if (progressItem.kind === 'markdownContent') {
                        this.trace('sendRequest', `Provider returned progress for session ${model.sessionResource}, ${progressItem.content.value.length} chars`);
                    }
                    else {
                        this.trace('sendRequest', `Provider returned progress: ${JSON.stringify(progressItem)}`);
                    }
                    model.acceptResponseProgress(request, progressItem, !isLast);
                }
                completeResponseCreated();
            };
            let detectedAgent;
            let detectedCommand;
            const stopWatch = new StopWatch(false);
            store.add(token.onCancellationRequested(() => {
                this.trace('sendRequest', `Request for session ${model.sessionResource} was cancelled`);
                if (!request) {
                    return;
                }
                requestTelemetry.complete({
                    timeToFirstProgress: undefined,
                    result: 'cancelled',
                    // Normally timings happen inside the EH around the actual provider. For cancellation we can measure how long the user waited before cancelling
                    totalTime: stopWatch.elapsed(),
                    requestType,
                    detectedAgent,
                    request,
                });
                model.cancelRequest(request);
            }));
            try {
                let rawResult;
                let agentOrCommandFollowups = undefined;
                let chatTitlePromise;
                if (agentPart || (defaultAgent && !commandPart)) {
                    const prepareChatAgentRequest = (agent, command, enableCommandDetection, chatRequest, isParticipantDetected) => {
                        const initVariableData = { variables: [] };
                        request = chatRequest ?? model.addRequest(parsedRequest, initVariableData, attempt, options?.modeInfo, agent, command, options?.confirmation, options?.locationData, options?.attachedContext, undefined, options?.userSelectedModelId, options?.userSelectedTools?.get());
                        let variableData;
                        let message;
                        if (chatRequest) {
                            variableData = chatRequest.variableData;
                            message = getPromptText(request.message).message;
                        }
                        else {
                            variableData = { variables: this.prepareContext(request.attachedContext) };
                            model.updateRequest(request, variableData);
                            const promptTextResult = getPromptText(request.message);
                            variableData = updateRanges(variableData, promptTextResult.diff); // TODO bit of a hack
                            message = promptTextResult.message;
                        }
                        const agentRequest = {
                            sessionId: model.sessionId,
                            sessionResource: model.sessionResource,
                            requestId: request.id,
                            agentId: agent.id,
                            message,
                            command: command?.name,
                            variables: variableData,
                            enableCommandDetection,
                            isParticipantDetected,
                            attempt,
                            location,
                            locationData: request.locationData,
                            acceptedConfirmationData: options?.acceptedConfirmationData,
                            rejectedConfirmationData: options?.rejectedConfirmationData,
                            userSelectedModelId: options?.userSelectedModelId,
                            userSelectedTools: options?.userSelectedTools?.get(),
                            modeInstructions: options?.modeInfo?.modeInstructions,
                            editedFileEvents: request.editedFileEvents,
                        };
                        let isInitialTools = true;
                        store.add(autorun(reader => {
                            const tools = options?.userSelectedTools?.read(reader);
                            if (isInitialTools) {
                                isInitialTools = false;
                                return;
                            }
                            if (tools) {
                                this.chatAgentService.setRequestTools(agent.id, request.id, tools);
                                // in case the request has not been sent out yet:
                                agentRequest.userSelectedTools = tools;
                            }
                        }));
                        return agentRequest;
                    };
                    if (this.configurationService.getValue('chat.detectParticipant.enabled') !== false &&
                        this.chatAgentService.hasChatParticipantDetectionProviders() &&
                        !agentPart &&
                        !commandPart &&
                        !agentSlashCommandPart &&
                        enableCommandDetection &&
                        location !== ChatAgentLocation.EditorInline &&
                        options?.modeInfo?.kind !== ChatModeKind.Agent &&
                        options?.modeInfo?.kind !== ChatModeKind.Edit &&
                        !options?.agentIdSilent) {
                        // We have no agent or command to scope history with, pass the full history to the participant detection provider
                        const defaultAgentHistory = this.getHistoryEntriesFromModel(requests, model.sessionId, location, defaultAgent.id);
                        // Prepare the request object that we will send to the participant detection provider
                        const chatAgentRequest = prepareChatAgentRequest(defaultAgent, undefined, enableCommandDetection, undefined, false);
                        const result = await this.chatAgentService.detectAgentOrCommand(chatAgentRequest, defaultAgentHistory, { location }, token);
                        if (result && this.chatAgentService.getAgent(result.agent.id)?.locations?.includes(location)) {
                            // Update the response in the ChatModel to reflect the detected agent and command
                            request.response?.setAgent(result.agent, result.command);
                            detectedAgent = result.agent;
                            detectedCommand = result.command;
                        }
                    }
                    const agent = (detectedAgent ?? agentPart?.agent ?? defaultAgent);
                    const command = detectedCommand ?? agentSlashCommandPart?.command;
                    await this.extensionService.activateByEvent(`onChatParticipant:${agent.id}`);
                    // Recompute history in case the agent or command changed
                    const history = this.getHistoryEntriesFromModel(requests, model.sessionId, location, agent.id);
                    const requestProps = prepareChatAgentRequest(agent, command, enableCommandDetection, request /* Reuse the request object if we already created it for participant detection */, !!detectedAgent);
                    const pendingRequest = this._pendingRequests.get(sessionResource);
                    if (pendingRequest && !pendingRequest.requestId) {
                        pendingRequest.requestId = requestProps.requestId;
                    }
                    completeResponseCreated();
                    // MCP autostart: only run for native VS Code sessions (sidebar, new editors) but not for extension contributed sessions that have inputType set.
                    if (model.canUseTools) {
                        const autostartResult = new ChatMcpServersStarting(this.mcpService.autostart(token));
                        if (!autostartResult.isEmpty) {
                            progressCallback([autostartResult]);
                            await autostartResult.wait();
                        }
                    }
                    const agentResult = await this.chatAgentService.invokeAgent(agent.id, requestProps, progressCallback, history, token);
                    rawResult = agentResult;
                    agentOrCommandFollowups = this.chatAgentService.getFollowups(agent.id, requestProps, agentResult, history, followupsCancelToken);
                    // Use LLM to generate the chat title
                    if (model.getRequests().length === 1 && !model.customTitle) {
                        const chatHistory = this.getHistoryEntriesFromModel(model.getRequests(), model.sessionId, location, agent.id);
                        chatTitlePromise = this.chatAgentService.getChatTitle(agent.id, chatHistory, CancellationToken.None).then((title) => {
                            // Since not every chat agent implements title generation, we can fallback to the default agent
                            // which supports it
                            if (title === undefined) {
                                const defaultAgentForTitle = this.chatAgentService.getDefaultAgent(location);
                                if (defaultAgentForTitle) {
                                    return this.chatAgentService.getChatTitle(defaultAgentForTitle.id, chatHistory, CancellationToken.None);
                                }
                            }
                            return title;
                        });
                    }
                }
                else if (commandPart && this.chatSlashCommandService.hasCommand(commandPart.slashCommand.command)) {
                    if (commandPart.slashCommand.silent !== true) {
                        request = model.addRequest(parsedRequest, { variables: [] }, attempt, options?.modeInfo);
                        completeResponseCreated();
                    }
                    // contributed slash commands
                    // TODO: spell this out in the UI
                    const history = [];
                    for (const modelRequest of model.getRequests()) {
                        if (!modelRequest.response) {
                            continue;
                        }
                        history.push({ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: modelRequest.message.text }] });
                        history.push({ role: 2 /* ChatMessageRole.Assistant */, content: [{ type: 'text', value: modelRequest.response.response.toString() }] });
                    }
                    const message = parsedRequest.text;
                    const commandResult = await this.chatSlashCommandService.executeCommand(commandPart.slashCommand.command, message.substring(commandPart.slashCommand.command.length + 1).trimStart(), new Progress(p => {
                        progressCallback([p]);
                    }), history, location, token);
                    agentOrCommandFollowups = Promise.resolve(commandResult?.followUp);
                    rawResult = {};
                }
                else {
                    throw new Error(`Cannot handle request`);
                }
                if (token.isCancellationRequested && !rawResult) {
                    return;
                }
                else {
                    if (!rawResult) {
                        this.trace('sendRequest', `Provider returned no response for session ${model.sessionResource}`);
                        rawResult = { errorDetails: { message: localize('emptyResponse', "Provider returned null response") } };
                    }
                    const result = rawResult.errorDetails?.responseIsFiltered ? 'filtered' :
                        rawResult.errorDetails && gotProgress ? 'errorWithOutput' :
                            rawResult.errorDetails ? 'error' :
                                'success';
                    requestTelemetry.complete({
                        timeToFirstProgress: rawResult.timings?.firstProgress,
                        totalTime: rawResult.timings?.totalElapsed,
                        result,
                        requestType,
                        detectedAgent,
                        request,
                    });
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    this.trace('sendRequest', `Provider returned response for session ${model.sessionResource}`);
                    request.response?.complete();
                    if (agentOrCommandFollowups) {
                        agentOrCommandFollowups.then(followups => {
                            model.setFollowups(request, followups);
                            const commandForTelemetry = agentSlashCommandPart ? agentSlashCommandPart.command.name : commandPart?.slashCommand.command;
                            this._chatServiceTelemetry.retrievedFollowups(agentPart?.agent.id ?? '', commandForTelemetry, followups?.length ?? 0);
                        });
                    }
                    chatTitlePromise?.then(title => {
                        if (title) {
                            model.setCustomTitle(title);
                        }
                    });
                }
            }
            catch (err) {
                this.logService.error(`Error while handling chat request: ${toErrorMessage(err, true)}`);
                requestTelemetry.complete({
                    timeToFirstProgress: undefined,
                    totalTime: undefined,
                    result: 'error',
                    requestType,
                    detectedAgent,
                    request,
                });
                if (request) {
                    // Puku Editor: Suppress PukuLoginRequired error - auth flow will handle sign-in
                    if (err instanceof Error && err.name === 'PukuLoginRequired') {
                        // Don't show error to user, just complete the request
                        // Sign-in flow will be triggered by chat entitlement service
                        completeResponseCreated();
                        return;
                    }
                    const rawResult = { errorDetails: { message: err.message } };
                    model.setResponse(request, rawResult);
                    completeResponseCreated();
                    request.response?.complete();
                }
            }
            finally {
                store.dispose();
            }
        };
        const rawResponsePromise = sendRequestInternal();
        // Note- requestId is not known at this point, assigned later
        this._pendingRequests.set(model.sessionResource, this.instantiationService.createInstance(CancellableRequest, source, undefined));
        rawResponsePromise.finally(() => {
            this._pendingRequests.deleteAndDispose(model.sessionResource);
        });
        this._onDidSubmitRequest.fire({ chatSessionResource: model.sessionResource });
        return {
            responseCreatedPromise: responseCreated.p,
            responseCompletePromise: rawResponsePromise,
        };
    }
    prepareContext(attachedContextVariables) {
        attachedContextVariables ??= [];
        // "reverse", high index first so that replacement is simple
        attachedContextVariables.sort((a, b) => {
            // If either range is undefined, sort it to the back
            if (!a.range && !b.range) {
                return 0; // Keep relative order if both ranges are undefined
            }
            if (!a.range) {
                return 1; // a goes after b
            }
            if (!b.range) {
                return -1; // a goes before b
            }
            return b.range.start - a.range.start;
        });
        return attachedContextVariables;
    }
    getHistoryEntriesFromModel(requests, sessionId, location, forAgentId) {
        const history = [];
        const agent = this.chatAgentService.getAgent(forAgentId);
        for (const request of requests) {
            if (!request.response) {
                continue;
            }
            if (forAgentId !== request.response.agent?.id && !agent?.isDefault && !agent?.canAccessPreviousChatHistory) {
                // An agent only gets to see requests that were sent to this agent.
                // The default agent (the undefined case), or agents with 'canAccessPreviousChatHistory', get to see all of them.
                continue;
            }
            // Do not save to history inline completions
            if (location === ChatAgentLocation.EditorInline) {
                continue;
            }
            const promptTextResult = getPromptText(request.message);
            const historyRequest = {
                sessionId: sessionId,
                sessionResource: request.session.sessionResource,
                requestId: request.id,
                agentId: request.response.agent?.id ?? '',
                message: promptTextResult.message,
                command: request.response.slashCommand?.name,
                variables: updateRanges(request.variableData, promptTextResult.diff), // TODO bit of a hack
                location: ChatAgentLocation.Chat,
                editedFileEvents: request.editedFileEvents,
            };
            history.push({ request: historyRequest, response: toChatHistoryContent(request.response.response.value), result: request.response.result ?? {} });
        }
        return history;
    }
    async removeRequest(sessionResource, requestId) {
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const pendingRequest = this._pendingRequests.get(sessionResource);
        if (pendingRequest?.requestId === requestId) {
            pendingRequest.cancel();
            this._pendingRequests.deleteAndDispose(sessionResource);
        }
        model.removeRequest(requestId);
    }
    async adoptRequest(sessionResource, request) {
        if (!(request instanceof ChatRequestModel)) {
            throw new TypeError('Can only adopt requests of type ChatRequestModel');
        }
        const target = this._sessionModels.get(sessionResource);
        if (!target) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const oldOwner = request.session;
        target.adoptRequest(request);
        if (request.response && !request.response.isComplete) {
            const cts = this._pendingRequests.deleteAndLeak(oldOwner.sessionResource);
            if (cts) {
                cts.requestId = request.id;
                this._pendingRequests.set(target.sessionResource, cts);
            }
        }
    }
    async addCompleteRequest(sessionResource, message, variableData, attempt, response) {
        this.trace('addCompleteRequest', `message: ${message}`);
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const parsedRequest = typeof message === 'string' ?
            this.instantiationService.createInstance(ChatRequestParser).parseChatRequest(sessionResource, message) :
            message;
        const request = model.addRequest(parsedRequest, variableData || { variables: [] }, attempt ?? 0, undefined, undefined, undefined, undefined, undefined, undefined, true);
        if (typeof response.message === 'string') {
            // TODO is this possible?
            model.acceptResponseProgress(request, { content: new MarkdownString(response.message), kind: 'markdownContent' });
        }
        else {
            for (const part of response.message) {
                model.acceptResponseProgress(request, part, true);
            }
        }
        model.setResponse(request, response.result || {});
        if (response.followups !== undefined) {
            model.setFollowups(request, response.followups);
        }
        request.response?.complete();
    }
    cancelCurrentRequestForSession(sessionResource) {
        this.trace('cancelCurrentRequestForSession', `session: ${sessionResource}`);
        this._pendingRequests.get(sessionResource)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionResource);
    }
    async clearSession(sessionResource) {
        this.trace('clearSession', `session: ${sessionResource}`);
        const model = this._sessionModels.get(sessionResource);
        if (!model) {
            throw new Error(`Unknown session: ${sessionResource}`);
        }
        const localSessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (localSessionId && (model.initialLocation === ChatAgentLocation.Chat)) {
            // Always preserve sessions that have custom titles, even if empty
            if (model.getRequests().length === 0 && !model.customTitle) {
                await this._chatSessionStore.deleteSession(localSessionId);
            }
            else {
                await this._chatSessionStore.storeSessions([model]);
            }
        }
        this._sessionModels.delete(sessionResource);
        model.dispose();
        this._pendingRequests.get(sessionResource)?.cancel();
        this._pendingRequests.deleteAndDispose(sessionResource);
        this._onDidDisposeSession.fire({ sessionResource, reason: 'cleared' });
    }
    hasSessions() {
        return this._chatSessionStore.hasSessions();
    }
    transferChatSession(transferredSessionData, toWorkspace) {
        const model = Iterable.find(this._sessionModels.values(), model => model.sessionId === transferredSessionData.sessionId);
        if (!model) {
            throw new Error(`Failed to transfer session. Unknown session ID: ${transferredSessionData.sessionId}`);
        }
        const existingRaw = this.storageService.getObject(TransferredGlobalChatKey, 0 /* StorageScope.PROFILE */, []);
        existingRaw.push({
            chat: model.toJSON(),
            timestampInMilliseconds: Date.now(),
            toWorkspace: toWorkspace,
            inputState: transferredSessionData.inputState,
            location: transferredSessionData.location,
        });
        this.storageService.store(TransferredGlobalChatKey, JSON.stringify(existingRaw), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        this.chatTransferService.addWorkspaceToTransferred(toWorkspace);
        this.trace('transferChatSession', `Transferred session ${model.sessionResource} to workspace ${toWorkspace.toString()}`);
    }
    getChatStorageFolder() {
        return this._chatSessionStore.getChatStorageFolder();
    }
    logChatIndex() {
        this._chatSessionStore.logIndex();
    }
    setTitle(sessionResource, title) {
        this._sessionModels.get(sessionResource)?.setCustomTitle(title);
    }
    appendProgress(request, progress) {
        const model = this._sessionModels.get(request.session.sessionResource);
        if (!(request instanceof ChatRequestModel)) {
            throw new BugIndicatingError('Can only append progress to requests of type ChatRequestModel');
        }
        model?.acceptResponseProgress(request, progress);
    }
    toLocalSessionId(sessionResource) {
        const localSessionId = LocalChatSessionUri.parseLocalSessionId(sessionResource);
        if (!localSessionId) {
            throw new Error(`Invalid local chat session resource: ${sessionResource}`);
        }
        return localSessionId;
    }
};
ChatService = __decorate([
    __param(0, IStorageService),
    __param(1, ILogService),
    __param(2, IExtensionService),
    __param(3, IInstantiationService),
    __param(4, IWorkspaceContextService),
    __param(5, IChatSlashCommandService),
    __param(6, IChatAgentService),
    __param(7, IConfigurationService),
    __param(8, IChatTransferService),
    __param(9, IChatSessionsService),
    __param(10, IMcpService)
], ChatService);
export { ChatService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlcnZpY2VJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDekUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEksT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFH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