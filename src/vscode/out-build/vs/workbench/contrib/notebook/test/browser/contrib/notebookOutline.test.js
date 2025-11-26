/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { setupInstantiationService, withTestNotebook } from '../testNotebookEditor.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { mock } from '../../../../../../base/test/common/mock.js';
import { Event } from '../../../../../../base/common/event.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IMarkerService } from '../../../../../../platform/markers/common/markers.js';
import { MarkerService } from '../../../../../../platform/markers/common/markerService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { NotebookCellOutline, NotebookOutlineCreator } from '../../../browser/contrib/outline/notebookOutline.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { LanguageFeaturesService } from '../../../../../../editor/common/services/languageFeaturesService.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { INotebookOutlineEntryFactory, NotebookOutlineEntryFactory } from '../../../browser/viewModel/notebookOutlineEntryFactory.js';
suite('Notebook Outline', function () {
    let disposables;
    let instantiationService;
    let symbolsCached;
    teardown(() => disposables.dispose());
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        symbolsCached = false;
        disposables = new DisposableStore();
        instantiationService = setupInstantiationService(disposables);
        instantiationService.set(IEditorService, new class extends mock() {
        });
        instantiationService.set(ILanguageFeaturesService, new LanguageFeaturesService());
        instantiationService.set(IMarkerService, disposables.add(new MarkerService()));
        instantiationService.set(IThemeService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFileIconThemeChange = Event.None;
            }
            getFileIconTheme() {
                return { hasFileIcons: true, hasFolderIcons: true, hidesExplorerArrows: false };
            }
        });
    });
    async function withNotebookOutline(cells, target, callback) {
        return withTestNotebook(cells, async (editor) => {
            if (!editor.hasModel()) {
                assert.ok(false, 'MUST have active text editor');
            }
            const notebookEditorPane = new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeModel = Event.None;
                    this.onDidChangeSelection = Event.None;
                }
                getControl() {
                    return editor;
                }
            };
            const testOutlineEntryFactory = instantiationService.createInstance(NotebookOutlineEntryFactory);
            testOutlineEntryFactory.cacheSymbols = async () => { symbolsCached = true; };
            instantiationService.stub(INotebookOutlineEntryFactory, testOutlineEntryFactory);
            const outline = await instantiationService.createInstance(NotebookOutlineCreator).createOutline(notebookEditorPane, target, CancellationToken.None);
            disposables.add(outline);
            return callback(outline, editor);
        });
    }
    test('basic', async function () {
        await withNotebookOutline([], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements(), []);
        });
    });
    test('special characters in heading', async function () {
        await withNotebookOutline([
            ['# Hellö & Hällo', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'Hellö & Hällo');
        });
        await withNotebookOutline([
            ['# bo<i>ld</i>', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'bold');
        });
    });
    test('Notebook falsely detects "empty cells"', async function () {
        await withNotebookOutline([
            ['  的时代   ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, (outline, notebookEditor) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.entries[0].label, '的时代', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in outline label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '的时代', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in quickpick entry label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
        });
        await withNotebookOutline([
            ['   ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, (outline, notebookEditor) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.entries[0].label, 'empty cell', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up as an empty cell in outline label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'empty cell', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up as an empty cell in quickpick entry label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
        });
        await withNotebookOutline([
            ['+++++[]{}--)(0  ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, (outline, notebookEditor) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.entries[0].label, '+++++[]{}--)(0', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in outline label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in quickpick entry label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
        });
        await withNotebookOutline([
            ['+++++[]{}--)(0 Hello **&^ ', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, (outline, notebookEditor) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.entries[0].label, '+++++[]{}--)(0 Hello **&^', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in outline label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '+++++[]{}--)(0 Hello **&^', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in quickpick entry label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
        });
        await withNotebookOutline([
            ['!@#$\n Überschrïft', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, (outline, notebookEditor) => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.entries[0].label, '!@#$', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in outline label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, '!@#$', `cell content: ${notebookEditor.cellAt(0).model.getValue()} did not show up correctly in quickpick entry label. \n Cell text buffer line 1: ${outline.entries[0].cell.textBuffer.getLineContent(1)}`);
        });
    });
    test('Heading text defines entry label', async function () {
        return await withNotebookOutline([
            ['foo\n # h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 1);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h1');
        });
    });
    test('Notebook outline ignores markdown headings #115200', async function () {
        await withNotebookOutline([
            ['## h2 \n# h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
        await withNotebookOutline([
            ['## h2', 'md', CellKind.Markup],
            ['# h1', 'md', CellKind.Markup]
        ], 1 /* OutlineTarget.OutlinePane */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements().length, 2);
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[0].label, 'h2');
            assert.deepStrictEqual(outline.config.quickPickDataSource.getQuickPickElements()[1].label, 'h1');
        });
    });
    test('Symbols for goto quickpick are pre-cached', async function () {
        await withNotebookOutline([
            ['a = 1\nb = 2', 'python', CellKind.Code]
        ], 4 /* OutlineTarget.QuickPick */, outline => {
            assert.ok(outline instanceof NotebookCellOutline);
            assert.strictEqual(symbolsCached, true);
        });
    });
});
//# sourceMappingURL=notebookOutline.test.js.map