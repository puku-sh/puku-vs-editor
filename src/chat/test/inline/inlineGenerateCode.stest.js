"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const editCodeIntent_1 = require("../../src/extension/intents/node/editCodeIntent");
const generateCodeIntent_1 = require("../../src/extension/intents/node/generateCodeIntent");
const uri_1 = require("../../src/util/vs/base/common/uri");
const vscodeTypes_1 = require("../../src/vscodeTypes");
const stest_1 = require("../base/stest");
const diagnosticProviders_1 = require("../simulation/diagnosticProviders");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const outcomeValidators_1 = require("../simulation/outcomeValidators");
const stestUtil_1 = require("../simulation/stestUtil");
function executeEditTestStrategy(strategy, testingServiceCollection, scenario) {
    if (strategy === 2 /* EditTestStrategy.Inline */) {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, scenario);
    }
    else if (3 /* EditTestStrategy.InlineChatIntent */) {
        return (0, inlineChatSimulator_1.simulateInlineChatIntent)(testingServiceCollection, scenario);
    }
    else {
        throw new Error('Invalid edit test strategy');
    }
}
function forInlineAndInlineChatIntent(callback) {
    callback(2 /* EditTestStrategy.Inline */, '', undefined);
    callback(3 /* EditTestStrategy.InlineChatIntent */, '-InlineChatIntent', [['inlineChat.enableV2', true], ['chat.agent.autoFix', false]]);
}
forInlineAndInlineChatIntent((strategy, variant, nonExtensionConfigurations) => {
    (0, stest_1.ssuite)({ title: `generate${variant}`, location: 'inline' }, () => {
        (0, stest_1.stest)({ description: 'gen-ts-ltrim', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    { kind: 'relativeFile', fileName: 'new.ts', fileContents: '' }
                ],
                queries: [
                    {
                        file: 'new.ts',
                        selection: [0, 0],
                        query: 'generate a function that will remove whitespace from the start of a string',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['function', ': string'], 'gen-ts-ltrim-01');
                        },
                    },
                    {
                        query: 'change it to take as argument the characters to remove from the start',
                        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const text = outcome.fileContents;
                            const f1 = text.indexOf('function ');
                            const f2 = text.indexOf('function ', f1 + 1);
                            (0, assert_1.default)(f2 === -1);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(text, ['function', ': string'], 'gen-ts-ltrim-02');
                        },
                    },
                    {
                        query: 'add doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const text = outcome.fileContents;
                            const f1 = text.indexOf('\nfunction ');
                            const f2 = text.indexOf('\nfunction ', f1 + 1);
                            (0, assert_1.default)(f2 === -1);
                            return (0, outcomeValidators_1.assertContainsAllSnippets)(text, ['function', ': string', '/**'], 'gen-ts-ltrim-03');
                        },
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'Generate a nodejs server', language: 'javascript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{ kind: 'relativeFile', fileName: 'server.js', fileContents: '' }],
                queries: [
                    {
                        file: 'server.js',
                        selection: [0, 0],
                        query: 'generate a nodejs server that responds with "Hello World"',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['http', 'createServer', 'listen', 'Hello World']);
                        },
                    },
                    {
                        query: 'change it to respond with "Goodbye World"',
                        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['http', 'createServer', 'listen', 'Goodbye World']);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'generate rtrim', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            if (1) {
                throw new Error('SKIPPED');
            }
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-top-level-function/charCode.ts'),
                    (0, stestUtil_1.fromFixture)('gen-top-level-function/strings.ts'),
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [770, 0],
                        query: 'generate rtrim',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 770,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 770,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['rtrim', 'needle.length']);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #2342: Use inline chat to generate a new function/property replaces other code', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-top-level-function/charCode.ts'),
                    (0, stestUtil_1.fromFixture)('gen-top-level-function/strings.ts'),
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [31, 0],
                        query: 'generate a fibonacci',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 31,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 31,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            const changedModifiedLines = edit.changedModifiedLines.join('\n');
                            (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['function']);
                            (0, stestUtil_1.assertOneOf)([
                                () => (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['fibonacci']),
                                () => (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['Fibonacci']), // e.g., `generateFibonacci()`
                            ]);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3602: gen method', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-method-issue-3602/editor.ts'),
                ],
                queries: [
                    {
                        file: 'editor.ts',
                        selection: [39, 0],
                        query: 'add an async function that moves a block of lines up by one',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 39,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 39,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            const changedModifiedLines = edit.changedModifiedLines.join('\n');
                            (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['async'], 'gen-method-issue-3602');
                            (0, stestUtil_1.assertOneOf)([
                                () => (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['moveBlockUp']),
                                () => (0, outcomeValidators_1.assertContainsAllSnippets)(changedModifiedLines, ['moveLinesUp']),
                            ]);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3604: gen nestjs route', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-nestjs-route-issue-3604/app.controller.ts'),
                ],
                queries: [
                    {
                        file: 'app.controller.ts',
                        selection: [12, 4],
                        query: 'add a new /about page',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 12,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 12,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['@Get', '(): string']);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'gen a palindrom fn', language: 'python', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    { kind: 'relativeFile', fileName: 'new.py', fileContents: '' }
                ],
                queries: [
                    {
                        file: 'new.py',
                        selection: [0, 0],
                        query: 'generate a function that checks if a string is a palindrome',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['def', '[::-1]'], 'gen-python-palindrome');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3597: gen twice', language: 'javascript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-twice-issue-3597/new.js')
                ],
                queries: [
                    {
                        file: 'new.js',
                        selection: [27, 0],
                        query: 'create a function that checks whether a given number is a prime number',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 27,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 27,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function']);
                        },
                    },
                    {
                        query: 'create a function that checks if a given number is a fibonacci number',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: ~1,
                                    originalLength: 0,
                                    modifiedLength: undefined,
                                }, {
                                    line: ~1,
                                    originalLength: 1,
                                    modifiedLength: undefined,
                                }, {
                                    line: ~0,
                                    originalLength: 0,
                                    modifiedLength: undefined,
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function']);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3782: gen twice', language: 'javascript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    { kind: 'relativeFile', fileName: 'new.js', fileContents: '' }
                ],
                queries: [
                    {
                        file: 'new.js',
                        selection: [0, 0],
                        query: 'create a function `fibonacci` that computes the fibonacci numbers',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, {
                                line: 0,
                                originalLength: 1,
                                modifiedLength: undefined,
                            });
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function fibonacci']);
                        },
                    },
                    {
                        query: 'create a second function `getPrimes` that compute prime numbers',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: ~1,
                                    originalLength: 0,
                                    modifiedLength: undefined,
                                }, {
                                    line: ~0,
                                    originalLength: 0,
                                    modifiedLength: undefined,
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function getPrimes']);
                        }
                    },
                    {
                        query: 'document the functions with jsdoc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const text = outcome.fileContents;
                            // we need to have 2 functions
                            const f1 = text.indexOf('function fibonacci');
                            const f2 = text.indexOf('\nfunction getPrimes', f1 + 1);
                            const f3 = text.indexOf('function', f2 + 1);
                            (0, assert_1.default)(!(f1 === -1 || f2 === -1));
                            (0, assert_1.default)(f3 === -1);
                            const textAboveFibonacci = text.substring(0, f1);
                            const fibonacciDoc = (0, outcomeValidators_1.findTextBetweenMarkersFromBottom)(textAboveFibonacci, '/**', '*/');
                            (0, assert_1.default)(fibonacciDoc);
                            const textAboveGetPrimes = text.substring(f1, f2);
                            const getPrimesDoc = (0, outcomeValidators_1.findTextBetweenMarkersFromBottom)(textAboveGetPrimes, '/**', '*/');
                            (0, assert_1.default)(getPrimesDoc);
                        }
                    },
                    {
                        query: 'generate a function `getFibonacciPrimes` that compute the first 100 prime numbers that are also fibonacci numbers using the `fibonacci` and the`getPrimes` function',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const text = outcome.fileContents;
                            // we need to have 2 functions
                            const f1 = text.indexOf('function fibonacci');
                            const f2 = text.indexOf('\nfunction getPrimes', f1 + 1);
                            const f3 = text.indexOf('\nfunction getFibonacciPrimes', f2 + 1);
                            (0, assert_1.default)(!(f1 === -1 || f2 === -1 || f3 === -1));
                        }
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'parse keybindings', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)('gen/keybindingParser.ts')],
                queries: [{
                        file: 'keybindingParser.ts',
                        selection: [15, 8],
                        query: 'parse ctrl+ shift+ alt+ cmd+ and remove them from input',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 15,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }, {
                                    line: 15,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['ctrl = true', 'shift = true', 'alt = true', 'meta = true']);
                        }
                    }]
            });
        });
        (0, stest_1.stest)({ description: 'issue #2303: FILEPATH not removed from generated code in empty file', language: 'python', nonExtensionConfigurations }, (testingServiceCollection) => {
            const uri = vscodeTypes_1.Uri.parse('untitled:Untitled-1');
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{
                        kind: 'qualifiedFile',
                        uri,
                        fileContents: '',
                        languageId: 'python'
                    }],
                queries: [
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'reverse a linked list in python',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.strictEqual(outcome.fileContents.includes('# FILEPATH'), false);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #2589: IllegalArgument: line must be non-negative', language: 'json', nonExtensionConfigurations }, (testingServiceCollection) => {
            const uri = vscodeTypes_1.Uri.parse('file:///home/.prettierrc');
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{
                        kind: 'qualifiedFile',
                        uri,
                        fileContents: '',
                        languageId: 'json'
                    }],
                queries: [
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'use tabs',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #2269: BEGIN and END were included in diff', language: 'python', nonExtensionConfigurations }, (testingServiceCollection) => {
            const uri = vscodeTypes_1.Uri.parse('untitled:Untitled-1');
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{
                        kind: 'qualifiedFile',
                        uri,
                        fileContents: '',
                        languageId: 'javascript'
                    }],
                queries: [
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'create a simple express server',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.strictEqual(outcome.fileContents.includes('BEGIN'), false);
                        },
                    },
                    {
                        query: 'add a date route that returns the current date and time',
                        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.strictEqual(outcome.fileContents.includes('BEGIN'), false);
                        },
                    },
                    {
                        query: 'create an eval route that evaluates a mathematical equation. Support addition, multiplication, division, subtraction and square root',
                        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.strictEqual(outcome.fileContents.includes('BEGIN'), false);
                        },
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'Streaming gets confused due to jsdoc', language: 'json', nonExtensionConfigurations }, (testingServiceCollection) => {
            if (1) {
                throw new Error('SKIPPED');
            }
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen-top-level-function/strings.ts'),
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [75, 0],
                        query: 'add fibonacci function and use jsdoc to document it',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 75,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 75,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function fibonacci']);
                        },
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'code below cursor is not duplicated', language: 'html', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('editing-html/index.html')
                ],
                queries: [
                    {
                        file: 'index.html',
                        selection: [3, 3],
                        query: 'make cursor use hand.png',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '<html>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '<head>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '<style>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '</style>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '</head>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '<body>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '</body>');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, '</html>');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3370: generate code duplicates too much', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/inlayHintsController.ts')
                ],
                queries: [
                    {
                        file: 'inlayHintsController.ts',
                        selection: [673, 0],
                        query: 'add a function that takes a string and a length. the function should crop the string at length and insert `...` instead. The length is fuzzy and if possible the ellipses shouldn\'t follow whitespace or other "funny" characters',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 673,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 673,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['function', '...']);
                            (0, stestUtil_1.assertOccursOnce)(edit.changedModifiedLines.join('\n'), 'function');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #2496: Range of interest is imprecise after a streaming edit', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            if (1) {
                throw new Error('SKIPPED');
            }
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/strings.ts')
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [49, 0],
                        query: 'add fibonacci(n) returning the nth fibonacci with recursion',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 49,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 49,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['fibonacci']);
                        }
                    },
                    {
                        file: 'strings.ts',
                        selection: [49, 3],
                        wholeRange: [49, 0, 49, 3], // we want to simulate 100% vscode's behavior and vscode is peculiar here
                        query: 'avoid using recursion',
                        expectedIntent: editCodeIntent_1.EditCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, stestUtil_1.assertOccursOnce)(outcome.fileContents, 'function fibonacci');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue release#142: Inline chat updates code outside of area I expect', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('edit/issue-release-142/testAuthProvider.ts')
                ],
                queries: [
                    {
                        file: 'testAuthProvider.ts',
                        selection: [28, 8],
                        query: 'implement this',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 28,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 28,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['sessionId', 'this._onDidChangeSessions']);
                            (0, stestUtil_1.assertSomeStrings)(edit.changedModifiedLines.join('\n'), ['filter', 'splice'], 1);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3778: Incorrect streaming edits', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/modelLines.ts')
                ],
                queries: [
                    {
                        file: 'modelLines.ts',
                        selection: [3, 0],
                        query: 'implement this!',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 3,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 3,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #4179: Imports aren\'t inserted to the top of the file anymore', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/4179.ts')
                ],
                queries: [
                    {
                        file: '4179.ts',
                        selection: [10, 0],
                        query: 'use node-lib to read a file',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const firstLine = outcome.fileContents.split(/\r\n|\r|\n/g)[0];
                            (0, stestUtil_1.assertSomeStrings)(firstLine, ['import', 'require'], 1);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'Remember my name', language: 'javascript', nonExtensionConfigurations }, (testingServiceCollection) => {
            const uri = uri_1.URI.from({ scheme: 'foo', path: '/bar/baz.js' });
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{
                        kind: 'qualifiedFile',
                        uri,
                        fileContents: '',
                        languageId: 'javascript'
                    }],
                queries: [
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'My name is Siglinde. Remember my name',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertConversationalOutcome)(outcome);
                        },
                    },
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'Generate a class that represents a person',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.ok(outcome.fileContents.includes('Person'));
                        },
                    },
                    {
                        // file: uri,
                        query: 'Print my name as a sample usage of the class',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.ok(outcome.fileContents.includes('Siglinde'));
                        },
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #4080: Implementing a getter/method duplicates the signature', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/4080.ts')
                ],
                queries: [
                    {
                        file: '4080.ts',
                        selection: [40, 2],
                        query: 'implement this!',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 40,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 40,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['CharCode.Tab', 'CharCode.Space', 'CharCode.LineFeed', 'while']);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3439: Bad edits in this case', language: 'typescript', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/commandCenterControl.ts')
                ],
                queries: [
                    {
                        file: 'commandCenterControl.ts',
                        selection: [188, 0],
                        query: 'when label contains \n or \r replace them with the rendered unicode character',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 188,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 188,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['replace', '\\r', '\\n']);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'cpp code generation', language: 'cpp', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('cpp/basic/main.cpp')
                ],
                queries: [
                    {
                        file: 'main.cpp',
                        selection: [15, 0],
                        query: 'add validation to ensure that the input is not empty',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ['empty']);
                            (0, stestUtil_1.assertSomeStrings)(outcome.fileContents, ['if', 'while']);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'cpp');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'templated code generation', language: 'cpp', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('cpp/headers/json_fwd.hpp'),
                    (0, stestUtil_1.fromFixture)('cpp/headers/abi_macros.hpp')
                ],
                queries: [
                    {
                        file: 'json_fwd.hpp',
                        selection: [71, 0],
                        query: 'add a sorted_map specialization',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            // Validate the generated code matches naming and formatting conventions.
                            (0, stestUtil_1.assertSomeStrings)(outcome.fileContents, ['sorted_map', 'sorted_json', 'basic_json<nlohmann::sorted_map>']);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'cpp');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #224: Lots of lines deleted when using interactive chat in a markdown file', language: 'markdown', nonExtensionConfigurations }, (testingServiceCollection) => {
            if (1) {
                throw new Error('SKIPPED');
            }
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/CHANGELOG.md')
                ],
                queries: [
                    {
                        file: 'CHANGELOG.md',
                        selection: [1, 0],
                        query: 'Add release notes for version 0.62.0',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 1,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'doesn\'t handle markdown code response', language: 'markdown', nonExtensionConfigurations }, (testingServiceCollection) => {
            const uri = vscodeTypes_1.Uri.parse('untitled:Untitled-1');
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [{
                        kind: 'qualifiedFile',
                        uri,
                        fileContents: '',
                        languageId: 'markdown'
                    }],
                queries: [
                    {
                        file: uri,
                        selection: [0, 0],
                        query: 'describe fibonacci in markdown',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #5439: import List in python', language: 'python', nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('gen/5439.py')
                ],
                queries: [
                    {
                        file: '5439.py',
                        selection: [2, 0],
                        query: 'import List',
                        expectedIntent: generateCodeIntent_1.GenerateCodeIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 2,
                                    originalLength: 1,
                                    modifiedLength: 1
                                }]);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #6234: generate a TS interface for some JSON', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)("gen/6234/top-packages.ts")],
                queries: [
                    {
                        file: "top-packages.ts",
                        selection: [4, 0, 4, 0],
                        query: "generate an interface for this JSON:\n\n```\n{\"name\":\"chalk\",\"version\":\"5.3.0\",\"description\":\"Terminal string styling done right\",\"keywords\":[\"color\",\"colour\",\"colors\",\"terminal\",\"console\",\"cli\",\"string\",\"ansi\",\"style\",\"styles\",\"tty\",\"formatting\",\"rgb\",\"256\",\"shell\",\"xterm\",\"log\",\"logging\",\"command-line\",\"text\"],\"publisher\":{\"username\":\"sindresorhus\",\"email\":\"sindresorhus@gmail.com\"},\"maintainers\":[{\"username\":\"sindresorhus\",\"email\":\"sindresorhus@gmail.com\"},{\"username\":\"qix\",\"email\":\"josh@junon.me\"}],\"links\":{\"npm\":\"https://www.npmjs.com/package/chalk\",\"homepage\":\"https://github.com/chalk/chalk#readme\",\"repository\":\"https://github.com/chalk/chalk\"}}\n```",
                        diagnostics: 'tsc',
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            await (0, outcomeValidators_1.assertNoDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 4,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'Inline chat response did not use code block #6554', language: "powershell", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)("gen/6554/update-vs-base.ps1")],
                queries: [
                    {
                        file: "update-vs-base.ps1",
                        selection: [13, 0, 13, 0],
                        query: "copy folder to new location",
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            assert_1.default.equal(outcome.type, 'inlineEdit');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'variables are used when generating', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("gen/variables/example.ts"),
                    (0, stestUtil_1.fromFixture)("gen/variables/output.ts")
                ],
                queries: [
                    {
                        file: "output.ts",
                        selection: [0, 0],
                        query: "generate the same function like in #file:example.ts but for ArrayBuffer",
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(outcome.fileContents, ["ArrayBuffer"]);
                            (0, stestUtil_1.assertSomeStrings)(outcome.fileContents, ["arrayBufferInsert", "arrayInsert"], 1);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'too much code generated #6696', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.toFile)({
                        fileName: "generate/issue-6696/heatmapServiceImpl.ts",
                        fileContents: "/*---------------------------------------------------------------------------------------------\n *  Copyright (c) Microsoft Corporation and GitHub. All rights reserved.\n *--------------------------------------------------------------------------------------------*/\n\nimport * as vscode from 'vscode';\nimport { DisposableStore } from '../../../util/vs/base/common/lifecycle';\nimport { ResourceMap } from '../../../util/vs/base/common/map';\nimport { IDocumentHeatMap, IDocumentHeatMapEntry, IHeatMapService } from '../common/heatmapService';\n\nclass DocumentHeatMap implements IDocumentHeatMap {\n\n\tprivate readonly _entries: IDocumentHeatMapEntry[] = [];\n\n\t\n\n\tgetEntries(): IDocumentHeatMapEntry[] {\n\t\treturn this._entries;\n\t}\n\n\tmarkClosed(): void {\n\n\t}\n\n\thandleSelectionChange(e: vscode.TextEditorSelectionChangeEvent): void {\n\t\tthis._entries.push({\n\t\t\ttimeStamp: Date.now(),\n\t\t\tposition: e.selections[0].active\n\t\t});\n\t}\n\n\thandleTextDocumentChange(e: vscode.TextDocumentChangeEvent): void {\n\n\t}\n}\n\nexport class HeatMapServiceImpl implements IHeatMapService {\n\n\t_serviceBrand: undefined;\n\n\tprivate readonly _store = new DisposableStore();\n\n\tprivate readonly _map = new ResourceMap<DocumentHeatMap>();\n\n\tconstructor() {\n\t\tthis._store.add(vscode.window.onDidChangeTextEditorSelection(e => {\n\t\t\tthis._ensureHeatMap(e.textEditor.document.uri).handleSelectionChange(e);\n\t\t}));\n\t\tthis._store.add(vscode.workspace.onDidChangeTextDocument(e => {\n\t\t\tthis._ensureHeatMap(e.document.uri).handleTextDocumentChange(e);\n\t\t}));\n\t\tthis._store.add(vscode.workspace.onDidCloseTextDocument(e => {\n\t\t\t//\n\t\t\tthis._map.get(e.uri)?.markClosed();\n\t\t}));\n\t}\n\n\tdispose(): void {\n\t\tthis._store.dispose();\n\t}\n\n\tgetDocumentHeatMap(uri: vscode.Uri): IDocumentHeatMap | undefined {\n\t\treturn this._map.get(uri);\n\t}\n\n\tprivate _ensureHeatMap(uri: vscode.Uri): DocumentHeatMap {\n\t\tlet heatMap = this._map.get(uri);\n\t\tif (!heatMap) {\n\t\t\theatMap = new DocumentHeatMap();\n\t\t\tthis._map.set(uri, heatMap);\n\t\t}\n\t\treturn heatMap;\n\t}\n}\n"
                    })],
                queries: [
                    {
                        file: "generate/issue-6696/heatmapServiceImpl.ts",
                        selection: [13, 1, 13, 1],
                        query: "add constructor that takes the vscode.TextDocument",
                        diagnostics: 'tsc',
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const allNewText = outcome.appliedEdits.map(edit => edit.newText).join('');
                            assert_1.default.strictEqual(allNewText.includes('TextDocument'), true);
                            assert_1.default.strictEqual(allNewText.includes('vscode.TextDocument'), true);
                            assert_1.default.strictEqual(allNewText.includes('store.add'), false);
                            assert_1.default.strictEqual(allNewText.includes('onDidChange'), false);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'issue #6163', language: "json", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)("generate/issue-6163/package.json")],
                queries: [
                    {
                        file: "package.json",
                        selection: [14, 1, 14, 1],
                        query: "add scripts section which invokes .esbuild.ts",
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 14,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'issue #6788', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)("generate/issue-6788/terminalSuggestAddon.ts")
                ],
                queries: [
                    {
                        file: "terminalSuggestAddon.ts",
                        selection: [551, 2, 551, 2],
                        query: "get common prefix length of replacementText and completion.label",
                        diagnostics: 'tsc',
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'issue #6505', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)("generate/issue-6505/chatParserTypes.ts")],
                queries: [
                    {
                        file: "chatParserTypes.ts",
                        selection: [84, 1, 84, 1],
                        query: "add a getter isSynthetic when range.length = 0",
                        diagnostics: 'tsc',
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoDiagnosticsAsync)(accessor, outcome, workspace, diagnosticProviders_1.KnownDiagnosticProviders.tscIgnoreImportErrors);
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 84,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['this.range.length']);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'issue #7772', language: "typescript", nonExtensionConfigurations }, (testingServiceCollection) => {
            return executeEditTestStrategy(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)("generate/issue-7772/builds.ts")],
                queries: [
                    {
                        file: "builds.ts",
                        selection: [141, 8, 141, 8],
                        query: "compare the `path` sha256 with the `sha256`",
                        diagnostics: 'tsc',
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoDiagnosticsAsync)(accessor, outcome, workspace, diagnosticProviders_1.KnownDiagnosticProviders.tscIgnoreImportErrors);
                        }
                    }
                ]
            });
        });
        (0, stest_1.stest)({ description: 'Issue #7088', language: "powershell", nonExtensionConfigurations }, (accessor) => {
            return executeEditTestStrategy(strategy, accessor, {
                files: [(0, stestUtil_1.toFile)({
                        filePath: (0, stestUtil_1.fromFixture)("generate/issue-7088/Microsoft.PowerShell_profile.ps1")
                    })],
                queries: [
                    {
                        file: "Microsoft.PowerShell_profile.ps1",
                        selection: [3, 0, 3, 0],
                        query: "set alias c to code-insiders",
                        expectedIntent: "generate",
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                        }
                    }
                ]
            });
        });
    });
});
//# sourceMappingURL=inlineGenerateCode.stest.js.map