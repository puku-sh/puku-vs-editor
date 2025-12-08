"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Radix Trie Tests
 *  Tests for LRURadixTrie data structure used in completions cache
 *  Based on GitHub Copilot's implementation
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const radixTrie_1 = require("../common/radixTrie");
suite('LRURadixTrie', function () {
    let trie;
    setup(function () {
        trie = new radixTrie_1.LRURadixTrie(20);
    });
    suite('set', function () {
        test('stores a single value', function () {
            trie.set('test', 'value');
            assert.deepStrictEqual(trie.findAll('test'), [{ remainingKey: '', value: 'value' }]);
        });
        test('splits edges when inserting', function () {
            trie.set('test', 'first');
            trie.set('testing', 'second');
            assert.deepStrictEqual(trie.findAll('testing'), [
                { remainingKey: '', value: 'second' },
                { remainingKey: 'ing', value: 'first' },
            ]);
        });
        test('evicts least recently used when exceeding max size', function () {
            trie = new radixTrie_1.LRURadixTrie(3);
            trie.set('a', 'first');
            trie.set('b', 'second');
            trie.set('c', 'third');
            trie.set('d', 'fourth');
            assert.deepStrictEqual(trie.findAll('a'), []);
            assert.deepStrictEqual(trie.findAll('b'), [{ remainingKey: '', value: 'second' }]);
            assert.deepStrictEqual(trie.findAll('c'), [{ remainingKey: '', value: 'third' }]);
            assert.deepStrictEqual(trie.findAll('d'), [{ remainingKey: '', value: 'fourth' }]);
        });
        test('shorter key as prefix of longer key', function () {
            const trie = new radixTrie_1.LRURadixTrie(20);
            trie.set('test', '1');
            trie.set('t', '2');
            assert.deepStrictEqual(trie.findAll('test'), [
                { remainingKey: '', value: '1' },
                { remainingKey: 'est', value: '2' },
            ]);
        });
        test('insertion order does not matter', function () {
            const trie1 = new radixTrie_1.LRURadixTrie(20);
            const trie2 = new radixTrie_1.LRURadixTrie(20);
            trie1.set('t', '2');
            trie1.set('test', '1');
            trie2.set('test', '1');
            trie2.set('t', '2');
            assert.deepStrictEqual(trie1.findAll('test'), [
                { remainingKey: '', value: '1' },
                { remainingKey: 'est', value: '2' },
            ]);
            assert.deepStrictEqual(trie2.findAll('test'), [
                { remainingKey: '', value: '1' },
                { remainingKey: 'est', value: '2' },
            ]);
            assert.deepStrictEqual(trie1.findAll('test'), trie2.findAll('test'));
        });
        test('handles code completion prefixes', function () {
            trie.set('const x = ', 'value1');
            trie.set('const x = 4', 'value2');
            trie.set('const x = 42', 'value3');
            const results = trie.findAll('const x = 42');
            assert.strictEqual(results.length, 3);
            assert.deepStrictEqual(results[0], { remainingKey: '', value: 'value3' });
            assert.deepStrictEqual(results[1], { remainingKey: '2', value: 'value2' });
            assert.deepStrictEqual(results[2], { remainingKey: '42', value: 'value1' });
        });
    });
    suite('findAll', function () {
        test('returns all matching prefixes', function () {
            trie.set('t', 'first');
            trie.set('te', 'second');
            trie.set('test', 'third');
            trie.set('test2', 'not expected');
            trie.set('team', 'not expected');
            trie.set('the', 'not expected');
            assert.deepStrictEqual(trie.findAll('test'), [
                { remainingKey: '', value: 'third' },
                { remainingKey: 'st', value: 'second' },
                { remainingKey: 'est', value: 'first' },
            ]);
        });
        test('returns empty array when no matches found', function () {
            trie.set('abc', 'value');
            trie.set('xyz1', 'value');
            trie.set('xyz2', 'value');
            assert.deepStrictEqual(trie.findAll('xyz'), []);
        });
        test('updates the least recently used when accessed', function () {
            trie = new radixTrie_1.LRURadixTrie(3);
            trie.set('a', 'first');
            trie.set('b', 'second');
            trie.set('c', 'third');
            trie.findAll('a');
            trie.set('d', 'fourth');
            assert.deepStrictEqual(trie.findAll('b'), []);
            assert.deepStrictEqual(trie.findAll('c'), [{ remainingKey: '', value: 'third' }]);
            assert.deepStrictEqual(trie.findAll('d'), [{ remainingKey: '', value: 'fourth' }]);
            assert.deepStrictEqual(trie.findAll('a'), [{ remainingKey: '', value: 'first' }]);
        });
        test('finds partial matches for code completions', function () {
            trie.set('function hello() {\n    ', 'console.log("Hello");');
            // User types 'console'
            const results = trie.findAll('function hello() {\n    console');
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].remainingKey, 'console');
            assert.strictEqual(results[0].value, 'console.log("Hello");');
        });
    });
    suite('delete', function () {
        test('removes a value', function () {
            trie.set('test', 'value');
            trie.delete('test');
            assert.deepStrictEqual(trie.findAll('test'), []);
        });
        test('handles merging child node after delete', function () {
            trie.set('test', 'first');
            trie.set('testing', 'second');
            trie.delete('test');
            assert.deepStrictEqual(trie.findAll('test'), []);
            assert.deepStrictEqual(trie.findAll('testing'), [{ remainingKey: '', value: 'second' }]);
        });
        test('handles merging sibling node after delete', function () {
            trie.set('test', 'first');
            trie.set('testing', 'second');
            trie.set('testy', 'third');
            trie.delete('test');
            trie.delete('testing');
            assert.deepStrictEqual(trie.findAll('test'), []);
            assert.deepStrictEqual(trie.findAll('testing'), []);
            assert.deepStrictEqual(trie.findAll('testy'), [{ remainingKey: '', value: 'third' }]);
        });
        test('does nothing when key not found', function () {
            trie.set('test', 'value');
            trie.delete('other');
            assert.deepStrictEqual(trie.findAll('test'), [{ remainingKey: '', value: 'value' }]);
        });
    });
    suite('completion-specific scenarios', function () {
        test('handles multi-line code completions', function () {
            const prefix = 'function fibonacci(n) {\n    ';
            const completion = 'if (n <= 1) return n;\n    return fibonacci(n-1) + fibonacci(n-2);';
            trie.set(prefix, completion);
            const results = trie.findAll(prefix);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].value, completion);
        });
        test('handles word-by-word acceptance', function () {
            const base = 'const result = ';
            trie.set(base, 'calculateSum(a, b)');
            // User accepts 'calculate'
            let results = trie.findAll(base + 'calculate');
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].remainingKey, 'calculate');
            // User accepts 'Sum'
            results = trie.findAll(base + 'calculateSum');
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].remainingKey, 'calculateSum');
            // User accepts '(a, b)'
            results = trie.findAll(base + 'calculateSum(a, b)');
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].remainingKey, 'calculateSum(a, b)');
        });
        test('distinguishes between different code contexts', function () {
            trie.set('func main() {\n\t', 'fmt.Println("Go")');
            trie.set('function main() {\n    ', 'console.log("JS")');
            const goResults = trie.findAll('func main() {\n\t');
            const jsResults = trie.findAll('function main() {\n    ');
            assert.strictEqual(goResults[0].value, 'fmt.Println("Go")');
            assert.strictEqual(jsResults[0].value, 'console.log("JS")');
        });
        test('handles indentation variations', function () {
            trie.set('if (condition) {\n    ', 'doSomething();');
            trie.set('if (condition) {\n\t', 'doSomethingElse();');
            // Spaces vs tabs - should be separate entries
            const spacesResult = trie.findAll('if (condition) {\n    ');
            const tabsResult = trie.findAll('if (condition) {\n\t');
            assert.strictEqual(spacesResult[0].value, 'doSomething();');
            assert.strictEqual(tabsResult[0].value, 'doSomethingElse();');
        });
    });
    suite('performance and edge cases', function () {
        test('handles large number of entries', function () {
            const largeLimit = 1000;
            const largeTrie = new radixTrie_1.LRURadixTrie(largeLimit);
            // Add 1000 entries
            for (let i = 0; i < largeLimit; i++) {
                largeTrie.set(`entry-${i}`, `value-${i}`);
            }
            // All should be accessible
            for (let i = 0; i < largeLimit; i++) {
                const results = largeTrie.findAll(`entry-${i}`);
                assert.strictEqual(results.length, 1);
                assert.strictEqual(results[0].value, `value-${i}`);
            }
        });
        test('handles very long keys', function () {
            const longKey = 'a'.repeat(10000);
            trie.set(longKey, 'value');
            const results = trie.findAll(longKey);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].value, 'value');
        });
        test('handles empty string key', function () {
            trie.set('', 'empty');
            const results = trie.findAll('');
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].value, 'empty');
        });
        test('handles special characters', function () {
            trie.set('function test() {\n\t// Comment\n\t', 'return true;');
            const results = trie.findAll('function test() {\n\t// Comment\n\t');
            assert.strictEqual(results[0].value, 'return true;');
        });
        test('handles overlapping prefixes efficiently', function () {
            const prefixes = [
                'const ',
                'const x',
                'const x ',
                'const x =',
                'const x = ',
                'const x = 4',
                'const x = 42',
            ];
            prefixes.forEach((prefix, i) => {
                trie.set(prefix, `value${i}`);
            });
            // Each prefix should be findable
            prefixes.forEach((prefix, i) => {
                const results = trie.findAll(prefix);
                assert.ok(results.length > 0, `Should find results for "${prefix}"`);
            });
        });
    });
    suite('LRU eviction behavior', function () {
        test('evicts in correct order', function () {
            trie = new radixTrie_1.LRURadixTrie(3);
            trie.set('first', '1');
            trie.set('second', '2');
            trie.set('third', '3');
            // Access 'first' to make it recently used
            trie.findAll('first');
            // Add fourth item - should evict 'second' (least recently used)
            trie.set('fourth', '4');
            assert.deepStrictEqual(trie.findAll('first'), [{ remainingKey: '', value: '1' }]);
            assert.deepStrictEqual(trie.findAll('second'), []);
            assert.deepStrictEqual(trie.findAll('third'), [{ remainingKey: '', value: '3' }]);
            assert.deepStrictEqual(trie.findAll('fourth'), [{ remainingKey: '', value: '4' }]);
        });
        test('reading value updates LRU status', function () {
            trie = new radixTrie_1.LRURadixTrie(3);
            trie.set('a', '1');
            trie.set('b', '2');
            trie.set('c', '3');
            // Read 'a' multiple times
            trie.findAll('a');
            trie.findAll('a');
            // Add more entries
            trie.set('d', '4');
            trie.set('e', '5');
            // 'a' should still be there (accessed recently)
            // 'b' and 'c' should be evicted
            assert.deepStrictEqual(trie.findAll('a'), [{ remainingKey: '', value: '1' }]);
            assert.deepStrictEqual(trie.findAll('b'), []);
            assert.deepStrictEqual(trie.findAll('c'), []);
            assert.deepStrictEqual(trie.findAll('d'), [{ remainingKey: '', value: '4' }]);
            assert.deepStrictEqual(trie.findAll('e'), [{ remainingKey: '', value: '5' }]);
        });
        test('overwriting value updates LRU status', function () {
            trie = new radixTrie_1.LRURadixTrie(3);
            trie.set('a', '1');
            trie.set('b', '2');
            trie.set('c', '3');
            // Overwrite 'a'
            trie.set('a', '1-updated');
            // Add new entry - should evict 'b' (least recently used)
            trie.set('d', '4');
            assert.deepStrictEqual(trie.findAll('a'), [{ remainingKey: '', value: '1-updated' }]);
            assert.deepStrictEqual(trie.findAll('b'), []);
            assert.deepStrictEqual(trie.findAll('c'), [{ remainingKey: '', value: '3' }]);
            assert.deepStrictEqual(trie.findAll('d'), [{ remainingKey: '', value: '4' }]);
        });
    });
});
//# sourceMappingURL=radixTrie.test.js.map