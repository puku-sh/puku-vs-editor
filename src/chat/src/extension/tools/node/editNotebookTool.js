"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditFileResult = exports.EditNotebookTool = void 0;
exports.sendEditNotebookTelemetry = sendEditNotebookTelemetry;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const os_1 = require("os");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const logService_1 = require("../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const crypto_1 = require("../../../util/common/crypto");
const notebooks_1 = require("../../../util/common/notebooks");
const arraysFind_1 = require("../../../util/vs/base/common/arraysFind");
const async_1 = require("../../../util/vs/base/common/async");
const errors_1 = require("../../../util/vs/base/common/errors");
const functional_1 = require("../../../util/vs/base/common/functional");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const codeBlockFormattingRules_1 = require("../../prompts/node/panel/codeBlockFormattingRules");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
class ErrorWithTelemetrySafeReason extends Error {
    constructor(message, reason, data) {
        super(message);
        this.reason = reason;
        this.data = data;
    }
}
let EditNotebookTool = class EditNotebookTool {
    static { this.toolName = toolNames_1.ToolName.EditNotebook; }
    constructor(promptPathRepresentationService, instantiationService, workspaceService, alternativeNotebookContent, logger, telemetryService, endpointProvider, fileSystemService) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.logger = logger;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.fileSystemService = fileSystemService;
    }
    async invoke(options, token) {
        let uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        if (!uri) {
            sendEditNotebookToolOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'invalid_file_path');
            throw new ErrorWithTelemetrySafeReason(`Invalid file path`, 'invalid_file_path');
        }
        // Sometimes we get the notebook cell Uri in the resource.
        // Resolve this to notebook.
        uri = (0, notebooks_1.findNotebook)(uri, this.workspaceService.notebookDocuments)?.uri || uri;
        // Validate parameters
        const stream = this.promptContext?.stream;
        if (!stream) {
            sendEditNotebookToolOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'invalid_input_no_stream');
            throw new ErrorWithTelemetrySafeReason(`Invalid input, no stream`, 'invalid_input_no_stream');
        }
        let notebook;
        try {
            notebook = await this.workspaceService.openNotebookDocument(uri);
        }
        catch (error) {
            if (await this.fileSystemService.stat(uri).catch(() => false)) {
                throw error;
            }
            else {
                // Possible the notebook does not exist and model is trying to create a new notebook.
                // Edit tool doesn't support creating a new notebook.
                const editFileToolExists = this.promptContext?.tools?.availableTools?.some(t => t.name === toolNames_1.ToolName.EditFile);
                const toolToCreateFile = editFileToolExists ? toolNames_1.ToolName.EditFile : toolNames_1.ToolName.CreateFile;
                const message = error.message || error.toString();
                throw new Error(`${message}\nIf trying to create a Notebook, then first use the ${toolToCreateFile} tool to create an empty notebook.`);
            }
        }
        const notebookUri = notebook.uri;
        const provider = this.alternativeNotebookContent.create(this.alternativeNotebookContent.getFormat(this.promptContext?.request?.model));
        if (token.isCancellationRequested) {
            sendEditNotebookToolOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'cancelled');
            return;
        }
        const cells = notebook.getCells().map((cell, index) => ({ cell, index, type: 'existing' }));
        const expectedCellEdits = [];
        const expectedCellTextEdits = [];
        // We must wait for all of the cell edits to get applied.
        // This way we can return the final state of the notebook.
        // We do the same in edit file too as well. Not doing this could result in inconsistencies as model will have an invalid state of the notebook document.
        const done = new vscodeTypes_1.EventEmitter();
        const disposables = new lifecycle_1.DisposableStore();
        disposables.add((0, lifecycle_1.toDisposable)(() => { done.fire(); done.dispose(); }));
        const cellEditsApplied = this.waitForCellOperationComplete(notebook, done.event, expectedCellEdits, disposables, token);
        const textEditsApplied = this.waitForCellTextEditsToComplete(done.event, expectedCellTextEdits, disposables, token);
        const sendEndEdit = (0, functional_1.createSingleCallFunction)(() => stream.notebookEdit(notebookUri, true));
        disposables.add((0, lifecycle_1.toDisposable)(() => sendEndEdit()));
        let failureReason = undefined;
        let failureData = undefined;
        let editOperation = undefined;
        try {
            // First validate all of the args begore applying any changes.
            const { editType, language, newCode, cellId } = this.fixInput(options.input, notebook, provider);
            editOperation = editType;
            this.validateInput({ editType, cellId, newCode }, notebook);
            stream.notebookEdit(notebookUri, []);
            const cellMap = (0, helpers_1.getCellIdMap)(notebook);
            if (editType === 'insert') {
                let notebookCellIndex = -1; // Index in notebook where we are to insert this new cell.
                let cellsCellIndex = -1; // Index in cells array.
                let originalIndex = -1; // Original intended Notebook Cell Index.
                if (cellId === 'top') {
                    originalIndex = 0;
                    // Possible we have already inserted a cell at the top.
                    // We need to find the last cell that was inserted at the top.
                    const entry = (0, arraysFind_1.findLast)(cells, item => item.type === 'insert' && item.originalIndex === 0);
                    if (entry) {
                        cellsCellIndex = cells.indexOf(entry) + 1;
                        notebookCellIndex = entry.index + 1;
                    }
                    else {
                        cellsCellIndex = 0;
                        notebookCellIndex = 0;
                    }
                }
                else if (cellId === 'bottom') {
                    // Possible we have already inserted a cell at the bottom.
                    // We need to find the last cell that was inserted at the bottom.
                    cellsCellIndex = cells.length;
                    notebookCellIndex = cells.filter(item => item.type !== 'delete').length;
                }
                else {
                    const cell = cellId ? cellMap.get(cellId) : undefined;
                    if (!cell) {
                        throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(cellId), 'invalid_cell_id_insert_after', cellId);
                    }
                    const entry = cells.find(item => item.cell === cell);
                    cellsCellIndex = cells.indexOf(entry) + 1;
                    originalIndex = notebookCellIndex = entry.index + 1;
                    // Possible we have already inserted a cell at the top.
                    // We need to find the last cell that was inserted at the top.
                    const inserted = (0, arraysFind_1.findLast)(cells, item => item.type === 'insert' && item.originalIndex === originalIndex);
                    if (inserted) {
                        cellsCellIndex = cells.indexOf(inserted) + 1;
                        notebookCellIndex = inserted.index + 1;
                    }
                }
                const cellKind = language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code;
                const cell = new vscodeTypes_1.NotebookCellData(cellKind, newCode || '', language);
                expectedCellEdits.push({ type: 'insert', index: notebookCellIndex, cell, originalIndex });
                // Shift other indexes by 1.
                cells.filter(({ type }) => type !== 'delete').filter(({ index }) => index >= notebookCellIndex).forEach(item => item.index = item.index + 1);
                cells.splice(cellsCellIndex, 0, { cell, index: notebookCellIndex, type: 'insert', originalIndex });
                stream.notebookEdit(notebookUri, vscodeTypes_1.NotebookEdit.insertCells(notebookCellIndex, [cell]));
            }
            else {
                const cell = cellId ? cellMap.get(cellId) : undefined;
                if (!cell) {
                    throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(cellId), 'invalid_cell_id_empty', cellId);
                }
                const cellIndex = cells.find(i => i.cell === cell).index;
                if (cellIndex === -1) {
                    throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(cellId), 'invalid_cell_id_edit_or_delete');
                }
                if (editType === 'delete') {
                    const cellRange = new vscodeTypes_1.NotebookRange(cellIndex, cellIndex + 1);
                    // Shift other indexes by 1.
                    const cell = cells.find(({ index, type }) => index === cellIndex && type === 'existing');
                    expectedCellEdits.push({ type: 'delete', cell: cell.cell, index: cellIndex });
                    cell.type = 'delete';
                    cells.filter(({ type }) => type !== 'delete').filter(({ index }) => index > cellIndex).forEach(item => item.index = item.index - 1);
                    stream.notebookEdit(notebookUri, vscodeTypes_1.NotebookEdit.deleteCells(cellRange));
                }
                else {
                    if (newCode === undefined) {
                        throw new ErrorWithTelemetrySafeReason('Invalid input: newCode is required for edit operation', 'invalid_input_new_code_required');
                    }
                    const existingCell = notebook.cellAt(cellIndex);
                    expectedCellEdits.push({ type: 'existing', cell: existingCell, index: cellIndex });
                    sendEditNotebookCellTelemetry(this.telemetryService, false, existingCell.document.uri, options, this.endpointProvider);
                    const edit = new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), existingCell.document.lineAt(existingCell.document.lineCount - 1).range.end), newCode);
                    stream.textEdit(existingCell.document.uri, edit);
                    expectedCellTextEdits.push([existingCell.document.uri, edit]);
                }
            }
            sendEndEdit();
            const summaryOfExpectedEdits = summarizeOriginalEdits(notebook, editType, cellId, expectedCellEdits);
            this.logger.trace(`[Notebook] ${summaryOfExpectedEdits}`);
            if (token.isCancellationRequested) {
                return;
            }
            done.fire();
            // Possible this logic for waiting for edits is wrong.
            // Wait for a max of 10s, if not done, then log an error and return.
            // Worse case scenario, we report incorrect content in the response.
            const timeoutPromise = new async_1.StatefulPromise(new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (expectedCellEdits.length) {
                        const summaryOfPendingEdits = summarizeEdits(expectedCellEdits);
                        this.logger.error(`[Notebook] Timed out waiting for cell operations to complete.`, `${summaryOfExpectedEdits}. Pending Cell Edits ${summaryOfPendingEdits}`);
                    }
                    if (expectedCellEdits.length) {
                        const summaryOfPendingEdits = summarizeTextEdits(notebook, expectedCellTextEdits);
                        this.logger.error(`[Notebook] Timed out waiting for cell text edit operations to complete.`, `${summaryOfExpectedEdits}. Pending Text Edits ${summaryOfPendingEdits}`);
                    }
                    resolve();
                }, 10_000);
                disposables.add((0, lifecycle_1.toDisposable)(() => clearTimeout(timeout)));
            }));
            await (0, async_1.raceCancellation)(Promise.race([timeoutPromise.promise, Promise.all([cellEditsApplied, textEditsApplied])]), token);
            if (token.isCancellationRequested) {
                return;
            }
            // If we timedout waiting for edit operations to complete, we don't want to return the result.
            if (timeoutPromise.isResolved) {
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart(`Notebook edited successfully. Use the ${toolNames_1.ToolName.ReadFile} file tool to get the latest content of the notebook file`)
                ]);
            }
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, EditFileResult, { document: notebook, changes: cells, languageModel: this.promptContext?.request?.model }, 
                // If we are not called with tokenization options, have _some_ fake tokenizer
                // otherwise we end up returning the entire document
                options.tokenizationOptions ?? {
                    tokenBudget: 1000,
                    countTokens: (t) => Promise.resolve(t.length * 3 / 4)
                }, token))
            ]);
        }
        catch (error) {
            if ((0, errors_1.isCancellationError)(error)) {
                failureReason = 'cancellation';
            }
            else {
                failureReason = error && error instanceof ErrorWithTelemetrySafeReason ? error.reason : 'unknown';
                failureData = error && error instanceof ErrorWithTelemetrySafeReason ? error.data : '';
            }
            throw error;
        }
        finally {
            disposables.dispose();
            if (!failureReason) {
                sendEditNotebookCellOperationsTelemetry(this.telemetryService, this.endpointProvider, options, editOperation);
            }
            sendEditNotebookToolOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, failureReason ?? 'success', failureData);
            sendEditNotebookTelemetry(this.telemetryService, this.endpointProvider, 'notebookEdit', notebookUri, this.promptContext?.requestId, options.model ?? this.promptContext?.request?.model);
        }
    }
    async resolveInput(input, promptContext) {
        this.promptContext = promptContext;
        return input;
    }
    prepareInvocation(options, token) {
        const uri = (0, toolUtils_2.resolveToolInputPath)(options.input.filePath, this.promptPathRepresentationService);
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t('Edit {0}', (0, toolUtils_1.formatUriForFileWidget)(uri)))
        };
    }
    validateInput({ editType, cellId, newCode }, notebook) {
        // Possible we'll get cellId as a number such as -1 when inserting a cell at the top.
        const id = cellId;
        const cellMap = (0, helpers_1.getCellIdMap)(notebook);
        const cell = (id && id !== 'top' && id !== 'bottom') ? cellMap.get(id) : undefined;
        if (id && id !== 'top' && id !== 'bottom' && !cell) {
            throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(id), `invalidCellId${editType}`, cellId);
        }
        switch (editType) {
            case 'insert':
                if (newCode === undefined) {
                    throw new ErrorWithTelemetrySafeReason('None of the edits were applied as newCode is required for insert operation', 'missingNewCode');
                }
                if (newCode.length && (0, notebooks_1.isJupyterNotebook)(notebook)) {
                    if (newCode.startsWith('{') && newCode.includes('"cell_type') && newCode.includes('"source') && newCode.endsWith('}')) {
                        // Possible the entire notebook JSON was provided as newCode.
                        // This is not supported.
                        throw new ErrorWithTelemetrySafeReason('When inserting cell(s) do NOT provide the entire notebook JSON as newCode. Provide the code (as plain text) for the cell instead.', 'gotEntireNotebookJson');
                    }
                }
                break;
            case 'delete':
                if (!id) {
                    throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(id), 'missingCellId', id);
                }
                break;
            case 'edit':
                if (!id) {
                    throw new ErrorWithTelemetrySafeReason(getInvalidCellErrorMessage(id), 'missingCellId', id);
                }
                if (newCode === undefined) {
                    throw new ErrorWithTelemetrySafeReason('None of the edits were applied as newCode is required for edit operation', 'missingNewCode');
                }
                if (newCode.includes(codeBlockFormattingRules_1.EXISTING_CODE_MARKER)) {
                    throw new ErrorWithTelemetrySafeReason(`When editing a cell do NOT use the marker ${codeBlockFormattingRules_1.EXISTING_CODE_MARKER} to identify existing code. Provide the full code instead.`, 'gotExistingCodeMarker');
                }
                break;
        }
    }
    fixInput(input, notebook, provider) {
        const language = input.language || (0, helpers_1.getDefaultLanguage)(notebook) || 'python'; // Default to Python if no language
        let cellId = (input.cellId || '').toString().trim();
        if (cellId.toLowerCase() === 'top') {
            cellId = 'top';
        }
        if (cellId.toLowerCase() === 'bottom') {
            cellId = 'bottom';
        }
        // If the insertion has no cell id, then treat it as bottom.
        if (input.editType === 'insert' && !cellId) {
            cellId = 'bottom';
        }
        if (cellId && cellId !== 'top' && cellId !== 'bottom') {
            cellId = (0, helpers_1.normalizeCellId)(cellId);
        }
        let newCode = input.newCode;
        if (newCode && Array.isArray(newCode)) {
            const cellEOL = getCellEOL(cellId, language, notebook);
            newCode = Array.isArray(newCode) ? newCode.join(cellEOL) : newCode;
        }
        if (input.editType === 'insert') {
            newCode = newCode ? provider.stripCellMarkers(newCode) : '';
        }
        return {
            cellId,
            newCode,
            editType: input.editType,
            language
        };
    }
    async waitForCellOperationComplete(notebook, done, expectedOutputs, disposables, token) {
        const store = disposables.add(new lifecycle_1.DisposableStore());
        return new Promise((resolve) => {
            let completed = false;
            store.add(token.onCancellationRequested(() => resolve()));
            store.add(done(() => {
                completed = true;
                if (expectedOutputs.length === 0) {
                    resolve();
                }
            }));
            store.add(this.workspaceService.onDidChangeNotebookDocument((e) => {
                if (e.notebook !== notebook) {
                    return;
                }
                expectedOutputs
                    .filter(expectedOutput => {
                    if (expectedOutput.type === 'existing') {
                        if (e.notebook === notebook && e.cellChanges.some(cell => cell.cell === expectedOutput.cell)) {
                            return true;
                        }
                        return false;
                    }
                    for (const change of e.contentChanges) {
                        if (change.removedCells.length && expectedOutput.type === 'delete' && change.removedCells.some(cell => cell === expectedOutput.cell)) {
                            return true;
                        }
                        if (change.addedCells.length && expectedOutput.type === 'insert' && change.addedCells.some(cell => cell.index === expectedOutput.index)) {
                            return true;
                        }
                    }
                    return false;
                })
                    .forEach(found => {
                    const index = expectedOutputs.findIndex(i => i === found);
                    if (index !== -1) {
                        expectedOutputs.splice(index, 1);
                    }
                });
                if (completed && expectedOutputs.length === 0) {
                    resolve();
                }
            }));
        }).finally(() => store.dispose());
    }
    async waitForCellTextEditsToComplete(done, expectedTextEdits, disposables, token) {
        const store = disposables.add(new lifecycle_1.DisposableStore());
        return new Promise((resolve) => {
            let completed = false;
            store.add(token.onCancellationRequested(() => resolve()));
            store.add(done(() => {
                completed = true;
                if (expectedTextEdits.length === 0) {
                    resolve();
                }
            }));
            store.add(this.workspaceService.onDidChangeTextDocument((e) => {
                expectedTextEdits
                    .filter(([uri, edit]) => {
                    for (const change of e.contentChanges) {
                        if (!(0, resources_1.isEqual)(e.document.uri, uri)) {
                            continue;
                        }
                        if ((0, resources_1.isEqual)(e.document.uri, uri) && (change.range.contains(edit.range) || edit.range.contains(change.range) || edit.range.isEqual(change.range))) {
                            return true;
                        }
                    }
                    return false;
                })
                    .forEach(found => {
                    const index = expectedTextEdits.findIndex(i => i[0] === found[0] && i[1] === found[1]);
                    if (index !== -1) {
                        expectedTextEdits.splice(index, 1);
                    }
                });
                if (completed && expectedTextEdits.length === 0) {
                    resolve();
                }
            }));
        }).finally(() => store.dispose());
    }
};
exports.EditNotebookTool = EditNotebookTool;
exports.EditNotebookTool = EditNotebookTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, alternativeContent_1.IAlternativeNotebookContentService),
    __param(4, logService_1.ILogService),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, endpointProvider_1.IEndpointProvider),
    __param(7, fileSystemService_1.IFileSystemService)
], EditNotebookTool);
function getInvalidCellErrorMessage(cellId) {
    if (cellId) {
        return `None of the edits were applied as provided cell id: '${cellId}' is invalid. Notebook may have been modified, try reading the Notebook file again or use the ${toolNames_1.ToolName.GetNotebookSummary} to get a list of the notebook cells, types and Cell Ids`;
    }
    return `None of the edits were applied as the cell id was not provided or was empty`;
}
function getCellEOL(cellId, language, notebook) {
    const cellMap = (0, helpers_1.getCellIdMap)(notebook);
    if (cellId && cellId !== 'top' && cellId !== 'bottom') {
        const cell = cellMap.get(cellId);
        if (cell) {
            return cell.document.eol === vscodeTypes_1.EndOfLine.LF ? '\n' : '\r\n';
        }
    }
    const cellKind = language === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code;
    const cell = notebook.getCells().find(cell => cell.kind === cellKind);
    if (cell) {
        return cell.document.eol === vscodeTypes_1.EndOfLine.LF ? '\n' : '\r\n';
    }
    return os_1.EOL;
}
function summarizeOriginalEdits(notebook, editType, cellId, edits) {
    const summary = [];
    summary.push(`Notebook ${notebook.uri.toString()}. `);
    summary.push(`Original number of cells: ${notebook.cellCount}. `);
    summary.push(`Original cell Ids: ${notebook.getCells().map(cell => (0, helpers_1.getCellId)(cell)).join(', ')}. `);
    summary.push(`Requested Edits: =>`);
    switch (editType) {
        case 'edit':
            summary.push(`Edit cell id ${cellId}`);
            break;
        case 'insert':
            summary.push(`Insert cell after ${cellId}`);
            break;
        case 'delete':
            summary.push(`Delete cell id ${cellId}`);
            break;
    }
    summary.push(`Final generated edits: =>`);
    summary.push(summarizeEdits(edits));
    return summary.join('\n');
}
function summarizeEdits(edits) {
    const summary = [];
    for (const [index, edit] of edits.entries()) {
        switch (edit.type) {
            case 'existing':
                summary.push(`${index}. Edited cell at index ${edit.index}`);
                break;
            case 'insert':
                summary.push(`${index}. Inserted cell at index ${edit.index}`);
                break;
            case 'delete':
                summary.push(`${index}. Deleted cell at index ${edit.index}`);
                break;
        }
    }
    return summary.join('\n');
}
function summarizeTextEdits(notebook, edits) {
    const summary = [];
    for (const [index, edit] of edits.entries()) {
        const cell = (0, notebooks_1.findCell)(edit[0], notebook);
        const range = `range (${edit[1].range.start.line + 1}-${edit[1].range.end.line + 1})`;
        if (cell) {
            summary.push(`${index}. Cell ${(0, helpers_1.getCellId)(cell)}, ${range} to Edit`);
        }
        else {
            summary.push(`[WARNING] ${index}. Cell Uri NOT found, ${range} to Edit (${edit[0].toString()})`);
        }
    }
    return summary.join('\n');
}
let EditFileResult = class EditFileResult extends prompt_tsx_1.PromptElement {
    constructor(props, alternativeNotebookContent, promptPathRepresentationService) {
        super(props);
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    /**
     * When cells are inserted, the model doesn't have the details of the ids of the new cells.
     * All it has is the cell ids of the cells after which the cells were inserted.
     * Its been observed that the model uses the ids of the cells that were used as args in editTool as identifiers of the new cells.
     * To try and avoid this hallucination, we need to show the cells that were inserted along with their ids.
     */
    async render(state, sizing) {
        const document = this.props.document;
        const cellsToInlucdeInSummary = [];
        if (this.props.changes.every(i => i.type !== 'insert')) {
            return vscpp(vscppf, null, "The notebook file was successfully edited.");
        }
        let previousCell;
        const existingCells = new Set(this.props.changes.filter(i => i.type === 'existing').map(i => i.cell));
        document.getCells().forEach((cell) => {
            if (existingCells.has(cell)) {
                previousCell = cell;
                return;
            }
            // This is a new cell, we need to include it in the summary.
            if (previousCell && !cellsToInlucdeInSummary.includes(cell)) {
                cellsToInlucdeInSummary.push(previousCell);
            }
            cellsToInlucdeInSummary.push(cell);
        });
        const format = this.alternativeNotebookContent.getFormat(this.props.languageModel);
        const summary = this.alternativeNotebookContent.create(format).getSummaryOfStructure(document, cellsToInlucdeInSummary, codeBlockFormattingRules_1.EXISTING_CODE_MARKER);
        return vscpp(tag_1.Tag, { name: 'some_of_the_cells_after_edit', attrs: { path: this.promptPathRepresentationService.getFilePath(document.uri) } },
            "Below is a summary of some of the inserted cells including some of the existing cells around the new cells.",
            vscpp("br", null),
            "NOTE: This is merely a summary and not the actual content of the cells nor the entire notebook.",
            vscpp("br", null),
            vscpp(safeElements_1.CodeBlock, { includeFilepath: false, languageId: format, uri: document.uri, code: summary }));
    }
};
exports.EditFileResult = EditFileResult;
exports.EditFileResult = EditFileResult = __decorate([
    __param(1, alternativeContent_1.IAlternativeNotebookContentService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], EditFileResult);
toolsRegistry_1.ToolRegistry.registerTool(EditNotebookTool);
async function sendEditNotebookTelemetry(telemetryService, endpointProvider, toolUsedToEditNotebook, resource, requestId, chatModel, endpoint) {
    const resourceHash = await (0, crypto_1.createSha256Hash)(resource.fsPath);
    const model = typeof chatModel === 'string' ? chatModel : (endpoint?.model ?? (chatModel && endpointProvider && (await endpointProvider.getChatEndpoint(chatModel)).model));
    /* __GDPR__
        "editNotebook.toolUsed" : {
            "owner": "donjayamanne",
            "comment": "Tracks the tool used to edit Notebook documents",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "resourceHash": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The hash of the resource of the current request turn. (Notebook Uri)" },
            "editTool": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Tool used to edit the notebook, one of 'notebookEdit' | 'applyPatch' | 'stringReplace' | 'newNotebookIntent' | 'editCodeIntent' | 'insertEdit' | 'createFile'" },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('editNotebook.toolUsed', { requestId, editTool: toolUsedToEditNotebook, resourceHash, model }, { isNotebook: 1 });
}
async function sendEditNotebookToolOutcomeTelemetry(telemetryService, endpointProvider, options, outcome, failureData) {
    const model = (options.model && endpointProvider && (await endpointProvider.getChatEndpoint(options.model)).model);
    /* __GDPR__
        "editNotebook.toolOutcome" : {
            "owner": "donjayamanne",
            "comment": "Tracks the tool used to edit Notebook documents",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
            "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Outcome of the edit operation" },
            "failureData": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Additional data about the failure, if any" },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('editNotebook.toolOutcome', { requestId: options.chatRequestId, outcome, model, failureData }, { isNotebook: 1 });
}
async function sendEditNotebookCellOperationsTelemetry(telemetryService, endpointProvider, options, editOperation) {
    const model = (options.model && endpointProvider && (await endpointProvider.getChatEndpoint(options.model)).model);
    /* __GDPR__
        "editNotebook.cellEditOps" : {
            "owner": "donjayamanne",
            "comment": "Tracks the tool used to edit Notebook documents",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
            "insert": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of cell inserts" },
            "delete": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of cell deletes" },
            "edit": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Number of cell edits" },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('editNotebook.cellEditOps', { requestId: options.chatRequestId, model }, {
        isNotebook: 1,
        insert: editOperation === 'insert' ? 1 : 0,
        edit: editOperation === 'edit' ? 1 : 0,
        delete: editOperation === 'delete' ? 1 : 0
    });
}
async function sendEditNotebookCellTelemetry(telemetryService, hasCodeMarker, resource, options, endpointProvider) {
    const resourceHash = await (0, crypto_1.createSha256Hash)(resource.fsPath);
    const model = options.model && (await endpointProvider.getChatEndpoint(options.model)).model;
    /* __GDPR__
        "editNotebook.editCellWithCodeMarker" : {
            "owner": "donjayamanne",
            "comment": "Tracks the presence of code markers in code when editing Notebook cells",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "resourceHash": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The hash of the resource of the current request turn. (Notebook Uri)" },
            "hasCodeMarker": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth", "comment": "Whether there any code markers are present", "isMeasurement": true },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('editNotebook.editCellWithCodeMarker', { requestId: options.chatRequestId, resourceHash, model }, { hasCodeMarker: hasCodeMarker ? 1 : 0, isNotebook: 1 });
}
// This is what we get, when using indexes, Model generates multiple tool call,
// Unfortunately this causes issues.
// Basically we can get multiple tool calls one after the other.
// However the tool has no idea whether the cell indexes relate to a previous state or latest state of notebook.
// E.g. if we have 10 cells (a,b,c,d,e,f,g,h,i,j,k), and we apply the edits based on the following individual tool calls.
// We want to delete indexes 2,3,4,6, hence expect cells c,d,e,g to be deleted.
// However after each tool call, the notebook gets updated hence indexes shift.
// As a result we end up deleting cells c,e,g,j.
// Given indexes are not stable, we need to use cell ids.
// This way if a cell is deleted and the id is incorrect, we can throw an error and model will request the latest state of the notebook.
// Where as using indexes we could end up deleting/updating the wrong cells.
/**
## Response
### Assistant
````md

🛠️ edit_notebook_file (call_j3TEKk5R0KHfMYhJo1x88QeS) {
    "filePath": "/Users/donjayamanne/demo/chat/sample.ipynb",
    "cellIndex": 2,
    "editType": "delete"
}
🛠️ edit_notebook_file (call_Gv6WxrMzSIDMPE0lqqM3GbWo) {
    "filePath": "/Users/donjayamanne/demo/chat/sample.ipynb",
    "cellIndex": 3,
    "editType": "delete"
}
🛠️ edit_notebook_file (call_iPokgpiaeYDV7JwnbAFgdgZD) {
    "filePath": "/Users/donjayamanne/demo/chat/sample.ipynb",
    "cellIndex": 4,
    "editType": "delete"
}
🛠️ edit_notebook_file (call_8t3Ls4C3QLVDAeFXwU1dE7Hh) {
    "filePath": "/Users/donjayamanne/demo/chat/sample.ipynb",
    "cellIndex": 6,
    "editType": "delete"
}
````
 */
//# sourceMappingURL=editNotebookTool.js.map