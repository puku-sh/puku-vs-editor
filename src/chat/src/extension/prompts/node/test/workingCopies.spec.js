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
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const workingCopies_1 = require("../inline/workingCopies");
(0, vitest_1.suite)('WorkingCopyOriginalDocument', () => {
    (0, vitest_1.test)('should initialize with correct text and EOL sequence', () => {
        const text = 'Hello\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        assert_1.default.strictEqual(doc.text, text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should initialize with correct EOL sequence for \\r\\n', () => {
        const text = 'Hello\r\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.text, text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should apply offset edits correctly', () => {
        const text = 'Hello\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        const edits = new stringEdit_1.StringEdit([new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(5, 5), ' Beautiful')]);
        doc.applyOffsetEdits(edits);
        assert_1.default.strictEqual(doc.text, 'Hello Beautiful\nWorld');
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should apply multiple offset edits correctly', () => {
        const text = 'Hello\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        const edits = new stringEdit_1.StringEdit([
            new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(5, 5), ' Beautiful'),
            new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(18, 18), '!')
        ]);
        doc.applyOffsetEdits(edits);
        assert_1.default.strictEqual(doc.text, 'Hello Beautiful\nWorld!');
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should maintain transformer state after applying edits', () => {
        const text = 'Hello\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        const edits = new stringEdit_1.StringEdit([new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(5, 5), ' Beautiful')]);
        doc.applyOffsetEdits(edits);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should compose applied edits correctly', () => {
        const text = 'Hello\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        const edits1 = new stringEdit_1.StringEdit([new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(5, 5), ' Beautiful')]);
        const edits2 = new stringEdit_1.StringEdit([new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(21, 21), '!')]);
        doc.applyOffsetEdits(edits1);
        doc.applyOffsetEdits(edits2);
        assert_1.default.strictEqual(doc.text, 'Hello Beautiful\nWorld!');
        assert_1.default.strictEqual(doc.appliedEdits.replacements.length, 2);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
    (0, vitest_1.test)('should normalize EOL sequences in edits', () => {
        const text = 'Hello\r\nWorld';
        const doc = new workingCopies_1.WorkingCopyOriginalDocument(text);
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
        const edits = new stringEdit_1.StringEdit([new stringEdit_1.StringReplacement(new offsetRange_1.OffsetRange(5, 5), ' Beautiful\n')]);
        doc.applyOffsetEdits(edits);
        assert_1.default.strictEqual(doc.text, 'Hello Beautiful\r\n\r\nWorld');
        assert_1.default.strictEqual(doc.transformer.getText(), doc.text);
    });
});
//# sourceMappingURL=workingCopies.spec.js.map