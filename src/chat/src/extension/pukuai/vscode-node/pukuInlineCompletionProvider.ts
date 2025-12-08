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
import { IPukuFimProvider } from './pukuInlineEditModel';

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
	private cache = new LRUCacheMap<string, RequestFunction>(1000);

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
 * - Implements IPukuFimProvider for unified provider architecture
 */
export class PukuInlineCompletionProvider extends Disposable implements vscode.InlineCompletionItemProvider, IPukuFimProvider {
	private _lastRequestTime = 0;
	private _enabled = true;
	private _requestId = 0;
	private _completionId = 0;
	private _speculativeCache = new SpeculativeRequestCache();
	private _lastCompletionIdByFile = new Map<string, string>(); // File URI -> completion ID
	private _lastPrefix = '';
	private _lastFileUri = ''; // Track last file to skip debounce on file switch
	private _requestsInFlightByFile = new Map<string, boolean>(); // Per-file locks for concurrent requests
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

	/**
	 * Public API for unified provider - implements IPukuFimProvider
	 * Returns a single completion item or null
	 */
	async getFimCompletion(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem | null> {
		console.log('[PukuFIM] ⚡ getFimCompletion called');
		const result = await this.provideInlineCompletionItems(document, position, context, token);
		console.log('[PukuFIM] ⚡ provideInlineCompletionItems returned:', result ? (Array.isArray(result) ? `Array(${result.length})` : 'InlineCompletionList') : 'null');

		if (!result) {
			return null;
		}
		if (Array.isArray(result)) {
			return result.length > 0 ? result[0] : null;
		}
		// InlineCompletionList
		return result.items && result.items.length > 0 ? result.items[0] : null;
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | null> {
		const reqId = ++this._requestId;
		console.log(`[PukuInlineCompletion][${reqId}] ⚡ provideInlineCompletionItems called at ${document.fileName}:${position.line}:${position.character}`);

		// Check if enabled
		if (!this._enabled) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Provider disabled`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Provider enabled`);

		// Check authentication - don't call any API if not logged in
		const authToken = await this._authService.getToken();
		if (!authToken) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Not authenticated - skipping completion`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Authenticated`);

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
			// Store position for validation
			this._positionValidator.update(fileUri, position);
			const completionItem = this._createCompletionItem(cached[0], new vscode.Range(position, position), position, document.uri);
			// Return InlineCompletionList with enableForwardStability (Issue #55)
			return {
				items: [completionItem],
				enableForwardStability: true
			};
		}

		// Generate completion ID early (needed for cache and storing next request)
		const completionId = this._generateCompletionId();

		// Check speculative cache FIRST (before debounce) - Copilot-style prefetching
		// This happens when user accepted the previous completion
		const lastCompletionId = this._lastCompletionIdByFile.get(fileUri);
		if (lastCompletionId && this._speculativeCache.has(lastCompletionId)) {

			// Set per-file lock to prevent concurrent requests for this file while cache executes
			if (this._requestsInFlightByFile.get(fileUri)) {
				return null;
			}
			this._requestsInFlightByFile.set(fileUri, true);

			const cachedCompletionId = lastCompletionId;
			let completion: string | null = null;

			try {
				completion = await this._speculativeCache.request(cachedCompletionId);
			} finally {
				// Always release lock
				this._requestsInFlightByFile.delete(fileUri);
			}

			if (completion && !token.isCancellationRequested) {
				// Update tracking for cache hits
				const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
				this._lastRequestTime = Date.now();
				this._lastFileUri = fileUri;
				this._lastPrefix = prefix;

				// Store speculative request - compute FRESH state at execution time (not prediction)
				// This fixes stale document state causing empty responses (Issue #45)
				const speculativeRequestFn = async (): Promise<string | null> => {
					// Get FRESH document state at execution time
					const editor = vscode.window.activeTextEditor;
					if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
						return null;
					}

					const currentDoc = editor.document;
					const currentPos = editor.selection.active;

					// Extract FRESH prefix/suffix from current state
					const freshPrefix = currentDoc.getText(new vscode.Range(new vscode.Position(0, 0), currentPos));
					const freshSuffix = currentDoc.getText(new vscode.Range(currentPos, currentDoc.lineAt(currentDoc.lineCount - 1).range.end));

					// Get FRESH import context
					const importedFiles = await this._importFlow.getImportedFilesContent(currentDoc, 3, 500);

					// Get FRESH semantic context
					let semanticFiles: Array<{ filepath: string; content: string }> = [];
					if (this._indexingService.isAvailable()) {
						try {
							const currentLine = currentDoc.lineAt(currentPos.line).text.trim();
							if (currentLine.length > 3) {
								const searchResults = await this._indexingService.search(currentLine, 2, currentDoc.languageId);
								semanticFiles = searchResults
									.filter(result => {
										if (result.uri.fsPath !== currentDoc.uri.fsPath) return true;
										const cursorInChunk = currentPos.line >= result.lineStart && currentPos.line <= result.lineEnd;
										return !cursorInChunk;
									})
									.map(result => ({ filepath: result.uri.fsPath, content: result.content }));
							}
						} catch (err) {
							// Semantic search failed silently
						}
					}

					const openFiles = [...importedFiles, ...semanticFiles];
					return await this._fetchContextAwareCompletion(freshPrefix, freshSuffix, openFiles, currentDoc.languageId, new vscode.CancellationTokenSource().token);
				};

				this._speculativeCache.set(completionId, speculativeRequestFn);
				this._lastCompletionIdByFile.set(fileUri, completionId);

				// Store completion in Radix Trie cache for future lookups
				completionsCache.append(prefix, suffix, completion);

				// Store position for validation
				this._positionValidator.update(fileUri, position);

				const completionItem = this._createCompletionItem(completion, new vscode.Range(position, position), position, document.uri);
				// Return InlineCompletionList with enableForwardStability (Issue #55)
				return {
					items: [completionItem],
					enableForwardStability: true
				};
			}
		}

		// Cache MISS - Check debounce (prefix already extracted above)
		// Debounce - wait between requests (only for cache misses)
		// Skip debounce when switching files (instant completions on file switch)
		const now = Date.now();
		const fileChanged = this._lastFileUri !== fileUri;
		if (!fileChanged && now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Debounce: ${now - this._lastRequestTime}ms < ${this._debounceMs}ms`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Passed debounce check (fileChanged=${fileChanged}, timeSinceLastRequest=${now - this._lastRequestTime}ms)`);
		if (fileChanged) {
			// POSITION VALIDATION: Clear state for old file to prevent memory leak
			if (this._lastFileUri) {
				this._positionValidator.clear(this._lastFileUri);
			}
		}

		// Block concurrent requests for this file - only one API call at a time per file
		if (this._requestsInFlightByFile.get(fileUri)) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Request already in flight for this file`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ No request in flight for this file`);

		// Skip API calls on backspace (prefix getting shorter)
		// BUT allow when switching files (different context)
		// Radix Trie cache will handle showing previous completions
		if (!fileChanged && this._lastPrefix && prefix.length < this._lastPrefix.length) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Backspace detected (${this._lastPrefix.length} -> ${prefix.length})`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Not backspacing or file changed`);

		this._lastRequestTime = now;
		this._lastFileUri = fileUri;
		this._lastPrefix = prefix;

		// Check for comment-based completion FIRST (Copilot-style)
		const isCommentCompletion = await this._commentFlow.isCommentBasedCompletion(document, position);
		let commentIntent: string | null = null;

		if (isCommentCompletion) {
			commentIntent = await this._commentFlow.extractCommentIntent(document, position);
		}

		// Skip completions if typing INSIDE a comment (mid-comment)
		// UNLESS this is a comment-based completion (intent-driven code generation)
		// Use Tree-sitter for accurate comment detection (not regex)
		if (!isCommentCompletion && await isInsideComment(document, position)) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Inside comment (not comment-based completion)`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Not inside comment or is comment-based completion`);

		// Gather context FIRST (before prefix check) - needed for context-aware minimum
		// 1. Get import-based context
		const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);

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
					} else {
						// Code-based: search for similar code with adaptive scaling (signatures only)
						semanticFiles = await this._semanticSearchFlow.searchSimilarCode(searchQuery, document.languageId, document.uri);
					}
				} catch (searchError) {
					// Semantic search failed silently
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
		// BUT skip for comment-based completions (intent from comment, not prefix)
		if (!commentIntent && prefix.trim().length < minPrefix) {
			console.log(`[PukuInlineCompletion][${reqId}] ❌ Prefix too short: ${prefix.trim().length} < ${minPrefix} (contextScore=${contextScore}, hasStrongContext=${hasStrongContext})`);
			return null;
		}
		console.log(`[PukuInlineCompletion][${reqId}] ✓ Prefix length OK: ${prefix.trim().length} >= ${minPrefix} (contextScore=${contextScore})`);


		// 4. Check for range-based replacements (two-stage flow)
		const shouldCheckRange = await this._refactoringFlow.shouldCheckForRefactoring(document, position);
		let replaceRange: vscode.Range | undefined;
		let completionPrefix = prefix;
		let completionSuffix = suffix;

		if (shouldCheckRange) {
			// Stage 1: Call Qwen for range detection (only if pattern detected)
			const openFiles = [...importedFiles, ...semanticFiles];
			const detection = await this._refactoringFlow.detectEditRange(prefix, suffix, document.languageId, openFiles);

			if (detection?.shouldReplace && detection.confidence > 0.75) {
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
			}
		}

		// 5. Fetch completion from API
		console.log(`[PukuInlineCompletion][${reqId}] 🌐 Requesting completion from API...`);
		this._logService.debug(`[PukuInlineCompletion][${reqId}] Requesting completion at ${document.fileName}:${position.line}`);

		// Mark request as in flight for this file
		this._requestsInFlightByFile.set(fileUri, true);

		let completion: string | null = null;
		try {
			// 6. Combine context: imports FIRST, then semantic search
			const openFiles = [...importedFiles, ...semanticFiles];
			console.log(`[PukuInlineCompletion][${reqId}] Context: ${importedFiles.length} imports + ${semanticFiles.length} semantic files`);

			// 7. Call FIM with potentially adjusted context
			completion = await this._fetchContextAwareCompletion(completionPrefix, completionSuffix, openFiles, document.languageId, token);

			if (!completion) {
				console.log(`[PukuInlineCompletion][${reqId}] ❌ API returned null/empty completion`);
				return null;
			}
			if (token.isCancellationRequested) {
				console.log(`[PukuInlineCompletion][${reqId}] ❌ Cancelled after API call`);
				return null;
			}
			console.log(`[PukuInlineCompletion][${reqId}] ✅ API returned completion: ${completion.substring(0, 50)}...`);
		} catch (error) {
			console.error(`[PukuInlineCompletion][${reqId}] ❌ API error: ${error}`);
			this._logService.error(`[PukuInlineCompletion][${reqId}] Error: ${error}`);
			return null;
		} finally {
			// Always release the lock for this file
			this._requestsInFlightByFile.delete(fileUri);
		}

		// Store speculative request - compute FRESH state at execution time (not prediction)
		// This fixes stale document state causing empty responses (Issue #45)
		const speculativeRequestFn = async (): Promise<string | null> => {
			// Get FRESH document state at execution time
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
				return null;
			}

			const currentDoc = editor.document;
			const currentPos = editor.selection.active;

			// Extract FRESH prefix/suffix from current state
			const freshPrefix = currentDoc.getText(new vscode.Range(new vscode.Position(0, 0), currentPos));
			const freshSuffix = currentDoc.getText(new vscode.Range(currentPos, currentDoc.lineAt(currentDoc.lineCount - 1).range.end));

			// Get FRESH import context
			const importedFiles = await this._importFlow.getImportedFilesContent(currentDoc, 3, 500);

			// Get FRESH semantic context
			let semanticFiles: Array<{ filepath: string; content: string }> = [];
			if (this._indexingService.isAvailable()) {
				try {
					const currentLine = currentDoc.lineAt(currentPos.line).text.trim();
					if (currentLine.length > 3) {
						const searchResults = await this._indexingService.search(currentLine, 2, currentDoc.languageId);
						semanticFiles = searchResults
							.filter(result => {
								if (result.uri.fsPath !== currentDoc.uri.fsPath) return true;
								const cursorInChunk = currentPos.line >= result.lineStart && currentPos.line <= result.lineEnd;
								return !cursorInChunk;
							})
							.map(result => ({
								filepath: result.uri.fsPath,
								content: result.content
							}));
					}
				} catch (err) {
					// Semantic search failed silently
				}
			}

			const openFiles = [...importedFiles, ...semanticFiles];
			return await this._fetchContextAwareCompletion(freshPrefix, freshSuffix, openFiles, currentDoc.languageId, new vscode.CancellationTokenSource().token);
		};

		this._speculativeCache.set(completionId, speculativeRequestFn);
		this._lastCompletionIdByFile.set(fileUri, completionId);

		// Store completion in Radix Trie cache for future lookups
		completionsCache.append(prefix, suffix, completion);

		// Store position for validation
		this._positionValidator.update(fileUri, position);

		// Calculate replacement range
		// If there's a suffix (text after cursor), replace from cursor to end of line
		// This prevents duplicate text when accepting completions
		let finalRange: vscode.Range;
		if (replaceRange) {
			// Use explicit replace range (for refactoring patterns)
			finalRange = replaceRange;
		} else if (suffix && suffix.trim().length > 0) {
			// Replace from cursor to end of line (avoid duplicates)
			const lineEndPos = document.lineAt(position.line).range.end;
			finalRange = new vscode.Range(position, lineEndPos);
		} else {
			// Insert at cursor (no suffix)
			finalRange = new vscode.Range(position, position);
		}

		const completionItem = this._createCompletionItem(completion, finalRange, position, document.uri);
		console.log(`[PukuInlineCompletion][${reqId}] ✅ Returning completion item with forward stability`);

		// Return InlineCompletionList with enableForwardStability
		// This prevents ghost text from jumping position during edits (Issue #55)
		return {
			items: [completionItem],
			enableForwardStability: true
		};
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

		console.log(`[FetchCompletion] 📤 Calling API: ${url} (language=${languageId})`);
		const response = await this._fetcherService.fetch(url, {
			method: 'POST',
			headers,
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			console.error(`[FetchCompletion] ❌ API error: ${response.status}`);
			throw new Error(`Context-aware completion failed: ${response.status}`);
		}

		if (token.isCancellationRequested) {
			console.log(`[FetchCompletion] ❌ Cancelled before parsing response`);
			return null;
		}

		const data = await response.json() as CompletionResponse;
		console.log(`[FetchCompletion] 📥 API response: ${JSON.stringify(data).substring(0, 200)}...`);

		if (data.choices && data.choices.length > 0) {
			const text = data.choices[0].text || '';
			const trimmed = text.trim();
			console.log(`[FetchCompletion] Raw text length: ${text.length}, trimmed: ${trimmed.length}`);

			if (!trimmed) {
				console.log(`[FetchCompletion] ❌ Empty completion after trim`);
				return null;
			}

			// Check for duplicates: if completion starts with code that's already in prefix
			// Extract last 10 lines of prefix to check for duplication
			const prefixLines = prefix.split('\n');
			const lastLines = prefixLines.slice(-10).join('\n');
			const completionLines = trimmed.split('\n');
			console.log(`[FetchCompletion] Duplicate check: ${completionLines.length} completion lines vs last ${prefixLines.slice(-10).length} prefix lines`);

			// Check if ANY line of completion (not just first) is duplicated in recent prefix
			for (const line of completionLines) {
				const cleanLine = line.trim();
				if (cleanLine.length > 10 && lastLines.includes(cleanLine)) {
					console.log(`[FetchCompletion] ❌ Duplicate detected: "${cleanLine.substring(0, 50)}..."`);
					return null; // Duplicate detected
				}
			}
			console.log(`[FetchCompletion] ✓ No duplicates found`);

			// Check for internal repetition (same line repeated multiple times in completion)
			const lineFrequency = new Map<string, number>();
			for (const line of completionLines) {
				const cleanLine = line.trim();
				if (cleanLine.length > 10) {
					lineFrequency.set(cleanLine, (lineFrequency.get(cleanLine) || 0) + 1);
				}
			}

			// If any line appears 2+ times, reject (likely model hallucination)
			for (const [line, count] of lineFrequency) {
				if (count >= 2) {
					console.log(`[FetchCompletion] ❌ Repetition detected: "${line.substring(0, 50)}..." appears ${count} times`);
					return null; // Repetition detected
				}
			}
			console.log(`[FetchCompletion] ✓ No internal repetition`);

			console.log(`[FetchCompletion] ✅ Returning completion: "${trimmed.substring(0, 50)}..."`);
			return trimmed;
		}

		console.log(`[FetchCompletion] ❌ No choices in API response`);
		return null;
	}

	/**
	 * Create completion item with optional displayLocation for multi-line completions
	 */
	private _createCompletionItem(
		completion: string,
		range: vscode.Range,
		position: vscode.Position,
		documentUri: vscode.Uri
	): vscode.InlineCompletionItem {
		// Simply return ghost text completion
		// TAB to accept will jump to end automatically (cursor movement handled by VS Code)
		// Note: displayLocation labels only work with inline edits (isInlineEdit: true), not ghost text
		return new vscode.InlineCompletionItem(completion, range);
	}

	/**
	 * Enable/disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this._logService.info(`[PukuInlineCompletion] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}

}
