/*---------------------------------------------------------------------------------------------
 *  Puku AI Completions Cache
 *  Inspired by GitHub Copilot's CompletionsCache implementation
 *  Issue #58.3: Added edit tracking and composition support
 *  Issue #58.5: Added cache lookup with rebase support
 *--------------------------------------------------------------------------------------------*/

import { LRURadixTrie } from './radixTrie';
import { StringEdit, OffsetRange, StringReplacement } from './stringEdit';
import { tryRebase, ConsoleTracer } from './editRebase';
import type { DocumentEditTracker } from './documentEditTracker';
import * as vscode from 'vscode';

/**
 * Completion choice (inspired by GitHub Copilot's APIChoice)
 * Issue #133: Support metadata for multi-document inline completions
 */
export interface CompletionChoice {
	completionText: string;
	metadata?: any;  // Optional metadata from backend (targetDocument, targetLine, displayType, etc.)
}

/**
 * Cache entry with edit tracking (Issue #58.3)
 */
interface CacheEntry {
	suffix: string;
	choices: (CompletionChoice | string)[]; // Feature #64: Support multiple completions with metadata (Issue #133), backward compatible with old string format

	// NEW: Edit tracking fields (Issue #58.3)
	documentBeforeEdit?: string;      // Full document when cached
	userEditSince?: StringEdit;       // All edits since cache time
	editWindow?: OffsetRange;         // Valid region [prefixStart, suffixEnd)
	rebaseFailed?: boolean;           // Rebase attempted but failed
	cacheTime?: number;               // Timestamp when cached
	documentUri?: string;             // Document URI for this entry
}

interface CompletionsCacheContents {
	content: CacheEntry[];
}

/** Caches recent completions by document prefix using a Radix Trie for efficient prefix matching. */
export class CompletionsCache {
	private cache = new LRURadixTrie<CompletionsCacheContents>(500);

	// NEW: Reference to edit tracker (Issue #58.3)
	private editTracker?: DocumentEditTracker;

	/**
	 * Set the edit tracker and subscribe to edit events (Issue #58.3)
	 */
	public setEditTracker(tracker: DocumentEditTracker): void {
		this.editTracker = tracker;

		// Subscribe to edit events
		tracker.onEdit(({ uri, edit }) => {
			this.handleDocumentChange(uri, edit);
		});
	}

	/**
	 * Given a document prefix and suffix, return all of the completions that match.
	 * Returns array of completion arrays, with the portion already typed sliced off.
	 * Feature #64: Returns multiple completions for cycling support.
	 * Issue #58.5: Added rebase fallback support.
	 *
	 * @param prefix - Document prefix (text before cursor)
	 * @param suffix - Document suffix (text after cursor)
	 * @param document - Current document (for rebasing)
	 * @param position - Current cursor position (for rebasing)
	 */
	findAll(
		prefix: string,
		suffix: string,
		document?: vscode.TextDocument,
		position?: vscode.Position
	): CompletionChoice[] {
		// Step 1: Try exact prefix match (fast path)
		// Following Copilot's pattern from completionsCache.ts:36-50
		const exactMatches = this.cache.findAll(prefix).flatMap(({ remainingKey, value }) =>
			value.content
				.filter(c => c.suffix === suffix)
				.flatMap(c =>
					c.choices
						.filter(choice => {
							// Backward compatibility: Handle old string format
							if (typeof choice === 'string') {
								return choice.startsWith(remainingKey) && choice.length > remainingKey.length;
							}
							// New format: CompletionChoice
							return choice.completionText.startsWith(remainingKey) &&
								choice.completionText.length > remainingKey.length;
						})
						.map(choice => {
							// Backward compatibility: Convert old string format to CompletionChoice
							if (typeof choice === 'string') {
								return {
									completionText: choice.slice(remainingKey.length)
								};
							}
							// New format: Slice and preserve metadata
							return {
								...choice,
								completionText: choice.completionText.slice(remainingKey.length)
							};
						})
				)
		);

		if (exactMatches.length > 0) {
			console.log('[Cache] ✅ Exact prefix match');
			return exactMatches;
		}

		// Step 2: Try rebasing cached entries (slow path)
		if (!document || !position) {
			// Can't rebase without document context
			console.log('[Cache] ❌ Miss: no document for rebase');
			return [];
		}

		console.log('[Cache] Trying rebase fallback...');

		const currentDocContent = document.getText();
		const currentOffset = document.offsetAt(position);
		const currentSelection = [new OffsetRange(currentOffset, currentOffset)];

		// Try all prefix matches (including partial matches)
		for (const match of exactMatches) {
			for (const entry of match.value.content) {

				// Skip if no edit tracking
				if (!entry.userEditSince || !entry.documentBeforeEdit) {
					continue;
				}

				// Skip if rebase already failed
				if (entry.rebaseFailed) {
					console.log('[Cache] Skipping entry (rebase failed before)');
					continue;
				}

				// Skip if suffix doesn't match
				if (entry.suffix !== suffix) {
					continue;
				}

				// Attempt rebase
				const rebasedCompletions = this.tryRebaseCacheEntry(
					entry,
					currentDocContent,
					currentSelection
				);

				if (rebasedCompletions) {
					console.log('[Cache] ✨ Rebase success!');
					return [rebasedCompletions];
				}
			}
		}

		console.log('[Cache] ❌ Miss: no rebase possible');
		return [];
	}

	/**
	 * Add cached completions for a given prefix with edit tracking (Issue #58.3)
	 *
	 * @param document - VS Code document (for snapshot)
	 * @param position - Cursor position (for edit window)
	 */
	append(
		prefix: string,
		suffix: string,
		choices: CompletionChoice[],
		document?: vscode.TextDocument,  // NEW
		position?: vscode.Position       // NEW
	): void {
		const existing = this.cache.findAll(prefix);

		// Create cache entry with edit tracking
		const entry: CacheEntry = {
			suffix,
			choices,
			documentBeforeEdit: document?.getText(),
			userEditSince: StringEdit.empty,
			editWindow: this.computeEditWindow(prefix, suffix, document, position),
			rebaseFailed: false,
			cacheTime: Date.now(),
			documentUri: document?.uri.toString()
		};

		// Append to an existing array if there is an exact match
		if (existing.length > 0 && existing[0].remainingKey === '') {
			const content = existing[0].value.content;
			this.cache.set(prefix, { content: [...content, entry] });
		} else {
			// Otherwise, add a new value
			this.cache.set(prefix, { content: [entry] });
		}

		if (entry.editWindow) {
			console.log(`[Cache] Stored completion with edit tracking:`, {
				prefix: prefix.substring(0, 30) + '...',
				editWindow: entry.editWindow.toString(),
				documentLength: entry.documentBeforeEdit?.length
			});
		}
	}

	/**
	 * Compute the edit window for a completion (Issue #58.3)
	 * Window extends from start of prefix to end of suffix
	 */
	private computeEditWindow(
		prefix: string,
		suffix: string,
		document?: vscode.TextDocument,
		position?: vscode.Position
	): OffsetRange | undefined {
		if (!document || !position) {
			return undefined;
		}

		const currentOffset = document.offsetAt(position);
		const prefixStart = currentOffset - prefix.length;
		const suffixEnd = currentOffset + suffix.length;

		return new OffsetRange(prefixStart, suffixEnd);
	}

	/**
	 * Handle document change - compose edits into cache entries (Issue #58.3)
	 * Called by DocumentEditTracker when document changes
	 */
	public handleDocumentChange(uri: string, edit: StringEdit): void {
		// Iterate through all cache entries and compose edits
		for (const [key, value] of this.cache.entries()) {
			for (const entry of value.content) {
				// Skip entries without edit tracking
				if (!entry.userEditSince || !entry.documentBeforeEdit) {
					continue;
				}

				// Skip entries for different documents
				if (entry.documentUri && entry.documentUri !== uri) {
					continue;
				}

				// Compose new edit into existing edit history
				entry.userEditSince = entry.userEditSince.compose(edit);

				// Reset rebase failed flag (document changed, might work now)
				entry.rebaseFailed = false;

				console.log(`[Cache] Composed edit into cache entry:`, {
					key: key.substring(0, 30) + '...',
					editCount: entry.userEditSince.replacements.length
				});
			}
		}
	}

	/**
	 * Try to rebase a single cache entry (Issue #58.5)
	 */
	private tryRebaseCacheEntry(
		entry: CacheEntry,
		currentDocContent: string,
		currentSelection: readonly OffsetRange[]
	): CompletionChoice[] | undefined {

		if (!entry.documentBeforeEdit || !entry.userEditSince) {
			return undefined;
		}

		const rebasedChoices: CompletionChoice[] = [];
		const tracer = new ConsoleTracer('[Cache/Rebase]');

		// Rebase each choice in the entry
		for (const choice of entry.choices) {
			// Backward compatibility: Convert old string format to CompletionChoice
			const completionChoice: CompletionChoice = typeof choice === 'string'
				? { completionText: choice }
				: choice;

			// Reconstruct the original edit from the cached completion
			const originalEdit = this.reconstructOriginalEdit(
				entry,
				completionChoice.completionText,
				entry.documentBeforeEdit
			);

			if (!originalEdit) {
				console.log('[Cache] Failed to reconstruct original edit');
				continue;
			}

			// Attempt rebase
			const rebaseResult = tryRebase(
				entry.documentBeforeEdit,
				entry.editWindow,
				[originalEdit],
				[],
				entry.userEditSince,
				currentDocContent,
				currentSelection,
				'strict',  // Use strict mode to avoid false positives
				tracer
			);

			// Handle result
			if (typeof rebaseResult === 'string') {
				// Rebase failed
				this.handleRebaseFailure(entry, rebaseResult);
				return undefined;
			}

			// Success! Extract rebased text
			if (rebaseResult.length === 0) {
				console.log('[Cache] Rebase returned empty result');
				return undefined;
			}

			const rebasedEdit = rebaseResult[0].rebasedEdit;

			// Preserve metadata from original choice
			rebasedChoices.push({
				...completionChoice,
				completionText: rebasedEdit.newText
			});

			console.log('[Cache] Rebased completion:', {
				original: completionChoice.completionText.substring(0, 30) + '...',
				originalOffset: originalEdit.replaceRange.start,
				rebasedOffset: rebasedEdit.replaceRange.start,
				delta: rebasedEdit.replaceRange.start - originalEdit.replaceRange.start
			});
		}

		return rebasedChoices.length > 0 ? rebasedChoices : undefined;
	}

	/**
	 * Reconstruct the original edit from a cached completion (Issue #58.5)
	 *
	 * This is a simplified version. Full implementation would:
	 * - Store the original edit in the cache entry
	 * - Handle multi-line completions
	 * - Handle replacements vs insertions
	 */
	private reconstructOriginalEdit(
		entry: CacheEntry,
		completion: string,
		originalDoc: string
	): StringReplacement | undefined {

		// For now, assume completion is an insertion at edit window start
		if (!entry.editWindow) {
			return undefined;
		}

		// Simple case: Completion is inserted at cursor position
		// The edit window extends from prefix start to suffix end
		// Cursor was at: editWindow.start + prefix.length
		// But we don't have prefix length stored, so we use window start
		return new StringReplacement(
			new OffsetRange(
				entry.editWindow.start,
				entry.editWindow.start
			),
			completion
		);
	}

	/**
	 * Handle rebase failure (Issue #58.5)
	 */
	private handleRebaseFailure(
		entry: CacheEntry,
		reason: string
	): void {
		console.log(`[Cache] Rebase failed: ${reason}`);

		switch (reason) {
			case 'rebaseFailed':
				// Conflict detected - mark entry as failed
				entry.rebaseFailed = true;
				console.log('[Cache] Marked entry as rebaseFailed (conflict)');
				break;

			case 'outsideEditWindow':
				// Cursor moved away - this is expected, don't mark as failed
				console.log('[Cache] Cursor outside edit window (expected)');
				break;

			case 'inconsistentEdits':
				// Edit chain corrupted - clear userEditSince to stop trying
				entry.userEditSince = undefined;
				console.log('[Cache] Cleared edit history (inconsistent)');
				break;
		}
	}

	clear() {
		this.cache = new LRURadixTrie<CompletionsCacheContents>(100);
	}
}
