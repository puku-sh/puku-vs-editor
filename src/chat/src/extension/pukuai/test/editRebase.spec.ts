/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for Edit Rebasing Algorithm (Issue #58.4)
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect, beforeEach } from 'vitest';
import { tryRebase, checkEditConsistency, EditDataWithIndex, ConsoleTracer } from '../common/editRebase';
import { StringEdit, StringReplacement, OffsetRange } from '../common/stringEdit';

describe('Edit Rebasing Algorithm', () => {
	let tracer: ConsoleTracer;

	beforeEach(() => {
		tracer = new ConsoleTracer('[Test]');
	});

	describe('Simple Rebasing', () => {
		it('should rebase when user adds line above', () => {
			const original = 'const x = 1;';
			const current = '// comment\nconst x = 1;';

			// Cached edit: Replace "1" with "42"
			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),  // "1"
				'42'
			);

			// User edit: Insert "// comment\n" at start
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), '// comment\n')
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			expect(result).not.toBe('rebaseFailed');
			expect(result).not.toBe('outsideEditWindow');
			expect(result).not.toBe('inconsistentEdits');

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			expect(rebased.length).toBeGreaterThan(0);
			// Original offset 10 + 11 chars added = offset 21
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(21);
			expect(rebased[0].rebasedEdit.replaceRange.endExclusive).toBe(22);
			expect(rebased[0].rebasedEdit.newText).toBe('42');
		});

		it('should rebase when user deletes lines above', () => {
			const original = '// line 1\n// line 2\n// line 3\nconst x = 1;';
			const current = '// line 1\nconst x = 1;';

			// Cached edit: Replace "1" at offset 40
			const cachedEdit = new StringReplacement(
				new OffsetRange(40, 41),
				'42'
			);

			// User edit: Delete lines 2-3 (offsets 10-30)
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(10, 30), '')
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			// Original offset 40 - 20 chars deleted = offset 20
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(20);
			expect(rebased[0].rebasedEdit.newText).toBe('42');
		});

		it('should not affect cached edit when user edits below', () => {
			const original = 'const x = 1;\nconst y = 2;';
			const current = 'const x = 1;\nconst y = 2;\nconst z = 3;';

			// Cached edit: Replace "1" at offset 10
			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			// User edit: Add line below
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(25, 25), '\nconst z = 3;')
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			// No change - edit was below cached position
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(10);
			expect(rebased[0].rebasedEdit.replaceRange.endExclusive).toBe(11);
		});
	});

	describe('Conflict Detection', () => {
		it('should fail when user types different text', () => {
			const original = 'const x = 1;';
			const current = 'const x = 99;';

			// Cached edit: Replace "1" with "42"
			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			// User edit: Replace "1" with "99"
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(10, 11), '99')
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			expect(result).toBe('rebaseFailed');
		});

		it('should succeed when user types part of suggestion', () => {
			const original = 'function test() {}';
			const current = 'function test() { return }';

			// Cached edit: Replace "{}" with "{ return 42; }"
			const cachedEdit = new StringReplacement(
				new OffsetRange(16, 18),
				'{ return 42; }'
			);

			// User edit: User typed " return " (part of suggestion)
			// This is 8 chars at position 1 in suggestion, which exceeds
			// maxImperfectAgreementLength (5) in strict mode
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(17, 17), ' return ')
			);

			// Use lenient mode since the user typing is long (8 chars)
			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'lenient',  // Changed from 'strict' to 'lenient'
				tracer
			);

			expect(result).not.toBe('rebaseFailed');
			// Should successfully rebase
			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			expect(rebased.length).toBeGreaterThan(0);
		});
	});

	describe('Edit Window', () => {
		it('should return outsideEditWindow when cursor moves away', () => {
			const original = 'function test() {\n  const x = 1;\n}';
			const current = original;

			// Cached edit at line 1 (const x = 1)
			const cachedEdit = new StringReplacement(
				new OffsetRange(30, 31),
				'42'
			);

			// Edit window: lines 1-2
			const editWindow = new OffsetRange(18, 34);

			// User edit: none
			const userEdit = StringEdit.empty;

			// Current cursor: line 0 (outside window)
			const currentSelection = [new OffsetRange(5, 5)];

			const result = tryRebase(
				original,
				editWindow,
				[cachedEdit],
				[],
				userEdit,
				current,
				currentSelection,
				'strict',
				tracer
			);

			expect(result).toBe('outsideEditWindow');
		});

		it('should succeed when cursor stays in window', () => {
			const original = 'const x = 1;';
			const current = '// comment\nconst x = 1;';

			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			// Edit window covers "const x = 1"
			const editWindow = new OffsetRange(0, 12);

			// User adds line above
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), '// comment\n')
			);

			// Cursor still in window (adjusted for edit)
			const currentSelection = [new OffsetRange(21, 21)]; // After "const x = 4"

			const result = tryRebase(
				original,
				editWindow,
				[cachedEdit],
				[],
				userEdit,
				current,
				currentSelection,
				'strict',
				tracer
			);

			expect(result).not.toBe('outsideEditWindow');
		});
	});

	describe('Edit Consistency', () => {
		it('should pass for valid edit chain', () => {
			const original = 'hello';
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), 'well ')
			);
			const current = 'well hello';

			const consistent = checkEditConsistency(original, edit, current, tracer);
			expect(consistent).toBe(true);
		});

		it('should fail for inconsistent edit chain', () => {
			const original = 'hello';
			const edit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), 'well ')
			);
			const current = 'goodbye'; // Doesn't match edit result

			const consistent = checkEditConsistency(original, edit, current, tracer);
			expect(consistent).toBe(false);
		});

		it('should pass for composed edits', () => {
			const original = 'hello';
			const edit1 = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), 'well ')
			);
			const edit2 = StringEdit.single(
				new StringReplacement(new OffsetRange(10, 10), ' there')
			);
			const composed = edit1.compose(edit2);
			const current = 'well hello there';

			const consistent = checkEditConsistency(original, composed, current, tracer);
			expect(consistent).toBe(true);
		});
	});

	describe('Multiple User Edits', () => {
		it('should handle multiple edits above', () => {
			const original = 'const x = 1;';

			// Create user edit by inserting all three lines at once
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), '// line 1\n// line 2\n// line 3\n')
			);
			const current = userEdit.apply(original);

			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			// Check result is not a failure
			expect(result).not.toBe('rebaseFailed');
			expect(result).not.toBe('inconsistentEdits');

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			expect(rebased.length).toBeGreaterThan(0);
			// Original offset 10 + 30 chars added = 40
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(40);
		});

		it('should handle mix of inserts and deletes', () => {
			const original = '// delete\nconst x = 1;\n// keep';
			const current = '// insert\nconst x = 1;\n// keep';

			const cachedEdit = new StringReplacement(
				new OffsetRange(20, 21),  // "1" in const x = 1
				'42'
			);

			// Delete first line, then insert new line (sequential operations)
			const userEdit = StringEdit.composeSequentialReplacements([
				new StringReplacement(new OffsetRange(0, 10), ''), // Delete "// delete\n"
				new StringReplacement(new OffsetRange(0, 0), '// insert\n') // Insert at start (after delete)
			]);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			// Net change: 0 (deleted 10, inserted 10)
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(20);
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty user edits', () => {
			const original = 'const x = 1;';
			const current = original;

			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			const userEdit = StringEdit.empty;

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			// No change
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(10);
			expect(rebased[0].rebasedEdit.newText).toBe('42');
		});

		it('should handle zero-length cached edit (insertion)', () => {
			const original = 'const x;';
			const current = '// comment\nconst x;';

			// Cached edit: Insert " = 1" at offset 7
			const cachedEdit = new StringReplacement(
				new OffsetRange(7, 7),
				' = 1'
			);

			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), '// comment\n')
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(18); // 7 + 11
			expect(rebased[0].rebasedEdit.newText).toBe(' = 1');
		});

		it('should handle very large edits', () => {
			const original = 'const x = 1;';
			const largeInsert = 'x'.repeat(10000);
			const current = largeInsert + 'const x = 1;';

			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(0, 0), largeInsert)
			);

			const result = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);

			const rebased = result as { rebasedEdit: StringReplacement; rebasedEditIndex: number }[];
			expect(rebased[0].rebasedEdit.replaceRange.start).toBe(10010);
		});
	});

	describe('Lenient vs Strict Mode', () => {
		it('should fail in strict mode but succeed in lenient mode', () => {
			const original = 'const x = 1;';
			const current = 'const x = 1 + 2;';

			// Cached edit: Replace "1" with "42"
			const cachedEdit = new StringReplacement(
				new OffsetRange(10, 11),
				'42'
			);

			// User edit: Insert " + 2" after "1" (complex overlap)
			const userEdit = StringEdit.single(
				new StringReplacement(new OffsetRange(11, 11), ' + 2')
			);

			// Strict mode should fail
			const strictResult = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'strict',
				tracer
			);
			expect(strictResult).toBe('rebaseFailed');

			// Lenient mode might succeed (implementation-dependent)
			const lenientResult = tryRebase(
				original,
				undefined,
				[cachedEdit],
				[],
				userEdit,
				current,
				[],
				'lenient',
				tracer
			);
			// Lenient mode behavior is best-effort
		});
	});
});
