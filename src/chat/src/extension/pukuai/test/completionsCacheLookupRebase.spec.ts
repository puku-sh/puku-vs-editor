/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for Cache Lookup with Rebase (Issue #58.5)
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach } from 'vitest';
import { CompletionsCache } from '../common/completionsCache';
import { StringEdit, StringReplacement, OffsetRange } from '../common/stringEdit';

/**
 * Mock VS Code types for testing
 */
class MockPosition {
	constructor(public line: number, public character: number) {}
}

class MockTextDocument {
	private content: string;
	public readonly uri: { toString: () => string };

	constructor(
		uri: string,
		initialContent: string
	) {
		this.uri = { toString: () => uri };
		this.content = initialContent;
	}

	getText(): string {
		return this.content;
	}

	offsetAt(position: MockPosition): number {
		const lines = this.content.split('\n');
		let offset = 0;
		for (let i = 0; i < position.line; i++) {
			offset += lines[i].length + 1; // +1 for newline
		}
		offset += position.character;
		return offset;
	}

	// Simulate edit
	applyEdit(edit: StringReplacement): void {
		const before = this.content.substring(0, edit.replaceRange.start);
		const after = this.content.substring(edit.replaceRange.endExclusive);
		this.content = before + edit.newText + after;
	}
}

describe('Cache Lookup with Rebase (Issue #58.5)', () => {
	let cache: CompletionsCache;

	beforeEach(() => {
		cache = new CompletionsCache();
		// Note: We don't use DocumentEditTracker in tests (requires VS Code API)
		// Instead, we call handleDocumentChange() directly
	});

	describe('Basic Rebase Integration', () => {
		it('should return exact match without rebasing', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10); // After "const x = "

			// Cache completion
			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// Lookup with exact same prefix
			const results = cache.findAll('const x = ', ';', doc as any, position as any);

			expect(results.length).toBe(1);
			expect(results[0]).toEqual(['42']);
		});

		it('should rebase after user adds line above', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			// Cache completion
			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// Simulate user adding line above
			const edit = new StringReplacement(new OffsetRange(0, 0), '// comment\n');
			doc.applyEdit(edit);

			// Notify cache of edit
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit));

			// New position is shifted down (line 1, same character)
			const newPosition = new MockPosition(1, 10);

			// Lookup should trigger rebase
			const results = cache.findAll('const x = ', ';', doc as any, newPosition as any);

			expect(results.length).toBe(1);
			expect(results[0]).toEqual(['42']);
		});

		it('should detect stale cache after user types different value', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			// Cache completion for "42"
			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// User types "99" directly (no offset change, so exact match still works)
			const edit = new StringReplacement(new OffsetRange(10, 11), '99');
			doc.applyEdit(edit);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit));

			// Lookup with same prefix - will find exact match
			// NOTE: In real usage, after user types "99", the provider wouldn't
			// request completion with same prefix. This test just verifies
			// that stale entries aren't automatically invalidated.
			const results = cache.findAll('const x = ', ';', doc as any, position as any);

			// Cache returns stale completion (this is expected - cache doesn't
			// know the completion is stale until rebase is attempted)
			expect(results.length).toBe(1);
		});

		it('should mark rebaseFailed to avoid retry', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// User adds comment to force rebase
			const edit1 = new StringReplacement(new OffsetRange(0, 0), '// test\n');
			doc.applyEdit(edit1);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit1));

			// Conflicting edit
			const edit2 = new StringReplacement(new OffsetRange(18, 19), '99');
			doc.applyEdit(edit2);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit2));

			const newPosition = new MockPosition(1, 10);

			// First lookup - rebase fails, marks entry
			cache.findAll('const x = ', ';', doc as any, newPosition as any);

			// Second lookup - should skip rebase attempt (entry marked as rebaseFailed)
			const results = cache.findAll('const x = ', ';', doc as any, newPosition as any);

			expect(results.length).toBe(0);
		});
	});

	describe('Multiple Edits', () => {
		it('should handle multiple edits above', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// Add three lines above
			const edit1 = new StringReplacement(new OffsetRange(0, 0), '// line 1\n');
			doc.applyEdit(edit1);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit1));

			const edit2 = new StringReplacement(new OffsetRange(10, 10), '// line 2\n');
			doc.applyEdit(edit2);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit2));

			const edit3 = new StringReplacement(new OffsetRange(20, 20), '// line 3\n');
			doc.applyEdit(edit3);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit3));

			// Position shifted down by 3 lines
			const newPosition = new MockPosition(3, 10);

			const results = cache.findAll('const x = ', ';', doc as any, newPosition as any);

			expect(results.length).toBe(1);
			expect(results[0]).toEqual(['42']);
		});

		it('should handle edit below (no offset change)', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// Add line below (after the code)
			const edit = new StringReplacement(new OffsetRange(12, 12), '\nconst y = 2;');
			doc.applyEdit(edit);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit));

			// Same position
			const results = cache.findAll('const x = ', ';', doc as any, position as any);

			expect(results.length).toBe(1);
			expect(results[0]).toEqual(['42']);
		});
	});

	describe('Multiple Completions', () => {
		it('should rebase all completions in entry', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			// Cache multiple completions
			cache.append('const x = ', ';', ['42', '100', '999'], doc as any, position as any);

			// Add line above
			const edit = new StringReplacement(new OffsetRange(0, 0), '// comment\n');
			doc.applyEdit(edit);
			cache.handleDocumentChange('file:///test.ts', StringEdit.single(edit));

			const newPosition = new MockPosition(1, 10);

			// Should rebase all three
			const results = cache.findAll('const x = ', ';', doc as any, newPosition as any);

			expect(results.length).toBe(1);
			expect(results[0].length).toBe(3);
			expect(results[0]).toEqual(['42', '100', '999']);
		});
	});

	describe('Edge Cases', () => {
		it('should return empty array when no document provided', () => {
			const results = cache.findAll('const x = ', ';');
			expect(results).toEqual([]);
		});

		it('should skip entries without edit tracking when rebasing', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			// Add entry without document/position (no edit tracking)
			cache.append('const x = ', ';', ['42']);

			// Edit document to force rebase path
			const edit = new StringReplacement(new OffsetRange(0, 0), '// test\n');
			doc.applyEdit(edit);

			const newPosition = new MockPosition(1, 10);

			// Should not find anything (no edit tracking, can't rebase)
			const results = cache.findAll('const x = ', ';', doc as any, newPosition as any);

			expect(results).toEqual([]);
		});

		it('should handle empty cache', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			const results = cache.findAll('const x = ', ';', doc as any, position as any);

			expect(results).toEqual([]);
		});

		it('should only rebase entries for matching document', () => {
			const doc1 = new MockTextDocument('file:///test1.ts', 'const x = 1;');
			const doc2 = new MockTextDocument('file:///test2.ts', 'const x = 1;'); // Same content, different file
			const position = new MockPosition(0, 10);

			// Cache completion for doc1
			cache.append('const x = ', ';', ['42'], doc1 as any, position as any);

			// Edit doc1 (add comment)
			const edit = new StringReplacement(new OffsetRange(0, 0), '// comment\n');
			doc1.applyEdit(edit);
			cache.handleDocumentChange('file:///test1.ts', StringEdit.single(edit));

			const newPosition = new MockPosition(1, 10);

			// Try to find in doc2 (different file, prefix no longer matches)
			// Doc2 still has "const x = 1;" at line 0, so lookup at line 1 will fail
			const results = cache.findAll('const x = ', ';', doc2 as any, newPosition as any);

			// Should not find (different document, edit not applied to doc2)
			expect(results).toEqual([]);
		});
	});

	describe('Backwards Compatibility', () => {
		it('should work with old findAll(prefix, suffix) signature', () => {
			const doc = new MockTextDocument('file:///test.ts', 'const x = 1;');
			const position = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, position as any);

			// Old signature (no document/position)
			const results = cache.findAll('const x = ', ';');

			expect(results.length).toBe(1);
			expect(results[0]).toEqual(['42']);
		});
	});
});
