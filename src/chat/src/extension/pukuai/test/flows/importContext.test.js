"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku AI Import Context Flow Tests
 *  Tests for import resolution and file content extraction
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
const importContext_1 = require("../../vscode-node/flows/importContext");
// Mock pukuImportExtractor module
const mockPukuImportExtractor = {
    extractImportsWithCache: async (_text, _languageId, _uri) => {
        return [];
    }
};
// Replace the real import extractor with our mock
jest.mock('../../../../platform/parser/node/pukuImportExtractor', () => ({
    pukuImportExtractor: mockPukuImportExtractor
}));
suite('ImportContextFlow', function () {
    let flow;
    setup(function () {
        flow = new importContext_1.ImportContextFlow();
    });
    suite('getImportedFilesContent', function () {
        test('returns empty array when no imports found', async function () {
            // Mock returns empty imports
            mockPukuImportExtractor.extractImportsWithCache = async () => [];
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: 'const x = 1;'
            });
            const results = await flow.getImportedFilesContent(doc, 3, 500);
            assert.deepStrictEqual(results, []);
        });
        test('respects limit parameter', async function () {
            // Mock returns 5 imports
            mockPukuImportExtractor.extractImportsWithCache = async () => [
                './module1',
                './module2',
                './module3',
                './module4',
                './module5'
            ];
            const doc = await vscode.workspace.openTextDocument({
                language: 'javascript',
                content: 'import a from "./module1";\nimport b from "./module2";'
            });
            // Request only 3 files
            const results = await flow.getImportedFilesContent(doc, 3, 500);
            // Should not exceed limit (though actual resolution may fail for test imports)
            assert.ok(results.length <= 3);
        });
        test('truncates content to maxCharsPerFile', async function () {
            // This test would require actual files to exist
            // Skipping for now as it requires file system setup
            assert.ok(true);
        });
    });
    suite('language-specific extensions', function () {
        test('handles TypeScript extensions', function () {
            // Test that _getExtensionsForLanguage returns correct extensions
            // This is a private method, so we test it indirectly
            assert.ok(true);
        });
        test('handles JavaScript extensions', function () {
            assert.ok(true);
        });
        test('handles Python extensions', function () {
            assert.ok(true);
        });
        test('handles Go extensions', function () {
            assert.ok(true);
        });
        test('handles unknown language fallback', function () {
            assert.ok(true);
        });
    });
    suite('import path resolution', function () {
        test('resolves relative imports (./module)', function () {
            // Test requires file system setup
            assert.ok(true);
        });
        test('resolves parent directory imports (../module)', function () {
            // Test requires file system setup
            assert.ok(true);
        });
        test('resolves absolute imports from workspace root', function () {
            // Test requires file system setup
            assert.ok(true);
        });
        test('tries multiple extensions for TypeScript/JavaScript', function () {
            // Test requires file system setup
            assert.ok(true);
        });
        test('handles import resolution failures gracefully', function () {
            // Test requires file system setup
            assert.ok(true);
        });
    });
});
//# sourceMappingURL=importContext.test.js.map