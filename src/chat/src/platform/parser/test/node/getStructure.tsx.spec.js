"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const parserImpl_1 = require("../../node/parserImpl");
const treeSitterLanguages_1 = require("../../node/treeSitterLanguages");
const getStructure_util_1 = require("./getStructure.util");
(0, vitest_1.describe)('getStructure - tsx', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function tsxSrcWithStructure(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.TypeScriptTsx, source);
    }
    (0, vitest_1.test)('tsx source with different syntax constructs', async () => {
        const source = await (0, getStructure_util_1.fromFixture)('test.tsx');
        (0, vitest_1.expect)(await tsxSrcWithStructure(source)).toMatchSnapshot();
    });
    (0, vitest_1.test)('issue #7487', async () => {
        const source = await (0, getStructure_util_1.fromFixture)('EditForm.tsx');
        (0, vitest_1.expect)(await tsxSrcWithStructure(source)).toMatchSnapshot();
    });
});
//# sourceMappingURL=getStructure.tsx.spec.js.map