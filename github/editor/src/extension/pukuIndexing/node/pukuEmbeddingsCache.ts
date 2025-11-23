/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import sql from 'node:sqlite';
import path from 'path';
import * as vscode from 'vscode';

import { ChunkType } from './pukuASTChunker';

/**
 * Stored chunk with embedding
 */
export interface PukuChunkWithEmbedding {
	readonly uri: string;
	readonly text: string;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly embedding: number[];
	readonly contentHash: string;
	readonly chunkType?: ChunkType;
	readonly symbolName?: string;
}

/**
 * Puku Embeddings Cache - SQLite-based storage for workspace embeddings
 *
 * Uses the same pattern as Copilot's workspaceChunkAndEmbeddingCache.ts
 */
export class PukuEmbeddingsCache {
	/**
	 * Schema version - bump this when schema changes require a clean rebuild
	 * independent of extension version (e.g., for schema-only changes).
	 * Combined with extension version for full cache key.
	 */
	private static readonly SCHEMA_VERSION = '1';
	private static readonly MODEL_ID = 'puku-embeddings-1024';

	/**
	 * Get the cache version string (extension version + schema version)
	 * Cache is automatically rebuilt when extension is updated OR schema changes
	 */
	private static getCacheVersion(): string {
		// Get extension version from vscode.extensions API
		// Handle test environment where vscode.extensions may not be available
		let extVersion = '0.0.0';
		try {
			const ext = vscode.extensions?.getExtension('puku.puku-editor') ||
				vscode.extensions?.getExtension('github.copilot-chat'); // fallback for dev
			extVersion = ext?.packageJSON?.version || '0.0.0';
		} catch {
			// In test environment, use default version
		}
		return `${extVersion}-s${PukuEmbeddingsCache.SCHEMA_VERSION}`;
	}

	private _db: sql.DatabaseSync | undefined;

	constructor(
		private readonly _storageUri: vscode.Uri | undefined,
	) { }

	/**
	 * Delete the database file completely (for manual cleanup or release)
	 */
	static async deleteDatabase(storageUri: vscode.Uri | undefined): Promise<boolean> {
		if (!storageUri || storageUri.scheme !== 'file') {
			return false;
		}
		const dbPath = vscode.Uri.joinPath(storageUri, 'puku-embeddings.db');
		try {
			await fs.promises.unlink(dbPath.fsPath);
			console.log(`[PukuEmbeddingsCache] Deleted database at ${dbPath.fsPath}`);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Initialize the database
	 */
	async initialize(): Promise<void> {
		if (this._db) {
			return;
		}

		const syncOptions: sql.DatabaseSyncOptions = {
			open: true,
			enableForeignKeyConstraints: true
		};

		// Try to create on-disk database if we have storage
		if (this._storageUri && this._storageUri.scheme === 'file') {
			const dbPath = vscode.Uri.joinPath(this._storageUri, 'puku-embeddings.db');
			try {
				await fs.promises.mkdir(path.dirname(dbPath.fsPath), { recursive: true });
				this._db = new sql.DatabaseSync(dbPath.fsPath, syncOptions);
				console.log(`[PukuEmbeddingsCache] Opened SQLite database at ${dbPath.fsPath}`);
			} catch (e) {
				console.error('[PukuEmbeddingsCache] Failed to open SQLite database on disk:', e);
			}
		}

		// Fallback to in-memory
		if (!this._db) {
			this._db = new sql.DatabaseSync(':memory:', syncOptions);
			console.log('[PukuEmbeddingsCache] Using in-memory database');
		}

		// Optimize for performance
		this._db.exec(`
			PRAGMA journal_mode = OFF;
			PRAGMA synchronous = 0;
			PRAGMA cache_size = 1000000;
			PRAGMA locking_mode = EXCLUSIVE;
			PRAGMA temp_store = MEMORY;
		`);

		// Create schema
		this._db.exec(`
			CREATE TABLE IF NOT EXISTS CacheMeta (
				version TEXT NOT NULL,
				model TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Files (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT NOT NULL UNIQUE,
				contentHash TEXT NOT NULL,
				lastIndexed INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Chunks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				fileId INTEGER NOT NULL,
				text TEXT NOT NULL,
				lineStart INTEGER NOT NULL,
				lineEnd INTEGER NOT NULL,
				embedding BLOB NOT NULL,
				chunkType TEXT,
				symbolName TEXT,
				FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_files_uri ON Files(uri);
			CREATE INDEX IF NOT EXISTS idx_chunks_fileId ON Chunks(fileId);
		`);

		// Check version and model compatibility - check BEFORE creating tables
		const cacheVersion = PukuEmbeddingsCache.getCacheVersion();
		let needsRebuild = false;
		try {
			const metaResult = this._db.prepare('SELECT version, model FROM CacheMeta LIMIT 1').get();
			if (!metaResult || metaResult.version !== cacheVersion || metaResult.model !== PukuEmbeddingsCache.MODEL_ID) {
				needsRebuild = true;
				console.log(`[PukuEmbeddingsCache] Cache version/model mismatch (have: ${metaResult?.version}/${metaResult?.model}, need: ${cacheVersion}/${PukuEmbeddingsCache.MODEL_ID}), dropping tables`);
			}
		} catch {
			// Table doesn't exist yet - that's fine
			needsRebuild = false;
		}

		if (needsRebuild) {
			// Drop and recreate tables to handle schema changes
			this._db.exec('DROP TABLE IF EXISTS Chunks; DROP TABLE IF EXISTS Files; DROP TABLE IF EXISTS CacheMeta;');
			// Now recreate with new schema
			this._db.exec(`
				CREATE TABLE IF NOT EXISTS CacheMeta (
					version TEXT NOT NULL,
					model TEXT NOT NULL
				);

				CREATE TABLE IF NOT EXISTS Files (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					uri TEXT NOT NULL UNIQUE,
					contentHash TEXT NOT NULL,
					lastIndexed INTEGER NOT NULL
				);

				CREATE TABLE IF NOT EXISTS Chunks (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					fileId INTEGER NOT NULL,
					text TEXT NOT NULL,
					lineStart INTEGER NOT NULL,
					lineEnd INTEGER NOT NULL,
					embedding BLOB NOT NULL,
					chunkType TEXT,
					symbolName TEXT,
					FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
				);

				CREATE INDEX IF NOT EXISTS idx_files_uri ON Files(uri);
				CREATE INDEX IF NOT EXISTS idx_chunks_fileId ON Chunks(fileId);
			`);
		}

		// Update metadata
		this._db.exec('DELETE FROM CacheMeta;');
		this._db.prepare('INSERT INTO CacheMeta (version, model) VALUES (?, ?)').run(cacheVersion, PukuEmbeddingsCache.MODEL_ID);
		console.log(`[PukuEmbeddingsCache] Cache version: ${cacheVersion}`);

		console.log('[PukuEmbeddingsCache] Database initialized');
	}

	/**
	 * Check if a file is already indexed with the current content
	 */
	isIndexed(uri: string, contentHash: string): boolean {
		if (!this._db) {
			return false;
		}

		const result = this._db.prepare('SELECT contentHash FROM Files WHERE uri = ?').get(uri);
		return result?.contentHash === contentHash;
	}

	/**
	 * Get all chunks for a file
	 */
	getChunksForFile(uri: string): PukuChunkWithEmbedding[] {
		if (!this._db) {
			return [];
		}

		const fileResult = this._db.prepare('SELECT id, contentHash FROM Files WHERE uri = ?').get(uri);
		if (!fileResult) {
			return [];
		}

		const chunks = this._db.prepare(`
			SELECT text, lineStart, lineEnd, embedding
			FROM Chunks
			WHERE fileId = ?
		`).all(fileResult.id as number);

		return chunks.map(row => ({
			uri,
			text: row.text as string,
			lineStart: row.lineStart as number,
			lineEnd: row.lineEnd as number,
			embedding: this._unpackEmbedding(row.embedding as Uint8Array),
			contentHash: fileResult.contentHash as string,
		}));
	}

	/**
	 * Get all indexed chunks for search
	 */
	getAllChunks(): PukuChunkWithEmbedding[] {
		if (!this._db) {
			return [];
		}

		const results = this._db.prepare(`
			SELECT f.uri, f.contentHash, c.text, c.lineStart, c.lineEnd, c.embedding, c.chunkType, c.symbolName
			FROM Files f
			JOIN Chunks c ON f.id = c.fileId
		`).all();

		return results.map(row => ({
			uri: row.uri as string,
			text: row.text as string,
			lineStart: row.lineStart as number,
			lineEnd: row.lineEnd as number,
			embedding: this._unpackEmbedding(row.embedding as Uint8Array),
			contentHash: row.contentHash as string,
			chunkType: (row.chunkType as ChunkType) || undefined,
			symbolName: (row.symbolName as string) || undefined,
		}));
	}

	/**
	 * Store chunks and embeddings for a file
	 */
	storeFile(uri: string, contentHash: string, chunks: Array<{
		text: string;
		lineStart: number;
		lineEnd: number;
		embedding: number[];
		chunkType?: string;
		symbolName?: string;
	}>): void {
		if (!this._db) {
			return;
		}

		try {
			this._db.exec('BEGIN TRANSACTION');

			// Delete existing file and chunks (cascade)
			this._db.prepare('DELETE FROM Files WHERE uri = ?').run(uri);

			// Insert file
			const fileResult = this._db.prepare('INSERT INTO Files (uri, contentHash, lastIndexed) VALUES (?, ?, ?)')
				.run(uri, contentHash, Date.now());

			const fileId = fileResult.lastInsertRowid as number;

			// Insert chunks with AST metadata
			const insertStmt = this._db.prepare(`
				INSERT INTO Chunks (fileId, text, lineStart, lineEnd, embedding, chunkType, symbolName)
				VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

			for (const chunk of chunks) {
				insertStmt.run(
					fileId,
					chunk.text,
					chunk.lineStart,
					chunk.lineEnd,
					this._packEmbedding(chunk.embedding),
					chunk.chunkType || null,
					chunk.symbolName || null
				);
			}

			this._db.exec('COMMIT');
		} catch (error) {
			this._db.exec('ROLLBACK');
			throw error;
		}
	}

	/**
	 * Remove a file from the cache
	 */
	removeFile(uri: string): void {
		if (!this._db) {
			return;
		}

		this._db.prepare('DELETE FROM Files WHERE uri = ?').run(uri);
	}

	/**
	 * Get cache statistics
	 */
	getStats(): { fileCount: number; chunkCount: number } {
		if (!this._db) {
			return { fileCount: 0, chunkCount: 0 };
		}

		const fileCount = (this._db.prepare('SELECT COUNT(*) as count FROM Files').get() as { count: number }).count;
		const chunkCount = (this._db.prepare('SELECT COUNT(*) as count FROM Chunks').get() as { count: number }).count;

		return { fileCount, chunkCount };
	}

	/**
	 * Clear all cached data
	 */
	clear(): void {
		if (!this._db) {
			return;
		}

		this._db.exec('DELETE FROM Files; DELETE FROM Chunks;');
	}

	/**
	 * Close the database connection
	 */
	dispose(): void {
		if (this._db) {
			this._db.close();
			this._db = undefined;
		}
	}

	/**
	 * Pack embedding as Float32Array for storage
	 */
	private _packEmbedding(embedding: number[]): Uint8Array {
		const float32Array = Float32Array.from(embedding);
		return new Uint8Array(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength);
	}

	/**
	 * Unpack embedding from stored Float32Array
	 */
	private _unpackEmbedding(data: Uint8Array): number[] {
		const float32Array = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
		return Array.from(float32Array);
	}
}
