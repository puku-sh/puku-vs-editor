# Issue #58.3: Edit Composition in Cache

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Depends On**: #58.1 (StringEdit), #58.2 (Document Edit Tracking)
**Effort**: 2 hours
**Complexity**: 🟡 Medium
**Priority**: Core Integration

---

## Summary

Enhance the cache to store edit history and compose user edits into cache entries. This connects the document edit tracker (#58.2) with the cache, preparing for rebase logic (#58.5).

---

## Goals

1. ✅ Add edit tracking fields to `CompletionsCacheContents`
2. ✅ Modify `CompletionsCache.append()` to store document snapshot
3. ✅ Hook up `DocumentEditTracker` to compose edits into cache entries
4. ✅ Compute edit windows for cached completions
5. ✅ No rebase logic yet (that's #58.5)

---

## Background

Currently, `CompletionsCache` stores only:
- `suffix`: The text after cursor
- `completions`: Array of completion strings

We need to add:
- **Document snapshot** when completion was cached
- **Edit history** since cache time
- **Edit window** (valid region for this completion)

This allows us to later check: "Has the user edited above/below this completion?"

---

## Technical Design

### Enhanced Cache Structure

```typescript
interface CompletionsCacheContents {
    content: {
        suffix: string;
        completions: string[];

        // NEW: Edit tracking fields
        documentBeforeEdit?: string;      // Full document when cached
        userEditSince?: StringEdit;       // All edits since cache time
        editWindow?: OffsetRange;         // Valid region [prefixStart, suffixEnd)
        rebaseFailed?: boolean;           // Rebase attempted but failed
        cacheTime?: number;               // Timestamp when cached
    }[];
}
```

### Field Descriptions

#### `documentBeforeEdit`
The complete document text when this completion was cached.

**Purpose**: Rebase algorithm needs to know the original state to compute adjustments.

**Storage**: For efficiency, we could store just the edit window region instead of full document, but for simplicity we store the full text initially.

```typescript
documentBeforeEdit: document.getText()
```

#### `userEditSince`
Composed `StringEdit` representing all user edits since cache time.

**Purpose**: Track how document has changed since caching.

**Example**:
```typescript
// Initially empty
userEditSince: StringEdit.empty()

// After user adds line above
userEditSince: StringEdit.single(
    new StringReplacement(OffsetRange(0, 0), "// New line\n")
)

// After user deletes text
userEditSince = userEditSince.compose(StringEdit.single(
    new StringReplacement(OffsetRange(50, 60), "")
))
```

#### `editWindow`
The region where this completion is valid.

**Purpose**: If cursor moves outside this region, completion is no longer relevant.

**Computation**:
```typescript
const prefixStart = document.offsetAt(position) - prefix.length;
const suffixEnd = document.offsetAt(position) + suffix.length;
editWindow: new OffsetRange(prefixStart, suffixEnd)
```

**Example**:
```typescript
// Document: "const x = 1;"
// Position: after "= " (offset 10)
// Prefix: "const x = "
// Suffix: ";"
// Completion: "42"

editWindow: OffsetRange(0, 12)  // From start of "const" to after ";"
```

#### `rebaseFailed`
Boolean flag indicating if rebase was attempted and failed.

**Purpose**: Avoid re-attempting rebase on every lookup.

**Reset**: When new user edits arrive (document may have changed enough to make rebase possible).

---

## Implementation

### Step 1: Update Cache Data Structure

```typescript
// src/chat/src/extension/pukuai/common/completionsCache.ts

import { StringEdit, OffsetRange } from './stringEdit';
import { LRURadixTrie } from './radixTrie';
import * as vscode from 'vscode';

interface CacheEntry {
    suffix: string;
    completions: string[];

    // NEW: Edit tracking
    documentBeforeEdit?: string;
    userEditSince?: StringEdit;
    editWindow?: OffsetRange;
    rebaseFailed?: boolean;
    cacheTime?: number;
}

interface CompletionsCacheContents {
    content: CacheEntry[];
}

export class CompletionsCache {
    private cache = new LRURadixTrie<CompletionsCacheContents>(500);

    // NEW: Reference to edit tracker
    private editTracker?: DocumentEditTracker;

    /**
     * Set the edit tracker (called during initialization)
     */
    public setEditTracker(tracker: DocumentEditTracker): void {
        this.editTracker = tracker;
    }

    // ... existing methods ...
}
```

### Step 2: Modify append() to Store Snapshot

```typescript
/**
 * Add cached completions with edit tracking
 *
 * NEW PARAMETERS:
 * @param document - VS Code document (for snapshot)
 * @param position - Cursor position (for edit window)
 */
public append(
    prefix: string,
    suffix: string,
    completions: string[],
    document?: vscode.TextDocument,  // NEW
    position?: vscode.Position       // NEW
): void {
    const existing = this.cache.findAll(prefix);

    // Create cache entry with edit tracking
    const entry: CacheEntry = {
        suffix,
        completions,
        documentBeforeEdit: document?.getText(),
        userEditSince: StringEdit.empty(),
        editWindow: this.computeEditWindow(prefix, suffix, document, position),
        rebaseFailed: false,
        cacheTime: Date.now()
    };

    // Append to an existing array if there is an exact match
    if (existing.length > 0 && existing[0].remainingKey === '') {
        const content = existing[0].value.content;
        this.cache.set(prefix, { content: [...content, entry] });
    } else {
        // Otherwise, add a new value
        this.cache.set(prefix, { content: [entry] });
    }

    console.log(`[Cache] Stored completion with edit tracking:`, {
        prefix: prefix.substring(0, 30) + '...',
        editWindow: entry.editWindow?.toString(),
        documentLength: entry.documentBeforeEdit?.length
    });
}

/**
 * Compute the edit window for a completion
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
```

### Step 3: Hook Up Edit Composition

```typescript
/**
 * Handle document change - compose edits into cache entries
 * Called by DocumentEditTracker when document changes
 */
public handleDocumentChange(uri: string, edit: StringEdit): void {
    // Iterate through all cache entries
    // (In practice, we'd index by URI for efficiency)

    for (const [key, value] of this.cache.entries()) {
        for (const entry of value.content) {
            // Skip entries without edit tracking
            if (!entry.userEditSince || !entry.documentBeforeEdit) {
                continue;
            }

            // TODO: Check if this entry is for the document that changed
            // For now, we compose all entries (optimization later)

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
```

### Step 4: Integrate with DocumentEditTracker

```typescript
// src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts

import { DocumentEditTracker } from '../common/documentEditTracker';
import { CompletionsCache } from '../common/completionsCache';

export class PukuInlineCompletionProvider {
    private cache = new CompletionsCache();
    private editTracker = new DocumentEditTracker();

    constructor() {
        // Connect tracker to cache
        this.cache.setEditTracker(this.editTracker);

        // Subscribe to edit events
        this.editTracker.onEdit((uri, edit) => {
            this.cache.handleDocumentChange(uri, edit);
        });

        console.log('[PukuInlineCompletionProvider] Edit tracking enabled');
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | undefined> {

        // ... get prefix, suffix ...

        // Try cache (no rebase yet, that's #58.5)
        const cached = this.cache.findAll(prefix, suffix);

        if (cached.length > 0) {
            console.log('[Provider] Cache hit (no rebase yet)');
            return {
                items: cached[0].map(text => ({
                    insertText: text,
                    range: new vscode.Range(position, position)
                })),
                enableForwardStability: true
            };
        }

        // Cache miss, fetch from API
        const result = await this.fetchCompletion(...);

        // Store with edit tracking (NEW: pass document + position)
        if (result) {
            this.cache.append(
                prefix,
                suffix,
                [result.text],
                document,  // NEW
                position   // NEW
            );
        }

        return result;
    }
}
```

### Step 5: Add onEdit Event to DocumentEditTracker

```typescript
// src/chat/src/extension/pukuai/common/documentEditTracker.ts

export class DocumentEditTracker implements vscode.Disposable {
    private readonly _documentEdits = new Map<string, DocumentEditHistory>();
    private readonly _disposables: vscode.Disposable[] = [];

    // NEW: Event emitter for edit notifications
    private readonly _onEditEmitter = new vscode.EventEmitter<{ uri: string; edit: StringEdit }>();
    public readonly onEdit = this._onEditEmitter.event;

    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        const uri = event.document.uri.toString();

        // ... existing logic ...

        // Convert to StringEdit
        const edit = this.extractStringEdit(event.document, event.contentChanges);

        // Add to history
        history.addEdit(edit);

        // NEW: Emit event for subscribers
        this._onEditEmitter.fire({ uri, edit });

        console.log(`[DocumentEditTracker] ${uri}: ${edit.replacements.length} replacement(s)`);
    }

    dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._onEditEmitter.dispose(); // NEW
        this._documentEdits.clear();
    }
}
```

---

## Test Cases

### Test Suite 1: Cache Entry Structure

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { CompletionsCache } from '../common/completionsCache';
import { StringEdit, OffsetRange } from '../common/stringEdit';

suite('Edit Composition in Cache', () => {
    let cache: CompletionsCache;
    let document: vscode.TextDocument;

    setup(async () => {
        cache = new CompletionsCache();
        document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });
    });

    test('should store document snapshot on append', () => {
        const position = new vscode.Position(0, 10); // After "= "

        cache.append(
            'const x = ',
            ';',
            ['42'],
            document,
            position
        );

        // Verify stored
        const cached = cache.findAll('const x = ', ';');
        assert.strictEqual(cached.length, 1);

        const entry = getCacheEntry(cached[0]);
        assert.ok(entry.documentBeforeEdit);
        assert.strictEqual(entry.documentBeforeEdit, 'const x = 1;');
    });

    test('should initialize empty userEditSince', () => {
        const position = new vscode.Position(0, 10);

        cache.append('const x = ', ';', ['42'], document, position);

        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.ok(entry.userEditSince);
        assert.strictEqual(entry.userEditSince.isEmpty, true);
    });

    test('should compute edit window', () => {
        const position = new vscode.Position(0, 10); // offset 10
        // "const x = " length = 10
        // ";" length = 1

        cache.append('const x = ', ';', ['42'], document, position);

        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.ok(entry.editWindow);
        assert.strictEqual(entry.editWindow.start, 0);  // Start of prefix
        assert.strictEqual(entry.editWindow.endExclusive, 11); // End of suffix
    });

    test('should initialize rebaseFailed to false', () => {
        const position = new vscode.Position(0, 10);

        cache.append('const x = ', ';', ['42'], document, position);

        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.strictEqual(entry.rebaseFailed, false);
    });

    test('should store cache time', () => {
        const before = Date.now();
        const position = new vscode.Position(0, 10);

        cache.append('const x = ', ';', ['42'], document, position);

        const after = Date.now();
        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);

        assert.ok(entry.cacheTime);
        assert.ok(entry.cacheTime >= before && entry.cacheTime <= after);
    });
});

// Helper to extract cache entry from findAll result
function getCacheEntry(results: string[][]): any {
    // Access internal cache structure (for testing)
    // In real code, this would be a proper getter method
    return (results as any)._entry;
}
```

### Test Suite 2: Edit Composition

```typescript
suite('Edit Composition', () => {
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

    test('should compose single edit into cache', async () => {
        const position = new vscode.Position(0, 10);

        // Cache a completion
        cache.append('const x = ', ';', ['42'], document, position);

        // Simulate user edit: Insert "// comment\n" at start
        await simulateEdit(document, 0, 0, '// comment\n');

        // Verify edit was composed
        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.ok(entry.userEditSince);
        assert.strictEqual(entry.userEditSince.replacements.length, 1);
        assert.strictEqual(entry.userEditSince.replacements[0].newText, '// comment\n');
    });

    test('should compose multiple edits', async () => {
        const position = new vscode.Position(0, 10);
        cache.append('const x = ', ';', ['42'], document, position);

        // Edit 1: Insert at start
        await simulateEdit(document, 0, 0, '// line 1\n');

        // Edit 2: Insert at new position
        await simulateEdit(document, 11, 0, '// line 2\n');

        // Verify both edits composed
        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.strictEqual(entry.userEditSince.replacements.length, 2);
    });

    test('should reset rebaseFailed on new edit', async () => {
        const position = new vscode.Position(0, 10);
        cache.append('const x = ', ';', ['42'], document, position);

        // Manually set rebaseFailed
        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        entry.rebaseFailed = true;

        // Simulate edit
        await simulateEdit(document, 0, 0, 'test');

        // Verify flag reset
        assert.strictEqual(entry.rebaseFailed, false);
    });

    test('should handle delete edits', async () => {
        const position = new vscode.Position(0, 10);
        cache.append('const x = ', ';', ['42'], document, position);

        // Delete "const " (first 6 chars)
        await simulateEdit(document, 0, 6, '');

        const entry = getCacheEntry(cache.findAll('const x = ', ';')[0]);
        assert.strictEqual(entry.userEditSince.replacements.length, 1);
        assert.strictEqual(entry.userEditSince.replacements[0].newText, '');
        assert.strictEqual(entry.userEditSince.replacements[0].replaceRange.length, 6);
    });
});
```

### Test Suite 3: Edit Window Computation

```typescript
suite('Edit Window Computation', () => {
    test('should compute window for simple case', () => {
        // "hello world"
        //       ^cursor (offset 6)
        // prefix: "hello "
        // suffix: "world"

        const window = computeEditWindow(
            'hello ',
            'world',
            createMockDocument('hello world'),
            new vscode.Position(0, 6)
        );

        assert.ok(window);
        assert.strictEqual(window.start, 0);  // Start of "hello "
        assert.strictEqual(window.endExclusive, 11); // End of "world"
    });

    test('should compute window with empty suffix', () => {
        // "const x = "
        //           ^cursor (offset 10)
        // prefix: "const x = "
        // suffix: ""

        const window = computeEditWindow(
            'const x = ',
            '',
            createMockDocument('const x = '),
            new vscode.Position(0, 10)
        );

        assert.ok(window);
        assert.strictEqual(window.start, 0);
        assert.strictEqual(window.endExclusive, 10);
    });

    test('should compute window mid-line', () => {
        // "const x = 1 + 2;"
        //               ^cursor (offset 14)
        // prefix: " + "
        // suffix: ";"

        const window = computeEditWindow(
            ' + ',
            ';',
            createMockDocument('const x = 1 + 2;'),
            new vscode.Position(0, 14)
        );

        assert.ok(window);
        assert.strictEqual(window.start, 11);  // Start of " + "
        assert.strictEqual(window.endExclusive, 15); // End of ";"
    });

    test('should handle multi-line', () => {
        const doc = createMockDocument('line1\nline2\nline3');
        const position = new vscode.Position(1, 3); // Middle of line2

        // offset = 6 (line1\n) + 3 = 9
        const window = computeEditWindow(
            'lin',
            'e2',
            doc,
            position
        );

        assert.ok(window);
        assert.strictEqual(window.start, 6);  // Start of "lin" in line2
        assert.strictEqual(window.endExclusive, 11); // End of "e2"
    });
});
```

---

## Example Usage

### Example 1: Cache with Edit Tracking

```typescript
const cache = new CompletionsCache();
const tracker = new DocumentEditTracker();

cache.setEditTracker(tracker);

// Hook up events
tracker.onEdit(({ uri, edit }) => {
    cache.handleDocumentChange(uri, edit);
});

// Cache a completion
cache.append(
    'const x = ',
    ';',
    ['42'],
    document,
    position
);

// Console output:
// [Cache] Stored completion with edit tracking: {
//   prefix: "const x = ...",
//   editWindow: "[0, 11)",
//   documentLength: 12
// }
```

### Example 2: Edit Composition

```typescript
// User types at start of file
// Document: "const x = 1;" → "// comment\nconst x = 1;"

// Console output:
// [DocumentEditTracker] file:///test.ts: 1 replacement(s)
//   - Replace [0, 0) with "// comment\n"
// [Cache] Composed edit into cache entry: {
//   key: "const x = ...",
//   editCount: 1
// }

// userEditSince now contains:
// StringEdit([
//   StringReplacement(OffsetRange(0, 0), "// comment\n")
// ])
```

### Example 3: Multiple Edits

```typescript
// Edit 1: Add line above
// "const x = 1;" → "// line 1\nconst x = 1;"

// Edit 2: Add another line
// "// line 1\nconst x = 1;" → "// line 1\n// line 2\nconst x = 1;"

// userEditSince contains composed edits:
// StringEdit([
//   StringReplacement(OffsetRange(0, 0), "// line 1\n"),
//   StringReplacement(OffsetRange(10, 10), "// line 2\n")
// ])

// Console output:
// [Cache] Composed edit into cache entry: {
//   key: "const x = ...",
//   editCount: 2
// }
```

---

## Console Output Examples

### Scenario 1: Initial Cache

```
[Cache] Stored completion with edit tracking: {
  prefix: "const x = ...",
  editWindow: "[0, 11)",
  documentLength: 12
}
```

### Scenario 2: First Edit

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [0, 0) with "// New line\n"
[Cache] Composed edit into cache entry: {
  key: "const x = ...",
  editCount: 1
}
```

### Scenario 3: Multiple Edits

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [0, 0) with "import x;\n"
[Cache] Composed edit into cache entry: {
  key: "const x = ...",
  editCount: 1
}

[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [10, 10) with "import y;\n"
[Cache] Composed edit into cache entry: {
  key: "const x = ...",
  editCount: 2
}
```

---

## Success Criteria

- ✅ Cache stores `documentBeforeEdit` snapshot
- ✅ Cache initializes `userEditSince` to empty `StringEdit`
- ✅ Cache computes `editWindow` from prefix/suffix
- ✅ `DocumentEditTracker` emits edit events
- ✅ Cache composes edits on event
- ✅ `rebaseFailed` flag resets on new edits
- ✅ All test cases pass
- ✅ Console logs show edit composition

---

## Files to Create/Modify

```
src/chat/src/extension/pukuai/
├── common/
│   ├── completionsCache.ts                    (MODIFIED - add edit tracking)
│   ├── documentEditTracker.ts                 (MODIFIED - add onEdit event)
│   └── index.ts                               (MODIFIED - add exports)
├── vscode-node/
│   └── pukuInlineCompletionProvider.ts        (MODIFIED - hook up events)
└── test/
    └── completionsCacheEditComposition.spec.ts (NEW - 200 lines)
```

---

## Dependencies

- ✅ **#58.1 StringEdit Utilities** (required for `StringEdit`, `OffsetRange`)
- ✅ **#58.2 Document Edit Tracking** (required for `DocumentEditTracker`)
- VS Code API: `vscode.EventEmitter`, `vscode.Position`, `vscode.TextDocument`

---

## Next Steps

After #58.3 is complete:
- ✅ Cache stores edit history
- ✅ Ready for #58.4 (Rebase Algorithm)
- ✅ Ready for #58.5 (Cache Lookup with Rebase)

---

## Debugging Tips

### How to Verify Edit Composition

1. **Enable console logging**:
   - Open Debug Console in VS Code
   - Run extension in debug mode

2. **Test scenario**:
   ```typescript
   // 1. Get a completion (triggers cache.append)
   // 2. Add a line above the completion
   // 3. Check console for composition logs
   ```

3. **Expected output**:
   ```
   [Cache] Stored completion with edit tracking...
   [DocumentEditTracker] file:///test.ts: 1 replacement(s)
   [Cache] Composed edit into cache entry: { editCount: 1 }
   ```

### How to Inspect Cache Entry

Add temporary debug command:

```typescript
vscode.commands.registerCommand('puku.debugCache', () => {
    const cached = cache.findAll(prefix, suffix);
    console.log('Cache entry:', JSON.stringify(cached, null, 2));
});
```

---

## References

- **PRD**: `src/chat/docs/prd-edit-rebasing-cache.md` (Section: Enhanced Cache Structure)
- **Copilot reference**: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/node/nextEditCache.ts`
- **Previous issues**: #58.1 (StringEdit), #58.2 (Edit Tracking)
