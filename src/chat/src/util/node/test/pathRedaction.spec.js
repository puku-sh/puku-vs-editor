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
const pathRedaction_1 = require("../../common/pathRedaction");
(0, vitest_1.suite)('Path redaction', () => {
    (0, vitest_1.beforeEach)(() => { });
    (0, vitest_1.test)('returns input', function () {
        const input = 'abc';
        const output = (0, pathRedaction_1.redactPaths)(input);
        assert_1.default.deepStrictEqual(output, 'abc');
    });
    (0, vitest_1.test)('leaves urls intact', function () {
        const input = 'foo http://github.com/github/copilot bar';
        const output = (0, pathRedaction_1.redactPaths)(input);
        assert_1.default.deepStrictEqual(output, 'foo http://github.com/github/copilot bar');
    });
    (0, vitest_1.test)('filter unix path', function () {
        assertRedacted('foo /Users/copilot bar', 'foo [redacted] bar');
    });
    (0, vitest_1.test)('path in parenthesis', function () {
        assertRedacted('See details (/Users/copilot)', 'See details ([redacted]');
    });
    (0, vitest_1.test)('filter windows path', function () {
        assertRedacted('foo C:\\Windows\\System32 bar', 'foo [redacted] bar');
        assertRedacted('foo d:\\Windows\\System32 bar', 'foo [redacted] bar');
        assertRedacted('foo C:/Users/XXX/IdeaProjects/TesteUnitario/src/test/kotlin/MainTest.kt bar', 'foo [redacted] bar');
        assertRedacted('foo Z:\\projects/MainTest.kt bar', 'foo [redacted] bar');
    });
    (0, vitest_1.test)('filter unc path', function () {
        assertRedacted('foo \\server-name\\shared-resource-pathname bar', 'foo [redacted] bar');
        assertRedacted('foo file://\\server-name\\shared-resource-pathname bar', 'foo file://[redacted] bar');
    });
    (0, vitest_1.test)('file urls', function () {
        assertRedacted('Invalid file file://C:/Users/XXX/IdeaProjects/kotlin/MainTest.kt bar', 'Invalid file file://[redacted] bar');
        assertRedacted('Invalid file file:///Users/copilot bar', 'Invalid file file://[redacted] bar');
    });
    function assertRedacted(input, output) {
        assert_1.default.deepStrictEqual((0, pathRedaction_1.redactPaths)(input), output);
    }
});
//# sourceMappingURL=pathRedaction.spec.js.map