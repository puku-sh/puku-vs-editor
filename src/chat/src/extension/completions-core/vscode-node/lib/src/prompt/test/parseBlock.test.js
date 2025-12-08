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
const parseBlock_1 = require("../parseBlock");
suite('Indentation', function () {
    test('single line -> only current', function () {
        assert.deepStrictEqual((0, parseBlock_1.contextIndentationFromText)('x', 0, 'language'), {
            prev: undefined,
            current: 0,
            next: undefined,
        });
    });
    test('single line with line after -> only current & next', function () {
        assert.deepStrictEqual((0, parseBlock_1.contextIndentationFromText)('x\ny', 0, 'language'), {
            prev: undefined,
            current: 0,
            next: 0,
        });
    });
    test('after indent -> only current & prev', function () {
        assert.deepStrictEqual((0, parseBlock_1.contextIndentationFromText)('x\n y', 4, 'language'), {
            prev: 0,
            current: 1,
            next: undefined,
        });
    });
    test('after indent but before text -> only current from line above', function () {
        assert.deepStrictEqual((0, parseBlock_1.contextIndentationFromText)('x\n y', 3, 'language'), {
            prev: undefined,
            current: 0,
            next: undefined,
        });
    });
});
//# sourceMappingURL=parseBlock.test.js.map