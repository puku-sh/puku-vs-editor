# PRD: Client-Side Character-by-Character Completion Caching

> **Status:** 📋 **PLANNING PHASE - NOT YET IMPLEMENTED**
>
> This PRD describes a planned feature for Puku FIM to implement client-side character-by-character caching.
> **This feature is NOT currently implemented.** Implementation timeline: TBD
> Inspired by Refact's approach but adapted for client-side caching to avoid Cloudflare KV costs.

## 📋 Overview

Implement Refact-style character-by-character caching **on the client side** to provide instant completions as users type, without expensive backend KV operations.

---

## 🎯 Goals

1. **Instant completions** as user types accepted completion character-by-character
2. **Zero backend costs** - all caching happens in client memory
3. **Simple implementation** - reuse existing completion result
4. **Compatible** with existing Radix Trie and Speculative caches

---

## 📊 Current Flow vs Proposed Flow

### Current Flow:
```
User types "de" → API call → "def main():\n    pass"
User accepts → types "def" → Radix Trie miss → API call again 😢
User types "def " → Radix Trie miss → API call again 😢
User types "def m" → Radix Trie miss → API call again 😢
```

**Problem:** Radix Trie only helps if user types EXACTLY the same prefix in a different location. It doesn't help as user types the completion character-by-character.

### Proposed Flow:
```
User types "de" → API call → "def main():\n    pass"
  └─ Save: lastCompletion = "def main():\n    pass"

User accepts → types "def"
  └─ Check: "def main():\n    pass".startsWith("def")? ✅ YES
  └─ Return: " main():\n    pass" (INSTANT, no API call!) 🎉

User types "def "
  └─ Check: "def main():\n    pass".startsWith("def ")? ✅ YES
  └─ Return: "main():\n    pass" (INSTANT!) 🎉

User types "def m"
  └─ Check: "def main():\n    pass".startsWith("def m")? ✅ YES
  └─ Return: "ain():\n    pass" (INSTANT!) 🎉
```

---

## 🛠️ Technical Implementation

### 1. Add Completion String Cache

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

```typescript
export class PukuInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    // Existing caches
    private _speculativeCache: SpeculativeRequestCache;
    private _radixTrieCache: RadixTrieCache;

    // NEW: Completion string cache (Refact/Aide-style)
    private _lastCompletionCache: CompletionStringCache;

    constructor(...) {
        // ... existing code ...
        this._lastCompletionCache = new CompletionStringCache();
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | null> {
        const docContext = getCurrentDocContext(document, position);
        const prefix = docContext.prefix;

        // STEP 1: Check completion string cache (FIRST, before everything)
        const cachedCompletion = this._lastCompletionCache.get(
            document.uri.toString(),
            prefix
        );
        if (cachedCompletion) {
            console.log('[Puku FIM] Completion string cache HIT:', cachedCompletion.substring(0, 50));
            return [new vscode.InlineCompletionItem(cachedCompletion)];
        }

        // STEP 2: Check speculative cache (existing)
        if (this._speculativeCache.has(lastCompletionId)) {
            const cached = await this._speculativeCache.request(lastCompletionId);
            if (cached) {
                // Save to completion string cache for character-by-character
                this._lastCompletionCache.set(
                    document.uri.toString(),
                    prefix,
                    cached
                );
                return [new vscode.InlineCompletionItem(cached)];
            }
        }

        // STEP 3: Check Radix Trie cache (existing)
        const trieResult = this._radixTrieCache.search(prefix);
        if (trieResult) {
            // Save to completion string cache
            this._lastCompletionCache.set(
                document.uri.toString(),
                prefix,
                trieResult
            );
            return [new vscode.InlineCompletionItem(trieResult)];
        }

        // STEP 4: Call API (last resort)
        const completion = await this.fetchCompletion(docContext, ...);
        if (completion) {
            // Save to completion string cache for future character-by-character hits
            this._lastCompletionCache.set(
                document.uri.toString(),
                prefix,
                completion
            );
            return [new vscode.InlineCompletionItem(completion)];
        }

        return null;
    }
}
```

---

### 2. Implement CompletionStringCache Class

**File:** `src/chat/src/extension/pukuai/common/completionStringCache.ts` (NEW)

```typescript
/**
 * Client-side completion string cache (Refact/Aide-style)
 *
 * Stores the last completion for each file and checks if current prefix
 * matches the beginning of the cached completion.
 *
 * Example:
 *   User types "de" → completion "def main():\n    pass"
 *   Cache stores: { uri: "file:///foo.py", fullCompletion: "def main():\n    pass" }
 *
 *   User types "def" → prefix "def"
 *   Check: "def main():\n    pass".startsWith("def")? YES
 *   Return: " main():\n    pass" (instant!)
 */
export class CompletionStringCache {
    private cache: Map<string, CachedCompletion> = new Map();

    /**
     * Get cached completion if current prefix matches
     *
     * @param fileUri - File URI (e.g., "file:///Users/foo/bar.py")
     * @param currentPrefix - Current text before cursor
     * @returns Remaining completion text, or null if no match
     */
    get(fileUri: string, currentPrefix: string): string | null {
        const cached = this.cache.get(fileUri);
        if (!cached) {
            return null;
        }

        // Check if cached full completion starts with current prefix
        if (cached.fullCompletion.startsWith(currentPrefix)) {
            // Return the remaining text after current prefix
            return cached.fullCompletion.substring(currentPrefix.length);
        }

        return null;
    }

    /**
     * Save completion to cache
     *
     * @param fileUri - File URI
     * @param prefix - Prefix at time of completion
     * @param completion - Completion text returned by API
     */
    set(fileUri: string, prefix: string, completion: string): void {
        // Full completion = prefix + completion
        const fullCompletion = prefix + completion;

        this.cache.set(fileUri, {
            fullCompletion,
            timestamp: Date.now()
        });

        // Limit cache size (keep only recent entries)
        if (this.cache.size > 100) {
            // Remove oldest entry
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Clear cache for a specific file (e.g., on document edit outside completion)
     */
    clear(fileUri: string): void {
        this.cache.delete(fileUri);
    }

    /**
     * Clear all cached completions
     */
    clearAll(): void {
        this.cache.clear();
    }
}

interface CachedCompletion {
    fullCompletion: string; // prefix + completion
    timestamp: number;      // for TTL cleanup
}
```

---

### 3. Invalidate Cache on Document Changes

**File:** `src/chat/src/extension/pukuai/vscode-node/pukuInlineCompletionProvider.ts`

```typescript
export class PukuInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private _disposables: vscode.Disposable[] = [];

    constructor(...) {
        // ... existing code ...

        // Clear completion string cache when document changes outside of completion acceptance
        this._disposables.push(
            vscode.workspace.onDidChangeTextDocument((event) => {
                // Only clear if change is NOT from accepting a completion
                // (we detect this by checking if change is multi-line or large)
                if (event.contentChanges.length > 0) {
                    const change = event.contentChanges[0];
                    const isLikelyManualEdit =
                        change.text.includes('\n') ||
                        change.text.length > 50 ||
                        change.rangeLength > 10;

                    if (isLikelyManualEdit) {
                        this._lastCompletionCache.clear(event.document.uri.toString());
                    }
                }
            })
        );
    }

    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
```

---

## 📝 Example Scenarios

### Scenario 1: User Accepts Completion Character-by-Character

```typescript
// User types "de"
prefix = "de"
API returns: "def main():\n    pass"
Cache stores: fullCompletion = "def main():\n    pass"

// User accepts "f" → now "def"
prefix = "def"
"def main():\n    pass".startsWith("def")? ✅ YES
Return: " main():\n    pass" (INSTANT, no API call)

// User accepts " " → now "def "
prefix = "def "
"def main():\n    pass".startsWith("def ")? ✅ YES
Return: "main():\n    pass" (INSTANT)

// User accepts "m" → now "def m"
prefix = "def m"
"def main():\n    pass".startsWith("def m")? ✅ YES
Return: "ain():\n    pass" (INSTANT)

// User accepts entire completion → "def main():\n    pass"
prefix = "def main():\n    pass"
"def main():\n    pass".startsWith("def main():\n    pass")? ✅ YES
Return: "" (empty, completion finished)
```

### Scenario 2: User Backsapces

```typescript
// Current state: "def main()"
Cache has: fullCompletion = "def main():\n    pass"

// User backspaces → "def main("
prefix = "def main("
"def main():\n    pass".startsWith("def main(")? ✅ YES
Return: "):\n    pass" (INSTANT)

// User backspaces → "def main"
prefix = "def main"
"def main():\n    pass".startsWith("def main")? ✅ YES
Return: "():\n    pass" (INSTANT)

// User backspaces → "def mai"
prefix = "def mai"
"def main():\n    pass".startsWith("def mai")? ❌ NO (user deviated)
Cache miss → trigger new API call
```

### Scenario 3: User Deviates from Completion

```typescript
// User types "de"
API returns: "def main():\n    pass"
Cache stores: fullCompletion = "def main():\n    pass"

// User types "f" → "def" ✅ Cache hit
Return: " main():\n    pass"

// User REJECTS completion, types "i" → "defi"
prefix = "defi"
"def main():\n    pass".startsWith("defi")? ❌ NO
Cache miss → trigger new API call
```

### Scenario 4: Multi-Line Completion

```typescript
// User types "class "
API returns: "User:\n    def __init__(self):\n        pass"
Cache stores: fullCompletion = "class User:\n    def __init__(self):\n        pass"

// User accepts line-by-line:
// 1. "class U" → " ser:\n    def __init__(self):\n        pass" ✅
// 2. "class Us" → "er:\n    def __init__(self):\n        pass" ✅
// 3. "class Use" → "r:\n    def __init__(self):\n        pass" ✅
// 4. "class User" → ":\n    def __init__(self):\n        pass" ✅
// 5. "class User:" → "\n    def __init__(self):\n        pass" ✅
// ... and so on
```

---

## 🧪 Testing Plan

### Unit Tests

**File:** `src/chat/src/extension/pukuai/test/completionStringCache.test.ts`

```typescript
import { CompletionStringCache } from '../common/completionStringCache';

describe('CompletionStringCache', () => {
    let cache: CompletionStringCache;

    beforeEach(() => {
        cache = new CompletionStringCache();
    });

    test('should return completion when prefix matches', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');

        // User types "def"
        const result = cache.get('file:///test.py', 'def');
        expect(result).toBe(' main():\n    pass');
    });

    test('should return null when prefix does not match', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');

        // User types "defi" (deviated)
        const result = cache.get('file:///test.py', 'defi');
        expect(result).toBeNull();
    });

    test('should handle character-by-character acceptance', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');

        // User types each character
        expect(cache.get('file:///test.py', 'def')).toBe(' main():\n    pass');
        expect(cache.get('file:///test.py', 'def ')).toBe('main():\n    pass');
        expect(cache.get('file:///test.py', 'def m')).toBe('ain():\n    pass');
        expect(cache.get('file:///test.py', 'def ma')).toBe('in():\n    pass');
        expect(cache.get('file:///test.py', 'def mai')).toBe('n():\n    pass');
        expect(cache.get('file:///test.py', 'def main')).toBe('():\n    pass');
        expect(cache.get('file:///test.py', 'def main(')).toBe('):\n    pass');
        expect(cache.get('file:///test.py', 'def main()')).toBe(':\n    pass');
        expect(cache.get('file:///test.py', 'def main():')).toBe('\n    pass');
    });

    test('should handle backspace', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');

        // User types forward
        expect(cache.get('file:///test.py', 'def main()')).toBe(':\n    pass');

        // User backspaces
        expect(cache.get('file:///test.py', 'def main(')).toBe('):\n    pass');
        expect(cache.get('file:///test.py', 'def main')).toBe('():\n    pass');
        expect(cache.get('file:///test.py', 'def')).toBe(' main():\n    pass');
    });

    test('should return null for different file', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');

        const result = cache.get('file:///other.py', 'def');
        expect(result).toBeNull();
    });

    test('should clear cache for specific file', () => {
        cache.set('file:///test.py', 'de', 'f main():\n    pass');
        cache.clear('file:///test.py');

        const result = cache.get('file:///test.py', 'def');
        expect(result).toBeNull();
    });

    test('should limit cache size to 100 entries', () => {
        // Add 150 entries
        for (let i = 0; i < 150; i++) {
            cache.set(`file:///test${i}.py`, 'de', 'f main()');
        }

        // Only first 100 should be evicted
        // (implementation keeps newest 100)
        expect(cache.get('file:///test0.py', 'def')).toBeNull(); // Oldest, evicted
        expect(cache.get('file:///test149.py', 'def')).toBe(' main()'); // Newest, kept
    });
});
```

### Integration Tests

**File:** `src/chat/src/extension/pukuai/test/pukuInlineCompletionProvider.test.ts`

```typescript
test('should provide instant completions as user types accepted completion', async () => {
    const provider = new PukuInlineCompletionProvider(...);
    const document = await vscode.workspace.openTextDocument({ content: 'de', language: 'python' });

    // First request (API call)
    const position1 = new vscode.Position(0, 2); // after "de"
    const items1 = await provider.provideInlineCompletionItems(document, position1, ...);
    expect(items1[0].insertText).toBe('f main():\n    pass');

    // User accepts "f" → now "def"
    await document.edit(edit => edit.insert(new vscode.Position(0, 2), 'f'));
    const position2 = new vscode.Position(0, 3); // after "def"

    // Second request (should hit completion string cache, instant)
    const items2 = await provider.provideInlineCompletionItems(document, position2, ...);
    expect(items2[0].insertText).toBe(' main():\n    pass');

    // Verify no API call was made (check metrics/logs)
});

test('should trigger new API call when user deviates from completion', async () => {
    const provider = new PukuInlineCompletionProvider(...);
    const document = await vscode.workspace.openTextDocument({ content: 'de', language: 'python' });

    // First request
    const position1 = new vscode.Position(0, 2);
    const items1 = await provider.provideInlineCompletionItems(document, position1, ...);
    expect(items1[0].insertText).toBe('f main():\n    pass');

    // User types "i" instead → "dei"
    await document.edit(edit => edit.insert(new vscode.Position(0, 2), 'i'));
    const position2 = new vscode.Position(0, 3);

    // Should trigger new API call (cache miss)
    const items2 = await provider.provideInlineCompletionItems(document, position2, ...);
    // Result will be different (new completion for "dei")
});
```

---

## 📊 Performance Metrics

### Expected Improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Cache hits during typing** | ~20% (Radix Trie) | ~80% (Completion string) | 4x |
| **API calls per accepted completion** | ~5 (user types char-by-char) | 1 (only initial) | 5x reduction |
| **Latency for cache hits** | 800ms (debounce + API) | 0ms (instant) | ∞ |
| **Monthly API costs (1000 users)** | $5 | $1 | 5x reduction |

### Example Scenario:
```
User completes "def main():\n    pass" (20 characters)

Before:
- Initial "de" → API call (800ms)
- User types "f" → API call (800ms)
- User types " " → API call (800ms)
- User types "m" → API call (800ms)
- User types "a" → API call (800ms)
Total: 5 API calls, 4000ms of waiting

After:
- Initial "de" → API call (800ms)
- User types "f" → Cache hit (0ms) ✅
- User types " " → Cache hit (0ms) ✅
- User types "m" → Cache hit (0ms) ✅
- User types "a" → Cache hit (0ms) ✅
Total: 1 API call, 800ms of waiting

Savings: 80% fewer API calls, 80% less waiting!
```

---

## 🚀 Rollout Plan

### Phase 1: Implement Core Logic (Day 1-2)
- [ ] Create `CompletionStringCache` class
- [ ] Add cache check in `provideInlineCompletionItems` (first priority)
- [ ] Save completions to cache after API calls
- [ ] Unit tests for cache logic

### Phase 2: Cache Invalidation (Day 3)
- [ ] Add document change listener
- [ ] Implement smart invalidation (manual edits vs completion acceptance)
- [ ] Add cache clear on file switch
- [ ] Integration tests

### Phase 3: Monitoring & Optimization (Day 4-5)
- [ ] Add telemetry for cache hit/miss rates
- [ ] Add logs for debugging
- [ ] Test with real users (dogfooding)
- [ ] Tune cache size limits
- [ ] Performance testing

### Phase 4: Launch (Day 6-7)
- [ ] Feature flag for gradual rollout
- [ ] Monitor metrics in production
- [ ] Gather user feedback
- [ ] Iterate based on data

---

## 🎯 Success Criteria

- ✅ **90%+ cache hit rate** when user types accepted completion character-by-character
- ✅ **80% reduction** in API calls during completion acceptance
- ✅ **0ms latency** for cache hits (instant)
- ✅ **No regressions** in completion quality
- ✅ **< 10MB memory** usage for cache (100 entries × ~100KB avg)

---

## 🔒 Edge Cases & Considerations

### 1. Multi-Cursor Editing
```typescript
// User has multiple cursors, each gets own completion
// Cache key includes cursor position? NO - use file URI only
// This means only one cursor's completion is cached at a time
// Acceptable tradeoff (multi-cursor is rare)
```

### 2. Large Completions
```typescript
// If completion is 10,000 characters, storing full string is expensive
// Mitigation: Limit cached completion length
const MAX_CACHED_COMPLETION_LENGTH = 1000;

set(fileUri: string, prefix: string, completion: string): void {
    const fullCompletion = prefix + completion;

    // Only cache if reasonable size
    if (fullCompletion.length <= MAX_CACHED_COMPLETION_LENGTH) {
        this.cache.set(fileUri, { fullCompletion, timestamp: Date.now() });
    }
}
```

### 3. Rapid File Switching
```typescript
// User switches files rapidly, cache grows large
// Mitigation: Per-file TTL (5 minutes)
get(fileUri: string, currentPrefix: string): string | null {
    const cached = this.cache.get(fileUri);
    if (!cached) return null;

    // Check TTL
    const age = Date.now() - cached.timestamp;
    if (age > 5 * 60 * 1000) { // 5 minutes
        this.cache.delete(fileUri);
        return null;
    }

    // ... existing logic
}
```

### 4. User Pastes Large Text
```typescript
// User pastes 1000 lines, invalidate cache
onDidChangeTextDocument((event) => {
    const change = event.contentChanges[0];
    const isPaste = change.text.split('\n').length > 10;

    if (isPaste) {
        this._lastCompletionCache.clear(event.document.uri.toString());
    }
});
```

---

## 📚 Related Work

- **Refact:** Character-by-character backend cache (Rust) - completion_cache.rs:155-173
- **Aide:** Prefix overlap cache (client-side) - request-manager.ts:106-129
- **GitHub Copilot:** Speculative request cache (stores functions) - proprietary
- **Puku (existing):** Radix Trie + Speculative cache - completionsCache.ts

This PRD combines the best of all approaches:
- Refact's character-by-character strategy
- Aide's completion string caching
- Puku's existing intelligent caches (Radix Trie + Speculative)

Result: **Zero-cost, instant completions** as users type! 🎉

---

## 🤔 Open Questions

1. **Should we cache per-file or globally?**
   - Answer: Per-file (clearer invalidation, less confusion)

2. **What's the optimal cache size?**
   - Answer: 100 files (most users work on < 100 files simultaneously)

3. **Should we clear cache on file save?**
   - Answer: NO (completion still valid after save)

4. **Should we cache multi-line completions differently?**
   - Answer: NO (same logic works, just longer strings)

5. **What if user accepts partial completion (Tab vs Enter)?**
   - Answer: Both work (cache matches prefix, not suffix)
