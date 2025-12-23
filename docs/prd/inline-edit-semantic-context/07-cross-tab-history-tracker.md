# Cross-Tab History Tracker - PRD

## Component Overview
**Purpose**: Track edits and tab switches across ALL open editor tabs (like Copilot's `NesXtabHistoryTracker`)
**Priority**: P1 (Phase 2 - Week 2)
**Dependencies**: `EditHistoryTracker` (Phase 1)
**File**: `src/chat/src/extension/inlineEdits/common/crossTabHistoryTracker.ts`

---

## Problem

**Phase 1** tracks edits per file. But users often work across multiple files:

**Example workflow**:
1. User edits `userService.ts` - adds authentication
2. Switches to `loginController.ts` - implements login
3. Switches back to `userService.ts` - invokes inline edit

**Without cross-tab tracking**: LLM only sees recent edits in `userService.ts`

**With cross-tab tracking**: LLM sees chronological history:
- 2 min ago: Added auth to `userService.ts`
- 1 min ago: Implemented login in `loginController.ts`
- Now: User is back in `userService.ts`

This provides **better context** about user's workflow across files.

---

## Copilot Reference

**File**: `src/platform/inlineEdits/common/workspaceEditTracker/nesXtabHistoryTracker.ts`

**Key Features**:
1. **Global history** - 50 entries across ALL files (not per-file)
2. **Tab switch tracking** - Tracks when user switches tabs (visible ranges)
3. **Edit merging** - Consecutive edits on same line get merged
4. **Chronological order** - History shows what happened when, across all files

**Data Structure**:
```typescript
export interface IXtabHistoryEditEntry {
    kind: 'edit';
    docId: DocumentId;
    edit: RootedEdit;  // Contains base text + edit operation
}

export interface IXtabHistoryVisibleRangesEntry {
    kind: 'visibleRanges';
    docId: DocumentId;
    visibleRanges: readonly OffsetRange[];
    documentContent: StringText;
}

export type IXtabHistoryEntry =
    | IXtabHistoryEditEntry
    | IXtabHistoryVisibleRangesEntry;
```

**How it works**:
```typescript
export class NesXtabHistoryTracker {
    private history: LinkedList<IXtabHistoryEntry>; // Global chronological
    private idToEntry: Map<DocumentId, Entry>;     // Latest entry per file

    constructor(workspace: ObservableWorkspace) {
        // Watch ALL open documents
        workspace.openDocuments.forEach(doc => {
            doc.value.onChange(edits => this.handleEdits(doc, edits));
            doc.visibleRanges.onChange(ranges => this.handleVisibleRanges(doc, ranges));
        });
    }

    private handleEdits(doc, edits) {
        // Merge consecutive edits on same line
        const lastEntry = this.idToEntry.get(doc.id);
        if (lastEntry?.kind === 'edit' && sameLineAs(lastEntry)) {
            this.mergeEdits(lastEntry, edits);
        } else {
            this.pushToHistory({ kind: 'edit', docId: doc.id, edit: edits });
        }
    }

    private handleVisibleRanges(doc, ranges) {
        // Track tab switches
        this.pushToHistory({
            kind: 'visibleRanges',
            docId: doc.id,
            visibleRanges: ranges
        });
    }
}
```

---

## Requirements

### FR-1: Global Cross-File History (P1)

Track edits across ALL open files in chronological order.

**API:**
```typescript
export interface ICrossTabHistoryTracker {
    /**
     * Get global chronological history across all files
     *
     * @param maxEntries - Maximum entries to return (default: 50)
     * @returns History entries in chronological order (oldest first)
     */
    getHistory(maxEntries?: number): HistoryEntry[];

    /**
     * Get history filtered to relevant files
     *
     * @param currentFile - Current file URI
     * @param maxEntries - Maximum entries to return
     * @returns History with current file prioritized
     */
    getRelevantHistory(currentFile: vscode.Uri, maxEntries?: number): HistoryEntry[];

    /**
     * Clear all history
     */
    clearHistory(): void;
}

export type HistoryEntry = EditEntry | TabSwitchEntry;

export interface EditEntry {
    kind: 'edit';
    uri: vscode.Uri;
    timestamp: number;
    range: vscode.Range;
    oldText: string;
    newText: string;
    editType: EditType;
    languageId: string;
}

export interface TabSwitchEntry {
    kind: 'tabSwitch';
    uri: vscode.Uri;
    timestamp: number;
    visibleRange: vscode.Range;
}
```

**Implementation:**
```typescript
export class CrossTabHistoryTracker extends Disposable implements ICrossTabHistoryTracker {
    private history: HistoryEntry[] = [];
    private readonly maxHistorySize = 50;

    // Track latest entry per file (for merging)
    private latestEntryPerFile = new Map<string, HistoryEntry>();

    constructor() {
        super();

        // Listen to ALL text document changes (across all tabs)
        this._register(vscode.workspace.onDidChangeTextDocument(e => {
            this.handleTextDocumentChange(e);
        }));

        // Listen to active editor changes (tab switches)
        this._register(vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                this.handleTabSwitch(editor);
            }
        }));

        // Listen to visible range changes (scrolling, but also tab focus)
        this._register(vscode.window.onDidChangeTextEditorVisibleRanges(e => {
            this.handleVisibleRangeChange(e);
        }));
    }

    getHistory(maxEntries: number = 50): HistoryEntry[] {
        return this.history.slice(-maxEntries);
    }

    getRelevantHistory(currentFile: vscode.Uri, maxEntries: number = 10): HistoryEntry[] {
        const currentFileStr = currentFile.toString();

        // Prioritize: current file edits > other files > tab switches
        const currentFileEdits = this.history.filter(e =>
            e.kind === 'edit' && e.uri.toString() === currentFileStr
        );

        const otherFileEdits = this.history.filter(e =>
            e.kind === 'edit' && e.uri.toString() !== currentFileStr
        );

        const tabSwitches = this.history.filter(e => e.kind === 'tabSwitch');

        // Combine with priority
        const relevant = [
            ...currentFileEdits.slice(-5),
            ...otherFileEdits.slice(-3),
            ...tabSwitches.slice(-2),
        ];

        // Sort chronologically and limit
        return relevant
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-maxEntries);
    }

    private handleTextDocumentChange(e: vscode.TextDocumentChangeEvent) {
        if (e.contentChanges.length === 0) {
            return;
        }

        const uri = e.document.uri;
        const uriStr = uri.toString();

        // Skip non-file schemes
        if (uri.scheme !== 'file' && uri.scheme !== 'untitled') {
            return;
        }

        for (const change of e.contentChanges) {
            // Skip trivial edits
            if (this.isTrivialEdit(change)) {
                continue;
            }

            const editEntry: EditEntry = {
                kind: 'edit',
                uri,
                timestamp: Date.now(),
                range: change.range,
                oldText: '', // Not available in VS Code API
                newText: change.text,
                editType: this.classifyEdit(change),
                languageId: e.document.languageId,
            };

            // Try to merge with previous edit on same line
            const lastEntry = this.latestEntryPerFile.get(uriStr);
            if (lastEntry?.kind === 'edit' && this.canMergeEdits(lastEntry, editEntry)) {
                this.mergeEdits(lastEntry, editEntry);
            } else {
                this.pushToHistory(editEntry);
                this.latestEntryPerFile.set(uriStr, editEntry);
            }
        }
    }

    private handleTabSwitch(editor: vscode.TextEditor) {
        const uri = editor.document.uri;

        // Skip if already in history recently
        const lastEntry = this.latestEntryPerFile.get(uri.toString());
        if (lastEntry && Date.now() - lastEntry.timestamp < 1000) {
            return; // Skip if switched less than 1 second ago
        }

        const tabSwitchEntry: TabSwitchEntry = {
            kind: 'tabSwitch',
            uri,
            timestamp: Date.now(),
            visibleRange: editor.visibleRanges[0] || new vscode.Range(0, 0, 0, 0),
        };

        this.pushToHistory(tabSwitchEntry);
        this.latestEntryPerFile.set(uri.toString(), tabSwitchEntry);
    }

    private handleVisibleRangeChange(e: vscode.TextEditorVisibleRangesChangeEvent) {
        // Only track if this is a meaningful change (not just scrolling)
        // For now, we rely on onDidChangeActiveTextEditor for tab switches
    }

    private pushToHistory(entry: HistoryEntry) {
        this.history.push(entry);

        // Compact if over limit
        if (this.history.length > this.maxHistorySize) {
            const removed = this.history.shift();
            if (removed) {
                // Clean up latestEntryPerFile if this was the latest
                const lastEntry = this.latestEntryPerFile.get(removed.uri.toString());
                if (lastEntry === removed) {
                    this.latestEntryPerFile.delete(removed.uri.toString());
                }
            }
        }
    }

    private canMergeEdits(last: EditEntry, current: EditEntry): boolean {
        // Merge if:
        // 1. Same file
        // 2. Same line
        // 3. Within 2 seconds
        // 4. Adjacent positions

        if (last.uri.toString() !== current.uri.toString()) {
            return false;
        }

        if (current.timestamp - last.timestamp > 2000) {
            return false; // Too old
        }

        // Check if on same line
        if (last.range.start.line !== current.range.start.line) {
            return false;
        }

        // Check if adjacent
        const lastEnd = last.range.end;
        const currentStart = current.range.start;

        if (lastEnd.line === currentStart.line &&
            Math.abs(lastEnd.character - currentStart.character) <= 1) {
            return true;
        }

        return false;
    }

    private mergeEdits(last: EditEntry, current: EditEntry) {
        // Update last entry with merged content
        last.newText += current.newText;
        last.range = new vscode.Range(
            last.range.start,
            current.range.end
        );
        last.timestamp = current.timestamp; // Update timestamp

        // Remove old entry from history and add merged one
        const index = this.history.indexOf(last);
        if (index !== -1) {
            this.history.splice(index, 1);
        }

        this.history.push(last);
    }

    private isTrivialEdit(change: vscode.TextDocumentContentChangeEvent): boolean {
        // Skip single character changes (except newlines)
        if (change.text.length === 1 && change.text !== '\n') {
            return true;
        }

        // Skip pure whitespace changes
        if (change.text.trim() === '' && change.rangeLength === 0) {
            return true;
        }

        return false;
    }

    private classifyEdit(change: vscode.TextDocumentContentChangeEvent): EditType {
        if (change.rangeLength === 0) {
            return 'insert';
        }
        if (change.text === '') {
            return 'delete';
        }
        return 'replace';
    }

    clearHistory(): void {
        this.history = [];
        this.latestEntryPerFile.clear();
    }
}
```

---

### FR-2: History Context Provider Integration (P1)

Update `HistoryContextProvider` to use cross-tab history.

**Modified API:**
```typescript
export class HistoryContextProvider extends Disposable implements IHistoryContextProvider {
    constructor(
        @ICrossTabHistoryTracker private readonly crossTabTracker: ICrossTabHistoryTracker, // NEW
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();
    }

    getHistoryContext(
        uri: vscode.Uri,
        position: vscode.Position,
        maxEdits: number = 3
    ): string {
        const config = this.configService.getConfig();
        const useCrossTab = config['puku.inlineEdit.context.history.crossTab'] ?? true;

        if (useCrossTab) {
            // NEW: Use cross-tab history
            const history = this.crossTabTracker.getRelevantHistory(uri, maxEdits * 2);
            return this.formatCrossTabHistory(history, uri, maxEdits);
        } else {
            // Fallback: Use per-file history (Phase 1)
            const edits = this.editHistoryTracker.getRecentEdits(uri, maxEdits);
            return this.formatHistory(edits);
        }
    }

    private formatCrossTabHistory(
        history: HistoryEntry[],
        currentFile: vscode.Uri,
        maxEdits: number
    ): string {
        if (history.length === 0) {
            return '';
        }

        let markdown = '## Recent Changes\n\n';

        const editEntries = history.filter(e => e.kind === 'edit') as EditEntry[];
        const tabSwitches = history.filter(e => e.kind === 'tabSwitch') as TabSwitchEntry[];

        // Show edits
        for (const edit of editEntries.slice(-maxEdits)) {
            const fileName = this.getFileName(edit.uri);
            const isCurrent = edit.uri.toString() === currentFile.toString();
            const fileLabel = isCurrent ? fileName : `\`${fileName}\``;

            const timeAgo = this.formatTimeAgo(edit.timestamp);
            const description = this.describeEdit(edit);

            markdown += `**File**: ${fileLabel} (${timeAgo})\n`;
            markdown += `**Change**: ${description}\n`;

            if (edit.newText.trim()) {
                markdown += '```' + edit.languageId + '\n';
                markdown += edit.newText;
                markdown += '\n```\n';
            }

            markdown += '\n';
        }

        // Show tab switches if relevant
        if (tabSwitches.length > 0) {
            markdown += '**Recent Tab Switches**:\n';
            for (const tabSwitch of tabSwitches.slice(-2)) {
                const fileName = this.getFileName(tabSwitch.uri);
                const timeAgo = this.formatTimeAgo(tabSwitch.timestamp);
                markdown += `- Switched to \`${fileName}\` (${timeAgo})\n`;
            }
            markdown += '\n';
        }

        return markdown;
    }

    private getFileName(uri: vscode.Uri): string {
        return uri.path.split('/').pop() || uri.toString();
    }

    // ... rest of implementation
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Edit in File A | Edit `fileA.ts` | History: [edit:fileA] |
| Switch to File B | Switch tab | History: [edit:fileA, tabSwitch:fileB] |
| Edit in File B | Edit `fileB.ts` | History: [edit:fileA, tabSwitch:fileB, edit:fileB] |
| Consecutive same-line edits | 2 edits on line 10 | Merged into 1 entry |
| History limit | 51 entries | Oldest entry removed, 50 remain |
| Get relevant history | Current file: A | Prioritizes file A edits |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Multi-file workflow | Tracks edits across 3+ files |
| Tab switch tracking | Records tab switches |
| Edit merging | Merges consecutive edits on same line |
| History cleanup | Limits to 50 entries globally |

---

## Example Output

### Scenario: Multi-File Workflow

**User actions**:
1. Edit `userService.ts` - adds `async login()` method
2. Switch to `api/auth.ts`
3. Edit `api/auth.ts` - adds `/login` endpoint
4. Switch back to `userService.ts`
5. Invoke inline edit (Ctrl+I)

**History (chronological)**:
```
[
  { kind: 'edit', uri: 'userService.ts', newText: 'async login()', timestamp: T1 },
  { kind: 'tabSwitch', uri: 'api/auth.ts', timestamp: T2 },
  { kind: 'edit', uri: 'api/auth.ts', newText: 'app.post("/login")', timestamp: T3 },
  { kind: 'tabSwitch', uri: 'userService.ts', timestamp: T4 }
]
```

**Formatted Context** (sent to LLM):
```markdown
## Recent Changes

**File**: `userService.ts` (3 minutes ago)
**Change**: Added async function
```typescript
async login() {
    // ...
}
```

**File**: `api/auth.ts` (1 minute ago)
**Change**: Added HTTP endpoint
```typescript
app.post("/login", async (req, res) => { ... })
```

**Recent Tab Switches**:
- Switched to `api/auth.ts` (2 minutes ago)
- Switched back to `userService.ts` (just now)
```

**LLM sees**:
- User is building a login feature
- Frontend: `userService.ts` has `async login()`
- Backend: `api/auth.ts` has `/login` endpoint
- User is now back in `userService.ts` → likely connecting the two

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Track single edit | <5ms | Push to array |
| Track tab switch | <5ms | Push to array |
| Get relevant history | <10ms | Filter + sort |
| History compaction | <5ms | Remove oldest entry |
| **Total overhead** | **<25ms** | Per edit/switch |

---

## Success Criteria

- [ ] Tracks edits across all open files
- [ ] Tracks tab switches
- [ ] Merges consecutive edits on same line
- [ ] Global history limit (50 entries)
- [ ] Chronological ordering
- [ ] Relevant history filtering (current file prioritized)
- [ ] Integration with `HistoryContextProvider`
- [ ] Configuration support
- [ ] Unit tests (>80% coverage)
- [ ] Performance <25ms overhead

---

## Implementation Checklist

**Phase 2 (P1):**
- [ ] Create `ICrossTabHistoryTracker` interface
- [ ] Implement `CrossTabHistoryTracker` class
- [ ] Add `handleTextDocumentChange()` method
- [ ] Add `handleTabSwitch()` method
- [ ] Add `canMergeEdits()` + `mergeEdits()` methods
- [ ] Add `getRelevantHistory()` method
- [ ] Update `HistoryContextProvider` to use cross-tab tracker
- [ ] Add `formatCrossTabHistory()` method
- [ ] Add configuration support
- [ ] Write unit tests
- [ ] Write integration tests

---

## Configuration

```json
{
  "puku.inlineEdit.context.history.crossTab": true,
  "puku.inlineEdit.context.history.maxGlobalEntries": 50,
  "puku.inlineEdit.context.history.mergeEditsEnabled": true,
  "puku.inlineEdit.context.history.mergeTimeoutMs": 2000,
  "puku.inlineEdit.context.history.trackTabSwitches": true
}
```

---

## Related Documents

- `01-edit-history-tracker.md` - Per-file edit tracking (Phase 1)
- `02-history-context-provider.md` - History formatting (Phase 1)
- `08-undo-redo-tracker.md` - Undo/redo awareness (Phase 2)

---

**Status**: Ready for Implementation
**Priority**: P1 (Phase 2)
**Estimated Effort**: 5 hours
**Dependencies**: Edit History Tracker (01)
**Owner**: TBD
