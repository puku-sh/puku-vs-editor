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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const searchService_1 = require("../../../../platform/search/common/searchService");
const glob = __importStar(require("../../../../util/common/glob"));
const textDocument_1 = require("../../../../util/common/test/shims/textDocument");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const event_1 = require("../../../../util/vs/base/common/event");
const path_1 = require("../../../../util/vs/base/common/path");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../util/vs/base/common/uri");
const testFiles_1 = require("../testFiles");
vitest_1.suite.skipIf(process.platform === 'win32')('TestFileFinder', function () {
    class TestSearchService extends searchService_1.AbstractSearchService {
        async findTextInFiles(query, options, progress, token) {
            return {};
        }
        findTextInFiles2(query, options, token) {
            return {};
        }
        async findFiles(filePattern, options, token) {
            return [];
        }
    }
    class TestTabsService {
        constructor() {
            this.onDidChangeActiveTextEditor = event_1.Event.None;
            this.onDidChangeTabs = event_1.Event.None;
            this.activeTextEditor = undefined;
            this.visibleTextEditors = [];
            this.activeNotebookEditor = undefined;
            this.visibleNotebookEditors = [];
            this.tabs = [];
        }
    }
    (0, vitest_1.test)('returns undefined when no test file exists', async function () {
        const testFileFinder = new testFiles_1.TestFileFinder(new TestSearchService(), new TestTabsService());
        const sourceFile = uri_1.URI.file('/path/to/source/file.ts');
        const result = await testFileFinder.findTestFileForSourceFile(createTextDocument(sourceFile), cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(result, undefined);
    });
    (0, vitest_1.test)('uses tab info', async function () {
        const sourceFile = uri_1.URI.file('/path/to/source/file.ts');
        const testFileFinder = new testFiles_1.TestFileFinder(new TestSearchService(), new class extends TestTabsService {
            constructor() {
                super(...arguments);
                this.tabs = [{
                        uri: uri_1.URI.file('/path/to/source/file.spec.ts'),
                        tab: null
                    }];
            }
        });
        const result = await testFileFinder.findTestFileForSourceFile(createTextDocument(sourceFile), cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(result?.toString(), 'file:///path/to/source/file.spec.ts');
    });
    (0, vitest_1.test)('returns test file URI when it exists', async function () {
        const sourceFile = '/path/to/source/file.ts';
        const testFile = '/path/to/source/file.test.ts';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    const possibleTestNames = ['file.test.xx', 'file_test.xx', 'file.spec.xx', 'fileSpec.xx', 'test_file.xx'];
    for (const testName of possibleTestNames) {
        (0, vitest_1.test)(`for unknown languages, returns test file URI if it exists (${testName})`, async function () {
            await assertTestFileFoundAsync('/path/file.xx', '/path/file.test.xx');
        });
    }
    (0, vitest_1.test)('returns a test for Go', async function () {
        const sourceFile = '/path/to/source/foo.go';
        const testFile = '/path/to/source/foo_test.go';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    (0, vitest_1.test)('returns impl for Go', async function () {
        const sourceFile = '/path/to/source/foo.go';
        const testFile = '/path/to/source/foo_test.go';
        await assertImplFileFoundAsync(testFile, sourceFile);
    });
    (0, vitest_1.test)('returns same folder with prefix as fallback', async function () {
        const sourceFile = '/path/to/source/foo.go';
        const existingTestFile = '/path/to/source/foo_test.go';
        await assertTestFileFoundAsync(sourceFile, existingTestFile, '/path/to/source');
    });
    (0, vitest_1.test)('returns a test for Java for maven layout', async function () {
        const sourceFile = '/src/main/java/p/Foo.java';
        const testFile = '/src/test/java/p/FooTest.java';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    (0, vitest_1.test)('returns a impl for Java for maven layout', async function () {
        const testFile = '/src/test/java/p/FooTest.java';
        const sourceFile = '/src/main/java/p/Foo.java';
        await assertImplFileFoundAsync(testFile, sourceFile);
    });
    (0, vitest_1.test)('returns a test for PHP', async function () {
        const sourceFile = '/src/Foo.php';
        const testFile = '/tests/FooTest.php';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    (0, vitest_1.test)('returns a test for Dart', async function () {
        const sourceFile = '/project/Foo.dart';
        const testFile = '/tests/Foo_test.dart';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    (0, vitest_1.test)('returns a test for Python', async function () {
        const sourceFile = '/project/foo.py';
        const testFile = '/tests/test_foo.py';
        await assertTestFileFoundAsync(sourceFile, testFile);
    });
    (0, vitest_1.test)('returns a test for C#', async function () {
        const sourceFile = 'src/project/Foo.cs';
        await assertTestFileFoundAsync(sourceFile, '/src/tests/project/FooTest.cs');
        // assertTestFileFound(sourceFile, '/unit-tests/project/FooTest.cs');
        // assertTestFileFound(sourceFile, '/unittests/project/FooTest.cs');
    });
    (0, vitest_1.test)('returns a test for Ruby', async function () {
        const sourceFile = 'app/api/foo.rb';
        await assertTestFileFoundAsync(sourceFile, '/test/app/api/foo_test.rb');
    });
    (0, vitest_1.test)('determine java test file with absolute path', async () => {
        await assertTestFileFoundAsync('/Users/copilot/git/commons-io/src/main/java/org/apache/commons/io/EndianUtils.java', '/Users/copilot/git/commons-io/src/test/java/org/apache/commons/io/EndianUtilsTest.java', 'file:///Users/copilot/git/commons-io');
    });
    (0, vitest_1.test)('determine rb test file with absolute path', async () => {
        await assertTestFileFoundAsync('/Users/copilot/git/github/foo/util.rb', '/Users/copilot/git/github/test/foo/util_test.rb', 'file:///Users/copilot/git/github');
    });
    (0, vitest_1.test)('determine php test file with absolute path', async () => {
        await assertTestFileFoundAsync('/Users/copilot/git/github/foo/util.php', '/Users/copilot/git/github/tests/utilTest.php', 'file:///Users/copilot/git/github');
    });
    (0, vitest_1.test)('determine ps1 test file with absolute path', async () => {
        await assertTestFileFoundAsync('/Users/copilot/git/github/foo/util.ps1', '/Users/copilot/git/github/Tests/util.Tests.ps1', 'file:///Users/copilot/git/github');
    });
    const testSamples = [
        { filename: 'foo.js', isTestFile: false },
        { filename: 'foo.test.js', isTestFile: true },
        { filename: 'foo.spec.js', isTestFile: true },
        { filename: 'foo.ts', isTestFile: false },
        { filename: 'foo.test.ts', isTestFile: true },
        { filename: 'foo.spec.ts', isTestFile: true },
        { filename: 'foo.py', isTestFile: false },
        { filename: 'test_foo.py', isTestFile: true },
        { filename: 'foo_test.py', isTestFile: true },
        { filename: 'foo.rb', isTestFile: false },
        { filename: 'foo_test.rb', isTestFile: true },
        { filename: 'foo.go', isTestFile: false },
        { filename: 'foo_test.go', isTestFile: true },
        { filename: 'foo.php', isTestFile: false },
        { filename: 'fooTest.php', isTestFile: true },
        { filename: 'Foo.java', isTestFile: false },
        { filename: 'FooTest.java', isTestFile: true },
        { filename: 'Foo.cs', isTestFile: false },
        { filename: 'FooTest.cs', isTestFile: true },
        { filename: 'foo.xx', isTestFile: false },
        { filename: 'foo~Test.xx', isTestFile: true },
        { filename: 'foo.spec.xx', isTestFile: true },
        { filename: 'fooTest.xx', isTestFile: true },
        { filename: 'test_foo.xx', isTestFile: true },
        { filename: 'foo.Tests.ps1', isTestFile: true },
    ];
    // test for each sample
    for (const sample of testSamples) {
        (0, vitest_1.test)(`is ${sample.filename} a test file?`, () => {
            const isTest = (0, testFiles_1.isTestFile)(uri_1.URI.file(sample.filename));
            assert_1.default.strictEqual(isTest, sample.isTestFile);
        });
    }
    function createTextDocument(uri) {
        const sourceDocumentData = (0, textDocument_1.createTextDocumentData)(uri, '', testFiles_1.suffix2Language[(0, resources_1.basename)(uri).substring(1)] ?? '');
        return textDocumentSnapshot_1.TextDocumentSnapshot.create(sourceDocumentData.document);
    }
    async function assertTestFileFoundAsync(sourceFilePath, expectedTestFilePath, workspaceUri) {
        const sourceFile = uri_1.URI.file(sourceFilePath);
        const expectedTestFile = uri_1.URI.file(expectedTestFilePath);
        const testFileFinder = new testFiles_1.TestFileFinder(new class extends searchService_1.AbstractSearchService {
            async findTextInFiles(query, options, progress, token) {
                if (glob.shouldInclude(expectedTestFile, { include: options.include ? [options.include] : undefined, exclude: options.exclude ? [options.exclude] : undefined })) {
                    progress.report({ uri: expectedTestFile, ranges: [], preview: { matches: [], text: '' } });
                }
                return {};
            }
            findTextInFiles2(query, options, token) {
                throw new Error('not implemented');
            }
            async findFiles(filePattern, options, token) {
                if (glob.shouldInclude(expectedTestFile, { include: [filePattern], exclude: options?.exclude ? options.exclude : undefined })) {
                    return [expectedTestFile];
                }
                return [];
            }
        }, new TestTabsService());
        const sourceDocument = createTextDocument(sourceFile);
        const result = await testFileFinder.findTestFileForSourceFile(sourceDocument, cancellation_1.CancellationToken.None);
        assert_1.default.ok(result);
        assert_1.default.strictEqual((0, path_1.normalize)(result.path), (0, path_1.normalize)(expectedTestFilePath.toString()));
    }
    async function assertImplFileFoundAsync(testFilePath, expectedImplFilePath) {
        const testFile = uri_1.URI.file(testFilePath);
        const expectedImplFile = uri_1.URI.file(expectedImplFilePath);
        const testFileFinder = new testFiles_1.TestFileFinder(new class extends searchService_1.AbstractSearchService {
            async findTextInFiles(query, options, progress, token) {
                if (glob.isMatch(expectedImplFile, options.include) && (!options.exclude || !glob.isMatch(expectedImplFile, options.exclude))) {
                    progress.report({
                        uri: expectedImplFile,
                        ranges: [],
                        preview: { text: '', matches: [] }
                    });
                }
                return {};
            }
            findTextInFiles2(query, options, token) {
                throw new Error('not implemented');
            }
            async findFiles(filePattern, options, token) {
                if (glob.isMatch(expectedImplFile, filePattern) && (!options?.exclude || !options.exclude.some(e => glob.isMatch(expectedImplFile, e)))) {
                    return [expectedImplFile];
                }
                return [];
            }
        }, new TestTabsService());
        const testFileDocument = createTextDocument(testFile);
        const result = await testFileFinder.findFileForTestFile(testFileDocument, cancellation_1.CancellationToken.None);
        assert_1.default.notStrictEqual(result, undefined);
        assert_1.default.strictEqual((0, path_1.normalize)(result.path), (0, path_1.normalize)(expectedImplFilePath.toString()));
    }
});
//# sourceMappingURL=testFiles.spec.js.map