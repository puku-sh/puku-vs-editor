/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { createServiceIdentifier } from '../../../util/common/services';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService, PukuAuthStatus } from '../common/pukuAuth';

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
	search(query: string, limit?: number): Promise<SearchResult[]>;
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
}

/**
 * Puku Indexing Service - handles workspace file indexing using Puku embeddings
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

	private _indexedFiles: Map<string, PukuIndexedFile> = new Map();
	private _embeddings: Map<string, number[][]> = new Map(); // uri -> chunk embeddings
	private _chunks: Map<string, string[]> = new Map(); // uri -> chunk texts

	private _isIndexing = false;
	private _cancelIndexing = false;

	constructor(
		@IPukuAuthService private readonly _authService: IPukuAuthService,
	) {
		super();

		// Listen for auth status changes
		this._register(this._authService.onDidChangeAuthStatus((status) => {
			if (status === PukuAuthStatus.Authenticated) {
				console.log('[PukuIndexing] Auth ready, can start indexing');
			} else if (status === PukuAuthStatus.Unauthenticated) {
				this._setStatus(PukuIndexingStatus.Disabled);
			}
		}));
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

			// Note: Model selection is handled by the proxy - we just need auth
			console.log('[PukuIndexing] Initialized - proxy handles model selection');
			this._setStatus(PukuIndexingStatus.Idle);
		} catch (error) {
			console.error('[PukuIndexing] Initialization failed:', error);
			this._setStatus(PukuIndexingStatus.Error, String(error));
		}
	}

	async startIndexing(): Promise<void> {
		if (this._isIndexing) {
			console.log('[PukuIndexing] Already indexing');
			return;
		}

		if (!this.isAvailable()) {
			console.log('[PukuIndexing] Not available, skipping indexing');
			return;
		}

		this._isIndexing = true;
		this._cancelIndexing = false;
		this._setStatus(PukuIndexingStatus.Indexing);

		try {
			// Get workspace files
			const files = await this._getWorkspaceFiles();
			this._updateProgress({
				status: PukuIndexingStatus.Indexing,
				totalFiles: files.length,
				indexedFiles: 0,
			});

			console.log(`[PukuIndexing] Starting to index ${files.length} files`);

			for (let i = 0; i < files.length; i++) {
				if (this._cancelIndexing) {
					console.log('[PukuIndexing] Indexing cancelled');
					break;
				}

				const file = files[i];
				try {
					await this._indexFile(file);
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
				console.log(`[PukuIndexing] Indexing complete. ${this._indexedFiles.size} files indexed`);
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

	async search(query: string, limit: number = 10): Promise<SearchResult[]> {
		if (this._indexedFiles.size === 0) {
			return [];
		}

		try {
			// Get query embedding
			const queryEmbedding = await this._computeEmbedding(query);
			if (!queryEmbedding || queryEmbedding.length === 0) {
				return [];
			}

			// Score all chunks
			const scores: Array<{ uri: string; chunkIndex: number; score: number }> = [];

			for (const [uri, embeddings] of this._embeddings) {
				for (let i = 0; i < embeddings.length; i++) {
					const score = this._cosineSimilarity(queryEmbedding, embeddings[i]);
					scores.push({ uri, chunkIndex: i, score });
				}
			}

			// Sort by score and take top results
			scores.sort((a, b) => b.score - a.score);
			const topScores = scores.slice(0, limit);

			// Build results
			const results: SearchResult[] = [];
			for (const { uri, chunkIndex, score } of topScores) {
				const chunks = this._chunks.get(uri);
				if (chunks && chunks[chunkIndex]) {
					results.push({
						uri: vscode.Uri.parse(uri),
						content: chunks[chunkIndex],
						score,
						lineStart: 0, // TODO: track line numbers
						lineEnd: 0,
					});
				}
			}

			return results;
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
		const excludePattern = '**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/target/**,**/vendor/**';

		const files = await vscode.workspace.findFiles(pattern, excludePattern, 1000);
		return files;
	}

	private async _indexFile(uri: vscode.Uri): Promise<void> {
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const content = document.getText();

			// Skip empty or very large files
			if (!content || content.length === 0 || content.length > 100000) {
				return;
			}

			// Chunk the content
			const chunks = this._chunkContent(content);
			if (chunks.length === 0) {
				return;
			}

			// Compute embeddings for all chunks
			const embeddings: number[][] = [];
			for (const chunk of chunks) {
				const embedding = await this._computeEmbedding(chunk);
				if (embedding) {
					embeddings.push(embedding);
				}
			}

			if (embeddings.length > 0) {
				const uriString = uri.toString();
				this._embeddings.set(uriString, embeddings);
				this._chunks.set(uriString, chunks);
				this._indexedFiles.set(uriString, {
					uri,
					chunks: chunks.length,
					lastIndexed: Date.now(),
				});
			}
		} catch (error) {
			// File might be binary or inaccessible
			console.debug(`[PukuIndexing] Could not index ${uri.fsPath}:`, error);
		}
	}

	private _chunkContent(content: string): string[] {
		const chunks: string[] = [];
		const lines = content.split('\n');
		const chunkSize = 50; // lines per chunk
		const overlap = 10; // overlapping lines

		for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
			const chunkLines = lines.slice(i, i + chunkSize);
			const chunk = chunkLines.join('\n').trim();
			if (chunk.length > 50) { // Skip very small chunks
				chunks.push(chunk);
			}
		}

		return chunks;
	}

	private async _computeEmbedding(text: string): Promise<number[] | null> {
		const token = await this._authService.getToken();
		if (!token) {
			return null;
		}

		try {
			// Note: Model is auto-injected by the proxy - no need to specify it here
			const response = await fetch(token.endpoints.embeddings, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token.token}`,
				},
				body: JSON.stringify({
					input: [text], // Just send the text - proxy handles model selection
				}),
			});

			if (!response.ok) {
				console.error('[PukuIndexing] Embedding request failed:', response.status);
				return null;
			}

			const data = await response.json();
			if (data.data && data.data[0] && data.data[0].embedding) {
				return data.data[0].embedding;
			}

			return null;
		} catch (error) {
			console.error('[PukuIndexing] Embedding computation failed:', error);
			return null;
		}
	}

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
		super.dispose();
	}
}
