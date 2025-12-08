"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const lock_1 = require("../../common/lock");
(0, vitest_1.suite)('Lock', async function () {
    (0, vitest_1.test)('acquire and release', async function () {
        const lock = new lock_1.Lock();
        await lock.acquire();
        assert_1.default.strictEqual(lock.locked, true);
        lock.release();
        assert_1.default.strictEqual(lock.locked, false);
    });
    (0, vitest_1.test)('queueing', async function () {
        const lock = new lock_1.Lock();
        await lock.acquire();
        assert_1.default.strictEqual(lock.locked, true);
        let released = false;
        lock.acquire().then(() => {
            released = true;
        });
        assert_1.default.strictEqual(released, false);
        lock.release();
        // wait 1 tick
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert_1.default.strictEqual(released, true);
        assert_1.default.strictEqual(lock.locked, true);
        lock.release();
        assert_1.default.strictEqual(lock.locked, false);
    });
});
//# sourceMappingURL=lock.spec.js.map