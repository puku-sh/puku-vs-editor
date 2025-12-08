"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const variableLengthQuantity_1 = require("../../common/variableLengthQuantity");
(0, vitest_1.describe)('variableLengthQuantity', () => {
    (0, vitest_1.it)('is sane', () => {
        const numbers = [
            -100000,
            -100,
            -1,
            0,
            1,
            100,
            100000,
        ];
        for (const n of numbers) {
            const b = (0, variableLengthQuantity_1.writeVariableLengthQuantity)(n);
            const { value, consumed } = (0, variableLengthQuantity_1.readVariableLengthQuantity)(b, 0);
            (0, vitest_1.expect)(value).toBe(n);
            (0, vitest_1.expect)(consumed).toBe(b.buffer.length);
        }
    });
    (0, vitest_1.it)('is fuzzy', () => {
        for (let i = 0; i < 1000; i++) {
            const x = Math.round((Math.random() * 2 ** 31) * (Math.random() < 0.5 ? -1 : 1));
            const b = (0, variableLengthQuantity_1.writeVariableLengthQuantity)(x);
            const { value, consumed } = (0, variableLengthQuantity_1.readVariableLengthQuantity)(b, 0);
            (0, vitest_1.expect)(value).toBe(x);
            (0, vitest_1.expect)(consumed).toBe(b.buffer.length);
        }
    });
});
//# sourceMappingURL=variableLengthQuantity.spec.js.map