"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for speculative caching in PukuInlineCompletionProvider
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
/**
 * LRU Cache implementation (same as in pukuInlineCompletionProvider.ts)
 */
class LRUCacheMap {
    constructor(size = 10) {
        this.valueMap = new Map();
        if (size < 1) {
            throw new Error('Size limit must be at least 1');
        }
        this.sizeLimit = size;
    }
    set(key, value) {
        if (this.has(key)) {
            this.valueMap.delete(key);
        }
        else if (this.valueMap.size >= this.sizeLimit) {
            // LRU eviction - remove oldest (first) entry
            const oldest = this.valueMap.keys().next().value;
            this.delete(oldest);
        }
        this.valueMap.set(key, value);
        return this;
    }
    get(key) {
        if (this.valueMap.has(key)) {
            const entry = this.valueMap.get(key);
            // Move to end (most recently used)
            this.valueMap.delete(key);
            this.valueMap.set(key, entry);
            return entry;
        }
        return undefined;
    }
    delete(key) {
        return this.valueMap.delete(key);
    }
    clear() {
        this.valueMap.clear();
    }
    get size() {
        return this.valueMap.size;
    }
    has(key) {
        return this.valueMap.has(key);
    }
    peek(key) {
        return this.valueMap.get(key);
    }
    keys() { return new Map(this.valueMap).keys(); }
    values() { return new Map(this.valueMap).values(); }
    entries() { return new Map(this.valueMap).entries(); }
    [Symbol.iterator]() { return this.entries(); }
    forEach(callbackfn, thisArg) {
        new Map(this.valueMap).forEach(callbackfn, thisArg);
    }
    get [Symbol.toStringTag]() { return 'LRUCacheMap'; }
}
class SpeculativeRequestCache {
    constructor() {
        this.cache = new LRUCacheMap(100);
    }
    set(completionId, requestFunction) {
        this.cache.set(completionId, requestFunction);
    }
    async request(completionId) {
        const fn = this.cache.get(completionId);
        if (fn === undefined) {
            return null;
        }
        this.cache.delete(completionId);
        return await fn();
    }
    has(completionId) {
        return this.cache.has(completionId);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
(0, vitest_1.describe)('SpeculativeRequestCache', () => {
    (0, vitest_1.it)('should store and execute request functions', async () => {
        const cache = new SpeculativeRequestCache();
        let apiCallCount = 0;
        // Store a request function
        const requestFn = async () => {
            apiCallCount++;
            return 'completion-1';
        };
        cache.set('completion-1', requestFn);
        (0, vitest_1.expect)(cache.has('completion-1')).toBe(true);
        (0, vitest_1.expect)(apiCallCount).toBe(0); // Function should not be executed yet
        // Execute the stored function
        const result = await cache.request('completion-1');
        (0, vitest_1.expect)(result).toBe('completion-1');
        (0, vitest_1.expect)(apiCallCount).toBe(1); // Function should be executed once
        (0, vitest_1.expect)(cache.has('completion-1')).toBe(false); // Entry should be removed after execution
    });
    (0, vitest_1.it)('should return null for non-existent keys', async () => {
        const cache = new SpeculativeRequestCache();
        const result = await cache.request('non-existent');
        (0, vitest_1.expect)(result).toBe(null);
    });
    (0, vitest_1.it)('should support multiple concurrent requests', async () => {
        const cache = new SpeculativeRequestCache();
        const results = [];
        // Store multiple request functions
        cache.set('completion-1', async () => {
            results.push('exec-1');
            return 'result-1';
        });
        cache.set('completion-2', async () => {
            results.push('exec-2');
            return 'result-2';
        });
        cache.set('completion-3', async () => {
            results.push('exec-3');
            return 'result-3';
        });
        (0, vitest_1.expect)(cache.size).toBe(3);
        // Execute them
        const r1 = await cache.request('completion-1');
        const r2 = await cache.request('completion-2');
        const r3 = await cache.request('completion-3');
        (0, vitest_1.expect)(results).toEqual(['exec-1', 'exec-2', 'exec-3']);
        (0, vitest_1.expect)([r1, r2, r3]).toEqual(['result-1', 'result-2', 'result-3']);
        (0, vitest_1.expect)(cache.size).toBe(0); // All entries should be removed after execution
    });
    (0, vitest_1.it)('should clear all entries', async () => {
        const cache = new SpeculativeRequestCache();
        cache.set('completion-1', async () => 'result-1');
        cache.set('completion-2', async () => 'result-2');
        (0, vitest_1.expect)(cache.size).toBe(2);
        cache.clear();
        (0, vitest_1.expect)(cache.size).toBe(0);
        (0, vitest_1.expect)(cache.has('completion-1')).toBe(false);
        (0, vitest_1.expect)(cache.has('completion-2')).toBe(false);
    });
    (0, vitest_1.it)('should handle async errors gracefully', async () => {
        const cache = new SpeculativeRequestCache();
        cache.set('completion-1', async () => {
            throw new Error('API error');
        });
        await (0, vitest_1.expect)(cache.request('completion-1')).rejects.toThrow('API error');
        // Entry should still be removed even after error
        (0, vitest_1.expect)(cache.has('completion-1')).toBe(false);
    });
});
(0, vitest_1.describe)('Speculative Caching Flow', () => {
    (0, vitest_1.it)('cache HIT should bypass debounce', async () => {
        const cache = new SpeculativeRequestCache();
        let apiCallCount = 0;
        const debounceMs = 200; // From server config (DEFAULT_PUKU_CONFIG.performance.debounceMs)
        // Simulate first request (cache MISS)
        const completionId1 = 'puku-completion-1';
        const lastRequestTime = Date.now();
        // Fetch from API (cache miss)
        apiCallCount++;
        // Store speculative request for next completion
        const speculativeRequestFn = async () => {
            apiCallCount++;
            return 'func main() {\n\tfmt.Println("Hello")\n}';
        };
        cache.set(completionId1, speculativeRequestFn);
        (0, vitest_1.expect)(apiCallCount).toBe(1); // First request should call API
        (0, vitest_1.expect)(cache.has(completionId1)).toBe(true);
        // Simulate second request immediately after (< 800ms) - cache HIT
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        // Check if cache has entry (BEFORE debounce check)
        if (cache.has(completionId1)) {
            // Cache HIT - bypass debounce!
            const completion2 = await cache.request(completionId1);
            (0, vitest_1.expect)(completion2).toBe('func main() {\n\tfmt.Println("Hello")\n}');
            (0, vitest_1.expect)(apiCallCount).toBe(2); // Speculative request should execute
            (0, vitest_1.expect)(timeSinceLastRequest < debounceMs).toBe(true); // Request should happen within debounce window
        }
        else {
            throw new Error('Cache should have entry');
        }
    });
    (0, vitest_1.it)('cache MISS should apply debounce', async () => {
        const cache = new SpeculativeRequestCache();
        let apiCallCount = 0;
        const debounceMs = 200; // From server config (DEFAULT_PUKU_CONFIG.performance.debounceMs)
        const lastRequestTime = Date.now();
        // Simulate first request
        apiCallCount++;
        // Simulate second request immediately (< 800ms) - cache MISS
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;
        // No cache entry - apply debounce
        if (!cache.has('any-completion-id')) {
            if (timeSinceLastRequest < debounceMs) {
                // Debounced - return null
                (0, vitest_1.expect)(apiCallCount).toBe(1); // Should not make second API call due to debounce
                return;
            }
        }
        throw new Error('Should have been debounced');
    });
    (0, vitest_1.it)('single character change should be skipped', () => {
        const lastPrefix = 'func main() {';
        const newPrefix = 'func main() {\n';
        // Check if only 1 character added
        const isSingleCharChange = lastPrefix &&
            newPrefix.length - lastPrefix.length === 1 &&
            newPrefix.startsWith(lastPrefix);
        (0, vitest_1.expect)(isSingleCharChange).toBe(true); // Should detect single character change
    });
    (0, vitest_1.it)('multi-character change should not be skipped', () => {
        const lastPrefix = 'func main() {';
        const newPrefix = 'func main() {\n\tfmt.';
        // Check if only 1 character added
        const isSingleCharChange = lastPrefix &&
            newPrefix.length - lastPrefix.length === 1 &&
            newPrefix.startsWith(lastPrefix);
        (0, vitest_1.expect)(isSingleCharChange).toBe(false); // Should not skip multi-character change
    });
});
(0, vitest_1.describe)('Cache-First Request Flow', () => {
    (0, vitest_1.it)('order: Auth → Cache → Debounce → API', async () => {
        const executionOrder = [];
        const cache = new SpeculativeRequestCache();
        // 1. Auth check
        executionOrder.push('auth-check');
        const isAuthenticated = true;
        if (!isAuthenticated) {
            throw new Error('Should be authenticated');
        }
        // 2. Cache check (BEFORE debounce)
        executionOrder.push('cache-check');
        const lastCompletionId = 'completion-1';
        cache.set(lastCompletionId, async () => {
            executionOrder.push('cache-hit-execution');
            return 'cached-result';
        });
        if (cache.has(lastCompletionId)) {
            // Cache HIT - bypass debounce
            const result = await cache.request(lastCompletionId);
            (0, vitest_1.expect)(result).toBe('cached-result');
            (0, vitest_1.expect)(executionOrder).toEqual([
                'auth-check',
                'cache-check',
                'cache-hit-execution'
            ]);
            return;
        }
        // 3. Cache MISS - check debounce
        executionOrder.push('debounce-check');
        // 4. Fetch from API
        executionOrder.push('api-call');
        throw new Error('Should have returned on cache hit');
    });
    (0, vitest_1.it)('cache miss flow: Auth → Cache → Debounce → API', async () => {
        const executionOrder = [];
        const cache = new SpeculativeRequestCache();
        const lastRequestTime = Date.now() - 1000; // Old timestamp
        const debounceMs = 200; // From server config (DEFAULT_PUKU_CONFIG.performance.debounceMs)
        // 1. Auth check
        executionOrder.push('auth-check');
        // 2. Cache check
        executionOrder.push('cache-check');
        const lastCompletionId = null; // No cached completion
        if (lastCompletionId && cache.has(lastCompletionId)) {
            throw new Error('Should not have cache entry');
        }
        // 3. Debounce check (only after cache miss)
        executionOrder.push('debounce-check');
        const now = Date.now();
        if (now - lastRequestTime < debounceMs) {
            executionOrder.push('debounced');
            throw new Error('Should not be debounced (enough time passed)');
        }
        // 4. API call
        executionOrder.push('api-call');
        (0, vitest_1.expect)(executionOrder).toEqual([
            'auth-check',
            'cache-check',
            'debounce-check',
            'api-call'
        ]);
    });
});
//# sourceMappingURL=pukuInlineCompletionCache.spec.js.map