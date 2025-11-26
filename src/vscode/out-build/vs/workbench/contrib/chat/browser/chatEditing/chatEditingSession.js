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
var ChatEditingSession_1;
import { DeferredPromise, Sequencer, SequencerByKey, timeout } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { BugIndicatingError } from '../../../../../base/common/errors.js';
import { Emitter } from '../../../../../base/common/event.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Iterable } from '../../../../../base/common/iterator.js';
import { Disposable, DisposableStore, dispose } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { derived, observableValue, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { hasKey } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IBulkEditService } from '../../../../../editor/browser/services/bulkEditService.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { chatEditingSessionIsReady, getMultiDiffSourceUri } from '../../common/chatEditingService.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { ChatEditingCheckpointTimelineImpl } from './chatEditingCheckpointTimelineImpl.js';
import { ChatEditingModifiedDocumentEntry } from './chatEditingModifiedDocumentEntry.js';
import { AbstractChatEditingModifiedFileEntry } from './chatEditingModifiedFileEntry.js';
import { ChatEditingModifiedNotebookEntry } from './chatEditingModifiedNotebookEntry.js';
import { FileOperationType } from './chatEditingOperations.js';
import { ChatEditingSessionStorage } from './chatEditingSessionStorage.js';
import { ChatEditingTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
var NotExistBehavior;
(function (NotExistBehavior) {
    NotExistBehavior[NotExistBehavior["Create"] = 0] = "Create";
    NotExistBehavior[NotExistBehavior["Abort"] = 1] = "Abort";
})(NotExistBehavior || (NotExistBehavior = {}));
class ThrottledSequencer extends Sequencer {
    constructor(_minDuration, _maxOverallDelay) {
        super();
        this._minDuration = _minDuration;
        this._maxOverallDelay = _maxOverallDelay;
        this._size = 0;
    }
    queue(promiseTask) {
        this._size += 1;
        const noDelay = this._size * this._minDuration > this._maxOverallDelay;
        return super.queue(async () => {
            try {
                const p1 = promiseTask();
                const p2 = noDelay
                    ? Promise.resolve(undefined)
                    : timeout(this._minDuration, CancellationToken.None);
                const [result] = await Promise.all([p1, p2]);
                return result;
            }
            finally {
                this._size -= 1;
            }
        });
    }
}
function createOpeningEditCodeBlock(uri, isNotebook) {
    return [
        {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        },
        {
            kind: 'codeblockUri',
            uri,
            isEdit: true
        },
        {
            kind: 'markdownContent',
            content: new MarkdownString('\n````\n')
        },
        isNotebook
            ? {
                kind: 'notebookEdit',
                uri,
                edits: [],
                done: false,
                isExternalEdit: true
            }
            : {
                kind: 'textEdit',
                uri,
                edits: [],
                done: false,
                isExternalEdit: true
            },
    ];
}
let ChatEditingSession = ChatEditingSession_1 = class ChatEditingSession extends Disposable {
    get state() {
        return this._state;
    }
    get requestDisablement() {
        return this._timeline.requestDisablement;
    }
    get onDidDispose() {
        this._assertNotDisposed();
        return this._onDidDispose.event;
    }
    constructor(chatSessionResource, isGlobalEditingSession, _lookupExternalEntry, transferFrom, _instantiationService, _modelService, _languageService, _textModelService, _bulkEditService, _editorGroupsService, _editorService, _notebookService, _accessibilitySignalService, _logService, configurationService) {
        super();
        this.chatSessionResource = chatSessionResource;
        this.isGlobalEditingSession = isGlobalEditingSession;
        this._lookupExternalEntry = _lookupExternalEntry;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._textModelService = _textModelService;
        this._bulkEditService = _bulkEditService;
        this._editorGroupsService = _editorGroupsService;
        this._editorService = _editorService;
        this._notebookService = _notebookService;
        this._accessibilitySignalService = _accessibilitySignalService;
        this._logService = _logService;
        this.configurationService = configurationService;
        this._state = observableValue(this, 0 /* ChatEditingSessionState.Initial */);
        /**
         * Contains the contents of a file when the AI first began doing edits to it.
         */
        this._initialFileContents = new ResourceMap();
        this._baselineCreationLocks = new SequencerByKey();
        this._streamingEditLocks = new SequencerByKey();
        /**
         * Tracks active external edit operations.
         * Key is operationId, value contains the operation state.
         */
        this._externalEditOperations = new Map();
        this._entriesObs = observableValue(this, []);
        this.entries = derived(reader => {
            const state = this._state.read(reader);
            if (state === 3 /* ChatEditingSessionState.Disposed */ || state === 0 /* ChatEditingSessionState.Initial */) {
                return [];
            }
            else {
                return this._entriesObs.read(reader);
            }
        });
        this._onDidDispose = new Emitter();
        this._timeline = this._instantiationService.createInstance(ChatEditingCheckpointTimelineImpl, chatSessionResource, this._getTimelineDelegate());
        this.canRedo = this._timeline.canRedo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this.canUndo = this._timeline.canUndo.map((hasHistory, reader) => hasHistory && this._state.read(reader) === 2 /* ChatEditingSessionState.Idle */);
        this._init(transferFrom);
    }
    _getTimelineDelegate() {
        return {
            createFile: (uri, content) => {
                return this._bulkEditService.apply({
                    edits: [{
                            newResource: uri,
                            options: {
                                overwrite: true,
                                contents: content ? Promise.resolve(VSBuffer.fromString(content)) : undefined,
                            },
                        }],
                });
            },
            deleteFile: async (uri) => {
                const entries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, uri));
                this._entriesObs.set(entries, undefined);
                await this._bulkEditService.apply({ edits: [{ oldResource: uri, options: { ignoreIfNotExists: true } }] });
            },
            renameFile: async (fromUri, toUri) => {
                const entries = this._entriesObs.get();
                const previousEntry = entries.find(e => isEqual(e.modifiedURI, fromUri));
                if (previousEntry) {
                    const newEntry = await this._getOrCreateModifiedFileEntry(toUri, 0 /* NotExistBehavior.Create */, previousEntry.telemetryInfo, this._getCurrentTextOrNotebookSnapshot(previousEntry));
                    previousEntry.dispose();
                    this._entriesObs.set(entries.map(e => e === previousEntry ? newEntry : e), undefined);
                }
            },
            setContents: async (uri, content, telemetryInfo) => {
                const entry = await this._getOrCreateModifiedFileEntry(uri, 0 /* NotExistBehavior.Create */, telemetryInfo);
                if (entry instanceof ChatEditingModifiedNotebookEntry) {
                    await entry.restoreModifiedModelFromSnapshot(content);
                }
                else {
                    await entry.acceptAgentEdits(uri, [{ range: new Range(1, 1, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER), text: content }], true, undefined);
                }
            }
        };
    }
    async _init(transferFrom) {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource);
        let restoredSessionState = await storage.restoreState().catch(err => {
            this._logService.error(`Error restoring chat editing session state for ${this.chatSessionResource}`, err);
        });
        if (this._store.isDisposed) {
            return; // disposed while restoring
        }
        if (!restoredSessionState && transferFrom instanceof ChatEditingSession_1) {
            restoredSessionState = transferFrom._getStoredState(this.chatSessionResource);
        }
        if (restoredSessionState) {
            for (const [uri, content] of restoredSessionState.initialFileContents) {
                this._initialFileContents.set(uri, content);
            }
            await this._initEntries(restoredSessionState.recentSnapshot);
            transaction(tx => {
                if (restoredSessionState.timeline) {
                    this._timeline.restoreFromState(restoredSessionState.timeline, tx);
                }
                this._state.set(2 /* ChatEditingSessionState.Idle */, tx);
            });
        }
        else {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
    }
    _getEntry(uri) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.get().find(e => isEqual(e.modifiedURI, uri));
    }
    getEntry(uri) {
        return this._getEntry(uri);
    }
    readEntry(uri, reader) {
        uri = CellUri.parse(uri)?.notebook ?? uri;
        return this._entriesObs.read(reader).find(e => isEqual(e.modifiedURI, uri));
    }
    storeState() {
        const storage = this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource);
        return storage.storeState(this._getStoredState());
    }
    _getStoredState(sessionResource = this.chatSessionResource) {
        const entries = new ResourceMap();
        for (const entry of this._entriesObs.get()) {
            entries.set(entry.modifiedURI, entry.createSnapshot(sessionResource, undefined, undefined));
        }
        const state = {
            initialFileContents: this._initialFileContents,
            timeline: this._timeline.getStateForPersistence(),
            recentSnapshot: { entries, stopId: undefined },
        };
        return state;
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        return this._timeline.getEntryDiffBetweenStops(uri, requestId, stopId);
    }
    getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId) {
        return this._timeline.getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId);
    }
    createSnapshot(requestId, undoStop) {
        const label = undoStop ? `Request ${requestId} - Stop ${undoStop}` : `Request ${requestId}`;
        this._timeline.createCheckpoint(requestId, undoStop, label);
    }
    async getSnapshotContents(requestId, uri, stopId) {
        const content = await this._timeline.getContentAtStop(requestId, uri, stopId);
        return typeof content === 'string' ? VSBuffer.fromString(content) : content;
    }
    async getSnapshotModel(requestId, undoStop, snapshotUri) {
        await this._baselineCreationLocks.peek(snapshotUri.path);
        const content = await this._timeline.getContentAtStop(requestId, snapshotUri, undoStop);
        if (content === undefined) {
            return null;
        }
        const contentStr = typeof content === 'string' ? content : content.toString();
        const model = this._modelService.createModel(contentStr, this._languageService.createByFilepathOrFirstLine(snapshotUri), snapshotUri, false);
        const store = new DisposableStore();
        store.add(model.onWillDispose(() => store.dispose()));
        store.add(this._timeline.onDidChangeContentsAtStop(requestId, snapshotUri, undoStop, c => model.setValue(c)));
        return model;
    }
    getSnapshotUri(requestId, uri, stopId) {
        return this._timeline.getContentURIAtStop(requestId, uri, stopId);
    }
    async restoreSnapshot(requestId, stopId) {
        const checkpointId = this._timeline.getCheckpointIdForRequest(requestId, stopId);
        if (checkpointId) {
            await this._timeline.navigateToCheckpoint(checkpointId);
        }
    }
    _assertNotDisposed() {
        if (this._state.get() === 3 /* ChatEditingSessionState.Disposed */) {
            throw new BugIndicatingError(`Cannot access a disposed editing session`);
        }
    }
    async accept(...uris) {
        if (await this._operateEntry('accept', uris)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
        }
    }
    async reject(...uris) {
        if (await this._operateEntry('reject', uris)) {
            this._accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
        }
    }
    async _operateEntry(action, uris) {
        this._assertNotDisposed();
        const applicableEntries = this._entriesObs.get()
            .filter(e => uris.length === 0 || uris.some(u => isEqual(u, e.modifiedURI)))
            .filter(e => !e.isCurrentlyBeingModifiedBy.get())
            .filter(e => e.state.get() === 0 /* ModifiedFileEntryState.Modified */);
        if (applicableEntries.length === 0) {
            return 0;
        }
        // Perform all I/O operations in parallel, each resolving to a state transition callback
        const method = action === 'accept' ? 'acceptDeferred' : 'rejectDeferred';
        const transitionCallbacks = await Promise.all(applicableEntries.map(entry => entry[method]().catch(err => {
            this._logService.error(`Error calling ${method} on entry ${entry.modifiedURI}`, err);
        })));
        // Execute all state transitions atomically in a single transaction
        transaction(tx => {
            transitionCallbacks.forEach(callback => callback?.(tx));
        });
        return applicableEntries.length;
    }
    async show(previousChanges) {
        this._assertNotDisposed();
        if (this._editorPane) {
            if (this._editorPane.isVisible()) {
                return;
            }
            else if (this._editorPane.input) {
                await this._editorGroupsService.activeGroup.openEditor(this._editorPane.input, { pinned: true, activation: EditorActivation.ACTIVATE });
                return;
            }
        }
        const input = MultiDiffEditorInput.fromResourceMultiDiffEditorInput({
            multiDiffSource: getMultiDiffSourceUri(this, previousChanges),
            label: localize(5749, null)
        }, this._instantiationService);
        this._editorPane = await this._editorGroupsService.activeGroup.openEditor(input, { pinned: true, activation: EditorActivation.ACTIVATE });
    }
    async stop(clearState = false) {
        this._stopPromise ??= Promise.allSettled([this._performStop(), this.storeState()]).then(() => { });
        await this._stopPromise;
        if (clearState) {
            await this._instantiationService.createInstance(ChatEditingSessionStorage, this.chatSessionResource).clearState();
        }
    }
    async _performStop() {
        // Close out all open files
        const schemes = [AbstractChatEditingModifiedFileEntry.scheme, ChatEditingTextModelContentProvider.scheme];
        await Promise.allSettled(this._editorGroupsService.groups.flatMap(async (g) => {
            return g.editors.map(async (e) => {
                if ((e instanceof MultiDiffEditorInput && e.initialResources?.some(r => r.originalUri && schemes.indexOf(r.originalUri.scheme) !== -1))
                    || (e instanceof DiffEditorInput && e.original.resource && schemes.indexOf(e.original.resource.scheme) !== -1)) {
                    await g.closeEditor(e);
                }
            });
        }));
    }
    dispose() {
        this._assertNotDisposed();
        dispose(this._entriesObs.get());
        super.dispose();
        this._state.set(3 /* ChatEditingSessionState.Disposed */, undefined);
        this._onDidDispose.fire();
        this._onDidDispose.dispose();
    }
    get isDisposed() {
        return this._state.get() === 3 /* ChatEditingSessionState.Disposed */;
    }
    startStreamingEdits(resource, responseModel, inUndoStop) {
        const completePromise = new DeferredPromise();
        const startPromise = new DeferredPromise();
        // Sequence all edits made this this resource in this streaming edits instance,
        // and also sequence the resource overall in the rare (currently invalid?) case
        // that edits are made in parallel to the same resource,
        const sequencer = new ThrottledSequencer(15, 1000);
        sequencer.queue(() => startPromise.p);
        // Lock around creating the baseline so we don't fail to resolve models
        // in the edit pills if they render quickly
        this._baselineCreationLocks.queue(resource.path, () => startPromise.p);
        this._streamingEditLocks.queue(resource.toString(), async () => {
            await chatEditingSessionIsReady(this);
            if (!this.isDisposed) {
                await this._acceptStreamingEditsStart(responseModel, inUndoStop, resource);
            }
            startPromise.complete();
            return completePromise.p;
        });
        let didComplete = false;
        return {
            pushText: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebookCellText: (cell, edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(cell, edits, isLastEdits, responseModel);
                    }
                });
            },
            pushNotebook: (edits, isLastEdits) => {
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, edits, isLastEdits, responseModel);
                    }
                });
            },
            complete: () => {
                if (didComplete) {
                    return;
                }
                didComplete = true;
                sequencer.queue(async () => {
                    if (!this.isDisposed) {
                        await this._acceptEdits(resource, [], true, responseModel);
                        await this._resolve(responseModel.requestId, inUndoStop, resource);
                        completePromise.complete();
                    }
                });
            },
        };
    }
    async startExternalEdits(responseModel, operationId, resources) {
        const snapshots = new ResourceMap();
        const acquiredLockPromises = [];
        const releaseLockPromises = [];
        const undoStopId = generateUuid();
        const progress = [{
                kind: 'undoStop',
                id: undoStopId,
            }];
        const telemetryInfo = this._getTelemetryInfoForModel(responseModel);
        await chatEditingSessionIsReady(this);
        // Acquire locks for each resource and take snapshots
        for (const resource of resources) {
            const releaseLock = new DeferredPromise();
            releaseLockPromises.push(releaseLock);
            const acquiredLock = new DeferredPromise();
            acquiredLockPromises.push(acquiredLock);
            this._streamingEditLocks.queue(resource.toString(), async () => {
                if (this.isDisposed) {
                    acquiredLock.complete();
                    return;
                }
                const entry = await this._getOrCreateModifiedFileEntry(resource, 1 /* NotExistBehavior.Abort */, telemetryInfo);
                if (entry) {
                    await this._acceptStreamingEditsStart(responseModel, undoStopId, resource);
                }
                const notebookUri = CellUri.parse(resource)?.notebook || resource;
                progress.push(...createOpeningEditCodeBlock(resource, this._notebookService.hasSupportedNotebooks(notebookUri)));
                // Save to disk to ensure disk state is current before external edits
                await entry?.save();
                // Take snapshot of current state
                snapshots.set(resource, entry && this._getCurrentTextOrNotebookSnapshot(entry));
                entry?.startExternalEdit();
                acquiredLock.complete();
                // Wait for the lock to be released by stopExternalEdits
                return releaseLock.p;
            });
        }
        await Promise.all(acquiredLockPromises.map(p => p.p));
        this.createSnapshot(responseModel.requestId, undoStopId);
        // Store the operation state
        this._externalEditOperations.set(operationId, {
            responseModel,
            snapshots,
            undoStopId,
            releaseLocks: () => releaseLockPromises.forEach(p => p.complete())
        });
        return progress;
    }
    async stopExternalEdits(responseModel, operationId) {
        const operation = this._externalEditOperations.get(operationId);
        if (!operation) {
            this._logService.warn(`stopExternalEdits called for unknown operation ${operationId}`);
            return [];
        }
        this._externalEditOperations.delete(operationId);
        const progress = [];
        try {
            // For each resource, compute the diff and create edit parts
            for (const [resource, beforeSnapshot] of operation.snapshots) {
                let entry = this._getEntry(resource);
                // Files that did not exist on disk before may not exist in our working
                // set yet. Create those if that's the case.
                if (!entry && beforeSnapshot === undefined) {
                    entry = await this._getOrCreateModifiedFileEntry(resource, 1 /* NotExistBehavior.Abort */, this._getTelemetryInfoForModel(responseModel), '');
                    if (entry) {
                        entry.startExternalEdit();
                        entry.acceptStreamingEditsStart(responseModel, operation.undoStopId, undefined);
                    }
                }
                if (!entry) {
                    continue;
                }
                // Reload from disk to ensure in-memory model is in sync with file system
                await entry.revertToDisk();
                // Take new snapshot after external changes
                const afterSnapshot = this._getCurrentTextOrNotebookSnapshot(entry);
                // Compute edits from the snapshots
                let edits = [];
                if (beforeSnapshot === undefined) {
                    this._timeline.recordFileOperation({
                        type: FileOperationType.Create,
                        uri: resource,
                        requestId: responseModel.requestId,
                        epoch: this._timeline.incrementEpoch(),
                        initialContent: afterSnapshot,
                        telemetryInfo: entry.telemetryInfo,
                    });
                }
                else {
                    edits = await entry.computeEditsFromSnapshots(beforeSnapshot, afterSnapshot);
                    this._recordEditOperations(entry, resource, edits, responseModel);
                }
                progress.push(entry instanceof ChatEditingModifiedNotebookEntry ? {
                    kind: 'notebookEdit',
                    uri: resource,
                    edits: edits,
                    done: true,
                    isExternalEdit: true
                } : {
                    kind: 'textEdit',
                    uri: resource,
                    edits: edits,
                    done: true,
                    isExternalEdit: true
                });
                // Mark as no longer being modified
                await entry.acceptStreamingEditsEnd();
                // Clear external edit mode
                entry.stopExternalEdit();
            }
        }
        finally {
            // Release all the locks
            operation.releaseLocks();
            const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => !operation.snapshots.has(URI.parse(k)));
            if (!hasOtherTasks) {
                this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
            }
        }
        return progress;
    }
    async undoInteraction() {
        await this._timeline.undoToLastCheckpoint();
    }
    async redoInteraction() {
        await this._timeline.redoToNextCheckpoint();
    }
    _recordEditOperations(entry, resource, edits, responseModel) {
        // Determine if these are text edits or notebook edits
        const isNotebookEdits = edits.length > 0 && hasKey(edits[0], { cells: true });
        if (isNotebookEdits) {
            // Record notebook edit operation
            const notebookEdits = edits;
            this._timeline.recordFileOperation({
                type: FileOperationType.NotebookEdit,
                uri: resource,
                requestId: responseModel.requestId,
                epoch: this._timeline.incrementEpoch(),
                cellEdits: notebookEdits
            });
        }
        else {
            let cellIndex;
            if (entry instanceof ChatEditingModifiedNotebookEntry) {
                const cellUri = CellUri.parse(resource);
                if (cellUri) {
                    const i = entry.getIndexOfCellHandle(cellUri.handle);
                    if (i !== -1) {
                        cellIndex = i;
                    }
                }
            }
            const textEdits = edits;
            this._timeline.recordFileOperation({
                type: FileOperationType.TextEdit,
                uri: resource,
                requestId: responseModel.requestId,
                epoch: this._timeline.incrementEpoch(),
                edits: textEdits,
                cellIndex,
            });
        }
    }
    _getCurrentTextOrNotebookSnapshot(entry) {
        if (entry instanceof ChatEditingModifiedNotebookEntry) {
            return entry.getCurrentSnapshot();
        }
        else if (entry instanceof ChatEditingModifiedDocumentEntry) {
            return entry.getCurrentContents();
        }
        else {
            throw new Error(`unknown entry type for ${entry.modifiedURI}`);
        }
    }
    async _acceptStreamingEditsStart(responseModel, undoStop, resource) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, 0 /* NotExistBehavior.Create */, this._getTelemetryInfoForModel(responseModel));
        // Record file baseline if this is the first edit for this file in this request
        if (!this._timeline.hasFileBaseline(resource, responseModel.requestId)) {
            this._timeline.recordFileBaseline({
                uri: resource,
                requestId: responseModel.requestId,
                content: this._getCurrentTextOrNotebookSnapshot(entry),
                epoch: this._timeline.incrementEpoch(),
                telemetryInfo: entry.telemetryInfo,
                notebookViewType: entry instanceof ChatEditingModifiedNotebookEntry ? entry.viewType : undefined,
            });
        }
        transaction((tx) => {
            this._state.set(1 /* ChatEditingSessionState.StreamingEdits */, tx);
            entry.acceptStreamingEditsStart(responseModel, undoStop, tx);
            // Note: Individual edit operations will be recorded by the file entries
        });
        return entry;
    }
    async _initEntries({ entries }) {
        // Reset all the files which are modified in this session state
        // but which are not found in the snapshot
        for (const entry of this._entriesObs.get()) {
            const snapshotEntry = entries.get(entry.modifiedURI);
            if (!snapshotEntry) {
                await entry.resetToInitialContent();
                entry.dispose();
            }
        }
        const entriesArr = [];
        // Restore all entries from the snapshot
        for (const snapshotEntry of entries.values()) {
            const entry = await this._getOrCreateModifiedFileEntry(snapshotEntry.resource, 1 /* NotExistBehavior.Abort */, snapshotEntry.telemetryInfo);
            if (entry) {
                const restoreToDisk = snapshotEntry.state === 0 /* ModifiedFileEntryState.Modified */;
                await entry.restoreFromSnapshot(snapshotEntry, restoreToDisk);
                entriesArr.push(entry);
            }
        }
        this._entriesObs.set(entriesArr, undefined);
    }
    async _acceptEdits(resource, textEdits, isLastEdits, responseModel) {
        const entry = await this._getOrCreateModifiedFileEntry(resource, 0 /* NotExistBehavior.Create */, this._getTelemetryInfoForModel(responseModel));
        // Record edit operations in the timeline if there are actual edits
        if (textEdits.length > 0) {
            this._recordEditOperations(entry, resource, textEdits, responseModel);
        }
        await entry.acceptAgentEdits(resource, textEdits, isLastEdits, responseModel);
    }
    _getTelemetryInfoForModel(responseModel) {
        // Make these getters because the response result is not available when the file first starts to be edited
        return new class {
            get agentId() { return responseModel.agent?.id; }
            get modelId() { return responseModel.request?.modelId; }
            get modeId() { return responseModel.request?.modeInfo?.modeId; }
            get command() { return responseModel.slashCommand?.name; }
            get sessionResource() { return responseModel.session.sessionResource; }
            get requestId() { return responseModel.requestId; }
            get result() { return responseModel.result; }
            get applyCodeBlockSuggestionId() { return responseModel.request?.modeInfo?.applyCodeBlockSuggestionId; }
            get feature() {
                if (responseModel.session.initialLocation === ChatAgentLocation.Chat) {
                    return 'sideBarChat';
                }
                else if (responseModel.session.initialLocation === ChatAgentLocation.EditorInline) {
                    return 'inlineChat';
                }
                return undefined;
            }
        };
    }
    async _resolve(requestId, undoStop, resource) {
        const hasOtherTasks = Iterable.some(this._streamingEditLocks.keys(), k => k !== resource.toString());
        if (!hasOtherTasks) {
            this._state.set(2 /* ChatEditingSessionState.Idle */, undefined);
        }
        const entry = this._getEntry(resource);
        if (!entry) {
            return;
        }
        // Create checkpoint for this edit completion
        const label = undoStop ? `Request ${requestId} - Stop ${undoStop}` : `Request ${requestId}`;
        this._timeline.createCheckpoint(requestId, undoStop, label);
        return entry.acceptStreamingEditsEnd();
    }
    async _getOrCreateModifiedFileEntry(resource, ifNotExists, telemetryInfo, _initialContent) {
        resource = CellUri.parse(resource)?.notebook ?? resource;
        const existingEntry = this._entriesObs.get().find(e => isEqual(e.modifiedURI, resource));
        if (existingEntry) {
            if (telemetryInfo.requestId !== existingEntry.telemetryInfo.requestId) {
                existingEntry.updateTelemetryInfo(telemetryInfo);
            }
            return existingEntry;
        }
        let entry;
        const existingExternalEntry = this._lookupExternalEntry(resource);
        if (existingExternalEntry) {
            entry = existingExternalEntry;
            if (telemetryInfo.requestId !== entry.telemetryInfo.requestId) {
                entry.updateTelemetryInfo(telemetryInfo);
            }
        }
        else {
            const initialContent = _initialContent ?? this._initialFileContents.get(resource);
            // This gets manually disposed in .dispose() or in .restoreSnapshot()
            const maybeEntry = await this._createModifiedFileEntry(resource, telemetryInfo, ifNotExists, initialContent);
            if (!maybeEntry) {
                return undefined;
            }
            entry = maybeEntry;
            if (initialContent === undefined) {
                this._initialFileContents.set(resource, entry.initialContent);
            }
        }
        // If an entry is deleted e.g. reverting a created file,
        // remove it from the entries and don't show it in the working set anymore
        // so that it can be recreated e.g. through retry
        const listener = entry.onDidDelete(() => {
            const newEntries = this._entriesObs.get().filter(e => !isEqual(e.modifiedURI, entry.modifiedURI));
            this._entriesObs.set(newEntries, undefined);
            this._editorService.closeEditors(this._editorService.findEditors(entry.modifiedURI));
            if (!existingExternalEntry) {
                // don't dispose entries that are not yours!
                entry.dispose();
            }
            this._store.delete(listener);
        });
        this._store.add(listener);
        const entriesArr = [...this._entriesObs.get(), entry];
        this._entriesObs.set(entriesArr, undefined);
        return entry;
    }
    async _createModifiedFileEntry(resource, telemetryInfo, ifNotExists, initialContent) {
        const multiDiffEntryDelegate = {
            collapse: (transaction) => this._collapse(resource, transaction),
            recordOperation: (operation) => {
                operation.epoch = this._timeline.incrementEpoch();
                this._timeline.recordFileOperation(operation);
            },
        };
        const notebookUri = CellUri.parse(resource)?.notebook || resource;
        const doCreate = async (chatKind) => {
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(notebookUri, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent, this._instantiationService);
            }
            else {
                const ref = await this._textModelService.createModelReference(resource);
                return this._instantiationService.createInstance(ChatEditingModifiedDocumentEntry, ref, multiDiffEntryDelegate, telemetryInfo, chatKind, initialContent);
            }
        };
        try {
            return await doCreate(1 /* ChatEditKind.Modified */);
        }
        catch (err) {
            if (ifNotExists === 1 /* NotExistBehavior.Abort */) {
                return undefined;
            }
            // this file does not exist yet, create it and try again
            await this._bulkEditService.apply({ edits: [{ newResource: resource }] });
            if (this.configurationService.getValue('accessibility.openChatEditedFiles')) {
                this._editorService.openEditor({ resource, options: { inactive: true, preserveFocus: true, pinned: true } });
            }
            // Record file creation operation
            this._timeline.recordFileOperation({
                type: FileOperationType.Create,
                uri: resource,
                requestId: telemetryInfo.requestId,
                epoch: this._timeline.incrementEpoch(),
                initialContent: initialContent || '',
                telemetryInfo,
            });
            if (this._notebookService.hasSupportedNotebooks(notebookUri)) {
                return await ChatEditingModifiedNotebookEntry.create(resource, multiDiffEntryDelegate, telemetryInfo, 0 /* ChatEditKind.Created */, initialContent, this._instantiationService);
            }
            else {
                return await doCreate(0 /* ChatEditKind.Created */);
            }
        }
    }
    _collapse(resource, transaction) {
        const multiDiffItem = this._editorPane?.findDocumentDiffItem(resource);
        if (multiDiffItem) {
            this._editorPane?.viewModel?.items.get().find((documentDiffItem) => isEqual(documentDiffItem.originalUri, multiDiffItem.originalUri) &&
                isEqual(documentDiffItem.modifiedUri, multiDiffItem.modifiedUri))
                ?.collapsed.set(true, transaction);
        }
    }
};
ChatEditingSession = ChatEditingSession_1 = __decorate([
    __param(4, IInstantiationService),
    __param(5, IModelService),
    __param(6, ILanguageService),
    __param(7, ITextModelService),
    __param(8, IBulkEditService),
    __param(9, IEditorGroupsService),
    __param(10, IEditorService),
    __param(11, INotebookService),
    __param(12, IAccessibilitySignalService),
    __param(13, ILogService),
    __param(14, IConfigurationService)
], ChatEditingSession);
export { ChatEditingSession };
//# sourceMappingURL=chatEditingSession.js.map