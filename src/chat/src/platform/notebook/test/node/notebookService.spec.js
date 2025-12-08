"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const notebooks_1 = require("../../../../util/common/notebooks");
const notebookDocument_1 = require("../../../../util/common/test/shims/notebookDocument");
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
(0, vitest_1.describe)('NotebookService', () => {
    (0, vitest_1.suite)('hasSupportedNotebooks', () => {
        // all real providers pulled from package.json of various extensions
        const jupyterNotebookProvider = {
            type: 'jupyter-notebook',
            displayName: 'Jupyter Notebook',
            priority: notebooks_1.RegisteredEditorPriority.default,
            selector: [{ filenamePattern: '*.ipynb' }]
        };
        const kustoNotebookProvider = {
            type: 'kusto-notebook',
            displayName: 'Kusto Notebook',
            selector: [{ filenamePattern: '*.knb' }]
        };
        const kustoNotebookProvider2 = {
            type: 'kusto-notebook-kql',
            displayName: 'Kusto Notebook',
            priority: notebooks_1.RegisteredEditorPriority.option,
            selector: [{ filenamePattern: '*.kql' }, { filenamePattern: '*.csl' }]
        };
        const ghinbNotebookProvider = {
            type: 'github-issues',
            displayName: 'GitHub Issues Notebook',
            selector: [{ filenamePattern: '*.github-issues' }]
        };
        (0, vitest_1.suite)('mock tests', () => {
            (0, vitest_1.it)('should return false when no providers are registered', async () => {
                const notebookDocument = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isFalse((0, notebooks_1._hasSupportedNotebooks)(notebookDocument.uri, [], [], []), 'Notebook with .ipynb extension should not be supported when there are no providers registered.');
            });
            (0, vitest_1.it)('should support untitled notebooks with matching provider', async () => {
                const untitledUri = uri_1.URI.from({
                    scheme: 'untitled',
                    authority: '',
                    path: 'Untitled-1.ipynb',
                    query: 'jupyter-notebook',
                    fragment: '',
                });
                const untitledNotebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(untitledUri, new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                const provider = {
                    type: 'test-provider',
                    displayName: 'Test Provider',
                    priority: notebooks_1.RegisteredEditorPriority.default,
                    selector: ['*.ipynb']
                };
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(untitledNotebook.uri, [untitledNotebook], [provider], []), 'Untitled notebook with .ipynb extension should be supported by a provider with a matching selector.');
            });
            (0, vitest_1.it)('should support notebooks with basic string selector', async () => {
                const provider = {
                    type: 'test-provider',
                    displayName: 'Test Provider',
                    priority: notebooks_1.RegisteredEditorPriority.default,
                    selector: ['*.ipynb']
                };
                const notebookDocument = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(notebookDocument.uri, [], [provider], []), 'Notebook with .ipynb extension should be supported by a provider with a basic string selector.');
            });
            (0, vitest_1.it)('should support case-insensitive selector matching for file extensions', async () => {
                const provider = {
                    type: 'test-provider',
                    displayName: 'Test Provider',
                    priority: notebooks_1.RegisteredEditorPriority.default,
                    selector: ['*.ipynb']
                };
                const notebookDocument = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.IPYNB'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(notebookDocument.uri, [], [provider], []), 'Notebook with .IPYNB extension should be supported by a provider due to case-insensitive selectors.');
            });
            (0, vitest_1.it)('should respect include and exclude patterns in provider selector', async () => {
                const provider = {
                    type: 'test-provider',
                    displayName: 'Test Provider',
                    priority: notebooks_1.RegisteredEditorPriority.default,
                    selector: [{
                            include: '*.ipynb',
                            exclude: 'test.*'
                        }]
                };
                // Test file that matches include but not exclude
                const valid = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(valid.uri, [], [provider], []), 'Notebook matching only the include pattern should be supported.');
                // Test file that matches both include and exclude
                const excluded = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('test.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isFalse((0, notebooks_1._hasSupportedNotebooks)(excluded.uri, [], [provider], []), 'Notebook matching both include and exclude patterns should not be supported.');
                // Test file that doesn't match either pattern
                const nonMatching = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.txt'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isFalse((0, notebooks_1._hasSupportedNotebooks)(nonMatching.uri, [], [provider], []), 'Notebook matching neither include nor exclude pattern should not be supported.');
                // Test file in a subdirectory
                const subDirValid = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('subdir/one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(subDirValid.uri, [], [provider], []), 'Notebook in subdirectory matching include pattern should be supported.');
                // Test remote URI
                const remoteValid = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.parse('vscode-remote://ssh-remote+test/one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(remoteValid.uri, [], [provider], []), 'Notebook with remote URI matching include pattern should be supported.');
            });
            (0, vitest_1.it)('should respect filenamePattern and excludeFileNamePattern in provider selector', async () => {
                const provider = {
                    type: 'test-provider',
                    displayName: 'Test Provider',
                    priority: notebooks_1.RegisteredEditorPriority.default,
                    selector: [{
                            filenamePattern: '*.ipynb',
                            excludeFileNamePattern: 'test.*'
                        }]
                };
                // Test file that matches include but not exclude
                const valid = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('one.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(valid.uri, [], [provider], []), 'Notebook matching filenamePattern but not excludeFileNamePattern should be supported.');
                // Test file that matches both include and exclude
                const excluded = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('test.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                vitest_1.assert.isFalse((0, notebooks_1._hasSupportedNotebooks)(excluded.uri, [], [provider], []), 'Notebook matching both filenamePattern and excludeFileNamePattern should not be supported.');
            });
            (0, vitest_1.it)('should return false when only providers with valid selector have non-default priority', async () => {
                const testNotebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('test.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                const providers = [
                    {
                        type: 'provider1',
                        displayName: 'Provider 1',
                        priority: notebooks_1.RegisteredEditorPriority.option,
                        selector: ['*.ipynb']
                    },
                    {
                        type: 'provider2',
                        displayName: 'Provider 2',
                        priority: notebooks_1.RegisteredEditorPriority.default,
                        selector: ['*.other']
                    }
                ];
                vitest_1.assert.isFalse((0, notebooks_1._hasSupportedNotebooks)(testNotebook.uri, [], providers, []), 'Notebook with .ipynb extension should not be supported when only non-default priority providers match.');
            });
            (0, vitest_1.it)('should return true when a provider with valid selector has default priority', async () => {
                const testNotebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('test.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                const providers = [
                    {
                        type: 'provider1',
                        displayName: 'Provider 1',
                        priority: notebooks_1.RegisteredEditorPriority.default,
                        selector: ['*.ipynb']
                    },
                    {
                        type: 'provider2',
                        displayName: 'Provider 2',
                        priority: notebooks_1.RegisteredEditorPriority.default,
                        selector: ['*.other']
                    }
                ];
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(testNotebook.uri, [], providers, []), 'Notebook with .ipynb extension should be supported when a provider with default priority matches.');
            });
            (0, vitest_1.it)('should return true when only option-priority providers match but there is a matching editor association', async () => {
                const testNotebook = notebookDocument_1.ExtHostNotebookDocumentData.fromNotebookData(uri_1.URI.file('test.ipynb'), new vscodeTypes_1.NotebookData([]), 'jupyter-notebook').document;
                const associations = [{ viewType: 'option-provider', filenamePattern: '*.ipynb' }];
                const providers = [{
                        type: 'option-provider',
                        displayName: 'Option Provider',
                        priority: notebooks_1.RegisteredEditorPriority.option,
                        selector: ['*.ipynb']
                    }];
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(testNotebook.uri, [], providers, associations), 'Notebook with .ipynb extension should be supported when an option-priority provider matches and there is a matching editor association.');
            });
        });
        (0, vitest_1.suite)('real extension tests', () => {
            (0, vitest_1.it)('should return true for providers with no set priority, due to default fallback', async () => {
                const ghinbUri = uri_1.URI.from({
                    scheme: 'file',
                    authority: '',
                    path: '_endgame.github-issues',
                    query: '',
                    fragment: '',
                });
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(ghinbUri, [], [ghinbNotebookProvider], []), 'Notebook with .github-issues extension should be supported even when there is no valid editor association.');
            });
            (0, vitest_1.it)('should return true for github issues notebook provider with *.github-issues uri and a valid association', async () => {
                const ghinbUri = uri_1.URI.from({
                    scheme: 'file',
                    authority: '',
                    path: '_endgame.github-issues',
                    query: '',
                    fragment: '',
                });
                const ghinbAssociation = { viewType: 'github-issues', filenamePattern: '*.github-issues' };
                vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(ghinbUri, [], [ghinbNotebookProvider], [ghinbAssociation]), 'Notebook with .github-issues extension should be supported when there is a valid editor association.');
            });
            (0, vitest_1.it)('should return true for various notebook files with multiple providers and all valid associations', async () => {
                const providers = [ghinbNotebookProvider, jupyterNotebookProvider, kustoNotebookProvider, kustoNotebookProvider2];
                const associations = [
                    { viewType: 'jupyter-notebook', filenamePattern: '*.ipynb' },
                    { viewType: 'kusto-notebook', filenamePattern: '*.knb' },
                    { viewType: 'kusto-notebook-kql', filenamePattern: '*.kql' },
                    { viewType: 'kusto-notebook-kql', filenamePattern: '*.csl' },
                    { viewType: 'github-issues', filenamePattern: '*.github-issues' }
                ];
                const testFiles = [
                    uri_1.URI.file('test.ipynb'),
                    uri_1.URI.file('test.knb'),
                    uri_1.URI.file('test.kql'),
                    uri_1.URI.file('test.csl'),
                    uri_1.URI.file('test.github-issues'),
                ];
                for (const testFile of testFiles) {
                    vitest_1.assert.isTrue((0, notebooks_1._hasSupportedNotebooks)(testFile, [], providers, associations), `Notebook with extension matching a provider and association should be supported: ${testFile.toString()}`);
                }
            });
        });
    });
});
//# sourceMappingURL=notebookService.spec.js.map