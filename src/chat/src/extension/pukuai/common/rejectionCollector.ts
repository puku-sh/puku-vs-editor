/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Rejection tracking for inline completions (Issue #56)
 *  Based on GitHub Copilot's rejection collector implementation
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Tracks rejected inline completions to avoid showing them again.
 *
 * Architecture:
 * - Per-document rejection tracking
 * - Stores rejected completion text + position
 * - LRU cache (max 20 rejections per document)
 * - Checks new completions against rejection list
 *
 * Based on: vscode-copilot-chat/src/extension/inlineEdits/common/rejectionCollector.ts
 */
export class RejectionCollector {
	private readonly _documentCaches = new Map<string, DocumentRejectionTracker>();
	private readonly _garbageCollector = new LRUGarbageCollector(20);

	/**
	 * Mark a completion as rejected
	 */
	public reject(document: vscode.TextDocument, rejectedText: string, position: vscode.Position): void {
		const docKey = document.uri.toString();
		let tracker = this._documentCaches.get(docKey);

		if (!tracker) {
			tracker = new DocumentRejectionTracker();
			this._documentCaches.set(docKey, tracker);
		}

		tracker.reject(rejectedText, position, this._garbageCollector);
		console.log(`[RejectionCollector] Rejected completion at ${document.fileName}:${position.line}:${position.character}`, {
			textPreview: rejectedText.substring(0, 50),
			totalRejections: tracker.size()
		});
	}

	/**
	 * Check if a completion was previously rejected
	 */
	public isRejected(document: vscode.TextDocument, completionText: string, position: vscode.Position): boolean {
		const docKey = document.uri.toString();
		const tracker = this._documentCaches.get(docKey);

		if (!tracker) {
			return false;
		}

		const rejected = tracker.isRejected(completionText, position);

		if (rejected) {
			console.log(`[RejectionCollector] ⛔ Blocking previously rejected completion at ${document.fileName}:${position.line}:${position.character}`);
		}

		return rejected;
	}

	/**
	 * Clear all rejection history
	 */
	public clear(): void {
		this._documentCaches.clear();
		this._garbageCollector.clear();
		console.log('[RejectionCollector] Cleared all rejection history');
	}

	/**
	 * Get statistics for debugging
	 */
	public getStats(): { documents: number; totalRejections: number } {
		let totalRejections = 0;
		for (const tracker of this._documentCaches.values()) {
			totalRejections += tracker.size();
		}
		return {
			documents: this._documentCaches.size,
			totalRejections
		};
	}
}

/**
 * Tracks rejected completions for a single document
 */
class DocumentRejectionTracker {
	private readonly _rejectedEdits = new Set<RejectedEdit>();

	public reject(text: string, position: vscode.Position, gc: LRUGarbageCollector): void {
		// Check if already tracked (exact match)
		if (this.isRejected(text, position)) {
			return; // Already tracked
		}

		const edit = new RejectedEdit(text, position, () => {
			this._rejectedEdits.delete(edit);
		});

		this._rejectedEdits.add(edit);
		gc.put(edit);
	}

	public isRejected(text: string, position: vscode.Position): boolean {
		for (const edit of this._rejectedEdits) {
			if (edit.matches(text, position)) {
				return true;
			}
		}
		return false;
	}

	public size(): number {
		return this._rejectedEdits.size;
	}
}

/**
 * Represents a single rejected completion
 */
class RejectedEdit {
	constructor(
		private readonly text: string,
		private readonly position: vscode.Position,
		private readonly onDispose: () => void
	) {}

	/**
	 * Check if a new completion matches this rejected edit
	 *
	 * Match criteria:
	 * - Same position (line + character)
	 * - Same text (exact match or prefix match)
	 */
	public matches(newText: string, newPosition: vscode.Position): boolean {
		// Must be at same position
		if (!this.position.isEqual(newPosition)) {
			return false;
		}

		// Exact match
		if (this.text === newText) {
			return true;
		}

		// Prefix match (rejected "foobar", new is "foo" → reject)
		if (this.text.startsWith(newText) || newText.startsWith(this.text)) {
			return true;
		}

		return false;
	}

	public dispose(): void {
		this.onDispose();
	}
}

/**
 * LRU garbage collector to prevent memory leaks
 * Keeps max N items, discards oldest when limit exceeded
 */
class LRUGarbageCollector {
	private _disposables: Array<{ dispose(): void }> = [];

	constructor(private readonly maxSize: number) {}

	public put(disposable: { dispose(): void }): void {
		this._disposables.push(disposable);

		// Evict oldest if over limit
		if (this._disposables.length > this.maxSize) {
			const oldest = this._disposables.shift();
			oldest?.dispose();
		}
	}

	public clear(): void {
		for (const d of this._disposables) {
			d.dispose();
		}
		this._disposables = [];
	}
}
