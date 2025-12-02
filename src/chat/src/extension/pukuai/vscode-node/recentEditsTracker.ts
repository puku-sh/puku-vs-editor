/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Recent Edits Tracker
 *  Tracks recent code edits to prevent LLM from suggesting duplicate code
 *  Inspired by Cursor's tab completion approach
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Represents a single edit operation
 */
export interface RecentEdit {
	/** Relative file path from workspace root */
	filepath: string;
	/** Content before the edit */
	contentBefore: string;
	/** Content after the edit */
	contentAfter: string;
	/** Timestamp when edit occurred */
	timestamp: number;
	/** Start line of the edit */
	lineStart: number;
	/** End line of the edit */
	lineEnd: number;
	/** Document version when edit occurred */
	documentVersion: number;
}

/**
 * Tracks recent code edits across the workspace
 * Used to provide context to FIM completions to prevent duplication
 */
export class RecentEditsTracker implements vscode.Disposable {
	private edits: RecentEdit[] = [];
	private readonly maxEdits = 20; // Keep last 20 edits across all files
	private readonly maxEditLength = 200; // Max characters per edit (before/after) - optimized for token budget
	private readonly minEditLength = 10; // Ignore very small edits (like single character changes)

	// Track document snapshots to capture "before" content
	private documentSnapshots = new Map<string, { content: string; version: number }>();

	private disposables: vscode.Disposable[] = [];

	constructor() {
		// Listen to document changes
		this.disposables.push(
			vscode.workspace.onDidChangeTextDocument(this.onDocumentChange.bind(this))
		);

		// Clean up snapshots when documents close
		this.disposables.push(
			vscode.workspace.onDidCloseTextDocument(doc => {
				this.documentSnapshots.delete(doc.uri.toString());
			})
		);

		console.log('[RecentEditsTracker] Initialized');
	}

	/**
	 * Handle document change events
	 */
	private onDocumentChange(event: vscode.TextDocumentChangeEvent): void {
		const document = event.document;
		const uri = document.uri.toString();

		// Ignore non-file schemes (like output, debug consoles, etc.)
		if (document.uri.scheme !== 'file') {
			return;
		}

		// Ignore if no changes
		if (event.contentChanges.length === 0) {
			return;
		}

		// Get or create snapshot for "before" content
		let snapshot = this.documentSnapshots.get(uri);
		if (!snapshot) {
			// First time seeing this document, just save current state
			snapshot = {
				content: document.getText(),
				version: document.version
			};
			this.documentSnapshots.set(uri, snapshot);
			return;
		}

		// Process each change
		for (const change of event.contentChanges) {
			// Calculate line range
			const lineStart = change.range.start.line;
			const lineEnd = change.range.end.line;

			// Extract relevant portions of before/after content
			const lines = snapshot.content.split('\n');
			const contextBefore = 2; // Lines before edit
			const contextAfter = 2;  // Lines after edit

			const startLine = Math.max(0, lineStart - contextBefore);
			const endLine = Math.min(lines.length - 1, lineEnd + contextAfter);

			const contentBefore = lines.slice(startLine, endLine + 1).join('\n');

			// Get "after" content from current document
			const newLines = document.getText().split('\n');
			const newEndLine = Math.min(newLines.length - 1, lineStart + (endLine - lineStart) + contextAfter);
			const contentAfter = newLines.slice(startLine, newEndLine + 1).join('\n');

			// Ignore very small edits (like single character typing)
			if (contentBefore.length < this.minEditLength && contentAfter.length < this.minEditLength) {
				continue;
			}

			// Truncate if too long
			const truncatedBefore = contentBefore.length > this.maxEditLength
				? contentBefore.substring(0, this.maxEditLength) + '...'
				: contentBefore;

			const truncatedAfter = contentAfter.length > this.maxEditLength
				? contentAfter.substring(0, this.maxEditLength) + '...'
				: contentAfter;

			// Get relative path
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
			const relativePath = workspaceFolder
				? vscode.workspace.asRelativePath(document.uri, false)
				: document.uri.fsPath;

			// Create edit record
			const edit: RecentEdit = {
				filepath: relativePath,
				contentBefore: truncatedBefore,
				contentAfter: truncatedAfter,
				timestamp: Date.now(),
				lineStart,
				lineEnd,
				documentVersion: document.version
			};

			// Add to beginning of array (most recent first)
			this.edits.unshift(edit);

			// Limit total number of edits
			if (this.edits.length > this.maxEdits) {
				this.edits.pop();
			}

			console.log(`[RecentEditsTracker] Tracked edit in ${relativePath} at lines ${lineStart}-${lineEnd}`);
		}

		// Update snapshot to current state
		this.documentSnapshots.set(uri, {
			content: document.getText(),
			version: document.version
		});
	}

	/**
	 * Get recent edits for a specific file
	 * @param filepath File path to filter by
	 * @param limit Maximum number of edits to return
	 * @returns Array of recent edits for the file
	 */
	getRecentEdits(filepath: string, limit: number = 3): RecentEdit[] {
		return this.edits
			.filter(edit => edit.filepath === filepath)
			.slice(0, limit);
	}

	/**
	 * Get all recent edits across all files
	 * @param limit Maximum number of edits to return
	 * @returns Array of recent edits
	 */
	getAllRecentEdits(limit: number = 5): RecentEdit[] {
		return this.edits.slice(0, limit);
	}

	/**
	 * Clear all tracked edits
	 */
	clear(): void {
		this.edits = [];
		this.documentSnapshots.clear();
		console.log('[RecentEditsTracker] Cleared all edits');
	}

	/**
	 * Get statistics about tracked edits
	 */
	getStats(): { totalEdits: number; filesTracked: number; oldestEdit: number | null } {
		const uniqueFiles = new Set(this.edits.map(e => e.filepath));
		const oldestEdit = this.edits.length > 0
			? this.edits[this.edits.length - 1].timestamp
			: null;

		return {
			totalEdits: this.edits.length,
			filesTracked: uniqueFiles.size,
			oldestEdit
		};
	}

	/**
	 * Dispose and clean up resources
	 */
	dispose(): void {
		this.disposables.forEach(d => d.dispose());
		this.documentSnapshots.clear();
		this.edits = [];
		console.log('[RecentEditsTracker] Disposed');
	}
}
