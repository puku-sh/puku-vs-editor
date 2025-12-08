"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAlternativeNotebookDocument = createAlternativeNotebookDocument;
exports.createAlternativeNotebookDocumentSnapshot = createAlternativeNotebookDocumentSnapshot;
exports.toAltNotebookCellChangeEdit = toAltNotebookCellChangeEdit;
exports.toAltNotebookChangeEdit = toAltNotebookChangeEdit;
const arrays_1 = require("../../../util/vs/base/common/arrays");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const stringEdit_1 = require("../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../util/vs/editor/common/core/ranges/offsetRange");
const vscodeTypes_1 = require("../../../vscodeTypes");
const edit_1 = require("../../editing/common/edit");
const positionOffsetTransformer_1 = require("../../editing/common/positionOffsetTransformer");
const alternativeContentProvider_text_1 = require("./alternativeContentProvider.text");
const helpers_1 = require("./helpers");
const offsetTranslator_1 = require("./offsetTranslator");
class AlternativeNotebookCellSnapshot {
    static fromNotebookCell(cell, blockComment, lineCommentStart) {
        const summary = (0, helpers_1.summarize)(cell);
        const cellMarker = (0, alternativeContentProvider_text_1.generateCellTextMarker)(summary, lineCommentStart);
        const code = cell.document.getText().replace(/\r\n|\n/g, helpers_1.EOL);
        const prefix = cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? `${cellMarker}${helpers_1.EOL}${blockComment[0]}${helpers_1.EOL}` : `${cellMarker}${helpers_1.EOL}`;
        const suffix = cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? `${helpers_1.EOL}${blockComment[1]}` : '';
        return new AlternativeNotebookCellSnapshot(cell, blockComment, lineCommentStart, code, prefix, suffix);
    }
    constructor(cell, blockComment, lineCommentStart, code, prefix, suffix) {
        this.cell = cell;
        this.blockComment = blockComment;
        this.lineCommentStart = lineCommentStart;
        this.code = code;
        this.prefix = prefix;
        this.suffix = suffix;
        this.crlfTranslator = new offsetTranslator_1.CrLfOffsetTranslator(cell.document.getText(), cell.document.eol);
        this.positionTransformer = new positionOffsetTransformer_1.PositionOffsetTransformer(`${prefix}${code}${suffix}`);
        const lastPosition = this.positionTransformer.getPosition(this.positionTransformer.getText().length);
        this.altRange = new vscodeTypes_1.Range(0, 0, lastPosition.line, lastPosition.character);
        this.lineCount = this.altRange.end.line + 1;
        this.lastLineLength = this.suffix.length === 0 ? this.altRange.end.character : this.positionTransformer.getPosition(this.positionTransformer.getText().length - this.suffix.length).character;
    }
    normalizeEdits(edits) {
        return edits.map(e => {
            const range = this.toAltRange(e.range);
            const rangeOffset = this.crlfTranslator.translate(e.rangeOffset);
            const endOffset = this.crlfTranslator.translate(e.rangeOffset + e.rangeLength);
            return {
                range,
                rangeLength: endOffset - rangeOffset,
                rangeOffset,
                text: e.text.replace(/\r\n|\n/g, helpers_1.EOL), // Normalize line endings to EOL
            };
        });
    }
    withTextEdit(edit) {
        const newCode = edit.apply(this.code);
        return new AlternativeNotebookCellSnapshot(this.cell, this.blockComment, this.lineCommentStart, newCode, this.prefix, this.suffix);
    }
    get altText() {
        return this.positionTransformer.getText();
    }
    toAltOffsetRange(range) {
        const startOffset = this.toAltOffset(range.start);
        const endOffset = this.toAltOffset(range.end);
        return new offsetRange_1.OffsetRange(startOffset, endOffset);
    }
    toAltOffset(position) {
        // Remove the lines we've added for the cell marker and block comments
        const extraLinesAdded = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 2 : 1;
        return this.positionTransformer.getOffset(new vscodeTypes_1.Position(position.line + extraLinesAdded, position.character));
    }
    toAltRange(range) {
        // Remove the lines we've added for the cell marker and block comments
        const extraLinesAdded = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 2 : 1;
        return new vscodeTypes_1.Range(range.start.line + extraLinesAdded, range.start.character, range.end.line + extraLinesAdded, range.end.character);
    }
    fromAltOffsetRange(offsetRange) {
        const startOffset = offsetRange.start;
        const endOffset = offsetRange.endExclusive;
        const startPosition = this.positionTransformer.getPosition(startOffset);
        const endPosition = this.positionTransformer.getPosition(endOffset);
        // Remove the lines we've added for the cell marker and block comments
        const extraLinesAddedAtStart = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 2 : 1;
        const extraLinesAddedAtEnd = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 1 : 0;
        const startLine = Math.max(startPosition.line - extraLinesAddedAtStart, 0);
        const lastLineIndex = (this.lineCount - extraLinesAddedAtEnd) - 1;
        let endLine = endPosition.line;
        let endLineEndColumn = endPosition.character;
        if (endLine > lastLineIndex) {
            endLineEndColumn = endLineEndColumn === 0 ? endLineEndColumn : -1;
            endLine = lastLineIndex - extraLinesAddedAtStart;
        }
        else {
            endLine = Math.max(endPosition.line - extraLinesAddedAtStart, 0);
        }
        if (endLine === (lastLineIndex - extraLinesAddedAtStart)) {
            if (endLineEndColumn !== 0 && endLineEndColumn === -1 || this.lastLineLength < endLineEndColumn) {
                endLineEndColumn = this.lastLineLength;
            }
        }
        // If the original start was in a line that part of the prefix, then we need to start from line 0, character 0.
        const startCharacter = startPosition.line - extraLinesAddedAtStart >= 0 ? startPosition.character : 0;
        return new vscodeTypes_1.Range(startLine, startCharacter, endLine, endLineEndColumn);
    }
    fromAltRange(range) {
        // Remove the lines we've added for the cell marker and block comments
        const extraLinesAdded = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 2 : 1;
        const extraLinesAddedAtEnd = this.cell.kind === vscodeTypes_1.NotebookCellKind.Markup ? 1 : 0;
        const startLine = Math.max(range.start.line - extraLinesAdded, 0);
        const isInvalidStartLine = extraLinesAdded ? (range.start.line + 1) <= extraLinesAdded : false;
        const startCharacter = isInvalidStartLine ? 0 : range.start.character;
        const isEndLineInvalid = extraLinesAddedAtEnd > 0 && (range.end.line === this.lineCount - 1);
        const endLine = isEndLineInvalid ? (this.lineCount - extraLinesAdded - extraLinesAddedAtEnd - 1) : Math.max(range.end.line - extraLinesAdded, 0);
        const lastLineIndex = (this.lineCount - extraLinesAdded - extraLinesAddedAtEnd) - 1;
        const endLineCharacter = isEndLineInvalid ? this.lastLineLength : (endLine === lastLineIndex) ? Math.min(range.end.character, this.lastLineLength) : range.end.character;
        return new vscodeTypes_1.Range(startLine, startCharacter, endLine, endLineCharacter);
    }
}
function buildAlternativeCells(cellItems, altCelBuilder) {
    let lineCount = 0;
    let offset = 0;
    return cellItems.map(item => {
        const altCell = altCelBuilder(item);
        const startLine = lineCount;
        const startOffset = offset;
        lineCount += altCell.lineCount;
        offset += altCell.altText.length + helpers_1.EOL.length; // EOL is added between cells
        return { altCell, startLine, startOffset };
    });
}
class AbstractAlternativeNotebookDocument {
    constructor(notebook, excludeMarkdownCells, blockComment, lineCommentStart, cells) {
        this.notebook = notebook;
        this.excludeMarkdownCells = excludeMarkdownCells;
        this.blockComment = blockComment;
        this.lineCommentStart = lineCommentStart;
        this.cells = cells;
        this.cellTextDocuments = new Map();
        for (const { altCell } of this.cells) {
            this.cellTextDocuments.set(altCell.cell.document, altCell.cell);
        }
    }
    /**
     * Get the cell associated with a text document.
     * @param textDocument The text document to find the cell for.
     * @returns The notebook cell associated with the text document, or undefined if not found.
     * If a cell was inserted into the notebook and this instance hasn't been updated yet, it will return undefined.
     */
    getCell(textDocument) {
        return this.cellTextDocuments.get(textDocument);
    }
    getText(range) {
        const altText = this.cells.map(cell => cell.altCell.altText).join(helpers_1.EOL);
        return range ? range.substring(altText) : altText;
    }
    fromAltRange(range) {
        const firstIdx = (0, arraysFind_1.findLastIdxMonotonous)(this.cells, c => c.startLine <= range.start.line);
        if (firstIdx === -1) {
            return [];
        }
        const cells = [];
        for (let i = firstIdx; i < this.cells.length; i++) {
            const { altCell, startLine } = this.cells[i];
            if (i === firstIdx) {
                const cellStartLine = range.start.line - startLine;
                const cellEndLine = range.end.line - startLine;
                const cellEnd = cellEndLine <= (altCell.lineCount - 1) ? cellEndLine : altCell.lineCount - 1;
                let cellEndChar = range.end.character;
                if (cellEnd !== cellEndLine) {
                    cellEndChar = altCell.altRange.end.character;
                }
                const cellRange = new vscodeTypes_1.Range(cellStartLine, range.start.character, cellEnd, cellEndChar);
                cells.push([altCell.cell, altCell.fromAltRange(cellRange)]);
            }
            else if (startLine + altCell.lineCount <= range.end.line) {
                const cellRange = new vscodeTypes_1.Range(0, 0, altCell.altRange.end.line, altCell.altRange.end.character);
                cells.push([altCell.cell, altCell.fromAltRange(cellRange)]);
            }
            else if (startLine < range.end.line) {
                const cellRange = new vscodeTypes_1.Range(0, 0, range.end.line - startLine, range.end.character);
                cells.push([altCell.cell, altCell.fromAltRange(cellRange)]);
            }
        }
        return cells;
    }
    fromAltOffsetRange(offsetRange) {
        const firstIdx = (0, arraysFind_1.findLastIdxMonotonous)(this.cells, c => c.startOffset <= offsetRange.start);
        if (firstIdx === -1) {
            return [];
        }
        const cells = [];
        for (let i = firstIdx; i < this.cells.length; i++) {
            const { altCell, startOffset } = this.cells[i];
            if (i === firstIdx) {
                const endOffset = offsetRange.endExclusive > (startOffset + altCell.altText.length) ? (startOffset + altCell.altText.length) : offsetRange.endExclusive;
                const offset = new offsetRange_1.OffsetRange(offsetRange.start - startOffset, endOffset - startOffset);
                cells.push([altCell.cell, altCell.fromAltOffsetRange(offset)]);
            }
            else if ((startOffset + altCell.altText.length) < offsetRange.endExclusive) {
                const offset = new offsetRange_1.OffsetRange(0, altCell.altText.length);
                cells.push([altCell.cell, altCell.fromAltOffsetRange(offset)]);
            }
            else if (startOffset < offsetRange.endExclusive) {
                const offset = new offsetRange_1.OffsetRange(0, offsetRange.endExclusive - startOffset);
                cells.push([altCell.cell, altCell.fromAltOffsetRange(offset)]);
            }
        }
        return cells;
    }
    toAltOffset(cell, position) {
        const altCell = this.cells.find(c => c.altCell.cell === cell);
        if (altCell) {
            return altCell.altCell.toAltOffset(position);
        }
        else {
            return undefined;
        }
    }
    toAltOffsetRange(cell, ranges) {
        let offset = 0;
        for (const { altCell } of this.cells) {
            if (altCell.cell === cell) {
                return ranges.map(range => {
                    const offsetRange = altCell.toAltOffsetRange(range);
                    const adjustedRange = new offsetRange_1.OffsetRange(offset + offsetRange.start, offset + offsetRange.endExclusive);
                    return adjustedRange;
                });
            }
            else {
                offset += altCell.altText.length + helpers_1.EOL.length; // EOL is added between cells
            }
        }
        return [];
    }
    toAltRange(cell, ranges) {
        let offset = 0;
        for (const { altCell, startLine } of this.cells) {
            if (altCell.cell === cell) {
                return ranges.map(range => {
                    const altCellRange = altCell.toAltRange(range);
                    const adjustedRange = new vscodeTypes_1.Range(altCellRange.start.line + startLine, altCellRange.start.character, altCellRange.end.line + startLine, altCellRange.end.character);
                    return adjustedRange;
                });
            }
            else {
                offset += altCell.altText.length + helpers_1.EOL.length; // EOL is added between cells
            }
        }
        return [];
    }
}
class AlternativeNotebookDocumentSnapshot extends AbstractAlternativeNotebookDocument {
    static create(notebook, excludeMarkdownCells) {
        const blockComment = (0, alternativeContentProvider_text_1.getBlockComment)(notebook);
        const lineCommentStart = (0, alternativeContentProvider_text_1.getLineCommentStart)(notebook);
        const notebookCells = notebook.getCells().filter(cell => !excludeMarkdownCells || cell.kind !== vscodeTypes_1.NotebookCellKind.Markup);
        const altCells = buildAlternativeCells(notebookCells, cell => AlternativeNotebookCellSnapshot.fromNotebookCell(cell, blockComment, lineCommentStart));
        return new AlternativeNotebookDocumentSnapshot(notebook, excludeMarkdownCells, blockComment, lineCommentStart, altCells);
    }
    constructor(notebook, excludeMarkdownCells, blockComment, lineCommentStart, altCells) {
        super(notebook, excludeMarkdownCells, blockComment, lineCommentStart, altCells);
    }
    withNotebookChanges(events) {
        const cells = withNotebookChangesAndEdit(this.cells, this.blockComment, this.lineCommentStart, events, this.excludeMarkdownCells)[0];
        return new AlternativeNotebookDocumentSnapshot(this.notebook, this.excludeMarkdownCells, this.blockComment, this.lineCommentStart, cells);
    }
    withCellChanges(cellTextDoc, edit) {
        if (edit instanceof stringEdit_1.StringEdit ? edit.isEmpty() : edit.length === 0) {
            return this;
        }
        const [altCells,] = withCellChangesAndEdit(this.cells, cellTextDoc, edit) || [undefined, undefined];
        if (!altCells) {
            return this;
        }
        return new AlternativeNotebookDocumentSnapshot(this.notebook, this.excludeMarkdownCells, this.blockComment, this.lineCommentStart, altCells);
    }
}
class AlternativeNotebookDocument extends AbstractAlternativeNotebookDocument {
    static create(notebook, excludeMarkdownCells) {
        const blockComment = (0, alternativeContentProvider_text_1.getBlockComment)(notebook);
        const lineCommentStart = (0, alternativeContentProvider_text_1.getLineCommentStart)(notebook);
        const notebookCells = notebook.getCells().filter(cell => !excludeMarkdownCells || cell.kind !== vscodeTypes_1.NotebookCellKind.Markup);
        const altCells = buildAlternativeCells(notebookCells, cell => AlternativeNotebookCellSnapshot.fromNotebookCell(cell, blockComment, lineCommentStart));
        return new AlternativeNotebookDocument(notebook, excludeMarkdownCells, blockComment, lineCommentStart, altCells);
    }
    constructor(notebook, excludeMarkdownCells, blockComment, lineCommentStart, cells) {
        super(notebook, excludeMarkdownCells, blockComment, lineCommentStart, cells);
        this.cells = cells;
    }
    updateCells(cells) {
        this.cells.splice(0, this.cells.length, ...cells);
    }
    applyNotebookChanges(events) {
        const cells = withNotebookChangesAndEdit(this.cells, this.blockComment, this.lineCommentStart, events, this.excludeMarkdownCells)[0];
        this.updateCells(cells);
    }
    applyCellChanges(cellTextDoc, edit) {
        if (edit instanceof stringEdit_1.StringEdit ? edit.isEmpty() : edit.length === 0) {
            return;
        }
        const [cells,] = withCellChangesAndEdit(this.cells, cellTextDoc, edit) || [undefined, undefined];
        if (!cells) {
            return;
        }
        this.updateCells(cells);
    }
}
function withCellChangesAndEdit(cells, cellTextDoc, edit) {
    if (edit instanceof stringEdit_1.StringEdit ? edit.isEmpty() : edit.length === 0) {
        return undefined;
    }
    const cell = cells.find(c => c.altCell.cell.document === cellTextDoc);
    if (!cell) {
        return undefined;
    }
    const cellEdit = edit instanceof stringEdit_1.StringEdit ? edit : (0, edit_1.stringEditFromTextContentChange)(cell.altCell.normalizeEdits(edit));
    const altCells = buildAlternativeCells(cells, cell => cell.altCell.cell.document === cellTextDoc ? cell.altCell.withTextEdit(cellEdit) : cell.altCell);
    return [altCells, edit];
}
function withNotebookChangesAndEdit(cells, blockComment, lineCommentStart, events, excludeMarkdownCells) {
    if (!events.length) {
        return [cells, undefined];
    }
    // If we've only added md cells, then its a noop.
    if (events.every(e => e.removedCells.length === 0 && e.addedCells.every(c => c.kind === vscodeTypes_1.NotebookCellKind.Markup))) {
        return [cells, undefined];
    }
    let altCells = cells.slice();
    let edit = stringEdit_1.StringEdit.empty;
    for (const event of events) {
        const newCells = event.addedCells.filter(c => excludeMarkdownCells ? c.kind === vscodeTypes_1.NotebookCellKind.Code : true).map(cell => ({ altCell: AlternativeNotebookCellSnapshot.fromNotebookCell(cell, blockComment, lineCommentStart), startLine: 0, startOffset: 0 }));
        const removedCells = altCells.slice(event.range.start, event.range.end);
        let firstUnChangedCellIndex = -1;
        if (event.range.isEmpty) {
            firstUnChangedCellIndex = event.range.start === 0 ? -1 : event.range.start - 1;
        }
        else {
            firstUnChangedCellIndex = event.range.start === 0 ? -1 : event.range.start - 1;
        }
        const startOffset = firstUnChangedCellIndex === -1 ? 0 : altCells[firstUnChangedCellIndex].startOffset + altCells[firstUnChangedCellIndex].altCell.altText.length + helpers_1.EOL.length;
        let offsetLength = removedCells.map((cell) => cell.altCell.altText).join(helpers_1.EOL).length;
        let newCellsContent = newCells.map((cell) => cell.altCell.altText).join(helpers_1.EOL);
        if (startOffset !== 0) {
            if (!(event.range.end < altCells.length)) {
                newCellsContent = `${helpers_1.EOL}${newCellsContent}`;
            }
        }
        // if we have some cells after the insertion, then we need to insert an EOL at the end.
        if (event.range.end < altCells.length) {
            if (newCellsContent) {
                newCellsContent += helpers_1.EOL;
            }
            if (offsetLength) {
                offsetLength += helpers_1.EOL.length;
            }
        }
        edit = edit.compose(stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(startOffset, startOffset + offsetLength), newCellsContent));
        altCells.splice(event.range.start, event.range.end - event.range.start, ...newCells);
        altCells = buildAlternativeCells(altCells, cell => cell.altCell);
    }
    return [altCells, edit];
}
/**
 * Represents the Notebook as a alternative text (Jupytext like) document that is mutable.
 * Not to be used when dealing with agents for editing or reading notebooks.
 * Use only with NES or other exceptional cases.
 */
function createAlternativeNotebookDocument(notebook, excludeMarkdownCells = true) {
    return AlternativeNotebookDocument.create(notebook, excludeMarkdownCells);
}
/**
 * Represents the Notebook as an alternative text (Jupytext like) document that is immutable.
 * Not to be used when dealing with agents for editing or reading notebooks.
 * Use only with NES or other exceptional cases.
 */
function createAlternativeNotebookDocumentSnapshot(notebook, excludeMarkdownCells = true) {
    return AlternativeNotebookDocumentSnapshot.create(notebook, excludeMarkdownCells);
}
function toAltNotebookCellChangeEdit(notebook, cellTextDocument, events) {
    const replacementsInApplicationOrder = toAltCellTextDocumentContentChangeEvents(notebook, cellTextDocument, events);
    return (0, edit_1.stringEditFromTextContentChange)(replacementsInApplicationOrder);
}
function toAltNotebookChangeEdit(notebook, events) {
    return withNotebookChangesAndEdit(notebook.cells, notebook.blockComment, notebook.lineCommentStart, events, notebook.excludeMarkdownCells)[1];
}
function toAltCellTextDocumentContentChangeEvents(notebook, cellTextDocument, events) {
    return (0, arrays_1.coalesce)(events.map(e => {
        const cell = notebook.getCell(cellTextDocument);
        if (!cell) {
            return undefined;
        }
        const ranges = notebook.toAltRange(cell, [e.range]);
        const rangeOffsets = notebook.toAltOffsetRange(cell, [e.range]);
        if (!ranges.length || !rangeOffsets.length) {
            return undefined;
        }
        const range = ranges[0];
        const rangeOffset = rangeOffsets[0];
        return {
            range,
            rangeLength: rangeOffset.endExclusive - rangeOffset.start,
            rangeOffset: rangeOffset.start,
            text: e.text.replace(/\r\n|\n/g, helpers_1.EOL), // Normalize line endings to EOL
        };
    }));
}
//# sourceMappingURL=alternativeNotebookTextDocument.js.map