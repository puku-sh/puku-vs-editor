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
var NotebookTextModel_1;
import { LcsDiff } from '../../../../../base/common/diff/diff.js';
import { Emitter, PauseableEmitter } from '../../../../../base/common/event.js';
import { hash } from '../../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { filter } from '../../../../../base/common/objects.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { hasKey, isDefined } from '../../../../../base/common/types.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { TextModel } from '../../../../../editor/common/model/textModel.js';
import { SearchParams } from '../../../../../editor/common/model/textModelSearch.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IUndoRedoService } from '../../../../../platform/undoRedo/common/undoRedo.js';
import { ILanguageDetectionService } from '../../../../services/languageDetection/common/languageDetectionWorkerService.js';
import { CellUri, diff, NotebookCellExecutionState, NotebookCellsChangeType } from '../notebookCommon.js';
import { INotebookExecutionStateService } from '../notebookExecutionStateService.js';
import { INotebookLoggingService } from '../notebookLoggingService.js';
import { CellMetadataEdit, MoveCellEdit, SpliceCellsEdit } from './cellEdit.js';
import { NotebookCellOutputTextModel } from './notebookCellOutputTextModel.js';
import { NotebookCellTextModel } from './notebookCellTextModel.js';
class StackOperation {
    get code() {
        return this._operations.length === 1 ? this._operations[0].code : 'undoredo.notebooks.stackOperation';
    }
    get label() {
        return this._operations.length === 1 ? this._operations[0].label : 'edit';
    }
    constructor(textModel, undoRedoGroup, _pauseableEmitter, _postUndoRedo, selectionState, beginAlternativeVersionId) {
        this.textModel = textModel;
        this.undoRedoGroup = undoRedoGroup;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this.tag = 'notebookUndoRedoElement';
        this._operations = [];
        this._beginSelectionState = undefined;
        this._resultSelectionState = undefined;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this._beginSelectionState = selectionState;
        this._beginAlternativeVersionId = beginAlternativeVersionId;
        this._resultAlternativeVersionId = beginAlternativeVersionId;
    }
    get resources() {
        return [this.textModel.uri];
    }
    get isEmpty() {
        return this._operations.length === 0;
    }
    pushEndState(alternativeVersionId, selectionState) {
        // https://github.com/microsoft/vscode/issues/207523
        this._resultAlternativeVersionId = alternativeVersionId;
        this._resultSelectionState = selectionState || this._resultSelectionState;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId) {
        if (this._operations.length === 0) {
            this._beginSelectionState = this._beginSelectionState ?? beginSelectionState;
        }
        this._operations.push(element);
        this._resultSelectionState = resultSelectionState;
        this._resultAlternativeVersionId = alternativeVersionId;
    }
    async undo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = this._operations.length - 1; i >= 0; i--) {
                await this._operations[i].undo();
            }
            this._postUndoRedo(this._beginAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._beginSelectionState
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
    async redo() {
        this._pauseableEmitter.pause();
        try {
            for (let i = 0; i < this._operations.length; i++) {
                await this._operations[i].redo();
            }
            this._postUndoRedo(this._resultAlternativeVersionId);
            this._pauseableEmitter.fire({
                rawEvents: [],
                synchronous: undefined,
                versionId: this.textModel.versionId,
                endSelectionState: this._resultSelectionState
            });
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
}
class NotebookOperationManager {
    constructor(_textModel, _undoService, _pauseableEmitter, _postUndoRedo) {
        this._textModel = _textModel;
        this._undoService = _undoService;
        this._pauseableEmitter = _pauseableEmitter;
        this._postUndoRedo = _postUndoRedo;
        this._pendingStackOperation = null;
        this._isAppending = false;
    }
    isUndoStackEmpty() {
        return this._pendingStackOperation === null || this._pendingStackOperation.isEmpty;
    }
    pushStackElement(alternativeVersionId, selectionState) {
        if (this._pendingStackOperation && !this._pendingStackOperation.isEmpty) {
            this._pendingStackOperation.pushEndState(alternativeVersionId, selectionState);
            if (!this._isAppending) {
                this._undoService.pushElement(this._pendingStackOperation, this._pendingStackOperation.undoRedoGroup);
            }
        }
        this._isAppending = false;
        this._pendingStackOperation = null;
    }
    _getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId) {
        return this._pendingStackOperation ??= new StackOperation(this._textModel, undoRedoGroup, this._pauseableEmitter, this._postUndoRedo, beginSelectionState, alternativeVersionId || '');
    }
    appendPreviousOperation() {
        const previous = this._undoService.getLastElement(this._textModel.uri);
        if (previous && previous.tag === 'notebookUndoRedoElement') {
            this._pendingStackOperation = previous;
            this._isAppending = true;
            return true;
        }
        return false;
    }
    pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId, undoRedoGroup) {
        const pendingStackOperation = this._getOrCreateEditStackElement(beginSelectionState, undoRedoGroup, alternativeVersionId);
        pendingStackOperation.pushEditOperation(element, beginSelectionState, resultSelectionState, alternativeVersionId);
    }
}
class NotebookEventEmitter extends PauseableEmitter {
    get isEmpty() {
        return this._eventQueue.isEmpty();
    }
    isDirtyEvent() {
        for (const e of this._eventQueue) {
            for (let i = 0; i < e.rawEvents.length; i++) {
                if (!e.rawEvents[i].transient) {
                    return true;
                }
            }
        }
        return false;
    }
}
let NotebookTextModel = NotebookTextModel_1 = class NotebookTextModel extends Disposable {
    get length() {
        return this._cells.length;
    }
    get cells() {
        return this._cells;
    }
    get versionId() {
        return this._versionId;
    }
    get alternativeVersionId() {
        return this._alternativeVersionId;
    }
    get notebookType() {
        return this.viewType;
    }
    constructor(viewType, uri, cells, metadata, options, _undoService, _modelService, _languageService, _languageDetectionService, _notebookExecutionStateService, _notebookLoggingService) {
        super();
        this.viewType = viewType;
        this.uri = uri;
        this._undoService = _undoService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._languageDetectionService = _languageDetectionService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._notebookLoggingService = _notebookLoggingService;
        this._isDisposed = false;
        this._onWillDispose = this._register(new Emitter());
        this._onWillAddRemoveCells = this._register(new Emitter());
        this._onDidChangeContent = this._register(new Emitter());
        this.onWillDispose = this._onWillDispose.event;
        this.onWillAddRemoveCells = this._onWillAddRemoveCells.event;
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._cellhandlePool = 0;
        this._cellListeners = new Map();
        this._cells = [];
        this.metadata = {};
        this.transientOptions = { transientCellMetadata: {}, transientDocumentMetadata: {}, transientOutputs: false, cellContentMetadata: {} };
        this._versionId = 0;
        /**
         * This alternative id is only for non-cell-content changes.
         */
        this._notebookSpecificAlternativeId = 0;
        /**
         * Unlike, versionId, this can go down (via undo) or go to previous values (via redo)
         */
        this._alternativeVersionId = '1';
        this.newCellsFromLastEdit = new Set();
        this.transientOptions = options;
        this.metadata = metadata;
        this._initialize(cells);
        const maybeUpdateCellTextModel = (textModel) => {
            if (textModel.uri.scheme === Schemas.vscodeNotebookCell && textModel instanceof TextModel) {
                const cellUri = CellUri.parse(textModel.uri);
                if (cellUri && isEqual(cellUri.notebook, this.uri)) {
                    const cellIdx = this._getCellIndexByHandle(cellUri.handle);
                    if (cellIdx >= 0) {
                        const cell = this.cells[cellIdx];
                        if (cell) {
                            cell.textModel = textModel;
                        }
                    }
                }
            }
        };
        this._register(_modelService.onModelAdded(e => maybeUpdateCellTextModel(e)));
        this._pauseableEmitter = this._register(new NotebookEventEmitter({
            merge: (events) => {
                const first = events[0];
                const rawEvents = first.rawEvents;
                let versionId = first.versionId;
                let endSelectionState = first.endSelectionState;
                let synchronous = first.synchronous;
                for (let i = 1; i < events.length; i++) {
                    rawEvents.push(...events[i].rawEvents);
                    versionId = events[i].versionId;
                    endSelectionState = events[i].endSelectionState !== undefined ? events[i].endSelectionState : endSelectionState;
                    synchronous = events[i].synchronous !== undefined ? events[i].synchronous : synchronous;
                }
                return { rawEvents, versionId, endSelectionState, synchronous };
            }
        }));
        this._register(this._pauseableEmitter.event(e => {
            if (e.rawEvents.length) {
                this._onDidChangeContent.fire(e);
            }
        }));
        this._operationManager = new NotebookOperationManager(this, this._undoService, this._pauseableEmitter, (alternativeVersionId) => {
            this._increaseVersionId(true);
            this._overwriteAlternativeVersionId(alternativeVersionId);
        });
        this._notebookLoggingService.trace('notebookTextModel', `Initialized notebook text model for ${uri.toString()}`);
    }
    setCellCollapseDefault(collapseConfig) {
        this._defaultCollapseConfig = collapseConfig;
    }
    _initialize(cells, triggerDirty) {
        this._cells = [];
        this._versionId = 0;
        this._notebookSpecificAlternativeId = 0;
        const mainCells = cells.map(cell => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            return new NotebookCellTextModel(cellUri, cellHandle, cell, this.transientOptions, this._languageService, this._modelService.getCreationOptions(cell.language, cellUri, false).defaultEOL, this._defaultCollapseConfig, this._languageDetectionService, this._notebookLoggingService);
        });
        for (let i = 0; i < mainCells.length; i++) {
            const dirtyStateListener = mainCells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(mainCells[i], e);
            });
            this._cellListeners.set(mainCells[i].handle, dirtyStateListener);
            this._register(mainCells[i]);
        }
        this._cells.splice(0, 0, ...mainCells);
        this._alternativeVersionId = this._generateAlternativeId();
        if (triggerDirty) {
            this._pauseableEmitter.fire({
                rawEvents: [{ kind: NotebookCellsChangeType.Unknown, transient: false }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _bindCellContentHandler(cell, e) {
        this._increaseVersionId(e === 'content' || (typeof e === 'object' && e.type === 'model'));
        switch (e) {
            case 'content':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellContent, index: this._getCellIndexByHandle(cell.handle), transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            case 'language':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellLanguage, index: this._getCellIndexByHandle(cell.handle), language: cell.language, transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            case 'mime':
                this._pauseableEmitter.fire({
                    rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellMime, index: this._getCellIndexByHandle(cell.handle), mime: cell.mime, transient: false }],
                    versionId: this.versionId,
                    synchronous: true,
                    endSelectionState: undefined
                });
                break;
            default:
                if (typeof e === 'object' && e.type === 'model') {
                    this._pauseableEmitter.fire({
                        rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellContent, index: this._getCellIndexByHandle(cell.handle), transient: false }],
                        versionId: this.versionId,
                        synchronous: true,
                        endSelectionState: undefined
                    });
                }
                break;
        }
    }
    _generateAlternativeId() {
        return `${this._notebookSpecificAlternativeId}_` + this.cells.map(cell => cell.handle + ',' + cell.alternativeId).join(';');
    }
    dispose() {
        if (this._isDisposed) {
            // NotebookEditorModel can be disposed twice, don't fire onWillDispose again
            return;
        }
        this._isDisposed = true;
        this._onWillDispose.fire();
        this._undoService.removeElements(this.uri);
        dispose(this._cellListeners.values());
        this._cellListeners.clear();
        dispose(this._cells);
        this._cells = [];
        super.dispose();
    }
    pushStackElement() {
        // https://github.com/microsoft/vscode/issues/207523
    }
    _getCellIndexByHandle(handle) {
        return this.cells.findIndex(c => c.handle === handle);
    }
    _getCellIndexWithOutputIdHandleFromEdits(outputId, rawEdits) {
        const edit = rawEdits.find(e => hasKey(e, { outputs: true }) && e.outputs.some(o => o.outputId === outputId));
        if (edit) {
            if (hasKey(edit, { index: true })) {
                return edit.index;
            }
            else if (hasKey(edit, { handle: true })) {
                const cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
                return cellIndex;
            }
        }
        return -1;
    }
    _getCellIndexWithOutputIdHandle(outputId) {
        return this.cells.findIndex(c => !!c.outputs.find(o => o.outputId === outputId));
    }
    reset(cells, metadata, transientOptions) {
        this.transientOptions = transientOptions;
        const executions = this._notebookExecutionStateService.getCellExecutionsForNotebook(this.uri);
        const executingCellHandles = executions.filter(exe => exe.state === NotebookCellExecutionState.Executing).map(exe => exe.cellHandle);
        const edits = NotebookTextModel_1.computeEdits(this, cells, executingCellHandles);
        this.applyEdits([
            ...edits,
            { editType: 5 /* CellEditType.DocumentMetadata */, metadata }
        ], true, undefined, () => undefined, undefined, false);
    }
    createSnapshot(options) {
        const transientOptions = options.transientOptions ?? this.transientOptions;
        const data = {
            metadata: filter(this.metadata, key => !transientOptions.transientDocumentMetadata[key]),
            cells: [],
        };
        let outputSize = 0;
        for (const cell of this.cells) {
            const cellData = {
                cellKind: cell.cellKind,
                language: cell.language,
                mime: cell.mime,
                source: cell.getValue(),
                outputs: [],
                internalMetadata: cell.internalMetadata
            };
            if (options.context === 2 /* SnapshotContext.Backup */ && options.outputSizeLimit > 0) {
                cell.outputs.forEach(output => {
                    output.outputs.forEach(item => {
                        outputSize += item.data.byteLength;
                    });
                });
                if (outputSize > options.outputSizeLimit) {
                    throw new Error('Notebook too large to backup');
                }
            }
            cellData.outputs = !transientOptions.transientOutputs ? cell.outputs : [];
            cellData.metadata = filter(cell.metadata, key => !transientOptions.transientCellMetadata[key]);
            data.cells.push(cellData);
        }
        return data;
    }
    restoreSnapshot(snapshot, transientOptions) {
        this.reset(snapshot.cells, snapshot.metadata, transientOptions ?? this.transientOptions);
    }
    static computeEdits(model, cells, executingHandles = []) {
        const edits = [];
        const isExecuting = (cell) => executingHandles.includes(cell.handle);
        const commonPrefix = this._commonPrefix(model.cells, model.cells.length, 0, cells, cells.length, 0, isExecuting);
        if (commonPrefix > 0) {
            for (let i = 0; i < commonPrefix; i++) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: i,
                    metadata: cells[i].metadata ?? {}
                }, ...this._computeOutputEdit(i, model.cells[i].outputs, cells[i].outputs));
            }
        }
        if (model.cells.length === cells.length && commonPrefix === model.cells.length) {
            return edits;
        }
        const commonSuffix = this._commonSuffix(model.cells, model.cells.length - commonPrefix, commonPrefix, cells, cells.length - commonPrefix, commonPrefix, isExecuting);
        if (commonSuffix > 0) {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: commonPrefix, count: model.cells.length - commonPrefix - commonSuffix, cells: cells.slice(commonPrefix, cells.length - commonSuffix) });
        }
        else if (commonPrefix > 0) {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: commonPrefix, count: model.cells.length - commonPrefix, cells: cells.slice(commonPrefix) });
        }
        else {
            edits.push({ editType: 1 /* CellEditType.Replace */, index: 0, count: model.cells.length, cells });
        }
        if (commonSuffix > 0) {
            // has same suffix
            for (let i = commonSuffix; i > 0; i--) {
                edits.push({
                    editType: 3 /* CellEditType.Metadata */,
                    index: model.cells.length - i,
                    metadata: cells[cells.length - i].metadata ?? {}
                }, ...this._computeOutputEdit(model.cells.length - i, model.cells[model.cells.length - i].outputs, cells[cells.length - i].outputs));
            }
        }
        return edits;
    }
    static _computeOutputEdit(index, a, b) {
        if (a.length !== b.length) {
            return [
                {
                    editType: 2 /* CellEditType.Output */,
                    index: index,
                    outputs: b,
                    append: false
                }
            ];
        }
        if (a.length === 0) {
            // no output
            return [];
        }
        // same length
        return b.map((output, i) => {
            return {
                editType: 7 /* CellEditType.OutputItems */,
                outputId: a[i].outputId,
                items: output.outputs,
                append: false
            };
        });
    }
    static _commonPrefix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a[aDelta + i].fastEqual(b[bDelta + i], isExecuting(a[aDelta + i])); i++) {
            result++;
        }
        return result;
    }
    static _commonSuffix(a, aLen, aDelta, b, bLen, bDelta, isExecuting) {
        const maxResult = Math.min(aLen, bLen);
        let result = 0;
        for (let i = 0; i < maxResult && a[aDelta + aLen - i - 1].fastEqual(b[bDelta + bLen - i - 1], isExecuting(a[aDelta + aLen - i - 1])); i++) {
            result++;
        }
        return result;
    }
    isOnlyEditingMetadataOnNewCells(rawEdits) {
        for (const edit of rawEdits) {
            if (edit.editType === 9 /* CellEditType.PartialInternalMetadata */) {
                continue;
            }
            if (edit.editType !== 3 /* CellEditType.Metadata */ && edit.editType !== 8 /* CellEditType.PartialMetadata */) {
                return false;
            }
            if (hasKey(edit, { index: true }) && !this.newCellsFromLastEdit.has(this.cells[edit.index].handle)) {
                return false;
            }
            if (hasKey(edit, { handle: true }) && !this.newCellsFromLastEdit.has(edit.handle)) {
                return false;
            }
        }
        return true;
    }
    applyEdits(rawEdits, synchronous, beginSelectionState, endSelectionsComputer, undoRedoGroup, computeUndoRedo) {
        this._notebookLoggingService.trace('textModelEdits', `Begin applying ${rawEdits.length} raw edits`);
        this._pauseableEmitter.pause();
        try {
            this._operationManager.pushStackElement(this._alternativeVersionId, undefined);
            if (computeUndoRedo && this.isOnlyEditingMetadataOnNewCells(rawEdits)) {
                if (!this._operationManager.appendPreviousOperation()) {
                    // we can't append the previous operation, so just don't compute undo/redo
                    computeUndoRedo = false;
                }
            }
            else if (computeUndoRedo) {
                this.newCellsFromLastEdit.clear();
            }
            try {
                this._doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
                return true;
            }
            catch (err) {
                this._notebookLoggingService.error('textModelEdits', `Error while applying edits: ${err}`);
                throw err;
            }
            finally {
                if (!this._pauseableEmitter.isEmpty) {
                    // Update selection and versionId after applying edits.
                    const endSelections = endSelectionsComputer();
                    this._increaseVersionId(this._operationManager.isUndoStackEmpty() && !this._pauseableEmitter.isDirtyEvent());
                    // Finalize undo element
                    this._operationManager.pushStackElement(this._alternativeVersionId, endSelections);
                    // Broadcast changes
                    this._pauseableEmitter.fire({ rawEvents: [], versionId: this.versionId, synchronous: synchronous, endSelectionState: endSelections });
                    this._notebookLoggingService.trace('textModelEdits', `End applying ${rawEdits.length} raw edits`);
                }
            }
        }
        finally {
            this._pauseableEmitter.resume();
        }
    }
    _doApplyEdits(rawEdits, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const editsWithDetails = rawEdits.map((edit, index) => {
            let cellIndex = -1;
            if (hasKey(edit, { index: true })) {
                cellIndex = edit.index;
            }
            else if (hasKey(edit, { handle: true })) {
                cellIndex = this._getCellIndexByHandle(edit.handle);
                this._assertIndex(cellIndex);
            }
            else if (hasKey(edit, { outputId: true })) {
                cellIndex = this._getCellIndexWithOutputIdHandle(edit.outputId);
                if (this._indexIsInvalid(cellIndex)) {
                    // The referenced output may have been created in this batch of edits
                    cellIndex = this._getCellIndexWithOutputIdHandleFromEdits(edit.outputId, rawEdits.slice(0, index));
                }
                if (this._indexIsInvalid(cellIndex)) {
                    // It's possible for an edit to refer to an output which was just cleared, ignore it without throwing
                    return null;
                }
            }
            else if (edit.editType !== 5 /* CellEditType.DocumentMetadata */) {
                throw new Error('Invalid cell edit: ' + JSON.stringify(edit));
            }
            return {
                edit,
                cellIndex,
                end: (edit.editType === 5 /* CellEditType.DocumentMetadata */)
                    ? undefined
                    : (edit.editType === 1 /* CellEditType.Replace */ ? edit.index + edit.count : cellIndex),
                originalIndex: index
            };
        }).filter(isDefined);
        // compress all edits which have no side effects on cell index
        const edits = this._mergeCellEdits(editsWithDetails)
            .sort((a, b) => {
            if (a.end === undefined) {
                return -1;
            }
            if (b.end === undefined) {
                return -1;
            }
            return b.end - a.end || b.originalIndex - a.originalIndex;
        }).reduce((prev, curr) => {
            if (!prev.length) {
                // empty
                prev.push([curr]);
            }
            else {
                const last = prev[prev.length - 1];
                const index = last[0].cellIndex;
                if (curr.cellIndex === index) {
                    last.push(curr);
                }
                else {
                    prev.push([curr]);
                }
            }
            return prev;
        }, []).map(editsOnSameIndex => {
            const replaceEdits = [];
            const otherEdits = [];
            editsOnSameIndex.forEach(edit => {
                if (edit.edit.editType === 1 /* CellEditType.Replace */) {
                    replaceEdits.push(edit);
                }
                else {
                    otherEdits.push(edit);
                }
            });
            return [...otherEdits.reverse(), ...replaceEdits];
        });
        const flattenEdits = edits.flat();
        for (const { edit, cellIndex } of flattenEdits) {
            switch (edit.editType) {
                case 1 /* CellEditType.Replace */:
                    this._replaceCells(edit.index, edit.count, edit.cells, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 2 /* CellEditType.Output */: {
                    this._assertIndex(cellIndex);
                    const cell = this._cells[cellIndex];
                    if (edit.append) {
                        this._spliceNotebookCellOutputs(cell, { start: cell.outputs.length, deleteCount: 0, newOutputs: edit.outputs.map(op => new NotebookCellOutputTextModel(op)) }, true, computeUndoRedo);
                    }
                    else {
                        this._spliceNotebookCellOutputs2(cell, edit.outputs, computeUndoRedo);
                    }
                    break;
                }
                case 7 /* CellEditType.OutputItems */:
                    {
                        this._assertIndex(cellIndex);
                        const cell = this._cells[cellIndex];
                        if (edit.append) {
                            this._appendNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                        else {
                            this._replaceNotebookCellOutputItems(cell, edit.outputId, edit.items);
                        }
                    }
                    break;
                case 3 /* CellEditType.Metadata */:
                    this._assertIndex(edit.index);
                    this._changeCellMetadata(this._cells[edit.index], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 8 /* CellEditType.PartialMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellMetadataPartial(this._cells[cellIndex], edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 9 /* CellEditType.PartialInternalMetadata */:
                    this._assertIndex(cellIndex);
                    this._changeCellInternalMetadataPartial(this._cells[cellIndex], edit.internalMetadata);
                    break;
                case 4 /* CellEditType.CellLanguage */:
                    this._assertIndex(edit.index);
                    this._changeCellLanguage(this._cells[edit.index], edit.language, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 5 /* CellEditType.DocumentMetadata */:
                    this._updateNotebookCellMetadata(edit.metadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
                    break;
                case 6 /* CellEditType.Move */:
                    this._moveCellToIdx(edit.index, edit.length, edit.newIdx, synchronous, computeUndoRedo, beginSelectionState, undefined, undoRedoGroup);
                    break;
            }
        }
    }
    _mergeCellEdits(rawEdits) {
        const mergedEdits = [];
        rawEdits.forEach(edit => {
            if (mergedEdits.length) {
                const last = mergedEdits[mergedEdits.length - 1];
                if (last.edit.editType === 2 /* CellEditType.Output */
                    && last.edit.append
                    && edit.edit.editType === 2 /* CellEditType.Output */
                    && edit.edit.append
                    && last.cellIndex === edit.cellIndex) {
                    last.edit.outputs = [...last.edit.outputs, ...edit.edit.outputs];
                }
                else if (last.edit.editType === 2 /* CellEditType.Output */
                    && !last.edit.append // last cell is not append
                    && last.edit.outputs.length === 0 // last cell is clear outputs
                    && edit.edit.editType === 2 /* CellEditType.Output */
                    && edit.edit.append
                    && last.cellIndex === edit.cellIndex) {
                    last.edit.append = false;
                    last.edit.outputs = edit.edit.outputs;
                }
                else {
                    mergedEdits.push(edit);
                }
            }
            else {
                mergedEdits.push(edit);
            }
        });
        return mergedEdits;
    }
    _replaceCells(index, count, cellDtos, synchronous, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (count === 0 && cellDtos.length === 0) {
            return;
        }
        const oldViewCells = this._cells.slice(0);
        const oldSet = new Set();
        oldViewCells.forEach(cell => {
            oldSet.add(cell.handle);
        });
        // prepare remove
        for (let i = index; i < Math.min(index + count, this._cells.length); i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        // prepare add
        const cells = cellDtos.map(cellDto => {
            const cellHandle = this._cellhandlePool++;
            const cellUri = CellUri.generate(this.uri, cellHandle);
            if (!cellDto.outputs) {
                cellDto.outputs = [];
            }
            const cell = new NotebookCellTextModel(cellUri, cellHandle, cellDto, this.transientOptions, this._languageService, this._modelService.getCreationOptions(cellDto.language, cellUri, false).defaultEOL, this._defaultCollapseConfig, this._languageDetectionService, this._notebookLoggingService);
            const textModel = this._modelService.getModel(cellUri);
            if (textModel && textModel instanceof TextModel) {
                cell.textModel = textModel;
                cell.language = cellDto.language;
                cell.textModel.setValue(cellDto.source);
                cell.resetTextBuffer(cell.textModel.getTextBuffer());
            }
            const dirtyStateListener = cell.onDidChangeContent((e) => {
                this._bindCellContentHandler(cell, e);
            });
            this.newCellsFromLastEdit.add(cell.handle);
            this._cellListeners.set(cell.handle, dirtyStateListener);
            this._register(cell);
            return cell;
        });
        // compute change
        const cellsCopy = this._cells.slice(0);
        cellsCopy.splice(index, count, ...cells);
        const diffs = diff(this._cells, cellsCopy, cell => {
            return oldSet.has(cell.handle);
        }).map(diff => {
            return [diff.start, diff.deleteCount, diff.toInsert];
        });
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes: diffs } });
        // make change
        this._cells = cellsCopy;
        const undoDiff = diffs.map(diff => {
            const deletedCells = oldViewCells.slice(diff[0], diff[0] + diff[1]);
            return [diff[0], deletedCells, diff[2]];
        });
        if (computeUndoRedo) {
            this._operationManager.pushEditOperation(new SpliceCellsEdit(this.uri, undoDiff, {
                insertCell: (index, cell, endSelections) => { this._insertNewCell(index, [cell], true, endSelections); },
                deleteCell: (index, endSelections) => { this._removeCell(index, 1, true, endSelections); },
                replaceCell: (index, count, cells, endSelections) => { this._replaceNewCells(index, count, cells, true, endSelections); },
            }, undefined, undefined), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        // should be deferred
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes: diffs, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: undefined
        });
    }
    _increaseVersionId(transient) {
        this._versionId = this._versionId + 1;
        if (!transient) {
            this._notebookSpecificAlternativeId = this._versionId;
        }
        this._alternativeVersionId = this._generateAlternativeId();
    }
    _overwriteAlternativeVersionId(newAlternativeVersionId) {
        this._alternativeVersionId = newAlternativeVersionId;
        this._notebookSpecificAlternativeId = Number(newAlternativeVersionId.substring(0, newAlternativeVersionId.indexOf('_')));
    }
    _updateNotebookCellMetadata(metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const oldMetadata = this.metadata;
        const triggerDirtyChange = this._isDocumentMetadataChanged(this.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const that = this;
                this._operationManager.pushEditOperation(new class {
                    constructor() {
                        this.type = 0 /* UndoRedoElementType.Resource */;
                        this.label = 'Update Cell Metadata';
                        this.code = 'undoredo.textBufferEdit';
                    }
                    get resource() {
                        return that.uri;
                    }
                    undo() {
                        that._updateNotebookCellMetadata(oldMetadata, false, beginSelectionState, undoRedoGroup);
                    }
                    redo() {
                        that._updateNotebookCellMetadata(metadata, false, beginSelectionState, undoRedoGroup);
                    }
                }(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        this.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeDocumentMetadata, metadata: this.metadata, transient: !triggerDirtyChange }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _insertNewCell(index, cells, synchronous, endSelections) {
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, 0, cells]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
        return;
    }
    _removeCell(index, count, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        const changes = [[index, count, []]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, count);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
    }
    _replaceNewCells(index, count, cells, synchronous, endSelections) {
        for (let i = index; i < index + count; i++) {
            const cell = this._cells[i];
            this._cellListeners.get(cell.handle)?.dispose();
            this._cellListeners.delete(cell.handle);
        }
        for (let i = 0; i < cells.length; i++) {
            const dirtyStateListener = cells[i].onDidChangeContent((e) => {
                this._bindCellContentHandler(cells[i], e);
            });
            this._cellListeners.set(cells[i].handle, dirtyStateListener);
        }
        const changes = [[index, count, cells]];
        this._onWillAddRemoveCells.fire({ rawEvent: { kind: NotebookCellsChangeType.ModelChange, changes } });
        this._cells.splice(index, count, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ModelChange, changes, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
    }
    _isDocumentMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if (key === 'custom') {
                if (!this._customMetadataEqual(a[key], b[key])
                    &&
                        !(this.transientOptions.transientDocumentMetadata[key])) {
                    return true;
                }
            }
            else if ((a[key] !== b[key])
                &&
                    !(this.transientOptions.transientDocumentMetadata[key])) {
                return true;
            }
        }
        return false;
    }
    _isCellMetadataChanged(a, b) {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const key of keys) {
            if ((a[key] !== b[key])
                &&
                    !(this.transientOptions.transientCellMetadata[key])) {
                return true;
            }
        }
        return false;
    }
    _customMetadataEqual(a, b) {
        if (!a && !b) {
            // both of them are nullish or undefined
            return true;
        }
        if (!a || !b) {
            return false;
        }
        const aProps = Object.getOwnPropertyNames(a);
        const bProps = Object.getOwnPropertyNames(b);
        if (aProps.length !== bProps.length) {
            return false;
        }
        for (let i = 0; i < aProps.length; i++) {
            const propName = aProps[i];
            if (a[propName] !== b[propName]) {
                return false;
            }
        }
        return true;
    }
    _changeCellMetadataPartial(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const newMetadata = {
            ...cell.metadata
        };
        let k;
        for (k in metadata) {
            const value = metadata[k] ?? undefined;
            newMetadata[k] = value;
        }
        return this._changeCellMetadata(cell, newMetadata, computeUndoRedo, beginSelectionState, undoRedoGroup);
    }
    _changeCellMetadata(cell, metadata, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        const triggerDirtyChange = this._isCellMetadataChanged(cell.metadata, metadata);
        if (triggerDirtyChange) {
            if (computeUndoRedo) {
                const index = this._cells.indexOf(cell);
                this._operationManager.pushEditOperation(new CellMetadataEdit(this.uri, index, Object.freeze(cell.metadata), Object.freeze(metadata), {
                    updateCellMetadata: (index, newMetadata) => {
                        const cell = this._cells[index];
                        if (!cell) {
                            return;
                        }
                        this._changeCellMetadata(cell, newMetadata, false, beginSelectionState, undoRedoGroup);
                    }
                }), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
            }
        }
        // should be deferred
        cell.metadata = metadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellMetadata, index: this._cells.indexOf(cell), metadata: cell.metadata, transient: !triggerDirtyChange }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _changeCellInternalMetadataPartial(cell, internalMetadata) {
        const newInternalMetadata = {
            ...cell.internalMetadata
        };
        let k;
        for (k in internalMetadata) {
            const value = internalMetadata[k] ?? undefined;
            newInternalMetadata[k] = value;
        }
        cell.internalMetadata = newInternalMetadata;
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellInternalMetadata, index: this._cells.indexOf(cell), internalMetadata: cell.internalMetadata, transient: true }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _changeCellLanguage(cell, languageId, computeUndoRedo, beginSelectionState, undoRedoGroup) {
        if (cell.language === languageId) {
            return;
        }
        const oldLanguage = cell.language;
        cell.language = languageId;
        if (computeUndoRedo) {
            const that = this;
            this._operationManager.pushEditOperation(new class {
                constructor() {
                    this.type = 0 /* UndoRedoElementType.Resource */;
                    this.label = 'Update Cell Language';
                    this.code = 'undoredo.textBufferEdit';
                }
                get resource() {
                    return that.uri;
                }
                undo() {
                    that._changeCellLanguage(cell, oldLanguage, false, beginSelectionState, undoRedoGroup);
                }
                redo() {
                    that._changeCellLanguage(cell, languageId, false, beginSelectionState, undoRedoGroup);
                }
            }(), beginSelectionState, undefined, this._alternativeVersionId, undoRedoGroup);
        }
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.ChangeCellLanguage, index: this._cells.indexOf(cell), language: languageId, transient: false }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _spliceNotebookCellOutputs2(cell, outputs, computeUndoRedo) {
        if (outputs.length === 0 && cell.outputs.length === 0) {
            return;
        }
        if (outputs.length <= 1) {
            this._spliceNotebookCellOutputs(cell, { start: 0, deleteCount: cell.outputs.length, newOutputs: outputs.map(op => new NotebookCellOutputTextModel(op)) }, false, computeUndoRedo);
            return;
        }
        const diff = new LcsDiff(new OutputSequence(cell.outputs), new OutputSequence(outputs));
        const diffResult = diff.ComputeDiff(false);
        const splices = diffResult.changes.map(change => ({
            start: change.originalStart,
            deleteCount: change.originalLength,
            // create cell output text model only when it's inserted into the notebook document
            newOutputs: outputs.slice(change.modifiedStart, change.modifiedStart + change.modifiedLength).map(op => new NotebookCellOutputTextModel(op))
        }));
        splices.reverse().forEach(splice => {
            this._spliceNotebookCellOutputs(cell, splice, false, computeUndoRedo);
        });
    }
    _spliceNotebookCellOutputs(cell, splice, append, computeUndoRedo) {
        cell.spliceNotebookCellOutputs(splice);
        this._pauseableEmitter.fire({
            rawEvents: [{
                    kind: NotebookCellsChangeType.Output,
                    index: this._cells.indexOf(cell),
                    outputs: cell.outputs.map(output => output.asDto()) ?? [],
                    append,
                    transient: this.transientOptions.transientOutputs,
                }],
            versionId: this.versionId,
            synchronous: true,
            endSelectionState: undefined
        });
    }
    _appendNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, true, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [{
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: true,
                        transient: this.transientOptions.transientOutputs
                    }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _replaceNotebookCellOutputItems(cell, outputId, items) {
        if (cell.changeOutputItems(outputId, false, items)) {
            this._pauseableEmitter.fire({
                rawEvents: [{
                        kind: NotebookCellsChangeType.OutputItem,
                        index: this._cells.indexOf(cell),
                        outputId: outputId,
                        outputItems: items,
                        append: false,
                        transient: this.transientOptions.transientOutputs
                    }],
                versionId: this.versionId,
                synchronous: true,
                endSelectionState: undefined
            });
        }
    }
    _moveCellToIdx(index, length, newIdx, synchronous, pushedToUndoStack, beforeSelections, endSelections, undoRedoGroup) {
        if (pushedToUndoStack) {
            this._operationManager.pushEditOperation(new MoveCellEdit(this.uri, index, length, newIdx, {
                moveCell: (fromIndex, length, toIndex, beforeSelections, endSelections) => {
                    this._moveCellToIdx(fromIndex, length, toIndex, true, false, beforeSelections, endSelections, undoRedoGroup);
                },
            }, beforeSelections, endSelections), beforeSelections, endSelections, this._alternativeVersionId, undoRedoGroup);
        }
        this._assertIndex(index);
        this._assertIndex(newIdx);
        const cells = this._cells.splice(index, length);
        this._cells.splice(newIdx, 0, ...cells);
        this._pauseableEmitter.fire({
            rawEvents: [{ kind: NotebookCellsChangeType.Move, index, length, newIdx, cells, transient: false }],
            versionId: this.versionId,
            synchronous: synchronous,
            endSelectionState: endSelections
        });
        return true;
    }
    _assertIndex(index) {
        if (this._indexIsInvalid(index)) {
            throw new Error(`model index out of range ${index}`);
        }
    }
    _indexIsInvalid(index) {
        return index < 0 || index >= this._cells.length;
    }
    //#region Find
    findNextMatch(searchString, searchStart, isRegex, matchCase, wordSeparators, searchEnd) {
        // check if search cell index is valid
        this._assertIndex(searchStart.cellIndex);
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return null;
        }
        let cellIndex = searchStart.cellIndex;
        let searchStartPosition = searchStart.position;
        let searchEndCell = this._cells.length;
        while (cellIndex < searchEndCell) {
            const cell = this._cells[cellIndex];
            // if we have wrapped back to the point of the initial search cell, we search from beginning to the provided searchEnd position
            const wrapFlag = searchEnd && cellIndex === searchEnd.cellIndex && searchStartPosition.isBefore(searchEnd.position);
            const searchRange = new Range(searchStartPosition.lineNumber, searchStartPosition.column, (wrapFlag) ? searchEnd.position.lineNumber : cell.textBuffer.getLineCount(), (wrapFlag) ? searchEnd.position.column : cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const result = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1);
            if (result.length > 0) {
                return { cell, match: result[0] };
            }
            else if (wrapFlag) { // this means there are no more valid matches in the notebook
                break;
            }
            // Move to the next cell
            cellIndex++;
            // wrap if a searchEnd is provided and we are past the end of the notebook
            if (searchEnd && cellIndex >= this._cells.length) {
                cellIndex = 0;
                searchEndCell = searchEnd.cellIndex + 1;
            }
            searchStartPosition = new Position(1, 1); // Reset position to start of the next cell
        }
        return null;
    }
    findMatches(searchString, isRegex, matchCase, wordSeparators) {
        const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
        const searchData = searchParams.parseSearchRequest();
        if (!searchData) {
            return [];
        }
        const results = [];
        for (const cell of this._cells) {
            const searchRange = new Range(1, 1, cell.textBuffer.getLineCount(), cell.textBuffer.getLineMaxColumn(cell.textBuffer.getLineCount()));
            const matches = cell.textBuffer.findMatchesLineByLine(searchRange, searchData, false, 1000);
            if (matches.length > 0) {
                results.push({ cell, matches: matches });
            }
        }
        return results;
    }
};
NotebookTextModel = NotebookTextModel_1 = __decorate([
    __param(5, IUndoRedoService),
    __param(6, IModelService),
    __param(7, ILanguageService),
    __param(8, ILanguageDetectionService),
    __param(9, INotebookExecutionStateService),
    __param(10, INotebookLoggingService)
], NotebookTextModel);
export { NotebookTextModel };
class OutputSequence {
    constructor(outputs) {
        this.outputs = outputs;
    }
    getElements() {
        return this.outputs.map(output => {
            return hash(output.outputs.map(output => ({
                mime: output.mime,
                data: output.data
            })));
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tUZXh0TW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbW9kZWwvbm90ZWJvb2tUZXh0TW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBYSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFTLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDdkYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV4RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRS9FLE9BQU8sRUFBOEMs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