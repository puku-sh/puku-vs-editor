"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.testExtensionsForLanguage = void 0;
const jsTsExtensionData = {
    perFramework: new Map([
        ['mocha', { name: 'Mocha Test Explorer', id: 'hbenl.vscode-mocha-test-adapter' }],
        ['jest', { name: 'Jest', id: 'Orta.vscode-jest' }],
        ['vitest', { name: 'Vitest', id: 'vitest.explorer' }],
        ['playwright', { name: 'Playwright Test for VSCode', id: 'ms-playwright.playwright' }],
        ['jasmine', { name: 'Jasmine Test Explorer', id: 'hbenl.vscode-jasmine-test-adapter' }],
    ]),
};
/** Languages where the extension used to test the language is well-known */
exports.testExtensionsForLanguage = new Map([
    ['python', {
            forLanguage: {
                extension: { id: 'ms-python.python', name: 'Python' },
                associatedFrameworks: ['pytest', 'unittest']
            }
        }],
    ['rust', {
            forLanguage: { extension: { id: 'rust-lang.rust-analyzer', name: 'rust-analyzer' } }
        }],
    ['java', {
            forLanguage: {
                extension: { id: 'vscjava.vscode-java-test', name: 'Test Runner for Java' }, associatedFrameworks: ['junit', 'testng']
            }
        }],
    ['csharp', {
            forLanguage: {
                extension: { id: 'ms-dotnettools.csharp', name: 'C#' }
            }
        }],
    ['go', {
            forLanguage: {
                extension: { id: 'golang.Go', name: 'Go' }
            },
        }],
    ['typescript', jsTsExtensionData],
    ['javascript', jsTsExtensionData],
    ['javascriptreact', jsTsExtensionData],
    ['typescriptreact', jsTsExtensionData],
]);
//# sourceMappingURL=setupTestExtensions.js.map