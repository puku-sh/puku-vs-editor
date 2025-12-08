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
const path_1 = require("path");
const testIntent_1 = require("../../../src/extension/intents/node/testIntent/testIntent");
const configurationService_1 = require("../../../src/platform/configuration/common/configurationService");
const promptContextModel_1 = require("../../../src/platform/test/node/promptContextModel");
const types_1 = require("../../../src/util/vs/base/common/types");
const stest_1 = require("../../base/stest");
const scenarioTest_1 = require("../../e2e/scenarioTest");
const inlineChatSimulator_1 = require("../inlineChatSimulator");
const outcomeValidators_1 = require("../outcomeValidators");
const stestUtil_1 = require("../stestUtil");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/tests${suffix}`, location: 'inline', language: 'typescript', nonExtensionConfigurations }, () => {
        (0, stest_1.stest)({ description: 'can add a test after an existing one', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file/src/test/index.test.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const changedFile = outcome.files.at(0);
                            assert_1.default.ok(changedFile);
                            (0, assert_1.default)([...(0, outcomeValidators_1.getFileContent)(changedFile).matchAll(/\n\tit/g)].length > 1);
                            const sixthLine = (0, outcomeValidators_1.getFileContent)(changedFile).split(/\r\n|\r|\n/g).at(6);
                            (0, assert_1.default)(sixthLine !== '});', `new tests are inserted within the existing suite: expected NOT '});'`);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'can add a test after an existing one with empty line', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-1/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-1/src/test/index.test.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            (0, types_1.assertType)(outcome.files[0]);
                            (0, assert_1.default)([...(0, outcomeValidators_1.getFileContent)(outcome.files[0]).matchAll(/\n\tit/g)].length > 1);
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'supports chat variables', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj/src/math.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/tests keep in mind #file:math.ts',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            (0, types_1.assertType)(outcome.files[0]);
                            (0, assert_1.default)((0, outcomeValidators_1.getFileContent)(outcome.files[0]).match('subtract'));
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'BidiMap test generation (inside file)', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/generate-for-selection', 'base/test/common/map.test.ts'),
                    (0, stestUtil_1.fromFixture)('tests/generate-for-selection', 'base/common/map.ts'),
                ],
                queries: [{
                        file: 'base/common/map.ts',
                        selection: [671, 0, 725, 1],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            assert_1.default.strictEqual(outcome.files.length, 1);
                            const [first] = outcome.files;
                            (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(first), ['suite', 'test', 'assert.strictEqual']);
                            (0, stestUtil_1.assertNoStrings)((0, outcomeValidators_1.getFileContent)(first), ['import']);
                        }
                    }],
            });
        });
        (0, stest_1.stest)({ description: 'BidiMap test generation (inside test)', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/generate-for-selection', 'base/test/common/map.test.ts'),
                    (0, stestUtil_1.fromFixture)('tests/generate-for-selection', 'base/common/map.ts'),
                ],
                queries: [{
                        file: 'base/test/common/map.test.ts',
                        selection: [470, 13, 470, 13],
                        query: '/tests Write tests for BidiMap',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.ok(outcome.appliedEdits.length >= 1);
                            assert_1.default.ok(outcome.appliedEdits.some(edit => edit.newText.includes('suite')
                                && edit.newText.includes('test')
                                && edit.newText.includes('assert.strictEqual')));
                        }
                    }],
            });
        });
        (0, stest_1.stest)({ description: 'ts-new-test', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('/tests/ts-another-test-4636/', 'stickyScroll.test.ts'),
                ],
                queries: [{
                        file: 'stickyScroll.test.ts',
                        selection: [252, 0],
                        query: '/tests add one more test for testing findScrollWidgetState',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert_1.default.ok(outcome.appliedEdits.length >= 1);
                            assert_1.default.ok(outcome.appliedEdits.some(edit => edit.newText.match(/test\(.*findScrollWidgetState/)));
                        }
                    }]
            });
        });
    });
});
// the folloing tests test the intent-detection. Inline2 does not do intent-detection.
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations) => {
    (0, stest_1.ssuite)({ title: `/tests`, subtitle: "real world", location: 'inline', language: 'typescript', nonExtensionConfigurations }, () => {
        (0, stest_1.stest)({ description: 'generate a unit test', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/ts-leading-whitespace/charCode.ts'),
                    (0, stestUtil_1.fromFixture)('tests/ts-leading-whitespace/strings.ts'),
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [250, 3, 257, 4],
                        query: 'generate a unit test',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            assert_1.default.strictEqual(outcome.type, 'workspaceEdit');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3699: add test for function', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/for-method-issue-3699/foldingRanges.ts'),
                ],
                queries: [
                    {
                        file: 'foldingRanges.ts',
                        selection: [419, 1, 421, 2],
                        query: 'add test for this function',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            assert_1.default.strictEqual(outcome.type, 'workspaceEdit');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3701: add some more tests for folding', }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/in-suite-issue-3701/notebookFolding.test.ts'),
                ],
                queries: [
                    {
                        file: 'notebookFolding.test.ts',
                        selection: [132, 2],
                        query: 'add some more tests for folding',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            assert_1.default.strictEqual(outcome.type, 'inlineEdit');
                            const lines = outcome.fileContents.split(/\r\n|\r|\n/g);
                            assert_1.default.ok(lines.length >= 132 + 276);
                            // remove first 132 lines
                            lines.splice(0, 132);
                            // remove last 276 lines
                            lines.splice(lines.length - 276, 276);
                            const text = lines.join('\n');
                            return (0, outcomeValidators_1.assertContainsAllSnippets)(text, ['withTestNotebook', 'assert'], 'tests/in-suite-issue-3701');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)('add another test for containsUppercaseCharacter with other non latin chars', (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/another-unit-test/strings.test.ts'),
                    (0, stestUtil_1.fromFixture)('tests/another-unit-test/charCode.ts'),
                    (0, stestUtil_1.fromFixture)('tests/another-unit-test/strings.ts')
                ],
                queries: [
                    {
                        file: 'strings.test.ts',
                        selection: [344, 0],
                        query: 'add another test for containsUppercaseCharacter with other non latin chars',
                        expectedIntent: testIntent_1.TestsIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, [{
                                    line: 344,
                                    originalLength: 0,
                                    modifiedLength: undefined
                                }, {
                                    line: 344,
                                    originalLength: 1,
                                    modifiedLength: undefined
                                }]);
                            (0, outcomeValidators_1.assertContainsAllSnippets)(edit.changedModifiedLines.join('\n'), ['containsUppercaseCharacter', 'assert.strictEqual']);
                        },
                    },
                ],
            });
        });
    });
    (0, stest_1.ssuite)({ title: `/tests`, subtitle: 'custom instructions', location: 'inline', language: 'typescript', nonExtensionConfigurations }, function () {
        const testGenConfigOnly = [
            {
                key: configurationService_1.ConfigKey.TestGenerationInstructions,
                value: [
                    { "text": "Add a comment: 'Generated by Copilot'" },
                    { "text": "use TDD instead of BDD", "language": "typescript" },
                    { "text": "use ssuite instead of suite and stest instead of test", "language": "typescript" },
                ]
            }
        ];
        (0, stest_1.stest)({ description: '[test gen config] can add a test after an existing one with empty line', configurations: testGenConfigOnly }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-2/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-2/src/test/index.test.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const fileContents = (0, outcomeValidators_1.getFileContent)(outcome.files[0]);
                            (0, types_1.assertType)(fileContents);
                            ['ssuite', 'stest', 'Generated by Copilot'].forEach(needle => assert_1.default.ok(fileContents.includes(needle)));
                        },
                    },
                ],
            });
        });
        const codeGenAndTestGenConfig = [
            {
                key: configurationService_1.ConfigKey.CodeGenerationInstructions,
                value: [
                    { "text": "Add a comment: 'Generated by Copilot'" },
                ]
            },
            {
                key: configurationService_1.ConfigKey.TestGenerationInstructions,
                value: [
                    { "text": "use TDD instead of BDD", "language": "typescript" },
                    { "text": "use ssuite instead of suite and stest instead of test", "language": "typescript" },
                ]
            }
        ];
        (0, stest_1.stest)({ description: '[code gen + test gen config] can add a test after an existing one with empty line', configurations: codeGenAndTestGenConfig }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-2/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj-with-test-file-2/src/test/index.test.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/tests',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                            const fileContents = (0, outcomeValidators_1.getFileContent)(outcome.files[0]);
                            (0, types_1.assertType)(fileContents);
                            ['ssuite', 'stest', 'Generated by Copilot'].forEach(needle => assert_1.default.ok(fileContents.includes(needle)));
                        },
                    },
                ],
            });
        });
    });
});
// the folloing tests are panel tests
(0, stest_1.ssuite)({ title: `/tests`, location: 'panel', language: 'typescript' }, function () {
    {
        const root = (0, path_1.join)(__dirname, '../test/simulation/fixtures/tests/panel/tsq');
        const path = (0, path_1.join)(root, 'workspaceState.state.json');
        (0, stest_1.stest)('can consume #file without active editor', (0, scenarioTest_1.generateScenarioTestRunner)([{
                name: 'can consume #file without active editor',
                question: '@workspace /tests test #file:foo.ts',
                scenarioFolderPath: root,
                stateFile: path,
                getState: () => (0, promptContextModel_1.deserializeWorkbenchState)((0, path_1.dirname)(path), path),
            }], async (accessor, question, answer) => {
            try {
                assert_1.default.ok(['test', 'suite', 'describe', 'it'].some(x => answer.includes(x)), "includes one of test, suite, describe, it with an opening parenthesis");
                assert_1.default.ok((answer.includes('subtract') || answer.includes('add') || answer.includes('multiply')), "includes one of subtract, add, multiply");
            }
            catch (e) {
                return { success: false, errorMessage: e.message };
            }
            return { success: true, };
        }));
    }
});
//# sourceMappingURL=testGen.ts.stest.js.map