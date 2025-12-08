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
const normalizeIndent_1 = require("../normalizeIndent");
const assert = __importStar(require("assert"));
suite('Leading whitespace normalization tests', function () {
    test('Leading spaces are replaces with tabs', function () {
        const teo = {
            tabSize: 4,
            insertSpaces: false,
        };
        const completion = {
            completionIndex: 0,
            completionText: '    fun()\n    yeet()',
            displayText: '    fun()\n    yeet()',
            displayNeedsWsOffset: false,
        };
        const output = '\tfun()\n\tyeet()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, false);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading tabs are replaces with spaces', function () {
        const teo = {
            tabSize: 4,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '\tfun()\n\tyeet()',
            displayText: '\tfun()\n\tyeet()',
            displayNeedsWsOffset: false,
        };
        const output = '    fun()\n    yeet()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, false);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading tabs are replaces with spaces - multiple level of indents', function () {
        const teo = {
            tabSize: 2,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '\tfun()\n\t\tyeet()\n\tboo()',
            displayText: '\tfun()\n\t\tyeet()\n\tboo()',
            displayNeedsWsOffset: false,
        };
        const output = '  fun()\n    yeet()\n  boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, false);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading spaces are replaces with tabs - multiple level of indents', function () {
        const teo = {
            tabSize: 2,
            insertSpaces: false,
        };
        const completion = {
            completionIndex: 0,
            completionText: '  fun()\n    yeet()\n  boo()',
            displayText: '  fun()\n    yeet()\n  boo()',
            displayNeedsWsOffset: false,
        };
        const output = '\tfun()\n\t\tyeet()\n\tboo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, false);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Extra spaces are not dropped when replacing spaces with tabs', function () {
        const teo = {
            tabSize: 4,
            insertSpaces: false,
        };
        const input = ' '.repeat(6) + 'fun()\n' + ' '.repeat(6) + '  yeet()\n' + ' '.repeat(6) + 'boo()';
        const completion = {
            completionIndex: 0,
            completionText: input,
            displayText: input,
            displayNeedsWsOffset: false,
        };
        const output = '\t  fun()\n' + '\t\tyeet()\n' + '\t  boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, false);
        assert.strictEqual(result.completionText, output, 'Leading whitespace normalization failed');
        assert.strictEqual(result.displayText, output, 'Leading whitespace normalization failed');
    });
    test('Leading spaces are normalized to the tab size expected in editor in case of empty line suggestion', function () {
        const teo = {
            tabSize: 4,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '  fun()\n    yeet()\n  boo()',
            displayText: '  fun()\n    yeet()\n  boo()',
            displayNeedsWsOffset: false,
        };
        const output = '    fun()\n        yeet()\n    boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, true);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading spaces are normalized to the tab size expected in editor in case of empty line suggestion, lot of indentation case', function () {
        const teo = {
            tabSize: 4,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '      fun()\n        yeet()\n      boo()',
            displayText: '      fun()\n        yeet()\n      boo()',
            displayNeedsWsOffset: false,
        };
        const output = '        fun()\n            yeet()\n        boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, true);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading spaces are not normalized if ident size is same as tab size', function () {
        const teo = {
            tabSize: 2,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '  fun()\n    yeet()\n  boo()',
            displayText: '  fun()\n    yeet()\n  boo()',
            displayNeedsWsOffset: false,
        };
        const output = '  fun()\n    yeet()\n  boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, true);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
    test('Leading newlines do not trigger spurious extra indentation', function () {
        const teo = {
            tabSize: 2,
            insertSpaces: true,
        };
        const completion = {
            completionIndex: 0,
            completionText: '\n  fun()\n    yeet()\n  boo()',
            displayText: '\n  fun()\n    yeet()\n  boo()',
            displayNeedsWsOffset: false,
        };
        const output = '\n  fun()\n    yeet()\n  boo()';
        const result = (0, normalizeIndent_1.normalizeIndentCharacter)(teo, completion, true);
        assert.ok(result.completionText === output, 'Leading whitespace normalization failed');
        assert.ok(result.displayText === output, 'Leading whitespace normalization failed');
    });
});
//# sourceMappingURL=normalizeIndent.test.js.map