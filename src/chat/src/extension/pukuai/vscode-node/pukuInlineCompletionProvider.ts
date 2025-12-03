/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Standalone inline completion provider using Puku AI proxy
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';
import { IPukuIndexingService } from '../../pukuIndexing/node/pukuIndexingService';
import { CompletionsCache } from '../common/completionsCache';
import { CommentCompletionFlow } from './flows/commentCompletion';
import { RefactoringDetectionFlow } from './flows/refactoringDetection';
import { ImportContextFlow } from './flows/importContext';
import { SemanticSearchFlow } from './flows/semanticSearch';
import { isInsideComment } from './helpers/commentDetection';
import { PositionValidator } from './helpers/positionValidation';

interface CompletionResponse {
	id: string;
	object: string;
	created: number;
	model: string;
	choices: Array<{
		text?: string;
		message?: { content: string };
		index: number;
		finish_reason: string | null;
	}>;
}

/**
 * LRU Cache implementation (Copilot-style)
 * Stores request functions for lazy execution
 */
class LRUCacheMap<K, T> implements Map<K, T> {
	private valueMap = new Map<K, T>();
	private sizeLimit: number;

	constructor(size = 10) {
		if (size < 1) {
			throw new Error('Size limit must be at least 1');
		}
		this.sizeLimit = size;
	}

	set(key: K, value: T): this {
		if (this.has(key)) {
			this.valueMap.delete(key);
		} else if (this.valueMap.size >= this.sizeLimit) {
			// LRU eviction - remove oldest (first) entry
			const oldest = this.valueMap.keys().next().value!;
			this.delete(oldest);
		}
		this.valueMap.set(key, value);
		return this;
	}

	get(key: K): T | undefined {
		if (this.valueMap.has(key)) {
			const entry = this.valueMap.get(key);
			// Move to end (most recently used)
			this.valueMap.delete(key);
			this.valueMap.set(key, entry!);
			return entry!;
		}
		return undefined;
	}

	delete(key: K): boolean {
		return this.valueMap.delete(key);
	}

	clear(): void {
		this.valueMap.clear();
	}

	get size(): number {
		return this.valueMap.size;
	}

	has(key: K): boolean {
		return this.valueMap.has(key);
	}

	peek(key: K): T | undefined {
		return this.valueMap.get(key);
	}

	keys(): IterableIterator<K> { return new Map(this.valueMap).keys(); }
	values(): IterableIterator<T> { return new Map(this.valueMap).values(); }
	entries(): IterableIterator<[K, T]> { return new Map(this.valueMap).entries(); }
	[Symbol.iterator](): IterableIterator<[K, T]> { return this.entries(); }
	forEach(callbackfn: (value: T, key: K, map: Map<K, T>) => void, thisArg?: unknown): void {
		new Map(this.valueMap).forEach(callbackfn, thisArg);
	}
	get [Symbol.toStringTag](): string { return 'LRUCacheMap'; }
}

/**
 * Speculative Request Cache (Copilot-style)
 * Stores REQUEST FUNCTIONS, not results - for lazy prefetching
 */
type RequestFunction = () => Promise<string | null>;

class SpeculativeRequestCache {
	private cache = new LRUCacheMap<string, RequestFunction>(100);

	set(completionId: string, requestFunction: RequestFunction): void {
		this.cache.set(completionId, requestFunction);
	}

	async request(completionId: string): Promise<string | null> {
		const fn = this.cache.get(completionId);
		if (fn === undefined) {
			return null;
		}
		this.cache.delete(completionId);
		return await fn();
	}

	has(completionId: string): boolean {
		return this.cache.has(completionId);
	}

	clear(): void {
		this.cache.clear();
	}
}

/**
 * Puku AI Inline Completion Provider - Copilot-style with speculative caching
 * - Supports ALL file types (Makefile, YAML, Go, etc.) - let Codestral Mamba handle it
 * - Just prefix/suffix to FIM endpoint
 * - Relies entirely on model's 256k context intelligence
 * - Speculative request cache (stores FUNCTIONS, not results) like Copilot
 */
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider {
	private _lastRequestTime = 0;
	private _enabled = true;
	private _requestId = 0;
	private _completionId = 0;
	private _speculativeCache = new SpeculativeRequestCache();
	private _lastCompletionIdByFile = new Map<string, string>(); // File URI -> completion ID
	private _lastPrefix = '';
	private _lastFileUri = ''; // Track last file to skip debounce on file switch
	private _requestInFlight = false; // Prevent concurrent requests
	// Radix Trie cache for intelligent completion matching (handles typing, backspace, partial edits)
	// File-aware: separate cache per file
	private _completionsCacheByFile = new Map<string, CompletionsCache>();
	// Comment completion flow handler
	private _commentFlow: CommentCompletionFlow;
	// Refactoring detection flow handler
	private _refactoringFlow: RefactoringDetectionFlow;
	// Import context flow handler
	private _importFlow: ImportContextFlow;
	// Semantic search flow handler
	private _semanticSearchFlow: SemanticSearchFlow;
	// Position validation helper
	private _positionValidator: PositionValidator;

	constructor(
		private readonly _endpoint: string,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
		@IPukuConfigService private readonly _configService: IPukuConfigService,
	) {
		super();
		const config = this._configService.getConfig();
		this._logService.info(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
		this._logService.info(`[PukuInlineCompletion] Config: FIM endpoint=${config.endpoints.fim}, model=${config.models.fim}, debounce=${config.performance.debounceMs}ms`);
		console.log(`[PukuInlineCompletion] Config loaded: debounce=${config.performance.debounceMs}ms, model=${config.models.fim}`);
		this._commentFlow = new CommentCompletionFlow(_indexingService);
		this._refactoringFlow = new RefactoringDetectionFlow(_logService, _fetcherService, _authService);
		this._importFlow = new ImportContextFlow();
		this._semanticSearchFlow = new SemanticSearchFlow(_indexingService, _configService);
		this._positionValidator = new PositionValidator();
	}

	/**
	 * Get debounce delay from config service
	 */
	private get _debounceMs(): number {
		return this._configService.getConfig().performance.debounceMs;
	}

	/**
	 * Generate unique completion ID (Copilot-style)
	 */
	private _generateCompletionId(): string {
		return `puku-completion-${++this._completionId}`;
	}

	/**
	 * Get or create CompletionsCache for a file
	 */
	private _getCompletionsCache(fileUri: string): CompletionsCache {
		let cache = this._completionsCacheByFile.get(fileUri);
		if (!cache) {
			cache = new CompletionsCache();
			this._completionsCacheByFile.set(fileUri, cache);
		}
		return cache;
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
		const reqId = ++this._requestId;
		console.log(`[PukuInlineCompletion][${reqId}] provideInlineCompletionItems called for ${document.languageId}`);

		// Check if enabled
		if (!this._enabled) {
			console.log(`[PukuInlineCompletion][${reqId}] Provider disabled`);
			return null;
		}

		// Check authentication - don't call any API if not logged in
		const authToken = await this._authService.getToken();
		if (!authToken) {
			console.log(`[PukuInlineCompletion][${reqId}] Not authenticated - skipping completion`);
			return null;
		}

		// POSITION VALIDATION: Clear stale position if cursor moved
		const fileUri = document.uri.toString();
		this._positionValidator.validate(fileUri, position, reqId);

		// Check Radix Trie cache FIRST (handles typing, backspace, partial edits)
		// This prevents unnecessary API calls during word-by-word acceptance and other edits
		const completionsCache = this._getCompletionsCache(fileUri);
		const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));
		const cached = completionsCache.findAll(prefix, suffix);
		if (cached.length > 0) {
			console.log(`[PukuInlineCompletion][${reqId}] Trie cache HIT for ${fileUri} - returning ${cached[0].length} chars (NO API CALL!)`);
			// Store position for validation
			this._positionValidator.update(fileUri, position);
			return [new vscode.InlineCompletionItem(cached[0], new vscode.Range(position, position))];
		}

		// Generate completion ID early (needed for cache and storing next request)
		const completionId = this._generateCompletionId();

		// Check speculative cache FIRST (before debounce) - Copilot-style prefetching
		// This happens when user accepted the previous completion
		const lastCompletionId = this._lastCompletionIdByFile.get(fileUri);
		console.log(`[PukuInlineCompletion][${reqId}] Cache check for ${fileUri}: lastCompletionId=${lastCompletionId}, has=${lastCompletionId ? this._speculativeCache.has(lastCompletionId) : false}`);
		if (lastCompletionId && this._speculativeCache.has(lastCompletionId)) {
			console.log(`[PukuInlineCompletion][${reqId}] Speculative cache HIT for ${lastCompletionId}! Bypassing debounce...`);

			// Set lock to prevent concurrent requests while cache executes
			this._requestInFlight = true;

			const cachedCompletionId = lastCompletionId;
			const completion = await this._speculativeCache.request(cachedCompletionId);

			// Release lock
			this._requestInFlight = false;

			if (completion && !token.isCancellationRequested) {
				// Update tracking for cache hits
				const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
				this._lastRequestTime = Date.now();
				this._lastFileUri = fileUri;
				this._lastPrefix = prefix;

				// Store next speculative request for when user types after accepting this one
				const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));
				const nextPrefix = prefix + completion;
				const nextSuffix = suffix;

				const speculativeRequestFn = async (): Promise<string | null> => {
					console.log(`[PukuInlineCompletion][${reqId}] Executing speculative prefetch for completion ${completionId}...`);
					const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);
					let semanticFiles: Array<{ filepath: string; content: string }> = [];
					if (this._indexingService.isAvailable()) {
						try {
							const currentLine = document.lineAt(position.line).text.trim();
							if (currentLine.length > 3) {
								const searchResults = await this._indexingService.search(currentLine, 2, document.languageId);
								semanticFiles = searchResults
									.filter(result => {
										if (result.uri.fsPath !== document.uri.fsPath) return true;
										const cursorInChunk = position.line >= result.lineStart && position.line <= result.lineEnd;
										return !cursorInChunk;
									})
									.map(result => ({ filepath: result.uri.fsPath, content: result.content }));
							}
						} catch (err) {
							console.log(`[PukuInlineCompletion] Speculative search failed: ${err}`);
						}
					}
					const openFiles = [...importedFiles, ...semanticFiles];
					return await this._fetchContextAwareCompletion(nextPrefix, nextSuffix, openFiles, document.languageId, new vscode.CancellationTokenSource().token);
				};

				this._speculativeCache.set(completionId, speculativeRequestFn);
				this._lastCompletionIdByFile.set(fileUri, completionId);
				console.log(`[PukuInlineCompletion][${reqId}] Cache HIT - Stored next speculative request for completion ${completionId}`);

				// Store completion in Radix Trie cache for future lookups
				completionsCache.append(prefix, suffix, completion);

				// Store position for validation
				this._positionValidator.update(fileUri, position);

				return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
			}
		}

		// Cache MISS - Check debounce (prefix already extracted above)
		console.log(`[PukuInlineCompletion][${reqId}] Speculative cache MISS - Checking debounce...`);

		// Debounce - wait between requests (only for cache misses)
		// Skip debounce when switching files (instant completions on file switch)
		const now = Date.now();
		const fileChanged = this._lastFileUri !== fileUri;
		if (!fileChanged && now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuInlineCompletion][${reqId}] Debounced`);
			return null;
		}
		if (fileChanged) {
			console.log(`[PukuInlineCompletion][${reqId}] File changed from ${this._lastFileUri} to ${fileUri} - skipping debounce`);
			// POSITION VALIDATION: Clear state for old file to prevent memory leak
			if (this._lastFileUri) {
				this._positionValidator.clear(this._lastFileUri);
			}
		}

		// Block concurrent requests - only one API call at a time
		if (this._requestInFlight) {
			console.log(`[PukuInlineCompletion][${reqId}] Request already in flight - skipping`);
			return null;
		}

		this._lastRequestTime = now;
		this._lastFileUri = fileUri;
		this._lastPrefix = prefix;

		console.log(`[PukuInlineCompletion][${reqId}] Prefix length: ${prefix.length}, suffix length: ${suffix.length}`);

		// Skip completions if typing inside a comment (don't autocomplete comments)
		// Use Tree-sitter for accurate comment detection (not regex)
		if (await isInsideComment(document, position)) {
			console.log(`[PukuInlineCompletion][${reqId}] Cursor inside comment - skipping completion`);
			return null;
		}

		// Check for comment-based completion FIRST (Copilot-style)
		const isCommentCompletion = this._commentFlow.isCommentBasedCompletion(document, position);
		let commentIntent: string | null = null;

		if (isCommentCompletion) {
			commentIntent = this._commentFlow.extractCommentIntent(document, position);
			if (commentIntent) {
				console.log(`[PukuInlineCompletion][${reqId}] 💬 Comment-based completion detected: "${commentIntent}"`);
			}
		}

		// Gather context FIRST (before prefix check) - needed for context-aware minimum
		// 1. Get import-based context
		const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);
		console.log(`[PukuInlineCompletion][${reqId}] Import context: ${importedFiles.length} files`);

		// 2. Get semantic search context
		let semanticFiles: Array<{ filepath: string; content: string }> = [];

		if (this._indexingService.isAvailable()) {
			// For comment-based completions, use comment text for semantic search
			// For code completions, use current line
			const searchQuery = commentIntent || document.lineAt(position.line).text.trim();

			if (searchQuery.length > 3) {
				try {
					if (commentIntent) {
						// Comment-based: search for similar functionality (return full implementations)
						semanticFiles = await this._commentFlow.getCommentContext(commentIntent, document, 3);
						console.log(`[PukuInlineCompletion][${reqId}] 💬 Comment context: ${semanticFiles.length} examples`);
					} else {
						// Code-based: search for similar code with adaptive scaling (signatures only)
						semanticFiles = await this._semanticSearchFlow.searchSimilarCode(searchQuery, document.languageId, document.uri);
						console.log(`[PukuInlineCompletion][${reqId}] Found ${semanticFiles.length} similar code snippets for ${document.languageId} (adaptive scaling)`);
					}
				} catch (searchError) {
					console.log(`[PukuInlineCompletion][${reqId}] Semantic search failed: ${searchError}`);
				}
			}
		}

		// 3. Evaluate context strength for dynamic minimum prefix
		const contextStrength = {
			hasImports: importedFiles.length > 0,
			hasSemanticMatches: semanticFiles.length > 0,
			isKnownLanguage: document.languageId !== 'plaintext',
			hasFileStructure: document.lineCount > 10,
			isFileSwitched: fileChanged // File switch = user exploring codebase, provide suggestions
		};

		// Context score: imports (3) + semantic (2) + file switch (2) + language (1) + structure (1)
		const contextScore = (
			(contextStrength.hasImports ? 3 : 0) +
			(contextStrength.hasSemanticMatches ? 2 : 0) +
			(contextStrength.isFileSwitched ? 2 : 0) +
			(contextStrength.isKnownLanguage ? 1 : 0) +
			(contextStrength.hasFileStructure ? 1 : 0)
		);

		// Dynamic minimum prefix based on context strength
		// Strong context (score >= 2) = allow 0-1 char
		// Weak context (score < 2) = require 2+ chars
		const hasStrongContext = contextScore >= 2;
		const minPrefix = hasStrongContext ? 0 : 2;

		// Apply context-aware minimum prefix check
		if (prefix.trim().length < minPrefix) {
			console.log(`[PukuInlineCompletion][${reqId}] Prefix too short: ${prefix.trim().length} (min: ${minPrefix}, score: ${contextScore}, context: ${JSON.stringify(contextStrength)})`);
			return null;
		}

		// Log context-driven suggestions (prefix < 2 but allowed due to context)
		if (prefix.trim().length < 2 && hasStrongContext) {
			console.log(`[PukuInlineCompletion][${reqId}] 🎯 Context-driven suggestion! (prefix=${prefix.trim().length}, score=${contextScore})`);
		}

		// 4. Check for range-based replacements (two-stage flow)
		console.log(`[PukuInlineCompletion][${reqId}] Checking Tree-sitter heuristic for refactoring patterns...`);
		const shouldCheckRange = await this._refactoringFlow.shouldCheckForRefactoring(document, position);
		let replaceRange: vscode.Range | undefined;
		let completionPrefix = prefix;
		let completionSuffix = suffix;

		if (shouldCheckRange) {
			console.log(`[PukuInlineCompletion][${reqId}] Tree-sitter pattern detected - calling range detection API...`);

			// Stage 1: Call Qwen for range detection (only if pattern detected)
			const openFiles = [...importedFiles, ...semanticFiles];
			const detection = await this._refactoringFlow.detectEditRange(prefix, suffix, document.languageId, openFiles);

			if (detection?.shouldReplace && detection.confidence > 0.75) {
				console.log(`[PukuInlineCompletion][${reqId}] Range replacement detected: ${detection.reason} (confidence: ${detection.confidence})`);
				this._logService.info(`[RangeDetection] Replacement suggested: ${detection.reason} (confidence: ${detection.confidence})`);

				// Calculate replacement range in document
				const startLine = position.line - (detection.replaceRange!.startLine - 1);
				const endLine = position.line + (detection.replaceRange!.endLine - detection.replaceRange!.startLine);

				replaceRange = new vscode.Range(
					new vscode.Position(Math.max(0, startLine), 0),
					new vscode.Position(endLine, document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length)
				);

				// Adjust prefix/suffix to remove code being replaced
				const lines = prefix.split('\n');
				completionPrefix = lines.slice(0, -detection.replaceRange!.startLine + 1).join('\n');
				// Keep suffix as is (code after cursor)

				console.log(`[PukuInlineCompletion][${reqId}] Adjusted prefix length: ${completionPrefix.length}, replace range: lines ${startLine}-${endLine}`);
			}
		}

		// 5. Fetch completion from API
		console.log(`[PukuInlineCompletion][${reqId}] Fetching completion from API...`);
		this._logService.debug(`[PukuInlineCompletion][${reqId}] Requesting completion at ${document.fileName}:${position.line}`);

		// Mark request as in flight
		this._requestInFlight = true;

		let completion: string | null = null;
		try {
			// 6. Combine context: imports FIRST, then semantic search
			const openFiles = [...importedFiles, ...semanticFiles];
			console.log(`[PukuInlineCompletion][${reqId}] Total context: ${openFiles.length} files (${importedFiles.length} imports, ${semanticFiles.length} semantic)`);

			// 7. Call FIM with potentially adjusted context
			completion = await this._fetchContextAwareCompletion(completionPrefix, completionSuffix, openFiles, document.languageId, token);

			if (!completion || token.isCancellationRequested) {
				return null;
			}
		} catch (error) {
			this._logService.error(`[PukuInlineCompletion][${reqId}] Error: ${error}`);
			return null;
		} finally {
			// Always release the lock
			this._requestInFlight = false;
		}

		// Store speculative request function (Copilot-style)
		// This creates a closure that will fetch the NEXT completion
		// when the user types after accepting this one
		const nextPrefix = prefix + completion;
		const nextSuffix = suffix;

		// Capture context for the speculative request
		const speculativeRequestFn = async (): Promise<string | null> => {
			console.log(`[PukuInlineCompletion][${reqId}] Executing speculative prefetch for completion ${completionId}...`);

			// Get import context
			const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);

			// Re-run semantic search for the new context
			let semanticFiles: Array<{ filepath: string; content: string }> = [];
			if (this._indexingService.isAvailable()) {
				try {
					const currentLine = document.lineAt(position.line).text.trim();
					if (currentLine.length > 3) {
						const searchResults = await this._indexingService.search(currentLine, 2, document.languageId);
						semanticFiles = searchResults
							.filter(result => {
								// Different file - always include
								if (result.uri.fsPath !== document.uri.fsPath) {
									return true;
								}
								// Same file - exclude if chunk contains cursor
								const cursorInChunk = position.line >= result.lineStart && position.line <= result.lineEnd;
								return !cursorInChunk;
							})
							.map(result => ({
								filepath: result.uri.fsPath,
								content: result.content
							}));
					}
				} catch (err) {
					console.log(`[PukuInlineCompletion] Speculative search failed: ${err}`);
				}
			}

			const openFiles = [...importedFiles, ...semanticFiles];
			return await this._fetchContextAwareCompletion(nextPrefix, nextSuffix, openFiles, document.languageId, new vscode.CancellationTokenSource().token);
		};

		this._speculativeCache.set(completionId, speculativeRequestFn);
		this._lastCompletionIdByFile.set(fileUri, completionId);
		console.log(`[PukuInlineCompletion][${reqId}] Stored speculative request for completion ${completionId}`);

		// Store completion in Radix Trie cache for future lookups
		completionsCache.append(prefix, suffix, completion);

		// Store position for validation
		this._positionValidator.update(fileUri, position);

		// Return completion with range if applicable (range-based replacement)
		if (replaceRange) {
			console.log(`[PukuInlineCompletion][${reqId}] Returning range-based replacement`);
			return [new vscode.InlineCompletionItem(completion, replaceRange)];
		} else {
			return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
		}
	}

	/**
	 * Fetch completion using native /v1/completions FIM endpoint (Copilot style)
	 * Simple prefix/suffix to Codestral Mamba
	 * Backend adds anti-duplication instructions to guide the model
	 */
	private async _fetchNativeCompletion(
		prefix: string,
		suffix: string,
		token: vscode.CancellationToken
	): Promise<string | null> {
		const url = `${this._endpoint}/v1/completions`;

		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				prompt: prefix,
				suffix: suffix,
				max_tokens: 100,
				temperature: 0.1,
				stream: false,
			}),
		});

		if (!response.ok) {
			throw new Error(`Native completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			return null;
		}

		const data = await response.json() as CompletionResponse;

		if (data.choices && data.choices.length > 0) {
			const text = data.choices[0].text || '';
			// Return as-is, no post-processing
			return text.trim() || null;
		}

		return null;
	}

	/**
	 * Fetch completion using context-aware /v1/fim/context endpoint
	 * Uses semantic search to avoid duplicates
	 */
	private async _fetchContextAwareCompletion(
		prefix: string,
		suffix: string,
		openFiles: Array<{ filepath: string; content: string }>,
		languageId: string,
		token: vscode.CancellationToken
	): Promise<string | null> {
		const config = this._configService.getConfig();
		const url = config.endpoints.fim;
		const model = config.models.fim;
		console.log(`[PukuInlineCompletion] Calling ${url} with language=${languageId}, model=${model}`);

		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken.token}`;
		}

		const requestBody = {
			prompt: prefix,
			suffix: suffix,
			openFiles: openFiles,
			language: languageId,
			max_tokens: 100,
			temperature: 0.1,
			stream: false,
		};

		// Log detailed request with context file previews
		console.log(`[PukuInlineCompletion] Full Request Details:`, JSON.stringify({
			endpoint: url,
			language: languageId,
			promptLength: prefix.length,
			suffixLength: suffix.length,
			contextFiles: openFiles.map(f => ({
				filepath: f.filepath,
				contentLength: f.content.length,
				contentPreview: f.content.substring(0, 150) + '...'
			})),
			maxTokens: 100,
			temperature: 0.1
		}, null, 2));

		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			throw new Error(`Context-aware completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			return null;
		}

		const data = await response.json() as CompletionResponse;
		console.log(`[PukuInlineCompletion] Response data:`, JSON.stringify(data, null, 2));

		if (data.choices && data.choices.length > 0) {
			const text = data.choices[0].text || '';
			console.log(`[PukuInlineCompletion] Raw completion text (length=${text.length}):`, JSON.stringify(text));
			const trimmed = text.trim();
			console.log(`[PukuInlineCompletion] Trimmed completion text (length=${trimmed.length}):`, JSON.stringify(trimmed));

			if (!trimmed) {
				console.log(`[PukuInlineCompletion] Completion is empty after trim - returning null`);
				return null;
			}

			// Check for duplicates: if completion starts with code that's already in prefix
			// Extract last 5 lines of prefix to check for duplication
			const prefixLines = prefix.split('\n');
			const lastLines = prefixLines.slice(-5).join('\n');
			const completionStart = trimmed.split('\n')[0]; // First line of completion

			if (lastLines.includes(completionStart) && completionStart.length > 5) {
				console.log(`[PukuInlineCompletion] Duplicate detected: "${completionStart}" already in prefix - returning null`);
				return null;
			}

			return trimmed;
		}

		console.log(`[PukuInlineCompletion] No choices in response - returning null`);
		return null;
	}

	/**
	 * Enable/disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this._logService.info(`[PukuInlineCompletion] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}

}
