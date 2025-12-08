"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parserImpl_1 = require("../../node/parserImpl");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
(0, vitest_1.suite)('getParseErrorCount - typescript', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    (0, vitest_1.test)('no error', async () => {
        const res = await (0, parserImpl_1._getParseErrorCount)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'const a = 1;');
        (0, vitest_1.expect)(res).toBe(0);
    });
    (0, vitest_1.test)('with error', async () => {
        const res = await (0, parserImpl_1._getParseErrorCount)(treeSitterLanguages_1.WASMLanguage.TypeScript, 'cont a = 1;');
        (0, vitest_1.expect)(res).toMatchInlineSnapshot(`1`);
    });
    (0, vitest_1.test)('with error', async () => {
        const res = await (0, parserImpl_1._getParseErrorCount)(treeSitterLanguages_1.WASMLanguage.TypeScript, `funtion foo() {`);
        (0, vitest_1.expect)(res).toMatchInlineSnapshot(`2`);
    });
});
//# sourceMappingURL=getParseErrorCount.spec.js.map