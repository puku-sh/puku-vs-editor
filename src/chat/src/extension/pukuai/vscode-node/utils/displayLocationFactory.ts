/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Display location factory for multi-document inline completions
 *  Based on Copilot's createNextEditorEditCompletionItem() pattern
 *  Reference: inlineCompletionProvider.ts:320-349
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Display location factory for multi-document completions
 * Creates label-based display locations following Copilot's UX pattern
 */
export class DisplayLocationFactory {
	/**
	 * Create label-based display location for multi-document edit
	 * Based on Copilot's createNextEditorEditCompletionItem()
	 * Reference: inlineCompletionProvider.ts:326-330
	 *
	 * @param targetDocument Target document
	 * @param targetRange Edit range in target document
	 * @param currentPosition Current cursor position
	 * @param completionText Preview text for tooltip
	 * @returns Display location with label
	 */
	createLabel(
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentPosition: vscode.Position,
		completionText: string
	): vscode.InlineCompletionDisplayLocation {
		// Extract filename from URI (Copilot pattern)
		const filename = this.getFilename(targetDocument.uri);

		// Format line number (1-indexed for display, Copilot pattern)
		const lineNumber = targetRange.start.line + 1;

		// Create label text matching Copilot's format
		// Copilot uses: "Go To Inline Edit" but we use "Go To Inline Suggestion"
		const label = `📄 Go To Inline Suggestion (${filename}:${lineNumber})`;

		// Return display location with Label kind (Copilot pattern)
		// Reference: inlineCompletionProvider.ts:326-330
		// Note: API definition only has range, label, and kind fields
		return {
			range: new vscode.Range(currentPosition, currentPosition),
			label,
			kind: vscode.InlineCompletionDisplayLocationKind.Label
		};
	}

	/**
	 * Extract filename from URI
	 * Helper for label formatting
	 *
	 * @param uri Document URI
	 * @returns Filename only (e.g., "main.ts")
	 */
	private getFilename(uri: vscode.Uri): string {
		const path = uri.path;
		const parts = path.split('/');
		return parts[parts.length - 1];
	}

	/**
	 * Create preview tooltip text
	 * Truncates to 50 chars, removes metadata
	 *
	 * @param text Completion text
	 * @returns Preview string
	 */
	private createPreview(text: string): string {
		// Remove metadata comments if present
		const cleaned = text.replace(/<!--.*?-->/g, '').trim();

		// Take first 50 chars
		const preview = cleaned.substring(0, 50);

		// Add ellipsis if truncated
		return cleaned.length > 50 ? `${preview}...` : preview;
	}
}
