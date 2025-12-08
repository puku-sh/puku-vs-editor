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
const iterableHelpers_1 = require("../iterableHelpers");
class AsyncIterableTestHelper {
    async *[Symbol.asyncIterator]() {
        this.state = 1;
        yield Promise.resolve(1);
        this.state = 2;
        yield Promise.resolve(2);
        this.state = 3;
        yield Promise.resolve(3);
        this.state = 4;
    }
    constructor() {
        this.state = 0; // this is used to check that operations are suitably lazy
    }
}
suite('Async Iterable utilities', function () {
    // Sanity check that the generator itself behaves as expected
    test('generator', async function () {
        const asyncIterableIn = new AsyncIterableTestHelper();
        const asyncIterable = asyncIterableIn;
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(asyncIterableIn.state, 0);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 1, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 1);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 2, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 2);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 3, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 3);
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
        assert.deepStrictEqual(asyncIterableIn.state, 4);
    });
    test('map', async function () {
        const asyncIterableIn = new AsyncIterableTestHelper();
        const asyncIterable = (0, iterableHelpers_1.asyncIterableMap)(asyncIterableIn, v => Promise.resolve(v * 2));
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(asyncIterableIn.state, 0);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 2, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 1);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 4, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 2);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 6, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 3);
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
        assert.deepStrictEqual(asyncIterableIn.state, 4);
    });
    test('filter', async function () {
        const asyncIterableIn = new AsyncIterableTestHelper();
        const asyncIterable = (0, iterableHelpers_1.asyncIterableFilter)(asyncIterableIn, v => Promise.resolve(v % 2 === 0));
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(asyncIterableIn.state, 0);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 2, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 2);
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
        assert.deepStrictEqual(asyncIterableIn.state, 4);
    });
    test('mapFilter', async function () {
        const asyncIterableIn = new AsyncIterableTestHelper();
        const asyncIterable = (0, iterableHelpers_1.asyncIterableMapFilter)(asyncIterableIn, v => Promise.resolve(v % 2 === 0 ? v / 2 : undefined));
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(asyncIterableIn.state, 0);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 1, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 2);
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
        assert.deepStrictEqual(asyncIterableIn.state, 4);
    });
    test('mapFilter keeps non-undefined falsy values', async function () {
        const asyncIterableIn = new AsyncIterableTestHelper();
        const asyncIterable = (0, iterableHelpers_1.asyncIterableMapFilter)(asyncIterableIn, v => Promise.resolve(v % 2 === 0 ? v / 2 : 0));
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(asyncIterableIn.state, 0);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 0, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 1);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 1, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 2);
        assert.deepStrictEqual(await asyncIterator.next(), { value: 0, done: false });
        assert.deepStrictEqual(asyncIterableIn.state, 3);
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
        assert.deepStrictEqual(asyncIterableIn.state, 4);
    });
    test('fromArray', async function () {
        const asyncIterable = (0, iterableHelpers_1.asyncIterableFromArray)([1, 2]);
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(await asyncIterator.next(), { value: 1, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: 2, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
    });
    test('toArray', async function () {
        const expected = [1, 2, 3];
        const asyncIterable = (0, iterableHelpers_1.asyncIterableFromArray)(expected);
        const actual = await (0, iterableHelpers_1.asyncIterableToArray)(asyncIterable);
        assert.deepStrictEqual(actual, expected);
    });
    test('concat', async function () {
        const asyncIterable1 = (0, iterableHelpers_1.asyncIterableFromArray)([1, 2]);
        const asyncIterable2 = (0, iterableHelpers_1.asyncIterableFromArray)([3, 4]);
        const asyncIterable = (0, iterableHelpers_1.asyncIterableConcat)(asyncIterable1, asyncIterable2);
        const asyncIterator = asyncIterable[Symbol.asyncIterator]();
        assert.deepStrictEqual(await asyncIterator.next(), { value: 1, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: 2, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: 3, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: 4, done: false });
        assert.deepStrictEqual(await asyncIterator.next(), { value: undefined, done: true });
    });
    test('count', async function () {
        const asyncIterable = (0, iterableHelpers_1.asyncIterableFromArray)([1, 2]);
        assert.deepStrictEqual(await (0, iterableHelpers_1.asyncIterableCount)(asyncIterable), 2);
    });
    test('iterableMap', function () {
        const source = [1, 2, 3][Symbol.iterator]();
        const actual = (0, iterableHelpers_1.iterableMap)(source, v => v * 2);
        assert.deepStrictEqual(Array.from(actual), [2, 4, 6]);
    });
    test('iterableMapFilter', function () {
        const source = [1, 2, 3][Symbol.iterator]();
        const actual = (0, iterableHelpers_1.iterableMapFilter)(source, v => (v % 2 !== 0 ? v * 2 : undefined));
        assert.deepStrictEqual(Array.from(actual), [2, 6]);
    });
});
//# sourceMappingURL=iterableHelpers.test.js.map