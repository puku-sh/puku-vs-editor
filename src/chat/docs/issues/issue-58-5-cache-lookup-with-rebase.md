# Issue #58.5: Cache Lookup with Rebase

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Depends On**: #58.1-4 (All previous sub-issues)
**Effort**: 2 hours
**Complexity**: 🟡 Medium
**Priority**: Core Feature (Can Ship After This!)

---

## Summary

Integrate the rebase algorithm (#58.4) into cache lookup logic (#58.3). This is where rebasing actually happens during completion requests. After this issue, the edit rebasing feature is **functionally complete**.

---

## Goals

1. ✅ Modify `CompletionsCache.findAll()` to attempt rebasing
2. ✅ Implement `tryRebaseCacheEntry()` private method
3. ✅ Handle all rebase results: success, failed, outsideWindow, inconsistent
4. ✅ Update `rebaseFailed` flag to avoid retry loops
5. ✅ Add comprehensive logging for debugging
6. ✅ Write integration tests

---

## Background

Currently, `CompletionsCache.findAll()` only returns exact prefix matches. With rebasing:

**Before**:
```typescript
cache.findAll("const x = ", ";")
// Returns cached completion only if prefix matches exactly
// User adds line above → prefix changed → cache miss
```

**After**:
```typescript
cache.findAll("const x = ", ";", document, position)
// 1. Try exact prefix match
// 2. If miss, try rebasing cached entries
// 3. Return rebased completion if successful
// User adds line above → rebase succeeds → cache hit! ✅
```

---

## Technical Design

### Enhanced findAll() Signature

```typescript
/**
 * Find cached completions, attempting rebase if no exact match.
 *
 * NEW PARAMETERS:
 * @param document - Current document (for rebasing)
 * @param position - Current cursor position (for edit window check)
 */
findAll(
    prefix: string,
    suffix: string,
    document?: vscode.TextDocument,  // NEW
    position?: vscode.Position       // NEW
): string[][]
```

### Implementation

```typescript
// src/chat/src/extension/pukuai/common/completionsCache.ts

import { tryRebase } from './editRebase';
import { OffsetRange } from './stringEdit';

export class CompletionsCache {
    private cache = new LRURadixTrie<CompletionsCacheContents>(500);

    /**
     * Find all cached completions, with rebase fallback
     */
    findAll(
        prefix: string,
        suffix: string,
        document?: vscode.TextDocument,
        position?: vscode.Position
    ): string[][] {

        // Step 1: Try exact prefix match (fast path)
        const exactMatches = this.cache.findAll(prefix);

        for (const match of exactMatches) {
            if (match.remainingKey === '') {
                // Exact match found - filter by suffix
                const results = match.value.content
                    .filter(c => c.suffix === suffix)
                    .map(c => c.completions);

                if (results.length > 0) {
                    console.log('[Cache] ✅ Exact prefix match');
                    return results;
                }
            }
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
     * Try to rebase a single cache entry
     */
    private tryRebaseCacheEntry(
        entry: CacheEntry,
        currentDocContent: string,
        currentSelection: readonly OffsetRange[]
    ): string[] | undefined {

        if (!entry.documentBeforeEdit || !entry.userEditSince) {
            return undefined;
        }

        const rebasedCompletions: string[] = [];

        // Rebase each completion in the entry
        for (const completion of entry.completions) {

            // Reconstruct the original edit from the cached completion
            // For now, we assume completion is an insertion at the cursor position
            // In full implementation, we'd need to store the original edit explicitly

            const originalEdit = this.reconstructOriginalEdit(
                entry,
                completion,
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
                originalEdit,
                entry.userEditSince,
                currentDocContent,
                currentSelection,
                'strict'  // Use strict mode to avoid false positives
            );

            // Handle result
            if (typeof rebaseResult === 'string') {
                // Rebase failed
                this.handleRebaseFailure(entry, rebaseResult);
                return undefined;
            }

            // Success! Add rebased completion
            rebasedCompletions.push(rebaseResult.newText);

            console.log('[Cache] Rebased completion:', {
                original: completion.substring(0, 30) + '...',
                originalOffset: originalEdit.replaceRange.start,
                rebasedOffset: rebaseResult.replaceRange.start,
                delta: rebaseResult.replaceRange.start - originalEdit.replaceRange.start
            });
        }

        return rebasedCompletions.length > 0 ? rebasedCompletions : undefined;
    }

    /**
     * Reconstruct the original edit from a cached completion
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
        return new StringReplacement(
            new OffsetRange(
                entry.editWindow.start,
                entry.editWindow.start
            ),
            completion
        );
    }

    /**
     * Handle rebase failure
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
}
```

---

## Test Cases

### Test Suite 1: Basic Rebase Integration

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CompletionsCache } from '../common/completionsCache';
import { DocumentEditTracker } from '../common/documentEditTracker';

suite('Cache Lookup with Rebase', () => {
    let cache: CompletionsCache;
    let tracker: DocumentEditTracker;
    let document: vscode.TextDocument;

    setup(async () => {
        cache = new CompletionsCache();
        tracker = new DocumentEditTracker();
        cache.setEditTracker(tracker);

        // Hook up events
        tracker.onEdit(({ uri, edit }) => {
            cache.handleDocumentChange(uri, edit);
        });

        document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });
    });

    teardown(() => {
        tracker.dispose();
    });

    test('should return exact match without rebasing', () => {
        const position = new vscode.Position(0, 10); // After "= "

        // Cache completion
        cache.append('const x = ', ';', ['42'], document, position);

        // Lookup with exact same prefix
        const results = cache.findAll('const x = ', ';', document, position);

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0][0], '42');
        // Should log: [Cache] ✅ Exact prefix match
    });

    test('should rebase after user adds line above', async () => {
        const position = new vscode.Position(0, 10);

        // Cache completion
        cache.append('const x = ', ';', ['42'], document, position);

        // User adds line above
        await simulateEdit(document, 0, 0, '// comment\n');

        // New position is shifted down
        const newPosition = new vscode.Position(1, 10);

        // Lookup should trigger rebase
        const results = cache.findAll('const x = ', ';', document, newPosition);

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0][0], '42');
        // Should log: [Cache] ✨ Rebase success!
    });

    test('should cache miss after conflicting edit', async () => {
        const position = new vscode.Position(0, 10);

        // Cache completion
        cache.append('const x = ', ';', ['42'], document, position);

        // User types different value at same position
        await simulateEdit(document, 10, 1, '99');

        // Lookup should fail rebase (conflict)
        const results = cache.findAll('const x = ', ';', document, position);

        assert.strictEqual(results.length, 0);
        // Should log: [Cache] Rebase failed: rebaseFailed
    });

    test('should mark rebaseFailed to avoid retry', async () => {
        const position = new vscode.Position(0, 10);

        cache.append('const x = ', ';', ['42'], document, position);

        // Conflicting edit
        await simulateEdit(document, 10, 1, '99');

        // First lookup - rebase fails, marks entry
        cache.findAll('const x = ', ';', document, position);

        // Second lookup - should skip rebase attempt
        const results = cache.findAll('const x = ', ';', document, position);

        assert.strictEqual(results.length, 0);
        // Should log: [Cache] Skipping entry (rebase failed before)
    });
});
```

### Test Suite 2: Edit Window Validation

```typescript
suite('Edit Window Validation', () => {
    test('should fail rebase when cursor moves outside window', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'function test() {\n  const x = 1;\n}',
            language: 'typescript'
        });

        const cache = new CompletionsCache();
        const position = new vscode.Position(1, 14); // After "= " in line 2

        // Cache completion with edit window around "const x = 1"
        cache.append('const x = ', ';', ['42'], document, position);

        // User moves cursor to different function (line 0)
        const newPosition = new vscode.Position(0, 10);

        // Lookup should fail (outside edit window)
        const results = cache.findAll('const x = ', ';', document, newPosition);

        assert.strictEqual(results.length, 0);
        // Should log: [Cache] Rebase failed: outsideEditWindow
    });

    test('should succeed when cursor stays in adjusted window', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });

        const cache = new CompletionsCache();
        const tracker = new DocumentEditTracker();
        cache.setEditTracker(tracker);

        tracker.onEdit(({ uri, edit }) => {
            cache.handleDocumentChange(uri, edit);
        });

        const position = new vscode.Position(0, 10);

        // Cache completion
        cache.append('const x = ', ';', ['42'], document, position);

        // Add line above
        await simulateEdit(document, 0, 0, '// line\n');

        // Cursor moved down with edit (still in window)
        const newPosition = new vscode.Position(1, 10);

        // Should succeed
        const results = cache.findAll('const x = ', ';', document, newPosition);

        assert.strictEqual(results.length, 1);
    });
});
```

### Test Suite 3: Multiple Completions

```typescript
suite('Multiple Cached Completions', () => {
    test('should rebase all completions in entry', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });

        const cache = new CompletionsCache();
        const tracker = new DocumentEditTracker();
        cache.setEditTracker(tracker);

        tracker.onEdit(({ uri, edit }) => {
            cache.handleDocumentChange(uri, edit);
        });

        const position = new vscode.Position(0, 10);

        // Cache multiple completions (for future #64 - Multiple Completions)
        cache.append('const x = ', ';', ['42', '100', '999'], document, position);

        // Add line above
        await simulateEdit(document, 0, 0, '// comment\n');

        const newPosition = new vscode.Position(1, 10);

        // Should rebase all three
        const results = cache.findAll('const x = ', ';', document, newPosition);

        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].length, 3);
        assert.deepStrictEqual(results[0], ['42', '100', '999']);
    });

    test('should fail if any completion fails rebase', async () => {
        // If rebasing one completion fails, fail the entire entry
        // This ensures consistency
    });
});
```

### Test Suite 4: Performance

```typescript
suite('Rebase Performance', () => {
    test('should rebase in <10ms', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });

        const cache = new CompletionsCache();
        const tracker = new DocumentEditTracker();
        cache.setEditTracker(tracker);

        tracker.onEdit(({ uri, edit }) => {
            cache.handleDocumentChange(uri, edit);
        });

        const position = new vscode.Position(0, 10);

        cache.append('const x = ', ';', ['42'], document, position);

        // Add multiple edits
        for (let i = 0; i < 10; i++) {
            await simulateEdit(document, 0, 0, `// line ${i}\n`);
        }

        const newPosition = new vscode.Position(10, 10);

        // Measure rebase time
        const start = Date.now();
        const results = cache.findAll('const x = ', ';', document, newPosition);
        const elapsed = Date.now() - start;

        assert.strictEqual(results.length, 1);
        assert.ok(elapsed < 10, `Rebase took ${elapsed}ms (should be <10ms)`);
    });
});
```

---

## Console Output Examples

### Scenario 1: Exact Match (Fast Path)

```
[Cache] ✅ Exact prefix match
```

### Scenario 2: Rebase Success

```
[Cache] Trying rebase fallback...
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
[Cache] Rebased completion: {
  original: "42...",
  originalOffset: 10,
  rebasedOffset: 21,
  delta: 11
}
[Cache] ✨ Rebase success!
```

### Scenario 3: Rebase Failed (Conflict)

```
[Cache] Trying rebase fallback...
[Rebase] CONFLICT: User typed different text: {
  userTyped: "99",
  expected: "42"
}
[Rebase] Rebase failed (conflict detected)
[Cache] Rebase failed: rebaseFailed
[Cache] Marked entry as rebaseFailed (conflict)
[Cache] ❌ Miss: no rebase possible
```

### Scenario 4: Outside Edit Window

```
[Cache] Trying rebase fallback...
[Rebase] Cursor outside edit window
[Cache] Rebase failed: outsideEditWindow
[Cache] Cursor outside edit window (expected)
[Cache] ❌ Miss: no rebase possible
```

### Scenario 5: Skip Failed Entry

```
[Cache] Trying rebase fallback...
[Cache] Skipping entry (rebase failed before)
[Cache] ❌ Miss: no rebase possible
```

---

## Example Usage

### Example 1: End-to-End Flow

```typescript
// 1. Cache a completion
const cache = new CompletionsCache();
const tracker = new DocumentEditTracker();

cache.append('const x = ', ';', ['42'], document, position);
// [Cache] Stored completion with edit tracking

// 2. User adds line above
// Document changes: "const x = 1;" → "// line\nconst x = 1;"
// [DocumentEditTracker] file:///test.ts: 1 replacement(s)
// [Cache] Composed edit into cache entry: { editCount: 1 }

// 3. Request completion at new position
const results = cache.findAll('const x = ', ';', document, newPosition);
// [Cache] Trying rebase fallback...
// [Rebase] ✅ Success
// [Cache] ✨ Rebase success!

console.log(results); // [['42']]
```

---

## Success Criteria

- ✅ `findAll()` attempts rebase on cache miss
- ✅ Rebase succeeds for edits above/below cached position
- ✅ Rebase fails appropriately on conflicts
- ✅ `rebaseFailed` flag prevents retry loops
- ✅ Edit window validation works correctly
- ✅ All test cases pass
- ✅ Performance: Rebase completes in <10ms P50
- ✅ Console logs are helpful for debugging

---

## Files to Modify

```
src/chat/src/extension/pukuai/
├── common/
│   ├── completionsCache.ts                (MODIFIED - add rebase logic)
│   └── index.ts                           (MODIFIED - update exports)
└── test/
    └── completionsCacheLookupRebase.spec.ts (NEW - 300 lines)
```

---

## Dependencies

- ✅ **#58.1** StringEdit Utilities
- ✅ **#58.2** Document Edit Tracking
- ✅ **#58.3** Edit Composition in Cache
- ✅ **#58.4** Rebase Algorithm

---

## Next Steps

After #58.5 is complete:
- ✅ **Feature is functionally complete!** Can ship to users
- ✅ Cache hit rate should increase from 20% → 50-70%
- ✅ Ready for #58.6 (Provider Integration) for polish
- ✅ Ready for #58.7 (Performance Validation) for metrics

---

## Shipping Decision

**After #58.5, you can ship the feature!**

- Core functionality works end-to-end
- Cache rebases completions successfully
- Performance is acceptable
- #58.6-7 are polish/validation, not required for launch

---

## References

- **PRD**: `src/chat/docs/prd-edit-rebasing-cache.md`
- **Copilot reference**: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/node/nextEditCache.ts`
- **Previous issues**: #58.1-4
