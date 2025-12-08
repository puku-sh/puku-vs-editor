"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const testLanguageDiagnosticsService_1 = require("../../../../platform/languages/common/testLanguageDiagnosticsService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const getErrorsTool_1 = require("../getErrorsTool");
const toolTestUtils_1 = require("./toolTestUtils");
(0, vitest_1.suite)('GetErrorsResult', () => {
    let accessor;
    let collection;
    let diagnosticsService;
    // Avoid creating windows paths
    const workspaceFolder = uri_1.URI.file('/test/workspace');
    const tsDocUri = uri_1.URI.file('/test/workspace/file.ts');
    const tsDoc = (0, textDocument_1.createTextDocumentData)(tsDocUri, 'line 1\nline 2\n\nline 4\nline 5', 'ts').document;
    const tsDocUri2 = uri_1.URI.file('/test/workspace/file2.ts');
    const tsDoc2 = (0, textDocument_1.createTextDocumentData)(tsDocUri2, 'line 1\nline 2\n\nline 4\nline 5', 'ts').document;
    (0, vitest_1.beforeEach)(() => {
        collection = (0, services_1.createExtensionUnitTestingServices)();
        collection.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [[workspaceFolder], [tsDoc, tsDoc2]]));
        diagnosticsService = new testLanguageDiagnosticsService_1.TestLanguageDiagnosticsService();
        collection.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, diagnosticsService);
        accessor = collection.createTestingAccessor();
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    async function getDiagnostics(uri) {
        const document = await accessor.get(workspaceService_1.IWorkspaceService).openTextDocumentAndSnapshot(uri);
        const tsDocDiagnostics = {
            context: {
                document,
                language: (0, languages_1.getLanguage)(document)
            },
            diagnostics: [
                {
                    message: 'error',
                    range: new vscodeTypes_1.Range(0, 0, 0, 2),
                    severity: vscodeTypes_1.DiagnosticSeverity.Error
                },
                {
                    message: 'error 2',
                    range: new vscodeTypes_1.Range(1, 0, 1, 2),
                    severity: vscodeTypes_1.DiagnosticSeverity.Error
                },
            ],
            uri
        };
        return tsDocDiagnostics;
    }
    (0, vitest_1.test)('simple diagnostics', async () => {
        const element = vscpp(getErrorsTool_1.DiagnosticToolOutput, { diagnosticsGroups: [await getDiagnostics(tsDocUri)] });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.renderElementToString)(accessor, element)).toMatchSnapshot();
    });
    (0, vitest_1.test)('diagnostics with max', async () => {
        const element = vscpp(getErrorsTool_1.DiagnosticToolOutput, { diagnosticsGroups: [await getDiagnostics(tsDocUri)], maxDiagnostics: 1 });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.renderElementToString)(accessor, element)).toMatchSnapshot();
    });
    (0, vitest_1.test)('diagnostics with more complex max', async () => {
        const element = vscpp(getErrorsTool_1.DiagnosticToolOutput, { diagnosticsGroups: [await getDiagnostics(tsDocUri), await getDiagnostics(tsDocUri2)], maxDiagnostics: 3 });
        (0, vitest_1.expect)(await (0, toolTestUtils_1.renderElementToString)(accessor, element)).toMatchSnapshot();
    });
});
//# sourceMappingURL=getErrorsResult.spec.js.map