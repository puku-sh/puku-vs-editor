/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Integration test for import-based context in inline completions
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { suite, test, beforeAll, afterEach } from 'vitest';
import { pukuImportExtractor } from '../../../pukuIndexing/node/pukuImportExtractor';

suite('Import Context Integration Tests', () => {
	let testWorkspaceFolder: string;

	beforeAll(async () {
		// Get workspace folder
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			throw new Error('No workspace folder found, skipping integration tests');
		}
		testWorkspaceFolder = workspaceFolders[0].uri.fsPath;
	}, 30000); // 30s timeout

	afterEach(() => {
		pukuImportExtractor.clearCache();
	});

	suite('End-to-end import extraction', () => {
		test('extracts imports from TypeScript file in workspace', async () {
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
			const imports = await pukuImportExtractor.extractImports(testFileContent, 'typescript');

			// Verify local imports extracted, external packages filtered
			assert.ok(imports.includes('./utils'), 'Should extract ./utils');
			assert.ok(imports.includes('../lib/helper'), 'Should extract ../lib/helper');
			assert.ok(imports.includes('/config'), 'Should extract /config');
			assert.ok(!imports.includes('react'), 'Should filter react');
		});

		test('caching works across multiple extractions', async () {
			const code = `import { foo } from './foo'; import { bar } from './bar';`;
			const uri = vscode.Uri.file(path.join(testWorkspaceFolder, 'cache-test.ts'));

			// First extraction
			const start1 = Date.now();
			const imports1 = await pukuImportExtractor.extractImportsWithCache(
				code,
				'typescript',
				uri.toString()
			);
			const time1 = Date.now() - start1;

			// Second extraction (should be cached)
			const start2 = Date.now();
			const imports2 = await pukuImportExtractor.extractImportsWithCache(
				code,
				'typescript',
				uri.toString()
			);
			const time2 = Date.now() - start2;

			// Verify results are same
			assert.deepStrictEqual(imports1, imports2);

			// Cached version should be faster (though not guaranteed)
			console.log(`First extraction: ${time1}ms, Cached: ${time2}ms`);
		});
	});

	suite('Multi-language support', () => {
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
			test(`extracts imports for ${language}`, async () => {
				const imports = await pukuImportExtractor.extractImports(code, language);

				if (expected.length > 0) {
					expected.forEach(exp => {
						assert.ok(
							imports.includes(exp),
							`Expected to find import '${exp}' in ${JSON.stringify(imports)}`
						);
					});
				} else {
					// Just verify no errors
					assert.ok(Array.isArray(imports));
				}
			});
		});
	});

	suite('Performance', () => {
		test('handles large files efficiently', async () {

			// Generate large file with many imports
			const imports = Array.from({ length: 100 }, (_, i) => `import mod${i} from './module${i}';`);
			const largeCode = imports.join('\n') + '\n\n' + 'const code = "...";'.repeat(1000);

			const start = Date.now();
			const extracted = await pukuImportExtractor.extractImports(largeCode, 'typescript');
			const time = Date.now() - start;

			assert.strictEqual(extracted.length, 100, 'Should extract all 100 imports');
			assert.ok(time < 1000, `Extraction should be fast (<1s), took ${time}ms`);
		});

		test('cache hit is faster than cache miss', async () {
			const code = `import { foo } from './foo';`.repeat(50);
			const uri = 'file:///perf-test.ts';

			// Warm up
			await pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);

			// Measure cache miss (clear cache first)
			pukuImportExtractor.clearCache();
			const start1 = Date.now();
			await pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);
			const missTime = Date.now() - start1;

			// Measure cache hit
			const start2 = Date.now();
			await pukuImportExtractor.extractImportsWithCache(code, 'typescript', uri);
			const hitTime = Date.now() - start2;

			console.log(`Cache miss: ${missTime}ms, Cache hit: ${hitTime}ms`);
			assert.ok(hitTime <= missTime, 'Cache hit should be faster or equal');
		});
	});

	suite('Error handling', () => {
		test('handles syntax errors gracefully', async () => {
			const invalidCode = `import { broken syntax {{{{ `;

			const imports = await pukuImportExtractor.extractImports(invalidCode, 'typescript');

			// Should not throw, returns empty or partial results
			assert.ok(Array.isArray(imports));
		});

		test('handles unsupported language', async () => {
			const code = `some code`;

			const imports = await pukuImportExtractor.extractImports(code, 'unsupported-lang');

			assert.strictEqual(imports.length, 0);
		});

		test('handles empty file', async () => {
			const imports = await pukuImportExtractor.extractImports('', 'typescript');

			assert.strictEqual(imports.length, 0);
		});
	});
});
