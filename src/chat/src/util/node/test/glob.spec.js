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
const glob_1 = require("../../common/glob");
const uri_1 = require("../../vs/base/common/uri");
(0, vitest_1.suite)('isMatch', () => {
    (0, vitest_1.test)('issue #3377: should match URIs on Windows', () => {
        const uri = uri_1.URI.file('/Users/someone/Projects/proj01/base/test/common/map.test.ts');
        const glob = '**/{map.test.ts,map.spec.ts}';
        const result = (0, glob_1.isMatch)(uri, glob);
        assert_1.default.strictEqual(result, true);
    });
});
//# sourceMappingURL=glob.spec.js.map