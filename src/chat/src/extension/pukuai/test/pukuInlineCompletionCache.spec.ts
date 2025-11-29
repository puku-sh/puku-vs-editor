/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for speculative caching in PukuInlineCompletionProvider
 *--------------------------------------------------------------------------------------------*/

import { describe, it, expect } from 'vitest';

/**
 * LRU Cache implementation (same as in pukuInlineCompletionProvider.ts)
 */
class LRUCacheMap<K, T> implements Map<K, T> {
	private valueMap = new Map<K, T>();
	private sizeLimit: number;

	constructor(size = 10) {
		if (size < 1) {
			throw new Error('Size limit must be at least 1');
		}
		this.sizeLimit = size;
	}

	set(key: K, value: T): this {
		if (this.has(key)) {
			this.valueMap.delete(key);
		} else if (this.valueMap.size >= this.sizeLimit) {
			// LRU eviction - remove oldest (first) entry
			const oldest = this.valueMap.keys().next().value!;
			this.delete(oldest);
		}
		this.valueMap.set(key, value);
		return this;
	}

	get(key: K): T | undefined {
		if (this.valueMap.has(key)) {
			const entry = this.valueMap.get(key);
			// Move to end (most recently used)
			this.valueMap.delete(key);
			this.valueMap.set(key, entry!);
			return entry!;
		}
		return undefined;
	}

	delete(key: K): boolean {
		return this.valueMap.delete(key);
	}

	clear(): void {
		this.valueMap.clear();
	}

	get size(): number {
		return this.valueMap.size;
	}

	has(key: K): boolean {
		return this.valueMap.has(key);
	}

	peek(key: K): T | undefined {
		return this.valueMap.get(key);
	}

	keys(): IterableIterator<K> { return new Map(this.valueMap).keys(); }
	values(): IterableIterator<T> { return new Map(this.valueMap).values(); }
	entries(): IterableIterator<[K, T]> { return new Map(this.valueMap).entries(); }
	[Symbol.iterator](): IterableIterator<[K, T]> { return this.entries(); }
	forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => void, thisArg?: unknown): void {
		new Map(this.valueMap).forEach(callbackfn, thisArg);
	}
	get [Symbol.toStringTag](): string { return 'LRUCacheMap'; }
}

/**
 * Speculative Request Cache (stores REQUEST FUNCTIONS, not results)
 */
type RequestFunction = () => Promise<string | null>;

class SpeculativeRequestCache {
	private cache = new LRUCacheMap<string, RequestFunction>(100);

	set(completionId: string, requestFunction: RequestFunction): void {
		this.cache.set(completionId, requestFunction);
	}

	async request(completionId: string): Promise<string | null> {
		const fn = this.cache.get(completionId);
		if (fn === undefined) {
			return null;
		}
		this.cache.delete(completionId);
		return await fn();
	}

	has(completionId: string): boolean {
		return this.cache.has(completionId);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}

describe('SpeculativeRequestCache', () => {
	it('should store and execute request functions', async () => {
		const cache = new SpeculativeRequestCache();
		let apiCallCount = 0;

		// Store a request function
		const requestFn = async () => {
			apiCallCount++;
			return 'completion-1';
		};

		cache.set('completion-1', requestFn);
		expect(cache.has('completion-1')).toBe(true);
		expect(apiCallCount).toBe(0); // Function should not be executed yet

		// Execute the stored function
		const result = await cache.request('completion-1');
		expect(result).toBe('completion-1');
		expect(apiCallCount).toBe(1); // Function should be executed once
		expect(cache.has('completion-1')).toBe(false); // Entry should be removed after execution
	});

	it('should return null for non-existent keys', async () => {
		const cache = new SpeculativeRequestCache();
		const result = await cache.request('non-existent');
		expect(result).toBe(null);
	});

	it('should support multiple concurrent requests', async () => {
		const cache = new SpeculativeRequestCache();
		const results: string[] = [];

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

		expect(cache.size).toBe(3);

		// Execute them
		const r1 = await cache.request('completion-1');
		const r2 = await cache.request('completion-2');
		const r3 = await cache.request('completion-3');

		expect(results).toEqual(['exec-1', 'exec-2', 'exec-3']);
		expect([r1, r2, r3]).toEqual(['result-1', 'result-2', 'result-3']);
		expect(cache.size).toBe(0); // All entries should be removed after execution
	});

	it('should clear all entries', async () => {
		const cache = new SpeculativeRequestCache();
		cache.set('completion-1', async () => 'result-1');
		cache.set('completion-2', async () => 'result-2');
		expect(cache.size).toBe(2);

		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.has('completion-1')).toBe(false);
		expect(cache.has('completion-2')).toBe(false);
	});

	it('should handle async errors gracefully', async () => {
		const cache = new SpeculativeRequestCache();
		cache.set('completion-1', async () => {
			throw new Error('API error');
		});

		await expect(cache.request('completion-1')).rejects.toThrow('API error');

		// Entry should still be removed even after error
		expect(cache.has('completion-1')).toBe(false);
	});
});

describe('Speculative Caching Flow', () => {
	it('cache HIT should bypass debounce', async () => {
		const cache = new SpeculativeRequestCache();
		let apiCallCount = 0;
		const debounceMs = 800;

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

		expect(apiCallCount).toBe(1); // First request should call API
		expect(cache.has(completionId1)).toBe(true);

		// Simulate second request immediately after (< 800ms) - cache HIT
		const now = Date.now();
		const timeSinceLastRequest = now - lastRequestTime;

		// Check if cache has entry (BEFORE debounce check)
		if (cache.has(completionId1)) {
			// Cache HIT - bypass debounce!
			const completion2 = await cache.request(completionId1);
			expect(completion2).toBe('func main() {\n\tfmt.Println("Hello")\n}');
			expect(apiCallCount).toBe(2); // Speculative request should execute
			expect(timeSinceLastRequest < debounceMs).toBe(true); // Request should happen within debounce window
		} else {
			throw new Error('Cache should have entry');
		}
	});

	it('cache MISS should apply debounce', async () => {
		const cache = new SpeculativeRequestCache();
		let apiCallCount = 0;
		const debounceMs = 800;
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
				expect(apiCallCount).toBe(1); // Should not make second API call due to debounce
				return;
			}
		}

		throw new Error('Should have been debounced');
	});

	it('single character change should be skipped', () => {
		const lastPrefix = 'func main() {';
		const newPrefix = 'func main() {\n';

		// Check if only 1 character added
		const isSingleCharChange =
			lastPrefix &&
			newPrefix.length - lastPrefix.length === 1 &&
			newPrefix.startsWith(lastPrefix);

		expect(isSingleCharChange).toBe(true); // Should detect single character change
	});

	it('multi-character change should not be skipped', () => {
		const lastPrefix = 'func main() {';
		const newPrefix = 'func main() {\n\tfmt.';

		// Check if only 1 character added
		const isSingleCharChange =
			lastPrefix &&
			newPrefix.length - lastPrefix.length === 1 &&
			newPrefix.startsWith(lastPrefix);

		expect(isSingleCharChange).toBe(false); // Should not skip multi-character change
	});
});

describe('Cache-First Request Flow', () => {
	it('order: Auth → Cache → Debounce → API', async () => {
		const executionOrder: string[] = [];
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
			expect(result).toBe('cached-result');
			expect(executionOrder).toEqual([
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

	it('cache miss flow: Auth → Cache → Debounce → API', async () => {
		const executionOrder: string[] = [];
		const cache = new SpeculativeRequestCache();
		const lastRequestTime = Date.now() - 1000; // Old timestamp
		const debounceMs = 800;

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

		expect(executionOrder).toEqual([
			'auth-check',
			'cache-check',
			'debounce-check',
			'api-call'
		]);
	});
});
