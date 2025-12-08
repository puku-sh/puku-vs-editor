"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Comment Completion Flow Tests
 *  Tests for Copilot-style comment-based code generation
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
const vscode = __importStar(require("vscode"));
const commentCompletion_1 = require("../../vscode-node/flows/commentCompletion");
suite('CommentCompletionFlow', function () {
    let flow;
    let mockIndexingService;
    setup(function () {
        // Mock indexing service
        mockIndexingService = {
            isAvailable: () => true,
            search: async (_query, _maxResults, _languageId) => []
        };
        flow = new commentCompletion_1.CommentCompletionFlow(mockIndexingService);
    });
    suite('isCommentBasedCompletion', function () {
        test('returns false when current line has content', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// add number inverse function\nconst x = 1;'
            });
            const position = new vscode.Position(1, 10); // Middle of 'const x = 1;'
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, false);
        });
        test('returns true when previous line is comment and current line is empty', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// add number inverse function\n'
            });
            const position = new vscode.Position(1, 0); // Start of empty line after comment
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, true);
        });
        test('returns false when previous line is not a comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: 'const x = 1;\n'
            });
            const position = new vscode.Position(1, 0);
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, false);
        });
        test('handles Python comments (#)', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'python',
                content: '# add fibonacci function\n'
            });
            const position = new vscode.Position(1, 0);
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, true);
        });
        test('handles Go comments (//)', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'go',
                content: '// add http handler\n'
            });
            const position = new vscode.Position(1, 0);
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, true);
        });
        test('returns false when typing inside comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// add number inverse function'
            });
            const position = new vscode.Position(0, 20); // Middle of comment
            const result = flow.isCommentBasedCompletion(doc, position);
            assert.strictEqual(result, false);
        });
    });
    suite('extractCommentIntent', function () {
        test('extracts intent from JavaScript comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// add number inverse function\n'
            });
            const position = new vscode.Position(1, 0);
            const intent = flow.extractCommentIntent(doc, position);
            assert.strictEqual(intent, 'add number inverse function');
        });
        test('extracts intent from Python comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'python',
                content: '# calculate fibonacci sequence\n'
            });
            const position = new vscode.Position(1, 0);
            const intent = flow.extractCommentIntent(doc, position);
            assert.strictEqual(intent, 'calculate fibonacci sequence');
        });
        test('returns null for comments shorter than 3 chars', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// ab\n'
            });
            const position = new vscode.Position(1, 0);
            const intent = flow.extractCommentIntent(doc, position);
            assert.strictEqual(intent, null);
        });
        test('strips multi-line comment markers', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '/* add REST API handler */\n'
            });
            const position = new vscode.Position(1, 0);
            const intent = flow.extractCommentIntent(doc, position);
            assert.strictEqual(intent, 'add REST API handler');
        });
        test('handles continuation markers in multi-line comments', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '/**\n * add REST API handler\n */\n'
            });
            const position = new vscode.Position(1, 0);
            const intent = flow.extractCommentIntent(doc, position);
            assert.strictEqual(intent, 'add REST API handler');
        });
    });
    suite('getCommentContext', function () {
        test('returns empty array when indexing not available', async function () {
            const unavailableService = {
                isAvailable: () => false,
                search: async () => []
            };
            const flowWithUnavailable = new commentCompletion_1.CommentCompletionFlow(unavailableService);
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// test'
            });
            const results = await flowWithUnavailable.getCommentContext('add function', doc, 3);
            assert.deepStrictEqual(results, []);
        });
        test('excludes same-file results', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// test'
            });
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: doc.uri,
                        content: 'function test() { return 42; }'
                    },
                    {
                        uri: vscode.Uri.file('/other/file.js'),
                        content: 'function inverse(n) { return 1/n; }'
                    }
                ]
            };
            const flowWithMock = new commentCompletion_1.CommentCompletionFlow(mockService);
            const results = await flowWithMock.getCommentContext('add function', doc, 3);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].filepath, '/other/file.js');
        });
        test('returns full implementations for comment-based completions', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// test'
            });
            const fullImplementation = 'function inverse(n) {\n  return 1 / n;\n}';
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/other/file.js'),
                        content: fullImplementation
                    }
                ]
            };
            const flowWithMock = new commentCompletion_1.CommentCompletionFlow(mockService);
            const results = await flowWithMock.getCommentContext('add function', doc, 3);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, fullImplementation);
        });
    });
});
//# sourceMappingURL=commentCompletion.test.js.map