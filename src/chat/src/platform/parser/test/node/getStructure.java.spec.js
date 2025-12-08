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
(0, vitest_1.describe)('getStructure - java', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function javaSrcWithStructure(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.Java, source);
    }
    (0, vitest_1.test)('java source with different syntax constructs', async () => {
        const filename = 'test.java';
        const source = await (0, getStructure_util_1.fromFixture)(filename);
        await (0, vitest_1.expect)(await javaSrcWithStructure(source)).toMatchFileSnapshot((0, getStructure_util_1.snapshotPathInFixture)(filename));
    });
});
//# sourceMappingURL=getStructure.java.spec.js.map