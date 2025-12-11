# Issue #58.6: Provider Integration

**Parent Issue**: [#58 - Edit Rebasing Cache](https://github.com/puku-sh/puku-vs-editor/issues/58)
**Depends On**: #58.1-5 (All previous sub-issues)
**Effort**: 1 hour
**Complexity**: 🟢 Easy
**Priority**: Polish

---

## Summary

Wire up the rebasing cache to completion providers. This is the final integration step that makes the feature user-facing. Includes telemetry and polished user experience.

---

## Goals

1. ✅ Update `PukuInlineCompletionProvider` to pass document to cache
2. ✅ Update `PukuUnifiedInlineProvider` to propagate events
3. ✅ Add telemetry counters for cache hits/rebase success/failure
4. ✅ Ensure providers work end-to-end in extension
5. ✅ Add user-facing console logs

---

## Background

After #58.5, the cache can rebase, but providers don't pass the required `document` and `position` parameters. This issue connects everything together.

---

## Technical Design

### Update PukuInlineCompletionProvider

```typescript
// src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts

import { CompletionsCache } from '../common/completionsCache';
import { DocumentEditTracker } from '../common/documentEditTracker';

export class PukuInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private cache = new CompletionsCache();
    private editTracker = new DocumentEditTracker();
    private disposables: vscode.Disposable[] = [];

    // Telemetry counters
    private telemetry = {
        totalRequests: 0,
        cacheHits: 0,
        cacheHitsWithRebase: 0,
        cacheRebaseFailed: 0,
        cacheMisses: 0,
        apiCalls: 0
    };

    constructor(/* ... existing params ... */) {
        // Connect tracker to cache
        this.cache.setEditTracker(this.editTracker);

        // Subscribe to edit events
        this.disposables.push(
            this.editTracker.onEdit(({ uri, edit }) => {
                this.cache.handleDocumentChange(uri, edit);
            })
        );

        console.log('[PukuInlineCompletionProvider] ✅ Edit rebasing enabled');
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | undefined> {

        this.telemetry.totalRequests++;

        // Extract prefix and suffix
        const prefix = document.getText(new vscode.Range(
            document.lineAt(position.line).range.start,
            position
        ));
        const suffix = document.getText(new vscode.Range(
            position,
            document.lineAt(position.line).range.end
        ));

        // Try cache with rebase (NEW: pass document + position)
        const cached = this.cache.findAll(
            prefix,
            suffix,
            document,  // NEW
            position   // NEW
        );

        if (cached.length > 0) {
            // Cache hit!
            this.telemetry.cacheHits++;

            // Check if this was a rebase or exact match
            // (We can detect this by checking if edit tracking was used)
            const wasRebase = this.wasRebaseUsed(document.uri.toString());
            if (wasRebase) {
                this.telemetry.cacheHitsWithRebase++;
                console.log('[Provider] ✨ Cache hit (with rebase)');
            } else {
                console.log('[Provider] ✅ Cache hit (exact match)');
            }

            this.logTelemetry();

            return {
                items: cached[0].map(text => ({
                    insertText: text,
                    range: new vscode.Range(position, position)
                })),
                enableForwardStability: true  // Issue #55
            };
        }

        // Cache miss - fetch from API
        this.telemetry.cacheMisses++;
        this.telemetry.apiCalls++;

        console.log('[Provider] ❌ Cache miss, calling API...');

        const result = await this.fetchCompletion(document, position, token);

        if (result) {
            // Store in cache with edit tracking (NEW: pass document + position)
            this.cache.append(
                prefix,
                suffix,
                [result.text],
                document,  // NEW
                position   // NEW
            );

            console.log('[Provider] Cached completion for future rebase');
        }

        this.logTelemetry();

        return result ? {
            items: [{
                insertText: result.text,
                range: new vscode.Range(position, position)
            }],
            enableForwardStability: true
        } : undefined;
    }

    /**
     * Check if last cache hit used rebasing
     * (Simplified detection - full version would track per-request)
     */
    private wasRebaseUsed(uri: string): boolean {
        const history = this.editTracker.getEditHistory(uri);
        return history ? history.size > 0 : false;
    }

    /**
     * Log telemetry to console
     */
    private logTelemetry(): void {
        const hitRate = (this.telemetry.cacheHits / this.telemetry.totalRequests * 100).toFixed(1);
        const rebaseRate = (this.telemetry.cacheHitsWithRebase / this.telemetry.cacheHits * 100).toFixed(1);

        console.log('[Telemetry] Cache Stats:', {
            totalRequests: this.telemetry.totalRequests,
            cacheHits: this.telemetry.cacheHits,
            cacheHitsWithRebase: this.telemetry.cacheHitsWithRebase,
            rebaseFailed: this.telemetry.cacheRebaseFailed,
            cacheMisses: this.telemetry.cacheMisses,
            apiCalls: this.telemetry.apiCalls,
            hitRate: hitRate + '%',
            rebaseRate: rebaseRate + '% of hits'
        });
    }

    dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.editTracker.dispose();
    }
}
```

### Update PukuUnifiedInlineProvider

```typescript
// src/chat/src/extension/pukuai/vscode-node/pukuUnifiedInlineProvider.ts

export class PukuUnifiedInlineProvider implements vscode.InlineCompletionItemProvider {
    constructor(
        private readonly fimProvider: PukuFimProvider,
        private readonly diagnosticsProvider: PukuDiagnosticsNextEditProvider,
        /* ... */
    ) {
        // Ensure FIM provider's edit tracker is active
        // (Already initialized in PukuFimProvider constructor)
        console.log('[PukuUnifiedProvider] Edit rebasing active for FIM');
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionList | undefined> {

        // Delegate to FIM or diagnostics provider
        // Both now support rebasing automatically

        if (this.shouldUseDiagnostics(document, position)) {
            // Diagnostics provider (doesn't use cache yet)
            return this.diagnosticsProvider.provideInlineCompletionItems(
                document, position, context, token
            );
        }

        // FIM provider with rebasing cache
        return this.fimProvider.provideInlineCompletionItems(
            document, position, context, token
        );
    }
}
```

---

## Test Cases

### Test Suite 1: End-to-End Integration

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';
import { PukuInlineCompletionProvider } from '../vscode-node/pukuInlineCompletionProvider';

suite('Provider Integration with Rebase', () => {
    let provider: PukuInlineCompletionProvider;
    let document: vscode.TextDocument;

    setup(async () => {
        provider = new PukuInlineCompletionProvider(/* ... */);
        document = await vscode.workspace.openTextDocument({
            content: 'const x = 1;',
            language: 'typescript'
        });
    });

    teardown(() => {
        provider.dispose();
    });

    test('should cache and return completion', async () => {
        const position = new vscode.Position(0, 10);

        // First request - cache miss
        const result1 = await provider.provideInlineCompletionItems(
            document,
            position,
            mockContext,
            mockToken
        );

        assert.ok(result1);
        assert.strictEqual(result1.items.length, 1);
        // Should log: [Provider] ❌ Cache miss, calling API...
        // Should log: [Provider] Cached completion for future rebase
    });

    test('should return cached completion after edit above', async () => {
        const position = new vscode.Position(0, 10);

        // First request - cache
        await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        // User adds line above
        await simulateEdit(document, 0, 0, '// comment\n');

        // Second request at new position
        const newPosition = new vscode.Position(1, 10);
        const result2 = await provider.provideInlineCompletionItems(
            document, newPosition, mockContext, mockToken
        );

        assert.ok(result2);
        assert.strictEqual(result2.items.length, 1);
        // Should log: [Provider] ✨ Cache hit (with rebase)
    });

    test('should call API on conflicting edit', async () => {
        const position = new vscode.Position(0, 10);

        // Cache completion
        await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        // User types different value
        await simulateEdit(document, 10, 1, '99');

        // Request again - should call API (rebase failed)
        const result2 = await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        assert.ok(result2);
        // Should log: [Provider] ❌ Cache miss, calling API...
    });
});
```

### Test Suite 2: Telemetry

```typescript
suite('Telemetry', () => {
    test('should track cache hits', async () => {
        const provider = new PukuInlineCompletionProvider(/* ... */);
        const document = await createTestDocument('const x = 1;');
        const position = new vscode.Position(0, 10);

        // First request - miss
        await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        // Second request - hit
        await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        const telemetry = provider.getTelemetry();
        assert.strictEqual(telemetry.totalRequests, 2);
        assert.strictEqual(telemetry.cacheHits, 1);
        assert.strictEqual(telemetry.cacheMisses, 1);
    });

    test('should track rebase success', async () => {
        const provider = new PukuInlineCompletionProvider(/* ... */);
        const document = await createTestDocument('const x = 1;');
        const position = new vscode.Position(0, 10);

        // Cache
        await provider.provideInlineCompletionItems(
            document, position, mockContext, mockToken
        );

        // Edit above
        await simulateEdit(document, 0, 0, '// line\n');

        // Request with rebase
        await provider.provideInlineCompletionItems(
            document, new vscode.Position(1, 10), mockContext, mockToken
        );

        const telemetry = provider.getTelemetry();
        assert.strictEqual(telemetry.cacheHitsWithRebase, 1);
    });
});
```

---

## Console Output Examples

### Scenario 1: First Request (Cache Miss)

```
[PukuInlineCompletionProvider] ✅ Edit rebasing enabled
[Provider] ❌ Cache miss, calling API...
[API] Fetching completion from /v1/fim/context...
[API] Response received (1.2s)
[Cache] Stored completion with edit tracking: {
  prefix: "const x = ...",
  editWindow: "[0, 11)",
  documentLength: 12
}
[Provider] Cached completion for future rebase
[Telemetry] Cache Stats: {
  totalRequests: 1,
  cacheHits: 0,
  cacheHitsWithRebase: 0,
  rebaseFailed: 0,
  cacheMisses: 1,
  apiCalls: 1,
  hitRate: "0.0%",
  rebaseRate: "0.0% of hits"
}
```

### Scenario 2: Second Request (Exact Match)

```
[Provider] ✅ Cache hit (exact match)
[Telemetry] Cache Stats: {
  totalRequests: 2,
  cacheHits: 1,
  cacheHitsWithRebase: 0,
  rebaseFailed: 0,
  cacheMisses: 1,
  apiCalls: 1,
  hitRate: "50.0%",
  rebaseRate: "0.0% of hits"
}
```

### Scenario 3: After Edit Above (Rebase Success)

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [0, 0) with "// comment\n"
[Cache] Composed edit into cache entry: { editCount: 1 }

[Provider] Request for completion...
[Cache] Trying rebase fallback...
[Rebase] User edit BEFORE cache: { delta: 11, cumulativeOffset: 11 }
[Rebase] ✅ Success: { originalOffset: 10, rebasedOffset: 21, delta: 11 }
[Cache] ✨ Rebase success!
[Provider] ✨ Cache hit (with rebase)
[Telemetry] Cache Stats: {
  totalRequests: 3,
  cacheHits: 2,
  cacheHitsWithRebase: 1,
  rebaseFailed: 0,
  cacheMisses: 1,
  apiCalls: 1,
  hitRate: "66.7%",
  rebaseRate: "50.0% of hits"
}
```

### Scenario 4: Conflict (Cache Miss)

```
[DocumentEditTracker] file:///test.ts: 1 replacement(s)
  - Replace [10, 11) with "99"
[Cache] Composed edit into cache entry: { editCount: 1 }

[Provider] Request for completion...
[Cache] Trying rebase fallback...
[Rebase] CONFLICT: User typed different text: { userTyped: "99", expected: "42" }
[Rebase] Rebase failed (conflict detected)
[Cache] Marked entry as rebaseFailed (conflict)
[Provider] ❌ Cache miss, calling API...
[Telemetry] Cache Stats: {
  totalRequests: 4,
  cacheHits: 2,
  cacheHitsWithRebase: 1,
  rebaseFailed: 1,
  cacheMisses: 2,
  apiCalls: 2,
  hitRate: "50.0%",
  rebaseRate: "50.0% of hits"
}
```

---

## Success Criteria

- ✅ Providers pass `document` and `position` to cache
- ✅ Edit rebasing works end-to-end in extension
- ✅ Telemetry tracks all metrics correctly
- ✅ Console logs are clear and helpful
- ✅ No performance regression
- ✅ All existing tests still pass
- ✅ Feature is ready for user testing

---

## Files to Modify

```
src/chat/src/extension/pukuai/
└── vscode-node/
    ├── pukuInlineCompletionProvider.ts  (MODIFIED - add document/position params)
    └── pukuUnifiedInlineProvider.ts     (MODIFIED - ensure delegation works)
```

---

## Dependencies

- ✅ **#58.1-5** (All previous sub-issues)

---

## Next Steps

After #58.6 is complete:
- ✅ Feature is polished and user-ready
- ✅ Telemetry tracks performance
- ✅ Ready for #58.7 (Performance Validation)
- ✅ Can release to beta users

---

## User Experience

### Before Edit Rebasing
```
User types → 800ms wait → See completion
User adds line above → 800ms wait → See same completion (re-fetched)
Total: 1.6 seconds wasted
```

### After Edit Rebasing
```
User types → 800ms wait → See completion
User adds line above → 0ms wait → See same completion (rebased)
Total: 0.8 seconds (2x faster)
```

---

## References

- **PRD**: `src/chat/docs/prd-edit-rebasing-cache.md`
- **Previous issues**: #58.1-5
