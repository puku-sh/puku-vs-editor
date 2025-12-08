"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const notebookDocument_1 = require("../../../../util/common/test/shims/notebookDocument");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const uri_1 = require("../../../../util/vs/base/common/uri");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const alternativeNotebookTextDocument_1 = require("../../common/alternativeNotebookTextDocument");
(0, vitest_1.describe)('Alternative Notebook (text) Content', () => {
    const disposables = new lifecycle_1.DisposableStore();
    (0, vitest_1.afterAll)(() => {
        disposables.clear();
    });
    function createNotebook(cells, withMarkdownCells = false) {
        const notebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('notebook.ipynb'), new vscodeTypes_1.NotebookData(cells), 'jupyter-notebook');
        const altDocSnapshot = (0, alternativeNotebookTextDocument_1.createAlternativeNotebookDocumentSnapshot)(notebook.document, !withMarkdownCells);
        const altDoc = (0, alternativeNotebookTextDocument_1.createAlternativeNotebookDocument)(notebook.document, !withMarkdownCells);
        (0, vitest_1.expect)(altDocSnapshot.getText()).toBe(altDoc.getText());
        return { notebookData: notebook, notebook: notebook.document, altDocSnapshot, altDoc };
    }
    [true, false].forEach(withMarkdownCells => {
        (0, vitest_1.describe)(`Alt Content ${withMarkdownCells ? 'with' : 'without'} Markdown Cells`, () => {
            (0, vitest_1.test)(`Generate Alt Content`, async () => {
                const cells = [
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
                ];
                const { altDocSnapshot } = createNotebook(cells, withMarkdownCells);
                (0, vitest_1.expect)(altDocSnapshot.getText()).toMatchSnapshot();
            });
            (0, vitest_1.test)(`No Content`, async () => {
                const { altDocSnapshot } = createNotebook([], withMarkdownCells);
                (0, vitest_1.expect)(altDocSnapshot.getText()).toMatchSnapshot();
            });
            (0, vitest_1.test)(`No Content without code cells`, async () => {
                const cells = [
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# This is a sample notebook', 'markdown'),
                ];
                const { altDocSnapshot } = createNotebook(cells, withMarkdownCells);
                (0, vitest_1.expect)(altDocSnapshot.getText()).toMatchSnapshot();
            });
            (0, vitest_1.test)(`With Markdown Cells`, async () => {
                const cells = [
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# This is a sample notebook', 'markdown'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '## Header', 'markdown'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, 'Comments', 'markdown'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ];
                const { altDocSnapshot } = createNotebook(cells, withMarkdownCells);
                (0, vitest_1.expect)(altDocSnapshot.getText()).toMatchSnapshot();
            });
            (0, vitest_1.test)(`EOLs`, async () => {
                const cells = [
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import sys\nimport os', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import pandas\r\nimport requests', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\r\nprint("Foo Bar")\r\nprint("Bar Baz")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print(sys.executable)\nprint(sys.version)', 'python'),
                ];
                const { altDocSnapshot } = createNotebook(cells, withMarkdownCells);
                (0, vitest_1.expect)(altDocSnapshot.getText()).toMatchSnapshot();
                (0, vitest_1.expect)(altDocSnapshot.getText()).not.toContain('\r\n'); // Ensure no CRLF, only LF
                (0, vitest_1.expect)(altDocSnapshot.getText()).toContain('\n'); // Ensure no CRLF, only LF
            });
        });
    });
    (0, vitest_1.describe)('Position Mapping', () => {
        (0, vitest_1.test)(`All cells have same EOL`, async () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import sys\nimport os', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import pandas\nimport requests', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print(sys.executable)\nprint(sys.version)', 'python'),
            ];
            const { notebook, altDocSnapshot } = createNotebook(cells);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 53))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 53))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 1, 0))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(53, 53)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 59))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 59))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 1, 6))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(53, 59)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 64))).toBe('import sys\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 64))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 0))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 1, 0)])).toEqual([new offsetRange_1.OffsetRange(53, 64)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 73))).toBe('import sys\nimport os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 73))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 9))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(53, 73)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 74))).toBe('import sys\nimport os\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 74))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 3, 0))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(53, 73)]);
            // Translating alt text range across cells will only return contents of one cell.
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 140))).toBe('import sys\nimport os\n#%% vscode.cell [id=#VSC-bdb3864a] [language=python]\nimport pandas');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 140))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 4, 13))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(71, 73))).toBe('os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(71, 73))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(2, 7, 2, 9))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(1, 7, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(71, 73)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(127, 127))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(127, 127))).toEqual([[notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 0, 4, 0))).toEqual([[notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(1), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(127, 127)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(127, 133))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(127, 133))).toEqual([[notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 0, 4, 6))).toEqual([[notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(1), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(127, 133)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 258))).toBe('pandas\nimport requests\n#%% vscode.cell [id=#VSC-8862d4f3] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(134, 258))).toEqual([
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 7, 9, 10))).toEqual([
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 156))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(notebook.cellAt(1).document.getText(new vscodeTypes_1.Range(0, 7, 1, 15))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(1), [new vscodeTypes_1.Range(0, 7, 1, 15)])).toEqual([new offsetRange_1.OffsetRange(134, 156)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 258))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(notebook.cellAt(2).document.getText(new vscodeTypes_1.Range(0, 0, 2, 10))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 2, 10)])).toEqual([new offsetRange_1.OffsetRange(210, 258)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 265))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(210, 265))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(7, 0, 10, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 2, 16)])).toEqual([new offsetRange_1.OffsetRange(210, 264)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(318, 358))).toBe('print(sys.executable)\nprint(sys.version)');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(318, 358))).toEqual([[notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(11, 0, 12, 18))).toEqual([[notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(3), [new vscodeTypes_1.Range(0, 0, 1, 18)])).toEqual([new offsetRange_1.OffsetRange(318, 358)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(60, 349))).toBe('sys\nimport os\n#%% vscode.cell [id=#VSC-bdb3864a] [language=python]\nimport pandas\nimport requests\n#%% vscode.cell [id=#VSC-8862d4f3] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n#%% vscode.cell [id=#VSC-e07487cb] [language=python]\nprint(sys.executable)\nprint(sys');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(60, 349))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 7, 12, 9))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
        });
        (0, vitest_1.test)(`All cells have same EOL (with MD cells excluded)`, async () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# This is a sample notebook', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '## Header', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import sys\nimport os', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, 'Comments', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import pandas\nimport requests', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print(sys.executable)\nprint(sys.version)', 'python'),
            ];
            const { notebook, altDocSnapshot } = createNotebook(cells);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 53))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 53))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 1, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(53, 53)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 59))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 59))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 1, 6))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(53, 59)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 64))).toBe('import sys\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 64))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 0)])).toEqual([new offsetRange_1.OffsetRange(53, 64)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 73))).toBe('import sys\nimport os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 73))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 9))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(53, 73)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 74))).toBe('import sys\nimport os\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 74))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 3, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(53, 73)]);
            // Translating alt text range across cells will only return contents of one cell.
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 140))).toBe('import sys\nimport os\n#%% vscode.cell [id=#VSC-53ab90bb] [language=python]\nimport pandas');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 140))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 4, 13))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(71, 73))).toBe('os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(71, 73))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(2, 7, 2, 9))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(1, 7, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(71, 73)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(127, 127))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(127, 127))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 0, 4, 0))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(127, 127)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(127, 133))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(127, 133))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 0, 4, 6))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(127, 133)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 258))).toBe('pandas\nimport requests\n#%% vscode.cell [id=#VSC-749a8f95] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(134, 258))).toEqual([
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 7, 9, 10))).toEqual([
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 156))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(notebook.cellAt(4).document.getText(new vscodeTypes_1.Range(0, 7, 1, 15))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 7, 1, 15)])).toEqual([new offsetRange_1.OffsetRange(134, 156)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 258))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(notebook.cellAt(5).document.getText(new vscodeTypes_1.Range(0, 0, 2, 10))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(5), [new vscodeTypes_1.Range(0, 0, 2, 10)])).toEqual([new offsetRange_1.OffsetRange(210, 258)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 265))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(210, 265))).toEqual([[notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(7, 0, 10, 0))).toEqual([[notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(5), [new vscodeTypes_1.Range(0, 0, 2, 16)])).toEqual([new offsetRange_1.OffsetRange(210, 264)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(318, 358))).toBe('print(sys.executable)\nprint(sys.version)');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(318, 358))).toEqual([[notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(11, 0, 12, 18))).toEqual([[notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(6), [new vscodeTypes_1.Range(0, 0, 1, 18)])).toEqual([new offsetRange_1.OffsetRange(318, 358)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(60, 349))).toBe('sys\nimport os\n#%% vscode.cell [id=#VSC-53ab90bb] [language=python]\nimport pandas\nimport requests\n#%% vscode.cell [id=#VSC-749a8f95] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n#%% vscode.cell [id=#VSC-d2139a72] [language=python]\nprint(sys.executable)\nprint(sys');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(60, 349))).toEqual([
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 7, 12, 9))).toEqual([
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
        });
        (0, vitest_1.test)(`All cells have same EOL (with MD cells included)`, async () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# This is a sample notebook', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '## Header\n### Sub Heading', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import sys\nimport os', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, 'Comments', 'markdown'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import pandas\nimport requests', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print(sys.executable)\nprint(sys.version)', 'python'),
            ];
            const { notebook, altDocSnapshot } = createNotebook(cells, true);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(59, 59))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(59, 59))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(2, 0, 2, 0))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(59, 59)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(59, 65))).toBe('# This');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(59, 65))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(2, 0, 2, 6))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(59, 65)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(233, 244))).toBe('import sys\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(233, 244))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(10, 0, 11, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 0)])).toEqual([new offsetRange_1.OffsetRange(233, 244)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(233, 253))).toBe('import sys\nimport os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(233, 253))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(10, 0, 11, 9))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(233, 253)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(233, 254))).toBe('import sys\nimport os\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(233, 254))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(10, 0, 12, 0))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(233, 253)]);
            // Translating alt text range across cells will only return contents of one cell.
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 254))).toBe(']\n"""\n# This is a sample notebook\n"""\n#%% vscode.cell [id=#VSC-bdb3864a] [language=markdown]\n"""\n## Header\n### Sub Heading\n"""\n#%% vscode.cell [id=#VSC-8862d4f3] [language=python]\nimport sys\nimport os\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 254))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 27)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 11, 13))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 27)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(251, 253))).toBe('os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(251, 253))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(11, 7, 11, 9))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(1, 7, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(251, 253)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(379, 379))).toBe('');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(379, 379))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(17, 0, 17, 0))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 0, 0, 0)])).toEqual([new offsetRange_1.OffsetRange(379, 379)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(379, 385))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(379, 385))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(17, 0, 17, 6))).toEqual([[notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(379, 385)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(386, 510))).toBe('pandas\nimport requests\n#%% vscode.cell [id=#VSC-749a8f95] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(386, 510))).toEqual([
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(17, 7, 22, 10))).toEqual([
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(386, 408))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(notebook.cellAt(4).document.getText(new vscodeTypes_1.Range(0, 7, 1, 15))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(4), [new vscodeTypes_1.Range(0, 7, 1, 15)])).toEqual([new offsetRange_1.OffsetRange(386, 408)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(462, 510))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(notebook.cellAt(5).document.getText(new vscodeTypes_1.Range(0, 0, 2, 10))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(5), [new vscodeTypes_1.Range(0, 0, 2, 10)])).toEqual([new offsetRange_1.OffsetRange(462, 510)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(462, 517))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(462, 517))).toEqual([[notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(20, 0, 23, 0))).toEqual([[notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(5), [new vscodeTypes_1.Range(0, 0, 2, 16)])).toEqual([new offsetRange_1.OffsetRange(462, 516)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(570, 610))).toBe('print(sys.executable)\nprint(sys.version)');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(570, 610))).toEqual([[notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(24, 0, 25, 18))).toEqual([[notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(6), [new vscodeTypes_1.Range(0, 0, 1, 18)])).toEqual([new offsetRange_1.OffsetRange(570, 610)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(240, 601))).toBe('sys\nimport os\n#%% vscode.cell [id=#VSC-e07487cb] [language=markdown]\n"""\nComments\n"""\n#%% vscode.cell [id=#VSC-53ab90bb] [language=python]\nimport pandas\nimport requests\n#%% vscode.cell [id=#VSC-749a8f95] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n#%% vscode.cell [id=#VSC-d2139a72] [language=python]\nprint(sys.executable)\nprint(sys');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(240, 601))).toEqual([
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 0, 8)],
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(10, 7, 25, 9))).toEqual([
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 0, 8)],
                [notebook.cellAt(4), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(5), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(106, 177))).toEqual([[notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(24, 0, 25, 18))).toEqual([[notebook.cellAt(6), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(6), [new vscodeTypes_1.Range(0, 0, 1, 18)])).toEqual([new offsetRange_1.OffsetRange(570, 610)]);
        });
        (0, vitest_1.test)(`All Cells have different EOLs`, async () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import sys\nimport os', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'import pandas\r\nimport requests', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\r\nprint("Foo Bar")\r\nprint("Bar Baz")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print(sys.executable)\nprint(sys.version)', 'python'),
            ];
            const { notebook, altDocSnapshot } = createNotebook(cells);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 59))).toBe('import');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 59))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 1, 6))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 0, 6)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 0, 6)])).toEqual([new offsetRange_1.OffsetRange(53, 59)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 64))).toBe('import sys\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 64))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 0))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 0)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 1, 0)])).toEqual([new offsetRange_1.OffsetRange(53, 64)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 74))).toBe('import sys\nimport os\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 74))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 0, 2, 9))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(0, 0, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(53, 73)]);
            // Translating alt text range across cells will only return contents of one cell.
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(53, 140))).toBe('import sys\nimport os\n#%% vscode.cell [id=#VSC-bdb3864a] [language=python]\nimport pandas');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(53, 140))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(0, 0, 4, 13))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(0, 0, 1, 9)], [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 0, 13)]]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(71, 73))).toBe('os');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(71, 73))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(2, 7, 2, 9))).toEqual([[notebook.cellAt(0), new vscodeTypes_1.Range(1, 7, 1, 9)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(0), [new vscodeTypes_1.Range(1, 7, 1, 9)])).toEqual([new offsetRange_1.OffsetRange(71, 73)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 258))).toBe('pandas\nimport requests\n#%% vscode.cell [id=#VSC-8862d4f3] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(134, 258))).toEqual([
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(4, 7, 9, 10))).toEqual([
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 7, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 10)],
            ]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(134, 156))).toBe('pandas\nimport requests');
            (0, vitest_1.expect)(notebook.cellAt(1).document.getText(new vscodeTypes_1.Range(0, 7, 1, 15))).toBe('pandas\r\nimport requests');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(1), [new vscodeTypes_1.Range(0, 7, 1, 15)])).toEqual([new offsetRange_1.OffsetRange(134, 156)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 258))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar');
            (0, vitest_1.expect)(notebook.cellAt(2).document.getText(new vscodeTypes_1.Range(0, 0, 2, 10))).toBe('print("Hello World")\r\nprint("Foo Bar")\r\nprint("Bar');
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 2, 10)])).toEqual([new offsetRange_1.OffsetRange(210, 258)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(210, 265))).toBe('print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(210, 265))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(7, 0, 9, 16))).toEqual([[notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(2), [new vscodeTypes_1.Range(0, 0, 2, 16)])).toEqual([new offsetRange_1.OffsetRange(210, 264)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(318, 358))).toBe('print(sys.executable)\nprint(sys.version)');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(318, 358))).toEqual([[notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(11, 0, 12, 18))).toEqual([[notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 18)]]);
            (0, vitest_1.expect)(altDocSnapshot.toAltOffsetRange(notebook.cellAt(3), [new vscodeTypes_1.Range(0, 0, 1, 18)])).toEqual([new offsetRange_1.OffsetRange(318, 358)]);
            (0, vitest_1.expect)(altDocSnapshot.getText(new offsetRange_1.OffsetRange(60, 349))).toBe('sys\nimport os\n#%% vscode.cell [id=#VSC-bdb3864a] [language=python]\nimport pandas\nimport requests\n#%% vscode.cell [id=#VSC-8862d4f3] [language=python]\nprint("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\n#%% vscode.cell [id=#VSC-e07487cb] [language=python]\nprint(sys.executable)\nprint(sys');
            (0, vitest_1.expect)(altDocSnapshot.fromAltOffsetRange(new offsetRange_1.OffsetRange(60, 349))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
            (0, vitest_1.expect)(altDocSnapshot.fromAltRange(new vscodeTypes_1.Range(1, 7, 12, 9))).toEqual([
                [notebook.cellAt(0), new vscodeTypes_1.Range(0, 7, 1, 9)],
                [notebook.cellAt(1), new vscodeTypes_1.Range(0, 0, 1, 15)],
                [notebook.cellAt(2), new vscodeTypes_1.Range(0, 0, 2, 16)],
                [notebook.cellAt(3), new vscodeTypes_1.Range(0, 0, 1, 9)]
            ]);
        });
    });
    (0, vitest_1.describe)('Cell Content Changes', () => {
        (0, vitest_1.describe)('Cell with 1 line', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const newDoc = altDocSnapshot.withCellChanges(e.document, e.contentChanges);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookCellChangeEdit)(altDocSnapshot, e.document, e.contentChanges);
                const updatedAltText = newDoc.getText();
                altDoc.applyCellChanges(e.document, e.contentChanges);
                // Verify the alt text is updated correctly
                (0, vitest_1.expect)(updatedAltText).toBe(edit.apply(altDocSnapshot.getText()));
                (0, vitest_1.expect)(updatedAltText).toBe(altDoc.getText());
                return updatedAltText;
            }
            (0, vitest_1.test)(`replace line`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 0, 0, 20),
                            rangeOffset: 0,
                            rangeLength: 20,
                            text: '# Top level imports',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with smaller text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'Foo Bar',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with larger text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'This is a longer piece of text',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace while inserting a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 20),
                            rangeOffset: 7,
                            rangeLength: 13,
                            text: 'Foo Bar")\nprint("Another line")\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 0, 20),
                            rangeOffset: 20,
                            rangeLength: 0,
                            text: '\nprint("Another line")\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
        });
        (0, vitest_1.describe)('Cell with multiple line (crlf)', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\r\nprint("Foo Bar")\r\nprint("Bar Baz")\r\nprint("Something Else")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const newDoc = altDocSnapshot.withCellChanges(e.document, e.contentChanges);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookCellChangeEdit)(altDocSnapshot, e.document, e.contentChanges);
                const updatedAltText = newDoc.getText();
                altDoc.applyCellChanges(e.document, e.contentChanges);
                // Verify the alt text is updated correctly
                (0, vitest_1.expect)(updatedAltText).toBe(edit.apply(altDocSnapshot.getText()));
                (0, vitest_1.expect)(updatedAltText).toBe(altDoc.getText());
                return updatedAltText;
            }
            (0, vitest_1.test)(`replace line`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 0, 0, 20),
                            rangeOffset: 0,
                            rangeLength: 20,
                            text: '# Top level imports',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace multiple lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(1, 7, 1, 14),
                            rangeOffset: 29,
                            rangeLength: 7,
                            text: 'Say Something',
                        }, {
                            range: new vscodeTypes_1.Range(0, 0, 0, 20),
                            rangeOffset: 0,
                            rangeLength: 20,
                            text: '# Top level print statements',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with smaller text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'Foo Bar',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with larger text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'This is a longer piece of text',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace while inserting a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 20),
                            rangeOffset: 7,
                            rangeLength: 13,
                            text: 'Foo Bar")\r\nprint("Another line")\r\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 0, 20),
                            rangeOffset: 20,
                            rangeLength: 0,
                            text: '\nprint("Another line")\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove a line`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 1, 16),
                            rangeOffset: 20,
                            rangeLength: 18,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove two lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 2, 16),
                            rangeOffset: 20,
                            rangeLength: 36,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`merge two lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 1, 0),
                            rangeOffset: 20,
                            rangeLength: 2,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
        });
        (0, vitest_1.describe)('Cell with multiple line (lf)', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\nprint("Foo Bar")\nprint("Bar Baz")\nprint("Something Else")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const newDoc = altDocSnapshot.withCellChanges(e.document, e.contentChanges);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookCellChangeEdit)(altDocSnapshot, e.document, e.contentChanges);
                altDoc.applyCellChanges(e.document, e.contentChanges);
                const updatedAltText = newDoc.getText();
                // Verify the alt text is updated correctly
                (0, vitest_1.expect)(updatedAltText).toBe(edit.apply(altDocSnapshot.getText()));
                return updatedAltText;
            }
            (0, vitest_1.test)(`replace line`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 0, 0, 20),
                            rangeOffset: 0,
                            rangeLength: 20,
                            text: '# Top level imports',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace multiple lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(1, 7, 1, 14),
                            rangeOffset: 28,
                            rangeLength: 7,
                            text: 'Say Something',
                        }, {
                            range: new vscodeTypes_1.Range(0, 0, 0, 20),
                            rangeOffset: 0,
                            rangeLength: 20,
                            text: '# Top level print statements',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with smaller text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'Foo Bar',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace text with larger text`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'This is a longer piece of text',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`replace while inserting a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 20),
                            rangeOffset: 7,
                            rangeLength: 13,
                            text: 'Foo Bar")\nprint("Another line")\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert a few lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 0, 20),
                            rangeOffset: 20,
                            rangeLength: 0,
                            text: '\nprint("Another line")\nprint("Yet another line")',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove a line`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 1, 16),
                            rangeOffset: 20,
                            rangeLength: 17,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove two lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 2, 16),
                            rangeOffset: 20,
                            rangeLength: 34,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
            (0, vitest_1.test)(`merge two lines`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(0).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 20, 1, 0),
                            rangeOffset: 20,
                            rangeLength: 1,
                            text: '',
                        }]
                })).toMatchSnapshot();
            });
        });
        (0, vitest_1.describe)('Cells with multiple line (lf)', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\nprint("Foo Bar2")\nprint("Bar Baz2")\nprint("Something Else")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const newDoc = altDocSnapshot.withCellChanges(e.document, e.contentChanges);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookCellChangeEdit)(altDocSnapshot, e.document, e.contentChanges);
                const updatedAltText = newDoc.getText();
                altDoc.applyCellChanges(e.document, e.contentChanges);
                // Verify the alt text is updated correctly
                (0, vitest_1.expect)(updatedAltText).toBe(edit.apply(altDocSnapshot.getText()));
                (0, vitest_1.expect)(updatedAltText).toBe(altDoc.getText());
                return updatedAltText;
            }
            (0, vitest_1.test)(`replace text in last cell`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText({
                    document: notebook.cellAt(2).document,
                    reason: undefined,
                    detailedReason: {
                        source: 'cursor',
                        metadata: {}
                    },
                    contentChanges: [{
                            range: new vscodeTypes_1.Range(0, 7, 0, 18),
                            rangeOffset: 7,
                            rangeLength: 11,
                            text: 'Bye bye World',
                        }]
                })).toMatchSnapshot();
            });
            // test(`replace multiple lines`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(1, 7, 1, 14),
            // 			rangeOffset: 28,
            // 			rangeLength: 7,
            // 			text: 'Say Something',
            // 		}, {
            // 			range: new Range(0, 0, 0, 20),
            // 			rangeOffset: 0,
            // 			rangeLength: 20,
            // 			text: '# Top level print statements',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`replace text with smaller text`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 7, 0, 18),
            // 			rangeOffset: 7,
            // 			rangeLength: 11,
            // 			text: 'Foo Bar',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`replace text with larger text`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 7, 0, 18),
            // 			rangeOffset: 7,
            // 			rangeLength: 11,
            // 			text: 'This is a longer piece of text',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`replace while inserting a few lines`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 7, 0, 20),
            // 			rangeOffset: 7,
            // 			rangeLength: 13,
            // 			text: 'Foo Bar")\nprint("Another line")\nprint("Yet another line")',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`insert a few lines`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 20, 0, 20),
            // 			rangeOffset: 20,
            // 			rangeLength: 0,
            // 			text: '\nprint("Another line")\nprint("Yet another line")',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`remove a line`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 20, 1, 16),
            // 			rangeOffset: 20,
            // 			rangeLength: 17,
            // 			text: '',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`remove two lines`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 20, 2, 16),
            // 			rangeOffset: 20,
            // 			rangeLength: 34,
            // 			text: '',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
            // test(`merge two lines`, async () => {
            // 	expect(getUpdatedAltText({
            // 		document: notebook.cellAt(0).document,
            // 		reason: undefined,
            // 		detailedReason: {
            // 			source: 'cursor',
            // 			metadata: {}
            // 		},
            // 		contentChanges: [{
            // 			range: new Range(0, 20, 1, 0),
            // 			rangeOffset: 20,
            // 			rangeLength: 1,
            // 			text: '',
            // 		}]
            // 	})).toMatchSnapshot();
            // });
        });
    });
    (0, vitest_1.describe)('Cell Add/Delete', () => {
        (0, vitest_1.describe)('Cell with 1 line', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const originalText = altDocSnapshot.getText();
                const newDoc = altDocSnapshot.withNotebookChanges(e);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookChangeEdit)(altDocSnapshot, e);
                const updatedAltText = newDoc.getText();
                altDoc.applyNotebookChanges(e);
                if (edit) {
                    // Verify the edit is generated correctly
                    (0, vitest_1.expect)(edit.apply(originalText)).toBe(updatedAltText);
                }
                (0, vitest_1.expect)(altDoc.getText()).toBe(updatedAltText);
                return updatedAltText;
            }
            (0, vitest_1.test)(`remove cell`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cell below`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert a code cell and markdown cell`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# Foo Bar', 'markdown'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert a markdown cell`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Markup, '# Foo Bar', 'markdown'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cell above`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cells above`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cells`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove and insert cell`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove and insert cells`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
        });
        (0, vitest_1.describe)('Cell with multiple line (crlf)', () => {
            const cells = [
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")', 'python'),
                new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Hello World")\r\nprint("Foo Bar")\r\nprint("Bar Baz")\r\nprint("Something Else")', 'python'),
            ];
            let altDocSnapshot;
            let altDoc;
            let notebook;
            (0, vitest_1.beforeEach)(() => {
                ({ altDocSnapshot, altDoc, notebook } = createNotebook(cells));
            });
            function getUpdatedAltText(e) {
                const originalText = altDocSnapshot.getText();
                const newDoc = altDocSnapshot.withNotebookChanges(e);
                const edit = (0, alternativeNotebookTextDocument_1.toAltNotebookChangeEdit)(altDocSnapshot, e);
                altDoc.applyNotebookChanges(e);
                const updatedAltText = newDoc.getText();
                if (edit) {
                    // Verify the edit is generated correctly
                    (0, vitest_1.expect)(edit.apply(originalText)).toBe(updatedAltText);
                }
                (0, vitest_1.expect)(altDoc.getText()).toBe(updatedAltText);
                return updatedAltText;
            }
            (0, vitest_1.test)(`remove first cell`, async () => {
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cell below`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(2, 2),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cell middle`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cells middle`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, '# Another Cell', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(2), notebook.cellAt(3)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cell above`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cells above`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(0, 0),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`insert cells`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(1, 1),
                        removedCells: [],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove and insert cell`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1)],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
            (0, vitest_1.test)(`remove and insert cells`, async () => {
                const { notebook } = createNotebook(cells.concat([
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Foo Bar")', 'python'),
                    new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("Bar Baz")', 'python'),
                ]));
                (0, vitest_1.expect)(getUpdatedAltText([{
                        addedCells: [notebook.cellAt(1), notebook.cellAt(2)],
                        range: new vscodeTypes_1.NotebookRange(0, 1),
                        removedCells: [notebook.cellAt(0)],
                    }])).toMatchSnapshot();
            });
        });
    });
});
//# sourceMappingURL=alternativeNotebookTextDocument.spec.js.map