"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const logService_1 = require("../../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const helpers_1 = require("../../../../platform/notebook/common/helpers");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const notebookDocument_1 = require("../../../../util/common/test/shims/notebookDocument");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const editNotebookTool_1 = require("../editNotebookTool");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
(0, vitest_1.describe)('Edit Notebook Tool', () => {
    const disposables = new lifecycle_1.DisposableStore();
    (0, vitest_1.afterAll)(() => {
        disposables.clear();
    });
    function initialize(notebook) {
        const accessor = disposables.add((0, services_1.createExtensionUnitTestingServices)()).createTestingAccessor();
        const workspaceService = disposables.add(new testWorkspaceService_1.TestWorkspaceService([], [], [notebook]));
        const editTool = new editNotebookTool_1.EditNotebookTool(new promptPathRepresentationService_1.PromptPathRepresentationService(), accessor.get(instantiation_1.IInstantiationService), workspaceService, accessor.get(alternativeContent_1.IAlternativeNotebookContentService), accessor.get(logService_1.ILogService), accessor.get(telemetry_1.ITelemetryService), accessor.get(endpointProvider_1.IEndpointProvider), accessor.get(fileSystemService_1.IFileSystemService));
        return [editTool, workspaceService];
    }
    async function waitForEditCount(count, notebookEdits) {
        await new Promise((resolve) => {
            const check = () => {
                if (notebookEdits.length >= count) {
                    resolve();
                }
                else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }
    async function invokeOneTool(notebook, editTool, editsToPerform, notebookEdits) {
        const options = { input: editsToPerform, toolInvocationToken: undefined };
        const stream = {
            notebookEdit(target, edits) {
                if (edits === true) {
                    return;
                }
                edits = Array.isArray(edits) ? edits : [edits];
                if (edits.length === 0) {
                    return;
                }
                notebookEdits.push(...edits);
                notebookDocument_1.ExtHostNotebookDocumentData.applyEdits(notebook, edits);
            },
            textEdit(target, edits) {
                if (edits === true) {
                    return;
                }
                edits = Array.isArray(edits) ? edits : [edits];
                if (edits.length === 0) {
                    return;
                }
                for (const edit of edits) {
                    notebookEdits.push([target, edit]);
                }
            }
        };
        await editTool.resolveInput(options.input, { stream });
        return editTool.invoke(options, cancellation_1.CancellationToken.None);
    }
    async function invokeTool(notebook, editTool, editsToPerform, notebookEdits) {
        // all all editsToPerformn in sequence
        for (const edit of editsToPerform) {
            await invokeOneTool(notebook, editTool, edit, notebookEdits);
        }
    }
    function createNotebook() {
        const cells = [
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# This is a sample notebook', 'markdown'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '# Imports\nimport sys\nimport os\nimport pandas as pd', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '', 'python'),
            new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, `data = {'Name': ['Tom', 'nick', 'krish', 'jack'],'Age': [20, 21, 19, 18]}\ndf = pd.DataFrame(data)\nprint(df)`, 'python'),
        ];
        const notebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('notebook.ipynb'), new vscodeTypes_1.NotebookData(cells), 'jupyter-notebook');
        return notebook;
    }
    (0, vitest_1.test)(`Insert a cell at the top`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const promise = invokeTool(notebook, editTool, [{ filePath: notebook.uri.toString(), editType: 'insert', newCode: 'print(1)', language: 'python', cellId: 'top' }], notebookEdits);
        await waitForEditCount(1, notebookEdits);
        workspaceService.didChangeNotebookDocumentEmitter.fire({
            cellChanges: [],
            contentChanges: [{
                    addedCells: [
                        { index: 0 },
                    ],
                    removedCells: [],
                    range: new vscodeTypes_1.NotebookRange(0, 0),
                }
            ],
            metadata: undefined,
            notebook: notebook.document,
        });
        await promise;
        (0, vitest_1.expect)(notebookEdits.length).to.equal(1);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        const edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(0);
        (0, vitest_1.expect)(edit.range.end).to.equal(0);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal(`print(1)`);
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert 3 cells at the bottom`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellCount = notebook.document.cellCount;
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: 'Insert markdown header cell at the bottom', cellId: 'bottom' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: 'Insert first Python code cell at the bottom', cellId: 'bottom' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: 'Insert second Python code cell at the bottom', cellId: 'bottom' }
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: cellCount + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert 3 cells at the bottom (BOTTOM id)`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellCount = notebook.document.cellCount;
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: 'BOTTOM' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: 'BOTTOM' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: 'BOTTOM' },
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: cellCount + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert 1 cells at the bottom (with cell id for first insertion)`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellCount = notebook.document.cellCount;
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(cellCount - 1)) },
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: cellCount + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(1);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        const edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
    });
    (0, vitest_1.test)(`Insert 3 cells at the bottom (with cell id for all insertions)`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellCount = notebook.document.cellCount;
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' }
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            cellEdits[i].cellId = (0, helpers_1.getCellId)(notebook.document.cellAt(cellCount - 1 + i));
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: cellCount + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.range.end).to.equal(cellCount + 2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert a cell after the first cell`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const promise = invokeTool(notebook, editTool, [{ filePath: notebook.uri.toString(), editType: 'insert', newCode: 'print(1234)', language: 'python', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(0)) }], notebookEdits);
        await waitForEditCount(1, notebookEdits);
        workspaceService.didChangeNotebookDocumentEmitter.fire({
            cellChanges: [],
            contentChanges: [{
                    addedCells: [
                        { index: 1 },
                    ],
                    removedCells: [],
                    range: new vscodeTypes_1.NotebookRange(0, 0),
                }
            ],
            metadata: undefined,
            notebook: notebook.document,
        });
        await promise;
        (0, vitest_1.expect)(notebookEdits.length).to.equal(1);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        const edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(1);
        (0, vitest_1.expect)(edit.range.end).to.equal(1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
    });
    (0, vitest_1.test)(`Insert 3 cells after the first cell`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' }
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            cellEdits[i].cellId = (0, helpers_1.getCellId)(notebook.document.cellAt(i));
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: i + 1 },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(1);
        (0, vitest_1.expect)(edit.range.end).to.equal(1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(2);
        (0, vitest_1.expect)(edit.range.end).to.equal(2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(3);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert 3 cells after the third cell`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' }
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            cellEdits[i].cellId = (0, helpers_1.getCellId)(notebook.document.cellAt(2 + i));
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: 3 + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(3);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Markup);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(4);
        (0, vitest_1.expect)(edit.range.end).to.equal(4);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(5);
        (0, vitest_1.expect)(edit.range.end).to.equal(5);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
        (0, vitest_1.expect)(edit.newCells[0].kind).to.equal(vscodeTypes_1.NotebookCellKind.Code);
    });
    (0, vitest_1.test)(`Insert 3 cells after the last cell`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const count = notebook.document.cellCount;
        const cellEdits = [
            { editType: 'insert', newCode: '# header', language: 'markdown', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.uri.toString(), explanation: '', cellId: '' }
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            cellEdits[i].cellId = (0, helpers_1.getCellId)(notebook.document.cellAt(notebook.document.cellCount - 1));
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: count + i },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0)
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(count);
        (0, vitest_1.expect)(edit.range.end).to.equal(count);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('# header');
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(count + 1);
        (0, vitest_1.expect)(edit.range.end).to.equal(count + 1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(1)');
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(count + 2);
        (0, vitest_1.expect)(edit.range.end).to.equal(count + 2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal('print(2)');
    });
    (0, vitest_1.test)(`Insert a cell after the first cell (use notebook cell Uri)`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const promise = invokeTool(notebook, editTool, [{ filePath: notebook.document.cellAt(0).document.uri.toString(), editType: 'insert', newCode: 'print(1234)', language: 'python', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(0)) }], notebookEdits);
        await waitForEditCount(1, notebookEdits);
        workspaceService.didChangeNotebookDocumentEmitter.fire({
            cellChanges: [],
            contentChanges: [{
                    addedCells: [
                        { index: 1 },
                    ],
                    removedCells: [],
                    range: new vscodeTypes_1.NotebookRange(0, 0),
                }
            ],
            metadata: undefined,
            notebook: notebook.document,
        });
        await promise;
        (0, vitest_1.expect)(notebookEdits.length).to.equal(1);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        const edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(1);
        (0, vitest_1.expect)(edit.range.end).to.equal(1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
    });
    (0, vitest_1.test)(`Insert 3 cells after the first cell (use notebook cell Uri)`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cellEdits = [
            { editType: 'insert', newCode: 'print(1)', language: 'python', filePath: notebook.document.cellAt(0).document.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(2)', language: 'python', filePath: notebook.document.cellAt(0).document.uri.toString(), explanation: '', cellId: '' },
            { editType: 'insert', newCode: 'print(3)', language: 'python', filePath: notebook.document.cellAt(0).document.uri.toString(), explanation: '', cellId: '' },
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            cellEdits[i].cellId = (0, helpers_1.getCellId)(notebook.document.cellAt(i));
            cellEdits[i].filePath = notebook.document.cellAt(i).document.uri.toString();
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [
                            { index: i + 1 },
                        ],
                        removedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(3);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(1);
        (0, vitest_1.expect)(edit.range.end).to.equal(1);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal(`print(1)`);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(2);
        (0, vitest_1.expect)(edit.range.end).to.equal(2);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal(`print(2)`);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(3);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(1);
        (0, vitest_1.expect)(edit.newCells[0].value).to.equal(`print(3)`);
    });
    (0, vitest_1.test)(`Delete 4 cells`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const removedCells = [
            notebook.document.cellAt(2),
            notebook.document.cellAt(3),
            notebook.document.cellAt(4),
            notebook.document.cellAt(6),
        ];
        const cellEdits = [
            { editType: 'delete', filePath: notebook.uri.toString(), explanation: '', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(2)) },
            { editType: 'delete', filePath: notebook.uri.toString(), explanation: '', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(3)) },
            { editType: 'delete', filePath: notebook.uri.toString(), explanation: '', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(4)) },
            { editType: 'delete', filePath: notebook.uri.toString(), explanation: '', cellId: (0, helpers_1.getCellId)(notebook.document.cellAt(6)) },
        ];
        for (let i = 0; i < cellEdits.length; i++) {
            const promise = invokeTool(notebook, editTool, [cellEdits[i]], notebookEdits);
            await waitForEditCount(i + 1, notebookEdits);
            // Fire event for the added cell
            workspaceService.didChangeNotebookDocumentEmitter.fire({
                cellChanges: [],
                contentChanges: [{
                        addedCells: [],
                        removedCells: [
                            removedCells[i],
                        ],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                    }],
                metadata: undefined,
                notebook: notebook.document,
            });
            await promise;
        }
        (0, vitest_1.expect)(notebookEdits.length).to.equal(4);
        (0, vitest_1.expect)(notebookEdits[0]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        let edit = notebookEdits[0];
        (0, vitest_1.expect)(edit.range.start).to.equal(2);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(0);
        (0, vitest_1.expect)(notebookEdits[1]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[1];
        (0, vitest_1.expect)(edit.range.start).to.equal(2);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(0);
        (0, vitest_1.expect)(notebookEdits[2]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[2];
        (0, vitest_1.expect)(edit.range.start).to.equal(2);
        (0, vitest_1.expect)(edit.range.end).to.equal(3);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(0);
        (0, vitest_1.expect)(notebookEdits[3]).to.be.instanceOf(vscodeTypes_1.NotebookEdit);
        edit = notebookEdits[3];
        (0, vitest_1.expect)(edit.range.start).to.equal(3);
        (0, vitest_1.expect)(edit.range.end).to.equal(4);
        (0, vitest_1.expect)(edit.newCells.length).to.equal(0);
    });
    (0, vitest_1.test)(`Update empty cell`, async () => {
        const notebookEdits = [];
        const notebook = createNotebook();
        const [editTool, workspaceService] = initialize(notebook.document);
        const cell2 = notebook.document.cellAt(2);
        const promise = invokeTool(notebook, editTool, [
            { filePath: notebook.uri.toString(), editType: 'edit', cellId: (0, helpers_1.getCellId)(cell2), newCode: 'print("Foo Bar")' }
        ], notebookEdits);
        await waitForEditCount(1, notebookEdits);
        workspaceService.didChangeTextDocumentEmitter.fire({
            document: cell2.document,
            contentChanges: [
                {
                    range: new vscodeTypes_1.Range(0, 0, 0, 0),
                    rangeLength: 0,
                    rangeOffset: 0,
                    text: 'print("Foo Bar")',
                }
            ],
            reason: undefined,
        });
        workspaceService.didChangeNotebookDocumentEmitter.fire({
            cellChanges: [
                {
                    cell: cell2,
                    document: cell2.document,
                    metadata: undefined,
                    outputs: [],
                    executionSummary: undefined,
                }
            ],
            contentChanges: [{
                    addedCells: [],
                    removedCells: [],
                    range: new vscodeTypes_1.NotebookRange(0, 0),
                }],
            metadata: undefined,
            notebook: notebook.document,
        });
        await promise;
        (0, vitest_1.expect)(notebookEdits.length).to.equal(1);
        const edit = notebookEdits[0];
        (0, vitest_1.expect)(edit[0].toString()).to.equal(cell2.document.uri.toString());
        (0, vitest_1.expect)(edit[1].newText).to.include('print("Foo Bar")');
    });
});
//# sourceMappingURL=editNotebookTool.spec.js.map