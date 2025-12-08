"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const docIntent_1 = require("../../src/extension/intents/node/docIntent");
const stest_1 = require("../base/stest");
const inlineChatSimulator_1 = require("../simulation/inlineChatSimulator");
const outcomeValidators_1 = require("../simulation/outcomeValidators");
const stestUtil_1 = require("../simulation/stestUtil");
const slashDoc_util_1 = require("./slashDoc.util");
(0, inlineChatSimulator_1.forInline)((strategy, nonExtensionConfigurations, suffix) => {
    (0, stest_1.ssuite)({ title: `/doc${suffix}`, location: 'inline', language: 'typescript' }, () => {
        (0, stest_1.stest)({ description: 'large function', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ts-large-fn/resolver.ts'),
                ],
                queries: [
                    {
                        file: 'resolver.ts',
                        selection: [0, 10],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.ok(outcome.fileContents.includes(`*/\nfunction handleRemovals(rules: ResolvedKeybindingItem[]): ResolvedKeybindingItem[] {\n\t// Do a first pass and construct a hash-map for removals`), `keeps the original function's 1st line with its comment below`);
                            assert.ok(!outcome.fileContents.includes(`function handleRemovals(rules: ResolvedKeybindingItem[]): ResolvedKeybindingItem[] {\n\t// implementation`), `makes correct edit`);
                            assert.ok(!outcome.fileContents.includes(`function handleRemovals(rules: ResolvedKeybindingItem[]): ResolvedKeybindingItem[] {\n\t// ...`), `makes correct edit - 2`);
                        },
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'interface', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ts-interface/codeImportPatterns.ts'),
                ],
                queries: [
                    {
                        file: 'codeImportPatterns.ts',
                        selection: [18, 18],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            (0, slashDoc_util_1.assertDocLines)(outcome.fileContents, 'interface RawImportPatternsConfig ');
                            assert.strictEqual([...outcome.fileContents.matchAll(/target: string/g)].length, 3, 'detected block duplication');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'class', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ts-class/keybindingResolver.ts'),
                ],
                queries: [
                    {
                        file: 'keybindingResolver.ts',
                        selection: [37, 15],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // no duplication of declaration
                            assert.strictEqual([...fileContents.matchAll(/class KeybindingResolver \{/g)].length, 1);
                            // no block bodies with a single comment
                            assert.strictEqual([...fileContents.matchAll(/\/\/ \.\.\./g)].length, 0, 'no // ...');
                            assert.strictEqual([...fileContents.matchAll(/implementation/g)].length, 0);
                            // assert it contains doc comments above
                            const lineWithCursor = 'export class KeybindingResolver';
                            (0, slashDoc_util_1.assertDocLines)(fileContents, lineWithCursor);
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'able to document whole class, which is larger than context length', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-ts-class-full/keybindingResolver.ts'),
                ],
                queries: [
                    {
                        file: 'keybindingResolver.ts',
                        selection: [37, 15],
                        query: '/doc the whole class',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // no duplication of declaration
                            assert.strictEqual([...fileContents.matchAll(/class KeybindingResolver/g)].length, 1);
                            // no block bodies with a single comment
                            assert.strictEqual([...fileContents.matchAll(/\/\/ \.\.\./g)].length, 0, 'no // ...');
                            assert.strictEqual([...fileContents.matchAll(/implementation/g)].length, 0);
                            // assert it contains doc comments above
                            const fileLines = fileContents.split('\n');
                            (0, slashDoc_util_1.assertDocLines)(fileLines, 'export class KeybindingResolver');
                            (0, slashDoc_util_1.assertDocLines)(fileLines, '	private static _isTargetedForRemoval');
                            (0, slashDoc_util_1.assertDocLines)(fileLines, '	public getDefaultBoundCommands()');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'does not include types in the documentation comment - function', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('vscode/src/vs/workbench/api/common/extHostChat.ts'),
                ],
                queries: [
                    {
                        file: 'extHostChat.ts',
                        selection: [277, 8],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const fileContents = outcome.fileContents;
                            // no duplication of declaration
                            assert.strictEqual([...fileContents.matchAll(/registerSlashCommandProvider\(extension: Readonly<IRelaxedExtensionDescription>, chatProviderId: string, provider: vscode.InteractiveSlashCommandProvider\): vscode.Disposable \{/g)].length, 1);
                            // assert it contains doc comments above
                            const lineWithCursor = '	registerSlashCommandProvider(extension: Readonly<IRelaxedExtensionDescription>, chatProviderId: string, provider: vscode.InteractiveSlashCommandProvider): vscode.Disposable {';
                            (0, slashDoc_util_1.assertDocLines)(fileContents, lineWithCursor, line => assert.ok(!line.match(/\{(function|string|AssertionError)\}/)));
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3692: add jsdoc comment - colors.ts', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)('doc-hello-world/colors.ts')],
                queries: [
                    {
                        file: 'colors.ts',
                        selection: [66, 0, 68, 1],
                        query: 'write a jsdoc comment',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, slashDoc_util_1.assertDocLines)(outcome.fileContents, 'export function helloWorld() {');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3692: add jsdoc comment using /doc - colors.ts', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [(0, stestUtil_1.fromFixture)('doc-hello-world/colors.ts')],
                queries: [
                    {
                        file: 'colors.ts',
                        selection: [66, 0, 68, 1],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            (0, slashDoc_util_1.assertDocLines)(outcome.fileContents, 'export function helloWorld() {');
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #3763: doc everywhere', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-everywhere-issue-3763/githubServer.ts'),
                ],
                queries: [
                    {
                        file: 'githubServer.ts',
                        selection: [14, 0, 14, 105],
                        query: 'Add jsdoc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, {
                                line: 14,
                                originalLength: 0,
                                modifiedLength: undefined,
                            });
                            (0, outcomeValidators_1.assertLooksLikeJSDoc)(edit.changedModifiedLines.join('\n'));
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'doc explain ts code', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc-explain-ts-code/charCode.ts'),
                    (0, stestUtil_1.fromFixture)('doc-explain-ts-code/strings.ts'),
                ],
                queries: [
                    {
                        file: 'strings.ts',
                        selection: [7, 16, 27, 0],
                        query: 'write jsdoc for it',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            await (0, outcomeValidators_1.assertNoSyntacticDiagnosticsAsync)(accessor, outcome, workspace, 'tsc');
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, {
                                line: 7,
                                originalLength: 0,
                                modifiedLength: undefined,
                            });
                            (0, outcomeValidators_1.assertLooksLikeJSDoc)(edit.changedModifiedLines.join('\n'));
                        },
                    },
                    {
                        query: 'explain this',
                        expectedIntent: "explain" /* Intent.Explain */,
                        validate: async (outcome, workspace, accessor) => {
                            assert.equal(outcome.type, 'conversational');
                        }
                    }
                ],
            });
        });
        (0, stest_1.stest)({ description: 'issue #6406', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('doc/issue-6406/debugModel.ts'),
                ],
                queries: [
                    {
                        file: 'debugModel.ts',
                        selection: [36, 20],
                        query: '/doc',
                        expectedIntent: docIntent_1.InlineDocIntent.ID,
                        validate: async (outcome, workspace, accessor) => {
                            // Assert we get back a single inline edit that does not remove any existing text from the file.
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            const edit = (0, stestUtil_1.assertInlineEditShape)(outcome, {
                                line: 36,
                                originalLength: 0,
                                modifiedLength: undefined,
                            });
                            (0, outcomeValidators_1.assertLooksLikeJSDoc)(edit.changedModifiedLines.join('\n'));
                        },
                    },
                ],
            });
        });
        (0, stest_1.stest)({ description: 'supports chat variables', nonExtensionConfigurations }, (testingServiceCollection) => {
            return (0, inlineChatSimulator_1.simulateInlineChatWithStrategy)(strategy, testingServiceCollection, {
                files: [
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj/src/index.ts'),
                    (0, stestUtil_1.fromFixture)('tests/simple-ts-proj/src/math.ts'),
                ],
                queries: [
                    {
                        file: 'index.ts',
                        selection: [0, 17],
                        query: '/doc keep in mind #file:math.ts',
                        expectedIntent: "tests" /* Intent.Tests */,
                        validate: async (outcome, workspace, accessor) => {
                            (0, stestUtil_1.assertInlineEdit)(outcome);
                            assert.ok(/subtract/i.test(outcome.fileContents), 'contains math.ts content');
                        },
                    },
                ],
            });
        });
    });
});
//# sourceMappingURL=slashDoc.ts.stest.js.map