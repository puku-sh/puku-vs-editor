"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const vitest_1 = require("vitest");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const chatResponseStreamImpl_1 = require("../../../../../util/common/chatResponseStreamImpl");
const textDocument_1 = require("../../../../../util/common/test/shims/textDocument");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const types_1 = require("../../../../../util/vs/base/common/types");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../../../prompt/common/chatVariablesCollection");
const workingCopies_1 = require("../../../../prompts/node/inline/workingCopies");
const services_1 = require("../../../../test/node/services");
const replaceStringTool_1 = require("../../../node/replaceStringTool");
(0, vitest_1.suite)('ReplaceString Tool', () => {
    let accessor;
    const path = (0, path_1.join)(__dirname, 'fixtures/math.js.txt');
    const fileTsUri = uri_1.URI.file(path);
    (0, vitest_1.beforeEach)(function () {
        const services = (0, services_1.createExtensionUnitTestingServices)();
        const content = String((0, fs_1.readFileSync)(path));
        const testDoc = (0, textDocument_1.createTextDocumentData)(fileTsUri, content, 'ts').document;
        services.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [[fileTsUri], [testDoc]]));
        accessor = services.createTestingAccessor();
    });
    (0, vitest_1.it)('whitespace change everywhere', async () => {
        const input = JSON.parse(`{
  "filePath": "${path.replaceAll('\\', '\\\\')}",
  "oldString": "export function div(a, b) {\\n  // console.log fff fff\\n  return a / b;\\n}",
  "newString": "export function div(A, b) {\\n  // console.log fff fff\\n  return A / b;\\n}"
}`);
        const tool = accessor.get(instantiation_1.IInstantiationService).createInstance(replaceStringTool_1.ReplaceStringTool);
        (0, vitest_1.expect)(tool).toBeDefined();
        const document = accessor.get(workspaceService_1.IWorkspaceService).textDocuments.find(doc => doc.uri.toString() === fileTsUri.toString());
        (0, types_1.assertType)(document);
        const workingCopyDocument = new workingCopies_1.WorkingCopyOriginalDocument(document.getText());
        (0, vitest_1.expect)(document.getText().includes(input.oldString)).toBe(false); // TAB vs SPACES
        let seenEdits = 0;
        const stream = new chatResponseStreamImpl_1.ChatResponseStreamImpl((part) => {
            if (part instanceof vscodeTypes_1.ChatResponseTextEditPart) {
                const offsetEdits = workingCopyDocument.transformer.toOffsetEdit(part.edits);
                if (!workingCopyDocument.isNoop(offsetEdits)) {
                    seenEdits++;
                    workingCopyDocument.applyOffsetEdits(offsetEdits);
                }
            }
        }, () => { }, () => { });
        const input2 = await tool.resolveInput(input, {
            history: [],
            stream,
            query: 'change a to A',
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
        });
        await tool.invoke({ input: input2, toolInvocationToken: undefined }, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(seenEdits).toBe(1);
        (0, vitest_1.expect)(workingCopyDocument.text).toMatchFileSnapshot('fixtures/math.js.txt.expected');
    });
});
//# sourceMappingURL=replaceStringTool.spec.js.map