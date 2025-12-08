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
const workspaceFileIndex_1 = require("../../node/workspaceFileIndex");
(0, vitest_1.suite)('isMinifiedText', () => {
    (0, vitest_1.test)('Empty string should never be considered minified', () => {
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('', { minifiedMaxLineLength: 3, minifiedMaxAverageLineLength: 100 }));
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('', { minifiedMaxLineLength: 0, minifiedMaxAverageLineLength: 0 }));
    });
    (0, vitest_1.test)('Should find long strings in text', () => {
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('abc', { minifiedMaxLineLength: 3, minifiedMaxAverageLineLength: 100 }));
        assert_1.default.ok((0, workspaceFileIndex_1.isMinifiedText)('abcd', { minifiedMaxLineLength: 3, minifiedMaxAverageLineLength: 100 }));
        assert_1.default.ok((0, workspaceFileIndex_1.isMinifiedText)([
            'a',
            'ab',
            'abcd',
            'ab',
            'b'
        ].join('\n'), { minifiedMaxLineLength: 3, minifiedMaxAverageLineLength: 100 }));
    });
    (0, vitest_1.test)('Should find long averages averages', () => {
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('abcd', { minifiedMaxLineLength: 1000, minifiedMaxAverageLineLength: 10 }));
        assert_1.default.ok((0, workspaceFileIndex_1.isMinifiedText)('abcd', { minifiedMaxLineLength: 1000, minifiedMaxAverageLineLength: 3 }));
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('abcd\nab', { minifiedMaxLineLength: 1000, minifiedMaxAverageLineLength: 3 }));
        assert_1.default.ok(!(0, workspaceFileIndex_1.isMinifiedText)('a\nb\nc', { minifiedMaxLineLength: 1, minifiedMaxAverageLineLength: 1 }));
    });
});
//# sourceMappingURL=isMinified.spec.js.map