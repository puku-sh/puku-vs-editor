/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Emitter } from '../../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ContributedStatusBarItemController } from '../../../browser/contrib/cellStatusBar/contributedStatusBarItemController.js';
import { INotebookCellStatusBarService } from '../../../common/notebookCellStatusBarService.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { withTestNotebook } from '../testNotebookEditor.js';
suite('Notebook Statusbar', () => {
    const testDisposables = new DisposableStore();
    teardown(() => {
        testDisposables.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Calls item provider', async function () {
        await withTestNotebook([
            ['var b = 1;', 'javascript', CellKind.Code, [], {}],
            ['# header a', 'markdown', CellKind.Markup, [], {}],
        ], async (editor, viewModel, _ds, accessor) => {
            const cellStatusbarSvc = accessor.get(INotebookCellStatusBarService);
            testDisposables.add(accessor.createInstance(ContributedStatusBarItemController, editor));
            const provider = testDisposables.add(new class extends Disposable {
                constructor() {
                    super(...arguments);
                    this.provideCalls = 0;
                    this._onProvideCalled = this._register(new Emitter());
                    this.onProvideCalled = this._onProvideCalled.event;
                    this._onDidChangeStatusBarItems = this._register(new Emitter());
                    this.onDidChangeStatusBarItems = this._onDidChangeStatusBarItems.event;
                    this.viewType = editor.textModel.viewType;
                }
                async provideCellStatusBarItems(_uri, index, _token) {
                    if (index === 0) {
                        this.provideCalls++;
                        this._onProvideCalled.fire(this.provideCalls);
                    }
                    return { items: [] };
                }
            });
            const providePromise1 = asPromise(provider.onProvideCalled, 'registering provider');
            testDisposables.add(cellStatusbarSvc.registerCellStatusBarItemProvider(provider));
            assert.strictEqual(await providePromise1, 1, 'should call provider on registration');
            const providePromise2 = asPromise(provider.onProvideCalled, 'updating metadata');
            const cell0 = editor.textModel.cells[0];
            cell0.metadata = { ...cell0.metadata, ...{ newMetadata: true } };
            assert.strictEqual(await providePromise2, 2, 'should call provider on updating metadata');
            const providePromise3 = asPromise(provider.onProvideCalled, 'changing cell language');
            cell0.language = 'newlanguage';
            assert.strictEqual(await providePromise3, 3, 'should call provider on changing language');
            const providePromise4 = asPromise(provider.onProvideCalled, 'manually firing change event');
            provider._onDidChangeStatusBarItems.fire();
            assert.strictEqual(await providePromise4, 4, 'should call provider on manually firing change event');
        });
    });
});
async function asPromise(event, message) {
    const error = new Error('asPromise TIMEOUT reached: ' + message);
    return new Promise((resolve, reject) => {
        const handle = setTimeout(() => {
            sub.dispose();
            reject(error);
        }, 1000);
        const sub = event(e => {
            clearTimeout(handle);
            sub.dispose();
            resolve(e);
        });
    });
}
//# sourceMappingURL=contributedStatusBarItemController.test.js.map