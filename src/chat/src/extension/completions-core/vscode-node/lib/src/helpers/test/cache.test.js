"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
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
const cache_1 = require("../cache");
const assert = __importStar(require("assert"));
suite('LRUCacheMap', function () {
    test('should add and retrieve entries using set and get methods', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);
        assert.equal(cache.get('b'), 2);
        assert.equal(cache.get('c'), 3);
        assert.equal(cache.get('a'), undefined, 'a should have been removed from the cache');
        assert.equal(cache.size, 2);
    });
    test('should not increase size if the same object is added twice', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('a', 1);
        assert.equal(cache.size, 1);
    });
    test('should maintain the order of the values consistent with the order that the items were added or retrieved', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        assert.equal(cache.get('a'), 1); // this should make 'b' the most recently used
        assert.equal(cache.peek('b'), 2); // this should not change the order
        assert.ok(cache.has('b')); // b should still be in the cache
        cache.set('c', 3);
        assert.deepEqual([...cache.keys()], ['a', 'c']);
        assert.deepEqual([...cache.values()], [1, 3]);
        assert.ok(!cache.has('b')); // b should have been removed from the cache
        assert.equal(cache.get('b'), undefined, 'b should have been removed from the cache');
        assert.equal(cache.get('z'), undefined, 'z was never added to the cache');
        assert.equal(cache.size, 2);
    });
    test('should delete entries using the delete method and decrease size', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.delete('a');
        assert.equal(cache.get('a'), undefined);
        assert.equal(cache.size, 1);
    });
    test('clear works', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        cache.clear();
        assert.equal(cache.get('a'), undefined);
        assert.equal(cache.get('b'), undefined);
        assert.equal(cache.size, 0);
    });
    test('should iterate over all entries using a for...of loop', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        const entries = [];
        for (const [key, value] of cache) {
            entries.push([key, value]);
            // touch a should not change for loop contents even though it becomes most recently used in the LRU
            cache.get('a');
            cache.set('c', 3); // similarly, adding a new entry should not change the for loop contents
        }
        assert.deepEqual(entries, [
            ['a', 1],
            ['b', 2],
        ]);
    });
    test('should iterate over all entries using the entries method', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        const entries = [];
        for (const [key, value] of cache.entries()) {
            entries.push([key, value]);
            // touch a should not change for loop contents even though it becomes most recently used in the LRU
            cache.get('a');
            cache.set('c', 3); // similarly, adding a new entry should not change the for loop contents
        }
        assert.deepEqual(entries, [
            ['a', 1],
            ['b', 2],
        ]);
    });
    test('should iterate over all entries using the forEach method', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        const entries = [];
        cache.forEach((value, key) => {
            entries.push([key, value]);
            cache.clear(); // shouldn't affect contents of forEach loop
        });
        assert.deepEqual(entries, [
            ['a', 1],
            ['b', 2],
        ]);
    });
    test('should iterate over all values using the values method', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        const values = [];
        for (const value of cache.values()) {
            values.push(value);
            // touch a should not change for loop contents even though it becomes most recently used in the LRU
            cache.get('a');
            cache.set('c', 3); // similarly, adding a new entry should not change the for loop contents
        }
        assert.deepEqual(values, [1, 2]);
    });
    test('should iterate over all keys using the keys method', function () {
        const cache = new cache_1.LRUCacheMap(2);
        cache.set('a', 1);
        cache.set('b', 2);
        const keys = [];
        for (const key of cache.keys()) {
            keys.push(key);
            cache.clear(); // shouldn't affect contents of forEach loop
        }
        assert.deepEqual(keys, ['a', 'b']);
    });
});
//# sourceMappingURL=cache.test.js.map