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
(0, vitest_1.describe)('getStructure - python', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function pySrcWithStructure(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.Python, source);
    }
    (0, vitest_1.test)('py source with different syntax constructs', async () => {
        const source = await (0, getStructure_util_1.fromFixture)('test.py');
        (0, vitest_1.expect)(await pySrcWithStructure(source)).toMatchSnapshot();
    });
    (0, vitest_1.test)('try-catch block', async () => {
        const file = 'try.py';
        const source = await (0, getStructure_util_1.fromFixture)(file);
        await (0, vitest_1.expect)(await pySrcWithStructure(source)).toMatchFileSnapshot((0, getStructure_util_1.snapshotPathInFixture)(file));
    });
});
//# sourceMappingURL=getStructure.py.spec.js.map