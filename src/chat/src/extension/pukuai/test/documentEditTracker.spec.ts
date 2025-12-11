/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for DocumentEditTracker (Issue #58.2)
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { StringEdit, StringReplacement, OffsetRange } from '../common/stringEdit';

describe('StringEdit.composeSequentialReplacements', () => {
	it('should compose sequential replacements correctly', () => {
		// Start with "hello world"
		const base = 'hello world';

		// Simulate inserting "beautiful " at position 6 (before "world")
		const replacements = [
			StringReplacement.replace(OffsetRange.ofStartAndLength(6, 0), 'beautiful ')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);
		expect(result).toBe('hello beautiful world');
	});

	it('should handle deletion', () => {
		const base = 'hello world';
		const replacements = [
			// Delete "hello " (6 chars at offset 0)
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 6), '')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);
		expect(result).toBe('world');
	});

	it('should handle replacement', () => {
		const base = 'hello world';
		const replacements = [
			// Replace "world" with "everyone"
			StringReplacement.replace(OffsetRange.ofStartAndLength(6, 5), 'everyone')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);
		expect(result).toBe('hello everyone');
	});

	it('should handle multiple edits on same base', () => {
		const base = 'hello world';
		const replacements = [
			// Delete "hello "
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 6), ''),
			// Then delete "world" (operates on result of first edit)
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 5), '')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);
		expect(result).toBe('');
	});

	it('should handle empty replacements list', () => {
		const composed = StringEdit.composeSequentialReplacements([]);
		expect(composed.isEmpty).toBe(true);
	});

	it('should handle single replacement', () => {
		const replacements = [
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 0), 'hello')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply('');
		expect(result).toBe('hello');
	});
});

describe('StringEdit composition', () => {
	it('should compose two edits correctly', () => {
		const base = 'hello world';

		// Edit 1: Insert "beautiful " at position 6
		const edit1 = StringEdit.insert(6, 'beautiful ');

		const composed = edit1;
		const result = composed.apply(base);

		expect(result).toBe('hello beautiful world');
	});

	it('should compose basic edits', () => {
		const base = '';
		const replacements = [
			StringReplacement.insert(0, 'hello')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);

		expect(result).toBe('hello');
	});
});

describe('StringEdit edge cases', () => {
	it('should handle overlapping edits in sequential composition', () => {
		const base = 'hello';
		const replacements = [
			// Replace entire text with "goodbye"
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 5), 'goodbye')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);
		expect(result).toBe('goodbye');
	});

	it('should handle non-empty base string', () => {
		const base = '0123456789';
		// Insert at various positions
		const replacements = [
			StringReplacement.replace(OffsetRange.ofStartAndLength(0, 0), 'A'),
			StringReplacement.replace(OffsetRange.ofStartAndLength(5, 0), 'B')
		];

		const composed = StringEdit.composeSequentialReplacements(replacements);
		const result = composed.apply(base);

		// After first insert at 0: "A0123456789"
		// After second insert at 5 (in intermediate text): "A0123B456789"
		expect(result).toContain('A');
		expect(result).toContain('B');
	});
});
