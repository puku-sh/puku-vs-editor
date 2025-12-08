"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Comment Detection Helper Tests
 *  Tests for Tree-sitter-based comment detection
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
const commentDetection_1 = require("../../vscode-node/helpers/commentDetection");
suite('commentDetection', function () {
    suite('isInsideComment', function () {
        test('returns false for unsupported language', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'plaintext',
                content: '// this is text'
            });
            const position = new vscode.Position(0, 5);
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, false);
        });
        test('detects cursor inside JavaScript line comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// add number inverse function\nconst x = 1;'
            });
            const position = new vscode.Position(0, 10); // Inside the comment
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor outside JavaScript comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// comment\nconst x = 1;'
            });
            const position = new vscode.Position(1, 5); // In the code line
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, false);
        });
        test('detects cursor inside JavaScript block comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '/* this is a\nmulti-line\ncomment */\nconst x = 1;'
            });
            const position = new vscode.Position(1, 5); // Inside the block comment
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor inside Python comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'python',
                content: '# add fibonacci function\ndef fib(n):\n    return n'
            });
            const position = new vscode.Position(0, 10); // Inside the comment
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor outside Python comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'python',
                content: '# comment\ndef fib(n):\n    return n'
            });
            const position = new vscode.Position(1, 5); // In the code
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, false);
        });
        test('detects cursor inside Go line comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'go',
                content: '// add http handler\nfunc main() {}'
            });
            const position = new vscode.Position(0, 10); // Inside the comment
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor inside Go block comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'go',
                content: '/* multi\nline */\nfunc main() {}'
            });
            const position = new vscode.Position(0, 5); // Inside the block comment
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor inside TypeScript JSDoc comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'typescript',
                content: '/**\n * Add two numbers\n * @param a first number\n */\nfunction add(a: number) {}'
            });
            const position = new vscode.Position(1, 5); // Inside the JSDoc
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('handles parse errors gracefully', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: 'const x = { invalid syntax'
            });
            const position = new vscode.Position(0, 10);
            // Should not throw, should return false
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, false);
        });
        test('detects cursor at start of comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// comment'
            });
            const position = new vscode.Position(0, 0); // At the very start
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
        test('detects cursor at end of comment', async function () {
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: '// comment'
            });
            const position = new vscode.Position(0, 9); // At the end
            const result = await (0, commentDetection_1.isInsideComment)(doc, position);
            assert.strictEqual(result, true);
        });
    });
});
//# sourceMappingURL=commentDetection.test.js.map