/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { CellOutputContainer } from '../../browser/view/cellParts/cellOutput.js';
import { CellKind } from '../../common/notebookCommon.js';
import { setupInstantiationService, withTestNotebook } from './testNotebookEditor.js';
import { FastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { INotebookService } from '../../common/notebookService.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { Event } from '../../../../../base/common/event.js';
import { getAllOutputsText } from '../../browser/viewModel/cellOutputTextHelper.js';
suite('CellOutput', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let outputMenus = [];
    setup(() => {
        outputMenus = [];
        instantiationService = setupInstantiationService(store);
        instantiationService.stub(INotebookService, new class extends mock() {
            getOutputMimeTypeInfo(_textModel, _kernelProvides, output) {
                return [{
                        rendererId: 'plainTextRendererId',
                        mimeType: 'text/plain',
                        isTrusted: true
                    }, {
                        rendererId: 'htmlRendererId',
                        mimeType: 'text/html',
                        isTrusted: true
                    }, {
                        rendererId: 'errorRendererId',
                        mimeType: 'application/vnd.code.notebook.error',
                        isTrusted: true
                    }, {
                        rendererId: 'stderrRendererId',
                        mimeType: 'application/vnd.code.notebook.stderr',
                        isTrusted: true
                    }, {
                        rendererId: 'stdoutRendererId',
                        mimeType: 'application/vnd.code.notebook.stdout',
                        isTrusted: true
                    }]
                    .filter(info => output.outputs.some(output => output.mime === info.mimeType));
            }
            getRendererInfo() {
                return {
                    id: 'rendererId',
                    displayName: 'Stubbed Renderer',
                    extensionId: { _lower: 'id', value: 'id' },
                };
            }
        });
        instantiationService.stub(IMenuService, new class extends mock() {
            createMenu() {
                const menu = new class extends mock() {
                    constructor() {
                        super(...arguments);
                        this.onDidChange = Event.None;
                    }
                    getActions() { return []; }
                    dispose() { outputMenus = outputMenus.filter(item => item !== menu); }
                };
                outputMenus.push(menu);
                return menu;
            }
        });
    });
    test('Render cell output items with multiple mime types', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2], {}],
        ], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            assert.strictEqual(outputMenus.length, 1, 'should have 1 output menus');
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
            cell.outputsViewModels[1].setVisible(true);
            assert.strictEqual(outputMenus.length, 2, 'should still have 2 output menus');
        }, instantiationService);
    });
    test('One of many cell outputs becomes hidden', async function () {
        const outputItem = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const htmlOutputItem = { data: VSBuffer.fromString('output content'), mime: 'text/html' };
        const output1 = { outputId: 'abc', outputs: [outputItem, htmlOutputItem] };
        const output2 = { outputId: 'def', outputs: [outputItem, htmlOutputItem] };
        const output3 = { outputId: 'ghi', outputs: [outputItem, htmlOutputItem] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2, output3], {}],
        ], (editor, viewModel, disposables, accessor) => {
            const cell = viewModel.viewCells[0];
            const cellTemplate = createCellTemplate(disposables);
            const output = disposables.add(accessor.createInstance(CellOutputContainer, editor, cell, cellTemplate, { limit: 100 }));
            output.render();
            cell.outputsViewModels[0].setVisible(true);
            cell.outputsViewModels[1].setVisible(true);
            cell.outputsViewModels[2].setVisible(true);
            cell.outputsViewModels[1].setVisible(false);
            assert(cellTemplate.outputContainer.domNode.style.display !== 'none', 'output container should be visible');
            assert.strictEqual(outputMenus.length, 2, 'should have 2 output menus');
        }, instantiationService);
    });
    test('get all adjacent stream outputs', async () => {
        const stdout = { data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' };
        const stderr = { data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2], {}],
        ], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'stdoutstderr');
        }, instantiationService);
    });
    test('get all mixed outputs of cell', async () => {
        const stdout = { data: VSBuffer.fromString('stdout'), mime: 'application/vnd.code.notebook.stdout' };
        const stderr = { data: VSBuffer.fromString('stderr'), mime: 'application/vnd.code.notebook.stderr' };
        const plainText = { data: VSBuffer.fromString('output content'), mime: 'text/plain' };
        const error = { data: VSBuffer.fromString(`{"name":"Error Name","message":"error message","stack":"error stack"}`), mime: 'application/vnd.code.notebook.error' };
        const output1 = { outputId: 'abc', outputs: [stdout] };
        const output2 = { outputId: 'abc', outputs: [stderr] };
        const output3 = { outputId: 'abc', outputs: [plainText] };
        const output4 = { outputId: 'abc', outputs: [error] };
        await withTestNotebook([
            ['print(output content)', 'python', CellKind.Code, [output1, output2, output3, output4], {}],
        ], (_editor, viewModel) => {
            const cell = viewModel.viewCells[0];
            const notebook = viewModel.notebookDocument;
            const result = getAllOutputsText(notebook, cell);
            assert.strictEqual(result, 'Cell output 1 of 3\n' +
                'stdoutstderr\n' +
                'Cell output 2 of 3\n' +
                'output content\n' +
                'Cell output 3 of 3\n' +
                'error stack');
        }, instantiationService);
    });
});
function createCellTemplate(disposables) {
    return {
        outputContainer: new FastDomNode(document.createElement('div')),
        outputShowMoreContainer: new FastDomNode(document.createElement('div')),
        focusSinkElement: document.createElement('div'),
        templateDisposables: disposables,
        elementDisposables: disposables,
    };
}
//# sourceMappingURL=cellOutput.test.js.map