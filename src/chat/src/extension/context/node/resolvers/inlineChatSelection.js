"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSelectionAndCodeAroundSelection = getSelectionAndCodeAroundSelection;
exports.processCodeAroundSelection = processCodeAroundSelection;
exports.removeBodiesOutsideRange = removeBodiesOutsideRange;
exports.generateNotebookCellContext = generateNotebookCellContext;
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const languages_1 = require("../../../../util/common/languages");
const notebooks_1 = require("../../../../util/common/notebooks");
const network_1 = require("../../../../util/vs/base/common/network");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const codeContextRegion_1 = require("../../../inlineChat/node/codeContextRegion");
/**
 * Get the lines in the selection, and lines above and below the selection.
 * Gives preference to lines above the selection.
 * Limits the above/below context to 100 lines.
 * Limits the total char count to 1/3rd of the max tokens size.
 *
 * @param range selection range expanded to the encompassing function(s) but with line limit
 */
function getSelectionAndCodeAroundSelection(document, selection, range, limitRange, language, tracker) {
    if (range.start.line !== range.end.line && range.end.character === 0) {
        // The range ends at the start of a line, we don't need to include that EOL char
        const lastLine = document.lineAt(range.end.line - 1);
        range = new vscodeTypes_1.Range(range.start, new vscodeTypes_1.Position(range.end.line - 1, lastLine.text.length));
    }
    else if (selection.end.character === 0
        && selection.end.line !== selection.start.line
        && ((range.start.line === selection.start.line
            && range.start.character === 0
            && range.end.line === selection.end.line
            && range.end.character === document.lineAt(range.end.line).text.length)
            ||
                (range.isEqual(selection)))) {
        // The selection ends at the start of a line, we don't need to include that line
        // The range was computed from the selection, expanding it
        const lastLine = document.lineAt(range.end.line - 1);
        range = new vscodeTypes_1.Range(range.start, new vscodeTypes_1.Position(range.end.line - 1, lastLine.text.length));
    }
    const rangeInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const aboveInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const belowInfo = new codeContextRegion_1.CodeContextRegion(tracker, document, language);
    const finish = () => {
        aboveInfo.trim();
        rangeInfo.trim(selection);
        belowInfo.trim();
        return { language, above: aboveInfo, range: rangeInfo, below: belowInfo };
    };
    // the selection might not fit, so we iterate from its bottom
    for (let lineIndex = range.end.line; lineIndex >= range.start.line; lineIndex--) {
        if (!rangeInfo.prependLine(lineIndex)) {
            // didn't fit
            return finish();
        }
    }
    const constraints = {
        aboveLineIndex: range.start.line - 1,
        belowLineIndex: range.end.line + 1,
        minimumLineIndex: Math.max(0, limitRange.start.line),
        maximumLineIndex: Math.min(document.lineCount - 1, limitRange.end.line)
    };
    processCodeAroundSelection(constraints, aboveInfo, belowInfo);
    return finish();
}
function processCodeAroundSelection(constraints, aboveInfo, belowInfo) {
    let aboveLineIndex = constraints.aboveLineIndex;
    let canGoAbove = true;
    let belowLineIndex = constraints.belowLineIndex;
    let canGoBelow = true;
    for (let step = 0; step < 100 && (canGoAbove || canGoBelow); step++) {
        // For each line below the selection, we add 3 lines above it
        const goBelow = !canGoAbove || (canGoBelow && step % 4 === 3);
        if (goBelow) {
            // add line from below
            if (belowLineIndex <= constraints.maximumLineIndex && belowInfo.appendLine(belowLineIndex)) {
                belowLineIndex++;
            }
            else {
                canGoBelow = false;
            }
        }
        else {
            // add a line from above
            if (aboveLineIndex >= constraints.minimumLineIndex && aboveInfo.prependLine(aboveLineIndex)) {
                aboveLineIndex--;
            }
            else {
                canGoAbove = false;
            }
        }
    }
    aboveInfo.isComplete = aboveLineIndex < constraints.minimumLineIndex; // all lines above are included
    belowInfo.isComplete = belowLineIndex > constraints.maximumLineIndex; // all lines below are included
}
function removeBodiesOutsideRange(src, functionBodies, rangeToMaintain, replaceBodyWith) {
    // remove nodes that are outside the range `rangeToMaintain`
    // by copying undeleted chunks of `src` into `above` and `below`
    // depending on position of deleted chunk relative to `rangeToMaintain`
    let lastOffsetAbove = 0;
    let outlineAbove = '';
    let lastOffsetBelow = rangeToMaintain.endOffset;
    let outlineBelow = '';
    for (const rangeToDelete of functionBodies) {
        if (rangeToDelete.endIndex < rangeToMaintain.startOffset) {
            // range is above - delete
            outlineAbove += src.substring(lastOffsetAbove, rangeToDelete.startIndex);
            outlineAbove += replaceBodyWith;
            lastOffsetAbove = rangeToDelete.endIndex;
        }
        else if (rangeToDelete.startIndex > rangeToMaintain.endOffset) {
            // range is below - delete
            outlineBelow += src.substring(lastOffsetBelow, rangeToDelete.startIndex);
            outlineBelow += replaceBodyWith;
            lastOffsetBelow = rangeToDelete.endIndex;
        }
        else {
            // intersection - do not delete
            continue;
        }
    }
    outlineAbove += src.substring(lastOffsetAbove, rangeToMaintain.startOffset);
    outlineBelow += src.substring(lastOffsetBelow, src.length);
    return { outlineAbove, outlineBelow };
}
function generateNotebookCellContext(tabAndEditorService, workspaceService, documentContext, initialContext, initialTracker) {
    const emptyContext = {
        ...initialContext,
        aboveCells: [],
        belowCells: [],
    };
    let notebook;
    let aboveCellIndex;
    let belowCellIndex;
    if (documentContext.document.uri.scheme === network_1.Schemas.vscodeNotebookCell) {
        // inline
        notebook = (0, notebooks_1.findNotebook)(documentContext.document.uri, workspaceService.notebookDocuments);
        const cellIndex = notebook && (0, notebooks_1.findCell)(documentContext.document.uri, notebook)?.index;
        if (cellIndex === undefined || cellIndex === -1) {
            return emptyContext;
        }
        aboveCellIndex = cellIndex - 1;
        belowCellIndex = cellIndex + 1;
    }
    else {
        // floating widget
        if (tabAndEditorService.activeNotebookEditor?.notebook.uri.path !== documentContext.document.uri.path) {
            return emptyContext;
        }
        const notebookEditor = tabAndEditorService.activeNotebookEditor;
        notebook = notebookEditor?.notebook;
        const insertIndex = notebookEditor.selection.start;
        aboveCellIndex = insertIndex - 1;
        belowCellIndex = insertIndex;
    }
    if (!notebook) {
        return emptyContext;
    }
    const { language, above: aboveInfo, range: rangeInfo, below: belowInfo } = initialContext;
    const usedSteps = aboveInfo.lines.length + rangeInfo.lines.length + belowInfo.lines.length;
    const aboveCells = [];
    const belowCells = [];
    const finish = () => {
        aboveCells.forEach(cell => cell.trim());
        belowCells.forEach(cell => cell.trim());
        return {
            language,
            aboveCells,
            belowCells,
        };
    };
    let canGoAboveCell = true;
    let canGoBelowCell = true;
    for (let step = usedSteps; step < 100 && (canGoAboveCell || canGoBelowCell); step++) {
        if (canGoAboveCell) {
            // add lines from above cell is always preferred over cells below
            if (aboveCellIndex >= 0) {
                // prepend the cell content
                const cell = notebook.cellAt(aboveCellIndex);
                const _cellDocument = cell.document;
                const cellDocument = textDocumentSnapshot_1.TextDocumentSnapshot.create(_cellDocument);
                const cellContextRegion = new codeContextRegion_1.CodeContextRegion(initialTracker, cellDocument, (0, languages_1.getLanguage)(cellDocument));
                for (let i = 0; i < cellDocument.lineCount; i++) {
                    cellContextRegion.appendLine(i);
                }
                aboveCells.unshift(cellContextRegion);
                aboveCellIndex--;
            }
            else {
                canGoAboveCell = false;
            }
        }
        else {
            // add lines from below cell
            if (belowCellIndex < notebook.cellCount) {
                // append the cell content
                const cell = notebook.cellAt(belowCellIndex);
                const _cellDocument = cell.document;
                const cellDocument = textDocumentSnapshot_1.TextDocumentSnapshot.create(_cellDocument);
                const cellContextRegion = new codeContextRegion_1.CodeContextRegion(initialTracker, cellDocument, (0, languages_1.getLanguage)(cellDocument));
                for (let i = 0; i < cellDocument.lineCount; i++) {
                    cellContextRegion.appendLine(i);
                }
                belowCells.push(cellContextRegion);
                belowCellIndex++;
            }
            else {
                canGoBelowCell = false;
            }
        }
    }
    return finish();
}
//# sourceMappingURL=inlineChatSelection.js.map