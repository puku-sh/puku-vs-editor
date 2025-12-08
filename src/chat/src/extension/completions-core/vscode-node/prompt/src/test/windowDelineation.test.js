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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const windowDelineations_1 = require("../snippetInclusion/windowDelineations");
const assert = __importStar(require("assert"));
const ts_dedent_1 = __importDefault(require("ts-dedent"));
const SOURCE = {
    source: (0, ts_dedent_1.default) `
	f1:
		a1
	f2:
		a2
		a3
`,
    name: '',
};
suite('Test window delineation', function () {
    test('Correct line number range, standard input', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 1, 3);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [1, 2], // a1
            [2, 5], // f2: a2 a3
            [3, 4], // a2
            [4, 5], // a3
        ];
        assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    test('Correct line number range, standard input, decreased maxLength', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 1, 2);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [1, 2], // a1
            [3, 4], // a2
            [4, 5], // a3
            // We lose [2, 5] f2: a2 a3 as too long
            // But we gain the following which were previously swallowed up by [2, 5]
            [2, 4], // f2: a2
            [3, 5], // a2 a3
        ];
        assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    test('Correct line number range, standard input, increased minLength', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 2, 3);
        const correctLineNumbers = [
            [0, 2], // f1: a1
            [2, 5], // f2: a2 a3
            // We lose the following as too short
            // [1, 2] a1
            // [3, 4] a2
            // [4, 5] a3
        ];
        assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    test('Correct line number range, flat input', function () {
        const source = (0, ts_dedent_1.default) `
		a1
		a2
		a3
		`;
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(source.split('\n'), 'python', 1, 3);
        const correctLineNumbers = [
            [0, 1], // a1
            [1, 2], // a2
            [2, 3], // a3
            [0, 3], // a1 a2 a3
            // Don't get [0, 2] nor [1, 3] because they not single children nor the whole tree
        ];
        assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
    test('Check degenerate case', function () {
        const testLineNumbers = (0, windowDelineations_1.getIndentationWindowsDelineations)(SOURCE.source.split('\n'), 'python', 0, 0);
        const correctLineNumbers = [];
        assert.deepStrictEqual(testLineNumbers.sort(), correctLineNumbers.sort());
    });
});
//# sourceMappingURL=windowDelineation.test.js.map