# Issue #58.4: Rebase Algorithm

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Depends On**: #58.1 (StringEdit Utilities)
**Effort**: 3 hours
**Complexity**: 🟡 Medium (Most Complex Sub-Issue)
**Priority**: Core Algorithm

---

## Summary

Implement the core rebasing algorithm that adjusts cached completions based on user edits. This is the mathematical heart of edit rebasing, using GitHub Copilot's proven implementation from `reference/vscode-copilot-chat/src/extension/inlineEdits/common/editRebase.ts`.

---

## Goals

1. ✅ Port `tryRebase()` function from Copilot (main entry point)
2. ✅ Port `tryRebaseEdits()` helper (core offset tracking with agreement-based matching)
3. ✅ Port `checkEditConsistency()` validator
4. ✅ Use Copilot's full implementation including:
   - AnnotatedStringEdit with EditDataWithIndex tracking
   - Diff computation for detailed edits
   - Agreement-based matching (maxAgreementOffset, maxImperfectAgreementLength)
   - Strict/lenient resolution modes
5. ✅ Create comprehensive test suite
6. ✅ Not integrated with cache yet (pure algorithm)

---

## Background

### The Rebasing Problem

Given:
- **Original document**: `"const x = 1;"`
- **Cached completion**: Replace offset [10, 11) ("1") with "42"
- **User edits**: Insert "// comment\n" at offset 0

Compute:
- **Rebased completion**: Replace offset [23, 24) ("1") with "42"

The algorithm must:
1. Track how user edits shift offsets
2. Detect conflicts (user typed something different)
3. Validate edit consistency

---

## Technical Design

### Architecture Overview

Copilot's rebase implementation has several key components:

1. **AnnotatedStringEdit**: StringEdit with typed metadata (EditDataWithIndex)
2. **Diff computation**: Computes detailed character-level diffs for better matching
3. **Agreement-based matching**: Tolerates user typing part of suggestion
4. **Edit window tracking**: Ensures cursor stays in valid region
5. **Consistency validation**: Verifies edit chains are valid

### Core Algorithm (Simplified View)

```typescript
/**
 * Try to rebase cached edits based on user edits since cache time.
 *
 * Based on Copilot's implementation with the following features:
 * - Handles multiple originalEdits (for multi-cursor support)
 * - Uses diff computation for detailed edit tracking
 * - Supports agreement-based matching (user typing part of suggestion)
 * - Validates edit consistency
 * - Tracks edit windows for cursor position validation
 *
 * @param originalDocument - Document state when completion was cached
 * @param editWindow - Optional region where completion is valid
 * @param originalEdits - The cached completion edits (can be multiple)
 * @param detailedEdits - Pre-computed detailed diffs (or empty to compute)
 * @param userEditSince - All user edits since cache time (composed)
 * @param currentDocument - Current document state
 * @param currentSelection - Current cursor position(s)
 * @param resolution - 'strict' (fail on ambiguity) or 'lenient' (best effort)
 * @param tracer - Logging tracer
 * @returns Rebased edits with indices or failure reason
 */
export function tryRebase(
    originalDocument: string,
    editWindow: OffsetRange | undefined,
    originalEdits: readonly StringReplacement[],
    detailedEdits: AnnotatedStringReplacement<EditDataWithIndex>[][],
    userEditSince: StringEdit,
    currentDocument: string,
    currentSelection: readonly OffsetRange[],
    resolution: 'strict' | 'lenient',
    tracer: ITracer
): { rebasedEdit: StringReplacement; rebasedEditIndex: number }[]
   | 'outsideEditWindow'
   | 'rebaseFailed'
   | 'error'
   | 'inconsistentEdits';
```

### Key Implementation Details

**1. Edit Data Tracking:**
```typescript
class EditDataWithIndex implements IEditData<EditDataWithIndex> {
    constructor(public readonly index: number) {}
    join(data: EditDataWithIndex): EditDataWithIndex | undefined {
        return this.index === data.index ? this : undefined;
    }
}
```

**2. Agreement-Based Matching:**
```typescript
const maxAgreementOffset = 10; // Max chars user can type into suggestion
const maxImperfectAgreementLength = 5; // Max length for imperfect match

// Finds where user's typing matches the cached suggestion
function agreementIndexOf(
    content: string,
    ourEdit: AnnotatedStringReplacement<T>,
    baseEdit: StringReplacement,
    previousBaseEdit: StringReplacement | undefined,
    ourNewTextOffset: number,
    resolution: 'strict' | 'lenient'
): number;
```

**3. Diff Computation:**
```typescript
// Computes detailed character-level diffs for better rebase accuracy
function computeDiff(
    original: string,
    modified: string,
    offset: number,
    editData: EditDataWithIndex,
    options: ILinesDiffComputerOptions
): AnnotatedStringReplacement<EditDataWithIndex>[] | undefined;
```

### Implementation Notes

The Copilot implementation is sophisticated and handles many edge cases:

1. **Multi-edit support**: Can rebase multiple edits at once (for multi-cursor scenarios)
2. **Diff-based tracking**: Uses character-level diffs for precise tracking
3. **Agreement tolerance**: Allows user to type partway into a suggestion
4. **Strict/lenient modes**: Configurable conflict resolution
5. **Edit window validation**: Ensures cursor hasn't moved outside valid region
6. **Consistency checks**: Validates edit chains to catch corruption

**Key algorithm flow:**
1. Validate edit consistency (userEditSince.apply(original) === current)
2. Check cursor is still in edit window (if provided)
3. Compute detailed diffs if not provided
4. Try to rebase using agreement-based matching
5. Group rebased edits by index
6. Validate result consistency in strict mode
7. Return rebased edits or failure reason

---

## Test Cases

### Test Suite 1: Simple Rebasing

```typescript
import * as assert from 'assert';
import { tryRebase, checkEditConsistency } from '../common/editRebase';
import { StringEdit, StringReplacement, OffsetRange } from '../common/stringEdit';

suite('tryRebase - Simple Cases', () => {
    test('should rebase when user adds line above', () => {
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
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        assert.notStrictEqual(result, 'rebaseFailed');
        assert.notStrictEqual(result, 'outsideEditWindow');
        assert.notStrictEqual(result, 'inconsistentEdits');

        const rebased = result as StringReplacement;
        // Original offset 10 + 11 chars added = offset 21
        assert.strictEqual(rebased.replaceRange.start, 21);
        assert.strictEqual(rebased.replaceRange.endExclusive, 22);
        assert.strictEqual(rebased.newText, '42');
    });

    test('should rebase when user deletes lines above', () => {
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
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        // Original offset 40 - 20 chars deleted = offset 20
        assert.strictEqual(rebased.replaceRange.start, 20);
        assert.strictEqual(rebased.newText, '42');
    });

    test('should not affect cached edit when user edits below', () => {
        const original = 'const x = 1;\nconst y = 2;';
        const current = 'const x = 1;\nconst y = 2;\nconst z = 3;';

        // Cached edit: Replace "1" at offset 10
        const cachedEdit = new StringReplacement(
            new OffsetRange(10, 11),
            '42'
        );

        // User edit: Add line below (after semicolon at offset 12)
        const userEdit = StringEdit.single(
            new StringReplacement(new OffsetRange(25, 25), '\nconst z = 3;')
        );

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        // No change - edit was below cached position
        assert.strictEqual(rebased.replaceRange.start, 10);
        assert.strictEqual(rebased.replaceRange.endExclusive, 11);
    });
});
```

### Test Suite 2: Conflict Detection

```typescript
suite('tryRebase - Conflicts', () => {
    test('should fail when user types different text', () => {
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
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        assert.strictEqual(result, 'rebaseFailed');
    });

    test('should succeed when user types part of suggestion', () => {
        const original = 'function test() {}';
        const current = 'function test() { return }';

        // Cached edit: Replace "{}" with "{ return 42; }"
        const cachedEdit = new StringReplacement(
            new OffsetRange(16, 18),
            '{ return 42; }'
        );

        // User edit: User typed " return " (part of suggestion)
        const userEdit = StringEdit.single(
            new StringReplacement(new OffsetRange(17, 17), ' return ')
        );

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        assert.notStrictEqual(result, 'rebaseFailed');
        // Should adjust for the accepted portion
    });

    test('should fail on complex overlaps (strict mode)', () => {
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

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        // Strict mode fails on ambiguous cases
        assert.strictEqual(result, 'rebaseFailed');
    });
});
```

### Test Suite 3: Edit Window

```typescript
suite('tryRebase - Edit Window', () => {
    test('should return outsideEditWindow when cursor moves away', () => {
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
        const userEdit = StringEdit.empty();

        // Current cursor: line 0 (outside window)
        const currentSelection = [new OffsetRange(5, 5)];

        const result = tryRebase(
            original,
            editWindow,
            cachedEdit,
            userEdit,
            current,
            currentSelection,
            'strict'
        );

        assert.strictEqual(result, 'outsideEditWindow');
    });

    test('should succeed when cursor stays in window', () => {
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
            cachedEdit,
            userEdit,
            current,
            currentSelection,
            'strict'
        );

        assert.notStrictEqual(result, 'outsideEditWindow');
    });
});
```

### Test Suite 4: Edit Consistency

```typescript
suite('checkEditConsistency', () => {
    test('should pass for valid edit chain', () => {
        const original = 'hello';
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 0), 'well ')
        );
        const current = 'well hello';

        const consistent = checkEditConsistency(original, edit, current);
        assert.strictEqual(consistent, true);
    });

    test('should fail for inconsistent edit chain', () => {
        const original = 'hello';
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 0), 'well ')
        );
        const current = 'goodbye'; // Doesn't match edit result

        const consistent = checkEditConsistency(original, edit, current);
        assert.strictEqual(consistent, false);
    });

    test('should pass for composed edits', () => {
        const original = 'hello';
        const edit1 = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 0), 'well ')
        );
        const edit2 = StringEdit.single(
            new StringReplacement(new OffsetRange(10, 10), ' there')
        );
        const composed = edit1.compose(edit2);
        const current = 'well hello there';

        const consistent = checkEditConsistency(original, composed, current);
        assert.strictEqual(consistent, true);
    });
});
```

### Test Suite 5: Multi-Edit Scenarios

```typescript
suite('tryRebase - Multiple User Edits', () => {
    test('should handle multiple edits above', () => {
        const original = 'const x = 1;';
        const current = '// line 1\n// line 2\n// line 3\nconst x = 1;';

        const cachedEdit = new StringReplacement(
            new OffsetRange(10, 11),
            '42'
        );

        // Three separate insertions
        const userEdit = new StringEdit([
            new StringReplacement(new OffsetRange(0, 0), '// line 1\n'),
            new StringReplacement(new OffsetRange(10, 10), '// line 2\n'),
            new StringReplacement(new OffsetRange(20, 20), '// line 3\n')
        ]);

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        // Original 10 + 30 chars added = 40
        assert.strictEqual(rebased.replaceRange.start, 40);
    });

    test('should handle mix of inserts and deletes', () => {
        const original = '// delete\nconst x = 1;\n// keep';
        const current = '// insert\nconst x = 1;\n// keep';

        const cachedEdit = new StringReplacement(
            new OffsetRange(20, 21),  // "1" in const x = 1
            '42'
        );

        // Delete first line, insert new line
        const userEdit = new StringEdit([
            new StringReplacement(new OffsetRange(0, 10), ''), // Delete "// delete\n"
            new StringReplacement(new OffsetRange(0, 0), '// insert\n') // Insert at start
        ]);

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        // Net change: 0 (deleted 10, inserted 10)
        assert.strictEqual(rebased.replaceRange.start, 20);
    });
});
```

### Test Suite 6: Edge Cases

```typescript
suite('tryRebase - Edge Cases', () => {
    test('should handle empty user edits', () => {
        const original = 'const x = 1;';
        const current = original;

        const cachedEdit = new StringReplacement(
            new OffsetRange(10, 11),
            '42'
        );

        const userEdit = StringEdit.empty();

        const result = tryRebase(
            original,
            undefined,
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        // No change
        assert.strictEqual(rebased.replaceRange.start, 10);
        assert.strictEqual(rebased.newText, '42');
    });

    test('should handle zero-length cached edit (insertion)', () => {
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
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        assert.strictEqual(rebased.replaceRange.start, 18); // 7 + 11
        assert.strictEqual(rebased.newText, ' = 1');
    });

    test('should handle very large edits', () => {
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
            cachedEdit,
            userEdit,
            current,
            [],
            'strict'
        );

        const rebased = result as StringReplacement;
        assert.strictEqual(rebased.replaceRange.start, 10010);
    });
});
```

---

## Console Output Examples

### Scenario 1: Successful Rebase

```
[Rebase] User edit BEFORE cache: {
  userEditOffset: 0,
  delta: 11,
  cumulativeOffset: 11
}
[Rebase] ✅ Success: {
  originalOffset: 10,
  rebasedOffset: 21,
  delta: 11
}
```

### Scenario 2: Conflict Detection

```
[Rebase] CONFLICT: User typed different text: {
  userTyped: "99",
  expected: "42"
}
[Rebase] Rebase failed (conflict detected)
```

### Scenario 3: Outside Edit Window

```
[Rebase] Cursor outside edit window
```

### Scenario 4: Consistency Check Failed

```
[Rebase] Consistency check failed: {
  originalLength: 12,
  reconstructedLength: 15,
  currentLength: 20,
  editCount: 2
}
```

---

## Success Criteria

- ✅ `tryRebase()` handles all scenarios correctly
- ✅ `tryRebaseEdits()` tracks offsets accurately
- ✅ `checkEditConsistency()` catches corrupted edit chains
- ✅ All 20+ test cases pass
- ✅ Handles edge cases (empty edits, large edits, insertions, deletions)
- ✅ Console logs helpful for debugging
- ✅ No integration with cache yet (pure algorithm)

---

## Files to Create/Modify

```
src/chat/src/extension/pukuai/
├── common/
│   ├── editRebase.ts              (NEW - ~270 lines, ported from Copilot)
│   ├── stringEdit.ts              (MODIFIED - add AnnotatedStringEdit support)
│   └── index.ts                   (MODIFIED - add exports)
└── test/
    └── editRebase.spec.ts         (NEW - comprehensive test suite)
```

**Dependencies to port from Copilot:**
- `AnnotatedStringEdit` / `AnnotatedStringReplacement` classes
- `IEditData<T>` interface
- `EditDataWithIndex` class
- Diff computation utilities (or use simpler version initially)

---

## Dependencies

- ✅ **#58.1 StringEdit Utilities** (required - already complete with Copilot's implementation)
- **Copilot Reference**: `reference/vscode-copilot-chat/src/extension/inlineEdits/common/editRebase.ts`
- **Additional Copilot utilities needed**:
  - `AnnotatedStringEdit` / `AnnotatedStringReplacement` (from stringEdit.ts)
  - `IEditData<T>` interface (generic edit metadata)
  - Diff computer (or simplified version for MVP)
  - Tracer interface (can use simple console.log wrapper)
- No VS Code API dependencies (pure algorithm)

---

## Next Steps

After #58.4 is complete:
- ✅ Core rebasing algorithm ready
- ✅ Can be used by #58.5 (Cache Lookup with Rebase)
- ✅ Comprehensive test coverage ensures correctness

---

## Performance Considerations

### Time Complexity

```
O(U + C)
where:
  U = number of user edits
  C = complexity of cached edit (usually 1)

Typical: O(5) = 5 user edits × 1 cached edit = ~1ms
Worst case: O(100) = 100 user edits × 1 cached edit = ~5ms
```

### Memory Usage

```
Temporary allocations: ~1KB per rebase attempt
- StringReplacement objects: 64 bytes each
- Offset tracking: 8 bytes per edit
- Console logging: 200 bytes

Total: Negligible
```

---

## Implementation Strategy

### Phase 1: Port Core Dependencies (Step 1)
1. Add `IEditData<T>` interface to stringEdit.ts
2. Add `AnnotatedStringReplacement<T>` class
3. Add `AnnotatedStringEdit<T>` class
4. Add `EditDataWithIndex` class

### Phase 2: Port Rebase Algorithm (Step 2)
1. Create editRebase.ts with:
   - `tryRebase()` main function
   - `_tryRebase()` internal implementation
   - `tryRebaseEdits()` core rebasing logic
   - `agreementIndexOf()` agreement matching
   - `checkEditConsistency()` validator
2. Create simple tracer wrapper (console.log based)
3. Skip diff computation initially (use simple approach)

### Phase 3: Testing (Step 3)
1. Create basic test suite
2. Test simple rebasing scenarios
3. Test conflict detection
4. Test agreement-based matching
5. Test edit window validation

### Phase 4: Add Diff Support (Optional Enhancement)
1. Port DefaultLinesDiffComputer if needed
2. Add `computeDiff()` function
3. Enable detailed edit tracking

---

## References

- **Copilot source**: `reference/vscode-copilot-chat/src/extension/inlineEdits/common/editRebase.ts`
- **Copilot stringEdit**: `reference/vscode-copilot-chat/src/util/vs/editor/common/core/edits/stringEdit.ts`
- **PRD**: `docs/prd-edit-rebasing-cache.md` (Core Algorithm section)
- **Operational Transform**: https://en.wikipedia.org/wiki/Operational_transformation
