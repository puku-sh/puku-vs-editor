"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRestoreContentOperation = exports.DocumentSelectionChangedOperation = exports.DocumentFocusChangedOperation = exports.DocumentChangedOperation = exports.DocumentClosedOperation = exports.DocumentOpenedOperation = exports.DocumentSetContentOperation = exports.InlineCompletionFetchRequest = exports.BaseOperation = void 0;
class BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx) {
        this.operationIdx = operationIdx;
        this.time = time;
        this.documentId = documentId;
        this.documentStateIdBefore = documentStateIdBefore;
        this.documentStateIdAfter = documentStateIdAfter;
        this.logEventIdx = logEventIdx;
        this.reason = undefined;
        this.inlineCompletionFetchRequests = [];
    }
}
exports.BaseOperation = BaseOperation;
class InlineCompletionFetchRequest {
    constructor(requestId, result) {
        this.requestId = requestId;
        this.result = result;
    }
}
exports.InlineCompletionFetchRequest = InlineCompletionFetchRequest;
class DocumentSetContentOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx, 
    /* If undefined, sets a rollback-point */
    content) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.content = content;
        this.kind = 0 /* OperationKind.SetContent */;
    }
}
exports.DocumentSetContentOperation = DocumentSetContentOperation;
class DocumentOpenedOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.kind = 1 /* OperationKind.Opened */;
    }
}
exports.DocumentOpenedOperation = DocumentOpenedOperation;
class DocumentClosedOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.kind = 2 /* OperationKind.Closed */;
    }
}
exports.DocumentClosedOperation = DocumentClosedOperation;
class DocumentChangedOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx, edit) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.edit = edit;
        this.kind = 3 /* OperationKind.Changed */;
    }
}
exports.DocumentChangedOperation = DocumentChangedOperation;
class DocumentFocusChangedOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.kind = 4 /* OperationKind.FocusChanged */;
    }
}
exports.DocumentFocusChangedOperation = DocumentFocusChangedOperation;
class DocumentSelectionChangedOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx, selection) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.selection = selection;
        this.kind = 5 /* OperationKind.SelectionChanged */;
    }
}
exports.DocumentSelectionChangedOperation = DocumentSelectionChangedOperation;
class DocumentRestoreContentOperation extends BaseOperation {
    constructor(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx) {
        super(operationIdx, time, documentId, documentStateIdBefore, documentStateIdAfter, logEventIdx);
        this.kind = 6 /* OperationKind.Restore */;
    }
}
exports.DocumentRestoreContentOperation = DocumentRestoreContentOperation;
//# sourceMappingURL=operation.js.map