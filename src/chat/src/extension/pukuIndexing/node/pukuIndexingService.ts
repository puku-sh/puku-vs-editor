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
import { IPukuConfigService } from '../common/pukuConfig';
import { PukuEmbeddingsCache, PukuChunkWithEmbedding } from './pukuEmbeddingsCache';
import { pukuASTChunker, ChunkType } from './pukuASTChunker';
import { PukuSummaryGenerator } from './pukuSummaryGenerator';
import { PukuExclusionService } from './pukuExclusionService';

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
	 * Check if indexing is available (async - checks for auth token)
	 */
	isAvailable(): Promise<boolean>;

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

	/**
	 * Compute embedding for a single text (used for search queries and diagnostics)
	 */
	computeEmbedding(text: string): Promise<number[] | null>;
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
	private _exclusionService: PukuExclusionService | undefined;
	private _indexedFiles: Map<string, PukuIndexedFile> = new Map();

	private _isIndexing = false;
	private _cancelIndexing = false;
	private _fileWatcher: vscode.FileSystemWatcher | undefined;
	private _pendingReindex: Set<string> = new Set();
	private _reindexDebounceTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuConfigService private readonly _configService: IPukuConfigService,
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
			this._queueFileForReindex(uri);
		}));

		// On file create - queue for indexing
		this._register(this._fileWatcher.onDidCreate((uri) => {
			this._queueFileForReindex(uri);
		}));

		// On file delete - remove from cache
		this._register(this._fileWatcher.onDidDelete((uri) => {
			this._removeFileFromIndex(uri);
		}));

		this._register(this._fileWatcher);
	}

	/**
	 * Check if a path should be excluded from indexing
	 * Delegates to PukuExclusionService for centralized exclusion logic
	 */
	private async _isExcludedPath(path: string): Promise<boolean> {
		if (!this._exclusionService) {
			return false;
		}
		return await this._exclusionService.shouldExclude(path);
	}

	/**
	 * Queue a file for re-indexing with debouncing
	 */
	private async _queueFileForReindex(uri: vscode.Uri): Promise<void> {
		// Skip if not available or currently doing full indexing
		if (!this._isAuthReady()) {
			return; // Silent skip - too noisy otherwise
		}
		if (this._isIndexing) {
			return; // Silent skip during full indexing
		}

		// Skip files in excluded directories
		if (await this._isExcludedPath(uri.fsPath)) {
			return; // Silent skip for excluded paths
		}

		this._pendingReindex.add(uri.toString());

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
		if (this._pendingReindex.size === 0 || !this._cache || !this._isAuthReady()) {
			return;
		}

		const files = Array.from(this._pendingReindex);
		this._pendingReindex.clear();

		for (const uriString of files) {
			try {
				const uri = vscode.Uri.parse(uriString);
				await this._indexFile(uri);
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
		}
	}

	get status(): PukuIndexingStatus {
		return this._status;
	}

	get progress(): PukuIndexingProgress {
		return this._progress;
	}

	async isAvailable(): Promise<boolean> {
		// Use same auth pattern as FIM - actively try to get token
		const token = await this._authService.getToken();
		return !!token;
	}

	/**
	 * Internal sync check for auth status (for use in event handlers/private methods)
	 */
	private _isAuthReady(): boolean {
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

			// Initialize exclusion service (handles .gitignore, user settings, etc.)
			const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
			if (workspaceRoot) {
				this._exclusionService = new PukuExclusionService(this._configService);
				await this._exclusionService.initialize(workspaceRoot);

				// Log exclusion stats
				const exclusionStats = this._exclusionService.getStats();
				console.log('[PukuIndexing] Exclusion service initialized:', exclusionStats);
			}

			// Initialize SQLite cache
			const storageUri = vscode.workspace.workspaceFolders?.[0]
				? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, '.puku')
				: undefined;

			this._cache = new PukuEmbeddingsCache(storageUri, this._configService);
			await this._cache.initialize();

			// Clean up excluded files from old indexing runs
			const excludedPatterns = ['node_modules', 'dist', 'build', '.next', '.git'];
			for (const pattern of excludedPatterns) {
				const removed = this._cache.removeFilesMatching(pattern);
				if (removed > 0) {
					console.log(`[PukuIndexing] Cleaned up ${removed} files matching '${pattern}'`);
				}
			}

			// Initialize summary generator with database access for job tracking
			this._summaryGenerator = new PukuSummaryGenerator(this._authService, this._configService, this._cache.db);

			// Log cache stats
			const stats = this._cache.getStats();
// 			console.log(`[PukuIndexing] Initialized - SQLite cache: ${stats.fileCount} files, ${stats.chunkCount} chunks`);

			// If we have cached data, load it
			if (stats.fileCount > 0) {
				this._loadFromCache();
				this._setStatus(PukuIndexingStatus.Ready);
			} else {
				this._setStatus(PukuIndexingStatus.Idle);
				// Auto-start indexing for fresh cache
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
			return;
		}

		if (!await this.isAvailable()) {
			return;
		}

		if (!this._cache) {
			return;
		}

		this._isIndexing = true;
		this._cancelIndexing = false;
		this._setStatus(PukuIndexingStatus.Indexing);

		try {
			// Get workspace files
			const files = await this._getWorkspaceFiles();
			console.log(`[PukuIndexing] Found ${files.length} files to potentially index`);

			this._updateProgress({
				status: PukuIndexingStatus.Indexing,
				totalFiles: files.length,
				indexedFiles: 0,
			});

			let newFilesIndexed = 0;
			let cachedFiles = 0;
			let skippedFiles = 0;

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
					} else if (wasIndexed === 'skipped') {
						skippedFiles++;
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
				console.log(`[PukuIndexing] ✅ Indexing complete:`, {
					totalFound: files.length,
					newlyIndexed: newFilesIndexed,
					cached: cachedFiles,
					skipped: skippedFiles,
					finalStats: `${stats.fileCount} files, ${stats.chunkCount} chunks`,
					indexedPercentage: `${Math.round((cachedFiles + newFilesIndexed) / files.length * 100)}%`
				});

				// Record exclusion statistics
				const exclusionStats = this._exclusionService.getStats();
				const filesIndexed = newFilesIndexed + cachedFiles;
				const filesExcluded = files.length - filesIndexed;
				this._cache.recordExclusionStats({
					totalFilesFound: files.length,
					filesIndexed,
					filesExcluded,
					projectTypes: this._exclusionService.getProjectTypes(),
					hasGitignore: exclusionStats.hasGitignore,
					forceIncludeCount: exclusionStats.forceIncludeCount,
					userExcludeCount: exclusionStats.userExcludeCount,
					vscodeExcludeCount: exclusionStats.vscodeExcludeCount,
					staticPatternCount: exclusionStats.staticPatternCount,
					autoExclusionCount: this._exclusionService.getAutoExclusionCount(),
				});
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
			const queryEmbedding = await this.computeEmbedding(query);
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
			return 'skipped';
		}

		// Skip excluded paths (node_modules, dist, etc.)
		if (await this._isExcludedPath(uri.fsPath)) {
			return 'skipped';
		}

		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();
			const languageId = document.languageId;

			// Skip empty or very large files
			if (!content || content.length === 0) {
				return 'skipped';
			}
			if (content.length > 100000) {
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
				return 'cached';
			}

			// Chunk the content using AST-based chunking (Cursor-like approach)
			const semanticChunks = await pukuASTChunker.chunkContent(content, languageId);
			if (semanticChunks.length === 0) {
				return 'skipped';
			}

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
			// Ensure we don't access out of bounds if summaries.length > chunks.length
			const textsToEmbed = summaries
				.slice(0, semanticChunks.length) // Limit to chunks length
				.map((summary, i) =>
					summary || semanticChunks[i].text // Fallback to raw code if no summary
				);
			const embeddings = await this._computeEmbeddingsBatch(textsToEmbed);


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

				return 'indexed';
			}

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
			return texts.map(() => null);
		}

		try {

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
	 * Compute embedding for a single text (used for search queries and diagnostics)
	 * Public API for other services to use
	 */
	async computeEmbedding(text: string): Promise<number[] | null> {
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
		this._exclusionService?.dispose();
		super.dispose();
	}
}
