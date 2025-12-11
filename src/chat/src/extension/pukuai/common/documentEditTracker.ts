/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Document edit tracking for edit rebasing (Issue #58.2)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { StringEdit, StringReplacement, OffsetRange } from './stringEdit';

/**
 * Edit history for a single document.
 * Stores timestamped edits and can compose them.
 */
class DocumentEditHistory {
	private readonly _edits: Array<{ edit: StringEdit; timestamp: number }> = [];
	private readonly _maxEdits = 100; // Keep last 100 edits

	constructor(public readonly document: vscode.TextDocument) {}

	/**
	 * Add an edit to history
	 */
	addEdit(edit: StringEdit): void {
		this._edits.push({
			edit,
			timestamp: Date.now()
		});

		// Trim old edits (LRU)
		if (this._edits.length > this._maxEdits) {
			this._edits.shift();
		}
	}

	/**
	 * Get all edits composed together since a timestamp
	 */
	getEditsSince(timestamp: number): StringEdit {
		const relevantEdits = this._edits
			.filter(e => e.timestamp >= timestamp)
			.map(e => e.edit);

		if (relevantEdits.length === 0) {
			return StringEdit.empty;
		}

		// Compose all edits into one
		return relevantEdits.reduce((composed, edit) => composed.compose(edit));
	}

	/**
	 * Get all edits composed together
	 */
	getAllEdits(): StringEdit {
		return this.getEditsSince(0);
	}

	/**
	 * Get number of edits in history
	 */
	get size(): number {
		return this._edits.length;
	}

	/**
	 * Clear history
	 */
	clear(): void {
		this._edits.length = 0;
	}
}

/**
 * Event fired when a document is edited
 */
export interface DocumentEditEvent {
	uri: string;
	edit: StringEdit;
	document: vscode.TextDocument;
}

/**
 * Tracks edit history for all open documents.
 * Converts VS Code TextDocumentChangeEvent to StringEdit format.
 *
 * Usage:
 *   const tracker = new DocumentEditTracker();
 *   tracker.onEdit(({ uri, edit }) => {
 *     console.log(`Document ${uri} was edited`);
 *   });
 */
export class DocumentEditTracker implements vscode.Disposable {
	private readonly _documentEdits = new Map<string, DocumentEditHistory>();
	private readonly _disposables: vscode.Disposable[] = [];
	private readonly _onEditEmitter = new vscode.EventEmitter<DocumentEditEvent>();

	/**
	 * Event fired when a document is edited
	 */
	public readonly onEdit = this._onEditEmitter.event;

	constructor() {
		// Listen to document changes
		this._disposables.push(
			vscode.workspace.onDidChangeTextDocument(this.handleDocumentChange.bind(this))
		);

		// Clean up when documents close
		this._disposables.push(
			vscode.workspace.onDidCloseTextDocument(this.handleDocumentClose.bind(this))
		);

		console.log('[DocumentEditTracker] Initialized');
	}

	/**
	 * Handle document change event from VS Code
	 */
	private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
		const uri = event.document.uri.toString();

		// Ignore non-file schemes (output, debug console, etc.)
		if (event.document.uri.scheme !== 'file' && event.document.uri.scheme !== 'untitled') {
			return;
		}

		// Ignore empty changes
		if (event.contentChanges.length === 0) {
			return;
		}

		// Get or create edit history for this document
		let history = this._documentEdits.get(uri);
		if (!history) {
			history = new DocumentEditHistory(event.document);
			this._documentEdits.set(uri, history);
		}

		// Convert VS Code changes to StringEdit
		const edit = this.extractStringEdit(event.document, event.contentChanges);

		// Add to history
		history.addEdit(edit);

		// Fire event
		this._onEditEmitter.fire({ uri, edit, document: event.document });

		console.log(`[DocumentEditTracker] ${uri}: ${edit.replacements.length} replacement(s)`);
		for (const replacement of edit.replacements) {
			console.log(`  - ${replacement.toString()}`);
		}
	}

	/**
	 * Handle document close - clean up history
	 */
	private handleDocumentClose(document: vscode.TextDocument): void {
		const uri = document.uri.toString();
		this._documentEdits.delete(uri);
		console.log(`[DocumentEditTracker] Cleaned up history for ${uri}`);
	}

	/**
	 * Convert VS Code changes to StringEdit.
	 * Based on Copilot's editFromTextDocumentContentChangeEvents.
	 */
	private extractStringEdit(
		document: vscode.TextDocument,
		changes: readonly vscode.TextDocumentContentChangeEvent[]
	): StringEdit {
		// Convert VS Code changes to StringReplacement objects
		const replacementsInApplicationOrder = changes.map(e =>
			StringReplacement.replace(
				OffsetRange.ofStartAndLength(e.rangeOffset, e.rangeLength),
				e.text
			)
		);

		// Use Copilot's composeSequentialReplacements for correct handling
		return StringEdit.composeSequentialReplacements(replacementsInApplicationOrder);
	}

	/**
	 * Get edit history for a document
	 */
	public getEditHistory(uri: string): DocumentEditHistory | undefined {
		return this._documentEdits.get(uri);
	}

	/**
	 * Get all edits since a specific time
	 */
	public getEditsSince(uri: string, timestamp: number): StringEdit {
		const history = this._documentEdits.get(uri);
		if (!history) {
			return StringEdit.empty;
		}
		return history.getEditsSince(timestamp);
	}

	/**
	 * Clear edit history for a document
	 */
	public clearHistory(uri: string): void {
		this._documentEdits.delete(uri);
	}

	/**
	 * Clear all edit history
	 */
	public clearAll(): void {
		this._documentEdits.clear();
	}

	dispose(): void {
		this._disposables.forEach(d => d.dispose());
		this._onEditEmitter.dispose();
		this._documentEdits.clear();
	}
}
