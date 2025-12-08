"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuEmbeddingsCache = void 0;
const fs_1 = __importDefault(require("fs"));
const node_sqlite_1 = __importDefault(require("node:sqlite"));
const path_1 = __importDefault(require("path"));
const vscode = __importStar(require("vscode"));
const process_1 = require("process");
/**
 * Get the path to sqlite-vec native extension
 * Works around import.meta.url issue in esbuild-bundled code
 * Note: SQLite's loadExtension automatically appends platform extension (.dylib/.so/.dll)
 * so we return path WITHOUT extension
 */
function getSqliteVecPath() {
    // Package naming: sqlite-vec-{platform}-{arch}
    // platform: darwin, linux, win32
    // arch: arm64, x64
    const packageName = `sqlite-vec-${process_1.platform}-${process_1.arch}`;
    // Try to resolve from node_modules - return WITHOUT extension
    // SQLite loadExtension will append the appropriate extension
    try {
        const packagePath = require.resolve(`${packageName}/package.json`);
        return path_1.default.join(path_1.default.dirname(packagePath), 'vec0');
    }
    catch {
        // Fallback: try relative path from sqlite-vec package
        const sqliteVecPath = require.resolve('sqlite-vec');
        return path_1.default.join(path_1.default.dirname(sqliteVecPath), '..', packageName, 'vec0');
    }
}
/**
 * Puku Embeddings Cache - SQLite-based storage for workspace embeddings
 *
 * Uses the same pattern as Copilot's workspaceChunkAndEmbeddingCache.ts
 */
class PukuEmbeddingsCache {
    /**
     * Schema version - bump this when schema changes require a clean rebuild
     * independent of extension version (e.g., for schema-only changes).
     * Combined with extension version for full cache key.
     */
    static { this.SCHEMA_VERSION = '6'; } // Bumped for SummaryJobs table
    static { this.MODEL_ID = 'puku-embeddings-1024'; }
    static { this.EMBEDDING_DIMENSIONS = 1024; }
    /**
     * Get the cache version string (extension version + schema version)
     * Cache is automatically rebuilt when extension is updated OR schema changes
     */
    static getCacheVersion() {
        // Get extension version from vscode.extensions API
        // Handle test environment where vscode.extensions may not be available
        let extVersion = '0.0.0';
        try {
            const ext = vscode.extensions?.getExtension('puku.puku-editor') ||
                vscode.extensions?.getExtension('puku-chat'); // fallback for dev
            extVersion = ext?.packageJSON?.version || '0.0.0';
        }
        catch {
            // In test environment, use default version
        }
        return `${extVersion}-s${PukuEmbeddingsCache.SCHEMA_VERSION}`;
    }
    constructor(_storageUri) {
        this._storageUri = _storageUri;
        this._vecEnabled = false;
    }
    /**
     * Check if sqlite-vec is enabled
     */
    get vecEnabled() {
        return this._vecEnabled;
    }
    /**
     * Get database instance (for job manager access)
     */
    get db() {
        return this._db;
    }
    /**
     * Create a temporary file record to get a file ID (for job tracking before final storage)
     * Returns the file ID that will be used when storeFile is called
     */
    getOrCreateTemporaryFileId(uri, contentHash, languageId) {
        if (!this._db) {
            return undefined;
        }
        // Check if file already exists
        const existing = this._db.prepare('SELECT id FROM Files WHERE uri = ?').get(uri);
        if (existing) {
            return existing.id;
        }
        // Create temporary file record (will be overwritten by storeFile)
        const result = this._db.prepare('INSERT INTO Files (uri, contentHash, languageId, lastIndexed) VALUES (?, ?, ?, ?)')
            .run(uri, contentHash, languageId, Date.now());
        return result.lastInsertRowid;
    }
    /**
     * Delete the database file completely (for manual cleanup or release)
     */
    static async deleteDatabase(storageUri) {
        if (!storageUri || storageUri.scheme !== 'file') {
            return false;
        }
        const dbPath = vscode.Uri.joinPath(storageUri, 'puku-embeddings.db');
        try {
            await fs_1.default.promises.unlink(dbPath.fsPath);
            console.log(`[PukuEmbeddingsCache] Deleted database at ${dbPath.fsPath}`);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Initialize the database
     */
    async initialize() {
        if (this._db) {
            return;
        }
        const syncOptions = {
            open: true,
            enableForeignKeyConstraints: true,
            allowExtension: true // Required for sqlite-vec
        };
        // Try to create on-disk database if we have storage
        if (this._storageUri && this._storageUri.scheme === 'file') {
            const dbPath = vscode.Uri.joinPath(this._storageUri, 'puku-embeddings.db');
            try {
                await fs_1.default.promises.mkdir(path_1.default.dirname(dbPath.fsPath), { recursive: true });
                this._db = new node_sqlite_1.default.DatabaseSync(dbPath.fsPath, syncOptions);
                console.log(`[PukuEmbeddingsCache] Opened SQLite database at ${dbPath.fsPath}`);
            }
            catch (e) {
                console.error('[PukuEmbeddingsCache] Failed to open SQLite database on disk:', e);
            }
        }
        // Fallback to in-memory
        if (!this._db) {
            this._db = new node_sqlite_1.default.DatabaseSync(':memory:', syncOptions);
            console.log('[PukuEmbeddingsCache] Using in-memory database');
        }
        // Load sqlite-vec extension for vector search
        try {
            const vecPath = getSqliteVecPath();
            console.log(`[PukuEmbeddingsCache] Loading sqlite-vec from: ${vecPath}`);
            this._db.loadExtension(vecPath);
            this._vecEnabled = true;
            const version = this._db.prepare('SELECT vec_version() as version').get();
            console.log(`[PukuEmbeddingsCache] sqlite-vec loaded: v${version.version}`);
        }
        catch (e) {
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
        }
        catch {
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
            }
            catch (e) {
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
    isIndexed(uri, contentHash) {
        if (!this._db) {
            return false;
        }
        const result = this._db.prepare('SELECT contentHash FROM Files WHERE uri = ?').get(uri);
        return result?.contentHash === contentHash;
    }
    /**
     * Get all chunks for a file
     */
    getChunksForFile(uri) {
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
		`).all(fileResult.id);
        return chunks.map(row => ({
            uri,
            text: row.text,
            summary: row.summary,
            lineStart: row.lineStart,
            lineEnd: row.lineEnd,
            embedding: this._unpackEmbedding(row.embedding),
            contentHash: fileResult.contentHash,
            languageId: fileResult.languageId,
            chunkType: row.chunkType,
            symbolName: row.symbolName,
        }));
    }
    /**
     * Get all indexed chunks for search
     */
    getAllChunks() {
        if (!this._db) {
            return [];
        }
        const results = this._db.prepare(`
			SELECT f.uri, f.contentHash, f.languageId, c.text, c.summary, c.lineStart, c.lineEnd, c.embedding, c.chunkType, c.symbolName
			FROM Files f
			JOIN Chunks c ON f.id = c.fileId
		`).all();
        return results.map(row => ({
            uri: row.uri,
            text: row.text,
            summary: row.summary,
            lineStart: row.lineStart,
            lineEnd: row.lineEnd,
            embedding: this._unpackEmbedding(row.embedding),
            contentHash: row.contentHash,
            languageId: row.languageId,
            chunkType: row.chunkType || undefined,
            symbolName: row.symbolName || undefined,
        }));
    }
    /**
     * Store chunks and embeddings for a file
     */
    storeFile(uri, contentHash, languageId, chunks) {
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
            const fileId = fileResult.lastInsertRowid;
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
                const chunkResult = insertStmt.run(fileId, chunk.text, chunk.summary || null, chunk.lineStart, chunk.lineEnd, this._packEmbedding(chunk.embedding), chunk.chunkType || null, chunk.symbolName || null);
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
        }
        catch (error) {
            this._db.exec('ROLLBACK');
            throw error;
        }
    }
    /**
     * Remove a file from the cache
     */
    removeFile(uri) {
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
                const chunkId = row.id;
                // Get vec_rowid from mapping and delete from vec_chunks
                const mapping = this._db.prepare('SELECT vec_rowid FROM VecMapping WHERE chunk_id = ?').get(chunkId);
                if (mapping) {
                    this._db.prepare('DELETE FROM vec_chunks WHERE rowid = ?').run(mapping.vec_rowid);
                    this._db.prepare('DELETE FROM VecMapping WHERE chunk_id = ?').run(chunkId);
                }
            }
        }
        this._db.prepare('DELETE FROM Files WHERE uri = ?').run(uri);
    }
    /**
     * Get cache statistics
     */
    getStats() {
        if (!this._db) {
            return { fileCount: 0, chunkCount: 0 };
        }
        const fileCount = this._db.prepare('SELECT COUNT(*) as count FROM Files').get().count;
        const chunkCount = this._db.prepare('SELECT COUNT(*) as count FROM Chunks').get().count;
        return { fileCount, chunkCount };
    }
    /**
     * Clear all cached data
     */
    clear() {
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
    searchKNN(queryEmbedding, k = 10) {
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
                uri: row.uri,
                text: row.text,
                lineStart: row.lineStart,
                lineEnd: row.lineEnd,
                embedding: this._unpackEmbedding(row.embedding),
                contentHash: row.contentHash,
                chunkType: row.chunkType || undefined,
                symbolName: row.symbolName || undefined,
                distance: row.distance,
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
    _cosineSimilarity(a, b) {
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
    dispose() {
        if (this._db) {
            this._db.close();
            this._db = undefined;
        }
    }
    /**
     * Pack embedding as Float32Array for storage
     */
    _packEmbedding(embedding) {
        const float32Array = Float32Array.from(embedding);
        return new Uint8Array(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength);
    }
    /**
     * Unpack embedding from stored Float32Array
     */
    _unpackEmbedding(data) {
        const float32Array = new Float32Array(data.buffer, data.byteOffset, data.byteLength / 4);
        return Array.from(float32Array);
    }
}
exports.PukuEmbeddingsCache = PukuEmbeddingsCache;
//# sourceMappingURL=pukuEmbeddingsCache.js.map