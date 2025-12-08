"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Integration test for import-based context in inline completions
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
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const pukuImportExtractor_1 = require("../../../pukuIndexing/node/pukuImportExtractor");
(0, vitest_1.suite)('Import Context Integration Tests', () => {
    let testWorkspaceFolder;
    (0, vitest_1.beforeAll)(async () => {
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder found, skipping integration tests');
        }
        testWorkspaceFolder = workspaceFolders[0].uri.fsPath;
    }, 30000); // 30s timeout
    (0, vitest_1.afterEach)(() => {
        pukuImportExtractor_1.pukuImportExtractor.clearCache();
    });
    (0, vitest_1.suite)('End-to-end import extraction', () => {
        (0, vitest_1.test)('extracts imports from TypeScript file in workspace', async () => {
            // Create test file
            const testFileContent = `
import { Component } from 'react';
import utils from './utils';
import { helper } from '../lib/helper';
import config from '/config';

export class MyComponent extends Component {
	render() {
		return utils.format(config.title);
	}
}
`;
            const testUri = vscode.Uri.file(path.join(testWorkspaceFolder, 'test.ts'));
            // Test import extraction
            const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImports(testFileContent, 'typescript');
            // Verify local imports extracted, external packages filtered
            assert.ok(imports.includes('./utils'), 'Should extract ./utils');
            assert.ok(imports.includes('../lib/helper'), 'Should extract ../lib/helper');
            assert.ok(imports.includes('/config'), 'Should extract /config');
            assert.ok(!imports.includes('react'), 'Should filter react');
        });
        (0, vitest_1.test)('caching works across multiple extractions', async () => {
            const code = `import { foo } from './foo'; import { bar } from './bar';`;
            const uri = vscode.Uri.file(path.join(testWorkspaceFolder, 'cache-test.ts'));
            // First extraction
            const start1 = Date.now();
            const imports1 = await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri.toString());
            const time1 = Date.now() - start1;
            // Second extraction (should be cached)
            const start2 = Date.now();
            const imports2 = await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri.toString());
            const time2 = Date.now() - start2;
            // Verify results are same
            assert.deepStrictEqual(imports1, imports2);
            // Cached version should be faster (though not guaranteed)
            console.log(`First extraction: ${time1}ms, Cached: ${time2}ms`);
        });
    });
    (0, vitest_1.suite)('Multi-language support', () => {
        const languageTests = [
            {
                language: 'typescript',
                code: `import utils from './utils';\nimport helper from '../helper';`,
                expected: ['./utils', '../helper']
            },
            {
                language: 'python',
                code: `from .models import User\nfrom ..utils import helper`,
                expected: [] // Python imports are converted to paths
            },
            {
                language: 'go',
                code: `import "./utils"\nimport "../models"`,
                expected: ['./utils', '../models']
            },
            {
                language: 'rust',
                code: `use crate::utils::helpers;\nuse super::models;`,
                expected: [] // Rust imports are converted
            }
        ];
        languageTests.forEach(({ language, code, expected }) => {
            (0, vitest_1.test)(`extracts imports for ${language}`, async () => {
                const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImports(code, language);
                if (expected.length > 0) {
                    expected.forEach(exp => {
                        assert.ok(imports.includes(exp), `Expected to find import '${exp}' in ${JSON.stringify(imports)}`);
                    });
                }
                else {
                    // Just verify no errors
                    assert.ok(Array.isArray(imports));
                }
            });
        });
    });
    (0, vitest_1.suite)('Performance', () => {
        (0, vitest_1.test)('handles large files efficiently', async () => {
            // Generate large file with many imports
            const imports = Array.from({ length: 100 }, (_, i) => `import mod${i} from './module${i}';`);
            const largeCode = imports.join('\n') + '\n\n' + 'const code = "...";'.repeat(1000);
            const start = Date.now();
            const extracted = await pukuImportExtractor_1.pukuImportExtractor.extractImports(largeCode, 'typescript');
            const time = Date.now() - start;
            assert.strictEqual(extracted.length, 100, 'Should extract all 100 imports');
            assert.ok(time < 1000, `Extraction should be fast (<1s), took ${time}ms`);
        });
        (0, vitest_1.test)('cache hit is faster than cache miss', async () => {
            const code = `import { foo } from './foo';`.repeat(50);
            const uri = 'file:///perf-test.ts';
            // Warm up
            await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);
            // Measure cache miss (clear cache first)
            pukuImportExtractor_1.pukuImportExtractor.clearCache();
            const start1 = Date.now();
            await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);
            const missTime = Date.now() - start1;
            // Measure cache hit
            const start2 = Date.now();
            await pukuImportExtractor_1.pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);
            const hitTime = Date.now() - start2;
            console.log(`Cache miss: ${missTime}ms, Cache hit: ${hitTime}ms`);
            assert.ok(hitTime <= missTime, 'Cache hit should be faster or equal');
        });
    });
    (0, vitest_1.suite)('Error handling', () => {
        (0, vitest_1.test)('handles syntax errors gracefully', async () => {
            const invalidCode = `import { broken syntax {{{{ `;
            const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImports(invalidCode, 'typescript');
            // Should not throw, returns empty or partial results
            assert.ok(Array.isArray(imports));
        });
        (0, vitest_1.test)('handles unsupported language', async () => {
            const code = `some code`;
            const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImports(code, 'unsupported-lang');
            assert.strictEqual(imports.length, 0);
        });
        (0, vitest_1.test)('handles empty file', async () => {
            const imports = await pukuImportExtractor_1.pukuImportExtractor.extractImports('', 'typescript');
            assert.strictEqual(imports.length, 0);
        });
    });
});
//# sourceMappingURL=pukuImportContext.integration.spec.js.map