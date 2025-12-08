"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const textDocument_1 = require("../../../../../util/common/test/shims/textDocument");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const services_1 = require("../../../../test/node/services");
const promptRenderer_1 = require("../../base/promptRenderer");
const fileVariable_1 = require("../fileVariable");
(0, vitest_1.describe)('FileVariable', () => {
    let accessor;
    (0, vitest_1.beforeAll)(() => {
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
    });
    (0, vitest_1.test)('does not include unknown untitled file', async () => {
        const result = await (0, promptRenderer_1.renderPromptElementJSON)(accessor.get(instantiation_1.IInstantiationService), fileVariable_1.FileVariable, {
            variableName: '',
            variableValue: vscodeTypes_1.Uri.parse('untitled:Untitled-1'),
        });
        (0, vitest_1.expect)(result).toMatchSnapshot();
    });
    (0, vitest_1.test)('does include known untitled file', async () => {
        const untitledUri = vscodeTypes_1.Uri.parse('untitled:Untitled-1');
        const untitledDoc = (0, textDocument_1.createTextDocumentData)(untitledUri, 'test!', 'python').document;
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new testWorkspaceService_1.TestWorkspaceService(undefined, [untitledDoc]));
        accessor = testingServiceCollection.createTestingAccessor();
        const result = await (0, promptRenderer_1.renderPromptElementJSON)(accessor.get(instantiation_1.IInstantiationService), fileVariable_1.FileVariable, {
            variableName: '',
            variableValue: vscodeTypes_1.Uri.parse('untitled:Untitled-1'),
        });
        (0, vitest_1.expect)(JSON.stringify(result, undefined, 2)).toMatchSnapshot();
    });
});
//# sourceMappingURL=fileVariable.spec.js.map