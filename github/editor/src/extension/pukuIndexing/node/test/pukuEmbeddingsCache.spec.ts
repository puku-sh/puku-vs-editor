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
