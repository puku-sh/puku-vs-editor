"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistentTfIdf = void 0;
const fs_1 = __importDefault(require("fs"));
const node_sqlite_1 = __importDefault(require("node:sqlite"));
const path_1 = __importDefault(require("path"));
const glob_1 = require("../../../util/common/glob");
const async_1 = require("../../../util/vs/base/common/async");
const iterator_1 = require("../../../util/vs/base/common/iterator");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const uri_1 = require("../../../util/vs/base/common/uri");
const range_1 = require("../../../util/vs/editor/common/core/range");
function countRecordFrom(values) {
    const map = Object.create(null);
    for (const value of values) {
        map[value] = (map[value] ?? 0) + 1;
    }
    return map;
}
/**
 * Count how many times each term (word) appears in a string.
 */
function termFrequencies(input) {
    return countRecordFrom(splitTerms(input));
}
/**
 * Break a string into terms (words).
 */
function* splitTerms(input) {
    const normalize = (word) => word.toLowerCase();
    // Only match on words that are at least 3 characters long and start with a letter
    for (const [word] of input.matchAll(/(?<![\p{Alphabetic}\p{Number}_$])[\p{Letter}_$][\p{Alphabetic}\p{Number}_$]{2,}(?![\p{Alphabetic}\p{Number}_$])/gu)) {
        const parts = new Set();
        parts.add(normalize(word));
        const subParts = [];
        const camelParts = word.split(/(?<=[a-z$])(?=[A-Z])/g);
        if (camelParts.length > 1) {
            subParts.push(...camelParts);
        }
        const snakeParts = word.split('_');
        if (snakeParts.length > 1) {
            subParts.push(...snakeParts);
        }
        const nonDigitPrefixMatch = word.match(/^([\D]+)\p{Number}+$/u);
        if (nonDigitPrefixMatch) {
            subParts.push(nonDigitPrefixMatch[1]);
        }
        for (const part of subParts) {
            // Require at least 3 letters in the sub parts
            if (part.length > 2 && /[\p{Alphabetic}_$]{3,}/gu.test(part)) {
                parts.add(normalize(part));
            }
        }
        yield* parts;
    }
}
/**
 * A very simple heap implementation that keeps the top `maxSize` elements.
 */
class SimpleHeap {
    constructor(maxSize, minScore = -Infinity) {
        this.maxSize = maxSize;
        this.minScore = minScore;
        this.store = [];
    }
    toArray(maxSpread) {
        if (this.store.length && typeof maxSpread === 'number') {
            const minScore = this.store.at(0).score * (1.0 - maxSpread);
            return this.store.filter(x => x.score >= minScore).map(x => x.value);
        }
        return this.store.map(x => x.value);
    }
    add(score, value) {
        if (score <= this.minScore) {
            return;
        }
        const index = this.store.findIndex(entry => entry.score < score);
        this.store.splice(index >= 0 ? index : this.store.length, 0, { score, value });
        while (this.store.length > this.maxSize) {
            this.store.pop();
        }
        if (this.store.length === this.maxSize) {
            this.minScore = this.store.at(-1)?.score ?? this.minScore;
        }
    }
}
/**
 * Implementation of tf-idf (term frequency–inverse document frequency) for a set of documents where
 * each document contains one or more chunks of text.
 *
 * This implementation uses SQLite to store the documents and their chunks. This lets us scale up to a large
 * number of documents and chunks.
 */
class PersistentTfIdf {
    constructor(dbPath) {
        const syncOptions = {
            open: true,
            enableForeignKeyConstraints: true
        };
        if (dbPath !== ':memory:' && dbPath.scheme === network_1.Schemas.file) {
            try {
                fs_1.default.mkdirSync(path_1.default.dirname(dbPath.fsPath), { recursive: true });
                this.db = new node_sqlite_1.default.DatabaseSync(dbPath.fsPath, syncOptions);
            }
            catch (e) {
                console.error('Failed to open SQLite database on disk. Trying memory db', e);
            }
        }
        // Try falling back to an in-memory database
        if (!this.db) {
            this.db = new node_sqlite_1.default.DatabaseSync(':memory:', syncOptions);
        }
        this.db.exec(`
			PRAGMA journal_mode = OFF;
			PRAGMA synchronous = 0;
			PRAGMA cache_size = 1000000;
			PRAGMA locking_mode = EXCLUSIVE;
			PRAGMA temp_store = MEMORY;
		`);
        this.db.exec(`
			CREATE TABLE IF NOT EXISTS Documents (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT,
				contentVersionId TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Chunks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				documentId INTEGER NOT NULL,
				text TEXT NOT NULL,
				startLineNumber INTEGER NOT NULL,
				startColumn INTEGER NOT NULL,
				endLineNumber INTEGER NOT NULL,
				endColumn INTEGER NOT NULL,
				isFullFile INTEGER NOT NULL,
				termFrequencies BLOB NOT NULL, -- JSONB object storing term frequencies
				FOREIGN KEY (documentId) REFERENCES Documents(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS ChunkOccurrences (
				term TEXT PRIMARY KEY,
				chunkCount INTEGER NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_documents_uri ON Documents(uri);
			CREATE INDEX IF NOT EXISTS idx_chunks_documentId ON Chunks(documentId);
		`);
    }
    /**
     * @returns a list of URIs that are out of sync and need to be re-indexed.
     */
    initialize(workspaceDocsIn) {
        const inDocsToContentIds = new map_1.ResourceMap();
        for (const { uri, contentId } of workspaceDocsIn) {
            inDocsToContentIds.set(uri, contentId);
        }
        const allDbDocs = this.db.prepare('SELECT * FROM Documents').all();
        const dbDocsToContentIds = new map_1.ResourceMap();
        for (const docEntry of allDbDocs) {
            try {
                const uri = uri_1.URI.parse(docEntry.uri);
                dbDocsToContentIds.set(uri, docEntry.contentVersionId);
            }
            catch (e) {
                console.error(`Failed to parse URI from database entry: ${docEntry.uri}`, e);
            }
        }
        // Build list of documents that are out of sync, new, or deleted
        const deletedDocs = new map_1.ResourceSet();
        const outOfSyncDocs = new map_1.ResourceSet();
        for (const [dbDocUri, dbDocContentId] of dbDocsToContentIds) {
            const inDocContentId = inDocsToContentIds.get(dbDocUri);
            if (!inDocContentId) {
                // Document is not in the workspace anymore
                deletedDocs.add(dbDocUri);
            }
            else if (inDocContentId !== dbDocContentId) {
                outOfSyncDocs.add(dbDocUri);
            }
        }
        // Any new docs in the input that aren't in the db
        const newDocs = new map_1.ResourceSet();
        for (const uri of inDocsToContentIds.keys()) {
            if (!dbDocsToContentIds.has(uri)) {
                newDocs.add(uri);
            }
        }
        this.delete(Array.from(deletedDocs));
        return { outOfSyncDocs, newDocs, deletedDocs };
    }
    async isUpToDate(toCheck) {
        return this.getDocContentVersionId(toCheck.uri) === await toCheck.getContentVersionId();
    }
    getDocContentVersionId(uri) {
        const result = this.db.prepare('SELECT contentVersionId FROM Documents WHERE uri = ?').get(uri.toString());
        return result?.contentVersionId;
    }
    async addOrUpdate(documents) {
        const chunkLimiter = new async_1.Limiter(20);
        try {
            const toUpdate = await Promise.all(documents.map(async (doc) => {
                try {
                    if (await this.isUpToDate(doc)) {
                        return;
                    }
                    return {
                        uri: doc.uri,
                        getDoc: async () => {
                            const chunks = [];
                            for (const chunk of await chunkLimiter.queue(() => doc.getChunks())) {
                                // TODO: See if we can compute the tf lazily
                                // The challenge is that we need to also update the `chunkOccurrences`
                                // and all of those updates need to get flushed before the real tfidf of
                                // anything is computed.
                                const tf = termFrequencies(chunk.text);
                                chunks.push({ chunk, tf });
                            }
                            return ({ contentVersionId: await doc.getContentVersionId(), chunks });
                        }
                    };
                }
                catch {
                    // noop
                }
            }));
            await this.addOrUpdateDocs(toUpdate.filter((doc) => !!doc));
        }
        finally {
            chunkLimiter.dispose();
        }
    }
    delete(uris) {
        this.db.exec('BEGIN TRANSACTION');
        for (const uri of uris) {
            const doc = this.getDoc(uri);
            if (!doc) {
                continue;
            }
            this.db.prepare(`
				DELETE FROM Documents WHERE uri = ?
			`).run(uri.toString());
            this._cachedChunkCount = undefined;
            const allOccurrences = countRecordFrom(doc.chunks.flatMap(chunk => Object.keys(chunk.tf)));
            for (const [term, count] of Object.entries(allOccurrences)) {
                this.db.prepare(`
					UPDATE ChunkOccurrences
					SET chunkCount = chunkCount - ?
					WHERE term = ?;
				`).run(count, term);
            }
        }
        this.db.exec('COMMIT');
        this.db.prepare(`
			DELETE FROM ChunkOccurrences
			WHERE chunkCount < 1;
		`).run();
    }
    get fileCount() {
        return this.db.prepare(`SELECT COUNT(*) as count FROM Documents`).get().count ?? 0;
    }
    /**
     * Rank the documents by their cosine similarity to a set of search queries.
     */
    async search(query, options) {
        const heap = new SimpleHeap(options?.maxResults ?? Infinity, -Infinity);
        const queryEmbeddings = this.computeEmbeddings(query);
        if (!queryEmbeddings.size) {
            return [];
        }
        const idfCache = new Map();
        for (const entry of await this.getAllChunksWithTerms(Array.from(queryEmbeddings.keys()))) {
            if (!(0, glob_1.shouldInclude)(entry.chunk.file, options?.globPatterns)) {
                continue;
            }
            const score = this.score(entry, queryEmbeddings, idfCache);
            if (score > 0) {
                heap.add(score, entry.chunk);
            }
        }
        return heap.toArray(options?.maxSpread);
    }
    computeEmbeddings(input) {
        const tf = termFrequencies(input);
        return this.computeTfidf(tf);
    }
    score(chunk, queryEmbedding, idfCache) {
        // Compute the dot product between the chunk's embedding and the query embedding
        // Note that the chunk embedding is computed lazily on a per-term basis.
        // This lets us skip a large number of calculations because the majority
        // of chunks do not share any terms with the query.
        let sum = 0;
        for (const [term, termTfidf] of queryEmbedding.entries()) {
            const chunkTf = chunk.tf[term];
            if (!chunkTf) {
                // Term does not appear in chunk so it has no contribution
                continue;
            }
            let chunkIdf = idfCache.get(term);
            if (typeof chunkIdf !== 'number') {
                chunkIdf = this.idf(term);
                idfCache.set(term, chunkIdf);
            }
            const chunkTfidf = chunkTf * chunkIdf;
            sum += chunkTfidf * termTfidf;
        }
        return sum;
    }
    idf(term) {
        const chunkOccurrences = this.getChunkOccurrences(term) ?? 0;
        return chunkOccurrences > 0
            ? Math.log((this.getChunkCount() + 1) / chunkOccurrences)
            : 0;
    }
    computeTfidf(termFrequencies) {
        const embedding = new Map();
        for (const [word, occurrences] of Object.entries(termFrequencies)) {
            const idf = this.idf(word);
            if (idf > 0) {
                embedding.set(word, occurrences * idf);
            }
        }
        return embedding;
    }
    getChunkCount() {
        if (typeof this._cachedChunkCount === 'number') {
            return this._cachedChunkCount;
        }
        const result = this.db.prepare('SELECT COUNT(*) as count FROM Chunks').get();
        return result?.count ?? 0;
    }
    getChunkOccurrences(term) {
        const result = this.db.prepare('SELECT chunkCount FROM ChunkOccurrences WHERE term = ?').get(term);
        return result?.chunkCount ?? 0;
    }
    async addOrUpdateDocs(docs) {
        this._cachedChunkCount = undefined;
        // Track this for the entire set of documents so we can do a single update
        const allChunkOccurrences = Object.create(null);
        const processBatch = (docs) => {
            // Delete existing documents
            // This should also clear the chunks and terms due to the foreign key constraints
            this.delete(docs.map(doc => doc.uri));
            this.db.exec('BEGIN TRANSACTION');
            try {
                for (const { uri, doc } of docs) {
                    // Add new the document
                    const docId = this.db.prepare('INSERT OR REPLACE INTO Documents (uri, contentVersionId) VALUES (?, ?)')
                        .run(uri.toString(), doc.contentVersionId)
                        .lastInsertRowid;
                    // Insert new chunks
                    const insertChunkOp = this.db.prepare('INSERT INTO Chunks (documentId, text, startLineNumber, startColumn, endLineNumber, endColumn, isFullFile, termFrequencies) VALUES (?, ?, ?, ?, ?, ?, ?, jsonb(?))');
                    for (const chunk of doc.chunks) {
                        insertChunkOp.run(docId, chunk.chunk.text, chunk.chunk.range.startLineNumber, chunk.chunk.range.startColumn, chunk.chunk.range.endLineNumber, chunk.chunk.range.endColumn, chunk.chunk.isFullFile ? 1 : 0, JSON.stringify(chunk.tf));
                        for (const term of Object.keys(chunk.tf)) {
                            allChunkOccurrences[term] = (allChunkOccurrences[term] ?? 0) + 1;
                        }
                    }
                }
                this.db.exec('COMMIT');
            }
            catch (e) {
                this.db.exec('ROLLBACK');
                throw e;
            }
        };
        const batchSize = 200;
        const batch = [];
        for (const doc of docs) {
            batch.push({ uri: doc.uri, doc: await doc.getDoc() });
            if (batch.length >= batchSize) {
                processBatch(batch);
                batch.length = 0;
            }
        }
        // Process any remaining documents
        processBatch(batch);
        // Update occurrences list
        const insertOccurrencesOp = this.db.prepare(`
			INSERT INTO ChunkOccurrences (term, chunkCount)
			VALUES (?, ?)
			ON CONFLICT(term) DO UPDATE SET chunkCount = chunkCount + ?;
		`);
        this.db.exec('BEGIN TRANSACTION');
        for (const [term, count] of Object.entries(allChunkOccurrences)) {
            insertOccurrencesOp.run(term, count, count);
        }
        this.db.exec('COMMIT');
    }
    getDoc(uri) {
        const doc = this.db.prepare('SELECT id, contentVersionId FROM Documents WHERE uri = ?').get(uri.toString());
        if (!doc) {
            return undefined;
        }
        const chunks = this.db.prepare('SELECT text, startLineNumber, startColumn, endLineNumber, endColumn, isFullFile, json(termFrequencies) as termFrequencies FROM Chunks WHERE documentId = ?').all(doc.id);
        return {
            contentVersionId: doc.contentVersionId,
            chunks: chunks.map(row => {
                return this.reviveDocumentChunkEntry({ ...row, uri: uri.toString() });
            })
        };
    }
    async getAllChunksWithTerms(searchTerms) {
        if (!searchTerms.length) {
            return [];
        }
        const chunkResults = this.db.prepare(`
			SELECT c.id, c.documentId, c.text, c.startLineNumber, c.startColumn, c.endLineNumber, c.endColumn, c.isFullFile,
				json(c.termFrequencies) as termFrequencies, d.uri
			FROM Chunks c
			JOIN Documents d ON c.documentId = d.id
			WHERE EXISTS (
				SELECT 1 FROM json_each(c.termFrequencies)
				WHERE json_each.key IN (${searchTerms.map(_ => `?`).join(',')})
			)
		`).all(...searchTerms);
        return iterator_1.Iterable.map(chunkResults, row => this.reviveDocumentChunkEntry(row));
    }
    reviveDocumentChunkEntry(row) {
        return {
            tf: JSON.parse(row.termFrequencies),
            get chunk() {
                return {
                    file: uri_1.URI.isUri(row.uri) ? row.uri : uri_1.URI.parse(row.uri),
                    text: row.text,
                    rawText: row.text,
                    range: new range_1.Range(row.startLineNumber, row.startColumn, row.endLineNumber, row.endColumn),
                    isFullFile: Boolean(row.isFullFile)
                };
            }
        };
    }
}
exports.PersistentTfIdf = PersistentTfIdf;
//# sourceMappingURL=tfidf.js.map