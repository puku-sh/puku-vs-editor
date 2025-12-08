"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const documentId_1 = require("../../../../platform/inlineEdits/common/dataTypes/documentId");
const logService_1 = require("../../../../platform/log/common/logService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const textEditor_1 = require("../../../../util/common/test/shims/textEditor");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const observableInternal_1 = require("../../../../util/vs/base/common/observableInternal");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const inlineEditModel_1 = require("../../vscode-node/inlineEditModel");
(0, vitest_1.suite)('InlineEditModel', () => {
    (0, vitest_1.suite)('InlineEditTriggerer', () => {
        let disposables;
        let vscWorkspace;
        let workspaceService;
        let signalFiredCount = 0;
        let nextEditProvider;
        (0, vitest_1.beforeEach)(() => {
            disposables = new lifecycle_1.DisposableStore();
            signalFiredCount = 0;
            const signal = (0, observableInternal_1.observableSignal)('test');
            disposables.add(event_1.Event.fromObservableLight(signal)(() => signalFiredCount++));
            vscWorkspace = new MockVSCodeWorkspace();
            nextEditProvider = { lastRejectionTime: Date.now(), lastTriggerTime: Date.now() };
            workspaceService = disposables.add(new testWorkspaceService_1.TestWorkspaceService());
            const services = disposables.add((0, services_1.createExtensionUnitTestingServices)());
            const accessor = disposables.add(services.createTestingAccessor());
            disposables.add(new inlineEditModel_1.InlineEditTriggerer(vscWorkspace, nextEditProvider, signal, accessor.get(logService_1.ILogService), accessor.get(configurationService_1.IConfigurationService), accessor.get(nullExperimentationService_1.IExperimentationService), workspaceService));
        });
        (0, vitest_1.afterEach)(() => {
            disposables.dispose();
        });
        (0, vitest_1.test)('No Signal if there were no changes', () => {
            const { textEditor, selection } = createTextDocument();
            triggerTextSelectionChange(textEditor, selection);
            vitest_1.assert.strictEqual(signalFiredCount, 0, 'Signal should not have been fired');
        });
        (0, vitest_1.test)('No Signal if selection is not empty', () => {
            const { document, textEditor, selection } = createTextDocument(new vscodeTypes_1.Selection(0, 0, 0, 10));
            triggerTextChange(document);
            triggerTextSelectionChange(textEditor, selection);
            vitest_1.assert.strictEqual(signalFiredCount, 0, 'Signal should not have been fired');
        });
        (0, vitest_1.test)('Signal when last rejection was over 10s ago', () => {
            const { document, textEditor, selection } = createTextDocument();
            nextEditProvider.lastRejectionTime = Date.now() - (10 * 1000);
            triggerTextChange(document);
            triggerTextSelectionChange(textEditor, selection);
            vitest_1.assert.isAtLeast(signalFiredCount, 1, 'Signal should have been fired');
        });
        function triggerTextChange(document) {
            workspaceService.didChangeTextDocumentEmitter.fire({
                document,
                contentChanges: [],
                reason: undefined
            });
        }
        function triggerTextSelectionChange(textEditor, selection) {
            workspaceService.didChangeTextEditorSelectionEmitter.fire({
                kind: vscodeTypes_1.TextEditorSelectionChangeKind.Keyboard,
                selections: [selection],
                textEditor,
            });
        }
        function createObservableTextDoc(uri) {
            return {
                id: documentId_1.DocumentId.create(uri.toString()),
                toRange: (_, range) => range
            };
        }
        class MockVSCodeWorkspace {
            constructor() {
                this.documents = new WeakMap();
            }
            addDoc(doc, obsDoc) {
                this.documents.set(doc, obsDoc);
            }
            getDocumentByTextDocument(doc, reader) {
                return this.documents.get(doc);
            }
        }
        function createTextDocument(selection = new vscodeTypes_1.Selection(0, 0, 0, 0), uri = vscodeTypes_1.Uri.file('sample.py'), content = 'print("Hello World")') {
            const doc = (0, textDocument_1.createTextDocumentData)(vscodeTypes_1.Uri.file('sample.py'), 'print("Hello World")', 'python');
            const textEditor = new textEditor_1.ExtHostTextEditor(doc.document, [selection], {}, [], undefined);
            vscWorkspace.addDoc(doc.document, createObservableTextDoc(doc.document.uri));
            return {
                document: doc.document,
                textEditor: textEditor.value,
                selection
            };
        }
    });
});
//# sourceMappingURL=inlineEditModel.spec.js.map