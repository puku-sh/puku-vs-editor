# Issue #58 Breakdown: Edit Rebasing Cache

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Total Effort**: 13 hours
**Status**: Divided into 7 sub-issues

---

## Overview

Edit Rebasing Cache is broken down into 7 incremental sub-issues, each independently testable and reviewable. This approach reduces risk, enables parallel work, and allows for early feedback.

---

## Sub-Issues Summary

| # | Name | Effort | Complexity | Depends On | Can Ship? |
|---|------|--------|------------|------------|-----------|
| [#58.1](#581---stringedit-utilities) | StringEdit Utilities | 2h | 🟢 Easy | None | No |
| [#58.2](#582---document-edit-tracking) | Document Edit Tracking | 2h | 🟢 Easy | #58.1 | No |
| [#58.3](#583---edit-composition-in-cache) | Edit Composition in Cache | 2h | 🟡 Medium | #58.1, #58.2 | No |
| [#58.4](#584---rebase-algorithm) | Rebase Algorithm | 3h | 🟡 Medium | #58.1 | No |
| [#58.5](#585---cache-lookup-with-rebase) | Cache Lookup with Rebase | 2h | 🟡 Medium | #58.1-4 | ✅ Yes |
| [#58.6](#586---provider-integration) | Provider Integration | 1h | 🟢 Easy | #58.1-5 | ✅ Yes |
| [#58.7](#587---performance-validation) | Performance Validation | 1h | 🟢 Easy | #58.6 | ✅ Yes |

**Total**: 13 hours (vs 6-9h original with buffer)

---

## Dependency Graph

```
#58.1 (StringEdit)
  ├──→ #58.2 (Edit Tracking) ───┐
  │                              ↓
  ├──→ #58.4 (Rebase Algo) ──→ #58.5 (Cache Lookup) → #58.6 (Provider) → #58.7 (Validation)
  │                              ↑
  └──→ #58.3 (Edit Composition)─┘
```

**Parallelizable**:
- #58.2 and #58.4 can be done in parallel (both depend only on #58.1)
- #58.3 can start after #58.2 completes

---

## #58.1 - StringEdit Utilities

**Effort**: 2 hours | **Complexity**: 🟢 Easy | **Depends On**: None

### Summary
Copy and adapt edit algebra utilities from Copilot reference code.

### Deliverables
- ✅ `OffsetRange` class (character ranges in strings)
- ✅ `StringReplacement` class (single text replacement)
- ✅ `StringEdit` class (composition of replacements)
- ✅ 10+ unit tests with >90% coverage

### Key Classes

```typescript
// Represents [start, end) range
class OffsetRange {
    constructor(start: number, endExclusive: number)
    contains(offset: number): boolean
    containsRange(other: OffsetRange): boolean
    delta(offset: number): OffsetRange // Shift by offset
}

// Single replacement operation
class StringReplacement {
    constructor(replaceRange: OffsetRange, newText: string)
    apply(text: string): string
    delta(offset: number): StringReplacement
}

// Composed edit operations
class StringEdit {
    constructor(replacements: StringReplacement[])
    apply(text: string): string
    compose(other: StringEdit): StringEdit
    static empty(): StringEdit
}
```

### Example Usage

```typescript
const text = 'hello world';
const edit = StringEdit.single(
    new StringReplacement(new OffsetRange(6, 11), 'everyone')
);
const result = edit.apply(text); // "hello everyone"
```

### Files
- `src/chat/src/extension/pukuai/common/stringEdit.ts` (NEW - 300 lines)
- `src/chat/src/extension/pukuai/test/stringEdit.spec.ts` (NEW - 200 lines)

### Reference
- Copilot: `src/vscode/reference/vscode-copilot-chat/src/util/vs/editor/common/core/edits/stringEdit.ts`

**Detailed spec**: `issue-58-1-stringedit-utilities.md`

---

## #58.2 - Document Edit Tracking

**Effort**: 2 hours | **Complexity**: 🟢 Easy | **Depends On**: #58.1

### Summary
Listen to VS Code document change events and convert to `StringEdit` format.

### Deliverables
- ✅ `DocumentEditTracker` class
- ✅ Subscribes to `vscode.workspace.onDidChangeTextDocument`
- ✅ Converts `TextDocumentChangeEvent` → `StringEdit`
- ✅ Stores per-document edit history (max 100 edits)
- ✅ Logs all edits to console

### Key Classes

```typescript
class DocumentEditTracker implements vscode.Disposable {
    constructor()
    getEditHistory(uri: string): DocumentEditHistory | undefined
    getEditsSince(uri: string, timestamp: number): StringEdit
    clearHistory(uri: string): void
    dispose(): void
}

class DocumentEditHistory {
    addEdit(edit: StringEdit): void
    getEditsSince(timestamp: number): StringEdit
    getAllEdits(): StringEdit
    get size(): number
}
```

### Example Usage

```typescript
const tracker = new DocumentEditTracker();

// Automatically tracks all edits, logs to console:
// [DocumentEditTracker] file:///test.ts: 1 replacement(s)
//   - Replace [10, 15) with "test"

// Later, get edit history
const history = tracker.getEditHistory(document.uri.toString());
console.log(`${history.size} edits tracked`);
```

### Console Output Example

```
[DocumentEditTracker] Initialized
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [0, 0) with "// New comment\n"
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [50, 75) with ""
```

### Files
- `src/chat/src/extension/pukuai/common/documentEditTracker.ts` (NEW - 200 lines)
- `src/chat/src/extension/pukuai/test/documentEditTracker.spec.ts` (NEW - 250 lines)

**Detailed spec**: `issue-58-2-document-edit-tracking.md`

---

## #58.3 - Edit Composition in Cache

**Effort**: 2 hours | **Complexity**: 🟡 Medium | **Depends On**: #58.1, #58.2

### Summary
Store edit history in cache entries and compose edits on document changes.

### Deliverables
- ✅ Add fields to `CompletionsCacheContents`:
  - `documentBeforeEdit?: string`
  - `userEditSince?: StringEdit`
  - `editWindow?: OffsetRange`
  - `rebaseFailed?: boolean`
- ✅ Modify `CompletionsCache.append()` to store document snapshot
- ✅ Hook up `DocumentEditTracker` to compose edits into cache entries
- ✅ No rebase logic yet (just tracking)

### Enhanced Cache Structure

```typescript
interface CompletionsCacheContents {
    content: {
        suffix: string;
        completions: string[];

        // NEW: Edit tracking fields
        documentBeforeEdit?: string;      // Document when cached
        userEditSince?: StringEdit;       // All edits since cache
        editWindow?: OffsetRange;         // Valid region for completion
        rebaseFailed?: boolean;           // Rebase attempted but failed
    }[];
}
```

### Example

```typescript
// When caching completion
cache.append(prefix, suffix, completions, document, position);
// Internally stores:
// - documentBeforeEdit: document.getText()
// - userEditSince: StringEdit.empty()
// - editWindow: computed from prefix/suffix

// On document change
tracker.onEdit(edit => {
    for (const entry of cache.entries) {
        entry.userEditSince = entry.userEditSince.compose(edit);
        entry.rebaseFailed = false; // Reset
    }
});
```

### Files
- `src/chat/src/extension/pukuai/common/completionsCache.ts` (MODIFIED - add fields)
- `src/chat/src/extension/pukuai/test/completionsCache.spec.ts` (MODIFIED - test edit composition)

---

## #58.4 - Rebase Algorithm

**Effort**: 3 hours | **Complexity**: 🟡 Medium | **Depends On**: #58.1

### Summary
Implement core rebasing logic to adjust cached completions for user edits.

### Deliverables
- ✅ `tryRebase()` function (main entry point)
- ✅ `tryRebaseEdits()` helper (core algorithm)
- ✅ `checkEditConsistency()` validator
- ✅ 20+ test cases from Copilot suite
- ✅ Not integrated with cache yet (pure algorithm)

### Core Algorithm

```typescript
function tryRebase(
    originalDocument: string,
    editWindow: OffsetRange | undefined,
    originalEdit: StringReplacement,
    userEditSince: StringEdit,
    currentDocumentContent: string,
    currentSelection: readonly OffsetRange[],
    resolution: 'strict' | 'lenient'
): StringReplacement | 'rebaseFailed' | 'outsideEditWindow' | 'inconsistentEdits' {

    // 1. Verify edit consistency
    if (!checkEditConsistency(originalDocument, userEditSince, currentDocumentContent)) {
        return 'inconsistentEdits';
    }

    // 2. Check cursor still in edit window
    if (editWindow) {
        const updatedWindow = userEditSince.applyToOffsetRange(editWindow);
        if (!updatedWindow?.containsRange(currentSelection[0])) {
            return 'outsideEditWindow';
        }
    }

    // 3. Rebase the edit
    let offset = 0;
    for (const userEdit of userEditSince.replacements) {
        // Case 1: Edit BEFORE our cached position
        if (userEdit.replaceRange.endExclusive <= originalEdit.replaceRange.start) {
            offset += userEdit.newText.length - userEdit.replaceRange.length;
        }
        // Case 2: Edit AFTER our cached position
        else if (userEdit.replaceRange.start >= originalEdit.replaceRange.endExclusive) {
            // No effect
        }
        // Case 3: Edit OVERLAPS (conflict)
        else {
            if (resolution === 'strict') {
                return 'rebaseFailed';
            }
        }
    }

    // Return adjusted edit
    return new StringReplacement(
        originalEdit.replaceRange.delta(offset),
        originalEdit.newText
    );
}
```

### Test Scenarios

```typescript
suite('tryRebase', () => {
    test('should rebase when user adds lines above', () => {
        // Original: completion at line 3
        // User: adds 3 lines at line 1
        // Expected: completion rebased to line 6
    });

    test('should fail on conflicting edit', () => {
        // Original: completion replaces "1" with "42"
        // User: already typed "99" at same position
        // Expected: 'rebaseFailed'
    });

    test('should return outsideEditWindow', () => {
        // Original: completion for lines 10-15
        // User: cursor moved to line 50
        // Expected: 'outsideEditWindow'
    });
});
```

### Files
- `src/chat/src/extension/pukuai/common/editRebase.ts` (NEW - 300 lines)
- `src/chat/src/extension/pukuai/test/editRebase.spec.ts` (NEW - 400 lines)

### Reference
- Copilot: `src/vscode/reference/vscode-copilot-chat/src/extension/inlineEdits/common/editRebase.ts`

---

## #58.5 - Cache Lookup with Rebase

**Effort**: 2 hours | **Complexity**: 🟡 Medium | **Depends On**: #58.1-4

### Summary
Integrate rebase algorithm into cache lookup logic.

### Deliverables
- ✅ Modify `CompletionsCache.findAll()` to call rebase
- ✅ Implement `tryRebaseCacheEntry()` private method
- ✅ Handle rebase results: success, failed, outsideWindow, inconsistent
- ✅ Update `rebaseFailed` flag on conflicts
- ✅ Log rebase attempts for debugging

### Enhanced findAll()

```typescript
class CompletionsCache {
    findAll(
        prefix: string,
        suffix: string,
        document: vscode.TextDocument,
        position: vscode.Position
    ): string[][] {
        // 1. Try exact prefix match
        const exactMatches = this.cache.findAll(prefix);
        for (const match of exactMatches) {
            if (match.remainingKey === '') {
                return match.value.content
                    .filter(c => c.suffix === suffix)
                    .map(c => c.completions);
            }
        }

        // 2. Try rebasing cached entries
        const currentDoc = document.getText();
        const currentOffset = document.offsetAt(position);

        for (const match of exactMatches) {
            for (const entry of match.value.content) {
                if (!entry.userEditSince || entry.rebaseFailed) {
                    continue;
                }

                const rebased = this.tryRebaseCacheEntry(
                    entry,
                    currentDoc,
                    [new OffsetRange(currentOffset, currentOffset)]
                );

                if (rebased) {
                    console.log('[Cache] ✨ Rebase success');
                    return [rebased];
                }
            }
        }

        // 3. Cache miss
        return [];
    }

    private tryRebaseCacheEntry(
        entry: CachedEntry,
        currentDoc: string,
        currentSelection: readonly OffsetRange[]
    ): string[] | undefined {
        // Call tryRebase() from #58.4
        const result = tryRebase(
            entry.documentBeforeEdit,
            entry.editWindow,
            createReplacementFromCompletion(entry.completions[0]),
            entry.userEditSince,
            currentDoc,
            currentSelection,
            'strict'
        );

        if (typeof result === 'string') {
            // Rebase failed
            if (result === 'rebaseFailed') {
                entry.rebaseFailed = true;
            }
            return undefined;
        }

        return [result.newText];
    }
}
```

### Console Output

```
[Cache] Lookup: prefix="const x = ", suffix=";"
[Cache] Exact match not found, trying rebase...
[Cache] ✨ Rebase success: adjusted +3 lines
[Cache] Returning rebased completion
```

### Files
- `src/chat/src/extension/pukuai/common/completionsCache.ts` (MODIFIED - add rebase logic)
- `src/chat/src/extension/pukuai/test/completionsCacheRebase.spec.ts` (NEW - 200 lines)

---

## #58.6 - Provider Integration

**Effort**: 1 hour | **Complexity**: 🟢 Easy | **Depends On**: #58.1-5

### Summary
Wire up document change events to completion providers.

### Deliverables
- ✅ Update `PukuInlineCompletionProvider` to pass document to cache
- ✅ Update `PukuUnifiedInlineProvider` to propagate events
- ✅ Add telemetry: cache hit, rebase success, rebase failure
- ✅ Works end-to-end in extension

### Provider Changes

```typescript
// PukuInlineCompletionProvider
export class PukuInlineCompletionProvider {
    private cache = new CompletionsCache();
    private editTracker = new DocumentEditTracker();

    constructor() {
        // Hook up edit tracker to cache
        this.editTracker.onEdit((uri, edit) => {
            this.cache.handleDocumentChange(uri, edit);
        });
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | undefined> {

        // Try cache with rebase
        const cached = this.cache.findAll(
            prefix,
            suffix,
            document,  // NEW: Pass document
            position   // NEW: Pass position
        );

        if (cached.length > 0) {
            console.log('[Provider] ✨ Cache hit with rebase');
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

        // Store with edit tracking
        this.cache.append(prefix, suffix, [result.text], document, position);

        return result;
    }
}
```

### Telemetry

```typescript
// Log metrics
console.log('[Telemetry] Cache Stats:', {
    hits: cacheHits,
    rebaseSuccess: rebaseSuccessCount,
    rebaseFailed: rebaseFailedCount,
    hitRate: (cacheHits / totalRequests * 100).toFixed(1) + '%'
});
```

### Files
- `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts` (MODIFIED)
- `src/chat/src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts` (MODIFIED)

---

## #58.7 - Performance Validation

**Effort**: 1 hour | **Complexity**: 🟢 Easy | **Depends On**: #58.6

### Summary
Measure and validate performance gains from edit rebasing.

### Deliverables
- ✅ Add telemetry counters
- ✅ Benchmark cache hit rate before/after
- ✅ Benchmark P50/P95 latency
- ✅ Document results in CHANGELOG
- ✅ Verify meets success criteria (50-70% hit rate)

### Metrics to Track

```typescript
interface RebaseMetrics {
    // Counters
    totalRequests: number;
    cacheHits: number;
    cacheRebaseSuccess: number;
    cacheRebaseFailed: number;
    cacheMiss: number;

    // Rates
    cacheHitRate: number;        // cacheHits / totalRequests
    rebaseSuccessRate: number;   // rebaseSuccess / totalRequests

    // Latencies
    rebaseComputeTimeMs: number[]; // Time to compute rebase
    cacheHitLatencyMs: number[];   // P50, P95 for cache hits
    apiCallLatencyMs: number[];    // P50, P95 for API calls
}
```

### Benchmark Scenarios

```typescript
const scenarios = [
    {
        name: 'Add lines above',
        setup: async () => {
            // Cache completion at line 10
            // Add 3 lines at line 1
        },
        expected: 'cache hit with rebase'
    },
    {
        name: 'Delete lines above',
        setup: async () => {
            // Cache completion at line 10
            // Delete lines 2-5
        },
        expected: 'cache hit with rebase'
    },
    {
        name: 'Edit same line',
        setup: async () => {
            // Cache completion
            // Edit same position
        },
        expected: 'rebase failed (conflict)'
    },
    {
        name: 'Cursor moved away',
        setup: async () => {
            // Cache completion at line 10
            // Move cursor to line 50
        },
        expected: 'outside edit window'
    }
];

for (const scenario of scenarios) {
    const result = await runScenario(scenario);
    console.log(`${scenario.name}: ${result}`);
}
```

### Expected Results

| Metric | Before (#57) | After (#58) | Target |
|--------|--------------|-------------|--------|
| Cache hit rate | 20% | 65% | 50-70% |
| Rebase compute time | N/A | 5ms (P50) | <10ms |
| Cache hit latency | N/A | 10ms | <20ms |
| API reduction | Baseline | -35% | -30-40% |

### Files
- `src/chat/src/extension/pukuai/common/rebaseMetrics.ts` (NEW - 150 lines)
- `src/chat/src/extension/pukuai/test/rebasePerformance.spec.ts` (NEW - 200 lines)
- `src/chat/CHANGELOG.md` (MODIFIED - add performance results)

---

## Implementation Timeline

### Week 1: Foundation
- **Monday**: #58.1 (StringEdit Utilities) - 2h
- **Tuesday**: #58.2 (Document Edit Tracking) - 2h
- **Wednesday**: #58.3 (Edit Composition) - 2h
- **Thursday**: #58.4 (Rebase Algorithm) - 3h

### Week 2: Integration
- **Monday**: #58.5 (Cache Lookup) - 2h
- **Tuesday**: #58.6 (Provider Integration) - 1h
- **Wednesday**: #58.7 (Performance Validation) - 1h

**Total**: 13 hours over 7 working days (with buffer)

---

## Review Strategy

### Per Sub-Issue Review

Each sub-issue gets its own PR:
- **#58.1**: Review utility classes + tests
- **#58.2**: Review edit tracking + console logs
- **#58.3**: Review cache structure changes
- **#58.4**: Review rebase algorithm + test suite
- **#58.5**: Review cache integration
- **#58.6**: Review provider changes
- **#58.7**: Review metrics + benchmark results

### Benefits
- ✅ Smaller, focused PRs (200-400 lines each)
- ✅ Easier to spot bugs
- ✅ Faster review cycles
- ✅ Can ship incrementally

---

## Testing Strategy

### Unit Tests (per sub-issue)
- #58.1: 10+ tests for utilities
- #58.2: 8+ tests for edit tracking
- #58.3: 5+ tests for cache composition
- #58.4: 20+ tests for rebase algorithm
- #58.5: 10+ tests for cache lookup
- #58.6: 5+ integration tests
- #58.7: Performance benchmarks

**Total**: 60+ test cases

### Integration Tests
- End-to-end scenario tests (after #58.6)
- Manual testing in extension host
- Dogfooding by Puku team

---

## Risk Mitigation

### Risk 1: Rebase Algorithm Complexity
**Mitigation**: Use proven Copilot implementation, comprehensive tests

### Risk 2: Performance Overhead
**Mitigation**: Benchmark early (#58.7), set performance budgets

### Risk 3: False Positives
**Mitigation**: Use 'strict' mode, track user acceptance rates

### Risk 4: Integration Issues
**Mitigation**: Small incremental PRs, test after each sub-issue

---

## Success Criteria

### Technical
- ✅ All 60+ tests pass
- ✅ Code coverage >85%
- ✅ No compilation errors
- ✅ Rebase compute time <10ms P50

### Performance
- ✅ Cache hit rate: 50-70% (target: 65%)
- ✅ API call reduction: 30-40%
- ✅ P50 latency for rebased cache hits: <20ms

### Quality
- ✅ All sub-issues reviewed and approved
- ✅ No regressions in existing features
- ✅ Console logs helpful for debugging
- ✅ Documentation updated

---

## Next Steps

1. **Review this breakdown** with team
2. **Create GitHub issues** for each sub-issue
3. **Start with #58.1** (StringEdit Utilities)
4. **Work sequentially** or parallelize #58.2 + #58.4

---

## Questions?

- Should we start with #58.1 immediately?
- Any concerns about the breakdown?
- Want to parallelize any sub-issues?
- Need more detail on any specific sub-issue?
