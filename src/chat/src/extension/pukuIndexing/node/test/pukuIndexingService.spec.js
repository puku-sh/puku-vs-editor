"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pukuIndexingService_1 = require("../pukuIndexingService");
(0, vitest_1.suite)('PukuIndexingService', () => {
    (0, vitest_1.suite)('cosineSimilarity', () => {
        (0, vitest_1.test)('should return 1 for identical vectors', () => {
            const a = [1, 0, 0];
            const b = [1, 0, 0];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(Math.abs(similarity - 1)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should return 0 for orthogonal vectors', () => {
            const a = [1, 0, 0];
            const b = [0, 1, 0];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(Math.abs(similarity)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should return -1 for opposite vectors', () => {
            const a = [1, 0, 0];
            const b = [-1, 0, 0];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(Math.abs(similarity + 1)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should handle normalized vectors', () => {
            // Two normalized vectors at 45 degrees
            const a = [1, 0];
            const b = [Math.SQRT1_2, Math.SQRT1_2];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(Math.abs(similarity - Math.SQRT1_2)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should handle larger vectors', () => {
            const a = [0.1, 0.2, 0.3, 0.4, 0.5];
            const b = [0.1, 0.2, 0.3, 0.4, 0.5];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(Math.abs(similarity - 1)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should return 0 for zero vectors', () => {
            const a = [0, 0, 0];
            const b = [1, 2, 3];
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(similarity).toBe(0);
        });
        (0, vitest_1.test)('should be symmetric', () => {
            const a = [1, 2, 3];
            const b = [4, 5, 6];
            const sim1 = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            const sim2 = (0, pukuIndexingService_1.cosineSimilarity)(b, a);
            (0, vitest_1.expect)(Math.abs(sim1 - sim2)).toBeLessThan(0.0001);
        });
        (0, vitest_1.test)('should handle real embedding-like vectors', () => {
            // Simulate 1024-dim embeddings
            const dim = 1024;
            const a = Array(dim).fill(0).map((_, i) => Math.sin(i / 100));
            const b = Array(dim).fill(0).map((_, i) => Math.sin(i / 100 + 0.1)); // Slightly different
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(similarity).toBeGreaterThan(0.9);
            (0, vitest_1.expect)(similarity).toBeLessThan(1);
        });
        (0, vitest_1.test)('should handle dissimilar vectors', () => {
            const dim = 100;
            const a = Array(dim).fill(0).map((_, i) => Math.sin(i));
            const b = Array(dim).fill(0).map((_, i) => Math.cos(i * 10)); // Very different
            const similarity = (0, pukuIndexingService_1.cosineSimilarity)(a, b);
            (0, vitest_1.expect)(similarity).toBeLessThan(0.5);
        });
    });
    (0, vitest_1.suite)('search ranking', () => {
        (0, vitest_1.test)('should rank by similarity score', () => {
            // Simulating search results
            const results = [
                { similarity: 0.95, text: 'highly relevant' },
                { similarity: 0.7, text: 'somewhat relevant' },
                { similarity: 0.3, text: 'barely relevant' },
            ];
            const sorted = results.sort((a, b) => b.similarity - a.similarity);
            (0, vitest_1.expect)(sorted[0].text).toBe('highly relevant');
            (0, vitest_1.expect)(sorted[1].text).toBe('somewhat relevant');
            (0, vitest_1.expect)(sorted[2].text).toBe('barely relevant');
        });
        (0, vitest_1.test)('should filter by minimum threshold', () => {
            const results = [
                { similarity: 0.95, text: 'a' },
                { similarity: 0.7, text: 'b' },
                { similarity: 0.3, text: 'c' },
                { similarity: 0.1, text: 'd' },
            ];
            const threshold = 0.5;
            const filtered = results.filter(r => r.similarity >= threshold);
            (0, vitest_1.expect)(filtered.length).toBe(2);
        });
    });
});
// Helper tests for file pattern matching
(0, vitest_1.suite)('File Pattern Matching', () => {
    const excludePatterns = [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/*.min.js',
        '**/package-lock.json',
        '**/yarn.lock',
    ];
    function shouldExclude(path) {
        // Simple pattern matching for test purposes
        for (const pattern of excludePatterns) {
            if (pattern.includes('node_modules') && path.includes('node_modules'))
                return true;
            if (pattern.includes('.git') && path.includes('.git'))
                return true;
            if (pattern.includes('dist') && path.includes('/dist/'))
                return true;
            if (pattern.includes('build') && path.includes('/build/'))
                return true;
            if (pattern.includes('.min.js') && path.endsWith('.min.js'))
                return true;
            if (pattern.includes('package-lock.json') && path.endsWith('package-lock.json'))
                return true;
            if (pattern.includes('yarn.lock') && path.endsWith('yarn.lock'))
                return true;
        }
        return false;
    }
    (0, vitest_1.test)('should exclude node_modules', () => {
        (0, vitest_1.expect)(shouldExclude('/project/node_modules/lodash/index.js')).toBe(true);
    });
    (0, vitest_1.test)('should exclude .git', () => {
        (0, vitest_1.expect)(shouldExclude('/project/.git/objects/abc')).toBe(true);
    });
    (0, vitest_1.test)('should exclude dist folder', () => {
        (0, vitest_1.expect)(shouldExclude('/project/dist/bundle.js')).toBe(true);
    });
    (0, vitest_1.test)('should exclude minified files', () => {
        (0, vitest_1.expect)(shouldExclude('/project/lib/jquery.min.js')).toBe(true);
    });
    (0, vitest_1.test)('should exclude lock files', () => {
        (0, vitest_1.expect)(shouldExclude('/project/package-lock.json')).toBe(true);
        (0, vitest_1.expect)(shouldExclude('/project/yarn.lock')).toBe(true);
    });
    (0, vitest_1.test)('should include regular source files', () => {
        (0, vitest_1.expect)(shouldExclude('/project/src/index.ts')).toBe(false);
        (0, vitest_1.expect)(shouldExclude('/project/lib/utils.js')).toBe(false);
    });
});
// Test supported file extensions
(0, vitest_1.suite)('Supported File Extensions', () => {
    const supportedExtensions = [
        '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs',
        '.java', '.cpp', '.c', '.h', '.hpp', '.cs', '.rb'
    ];
    function isSupported(filename) {
        const ext = '.' + filename.split('.').pop();
        return supportedExtensions.includes(ext);
    }
    (0, vitest_1.test)('should support TypeScript files', () => {
        (0, vitest_1.expect)(isSupported('index.ts')).toBe(true);
        (0, vitest_1.expect)(isSupported('component.tsx')).toBe(true);
    });
    (0, vitest_1.test)('should support JavaScript files', () => {
        (0, vitest_1.expect)(isSupported('index.js')).toBe(true);
        (0, vitest_1.expect)(isSupported('component.jsx')).toBe(true);
    });
    (0, vitest_1.test)('should support Python files', () => {
        (0, vitest_1.expect)(isSupported('main.py')).toBe(true);
    });
    (0, vitest_1.test)('should support Go files', () => {
        (0, vitest_1.expect)(isSupported('main.go')).toBe(true);
    });
    (0, vitest_1.test)('should support Rust files', () => {
        (0, vitest_1.expect)(isSupported('lib.rs')).toBe(true);
    });
    (0, vitest_1.test)('should not support unsupported extensions', () => {
        (0, vitest_1.expect)(isSupported('readme.md')).toBe(false);
        (0, vitest_1.expect)(isSupported('config.json')).toBe(false);
        (0, vitest_1.expect)(isSupported('styles.css')).toBe(false);
    });
});
//# sourceMappingURL=pukuIndexingService.spec.js.map