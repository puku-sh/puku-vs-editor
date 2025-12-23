# Edit History Tracker - PRD

## Component Overview
**Purpose**: Track user edits in current session to provide context about recent changes
**Priority**: P0 (MVP - Foundation)
**Dependencies**: VS Code workspace events
**File**: `src/chat/src/extension/inlineEdits/common/editHistoryTracker.ts`

---

## Problem

When users invoke inline edit (Ctrl+I), the LLM has no knowledge of:
- What the user just edited
- Recent changes in the current file
- Recent changes in other open files
- User's coding patterns in this session

**Example scenario:**

1. User adds error handling to `function loginUser()`
2. User moves to `function fetchData()`
3. User invokes Ctrl+I: "Add error handling like the login function"

**Without history context**: LLM doesn't know what "like the login function" means

**With history context**: LLM sees recent edit to `loginUser()` and can copy the pattern

---

## Requirements

### FR-1: Track Document Changes (P0)
Listen to document change events and store edit history.

**API:**
```typescript
export interface IEditHistoryTracker {
    /**
     * Get recent edits for a document
     * @param uri - Document URI
     * @param maxEdits - Maximum number of edits to return (default: 5)
     * @returns Array of edits, most recent first
     */
    getRecentEdits(uri: vscode.Uri, maxEdits?: number): DocumentEdit[];

    /**
     * Get all recent edits across all files in session
     * @param maxEdits - Maximum total edits to return
     * @returns Array of edits, most recent first
     */
    getAllRecentEdits(maxEdits?: number): DocumentEdit[];

    /**
     * Clear history for a document (called on file close)
     */
    clearHistory(uri: vscode.Uri): void;

    /**
     * Clear all history (called on dispose)
     */
    clearAllHistory(): void;
}

export interface DocumentEdit {
    /**
     * Document URI
     */
    uri: vscode.Uri;

    /**
     * Timestamp of edit
     */
    timestamp: number;

    /**
     * Range that was edited
     */
    range: vscode.Range;

    /**
     * Old text (before edit)
     */
    oldText: string;

    /**
     * New text (after edit)
     */
    newText: string;

    /**
     * Edit type (inferred)
     */
    editType: EditType;

    /**
     * Optional: User selection after edit
     */
    selectionAfter?: vscode.Range;
}

export type EditType =
    | 'insert'      // New code added
    | 'delete'      // Code removed
    | 'replace'     // Code modified
    | 'format';     // Formatting change (whitespace only)
```

### FR-2: Edit Type Classification (P0)
Automatically classify edit types for better context.

**Classification Rules:**
```typescript
function classifyEdit(oldText: string, newText: string): EditType {
    if (oldText === '' && newText !== '') {
        return 'insert';
    }
    if (oldText !== '' && newText === '') {
        return 'delete';
    }
    if (isOnlyWhitespaceChange(oldText, newText)) {
        return 'format';
    }
    return 'replace';
}

function isOnlyWhitespaceChange(oldText: string, newText: string): boolean {
    return oldText.replace(/\s+/g, '') === newText.replace(/\s+/g, '');
}
```

### FR-3: History Limits and Cleanup (P0)
Limit memory usage by capping history size.

**Limits:**
- **Per-file limit**: 10 edits (configurable)
- **Global limit**: 50 edits across all files (configurable)
- **Time limit**: 30 minutes (configurable)
- **Auto-cleanup**: Remove old edits beyond limits

**Cleanup Strategy:**
```typescript
// Remove edits older than time limit
const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
edits = edits.filter(edit => edit.timestamp > cutoffTime);

// Keep only last N edits per file
const editsPerFile = new Map<string, DocumentEdit[]>();
for (const edit of edits) {
    const fileEdits = editsPerFile.get(edit.uri.toString()) || [];
    fileEdits.push(edit);
    editsPerFile.set(edit.uri.toString(), fileEdits.slice(-10)); // Keep last 10
}
```

### FR-4: Selection Tracking (P0)
Track cursor position after edits for context.

**Implementation:**
```typescript
// Listen to selection changes
vscode.window.onDidChangeTextEditorSelection(event => {
    // Associate selection with most recent edit
    const recentEdit = this.getMostRecentEdit(event.textEditor.document.uri);
    if (recentEdit && Date.now() - recentEdit.timestamp < 1000) {
        recentEdit.selectionAfter = event.selections[0];
    }
});
```

### FR-5: Ignore Trivial Edits (P0)
Filter out noise edits that don't provide useful context.

**Ignore Rules:**
- Single-character edits (typing)
- Whitespace-only changes (formatting)
- Undo/redo operations (track separately)

**Implementation:**
```typescript
function shouldIgnoreEdit(change: vscode.TextDocumentContentChangeEvent): boolean {
    // Ignore single-character typing
    if (change.text.length === 1 && change.rangeLength <= 1) {
        return true;
    }

    // Ignore whitespace-only
    if (change.text.trim() === '' && change.rangeLength > 0) {
        return true;
    }

    // Ignore very small changes (<3 characters)
    if (change.text.length < 3 && change.rangeLength < 3) {
        return true;
    }

    return false;
}
```

---

## API Design

### Full Implementation

```typescript
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - Edit History Tracker
 *  Tracks user edits in current session for context
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IConfigurationService } from '../../../platform/configuration/common/configurationService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

export const IEditHistoryTracker = createServiceIdentifier<IEditHistoryTracker>('IEditHistoryTracker');

export interface IEditHistoryTracker {
    readonly _serviceBrand: undefined;

    getRecentEdits(uri: vscode.Uri, maxEdits?: number): DocumentEdit[];
    getAllRecentEdits(maxEdits?: number): DocumentEdit[];
    clearHistory(uri: vscode.Uri): void;
    clearAllHistory(): void;
}

export interface DocumentEdit {
    uri: vscode.Uri;
    timestamp: number;
    range: vscode.Range;
    oldText: string;
    newText: string;
    editType: EditType;
    selectionAfter?: vscode.Range;
}

export type EditType = 'insert' | 'delete' | 'replace' | 'format';

export class EditHistoryTracker extends Disposable implements IEditHistoryTracker {
    declare readonly _serviceBrand: undefined;

    private readonly _edits = new Map<string, DocumentEdit[]>(); // uri -> edits
    private readonly _globalEdits: DocumentEdit[] = [];

    constructor(
        @IConfigurationService private readonly configService: IConfigurationService,
    ) {
        super();

        // Listen to document changes
        this._register(vscode.workspace.onDidChangeTextDocument(event => {
            this.onDocumentChanged(event);
        }));

        // Listen to selection changes (for tracking cursor after edits)
        this._register(vscode.window.onDidChangeTextEditorSelection(event => {
            this.onSelectionChanged(event);
        }));

        // Listen to document close (cleanup)
        this._register(vscode.workspace.onDidCloseTextDocument(document => {
            this.clearHistory(document.uri);
        }));

        // Periodic cleanup (every 5 minutes)
        const cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        this._register({ dispose: () => clearInterval(cleanupInterval) });
    }

    getRecentEdits(uri: vscode.Uri, maxEdits: number = 5): DocumentEdit[] {
        const edits = this._edits.get(uri.toString()) || [];
        return edits.slice(-maxEdits).reverse(); // Most recent first
    }

    getAllRecentEdits(maxEdits: number = 10): DocumentEdit[] {
        return this._globalEdits.slice(-maxEdits).reverse(); // Most recent first
    }

    clearHistory(uri: vscode.Uri): void {
        this._edits.delete(uri.toString());
    }

    clearAllHistory(): void {
        this._edits.clear();
        this._globalEdits.length = 0;
    }

    /**
     * Handle document change event
     */
    private onDocumentChanged(event: vscode.TextDocumentChangeEvent): void {
        if (event.contentChanges.length === 0) {
            return;
        }

        const config = this.configService.getConfig();
        const enabled = config['puku.inlineEdit.context.history.enabled'] ?? true;
        if (!enabled) {
            return;
        }

        // Process each change
        for (const change of event.contentChanges) {
            // Ignore trivial edits
            if (this.shouldIgnoreEdit(change)) {
                continue;
            }

            const edit: DocumentEdit = {
                uri: event.document.uri,
                timestamp: Date.now(),
                range: change.range,
                oldText: this.getOldText(event.document, change),
                newText: change.text,
                editType: this.classifyEdit(change),
            };

            this.addEdit(edit);
        }
    }

    /**
     * Handle selection change (associate with recent edit)
     */
    private onSelectionChanged(event: vscode.TextEditorSelectionChangeEvent): void {
        const recentEdit = this.getMostRecentEdit(event.textEditor.document.uri);
        if (recentEdit && Date.now() - recentEdit.timestamp < 1000) {
            recentEdit.selectionAfter = event.selections[0];
        }
    }

    /**
     * Add edit to history
     */
    private addEdit(edit: DocumentEdit): void {
        const uriString = edit.uri.toString();

        // Add to per-file history
        const fileEdits = this._edits.get(uriString) || [];
        fileEdits.push(edit);
        this._edits.set(uriString, fileEdits);

        // Add to global history
        this._globalEdits.push(edit);

        // Cleanup if needed
        this.cleanup();
    }

    /**
     * Get most recent edit for a file
     */
    private getMostRecentEdit(uri: vscode.Uri): DocumentEdit | undefined {
        const edits = this._edits.get(uri.toString());
        return edits ? edits[edits.length - 1] : undefined;
    }

    /**
     * Should ignore this edit?
     */
    private shouldIgnoreEdit(change: vscode.TextDocumentContentChangeEvent): boolean {
        // Ignore single-character typing
        if (change.text.length === 1 && change.rangeLength <= 1) {
            return true;
        }

        // Ignore whitespace-only
        if (change.text.trim() === '' && change.rangeLength > 0) {
            return true;
        }

        // Ignore very small changes (<3 characters)
        if (change.text.length < 3 && change.rangeLength < 3) {
            return true;
        }

        return false;
    }

    /**
     * Classify edit type
     */
    private classifyEdit(change: vscode.TextDocumentContentChangeEvent): EditType {
        const oldLength = change.rangeLength;
        const newLength = change.text.length;

        if (oldLength === 0 && newLength > 0) {
            return 'insert';
        }
        if (oldLength > 0 && newLength === 0) {
            return 'delete';
        }
        // Check if whitespace-only change
        if (this.isOnlyWhitespaceChange(change)) {
            return 'format';
        }
        return 'replace';
    }

    /**
     * Check if change is whitespace-only
     */
    private isOnlyWhitespaceChange(change: vscode.TextDocumentContentChangeEvent): boolean {
        // If we had the old text, we could compare
        // For now, assume format if text is whitespace
        return change.text.trim() === '';
    }

    /**
     * Get old text from document (before change)
     * Note: This is approximate since we don't have undo stack
     */
    private getOldText(document: vscode.TextDocument, change: vscode.TextDocumentContentChangeEvent): string {
        // For now, return empty (would need undo tracking for accurate old text)
        // Alternative: Track document snapshots
        return '';
    }

    /**
     * Cleanup old edits
     */
    private cleanup(): void {
        const config = this.configService.getConfig();
        const maxEditsPerFile = config['puku.inlineEdit.context.history.maxEdits'] ?? 10;
        const maxAgeMinutes = config['puku.inlineEdit.context.history.maxAgeMinutes'] ?? 30;
        const maxGlobalEdits = config['puku.inlineEdit.context.history.maxGlobalEdits'] ?? 50;

        const cutoffTime = Date.now() - (maxAgeMinutes * 60 * 1000);

        // Cleanup per-file edits
        for (const [uri, edits] of this._edits.entries()) {
            // Remove old edits
            const recentEdits = edits.filter(edit => edit.timestamp > cutoffTime);

            // Keep only last N edits
            const trimmedEdits = recentEdits.slice(-maxEditsPerFile);

            if (trimmedEdits.length === 0) {
                this._edits.delete(uri);
            } else {
                this._edits.set(uri, trimmedEdits);
            }
        }

        // Cleanup global edits
        const recentGlobal = this._globalEdits.filter(edit => edit.timestamp > cutoffTime);
        this._globalEdits.length = 0;
        this._globalEdits.push(...recentGlobal.slice(-maxGlobalEdits));
    }
}
```

---

## Test Cases

### Unit Tests

| Test Case | Input | Expected Output |
|-----------|-------|-----------------|
| Track insert | Insert "hello" | `editType: 'insert'` |
| Track delete | Delete 10 chars | `editType: 'delete'` |
| Track replace | Replace "foo" with "bar" | `editType: 'replace'` |
| Ignore single char | Type "a" | No edit tracked |
| Ignore whitespace | Add spaces | `editType: 'format'` or ignored |
| Per-file limit | 15 edits | Only last 10 kept |
| Time limit | Edit 40 min ago | Removed from history |
| Clear on close | Close document | History cleared |

### Integration Tests

| Test Case | Expected Behavior |
|-----------|-------------------|
| Multiple files | Each file has separate history |
| Selection tracking | Selection associated with recent edit |
| Global edits | Returns edits across all files |
| Cleanup interval | Old edits removed every 5 minutes |

---

## Example Usage

```typescript
// Get recent edits for current file
const tracker = serviceCollection.get(IEditHistoryTracker);
const currentFileEdits = tracker.getRecentEdits(document.uri, 5);

// Format for context
const historyContext = currentFileEdits.map(edit => ({
    timestamp: new Date(edit.timestamp).toISOString(),
    type: edit.editType,
    description: this.formatEditDescription(edit),
    code: edit.newText,
}));

// Add to inline edit prompt
const prompt = `
RECENT EDITS:
${historyContext.map(ctx => `
  [${ctx.timestamp}] ${ctx.type}: ${ctx.description}
  \`\`\`
  ${ctx.code}
  \`\`\`
`).join('\n')}

USER INSTRUCTION: ${userInstruction}
`;
```

**Example Output:**
```
RECENT EDITS:
  [2025-01-15T10:30:42Z] insert: Added error handling
  ```typescript
  try {
      const result = await loginUser(credentials);
      return result;
  } catch (error) {
      console.error('Login failed:', error);
      throw error;
  }
  ```

  [2025-01-15T10:29:15Z] replace: Modified return type
  ```typescript
  async function loginUser(credentials: Credentials): Promise<User>
  ```

USER INSTRUCTION: Add error handling like the login function
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Edit tracking overhead | <5ms | Async, non-blocking |
| History lookup | <10ms | In-memory Map lookup |
| Memory usage | <5MB | ~50 edits × 100KB each |
| Cleanup interval | 5 minutes | Remove old edits |

---

## Success Criteria

- [ ] Tracks document changes via VS Code API
- [ ] Classifies edit types (insert, delete, replace, format)
- [ ] Limits history per file (10 edits) and globally (50 edits)
- [ ] Removes edits older than 30 minutes
- [ ] Associates selections with recent edits
- [ ] Ignores trivial edits (single chars, whitespace)
- [ ] Clears history on file close
- [ ] Unit tests (>80% coverage)
- [ ] Performance <10ms for lookups

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `IEditHistoryTracker` interface
- [ ] Implement `EditHistoryTracker` class
- [ ] Listen to `onDidChangeTextDocument`
- [ ] Implement edit classification
- [ ] Add per-file history tracking
- [ ] Add global history tracking
- [ ] Implement cleanup logic
- [ ] Add selection tracking
- [ ] Implement `shouldIgnoreEdit()` filter
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Add configuration support

---

## Configuration

```json
{
  "puku.inlineEdit.context.history.enabled": true,
  "puku.inlineEdit.context.history.maxEdits": 10,
  "puku.inlineEdit.context.history.maxGlobalEdits": 50,
  "puku.inlineEdit.context.history.maxAgeMinutes": 30,
  "puku.inlineEdit.context.history.ignoreWhitespace": true,
  "puku.inlineEdit.context.history.ignoreSingleChar": true
}
```

---

## Related Documents

- `00-overview.md` - Project overview
- `02-history-context-provider.md` - Uses edit history for context
- `05-context-aggregator.md` - Aggregates history with other context

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 4 hours
**Owner**: TBD
