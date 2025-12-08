"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const assert_1 = __importDefault(require("assert"));
const telemetry_1 = require("../../telemetry");
const context_1 = require("../../test/context");
const telemetry_2 = require("../../test/telemetry");
const textDocument_1 = require("../../test/textDocument");
const ghostText_1 = require("../ghostText");
const last_1 = require("../last");
suite('Isolated LastGhostText tests', function () {
    let accessor;
    let last;
    setup(function () {
        accessor = (0, context_1.createLibTestingContext)().createTestingAccessor();
        last = accessor.get(last_1.ICompletionsLastGhostText);
    });
    function makeCompletion(index = 0, text = 'foo', offset = 0) {
        return {
            uuid: 'uuid-' + index,
            insertText: text,
            range: { start: { line: 0, character: 0 }, end: { line: 0, character: text.length } },
            index,
            displayText: text,
            offset,
            uri: 'file:///test',
            position: { line: 0, character: 0 },
            telemetry: telemetry_1.TelemetryWithExp.createEmptyConfigForTesting(),
            resultType: ghostText_1.ResultType.Network,
        };
    }
    test('full completion flow: show, accept, reset', function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(1, 'full completion', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        assert_1.default.strictEqual(last.shownCompletions.length, 1);
        (0, last_1.handleGhostTextPostInsert)(accessor, cmp);
        assert_1.default.strictEqual(last.shownCompletions.length, 0);
        assert_1.default.strictEqual(last.position, undefined);
        assert_1.default.strictEqual(last.uri, undefined);
    });
    test('partial completion flow: show, partial accept, state', function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(2, 'partial completion', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        assert_1.default.strictEqual(last.shownCompletions.length, 1);
        (0, last_1.handlePartialGhostTextPostInsert)(accessor, cmp, 7); // accept first 7 chars
        assert_1.default.strictEqual(last.partiallyAcceptedLength, 7);
        // State is not reset by partial accept
        assert_1.default.strictEqual(last.shownCompletions.length, 1);
    });
    test('reject after show clears completions', function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(3, 'reject me', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        assert_1.default.strictEqual(last.shownCompletions.length, 1);
        (0, last_1.rejectLastShown)(accessor, 0);
        assert_1.default.strictEqual(last.shownCompletions.length, 0);
    });
    test('setLastShown resets completions if position/uri changes', function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        last.shownCompletions.push(makeCompletion(4, 'baz', 0));
        const doc = (0, textDocument_1.createTextDocument)('file:///other', 'plaintext', 1, '');
        (0, last_1.setLastShown)(accessor, doc, { line: 1, character: 1 }, ghostText_1.ResultType.Network);
        assert_1.default.strictEqual(last.shownCompletions.length, 0);
    });
    test('full acceptance sends total number of lines with telemetry', async function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(0, 'line1\nline2\nline3', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, () => {
            (0, last_1.handleGhostTextPostInsert)(accessor, cmp);
        });
        const event = reporter.events.find(e => e.name === 'ghostText.accepted');
        assert_1.default.ok(event);
        assert_1.default.strictEqual(event.measurements.numLines, 3);
    });
    test('partial acceptance for VS Code sends total number of lines accepted with telemetry', async function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(0, 'line1\nline2\nline3', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, () => {
            (0, last_1.handlePartialGhostTextPostInsert)(accessor, cmp, 'line1'.length, undefined, undefined);
        });
        const event = reporter.events.find(e => e.name === 'ghostText.accepted');
        assert_1.default.ok(event);
        assert_1.default.strictEqual(event.measurements.numLines, 1);
    });
    test('additional partial acceptance for VS Code sends total number of lines accepted with telemetry', async function () {
        last.setState({ uri: 'file:///test' }, { line: 0, character: 0 });
        const cmp = makeCompletion(0, 'line1\nline2\nline3', 0);
        (0, last_1.handleGhostTextShown)(accessor, cmp);
        (0, last_1.handlePartialGhostTextPostInsert)(accessor, cmp, 'line1'.length, undefined, undefined);
        cmp.displayText = 'line2\nline3'; // Simulate the display text being updated after accepting the first line
        const { reporter } = await (0, telemetry_2.withInMemoryTelemetry)(accessor, () => {
            (0, last_1.handlePartialGhostTextPostInsert)(accessor, cmp, 'line2'.length, undefined, undefined);
        });
        const event = reporter.events.reverse().find(e => e.name === 'ghostText.accepted');
        assert_1.default.ok(event);
        assert_1.default.strictEqual(event.measurements.numLines, 2);
    });
});
//# sourceMappingURL=last.test.js.map