/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Tests for StringEdit utilities (Issue #58.1)
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';
import { OffsetRange, StringReplacement, StringEdit } from '../common/stringEdit';

describe('OffsetRange', () => {
	describe('constructor', () => {
		it('should create valid range', () => {
			const range = new OffsetRange(10, 20);
			expect(range.start).toBe(10);
			expect(range.endExclusive).toBe(20);
			expect(range.length).toBe(10);
		});

		it('should throw on end before start', () => {
			expect(() => new OffsetRange(20, 10)).toThrow('Invalid range');
		});

		it('should allow empty range (start === end)', () => {
			const range = new OffsetRange(10, 10);
			expect(range.isEmpty).toBe(true);
			expect(range.length).toBe(0);
		});
	});

	describe('contains', () => {
		it('should return true for offset in range', () => {
			const range = new OffsetRange(10, 20);
			expect(range.contains(10)).toBe(true);
			expect(range.contains(15)).toBe(true);
			expect(range.contains(19)).toBe(true);
		});

		it('should return false for offset outside range', () => {
			const range = new OffsetRange(10, 20);
			expect(range.contains(9)).toBe(false);
			expect(range.contains(20)).toBe(false); // endExclusive
			expect(range.contains(21)).toBe(false);
		});
	});

	describe('containsRange', () => {
		it('should return true when completely contains other', () => {
			const range = new OffsetRange(10, 30);
			expect(range.containsRange(new OffsetRange(15, 20))).toBe(true);
			expect(range.containsRange(new OffsetRange(10, 30))).toBe(true); // self
		});

		it('should return false when does not contain other', () => {
			const range = new OffsetRange(10, 30);
			expect(range.containsRange(new OffsetRange(5, 15))).toBe(false);
			expect(range.containsRange(new OffsetRange(25, 35))).toBe(false);
			expect(range.containsRange(new OffsetRange(5, 35))).toBe(false);
		});
	});

	describe('intersectsOrTouches', () => {
		it('should return true for overlapping ranges', () => {
			const range = new OffsetRange(10, 20);
			expect(range.intersectsOrTouches(new OffsetRange(15, 25))).toBe(true);
			expect(range.intersectsOrTouches(new OffsetRange(5, 15))).toBe(true);
		});

		it('should return true for touching ranges', () => {
			const range = new OffsetRange(10, 20);
			expect(range.intersectsOrTouches(new OffsetRange(20, 30))).toBe(true);
			expect(range.intersectsOrTouches(new OffsetRange(0, 10))).toBe(true);
		});

		it('should return false for non-overlapping ranges', () => {
			const range = new OffsetRange(10, 20);
			expect(range.intersectsOrTouches(new OffsetRange(21, 30))).toBe(false);
			expect(range.intersectsOrTouches(new OffsetRange(0, 9))).toBe(false);
		});
	});

	describe('delta', () => {
		it('should shift range by positive offset', () => {
			const range = new OffsetRange(10, 20);
			const shifted = range.delta(5);
			expect(shifted.start).toBe(15);
			expect(shifted.endExclusive).toBe(25);
		});

		it('should shift range by negative offset', () => {
			const range = new OffsetRange(10, 20);
			const shifted = range.delta(-5);
			expect(shifted.start).toBe(5);
			expect(shifted.endExclusive).toBe(15);
		});
	});

	describe('substring', () => {
		it('should extract substring from text', () => {
			const range = new OffsetRange(6, 11);
			expect(range.substring('hello world')).toBe('world');
		});

		it('should return empty string for empty range', () => {
			const range = new OffsetRange(5, 5);
			expect(range.substring('hello world')).toBe('');
		});
	});
});

describe('StringReplacement', () => {
	describe('constructor', () => {
		it('should create replacement', () => {
			const replacement = new StringReplacement(
				new OffsetRange(6, 11),
				'everyone'
			);
			expect(replacement.replaceRange.start).toBe(6);
			expect(replacement.replaceRange.endExclusive).toBe(11);
			expect(replacement.newText).toBe('everyone');
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty replacement', () => {
			const replacement = new StringReplacement(
				new OffsetRange(5, 5),
				''
			);
			expect(replacement.isEmpty).toBe(true);
		});

		it('should return false for non-empty replacement', () => {
			const replacement1 = new StringReplacement(
				new OffsetRange(5, 10),
				''
			);
			expect(replacement1.isEmpty).toBe(false);

			const replacement2 = new StringReplacement(
				new OffsetRange(5, 5),
				'text'
			);
			expect(replacement2.isEmpty).toBe(false);
		});
	});

	describe('apply', () => {
		it('should replace text in string', () => {
			const replacement = new StringReplacement(
				new OffsetRange(6, 11),
				'everyone'
			);
			expect(replacement.apply('hello world')).toBe('hello everyone');
		});

		it('should insert text (empty range)', () => {
			const replacement = new StringReplacement(
				new OffsetRange(5, 5),
				' there'
			);
			expect(replacement.apply('hello world')).toBe('hello there world');
		});

		it('should delete text (empty newText)', () => {
			const replacement = new StringReplacement(
				new OffsetRange(5, 11),
				''
			);
			expect(replacement.apply('hello world')).toBe('hello');
		});
	});

	describe('delta', () => {
		it('should shift replacement position', () => {
			const replacement = new StringReplacement(
				new OffsetRange(10, 15),
				'foo'
			);
			const shifted = replacement.delta(5);
			expect(shifted.replaceRange.start).toBe(15);
			expect(shifted.replaceRange.endExclusive).toBe(20);
			expect(shifted.newText).toBe('foo');
		});
	});

	describe('removeCommonSuffixAndPrefix', () => {
		it('should remove common prefix', () => {
			const text = 'hello world';
			const replacement = new StringReplacement(
				new OffsetRange(0, 11),
				'hello everyone'
			);
			const optimized = replacement.removeCommonSuffixAndPrefix(text);
			expect(optimized.replaceRange.start).toBe(6);
			expect(optimized.replaceRange.endExclusive).toBe(11);
			expect(optimized.newText).toBe('everyone');
		});

		it('should remove common suffix', () => {
			const text = 'hello world';
			const replacement = new StringReplacement(
				new OffsetRange(0, 11),
				'goodbye world'
			);
			const optimized = replacement.removeCommonSuffixAndPrefix(text);
			expect(optimized.replaceRange.start).toBe(0);
			expect(optimized.replaceRange.endExclusive).toBe(5);
			expect(optimized.newText).toBe('goodbye');
		});

		it('should remove both prefix and suffix', () => {
			const text = 'the quick brown fox';
			const replacement = new StringReplacement(
				new OffsetRange(0, 19),
				'the slow brown fox'
			);
			const optimized = replacement.removeCommonSuffixAndPrefix(text);
			expect(optimized.replaceRange.start).toBe(4);
			expect(optimized.replaceRange.endExclusive).toBe(9);
			expect(optimized.newText).toBe('slow');
		});

		it('should handle identical strings', () => {
			const text = 'hello world';
			const replacement = new StringReplacement(
				new OffsetRange(0, 11),
				'hello world'
			);
			const optimized = replacement.removeCommonSuffixAndPrefix(text);
			expect(optimized.isEmpty).toBe(true);
		});
	});
});

describe('StringEdit', () => {
	describe('constructor', () => {
		it('should create edit from replacements', () => {
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(0, 5), 'goodbye'),
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			]);
			expect(edit.replacements.length).toBe(2);
		});

		it('should throw on overlapping replacements', () => {
			expect(() => new StringEdit([
				new StringReplacement(new OffsetRange(0, 10), 'foo'),
				new StringReplacement(new OffsetRange(5, 15), 'bar')
			])).toThrow('non-overlapping and sorted');
		});

		it('should throw on unsorted replacements', () => {
			expect(() => new StringEdit([
				new StringReplacement(new OffsetRange(10, 15), 'foo'),
				new StringReplacement(new OffsetRange(0, 5), 'bar')
			])).toThrow('non-overlapping and sorted');
		});

		it('should allow adjacent replacements', () => {
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(0, 5), 'foo'),
				new StringReplacement(new OffsetRange(5, 10), 'bar')
			]);
			expect(edit.replacements.length).toBe(2);
		});
	});

	describe('isEmpty', () => {
		it('should return true for empty edit', () => {
			expect(StringEdit.empty.isEmpty).toBe(true);
		});

		it('should return true for all-empty replacements', () => {
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(5, 5), ''),
				new StringReplacement(new OffsetRange(10, 10), '')
			]);
			expect(edit.isEmpty).toBe(true);
		});

		it('should return false for non-empty edit', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 5), 'text')
			);
			expect(edit.isEmpty).toBe(false);
		});
	});

	describe('apply', () => {
		it('should apply single replacement', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			);
			expect(edit.apply('hello world')).toBe('hello everyone');
		});

		it('should apply multiple replacements', () => {
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(0, 5), 'goodbye'),
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			]);
			expect(edit.apply('hello world')).toBe('goodbye everyone');
		});

		it('should handle empty edit', () => {
			const text = 'hello world';
			expect(StringEdit.empty.apply(text)).toBe(text);
		});
	});

	describe('compose', () => {
		it('should compose two non-overlapping edits', () => {
			const text = 'hello world';

			// Edit 1: Replace "world" with "everyone"
			const edit1 = StringEdit.single(
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			);

			// Edit 2: Replace "hello" with "goodbye" (operates on result of edit1)
			const edit2 = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 5), 'goodbye')
			);

			const composed = edit1.compose(edit2);
			expect(composed.apply(text)).toBe('goodbye everyone');
		});

		it('should handle empty edits', () => {
			const edit1 = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 5), 'foo')
			);

			expect(edit1.compose(StringEdit.empty).equals(edit1)).toBe(true);
			expect(StringEdit.empty.compose(edit1).equals(edit1)).toBe(true);
		});

		// TODO: Complex compose scenarios will be tested in #58.3 (Edit Composition)
		// For now, we test basic compose functionality
		it('should compose simple sequential edits', () => {
			const text = 'hello world';

			// Edit 1: Replace "world" with "everyone"
			const edit1 = StringEdit.single(
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			);

			// Edit 2: Replace "hello" with "goodbye" (non-overlapping)
			const edit2 = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 5), 'goodbye')
			);

			const composed = edit1.compose(edit2);
			const result = composed.apply(text);

			// Should produce same result as sequential application
			const sequential = edit2.apply(edit1.apply(text));
			expect(result).toBe(sequential);
		});
	});

	describe('removeCommonSuffixAndPrefix', () => {
		it('should optimize all replacements', () => {
			const text = 'hello world';
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(0, 5), 'hello'), // no-op
				new StringReplacement(new OffsetRange(6, 11), 'world') // no-op
			]);

			const optimized = edit.removeCommonSuffixAndPrefix(text);
			expect(optimized.isEmpty).toBe(true);
		});

		it('should filter out empty replacements after optimization', () => {
			const text = 'hello world';
			const edit = new StringEdit([
				new StringReplacement(new OffsetRange(0, 11), 'hello everyone')
			]);

			const optimized = edit.removeCommonSuffixAndPrefix(text);
			expect(optimized.replacements.length).toBe(1);
			expect(optimized.replacements[0].newText).toBe('everyone');
		});
	});

	describe('factory methods', () => {
		it('should create single-replacement edit', () => {
			const replacement = new StringReplacement(
				new OffsetRange(0, 5),
				'foo'
			);
			const edit = StringEdit.single(replacement);
			expect(edit.replacements.length).toBe(1);
			expect(edit.replacements[0]).toBe(replacement);
		});

		it('should create empty edit', () => {
			const edit = StringEdit.empty;
			expect(edit.isEmpty).toBe(true);
			expect(edit.replacements.length).toBe(0);
		});

		it('should create edit from array', () => {
			const replacements = [
				new StringReplacement(new OffsetRange(0, 5), 'foo'),
				new StringReplacement(new OffsetRange(6, 10), 'bar')
			];
			const edit = StringEdit.create(replacements);
			expect(edit.replacements).toBe(replacements);
		});
	});

	describe('edge cases', () => {
		it('should handle empty string', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), 'hello')
			);
			expect(edit.apply('')).toBe('hello');
		});

		it('should handle replacement at start', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 5), 'hi')
			);
			expect(edit.apply('hello world')).toBe('hi world');
		});

		it('should handle replacement at end', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(6, 11), 'everyone')
			);
			expect(edit.apply('hello world')).toBe('hello everyone');
		});

		it('should handle replacement of entire string', () => {
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 11), 'goodbye')
			);
			expect(edit.apply('hello world')).toBe('goodbye');
		});
	});
});
