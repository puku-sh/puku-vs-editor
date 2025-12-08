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
const hooks_1 = require("../../components/hooks");
const assert = __importStar(require("assert"));
const testHelpers_1 = require("./testHelpers");
suite('Hooks', function () {
    suite('Use State', function () {
        test('stores state', function () {
            const state = new hooks_1.UseState([]);
            const [value] = state.useState(0);
            assert.deepStrictEqual(value, 0);
        });
        test('accepts undefined as initial state', function () {
            const state = new hooks_1.UseState([]);
            const [value] = state.useState(undefined);
            assert.deepStrictEqual(value, undefined);
        });
        test('accepts no value as initial state', function () {
            const state = new hooks_1.UseState([]);
            const [value] = state.useState();
            assert.deepStrictEqual(value, undefined);
        });
        test('marks state as changed when updating state', function () {
            const state = new hooks_1.UseState([]);
            const [_, setValue] = state.useState(0);
            setValue(1);
            assert.strictEqual(state.hasChanged(), true);
        });
        test('stores state across use state instances', function () {
            const rawState = [];
            const [value, setValue] = new hooks_1.UseState(rawState).useState(0);
            setValue(1);
            const [newValue] = new hooks_1.UseState(rawState).useState(0);
            assert.deepStrictEqual(value, 0);
            assert.deepStrictEqual(newValue, 1);
        });
        test('multiple use state invocations produce separate state', function () {
            const rawState = [];
            const state = new hooks_1.UseState(rawState);
            const [value1] = state.useState(0);
            const [value2] = state.useState('test');
            assert.deepStrictEqual(value1, 0);
            assert.deepStrictEqual(value2, 'test');
        });
        test('accepts function as initial state', function () {
            const state = new hooks_1.UseState([]);
            const initializer = () => 42;
            const [value] = state.useState(initializer);
            assert.deepStrictEqual(value, 42);
        });
        test('setState accepts function to update state', function () {
            const rawState = [];
            const state1 = new hooks_1.UseState(rawState);
            const [value, setValue] = state1.useState(1);
            const state2 = new hooks_1.UseState(rawState);
            setValue(prev => prev + 1);
            const [updatedValue] = state2.useState(0);
            assert.deepStrictEqual(value, 1);
            assert.deepStrictEqual(updatedValue, 2);
            assert.strictEqual(state1.hasChanged(), true);
        });
        test('maintains separate states when multiple instances share raw state', function () {
            const rawState = [];
            const state1 = new hooks_1.UseState(rawState);
            const state2 = new hooks_1.UseState(rawState);
            const [count1, setCount1] = state1.useState(0);
            setCount1(5);
            const [count2] = state2.useState(0);
            assert.strictEqual(count1, 0);
            assert.strictEqual(count2, 5);
        });
        test('hasChanged returns false before any setState calls', function () {
            const state = new hooks_1.UseState([]);
            state.useState(0);
            assert.strictEqual(state.hasChanged(), false);
        });
    });
    suite('Use Data', function () {
        test('stores data callback for type', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data = '';
            useData.useData(testHelpers_1.isString, (value) => {
                data = value;
            });
            await useData.updateData('test');
            assert.deepStrictEqual(data, 'test');
        });
        test('stores async data callback for type', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data = '';
            useData.useData(testHelpers_1.isString, async (value) => {
                await Promise.resolve();
                data = value;
            });
            await useData.updateData('test');
            assert.deepStrictEqual(data, 'test');
        });
        test('stores multiple data callbacks for type', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data1 = '';
            let data2 = '';
            useData.useData(testHelpers_1.isString, (value) => {
                data1 = value;
            });
            useData.useData(testHelpers_1.isString, (value) => {
                data2 = value;
            });
            await useData.updateData('test');
            assert.deepStrictEqual(data1, 'test');
            assert.deepStrictEqual(data2, 'test');
        });
        test('stores multiple async data callbacks for type', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data1 = '';
            let data2 = '';
            useData.useData(testHelpers_1.isString, async (value) => {
                await Promise.resolve();
                data1 = value;
            });
            useData.useData(testHelpers_1.isString, async (value) => {
                await Promise.resolve();
                data2 = value;
            });
            await useData.updateData('test');
            assert.deepStrictEqual(data1, 'test');
            assert.deepStrictEqual(data2, 'test');
        });
        test('stores multiple data callbacks for different types', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data1 = '';
            let data2 = 0;
            useData.useData(testHelpers_1.isString, (value) => {
                data1 = value;
            });
            useData.useData(testHelpers_1.isNumber, (value) => {
                data2 = value;
            });
            await useData.updateData('test');
            await useData.updateData(23);
            assert.deepStrictEqual(data1, 'test');
            assert.deepStrictEqual(data2, 23);
        });
        test('updates data for subscribed types only', async function () {
            const useData = new hooks_1.UseData(() => { });
            let data = '';
            useData.useData(testHelpers_1.isString, (value) => {
                data = value;
            });
            await useData.updateData(23);
            assert.deepStrictEqual(data, '');
        });
        test('updates data measures time to update', async function () {
            let time = 0;
            const useData = new hooks_1.UseData(updateTimeMs => {
                time = updateTimeMs;
            });
            let data = '';
            useData.useData(testHelpers_1.isString, (value) => {
                data = value;
            });
            await useData.updateData(23);
            assert.deepStrictEqual(data, '');
            assert.ok(time > 0);
        });
        test('updates data measures time only if data hooks are present', async function () {
            const useData = new hooks_1.UseData(updateTimeMs => {
                throw new Error('Should not be called');
            });
            await useData.updateData(23);
        });
    });
});
//# sourceMappingURL=hooks.test.js.map