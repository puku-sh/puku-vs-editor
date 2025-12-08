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
const sinon = __importStar(require("sinon"));
const shortCircuit_1 = require("../shortCircuit");
suite('Test shortCircuit', function () {
    const shortCircuitMs = 20;
    const shortCircuitReturn = 'Short circuited';
    let clock;
    setup(function () {
        clock = sinon.useFakeTimers();
    });
    teardown(function () {
        clock.restore();
    });
    test('returns the result of the function if it completes before the timeout', async function () {
        const fn = (n) => Promise.resolve(`Result: ${n}`);
        const shortCircuitedFn = (0, shortCircuit_1.shortCircuit)(fn, shortCircuitMs, shortCircuitReturn);
        const result = await shortCircuitedFn(42);
        assert.strictEqual(result, 'Result: 42');
    });
    test('returns the short circuit value if the function does not complete before the timeout', async function () {
        let touched = false;
        const timeout = new Promise(resolve => setTimeout(resolve, shortCircuitMs * 2));
        async function fn(n) {
            await timeout;
            touched = true;
            return `Result: ${n}`;
        }
        const shortCircuitedFn = (0, shortCircuit_1.shortCircuit)(fn, shortCircuitMs, shortCircuitReturn);
        const promisedResult = shortCircuitedFn(42); // start the function, but don't await it because time is stopped
        await clock.tickAsync(shortCircuitMs); // advance the clock by the short circuit time
        const result = await promisedResult;
        assert.strictEqual(result, 'Short circuited');
        assert.ok(!touched, 'at this point the function should still be processing and touched is not yet true');
        await clock.tickAsync(shortCircuitMs); // advance the clock to the function duration
        assert.ok(touched, 'at this point the function should have completed and touched should be true');
    });
});
//# sourceMappingURL=shortCircuit.test.js.map