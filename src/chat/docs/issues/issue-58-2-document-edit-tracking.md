# Issue #58.2: Document Edit Tracking

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Depends On**: #58.1 (StringEdit Utilities)
**Effort**: 2 hours
**Complexity**: 🟢 Easy
**Priority**: Foundation

---

## Summary

Listen to VS Code document change events and convert them to `StringEdit` objects. Store per-document edit history without cache integration (that comes in #58.3).

---

## Goals

1. ✅ Create `DocumentEditTracker` class
2. ✅ Subscribe to `vscode.workspace.onDidChangeTextDocument`
3. ✅ Convert `TextDocumentChangeEvent` → `StringEdit`
4. ✅ Store per-document edit history in memory
5. ✅ Log all edits to console for debugging
6. ✅ No cache integration yet (pure tracking)

---

## Background

VS Code fires `TextDocumentChangeEvent` whenever a document is edited. Each event contains:
- `document`: The document that changed
- `contentChanges`: Array of changes (insertions, deletions, replacements)

We need to:
1. Listen to these events
2. Convert to our `StringEdit` format (from #58.1)
3. Store history per document

---

## Technical Design

### DocumentEditTracker Class

```typescript
/**
 * Tracks edit history for all open documents.
 * Converts VS Code TextDocumentChangeEvent to StringEdit format.
 *
 * Usage:
 *   const tracker = new DocumentEditTracker();
 *   tracker.getEdits(document.uri) // Returns StringEdit history
 */
export class DocumentEditTracker implements vscode.Disposable {
    private readonly _documentEdits = new Map<string, DocumentEditHistory>();
    private readonly _disposables: vscode.Disposable[] = [];

    constructor() {
        // Listen to document changes
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument(this.handleDocumentChange.bind(this))
        );

        // Clean up when documents close
        this._disposables.push(
            vscode.workspace.onDidCloseTextDocument(this.handleDocumentClose.bind(this))
        );

        console.log('[DocumentEditTracker] Initialized');
    }

    /**
     * Handle document change event from VS Code
     */
    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        const uri = event.document.uri.toString();

        // Ignore non-file schemes (output, debug console, etc.)
        if (event.document.uri.scheme !== 'file' && event.document.uri.scheme !== 'untitled') {
            return;
        }

        // Ignore empty changes
        if (event.contentChanges.length === 0) {
            return;
        }

        // Get or create edit history for this document
        let history = this._documentEdits.get(uri);
        if (!history) {
            history = new DocumentEditHistory(event.document);
            this._documentEdits.set(uri, history);
        }

        // Convert VS Code changes to StringEdit
        const edit = this.extractStringEdit(event.document, event.contentChanges);

        // Add to history
        history.addEdit(edit);

        console.log(`[DocumentEditTracker] ${uri}: ${edit.replacements.length} replacement(s)`);
        for (const replacement of edit.replacements) {
            console.log(`  - ${replacement.toString()}`);
        }
    }

    /**
     * Handle document close - clean up history
     */
    private handleDocumentClose(document: vscode.TextDocument): void {
        const uri = document.uri.toString();
        this._documentEdits.delete(uri);
        console.log(`[DocumentEditTracker] Cleaned up history for ${uri}`);
    }

    /**
     * Convert VS Code changes to StringEdit
     */
    private extractStringEdit(
        document: vscode.TextDocument,
        changes: readonly vscode.TextDocumentContentChangeEvent[]
    ): StringEdit {
        const replacements: StringReplacement[] = [];

        for (const change of changes) {
            // VS Code provides offset-based changes
            const start = change.rangeOffset;
            const end = start + change.rangeLength;
            const newText = change.text;

            const replacement = new StringReplacement(
                new OffsetRange(start, end),
                newText
            );

            replacements.push(replacement);
        }

        // Create StringEdit from replacements
        return new StringEdit(replacements);
    }

    /**
     * Get edit history for a document
     */
    public getEditHistory(uri: string): DocumentEditHistory | undefined {
        return this._documentEdits.get(uri);
    }

    /**
     * Get all edits since a specific time
     */
    public getEditsSince(uri: string, timestamp: number): StringEdit {
        const history = this._documentEdits.get(uri);
        if (!history) {
            return StringEdit.empty();
        }
        return history.getEditsSince(timestamp);
    }

    /**
     * Clear edit history for a document
     */
    public clearHistory(uri: string): void {
        this._documentEdits.delete(uri);
    }

    /**
     * Clear all edit history
     */
    public clearAll(): void {
        this._documentEdits.clear();
    }

    dispose(): void {
        this._disposables.forEach(d => d.dispose());
        this._documentEdits.clear();
    }
}
```

### DocumentEditHistory Class

```typescript
/**
 * Edit history for a single document.
 * Stores timestamped edits and can compose them.
 */
class DocumentEditHistory {
    private readonly _edits: Array<{ edit: StringEdit; timestamp: number }> = [];
    private readonly _maxEdits = 100; // Keep last 100 edits

    constructor(public readonly document: vscode.TextDocument) {}

    /**
     * Add an edit to history
     */
    addEdit(edit: StringEdit): void {
        this._edits.push({
            edit,
            timestamp: Date.now()
        });

        // Trim old edits (LRU)
        if (this._edits.length > this._maxEdits) {
            this._edits.shift();
        }
    }

    /**
     * Get all edits composed together since a timestamp
     */
    getEditsSince(timestamp: number): StringEdit {
        const relevantEdits = this._edits
            .filter(e => e.timestamp >= timestamp)
            .map(e => e.edit);

        if (relevantEdits.length === 0) {
            return StringEdit.empty();
        }

        // Compose all edits into one
        return relevantEdits.reduce((composed, edit) => composed.compose(edit));
    }

    /**
     * Get all edits composed together
     */
    getAllEdits(): StringEdit {
        return this.getEditsSince(0);
    }

    /**
     * Get number of edits in history
     */
    get size(): number {
        return this._edits.length;
    }

    /**
     * Clear history
     */
    clear(): void {
        this._edits.length = 0;
    }
}
```

---

## Implementation Steps

### Step 1: Create file (10 min)

```bash
touch src/chat/src/extension/pukuai/common/documentEditTracker.ts
touch src/chat/src/extension/pukuai/test/documentEditTracker.spec.ts
```

### Step 2: Implement DocumentEditTracker (40 min)

Copy code above, add:
- Error handling for invalid documents
- Support for `rangeOffset` vs `range` (VS Code compatibility)
- JSDoc comments

### Step 3: Write tests (60 min)

See test cases below.

### Step 4: Manual testing (10 min)

- Create test extension command: `puku.testEditTracking`
- Open file, make edits, check console logs
- Verify edit history is correct

---

## Test Cases

### Test Suite 1: Basic Tracking

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { DocumentEditTracker } from '../common/documentEditTracker';
import { StringEdit, OffsetRange } from '../common/stringEdit';

suite('DocumentEditTracker', () => {
    let tracker: DocumentEditTracker;
    let document: vscode.TextDocument;

    setup(async () => {
        tracker = new DocumentEditTracker();
        document = await vscode.workspace.openTextDocument({
            content: 'hello world',
            language: 'plaintext'
        });
    });

    teardown(() => {
        tracker.dispose();
    });

    test('should track single edit', async () => {
        const uri = document.uri.toString();

        // Simulate edit: Insert "beautiful " before "world"
        await simulateEdit(document, 6, 0, 'beautiful ');

        const history = tracker.getEditHistory(uri);
        assert.ok(history, 'Edit history should exist');
        assert.strictEqual(history.size, 1);

        const edit = history.getAllEdits();
        assert.strictEqual(edit.replacements.length, 1);
        assert.strictEqual(edit.replacements[0].newText, 'beautiful ');
    });

    test('should track multiple edits', async () => {
        const uri = document.uri.toString();

        // Edit 1: Insert "beautiful " at offset 6
        await simulateEdit(document, 6, 0, 'beautiful ');

        // Edit 2: Replace "hello" with "goodbye" at offset 0
        await simulateEdit(document, 0, 5, 'goodbye');

        const history = tracker.getEditHistory(uri);
        assert.strictEqual(history.size, 2);
    });

    test('should compose edits', async () => {
        const uri = document.uri.toString();
        const before = Date.now();

        // Multiple edits
        await simulateEdit(document, 6, 0, 'beautiful ');
        await simulateEdit(document, 0, 5, 'goodbye');

        // Get composed edit
        const composed = tracker.getEditsSince(uri, before);
        assert.ok(!composed.isEmpty);

        // Should have 2 replacements
        assert.strictEqual(composed.replacements.length, 2);
    });

    test('should clear history on document close', async () => {
        const uri = document.uri.toString();

        await simulateEdit(document, 6, 0, 'test');
        assert.ok(tracker.getEditHistory(uri));

        // Simulate close
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');

        assert.strictEqual(tracker.getEditHistory(uri), undefined);
    });

    test('should ignore non-file schemes', async () => {
        const outputDoc = await vscode.workspace.openTextDocument({
            content: 'output',
            language: 'plaintext'
        });

        // Simulate edit on output channel
        await simulateEdit(outputDoc, 0, 0, 'test');

        // Should not track (non-file scheme)
        const uri = outputDoc.uri.toString();
        assert.strictEqual(tracker.getEditHistory(uri), undefined);
    });
});

// Helper function to simulate document edits
async function simulateEdit(
    document: vscode.TextDocument,
    offset: number,
    deleteCount: number,
    text: string
): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const range = new vscode.Range(
        document.positionAt(offset),
        document.positionAt(offset + deleteCount)
    );
    edit.replace(document.uri, range, text);
    await vscode.workspace.applyEdit(edit);
}
```

### Test Suite 2: Edit Extraction

```typescript
suite('Edit Extraction', () => {
    test('should extract insertion', () => {
        const changes: vscode.TextDocumentContentChangeEvent[] = [{
            range: new vscode.Range(0, 5, 0, 5),  // Position to insert
            rangeOffset: 5,
            rangeLength: 0,
            text: ' beautiful'
        }];

        const edit = extractStringEdit(mockDocument, changes);

        assert.strictEqual(edit.replacements.length, 1);
        assert.strictEqual(edit.replacements[0].replaceRange.start, 5);
        assert.strictEqual(edit.replacements[0].replaceRange.endExclusive, 5);
        assert.strictEqual(edit.replacements[0].newText, ' beautiful');
    });

    test('should extract deletion', () => {
        const changes: vscode.TextDocumentContentChangeEvent[] = [{
            range: new vscode.Range(0, 6, 0, 16),  // Delete 10 chars
            rangeOffset: 6,
            rangeLength: 10,
            text: ''
        }];

        const edit = extractStringEdit(mockDocument, changes);

        assert.strictEqual(edit.replacements.length, 1);
        assert.strictEqual(edit.replacements[0].replaceRange.start, 6);
        assert.strictEqual(edit.replacements[0].replaceRange.endExclusive, 16);
        assert.strictEqual(edit.replacements[0].newText, '');
    });

    test('should extract replacement', () => {
        const changes: vscode.TextDocumentContentChangeEvent[] = [{
            range: new vscode.Range(0, 0, 0, 5),  // Replace "hello"
            rangeOffset: 0,
            rangeLength: 5,
            text: 'goodbye'
        }];

        const edit = extractStringEdit(mockDocument, changes);

        assert.strictEqual(edit.replacements.length, 1);
        assert.strictEqual(edit.replacements[0].replaceRange.start, 0);
        assert.strictEqual(edit.replacements[0].replaceRange.endExclusive, 5);
        assert.strictEqual(edit.replacements[0].newText, 'goodbye');
    });

    test('should handle multiple simultaneous changes', () => {
        // VS Code can batch multiple changes in one event
        const changes: vscode.TextDocumentContentChangeEvent[] = [
            {
                range: new vscode.Range(0, 0, 0, 5),
                rangeOffset: 0,
                rangeLength: 5,
                text: 'goodbye'
            },
            {
                range: new vscode.Range(0, 6, 0, 11),
                rangeOffset: 13,  // Adjusted for first change
                rangeLength: 5,
                text: 'everyone'
            }
        ];

        const edit = extractStringEdit(mockDocument, changes);

        assert.strictEqual(edit.replacements.length, 2);
    });
});
```

### Test Suite 3: DocumentEditHistory

```typescript
suite('DocumentEditHistory', () => {
    let history: DocumentEditHistory;
    let mockDocument: vscode.TextDocument;

    setup(() => {
        mockDocument = createMockDocument('hello world');
        history = new DocumentEditHistory(mockDocument);
    });

    test('should add edits to history', () => {
        const edit1 = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 6), 'beautiful ')
        );

        history.addEdit(edit1);
        assert.strictEqual(history.size, 1);

        const edit2 = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 5), 'goodbye')
        );

        history.addEdit(edit2);
        assert.strictEqual(history.size, 2);
    });

    test('should compose all edits', () => {
        const edit1 = StringEdit.single(
            new StringReplacement(new OffsetRange(6, 6), 'beautiful ')
        );
        const edit2 = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 5), 'goodbye')
        );

        history.addEdit(edit1);
        history.addEdit(edit2);

        const composed = history.getAllEdits();
        assert.strictEqual(composed.replacements.length, 2);
    });

    test('should get edits since timestamp', () => {
        const t1 = Date.now();

        const edit1 = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 0), 'a')
        );
        history.addEdit(edit1);

        // Wait 10ms
        setTimeout(() => {
            const t2 = Date.now();

            const edit2 = StringEdit.single(
                new StringReplacement(new OffsetRange(1, 1), 'b')
            );
            history.addEdit(edit2);

            // Get only edits after t2
            const recent = history.getEditsSince(t2);
            assert.strictEqual(recent.replacements.length, 1);
            assert.strictEqual(recent.replacements[0].newText, 'b');
        }, 10);
    });

    test('should limit history size to 100 edits', () => {
        // Add 150 edits
        for (let i = 0; i < 150; i++) {
            const edit = StringEdit.single(
                new StringReplacement(new OffsetRange(0, 0), `edit${i}`)
            );
            history.addEdit(edit);
        }

        // Should keep only last 100
        assert.strictEqual(history.size, 100);
    });

    test('should clear history', () => {
        const edit = StringEdit.single(
            new StringReplacement(new OffsetRange(0, 0), 'test')
        );
        history.addEdit(edit);

        assert.strictEqual(history.size, 1);

        history.clear();
        assert.strictEqual(history.size, 0);
    });
});
```

---

## Example Usage

### Example 1: Log All Edits

```typescript
const tracker = new DocumentEditTracker();

// All edits are automatically logged to console:
// [DocumentEditTracker] file:///path/to/file.ts: 1 replacement(s)
//   - Replace [10, 15) with "test"
```

### Example 2: Get Edit History

```typescript
const tracker = new DocumentEditTracker();

// Later, get edit history for a document
const uri = document.uri.toString();
const history = tracker.getEditHistory(uri);

if (history) {
    console.log(`Document has ${history.size} edits in history`);

    // Get all edits composed together
    const allEdits = history.getAllEdits();
    console.log(`Total: ${allEdits.replacements.length} replacements`);
}
```

### Example 3: Get Edits Since Cache Time

```typescript
// Cache a completion at time T1
const cacheTime = Date.now();
cache.append(prefix, suffix, completions, document, position);

// ... user makes edits ...

// Get all edits since cache time
const editsSince = tracker.getEditsSince(document.uri.toString(), cacheTime);

// This will be used for rebasing in #58.5
console.log(`User made ${editsSince.replacements.length} edits since cache`);
```

---

## Console Output Examples

### Scenario 1: User Adds Line

```
[DocumentEditTracker] Initialized
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [0, 0) with "// New comment\n"
```

### Scenario 2: User Deletes Text

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [50, 75) with ""
```

### Scenario 3: User Replaces Text

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [10, 20) with "replacement text"
```

### Scenario 4: Multi-Cursor Edit

```
[DocumentEditTracker] file:///test.ts: 3 replacement(s)
  - Replace [10, 10) with "x"
  - Replace [25, 25) with "x"
  - Replace [40, 40) with "x"
```

---

## Success Criteria

- ✅ `DocumentEditTracker` class listens to all document changes
- ✅ Correctly converts `TextDocumentChangeEvent` → `StringEdit`
- ✅ Stores edit history per document
- ✅ Cleans up on document close
- ✅ All test cases pass
- ✅ Console logs show edit details
- ✅ No cache integration (pure tracking)

---

## Files to Create/Modify

```
src/chat/src/extension/pukuai/
├── common/
│   ├── documentEditTracker.ts         (NEW - 200 lines)
│   └── index.ts                        (MODIFIED - add exports)
└── test/
    └── documentEditTracker.spec.ts    (NEW - 250 lines)
```

---

## Dependencies

- ✅ **#58.1 StringEdit Utilities** (required)
- VS Code APIs: `vscode.workspace.onDidChangeTextDocument`

---

## Next Steps

After #58.2 is complete:
- ✅ Edit tracking works end-to-end
- ✅ Ready for #58.3 (Edit Composition in Cache)
- ✅ Can hook up tracker to cache entries

---

## Debugging Tips

### How to Test Manually

1. **Add test command** to `package.json`:
```json
{
  "command": "puku.testEditTracking",
  "title": "Test Edit Tracking",
  "category": "Puku"
}
```

2. **Register command** in extension:
```typescript
vscode.commands.registerCommand('puku.testEditTracking', () => {
    const tracker = new DocumentEditTracker();
    vscode.window.showInformationMessage('Edit tracking enabled. Check console for logs.');
});
```

3. **Run command**:
   - Open file
   - Run "Test Edit Tracking" command
   - Make edits (type, delete, paste)
   - Check Debug Console for logs

### What to Look For

✅ Every keystroke logged
✅ Correct offset ranges
✅ Insertions show rangeLength=0
✅ Deletions show newText=""
✅ No errors on document close

---

## References

- **VS Code API**: [`onDidChangeTextDocument`](https://code.visualstudio.com/api/references/vscode-api#workspace.onDidChangeTextDocument)
- **TextDocumentChangeEvent**: [`TextDocumentChangeEvent`](https://code.visualstudio.com/api/references/vscode-api#TextDocumentChangeEvent)
- **PRD**: `src/chat/docs/prd-edit-rebasing-cache.md`
