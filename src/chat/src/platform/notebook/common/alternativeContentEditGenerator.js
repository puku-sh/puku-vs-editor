"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeNotebookContentEditGenerator = exports.IAlternativeNotebookContentEditGenerator = exports.NotebookEditGenrationSource = void 0;
exports.textToAsyncIterableLines = textToAsyncIterableLines;
const notebooks_1 = require("../../../util/common/notebooks");
const services_1 = require("../../../util/common/services");
const types_1 = require("../../../util/common/types");
const async_1 = require("../../../util/vs/base/common/async");
const hash_1 = require("../../../util/vs/base/common/hash");
const vscodeTypes_1 = require("../../../vscodeTypes");
const diffService_1 = require("../../diff/common/diffService");
const logService_1 = require("../../log/common/logService");
const telemetry_1 = require("../../telemetry/common/telemetry");
const alternativeContent_1 = require("./alternativeContent");
const alternativeContentProvider_text_1 = require("./alternativeContentProvider.text");
const helpers_1 = require("./helpers");
const notebookDiff_1 = require("./notebookDiff");
var NotebookEditGenrationSource;
(function (NotebookEditGenrationSource) {
    NotebookEditGenrationSource["codeMapperEditNotebook"] = "codeMapperEditNotebook";
    NotebookEditGenrationSource["codeMapperEmptyNotebook"] = "codeMapperEmptyNotebook";
    NotebookEditGenrationSource["codeMapperFastApply"] = "codeMapperFastApply";
    NotebookEditGenrationSource["createFile"] = "createFile";
    NotebookEditGenrationSource["stringReplace"] = "stringReplace";
    NotebookEditGenrationSource["applyPatch"] = "applyPatch";
    NotebookEditGenrationSource["newNotebookIntent"] = "newNotebookIntent";
})(NotebookEditGenrationSource || (exports.NotebookEditGenrationSource = NotebookEditGenrationSource = {}));
exports.IAlternativeNotebookContentEditGenerator = (0, services_1.createServiceIdentifier)('IAlternativeNotebookContentEditGenerator');
let AlternativeNotebookContentEditGenerator = class AlternativeNotebookContentEditGenerator {
    constructor(alternativeContentService, diffService, logger, telemetryService) {
        this.alternativeContentService = alternativeContentService;
        this.diffService = diffService;
        this.logger = logger;
        this.telemetryService = telemetryService;
    }
    getFormat(firstLine) {
        // if the source starts with `{` or `[`, then its a JSON string,
        // If it starts with `<`, then its an XML string, else text
        // Trim, as we want to ensure we remove any leading/trailing whitespace (e.g. its possible there's empty space between the fence and the content)
        const firstChar = firstLine.trim().substring(0, 1);
        const format = firstChar === '{' ? 'json' : firstChar === '<' ? 'xml' : 'text';
        return format;
    }
    /**
     * Given a NotebookDocument or Uri, and a cell kind, return the EOL for the new cell.
     * If the notebook is empty, then return the default EOL.
     * Else default to the EOL of the first cell of the given kind.
     * This way we have a consistent EOL for new cells (matching existing cells).
     */
    getEOLForNewCell(notebookOrUri, cellKind) {
        const eolInExistingCodeCell = (0, types_1.isUri)(notebookOrUri) ? undefined : (notebookOrUri.getCells().find(c => c.kind === cellKind)?.document.eol ?? undefined);
        return eolInExistingCodeCell ? eolInExistingCodeCell === vscodeTypes_1.EndOfLine.LF ? '\n' : '\r\n' : helpers_1.EOL;
    }
    /**
     * Given a stream of lines for the alternative content, generate the corresponding edits to apply to the notebook document.
     * We accept a NotebookDocument or a Uri.
     * This is because its possible the Notebook may not have been created/loaded as of yet.
     * I.e. for new Notebooks, we can emity the Insert Cell Edits without the notebook being created.
     */
    async *generateNotebookEdits(notebookOrUri, lines, telemetryOptions, token) {
        lines = typeof lines === 'string' ? textToAsyncIterableLines(lines) : lines;
        const firstNonEmptyLinePromise = new async_1.DeferredPromise();
        lines = readFirstNonEmptyLineAndKeepStreaming(lines, firstNonEmptyLinePromise);
        const firstNonEmptyLine = (await firstNonEmptyLinePromise.p).value;
        const format = this.getFormat(firstNonEmptyLine);
        // Sometimes llm hallucinates with jupytext format, and doesn't send the cell markers.
        // Instead just sends plain python code.
        // In such cases, if no new cells were emitted, then emit a new cell with the contents of the entire plain python code.
        const linesCollected = [];
        lines = collectWhileStreaming(lines, linesCollected);
        const isEmptyNotebook = (0, types_1.isUri)(notebookOrUri) || notebookOrUri.cellCount === 0;
        let notebookEditEmitted = false;
        let cellTextEditEmitted = false;
        for await (const edit of this.generateNotebookEditsImpl(notebookOrUri, lines, format, token)) {
            notebookEditEmitted = notebookEditEmitted || !Array.isArray(edit);
            if (Array.isArray(edit)) {
                cellTextEditEmitted = true;
            }
            yield edit;
        }
        if (isEmptyNotebook || !(0, types_1.isUri)(notebookOrUri)) {
            if (!notebookEditEmitted && format === 'text' && linesCollected.length && !(0, alternativeContentProvider_text_1.lineMightHaveCellMarker)(firstNonEmptyLine)) {
                const uri = (0, types_1.isUri)(notebookOrUri) ? notebookOrUri : notebookOrUri.uri;
                if ((0, notebooks_1.isJupyterNotebookUri)(uri)) {
                    const eolForNewCell = this.getEOLForNewCell(notebookOrUri, vscodeTypes_1.NotebookCellKind.Code);
                    const cellData = new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, linesCollected.join(eolForNewCell), 'python');
                    yield vscodeTypes_1.NotebookEdit.insertCells(0, [cellData]);
                    this.logger.info(`No new cells were emitted for ${uri.toString()}. Emitting a new cell with the contents of the code.`);
                }
                else {
                    this.logger.warn(`No new cells were emitted for ${uri.toString()}`);
                }
            }
        }
        (async () => {
            const model = await Promise.resolve(telemetryOptions?.model).catch(() => undefined);
            /* __GDPR__
                "notebook.editGeneration" : {
                    "owner": "donjayamanne",
                    "comment": "Metadata about the code mapper request",
                    "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                    "requestSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The source from where the request was made" },
                    "model": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Model selection for the response" },
                    "inputFormat": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Input format for the notebook source (xml, json, text)" },
                    "isEmptyNotebook": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether the notebook is empty", "isMeasurement": true },
                    "isNotebookOrUri": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether we're given a notebook or just a uri (1 = Notebook, 0 = Uri)", "isMeasurement": true },
                    "isJupyterNotebookUri": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether we're given a Jupyter notebook or just a uri (1 = Jupyter Notebook, 0 = Other)", "isMeasurement": true },
                    "isEditEmitted": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether a Notebook edit was emitted (insert or delete cell) (1 = Yes, 0 = No)", "isMeasurement": true },
                    "isCellTextEditEmitted": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether an edit was emitted for a cell (1 = Yes, 0 = No)", "isMeasurement": true },
                    "sourceLength": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Number of lines in the source code from which we're to generate edits", "isMeasurement": true }
                }
            */
            this.telemetryService.sendMSFTTelemetryEvent('notebook.editGeneration', {
                requestId: telemetryOptions?.requestId,
                requestSource: telemetryOptions?.source,
                model,
                inputFormat: format
            }, {
                isEmptyNotebook: isEmptyNotebook ? 1 : 0,
                isNotebookOrUri: (0, types_1.isUri)(notebookOrUri) ? 0 : 1,
                isJupyterNotebookUri: (0, notebooks_1.isJupyterNotebookUri)((0, types_1.isUri)(notebookOrUri) ? notebookOrUri : notebookOrUri.uri) ? 1 : 0,
                isEditEmitted: notebookEditEmitted ? 1 : 0,
                isCellTextEditEmitted: cellTextEditEmitted ? 1 : 0,
                sourceLength: linesCollected.length
            });
        })();
    }
    async *generateNotebookEditsImpl(notebookOrUri, lines, format, token) {
        const provider = this.alternativeContentService.create(format);
        const isEmptyNotebook = (0, types_1.isUri)(notebookOrUri) || notebookOrUri.cellCount === 0;
        const isNotebookAvailable = !(0, types_1.isUri)(notebookOrUri);
        const cellIdMap = isNotebookAvailable ? (0, helpers_1.getCellIdMap)(notebookOrUri) : new Map();
        const cellInfo = {
            index: -1,
            lines: [],
            language: 'markdown',
            ended: false
        };
        const cellsSeen = new WeakSet();
        function getCellIdOfNewCell(cell) {
            const hash = new hash_1.StringSHA1();
            hash.update(cell.index.toString());
            return hash.digest().substring(0, 8);
        }
        const expectedCells = [];
        const original = (0, types_1.isUri)(notebookOrUri) ? [] : notebookOrUri.getCells().map(cell => ({ id: (0, helpers_1.getCellId)(cell), uri: cell.document.uri }));
        const allLines = [];
        lines = collectWhileStreaming(lines, allLines);
        let editsEmitted = false;
        for await (const line of provider.parseAlternateContent(notebookOrUri, lines, token)) {
            if (token.isCancellationRequested) {
                break;
            }
            if (line.type === 'start') {
                const expectedCell = {
                    index: line.index,
                    language: line.language || 'markdown',
                    lines: [],
                    cell: line.id ? cellIdMap.get(line.id) : undefined
                };
                expectedCells.push(expectedCell);
                cellInfo.ended = false;
                cellInfo.insertEdit = undefined;
                cellInfo.index = expectedCell.index;
                cellInfo.lines = expectedCell.lines;
                cellInfo.language = expectedCell.language;
                cellInfo.cell = expectedCell.cell;
                if (cellInfo.cell) {
                    cellsSeen.add(cellInfo.cell);
                }
            }
            else if (line.type === 'end') {
                cellInfo.ended = true;
                const doc = cellInfo.cell?.document;
                if (!cellInfo.insertEdit && !cellInfo.cell && !cellInfo.lines.length) {
                    // This is a case where we have an empty cell.
                    // We do not get the line at all, but we only have a start and end,
                    // Meaning it is a cell, and it is well structured, but its empty.
                    const cellData = new vscodeTypes_1.NotebookCellData(cellInfo.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code, '', cellInfo.language);
                    const insertEdit = vscodeTypes_1.NotebookEdit.insertCells(cellInfo.index, [cellData]);
                    yield insertEdit;
                    editsEmitted = true;
                    original.splice(cellInfo.index, 0, { id: getCellIdOfNewCell(cellInfo) });
                }
                else if (cellInfo.insertEdit && !cellInfo.cell) {
                    // Possible we got a cell from LLM that doesn't have an id, but matches the content of an existing cell.
                    // This can happen as follows:
                    // 1. User asks LLM to insert a cell
                    // 2. LLM returns a edit request to insert the cell without the cell id
                    // 3. We insert the cell
                    // 4. User asks for some other changes,
                    // 5. LLM uses history and see that the cell in history that doestn' have an id
                    // 6. LLM returns this same cell again along with other cells (new/changes, etc)
                    // 7. Some how SD endpoint cannot figure out this is the same cell, and SD returns this cell but without the id
                    // 8. Now we see this cell without an id, we insert it and we delete the old cell that was in this place.
                    // Solution: If the cell being inserted is the same as the cell that is already in the notebook in the same position, then don't insert it.
                    const existingCell = (!isEmptyNotebook && isNotebookAvailable && cellInfo.index < notebookOrUri.cellCount) ? notebookOrUri.cellAt(cellInfo.index) : undefined;
                    if (existingCell && existingCell.document.getText() === cellInfo.insertEdit.newCells[0].value) {
                        // Emit the edits for this cell.
                        // & do not insert this cell.
                        cellsSeen.add(existingCell);
                        expectedCells[expectedCells.length - 1].cell = existingCell;
                        // Remit the edits for all the lines of this existing cell.
                        const doc = existingCell.document;
                        for (let i = 0; i < doc.lineCount; i++) {
                            const line = doc.lineAt(i);
                            yield [doc.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(i, 0, i, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), line.text)]];
                            editsEmitted = true;
                        }
                    }
                    else {
                        yield cellInfo.insertEdit;
                        editsEmitted = true;
                        original.splice(cellInfo.index, 0, { id: getCellIdOfNewCell(cellInfo) });
                    }
                }
                else if (cellInfo.lines.length && doc && cellInfo.lines.length < doc.lineCount) {
                    const range = new vscodeTypes_1.Range(cellInfo.lines.length - 1, cellInfo.lines.slice(-1)[0].length, doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
                    yield [doc.uri, [new vscodeTypes_1.TextEdit(range, '')]];
                }
            }
            else if (line.type === 'line' && !cellInfo.ended) {
                cellInfo.lines.push(line.line);
                if (cellInfo.cell) {
                    if (cellInfo.lines.length > cellInfo.cell.document.lineCount) {
                        const range = new vscodeTypes_1.Range(cellInfo.lines.length - 1, 0, cellInfo.lines.length - 1, 0);
                        const eol = cellInfo.cell.document.eol === vscodeTypes_1.EndOfLine.LF ? '\n' : '\r\n';
                        const newText = `${eol}${line.line}`;
                        yield [cellInfo.cell.document.uri, [new vscodeTypes_1.TextEdit(range, newText)]];
                    }
                    else {
                        const lineIndex = cellInfo.lines.length - 1;
                        yield [cellInfo.cell.document.uri, [new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(lineIndex, 0, lineIndex, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */), line.line)]];
                    }
                    editsEmitted = true;
                }
                else if (cellInfo.insertEdit) {
                    const eolForNewCell = this.getEOLForNewCell(notebookOrUri, cellInfo.insertEdit.newCells[0].kind);
                    cellInfo.insertEdit.newCells[0].value = cellInfo.lines.join(eolForNewCell);
                }
                else {
                    // Insert the new cell.
                    const cellData = new vscodeTypes_1.NotebookCellData(cellInfo.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code, line.line, cellInfo.language);
                    cellInfo.insertEdit = vscodeTypes_1.NotebookEdit.insertCells(cellInfo.index, [cellData]);
                }
            }
        }
        if (isEmptyNotebook || !isNotebookAvailable) {
            return;
        }
        // If we have content in the original notebook and no edits were emitted,
        // But we have some content,
        // This this can mean only one thing = invalid format.
        // If the format is correct, then we should have emitted some edits.
        // If we don't exit here we end up deleting all the cells in the notebook.
        if (!editsEmitted && allLines.length) {
            this.logger.warn(`No edits generated for notebook ${notebookOrUri.uri.toString()}. This is likely due to an invalid format. Expected format: ${format}. Provided content as follows:\n\n${allLines.join('\n')}`);
            return;
        }
        const modified = expectedCells.map(cell => cell.cell ? (0, helpers_1.getCellId)(cell.cell) : getCellIdOfNewCell(cell));
        // Delete the missing cells.
        for (const missingCell of original.filter(cell => cell.uri && !modified.includes(cell.id)).reverse()) {
            const cell = cellIdMap.get(missingCell.id);
            if (cell) {
                const index = original.indexOf(missingCell);
                yield vscodeTypes_1.NotebookEdit.deleteCells(new vscodeTypes_1.NotebookRange(index, index + 1));
                original.splice(index, 1);
            }
        }
        const result = await this.diffService.computeDiff(original.map(c => c.id).join(helpers_1.EOL), modified.join(helpers_1.EOL), { computeMoves: false, ignoreTrimWhitespace: true, maxComputationTimeMs: 5_000 });
        const diffResult = (0, notebookDiff_1.computeDiff)(original.map(i => i.id), modified, result.changes);
        if (diffResult.every(d => d.type === 'unchanged')) {
            return;
        }
        // Delete items
        for (const change of diffResult.filter(d => d.type === 'delete').reverse()) {
            yield vscodeTypes_1.NotebookEdit.deleteCells(new vscodeTypes_1.NotebookRange(change.originalCellIndex, change.originalCellIndex + 1));
        }
        // insert items
        for (const change of diffResult.filter(d => d.type === 'insert')) {
            const expectedCell = expectedCells[change.modifiedCellIndex];
            const kind = expectedCell.language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code;
            const eolForNewCell = this.getEOLForNewCell(notebookOrUri, kind);
            const source = expectedCell.lines.join(eolForNewCell);
            const cellData = new vscodeTypes_1.NotebookCellData(kind, source, expectedCell.language);
            yield vscodeTypes_1.NotebookEdit.insertCells(expectedCell.index, [cellData]);
        }
    }
};
exports.AlternativeNotebookContentEditGenerator = AlternativeNotebookContentEditGenerator;
exports.AlternativeNotebookContentEditGenerator = AlternativeNotebookContentEditGenerator = __decorate([
    __param(0, alternativeContent_1.IAlternativeNotebookContentService),
    __param(1, diffService_1.IDiffService),
    __param(2, logService_1.ILogService),
    __param(3, telemetry_1.ITelemetryService)
], AlternativeNotebookContentEditGenerator);
function textToAsyncIterableLines(text) {
    const source = new async_1.AsyncIterableSource();
    source.emitOne(text);
    source.resolve();
    return streamLines(source.asyncIterable);
}
/**
 * Split an incoming stream of text to a stream of lines.
 */
function streamLines(source) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        let buffer = '';
        for await (const str of source) {
            buffer += str;
            do {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    break;
                }
                // take the first line
                const line = buffer.substring(0, newlineIndex);
                buffer = buffer.substring(newlineIndex + 1);
                emitter.emitOne(new helpers_1.LineOfText(line));
            } while (true);
        }
        if (buffer.length > 0) {
            // last line which doesn't end with \n
            emitter.emitOne(new helpers_1.LineOfText(buffer));
        }
    });
}
function readFirstNonEmptyLineAndKeepStreaming(source, firstNonEmptyLine) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        for await (const line of source) {
            if (!firstNonEmptyLine.isSettled && line.value.trim().length) {
                firstNonEmptyLine.complete(line);
            }
            emitter.emitOne(line);
        }
        if (!firstNonEmptyLine.isSettled) {
            firstNonEmptyLine.complete(new helpers_1.LineOfText(''));
        }
    });
}
function collectWhileStreaming(source, lines) {
    return new async_1.AsyncIterableObject(async (emitter) => {
        for await (const line of source) {
            lines.push(line.value);
            emitter.emitOne(line);
        }
    });
}
//# sourceMappingURL=alternativeContentEditGenerator.js.map