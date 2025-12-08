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
const anomalyDetection_1 = require("../anomalyDetection");
suite('Anomaly Repetition Tests', function () {
    test('recognizes sequence consisting of single repeated token', function () {
        const tokens = 'Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    test('does nothing on a too short sequence of single repeated token', function () {
        const tokens = 'Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, false, 'Repetition should not be recognized.');
    });
    test('recognizes single repeated token in proper suffix', function () {
        const tokens = 'Baz Baz Baz Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar Bar'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    test('recognizes repeated pattern', function () {
        const tokens = ('Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car ' +
            'Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be recognized.');
    });
    test('does nothing on a too short repeated pattern', function () {
        const tokens = ('Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car Bar Far Car ' +
            'Bar Far Car Bar Far Car Bar Far Car').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, false, 'Repetition should not be recognized.');
    });
    test('does nothing in absence of a pattern', function () {
        const tokens = ('12 1 23 43 ac er gf gf 12 er gd 34 dg 35 ;o lo 34 xc ' +
            '4t ggf gf 46 l7 dg qs 5y ku df 34 gr gr gr df er gr gr').split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, false, 'No repetition should be claimed.');
    });
    test('does nothing on too long a pattern', function () {
        const tokens = '12 1 23 43 ac er gf gf 12 er gd '.repeat(4).split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, false, 'No repetition should be claimed.');
    });
    test('recognizes short real world example', function () {
        const tokens = [
            'C',
            ' LIM',
            'IT',
            ' 1',
            ')',
            '\n',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
            '\t',
        ];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    test('recognizes long real world example', function () {
        const tokens = 'Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the website. Try to use the keyboard to navigate the'.split(' ');
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    test('recognizes repetitions with some prefix', function () {
        const tokens = ['prefix', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo'];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be found.');
    });
    test('recognizes repetitions that differ only in whitespace tokens, with some prefix', function () {
        const tokens = ['prefix', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', 'foo', '   ', 'foo'];
        const repetitive = (0, anomalyDetection_1.isRepetitive)(tokens);
        assert.strictEqual(repetitive, true, 'Repetition should be found.');
    });
});
//# sourceMappingURL=anomalyDetection.test.js.map