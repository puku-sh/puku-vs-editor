"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const indentationGuesser_1 = require("../indentationGuesser");
(0, vitest_1.describe)('identationGuesser', () => {
    (0, vitest_1.it)('transformIndentation', () => {
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('  hello()', { insertSpaces: true, tabSize: 2 }, { insertSpaces: false, tabSize: 2 })).toBe('\thello()');
        // 4 spaces to 2-space indent
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('    hello()', { insertSpaces: true, tabSize: 4 }, { insertSpaces: true, tabSize: 2 })).toBe('  hello()');
        // tab to 4 spaces
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('\thello()', { insertSpaces: false, tabSize: 4 }, { insertSpaces: true, tabSize: 4 })).toBe('    hello()');
        // 8 spaces to tab (tabSize 4)
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('        hello()', { insertSpaces: true, tabSize: 4 }, { insertSpaces: false, tabSize: 4 })).toBe('\t\thello()');
        // 2 tabs to 4 spaces (tabSize 2)
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('\t\thello()', { insertSpaces: false, tabSize: 2 }, { insertSpaces: true, tabSize: 4 })).toBe('        hello()');
        // No indentation change
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)('hello()', { insertSpaces: true, tabSize: 2 }, { insertSpaces: true, tabSize: 2 })).toBe('hello()');
        (0, vitest_1.expect)((0, indentationGuesser_1.transformIndentation)(' \thello()', { insertSpaces: false, tabSize: 4 }, { insertSpaces: true, tabSize: 2 })).toBe(' \thello()');
    });
});
//# sourceMappingURL=indentationGuesser.spec.js.map