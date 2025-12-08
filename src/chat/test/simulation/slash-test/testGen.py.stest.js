"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const path = __importStar(require("path"));
const extpath_1 = require("../../../src/util/vs/base/common/extpath");
const network_1 = require("../../../src/util/vs/base/common/network");
const platform_1 = require("../../../src/util/vs/base/common/platform");
const uri_1 = require("../../../src/util/vs/base/common/uri");
const stest_1 = require("../../base/stest");
const inlineChatSimulator_1 = require("../inlineChatSimulator");
const stestUtil_1 = require("../stestUtil");
const outcomeValidators_1 = require("../outcomeValidators");
(0, stest_1.ssuite)({ title: '/tests', location: 'inline', language: 'python', }, () => {
    (0, stest_1.stest)('py with pyproject.toml', (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('tests/py-pyproject-toml/', 'src/mmath/add.py'),
            ],
            queries: [{
                    file: 'src/mmath/add.py',
                    selection: [0, 4],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1, 'Expected one file to be created');
                        (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(outcome.files[0]), [
                            'import unittest',
                            'from mmath.add import add',
                        ], 2);
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'select existing test file using *_test.py format', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_end_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_end_test/', 'src/ex.py'),
                (0, stestUtil_1.fromFixture)('tests/py_end_test/', 'tests/ex_test.py'),
            ],
            queries: [{
                    file: 'src/ex.py',
                    selection: [3, 7],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        // Here the existing ex_test.py file should be found and edited for the newest test written
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1, 'Expected one file to be created');
                        // make sure type is IRelativeFile
                        assert.ok(outcome.files[0].hasOwnProperty('fileName'));
                        const relFile = outcome.files[0];
                        assert.strictEqual(relFile.fileName, 'ex_test.py');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('decimal_to_fraction'));
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'test with docstring', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_start_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'src/ex.py'),
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'tests/test_ex.py'),
            ],
            queries: [{
                    file: 'src/ex.py',
                    selection: [3, 7],
                    query: '/tests include a docstring',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        // Here the outcome should include a docstring as requested in the query
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(((0, outcomeValidators_1.getFileContent)(outcome.files[0]).match(/"""/g) || []).length, 2, 'Expected 2 instances of """ in the test file for the doc string');
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'parameterized tests', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_start_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'src/ex.py'),
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'tests/test_ex.py'),
            ],
            queries: [{
                    file: 'src/ex.py',
                    selection: [3, 7],
                    query: '/tests make them parameterized tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        // Here the outcome should include parameterized tests as requested in the query
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('import pytest'), 'Expected pytest import to be included');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('@pytest.mark.parametrize'), 'Expected parameterized test decorator to be included');
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'select test folder if exists for new test files', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_start_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'src/ex.py'),
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'src/measure.py'),
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'tests/test_ex.py'),
            ],
            queries: [{
                    file: 'src/measure.py',
                    selection: [1, 3],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        // Here the general expectation is that the test file should be created in the existing test folder
                        // since the workspace has ex.py and test_ex.py defined; new tests should follow existing location / naming conventions
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1, 'Expected one file to be created');
                        assert.ok(outcome.files[0].hasOwnProperty('uri'));
                        const relFile = outcome.files[0];
                        assert.ok(relFile.uri.fsPath.endsWith("/tests/"), 'Expected test file to be in the existing test folder');
                        assert.ok(relFile.uri.fsPath.endsWith("/tests/measure_test.py"), 'Expected test file to be named in the same style as existing test files');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('from src.measure import cm_to_inches'), 'Expected correct import to be generated');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('cm_to_inches'), 'Expected function to be tested to be included in the test file');
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'focal file at repo root', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_start_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_repo_root/', '__init__.py'),
                (0, stestUtil_1.fromFixture)('tests/py_repo_root/', 'temp.py'),
            ],
            queries: [{
                    file: 'temp.py',
                    selection: [1, 24],
                    query: '/tests make them parameterized tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        // Here the expectation is that the test file should be created in the root of the repo, next to the focal file
                        // since the focal file is at the root (even though __init__.py exists), relative imports are not possible
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.ok(outcome.files[0].hasOwnProperty('uri'), 'Expected test file to be a newly created file as no testing files exist');
                        const relFile = outcome.files[0];
                        assert.ok(relFile.uri.fsPath.includes('test') && relFile.uri.fsPath.includes('.py') && relFile.uri.fsPath.includes('temp'), 'Expected test file to include "test", ".py" and the name of the focal file');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('from . import ') === false, 'Expected no "from . import" statement');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('import .') === false, 'Expected no "import ." statement');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('convert_temperature'), 'Expected to call the function from the focal file');
                        assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('import'), 'Expected import to be generated as this is a new file');
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'update import statement', language: 'python', }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py_start_test'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'src/ex.py'),
                (0, stestUtil_1.fromFixture)('tests/py_start_test/', 'tests/test_ex.py'),
            ],
            queries: [{
                    file: 'src/ex.py',
                    selection: [3, 7],
                    query: '/tests include a docstring',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        // check that the import statement is updated when a new function is being added as a reference in the test file
                        assert.ok(outcome.files[0].hasOwnProperty('fileName'), "Expect new file created, which makes it a IRelativeFile with a fileName");
                        assert.ok(((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes("from src.ex import fraction_to_decimal, decimal_to_fraction")) || ((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes("from .ex import fraction_to_decimal, decimal_to_fraction")), 'Expected import statement to be updated with newest function.');
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'python add to existing', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py-pyproject-toml'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py-pyproject-toml/', 'src/mmath/add.py'),
                (0, stestUtil_1.fromFixture)('tests/py-pyproject-toml/', 'src/mmath/sub.py'),
                (0, stestUtil_1.fromFixture)('tests/py-pyproject-toml/', 'src/mmath/__init__.py'),
                (0, stestUtil_1.fromFixture)('tests/py-pyproject-toml/', 'tests/test_sub.py'),
            ],
            queries: [{
                    file: 'src/mmath/sub.py',
                    selection: [4, 7],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        if (outcome.type === 'workspaceEdit') {
                            const workspaceEdits = outcome.edits.entries();
                            assert.strictEqual(workspaceEdits.length, 1, 'Expected exactly one file to be edited');
                            const workspaceEditUri = workspaceEdits[0][0];
                            // check that the file 'tests/test_sub.py' was the one edited
                            const posixPath = platform_1.isWindows ? (0, extpath_1.toPosixPath)(workspaceEditUri.path) : workspaceEditUri.path;
                            assert.ok(posixPath.endsWith('tests/test_sub.py'), 'Expected the URI of the first edit to end with "tests/test_sub.py"');
                        }
                    }
                }],
        });
    });
    (0, stest_1.stest)({ description: 'python correct import', language: 'python' }, (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            workspaceFolders: [
                uri_1.URI.file(path.join(__dirname, '../test/simulation/fixtures/tests/py-extra-nested'))
            ],
            files: [
                (0, stestUtil_1.fromFixture)('tests/py-extra-nested/', 'focus_module/data_controllers/grocery.py'),
                (0, stestUtil_1.fromFixture)('tests/py-extra-nested/', 'tests/integration/test_other.py'),
                (0, stestUtil_1.fromFixture)('tests/py-extra-nested/', 'focus_module/data_controllers/__init__.py'),
            ],
            queries: [{
                    file: 'focus_module/data_controllers/grocery.py',
                    selection: [6, 8],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        if (outcome.type === 'workspaceEdit') {
                            const workspaceEdits = outcome.edits.entries();
                            assert.strictEqual(workspaceEdits.length, 1, 'Expected exactly one file to be edited');
                            const workspaceEditUri = workspaceEdits[0][0];
                            assert.ok(workspaceEditUri.fsPath.endsWith('test_grocery.py'), 'Expected the URI of the first edit to end with "tests/test_grocery.py"');
                            // the optimal import statement would be 'from .grocery import create_grocery_item' or 'from . import grocery'
                            assert.ok((0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('from .grocery') ||
                                (0, outcomeValidators_1.getFileContent)(outcome.files[0]).includes('from . import grocery'));
                        }
                    }
                }],
        });
    });
});
(0, stest_1.ssuite)({ title: '/tests', subtitle: 'real world', location: 'inline', language: 'python', }, () => {
    (0, stest_1.stest)('creates new test file with test method and includes method name and test method name', (testingServiceCollection) => {
        return (0, inlineChatSimulator_1.simulateInlineChat)(testingServiceCollection, {
            files: [
                (0, stestUtil_1.fromFixture)('tests/py-newtest-4658/', 'ex.py'),
            ],
            queries: [{
                    file: 'ex.py',
                    selection: [0, 18],
                    query: '/tests',
                    expectedIntent: "tests" /* Intent.Tests */,
                    validate: async (outcome, workspace, accessor) => {
                        (0, stestUtil_1.assertWorkspaceEdit)(outcome);
                        assert.strictEqual(outcome.files.length, 1);
                        const [first] = outcome.files;
                        assert.strictEqual(first.uri.scheme, network_1.Schemas.untitled);
                        assert.ok(first.uri.path.endsWith('test_ex.py'));
                        (0, stestUtil_1.assertSomeStrings)((0, outcomeValidators_1.getFileContent)(first), [
                            ' check_skipped_condition',
                            'test_check_skipped_condition'
                        ], 2);
                    }
                }]
        });
    });
});
//# sourceMappingURL=testGen.py.stest.js.map