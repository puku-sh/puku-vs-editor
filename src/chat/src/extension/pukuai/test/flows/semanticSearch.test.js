"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Semantic Search Flow Tests
 *  Tests for signature extraction and semantic code search
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
const semanticSearch_1 = require("../../vscode-node/flows/semanticSearch");
suite('SemanticSearchFlow', function () {
    let flow;
    let mockIndexingService;
    setup(function () {
        mockIndexingService = {
            isAvailable: () => true,
            search: async () => []
        };
        flow = new semanticSearch_1.SemanticSearchFlow(mockIndexingService);
    });
    suite('searchSimilarCode', function () {
        test('returns empty array when indexing not available', async function () {
            const unavailableService = {
                isAvailable: () => false,
                search: async () => []
            };
            const flowWithUnavailable = new semanticSearch_1.SemanticSearchFlow(unavailableService);
            const results = await flowWithUnavailable.searchSimilarCode('calculate sum', 2, 'javascript', vscode.Uri.file('/test/file.js'));
            assert.deepStrictEqual(results, []);
        });
        test('excludes same-file results', async function () {
            const currentFileUri = vscode.Uri.file('/test/current.js');
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: currentFileUri,
                        content: 'function test() { return 42; }',
                        chunkType: 'function',
                        symbolName: 'test',
                        lineStart: 1,
                        lineEnd: 1
                    },
                    {
                        uri: vscode.Uri.file('/test/other.js'),
                        content: 'function calculate(a, b) {\n  return a + b;\n}',
                        chunkType: 'function',
                        symbolName: 'calculate',
                        lineStart: 1,
                        lineEnd: 3
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('calculate sum', 2, 'javascript', currentFileUri);
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].filepath, '/test/other.js');
        });
        test('extracts function signature (not full implementation)', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.js'),
                        content: 'function calculate(a, b) {\n  return a + b;\n}',
                        chunkType: 'function',
                        symbolName: 'calculate',
                        lineStart: 1,
                        lineEnd: 3
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('calculate sum', 2, 'javascript', vscode.Uri.file('/test/current.js'));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, 'function calculate(a, b)');
        });
        test('extracts class signature', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.ts'),
                        content: 'class Calculator {\n  add(a, b) { return a + b; }\n}',
                        chunkType: 'class',
                        symbolName: 'Calculator',
                        lineStart: 1,
                        lineEnd: 3
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('calculator class', 2, 'typescript', vscode.Uri.file('/test/current.ts'));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, 'class Calculator');
        });
        test('extracts interface signature', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.ts'),
                        content: 'interface User {\n  name: string;\n  age: number;\n}',
                        chunkType: 'interface',
                        symbolName: 'User',
                        lineStart: 1,
                        lineEnd: 4
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('user interface', 2, 'typescript', vscode.Uri.file('/test/current.ts'));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, 'interface User');
        });
        test('extracts method signature', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.ts'),
                        content: 'add(a: number, b: number): number {\n  return a + b;\n}',
                        chunkType: 'method',
                        symbolName: 'add',
                        lineStart: 1,
                        lineEnd: 3
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('add method', 2, 'typescript', vscode.Uri.file('/test/current.ts'));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, 'add(a: number, b: number): number');
        });
        test('handles fallback for chunks without metadata', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.js'),
                        content: '// Some comment\nfunction test() {\n  return 42;\n}',
                        // No chunkType or symbolName
                        lineStart: 1,
                        lineEnd: 4
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('test function', 2, 'javascript', vscode.Uri.file('/test/current.js'));
            assert.strictEqual(results.length, 1);
            // Should extract first non-comment line
            assert.strictEqual(results[0].content, 'function test()');
        });
        test('handles export class syntax', async function () {
            const mockService = {
                isAvailable: () => true,
                search: async () => [
                    {
                        uri: vscode.Uri.file('/test/other.ts'),
                        content: 'export class Calculator {\n  add(a, b) { return a + b; }\n}',
                        chunkType: 'class',
                        symbolName: 'Calculator',
                        lineStart: 1,
                        lineEnd: 3
                    }
                ]
            };
            const flowWithMock = new semanticSearch_1.SemanticSearchFlow(mockService);
            const results = await flowWithMock.searchSimilarCode('calculator', 2, 'typescript', vscode.Uri.file('/test/current.ts'));
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].content, 'export class Calculator');
        });
    });
});
//# sourceMappingURL=semanticSearch.test.js.map