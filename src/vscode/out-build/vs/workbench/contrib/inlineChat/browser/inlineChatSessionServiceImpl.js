var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineChatEscapeToolContribution_1;
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { Schemas } from '../../../../base/common/network.js';
import { autorun, observableFromEvent } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isCodeEditor, isCompositeEditor, isDiffEditor } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize, localize2 } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAgentService } from '../../chat/common/chatAgents.js';
import { IChatService } from '../../chat/common/chatService.js';
import { ChatAgentLocation } from '../../chat/common/constants.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { CTX_INLINE_CHAT_HAS_AGENT2, CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT, CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE, CTX_INLINE_CHAT_POSSIBLE } from '../common/inlineChat.js';
import { HunkData, Session, SessionWholeRange, StashedSession } from './inlineChatSession.js';
import { askInPanelChat, IInlineChatSessionService } from './inlineChatSessionService.js';
export class InlineChatError extends Error {
    static { this.code = 'InlineChatError'; }
    constructor(message) {
        super(message);
        this.name = InlineChatError.code;
    }
}
let InlineChatSessionServiceImpl = class InlineChatSessionServiceImpl {
    constructor(_telemetryService, _modelService, _textModelService, _editorWorkerService, _logService, _instaService, _editorService, _textFileService, _languageService, _chatService, _chatAgentService, _chatWidgetService) {
        this._telemetryService = _telemetryService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._logService = _logService;
        this._instaService = _instaService;
        this._editorService = _editorService;
        this._textFileService = _textFileService;
        this._languageService = _languageService;
        this._chatService = _chatService;
        this._chatAgentService = _chatAgentService;
        this._chatWidgetService = _chatWidgetService;
        this._store = new DisposableStore();
        this._onWillStartSession = this._store.add(new Emitter());
        this.onWillStartSession = this._onWillStartSession.event;
        this._onDidMoveSession = this._store.add(new Emitter());
        this.onDidMoveSession = this._onDidMoveSession.event;
        this._onDidEndSession = this._store.add(new Emitter());
        this.onDidEndSession = this._onDidEndSession.event;
        this._onDidStashSession = this._store.add(new Emitter());
        this.onDidStashSession = this._onDidStashSession.event;
        this._sessions = new Map();
        this._keyComputers = new Map();
        // ---- NEW
        this._sessions2 = new ResourceMap();
        this._onDidChangeSessions = this._store.add(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    dispose() {
        this._store.dispose();
        this._sessions.forEach(x => x.store.dispose());
        this._sessions.clear();
    }
    async createSession(editor, options, token) {
        const agent = this._chatAgentService.getDefaultAgent(ChatAgentLocation.EditorInline);
        if (!agent) {
            this._logService.trace('[IE] NO agent found');
            return undefined;
        }
        this._onWillStartSession.fire(editor);
        const textModel = editor.getModel();
        const selection = editor.getSelection();
        const store = new DisposableStore();
        this._logService.trace(`[IE] creating NEW session for ${editor.getId()}, ${agent.extensionId}`);
        const chatModel = options.session?.chatModel ?? this._chatService.startSession(ChatAgentLocation.EditorInline, token);
        if (!chatModel) {
            this._logService.trace('[IE] NO chatModel found');
            return undefined;
        }
        store.add(toDisposable(() => {
            const doesOtherSessionUseChatModel = [...this._sessions.values()].some(data => data.session !== session && data.session.chatModel === chatModel);
            if (!doesOtherSessionUseChatModel) {
                this._chatService.clearSession(chatModel.sessionResource);
                chatModel.dispose();
            }
        }));
        const lastResponseListener = store.add(new MutableDisposable());
        store.add(chatModel.onDidChange(e => {
            if (e.kind !== 'addRequest' || !e.request.response) {
                return;
            }
            const { response } = e.request;
            session.markModelVersion(e.request);
            lastResponseListener.value = response.onDidChange(() => {
                if (!response.isComplete) {
                    return;
                }
                lastResponseListener.clear(); // ONCE
                // special handling for untitled files
                for (const part of response.response.value) {
                    if (part.kind !== 'textEditGroup' || part.uri.scheme !== Schemas.untitled || isEqual(part.uri, session.textModelN.uri)) {
                        continue;
                    }
                    const langSelection = this._languageService.createByFilepathOrFirstLine(part.uri, undefined);
                    const untitledTextModel = this._textFileService.untitled.create({
                        associatedResource: part.uri,
                        languageId: langSelection.languageId
                    });
                    untitledTextModel.resolve();
                    this._textModelService.createModelReference(part.uri).then(ref => {
                        store.add(ref);
                    });
                }
            });
        }));
        store.add(this._chatAgentService.onDidChangeAgents(e => {
            if (e === undefined && (!this._chatAgentService.getAgent(agent.id) || !this._chatAgentService.getActivatedAgents().map(agent => agent.id).includes(agent.id))) {
                this._logService.trace(`[IE] provider GONE for ${editor.getId()}, ${agent.extensionId}`);
                this._releaseSession(session, true);
            }
        }));
        const id = generateUuid();
        const targetUri = textModel.uri;
        // AI edits happen in the actual model, keep a reference but make no copy
        store.add((await this._textModelService.createModelReference(textModel.uri)));
        const textModelN = textModel;
        // create: keep a snapshot of the "actual" model
        const textModel0 = store.add(this._modelService.createModel(createTextBufferFactoryFromSnapshot(textModel.createSnapshot()), { languageId: textModel.getLanguageId(), onDidChange: Event.None }, targetUri.with({ scheme: Schemas.vscode, authority: 'inline-chat', path: '', query: new URLSearchParams({ id, 'textModel0': '' }).toString() }), true));
        // untitled documents are special and we are releasing their session when their last editor closes
        if (targetUri.scheme === Schemas.untitled) {
            store.add(this._editorService.onDidCloseEditor(() => {
                if (!this._editorService.isOpened({ resource: targetUri, typeId: UntitledTextEditorInput.ID, editorId: DEFAULT_EDITOR_ASSOCIATION.id })) {
                    this._releaseSession(session, true);
                }
            }));
        }
        let wholeRange = options.wholeRange;
        if (!wholeRange) {
            wholeRange = new Range(selection.selectionStartLineNumber, selection.selectionStartColumn, selection.positionLineNumber, selection.positionColumn);
        }
        if (token.isCancellationRequested) {
            store.dispose();
            return undefined;
        }
        const session = new Session(options.headless ?? false, targetUri, textModel0, textModelN, agent, store.add(new SessionWholeRange(textModelN, wholeRange)), store.add(new HunkData(this._editorWorkerService, textModel0, textModelN)), chatModel, options.session?.versionsByRequest);
        // store: key -> session
        const key = this._key(editor, session.targetUri);
        if (this._sessions.has(key)) {
            store.dispose();
            throw new Error(`Session already stored for ${key}`);
        }
        this._sessions.set(key, { session, editor, store });
        return session;
    }
    moveSession(session, target) {
        const newKey = this._key(target, session.targetUri);
        const existing = this._sessions.get(newKey);
        if (existing) {
            if (existing.session !== session) {
                throw new Error(`Cannot move session because the target editor already/still has one`);
            }
            else {
                // noop
                return;
            }
        }
        let found = false;
        for (const [oldKey, data] of this._sessions) {
            if (data.session === session) {
                found = true;
                this._sessions.delete(oldKey);
                this._sessions.set(newKey, { ...data, editor: target });
                this._logService.trace(`[IE] did MOVE session for ${data.editor.getId()} to NEW EDITOR ${target.getId()}, ${session.agent.extensionId}`);
                this._onDidMoveSession.fire({ session, editor: target });
                break;
            }
        }
        if (!found) {
            throw new Error(`Cannot move session because it is not stored`);
        }
    }
    releaseSession(session) {
        this._releaseSession(session, false);
    }
    _releaseSession(session, byServer) {
        let tuple;
        // cleanup
        for (const candidate of this._sessions) {
            if (candidate[1].session === session) {
                // if (value.session === session) {
                tuple = candidate;
                break;
            }
        }
        if (!tuple) {
            // double remove
            return;
        }
        this._telemetryService.publicLog2('interactiveEditor/session', session.asTelemetryData());
        const [key, value] = tuple;
        this._sessions.delete(key);
        this._logService.trace(`[IE] did RELEASED session for ${value.editor.getId()}, ${session.agent.extensionId}`);
        this._onDidEndSession.fire({ editor: value.editor, session, endedByExternalCause: byServer });
        value.store.dispose();
    }
    stashSession(session, editor, undoCancelEdits) {
        const result = this._instaService.createInstance(StashedSession, editor, session, undoCancelEdits);
        this._onDidStashSession.fire({ editor, session });
        this._logService.trace(`[IE] did STASH session for ${editor.getId()}, ${session.agent.extensionId}`);
        return result;
    }
    getCodeEditor(session) {
        for (const [, data] of this._sessions) {
            if (data.session === session) {
                return data.editor;
            }
        }
        throw new Error('session not found');
    }
    getSession(editor, uri) {
        const key = this._key(editor, uri);
        return this._sessions.get(key)?.session;
    }
    _key(editor, uri) {
        const item = this._keyComputers.get(uri.scheme);
        return item
            ? item.getComparisonKey(editor, uri)
            : `${editor.getId()}@${uri.toString()}`;
    }
    registerSessionKeyComputer(scheme, value) {
        this._keyComputers.set(scheme, value);
        return toDisposable(() => this._keyComputers.delete(scheme));
    }
    async createSession2(editor, uri, token) {
        assertType(editor.hasModel());
        if (this._sessions2.has(uri)) {
            throw new Error('Session already exists');
        }
        this._onWillStartSession.fire(editor);
        const chatModel = this._chatService.startSession(ChatAgentLocation.EditorInline, token);
        chatModel.startEditingSession(false);
        const widget = this._chatWidgetService.getWidgetBySessionResource(chatModel.sessionResource);
        await widget?.attachmentModel.addFile(uri);
        const store = new DisposableStore();
        store.add(toDisposable(() => {
            this._chatService.cancelCurrentRequestForSession(chatModel.sessionResource);
            chatModel.editingSession?.reject();
            this._sessions2.delete(uri);
            this._onDidChangeSessions.fire(this);
        }));
        store.add(chatModel);
        store.add(autorun(r => {
            const entries = chatModel.editingSession?.entries.read(r);
            if (!entries?.length) {
                return;
            }
            const state = entries.find(entry => isEqual(entry.modifiedURI, uri))?.state.read(r);
            if (state === 1 /* ModifiedFileEntryState.Accepted */ || state === 2 /* ModifiedFileEntryState.Rejected */) {
                const response = chatModel.getRequests().at(-1)?.response;
                if (response) {
                    this._chatService.notifyUserAction({
                        sessionResource: response.session.sessionResource,
                        requestId: response.requestId,
                        agentId: response.agent?.id,
                        command: response.slashCommand?.name,
                        result: response.result,
                        action: {
                            kind: 'inlineChat',
                            action: state === 1 /* ModifiedFileEntryState.Accepted */ ? 'accepted' : 'discarded'
                        }
                    });
                }
            }
            const allSettled = entries.every(entry => {
                const state = entry.state.read(r);
                return (state === 1 /* ModifiedFileEntryState.Accepted */ || state === 2 /* ModifiedFileEntryState.Rejected */)
                    && !entry.isCurrentlyBeingModifiedBy.read(r);
            });
            if (allSettled && !chatModel.requestInProgress.read(undefined)) {
                // self terminate
                store.dispose();
            }
        }));
        const result = {
            uri,
            initialPosition: editor.getSelection().getStartPosition().delta(-1), /* one line above selection start */
            chatModel,
            editingSession: chatModel.editingSession,
            dispose: store.dispose.bind(store)
        };
        this._sessions2.set(uri, result);
        this._onDidChangeSessions.fire(this);
        return result;
    }
    getSession2(uriOrSessionId) {
        if (URI.isUri(uriOrSessionId)) {
            let result = this._sessions2.get(uriOrSessionId);
            if (!result) {
                // no direct session, try to find an editing session which has a file entry for the uri
                for (const [_, candidate] of this._sessions2) {
                    const entry = candidate.editingSession.getEntry(uriOrSessionId);
                    if (entry) {
                        result = candidate;
                        break;
                    }
                }
            }
            return result;
        }
        else {
            for (const session of this._sessions2.values()) {
                if (session.chatModel.sessionId === uriOrSessionId) {
                    return session;
                }
            }
        }
        return undefined;
    }
};
InlineChatSessionServiceImpl = __decorate([
    __param(0, ITelemetryService),
    __param(1, IModelService),
    __param(2, ITextModelService),
    __param(3, IEditorWorkerService),
    __param(4, ILogService),
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, ITextFileService),
    __param(8, ILanguageService),
    __param(9, IChatService),
    __param(10, IChatAgentService),
    __param(11, IChatWidgetService)
], InlineChatSessionServiceImpl);
export { InlineChatSessionServiceImpl };
let InlineChatEnabler = class InlineChatEnabler {
    static { this.Id = 'inlineChat.enabler'; }
    constructor(contextKeyService, chatAgentService, editorService, configService) {
        this._store = new DisposableStore();
        this._ctxHasProvider2 = CTX_INLINE_CHAT_HAS_AGENT2.bindTo(contextKeyService);
        this._ctxHasNotebookInline = CTX_INLINE_CHAT_HAS_NOTEBOOK_INLINE.bindTo(contextKeyService);
        this._ctxHasNotebookProvider = CTX_INLINE_CHAT_HAS_NOTEBOOK_AGENT.bindTo(contextKeyService);
        this._ctxPossible = CTX_INLINE_CHAT_POSSIBLE.bindTo(contextKeyService);
        const agentObs = observableFromEvent(this, chatAgentService.onDidChangeAgents, () => chatAgentService.getDefaultAgent(ChatAgentLocation.EditorInline));
        const notebookAgentObs = observableFromEvent(this, chatAgentService.onDidChangeAgents, () => chatAgentService.getDefaultAgent(ChatAgentLocation.Notebook));
        const notebookAgentConfigObs = observableConfigValue("inlineChat.notebookAgent" /* InlineChatConfigKeys.notebookAgent */, false, configService);
        this._store.add(autorun(r => {
            const agent = agentObs.read(r);
            if (!agent) {
                this._ctxHasProvider2.reset();
            }
            else {
                this._ctxHasProvider2.set(true);
            }
        }));
        this._store.add(autorun(r => {
            this._ctxHasNotebookInline.set(!notebookAgentConfigObs.read(r) && !!agentObs.read(r));
            this._ctxHasNotebookProvider.set(notebookAgentConfigObs.read(r) && !!notebookAgentObs.read(r));
        }));
        const updateEditor = () => {
            const ctrl = editorService.activeEditorPane?.getControl();
            const isCodeEditorLike = isCodeEditor(ctrl) || isDiffEditor(ctrl) || isCompositeEditor(ctrl);
            this._ctxPossible.set(isCodeEditorLike);
        };
        this._store.add(editorService.onDidActiveEditorChange(updateEditor));
        updateEditor();
    }
    dispose() {
        this._ctxPossible.reset();
        this._ctxHasProvider2.reset();
        this._store.dispose();
    }
};
InlineChatEnabler = __decorate([
    __param(0, IContextKeyService),
    __param(1, IChatAgentService),
    __param(2, IEditorService),
    __param(3, IConfigurationService)
], InlineChatEnabler);
export { InlineChatEnabler };
let InlineChatEscapeToolContribution = class InlineChatEscapeToolContribution extends Disposable {
    static { InlineChatEscapeToolContribution_1 = this; }
    static { this.Id = 'inlineChat.escapeTool'; }
    static { this.DONT_ASK_AGAIN_KEY = 'inlineChat.dontAskMoveToPanelChat'; }
    static { this._data = {
        id: 'inline_chat_exit',
        source: ToolDataSource.Internal,
        canBeReferencedInPrompt: false,
        alwaysDisplayInputOutput: false,
        displayName: localize(9079, null),
        modelDescription: 'Moves the inline chat session to the richer panel chat which supports edits across files, creating and deleting files, multi-turn conversations between the user and the assistant, and access to more IDE tools, like retrieve problems, interact with source control, run terminal commands etc.',
    }; }
    constructor(lmTools, inlineChatSessionService, dialogService, codeEditorService, chatService, logService, storageService, instaService) {
        super();
        this._store.add(lmTools.registerTool(InlineChatEscapeToolContribution_1._data, {
            invoke: async (invocation, _tokenCountFn, _progress, _token) => {
                const sessionId = invocation.context?.sessionId;
                if (!sessionId) {
                    logService.warn('InlineChatEscapeToolContribution: no sessionId in tool invocation context');
                    return { content: [{ kind: 'text', value: 'Cancel' }] };
                }
                const session = inlineChatSessionService.getSession2(sessionId);
                if (!session) {
                    logService.warn(`InlineChatEscapeToolContribution: no session found for id ${sessionId}`);
                    return { content: [{ kind: 'text', value: 'Cancel' }] };
                }
                const dontAskAgain = storageService.getBoolean(InlineChatEscapeToolContribution_1.DONT_ASK_AGAIN_KEY, 0 /* StorageScope.PROFILE */);
                let result;
                if (dontAskAgain !== undefined) {
                    // Use previously stored user preference: true = 'Continue in Chat view', false = 'Rephrase' (Cancel)
                    result = { confirmed: dontAskAgain, checkboxChecked: false };
                }
                else {
                    result = await dialogService.confirm({
                        type: 'question',
                        title: localize(9080, null),
                        message: localize(9081, null),
                        detail: localize(9082, null),
                        primaryButton: localize(9083, null),
                        cancelButton: localize(9084, null),
                        checkbox: { label: localize(9085, null), checked: false },
                    });
                }
                const editor = codeEditorService.getFocusedCodeEditor();
                if (!editor || result.confirmed) {
                    logService.trace('InlineChatEscapeToolContribution: moving session to panel chat');
                    await instaService.invokeFunction(askInPanelChat, session.chatModel.getRequests().at(-1));
                    session.dispose();
                }
                else {
                    logService.trace('InlineChatEscapeToolContribution: rephrase prompt');
                    chatService.removeRequest(session.chatModel.sessionResource, session.chatModel.getRequests().at(-1).id);
                }
                if (result.checkboxChecked) {
                    storageService.store(InlineChatEscapeToolContribution_1.DONT_ASK_AGAIN_KEY, result.confirmed, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                    logService.trace('InlineChatEscapeToolContribution: stored don\'t ask again preference');
                }
                return { content: [{ kind: 'text', value: 'Success' }] };
            }
        }));
    }
};
InlineChatEscapeToolContribution = InlineChatEscapeToolContribution_1 = __decorate([
    __param(0, ILanguageModelToolsService),
    __param(1, IInlineChatSessionService),
    __param(2, IDialogService),
    __param(3, ICodeEditorService),
    __param(4, IChatService),
    __param(5, ILogService),
    __param(6, IStorageService),
    __param(7, IInstantiationService)
], InlineChatEscapeToolContribution);
export { InlineChatEscapeToolContribution };
registerAction2(class ResetMoveToPanelChatChoice extends Action2 {
    constructor() {
        super({
            id: 'inlineChat.resetMoveToPanelChatChoice',
            precondition: ContextKeyExpr.has('config.chat.disableAIFeatures').negate(),
            title: localize2(9086, "Reset Choice for 'Move Inline Chat to Panel Chat'"),
            f1: true
        });
    }
    run(accessor) {
        accessor.get(IStorageService).remove(InlineChatEscapeToolContribution.DONT_ASK_AGAIN_KEY, 0 /* StorageScope.PROFILE */);
    }
});
//# sourceMappingURL=inlineChatSessionServiceImpl.js.map