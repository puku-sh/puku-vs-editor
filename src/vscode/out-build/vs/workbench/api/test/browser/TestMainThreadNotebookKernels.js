/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mock } from '../../../test/common/workbenchTestServices.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { INotebookKernelService } from '../../../contrib/notebook/common/notebookKernelService.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { INotebookExecutionStateService } from '../../../contrib/notebook/common/notebookExecutionStateService.js';
import { INotebookService } from '../../../contrib/notebook/common/notebookService.js';
import { INotebookEditorService } from '../../../contrib/notebook/browser/services/notebookEditorService.js';
import { Event } from '../../../../base/common/event.js';
import { MainThreadNotebookKernels } from '../../browser/mainThreadNotebookKernels.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
export class TestMainThreadNotebookKernels extends Disposable {
    constructor(extHostContext) {
        super();
        this.registeredKernels = new Map();
        this.kernelHandle = 0;
        this.instantiationService = this._register(new TestInstantiationService());
        this.setupDefaultStubs();
        this.mainThreadNotebookKernels = this._register(this.instantiationService.createInstance(MainThreadNotebookKernels, extHostContext));
    }
    setupDefaultStubs() {
        this.instantiationService.stub(ILanguageService, new class extends mock() {
            getRegisteredLanguageIds() {
                return ['typescript', 'javascript', 'python'];
            }
        });
        this.instantiationService.stub(INotebookKernelService, new class extends mock() {
            constructor(builder) {
                super();
                this.builder = builder;
                this.onDidChangeSelectedNotebooks = Event.None;
            }
            registerKernel(kernel) {
                this.builder.registeredKernels.set(kernel.id, kernel);
                return Disposable.None;
            }
            getMatchingKernel() {
                return {
                    selected: undefined,
                    suggestions: [],
                    all: [],
                    hidden: []
                };
            }
        }(this));
        this.instantiationService.stub(INotebookExecutionStateService, new class extends mock() {
            createCellExecution() {
                return new class extends mock() {
                };
            }
            createExecution() {
                return new class extends mock() {
                };
            }
        });
        this.instantiationService.stub(INotebookService, new class extends mock() {
            getNotebookTextModel() {
                return undefined;
            }
        });
        this.instantiationService.stub(INotebookEditorService, new class extends mock() {
            constructor() {
                super(...arguments);
                this.onDidAddNotebookEditor = Event.None;
                this.onDidRemoveNotebookEditor = Event.None;
            }
            listNotebookEditors() {
                return [];
            }
        });
    }
    get instance() {
        return this.mainThreadNotebookKernels;
    }
    async addKernel(id) {
        const handle = this.kernelHandle++;
        await this.instance.$addKernel(handle, {
            id,
            notebookType: 'test-notebook',
            extensionId: new ExtensionIdentifier('test.extension'),
            extensionLocation: { scheme: 'test', path: '/test' },
            label: 'Test Kernel',
            description: 'A test kernel',
            hasVariableProvider: true
        });
    }
    getKernel(id) {
        return this.registeredKernels.get(id);
    }
}
//# sourceMappingURL=TestMainThreadNotebookKernels.js.map