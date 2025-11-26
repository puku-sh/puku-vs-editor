/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CellFocusMode } from '../../browser/notebookBrowser.js';
import { NotebookCellAnchor } from '../../browser/view/notebookCellAnchor.js';
import { Emitter } from '../../../../../base/common/event.js';
import { CellKind, NotebookCellExecutionState, NotebookSetting } from '../../common/notebookCommon.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('NotebookCellAnchor', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let focusedCell;
    let config;
    let scrollEvent;
    let onDidStopExecution;
    let resizingCell;
    let cellAnchor;
    setup(() => {
        config = new TestConfigurationService();
        scrollEvent = new Emitter();
        onDidStopExecution = new Emitter();
        const executionService = {
            getCellExecution: () => { return { state: NotebookCellExecutionState.Executing }; },
        };
        resizingCell = {
            cellKind: CellKind.Code,
            onDidStopExecution: onDidStopExecution.event
        };
        focusedCell = {
            focusMode: CellFocusMode.Container
        };
        cellAnchor = store.add(new NotebookCellAnchor(executionService, config, scrollEvent.event));
    });
    // for the current implementation the code under test only cares about the focused cell
    // initial setup with focused cell at the bottom of the view
    class MockListView {
        constructor() {
            this.focusedCellTop = 100;
            this.focusedCellHeight = 50;
            this.renderTop = 0;
            this.renderHeight = 150;
        }
        element(_index) { return focusedCell; }
        elementTop(_index) { return this.focusedCellTop; }
        elementHeight(_index) { return this.focusedCellHeight; }
        getScrollTop() { return this.renderTop; }
    }
    test('Basic anchoring', async function () {
        focusedCell.focusMode = CellFocusMode.Editor;
        const listView = new MockListView();
        assert(cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should anchor if cell editor is focused');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell editor is focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'fullCell');
        focusedCell.focusMode = CellFocusMode.Container;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        focusedCell.focusMode = CellFocusMode.Output;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should anchor if cell is growing');
        assert(!cellAnchor.shouldAnchor(listView, 1, -10, resizingCell), 'should not anchor if not growing and editor not focused');
        config.setUserConfiguration(NotebookSetting.scrollToRevealCell, 'none');
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if scroll on execute is disabled');
    });
    test('Anchor during execution until user scrolls up', async function () {
        const listView = new MockListView();
        const scrollDown = { oldScrollTop: 100, scrollTop: 150 };
        const scrollUp = { oldScrollTop: 200, scrollTop: 150 };
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell));
        scrollEvent.fire(scrollDown);
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should still be anchored after scrolling down');
        scrollEvent.fire(scrollUp);
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should not be anchored after scrolling up');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor again if the editor is focused');
        focusedCell.focusMode = CellFocusMode.Container;
        onDidStopExecution.fire();
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should anchor for new execution');
    });
    test('Only anchor during when the focused cell will be pushed out of view', async function () {
        const mockListView = new MockListView();
        mockListView.focusedCellTop = 50;
        const listView = mockListView;
        assert(!cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'should not anchor if focused cell will still be fully visible after resize');
        focusedCell.focusMode = CellFocusMode.Editor;
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should always anchor if the editor is focused');
        // fully visible focused cell would be pushed partially out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 150, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
        mockListView.focusedCellTop = 110;
        // partially visible focused cell would be pushed further out of view
        assert(cellAnchor.shouldAnchor(listView, 1, 10, resizingCell), 'cell should be anchored if focused cell will be pushed out of view');
    });
});
//# sourceMappingURL=notebookCellAnchor.test.js.map