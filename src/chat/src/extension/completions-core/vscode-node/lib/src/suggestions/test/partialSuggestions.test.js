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
const partialSuggestions_1 = require("../partialSuggestions");
suite('partial acceptance utilities', () => {
    test('returns the length of the completion text when compType is full', () => {
        const completionText = 'Hello, World!';
        const suggestionStatus = {
            compType: 'full',
            acceptedLength: completionText.length,
            acceptedLines: 0,
        };
        const result = (0, partialSuggestions_1.computeCompCharLen)(suggestionStatus, completionText);
        assert.strictEqual(result, completionText.length);
    });
    test('returns the acceptedLength when compType is partial', () => {
        const acceptedLength = 5;
        const suggestionStatus = { compType: 'partial', acceptedLength, acceptedLines: 0 };
        const result = (0, partialSuggestions_1.computeCompCharLen)(suggestionStatus, 'Hello, World!');
        assert.strictEqual(result, acceptedLength);
    });
    test('returns the full completion text when compType is full', () => {
        const completionText = 'Hello, World!';
        const suggestionStatus = {
            compType: 'full',
            acceptedLength: completionText.length,
            acceptedLines: 0,
        };
        const result = (0, partialSuggestions_1.computeCompletionText)(completionText, suggestionStatus);
        assert.strictEqual(result, completionText);
    });
    test('returns the substring of the completion text when compType is partial', () => {
        const acceptedLength = 5;
        const completionText = 'Hello, World!';
        const suggestionStatus = { compType: 'partial', acceptedLength, acceptedLines: 0 };
        const result = (0, partialSuggestions_1.computeCompletionText)(completionText, suggestionStatus);
        assert.strictEqual(result, 'Hello');
    });
});
suite('countLines function', () => {
    test('returns 0 for empty string', () => {
        const result = (0, partialSuggestions_1.countLines)('');
        assert.strictEqual(result, 0);
    });
    test('returns 1 for single line without newline', () => {
        const result = (0, partialSuggestions_1.countLines)('single line text');
        assert.strictEqual(result, 1);
    });
    test('handles Unix newlines (\\n)', () => {
        const text = 'line1\nline2\nline3';
        const result = (0, partialSuggestions_1.countLines)(text);
        assert.strictEqual(result, 3);
    });
    test('handles Windows newlines (\\r\\n)', () => {
        const text = 'line1\r\nline2\r\nline3';
        const result = (0, partialSuggestions_1.countLines)(text);
        assert.strictEqual(result, 3);
    });
    test('ignores old Mac newlines (\\r)', () => {
        const text = 'line1\rline2';
        const result = (0, partialSuggestions_1.countLines)(text);
        assert.strictEqual(result, 1);
    });
});
//# sourceMappingURL=partialSuggestions.test.js.map