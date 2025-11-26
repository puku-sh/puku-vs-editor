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
import { raceCancellationError } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { revive } from '../../../base/common/marshalling.js';
import { autorun, observableValue } from '../../../base/common/observable.js';
import { isEqual } from '../../../base/common/resources.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ChatEditorInput } from '../../contrib/chat/browser/chatEditorInput.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
export class ObservableChatSession extends Disposable {
    get options() {
        return this._options;
    }
    get progressObs() {
        return this._progressObservable;
    }
    get isCompleteObs() {
        return this._isCompleteObservable;
    }
    constructor(resource, providerHandle, proxy, logService, dialogService) {
        super();
        this._progressObservable = observableValue(this, []);
        this._isCompleteObservable = observableValue(this, false);
        this._onWillDispose = new Emitter();
        this.onWillDispose = this._onWillDispose.event;
        this._pendingProgressChunks = new Map();
        this._isInitialized = false;
        this._interruptionWasCanceled = false;
        this._disposalPending = false;
        this.sessionResource = resource;
        this.providerHandle = providerHandle;
        this.history = [];
        this._proxy = proxy;
        this._providerHandle = providerHandle;
        this._logService = logService;
        this._dialogService = dialogService;
    }
    initialize(token) {
        if (!this._initializationPromise) {
            this._initializationPromise = this._doInitializeContent(token);
        }
        return this._initializationPromise;
    }
    async _doInitializeContent(token) {
        try {
            const sessionContent = await raceCancellationError(this._proxy.$provideChatSessionContent(this._providerHandle, this.sessionResource, token), token);
            this._options = sessionContent.options;
            this.history.length = 0;
            this.history.push(...sessionContent.history.map((turn) => {
                if (turn.type === 'request') {
                    const variables = turn.variableData?.variables.map(v => {
                        const entry = {
                            ...v,
                            value: revive(v.value)
                        };
                        return entry;
                    });
                    return {
                        type: 'request',
                        prompt: turn.prompt,
                        participant: turn.participant,
                        command: turn.command,
                        variableData: variables ? { variables } : undefined
                    };
                }
                return {
                    type: 'response',
                    parts: turn.parts.map((part) => revive(part)),
                    participant: turn.participant
                };
            }));
            if (sessionContent.hasActiveResponseCallback && !this.interruptActiveResponseCallback) {
                this.interruptActiveResponseCallback = async () => {
                    const confirmInterrupt = () => {
                        if (this._disposalPending) {
                            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
                            this._disposalPending = false;
                        }
                        this._proxy.$interruptChatSessionActiveResponse(this._providerHandle, this.sessionResource, 'ongoing');
                        return true;
                    };
                    if (sessionContent.supportsInterruption) {
                        // If the session supports hot reload, interrupt without confirmation
                        return confirmInterrupt();
                    }
                    // Prompt the user to confirm interruption
                    return this._dialogService.confirm({
                        message: localize(2807, null)
                    }).then(confirmed => {
                        if (confirmed.confirmed) {
                            // User confirmed interruption - dispose the session content on extension host
                            return confirmInterrupt();
                        }
                        else {
                            // When user cancels the interruption, fire an empty progress message to keep the session alive
                            // This matches the behavior of the old implementation
                            this._addProgress([{
                                    kind: 'progressMessage',
                                    content: { value: '', isTrusted: false }
                                }]);
                            // Set flag to prevent completion when extension host calls handleProgressComplete
                            this._interruptionWasCanceled = true;
                            // User canceled interruption - cancel the deferred disposal
                            if (this._disposalPending) {
                                this._logService.info(`Canceling deferred disposal for session ${this.sessionResource} (user canceled interruption)`);
                                this._disposalPending = false;
                            }
                            return false;
                        }
                    });
                };
            }
            if (sessionContent.hasRequestHandler && !this.requestHandler) {
                this.requestHandler = async (request, progress, history, token) => {
                    // Clear previous progress and mark as active
                    this._progressObservable.set([], undefined);
                    this._isCompleteObservable.set(false, undefined);
                    // Set up reactive progress observation before starting the request
                    let lastProgressLength = 0;
                    const progressDisposable = autorun(reader => {
                        const progressArray = this._progressObservable.read(reader);
                        const isComplete = this._isCompleteObservable.read(reader);
                        if (progressArray.length > lastProgressLength) {
                            const newProgress = progressArray.slice(lastProgressLength);
                            progress(newProgress);
                            lastProgressLength = progressArray.length;
                        }
                        if (isComplete) {
                            progressDisposable.dispose();
                        }
                    });
                    try {
                        await this._proxy.$invokeChatSessionRequestHandler(this._providerHandle, this.sessionResource, request, history, token);
                        // Only mark as complete if there's no active response callback
                        // Sessions with active response callbacks should only complete when explicitly told to via handleProgressComplete
                        if (!this._isCompleteObservable.get() && !this.interruptActiveResponseCallback) {
                            this._markComplete();
                        }
                    }
                    catch (error) {
                        const errorProgress = {
                            kind: 'progressMessage',
                            content: { value: `Error: ${error instanceof Error ? error.message : String(error)}`, isTrusted: false }
                        };
                        this._addProgress([errorProgress]);
                        this._markComplete();
                        throw error;
                    }
                    finally {
                        // Ensure progress observation is cleaned up
                        progressDisposable.dispose();
                    }
                };
            }
            this._isInitialized = true;
            // Process any pending progress chunks
            const hasActiveResponse = sessionContent.hasActiveResponseCallback;
            const hasRequestHandler = sessionContent.hasRequestHandler;
            const hasAnyCapability = hasActiveResponse || hasRequestHandler;
            for (const [requestId, chunks] of this._pendingProgressChunks) {
                this._logService.debug(`Processing ${chunks.length} pending progress chunks for session ${this.sessionResource}, requestId ${requestId}`);
                this._addProgress(chunks);
            }
            this._pendingProgressChunks.clear();
            // If session has no active response callback and no request handler, mark it as complete
            if (!hasAnyCapability) {
                this._isCompleteObservable.set(true, undefined);
            }
        }
        catch (error) {
            this._logService.error(`Failed to initialize chat session ${this.sessionResource}:`, error);
            throw error;
        }
    }
    /**
     * Handle progress chunks coming from the extension host.
     * If the session is not initialized yet, the chunks will be queued.
     */
    handleProgressChunk(requestId, progress) {
        if (!this._isInitialized) {
            const existing = this._pendingProgressChunks.get(requestId) || [];
            this._pendingProgressChunks.set(requestId, [...existing, ...progress]);
            this._logService.debug(`Queuing ${progress.length} progress chunks for session ${this.sessionResource}, requestId ${requestId} (session not initialized)`);
            return;
        }
        this._addProgress(progress);
    }
    /**
     * Handle progress completion from the extension host.
     */
    handleProgressComplete(requestId) {
        // Clean up any pending chunks for this request
        this._pendingProgressChunks.delete(requestId);
        if (this._isInitialized) {
            // Don't mark as complete if user canceled the interruption
            if (!this._interruptionWasCanceled) {
                this._markComplete();
            }
            else {
                // Reset the flag and don't mark as complete
                this._interruptionWasCanceled = false;
            }
        }
    }
    _addProgress(progress) {
        const currentProgress = this._progressObservable.get();
        this._progressObservable.set([...currentProgress, ...progress], undefined);
    }
    _markComplete() {
        if (!this._isCompleteObservable.get()) {
            this._isCompleteObservable.set(true, undefined);
        }
    }
    dispose() {
        this._onWillDispose.fire();
        this._onWillDispose.dispose();
        this._pendingProgressChunks.clear();
        // If this session has an active response callback and disposal is happening,
        // defer the actual session content disposal until we know the user's choice
        if (this.interruptActiveResponseCallback && !this._interruptionWasCanceled) {
            this._disposalPending = true;
            // The actual disposal will happen in the interruption callback based on user's choice
        }
        else {
            // No active response callback or user already canceled interruption - dispose immediately
            this._proxy.$disposeChatSessionContent(this._providerHandle, this.sessionResource);
        }
        super.dispose();
    }
}
let MainThreadChatSessions = class MainThreadChatSessions extends Disposable {
    constructor(_extHostContext, _chatSessionsService, _dialogService, _editorService, editorGroupService, _logService) {
        super();
        this._extHostContext = _extHostContext;
        this._chatSessionsService = _chatSessionsService;
        this._dialogService = _dialogService;
        this._editorService = _editorService;
        this.editorGroupService = editorGroupService;
        this._logService = _logService;
        this._itemProvidersRegistrations = this._register(new DisposableMap());
        this._contentProvidersRegistrations = this._register(new DisposableMap());
        this._sessionTypeToHandle = new Map();
        this._activeSessions = new ResourceMap();
        this._sessionDisposables = new ResourceMap();
        this._proxy = this._extHostContext.getProxy(ExtHostContext.ExtHostChatSessions);
        this._chatSessionsService.setOptionsChangeCallback(async (sessionResource, updates) => {
            const handle = this._getHandleForSessionType(sessionResource.scheme);
            if (handle !== undefined) {
                await this.notifyOptionsChange(handle, sessionResource, updates);
            }
        });
    }
    _getHandleForSessionType(chatSessionType) {
        return this._sessionTypeToHandle.get(chatSessionType);
    }
    $registerChatSessionItemProvider(handle, chatSessionType) {
        // Register the provider handle - this tracks that a provider exists
        const disposables = new DisposableStore();
        const changeEmitter = disposables.add(new Emitter());
        const provider = {
            chatSessionType,
            onDidChangeChatSessionItems: changeEmitter.event,
            provideChatSessionItems: (token) => this._provideChatSessionItems(handle, token),
            provideNewChatSessionItem: (options, token) => this._provideNewChatSessionItem(handle, options, token)
        };
        disposables.add(this._chatSessionsService.registerChatSessionItemProvider(provider));
        this._itemProvidersRegistrations.set(handle, {
            dispose: () => disposables.dispose(),
            provider,
            onDidChangeItems: changeEmitter,
        });
    }
    $onDidChangeChatSessionItems(handle) {
        this._itemProvidersRegistrations.get(handle)?.onDidChangeItems.fire();
    }
    async $onDidCommitChatSessionItem(handle, originalComponents, modifiedCompoennts) {
        const originalResource = URI.revive(originalComponents);
        const modifiedResource = URI.revive(modifiedCompoennts);
        this._logService.trace(`$onDidCommitChatSessionItem: handle(${handle}), original(${originalResource}), modified(${modifiedResource})`);
        const chatSessionType = this._itemProvidersRegistrations.get(handle)?.provider.chatSessionType;
        if (!chatSessionType) {
            this._logService.error(`No chat session type found for provider handle ${handle}`);
            return;
        }
        const originalEditor = this._editorService.editors.find(editor => editor.resource?.toString() === originalResource.toString());
        const contribution = this._chatSessionsService.getAllChatSessionContributions().find(c => c.type === chatSessionType);
        // Find the group containing the original editor
        const originalGroup = this.editorGroupService.groups.find(group => group.editors.some(editor => isEqual(editor.resource, originalResource)))
            ?? this.editorGroupService.activeGroup;
        const options = {
            title: {
                preferred: originalEditor?.getName() || undefined,
                fallback: localize(2808, null, contribution?.displayName),
            }
        };
        if (originalEditor) {
            // Prefetch the chat session content to make the subsequent editor swap quick
            const newSession = await this._chatSessionsService.getOrCreateChatSession(URI.revive(modifiedResource), CancellationToken.None);
            newSession.initialEditingSession = originalEditor instanceof ChatEditorInput
                ? originalEditor.transferOutEditingSession()
                : undefined;
            this._editorService.replaceEditors([{
                    editor: originalEditor,
                    replacement: {
                        resource: modifiedResource,
                        options,
                    },
                }], originalGroup);
        }
        else {
            this._logService.warn(`Original chat session editor not found for resource ${originalResource.toString()}`);
            this._editorService.openEditor({ resource: modifiedResource }, originalGroup);
        }
    }
    async _provideChatSessionItems(handle, token) {
        try {
            // Get all results as an array from the RPC call
            const sessions = await this._proxy.$provideChatSessionItems(handle, token);
            return sessions.map(session => ({
                ...session,
                resource: URI.revive(session.resource),
                iconPath: session.iconPath,
                tooltip: session.tooltip ? this._reviveTooltip(session.tooltip) : undefined
            }));
        }
        catch (error) {
            this._logService.error('Error providing chat sessions:', error);
        }
        return [];
    }
    async _provideNewChatSessionItem(handle, options, token) {
        try {
            const chatSessionItem = await this._proxy.$provideNewChatSessionItem(handle, options, token);
            if (!chatSessionItem) {
                throw new Error('Extension failed to create chat session');
            }
            return {
                ...chatSessionItem,
                resource: URI.revive(chatSessionItem.resource),
                iconPath: chatSessionItem.iconPath,
                tooltip: chatSessionItem.tooltip ? this._reviveTooltip(chatSessionItem.tooltip) : undefined,
            };
        }
        catch (error) {
            this._logService.error('Error creating chat session:', error);
            throw error;
        }
    }
    async _provideChatSessionContent(providerHandle, sessionResource, token) {
        let session = this._activeSessions.get(sessionResource);
        if (!session) {
            session = new ObservableChatSession(sessionResource, providerHandle, this._proxy, this._logService, this._dialogService);
            this._activeSessions.set(sessionResource, session);
            const disposable = session.onWillDispose(() => {
                this._activeSessions.delete(sessionResource);
                this._sessionDisposables.get(sessionResource)?.dispose();
                this._sessionDisposables.delete(sessionResource);
            });
            this._sessionDisposables.set(sessionResource, disposable);
        }
        try {
            await session.initialize(token);
            if (session.options) {
                for (const [_, handle] of this._sessionTypeToHandle) {
                    if (handle === providerHandle) {
                        for (const [optionId, value] of Object.entries(session.options)) {
                            this._chatSessionsService.setSessionOption(sessionResource, optionId, value);
                        }
                        break;
                    }
                }
            }
            return session;
        }
        catch (error) {
            session.dispose();
            this._logService.error(`Error providing chat session content for handle ${providerHandle} and resource ${sessionResource.toString()}:`, error);
            throw error;
        }
    }
    $unregisterChatSessionItemProvider(handle) {
        this._itemProvidersRegistrations.deleteAndDispose(handle);
    }
    $registerChatSessionContentProvider(handle, chatSessionScheme) {
        const provider = {
            provideChatSessionContent: (resource, token) => this._provideChatSessionContent(handle, resource, token)
        };
        this._sessionTypeToHandle.set(chatSessionScheme, handle);
        this._contentProvidersRegistrations.set(handle, this._chatSessionsService.registerChatSessionContentProvider(chatSessionScheme, provider));
        this._proxy.$provideChatSessionProviderOptions(handle, CancellationToken.None).then(options => {
            if (options?.optionGroups && options.optionGroups.length) {
                this._chatSessionsService.setOptionGroupsForSessionType(chatSessionScheme, handle, options.optionGroups);
            }
        }).catch(err => this._logService.error('Error fetching chat session options', err));
    }
    $unregisterChatSessionContentProvider(handle) {
        this._contentProvidersRegistrations.deleteAndDispose(handle);
        for (const [sessionType, h] of this._sessionTypeToHandle) {
            if (h === handle) {
                this._sessionTypeToHandle.delete(sessionType);
                break;
            }
        }
        // dispose all sessions from this provider and clean up its disposables
        for (const [key, session] of this._activeSessions) {
            if (session.providerHandle === handle) {
                session.dispose();
                this._activeSessions.delete(key);
            }
        }
    }
    async $handleProgressChunk(handle, sessionResource, requestId, chunks) {
        const resource = URI.revive(sessionResource);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress chunks: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        const chatProgressParts = chunks.map(chunk => {
            const [progress] = Array.isArray(chunk) ? chunk : [chunk];
            return revive(progress);
        });
        observableSession.handleProgressChunk(requestId, chatProgressParts);
    }
    $handleProgressComplete(handle, sessionResource, requestId) {
        const resource = URI.revive(sessionResource);
        const observableSession = this._activeSessions.get(resource);
        if (!observableSession) {
            this._logService.warn(`No session found for progress completion: handle ${handle}, sessionResource ${resource}, requestId ${requestId}`);
            return;
        }
        observableSession.handleProgressComplete(requestId);
    }
    $handleAnchorResolve(handle, sesssionResource, requestId, requestHandle, anchor) {
        // throw new Error('Method not implemented.');
    }
    dispose() {
        for (const session of this._activeSessions.values()) {
            session.dispose();
        }
        this._activeSessions.clear();
        for (const disposable of this._sessionDisposables.values()) {
            disposable.dispose();
        }
        this._sessionDisposables.clear();
        super.dispose();
    }
    _reviveTooltip(tooltip) {
        if (!tooltip) {
            return undefined;
        }
        // If it's already a string, return as-is
        if (typeof tooltip === 'string') {
            return tooltip;
        }
        // If it's a serialized IMarkdownString, revive it to MarkdownString
        if (typeof tooltip === 'object' && 'value' in tooltip) {
            return MarkdownString.lift(tooltip);
        }
        return undefined;
    }
    /**
     * Notify the extension about option changes for a session
     */
    async notifyOptionsChange(handle, sessionResource, updates) {
        try {
            await this._proxy.$provideHandleOptionsChange(handle, sessionResource, updates, CancellationToken.None);
        }
        catch (error) {
            this._logService.error(`Error notifying extension about options change for handle ${handle}, sessionResource ${sessionResource}:`, error);
        }
    }
};
MainThreadChatSessions = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatSessions),
    __param(1, IChatSessionsService),
    __param(2, IDialogService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, ILogService)
], MainThreadChatSessions);
export { MainThreadChatSessions };
//# sourceMappingURL=mainThreadChatSessions.js.map