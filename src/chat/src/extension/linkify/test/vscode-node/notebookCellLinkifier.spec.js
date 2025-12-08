"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const hash_1 = require("../../../../util/vs/base/common/hash");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const linkifiedText_1 = require("../../common/linkifiedText");
const notebookCellLinkifier_1 = require("../../vscode-node/notebookCellLinkifier");
const util_1 = require("../node/util");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
(0, vitest_1.suite)('Notebook Cell Linkifier', () => {
    // The cell ID prefix from helpers.ts
    const CELL_ID_PREFIX = '#VSC-';
    function createMockNotebookCell(uri, index) {
        return {
            index,
            kind: vscodeTypes_1.NotebookCellKind.Code,
            document: {
                uri,
                lineCount: 1,
                lineAt: () => ({ text: 'print("hello")' }),
                languageId: 'python'
            },
            metadata: {},
            outputs: [],
            executionSummary: undefined
        };
    }
    function createMockNotebookDocument(cells) {
        return {
            uri: vscodeTypes_1.Uri.file('/test/notebook.ipynb'),
            getCells: () => cells,
            cellCount: cells.length,
            cellAt: (index) => cells[index],
            notebookType: 'jupyter-notebook',
            isDirty: false,
            isUntitled: false,
            isClosed: false,
            metadata: {},
            version: 1,
            save: () => Promise.resolve(true)
        };
    }
    function createMockWorkspaceService(notebooks) {
        return new testWorkspaceService_1.TestWorkspaceService([], [], notebooks);
    }
    function generateCellId(cellUri) {
        const hash = new hash_1.StringSHA1();
        hash.update(cellUri.toString());
        return `${CELL_ID_PREFIX}${hash.digest().substring(0, 8)}`;
    }
    const logger = {
        error: () => { },
        warn: () => { },
        info: () => { },
        debug: () => { },
        trace: () => { },
        show: () => { }
    };
    const mockLogger = new class {
        constructor() {
            this.internal = logger;
            this.logger = logger;
            this.trace = logger.trace;
            this.debug = logger.debug;
            this.info = logger.info;
            this.warn = logger.warn;
            this.error = logger.error;
        }
        show(preserveFocus) {
            //
        }
    }();
    function normalizeParts(parts) {
        const normalized = [];
        for (const part of parts) {
            if (typeof part === 'string' && normalized.length && typeof normalized[normalized.length - 1] === 'string') {
                normalized[normalized.length - 1] += part; // Concatenate strings
            }
            else {
                normalized.push(part);
            }
        }
        return normalized;
    }
    (0, vitest_1.test)('Should linkify actual cell IDs', async () => {
        // Create mock cells with specific URIs
        const cellUri1 = vscodeTypes_1.Uri.parse('vscode-notebook-cell:/test/notebook.ipynb#cell1');
        const cellUri2 = vscodeTypes_1.Uri.parse('vscode-notebook-cell:/test/notebook.ipynb#cell2');
        const cell1 = createMockNotebookCell(cellUri1, 0);
        const cell2 = createMockNotebookCell(cellUri2, 1);
        const notebook = createMockNotebookDocument([cell1, cell2]);
        const workspaceService = createMockWorkspaceService([notebook]);
        // Generate the expected cell IDs
        const cellId1 = generateCellId(cellUri1);
        const cellId2 = generateCellId(cellUri2);
        const linkifier = new notebookCellLinkifier_1.NotebookCellLinkifier(workspaceService, mockLogger);
        const testText = `Below is a list of the cells that were executed\n* Cell Id ${cellId1}\n* Cell Id ${cellId2}\n Cell 1: code cell, id=${cellId1}, nor markdown, language=Python\n Cell 2(${cellId2}), nor markdown, language=Python`;
        const result = await linkifier.linkify(testText, { requestId: undefined, references: [] }, cancellation_1.CancellationToken.None);
        // Should have linkified both cell IDs
        (0, util_1.assertPartsEqual)(normalizeParts(result.parts), [
            `Below is a list of the cells that were executed\n* Cell Id ${cellId1} `,
            new linkifiedText_1.LinkifyLocationAnchor(cellUri1, 'Cell 1'),
            `\n* Cell Id ${cellId2} `,
            new linkifiedText_1.LinkifyLocationAnchor(cellUri2, 'Cell 2'),
            `\n Cell 1: code cell, id=#VSC-c6b3ce64 `,
            new linkifiedText_1.LinkifyLocationAnchor(cellUri1, 'Cell 1'),
            `, nor markdown, language=Python\n Cell 2(#VSC-f9c1928a `,
            new linkifiedText_1.LinkifyLocationAnchor(cellUri2, 'Cell 2'),
            `), nor markdown, language=Python`
        ]);
    });
});
//# sourceMappingURL=notebookCellLinkifier.spec.js.map