/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Display location factory for multi-document inline completions
 *  Based on Copilot's createNextEditorEditCompletionItem() pattern
 *  Reference: inlineCompletionProvider.ts:320-349
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Edit type for context-aware label generation
 */
export enum EditType {
	Import = 'import',
	Include = 'include',
	NewFile = 'newFile',
	DistantEdit = 'distantEdit',
	Generic = 'generic'
}

/**
 * Label generator for context-aware display location messages
 */
export class LabelGenerator {
	/**
	 * Generate context-aware label for display location
	 *
	 * @param editType Type of edit (import, new file, etc.)
	 * @param targetDocument Target document
	 * @param targetRange Target range
	 * @param currentDocument Current document
	 * @param currentPosition Current cursor position
	 * @param completionText Completion text (for analysis)
	 * @returns User-friendly label text
	 */
	generateLabel(
		editType: EditType,
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentDocument: vscode.TextDocument,
		currentPosition: vscode.Position,
		completionText: string
	): string {
		const targetLine = targetRange.start.line + 1; // 1-indexed for display
		const currentLine = currentPosition.line + 1;
		const distance = Math.abs(targetRange.start.line - currentPosition.line);
		const isSameDocument = targetDocument.uri.toString() === currentDocument.uri.toString();
		const targetFilename = this.getFilename(targetDocument.uri);

		// Context-aware label generation
		switch (editType) {
			case EditType.Import:
				return this.generateImportLabel(targetLine, completionText, isSameDocument, targetFilename);

			case EditType.Include:
				return this.generateIncludeLabel(targetLine, completionText, isSameDocument, targetFilename);

			case EditType.NewFile:
				return this.generateNewFileLabel(targetFilename, targetLine);

			case EditType.DistantEdit:
				return this.generateDistantEditLabel(targetLine, currentLine, distance, isSameDocument, targetFilename);

			case EditType.Generic:
			default:
				return this.generateGenericLabel(targetLine, isSameDocument, targetFilename);
		}
	}

	/**
	 * Generate label for import statement
	 */
	private generateImportLabel(targetLine: number, completionText: string, isSameDocument: boolean, targetFilename: string): string {
		// Extract what's being imported for more context
		const importMatch = completionText.match(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/);
		const module = importMatch?.[3];

		if (targetLine === 1) {
			// Import at top of file
			return module
				? `⇥ Tab to add import from '${module}' at top`
				: `⇥ Tab to add import at top`;
		} else if (isSameDocument) {
			return `⇥ Tab to add import at line ${targetLine}`;
		} else {
			return `⇥ Tab to add import in ${targetFilename}:${targetLine}`;
		}
	}

	/**
	 * Generate label for include/require statement (C++, etc.)
	 */
	private generateIncludeLabel(targetLine: number, completionText: string, isSameDocument: boolean, targetFilename: string): string {
		// Extract what's being included
		const includeMatch = completionText.match(/#include\s+[<"]([^>"]+)[>"]/);
		const header = includeMatch?.[1];

		if (targetLine === 1) {
			return header
				? `⇥ Tab to include <${header}> at top`
				: `⇥ Tab to add include at top`;
		} else if (isSameDocument) {
			return `⇥ Tab to add include at line ${targetLine}`;
		} else {
			return `⇥ Tab to add include in ${targetFilename}:${targetLine}`;
		}
	}

	/**
	 * Generate label for new file creation
	 */
	private generateNewFileLabel(targetFilename: string, targetLine: number): string {
		// For new files, always go to line 1
		return `⇥ Tab to create ${targetFilename}`;
	}

	/**
	 * Generate label for distant edit (>12 lines away)
	 */
	private generateDistantEditLabel(targetLine: number, currentLine: number, distance: number, isSameDocument: boolean, targetFilename: string): string {
		const direction = targetLine < currentLine ? 'above' : 'below';

		if (isSameDocument) {
			// Same file, show direction and distance
			if (distance > 50) {
				return `⇥ Tab to jump to line ${targetLine} (${distance} lines ${direction})`;
			} else {
				return `⇥ Tab to jump to line ${targetLine}`;
			}
		} else {
			// Different file
			return `⇥ Tab to jump to ${targetFilename}:${targetLine}`;
		}
	}

	/**
	 * Generate generic label (fallback)
	 */
	private generateGenericLabel(targetLine: number, isSameDocument: boolean, targetFilename: string): string {
		if (isSameDocument) {
			return targetLine === 1
				? `⇥ Tab to jump to top of file`
				: `⇥ Tab to jump to line ${targetLine}`;
		} else {
			return `⇥ Tab to edit ${targetFilename}:${targetLine}`;
		}
	}

	/**
	 * Extract filename from URI
	 */
	private getFilename(uri: vscode.Uri): string {
		const path = uri.path;
		const parts = path.split('/');
		return parts[parts.length - 1];
	}
}

/**
 * Display location factory for multi-document completions
 * Creates label-based display locations following Copilot's UX pattern
 */
export class DisplayLocationFactory {
	private readonly labelGenerator = new LabelGenerator();
	/**
	 * Create label-based display location for multi-document edit
	 * Based on Copilot's createNextEditorEditCompletionItem()
	 * Reference: inlineCompletionProvider.ts:326-330, anyDiagnosticsCompletionProvider.ts:88-90
	 *
	 * @param editType Type of edit (for context-aware labeling)
	 * @param targetDocument Target document
	 * @param targetRange Edit range in target document (where code will be inserted)
	 * @param currentDocument Current document
	 * @param currentPosition Current cursor position (where label is shown)
	 * @param completionText Completion text (for analysis)
	 * @returns Display location with label
	 */
	createLabel(
		editType: EditType,
		targetDocument: vscode.TextDocument,
		targetRange: vscode.Range,
		currentDocument: vscode.TextDocument,
		currentPosition: vscode.Position,
		completionText: string
	): vscode.InlineCompletionDisplayLocation {
		// Generate context-aware label
		const label = this.labelGenerator.generateLabel(
			editType,
			targetDocument,
			targetRange,
			currentDocument,
			currentPosition,
			completionText
		);

		// Create zero-width range at current cursor position
		// This is where the LABEL will be displayed (not where code will be inserted)
		// Reference: inlineCompletionProvider.ts:325-330
		const currentRange = new vscode.Range(currentPosition, currentPosition);

		// Return display location with CURRENT position for label display
		// VS Code shows the label at displayLocation.range (current cursor)
		// The actual insertion happens at InlineCompletionItem.range (target - set in provider)
		return {
			range: currentRange, // Current position (where label shows) - NOT target
			label,
			kind: vscode.InlineCompletionDisplayLocationKind.Label // Label kind for navigation
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
