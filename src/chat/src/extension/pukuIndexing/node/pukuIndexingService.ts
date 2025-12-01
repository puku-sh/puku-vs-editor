/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { createServiceIdentifier } from '../../../util/common/services';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService, PukuAuthStatus } from '../common/pukuAuth';
import { PukuEmbeddingsCache, PukuChunkWithEmbedding } from './pukuEmbeddingsCache';
import { pukuASTChunker, ChunkType } from './pukuASTChunker';
import { PukuSummaryGenerator } from './pukuSummaryGenerator';

/**
 * Compute cosine similarity between two vectors
 * Exported for testing purposes
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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
 * Indexing status
 */
export enum PukuIndexingStatus {
	Idle = 'idle',
	Initializing = 'initializing',
	Indexing = 'indexing',
	Ready = 'ready',
	Error = 'error',
	Disabled = 'disabled',
}

/**
 * Indexing progress info
 */
export interface PukuIndexingProgress {
	readonly status: PukuIndexingStatus;
	readonly totalFiles: number;
	readonly indexedFiles: number;
	readonly currentFile?: string;
	readonly errorMessage?: string;
}

/**
 * Indexed file info
 */
export interface PukuIndexedFile {
	readonly uri: vscode.Uri;
	readonly chunks: number;
	readonly lastIndexed: number;
}

export const IPukuIndexingService = createServiceIdentifier<IPukuIndexingService>('IPukuIndexingService');

export interface IPukuIndexingService {
	readonly _serviceBrand: undefined;

	/**
	 * Event fired when indexing status changes
	 */
	readonly onDidChangeStatus: Event<PukuIndexingProgress>;

	/**
	 * Event fired when indexing completes
	 */
	readonly onDidCompleteIndexing: Event<void>;

	/**
	 * Current indexing status
	 */
	readonly status: PukuIndexingStatus;

	/**
	 * Current progress
	 */
	readonly progress: PukuIndexingProgress;

	/**
	 * Check if indexing is available
	 */
	isAvailable(): boolean;

	/**
	 * Initialize the indexing service
	 */
	initialize(): Promise<void>;

	/**
	 * Start indexing the workspace
	 */
	startIndexing(): Promise<void>;

	/**
	 * Stop indexing
	 */
	stopIndexing(): void;

	/**
	 * Get indexed files
	 */
	getIndexedFiles(): PukuIndexedFile[];

	/**
	 * Search indexed content
	 */
	search(query: string, limit?: number, languageId?: string): Promise<SearchResult[]>;
}

/**
 * Search result from indexed content
 */
export interface SearchResult {
	readonly uri: vscode.Uri;
	readonly content: string;
	readonly score: number;
	readonly lineStart: number;
	readonly lineEnd: number;
	readonly chunkType?: ChunkType; // AST-based chunk type (function, class, etc.)
	readonly symbolName?: string;    // Function/class name extracted by tree-sitter
}

/**
 * Puku Indexing Service - handles workspace file indexing using Puku embeddings
 *
 * Uses SQLite for persistent storage of embeddings (like Copilot's workspaceChunkAndEmbeddingCache)
 */
export class PukuIndexingService extends Disposable implements IPukuIndexingService {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeStatus = this._register(new Emitter<PukuIndexingProgress>());
	readonly onDidChangeStatus = this._onDidChangeStatus.event;

	private readonly _onDidCompleteIndexing = this._register(new Emitter<void>());
	readonly onDidCompleteIndexing = this._onDidCompleteIndexing.event;

	private _status: PukuIndexingStatus = PukuIndexingStatus.Idle;
	private _progress: PukuIndexingProgress = {
		status: PukuIndexingStatus.Idle,
		totalFiles: 0,
		indexedFiles: 0,
	};

	private _cache: PukuEmbeddingsCache | undefined;
	private _summaryGenerator: PukuSummaryGenerator | undefined;
	private _indexedFiles: Map<string, PukuIndexedFile> = new Map();

	private _isIndexing = false;
	private _cancelIndexing = false;
	private _fileWatcher: vscode.FileSystemWatcher | undefined;
	private _pendingReindex: Set<string> = new Set();
	private _reindexDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		@IPukuAuthService private readonly _authService: IPukuAuthService,
	) {
		super();

		// Listen for auth status changes
		this._register(this._authService.onDidChangeAuthStatus((status) => {
			if (status === PukuAuthStatus.Authenticated) {
				console.log('[PukuIndexing] Auth ready, starting indexing initialization');
				this.initialize().catch(err => {
					console.error('[PukuIndexing] Failed to initialize after auth ready:', err);
				});
			} else if (status === PukuAuthStatus.Unauthenticated) {
				this._setStatus(PukuIndexingStatus.Disabled);
			}
		}));

		// Set up file watcher for automatic re-indexing
		this._setupFileWatcher();
	}

	/**
	 * Set up file watcher to detect changes and trigger re-indexing
	 */
	private _setupFileWatcher(): void {
		// Watch for changes in supported file types
		const pattern = '**/*.{ts,tsx,js,jsx,py,java,c,cpp,h,hpp,cs,go,rs,rb,php,swift,kt,scala,vue,svelte,md,json,yaml,yml,toml}';
		this._fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

		console.log('[PukuIndexing] File watcher initialized');

		// On file change - queue for re-indexing (only log if not excluded)
		this._register(this._fileWatcher.onDidChange((uri) => {
			if (!this._isExcludedPath(uri.fsPath)) {
				console.log('[PukuIndexing] File change detected:', uri.fsPath);
			}
			this._queueFileForReindex(uri);
		}));

		// On file create - queue for indexing
		this._register(this._fileWatcher.onDidCreate((uri) => {
			if (!this._isExcludedPath(uri.fsPath)) {
				console.log('[PukuIndexing] File create detected:', uri.fsPath);
			}
			this._queueFileForReindex(uri);
		}));

		// On file delete - remove from cache
		this._register(this._fileWatcher.onDidDelete((uri) => {
			if (!this._isExcludedPath(uri.fsPath)) {
				console.log('[PukuIndexing] File delete detected:', uri.fsPath);
			}
			this._removeFileFromIndex(uri);
		}));

		this._register(this._fileWatcher);
	}

	/**
	 * Check if a path should be excluded from indexing
	 */
	private _isExcludedPath(path: string): boolean {
		return path.includes('node_modules') || path.includes('.git') || path.includes('dist') ||
			path.includes('build') || path.includes('.next') || path.includes('.puku') ||
			path.includes('out') || path.includes('.vscode-test');
	}

	/**
	 * Queue a file for re-indexing with debouncing
	 */
	private _queueFileForReindex(uri: vscode.Uri): void {
		// Skip if not available or currently doing full indexing
		if (!this.isAvailable()) {
			return; // Silent skip - too noisy otherwise
		}
		if (this._isIndexing) {
			return; // Silent skip during full indexing
		}

		// Skip files in excluded directories
		if (this._isExcludedPath(uri.fsPath)) {
			return; // Silent skip for excluded paths
		}

		this._pendingReindex.add(uri.toString());
		console.log(`[PukuIndexing] File queued for re-index: ${uri.fsPath}`);

		// Debounce: wait 2 seconds after last change before re-indexing
		if (this._reindexDebounceTimer) {
			clearTimeout(this._reindexDebounceTimer);
		}

		this._reindexDebounceTimer = setTimeout(() => {
			this._processReindexQueue();
		}, 2000);
	}

	/**
	 * Process the queue of files pending re-indexing
	 */
	private async _processReindexQueue(): Promise<void> {
		if (this._pendingReindex.size === 0 || !this._cache || !this.isAvailable()) {
			return;
		}

		const files = Array.from(this._pendingReindex);
		this._pendingReindex.clear();

		console.log(`[PukuIndexing] Re-indexing ${files.length} changed files`);

		for (const uriString of files) {
			try {
				const uri = vscode.Uri.parse(uriString);
				const result = await this._indexFile(uri);
				if (result === 'indexed') {
					console.log(`[PukuIndexing] Re-indexed: ${uri.fsPath}`);
				}
			} catch (error) {
				console.error(`[PukuIndexing] Error re-indexing ${uriString}:`, error);
			}
		}
	}

	/**
	 * Remove a file from the index (when deleted)
	 */
	private _removeFileFromIndex(uri: vscode.Uri): void {
		if (!this._cache) {
			return;
		}

		const uriString = uri.toString();
		if (this._indexedFiles.has(uriString)) {
			this._cache.removeFile(uriString);
			this._indexedFiles.delete(uriString);
			console.log(`[PukuIndexing] Removed from index: ${uri.fsPath}`);
		}
	}

	get status(): PukuIndexingStatus {
		return this._status;
	}

	get progress(): PukuIndexingProgress {
		return this._progress;
	}

	isAvailable(): boolean {
		return this._authService.isReady();
	}

	async initialize(): Promise<void> {
		this._setStatus(PukuIndexingStatus.Initializing);

		try {
			// Initialize auth
			await this._authService.initialize();

			if (!this._authService.isReady()) {
				console.log('[PukuIndexing] Auth not ready, indexing disabled');
				this._setStatus(PukuIndexingStatus.Disabled);
				return;
			}

			// Initialize SQLite cache
			const storageUri = vscode.workspace.workspaceFolders?.[0]
				? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.puku')
				: undefined;

			this._cache = new PukuEmbeddingsCache(storageUri);
			await this._cache.initialize();

			// Initialize summary generator with database access for job tracking
			this._summaryGenerator = new PukuSummaryGenerator(this._authService, this._cache.db);

			// Log cache stats
			const stats = this._cache.getStats();
			console.log(`[PukuIndexing] Initialized - SQLite cache: ${stats.fileCount} files, ${stats.chunkCount} chunks`);

			// If we have cached data, load it
			if (stats.fileCount > 0) {
				this._loadFromCache();
				console.log(`[PukuIndexing] Loaded ${this._indexedFiles.size} files from cache`);
				this._setStatus(PukuIndexingStatus.Ready);
			} else {
				this._setStatus(PukuIndexingStatus.Idle);
				// Auto-start indexing for fresh cache
				console.log('[PukuIndexing] Fresh cache detected, starting automatic indexing');
				this.startIndexing().catch(err => {
					console.error('[PukuIndexing] Auto-indexing failed:', err);
				});
			}
		} catch (error) {
			console.error('[PukuIndexing] Initialization failed:', error);
			this._setStatus(PukuIndexingStatus.Error, String(error));
		}
	}

	private _loadFromCache(): void {
		if (!this._cache) {
			return;
		}

		// Group chunks by file to build indexed files list
		const chunks = this._cache.getAllChunks();
		const fileChunkCounts = new Map<string, number>();

		for (const chunk of chunks) {
			const count = fileChunkCounts.get(chunk.uri) || 0;
			fileChunkCounts.set(chunk.uri, count + 1);
		}

		for (const [uri, count] of fileChunkCounts) {
			this._indexedFiles.set(uri, {
				uri: vscode.Uri.parse(uri),
				chunks: count,
				lastIndexed: Date.now(),
			});
		}
	}

	async startIndexing(): Promise<void> {
		if (this._isIndexing) {
			console.log('[PukuIndexing] Already indexing');
			return;
		}

		if (!this.isAvailable()) {
			console.log('[PukuIndexing] Not available, skipping indexing. Auth ready:', this._authService.isReady());
			return;
		}

		if (!this._cache) {
			console.log('[PukuIndexing] Cache not initialized');
			return;
		}

		this._isIndexing = true;
		this._cancelIndexing = false;
		this._setStatus(PukuIndexingStatus.Indexing);

		try {
			// Get workspace files
			console.log('[PukuIndexing] Getting workspace files...');
			const files = await this._getWorkspaceFiles();
			console.log(`[PukuIndexing] Found ${files.length} files to index`);

			if (files.length > 0) {
				console.log('[PukuIndexing] First few files:', files.slice(0, 3).map(f => f.fsPath));
			}

			this._updateProgress({
				status: PukuIndexingStatus.Indexing,
				totalFiles: files.length,
				indexedFiles: 0,
			});

			console.log(`[PukuIndexing] Starting to index ${files.length} files`);

			let newFilesIndexed = 0;
			let cachedFiles = 0;

			for (let i = 0; i < files.length; i++) {
				if (this._cancelIndexing) {
					console.log('[PukuIndexing] Indexing cancelled');
					break;
				}

				const file = files[i];
				try {
					const wasIndexed = await this._indexFile(file);
					if (wasIndexed === 'cached') {
						cachedFiles++;
					} else if (wasIndexed === 'indexed') {
						newFilesIndexed++;
					}

					this._updateProgress({
						status: PukuIndexingStatus.Indexing,
						totalFiles: files.length,
						indexedFiles: i + 1,
						currentFile: file.fsPath,
					});
				} catch (error) {
					console.error(`[PukuIndexing] Error indexing ${file.fsPath}:`, error);
				}
			}

			if (!this._cancelIndexing) {
				this._setStatus(PukuIndexingStatus.Ready);
				this._onDidCompleteIndexing.fire();

				const stats = this._cache.getStats();
				console.log(`[PukuIndexing] Indexing complete. ${stats.fileCount} files (${newFilesIndexed} new, ${cachedFiles} cached), ${stats.chunkCount} chunks`);
			}
		} catch (error) {
			console.error('[PukuIndexing] Indexing failed:', error);
			this._setStatus(PukuIndexingStatus.Error, String(error));
		} finally {
			this._isIndexing = false;
		}
	}

	stopIndexing(): void {
		if (this._isIndexing) {
			this._cancelIndexing = true;
			console.log('[PukuIndexing] Stopping indexing...');
		}
	}

	getIndexedFiles(): PukuIndexedFile[] {
		return Array.from(this._indexedFiles.values());
	}

	async search(query: string, limit: number = 10, languageId?: string): Promise<SearchResult[]> {
		if (!this._cache) {
			return [];
		}

		const allChunks = this._cache.getAllChunks();
		if (allChunks.length === 0) {
			return [];
		}

		// Filter by languageId if specified
		const filteredChunks = languageId
			? allChunks.filter(chunk => chunk.languageId === languageId)
			: allChunks;

		if (filteredChunks.length === 0) {
			return [];
		}

		try {
			// Get query embedding
			const queryEmbedding = await this._computeEmbedding(query);
			if (!queryEmbedding || queryEmbedding.length === 0) {
				return [];
			}

			// Score all chunks
			const scores: Array<{ chunk: PukuChunkWithEmbedding; score: number }> = [];

			for (const chunk of filteredChunks) {
				const score = this._cosineSimilarity(queryEmbedding, chunk.embedding);
				scores.push({ chunk, score });
			}

			// Sort by score and take top results
			scores.sort((a, b) => b.score - a.score);
			const topScores = scores.slice(0, limit);

			// Build results
			return topScores.map(({ chunk, score }) => ({
				uri: vscode.Uri.parse(chunk.uri),
				content: chunk.text,
				score,
				lineStart: chunk.lineStart,
				lineEnd: chunk.lineEnd,
				chunkType: chunk.chunkType,
				symbolName: chunk.symbolName,
			}));
		} catch (error) {
			console.error('[PukuIndexing] Search failed:', error);
			return [];
		}
	}

	private async _getWorkspaceFiles(): Promise<vscode.Uri[]> {
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return [];
		}

		// Find relevant files (code files, not too large)
		const pattern = '**/*.{ts,tsx,js,jsx,py,java,c,cpp,h,hpp,cs,go,rs,rb,php,swift,kt,scala,vue,svelte,md,json,yaml,yml,toml}';
		const excludePattern = '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/target/**,**/vendor/**,**/.puku/**';

		const files = await vscode.workspace.findFiles(pattern, excludePattern, 1000);
		return files;
	}

	private async _indexFile(uri: vscode.Uri): Promise<'cached' | 'indexed' | 'skipped'> {
		if (!this._cache) {
			console.log(`[PukuIndexing] _indexFile: skipped (no cache) - ${uri.fsPath}`);
			return 'skipped';
		}

		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();
			const languageId = document.languageId;

			// Skip empty or very large files
			if (!content || content.length === 0) {
				console.log(`[PukuIndexing] _indexFile: skipped (empty) - ${uri.fsPath}`);
				return 'skipped';
			}
			if (content.length > 100000) {
				console.log(`[PukuIndexing] _indexFile: skipped (too large: ${content.length}) - ${uri.fsPath}`);
				return 'skipped';
			}

			// Compute content hash
			const contentHash = crypto.createHash('md5').update(content).digest('hex');

			// Check if already indexed with same content
			if (this._cache.isIndexed(uri.toString(), contentHash)) {
				// Already indexed and up-to-date
				const chunks = this._cache.getChunksForFile(uri.toString());
				this._indexedFiles.set(uri.toString(), {
					uri,
					chunks: chunks.length,
					lastIndexed: Date.now(),
				});
				console.log(`[PukuIndexing] _indexFile: cached (${chunks.length} chunks) - ${uri.fsPath}`);
				return 'cached';
			}

			// Chunk the content using AST-based chunking (Cursor-like approach)
			const semanticChunks = await pukuASTChunker.chunkContent(content, languageId);
			if (semanticChunks.length === 0) {
				console.log(`[PukuIndexing] _indexFile: skipped (no chunks from AST) - ${uri.fsPath}`);
				return 'skipped';
			}

			console.log(`[PukuIndexing] _indexFile: ${semanticChunks.length} chunks from AST - ${uri.fsPath}`);

			// Generate natural language summaries for each chunk using LLM with parallel job processing
			let summaries: string[] = [];
			let fileId: number | undefined;
			if (this._summaryGenerator && this._cache) {
				try {
					// Get or create temporary file ID for job tracking
					fileId = this._cache.getOrCreateTemporaryFileId(uri.toString(), contentHash, languageId);

					// Generate summaries with parallel jobs (if fileId available)
					summaries = await this._summaryGenerator.generateSummariesBatch(
						semanticChunks,
						languageId,
						fileId
					);
					console.log(`[PukuIndexing] _indexFile: ${summaries.length}/${semanticChunks.length} summaries generated - ${uri.fsPath}`);
				} catch (error) {
					console.error(`[PukuIndexing] _indexFile: summary generation failed, using fallback - ${uri.fsPath}:`, error);
					// Fallback to empty summaries if LLM fails
					summaries = semanticChunks.map(() => '');
				}
			} else {
				// No summary generator available
				summaries = semanticChunks.map(() => '');
			}

			// Compute embeddings for summaries (not raw code) to improve semantic search
			// When user writes "// send email notification", it will match summary "function that sends email..."
			const textsToEmbed = summaries.map((summary, i) =>
				summary || semanticChunks[i].text // Fallback to raw code if no summary
			);
			const embeddings = await this._computeEmbeddingsBatch(textsToEmbed);

			const validEmbeddings = embeddings.filter(e => e && e.length > 0).length;
			console.log(`[PukuIndexing] _indexFile: ${validEmbeddings}/${embeddings.length} valid embeddings - ${uri.fsPath}`);

			const chunksWithEmbeddings: Array<{
				text: string;
				summary?: string;
				lineStart: number;
				lineEnd: number;
				embedding: number[];
				chunkType: ChunkType;
				symbolName?: string;
			}> = [];

			for (let i = 0; i < semanticChunks.length; i++) {
				const chunk = semanticChunks[i];
				const embedding = embeddings[i];
				if (embedding && embedding.length > 0) {
					chunksWithEmbeddings.push({
						text: chunk.text,
						summary: summaries[i] || undefined,
						lineStart: chunk.lineStart,
						lineEnd: chunk.lineEnd,
						embedding,
						chunkType: chunk.chunkType,
						symbolName: chunk.symbolName,
					});
				}
			}

			if (chunksWithEmbeddings.length > 0) {
				// Store in SQLite cache
				this._cache.storeFile(uri.toString(), contentHash, languageId, chunksWithEmbeddings);

				this._indexedFiles.set(uri.toString(), {
					uri,
					chunks: chunksWithEmbeddings.length,
					lastIndexed: Date.now(),
				});

				console.log(`[PukuIndexing] _indexFile: indexed (${chunksWithEmbeddings.length} chunks stored) - ${uri.fsPath}`);
				return 'indexed';
			}

			console.log(`[PukuIndexing] _indexFile: skipped (no valid embeddings) - ${uri.fsPath}`);
			return 'skipped';
		} catch (error) {
			// File might be binary or inaccessible
			console.error(`[PukuIndexing] _indexFile: error - ${uri.fsPath}:`, error);
			return 'skipped';
		}
	}

	private _chunkContent(content: string): Array<{ text: string; lineStart: number; lineEnd: number }> {
		const chunks: Array<{ text: string; lineStart: number; lineEnd: number }> = [];
		const lines = content.split('\n');
		const chunkSize = 50; // lines per chunk
		const overlap = 10; // overlapping lines

		for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
			const lineStart = i;
			const lineEnd = Math.min(i + chunkSize, lines.length);
			const chunkLines = lines.slice(lineStart, lineEnd);
			const text = chunkLines.join('\n').trim();

			if (text.length > 50) { // Skip very small chunks
				chunks.push({
					text,
					lineStart: lineStart + 1, // 1-indexed
					lineEnd,
				});
			}
		}

		return chunks;
	}

	/**
	 * Compute embeddings for multiple texts in a single batch API call
	 * Much more efficient than computing one at a time
	 */
	private async _computeEmbeddingsBatch(texts: string[]): Promise<Array<number[] | null>> {
		if (texts.length === 0) {
			return [];
		}

		const token = await this._authService.getToken();
		if (!token) {
			console.log('[PukuIndexing] _computeEmbeddingsBatch: no auth token available');
			return texts.map(() => null);
		}
		console.log(`[PukuIndexing] _computeEmbeddingsBatch: using endpoint ${token.endpoints.embeddings}`)

		try {
			console.log(`[PukuIndexing] Computing embeddings for ${texts.length} chunks in batch`);
			console.log(`[PukuIndexing] Using token: ${token.token?.substring(0, 10)}... (length: ${token.token?.length})`);

			// Send all texts in a single API call
			const response = await fetch(token.endpoints.embeddings, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token.token}`,
				},
				body: JSON.stringify({
					input: texts, // Batch all texts in one request
				}),
			});

			if (!response.ok) {
				console.error('[PukuIndexing] Batch embedding request failed:', response.status);
				const errorText = await response.text();
				console.error('[PukuIndexing] Error response:', errorText);
				return texts.map(() => null);
			}

			const data = await response.json();
			if (data.data && Array.isArray(data.data)) {
				// Sort by index to ensure correct order
				const sorted = [...data.data].sort((a, b) => a.index - b.index);
				return sorted.map((item: { embedding: number[] }) => item.embedding || null);
			}

			return texts.map(() => null);
		} catch (error) {
			console.error('[PukuIndexing] Batch embedding computation failed:', error);
			return texts.map(() => null);
		}
	}

	/**
	 * Compute embedding for a single text (used for search queries)
	 */
	private async _computeEmbedding(text: string): Promise<number[] | null> {
		const results = await this._computeEmbeddingsBatch([text]);
		return results[0] || null;
	}

	private _cosineSimilarity(a: number[], b: number[]): number {
		return cosineSimilarity(a, b);
	}

	private _setStatus(status: PukuIndexingStatus, errorMessage?: string): void {
		this._status = status;
		this._updateProgress({
			...this._progress,
			status,
			errorMessage,
		});
	}

	private _updateProgress(progress: PukuIndexingProgress): void {
		this._progress = progress;
		this._onDidChangeStatus.fire(progress);
	}

	override dispose(): void {
		this.stopIndexing();
		if (this._reindexDebounceTimer) {
			clearTimeout(this._reindexDebounceTimer);
		}
		this._cache?.dispose();
		super.dispose();
	}
}
