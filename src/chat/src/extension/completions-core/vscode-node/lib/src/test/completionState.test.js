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
const completionState_1 = require("../completionState");
const textDocument_1 = require("./textDocument");
suite('CompletionState', function () {
    test('position unchanged when before edit range', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld');
        const position = { line: 0, character: 2 };
        const edit = {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
            },
            newText: 'everyone',
        };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits([edit]);
        assert.deepStrictEqual(newState.position, position);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
        assert.deepStrictEqual(newState.textDocument.getText(), 'hello\neveryone');
        assert.deepStrictEqual(newState.editsWithPosition.length, 1);
    });
    test('position adjusts when within edit range', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld');
        const position = { line: 1, character: 2 };
        const edit = {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
            },
            newText: 'everyone',
        };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits([edit]);
        assert.deepStrictEqual(newState.position, { line: 1, character: 8 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'hello\neveryone');
        assert.deepStrictEqual(newState.editsWithPosition.length, 1);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('position at exact start of edit range gets moved to end of edit', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld');
        const position = { line: 1, character: 0 };
        const edit = {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
            },
            newText: 'everyone',
        };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits([edit]);
        assert.deepStrictEqual(newState.position, { line: 1, character: 8 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'hello\neveryone');
        assert.deepStrictEqual(newState.editsWithPosition.length, 1);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('position after edit range adjusts by edit length difference', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld! How are you?');
        const position = { line: 1, character: 12 };
        const edit = {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
            },
            newText: 'everyone',
        };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits([edit]);
        assert.deepStrictEqual(newState.position, { line: 1, character: 15 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'hello\neveryone! How are you?');
        assert.deepStrictEqual(newState.editsWithPosition.length, 1);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('can apply multiple edits', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld! How are you?');
        const position = { line: 1, character: 12 };
        const edits = [
            {
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                newText: 'everyone',
            },
            {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 5 },
                },
                newText: 'hi',
            },
        ];
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits(edits);
        assert.deepStrictEqual(newState.position, { line: 1, character: 15 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'hi\neveryone! How are you?');
        assert.deepStrictEqual(newState.editsWithPosition.length, 2);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('can apply multiple edits in different calls', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld! How are you?');
        const position = { line: 1, character: 12 };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const intermediateState = completionState.applyEdits([
            {
                range: {
                    start: { line: 1, character: 0 },
                    end: { line: 1, character: 5 },
                },
                newText: 'everyone',
            },
        ]);
        const newState = intermediateState.applyEdits([
            {
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 5 },
                },
                newText: 'hi',
            },
        ]);
        assert.deepStrictEqual(newState.position, { line: 1, character: 15 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'hi\neveryone! How are you?');
        assert.deepStrictEqual(newState.editsWithPosition.length, 2);
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('selectedCompletionInfo is stored on its own, but applied as a normal edit', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'const person = Person.');
        const position = { line: 0, character: 22 };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const selectedCompletionInfo = {
            text: 'getName',
            range: {
                start: { line: 0, character: 22 },
                end: { line: 0, character: 22 },
            },
        };
        const newState = completionState.addSelectedCompletionInfo(selectedCompletionInfo);
        assert.deepStrictEqual(newState.position, { line: 0, character: 29 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'const person = Person.getName');
        assert.deepStrictEqual(newState.editsWithPosition.length, 1);
        assert.deepStrictEqual(newState.editsWithPosition[0].source, 'selectedCompletionInfo');
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('selectedCompletionInfo can only be applied once', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'const person = Person.');
        const position = { line: 0, character: 22 };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const selectedCompletionInfo = {
            text: 'getName',
            range: {
                start: { line: 0, character: 22 },
                end: { line: 0, character: 22 },
            },
        };
        const newState = completionState.addSelectedCompletionInfo(selectedCompletionInfo);
        assert.throws(() => {
            newState.addSelectedCompletionInfo(selectedCompletionInfo);
        });
    });
    test('selectedCompletionInfo combined with other edits', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'const person = Person.');
        const position = { line: 0, character: 22 };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const selectedCompletionInfo = {
            text: 'getName',
            range: {
                start: { line: 0, character: 22 },
                end: { line: 0, character: 22 },
            },
        };
        const intermediateState = completionState.addSelectedCompletionInfo(selectedCompletionInfo);
        const speculativeEdit = {
            newText: '()',
            range: {
                start: intermediateState.position,
                end: intermediateState.position,
            },
        };
        const newState = intermediateState.applyEdits([speculativeEdit]);
        assert.deepStrictEqual(newState.position, { line: 0, character: 31 });
        assert.deepStrictEqual(newState.textDocument.getText(), 'const person = Person.getName()');
        assert.deepStrictEqual(newState.editsWithPosition.length, 2);
        assert.deepStrictEqual(newState.editsWithPosition[0].source, 'selectedCompletionInfo');
        assert.deepStrictEqual(newState.originalPosition, position);
        assert.deepStrictEqual(newState.originalOffset, textDocument.offsetAt(position));
    });
    test('updating position does not affect edits', function () {
        const textDocument = (0, textDocument_1.createTextDocument)('file:///test.ts', 'typescript', 1, 'hello\nworld');
        const position = { line: 0, character: 2 };
        const edit = {
            range: {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 5 },
            },
            newText: 'everyone',
        };
        const completionState = (0, completionState_1.createCompletionState)(textDocument, position);
        const newState = completionState.applyEdits([edit]);
        const updatedState = newState.updatePosition({ line: 0, character: 5 });
        assert.deepStrictEqual(updatedState.position, { line: 0, character: 5 });
        assert.deepStrictEqual(updatedState.textDocument.getText(), 'hello\neveryone');
        assert.deepStrictEqual(updatedState.editsWithPosition.length, 1);
        assert.deepStrictEqual(updatedState.originalPosition, position);
        assert.deepStrictEqual(updatedState.originalOffset, textDocument.offsetAt(position));
    });
});
//# sourceMappingURL=completionState.test.js.map