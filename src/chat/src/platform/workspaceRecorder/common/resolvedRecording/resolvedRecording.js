"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkspaceDocumentState = exports.ResolvedRecording = exports.RecordingData = void 0;
const assert_1 = require("../../../../util/vs/base/common/assert");
const documentHistory_1 = require("./documentHistory");
class RecordingData {
    static create(logEntries) {
        return new RecordingData(logEntries);
    }
    constructor(logEntries) {
        this.logEntries = logEntries;
        this.useSyntheticSelectionEvents = false;
    }
}
exports.RecordingData = RecordingData;
class ResolvedRecording {
    static resolve(data) {
        const operations = [];
        const documents = new Map();
        const contentsByHash = new Map();
        const fetchRequests = new Map();
        let uuid = undefined;
        let repoRootUri = undefined;
        let idx = 0;
        for (let logEntryIdx = 0; logEntryIdx < data.logEntries.length; logEntryIdx++) {
            const e = data.logEntries[logEntryIdx];
            if (e.kind === 'header') {
                uuid = e.uuid;
                repoRootUri = e.repoRootUri;
                continue;
            }
            if (e.kind === 'meta') {
                const data = e.data;
                if (typeof data.repoRootUri === 'string') {
                    repoRootUri = data.repoRootUri;
                }
                continue;
            }
            if (e.kind === 'applicationStart') {
                continue;
            }
            if (e.kind === 'bookmark') {
                continue;
            }
            if (e.kind === 'documentEncountered') {
                const doc = new documentHistory_1.DocumentRecording(e.id, e.relativePath, contentsByHash, repoRootUri ? joinUriWithRelativePath(repoRootUri, e.relativePath) : undefined);
                documents.set(e.id, doc);
                continue;
            }
            if (e.kind === 'event') {
                const data = e.data;
                switch (data.sourceId) {
                    case "InlineCompletions.fetch": {
                        (0, assert_1.assert)(data.kind === "end");
                        const req = fetchRequests.get(data.requestId);
                        if (req) {
                            req.result = data;
                        }
                        break;
                    }
                    default:
                        break;
                }
                continue;
            }
            const doc = documents.get(e.id);
            if (!doc) {
                throw new Error(`Document ${e.id} not encountered before`);
            }
            if (e.kind === 'storeContent') {
                contentsByHash.set(e.contentId, doc.getLastState().value);
                continue;
            }
            const op = doc.addOperation(idx, e, logEntryIdx, data.useSyntheticSelectionEvents, fetchRequests);
            operations.push(...op);
            idx += op.length;
        }
        return new ResolvedRecording(operations, documents, uuid, repoRootUri);
    }
    constructor(_operations, _documents, uuid, repoRootUri) {
        this._operations = _operations;
        this._documents = _documents;
        this.uuid = uuid;
        this.repoRootUri = repoRootUri;
    }
    findFirstOperationAfter(op, predicate1, predicate2) {
        for (let i = op.operationIdx + 1; i < this._operations.length; i++) {
            const op = this._operations[i];
            if (predicate1(op) && predicate2(op)) {
                return op;
            }
        }
        return undefined;
    }
    getChangeOperationAtOrBefore(opIdx) {
        for (let i = opIdx; i >= 0; i--) {
            const op = this._operations[i];
            if (op.kind === 3 /* OperationKind.Changed */) {
                return op;
            }
        }
        return undefined;
    }
    get operations() { return this._operations; }
    get documents() {
        return [...this._documents.values()].map(d => new WorkspaceDocument(d.documentId, d));
    }
    getStateAfter(operationIdx) {
        const operation = this._operations[operationIdx];
        const document = this._documents.get(operation.documentId);
        const state = document.getState(operation.documentStateIdAfter);
        return new WorkspaceDocumentState(operation.operationIdx, operation, operation.documentId, operation.documentStateIdAfter, state.value, state.selection, operation.logEventIdx);
    }
    getDocument(documentId) {
        return new WorkspaceDocument(documentId, this._documents.get(documentId));
    }
    getDocumentByRelativePath(documentRelativePath) {
        for (const doc of this.documents) {
            if (doc.documentRelativePath === documentRelativePath) {
                return doc;
            }
        }
        return undefined;
    }
    getDocumentByUri(uri) {
        for (const doc of this.documents) {
            if (doc.documentUri === uri) {
                return doc;
            }
        }
        return undefined;
    }
}
exports.ResolvedRecording = ResolvedRecording;
function joinUriWithRelativePath(baseUri, relativePath) {
    if (baseUri.endsWith('/')) {
        baseUri = baseUri.substring(0, baseUri.length - 1);
    }
    return baseUri + '/' + relativePath.replaceAll('\\', '/');
}
class WorkspaceDocument {
    constructor(documentId, documentHistory) {
        this.documentId = documentId;
        this.documentHistory = documentHistory;
        this.documentRelativePath = this.documentHistory.documentRelativePath;
        this.documentUri = this.documentHistory.documentUri;
    }
    getInitialState() { return this.documentHistory.getState(1); }
    getLastState() { return this.documentHistory.getLastState(); }
    getState(documentStateId) {
        return this.documentHistory.getState(documentStateId);
    }
    getEdit(initialState, lastState) {
        return this.documentHistory.getEdit(initialState, lastState);
    }
    getStateIdBeforeOrAtOpIdx(opIdx) {
        return this.documentHistory.getStateIdAfterOp(opIdx);
    }
}
class WorkspaceDocumentState {
    constructor(operationIdx, operation, activeDocumentId, documentStateId, documentValue, documentSelection, logEventIdx) {
        this.operationIdx = operationIdx;
        this.operation = operation;
        this.activeDocumentId = activeDocumentId;
        this.documentStateId = documentStateId;
        this.documentValue = documentValue;
        this.documentSelection = documentSelection;
        this.logEventIdx = logEventIdx;
    }
}
exports.WorkspaceDocumentState = WorkspaceDocumentState;
//# sourceMappingURL=resolvedRecording.js.map