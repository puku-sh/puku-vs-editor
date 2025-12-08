"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const mockFileSystemService_1 = require("../../../../platform/filesystem/node/test/mockFileSystemService");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const testLanguageDiagnosticsService_1 = require("../../../../platform/languages/common/testLanguageDiagnosticsService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const services_1 = require("../../../test/node/services");
const getErrorsTool_1 = require("../getErrorsTool");
const toolTestUtils_1 = require("./toolTestUtils");
// Test the GetErrorsTool functionality
(0, vitest_1.suite)('GetErrorsTool - Tool Invocation', () => {
    let accessor;
    let collection;
    let diagnosticsService;
    let fileSystemService;
    let tool;
    const workspaceFolder = uri_1.URI.file('/test/workspace');
    const srcFolder = uri_1.URI.file('/test/workspace/src');
    const tsFile1 = uri_1.URI.file('/test/workspace/src/file1.ts');
    const tsFile2 = uri_1.URI.file('/test/workspace/src/file2.ts');
    const jsFile = uri_1.URI.file('/test/workspace/lib/file.js');
    const noErrorFile = uri_1.URI.file('/test/workspace/src/noErrorFile.ts');
    const eslintErrorFile = uri_1.URI.file('/test/workspace/eslint/eslint_unexpected_constant_condition_1.ts');
    (0, vitest_1.beforeEach)(() => {
        collection = (0, services_1.createExtensionUnitTestingServices)();
        // Set up test documents
        const tsDoc1 = (0, textDocument_1.createTextDocumentData)(tsFile1, 'function test() {\n  const x = 1;\n  return x;\n}', 'ts').document;
        const tsDoc2 = (0, textDocument_1.createTextDocumentData)(tsFile2, 'interface User {\n  name: string;\n  age: number;\n}', 'ts').document;
        const jsDoc = (0, textDocument_1.createTextDocumentData)(jsFile, 'function legacy() {\n  var y = 2;\n  return y;\n}', 'js').document;
        const noErrorDoc = (0, textDocument_1.createTextDocumentData)(noErrorFile, '', 'ts').document;
        const eslintErrorDoc = (0, textDocument_1.createTextDocumentData)(eslintErrorFile, 'if (true) {\n  console.log("This is a constant condition");\n}', 'ts').document;
        collection.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [[workspaceFolder], [tsDoc1, tsDoc2, jsDoc, noErrorDoc, eslintErrorDoc]]));
        // Set up diagnostics service
        diagnosticsService = new testLanguageDiagnosticsService_1.TestLanguageDiagnosticsService();
        collection.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, diagnosticsService);
        // Set up file system service to mock directories
        fileSystemService = new mockFileSystemService_1.MockFileSystemService();
        fileSystemService.mockDirectory(srcFolder, []);
        collection.define(fileSystemService_1.IFileSystemService, fileSystemService);
        accessor = collection.createTestingAccessor();
        // Create the tool instance
        tool = accessor.get(instantiation_1.IInstantiationService).createInstance(getErrorsTool_1.GetErrorsTool);
        // Add test diagnostics
        diagnosticsService.setDiagnostics(tsFile1, [
            {
                message: 'Variable is declared but never used',
                range: new vscodeTypes_1.Range(1, 8, 1, 9),
                severity: vscodeTypes_1.DiagnosticSeverity.Warning
            },
            {
                message: 'Missing return type annotation',
                range: new vscodeTypes_1.Range(0, 9, 0, 13),
                severity: vscodeTypes_1.DiagnosticSeverity.Error
            }
        ]);
        diagnosticsService.setDiagnostics(tsFile2, [
            {
                message: 'Interface should be exported',
                range: new vscodeTypes_1.Range(0, 0, 0, 9),
                severity: vscodeTypes_1.DiagnosticSeverity.Information // Should be filtered out
            },
            {
                message: 'Property age should be optional',
                range: new vscodeTypes_1.Range(2, 2, 2, 5),
                severity: vscodeTypes_1.DiagnosticSeverity.Warning
            }
        ]);
        diagnosticsService.setDiagnostics(jsFile, [
            {
                message: 'Use const instead of var',
                range: new vscodeTypes_1.Range(1, 2, 1, 5),
                severity: vscodeTypes_1.DiagnosticSeverity.Warning
            }
        ]);
        diagnosticsService.setDiagnostics(eslintErrorFile, [
            {
                message: 'Unexpected constant condition.',
                range: new vscodeTypes_1.Range(1, 4, 1, 4),
                severity: vscodeTypes_1.DiagnosticSeverity.Error
            }
        ]);
    });
    (0, vitest_1.afterEach)(() => {
        accessor.dispose();
    });
    (0, vitest_1.test)('getDiagnostics - returns empty when no paths provided', () => {
        // Test getting all diagnostics
        const allDiagnostics = tool.getDiagnostics([]);
        (0, vitest_1.expect)(allDiagnostics).toEqual([]);
    });
    (0, vitest_1.test)('getDiagnostics - filters by file path', () => {
        // Test with specific file path
        const results = tool.getDiagnostics([{ uri: tsFile1, range: undefined }]);
        (0, vitest_1.expect)(results).toEqual([
            { uri: tsFile1, diagnostics: diagnosticsService.getDiagnostics(tsFile1).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning) } // Should only include Warning and Error
        ]);
    });
    (0, vitest_1.test)('getDiagnostics - filters by folder path', () => {
        // Test with folder path
        const srcFolder = uri_1.URI.file('/test/workspace/src');
        const results = tool.getDiagnostics([{ uri: srcFolder, range: undefined }]);
        // Should find diagnostics for files in the src folder
        (0, vitest_1.expect)(results).toEqual([
            { uri: tsFile1, diagnostics: diagnosticsService.getDiagnostics(tsFile1).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning), inputUri: srcFolder },
            { uri: tsFile2, diagnostics: diagnosticsService.getDiagnostics(tsFile2).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning), inputUri: srcFolder }
        ]);
    });
    (0, vitest_1.test)('getDiagnostics - filters by range', () => {
        // Test with specific range that only covers line 1
        const range = new vscodeTypes_1.Range(1, 0, 1, 10);
        const results = tool.getDiagnostics([{ uri: tsFile1, range }]);
        (0, vitest_1.expect)(results).toEqual([
            { uri: tsFile1, diagnostics: diagnosticsService.getDiagnostics(tsFile1).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning && d.range.intersection(range)) }
        ]);
    });
    (0, vitest_1.test)('getDiagnostics - file with no diagnostics returns empty diagnostics array', () => {
        const noErrorFile = uri_1.URI.file('/test/workspace/src/noErrorFile.ts');
        const results = tool.getDiagnostics([{ uri: noErrorFile, range: undefined }]);
        (0, vitest_1.expect)(results).toEqual([
            { uri: noErrorFile, diagnostics: [] }
        ]);
    });
    (0, vitest_1.test)('getDiagnostics - folder path excludes files with only Info and Hint diagnostics', () => {
        // Create a file with only Info and Hint diagnostics
        const infoHintOnlyFile = uri_1.URI.file('/test/workspace/src/infoHintOnly.ts');
        diagnosticsService.setDiagnostics(infoHintOnlyFile, [
            {
                message: 'This is just informational',
                range: new vscodeTypes_1.Range(0, 0, 0, 5),
                severity: vscodeTypes_1.DiagnosticSeverity.Information
            },
            {
                message: 'This is a hint',
                range: new vscodeTypes_1.Range(1, 0, 1, 5),
                severity: vscodeTypes_1.DiagnosticSeverity.Hint
            }
        ]);
        // Request diagnostics for the src folder
        const srcFolder = uri_1.URI.file('/test/workspace/src');
        const results = tool.getDiagnostics([{ uri: srcFolder, range: undefined }]);
        // Should only include tsFile1 and tsFile2, not infoHintOnlyFile (which has no Warning/Error)
        (0, vitest_1.expect)(results).toEqual([
            { uri: tsFile1, diagnostics: diagnosticsService.getDiagnostics(tsFile1).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning), inputUri: srcFolder },
            { uri: tsFile2, diagnostics: diagnosticsService.getDiagnostics(tsFile2).filter(d => d.severity <= vscodeTypes_1.DiagnosticSeverity.Warning), inputUri: srcFolder }
        ]);
    });
    // Tool invocation tests
    (0, vitest_1.test)('Tool invocation - with no filePaths aggregates all diagnostics and formats workspace message', async () => {
        const result = await tool.invoke({ input: {}, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
    (0, vitest_1.test)('Tool invocation - with single filePath limits diagnostics and message to that file', async () => {
        const pathRep = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
        const filePath = pathRep.getFilePath(tsFile1);
        const result = await tool.invoke({ input: { filePaths: [filePath] }, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
    (0, vitest_1.test)('Tool invocation - with folder path includes diagnostics from contained files', async () => {
        const pathRep = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
        const srcFolderUri = uri_1.URI.file('/test/workspace/src');
        const srcFolderPath = pathRep.getFilePath(srcFolderUri);
        const result = await tool.invoke({ input: { filePaths: [srcFolderPath] }, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
    (0, vitest_1.test)('Tool invocation - with filePath and range filters diagnostics to that range', async () => {
        const pathRep = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
        const filePath = pathRep.getFilePath(tsFile1);
        // Range only covering the second line (line index 1) -> should include the warning at line 1 but not the error at line 0 if it doesn't intersect
        const range = new vscodeTypes_1.Range(1, 0, 1, 50);
        const result = await tool.invoke({
            input: {
                filePaths: [filePath],
                ranges: [[range.start.line, range.start.character, range.end.line, range.end.character]]
            },
            toolInvocationToken: null
        }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
    (0, vitest_1.test)('Tool invocation - filePath with no diagnostics still has a <errors> entry', async () => {
        const pathRep = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
        const filePath = pathRep.getFilePath(noErrorFile);
        const result = await tool.invoke({ input: { filePaths: [filePath] }, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
    (0, vitest_1.test)('Tool invocation - filePath with range has a <compileError> entry', async () => {
        const pathRep = accessor.get(promptPathRepresentationService_1.IPromptPathRepresentationService);
        const filePath = pathRep.getFilePath(eslintErrorFile);
        const result = await tool.invoke({ input: { filePaths: [filePath], ranges: [[1, 4, 1, 4]] }, toolInvocationToken: null }, cancellation_1.CancellationToken.None);
        const msg = await (0, toolTestUtils_1.toolResultToString)(accessor, result);
        (0, vitest_1.expect)(msg).toMatchSnapshot();
    });
});
//# sourceMappingURL=getErrorsTool.spec.js.map