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
import { equals as arraysEqual } from '../../../../../base/common/arrays.js';
import { findFirst, findLast, findLastIdx } from '../../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../../base/common/assert.js';
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { equals as objectsEqual } from '../../../../../base/common/objects.js';
import { derived, derivedOpts, ObservablePromise, observableSignalFromEvent, observableValue, observableValueOpts, transaction } from '../../../../../base/common/observable.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { CellUri } from '../../../notebook/common/notebookCommon.js';
import { INotebookEditorModelResolverService } from '../../../notebook/common/notebookEditorModelResolverService.js';
import { INotebookService } from '../../../notebook/common/notebookService.js';
import { FileOperationType } from './chatEditingOperations.js';
import { ChatEditingSnapshotTextModelContentProvider } from './chatEditingTextModelContentProviders.js';
import { createSnapshot as createNotebookSnapshot, restoreSnapshot as restoreNotebookSnapshot } from './notebook/chatEditingModifiedNotebookSnapshot.js';
const START_REQUEST_EPOCH = '$$start';
const STOP_ID_EPOCH_PREFIX = '__epoch_';
/**
 * Implementation of the checkpoint-based timeline system.
 *
 * Invariants:
 * - There is at most one checkpoint or operation per epoch
 * - _checkpoints and _operations are always sorted in ascending order by epoch
 * - _currentEpoch being equal to the epoch of an operation means that
 *   operation is _not_ currently applied
 */
let ChatEditingCheckpointTimelineImpl = class ChatEditingCheckpointTimelineImpl {
    constructor(chatSessionResource, _delegate, _notebookEditorModelResolverService, _notebookService, _instantiationService, _modelService, _textModelService, _editorWorkerService, _configurationService) {
        this.chatSessionResource = chatSessionResource;
        this._delegate = _delegate;
        this._notebookEditorModelResolverService = _notebookEditorModelResolverService;
        this._notebookService = _notebookService;
        this._instantiationService = _instantiationService;
        this._modelService = _modelService;
        this._textModelService = _textModelService;
        this._editorWorkerService = _editorWorkerService;
        this._configurationService = _configurationService;
        this._epochCounter = 0;
        this._checkpoints = observableValue(this, []);
        this._currentEpoch = observableValue(this, 0);
        this._operations = observableValueOpts({ equalsFn: () => false }, []); // mutable
        this._fileBaselines = new Map(); // key: `${uri}::${requestId}`
        /** Gets the checkpoint, if any, we can 'undo' to. */
        this._willUndoToCheckpoint = derived(reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            if (checkpoints.length < 2 || currentEpoch <= checkpoints[1].epoch) {
                return undefined;
            }
            const operations = this._operations.read(reader);
            // Undo either to right before the current request...
            const currentCheckpointIdx = findLastIdx(checkpoints, cp => cp.epoch < currentEpoch);
            const startOfRequest = currentCheckpointIdx === -1 ? undefined : findLast(checkpoints, cp => cp.undoStopId === undefined, currentCheckpointIdx);
            // Or to the checkpoint before the last operation in this request
            const previousOperation = findLast(operations, op => op.epoch < currentEpoch);
            const previousCheckpoint = previousOperation && findLast(checkpoints, cp => cp.epoch < previousOperation.epoch);
            if (!startOfRequest) {
                return previousCheckpoint;
            }
            if (!previousCheckpoint) {
                return startOfRequest;
            }
            // Special case: if we're undoing the first edit operation, undo the entire request
            if (!operations.some(op => op.epoch > startOfRequest.epoch && op.epoch < previousCheckpoint.epoch)) {
                return startOfRequest;
            }
            return previousCheckpoint.epoch > startOfRequest.epoch ? previousCheckpoint : startOfRequest;
        });
        this.canUndo = this._willUndoToCheckpoint.map(cp => !!cp);
        /**
         * Gets the epoch we'll redo this. Unlike undo this doesn't only use checkpoints
         * because we could potentially redo to a 'tip' operation that's not checkpointed yet.
         */
        this._willRedoToEpoch = derived(reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const operations = this._operations.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            const maxEncounteredEpoch = Math.max(operations.at(-1)?.epoch || 0, checkpoints.at(-1)?.epoch || 0);
            if (currentEpoch > maxEncounteredEpoch) {
                return undefined;
            }
            // Find the next edit operation that would be applied...
            const nextOperation = operations.find(op => op.epoch >= currentEpoch);
            const nextCheckpoint = nextOperation && checkpoints.find(op => op.epoch > nextOperation.epoch);
            // And figure out where we're going if we're navigating across request
            // 1. If there is no next request or if the next target checkpoint is in
            //    the next request, navigate there.
            // 2. Otherwise, navigate to the end of the next request.
            const currentCheckpoint = findLast(checkpoints, cp => cp.epoch < currentEpoch);
            if (currentCheckpoint && nextOperation && currentCheckpoint.requestId !== nextOperation.requestId) {
                const startOfNextRequestIdx = findLastIdx(checkpoints, (cp, i) => cp.undoStopId === undefined && (checkpoints[i - 1]?.requestId === currentCheckpoint.requestId));
                const startOfNextRequest = startOfNextRequestIdx === -1 ? undefined : checkpoints[startOfNextRequestIdx];
                if (startOfNextRequest && nextOperation.requestId !== startOfNextRequest.requestId) {
                    const requestAfterTheNext = findFirst(checkpoints, op => op.undoStopId === undefined, startOfNextRequestIdx + 1);
                    if (requestAfterTheNext) {
                        return requestAfterTheNext.epoch;
                    }
                }
            }
            return Math.min(nextCheckpoint?.epoch || Infinity, (maxEncounteredEpoch + 1));
        });
        this.canRedo = this._willRedoToEpoch.map(e => !!e);
        this.requestDisablement = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, objectsEqual) }, reader => {
            const currentEpoch = this._currentEpoch.read(reader);
            const operations = this._operations.read(reader);
            const checkpoints = this._checkpoints.read(reader);
            const maxEncounteredEpoch = Math.max(operations.at(-1)?.epoch || 0, checkpoints.at(-1)?.epoch || 0);
            if (currentEpoch > maxEncounteredEpoch) {
                return []; // common case -- nothing undone
            }
            const lastAppliedOperation = findLast(operations, op => op.epoch < currentEpoch)?.epoch || 0;
            const lastAppliedRequest = findLast(checkpoints, cp => cp.epoch < currentEpoch && cp.undoStopId === undefined)?.epoch || 0;
            const stopDisablingAtEpoch = Math.max(lastAppliedOperation, lastAppliedRequest);
            const disablement = new Map();
            // Go through the checkpoints and disable any until the one that contains the last applied operation.
            // Subtle: the request will first make a checkpoint with an 'undefined' undo
            // stop, and in this loop we'll "automatically" disable the entire request when
            // we reach that checkpoint.
            for (let i = checkpoints.length - 1; i >= 0; i--) {
                const { undoStopId, requestId, epoch } = checkpoints[i];
                if (epoch <= stopDisablingAtEpoch) {
                    break;
                }
                if (requestId) {
                    disablement.set(requestId, undoStopId);
                }
            }
            return [...disablement].map(([requestId, afterUndoStop]) => ({ requestId, afterUndoStop }));
        });
        this.createCheckpoint(undefined, undefined, 'Initial State', 'Starting point before any edits');
    }
    createCheckpoint(requestId, undoStopId, label, description) {
        const existingCheckpoints = this._checkpoints.get();
        const existing = existingCheckpoints.find(c => c.undoStopId === undoStopId && c.requestId === requestId);
        if (existing) {
            return existing.checkpointId;
        }
        const { checkpoints, operations } = this._getVisibleOperationsAndCheckpoints();
        const checkpointId = generateUuid();
        const epoch = this.incrementEpoch();
        checkpoints.push({
            checkpointId,
            requestId,
            undoStopId,
            epoch,
            label,
            description
        });
        transaction(tx => {
            this._checkpoints.set(checkpoints, tx);
            this._operations.set(operations, tx);
            this._currentEpoch.set(epoch + 1, tx);
        });
        return checkpointId;
    }
    async undoToLastCheckpoint() {
        const checkpoint = this._willUndoToCheckpoint.get();
        if (checkpoint) {
            await this.navigateToCheckpoint(checkpoint.checkpointId);
        }
    }
    async redoToNextCheckpoint() {
        const targetEpoch = this._willRedoToEpoch.get();
        if (targetEpoch) {
            await this._navigateToEpoch(targetEpoch);
        }
    }
    navigateToCheckpoint(checkpointId) {
        const targetCheckpoint = this._getCheckpoint(checkpointId);
        if (!targetCheckpoint) {
            throw new Error(`Checkpoint ${checkpointId} not found`);
        }
        if (targetCheckpoint.undoStopId === undefined) {
            // If we're navigating to the start of a request, we want to restore the file
            // to whatever baseline we captured, _not_ the result state from the prior request
            // because there may have been user changes in the meantime. But we still want
            // to set the epoch marking that checkpoint as having been undone (the second
            // arg below) so that disablement works and so it's discarded if appropriate later.
            return this._navigateToEpoch(targetCheckpoint.epoch + 1, targetCheckpoint.epoch);
        }
        else {
            return this._navigateToEpoch(targetCheckpoint.epoch + 1);
        }
    }
    getContentURIAtStop(requestId, fileURI, stopId) {
        return ChatEditingSnapshotTextModelContentProvider.getSnapshotFileURI(this.chatSessionResource, requestId, stopId, fileURI.path);
    }
    async _navigateToEpoch(restoreToEpoch, navigateToEpoch = restoreToEpoch) {
        const currentEpoch = this._currentEpoch.get();
        if (currentEpoch !== restoreToEpoch) {
            const urisToRestore = await this._applyFileSystemOperations(currentEpoch, restoreToEpoch);
            // Reconstruct content for files affected by operations in the range
            await this._reconstructAllFileContents(restoreToEpoch, urisToRestore);
        }
        // Update current epoch
        this._currentEpoch.set(navigateToEpoch, undefined);
    }
    _getCheckpoint(checkpointId) {
        return this._checkpoints.get().find(c => c.checkpointId === checkpointId);
    }
    incrementEpoch() {
        return this._epochCounter++;
    }
    recordFileOperation(operation) {
        const { currentEpoch, checkpoints, operations } = this._getVisibleOperationsAndCheckpoints();
        if (operation.epoch < currentEpoch) {
            throw new Error(`Cannot record operation at epoch ${operation.epoch} when current epoch is ${currentEpoch}`);
        }
        operations.push(operation);
        transaction(tx => {
            this._checkpoints.set(checkpoints, tx);
            this._operations.set(operations, tx);
            this._currentEpoch.set(operation.epoch + 1, tx);
        });
    }
    _getVisibleOperationsAndCheckpoints() {
        const currentEpoch = this._currentEpoch.get();
        const checkpoints = this._checkpoints.get();
        const operations = this._operations.get();
        return {
            currentEpoch,
            checkpoints: checkpoints.filter(c => c.epoch < currentEpoch),
            operations: operations.filter(op => op.epoch < currentEpoch)
        };
    }
    recordFileBaseline(baseline) {
        const key = this._getBaselineKey(baseline.uri, baseline.requestId);
        this._fileBaselines.set(key, baseline);
    }
    _getFileBaseline(uri, requestId) {
        const key = this._getBaselineKey(uri, requestId);
        return this._fileBaselines.get(key);
    }
    hasFileBaseline(uri, requestId) {
        const key = this._getBaselineKey(uri, requestId);
        return this._fileBaselines.has(key);
    }
    async getContentAtStop(requestId, contentURI, stopId) {
        let toEpoch;
        if (stopId?.startsWith(STOP_ID_EPOCH_PREFIX)) {
            toEpoch = Number(stopId.slice(STOP_ID_EPOCH_PREFIX.length));
        }
        else {
            toEpoch = this._checkpoints.get().find(c => c.requestId === requestId && c.undoStopId === stopId)?.epoch;
        }
        // The content URI doesn't preserve the original scheme or authority. Look through
        // to find the operation that touched that path to get its actual URI
        const fileURI = this._getTimelineCanonicalUriForPath(contentURI);
        if (!toEpoch || !fileURI) {
            return '';
        }
        const baseline = await this._findBestBaselineForFile(fileURI, toEpoch, requestId);
        if (!baseline) {
            return '';
        }
        const operations = this._getFileOperationsInRange(fileURI, baseline.epoch, toEpoch);
        const replayed = await this._replayOperations(baseline, operations);
        return replayed.exists ? replayed.content : undefined;
    }
    _getTimelineCanonicalUriForPath(contentURI) {
        for (const it of [this._fileBaselines.values(), this._operations.get()]) {
            for (const thing of it) {
                if (thing.uri.path === contentURI.path) {
                    return thing.uri;
                }
            }
        }
        return undefined;
    }
    /**
     * Creates a callback that is invoked when data at the stop changes. This
     * will not fire initially and may be debounced internally.
     */
    onDidChangeContentsAtStop(requestId, contentURI, stopId, callback) {
        // The only case where we have data that updates is if we have an epoch pointer that's
        // after our know epochs (e.g. pointing to the end file state after all operations).
        // If this isn't the case, abort.
        if (!stopId || !stopId.startsWith(STOP_ID_EPOCH_PREFIX)) {
            return Disposable.None;
        }
        const target = Number(stopId.slice(STOP_ID_EPOCH_PREFIX.length));
        if (target <= this._epochCounter) {
            return Disposable.None; // already finalized
        }
        const store = new DisposableStore();
        const scheduler = store.add(new ThrottledDelayer(500));
        store.add(Event.fromObservableLight(this._operations)(() => {
            scheduler.trigger(async () => {
                if (this._operations.get().at(-1)?.epoch >= target) {
                    store.dispose();
                }
                const content = await this.getContentAtStop(requestId, contentURI, stopId);
                if (content !== undefined) {
                    callback(content);
                }
            });
        }));
        return store;
    }
    _getCheckpointBeforeEpoch(epoch, reader) {
        return findLast(this._checkpoints.read(reader), c => c.epoch <= epoch);
    }
    async _reconstructFileState(uri, targetEpoch) {
        const targetCheckpoint = this._getCheckpointBeforeEpoch(targetEpoch);
        if (!targetCheckpoint) {
            throw new Error(`Checkpoint for epoch ${targetEpoch} not found`);
        }
        // Find the most appropriate baseline for this file
        const baseline = await this._findBestBaselineForFile(uri, targetEpoch, targetCheckpoint.requestId || '');
        if (!baseline) {
            // File doesn't exist at this checkpoint
            return {
                exists: false,
                uri,
            };
        }
        // Get operations that affect this file from baseline to target checkpoint
        const operations = this._getFileOperationsInRange(uri, baseline.epoch, targetEpoch);
        // Replay operations to reconstruct state
        return this._replayOperations(baseline, operations);
    }
    getStateForPersistence() {
        return {
            checkpoints: this._checkpoints.get(),
            currentEpoch: this._currentEpoch.get(),
            fileBaselines: [...this._fileBaselines],
            operations: this._operations.get(),
            epochCounter: this._epochCounter,
        };
    }
    restoreFromState(state, tx) {
        this._checkpoints.set(state.checkpoints, tx);
        this._currentEpoch.set(state.currentEpoch, tx);
        this._operations.set(state.operations.slice(), tx);
        this._epochCounter = state.epochCounter;
        this._fileBaselines.clear();
        for (const [key, baseline] of state.fileBaselines) {
            this._fileBaselines.set(key, baseline);
        }
    }
    getCheckpointIdForRequest(requestId, undoStopId) {
        const checkpoints = this._checkpoints.get();
        return checkpoints.find(c => c.requestId === requestId && c.undoStopId === undoStopId)?.checkpointId;
    }
    async _reconstructAllFileContents(targetEpoch, filesToReconstruct) {
        await Promise.all(Array.from(filesToReconstruct).map(async (uri) => {
            const reconstructedState = await this._reconstructFileState(uri, targetEpoch);
            if (reconstructedState.exists) {
                await this._delegate.setContents(reconstructedState.uri, reconstructedState.content, reconstructedState.telemetryInfo);
            }
        }));
    }
    _getBaselineKey(uri, requestId) {
        return `${uri.toString()}::${requestId}`;
    }
    async _findBestBaselineForFile(uri, epoch, requestId) {
        // First, iterate backwards through operations before the target checkpoint
        // to see if the file was created/re-created more recently than any baseline
        let currentRequestId = requestId;
        const operations = this._operations.get();
        for (let i = operations.length - 1; i >= 0; i--) {
            const operation = operations[i];
            if (operation.epoch > epoch) {
                continue;
            }
            // If the file was just created, use that as its updated baseline
            if (operation.type === FileOperationType.Create && isEqual(operation.uri, uri)) {
                return {
                    uri: operation.uri,
                    requestId: operation.requestId,
                    content: operation.initialContent,
                    epoch: operation.epoch,
                    telemetryInfo: operation.telemetryInfo,
                };
            }
            // If the file was renamed to this URI, use its old contents as the baseline
            if (operation.type === FileOperationType.Rename && isEqual(operation.newUri, uri)) {
                const prev = await this._findBestBaselineForFile(operation.oldUri, operation.epoch, operation.requestId);
                if (!prev) {
                    return undefined;
                }
                const operations = this._getFileOperationsInRange(operation.oldUri, prev.epoch, operation.epoch);
                const replayed = await this._replayOperations(prev, operations);
                return {
                    uri: uri,
                    epoch: operation.epoch,
                    content: replayed.exists ? replayed.content : '',
                    requestId: operation.requestId,
                    telemetryInfo: prev.telemetryInfo,
                    notebookViewType: replayed.exists ? replayed.notebookViewType : undefined,
                };
            }
            // When the request ID changes, check if we have a baseline for the current request
            if (currentRequestId && operation.requestId !== currentRequestId) {
                const baseline = this._getFileBaseline(uri, currentRequestId);
                if (baseline) {
                    return baseline;
                }
            }
            currentRequestId = operation.requestId;
        }
        // Check the final request ID for a baseline
        return this._getFileBaseline(uri, currentRequestId);
    }
    _getFileOperationsInRange(uri, fromEpoch, toEpoch) {
        return this._operations.get().filter(op => {
            const cellUri = CellUri.parse(op.uri);
            return op.epoch >= fromEpoch &&
                op.epoch < toEpoch &&
                (isEqual(op.uri, uri) || (cellUri && isEqual(cellUri.notebook, uri)));
        }).sort((a, b) => a.epoch - b.epoch);
    }
    async _replayOperations(baseline, operations) {
        let currentState = {
            exists: true,
            content: baseline.content,
            uri: baseline.uri,
            telemetryInfo: baseline.telemetryInfo,
        };
        if (baseline.notebookViewType) {
            currentState.notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(baseline.notebookViewType);
            if (baseline.content) {
                restoreNotebookSnapshot(currentState.notebook, baseline.content);
            }
        }
        for (const operation of operations) {
            currentState = await this._applyOperationToState(currentState, operation, baseline.telemetryInfo);
        }
        if (currentState.exists && currentState.notebook) {
            const info = await this._notebookService.withNotebookDataProvider(currentState.notebook.viewType);
            currentState.content = createNotebookSnapshot(currentState.notebook, info.serializer.options, this._configurationService);
            currentState.notebook.dispose();
        }
        return currentState;
    }
    async _applyOperationToState(state, operation, telemetryInfo) {
        switch (operation.type) {
            case FileOperationType.Create: {
                if (state.exists && state.notebook) {
                    state.notebook.dispose();
                }
                let notebook;
                if (operation.notebookViewType) {
                    notebook = await this._notebookEditorModelResolverService.createUntitledNotebookTextModel(operation.notebookViewType);
                    if (operation.initialContent) {
                        restoreNotebookSnapshot(notebook, operation.initialContent);
                    }
                }
                return {
                    exists: true,
                    content: operation.initialContent,
                    uri: operation.uri,
                    telemetryInfo,
                    notebookViewType: operation.notebookViewType,
                    notebook,
                };
            }
            case FileOperationType.Delete:
                if (state.exists && state.notebook) {
                    state.notebook.dispose();
                }
                return {
                    exists: false,
                    uri: operation.uri
                };
            case FileOperationType.Rename:
                return {
                    ...state,
                    uri: operation.newUri
                };
            case FileOperationType.TextEdit: {
                if (!state.exists) {
                    throw new Error('Cannot apply text edits to non-existent file');
                }
                const nbCell = operation.cellIndex !== undefined && state.notebook?.cells.at(operation.cellIndex);
                if (nbCell) {
                    const newContent = this._applyTextEditsToContent(nbCell.getValue(), operation.edits);
                    state.notebook.applyEdits([{
                            editType: 1 /* CellEditType.Replace */,
                            index: operation.cellIndex,
                            count: 1,
                            cells: [{ cellKind: nbCell.cellKind, language: nbCell.language, mime: nbCell.language, source: newContent, outputs: nbCell.outputs }]
                        }], true, undefined, () => undefined, undefined);
                    return state;
                }
                // Apply text edits using a temporary text model
                return {
                    ...state,
                    content: this._applyTextEditsToContent(state.content, operation.edits)
                };
            }
            case FileOperationType.NotebookEdit:
                if (!state.exists) {
                    throw new Error('Cannot apply notebook edits to non-existent file');
                }
                if (!state.notebook) {
                    throw new Error('Cannot apply notebook edits to non-notebook file');
                }
                state.notebook.applyEdits(operation.cellEdits.slice(), true, undefined, () => undefined, undefined);
                return state;
            default:
                assertNever(operation);
        }
    }
    async _applyFileSystemOperations(fromEpoch, toEpoch) {
        const isMovingForward = toEpoch > fromEpoch;
        const operations = this._operations.get().filter(op => {
            if (isMovingForward) {
                return op.epoch >= fromEpoch && op.epoch < toEpoch;
            }
            else {
                return op.epoch < fromEpoch && op.epoch >= toEpoch;
            }
        }).sort((a, b) => isMovingForward ? a.epoch - b.epoch : b.epoch - a.epoch);
        // Apply file system operations in the correct direction
        const urisToRestore = new ResourceSet();
        for (const operation of operations) {
            await this._applyFileSystemOperation(operation, isMovingForward, urisToRestore);
        }
        return urisToRestore;
    }
    async _applyFileSystemOperation(operation, isMovingForward, urisToRestore) {
        switch (operation.type) {
            case FileOperationType.Create:
                if (isMovingForward) {
                    await this._delegate.createFile(operation.uri, operation.initialContent);
                    urisToRestore.add(operation.uri);
                }
                else {
                    await this._delegate.deleteFile(operation.uri);
                    urisToRestore.delete(operation.uri);
                }
                break;
            case FileOperationType.Delete:
                if (isMovingForward) {
                    await this._delegate.deleteFile(operation.uri);
                    urisToRestore.delete(operation.uri);
                }
                else {
                    await this._delegate.createFile(operation.uri, operation.finalContent);
                    urisToRestore.add(operation.uri);
                }
                break;
            case FileOperationType.Rename:
                if (isMovingForward) {
                    await this._delegate.renameFile(operation.oldUri, operation.newUri);
                    urisToRestore.delete(operation.oldUri);
                    urisToRestore.add(operation.newUri);
                }
                else {
                    await this._delegate.renameFile(operation.newUri, operation.oldUri);
                    urisToRestore.delete(operation.newUri);
                    urisToRestore.add(operation.oldUri);
                }
                break;
            // Text and notebook edits don't affect file system structure
            case FileOperationType.TextEdit:
            case FileOperationType.NotebookEdit:
                urisToRestore.add(CellUri.parse(operation.uri)?.notebook ?? operation.uri);
                break;
            default:
                assertNever(operation);
        }
    }
    _applyTextEditsToContent(content, edits) {
        // Use the example pattern provided by the user
        const makeModel = (uri, contents) => this._instantiationService.createInstance(TextModel, contents, '', this._modelService.getCreationOptions('', uri, true), uri);
        // Create a temporary URI for the model
        const tempUri = URI.from({ scheme: 'temp', path: `/temp-${Date.now()}.txt` });
        const model = makeModel(tempUri, content);
        try {
            // Apply edits
            model.applyEdits(edits.map(edit => ({
                range: {
                    startLineNumber: edit.range.startLineNumber,
                    startColumn: edit.range.startColumn,
                    endLineNumber: edit.range.endLineNumber,
                    endColumn: edit.range.endColumn
                },
                text: edit.text
            })));
            return model.getValue();
        }
        finally {
            model.dispose();
        }
    }
    getEntryDiffBetweenStops(uri, requestId, stopId) {
        const epochs = derivedOpts({ equalsFn: (a, b) => a.start === b.start && a.end === b.end }, reader => {
            const checkpoints = this._checkpoints.read(reader);
            const startIndex = checkpoints.findIndex(c => c.requestId === requestId && c.undoStopId === stopId);
            return { start: checkpoints[startIndex], end: checkpoints[startIndex + 1] };
        });
        return this._getEntryDiffBetweenEpochs(uri, epochs);
    }
    getEntryDiffBetweenRequests(uri, startRequestId, stopRequestId) {
        const epochs = derivedOpts({ equalsFn: (a, b) => a.start === b.start && a.end === b.end }, reader => {
            const checkpoints = this._checkpoints.read(reader);
            const startIndex = checkpoints.findIndex(c => c.requestId === startRequestId);
            const start = startIndex === -1 ? checkpoints[0] : checkpoints[startIndex];
            const end = checkpoints.find(c => c.requestId === stopRequestId) || findFirst(checkpoints, c => c.requestId !== startRequestId, startIndex) || checkpoints[checkpoints.length - 1];
            return { start, end };
        });
        return this._getEntryDiffBetweenEpochs(uri, epochs);
    }
    _getEntryDiffBetweenEpochs(uri, epochs) {
        const modelRefsPromise = derived(this, (reader) => {
            const { start, end } = epochs.read(reader);
            if (!start) {
                return undefined;
            }
            const store = reader.store.add(new DisposableStore());
            const promise = Promise.all([
                this._textModelService.createModelReference(this.getContentURIAtStop(start.requestId || START_REQUEST_EPOCH, uri, STOP_ID_EPOCH_PREFIX + start.epoch)),
                this._textModelService.createModelReference(this.getContentURIAtStop(end?.requestId || start.requestId || START_REQUEST_EPOCH, uri, STOP_ID_EPOCH_PREFIX + (end?.epoch || Number.MAX_SAFE_INTEGER))),
            ]).then(refs => {
                if (store.isDisposed) {
                    refs.forEach(r => r.dispose());
                }
                else {
                    refs.forEach(r => store.add(r));
                }
                return { refs, isFinal: !!end };
            });
            return new ObservablePromise(promise);
        });
        const resolvedModels = derived(reader => {
            const refs2 = modelRefsPromise.read(reader)?.promiseResult.read(reader);
            return refs2?.data && {
                isFinal: refs2.data.isFinal,
                refs: refs2.data.refs.map(r => ({
                    model: r.object.textEditorModel,
                    onChange: observableSignalFromEvent(this, r.object.textEditorModel.onDidChangeContent.bind(r.object.textEditorModel)),
                })),
            };
        });
        const diff = derived((reader) => {
            const modelsData = resolvedModels.read(reader);
            if (!modelsData) {
                return;
            }
            const { refs, isFinal } = modelsData;
            refs.forEach(m => m.onChange.read(reader)); // re-read when contents change
            const promise = this._computeDiff(refs[0].model.uri, refs[1].model.uri, isFinal);
            return new ObservablePromise(promise);
        });
        return derived(reader => {
            return diff.read(reader)?.promiseResult.read(reader)?.data || undefined;
        });
    }
    _computeDiff(originalUri, modifiedUri, isFinal) {
        return this._editorWorkerService.computeDiff(originalUri, modifiedUri, { ignoreTrimWhitespace: false, computeMoves: false, maxComputationTimeMs: 3000 }, 'advanced').then((diff) => {
            const entryDiff = {
                originalURI: originalUri,
                modifiedURI: modifiedUri,
                identical: !!diff?.identical,
                isFinal,
                quitEarly: !diff || diff.quitEarly,
                added: 0,
                removed: 0,
            };
            if (diff) {
                for (const change of diff.changes) {
                    entryDiff.removed += change.original.endLineNumberExclusive - change.original.startLineNumber;
                    entryDiff.added += change.modified.endLineNumberExclusive - change.modified.startLineNumber;
                }
            }
            return entryDiff;
        });
    }
};
ChatEditingCheckpointTimelineImpl = __decorate([
    __param(2, INotebookEditorModelResolverService),
    __param(3, INotebookService),
    __param(4, IInstantiationService),
    __param(5, IModelService),
    __param(6, ITextModelService),
    __param(7, IEditorWorkerService),
    __param(8, IConfigurationService)
], ChatEditingCheckpointTimelineImpl);
export { ChatEditingCheckpointTimelineImpl };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdDaGVja3BvaW50VGltZWxpbmVJbXBsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nQ2hlY2twb2ludFRpbWVsaW5lSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxJQUFJLFdBQVcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE1BQU0sSUFBSSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBc0MsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ3JOLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFlB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