"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vscodeTypes_1 = require("../../../vscodeTypes");
const vitest_1 = require("vitest");
const notebookDocument_1 = require("./shims/notebookDocument");
const uri_1 = require("../../vs/base/common/uri");
const notebooks_1 = require("../notebooks");
(0, vitest_1.describe)('Notebook Common', () => {
    (0, vitest_1.it)('Does not find notebook', async () => {
        const notebooks = createSampleNotebooks();
        vitest_1.assert.isUndefined((0, notebooks_1.findNotebook)(vscodeTypes_1.Uri.file('foo.ipynb'), notebooks));
    });
    (0, vitest_1.it)('Finds a notebook', async () => {
        const notebooks = createSampleNotebooks();
        vitest_1.assert.isObject((0, notebooks_1.findNotebook)(vscodeTypes_1.Uri.file('one.ipynb'), notebooks));
    });
    (0, vitest_1.it)('Finds a notebook', async () => {
        const notebooks = createSampleNotebooks();
        for (const notebook of notebooks) {
            for (const cell of notebook.getCells()) {
                const info = (0, notebooks_1.getNotebookAndCellFromUri)(cell.document.uri, notebooks);
                vitest_1.assert.equal(info[0], notebook);
                vitest_1.assert.equal(info[1], cell);
                vitest_1.assert.equal((0, notebooks_1.findCell)(cell.document.uri, notebook), cell);
                vitest_1.assert.equal((0, notebooks_1.findNotebook)(cell.document.uri, notebooks), notebook);
                vitest_1.assert.isUndefined((0, notebooks_1.getNotebookCellOutput)(cell.document.uri, notebooks));
            }
        }
    });
    function createSampleNotebooks() {
        return [
            notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.ipynb'), new vscodeTypes_1.NotebookData(createCells([['markdown', '# Hello'], ['markdown', '# Foo Bar'], ['code', 'print(1234)']])), 'jupyter-notebook').document,
            notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('two.ipynb'), new vscodeTypes_1.NotebookData(createCells([['markdown', '# Title'], ['code', 'import sys'], ['code', 'sys.executable']])), 'jupyter-notebook').document,
            notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('three.ipynb').with({ scheme: 'ssh' }), new vscodeTypes_1.NotebookData(createCells([['markdown', '# Title'], ['code', 'import sys'], ['code', 'sys.executable']])), 'jupyter-notebook').document,
        ];
    }
    function createCells(cells) {
        return cells.map(([kind, code]) => {
            return new vscodeTypes_1.NotebookCellData(kind === 'markdown' ? vscodeTypes_1.NotebookCellKind.Markup : vscodeTypes_1.NotebookCellKind.Code, code, kind === 'markdown' ? 'markdown' : 'python');
        });
    }
});
//# sourceMappingURL=notebooks.spec.js.map