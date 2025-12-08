/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import fs from 'fs';
import sql from 'node:sqlite';
import path from 'path';
import * as vscode from 'vscode';
import { arch, platform } from 'process';

import { ChunkType } from './pukuASTChunker';

/**
 * Get the path to sqlite-vec native extension
 * Works around import.meta.url issue in esbuild-bundled code
 * Note: SQLite's loadExtension automatically appends platform extension (.dylib/.so/.dll)
 * so we return path WITHOUT extension
 */
function getSqliteVecPath(): string {
	// Package naming: sqlite-vec-{platform}-{arch}
	// platform: darwin, linux, windows
	// arch: arm64, x64
	const platformName = platform === 'win32' ? 'windows' : platform;
	const packageName = `sqlite-vec-${platformName}-${arch}`;

	// Try to resolve from node_modules - return WITHOUT extension
	// SQLite loadExtension will append the appropriate extension
	try {
		const packagePath = require.resolve(`${packageName}/package.json`);
		return path.join(path.dirname(packagePath), 'vec0');
	} catch {
		// Fallback: try relative path from sqlite-vec package
		const sqliteVecPath = require.resolve('sqlite-vec');
		return path.join(path.dirname(sqliteVecPath), '..', packageName, 'vec0');
	}
}

/**
 * Stored chunk with embedding
 */
export interface PukuChunkWithEmbedding {
	readonly uri: string;
	readonly text: string;
	readonly summary?: string;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly embedding: number[];
	readonly contentHash: string;
	readonly languageId: string;
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
	private static readonly SCHEMA_VERSION = '6'; // Bumped for SummaryJobs table
	private static readonly MODEL_ID = 'puku-embeddings-1024';
	private static readonly EMBEDDING_DIMENSIONS = 1024;

	/**
	 * Get the cache version string (extension version + schema version)
	 * Cache is automatically rebuilt when extension is updated OR schema changes
	 */
	private static getCacheVersion(): string {
		// Get extension version from vscode.extensions API
		// Handle test environment where vscode.extensions may not be available
		let extVersion = '0.0.0';
		try {
			const ext = vscode.extensions?.getExtension('GitHub.puku-editor') ||
				vscode.extensions?.getExtension('puku.puku-editor') || // legacy fallback
				vscode.extensions?.getExtension('puku-chat'); // dev fallback
			extVersion = ext?.packageJSON?.version || '0.0.0';
		} catch {
			// In test environment, use default version
		}
		return `${extVersion}-s${PukuEmbeddingsCache.SCHEMA_VERSION}`;
	}

	private _db: sql.DatabaseSync | undefined;
	private _vecEnabled = false;

	constructor(
		private readonly _storageUri: vscode.Uri | undefined,
	) { }

	/**
	 * Check if sqlite-vec is enabled
	 */
	get vecEnabled(): boolean {
		return this._vecEnabled;
	}

	/**
	 * Get database instance (for job manager access)
	 */
	get db(): sql.DatabaseSync | undefined {
		return this._db;
	}

	/**
	 * Create a temporary file record to get a file ID (for job tracking before final storage)
	 * Returns the file ID that will be used when storeFile is called
	 */
	getOrCreateTemporaryFileId(uri: string, contentHash: string, languageId: string): number | undefined {
		if (!this._db) {
			return undefined;
		}

		// Check if file already exists
		const existing = this._db.prepare('SELECT id FROM Files WHERE uri = ?').get(uri) as { id: number } | undefined;
		if (existing) {
			return existing.id;
		}

		// Create temporary file record (will be overwritten by storeFile)
		const result = this._db.prepare('INSERT INTO Files (uri, contentHash, languageId, lastIndexed) VALUES (?, ?, ?, ?)')
			.run(uri, contentHash, languageId, Date.now());

		return result.lastInsertRowid as number;
	}

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
			enableForeignKeyConstraints: true,
			allowExtension: true // Required for sqlite-vec
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

		// Load sqlite-vec extension for vector search
		try {
			const vecPath = getSqliteVecPath();
			console.log(`[PukuEmbeddingsCache] Loading sqlite-vec from: ${vecPath}`);
			this._db.loadExtension(vecPath);
			this._vecEnabled = true;
			const version = this._db.prepare('SELECT vec_version() as version').get() as { version: string };
			console.log(`[PukuEmbeddingsCache] sqlite-vec loaded: v${version.version}`);
		} catch (e) {
			console.warn('[PukuEmbeddingsCache] Failed to load sqlite-vec, falling back to in-memory search:', e);
			this._vecEnabled = false;
		}

		// Optimize for performance and handle concurrent access
		this._db.exec(`
			PRAGMA busy_timeout = 5000;
			PRAGMA journal_mode = WAL;
			PRAGMA synchronous = NORMAL;
			PRAGMA cache_size = 1000000;
			PRAGMA temp_store = MEMORY;
		`);

		// Check version and model compatibility FIRST - before creating any tables
		const cacheVersion = PukuEmbeddingsCache.getCacheVersion();
		let needsRebuild = false;
		try {
			// Try to check existing cache version
			const metaResult = this._db.prepare('SELECT version, model FROM CacheMeta LIMIT 1').get();
			if (!metaResult || metaResult.version !== cacheVersion || metaResult.model !== PukuEmbeddingsCache.MODEL_ID) {
				needsRebuild = true;
				console.log(`[PukuEmbeddingsCache] Cache version/model mismatch (have: ${metaResult?.version}/${metaResult?.model}, need: ${cacheVersion}/${PukuEmbeddingsCache.MODEL_ID}), dropping tables`);
			}
		} catch {
			// CacheMeta table doesn't exist yet - this is a new database
			needsRebuild = false;
		}

		if (needsRebuild) {
			// Drop all tables to handle schema changes
			this._db.exec('DROP TABLE IF EXISTS VecMapping; DROP TABLE IF EXISTS vec_chunks; DROP TABLE IF EXISTS Chunks; DROP TABLE IF EXISTS SummaryJobs; DROP TABLE IF EXISTS Files; DROP TABLE IF EXISTS CacheMeta;');
		}

		// Create schema (either fresh or after rebuild)
		this._db.exec(`
			CREATE TABLE IF NOT EXISTS CacheMeta (
				version TEXT NOT NULL,
				model TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Files (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT NOT NULL UNIQUE,
				contentHash TEXT NOT NULL,
				languageId TEXT NOT NULL,
				lastIndexed INTEGER NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Chunks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				fileId INTEGER NOT NULL,
				text TEXT NOT NULL,
				summary TEXT,
				lineStart INTEGER NOT NULL,
				lineEnd INTEGER NOT NULL,
				embedding BLOB NOT NULL,
				chunkType TEXT,
				symbolName TEXT,
				FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS SummaryJobs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				fileId INTEGER NOT NULL,
				status TEXT NOT NULL,
				chunkStartIndex INTEGER NOT NULL,
				chunkEndIndex INTEGER NOT NULL,
				summaries TEXT,
				error TEXT,
				createdAt INTEGER NOT NULL,
				completedAt INTEGER,
				FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_files_uri ON Files(uri);
			CREATE INDEX IF NOT EXISTS idx_files_languageId ON Files(languageId);
			CREATE INDEX IF NOT EXISTS idx_chunks_fileId ON Chunks(fileId);
			CREATE INDEX IF NOT EXISTS idx_summary_jobs_fileId ON SummaryJobs(fileId);
			CREATE INDEX IF NOT EXISTS idx_summary_jobs_status ON SummaryJobs(status);
		`);

		// Create vec_chunks virtual table and mapping for KNN search (if sqlite-vec is available)
		if (this._vecEnabled) {
			try {
				this._db.exec(`
					CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
						embedding float[${PukuEmbeddingsCache.EMBEDDING_DIMENSIONS}]
					);

					CREATE TABLE IF NOT EXISTS VecMapping (
						vec_rowid INTEGER PRIMARY KEY,
						chunk_id INTEGER NOT NULL,
						FOREIGN KEY (chunk_id) REFERENCES Chunks(id) ON DELETE CASCADE
					);

					CREATE INDEX IF NOT EXISTS idx_vecmapping_chunk_id ON VecMapping(chunk_id);
				`);
				console.log('[PukuEmbeddingsCache] vec_chunks virtual table and mapping created');
			} catch (e) {
				console.warn('[PukuEmbeddingsCache] Failed to create vec_chunks table:', e);
				this._vecEnabled = false;
			}
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

		const fileResult = this._db.prepare('SELECT id, contentHash, languageId FROM Files WHERE uri = ?').get(uri);
		if (!fileResult) {
			return [];
		}

		const chunks = this._db.prepare(`
			SELECT text, summary, lineStart, lineEnd, embedding, chunkType, symbolName
			FROM Chunks
			WHERE fileId = ?
		`).all(fileResult.id as number);

		return chunks.map(row => ({
			uri,
			text: row.text as string,
			summary: row.summary as string | undefined,
			lineStart: row.lineStart as number,
			lineEnd: row.lineEnd as number,
			embedding: this._unpackEmbedding(row.embedding as Uint8Array),
			contentHash: fileResult.contentHash as string,
			languageId: fileResult.languageId as string,
			chunkType: row.chunkType as ChunkType | undefined,
			symbolName: row.symbolName as string | undefined,
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
			SELECT f.uri, f.contentHash, f.languageId, c.text, c.summary, c.lineStart, c.lineEnd, c.embedding, c.chunkType, c.symbolName
			FROM Files f
			JOIN Chunks c ON f.id = c.fileId
		`).all();

		return results.map(row => ({
			uri: row.uri as string,
			text: row.text as string,
			summary: row.summary as string | undefined,
			lineStart: row.lineStart as number,
			lineEnd: row.lineEnd as number,
			embedding: this._unpackEmbedding(row.embedding as Uint8Array),
			contentHash: row.contentHash as string,
			languageId: row.languageId as string,
			chunkType: (row.chunkType as ChunkType) || undefined,
			symbolName: (row.symbolName as string) || undefined,
		}));
	}

	/**
	 * Store chunks and embeddings for a file
	 */
	storeFile(uri: string, contentHash: string, languageId: string, chunks: Array<{
		text: string;
		summary?: string;
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
			const fileResult = this._db.prepare('INSERT INTO Files (uri, contentHash, languageId, lastIndexed) VALUES (?, ?, ?, ?)')
				.run(uri, contentHash, languageId, Date.now());

			const fileId = fileResult.lastInsertRowid as number;

			// Insert chunks with AST metadata and summaries
			const insertStmt = this._db.prepare(`
				INSERT INTO Chunks (fileId, text, summary, lineStart, lineEnd, embedding, chunkType, symbolName)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`);

			// Prepare vec_chunks insert and mapping if sqlite-vec is enabled
			const vecInsertStmt = this._vecEnabled
				? this._db.prepare('INSERT INTO vec_chunks (embedding) VALUES (?)')
				: null;
			const mappingInsertStmt = this._vecEnabled
				? this._db.prepare('INSERT INTO VecMapping (vec_rowid, chunk_id) VALUES (?, ?)')
				: null;

			for (const chunk of chunks) {
				const chunkResult = insertStmt.run(
					fileId,
					chunk.text,
					chunk.summary || null,
					chunk.lineStart,
					chunk.lineEnd,
					this._packEmbedding(chunk.embedding),
					chunk.chunkType || null,
					chunk.symbolName || null
				);

				// Also insert into vec_chunks for KNN search (only if dimensions match)
				if (vecInsertStmt && mappingInsertStmt && chunk.embedding.length === PukuEmbeddingsCache.EMBEDDING_DIMENSIONS) {
					const chunkId = Number(chunkResult.lastInsertRowid);
					const vecEmbedding = new Float32Array(chunk.embedding);
					// Insert embedding (let sqlite-vec auto-generate rowid)
					const vecResult = vecInsertStmt.run(new Uint8Array(vecEmbedding.buffer));
					const vecRowid = Number(vecResult.lastInsertRowid);
					// Create mapping between vec_chunks rowid and chunk id
					mappingInsertStmt.run(vecRowid, chunkId);
				}
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

		// First delete from vec_chunks and mapping if enabled
		if (this._vecEnabled) {
			// Get chunk IDs for this file
			const chunkIds = this._db.prepare(`
				SELECT c.id FROM Chunks c
				JOIN Files f ON c.fileId = f.id
				WHERE f.uri = ?
			`).all(uri);

			for (const row of chunkIds) {
				const chunkId = (row as { id: number }).id;
				// Get vec_rowid from mapping and delete from vec_chunks
				const mapping = this._db.prepare('SELECT vec_rowid FROM VecMapping WHERE chunk_id = ?').get(chunkId);
				if (mapping) {
					this._db.prepare('DELETE FROM vec_chunks WHERE rowid = ?').run((mapping as { vec_rowid: number }).vec_rowid);
					this._db.prepare('DELETE FROM VecMapping WHERE chunk_id = ?').run(chunkId);
				}
			}
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

		if (this._vecEnabled) {
			this._db.exec('DELETE FROM VecMapping; DELETE FROM vec_chunks;');
		}
		this._db.exec('DELETE FROM Files; DELETE FROM Chunks;');
	}

	/**
	 * KNN search using sqlite-vec with mapping table
	 */
	searchKNN(queryEmbedding: number[], k: number = 10): Array<PukuChunkWithEmbedding & { distance: number }> {
		if (!this._db) {
			return [];
		}

		if (this._vecEnabled && queryEmbedding.length === PukuEmbeddingsCache.EMBEDDING_DIMENSIONS) {
			// Use sqlite-vec for efficient KNN search via mapping table
			const vecQueryFloat = new Float32Array(queryEmbedding);
			const vecQuery = new Uint8Array(vecQueryFloat.buffer);
			const results = this._db.prepare(`
				SELECT
					m.chunk_id,
					v.distance,
					c.text,
					c.lineStart,
					c.lineEnd,
					c.chunkType,
					c.symbolName,
					f.uri,
					f.contentHash,
					c.embedding
				FROM vec_chunks v
				INNER JOIN VecMapping m ON v.rowid = m.vec_rowid
				INNER JOIN Chunks c ON m.chunk_id = c.id
				INNER JOIN Files f ON c.fileId = f.id
				WHERE v.embedding MATCH ? AND k = ?
				ORDER BY v.distance
			`).all(vecQuery, k);

			return results.map(row => ({
				uri: row.uri as string,
				text: row.text as string,
				lineStart: row.lineStart as number,
				lineEnd: row.lineEnd as number,
				embedding: this._unpackEmbedding(row.embedding as Uint8Array),
				contentHash: row.contentHash as string,
				chunkType: (row.chunkType as ChunkType) || undefined,
				symbolName: (row.symbolName as string) || undefined,
				distance: row.distance as number,
			}));
		}

		// For non-1024 dimension embeddings, use in-memory cosine similarity
		const allChunks = this.getAllChunks();
		const scored = allChunks.map(chunk => ({
			...chunk,
			distance: 1 - this._cosineSimilarity(queryEmbedding, chunk.embedding),
		}));
		scored.sort((a, b) => a.distance - b.distance);
		return scored.slice(0, k);
	}

	/**
	 * Compute cosine similarity between two vectors
	 */
	private _cosineSimilarity(a: number[], b: number[]): number {
		if (a.length !== b.length) {
			return 0;
		}

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
		return magnitude === 0 ? 0 : dotProduct / magnitude;
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
