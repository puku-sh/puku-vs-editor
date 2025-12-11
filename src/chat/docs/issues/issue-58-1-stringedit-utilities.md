# Issue #58.1: StringEdit Utilities

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Effort**: 2 hours
**Complexity**: 🟢 Easy
**Priority**: Foundation (blocks all other #58.x issues)

---

## Summary

Copy and adapt edit algebra utilities from GitHub Copilot reference code. These are the mathematical foundation for tracking and composing text edits, used by all subsequent rebasing work.

---

## Goals

1. ✅ Copy `StringEdit`, `StringReplacement`, `OffsetRange` classes from Copilot reference
2. ✅ Adapt to Puku's codebase (TypeScript style, imports)
3. ✅ Add comprehensive unit tests (10+ test cases)
4. ✅ No integration with cache yet - pure utilities only

---

## Background

When a user makes edits to a document, we need to:
- **Represent the edit** as data (`StringReplacement`)
- **Compose multiple edits** into a single edit history (`StringEdit.compose()`)
- **Apply edits** to strings to compute new document state

These utilities provide the mathematical foundation for edit rebasing.

---

## Technical Design

### Class 1: OffsetRange

Represents a character range `[start, endExclusive)` in a document.

```typescript
/**
 * Represents a character offset range in a string.
 * Example: "hello world"
 *          OffsetRange(0, 5) = "hello"
 *          OffsetRange(6, 11) = "world"
 */
export class OffsetRange {
    constructor(
        public readonly start: number,
        public readonly endExclusive: number
    ) {
        if (start < 0 || endExclusive < start) {
            throw new Error(`Invalid OffsetRange: [${start}, ${endExclusive})`);
        }
    }

    /**
     * Length of the range
     * Example: OffsetRange(10, 15).length === 5
     */
    get length(): number {
        return this.endExclusive - this.start;
    }

    /**
     * Check if range is empty (zero length)
     */
    get isEmpty(): boolean {
        return this.length === 0;
    }

    /**
     * Check if offset is within range
     * Example: OffsetRange(10, 20).contains(15) === true
     */
    contains(offset: number): boolean {
        return this.start <= offset && offset < this.endExclusive;
    }

    /**
     * Check if this range completely contains another range
     * Example:
     *   OffsetRange(10, 30).containsRange(OffsetRange(15, 20)) === true
     *   OffsetRange(10, 30).containsRange(OffsetRange(25, 35)) === false
     */
    containsRange(other: OffsetRange): boolean {
        return this.start <= other.start && other.endExclusive <= this.endExclusive;
    }

    /**
     * Check if ranges intersect or touch
     * Example:
     *   OffsetRange(10, 20).intersectsOrTouches(OffsetRange(15, 25)) === true
     *   OffsetRange(10, 20).intersectsOrTouches(OffsetRange(20, 30)) === true (touch)
     *   OffsetRange(10, 20).intersectsOrTouches(OffsetRange(25, 30)) === false
     */
    intersectsOrTouches(other: OffsetRange): boolean {
        return this.start <= other.endExclusive && other.start <= this.endExclusive;
    }

    /**
     * Shift range by offset
     * Example: OffsetRange(10, 20).delta(5) === OffsetRange(15, 25)
     */
    delta(offset: number): OffsetRange {
        return new OffsetRange(this.start + offset, this.endExclusive + offset);
    }

    /**
     * Check equality
     */
    equals(other: OffsetRange): boolean {
        return this.start === other.start && this.endExclusive === other.endExclusive;
    }

    /**
     * Factory: Create from start and end
     */
    static fromTo(start: number, end: number): OffsetRange {
        return new OffsetRange(start, end);
    }

    toString(): string {
        return `[${this.start}, ${this.endExclusive})`;
    }
}
```

### Class 2: StringReplacement

Represents a single text replacement operation.

```typescript
/**
 * Represents replacing text in a range with new text.
 * Example: Replace "world" with "everyone" in "hello world"
 *          StringReplacement(OffsetRange(6, 11), "everyone")
 *          Result: "hello everyone"
 */
export class StringReplacement {
    constructor(
        public readonly replaceRange: OffsetRange,
        public readonly newText: string
    ) {}

    /**
     * Check if replacement is a no-op (replaces with same text)
     */
    get isEmpty(): boolean {
        return this.replaceRange.isEmpty && this.newText.length === 0;
    }

    /**
     * Shift replacement position by offset
     * Example: StringReplacement(OffsetRange(10, 15), "foo").delta(5)
     *          → StringReplacement(OffsetRange(15, 20), "foo")
     */
    delta(offset: number): StringReplacement {
        return new StringReplacement(this.replaceRange.delta(offset), this.newText);
    }

    /**
     * Apply replacement to string
     */
    apply(text: string): string {
        const before = text.substring(0, this.replaceRange.start);
        const after = text.substring(this.replaceRange.endExclusive);
        return before + this.newText + after;
    }

    /**
     * Remove common prefix/suffix to minimize replacement range
     * Example:
     *   Input: Replace "hello world" with "hello everyone"
     *   Output: Replace "world" with "everyone" (removed common "hello ")
     */
    removeCommonSuffixAndPrefix(text: string): StringReplacement {
        const oldText = this.replaceRange.substring(text);
        let prefixLen = 0;
        let suffixLen = 0;

        // Find common prefix
        const minLen = Math.min(oldText.length, this.newText.length);
        while (prefixLen < minLen && oldText[prefixLen] === this.newText[prefixLen]) {
            prefixLen++;
        }

        // Find common suffix
        while (
            suffixLen < minLen - prefixLen &&
            oldText[oldText.length - 1 - suffixLen] === this.newText[this.newText.length - 1 - suffixLen]
        ) {
            suffixLen++;
        }

        // Return optimized replacement
        return new StringReplacement(
            new OffsetRange(
                this.replaceRange.start + prefixLen,
                this.replaceRange.endExclusive - suffixLen
            ),
            this.newText.substring(prefixLen, this.newText.length - suffixLen)
        );
    }

    /**
     * Check equality
     */
    equals(other: StringReplacement): boolean {
        return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText;
    }

    /**
     * Factory: Create replacement
     */
    static replace(range: OffsetRange, newText: string): StringReplacement {
        return new StringReplacement(range, newText);
    }

    toString(): string {
        return `Replace ${this.replaceRange} with "${this.newText}"`;
    }
}

// Extension: Add substring method to OffsetRange
declare module './stringEdit' {
    interface OffsetRange {
        substring(text: string): string;
    }
}

OffsetRange.prototype.substring = function(text: string): string {
    return text.substring(this.start, this.endExclusive);
};
```

### Class 3: StringEdit

Represents a composition of multiple text replacements.

```typescript
/**
 * Represents a sequence of non-overlapping text replacements.
 * Replacements are stored in order by offset.
 *
 * Example:
 *   Edit 1: Replace [5, 10) with "foo"
 *   Edit 2: Replace [20, 25) with "bar"
 *   StringEdit([edit1, edit2])
 */
export class StringEdit {
    constructor(public readonly replacements: readonly StringReplacement[]) {
        // Validate non-overlapping and sorted
        for (let i = 1; i < replacements.length; i++) {
            const prev = replacements[i - 1];
            const curr = replacements[i];
            if (prev.replaceRange.endExclusive > curr.replaceRange.start) {
                throw new Error('StringEdit replacements must be non-overlapping and sorted');
            }
        }
    }

    /**
     * Check if edit is empty (no replacements)
     */
    get isEmpty(): boolean {
        return this.replacements.length === 0 || this.replacements.every(r => r.isEmpty);
    }

    /**
     * Apply all replacements to a string
     *
     * Example:
     *   text = "hello world"
     *   edit = StringEdit([
     *     Replace(OffsetRange(0, 5), "goodbye"),
     *     Replace(OffsetRange(6, 11), "everyone")
     *   ])
     *   edit.apply(text) === "goodbye everyone"
     */
    apply(text: string): string {
        let result = '';
        let lastEnd = 0;

        for (const replacement of this.replacements) {
            // Copy unchanged text before this replacement
            result += text.substring(lastEnd, replacement.replaceRange.start);
            // Add replacement text
            result += replacement.newText;
            lastEnd = replacement.replaceRange.endExclusive;
        }

        // Copy remaining unchanged text
        result += text.substring(lastEnd);
        return result;
    }

    /**
     * Compose this edit with another edit applied after it.
     * Returns a new StringEdit representing both edits.
     *
     * Example:
     *   text = "hello world"
     *   edit1 = Replace(OffsetRange(6, 11), "everyone")
     *     → "hello everyone"
     *   edit2 = Replace(OffsetRange(0, 5), "goodbye")
     *     → "goodbye everyone"
     *
     *   composed = edit1.compose(edit2)
     *   composed.apply("hello world") === "goodbye everyone"
     */
    compose(other: StringEdit): StringEdit {
        if (this.isEmpty) {
            return other;
        }
        if (other.isEmpty) {
            return this;
        }

        // This is a complex algorithm that merges two edit sequences
        // See Copilot's implementation for full details
        // For now, we can use a simpler approach: apply first, then compute diff

        // TODO: Implement efficient composition
        // For Phase 1, we can use a simple approach:
        const intermediate = this.apply(''); // Apply to empty string to get structure
        const result = other.apply(intermediate);

        // This is a placeholder - real implementation needs proper offset tracking
        return new StringEdit([...this.replacements, ...other.replacements]);
    }

    /**
     * Remove common prefix/suffix to optimize
     */
    removeCommonSuffixAndPrefix(text: string): StringEdit {
        if (this.isEmpty) {
            return this;
        }

        const optimized = this.replacements.map(r => r.removeCommonSuffixAndPrefix(text));
        return new StringEdit(optimized.filter(r => !r.isEmpty));
    }

    /**
     * Factory: Create edit from single replacement
     */
    static single(replacement: StringReplacement): StringEdit {
        return new StringEdit([replacement]);
    }

    /**
     * Factory: Create empty edit
     */
    static empty(): StringEdit {
        return new StringEdit([]);
    }

    /**
     * Factory: Create edit from multiple replacements
     */
    static create(replacements: StringReplacement[]): StringEdit {
        return new StringEdit(replacements);
    }

    toString(): string {
        return `StringEdit(${this.replacements.length} replacements)`;
    }
}
```

---

## Implementation Steps

### Step 1: Create file structure (10 min)

```bash
mkdir -p src/chat/src/extension/pukuai/common
mkdir -p src/chat/src/extension/pukuai/test

touch src/chat/src/extension/pukuai/common/stringEdit.ts
touch src/chat/src/extension/pukuai/test/stringEdit.spec.ts
```

### Step 2: Copy reference code (30 min)

Copy from:
- `src/vscode/reference/vscode-copilot-chat/src/util/vs/editor/common/core/edits/stringEdit.ts`

Adapt:
- Remove VS Code-specific imports
- Simplify to core functionality
- Add JSDoc comments
- Fix TypeScript strict mode errors

### Step 3: Write unit tests (60 min)

See test cases below.

### Step 4: Verify and document (20 min)

- Run tests: `npm test -- stringEdit.spec.ts`
- Update CLAUDE.md with utilities location
- Add to exports: `src/chat/src/extension/pukuai/common/index.ts`

---

## Test Cases

### Test Suite 1: OffsetRange

```typescript
import * as assert from 'assert';
import { OffsetRange } from '../common/stringEdit';

suite('OffsetRange', () => {
    test('should create valid range', () => {
        const range = new OffsetRange(10, 20);
        assert.strictEqual(range.start, 10);
        assert.strictEqual(range.endExclusive, 20);
        assert.strictEqual(range.length, 10);
    });

    test('should throw on invalid range', () => {
        assert.throws(() => new OffsetRange(-1, 10)); // Negative start
        assert.throws(() => new OffsetRange(20, 10)); // End before start
    });

    test('should check contains', () => {
        const range = new OffsetRange(10, 20);
        assert.strictEqual(range.contains(15), true);
        assert.strictEqual(range.contains(10), true);  // Start inclusive
        assert.strictEqual(range.contains(20), false); // End exclusive
        assert.strictEqual(range.contains(5), false);
    });

    test('should check containsRange', () => {
        const outer = new OffsetRange(10, 30);
        const inner = new OffsetRange(15, 20);
        const overlapping = new OffsetRange(25, 35);

        assert.strictEqual(outer.containsRange(inner), true);
        assert.strictEqual(outer.containsRange(overlapping), false);
        assert.strictEqual(outer.containsRange(outer), true); // Self-contained
    });

    test('should check intersectsOrTouches', () => {
        const range1 = new OffsetRange(10, 20);
        const range2 = new OffsetRange(15, 25); // Overlaps
        const range3 = new OffsetRange(20, 30); // Touches
        const range4 = new OffsetRange(25, 30); // Separate

        assert.strictEqual(range1.intersectsOrTouches(range2), true);
        assert.strictEqual(range1.intersectsOrTouches(range3), true);
        assert.strictEqual(range1.intersectsOrTouches(range4), false);
    });

    test('should delta (shift) range', () => {
        const range = new OffsetRange(10, 20);
        const shifted = range.delta(5);

        assert.strictEqual(shifted.start, 15);
        assert.strictEqual(shifted.endExclusive, 25);
        assert.strictEqual(shifted.length, 10); // Length unchanged
    });

    test('should check equality', () => {
        const range1 = new OffsetRange(10, 20);
        const range2 = new OffsetRange(10, 20);
        const range3 = new OffsetRange(10, 21);

        assert.strictEqual(range1.equals(range2), true);
        assert.strictEqual(range1.equals(range3), false);
    });

    test('should substring text', () => {
        const text = 'hello world';
        const range = new OffsetRange(0, 5);

        assert.strictEqual(range.substring(text), 'hello');
    });
});
```

### Test Suite 2: StringReplacement

```typescript
suite('StringReplacement', () => {
    test('should create replacement', () => {
        const replacement = new StringReplacement(
            new OffsetRange(6, 11),
            'everyone'
        );

        assert.strictEqual(replacement.replaceRange.start, 6);
        assert.strictEqual(replacement.newText, 'everyone');
    });

    test('should apply replacement', () => {
        const text = 'hello world';
        const replacement = new StringReplacement(
            new OffsetRange(6, 11),
            'everyone'
        );

        const result = replacement.apply(text);
        assert.strictEqual(result, 'hello everyone');
    });

    test('should delta (shift) replacement', () => {
        const replacement = new StringReplacement(
            new OffsetRange(10, 15),
            'foo'
        );
        const shifted = replacement.delta(5);

        assert.strictEqual(shifted.replaceRange.start, 15);
        assert.strictEqual(shifted.replaceRange.endExclusive, 20);
        assert.strictEqual(shifted.newText, 'foo');
    });

    test('should remove common prefix', () => {
        const text = 'hello world';
        // Replace "hello world" with "hello everyone"
        const replacement = new StringReplacement(
            new OffsetRange(0, 11),
            'hello everyone'
        );

        const optimized = replacement.removeCommonSuffixAndPrefix(text);

        // Should optimize to: Replace "world" with "everyone"
        assert.strictEqual(optimized.replaceRange.start, 6);
        assert.strictEqual(optimized.replaceRange.endExclusive, 11);
        assert.strictEqual(optimized.newText, 'everyone');
    });

    test('should remove common suffix', () => {
        const text = 'hello world';
        // Replace "hello world" with "goodbye world"
        const replacement = new StringReplacement(
            new OffsetRange(0, 11),
            'goodbye world'
        );

        const optimized = replacement.removeCommonSuffixAndPrefix(text);

        // Should optimize to: Replace "hello" with "goodbye"
        assert.strictEqual(optimized.replaceRange.start, 0);
        assert.strictEqual(optimized.replaceRange.endExclusive, 5);
        assert.strictEqual(optimized.newText, 'goodbye');
    });

    test('should check isEmpty', () => {
        const empty = new StringReplacement(new OffsetRange(10, 10), '');
        const notEmpty = new StringReplacement(new OffsetRange(10, 15), 'foo');

        assert.strictEqual(empty.isEmpty, true);
        assert.strictEqual(notEmpty.isEmpty, false);
    });
});
```

### Test Suite 3: StringEdit

```typescript
suite('StringEdit', () => {
    test('should create empty edit', () => {
        const edit = StringEdit.empty();
        assert.strictEqual(edit.isEmpty, true);
        assert.strictEqual(edit.replacements.length, 0);
    });

    test('should create single replacement edit', () => {
        const replacement = new StringReplacement(
            new OffsetRange(6, 11),
            'everyone'
        );
        const edit = StringEdit.single(replacement);

        assert.strictEqual(edit.replacements.length, 1);
        assert.strictEqual(edit.replacements[0], replacement);
    });

    test('should apply single edit', () => {
        const text = 'hello world';
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 11), 'everyone')
        );

        const result = edit.apply(text);
        assert.strictEqual(result, 'hello everyone');
    });

    test('should apply multiple edits', () => {
        const text = 'hello world';
        const edit = new StringEdit([
            new StringReplacement(new OffsetRange(0, 5), 'goodbye'),
            new StringReplacement(new OffsetRange(6, 11), 'everyone')
        ]);

        const result = edit.apply(text);
        assert.strictEqual(result, 'goodbye everyone');
    });

    test('should throw on overlapping replacements', () => {
        assert.throws(() => {
            new StringEdit([
                new StringReplacement(new OffsetRange(5, 15), 'foo'),
                new StringReplacement(new OffsetRange(10, 20), 'bar') // Overlaps!
            ]);
        });
    });

    test('should compose edits (simple case)', () => {
        const text = 'hello world';

        // Edit 1: Replace "world" with "everyone"
        const edit1 = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 11), 'everyone')
        );

        // Edit 2: Replace "hello" with "goodbye" in the result
        const edit2 = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 5), 'goodbye')
        );

        const composed = edit1.compose(edit2);
        const result = composed.apply(text);

        assert.strictEqual(result, 'goodbye everyone');
    });

    test('should handle insertions', () => {
        const text = 'hello world';
        // Insert " beautiful" before "world"
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 6), 'beautiful ')
        );

        const result = edit.apply(text);
        assert.strictEqual(result, 'hello beautiful world');
    });

    test('should handle deletions', () => {
        const text = 'hello beautiful world';
        // Delete "beautiful "
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 16), '')
        );

        const result = edit.apply(text);
        assert.strictEqual(result, 'hello world');
    });
});
```

---

## Example Usage

### Example 1: Simple Replacement

```typescript
const text = 'hello world';
const replacement = new StringReplacement(
    new OffsetRange(6, 11),  // "world"
    'everyone'
);

const result = replacement.apply(text);
console.log(result); // "hello everyone"
```

### Example 2: Multiple Edits

```typescript
const text = 'function test() {}';

const edit = new StringEdit([
    // Replace "test" with "calculate"
    new StringReplacement(new OffsetRange(9, 13), 'calculate'),
    // Add parameter "x"
    new StringReplacement(new OffsetRange(14, 14), 'x')
]);

const result = edit.apply(text);
console.log(result); // "function calculate(x) {}"
```

### Example 3: Composing Edits

```typescript
const original = 'const x = 1;';

// User types at position 10
const edit1 = StringEdit.single(
    new StringReplacement(new OffsetRange(10, 10), '0')
);
// Result: "const x = 10;"

// User adds semicolon at end
const edit2 = StringEdit.single(
    new StringReplacement(new OffsetRange(13, 13), ';')
);
// Result: "const x = 10;;"

// Compose: Represents both edits
const composed = edit1.compose(edit2);
const final = composed.apply(original);
console.log(final); // "const x = 10;;"
```

---

## Success Criteria

- ✅ All classes implemented with TypeScript strict mode
- ✅ All 10+ test cases pass
- ✅ Code coverage >90%
- ✅ JSDoc comments on all public methods
- ✅ No dependencies on VS Code APIs (pure utilities)
- ✅ Exported from `common/index.ts`

---

## Files to Create

```
src/chat/src/extension/pukuai/
├── common/
│   ├── stringEdit.ts              (NEW - 300 lines)
│   └── index.ts                   (MODIFIED - add exports)
└── test/
    └── stringEdit.spec.ts         (NEW - 200 lines)
```

---

## Dependencies

- **None** - Pure TypeScript utilities
- No VS Code API dependencies
- No other Puku modules required

---

## Next Steps

After #58.1 is complete:
- ✅ Foundation ready for #58.2 (Document Edit Tracking)
- ✅ `StringEdit` class can be used to represent document changes
- ✅ `OffsetRange` can track edit windows

---

## References

- **Copilot source**: `src/vscode/reference/vscode-copilot-chat/src/util/vs/editor/common/core/edits/stringEdit.ts`
- **Operational Transform theory**: https://en.wikipedia.org/wiki/Operational_transformation
- **PRD**: `src/chat/docs/prd-edit-rebasing-cache.md` (Appendix A)
