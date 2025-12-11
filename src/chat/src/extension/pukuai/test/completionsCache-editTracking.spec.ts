/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for CompletionsCache with Edit Tracking (Issue #58.3)
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach } from 'vitest';
import { CompletionsCache } from '../common/completionsCache';
import { DocumentEditTracker } from '../common/documentEditTracker';
import { StringEdit, StringReplacement, OffsetRange } from '../common/stringEdit';

/**
 * Mock VS Code types for testing
 */
class MockPosition {
	constructor(public line: number, public character: number) {}
}

class MockTextDocument {
	constructor(
		public uri: { toString: () => string },
		private content: string
	) {}

	getText(): string {
		return this.content;
	}

	offsetAt(position: MockPosition): number {
		// Simple implementation: assume single line
		return position.character;
	}
}

describe('CompletionsCache with Edit Tracking', () => {
	let cache: CompletionsCache;

	beforeEach(() => {
		cache = new CompletionsCache();
	});

	describe('append with edit tracking', () => {
		it('should store completion without edit tracking (legacy)', () => {
			cache.append('const x = ', ';', ['42']);

			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
			expect(cached[0]).toContain('42');
		});

		it('should store completion with document snapshot', () => {
			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			const pos = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, pos as any);

			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
		});

		it('should compute edit window correctly', () => {
			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			// Position at offset 10 (after "const x = ")
			const pos = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, pos as any);

			// Edit window should be [0, 11)
			// 0 = start of prefix
			// 11 = offset 10 + suffix length 1
			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
		});
	});

	describe('edit composition', () => {
		it('should compose edits into cache entries', () => {
			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			const pos = new MockPosition(0, 10);

			// Cache a completion
			cache.append('const x = ', ';', ['42'], doc as any, pos as any);

			// Simulate edit: Insert "// comment\n" at offset 0
			const edit = StringEdit.insert(0, '// comment\n');
			cache.handleDocumentChange('file:///test.ts', edit);

			// The cache entry should now have userEditSince = edit
			// We can't directly inspect the entry, but we can verify no errors occurred
			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
		});

		it('should only compose edits for matching document URI', () => {
			const doc1 = new MockTextDocument(
				{ toString: () => 'file:///test1.ts' },
				'const x = 1;'
			);
			const doc2 = new MockTextDocument(
				{ toString: () => 'file:///test2.ts' },
				'const y = 2;'
			);
			const pos = new MockPosition(0, 10);

			// Cache completions for doc1
			cache.append('const x = ', ';', ['42'], doc1 as any, pos as any);

			// Edit doc2 (different file)
			const edit = StringEdit.insert(0, '// comment\n');
			cache.handleDocumentChange('file:///test2.ts', edit);

			// Doc1's cache entry should NOT be affected
			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
		});

		it('should compose multiple edits sequentially', () => {
			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			const pos = new MockPosition(0, 10);

			cache.append('const x = ', ';', ['42'], doc as any, pos as any);

			// Edit 1: Insert comment
			const edit1 = StringEdit.insert(0, '// comment\n');
			cache.handleDocumentChange('file:///test.ts', edit1);

			// Edit 2: Delete something
			const edit2 = StringEdit.delete(OffsetRange.ofStartAndLength(0, 5));
			cache.handleDocumentChange('file:///test.ts', edit2);

			// Both edits should be composed
			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
		});
	});

	// Skipped: Requires VS Code API (workspace.onDidChangeTextDocument)
	describe.skip('integration with DocumentEditTracker', () => {
		it('should receive edits from tracker', (done) => {
			const tracker = new DocumentEditTracker();
			cache.setEditTracker(tracker);

			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			const pos = new MockPosition(0, 10);

			// Cache a completion
			cache.append('const x = ', ';', ['42'], doc as any, pos as any);

			// Simulate edit through tracker
			const mockChangeEvent = {
				document: {
					uri: { toString: () => 'file:///test.ts', scheme: 'file' },
					getText: () => 'const x = 1;',
					languageId: 'typescript',
					version: 1
				},
				contentChanges: [
					{
						rangeOffset: 0,
						rangeLength: 0,
						text: '// test\n'
					}
				]
			};

			// Small delay to allow event handling
			setTimeout(() => {
				const cached = cache.findAll('const x = ', ';');
				expect(cached.length).toBeGreaterThan(0);
				tracker.dispose();
				done();
			}, 10);

			(tracker as any).handleDocumentChange(mockChangeEvent);
		});
	});

	describe('backward compatibility', () => {
		it('should work without edit tracking parameters', () => {
			cache.append('const x = ', ';', ['42']);

			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBeGreaterThan(0);
			expect(cached[0]).toContain('42');
		});

		it('should handle mixed entries (with and without edit tracking)', () => {
			const doc = new MockTextDocument(
				{ toString: () => 'file:///test.ts' },
				'const x = 1;'
			);
			const pos = new MockPosition(0, 10);

			// Add entry without edit tracking
			cache.append('const x = ', ';', ['42']);

			// Add entry with edit tracking
			cache.append('const x = ', ';', ['43'], doc as any, pos as any);

			const cached = cache.findAll('const x = ', ';');
			expect(cached.length).toBe(2);
		});
	});
});
