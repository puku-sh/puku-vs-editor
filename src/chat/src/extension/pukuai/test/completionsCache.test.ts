/*---------------------------------------------------------------------------------------------
 *  Puku AI Completions Cache Tests
 *  Tests for the Radix Trie-based completions cache
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CompletionsCache } from '../common/completionsCache';

suite('CompletionsCache', function () {
	let cache: CompletionsCache;

	setup(function () {
		cache = new CompletionsCache();
	});

	suite('findAll', function () {
		test('returns empty array when cache is empty', function () {
			const results = cache.findAll('const x = ', '');
			assert.deepStrictEqual(results, []);
		});

		test('finds exact match completion', function () {
			cache.append('const x = ', '', '42');
			const results = cache.findAll('const x = ', '');
			assert.deepStrictEqual(results, ['42']);
		});

		test('finds completion when user has typed into it', function () {
			// Cache stores: prefix='const x = ', completion='42'
			cache.append('const x = ', '', '42');

			// User typed '4' after 'const x = ', so new prefix is 'const x = 4'
			// Radix Trie should return '2' (the remaining part)
			const results = cache.findAll('const x = 4', '');
			assert.deepStrictEqual(results, ['2']);
		});

		test('finds completion when user has typed entire completion', function () {
			cache.append('const x = ', '', '42');

			// User typed the entire '42' - should return empty (no remaining completion)
			const results = cache.findAll('const x = 42', '');
			assert.deepStrictEqual(results, []);
		});

		test('finds completion with suffix match', function () {
			const suffix = '\n    return result';
			cache.append('def fibonacci(n):\n    ', suffix, 'if n <= 1:\n        return n');

			const results = cache.findAll('def fibonacci(n):\n    ', suffix);
			assert.deepStrictEqual(results, ['if n <= 1:\n        return n']);
		});

		test('does not return completion when suffix differs', function () {
			cache.append('const x = ', ';', '42');

			// Different suffix - should not match
			const results = cache.findAll('const x = ', '');
			assert.deepStrictEqual(results, []);
		});

		test('handles backspace (shorter prefix)', function () {
			cache.append('const x = 42', '', ';\nconst y = 100;');

			// User backspaced to 'const x = 4'
			// Radix Trie should NOT return anything because '4' is not a complete key
			const results = cache.findAll('const x = 4', '');
			assert.deepStrictEqual(results, []);
		});

		test('handles word-by-word acceptance', function () {
			// Simulate GitHub Copilot's word acceptance (Cmd+Right Arrow)
			cache.append('function hello() {\n    ', '', 'console.log("Hello, World!");\n}');

			// User accepts 'console'
			let results = cache.findAll('function hello() {\n    console', '');
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0], '.log("Hello, World!");\n}');

			// User accepts '.log'
			results = cache.findAll('function hello() {\n    console.log', '');
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0], '("Hello, World!");\n}');
		});

		test('supports multiple completions for same prefix', function () {
			cache.append('const x = ', '', '42');
			cache.append('const x = ', '', '100');

			const results = cache.findAll('const x = ', '');
			// Should return both completions
			assert.strictEqual(results.length, 2);
			assert.ok(results.includes('42'));
			assert.ok(results.includes('100'));
		});

		test('handles empty completion', function () {
			cache.append('const x = ', '', '');
			const results = cache.findAll('const x = ', '');
			// Empty completion should still be stored
			assert.deepStrictEqual(results, ['']);
		});
	});

	suite('append', function () {
		test('stores single completion', function () {
			cache.append('const x = ', '', '42');
			const results = cache.findAll('const x = ', '');
			assert.strictEqual(results.length, 1);
			assert.strictEqual(results[0], '42');
		});

		test('appends to existing prefix with same suffix', function () {
			cache.append('const x = ', '', '42');
			cache.append('const x = ', '', '100');

			const results = cache.findAll('const x = ', '');
			assert.strictEqual(results.length, 2);
		});

		test('creates separate entries for different suffixes', function () {
			cache.append('const x = ', ';', '42');
			cache.append('const x = ', '', '100');

			// Same prefix, but different suffixes - should be separate
			const resultsSemicolon = cache.findAll('const x = ', ';');
			const resultsEmpty = cache.findAll('const x = ', '');

			assert.deepStrictEqual(resultsSemicolon, ['42']);
			assert.deepStrictEqual(resultsEmpty, ['100']);
		});

		test('handles complex multi-line completions', function () {
			const prefix = 'function calculate(a, b) {\n    ';
			const suffix = '\n}';
			const completion = 'const sum = a + b;\n    const product = a * b;\n    return { sum, product };';

			cache.append(prefix, suffix, completion);

			const results = cache.findAll(prefix, suffix);
			assert.deepStrictEqual(results, [completion]);
		});

		test('handles unicode characters', function () {
			cache.append('const emoji = "', '";', '🤦🏽‍♂️');
			const results = cache.findAll('const emoji = "', '";');
			assert.deepStrictEqual(results, ['🤦🏽‍♂️']);
		});
	});

	suite('clear', function () {
		test('removes all cached completions', function () {
			cache.append('const x = ', '', '42');
			cache.append('const y = ', '', '100');
			cache.append('function test() {', '}', '\n    return true;\n');

			cache.clear();

			assert.deepStrictEqual(cache.findAll('const x = ', ''), []);
			assert.deepStrictEqual(cache.findAll('const y = ', ''), []);
			assert.deepStrictEqual(cache.findAll('function test() {', '}'), []);
		});

		test('allows new entries after clear', function () {
			cache.append('const x = ', '', '42');
			cache.clear();
			cache.append('const y = ', '', '100');

			assert.deepStrictEqual(cache.findAll('const x = ', ''), []);
			assert.deepStrictEqual(cache.findAll('const y = ', ''), ['100']);
		});
	});

	suite('LRU eviction', function () {
		test('evicts least recently used entries when cache is full', function () {
			// CompletionsCache uses LRURadixTrie with maxSize=100
			// We'll add 101 unique entries to trigger eviction
			for (let i = 0; i < 101; i++) {
				cache.append(`const x${i} = `, '', `${i}`);
			}

			// First entry (x0) should be evicted
			assert.deepStrictEqual(cache.findAll('const x0 = ', ''), []);

			// Last entry (x100) should still be there
			assert.deepStrictEqual(cache.findAll('const x100 = ', ''), ['100']);
		});

		test('accessing entry updates LRU status', function () {
			// Add 3 entries
			cache.append('const a = ', '', '1');
			cache.append('const b = ', '', '2');
			cache.append('const c = ', '', '3');

			// Access 'a' to make it recently used
			cache.findAll('const a = ', '');

			// Add many more entries to trigger eviction
			for (let i = 0; i < 100; i++) {
				cache.append(`const x${i} = `, '', `${i}`);
			}

			// 'b' and 'c' should be evicted (least recently used)
			// 'a' should still be there (recently accessed)
			assert.notDeepStrictEqual(cache.findAll('const a = ', ''), []);
		});
	});

	suite('real-world scenarios', function () {
		test('simulates typing and accepting a Go function', function () {
			// Initial completion
			const prefix1 = 'func main() {\n\t';
			const suffix1 = '\n}';
			const completion1 = 'fmt.Println("Hello, World!")';

			cache.append(prefix1, suffix1, completion1);

			// User sees and starts accepting word-by-word
			let results = cache.findAll(prefix1, suffix1);
			assert.deepStrictEqual(results, [completion1]);

			// User accepts 'fmt'
			results = cache.findAll('func main() {\n\tfmt', suffix1);
			assert.strictEqual(results[0], '.Println("Hello, World!")');

			// User accepts '.Println'
			results = cache.findAll('func main() {\n\tfmt.Println', suffix1);
			assert.strictEqual(results[0], '("Hello, World!")');
		});

		test('simulates Python function with context', function () {
			const prefix = 'def fibonacci(n):\n    ';
			const suffix = '\n    return result';
			const completion = 'if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b';

			cache.append(prefix, suffix, completion);

			// User starts typing
			let results = cache.findAll(prefix + 'if', suffix);
			assert.strictEqual(results[0], ' n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b');
		});

		test('simulates JavaScript import and function', function () {
			cache.append('import { ', ' } from "lodash";', 'map, filter, reduce');

			// User types and accepts
			let results = cache.findAll('import { map', ' } from "lodash";');
			assert.strictEqual(results[0], ', filter, reduce');
		});
	});
});
