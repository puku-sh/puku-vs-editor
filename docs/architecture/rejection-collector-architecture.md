# RejectionCollector System Design

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2025-12-18
**Reference**: `vscode-copilot-chat/src/extension/inlineEdits/common/rejectionCollector.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Design](#component-design)
4. [Data Structures](#data-structures)
5. [Algorithms](#algorithms)
6. [Examples](#examples)
7. [Performance](#performance)
8. [Testing Strategy](#testing-strategy)

---

## Overview

### Purpose

The RejectionCollector prevents users from seeing the same rejected inline edit suggestions repeatedly by tracking rejections across document changes and maintaining them through edit rebasing.

### Key Features

1. **Rejection Tracking**: Store rejected edits per document
2. **Edit Normalization**: Remove common prefix/suffix for accurate matching
3. **Edit Rebasing**: Update rejections when document changes
4. **LRU Eviction**: Prevent unbounded memory growth
5. **Fuzzy Matching**: Catch variations of same edit

### Design Principles

- **Match Reference**: Follow `vscode-copilot-chat` implementation exactly
- **Memory Efficiency**: LRU eviction with 20-document limit
- **Performance**: <5ms for `reject()` and `isRejected()`
- **Correctness**: Never show same rejection twice

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NES SYSTEM WITH                           │
│                  REJECTION TRACKING                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐                                       │
│  │ PukuNesProvider  │                                       │
│  │                  │                                       │
│  │  getNextEdit()   │────────┐                             │
│  │  handleRejection│        │                             │
│  └──────────────────┘        │                             │
│           │                   │                             │
│           │                   ▼                             │
│           │          ┌─────────────────┐                   │
│           │          │ RejectionCollec│                   │
│           │          │                 │                   │
│           │          │  reject()       │                   │
│           │          │  isRejected()   │                   │
│           │          └─────────────────┘                   │
│           │                   │                             │
│           │                   │                             │
│           ▼                   ▼                             │
│  ┌─────────────────────────────────────┐                  │
│  │      ObservableWorkspace            │                  │
│  │                                      │                  │
│  │  • Document lifecycle                │                  │
│  │  • Content observation              │                  │
│  │  • Edit events                       │                  │
│  └─────────────────────────────────────┘                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
RejectionCollector
├── _documentCaches: Map<DocumentId, DocumentRejectionTracker>
│   └── Per-document rejection tracking
├── _garbageCollector: LRUGarbageCollector
│   └── Memory management (20 documents max)
└── _tracer: ITracer
    └── Logging and debugging

DocumentRejectionTracker
├── _rejectedEdits: Set<RejectedEdit>
│   └── All rejections for this document
├── doc: IObservableDocument
│   └── Current document content
├── _garbageCollector: LRUGarbageCollector
│   └── Shared LRU instance
└── _tracer: ITracer
    └── Shared tracer

RejectedEdit (IDisposable)
├── _edit: StringEdit
│   └── Normalized edit representation
└── _onDispose: () => void
    └── Cleanup callback

LRUGarbageCollector (IDisposable)
├── _disposables: IDisposable[]
│   └── LRU queue of rejected edits
└── _maxSize: number
    └── Maximum entries (20)
```

---

## Component Design

### 1. RejectionCollector

**Responsibility**: Main facade for rejection tracking

**Public API**:
```typescript
class RejectionCollector extends Disposable {
    constructor(
        workspace: ObservableWorkspace,
        trace: (s: string) => void
    )

    // Mark an edit as rejected
    reject(docId: DocumentId, edit: StringReplacement): void

    // Check if edit was previously rejected
    isRejected(docId: DocumentId, edit: StringReplacement): boolean

    // Clear all rejections
    clear(): void
}
```

**Key Behaviors**:

1. **Initialization**:
   - Subscribe to `workspace.openDocuments`
   - Create `DocumentRejectionTracker` for each document
   - Auto-cleanup when document closes

2. **Rejection**:
   - Get document cache
   - Normalize edit (remove common prefix/suffix)
   - Delegate to `DocumentRejectionTracker`

3. **Checking**:
   - Get document cache
   - Normalize edit
   - Check against tracked rejections

**Reference Code**:
```typescript
// vscode-copilot-chat: rejectionCollector.ts:15-74
export class RejectionCollector extends Disposable {
    private readonly _garbageCollector = this._register(new LRUGarbageCollector(20));
    private readonly _documentCaches = new Map<DocumentId, DocumentRejectionTracker>();
    private readonly _tracer: ITracer;

    constructor(
        public readonly workspace: ObservableWorkspace,
        trace: (s: string) => void,
    ) {
        super();
        this._tracer = createTracer(['NES', 'RejectionCollector'], trace);

        // Auto-track documents
        mapObservableArrayCached(this, workspace.openDocuments, (doc, store) => {
            const state = new DocumentRejectionTracker(doc, this._garbageCollector, this._tracer);
            this._documentCaches.set(state.doc.id, state);

            // Listen to edits
            store.add(autorunWithChanges(this, {
                value: doc.value,
                selection: doc.selection,
                languageId: doc.languageId,
            }, (data) => {
                for (const edit of data.value.changes) {
                    state.handleEdit(edit, data.value.value);
                }
            }));

            // Cleanup on close
            store.add(toDisposable(() => {
                this._documentCaches.delete(doc.id);
            }));
        }).recomputeInitiallyAndOnChange(this._store);
    }

    public reject(docId: DocumentId, edit: StringReplacement): void {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            this._tracer.trace(`Rejecting, no document cache: ${edit}`);
            return;
        }
        const e = edit.removeCommonSuffixAndPrefix(docCache.doc.value.get().value);
        this._tracer.trace(`Rejecting: ${e}`);
        docCache.reject(e);
    }

    public isRejected(docId: DocumentId, edit: StringReplacement): boolean {
        const docCache = this._documentCaches.get(docId);
        if (!docCache) {
            this._tracer.trace(`Checking rejection, no document cache: ${edit}`);
            return false;
        }
        const e = edit.removeCommonSuffixAndPrefix(docCache.doc.value.get().value);
        const isRejected = docCache.isRejected(e);
        this._tracer.trace(`Checking rejection, ${isRejected ? 'rejected' : 'not rejected'}: ${e}`);
        return isRejected;
    }
}
```

### 2. DocumentRejectionTracker

**Responsibility**: Track rejections for a single document

**API**:
```typescript
class DocumentRejectionTracker {
    constructor(
        doc: IObservableDocument,
        garbageCollector: LRUGarbageCollector,
        tracer: ITracer
    )

    // Handle document edit (rebase rejections)
    handleEdit(edit: StringEdit, currentContent: StringText): void

    // Add rejection
    reject(edit: StringReplacement): void

    // Check if edit is rejected
    isRejected(edit: StringReplacement): boolean
}
```

**Key Behaviors**:

1. **Rejection Storage**:
   - Store as `Set<RejectedEdit>`
   - Each rejection is a `RejectedEdit` instance

2. **Edit Handling**:
   - On document edit, rebase all rejections
   - Remove rejections that fail rebasing

3. **Deduplication**:
   - Check if rejection already tracked before adding

**Reference Code**:
```typescript
// vscode-copilot-chat: rejectionCollector.ts:76-113
class DocumentRejectionTracker {
    private readonly _rejectedEdits = new Set<RejectedEdit>();

    constructor(
        public readonly doc: IObservableDocument,
        private readonly _garbageCollector: LRUGarbageCollector,
        private readonly _tracer: ITracer,
    ) {}

    public handleEdit(edit: StringEdit, currentContent: StringText): void {
        for (const r of [...this._rejectedEdits]) {
            r.handleEdit(edit, currentContent); // can remove from set
        }
    }

    public reject(edit: StringReplacement): void {
        if (this.isRejected(edit)) {
            // already tracked
            return;
        }
        const r = new RejectedEdit(edit.toEdit(), () => {
            this._tracer.trace(`Evicting: ${edit}`);
            this._rejectedEdits.delete(r);
        });
        this._rejectedEdits.add(r);
        this._garbageCollector.put(r);
    }

    public isRejected(edit: StringReplacement): boolean {
        for (const r of this._rejectedEdits) {
            if (r.isRejected(edit)) {
                return true;
            }
        }
        return false;
    }
}
```

### 3. RejectedEdit

**Responsibility**: Represent a single rejected edit with rebasing

**API**:
```typescript
class RejectedEdit implements IDisposable {
    constructor(
        edit: StringEdit,
        onDispose: () => void
    )

    // Update rejection when document changes
    handleEdit(edit: StringEdit, currentContent: StringText): void

    // Check if given edit matches this rejection
    isRejected(edit: StringReplacement): boolean

    // Remove this rejection
    dispose(): void
}
```

**Key Behaviors**:

1. **Rebasing**:
   - Call `this._edit.tryRebase(edit)`
   - If succeeds, update `_edit` with rebased version
   - If fails, call `dispose()` to remove rejection

2. **Matching**:
   - Convert `StringReplacement` to `StringEdit`
   - Compare using `this._edit.equals()`

**Reference Code**:
```typescript
// vscode-copilot-chat: rejectionCollector.ts:115-137
class RejectedEdit implements IDisposable {
    constructor(
        private _edit: StringEdit,
        private readonly _onDispose: () => void,
    ) {}

    public handleEdit(edit: StringEdit, currentContent: StringText): void {
        const d = this._edit.tryRebase(edit);
        if (d) {
            this._edit = d.removeCommonSuffixAndPrefix(currentContent.value);
        } else {
            this.dispose();
        }
    }

    public isRejected(edit: StringReplacement): boolean {
        return this._edit.equals(edit.toEdit());
    }

    public dispose(): void {
        this._onDispose();
    }
}
```

### 4. LRUGarbageCollector

**Responsibility**: Evict old rejections to prevent memory growth

**API**:
```typescript
class LRUGarbageCollector implements IDisposable {
    constructor(maxSize: number)

    // Add disposable (evict oldest if over limit)
    put(disposable: IDisposable): void

    // Clear all
    clear(): void

    // Dispose all
    dispose(): void
}
```

**Key Behaviors**:

1. **LRU Eviction**:
   - Maintain array of disposables
   - When size > maxSize, `shift()` and `dispose()`

2. **Cleanup**:
   - `clear()` disposes all without removing
   - `dispose()` calls `clear()` for cleanup

**Reference Code**:
```typescript
// vscode-copilot-chat: rejectionCollector.ts:139-164
class LRUGarbageCollector implements IDisposable {
    private _disposables: IDisposable[] = [];

    constructor(private _maxSize: number) {}

    put(disposable: IDisposable): void {
        this._disposables.push(disposable);
        if (this._disposables.length > this._maxSize) {
            this._disposables.shift()!.dispose();
        }
    }

    public clear(): void {
        for (const d of this._disposables) {
            d.dispose();
        }
        this._disposables = [];
    }

    public dispose(): void {
        this.clear();
    }
}
```

---

## Data Structures

### Internal State

```typescript
// RejectionCollector
{
    _documentCaches: Map<DocumentId, DocumentRejectionTracker>
    // Example:
    // "file:///src/foo.ts" => DocumentRejectionTracker {
    //     _rejectedEdits: Set<RejectedEdit> [
    //         RejectedEdit { _edit: StringEdit(...) },
    //         RejectedEdit { _edit: StringEdit(...) }
    //     ]
    // }

    _garbageCollector: LRUGarbageCollector {
        _disposables: [
            RejectedEdit,  // oldest
            RejectedEdit,
            ...
            RejectedEdit   // newest
        ]
    }
}
```

### Memory Footprint Example

```
Document: 1000 lines, 50KB
Rejection: ~100 bytes (StringEdit)

Max memory:
- 20 documents
- ~20 rejections per document (LRU limit)
- 20 * 20 * 100 bytes = 40KB
- Plus overhead: ~2MB total
```

---

## Algorithms

### 1. Rejection Algorithm

```
function reject(docId, edit):
    1. Get document cache for docId
    2. If no cache, return (document not tracked)
    3. Normalize edit:
       - e = edit.removeCommonSuffixAndPrefix(currentContent)
    4. Check if already rejected:
       - If yes, return (dedup)
    5. Create RejectedEdit:
       - r = new RejectedEdit(e.toEdit(), onDispose)
    6. Add to set:
       - cache._rejectedEdits.add(r)
    7. Add to LRU:
       - garbageCollector.put(r)  // evicts oldest if > 20
```

**Time Complexity**: O(1) average, O(n) worst case (normalization)
**Space Complexity**: O(1) per rejection

### 2. Checking Algorithm

```
function isRejected(docId, edit):
    1. Get document cache for docId
    2. If no cache, return false
    3. Normalize edit:
       - e = edit.removeCommonSuffixAndPrefix(currentContent)
    4. For each rejection in cache._rejectedEdits:
       - If rejection.isRejected(e), return true
    5. Return false
```

**Time Complexity**: O(m) where m = number of rejections (~20)
**Space Complexity**: O(1)

### 3. Rebasing Algorithm

```
function handleEdit(documentEdit, currentContent):
    1. For each rejection in _rejectedEdits (copy set to avoid modification during iteration):
        a. Try to rebase:
           - rebased = rejection._edit.tryRebase(documentEdit)
        b. If rebasing succeeds:
           - rejection._edit = rebased.removeCommonSuffixAndPrefix(currentContent)
        c. If rebasing fails:
           - rejection.dispose()  // removes from set
```

**Time Complexity**: O(m * k) where k = complexity of tryRebase
**Space Complexity**: O(1)

### 4. Edit Normalization

```
function removeCommonSuffixAndPrefix(edit, content):
    1. Find common prefix length:
       - prefix = 0
       - while content[offset + prefix] == edit.newText[prefix]:
           - prefix++
    2. Find common suffix length:
       - suffix = 0
       - while content[end - suffix] == edit.newText[end - suffix]:
           - suffix++
    3. Return edit with prefix and suffix removed
```

**Example**:
```
Content: "const x = 1"
Edit: "const x: number = 1"

Common prefix: "const x"
Common suffix: " = 1"
Normalized: ": number"
```

---

## Examples

### Example 1: Basic Rejection Tracking

**Scenario**: User rejects type annotation suggestion

```typescript
// Initial state
document.content = "const x = 1"
rejectionCollector._documentCaches.size = 0

// User gets suggestion
suggestion = "const x: number = 1"
edit = StringReplacement(offset=7, length=0, newText=": number")

// User rejects (Esc)
rejectionCollector.reject(docId, edit)

// Internal state after rejection
rejectionCollector._documentCaches = {
    "file:///test.ts" => DocumentRejectionTracker {
        _rejectedEdits: Set [
            RejectedEdit {
                _edit: StringEdit([
                    StringReplacement(offset=7, length=0, newText=": number")
                ])
            }
        ]
    }
}

// Next time same suggestion appears
isRejected = rejectionCollector.isRejected(docId, edit)
// Returns: true

// Provider skips this suggestion
if (isRejected) {
    return null; // Don't show
}
```

### Example 2: Edit Rebasing

**Scenario**: User makes an edit after rejecting a suggestion

```typescript
// Initial state
document.content = "const x = 1"
rejectedEdit._edit = StringEdit([
    StringReplacement(offset=7, length=0, newText=": number")
])

// User adds a line before
document.insertLine(0, "// Comment\n")

// Document edit event
documentEdit = StringEdit([
    StringReplacement(offset=0, length=0, newText="// Comment\n")
])

// RejectionCollector handles edit
documentTracker.handleEdit(documentEdit, newContent)

// RejectedEdit rebases itself
rebasedEdit = rejectedEdit._edit.tryRebase(documentEdit)
// New offset: 7 + "// Comment\n".length = 18

rejectedEdit._edit = StringEdit([
    StringReplacement(offset=18, length=0, newText=": number")
])

// Rejection still works at new offset
newSuggestion = "const x: number = 1" // at line 2
isRejected = rejectionCollector.isRejected(docId, newSuggestion)
// Returns: true (rebased rejection matches!)
```

### Example 3: Fuzzy Matching with Normalization

**Scenario**: User rejects suggestion, then sees slightly different version

```typescript
// User rejects this
edit1 = "const x: number = 1"
rejectionCollector.reject(docId, edit1)

// Normalized and stored as
normalized1 = ": number"  // common prefix/suffix removed

// Later, user gets this (whitespace difference)
edit2 = "const x:number = 1"  // no space after colon
normalized2 = ":number"  // also no space

// Check rejection
isRejected = rejectionCollector.isRejected(docId, edit2)
// Returns: false (different because normalization preserves whitespace)

// To catch this variation, need exact match after normalization
// This is by design - only reject exact patterns
```

### Example 4: LRU Eviction

**Scenario**: Rejection tracking hits memory limit

```typescript
// LRU capacity = 20 rejections

// Add 21 rejections
for (i = 0; i < 21; i++) {
    edit = createRejection(i)
    rejectionCollector.reject(docId, edit)
}

// Internal state
garbageCollector._disposables = [
    rejection1,   // evicted when rejection21 added!
    rejection2,
    ...
    rejection21
]

// Check first rejection
isRejected = rejectionCollector.isRejected(docId, edit0)
// Returns: false (evicted)

// Check second rejection
isRejected = rejectionCollector.isRejected(docId, edit1)
// Returns: true (still tracked)
```

---

## Performance

### Benchmarks (Expected)

| Operation | Time | Space | Notes |
|-----------|------|-------|-------|
| `reject()` | <5ms | 100 bytes | Per rejection |
| `isRejected()` | <5ms | 0 bytes | Read-only |
| `handleEdit()` | <10ms | 0 bytes | Per rejection * O(tryRebase) |
| Document close | <1ms | -100KB | Cleanup |

### Scalability

```
Worst-case scenario:
- 20 documents open
- 20 rejections per document
- Total: 400 rejections tracked
- Memory: ~2MB

Typical scenario:
- 5 documents with rejections
- 5 rejections per document
- Total: 25 rejections
- Memory: ~500KB
```

### Optimizations

1. **LRU Eviction**: Prevents unbounded growth
2. **Normalization**: Reduces storage size
3. **Set-based Storage**: O(1) average lookup
4. **Early Exit**: Return on first match in `isRejected()`

---

## Testing Strategy

### Unit Tests

```typescript
describe('RejectionCollector', () => {
    it('should track rejected edits', () => {
        const collector = new RejectionCollector(workspace, trace);
        const edit = StringReplacement.create(...);

        collector.reject(docId, edit);

        expect(collector.isRejected(docId, edit)).toBe(true);
    });

    it('should not flag non-rejected edits', () => {
        const collector = new RejectionCollector(workspace, trace);
        const edit1 = StringReplacement.create(...);
        const edit2 = StringReplacement.create(/* different */);

        collector.reject(docId, edit1);

        expect(collector.isRejected(docId, edit2)).toBe(false);
    });

    it('should rebase rejections on document edit', () => {
        const collector = new RejectionCollector(workspace, trace);
        const edit = StringReplacement.create(offset=10, ...);

        collector.reject(docId, edit);

        // Insert text before rejection
        document.insert(0, "// Comment\n");

        // Rejection should still work at new offset
        const rebasedEdit = StringReplacement.create(offset=10+12, ...);
        expect(collector.isRejected(docId, rebasedEdit)).toBe(true);
    });

    it('should remove rejections that fail rebasing', () => {
        const collector = new RejectionCollector(workspace, trace);
        const edit = StringReplacement.create(offset=10, length=5, ...);

        collector.reject(docId, edit);

        // Delete the region where rejection was
        document.delete(8, 7);

        // Rejection should be gone (can't rebase)
        expect(collector.isRejected(docId, edit)).toBe(false);
    });

    it('should evict oldest rejections when LRU limit hit', () => {
        const collector = new RejectionCollector(workspace, trace);

        // Add 21 rejections (limit is 20)
        for (let i = 0; i < 21; i++) {
            collector.reject(docId, createEdit(i));
        }

        // First rejection should be evicted
        expect(collector.isRejected(docId, createEdit(0))).toBe(false);
        expect(collector.isRejected(docId, createEdit(1))).toBe(true);
    });

    it('should normalize edits before storing', () => {
        const collector = new RejectionCollector(workspace, trace);

        // Edit with common prefix/suffix
        const edit = StringReplacement.create(
            offset=0,
            length=11,
            newText="const x: number = 1"
        );

        collector.reject(docId, edit);

        // Stored as normalized (": number")
        // Check against original edit
        expect(collector.isRejected(docId, edit)).toBe(true);
    });

    it('should clear all rejections', () => {
        const collector = new RejectionCollector(workspace, trace);

        collector.reject(docId, edit1);
        collector.reject(docId, edit2);

        collector.clear();

        expect(collector.isRejected(docId, edit1)).toBe(false);
        expect(collector.isRejected(docId, edit2)).toBe(false);
    });
});
```

### Integration Tests

```typescript
describe('RejectionCollector Integration', () => {
    it('should integrate with PukuNesNextEditProvider', async () => {
        const provider = new PukuNesNextEditProvider(...);

        // Get suggestion
        const result1 = await provider.getNextEdit(docId, context, token);
        expect(result1).toBeDefined();

        // Reject it
        provider.handleRejection(docId, result1);

        // Same suggestion should not appear again
        const result2 = await provider.getNextEdit(docId, context, token);
        expect(result2).toBeNull();
    });

    it('should work across document edits', async () => {
        const provider = new PukuNesNextEditProvider(...);

        // Get and reject suggestion at line 10
        const result1 = await provider.getNextEdit(docId, context, token);
        provider.handleRejection(docId, result1);

        // User adds lines before
        document.insertLine(0, "// Comment");

        // Same suggestion at line 11 should be rejected
        const result2 = await provider.getNextEdit(docId, context, token);
        expect(result2).toBeNull();
    });
});
```

---

## File Structure

```
src/chat/src/extension/pukuai/
├── common/
│   └── rejectionCollector.ts           # Main implementation
│       ├── RejectionCollector          # Public facade
│       ├── DocumentRejectionTracker    # Per-document tracking
│       ├── RejectedEdit                # Individual rejection
│       └── LRUGarbageCollector         # Memory management
│
├── vscode-node/
│   └── providers/
│       └── pukuNesNextEditProvider.ts  # Integration point
│
└── test/
    └── rejectionCollector.spec.ts      # Unit tests
```

---

## References

- **Reference Implementation**: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/common/rejectionCollector.ts`
- **Related**: NextEditCache (`nextEditCache.ts`)
- **Related**: NES Debouncing (`nes-debouncing-architecture.md`)
- **PRD**: `docs/prd/rejection-collector-prd.md`
