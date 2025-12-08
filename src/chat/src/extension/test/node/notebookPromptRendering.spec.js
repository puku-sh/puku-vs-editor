"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const globalStringUtils_1 = require("../../../platform/chat/common/globalStringUtils");
const diffServiceImpl_1 = require("../../../platform/diff/node/diffServiceImpl");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const mockEndpoint_1 = require("../../../platform/endpoint/test/node/mockEndpoint");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const nullTelemetryService_1 = require("../../../platform/telemetry/common/nullTelemetryService");
const simulationWorkspaceServices_1 = require("../../../platform/test/node/simulationWorkspaceServices");
const tokenizer_1 = require("../../../platform/tokenizer/node/tokenizer");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const notebookDocument_1 = require("../../../util/common/test/shims/notebookDocument");
const tokenizer_2 = require("../../../util/common/tokenizer");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../prompt/common/chatVariablesCollection");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const inlineChatNotebookGeneratePrompt_1 = require("../../prompts/node/inline/inlineChatNotebookGeneratePrompt");
const services_1 = require("./services");
function getFakeDocumentContext(notebook, index = 0) {
    const cell = notebook.getCells()[index];
    const docSnapshot = textDocumentSnapshot_1.TextDocumentSnapshot.create(cell.document);
    const context = {
        document: docSnapshot,
        language: { languageId: docSnapshot.languageId, lineComment: { start: '//' } },
        fileIndentInfo: undefined,
        wholeRange: new vscodeTypes_1.Range(0, 0, 1, 0),
        selection: new vscodeTypes_1.Selection(0, 0, 0, 0),
    };
    return context;
}
function getFakeNotebookEditor() {
    const cells = [
        new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("hello")', 'python'),
        new vscodeTypes_1.NotebookCellData(vscodeTypes_1.NotebookCellKind.Code, 'print("world")', 'python'),
    ];
    const uri = uri_1.URI.from({ scheme: 'file', path: '/path/file.ipynb' });
    const notebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri, new vscodeTypes_1.NotebookData(cells), 'jupyter-notebook').document;
    const selection = {
        start: 1,
        end: 2,
        isEmpty: false,
        with() {
            return selection;
        }
    };
    return {
        notebook,
        revealRange() { },
        selections: [selection],
        selection: selection,
        visibleRanges: [],
        viewColumn: 1
    };
}
(0, vitest_1.describe)('Notebook Prompt Rendering', function () {
    let accessor;
    const contexts = [];
    const treatmeants = {
        'copilotchat.notebookPackages': false,
        'copilotchat.notebookPriorities': false
    };
    (0, vitest_1.beforeAll)(() => {
        const notebookEditor = getFakeNotebookEditor();
        contexts.length = 0;
        contexts.push(getFakeDocumentContext(notebookEditor.notebook, 0));
        contexts.push(getFakeDocumentContext(notebookEditor.notebook, 1));
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        testingServiceCollection.define(tabsAndEditorsService_1.ITabsAndEditorsService, new simulationWorkspaceServices_1.TestingTabsAndEditorsService({
            getActiveTextEditor: () => undefined,
            getVisibleTextEditors: () => [],
            getActiveNotebookEditor: () => notebookEditor
        }));
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new class extends workspaceService_1.AbstractWorkspaceService {
            constructor() {
                super(...arguments);
                this.textDocuments = [];
                this.notebookDocuments = [notebookEditor.notebook];
                this.onDidOpenTextDocument = event_1.Event.None;
                this.onDidCloseTextDocument = event_1.Event.None;
                this.onDidOpenNotebookDocument = event_1.Event.None;
                this.onDidCloseNotebookDocument = event_1.Event.None;
                this.onDidChangeTextDocument = event_1.Event.None;
                this.onDidChangeWorkspaceFolders = event_1.Event.None;
                this.onDidChangeNotebookDocument = event_1.Event.None;
                this.onDidChangeTextEditorSelection = event_1.Event.None;
            }
            openTextDocument(uri) {
                throw new Error('Method not implemented.');
            }
            showTextDocument(document) {
                throw new Error('Method not implemented.');
            }
            async openNotebookDocument(arg1, arg2) {
                throw new Error('Method not implemented.');
            }
            getWorkspaceFolders() {
                return [];
            }
            getWorkspaceFolderName(workspaceFolderUri) {
                return '';
            }
            ensureWorkspaceIsFullyLoaded() {
                throw new Error('Method not implemented.');
            }
            async showWorkspaceFolderPicker() {
                return;
            }
            applyEdit(edit) {
                throw new Error('Method not implemented.');
            }
        });
        testingServiceCollection.define(nullExperimentationService_1.IExperimentationService, new class extends nullExperimentationService_1.NullExperimentationService {
            getTreatmentVariable(_name) {
                if (_name === 'copilotchat.notebookPackages' || _name === 'copilotchat.notebookPriorities') {
                    return treatmeants[_name];
                }
                return undefined;
            }
        });
        testingServiceCollection.define(notebookService_1.INotebookService, new class {
            async getVariables(notebook) {
                return [
                    {
                        variable: {
                            name: 'x',
                            value: '1',
                            type: 'int',
                            summary: 'int'
                        },
                        hasNamedChildren: false,
                        indexedChildrenCount: 0
                    }
                ];
            }
            async getPipPackages(notebook) {
                return [
                    { name: 'numpy', version: '1.0.0' }
                ];
            }
            setVariables(notebook, variables) {
            }
            getCellExecutions(notebook) {
                return [];
            }
            runCells(notebook, range, autoreveal) {
                return Promise.resolve();
            }
            ensureKernelSelected(notebook) {
                return Promise.resolve();
            }
            populateNotebookProviders() {
                return;
            }
            hasSupportedNotebooks(uri) {
                return false;
            }
            trackAgentUsage() { }
            setFollowState(state) { }
            getFollowState() {
                return false;
            }
        });
        const mockLogger = {
            error: () => { },
            warn: () => { },
            info: () => { },
            debug: () => { },
            trace: () => { },
            show: () => { }
        };
        testingServiceCollection.define(alternativeContent_1.IAlternativeNotebookContentService, new simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService('json'));
        testingServiceCollection.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator(new simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService('json'), new diffServiceImpl_1.DiffServiceImpl(), new class {
            constructor() {
                this.internal = mockLogger;
                this.logger = mockLogger;
                this.trace = mockLogger.trace;
                this.debug = mockLogger.debug;
                this.info = mockLogger.info;
                this.warn = mockLogger.warn;
                this.error = mockLogger.error;
            }
            show(preserveFocus) {
                //
            }
        }(), new nullTelemetryService_1.NullTelemetryService()));
        accessor = testingServiceCollection.createTestingAccessor();
    });
    (0, vitest_1.beforeEach)(() => {
        treatmeants['copilotchat.notebookPackages'] = false;
        treatmeants['copilotchat.notebookPriorities'] = false;
    });
    (0, vitest_1.test)('Notebook prompt structure is rendered correctly', async function () {
        const endpoint = accessor.get(instantiation_1.IInstantiationService).createInstance(mockEndpoint_1.MockEndpoint, undefined);
        const progressReporter = { report() { } };
        const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, inlineChatNotebookGeneratePrompt_1.InlineChatNotebookGeneratePrompt, {
            documentContext: contexts[1],
            promptContext: {
                query: 'print hello world',
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                history: [],
            }
        });
        const promptResult = await renderer.render(progressReporter, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(promptResult.messages.length).toBe(5);
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[0].content)).contains('AI programming'); // System message
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[1].content)).contains('I am working on a Jupyter notebook'); // Notebook Document Context
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[2].content)).contains('Now I edit a cell'); // Current Cell
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[3].content)).contains('The following variables'); // Variables
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[4].content)).contains('print hello world'); // User Query
    });
    (0, vitest_1.test)('Disable package should not render packages', async function () {
        treatmeants['copilotchat.notebookPackages'] = true;
        const endpoint = accessor.get(instantiation_1.IInstantiationService).createInstance(mockEndpoint_1.MockEndpoint, undefined);
        const progressReporter = { report() { } };
        const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, inlineChatNotebookGeneratePrompt_1.InlineChatNotebookGeneratePrompt, {
            documentContext: contexts[1],
            promptContext: {
                query: 'print hello world',
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                history: [],
            }
        });
        const promptResult = await renderer.render(progressReporter, cancellation_1.CancellationToken.None);
        /**
         * System+Instructions
         * Notebook Document Context
         * Current Cell
         * Variables
         * User Query
         */
        (0, vitest_1.expect)(promptResult.messages.length).toBe(5);
    });
    (0, vitest_1.test)('Priorities: Package should be dropped first', async function () {
        treatmeants['copilotchat.notebookPriorities'] = true;
        const endpoint = {
            modelMaxPromptTokens: 880,
            supportsToolCalls: false,
            supportsVision: false,
            supportsPrediction: false,
            isPremium: false,
            multiplier: 0,
            maxOutputTokens: 4096,
            tokenizer: tokenizer_2.TokenizerType.O200K,
            name: 'Test',
            family: 'Test',
            version: 'Test',
            policy: 'enabled',
            showInModelPicker: false,
            isDefault: false,
            isFallback: false,
            urlOrRequestMetadata: '',
            model: "gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */,
            acquireTokenizer() {
                return accessor.get(tokenizer_1.ITokenizerProvider).acquireTokenizer({ tokenizer: tokenizer_2.TokenizerType.O200K });
            },
            processResponseFromChatEndpoint: async () => { throw new Error('Method not implemented.'); },
            acceptChatPolicy: async () => true,
            cloneWithTokenOverride: () => endpoint,
            createRequestBody: () => { return {}; },
            makeChatRequest2: () => { throw new Error('Method not implemented.'); },
            makeChatRequest: async () => { throw new Error('Method not implemented.'); },
        };
        const progressReporter = { report() { } };
        const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), endpoint, inlineChatNotebookGeneratePrompt_1.InlineChatNotebookGeneratePrompt, {
            documentContext: contexts[1],
            promptContext: {
                query: 'print hello world',
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                history: [],
            }
        });
        const promptResult = await renderer.render(progressReporter, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(promptResult.messages.length).toBe(5);
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[3].content)).contains('The following variables'); // Variables
        (0, vitest_1.expect)((0, globalStringUtils_1.getTextPart)(promptResult.messages[4].content)).contains('print hello world'); // User Query
    });
});
//# sourceMappingURL=notebookPromptRendering.spec.js.map