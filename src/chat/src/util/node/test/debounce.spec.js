"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const debounce_1 = require("../../common/debounce");
(0, vitest_1.suite)('Debouncing', function () {
    (0, vitest_1.test)('single debounce call', async function () {
        const debouncer = new debounce_1.Debouncer();
        await debouncer.debounce(1);
    });
    (0, vitest_1.test)('repeated call within time limit', async function () {
        const debouncer = new debounce_1.Debouncer();
        let result;
        (async () => {
            try {
                await debouncer.debounce(10);
                result = true;
            }
            catch {
                // we should end up here as the debounce call should get cancelled by the subsequent one
                result = false;
            }
        })();
        await debouncer.debounce(1);
        assert_1.default.deepStrictEqual(result, false);
    });
    (0, vitest_1.test)('repeated call outside time limit', async function () {
        const debouncer = new debounce_1.Debouncer();
        let result;
        (async () => {
            try {
                await debouncer.debounce(1);
                // we should end up here as the debounce call should have time to finish before the next one
                result = true;
            }
            catch {
                result = false;
            }
        })();
        await new Promise(resolve => setTimeout(resolve, 5));
        await debouncer.debounce(1);
        assert_1.default.deepStrictEqual(result, true);
    });
    (0, vitest_1.test)('multiple debounce objects are independent', async function () {
        const debouncer1 = new debounce_1.Debouncer();
        const debouncer2 = new debounce_1.Debouncer();
        let result;
        (async () => {
            try {
                await debouncer1.debounce(10);
                // we should end up here as the debounce call won't be cancelled by the second one even though
                // they run in parallel.
                result = true;
            }
            catch {
                result = false;
            }
        })();
        await debouncer2.debounce(1);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert_1.default.deepStrictEqual(result, true);
    });
});
//# sourceMappingURL=debounce.spec.js.map