/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotebookCellLayoutManager } from '../../browser/notebookCellLayoutManager.js';
suite('NotebookCellLayoutManager', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const mockCellViewModel = () => {
        return { handle: 'cell1' };
    };
    class MockList {
        constructor() {
            this._height = new Map();
            this.inRenderingTransaction = false;
            this.getViewIndexCalled = false;
            this.cells = [];
        }
        getViewIndex(cell) { return this.cells.indexOf(cell) < 0 ? undefined : this.cells.indexOf(cell); }
        elementHeight(cell) { return this._height.get(cell) ?? 100; }
        updateElementHeight2(cell, height) { this._height.set(cell, height); }
    }
    class MockLoggingService {
        debug() { }
        info() { }
        warn() { }
        error() { }
        trace() { }
    }
    class MockNotebookWidget {
        constructor() {
            this.viewModel = {
                hasCell: (cell) => true,
                getCellIndex: () => 0
            };
            this.visibleRanges = [{ start: 0, end: 0 }];
        }
        hasEditorFocus() { return true; }
        getAbsoluteTopOfElement() { return 0; }
        getLength() { return 1; }
        getDomNode() {
            return {
                style: {
                    height: '100px'
                }
            };
        }
    }
    test('should update cell height', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should schedule updates if already in a rendering transaction', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.inRenderingTransaction = true;
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        const promise = mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
        assert.strictEqual(list.elementHeight(cell2), 100);
        list.inRenderingTransaction = false;
        await promise;
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should not update if cell is hidden', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
    test('should not update if height is unchanged', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 100);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
});
//# sourceMappingURL=notebookCellLayoutManager.test.js.map