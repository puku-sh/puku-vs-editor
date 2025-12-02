/*---------------------------------------------------------------------------------------------
 *  Puku AI Comment Detection Helper Tests
 *  Tests for Tree-sitter-based comment detection
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { isInsideComment } from '../../vscode-node/helpers/commentDetection';

suite('commentDetection', function () {
	suite('isInsideComment', function () {
		test('returns false for unsupported language', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'plaintext',
				content: '// this is text'
			});
			const position = new vscode.Position(0, 5);

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, false);
		});

		test('detects cursor inside JavaScript line comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// add number inverse function\nconst x = 1;'
			});
			const position = new vscode.Position(0, 10); // Inside the comment

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor outside JavaScript comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// comment\nconst x = 1;'
			});
			const position = new vscode.Position(1, 5); // In the code line

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, false);
		});

		test('detects cursor inside JavaScript block comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '/* this is a\nmulti-line\ncomment */\nconst x = 1;'
			});
			const position = new vscode.Position(1, 5); // Inside the block comment

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor inside Python comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content: '# add fibonacci function\ndef fib(n):\n    return n'
			});
			const position = new vscode.Position(0, 10); // Inside the comment

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor outside Python comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'python',
				content: '# comment\ndef fib(n):\n    return n'
			});
			const position = new vscode.Position(1, 5); // In the code

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, false);
		});

		test('detects cursor inside Go line comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'go',
				content: '// add http handler\nfunc main() {}'
			});
			const position = new vscode.Position(0, 10); // Inside the comment

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor inside Go block comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'go',
				content: '/* multi\nline */\nfunc main() {}'
			});
			const position = new vscode.Position(0, 5); // Inside the block comment

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor inside TypeScript JSDoc comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'typescript',
				content: '/**\n * Add two numbers\n * @param a first number\n */\nfunction add(a: number) {}'
			});
			const position = new vscode.Position(1, 5); // Inside the JSDoc

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('handles parse errors gracefully', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: 'const x = { invalid syntax'
			});
			const position = new vscode.Position(0, 10);

			// Should not throw, should return false
			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, false);
		});

		test('detects cursor at start of comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// comment'
			});
			const position = new vscode.Position(0, 0); // At the very start

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});

		test('detects cursor at end of comment', async function () {
			const doc = await vscode.workspace.openTextDocument({
				language: 'javascript',
				content: '// comment'
			});
			const position = new vscode.Position(0, 9); // At the end

			const result = await isInsideComment(doc, position);
			assert.strictEqual(result, true);
		});
	});
});
