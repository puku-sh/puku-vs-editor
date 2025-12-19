/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Navigation command factory for multi-document inline completions
 *  Based on Copilot's createNextEditorEditCompletionItem() command pattern
 *  Reference: inlineCompletionProvider.ts:336-340
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Navigation command factory for multi-document completions
 * Creates vscode.open commands following Copilot's pattern
 */
export class NavigationCommandFactory {
	/**
	 * Create navigation command to open target document
	 * Based on Copilot's command creation pattern
	 * Reference: inlineCompletionProvider.ts:336-340
	 *
	 * @param targetUri Target document URI
	 * @param targetRange Range to navigate to
	 * @returns VS Code command
	 */
	create(
		targetUri: vscode.Uri,
		targetRange: vscode.Range
	): vscode.Command {
		const filename = this.getFilename(targetUri);

		// Copilot pattern: TextDocumentShowOptions
		// Reference: inlineCompletionProvider.ts:332-335
		const commandArgs: vscode.TextDocumentShowOptions = {
			preserveFocus: false,
			selection: new vscode.Range(targetRange.start, targetRange.start),
			viewColumn: vscode.ViewColumn.Active
		};

		// Create vscode.open command (Copilot pattern)
		// Reference: inlineCompletionProvider.ts:336-340
		return {
			command: 'vscode.open',
			title: 'Go To Inline Suggestion',
			tooltip: `Open ${filename} and navigate to edit`,
			arguments: [targetUri, commandArgs]
		};
	}

	/**
	 * Extract filename from URI
	 * Helper for tooltip formatting
	 *
	 * @param uri Document URI
	 * @returns Filename only (e.g., "main.ts")
	 */
	private getFilename(uri: vscode.Uri): string {
		const path = uri.path;
		const parts = path.split('/');
		return parts[parts.length - 1];
	}
}
