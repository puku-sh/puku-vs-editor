/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import { afterEach, beforeEach, expect, suite, test } from 'vitest';
import { PukuEmbeddingsCache } from '../pukuEmbeddingsCache';

suite('PukuEmbeddingsCache', () => {
	let cache: PukuEmbeddingsCache;

	beforeEach(async () => {
		// Use in-memory database for tests (undefined storageUri)
		cache = new PukuEmbeddingsCache(undefined);
		await cache.initialize();
	});

	afterEach(() => {
		cache.dispose();
	});

	suite('initialize', () => {
		test('should initialize without errors', async () => {
			const newCache = new PukuEmbeddingsCache(undefined);
			await newCache.initialize();
			const stats = newCache.getStats();
			expect(stats.fileCount).toBe(0);
			expect(stats.chunkCount).toBe(0);
			newCache.dispose();
		});

		test('should be idempotent', async () => {
			await cache.initialize();
			await cache.initialize();
			const stats = cache.getStats();
			expect(stats.fileCount).toBe(0);
		});
	});

	suite('storeFile and isIndexed', () => {
		test('should store and retrieve file index status', () => {
			const uri = 'file:///test/file.ts';
			const contentHash = 'hash123';
			const chunks = [
				{
					text: 'function foo() {}',
					lineStart: 1,
					lineEnd: 1,
					embedding: [0.1, 0.2, 0.3],
					chunkType: 'function',
					symbolName: 'foo'
				}
			];

			cache.storeFile(uri, contentHash, chunks);

			expect(cache.isIndexed(uri, contentHash)).toBe(true);
			expect(cache.isIndexed(uri, 'differentHash')).toBe(false);
			expect(cache.isIndexed('file:///other.ts', contentHash)).toBe(false);
		});

		test('should update file on re-index', () => {
			const uri = 'file:///test/file.ts';

			// First index
			cache.storeFile(uri, 'hash1', [
				{ text: 'v1', lineStart: 1, lineEnd: 1, embedding: [0.1] }
			]);
			expect(cache.isIndexed(uri, 'hash1')).toBe(true);

			// Re-index with new hash
			cache.storeFile(uri, 'hash2', [
				{ text: 'v2', lineStart: 1, lineEnd: 1, embedding: [0.2] }
			]);
			expect(cache.isIndexed(uri, 'hash1')).toBe(false);
			expect(cache.isIndexed(uri, 'hash2')).toBe(true);
		});
	});

	suite('getChunksForFile', () => {
		test('should return empty array for non-existent file', () => {
			const chunks = cache.getChunksForFile('file:///nonexistent.ts');
			expect(chunks).toEqual([]);
		});

		test('should return chunks for indexed file', () => {
			const uri = 'file:///test/file.ts';
			const contentHash = 'hash123';
			const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];

			cache.storeFile(uri, contentHash, [
				{
					text: 'function foo() { return 1; }',
					lineStart: 1,
					lineEnd: 3,
					embedding,
					chunkType: 'function',
					symbolName: 'foo'
				}
			]);

			const chunks = cache.getChunksForFile(uri);
			expect(chunks.length).toBe(1);
			expect(chunks[0].uri).toBe(uri);
			expect(chunks[0].text).toBe('function foo() { return 1; }');
			expect(chunks[0].lineStart).toBe(1);
			expect(chunks[0].lineEnd).toBe(3);
			// Float32 precision - check approximate equality
			expect(chunks[0].embedding.length).toBe(embedding.length);
			for (let i = 0; i < embedding.length; i++) {
				expect(Math.abs(chunks[0].embedding[i] - embedding[i])).toBeLessThan(0.0001);
			}
			expect(chunks[0].contentHash).toBe(contentHash);
		});

		test('should return multiple chunks', () => {
			const uri = 'file:///test/file.ts';

			cache.storeFile(uri, 'hash', [
				{ text: 'chunk1', lineStart: 1, lineEnd: 10, embedding: [0.1] },
				{ text: 'chunk2', lineStart: 11, lineEnd: 20, embedding: [0.2] },
				{ text: 'chunk3', lineStart: 21, lineEnd: 30, embedding: [0.3] }
			]);

			const chunks = cache.getChunksForFile(uri);
			expect(chunks.length).toBe(3);
		});
	});

	suite('getAllChunks', () => {
		test('should return empty array when no files indexed', () => {
			const chunks = cache.getAllChunks();
			expect(chunks).toEqual([]);
		});

		test('should return all chunks from all files', () => {
			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'a1', lineStart: 1, lineEnd: 5, embedding: [0.1], chunkType: 'function' },
				{ text: 'a2', lineStart: 6, lineEnd: 10, embedding: [0.2], chunkType: 'class' }
			]);

			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'b1', lineStart: 1, lineEnd: 5, embedding: [0.3], chunkType: 'method' }
			]);

			const chunks = cache.getAllChunks();
			expect(chunks.length).toBe(3);

			const uris = new Set(chunks.map(c => c.uri));
			expect(uris.has('file:///a.ts')).toBe(true);
			expect(uris.has('file:///b.ts')).toBe(true);
		});

		test('should include chunk metadata', () => {
			cache.storeFile('file:///test.ts', 'hash', [
				{
					text: 'function myFunc() {}',
					lineStart: 1,
					lineEnd: 5,
					embedding: [0.1, 0.2],
					chunkType: 'function',
					symbolName: 'myFunc'
				}
			]);

			const chunks = cache.getAllChunks();
			expect(chunks.length).toBe(1);
			expect(chunks[0].chunkType).toBe('function');
			expect(chunks[0].symbolName).toBe('myFunc');
		});
	});

	suite('removeFile', () => {
		test('should remove file and its chunks', () => {
			const uri = 'file:///test/file.ts';

			cache.storeFile(uri, 'hash', [
				{ text: 'chunk', lineStart: 1, lineEnd: 5, embedding: [0.1] }
			]);
			expect(cache.isIndexed(uri, 'hash')).toBe(true);
			expect(cache.getChunksForFile(uri).length).toBe(1);

			cache.removeFile(uri);

			expect(cache.isIndexed(uri, 'hash')).toBe(false);
			expect(cache.getChunksForFile(uri).length).toBe(0);
		});

		test('should not affect other files', () => {
			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'a', lineStart: 1, lineEnd: 5, embedding: [0.1] }
			]);
			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'b', lineStart: 1, lineEnd: 5, embedding: [0.2] }
			]);

			cache.removeFile('file:///a.ts');

			expect(cache.isIndexed('file:///a.ts', 'hash1')).toBe(false);
			expect(cache.isIndexed('file:///b.ts', 'hash2')).toBe(true);
		});
	});

	suite('getStats', () => {
		test('should return correct counts', () => {
			let stats = cache.getStats();
			expect(stats.fileCount).toBe(0);
			expect(stats.chunkCount).toBe(0);

			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'a1', lineStart: 1, lineEnd: 5, embedding: [0.1] },
				{ text: 'a2', lineStart: 6, lineEnd: 10, embedding: [0.2] }
			]);

			stats = cache.getStats();
			expect(stats.fileCount).toBe(1);
			expect(stats.chunkCount).toBe(2);

			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'b1', lineStart: 1, lineEnd: 5, embedding: [0.3] }
			]);

			stats = cache.getStats();
			expect(stats.fileCount).toBe(2);
			expect(stats.chunkCount).toBe(3);
		});
	});

	suite('clear', () => {
		test('should remove all data', () => {
			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'a', lineStart: 1, lineEnd: 5, embedding: [0.1] }
			]);
			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'b', lineStart: 1, lineEnd: 5, embedding: [0.2] }
			]);

			let stats = cache.getStats();
			expect(stats.fileCount).toBe(2);

			cache.clear();

			stats = cache.getStats();
			expect(stats.fileCount).toBe(0);
			expect(stats.chunkCount).toBe(0);
		});
	});

	suite('searchKNN', () => {
		test('should return empty array when no chunks indexed', () => {
			const results = cache.searchKNN([0.1, 0.2, 0.3], 5);
			expect(results).toEqual([]);
		});

		test('should find similar chunks', () => {
			// Store chunks with known embeddings
			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'function add() {}', lineStart: 1, lineEnd: 1, embedding: [1, 0, 0], chunkType: 'function', symbolName: 'add' }
			]);
			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'function subtract() {}', lineStart: 1, lineEnd: 1, embedding: [0.9, 0.1, 0], chunkType: 'function', symbolName: 'subtract' }
			]);
			cache.storeFile('file:///c.ts', 'hash3', [
				{ text: 'class Calculator {}', lineStart: 1, lineEnd: 1, embedding: [0, 0, 1], chunkType: 'class', symbolName: 'Calculator' }
			]);

			// Query with embedding similar to first two chunks
			const results = cache.searchKNN([1, 0, 0], 3);

			expect(results.length).toBe(3);
			// First result should be exact match (distance ~0)
			expect(results[0].text).toBe('function add() {}');
			expect(results[0].distance).toBeLessThan(0.01);

			// Second result should be similar
			expect(results[1].text).toBe('function subtract() {}');

			// Third result should be the orthogonal one (most distant)
			expect(results[2].text).toBe('class Calculator {}');
		});

		test('should respect k limit', () => {
			// Store 5 chunks
			for (let i = 0; i < 5; i++) {
				cache.storeFile(`file:///${i}.ts`, `hash${i}`, [
					{ text: `chunk${i}`, lineStart: 1, lineEnd: 1, embedding: [i * 0.1, 0.5, 0.5] }
				]);
			}

			const results = cache.searchKNN([0.5, 0.5, 0.5], 2);
			expect(results.length).toBe(2);
		});

		test('should include distance in results', () => {
			cache.storeFile('file:///a.ts', 'hash', [
				{ text: 'test', lineStart: 1, lineEnd: 1, embedding: [1, 0, 0] }
			]);

			const results = cache.searchKNN([1, 0, 0], 1);
			expect(results.length).toBe(1);
			expect(typeof results[0].distance).toBe('number');
			expect(results[0].distance).toBeGreaterThanOrEqual(0);
		});

		test('should preserve chunk metadata in results', () => {
			cache.storeFile('file:///test.ts', 'hash', [
				{
					text: 'function myFunc() {}',
					lineStart: 10,
					lineEnd: 20,
					embedding: [0.5, 0.5, 0.5],
					chunkType: 'function',
					symbolName: 'myFunc'
				}
			]);

			const results = cache.searchKNN([0.5, 0.5, 0.5], 1);
			expect(results.length).toBe(1);
			expect(results[0].uri).toBe('file:///test.ts');
			expect(results[0].text).toBe('function myFunc() {}');
			expect(results[0].lineStart).toBe(10);
			expect(results[0].lineEnd).toBe(20);
			expect(results[0].chunkType).toBe('function');
			expect(results[0].symbolName).toBe('myFunc');
		});
	});

	suite('vecEnabled', () => {
		test('should report sqlite-vec status', () => {
			// vecEnabled should be true if sqlite-vec loaded successfully
			expect(typeof cache.vecEnabled).toBe('boolean');
		});

		test('should use sqlite-vec for 1024-dim embeddings', () => {
			// Verify sqlite-vec is enabled
			expect(cache.vecEnabled).toBe(true);

			// Create 1024-dim embeddings (the expected production size)
			const embedding1 = Array(1024).fill(0).map((_, i) => i === 0 ? 1.0 : 0.0); // [1, 0, 0, ...]
			const embedding2 = Array(1024).fill(0).map((_, i) => i === 0 ? 0.9 : (i === 1 ? 0.1 : 0.0)); // [0.9, 0.1, 0, ...]
			const embedding3 = Array(1024).fill(0).map((_, i) => i === 1023 ? 1.0 : 0.0); // [0, ..., 1]

			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'match1', lineStart: 1, lineEnd: 1, embedding: embedding1 }
			]);
			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'match2', lineStart: 1, lineEnd: 1, embedding: embedding2 }
			]);
			cache.storeFile('file:///c.ts', 'hash3', [
				{ text: 'distant', lineStart: 1, lineEnd: 1, embedding: embedding3 }
			]);

			// Query with embedding1 - should find itself first
			const results = cache.searchKNN(embedding1, 3);

			expect(results.length).toBe(3);
			// First result should be exact match (distance ~0)
			expect(results[0].text).toBe('match1');
			expect(results[0].distance).toBeLessThan(0.01);
			// Second result should be similar
			expect(results[1].text).toBe('match2');
			// Third result should be the distant one
			expect(results[2].text).toBe('distant');
		});

		test('should handle multiple chunks per file with 1024-dim', () => {
			expect(cache.vecEnabled).toBe(true);

			// File with multiple chunks
			const embedding1 = Array(1024).fill(0).map((_, i) => Math.sin(i / 100));
			const embedding2 = Array(1024).fill(0).map((_, i) => Math.cos(i / 100));
			const embedding3 = Array(1024).fill(0).map((_, i) => Math.sin(i / 50));

			cache.storeFile('file:///multi.ts', 'hash1', [
				{ text: 'function foo() {}', lineStart: 1, lineEnd: 5, embedding: embedding1, chunkType: 'function', symbolName: 'foo' },
				{ text: 'function bar() {}', lineStart: 10, lineEnd: 15, embedding: embedding2, chunkType: 'function', symbolName: 'bar' },
				{ text: 'class Baz {}', lineStart: 20, lineEnd: 30, embedding: embedding3, chunkType: 'class', symbolName: 'Baz' }
			]);

			const stats = cache.getStats();
			expect(stats.fileCount).toBe(1);
			expect(stats.chunkCount).toBe(3);

			// Search should find all 3 chunks
			const results = cache.searchKNN(embedding1, 10);
			expect(results.length).toBe(3);
			expect(results[0].text).toBe('function foo() {}');
			expect(results[0].symbolName).toBe('foo');
		});

		test('should correctly remove file and its vec_chunks mappings', () => {
			expect(cache.vecEnabled).toBe(true);

			const embedding1 = Array(1024).fill(0).map((_, i) => i * 0.001);
			const embedding2 = Array(1024).fill(0).map((_, i) => i * 0.002);

			cache.storeFile('file:///keep.ts', 'hash1', [
				{ text: 'keep this', lineStart: 1, lineEnd: 1, embedding: embedding1 }
			]);
			cache.storeFile('file:///remove.ts', 'hash2', [
				{ text: 'remove this', lineStart: 1, lineEnd: 1, embedding: embedding2 }
			]);

			expect(cache.getStats().fileCount).toBe(2);

			// Remove one file
			cache.removeFile('file:///remove.ts');

			expect(cache.getStats().fileCount).toBe(1);
			expect(cache.getStats().chunkCount).toBe(1);

			// Search should only find the kept file
			const results = cache.searchKNN(embedding1, 10);
			expect(results.length).toBe(1);
			expect(results[0].text).toBe('keep this');
		});

		test('should handle re-indexing file with different chunks', () => {
			expect(cache.vecEnabled).toBe(true);

			const embedding1 = Array(1024).fill(0).map((_, i) => i * 0.001);
			const embedding2 = Array(1024).fill(0).map((_, i) => i * 0.002);

			// First index
			cache.storeFile('file:///reindex.ts', 'hash1', [
				{ text: 'old chunk 1', lineStart: 1, lineEnd: 5, embedding: embedding1 },
				{ text: 'old chunk 2', lineStart: 10, lineEnd: 15, embedding: embedding2 }
			]);

			expect(cache.getStats().chunkCount).toBe(2);

			// Re-index with different content
			const embedding3 = Array(1024).fill(0).map((_, i) => i * 0.003);
			cache.storeFile('file:///reindex.ts', 'hash2', [
				{ text: 'new chunk', lineStart: 1, lineEnd: 10, embedding: embedding3 }
			]);

			expect(cache.getStats().fileCount).toBe(1);
			expect(cache.getStats().chunkCount).toBe(1);

			// Search should only find new chunk
			const results = cache.searchKNN(embedding3, 10);
			expect(results.length).toBe(1);
			expect(results[0].text).toBe('new chunk');
		});

		test('should clear all vec_chunks and mappings', () => {
			expect(cache.vecEnabled).toBe(true);

			const embedding = Array(1024).fill(0).map((_, i) => Math.random());

			cache.storeFile('file:///a.ts', 'hash1', [
				{ text: 'chunk a', lineStart: 1, lineEnd: 1, embedding }
			]);
			cache.storeFile('file:///b.ts', 'hash2', [
				{ text: 'chunk b', lineStart: 1, lineEnd: 1, embedding }
			]);

			expect(cache.getStats().fileCount).toBe(2);

			cache.clear();

			expect(cache.getStats().fileCount).toBe(0);
			expect(cache.getStats().chunkCount).toBe(0);

			// Search should return empty
			const results = cache.searchKNN(embedding, 10);
			expect(results.length).toBe(0);
		});

		test('should handle large number of chunks', () => {
			expect(cache.vecEnabled).toBe(true);

			// Store 100 files with 1024-dim embeddings
			for (let i = 0; i < 100; i++) {
				const embedding = Array(1024).fill(0).map((_, j) => Math.sin((i + j) / 100));
				cache.storeFile(`file:///${i}.ts`, `hash${i}`, [
					{ text: `chunk ${i}`, lineStart: 1, lineEnd: 1, embedding }
				]);
			}

			expect(cache.getStats().fileCount).toBe(100);
			expect(cache.getStats().chunkCount).toBe(100);

			// KNN search should work
			const queryEmbedding = Array(1024).fill(0).map((_, j) => Math.sin((50 + j) / 100));
			const results = cache.searchKNN(queryEmbedding, 5);

			expect(results.length).toBe(5);
			// First result should be close to chunk 50
			expect(results[0].distance).toBeLessThan(0.1);
		});
	});

	suite('embedding serialization', () => {
		test('should preserve embedding precision', () => {
			const originalEmbedding = [
				0.123456789,
				-0.987654321,
				1.5,
				-2.5,
				0.00001,
				99999.99999
			];

			cache.storeFile('file:///test.ts', 'hash', [
				{ text: 'test', lineStart: 1, lineEnd: 1, embedding: originalEmbedding }
			]);

			const chunks = cache.getChunksForFile('file:///test.ts');
			expect(chunks.length).toBe(1);

			// Float32 precision - check approximate equality
			for (let i = 0; i < originalEmbedding.length; i++) {
				const expected = originalEmbedding[i];
				const actual = chunks[0].embedding[i];
				const diff = Math.abs(expected - actual);
				expect(diff < 0.0001 || diff / Math.abs(expected) < 0.0001).toBe(true);
			}
		});

		test('should handle large embeddings', () => {
			// 1024-dimensional embedding (typical size)
			const largeEmbedding = Array(1024).fill(0).map((_, i) => Math.sin(i / 100));

			cache.storeFile('file:///test.ts', 'hash', [
				{ text: 'test', lineStart: 1, lineEnd: 1, embedding: largeEmbedding }
			]);

			const chunks = cache.getChunksForFile('file:///test.ts');
			expect(chunks[0].embedding.length).toBe(1024);
		});
	});
});
