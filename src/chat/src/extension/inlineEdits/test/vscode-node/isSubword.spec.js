"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const isInlineSuggestion_1 = require("../../vscode-node/isInlineSuggestion");
(0, vitest_1.suite)('isSubword', () => {
    (0, vitest_1.test)('isSubword', () => {
        vitest_1.assert.strictEqual((0, isInlineSuggestion_1.isSubword)('acf', 'abcdef'), true);
        vitest_1.assert.strictEqual((0, isInlineSuggestion_1.isSubword)('ab', 'abc'), true);
        vitest_1.assert.strictEqual((0, isInlineSuggestion_1.isSubword)('cccc', 'ccc'), false);
        vitest_1.assert.strictEqual((0, isInlineSuggestion_1.isSubword)('abc', 'ab'), false);
    });
});
//# sourceMappingURL=isSubword.spec.js.map