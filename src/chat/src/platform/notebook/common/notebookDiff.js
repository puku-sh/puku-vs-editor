"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDiff = computeDiff;
function computeDiff(originalModel, modifiedModel, cellChanges) {
    const cellDiffInfo = [];
    let originalCellIndex = 0;
    let modifiedCellIndex = 0;
    for (let i = 0; i < cellChanges.length; i++) {
        const change = cellChanges[i];
        // common cells
        for (let j = 0; j < change.original.startLineNumber - 1 - originalCellIndex; j++) {
            cellDiffInfo.push({
                originalCellIndex: originalCellIndex + j,
                modifiedCellIndex: modifiedCellIndex + j,
                type: 'unchanged'
            });
        }
        const modifiedLCS = computeModifiedLCS(originalModel, modifiedModel, change);
        cellDiffInfo.push(...modifiedLCS);
        originalCellIndex = change.original.startLineNumber - 1 + change.original.length;
        modifiedCellIndex = change.modified.startLineNumber - 1 + change.modified.length;
    }
    for (let i = originalCellIndex; i < originalModel.length; i++) {
        cellDiffInfo.push({
            originalCellIndex: i,
            modifiedCellIndex: i - originalCellIndex + modifiedCellIndex,
            type: 'unchanged'
        });
    }
    return cellDiffInfo;
}
function computeModifiedLCS(original, modified, change) {
    const result = [];
    // modified cells
    const modifiedLen = Math.min(change.original.length, change.modified.length);
    for (let j = 0; j < modifiedLen; j++) {
        const originalCell = original[change.original.startLineNumber - 1 + j];
        const modifiedCell = modified[change.modified.startLineNumber - 1 + j];
        if (originalCell !== modifiedCell) {
            result.push({
                originalCellIndex: change.original.startLineNumber - 1 + j,
                type: 'delete'
            });
            result.push({
                modifiedCellIndex: change.modified.startLineNumber - 1 + j,
                type: 'insert'
            });
        }
        else {
            result.push({
                originalCellIndex: change.original.startLineNumber - 1 + j,
                modifiedCellIndex: change.modified.startLineNumber - 1 + j,
                type: 'unchanged'
            });
        }
    }
    for (let j = modifiedLen; j < change.original.length; j++) {
        // deletion
        result.push({
            originalCellIndex: change.original.startLineNumber - 1 + j,
            type: 'delete'
        });
    }
    for (let j = modifiedLen; j < change.modified.length; j++) {
        result.push({
            modifiedCellIndex: change.modified.startLineNumber - 1 + j,
            type: 'insert'
        });
    }
    return result;
}
//# sourceMappingURL=notebookDiff.js.map