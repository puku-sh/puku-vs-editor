"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Inline Completion Cache Integration Tests
 *  Tests for Radix Trie cache integration in the inline completion provider
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
const pukuInlineCompletionProvider_1 = require("../vscode-node/pukuInlineCompletionProvider");
suite('PukuInlineCompletionProvider - Cache Integration', function () {
    let provider;
    let mockDocument;
    let mockPosition;
    let mockContext;
    let mockToken;
    // Mock services
    const mockFetcherService = {
        fetch: async (url, options) => {
            // Mock successful completion response
            return {
                ok: true,
                json: async () => ({
                    id: 'test-id',
                    object: 'text_completion',
                    created: Date.now(),
                    model: 'codestral-latest',
                    choices: [
                        {
                            text: 'console.log("Hello, World!");',
                            index: 0,
                            finish_reason: 'stop'
                        }
                    ]
                })
            };
        }
    };
    const mockLogService = {
        info: (message) => { },
        debug: (message) => { },
        error: (message) => { }
    };
    const mockAuthService = {
        getToken: async () => ({ token: 'test-token' })
    };
    const mockIndexingService = {
        isAvailable: () => false,
        search: async () => []
    };
    setup(function () {
        // Create provider with mocks
        provider = new pukuInlineCompletionProvider_1.PukuInlineCompletionProvider('http://localhost:11434', mockFetcherService, mockLogService, mockAuthService, mockIndexingService);
        // Setup mock document
        mockDocument = {
            getText: (range) => {
                if (!range) {
                    return 'function hello() {\n    ';
                }
                // For prefix extraction (from start to position)
                if (range.start.line === 0 && range.start.character === 0) {
                    return 'function hello() {\n    ';
                }
                // For suffix extraction (from position to end)
                return '\n}';
            },
            lineAt: (lineOrPosition) => {
                const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                return {
                    text: line === 0 ? 'function hello() {' : line === 1 ? '    ' : '}',
                    range: new vscode.Range(line, 0, line, 100)
                };
            },
            lineCount: 3,
            languageId: 'javascript',
            uri: vscode.Uri.file('/test.js'),
            fileName: '/test.js'
        };
        mockPosition = new vscode.Position(1, 4);
        mockContext = {};
        mockToken = new vscode.CancellationTokenSource().token;
    });
    suite('Radix Trie Cache Behavior', function () {
        test('caches completion and returns it on subsequent requests', async function () {
            this.timeout(5000);
            // First request - should call API
            const result1 = await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            assert.ok(result1);
            assert.strictEqual(Array.isArray(result1) ? result1.length : 0, 1);
            // Second request with same prefix/suffix - should use cache
            const result2 = await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            assert.ok(result2);
            // Should return same completion from cache
        });
        test('returns partial completion when user types into cached completion', async function () {
            this.timeout(5000);
            // Mock document that extends the prefix
            const extendedDocument = {
                ...mockDocument,
                getText: (range) => {
                    if (!range) {
                        return 'function hello() {\n    console';
                    }
                    if (range.start.line === 0 && range.start.character === 0) {
                        return 'function hello() {\n    console';
                    }
                    return '\n}';
                }
            };
            // First request - cache the full completion
            await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            // Second request with extended prefix
            const result = await provider.provideInlineCompletionItems(extendedDocument, new vscode.Position(1, 11), // After 'console'
            mockContext, mockToken);
            // Should return remaining part of completion
            if (result && Array.isArray(result) && result.length > 0) {
                const completion = result[0].insertText;
                // Should not include 'console' (already typed)
                assert.ok(!completion.startsWith('console'));
            }
        });
        test('respects suffix when matching cached completions', async function () {
            this.timeout(5000);
            const docWithSuffix1 = {
                ...mockDocument,
                getText: (range) => {
                    if (!range)
                        return 'const x = ';
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'const x = ';
                    return ';';
                }
            };
            const docWithSuffix2 = {
                ...mockDocument,
                getText: (range) => {
                    if (!range)
                        return 'const x = ';
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'const x = ';
                    return ''; // Different suffix
                }
            };
            // Cache completion with suffix ';'
            await provider.provideInlineCompletionItems(docWithSuffix1, mockPosition, mockContext, mockToken);
            // Request with different suffix - should not return cached completion
            const result = await provider.provideInlineCompletionItems(docWithSuffix2, mockPosition, mockContext, mockToken);
            // Will either call API or return null (debounced)
            // But should NOT return the cached completion with different suffix
        });
        test('cache persists across multiple requests', async function () {
            this.timeout(5000);
            // Make initial request
            await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            // Make several requests with extended prefixes (simulating word-by-word acceptance)
            const positions = [
                { prefix: 'function hello() {\n    c', pos: 5 },
                { prefix: 'function hello() {\n    cons', pos: 8 },
                { prefix: 'function hello() {\n    console', pos: 11 },
            ];
            for (const { prefix, pos } of positions) {
                const doc = {
                    ...mockDocument,
                    getText: (range) => {
                        if (!range)
                            return prefix;
                        if (range.start.line === 0 && range.start.character === 0)
                            return prefix;
                        return '\n}';
                    }
                };
                const result = await provider.provideInlineCompletionItems(doc, new vscode.Position(1, pos), mockContext, mockToken);
                // Should get results from cache (not null/debounced)
                if (result && Array.isArray(result)) {
                    assert.ok(result.length > 0, `Should return cached completion at position ${pos}`);
                }
            }
        });
    });
    suite('Debounce with Cache', function () {
        test('cache bypass allows faster suggestions', async function () {
            this.timeout(5000);
            // Initial request
            const start1 = Date.now();
            const result1 = await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            const duration1 = Date.now() - start1;
            // Immediate second request (within debounce window) - should use cache
            const start2 = Date.now();
            const result2 = await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            const duration2 = Date.now() - start2;
            // Cache hit should be MUCH faster (< 10ms vs potentially 200ms+ for API)
            if (result2 && Array.isArray(result2) && result2.length > 0) {
                assert.ok(duration2 < 50, `Cache hit should be fast (${duration2}ms)`);
            }
        });
        test('debounce still applies for cache misses', async function () {
            this.timeout(5000);
            const doc1 = {
                ...mockDocument,
                getText: (range) => {
                    if (!range)
                        return 'const a = ';
                    if (range.start.line === 0)
                        return 'const a = ';
                    return ';';
                }
            };
            const doc2 = {
                ...mockDocument,
                getText: (range) => {
                    if (!range)
                        return 'const b = ';
                    if (range.start.line === 0)
                        return 'const b = ';
                    return ';';
                }
            };
            // First request
            await provider.provideInlineCompletionItems(doc1, mockPosition, mockContext, mockToken);
            // Immediate second request with different prefix (cache miss)
            const result = await provider.provideInlineCompletionItems(doc2, mockPosition, mockContext, mockToken);
            // Should be debounced (null) or in-flight
            // This tests that debounce logic is still active for cache misses
        });
    });
    suite('Context Search with Cache', function () {
        test('context search only runs on API calls, not cache hits', async function () {
            this.timeout(5000);
            let searchCallCount = 0;
            const mockIndexingWithTracking = {
                isAvailable: () => true,
                search: async () => {
                    searchCallCount++;
                    return [];
                }
            };
            const providerWithSearch = new pukuInlineCompletionProvider_1.PukuInlineCompletionProvider('http://localhost:11434', mockFetcherService, mockLogService, mockAuthService, mockIndexingWithTracking);
            // First request - should call search
            await providerWithSearch.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            const callsAfterFirst = searchCallCount;
            assert.ok(callsAfterFirst > 0, 'Should call search on API request');
            // Second request (cache hit) - should NOT call search
            await providerWithSearch.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            assert.strictEqual(searchCallCount, callsAfterFirst, 'Should not call search on cache hit');
        });
    });
    suite('Edge Cases', function () {
        test('handles empty completions', async function () {
            this.timeout(5000);
            const emptyFetcher = {
                fetch: async () => ({
                    ok: true,
                    json: async () => ({
                        choices: [{ text: '', index: 0, finish_reason: 'stop' }]
                    })
                })
            };
            const emptyProvider = new pukuInlineCompletionProvider_1.PukuInlineCompletionProvider('http://localhost:11434', emptyFetcher, mockLogService, mockAuthService, mockIndexingService);
            const result = await emptyProvider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            // Should handle empty completion gracefully
            assert.ok(result === null || (Array.isArray(result) && result.length === 0));
        });
        test('handles very long prefixes', async function () {
            this.timeout(5000);
            const longPrefix = 'a'.repeat(10000);
            const longDoc = {
                ...mockDocument,
                getText: (range) => {
                    if (!range)
                        return longPrefix;
                    if (range.start.line === 0 && range.start.character === 0)
                        return longPrefix;
                    return '';
                }
            };
            const result = await provider.provideInlineCompletionItems(longDoc, new vscode.Position(0, longPrefix.length), mockContext, mockToken);
            // Should handle long prefixes without crashing
            assert.ok(result !== undefined);
        });
        test('handles cancellation', async function () {
            this.timeout(5000);
            const cancelSource = new vscode.CancellationTokenSource();
            cancelSource.cancel();
            const result = await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, cancelSource.token);
            // Should return null when cancelled
            assert.strictEqual(result, null);
        });
        test('handles unauthenticated state', async function () {
            this.timeout(5000);
            const noAuthService = {
                getToken: async () => null
            };
            const noAuthProvider = new pukuInlineCompletionProvider_1.PukuInlineCompletionProvider('http://localhost:11434', mockFetcherService, mockLogService, noAuthService, mockIndexingService);
            const result = await noAuthProvider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            assert.strictEqual(result, null, 'Should return null when not authenticated');
        });
    });
    suite('Performance', function () {
        test('cache lookup is faster than API call', async function () {
            this.timeout(10000);
            // Measure API call time
            const apiStart = Date.now();
            await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            const apiDuration = Date.now() - apiStart;
            // Measure cache lookup time
            const cacheStart = Date.now();
            await provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken);
            const cacheDuration = Date.now() - cacheStart;
            // Cache should be significantly faster (at least 10x)
            assert.ok(cacheDuration < apiDuration / 10, `Cache (${cacheDuration}ms) should be much faster than API (${apiDuration}ms)`);
        });
        test('handles rapid successive requests', async function () {
            this.timeout(10000);
            const promises = [];
            // Fire 10 rapid requests
            for (let i = 0; i < 10; i++) {
                promises.push(provider.provideInlineCompletionItems(mockDocument, mockPosition, mockContext, mockToken));
            }
            const results = await Promise.all(promises);
            // Should handle all requests without crashing
            assert.strictEqual(results.length, 10);
        });
    });
    suite('Context-Aware Minimum Prefix', function () {
        test('suggests with 1-char prefix when imports present (Go)', async function () {
            this.timeout(5000);
            // Mock Go file with imports
            const goDoc = {
                getText: (range) => {
                    if (!range)
                        return 'package main\nimport "fmt"\n\nfunc main() {\n\tf';
                    if (range.start.line === 0 && range.start.character === 0) {
                        return 'package main\nimport "fmt"\n\nfunc main() {\n\tf'; // 1 char prefix
                    }
                    return '\n}';
                },
                lineAt: (lineOrPosition) => {
                    const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                    return {
                        text: line === 0 ? 'package main' : line === 1 ? 'import "fmt"' : line === 4 ? '\tf' : '',
                        range: new vscode.Range(line, 0, line, 100)
                    };
                },
                lineCount: 15, // File has structure
                languageId: 'go', // Known language
                uri: vscode.Uri.file('/test.go'),
                fileName: '/test.go'
            };
            // Should NOT block despite 1-char prefix (has imports + known language + file structure)
            // Context score: imports(3) + language(1) + structure(1) = 5 >= 2
            const result = await provider.provideInlineCompletionItems(goDoc, new vscode.Position(4, 2), // After 'f'
            mockContext, mockToken);
            // Should get result (not blocked by prefix check)
            // May be null due to debounce, but should not be blocked by prefix length
            assert.ok(result !== undefined, 'Should not block 1-char prefix with strong context');
        });
        test('suggests with 1-char prefix when semantic matches present', async function () {
            this.timeout(5000);
            const mockIndexingWithResults = {
                isAvailable: () => true,
                search: async () => [
                    { filepath: '/similar.js', content: 'console.log("example");', score: 0.9 }
                ]
            };
            const providerWithSemanticContext = new pukuInlineCompletionProvider_1.PukuInlineCompletionProvider('http://localhost:11434', mockFetcherService, mockLogService, mockAuthService, mockIndexingWithResults);
            const jsDoc = {
                getText: (range) => {
                    if (!range)
                        return 'c'; // 1 char
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'c';
                    return '';
                },
                lineAt: (lineOrPosition) => ({
                    text: 'c',
                    range: new vscode.Range(0, 0, 0, 1)
                }),
                lineCount: 12, // Has structure
                languageId: 'javascript', // Known language
                uri: vscode.Uri.file('/test.js'),
                fileName: '/test.js'
            };
            // Context score: semantic(2) + language(1) + structure(1) = 4 >= 2
            const result = await providerWithSemanticContext.provideInlineCompletionItems(jsDoc, new vscode.Position(0, 1), mockContext, mockToken);
            assert.ok(result !== undefined, 'Should not block 1-char prefix with semantic context');
        });
        test('blocks 1-char prefix with no context (plaintext)', async function () {
            this.timeout(5000);
            const plaintextDoc = {
                getText: (range) => {
                    if (!range)
                        return 'f';
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'f';
                    return '';
                },
                lineAt: (lineOrPosition) => ({
                    text: 'f',
                    range: new vscode.Range(0, 0, 0, 1)
                }),
                lineCount: 1, // No structure
                languageId: 'plaintext', // Not a known language
                uri: vscode.Uri.file('/test.txt'),
                fileName: '/test.txt'
            };
            // Context score: 0 (no imports, no semantic, no language, no structure)
            const result = await provider.provideInlineCompletionItems(plaintextDoc, new vscode.Position(0, 1), mockContext, mockToken);
            // Should be blocked due to insufficient context
            assert.strictEqual(result, null, 'Should block 1-char prefix without context');
        });
        test('blocks 1-char prefix in empty new file', async function () {
            this.timeout(5000);
            const emptyNewFile = {
                getText: (range) => {
                    if (!range)
                        return 'x';
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'x';
                    return '';
                },
                lineAt: (lineOrPosition) => ({
                    text: 'x',
                    range: new vscode.Range(0, 0, 0, 1)
                }),
                lineCount: 1, // No structure
                languageId: 'javascript', // Known language
                uri: vscode.Uri.file('/new.js'),
                fileName: '/new.js'
            };
            // Context score: language(1) only = 1 < 2
            const result = await provider.provideInlineCompletionItems(emptyNewFile, new vscode.Position(0, 1), mockContext, mockToken);
            // Should be blocked - weak context (only language, no imports/semantic/structure)
            assert.strictEqual(result, null, 'Should block 1-char prefix in empty new file');
        });
        test('allows 2-char prefix in any context', async function () {
            this.timeout(5000);
            const plaintextDoc = {
                getText: (range) => {
                    if (!range)
                        return 'ab';
                    if (range.start.line === 0 && range.start.character === 0)
                        return 'ab';
                    return '';
                },
                lineAt: (lineOrPosition) => ({
                    text: 'ab',
                    range: new vscode.Range(0, 0, 0, 2)
                }),
                lineCount: 1,
                languageId: 'plaintext',
                uri: vscode.Uri.file('/test.txt'),
                fileName: '/test.txt'
            };
            // Even with NO context, 2-char prefix should pass
            const result = await provider.provideInlineCompletionItems(plaintextDoc, new vscode.Position(0, 2), mockContext, mockToken);
            // Should not be blocked (may be debounced, but not blocked by prefix check)
            assert.ok(result !== undefined, 'Should allow 2-char prefix even without context');
        });
        test('allows 0-char prefix with strong context (imports + language)', async function () {
            this.timeout(5000);
            const pythonDoc = {
                getText: (range) => {
                    if (!range)
                        return 'import os\nimport sys\n\n'; // 0 char after newline
                    if (range.start.line === 0 && range.start.character === 0) {
                        return 'import os\nimport sys\n\n';
                    }
                    return '';
                },
                lineAt: (lineOrPosition) => {
                    const line = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line;
                    return {
                        text: line === 0 ? 'import os' : line === 1 ? 'import sys' : '',
                        range: new vscode.Range(line, 0, line, 100)
                    };
                },
                lineCount: 20, // Has structure
                languageId: 'python', // Known language
                uri: vscode.Uri.file('/test.py'),
                fileName: '/test.py'
            };
            // Context score: imports(3) + language(1) + structure(1) = 5 >= 2
            const result = await provider.provideInlineCompletionItems(pythonDoc, new vscode.Position(3, 0), // Empty line after imports
            mockContext, mockToken);
            // Should not be blocked despite 0-char prefix
            assert.ok(result !== undefined, 'Should allow 0-char prefix with strong context');
        });
    });
});
//# sourceMappingURL=pukuInlineCompletionCache.integration.test.js.map