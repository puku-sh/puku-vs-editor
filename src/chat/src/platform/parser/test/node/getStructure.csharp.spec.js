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
(0, vitest_1.describe)('getStructure - csharp', () => {
    (0, vitest_1.afterAll)(() => (0, parserImpl_1._dispose)());
    function csharpStruct(source) {
        return (0, getStructure_util_1.srcWithAnnotatedStructure)(treeSitterLanguages_1.WASMLanguage.Csharp, source);
    }
    (0, vitest_1.test)('source with different syntax constructs', async () => {
        const source = await (0, getStructure_util_1.fromFixture)('test.cs');
        (0, vitest_1.expect)(await csharpStruct(source)).toMatchSnapshot();
    });
});
//# sourceMappingURL=getStructure.csharp.spec.js.map