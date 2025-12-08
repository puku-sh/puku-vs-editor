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
const vscodeTypes_1 = require("../../../src/vscodeTypes");
const stest_1 = require("../../base/stest");
const inlineChatSimulator_1 = require("../inlineChatSimulator");
const stestUtil_1 = require("../stestUtil");
const outcomeValidators_1 = require("../outcomeValidators");
(0, stest_1.ssuite)({ title: '/tests', location: 'inline', language: 'js' }, () => {
    (0, stest_1.stest)({ description: 'generate-jest', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/sum.test.js'),
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/sum.js'),
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/app.js'),
            ],
            queries: [{
                    file: 'some/app.js',
                    selection: [3, 0, 7, 1],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1);
                        const [first] = outcome.files;
                        (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(first), ['test', 'expect', 'toBe', 'sum', 'app.js']);
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'add another test to existing file', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/sum.test.js'),
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/sum.js'),
                (0, stestUtil_1.fromFixture)('tests/generate-jest/', 'some/app.js'),
            ],
            queries: [{
                    file: 'some/sum.js',
                    selection: [4, 20],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1);
                        const [first] = outcome.files;
                        assert.strictEqual(first.fileName, 'sum.test.js');
                        (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(first), ['test', 'expect', 'toBe', 'subtract']);
                        (0, stestUtil_1.assertNoStrings)((0, outcomeValidators_1.getFileContent)(first), ['import']);
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: '/tests: with package.json info', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('tests/simple-js-proj/src/index.js'),
                (0, stestUtil_1.fromFixture)('tests/simple-js-proj/package.json'),
            ],
            queries: [
                {
                    file: 'index.js',
                    selection: [0, 0, 2, 1],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        assert.strictEqual(outcome.type, 'workspaceEdit');
                    },
                },
            ],
        });
    });
    (0, stest_1.stest)({ description: "issue #1261: Failed to create new test file when in an untitled file", }, (testingServiceCollection) => {
        const uri = vscodeTypes_1.Uri.parse('untitled:Untitled-1');
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [{
                    kind: 'qualifiedFile',
                    uri,
                    fileContents: 'function sum(a, b) {\n\treturn a + b;\n}\n\n',
                    languageId: 'javascript'
                }],
            queries: [
                {
                    file: uri,
                    selection: [4, 0],
                    query: 'Write a test for this function',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1);
                        const file = outcome.files[0];
                        // Check if it's the old format (with kind and uri)
                        if ('kind' in file && 'uri' in file) {
                            assert.strictEqual(file.kind, 'qualifiedFile');
                            assert.strictEqual(file.uri.scheme, 'untitled');
                        }
                        // Otherwise if it's the new format (with srcUri)
                        else if ('srcUri' in file) {
                            assert.ok(file.srcUri.startsWith('untitled:'), 'URI should be untitled scheme');
                        }
                        // Use getFileContent to get the content regardless of format
                        const content = (0, outcomeValidators_1.getFileContent)(file);
                        assert.strictEqual(content.includes('// BEGIN:'), false);
                        assert.strictEqual(content.includes('// END:'), false);
                    },
                },
            ],
        });
    });
});
//# sourceMappingURL=testGen.js.stest.js.map