/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { expect, suite, test } from 'vitest';
import { cosineSimilarity } from '../pukuIndexingService';

suite('PukuIndexingService', () => {
	suite('cosineSimilarity', () => {
		test('should return 1 for identical vectors', () => {
			const a = [1, 0, 0];
			const b = [1, 0, 0];
			const similarity = cosineSimilarity(a, b);
			expect(Math.abs(similarity - 1)).toBeLessThan(0.0001);
		});

		test('should return 0 for orthogonal vectors', () => {
			const a = [1, 0, 0];
			const b = [0, 1, 0];
			const similarity = cosineSimilarity(a, b);
			expect(Math.abs(similarity)).toBeLessThan(0.0001);
		});

		test('should return -1 for opposite vectors', () => {
			const a = [1, 0, 0];
			const b = [-1, 0, 0];
			const similarity = cosineSimilarity(a, b);
			expect(Math.abs(similarity + 1)).toBeLessThan(0.0001);
		});

		test('should handle normalized vectors', () => {
			// Two normalized vectors at 45 degrees
			const a = [1, 0];
			const b = [Math.SQRT1_2, Math.SQRT1_2];
			const similarity = cosineSimilarity(a, b);
			expect(Math.abs(similarity - Math.SQRT1_2)).toBeLessThan(0.0001);
		});

		test('should handle larger vectors', () => {
			const a = [0.1, 0.2, 0.3, 0.4, 0.5];
			const b = [0.1, 0.2, 0.3, 0.4, 0.5];
			const similarity = cosineSimilarity(a, b);
			expect(Math.abs(similarity - 1)).toBeLessThan(0.0001);
		});

		test('should return 0 for zero vectors', () => {
			const a = [0, 0, 0];
			const b = [1, 2, 3];
			const similarity = cosineSimilarity(a, b);
			expect(similarity).toBe(0);
		});

		test('should be symmetric', () => {
			const a = [1, 2, 3];
			const b = [4, 5, 6];
			const sim1 = cosineSimilarity(a, b);
			const sim2 = cosineSimilarity(b, a);
			expect(Math.abs(sim1 - sim2)).toBeLessThan(0.0001);
		});

		test('should handle real embedding-like vectors', () => {
			// Simulate 1024-dim embeddings
			const dim = 1024;
			const a = Array(dim).fill(0).map((_, i) => Math.sin(i / 100));
			const b = Array(dim).fill(0).map((_, i) => Math.sin(i / 100 + 0.1)); // Slightly different

			const similarity = cosineSimilarity(a, b);
			expect(similarity).toBeGreaterThan(0.9);
			expect(similarity).toBeLessThan(1);
		});

		test('should handle dissimilar vectors', () => {
			const dim = 100;
			const a = Array(dim).fill(0).map((_, i) => Math.sin(i));
			const b = Array(dim).fill(0).map((_, i) => Math.cos(i * 10)); // Very different

			const similarity = cosineSimilarity(a, b);
			expect(similarity).toBeLessThan(0.5);
		});
	});

	suite('search ranking', () => {
		test('should rank by similarity score', () => {
			// Simulating search results
			const results = [
				{ similarity: 0.95, text: 'highly relevant' },
				{ similarity: 0.7, text: 'somewhat relevant' },
				{ similarity: 0.3, text: 'barely relevant' },
			];

			const sorted = results.sort((a, b) => b.similarity - a.similarity);
			expect(sorted[0].text).toBe('highly relevant');
			expect(sorted[1].text).toBe('somewhat relevant');
			expect(sorted[2].text).toBe('barely relevant');
		});

		test('should filter by minimum threshold', () => {
			const results = [
				{ similarity: 0.95, text: 'a' },
				{ similarity: 0.7, text: 'b' },
				{ similarity: 0.3, text: 'c' },
				{ similarity: 0.1, text: 'd' },
			];

			const threshold = 0.5;
			const filtered = results.filter(r => r.similarity >= threshold);
			expect(filtered.length).toBe(2);
		});
	});
});

// Helper tests for file pattern matching
suite('File Pattern Matching', () => {
	const excludePatterns = [
		'**/node_modules/**',
		'**/.git/**',
		'**/dist/**',
		'**/build/**',
		'**/*.min.js',
		'**/package-lock.json',
		'**/yarn.lock',
	];

	function shouldExclude(path: string): boolean {
		// Simple pattern matching for test purposes
		for (const pattern of excludePatterns) {
			if (pattern.includes('node_modules') && path.includes('node_modules')) return true;
			if (pattern.includes('.git') && path.includes('.git')) return true;
			if (pattern.includes('dist') && path.includes('/dist/')) return true;
			if (pattern.includes('build') && path.includes('/build/')) return true;
			if (pattern.includes('.min.js') && path.endsWith('.min.js')) return true;
			if (pattern.includes('package-lock.json') && path.endsWith('package-lock.json')) return true;
			if (pattern.includes('yarn.lock') && path.endsWith('yarn.lock')) return true;
		}
		return false;
	}

	test('should exclude node_modules', () => {
		expect(shouldExclude('/project/node_modules/lodash/index.js')).toBe(true);
	});

	test('should exclude .git', () => {
		expect(shouldExclude('/project/.git/objects/abc')).toBe(true);
	});

	test('should exclude dist folder', () => {
		expect(shouldExclude('/project/dist/bundle.js')).toBe(true);
	});

	test('should exclude minified files', () => {
		expect(shouldExclude('/project/lib/jquery.min.js')).toBe(true);
	});

	test('should exclude lock files', () => {
		expect(shouldExclude('/project/package-lock.json')).toBe(true);
		expect(shouldExclude('/project/yarn.lock')).toBe(true);
	});

	test('should include regular source files', () => {
		expect(shouldExclude('/project/src/index.ts')).toBe(false);
		expect(shouldExclude('/project/lib/utils.js')).toBe(false);
	});
});

// Test supported file extensions
suite('Supported File Extensions', () => {
	const supportedExtensions = [
		'.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs',
		'.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.rb'
	];

	function isSupported(filename: string): boolean {
		const ext = '.' + filename.split('.').pop();
		return supportedExtensions.includes(ext);
	}

	test('should support TypeScript files', () => {
		expect(isSupported('index.ts')).toBe(true);
		expect(isSupported('component.tsx')).toBe(true);
	});

	test('should support JavaScript files', () => {
		expect(isSupported('index.js')).toBe(true);
		expect(isSupported('component.jsx')).toBe(true);
	});

	test('should support Python files', () => {
		expect(isSupported('main.py')).toBe(true);
	});

	test('should support Go files', () => {
		expect(isSupported('main.go')).toBe(true);
	});

	test('should support Rust files', () => {
		expect(isSupported('lib.rs')).toBe(true);
	});

	test('should not support unsupported extensions', () => {
		expect(isSupported('readme.md')).toBe(false);
		expect(isSupported('config.json')).toBe(false);
		expect(isSupported('styles.css')).toBe(false);
	});
});
