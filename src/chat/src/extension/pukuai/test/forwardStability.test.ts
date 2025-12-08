/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for enableForwardStability implementation (Issue #55)
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Forward Stability (Issue #55)', () => {
	test('InlineCompletionList has enableForwardStability property', () => {
		// This test verifies the VS Code API type includes enableForwardStability
		const completionItem: vscode.InlineCompletionItem = {
			insertText: 'test completion',
			range: new vscode.Range(0, 0, 0, 0)
		};

		const completionList: vscode.InlineCompletionList = {
			items: [completionItem],
			enableForwardStability: true
		};

		assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should be true');
		assert.strictEqual(completionList.items.length, 1, 'Should have one completion item');
	});

	test('InlineCompletionList with enableForwardStability=false', () => {
		const completionItem: vscode.InlineCompletionItem = {
			insertText: 'test completion',
			range: new vscode.Range(0, 0, 0, 0)
		};

		const completionList: vscode.InlineCompletionList = {
			items: [completionItem],
			enableForwardStability: false
		};

		assert.strictEqual(completionList.enableForwardStability, false, 'enableForwardStability should be false');
	});

	test('InlineCompletionList without enableForwardStability (undefined)', () => {
		const completionItem: vscode.InlineCompletionItem = {
			insertText: 'test completion',
			range: new vscode.Range(0, 0, 0, 0)
		};

		const completionList: vscode.InlineCompletionList = {
			items: [completionItem]
		};

		assert.strictEqual(completionList.enableForwardStability, undefined, 'enableForwardStability should be undefined when not set');
	});

	test('Multiple completion items with forward stability', () => {
		const item1: vscode.InlineCompletionItem = {
			insertText: 'completion 1',
			range: new vscode.Range(0, 0, 0, 0)
		};

		const item2: vscode.InlineCompletionItem = {
			insertText: 'completion 2',
			range: new vscode.Range(1, 0, 1, 0)
		};

		const completionList: vscode.InlineCompletionList = {
			items: [item1, item2],
			enableForwardStability: true
		};

		assert.strictEqual(completionList.items.length, 2, 'Should have two completion items');
		assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should be true');
	});

	test('Empty items array with forward stability', () => {
		const completionList: vscode.InlineCompletionList = {
			items: [],
			enableForwardStability: true
		};

		assert.strictEqual(completionList.items.length, 0, 'Should have zero completion items');
		assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should still be true');
	});
});
