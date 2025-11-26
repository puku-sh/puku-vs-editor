/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { CodeCellLayout } from '../../../browser/view/cellParts/codeCell.js';
suite('CellPart', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('CodeCellLayout editor visibility states', () => {
        /**
         * We construct a very small mock around the parts that `CodeCellLayout` touches. The goal
         * is to validate the branching logic that sets `_editorVisibility` without mutating any
         * production code. Each scenario sets up geometry & scroll values then invokes
         * `layoutEditor()` and asserts the resulting visibility classification.
         */
        const DEFAULT_ELEMENT_TOP = 100; // absolute top of the cell in notebook coordinates
        const DEFAULT_ELEMENT_HEIGHT = 900; // arbitrary, large enough not to constrain
        const STATUSBAR = 22;
        const TOP_MARGIN = 6; // mirrors layoutInfo.topMargin usage
        const OUTLINE = 1;
        const scenarios = [
            {
                name: 'Full',
                scrollTop: 0,
                viewportHeight: 400,
                editorContentHeight: 300,
                editorHeight: 300,
                outputContainerOffset: 300, // editorBottom = 100 + 300 = 400, fully inside viewport (scrollBottom=400)
                expected: 'Full',
                elementTop: DEFAULT_ELEMENT_TOP,
                elementHeight: DEFAULT_ELEMENT_HEIGHT,
                expectedTop: 0,
                expectedEditorScrollTop: 0,
            },
            {
                name: 'Bottom Clipped',
                scrollTop: 0,
                viewportHeight: 350, // scrollBottom=350 < editorBottom(400)
                editorContentHeight: 300,
                editorHeight: 300,
                outputContainerOffset: 300,
                expected: 'Bottom Clipped',
                elementTop: DEFAULT_ELEMENT_TOP,
                elementHeight: DEFAULT_ELEMENT_HEIGHT,
                expectedTop: 0,
                expectedEditorScrollTop: 0,
            },
            {
                name: 'Full (Small Viewport)',
                scrollTop: DEFAULT_ELEMENT_TOP + TOP_MARGIN + 20, // scrolled into the cell body
                viewportHeight: 220, // small vs content
                editorContentHeight: 500, // larger than viewport so we clamp
                editorHeight: 500,
                outputContainerOffset: 600, // editorBottom=700 > scrollBottom
                expected: 'Full (Small Viewport)',
                elementTop: DEFAULT_ELEMENT_TOP,
                elementHeight: DEFAULT_ELEMENT_HEIGHT,
                expectedTop: 19, // (scrollTop - elementTop - topMargin - outlineWidth) = (100+6+20 -100 -6 -1)
                expectedEditorScrollTop: 19,
            },
            {
                name: 'Top Clipped',
                scrollTop: DEFAULT_ELEMENT_TOP + TOP_MARGIN + 40, // scrolled further down but not past bottom
                viewportHeight: 600, // larger than content height below (forces branch for Top Clipped)
                editorContentHeight: 200,
                editorHeight: 200,
                outputContainerOffset: 450, // editorBottom=550; scrollBottom= scrollTop+viewportHeight = > 550?  (540+600=1140) but we only need scrollTop < editorBottom
                expected: 'Top Clipped',
                elementTop: DEFAULT_ELEMENT_TOP,
                elementHeight: DEFAULT_ELEMENT_HEIGHT,
                expectedTop: 39, // (100+6+40 -100 -6 -1)
                expectedEditorScrollTop: 40, // contentHeight(200) - computed height(160)
            },
            {
                name: 'Invisible',
                scrollTop: DEFAULT_ELEMENT_TOP + 1000, // well below editor bottom
                viewportHeight: 400,
                editorContentHeight: 300,
                editorHeight: 300,
                outputContainerOffset: 300, // editorBottom=400 < scrollTop
                expected: 'Invisible',
                elementTop: DEFAULT_ELEMENT_TOP,
                elementHeight: DEFAULT_ELEMENT_HEIGHT,
                expectedTop: 278, // adjusted after ensuring minimum line height when possibleEditorHeight < LINE_HEIGHT
                expectedEditorScrollTop: 279, // contentHeight(300) - clamped height(21)
            },
        ];
        for (const s of scenarios) {
            // Fresh stub objects per scenario
            const editorScrollState = { scrollTop: 0 };
            const stubEditor = {
                layoutCalls: [],
                _lastScrollTopSet: -1,
                getLayoutInfo: () => ({ width: 600, height: s.editorHeight }),
                getContentHeight: () => s.editorContentHeight,
                layout: (dim) => {
                    stubEditor.layoutCalls.push(dim);
                },
                setScrollTop: (v) => {
                    editorScrollState.scrollTop = v;
                    stubEditor._lastScrollTopSet = v;
                },
                hasModel: () => true,
            };
            const editorPart = { style: { top: '' } };
            const template = {
                editor: stubEditor,
                editorPart: editorPart,
            };
            // viewCell stub with only needed pieces
            const viewCell = {
                isInputCollapsed: false,
                layoutInfo: {
                    // values referenced in layout logic
                    statusBarHeight: STATUSBAR,
                    topMargin: TOP_MARGIN,
                    outlineWidth: OUTLINE,
                    editorHeight: s.editorHeight,
                    outputContainerOffset: s.outputContainerOffset,
                },
            };
            // notebook editor stub
            let scrollBottom = s.scrollTop + s.viewportHeight;
            const notebookEditor = {
                scrollTop: s.scrollTop,
                get scrollBottom() {
                    return scrollBottom;
                },
                setScrollTop: (v) => {
                    notebookEditor.scrollTop = v;
                    scrollBottom = v + s.viewportHeight;
                },
                getLayoutInfo: () => ({
                    fontInfo: { lineHeight: 21 },
                    height: s.viewportHeight,
                    stickyHeight: 0,
                }),
                getAbsoluteTopOfElement: () => s.elementTop,
                getAbsoluteBottomOfElement: () => s.elementTop + s.outputContainerOffset,
                getHeightOfElement: () => s.elementHeight,
                notebookOptions: {
                    getLayoutConfiguration: () => ({ editorTopPadding: 6 }),
                },
            };
            const layout = new CodeCellLayout(
            /* enabled */ true, notebookEditor, viewCell, template, {
                debug: () => {
                    /* no-op */
                },
            }, { width: 600, height: s.editorHeight });
            layout.layoutEditor('init');
            assert.strictEqual(layout.editorVisibility, s.expected, `Scenario '${s.name}' (scrollTop=${s.scrollTop}) expected visibility ${s.expected} but got ${layout.editorVisibility}`);
            const actualTop = parseInt((editorPart.style.top || '0').replace(/px$/, '')); // style.top always like 'NNNpx'
            assert.strictEqual(actualTop, s.expectedTop, `Scenario '${s.name}' (scrollTop=${s.scrollTop}) expected top ${s.expectedTop}px but got ${editorPart.style.top}`);
            assert.strictEqual(stubEditor._lastScrollTopSet, s.expectedEditorScrollTop, `Scenario '${s.name}' (scrollTop=${s.scrollTop}) expected editor.setScrollTop(${s.expectedEditorScrollTop}) but got ${stubEditor._lastScrollTopSet}`);
            // Basic sanity: style.top should always be set when visible states other than Full (handled) or Invisible.
            if (s.expected !== 'Invisible') {
                assert.notStrictEqual(editorPart.style.top, '', `Scenario '${s.name}' should set a top style value`);
            }
            else {
                // Invisible still sets a top; just ensure layout ran
                assert.ok(editorPart.style.top !== undefined, 'Invisible scenario still performs a layout');
            }
        }
    });
    test('Scrolling', () => {
        /**
         * Pixel-by-pixel scroll test to validate `CodeCellLayout` calculations for:
         *  - editorPart.style.top
         *  - editorVisibility classification
         *  - editor internal scrollTop passed to setScrollTop
         *
         * We intentionally mirror the production math in a helper (duplication acceptable in test) so
         * that any divergence is caught. Constants chosen to exercise all state transitions.
         */
        const LINE_HEIGHT = 21; // from getLayoutInfo().fontInfo.lineHeight in stubs
        const CELL_TOP_MARGIN = 6;
        const CELL_OUTLINE_WIDTH = 1;
        const STATUSBAR_HEIGHT = 22;
        const VIEWPORT_HEIGHT = 300; // notebook viewport height
        const ELEMENT_TOP = 100; // absolute top
        const EDITOR_CONTENT_HEIGHT = 800; // tall content so we get clipping and small viewport states
        const EDITOR_HEIGHT = EDITOR_CONTENT_HEIGHT; // initial layoutInfo.editorHeight
        const OUTPUT_CONTAINER_OFFSET = 800; // bottom of editor region relative to elementTop
        const ELEMENT_HEIGHT = 1200; // large container
        function clamp(v, min, max) {
            return Math.min(Math.max(v, min), max);
        }
        function computeExpected(scrollTop) {
            const scrollBottom = scrollTop + VIEWPORT_HEIGHT;
            const viewportHeight = VIEWPORT_HEIGHT;
            const editorBottom = ELEMENT_TOP + OUTPUT_CONTAINER_OFFSET;
            let top = Math.max(0, scrollTop - ELEMENT_TOP - CELL_TOP_MARGIN - CELL_OUTLINE_WIDTH);
            const possibleEditorHeight = EDITOR_HEIGHT - top;
            if (possibleEditorHeight < LINE_HEIGHT) {
                top = top - (LINE_HEIGHT - possibleEditorHeight) - CELL_OUTLINE_WIDTH;
            }
            let height = EDITOR_CONTENT_HEIGHT;
            let visibility = 'Full';
            let editorScrollTop = 0;
            if (scrollTop <= ELEMENT_TOP + CELL_TOP_MARGIN) {
                const minimumEditorHeight = LINE_HEIGHT + 6; // editorTopPadding from configuration stub (6)
                if (scrollBottom >= editorBottom) {
                    height = clamp(EDITOR_CONTENT_HEIGHT, minimumEditorHeight, EDITOR_CONTENT_HEIGHT);
                    visibility = 'Full';
                }
                else {
                    height =
                        clamp(scrollBottom - (ELEMENT_TOP + CELL_TOP_MARGIN) - STATUSBAR_HEIGHT, minimumEditorHeight, EDITOR_CONTENT_HEIGHT) +
                            2 * CELL_OUTLINE_WIDTH;
                    visibility = 'Bottom Clipped';
                    editorScrollTop = 0;
                }
            }
            else {
                if (viewportHeight <= EDITOR_CONTENT_HEIGHT &&
                    scrollBottom <= editorBottom) {
                    const minimumEditorHeight = LINE_HEIGHT + 6; // editorTopPadding
                    height =
                        clamp(viewportHeight - STATUSBAR_HEIGHT, minimumEditorHeight, EDITOR_CONTENT_HEIGHT - STATUSBAR_HEIGHT) +
                            2 * CELL_OUTLINE_WIDTH;
                    visibility = 'Full (Small Viewport)';
                    editorScrollTop = top;
                }
                else {
                    const minimumEditorHeight = LINE_HEIGHT;
                    height = clamp(EDITOR_CONTENT_HEIGHT -
                        (scrollTop - (ELEMENT_TOP + CELL_TOP_MARGIN)), minimumEditorHeight, EDITOR_CONTENT_HEIGHT);
                    if (scrollTop > editorBottom) {
                        visibility = 'Invisible';
                    }
                    else {
                        visibility = 'Top Clipped';
                    }
                    editorScrollTop = EDITOR_CONTENT_HEIGHT - height;
                }
            }
            return { top, visibility, editorScrollTop };
        }
        // Shared stubs (we'll mutate scrollTop each iteration) – we re-create layout each iteration to reset internal state changes
        for (let scrollTop = 0; scrollTop <= VIEWPORT_HEIGHT + OUTPUT_CONTAINER_OFFSET + 20; scrollTop++) {
            const expected = computeExpected(scrollTop);
            const scrollBottom = scrollTop + VIEWPORT_HEIGHT;
            const stubEditor = {
                _lastScrollTopSet: -1,
                getLayoutInfo: () => ({ width: 600, height: EDITOR_HEIGHT }),
                getContentHeight: () => EDITOR_CONTENT_HEIGHT,
                layout: () => {
                    /* no-op */
                },
                setScrollTop: (v) => {
                    stubEditor._lastScrollTopSet = v;
                },
                hasModel: () => true,
            };
            const editorPart = { style: { top: '' } };
            const template = {
                editor: stubEditor,
                editorPart: editorPart,
            };
            const viewCell = {
                isInputCollapsed: false,
                layoutInfo: {
                    statusBarHeight: STATUSBAR_HEIGHT,
                    topMargin: CELL_TOP_MARGIN,
                    outlineWidth: CELL_OUTLINE_WIDTH,
                    editorHeight: EDITOR_HEIGHT,
                    outputContainerOffset: OUTPUT_CONTAINER_OFFSET,
                },
            };
            const notebookEditor = {
                scrollTop,
                get scrollBottom() {
                    return scrollBottom;
                },
                setScrollTop: (v) => {
                    /* notebook scroll changes are not the focus here */
                },
                getLayoutInfo: () => ({
                    fontInfo: { lineHeight: LINE_HEIGHT },
                    height: VIEWPORT_HEIGHT,
                    stickyHeight: 0,
                }),
                getAbsoluteTopOfElement: () => ELEMENT_TOP,
                getAbsoluteBottomOfElement: () => ELEMENT_TOP + OUTPUT_CONTAINER_OFFSET,
                getHeightOfElement: () => ELEMENT_HEIGHT,
                notebookOptions: {
                    getLayoutConfiguration: () => ({ editorTopPadding: 6 }),
                },
            };
            const layout = new CodeCellLayout(true, notebookEditor, viewCell, template, { debug: () => { } }, { width: 600, height: EDITOR_HEIGHT });
            layout.layoutEditor('nbDidScroll');
            const actualTop = parseInt((editorPart.style.top || '0').replace(/px$/, ''));
            assert.strictEqual(actualTop, expected.top, `scrollTop=${scrollTop}: expected top ${expected.top}, got ${actualTop}`);
            assert.strictEqual(layout.editorVisibility, expected.visibility, `scrollTop=${scrollTop}: expected visibility ${expected.visibility}, got ${layout.editorVisibility}`);
            assert.strictEqual(stubEditor._lastScrollTopSet, expected.editorScrollTop, `scrollTop=${scrollTop}: expected editorScrollTop ${expected.editorScrollTop}, got ${stubEditor._lastScrollTopSet}`);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFBhcnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci92aWV3L2NlbGxQYXJ0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBR3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUk3RSxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtJQUN0Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7UUFDcEQ7Ozs7O1dBS0c7UUFpQkgsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxtREFBbUQ7UUFDcEYsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsQ0FBQywyQ0FBMkM7UUFDL0UsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztRQUMzRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUM7UUFFbEIsTUFBTSxTQUFTLEdBQW1CO1lBQ2pDO2dCQUNDLElBQUksRUFBRSxNQUFNO2dCQUNaLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGNBQWMsRUFBRSxHQUFHO2dCQUNuQixtQkFBbUIsRUFBRSxHQUFHO2dCQUN4QixZQUFZLEVBQUUsR0FBRztnQkFDakIscUJBQXFCLEVBQUUsR0FBRyxFQUFFLDJFQUEyRTtnQkFDdkcsUUFBUSxFQUFFLE1BQU07Z0JBQ2hCLFVBQVUsRUFBRSxtQkFBbUI7Z0JBQy9CLGFBQWEs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