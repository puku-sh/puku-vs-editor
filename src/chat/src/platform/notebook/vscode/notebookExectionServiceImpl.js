"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotebookExecutionServiceImpl = exports.NotebookCellExecutionState = void 0;
const vscode_1 = require("vscode");
const event_1 = require("../../../util/vs/base/common/event");
var NotebookCellExecutionState;
(function (NotebookCellExecutionState) {
    /**
     * The cell is idle.
     */
    NotebookCellExecutionState[NotebookCellExecutionState["Idle"] = 1] = "Idle";
    /**
     * The cell is currently executing.
     */
    NotebookCellExecutionState[NotebookCellExecutionState["Executing"] = 2] = "Executing";
})(NotebookCellExecutionState || (exports.NotebookCellExecutionState = NotebookCellExecutionState = {}));
class NotebookExecutionServiceImpl {
    constructor() {
        this._onDidChangeNotebookCellExecutionStateEmitter = new event_1.Emitter();
        this.onDidChangeNotebookCellExecutionState = this._onDidChangeNotebookCellExecutionStateEmitter.event;
        this._disposables = [];
        // track cell in execution
        this._cellExecution = new WeakMap();
        this._disposables.push(vscode_1.workspace.onDidChangeNotebookDocument(e => {
            for (const cellChange of e.cellChanges) {
                if (cellChange.executionSummary) {
                    const executionSummary = cellChange.executionSummary;
                    if (executionSummary.success === undefined) {
                        // in execution
                        if (!this._cellExecution.has(cellChange.cell)) {
                            this._cellExecution.set(cellChange.cell, true);
                            this._onDidChangeNotebookCellExecutionStateEmitter.fire({ cell: cellChange.cell, state: NotebookCellExecutionState.Executing });
                        }
                    }
                    else {
                        // finished execution
                        this._cellExecution.delete(cellChange.cell);
                        this._onDidChangeNotebookCellExecutionStateEmitter.fire({ cell: cellChange.cell, state: NotebookCellExecutionState.Idle });
                    }
                }
            }
        }));
    }
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
exports.NotebookExecutionServiceImpl = NotebookExecutionServiceImpl;
//# sourceMappingURL=notebookExectionServiceImpl.js.map