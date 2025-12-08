"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorkspaceChunkAndEmbeddingCache = createWorkspaceChunkAndEmbeddingCache;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const fs_1 = __importDefault(require("fs"));
const node_sqlite_1 = __importDefault(require("node:sqlite"));
const path_1 = __importDefault(require("path"));
const async_1 = require("../../../util/vs/base/common/async");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const logService_1 = require("../../log/common/logService");
const embeddingsStorage_1 = require("../../embeddings/common/embeddingsStorage");
async function createWorkspaceChunkAndEmbeddingCache(accessor, embeddingType, cacheRoot, workspaceIndex) {
    const instantiationService = accessor.get(instantiation_1.IInstantiationService);
    return instantiationService.invokeFunction(accessor => DbCache.create(accessor, embeddingType, cacheRoot ?? ':memory:', workspaceIndex));
}
class OldDiskCache {
    static { this.cacheFileName = 'workspace-chunks.json'; }
    static async deleteDiskCache(accessor, cacheRoot) {
        const fileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        const cachePath = uri_1.URI.joinPath(cacheRoot, OldDiskCache.cacheFileName);
        try {
            await fileSystem.delete(cachePath);
        }
        catch {
            // noop
        }
    }
    constructor() { }
}
class DbCache {
    static { this.version = '1.0.0'; }
    static async create(accessor, embeddingType, cacheRoot, workspaceIndex) {
        const instantiationService = accessor.get(instantiation_1.IInstantiationService);
        const logService = accessor.get(logService_1.ILogService);
        const syncOptions = {
            open: true,
            enableForeignKeyConstraints: true
        };
        let db;
        if (cacheRoot !== ':memory:' && cacheRoot.scheme === network_1.Schemas.file) {
            const dbPath = uri_1.URI.joinPath(cacheRoot, `workspace-chunks.db`);
            try {
                await fs_1.default.promises.mkdir(path_1.default.dirname(dbPath.fsPath), { recursive: true });
                db = new node_sqlite_1.default.DatabaseSync(dbPath.fsPath, syncOptions);
                logService.trace(`DbWorkspaceChunkAndEmbeddingCache: Opened SQLite database on disk at ${dbPath.fsPath}`);
            }
            catch (e) {
                console.error('Failed to open SQLite database on disk', e);
            }
        }
        if (!db) {
            db = new node_sqlite_1.default.DatabaseSync(':memory:', syncOptions);
            logService.trace(`DbWorkspaceChunkAndEmbeddingCache: Using in memory database`);
        }
        db.exec(`
			PRAGMA journal_mode = OFF;
			PRAGMA synchronous = 0;
			PRAGMA cache_size = 1000000;
			PRAGMA locking_mode = EXCLUSIVE;
			PRAGMA temp_store = MEMORY;
		`);
        db.exec(`
			CREATE TABLE IF NOT EXISTS CacheMeta (
				version TEXT NOT NULL,
				embeddingModel TEXT
			);

			CREATE TABLE IF NOT EXISTS Files (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT NOT NULL UNIQUE,
				contentVersionId TEXT
			);

			CREATE TABLE IF NOT EXISTS FileChunks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				fileId INTEGER NOT NULL,
				text TEXT NOT NULL,
				range_startLineNumber INTEGER NOT NULL,
				range_startColumn INTEGER NOT NULL,
				range_endLineNumber INTEGER NOT NULL,
				range_endColumn INTEGER NOT NULL,
				embedding BINARY NOT NULL,
				chunkHash TEXT NOT NULL,
				FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
			);

			CREATE INDEX IF NOT EXISTS idx_files_uri ON Files(uri);
			CREATE INDEX IF NOT EXISTS idx_filechunks_fileId ON FileChunks(fileId);
		`);
        const versionResult = db.prepare('SELECT version, embeddingModel FROM CacheMeta LIMIT 1').get();
        if (!versionResult || versionResult.version !== this.version || versionResult.embeddingModel !== embeddingType.id) {
            // Clear everything
            db.exec('DELETE FROM CacheMeta; DELETE FROM Files; DELETE FROM FileChunks;');
        }
        // Update cache metadata
        db.exec('DELETE FROM CacheMeta;');
        db.prepare('INSERT INTO CacheMeta (version, embeddingModel) VALUES (?, ?)').run(this.version, embeddingType.id);
        // Clean up old disk db if it exists
        if (cacheRoot !== ':memory:') {
            void instantiationService.invokeFunction(accessor => OldDiskCache.deleteDiskCache(accessor, cacheRoot));
        }
        // Validate all files in the database against the workspace index and remove any that are no longer present
        await workspaceIndex.initialize();
        const allFilesStmt = db.prepare('SELECT id, uri FROM Files');
        try {
            db.exec('BEGIN TRANSACTION');
            for (const row of allFilesStmt.all()) {
                try {
                    const uri = uri_1.URI.parse(row.uri);
                    if (workspaceIndex.get(uri)) {
                        continue;
                    }
                }
                catch {
                    // noop
                }
                db.prepare('DELETE FROM Files WHERE id = ?').run(row.id);
            }
        }
        finally {
            db.exec('COMMIT');
        }
        return new DbCache(embeddingType, db);
    }
    constructor(embeddingType, db) {
        this.embeddingType = embeddingType;
        this.db = db;
        this._inMemory = new map_1.ResourceMap();
    }
    dispose() {
        this.db.close();
    }
    /**
     * Checks if {@linkcode file} is currently indexed. Does not wait for any current indexing operation to complete.
     */
    async isIndexed(file) {
        const entry = await this.getEntry(file);
        return entry?.state === 'resolved';
    }
    async get(file) {
        return (await this.getEntry(file))?.value;
    }
    getCurrentChunksForUri(uri) {
        const entry = this._inMemory.get(uri);
        if (entry?.state === 'pending') {
            // Still being computed
            return undefined;
        }
        if (entry?.state === 'rejected') {
            return undefined;
        }
        // Should be written to the database
        const all = this.db.prepare(`SELECT fc.text, fc.range_startLineNumber, fc.range_startColumn, fc.range_endLineNumber, fc.range_endColumn, fc.embedding, fc.chunkHash FROM Files f JOIN FileChunks fc ON f.id = fc.fileId WHERE f.uri = ?`).all(uri.toString());
        if (all.length > 0) {
            const out = new Map();
            for (const row of all) {
                const embedding = (0, embeddingsStorage_1.unpackEmbedding)(this.embeddingType, row.embedding);
                const chunk = {
                    chunk: {
                        file: uri,
                        text: row.text,
                        rawText: undefined,
                        range: new range_1.Range(row.range_startLineNumber, row.range_startColumn, row.range_endLineNumber, row.range_endColumn),
                    },
                    embedding,
                    chunkHash: row.chunkHash,
                };
                if (chunk.chunkHash) {
                    out.set(chunk.chunkHash, chunk);
                }
            }
            return out;
        }
        return undefined;
    }
    async getEntry(file) {
        const entry = this._inMemory.get(file.uri);
        const inContentVersionId = await file.getFastContentVersionId();
        if (entry?.contentVersionId === inContentVersionId) {
            return entry;
        }
        const fileIdResult = this.db.prepare('SELECT id, contentVersionId FROM Files WHERE uri = ?').get(file.uri.toString());
        if (!fileIdResult || fileIdResult.contentVersionId !== inContentVersionId) {
            return undefined;
        }
        const chunks = this.db.prepare(`SELECT text, range_startLineNumber, range_startColumn, range_endLineNumber, range_endColumn, embedding, chunkHash FROM FileChunks WHERE fileId = ?`).all(fileIdResult.id);
        return {
            state: 'resolved',
            contentVersionId: fileIdResult.contentVersionId,
            fileHash: undefined,
            value: chunks.map((row) => {
                return {
                    chunk: {
                        file: file.uri,
                        text: row.text,
                        rawText: undefined,
                        range: new range_1.Range(row.range_startLineNumber, row.range_startColumn, row.range_endLineNumber, row.range_endColumn),
                    },
                    embedding: (0, embeddingsStorage_1.unpackEmbedding)(this.embeddingType, row.embedding),
                    chunkHash: row.chunkHash,
                };
            }),
        };
    }
    async update(file, compute) {
        const existingInMemory = this._inMemory.get(file.uri);
        const inContentVersionId = await file.getFastContentVersionId();
        if (existingInMemory?.contentVersionId === inContentVersionId) {
            // Already up to date
            return existingInMemory.value;
        }
        const written = await this.getEntry(file);
        if (written?.contentVersionId === inContentVersionId) {
            return written.value;
        }
        // Overwrite
        if (existingInMemory?.state === 'pending') {
            existingInMemory.value.cancel();
        }
        const chunks = (0, async_1.createCancelablePromise)(compute);
        const entry = {
            contentVersionId: inContentVersionId,
            fileHash: undefined,
            state: 'pending',
            value: chunks
        };
        this._inMemory.set(file.uri, entry);
        chunks
            .then((result) => {
            return { contentVersionId: inContentVersionId, fileHash: undefined, state: Array.isArray(result) ? 'resolved' : 'rejected', value: result };
        }, () => {
            return { contentVersionId: inContentVersionId, fileHash: undefined, state: 'rejected', value: undefined };
        })
            .then(newEntry => {
            const current = this._inMemory.get(file.uri);
            if (entry === current) {
                if (newEntry.state === 'rejected') {
                    this._inMemory.set(file.uri, newEntry);
                    this.db.prepare('DELETE FROM Files WHERE uri = ?').run(file.uri.toString());
                }
                else {
                    this._inMemory.delete(file.uri);
                    const fileResult = this.db.prepare('INSERT OR REPLACE INTO Files (uri, contentVersionId) VALUES (?, ?)')
                        .run(file.uri.toString(), inContentVersionId);
                    try {
                        const insertStatement = this.db.prepare(`INSERT INTO FileChunks (fileId, text, range_startLineNumber, range_startColumn, range_endLineNumber, range_endColumn, embedding, chunkHash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
                        this.db.exec('BEGIN TRANSACTION');
                        for (const chunk of newEntry.value ?? []) {
                            insertStatement.run(fileResult.lastInsertRowid, chunk.chunk.text, chunk.chunk.range.startLineNumber, chunk.chunk.range.startColumn, chunk.chunk.range.endLineNumber, chunk.chunk.range.endColumn, (0, embeddingsStorage_1.packEmbedding)(chunk.embedding), chunk.chunkHash ?? '');
                        }
                    }
                    finally {
                        this.db.exec('COMMIT');
                    }
                }
            }
        });
        return chunks;
    }
}
//# sourceMappingURL=workspaceChunkAndEmbeddingCache.js.map