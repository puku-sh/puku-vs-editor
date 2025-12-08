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
const positionOffsetTransformer_1 = require("../../../../platform/editing/common/positionOffsetTransformer");
const vscodeTypes_1 = require("../../../../vscodeTypes");
(0, vitest_1.suite)('PositionOffsetTransformer', () => {
    const sampleText = `line1\nline2\nline3`;
    let transformer;
    (0, vitest_1.beforeEach)(() => {
        transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(sampleText);
    });
    (0, vitest_1.test)('should initialize correctly', () => {
        assert_1.default.equal(transformer.getLineCount(), 3);
    });
    (0, vitest_1.test)('should get correct offset for a position', () => {
        const position = new vscodeTypes_1.Position(1, 2);
        const offset = transformer.getOffset(position);
        assert_1.default.equal(offset, 8); // 6 (line1\n) + 2 (line2)
    });
    (0, vitest_1.test)('should get correct position for an offset', () => {
        const offset = 8;
        const position = transformer.getPosition(offset);
        assert_1.default.equal(position.line, 1);
        assert_1.default.equal(position.character, 2);
    });
    (0, vitest_1.test)('should convert range to offset range and back', () => {
        const range = new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 1), new vscodeTypes_1.Position(1, 2));
        const offsetRange = transformer.toOffsetRange(range);
        assert_1.default.equal(offsetRange.start, 1);
        assert_1.default.equal(offsetRange.endExclusive, 8);
        const newRange = transformer.toRange(offsetRange);
        assert_1.default.equal(newRange.start.line, 0);
        assert_1.default.equal(newRange.start.character, 1);
        assert_1.default.equal(newRange.end.line, 1);
        assert_1.default.equal(newRange.end.character, 2);
    });
    (0, vitest_1.test)('should apply offset edits correctly', () => {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(0, 5)), 'Hello'),
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(1, 0), new vscodeTypes_1.Position(1, 5)), 'World')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, 'Hello\nWorld\nline3');
    });
    (0, vitest_1.test)('should validate position correctly', () => {
        const invalidPosition = new vscodeTypes_1.Position(10, 10);
        const validPosition = transformer.validatePosition(invalidPosition);
        assert_1.default.equal(validPosition.line, 2);
        assert_1.default.equal(validPosition.character, 5);
    });
    (0, vitest_1.test)('should validate range correctly', () => {
        const invalidRange = new vscodeTypes_1.Range(new vscodeTypes_1.Position(10, 10), new vscodeTypes_1.Position(20, 20));
        const validRange = transformer.validateRange(invalidRange);
        assert_1.default.equal(validRange.start.line, 2);
        assert_1.default.equal(validRange.start.character, 5);
        assert_1.default.equal(validRange.end.line, 2);
        assert_1.default.equal(validRange.end.character, 5);
    });
    (0, vitest_1.test)('should apply offset edits with insertion correctly', () => {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 5), new vscodeTypes_1.Position(0, 5)), 'Hello '),
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(1, 5), new vscodeTypes_1.Position(1, 5)), ' World')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, 'line1Hello \nline2 World\nline3');
        // Additional assertions
        assert_1.default.equal(transformer.getPosition(11).line, 0);
        assert_1.default.equal(transformer.getPosition(11).character, 11);
        assert_1.default.equal(transformer.getPosition(12).line, 1);
        assert_1.default.equal(transformer.getPosition(12).character, 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 0)), 12);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(0, 11)), 11);
    });
    (0, vitest_1.test)('should apply offset edits with deletion correctly', () => {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(0, 5)), ''),
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(1, 0), new vscodeTypes_1.Position(1, 5)), '')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, '\n\nline3');
        // Additional assertions
        assert_1.default.equal(transformer.getPosition(0).line, 0);
        assert_1.default.equal(transformer.getPosition(0).character, 0);
        assert_1.default.equal(transformer.getPosition(1).line, 1);
        assert_1.default.equal(transformer.getPosition(1).character, 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(0, 0)), 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 0)), 1);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(2, 0)), 2);
    });
    (0, vitest_1.test)('should apply offset edits with mixed edits correctly', () => {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), new vscodeTypes_1.Position(0, 5)), 'Hello'),
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(1, 0), new vscodeTypes_1.Position(1, 5)), 'World'),
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(2, 0), new vscodeTypes_1.Position(2, 5)), 'Test')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, 'Hello\nWorld\nTest');
        // Additional assertions
        assert_1.default.equal(transformer.getPosition(5).line, 0);
        assert_1.default.equal(transformer.getPosition(5).character, 5);
        assert_1.default.equal(transformer.getPosition(6).line, 1);
        assert_1.default.equal(transformer.getPosition(6).character, 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 0)), 6);
    });
    (0, vitest_1.test)('should apply offset edits with multi-line insertion correctly', () => {
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 5), new vscodeTypes_1.Position(0, 5)), '\nInserted\nText\n')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, 'line1\nInserted\nText\n\nline2\nline3');
        // Additional assertions
        assert_1.default.equal(transformer.getPosition(6).line, 1);
        assert_1.default.equal(transformer.getPosition(6).character, 0);
        assert_1.default.equal(transformer.getPosition(14).line, 1);
        assert_1.default.equal(transformer.getPosition(14).character, 8);
        assert_1.default.equal(transformer.getPosition(15).line, 2);
        assert_1.default.equal(transformer.getPosition(15).character, 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 0)), 6);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 8)), 14);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(2, 0)), 15);
    });
    (0, vitest_1.test)('should apply offset edits with multi-line insertion correctly with CRLF', () => {
        const sampleTextWithCRLF = `line1\r\nline2\r\nline3`;
        transformer = new positionOffsetTransformer_1.PositionOffsetTransformer(sampleTextWithCRLF);
        const edits = [
            new vscodeTypes_1.TextEdit(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 5), new vscodeTypes_1.Position(0, 5)), '\r\nInserted\r\nText\r\n')
        ];
        const offsetEdit = transformer.toOffsetEdit(edits);
        transformer.applyOffsetEdits(offsetEdit);
        const newText = transformer.getText();
        assert_1.default.equal(newText, 'line1\r\nInserted\r\nText\r\n\r\nline2\r\nline3');
        // Additional assertions
        assert_1.default.equal(transformer.getPosition(7).line, 1);
        assert_1.default.equal(transformer.getPosition(7).character, 0);
        assert_1.default.equal(transformer.getPosition(15).line, 1);
        assert_1.default.equal(transformer.getPosition(15).character, 8);
        assert_1.default.equal(transformer.getPosition(17).line, 2);
        assert_1.default.equal(transformer.getPosition(17).character, 0);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 0)), 7);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(1, 8)), 15);
        assert_1.default.equal(transformer.getOffset(new vscodeTypes_1.Position(2, 0)), 17);
    });
});
//# sourceMappingURL=positionOffsetTransformer.spec.js.map