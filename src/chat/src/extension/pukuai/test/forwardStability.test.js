"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Tests for enableForwardStability implementation (Issue #55)
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
const vscode = __importStar(require("vscode"));
suite('Forward Stability (Issue #55)', () => {
    test('InlineCompletionList has enableForwardStability property', () => {
        // This test verifies the VS Code API type includes enableForwardStability
        const completionItem = {
            insertText: 'test completion',
            range: new vscode.Range(0, 0, 0, 0)
        };
        const completionList = {
            items: [completionItem],
            enableForwardStability: true
        };
        assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should be true');
        assert.strictEqual(completionList.items.length, 1, 'Should have one completion item');
    });
    test('InlineCompletionList with enableForwardStability=false', () => {
        const completionItem = {
            insertText: 'test completion',
            range: new vscode.Range(0, 0, 0, 0)
        };
        const completionList = {
            items: [completionItem],
            enableForwardStability: false
        };
        assert.strictEqual(completionList.enableForwardStability, false, 'enableForwardStability should be false');
    });
    test('InlineCompletionList without enableForwardStability (undefined)', () => {
        const completionItem = {
            insertText: 'test completion',
            range: new vscode.Range(0, 0, 0, 0)
        };
        const completionList = {
            items: [completionItem]
        };
        assert.strictEqual(completionList.enableForwardStability, undefined, 'enableForwardStability should be undefined when not set');
    });
    test('Multiple completion items with forward stability', () => {
        const item1 = {
            insertText: 'completion 1',
            range: new vscode.Range(0, 0, 0, 0)
        };
        const item2 = {
            insertText: 'completion 2',
            range: new vscode.Range(1, 0, 1, 0)
        };
        const completionList = {
            items: [item1, item2],
            enableForwardStability: true
        };
        assert.strictEqual(completionList.items.length, 2, 'Should have two completion items');
        assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should be true');
    });
    test('Empty items array with forward stability', () => {
        const completionList = {
            items: [],
            enableForwardStability: true
        };
        assert.strictEqual(completionList.items.length, 0, 'Should have zero completion items');
        assert.strictEqual(completionList.enableForwardStability, true, 'enableForwardStability should still be true');
    });
});
//# sourceMappingURL=forwardStability.test.js.map