"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkingSetEntryState = exports.InternalToolReference = void 0;
exports.isTextDocumentWorkingSetEntry = isTextDocumentWorkingSetEntry;
exports.isNotebookWorkingSetEntry = isNotebookWorkingSetEntry;
const notebookDocumentSnapshot_1 = require("../../../platform/editing/common/notebookDocumentSnapshot");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const uuid_1 = require("../../../util/vs/base/common/uuid");
const toolNames_1 = require("../../tools/common/toolNames");
var InternalToolReference;
(function (InternalToolReference) {
    function from(base) {
        return {
            ...base,
            id: (0, uuid_1.generateUuid)(),
            name: (0, toolNames_1.getToolName)(base.name),
        };
    }
    InternalToolReference.from = from;
})(InternalToolReference || (exports.InternalToolReference = InternalToolReference = {}));
var WorkingSetEntryState;
(function (WorkingSetEntryState) {
    WorkingSetEntryState[WorkingSetEntryState["Initial"] = 0] = "Initial";
    WorkingSetEntryState[WorkingSetEntryState["Undecided"] = 1] = "Undecided";
    WorkingSetEntryState[WorkingSetEntryState["Accepted"] = 2] = "Accepted";
    WorkingSetEntryState[WorkingSetEntryState["Rejected"] = 3] = "Rejected";
})(WorkingSetEntryState || (exports.WorkingSetEntryState = WorkingSetEntryState = {}));
function isTextDocumentWorkingSetEntry(entry) {
    return (entry.document instanceof textDocumentSnapshot_1.TextDocumentSnapshot);
}
function isNotebookWorkingSetEntry(entry) {
    return (entry.document instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot);
}
//# sourceMappingURL=intents.js.map