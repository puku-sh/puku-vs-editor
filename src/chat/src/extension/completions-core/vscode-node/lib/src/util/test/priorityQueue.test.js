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
const assert = __importStar(require("assert"));
const priorityQueue_1 = require("../priorityQueue");
suite('PriorityQueue', function () {
    test('should initialize with size 0', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        assert.equal(queue.size, 0);
    });
    test('peek should return null for empty queue', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        assert.equal(queue.peek(), null);
    });
    test('pop should return null for empty queue', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        assert.equal(queue.pop(), null);
    });
    test('should insert and peek highest priority item', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        queue.insert('low', 1);
        queue.insert('high', 10);
        queue.insert('medium', 5);
        const result = queue.peek();
        assert.equal(result?.item, 'high');
        assert.equal(result?.priority, 10);
        assert.equal(queue.size, 3);
    });
    test('should pop items in priority order', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        queue.insert('low', 1);
        queue.insert('high', 10);
        queue.insert('medium', 5);
        let result = queue.pop();
        assert.equal(result?.item, 'high');
        assert.equal(result?.priority, 10);
        assert.equal(queue.size, 2);
        result = queue.pop();
        assert.equal(result?.item, 'medium');
        assert.equal(result?.priority, 5);
        assert.equal(queue.size, 1);
        result = queue.pop();
        assert.equal(result?.item, 'low');
        assert.equal(result?.priority, 1);
        assert.equal(queue.size, 0);
        result = queue.pop();
        assert.equal(result, null);
    });
    test('should handle items with same priority', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        queue.insert('first', 5);
        queue.insert('second', 5);
        queue.insert('third', 1);
        // The highest priority item could be either 'first' or 'second' depending on implementation
        // but we can at least ensure it's one of them with priority 5
        const result = queue.peek();
        assert.equal(result?.priority, 5);
        assert.ok(result?.item === 'first' || result?.item === 'second');
    });
    test('should handle multiple operations in sequence', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        queue.insert('a', 1);
        queue.insert('b', 2);
        queue.insert('c', 3);
        assert.equal(queue.size, 3);
        assert.equal(queue.peek()?.item, 'c');
        queue.pop(); // removes 'c'
        assert.equal(queue.size, 2);
        assert.equal(queue.peek()?.item, 'b');
        queue.insert('d', 10);
        assert.equal(queue.peek()?.item, 'd');
        queue.pop(); // removes 'd'
        assert.equal(queue.peek()?.item, 'b');
        queue.insert('e', 1);
        assert.equal(queue.peek()?.item, 'b');
        assert.equal(queue.size, 3);
        queue.pop();
        queue.pop();
        queue.pop();
        assert.equal(queue.size, 0);
        assert.equal(queue.pop(), null);
    });
    test('should handle object items with custom identities', function () {
        const obj1 = { id: '1', value: 100 };
        const obj2 = { id: '2', value: 200 };
        const queue = new priorityQueue_1.PriorityQueue();
        queue.insert(obj1, 5);
        queue.insert(obj2, 10);
        assert.equal(queue.peek()?.item, obj2);
    });
    test('should work for a large number of items', function () {
        const queue = new priorityQueue_1.PriorityQueue();
        const n = 1000;
        for (let i = 0; i < n; i++) {
            queue.insert(i, i);
        }
        for (let i = n - 1; i >= 0; i--) {
            const result = queue.pop();
            assert.equal(result?.item, i);
            assert.equal(result?.priority, i);
        }
    });
});
//# sourceMappingURL=priorityQueue.test.js.map