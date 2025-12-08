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
const vitest_1 = require("vitest");
const diagnosticData_1 = require("../../../../platform/inlineEdits/common/dataTypes/diagnosticData");
const uri_1 = require("../../../../util/vs/base/common/uri");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const abstractText_1 = require("../../../../util/vs/editor/common/core/text/abstractText");
const diagnosticsCompletions_1 = require("../../vscode-node/features/diagnosticsBasedCompletions/diagnosticsCompletions");
const diagnosticsCompletionProcessor_1 = require("../../vscode-node/features/diagnosticsCompletionProcessor");
// Helper function to create a Diagnostic from a mock VS Code diagnostic
function createDiagnostic(message, range) {
    return new diagnosticsCompletions_1.Diagnostic(new diagnosticData_1.DiagnosticData(uri_1.URI.parse('file:///test/document.ts'), message, 'error', range, undefined, undefined));
}
(0, vitest_1.suite)('DiagnosticsCollection', () => {
    (0, vitest_1.test)('isEqualAndUpdate should return true for empty arrays', () => {
        const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
        const result = collection.isEqualAndUpdate([]);
        assert.strictEqual(result, true);
    });
    (0, vitest_1.test)('isEqualAndUpdate should update diagnostics and return false when different', () => {
        const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
        const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(0, 4));
        const result = collection.isEqualAndUpdate([diagnostic]);
        assert.strictEqual(result, false);
    });
    (0, vitest_1.test)('isEqualAndUpdate should return true when diagnostics are equal', () => {
        const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
        const diagnostic1 = createDiagnostic('Test error', new offsetRange_1.OffsetRange(0, 4));
        const diagnostic2 = createDiagnostic('Test error', new offsetRange_1.OffsetRange(0, 4));
        collection.isEqualAndUpdate([diagnostic1]);
        const result = collection.isEqualAndUpdate([diagnostic2]);
        assert.strictEqual(result, true);
    });
    (0, vitest_1.test)('isEqualAndUpdate should return false when a diagnostics is invalidated', () => {
        const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
        const diagnostic1 = createDiagnostic('Test error', new offsetRange_1.OffsetRange(0, 4));
        const diagnostic2 = createDiagnostic('Test error', new offsetRange_1.OffsetRange(0, 4));
        collection.isEqualAndUpdate([diagnostic1]);
        diagnostic1.invalidate();
        const result = collection.isEqualAndUpdate([diagnostic2]);
        assert.strictEqual(result, false);
    });
    (0, vitest_1.suite)('applyEdit', () => {
        (0, vitest_1.test)('should invalidate when typing numbers at the end of a diagnostic range', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 17)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic]);
            // Replace "test" with "test123"
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 17), 'test123'); // 0-based: 12-16
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should invalidate diagnostic when range shrinks', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(6, 11)); // "world"
            collection.isEqualAndUpdate([diagnostic]);
            // Create an edit that removes "w"
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(6, 7), ''); // Remove "w"
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should update range when content stays the same and range length unchanged', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16));
            collection.isEqualAndUpdate([diagnostic]);
            // Insert " big" without touching the diagnostic range
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(6, 6), ' big');
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, false);
            assert.strictEqual(diagnostic.isValid(), true);
        });
        (0, vitest_1.test)('should invalidate diagnostic when content at range changes with same length', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test"
            collection.isEqualAndUpdate([diagnostic]);
            // Replace "test" with "best"
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 16), 'best');
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should handle range growth with same prefix content', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16));
            collection.isEqualAndUpdate([diagnostic]);
            // "test" becomes "test!" (non-alphanumeric edge)
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 16), 'test!');
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, false);
            assert.strictEqual(diagnostic.isValid(), true);
            // Range should still point to the original "test" part
            assert.strictEqual(diagnostic.range.start, 12);
            assert.strictEqual(diagnostic.range.endExclusive, 16);
        });
        (0, vitest_1.test)('should handle range growth with same suffix content', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test"
            collection.isEqualAndUpdate([diagnostic]);
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 12), 'ab');
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should invalidate when edge character is alphanumeric with prefix match', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test"
            collection.isEqualAndUpdate([diagnostic]);
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(16, 16), 'A');
            const after = edit.applyOnText(before);
            // Add A after "test"
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should not invalidate when edge character is non-alphanumeric with prefix match', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic]);
            // Replace "test" with "test!"
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 16), 'test!'); // 0-based: 12-15
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, false);
            assert.strictEqual(diagnostic.isValid(), true);
        });
        (0, vitest_1.test)('should handle multiple diagnostics correctly', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic1 = createDiagnostic('Error 1', new offsetRange_1.OffsetRange(0, 5)); // "hello" = positions 0-4 (0-based)
            const diagnostic2 = createDiagnostic('Error 2', new offsetRange_1.OffsetRange(12, 16)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic1, diagnostic2]);
            const before = new abstractText_1.StringText('hello world test');
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(6, 6), 'big ');
            const after = edit.applyOnText(before);
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, false);
            assert.strictEqual(diagnostic1.isValid(), true);
            assert.strictEqual(diagnostic2.isValid(), true);
            // First diagnostic range should be unchanged
            assert.strictEqual(diagnostic1.range.start, 0);
            assert.strictEqual(diagnostic1.range.endExclusive, 5);
            // Second diagnostic range should be shifted by 4 positions ("big ")
            assert.strictEqual(diagnostic2.range.start, 16);
            assert.strictEqual(diagnostic2.range.endExclusive, 20);
        });
        (0, vitest_1.test)('should handle edge case with empty edge character', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic]);
            const before = new abstractText_1.StringText('hello world test');
            const after = new abstractText_1.StringText('hello world testx'); // Add 'x' at end
            // Replace "test" with "testx"
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 16), 'testx'); // 0-based: 12-15
            const hasInvalidated = collection.applyEdit(before, edit, after);
            // Since 'x' is alphanumeric, should invalidate
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
        (0, vitest_1.test)('should handle suffix match with non-alphanumeric edge character', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic]);
            const before = new abstractText_1.StringText('hello world test');
            const after = new abstractText_1.StringText('hello world .test'); // "test" becomes ".test"
            // Replace "test" with ".test"
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(12, 16), '.test'); // 0-based: 12-15
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, false);
            assert.strictEqual(diagnostic.isValid(), true);
            // Range should point to the suffix "test" part
            assert.strictEqual(diagnostic.range.start, 13);
            assert.strictEqual(diagnostic.range.endExclusive, 17); // 17 + 1 (".")
        });
        (0, vitest_1.test)('should handle case where newOffsetRange is null', () => {
            const collection = new diagnosticsCompletionProcessor_1.DiagnosticsCollection();
            const diagnostic = createDiagnostic('Test error', new offsetRange_1.OffsetRange(12, 16)); // "test" = positions 12-15 (0-based)
            collection.isEqualAndUpdate([diagnostic]);
            // Mock applyEditsToRanges to return null (would happen if range is completely removed)
            const before = new abstractText_1.StringText('hello world test');
            const after = new abstractText_1.StringText('hello world'); // "test" completely removed
            // Remove " test" completely (0-based: positions 11-15)
            const edit = stringEdit_1.StringEdit.replace(new offsetRange_1.OffsetRange(11, 16), '');
            const hasInvalidated = collection.applyEdit(before, edit, after);
            assert.strictEqual(hasInvalidated, true);
            assert.strictEqual(diagnostic.isValid(), false);
        });
    });
});
//# sourceMappingURL=diagnosticsCollection.spec.js.map