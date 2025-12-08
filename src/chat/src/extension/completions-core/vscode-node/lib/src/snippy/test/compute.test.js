"use strict";
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
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert = __importStar(require("assert"));
const SnippyCompute = __importStar(require("../../snippy/compute"));
const testMatchSource = 'function calculateDaysBetweenDates(begin, end) {\n    var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds\n    var firstDate = new Date(begin);\n    var secondDate = new Date(end);\n\n    return Math.round(Math.abs((firstDate.getTime() - secondDate.getTime())/(oneDay)));\n}';
suite('Compute', function () {
    const testCases = [
        { input: 'const', expected: 1 },
        { input: 'const foo = "bar";', expected: 7 },
        {
            input: `for (var i = 1; i <= 100; i++) {
                if (i % 15 == 0) {
                    console.log("FizzBuzz");
                } else if (i % 3 == 0) {
                    console.log("Fizz");
                } else if (i % 5 == 0) {
                    console.log("Buzz");
                } else {
                    console.log(i);
                }
                }`,
            expected: 65,
        },
    ];
    test('lexemeLength returns the number of lexemes in a given string', function () {
        for (const { input, expected } of testCases) {
            assert.strictEqual(SnippyCompute.lexemeLength(input), expected);
        }
    });
    test(`lexemeLength returns at most ${SnippyCompute.MinTokenLength} lexemes`, function () {
        assert.strictEqual(SnippyCompute.lexemeLength(testMatchSource), SnippyCompute.MinTokenLength);
    });
    test(`hasMinLexemeLength returns true if the string has at least ${SnippyCompute.MinTokenLength} lexemes`, function () {
        assert.strictEqual(SnippyCompute.hasMinLexemeLength(testMatchSource), true);
        assert.strictEqual(SnippyCompute.hasMinLexemeLength("const foo = 'test'"), false);
    });
});
//# sourceMappingURL=compute.test.js.map