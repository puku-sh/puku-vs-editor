/*---------------------------------------------------------------------------------------------
 *  Puku AI Comment Completion Flow Tests
 *  Tests for Copilot-style comment-based code generation
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { CommentCompletionFlow } from '../../vscode-node/flows/commentCompletion';

suite('CommentCompletionFlow', function () {
	let flow: CommentCompletionFlow;
	let mockIndexingService: any;

	setup(function () {
		// Mock indexing service
		mockIndexingService = {
			isAvailable: () => true,
			search: async (_query: string, _maxResults: number, _languageId: string) => []
		};
		flow = new CommentCompletionFlow(mockIndexingService);
	});

	suite('isCommentBasedCompletion', function () {
		test('returns false when current line has content', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// add number inverse function\nconst x = 1;'
			});
			const position = new vscode.Position(1, 10); // Middle of 'const x = 1;'

			const result = await flow.isCommentBasedCompletion(doc, position);
			assert.strictEqual(result, false);
		});

		test('returns true when previous line is comment and current line is empty', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// add number inverse function\n'
			});
			const position = new vscode.Position(1, 0); // Start of empty line after comment

			const result = await flow.isCommentBasedCompletion(doc, position);
			assert.strictEqual(result, true);
		});

		test('returns false when previous line is not a comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: 'const x = 1;\n'
			});
			const position = new vscode.Position(1, 0);

			const result = await flow.isCommentBasedCompletion(doc, position);
			assert.strictEqual(result, false);
		});

		test('handles Python comments (#)', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content: '# add fibonacci function\n'
			});
			const position = new vscode.Position(1, 0);

			const result = await flow.isCommentBasedCompletion(doc, position);
			assert.strictEqual(result, true);
		});

		test('handles Go comments (//)', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'go',
				content: '// add http handler\n'
			});
			const position = new vscode.Position(1, 0);

			const result = await flow.isCommentBasedCompletion(doc, position);
			assert.strictEqual(result, true);
		});

		test('returns false when typing inside comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// add number inverse function'
			});
			const position = new vscode.Position(0, 20); // Middle of comment

			const result = await flow.isCommentBasedCompletion(doc, position);
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

			const intent = await flow.extractCommentIntent(doc, position);
			assert.strictEqual(intent, 'add number inverse function');
		});

		test('extracts intent from Python comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content: '# calculate fibonacci sequence\n'
			});
			const position = new vscode.Position(1, 0);

			const intent = await flow.extractCommentIntent(doc, position);
			assert.strictEqual(intent, 'calculate fibonacci sequence');
		});

		test('returns null for comments shorter than 3 chars', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// ab\n'
			});
			const position = new vscode.Position(1, 0);

			const intent = await flow.extractCommentIntent(doc, position);
			assert.strictEqual(intent, null);
		});

		test('strips multi-line comment markers', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '/* add REST API handler */\n'
			});
			const position = new vscode.Position(1, 0);

			const intent = await flow.extractCommentIntent(doc, position);
			assert.strictEqual(intent, 'add REST API handler');
		});

		test('handles continuation markers in multi-line comments', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '/**\n * add REST API handler\n */\n'
			});
			const position = new vscode.Position(1, 0);

			const intent = await flow.extractCommentIntent(doc, position);
			assert.strictEqual(intent, 'add REST API handler');
		});
	});

	suite('getCommentContext', function () {
		test('returns empty array when indexing not available', async function () {
			const unavailableService = {
				isAvailable: () => false,
				search: async () => []
			};
			const flowWithUnavailable = new CommentCompletionFlow(unavailableService);

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
			const flowWithMock = new CommentCompletionFlow(mockService);

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
			const flowWithMock = new CommentCompletionFlow(mockService);

			const results = await flowWithMock.getCommentContext('add function', doc, 3);
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0].content, fullImplementation);
		});
	});
});
