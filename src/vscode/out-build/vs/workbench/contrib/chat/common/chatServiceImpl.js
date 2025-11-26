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
            const title = session.title || localize(6420, null);
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
                        rawResult = { errorDetails: { message: localize(6421, null) } };
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
//# sourceMappingURL=chatServiceImpl.js.map