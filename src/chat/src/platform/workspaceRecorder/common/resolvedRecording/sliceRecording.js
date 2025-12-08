"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.sliceRecording = sliceRecording;
const arraysFind_1 = require("../../../../util/vs/base/common/arraysFind");
const cache_1 = require("../../../../util/vs/base/common/cache");
const editUtils_1 = require("../../../inlineEdits/common/dataTypes/editUtils");
function sliceRecording(workspaceRecording, step, historyMaxTimeMs, options = { includeSelection: false, mergeEdits: true, includeReasons: false }) {
    const currentOp = workspaceRecording.operations[step];
    const startTime = currentOp.time - historyMaxTimeMs;
    const firstOp = (0, arraysFind_1.findFirstMonotonous)(workspaceRecording.operations, op => op.time >= startTime);
    let nextDocId = 0;
    const events = [];
    events.push({
        kind: 'meta', data: {
            kind: 'log-origin',
            uuid: workspaceRecording.uuid,
            repoRootUri: workspaceRecording.repoRootUri,
            opStart: firstOp.operationIdx,
            opEndEx: currentOp.operationIdx + 1
        }
    });
    const getDocumentRecorder = new cache_1.CachedFunction((documentId) => {
        const doc = workspaceRecording.getDocument(documentId);
        const id = nextDocId++;
        let initialized = false;
        const init = () => {
            events.push({ kind: 'documentEncountered', id, time: currentOp.time, relativePath: doc.documentRelativePath });
            initialized = true;
        };
        function editExtends(edit, previousEdit) {
            const newRanges = previousEdit.getNewRanges();
            return edit.replacements.every(e => intersectsOrTouches(e.replaceRange, newRanges));
        }
        function intersectsOrTouches(range, sortedRanges) {
            const firstCandidate = (0, arraysFind_1.findFirstMonotonous)(sortedRanges, r => r.endExclusive >= range.start);
            return firstCandidate ? firstCandidate.intersectsOrTouches(range) : false;
        }
        let lastEdit = undefined;
        return {
            id: id,
            addSetContentEvent: (documentStateId) => {
                if (!initialized) {
                    return;
                } // Wait for first change event
                const content = doc.getState(documentStateId).value;
                events.push({ kind: 'setContent', id: id, time: currentOp.time, content, v: documentStateId });
                lastEdit = undefined;
            },
            addEditEvent: (timeMs, edit, documentStateBeforeId, documentStateAfterId) => {
                if (!initialized) {
                    init();
                    const content = doc.getState(documentStateBeforeId).value;
                    events.push({ kind: 'setContent', id: id, time: currentOp.time, content, v: documentStateBeforeId });
                }
                if (options.mergeEdits && lastEdit && events.at(-1).kind === "changed" && editExtends(edit, lastEdit.edit) && timeMs - lastEdit.timeMs < 1000) {
                    events.pop();
                    edit = lastEdit.edit.compose(edit);
                }
                events.push({ kind: "changed", id: id, time: timeMs, edit: (0, editUtils_1.serializeStringEdit)(edit), v: documentStateAfterId });
                lastEdit = { edit, timeMs };
            },
            addSelectionEvent: (timeMs, selection, documentStateBeforeId) => {
                if (!initialized) {
                    init();
                    const content = doc.getState(documentStateBeforeId).value;
                    events.push({ kind: 'setContent', id: id, time: currentOp.time, content, v: documentStateBeforeId });
                }
                events.push({ kind: "selectionChanged", id: id, time: timeMs, selection: selection.map(s => [s.start, s.endExclusive]) });
            }
        };
    });
    for (let i = firstOp.operationIdx; i <= step; i++) {
        const op = workspaceRecording.operations[i];
        const d = getDocumentRecorder.get(op.documentId);
        switch (op.kind) {
            case 6 /* OperationKind.Restore */:
            case 0 /* OperationKind.SetContent */: {
                d.addSetContentEvent(op.documentStateIdAfter);
                break;
            }
            case 3 /* OperationKind.Changed */: {
                d.addEditEvent(op.time, op.edit, op.documentStateIdBefore, op.documentStateIdAfter);
                if (op.reason && options.includeReasons) {
                    events.push({ kind: 'documentEvent', time: op.time, id: d.id, data: { sourceId: 'TextModel.setChangeReason', source: op.reason, v: op.documentStateIdAfter } });
                }
                break;
            }
            case 5 /* OperationKind.SelectionChanged */: {
                if (options.includeSelection) {
                    d.addSelectionEvent(op.time, op.selection, op.documentStateIdBefore);
                }
                break;
            }
            case 4 /* OperationKind.FocusChanged */:
            case 1 /* OperationKind.Opened */:
            case 2 /* OperationKind.Closed */:
                break;
        }
    }
    return events;
}
//# sourceMappingURL=sliceRecording.js.map