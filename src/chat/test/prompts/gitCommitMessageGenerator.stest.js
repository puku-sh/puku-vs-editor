"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const gitCommitMessageGenerator_1 = require("../../src/extension/prompt/node/gitCommitMessageGenerator");
const testWorkspaceService_1 = require("../../src/platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../src/platform/workspace/common/workspaceService");
const textDocument_1 = require("../../src/util/common/test/shims/textDocument");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const uri_1 = require("../../src/util/vs/base/common/uri");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
(0, stest_1.ssuite)({ title: 'git commit message', location: 'external' }, () => {
    (0, stest_1.stest)({ description: 'Generates a simple commit message', language: 'python' }, async (testingServiceCollection) => {
        const content = `
def print_hello_world():
        print("Hello, World!")`;
        const document = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('main.py'), content, 'python').document;
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new testWorkspaceService_1.TestWorkspaceService(undefined, [document]));
        const accessor = testingServiceCollection.createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const diff = `diff --git a/main.py b/main.py
index 0877b83..6260896 100644
--- a/main.py
+++ b/main.py
@@ -1,2 +1,2 @@
-def print_hello_world():
+def greet():
		print("Hello, World!")
\ No newline at end of file`;
        const changes = [
            {
                uri: document.uri,
                originalUri: document.uri,
                renameUri: undefined,
                status: 5 /* Modified */,
                diff
            }
        ];
        const generator = instantiationService.createInstance(gitCommitMessageGenerator_1.GitCommitMessageGenerator);
        const message = await generator.generateGitCommitMessage('test-repo', 'main', changes, { repository: [], user: [] }, 0, cancellation_1.CancellationToken.None);
        assert_1.default.ok(message !== undefined, 'Failed to generate a commit message');
    });
    (0, stest_1.stest)({ description: 'Generates a conventional commit message for a bug fix', language: 'python' }, async (testingServiceCollection) => {
        const content = `
def print_hello_world():
        print("Hello, World!")`;
        const document = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('main.py'), content, 'python').document;
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new testWorkspaceService_1.TestWorkspaceService(undefined, [document]));
        const accessor = testingServiceCollection.createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const diff = `diff --git a/main.py b/main.py
index 0877b83..6260896 100644
--- a/main.py
+++ b/main.py
@@ -1,2 +1,2 @@
-def print_hello_world():
+def greet():
		print("Hello, World!")
\ No newline at end of file`;
        const repoCommits = [
            'feat: add greet function (by person@example.com)',
            'chore: setup initial project [fixes #3425]'
        ];
        const userCommits = [
            'refactor: move logic into main.py',
            'feat: add hello world'
        ];
        const changes = [
            {
                uri: document.uri,
                originalUri: document.uri,
                renameUri: undefined,
                status: 5 /* Modified */,
                diff
            }
        ];
        const generator = instantiationService.createInstance(gitCommitMessageGenerator_1.GitCommitMessageGenerator);
        const message = await generator.generateGitCommitMessage('test-repo', 'main', changes, { repository: repoCommits, user: userCommits }, 0, cancellation_1.CancellationToken.None);
        assert_1.default.ok(message !== undefined, 'Failed to generate a commit message');
        assert_1.default.ok(!userCommits.some(commit => message.toLowerCase().includes(commit)), 'Commit message contains a user commit');
        assert_1.default.ok(!repoCommits.some(commit => message.toLowerCase().includes(commit)), 'Commit message contains a repo commit');
        assert_1.default.ok(['fix:', 'chore:', 'feat:', 'refactor:'].some(prefix => message.toLowerCase().startsWith(prefix)), 'Commit message does not follow the conventional commits format');
        assert_1.default.ok(!message.includes('example.com'), 'Commit message contains the email address');
        assert_1.default.ok(!/#\d+/.test(message), 'Commit message does include an issue reference');
    });
    (0, stest_1.stest)({ description: 'Generated commit messages do not bias to conventional commit style', language: 'python' }, async (testingServiceCollection) => {
        const content = `
def show_exomple():
        print("This is an example.")`;
        const document = (0, textDocument_1.createTextDocumentData)(uri_1.URI.file('main.py'), content, 'python').document;
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new testWorkspaceService_1.TestWorkspaceService(undefined, [document]));
        const accessor = testingServiceCollection.createTestingAccessor();
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const diff = `diff --git a/sample.py b/sample.py
index 0877b83..6260896 100644
--- a/sample.py
+++ b/sample.py
@@ -1,3 +1,3 @@
-def show_exomple():
+def show_example():
    print("This is an example.")
\ No newline at end of file`;
        const repoCommits = [
            'Initial project setup',
            'Install dependencies'
        ];
        const userCommits = [
            'Add sample'
        ];
        const changes = [
            {
                uri: document.uri,
                originalUri: document.uri,
                renameUri: undefined,
                status: 5 /* Modified */,
                diff
            }
        ];
        const generator = instantiationService.createInstance(gitCommitMessageGenerator_1.GitCommitMessageGenerator);
        const message = await generator.generateGitCommitMessage('test-repo', 'main', changes, { repository: repoCommits, user: userCommits }, 0, cancellation_1.CancellationToken.None);
        assert_1.default.ok(message !== undefined, 'Failed to generate a commit message');
        assert_1.default.ok(!userCommits.some(commit => message.toLowerCase().includes(commit)), 'Commit message contains a user commit');
        assert_1.default.ok(!repoCommits.some(commit => message.toLowerCase().includes(commit)), 'Commit message contains a repo commit');
        assert_1.default.ok(!['fix:', 'feat:', 'chore:', 'docs:', 'style:', 'refactor:'].some(prefix => message.toLowerCase().startsWith(prefix)), 'Commit message should not use conventional commits format');
    });
});
//# sourceMappingURL=gitCommitMessageGenerator.stest.js.map