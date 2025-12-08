"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentState = exports.DocumentRecording = void 0;
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const types_1 = require("../../../../util/vs/base/common/types");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const editUtils_1 = require("../../../inlineEdits/common/dataTypes/editUtils");
const operation_1 = require("./operation");
class DocumentRecording {
    constructor(documentId, documentRelativePath, _contentsByHash, documentUri) {
        this.documentId = documentId;
        this.documentRelativePath = documentRelativePath;
        this._contentsByHash = _contentsByHash;
        this.documentUri = documentUri;
        this._docOperationsByStateIdBefore = [];
        this._currentState = DocumentState.empty;
        this._documentVersionAfterToOperation = new Map();
        this.statesByStateIdDiv100 = [];
        (0, types_1.assertReturnsDefined)(documentRelativePath);
    }
    getLastState() {
        return this._currentState;
    }
    addOperation(opIdx, e, logEntryIdx, createSyntheticSelectionEvents, fetchRequests) {
        const prevStateId = this._currentState.stateId;
        switch (e.kind) {
            case 'setContent': {
                const docOp = new SetValueEdit(opIdx, e.content);
                this._docOperationsByStateIdBefore.push(docOp);
                this._currentState = docOp.applyTo(this._currentState);
                const op = new operation_1.DocumentSetContentOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx, e.content);
                if (e.v !== undefined) {
                    this._documentVersionAfterToOperation.set(e.v, op);
                }
                return [op];
            }
            case 'opened':
                return [new operation_1.DocumentOpenedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx)];
            case 'closed':
                return [new operation_1.DocumentClosedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx)];
            case 'changed': {
                const edit = (0, editUtils_1.deserializeStringEdit)(e.edit);
                const ops = [];
                if (createSyntheticSelectionEvents) {
                    const selection = edit.replacements.map(e => e.replaceRange);
                    const op = new SetSelectionEdit(opIdx, selection);
                    this._docOperationsByStateIdBefore.push(op);
                    this._currentState = op.applyTo(this._currentState);
                    ops.push(new operation_1.DocumentSelectionChangedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx, selection));
                    opIdx++;
                }
                const op = new DocumentEdit(opIdx, edit);
                this._docOperationsByStateIdBefore.push(op);
                this._currentState = op.applyTo(this._currentState);
                if (createSyntheticSelectionEvents) {
                    const selection = edit.getNewRanges();
                    const op = new SetSelectionEdit(opIdx, selection);
                    this._docOperationsByStateIdBefore.push(op);
                    this._currentState = op.applyTo(this._currentState);
                }
                const documentChangedOperation = new operation_1.DocumentChangedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx, edit);
                if (e.v !== undefined) {
                    this._documentVersionAfterToOperation.set(e.v, documentChangedOperation);
                }
                ops.push(documentChangedOperation);
                return ops;
            }
            case 'documentEvent': {
                const data = e.data;
                const referencedOp = this._documentVersionAfterToOperation.get(data.v);
                switch (data.sourceId) {
                    case "InlineCompletions.fetch":
                        if (referencedOp) {
                            const req = new operation_1.InlineCompletionFetchRequest(data.requestId);
                            referencedOp.inlineCompletionFetchRequests.push(req);
                            fetchRequests.set(req.requestId, req);
                        }
                        break;
                    case "TextModel.setChangeReason":
                        if (referencedOp) {
                            referencedOp.reason = data.source;
                        }
                        break;
                    default:
                        break;
                }
                return [];
            }
            case 'focused':
                return [new operation_1.DocumentFocusChangedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx)];
            case 'selectionChanged': {
                const selection = e.selection.map(s => new offsetRange_1.OffsetRange(s[0], s[1]));
                const op = new SetSelectionEdit(opIdx, selection);
                this._docOperationsByStateIdBefore.push(op);
                this._currentState = op.applyTo(this._currentState);
                return [new operation_1.DocumentSelectionChangedOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx, selection)];
            }
            case 'restoreContent': {
                const content = this._contentsByHash.get(e.contentId);
                if (content === undefined) {
                    throw new Error(`No content with hash ${e.contentId} found`);
                }
                const op = new SetValueEdit(opIdx, content);
                this._docOperationsByStateIdBefore.push(op);
                this._currentState = op.applyTo(this._currentState);
                return [new operation_1.DocumentRestoreContentOperation(opIdx, e.time, this.documentId, prevStateId, this._currentState.stateId, logEntryIdx)];
            }
            default:
                throw new Error(`Unknown entry type: ${e}`);
        }
    }
    _getLastStateEqualOrBefore(stateId) {
        if (this._previousState && this._previousState.stateId <= stateId) {
            return this._previousState;
        }
        const idx = Math.floor(stateId / 100);
        if (idx < this.statesByStateIdDiv100.length) {
            const s = this.statesByStateIdDiv100[idx];
            return s;
        }
        if (this.statesByStateIdDiv100.length === 0) {
            return DocumentState.empty;
        }
        return this.statesByStateIdDiv100[this.statesByStateIdDiv100.length - 1];
    }
    getState(documentStateId) {
        let state = this._getLastStateEqualOrBefore(documentStateId);
        while (state.stateId < documentStateId) {
            if ((state.stateId % 100) === 0) {
                this.statesByStateIdDiv100[Math.floor(state.stateId / 100)] = state;
            }
            state = this._docOperationsByStateIdBefore[state.stateId].applyTo(state);
        }
        this._previousState = state;
        return state;
    }
    getStateIdAfterOp(opIdx) {
        const idx = (0, arraysFind_1.findLastIdxMonotonous)(this._docOperationsByStateIdBefore, op => op.opIdx <= opIdx);
        if (idx === -1) {
            return this._docOperationsByStateIdBefore.length;
        }
        return idx + 1;
    }
    getEdit(initialState, lastState) {
        let edit = stringEdit_1.StringEdit.empty;
        for (let i = initialState; i < lastState; i++) {
            const op = this._docOperationsByStateIdBefore[i];
            if (op instanceof DocumentEdit) {
                edit = edit.compose(op.edit);
            }
            else if (op instanceof SetValueEdit) {
                throw new Error('not implemented');
            }
        }
        return edit;
    }
}
exports.DocumentRecording = DocumentRecording;
class DocumentState {
    static { this.empty = new DocumentState('', [], 0); }
    constructor(value, selection, stateId) {
        this.value = value;
        this.selection = selection;
        this.stateId = stateId;
    }
}
exports.DocumentState = DocumentState;
class DocumentChange {
    constructor(opIdx) {
        this.opIdx = opIdx;
    }
}
class DocumentEdit extends DocumentChange {
    constructor(opIdx, edit) {
        super(opIdx);
        this.edit = edit;
    }
    applyTo(state) {
        return new DocumentState(this.edit.apply(state.value), state.selection, state.stateId + 1);
    }
}
class SetValueEdit extends DocumentChange {
    constructor(opIdx, value) {
        super(opIdx);
        this.value = value;
    }
    applyTo(state) {
        return new DocumentState(this.value, state.selection, state.stateId + 1);
    }
}
class SetSelectionEdit extends DocumentChange {
    constructor(opIdx, selection) {
        super(opIdx);
        this.selection = selection;
    }
    applyTo(state) {
        return new DocumentState(state.value, this.selection, state.stateId + 1);
    }
}
//# sourceMappingURL=documentHistory.js.map