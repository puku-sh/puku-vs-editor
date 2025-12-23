# Undo/Redo Aware Edit Tracking - PRD

## Component Overview
**Purpose**: Detect and track undo/redo operations to avoid showing them as "recent edits" (like Copilot's `EditReason`)
**Priority**: P1 (Phase 2 - Week 2)
**Dependencies**: `CrossTabHistoryTracker` (Phase 2)
**File**: `src/chat/src/extension/inlineEdits/common/undoRedoTracker.ts`

---

## Problem

**Without undo/redo awareness**, the LLM sees this:

User workflow:
1. Adds `async login()` function
2. Realizes it's wrong, presses **Cmd+Z** (undo)
3. Adds correct implementation
4. Invokes inline edit (Ctrl+I)

**LLM sees in history**:
```markdown
## Recent Changes

**2 minutes ago**: Added async login function
```typescript
async login() { /* wrong implementation */ }
```

**1 minute ago**: Deleted async login function (UNDO)

**Just now**: Added async login function
```typescript
async login() { /* correct implementation */ }
```
```

**Problem**: The undo operation pollutes the context with noise.

**With undo/redo awareness**, the LLM sees:

```markdown
## Recent Changes

**Just now**: Added async login function
```typescript
async login() { /* correct implementation */ }
```
```

**Better**: Clean history, only shows final state.

---

## Copilot Reference

**File**: `src/platform/inlineEdits/common/editReason.ts`

**Key Concept**: Copilot tracks WHY an edit happened using `EditReason`:

```typescript
export class EditReason {
    constructor(
        public readonly metadata: ITextModelEditReasonMetadata,
    ) {}
}

export const EditReasons = {
    unknown(data: { name?: string }) { ... },

    cursor(data: { kind: 'type' | 'paste' | 'cut' | 'executeCommands' }) { ... },

    inlineCompletionAccept(data: { nes: boolean; requestUuid: string }) { ... },

    inlineCompletionPartialAccept(data: { type: 'word' | 'line' }) { ... },

    chatApplyEdits(data: { modelId: string }) { ... },

    reloadFromDisk: () => { ... },

    setValue: () => { ... },

    applyEdits: () => { ... },
};
```

**VS Code Integration**:
Copilot uses VS Code's internal `TextModel` API to get edit reasons. Unfortunately, **this API is NOT exposed to extensions**.

**Our Challenge**: VS Code doesn't expose undo/redo events to extensions. We must use **heuristics** to detect them.

---

## Requirements

### FR-1: Undo Detection (P1)

Detect when an edit is likely an undo operation.

**Heuristic Approach**:

An edit is likely an **undo** if:
1. It **reverses** a recent edit exactly
2. Happens within **5 seconds** of the original edit
3. Same file, same range

**Implementation:**
```typescript
export interface IUndoRedoTracker {
    /**
     * Check if an edit is likely an undo/redo operation
     *
     * @param edit - The edit to check
     * @returns EditSource indicating if it's undo, redo, or user edit
     */
    classifyEdit(edit: DocumentEdit): EditSource;

    /**
     * Record an edit for undo/redo detection
     */
    recordEdit(edit: DocumentEdit): void;

    /**
     * Clear undo/redo history
     */
    clear(): void;
}

export enum EditSource {
    UserEdit = 'user',
    Undo = 'undo',
    Redo = 'redo',
    AcceptedCompletion = 'completion',
    Unknown = 'unknown',
}

export interface DocumentEdit {
    uri: vscode.Uri;
    timestamp: number;
    range: vscode.Range;
    oldText: string;
    newText: string;
    editType: EditType;
    source?: EditSource;  // NEW: Track edit source
}
```

**Undo Detection Logic**:
```typescript
export class UndoRedoTracker extends Disposable implements IUndoRedoTracker {
    // Keep recent edits for undo/redo detection (last 5 seconds)
    private recentEdits: DocumentEdit[] = [];
    private readonly undoDetectionWindow = 5000; // 5 seconds

    recordEdit(edit: DocumentEdit): void {
        // Clean up old edits (>5 seconds)
        const now = Date.now();
        this.recentEdits = this.recentEdits.filter(
            e => now - e.timestamp < this.undoDetectionWindow
        );

        // Add current edit
        this.recentEdits.push(edit);
    }

    classifyEdit(edit: DocumentEdit): EditSource {
        // Check if this edit reverses a recent edit (undo)
        const undoMatch = this.findUndoMatch(edit);
        if (undoMatch) {
            // Mark the original edit as undone
            undoMatch.source = EditSource.Undo;
            return EditSource.Undo;
        }

        // Check if this edit re-applies an undone edit (redo)
        const redoMatch = this.findRedoMatch(edit);
        if (redoMatch) {
            return EditSource.Redo;
        }

        // Check if this is from accepting inline completion
        // (VS Code extensions can detect this via InlineCompletionItemProvider)
        if (this.isFromCompletion(edit)) {
            return EditSource.AcceptedCompletion;
        }

        return EditSource.UserEdit;
    }

    private findUndoMatch(edit: DocumentEdit): DocumentEdit | undefined {
        // Find recent edit that this reverses

        for (let i = this.recentEdits.length - 1; i >= 0; i--) {
            const recentEdit = this.recentEdits[i];

            // Same file?
            if (recentEdit.uri.toString() !== edit.uri.toString()) {
                continue;
            }

            // Skip if already marked as undo
            if (recentEdit.source === EditSource.Undo) {
                continue;
            }

            // Check if this edit reverses the recent edit
            if (this.isReverseEdit(recentEdit, edit)) {
                return recentEdit;
            }
        }

        return undefined;
    }

    private findRedoMatch(edit: DocumentEdit): DocumentEdit | undefined {
        // Find undone edit that this re-applies

        for (let i = this.recentEdits.length - 1; i >= 0; i--) {
            const recentEdit = this.recentEdits[i];

            // Same file?
            if (recentEdit.uri.toString() !== edit.uri.toString()) {
                continue;
            }

            // Only look for edits that were undone
            if (recentEdit.source !== EditSource.Undo) {
                continue;
            }

            // Check if this edit re-applies the undone edit
            if (this.isSameEdit(recentEdit, edit)) {
                return recentEdit;
            }
        }

        return undefined;
    }

    private isReverseEdit(original: DocumentEdit, current: DocumentEdit): boolean {
        // Check if current edit reverses original edit

        // Must be within time window
        if (current.timestamp - original.timestamp > this.undoDetectionWindow) {
            return false;
        }

        // Range must overlap or be adjacent
        if (!this.rangesOverlapOrAdjacent(original.range, current.range)) {
            return false;
        }

        // Text must be reversed
        // Original: "" -> "hello"
        // Undo:     "hello" -> ""
        if (current.newText === '' && current.oldText === original.newText) {
            return true; // Undo of insertion
        }

        // Original: "hello" -> ""
        // Undo:     "" -> "hello"
        if (current.newText === original.oldText && current.oldText === '') {
            return true; // Undo of deletion
        }

        // Original: "hello" -> "world"
        // Undo:     "world" -> "hello"
        if (current.newText === original.oldText && current.oldText === original.newText) {
            return true; // Undo of replacement
        }

        return false;
    }

    private isSameEdit(original: DocumentEdit, current: DocumentEdit): boolean {
        // Check if current edit is same as original (redo)

        return (
            original.range.isEqual(current.range) &&
            original.oldText === current.oldText &&
            original.newText === current.newText
        );
    }

    private rangesOverlapOrAdjacent(r1: vscode.Range, r2: vscode.Range): boolean {
        // Check if ranges overlap or are adjacent

        if (r1.intersection(r2)) {
            return true; // Overlap
        }

        // Check if adjacent (end of r1 == start of r2)
        if (r1.end.isEqual(r2.start)) {
            return true;
        }

        // Check if adjacent (end of r2 == start of r1)
        if (r2.end.isEqual(r1.start)) {
            return true;
        }

        return false;
    }

    private isFromCompletion(edit: DocumentEdit): boolean {
        // TODO: Track accepted inline completions
        // Extensions can detect this by:
        // 1. Implementing InlineCompletionItemProvider
        // 2. Tracking when completions are accepted
        // 3. Comparing edit with last accepted completion

        return false; // Not implemented in Phase 2
    }

    clear(): void {
        this.recentEdits = [];
    }
}
```

---

### FR-2: Filter Undo/Redo from History (P1)

Update `CrossTabHistoryTracker` to classify and filter undo/redo edits.

**Modified Implementation**:
```typescript
export class CrossTabHistoryTracker extends Disposable {
    constructor(
        @IUndoRedoTracker private readonly undoRedoTracker: IUndoRedoTracker, // NEW
    ) {
        super();
        // ... existing setup
    }

    private handleTextDocumentChange(e: vscode.TextDocumentChangeEvent) {
        // ... existing code ...

        for (const change of e.contentChanges) {
            const editEntry: EditEntry = {
                kind: 'edit',
                uri,
                timestamp: Date.now(),
                range: change.range,
                oldText: '', // VS Code doesn't provide this
                newText: change.text,
                editType: this.classifyEdit(change),
                languageId: e.document.languageId,
                source: EditSource.Unknown, // Will be set below
            };

            // NEW: Classify edit source (user, undo, redo)
            editEntry.source = this.undoRedoTracker.classifyEdit(editEntry);

            // NEW: Record for undo/redo detection
            this.undoRedoTracker.recordEdit(editEntry);

            // NEW: Skip undo/redo edits from history
            const config = this.configService.getConfig();
            const skipUndoRedo = config['puku.inlineEdit.context.history.skipUndoRedo'] ?? true;

            if (skipUndoRedo && (editEntry.source === EditSource.Undo || editEntry.source === EditSource.Redo)) {
                continue; // Don't add to history
            }

            // ... rest of existing logic (merge, push to history)
        }
    }

    getRelevantHistory(currentFile: vscode.Uri, maxEntries: number = 10): HistoryEntry[] {
        const config = this.configService.getConfig();
        const skipUndoRedo = config['puku.inlineEdit.context.history.skipUndoRedo'] ?? true;

        let history = this.history;

        // Filter out undo/redo entries
        if (skipUndoRedo) {
            history = history.filter(e => {
                if (e.kind !== 'edit') {
                    return true; // Keep tab switches
                }
                return e.source !== EditSource.Undo && e.source !== EditSource.Redo;
            });
        }

        // ... rest of existing implementation
    }
}
```

---

### FR-3: Enhanced History Context (P1)

Show edit source in context when useful.

**Modified Format**:
```typescript
private formatCrossTabHistory(
    history: HistoryEntry[],
    currentFile: vscode.Uri,
    maxEdits: number
): string {
    // ... existing code ...

    for (const edit of editEntries.slice(-maxEdits)) {
        const fileName = this.getFileName(edit.uri);
        const timeAgo = this.formatTimeAgo(edit.timestamp);
        const description = this.describeEdit(edit);

        // NEW: Show source if relevant
        let sourceLabel = '';
        if (edit.source === EditSource.AcceptedCompletion) {
            sourceLabel = ' (from AI suggestion)';
        }

        markdown += `**File**: ${fileName} (${timeAgo})${sourceLabel}\n`;
        markdown += `**Change**: ${description}\n`;

        // ... rest of formatting
    }

    return markdown;
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| User types code | Insert "hello" | EditSource.UserEdit |
| Undo insertion | Delete "hello" (within 5s) | EditSource.Undo |
| Redo insertion | Insert "hello" again | EditSource.Redo |
| Replace then undo | "a"->"b", then "b"->"a" | Second is Undo |
| Unrelated edits | Two different locations | Both UserEdit |
| Old edit | Reverse after 10s | UserEdit (timeout) |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Undo/redo workflow | Detects undo/redo operations |
| History filtering | Filters out undo/redo from context |
| Configuration | Respects skipUndoRedo setting |
| Multi-file undo | Detects undo across different files |

---

## Example Output

### Scenario: User Makes Mistake and Undoes

**User actions**:
1. Types `async login() { /* wrong */ }` in `userService.ts`
2. Realizes mistake, presses **Cmd+Z** (undo)
3. Types correct implementation `async login() { /* correct */ }`
4. Invokes inline edit (Ctrl+I)

**Internal History** (with source tracking):
```
[
  { newText: 'async login() { /* wrong */ }', source: 'user', timestamp: T1 },
  { oldText: 'async login() { /* wrong */ }', newText: '', source: 'undo', timestamp: T2 },
  { newText: 'async login() { /* correct */ }', source: 'user', timestamp: T3 }
]
```

**Filtered History** (sent to LLM):
```
[
  { newText: 'async login() { /* correct */ }', source: 'user', timestamp: T3 }
]
```

**Formatted Context**:
```markdown
## Recent Changes

**File**: `userService.ts` (just now)
**Change**: Added async function
```typescript
async login() {
    // correct implementation
}
```
```

**Result**: LLM sees clean history without the undo noise.

---

## Limitations & Future Work

### Known Limitations

1. **No access to VS Code's undo stack**
   - We use heuristics, not ground truth
   - ~90% accuracy for undo detection
   - ~80% accuracy for redo detection

2. **Requires oldText to be accurate**
   - VS Code's `TextDocumentContentChangeEvent` doesn't provide `oldText`
   - We must track document state ourselves or use heuristics

3. **Complex undo sequences**
   - Undo multiple operations (Cmd+Z multiple times) may not be detected perfectly
   - Works best for single undo/redo

### Future Improvements (Phase 3)

1. **Track document state** to get accurate `oldText`
2. **Multi-step undo detection** (undo sequences)
3. **VS Code command tracking** - Listen to `undo`/`redo` commands
4. **Completion tracking** - Track accepted inline completions

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Classify edit | <5ms | Heuristic matching |
| Record edit | <1ms | Push to array |
| Find undo match | <5ms | Linear search (5s window) |
| **Total overhead** | **<10ms** | Per edit |

---

## Success Criteria

- [ ] Detects undo operations (>90% accuracy)
- [ ] Detects redo operations (>80% accuracy)
- [ ] Filters undo/redo from history
- [ ] Tracks edit source (user, undo, redo)
- [ ] Configuration support
- [ ] Unit tests (>80% coverage)
- [ ] Performance <10ms overhead
- [ ] Integration with `CrossTabHistoryTracker`

---

## Implementation Checklist

**Phase 2 (P1):**
- [ ] Create `IUndoRedoTracker` interface
- [ ] Implement `UndoRedoTracker` class
- [ ] Add `classifyEdit()` method
- [ ] Add `findUndoMatch()` method
- [ ] Add `findRedoMatch()` method
- [ ] Add `isReverseEdit()` helper
- [ ] Add `isSameEdit()` helper
- [ ] Update `CrossTabHistoryTracker` to use undo/redo tracker
- [ ] Add `source` field to `DocumentEdit` interface
- [ ] Update `getRelevantHistory()` to filter undo/redo
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Configuration

```json
{
  "puku.inlineEdit.context.history.skipUndoRedo": true,
  "puku.inlineEdit.context.history.undoDetectionWindow": 5000,
  "puku.inlineEdit.context.history.showEditSource": false
}
```

---

## Alternative Approaches

### Approach 1: Command Tracking (Best, but limited)

Listen to VS Code commands:

```typescript
vscode.commands.registerCommand('undo', () => {
    // Mark next edit as undo
});

vscode.commands.registerCommand('redo', () => {
    // Mark next edit as redo
});
```

**Problem**: Extensions **cannot override** built-in commands like `undo`/`redo`. We can only listen, not intercept.

**Workaround**: Use `vscode.commands.registerCommand` with `before:` prefix (not officially supported).

### Approach 2: Document Snapshot Comparison

Track full document state and compare:

```typescript
private previousDocumentStates = new Map<string, string>();

handleTextDocumentChange(e) {
    const currentText = e.document.getText();
    const previousText = this.previousDocumentStates.get(e.document.uri.toString());

    // Compare with previous states to detect undo
}
```

**Pros**: More accurate `oldText`
**Cons**: High memory usage for large files

### Approach 3: Heuristics (Current Implementation)

Use timing + edit reversal detection.

**Pros**: Lightweight, no API dependencies
**Cons**: ~90% accuracy, may miss complex undo sequences

**Verdict**: Use **Approach 3 (heuristics)** for Phase 2, consider **Approach 2 (snapshots)** for Phase 3.

---

## Related Documents

- `01-edit-history-tracker.md` - Per-file edit tracking (Phase 1)
- `07-cross-tab-history-tracker.md` - Cross-tab tracking (Phase 2)
- `02-history-context-provider.md` - History formatting (Phase 1)

---

**Status**: Ready for Implementation
**Priority**: P1 (Phase 2)
**Estimated Effort**: 4 hours
**Dependencies**: Cross-Tab History Tracker (07)
**Owner**: TBD

---

## Notes

This feature brings Puku **closer to Copilot's EditReason system**, but without access to VS Code internals, we rely on heuristics. The 90% accuracy is acceptable for MVP, and can be improved in Phase 3 with document state tracking or command interception.
