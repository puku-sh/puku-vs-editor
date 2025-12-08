"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const vitest_1 = require("vitest");
const naiveChunker_1 = require("../naiveChunker");
(0, vitest_1.suite)('trimCommonLeadingWhitespace', () => {
    (0, vitest_1.test)('should trim common leading spaces', () => {
        const { trimmedLines, shortestLeadingCommonWhitespace } = (0, naiveChunker_1.trimCommonLeadingWhitespace)([
            '    const foo = 1;',
            '      const bar = 2;',
            '        const baz = 3;',
        ]);
        assert.deepStrictEqual(trimmedLines, [
            'const foo = 1;',
            '  const bar = 2;',
            '    const baz = 3;',
        ]);
        assert.strictEqual(shortestLeadingCommonWhitespace, '    ');
    });
    (0, vitest_1.test)('should trim common leading tabs', () => {
        const { trimmedLines, shortestLeadingCommonWhitespace } = (0, naiveChunker_1.trimCommonLeadingWhitespace)([
            '\t\tconst foo = 1;',
            '\t\t\tconst bar = 2;',
            '\t\t\t\tconst baz = 3;',
        ]);
        assert.deepStrictEqual(trimmedLines, [
            'const foo = 1;',
            '\tconst bar = 2;',
            '\t\tconst baz = 3;',
        ]);
        assert.strictEqual(shortestLeadingCommonWhitespace, '\t\t');
    });
    (0, vitest_1.test)('should handle mixed spaces and tabs', () => {
        const { trimmedLines, shortestLeadingCommonWhitespace } = (0, naiveChunker_1.trimCommonLeadingWhitespace)([
            '    const foo = 1;',
            '     \t const bar = 2;',
            '  \t      const baz = 3;',
        ]);
        assert.deepStrictEqual(trimmedLines, [
            '  const foo = 1;',
            '   \t const bar = 2;',
            '\t      const baz = 3;',
        ]);
        assert.strictEqual(shortestLeadingCommonWhitespace, '  ');
    });
});
//# sourceMappingURL=naiveChunker.spec.js.map