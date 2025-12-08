/*---------------------------------------------------------------------------------------------
 *  Puku AI FIM Provider - Copilot-style Next Edit Provider
 *  Implements IPukuNextEditProvider for racing architecture
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { IFetcherService } from '../../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../../pukuIndexing/common/pukuConfig';
import { IPukuIndexingService } from '../../../pukuIndexing/node/pukuIndexingService';
import { CompletionsCache } from '../../common/completionsCache';
import { CurrentGhostText } from '../../common/currentGhostText';
import { IPukuNextEditProvider, PukuFimResult, DocumentId } from '../../common/nextEditProvider';
import { CommentCompletionFlow } from '../flows/commentCompletion';
import { RefactoringDetectionFlow } from '../flows/refactoringDetection';
import { ImportContextFlow } from '../flows/importContext';
import { SemanticSearchFlow } from '../flows/semanticSearch';
import { isInsideComment } from '../helpers/commentDetection';
import { PositionValidator } from '../helpers/positionValidation';

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
 * Feature #64: Returns arrays of completions for cycling support
 */
type RequestFunction = () => Promise<string[]>;

class SpeculativeRequestCache {
	private cache = new LRUCacheMap<string, RequestFunction>(1000);

	set(completionId: string, requestFunction: RequestFunction): void {
		this.cache.set(completionId, requestFunction);
	}

	async request(completionId: string): Promise<string[]> {
		const fn = this.cache.get(completionId);
		if (fn === undefined) {
			return [];
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
 * Puku FIM Provider - Implements racing provider architecture
 * Extracted from PukuInlineCompletionProvider for separation of concerns
 */
export class PukuFimProvider extends Disposable implements IPukuNextEditProvider<PukuFimResult> {
	readonly ID = 'puku-fim';

	private _lastRequestTime = 0;
	private _requestId = 0;
	private _completionId = 0;
	private _speculativeCache = new SpeculativeRequestCache();
	private _lastCompletionIdByFile = new Map<string, string>(); // File URI -> completion ID
	private _lastPrefix = '';
	private _lastFileUri = ''; // Track last file to skip debounce on file switch
	private _requestsInFlightByFile = new Map<string, boolean>(); // Per-file locks for concurrent requests
	// CurrentGhostText cache (Layer 1) - instant forward typing through current completion
	// File-aware: separate cache per file
	private _currentGhostTextByFile = new Map<string, CurrentGhostText>();
	// Store last shown completion context for CurrentGhostText population
	// Maps requestId -> {fileUri, prefix, suffix, completionText}
	private _pendingShownContextByRequestId = new Map<string, { fileUri: string, prefix: string, suffix: string, completionText: string }>();
	// Radix Trie cache (Layer 2) for intelligent completion matching (handles typing, backspace, partial edits)
	// File-aware: separate cache per file
	private _completionsCacheByFile = new Map<string, CompletionsCache>();
	// Flow handlers
	private _commentFlow: CommentCompletionFlow;
	private _refactoringFlow: RefactoringDetectionFlow;
	private _importFlow: ImportContextFlow;
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
		this._logService.info(`[PukuFimProvider] Provider created with endpoint: ${_endpoint}`);
		this._logService.info(`[PukuFimProvider] Config: FIM endpoint=${config.endpoints.fim}, model=${config.models.fim}, debounce=${config.performance.debounceMs}ms`);
		console.log(`[PukuFimProvider] Config loaded: debounce=${config.performance.debounceMs}ms, model=${config.models.fim}`);
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
	 * Get or create CurrentGhostText for a file
	 */
	private _getCurrentGhostText(fileUri: string): CurrentGhostText {
		let ghostText = this._currentGhostTextByFile.get(fileUri);
		if (!ghostText) {
			ghostText = new CurrentGhostText();
			this._currentGhostTextByFile.set(fileUri, ghostText);
		}
		return ghostText;
	}

	/**
	 * Store context for populating CurrentGhostText in handleShown
	 * Call this before returning any FIM result
	 */
	private _storeShownContext(fileUri: string, prefix: string, suffix: string, completionText: string, requestId: number): void {
		this._pendingShownContextByRequestId.set(String(requestId), {
			fileUri,
			prefix,
			suffix,
			completionText
		});
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
	 * IPukuNextEditProvider implementation - main entry point
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuFimResult | null> {
		const reqId = ++this._requestId;
		const document = docId.document;
		const position = docId.position;
		console.log(`[PukuFimProvider][${reqId}] ⚡ getNextEdit called at ${document.fileName}:${position.line}:${position.character}`);

		// Check authentication - don't call any API if not logged in
		const authToken = await this._authService.getToken();
		if (!authToken) {
			console.log(`[PukuFimProvider][${reqId}] ❌ Not authenticated - skipping completion`);
			return null;
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ Authenticated`);

		// POSITION VALIDATION: Clear stale position if cursor moved
		const fileUri = document.uri.toString();
		this._positionValidator.validate(fileUri, position, reqId);

		// Extract prefix/suffix for all cache checks
		const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));

		// Check CurrentGhostText FIRST (Layer 1) - instant forward typing through current completion
		const currentGhostText = this._getCurrentGhostText(fileUri);
		const typingAsSuggested = currentGhostText.getCompletionForTyping(prefix, suffix);
		if (typingAsSuggested !== undefined) {
			console.log(`[PukuFimProvider][${reqId}] ⚡ CurrentGhostText cache HIT! Instant forward typing (0ms)`);
			console.log(`[PukuFimProvider][${reqId}] 📄 Remaining completion: "${typingAsSuggested.substring(0, 100)}${typingAsSuggested.length > 100 ? '...' : ''}"`);
			// Store position for validation
			this._positionValidator.update(fileUri, position);
			// Store context for handleShown (so CurrentGhostText can be refreshed with new position)
			this._storeShownContext(fileUri, prefix, suffix, typingAsSuggested, reqId);
			// Return remaining completion instantly (no API call)
			const completionItems = [this._createCompletionItem(typingAsSuggested, new vscode.Range(position, position), position, document.uri)];
			return {
				type: 'fim',
				completion: completionItems,
				requestId: reqId
			};
		}
		console.log(`[PukuFimProvider][${reqId}] ❌ CurrentGhostText cache MISS`);

		// Check Radix Trie cache (Layer 2) - handles typing, backspace, partial edits
		const completionsCache = this._getCompletionsCache(fileUri);
		const cached = completionsCache.findAll(prefix, suffix);
		if (cached.length > 0 && cached[0].length > 0) {
			const completions = cached[0]; // Get first array of completions
			console.log(`[PukuFimProvider][${reqId}] 🎯 Radix Trie cache HIT! Found ${completions.length} cached completion(s)`);
			console.log(`[PukuFimProvider][${reqId}] 📄 First cached completion preview: "${completions[0].substring(0, 100)}${completions[0].length > 100 ? '...' : ''}"`);
			// Store position for validation
			this._positionValidator.update(fileUri, position);
			// Store context for handleShown (use first completion for CurrentGhostText)
			this._storeShownContext(fileUri, prefix, suffix, completions[0], reqId);
			// Create completion items for all cached completions (Feature #64)
			const completionItems = completions.map(completion =>
				this._createCompletionItem(completion, new vscode.Range(position, position), position, document.uri)
			);
			return {
				type: 'fim',
				completion: completionItems,
				requestId: reqId
			};
		}
		console.log(`[PukuFimProvider][${reqId}] ❌ Radix Trie cache MISS (prefixLen=${prefix.length}, suffixLen=${suffix.length})`);

		// Generate completion ID early (needed for cache and storing next request)
		const completionId = this._generateCompletionId();

		// Check speculative cache FIRST (before debounce) - Copilot-style prefetching
		const lastCompletionId = this._lastCompletionIdByFile.get(fileUri);
		if (lastCompletionId && this._speculativeCache.has(lastCompletionId)) {

			// Set per-file lock to prevent concurrent requests for this file while cache executes
			if (this._requestsInFlightByFile.get(fileUri)) {
				return null;
			}
			this._requestsInFlightByFile.set(fileUri, true);

			const cachedCompletionId = lastCompletionId;
			let completions: string[] = [];

			try {
				completions = await this._speculativeCache.request(cachedCompletionId);
			} finally {
				// Always release lock
				this._requestsInFlightByFile.delete(fileUri);
			}

			if (completions && completions.length > 0 && !token.isCancellationRequested) {
				// Update tracking for cache hits
				this._lastRequestTime = Date.now();
				this._lastFileUri = fileUri;
				this._lastPrefix = prefix;

				// Store speculative request for next completion
				this._storeSpeculativeRequest(completionId, document);

				// Store ALL completions in Radix Trie cache for future lookups (Feature #64)
				console.log(`[PukuFimProvider] 💾 Storing ${completions.length} completion(s) in Radix Trie cache (prefixLen=${prefix.length})`);
				completionsCache.append(prefix, suffix, completions);

				// Store position for validation
				this._positionValidator.update(fileUri, position);

				// Store context for handleShown (use first completion for CurrentGhostText)
				this._storeShownContext(fileUri, prefix, suffix, completions[0], reqId);

				// Create completion items for all completions (Feature #64)
				const completionItems = completions.map(completion =>
					this._createCompletionItem(completion, new vscode.Range(position, position), position, document.uri)
				);
				return {
					type: 'fim',
					completion: completionItems,
					requestId: reqId
				};
			}
		}

		// Cache MISS - Check debounce
		const now = Date.now();
		const fileChanged = this._lastFileUri !== fileUri;
		if (!fileChanged && now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuFimProvider][${reqId}] ❌ Debounce: ${now - this._lastRequestTime}ms < ${this._debounceMs}ms`);
			return null;
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ Passed debounce check (fileChanged=${fileChanged}, timeSinceLastRequest=${now - this._lastRequestTime}ms)`);
		if (fileChanged) {
			// POSITION VALIDATION: Clear state for old file to prevent memory leak
			if (this._lastFileUri) {
				this._positionValidator.clear(this._lastFileUri);
			}
		}

		// Block concurrent requests for this file
		if (this._requestsInFlightByFile.get(fileUri)) {
			console.log(`[PukuFimProvider][${reqId}] ❌ Request already in flight for this file`);
			return null;
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ No request in flight for this file`);

		this._lastRequestTime = now;
		this._lastFileUri = fileUri;
		this._lastPrefix = prefix;

		// Check for comment-based completion
		const isCommentCompletion = await this._commentFlow.isCommentBasedCompletion(document, position);
		let commentIntent: string | null = null;

		if (isCommentCompletion) {
			commentIntent = await this._commentFlow.extractCommentIntent(document, position);
		}

		// Skip completions if typing INSIDE a comment
		if (!isCommentCompletion && await isInsideComment(document, position)) {
			console.log(`[PukuFimProvider][${reqId}] ❌ Inside comment (not comment-based completion)`);
			return null;
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ Not inside comment or is comment-based completion`);

		// Gather context
		const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);

		// Get semantic search context
		let semanticFiles: Array<{ filepath: string; content: string }> = [];

		if (this._indexingService.isAvailable()) {
			const searchQuery = commentIntent || document.lineAt(position.line).text.trim();

			if (searchQuery.length > 3) {
				try {
					if (commentIntent) {
						semanticFiles = await this._commentFlow.getCommentContext(commentIntent, document, 3);
					} else {
						semanticFiles = await this._semanticSearchFlow.searchSimilarCode(searchQuery, document.languageId, document.uri);
					}
				} catch (searchError) {
					// Semantic search failed silently
				}
			}
		}

		// Evaluate context strength for dynamic minimum prefix
		const contextStrength = {
			hasImports: importedFiles.length > 0,
			hasSemanticMatches: semanticFiles.length > 0,
			isKnownLanguage: document.languageId !== 'plaintext',
			hasFileStructure: document.lineCount > 10,
			isFileSwitched: fileChanged
		};

		const contextScore = (
			(contextStrength.hasImports ? 3 : 0) +
			(contextStrength.hasSemanticMatches ? 2 : 0) +
			(contextStrength.isFileSwitched ? 2 : 0) +
			(contextStrength.isKnownLanguage ? 1 : 0) +
			(contextStrength.hasFileStructure ? 1 : 0)
		);

		const hasStrongContext = contextScore >= 2;
		const minPrefix = hasStrongContext ? 0 : 2;

		// Apply context-aware minimum prefix check
		if (!commentIntent && prefix.trim().length < minPrefix) {
			console.log(`[PukuFimProvider][${reqId}] ❌ Prefix too short: ${prefix.trim().length} < ${minPrefix} (contextScore=${contextScore})`);
			return null;
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ Prefix length OK: ${prefix.trim().length} >= ${minPrefix} (contextScore=${contextScore})`);

		// Check for range-based replacements (two-stage flow)
		const shouldCheckRange = await this._refactoringFlow.shouldCheckForRefactoring(document, position);
		let replaceRange: vscode.Range | undefined;
		let completionPrefix = prefix;
		let completionSuffix = suffix;

		if (shouldCheckRange) {
			const openFiles = [...importedFiles, ...semanticFiles];
			const detection = await this._refactoringFlow.detectEditRange(prefix, suffix, document.languageId, openFiles);

			if (detection?.shouldReplace && detection.confidence > 0.75) {
				this._logService.info(`[RangeDetection] Replacement suggested: ${detection.reason} (confidence: ${detection.confidence})`);

				const startLine = position.line - (detection.replaceRange!.startLine - 1);
				const endLine = position.line + (detection.replaceRange!.endLine - detection.replaceRange!.startLine);

				replaceRange = new vscode.Range(
					new vscode.Position(Math.max(0, startLine), 0),
					new vscode.Position(endLine, document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length)
				);

				const lines = prefix.split('\n');
				completionPrefix = lines.slice(0, -detection.replaceRange!.startLine + 1).join('\n');
			}
		}

		// Fetch completion from API
		// Feature #64: Request multiple completions if cycling
		const isCycling = docId.isCycling || false;
		const n = isCycling ? 3 : 1;
		console.log(`[PukuFimProvider][${reqId}] 🌐 Requesting ${n} completion(s) from API (cycling: ${isCycling})...`);
		this._logService.debug(`[PukuFimProvider][${reqId}] Requesting completion at ${document.fileName}:${position.line} (n=${n})`);

		// Mark request as in flight for this file
		this._requestsInFlightByFile.set(fileUri, true);

		let completions: string[] | null = null;
		try {
			const openFiles = [...importedFiles, ...semanticFiles];
			console.log(`[PukuFimProvider][${reqId}] Context: ${importedFiles.length} imports + ${semanticFiles.length} semantic files`);

			completions = await this._fetchContextAwareCompletion(completionPrefix, completionSuffix, openFiles, document.languageId, token, n);
			console.log(`[PukuFimProvider][${reqId}] 📊 Fetch returned ${completions?.length || 0} completion(s)`);

			if (!completions || completions.length === 0) {
				console.log(`[PukuFimProvider][${reqId}] ❌ API returned null/empty completions`);
				return null;
			}
			console.log(`[PukuFimProvider][${reqId}] ✓ Got ${completions.length} completion(s)`);

			if (token.isCancellationRequested) {
				console.log(`[PukuFimProvider][${reqId}] ❌ Cancelled after API call`);
				return null;
			}
			console.log(`[PukuFimProvider][${reqId}] ✓ Not cancelled`);
			console.log(`[PukuFimProvider][${reqId}] ✅ API returned ${completions.length} completion(s), first: "${completions[0].substring(0, 50)}..."`);
		} catch (error) {
			console.error(`[PukuFimProvider][${reqId}] ❌ API error: ${error}`);
			this._logService.error(`[PukuFimProvider][${reqId}] Error: ${error}`);
			return null;
		} finally {
			// Always release the lock for this file
			this._requestsInFlightByFile.delete(fileUri);
		}

		// Store speculative request for next completion
		console.log(`[PukuFimProvider][${reqId}] 💾 Storing speculative request...`);
		this._storeSpeculativeRequest(completionId, document);

		// Store ALL completions in Radix Trie cache for future lookups (Feature #64)
		console.log(`[PukuFimProvider][${reqId}] 💾 Storing ${completions.length} completion(s) in Radix Trie cache (prefixLen=${prefix.length})`);
		completionsCache.append(prefix, suffix, completions);

		// Store position for validation
		console.log(`[PukuFimProvider][${reqId}] 💾 Updating position validator...`);
		this._positionValidator.update(fileUri, position);

		// Calculate replacement range
		let finalRange: vscode.Range;
		if (replaceRange) {
			finalRange = replaceRange;
			console.log(`[PukuFimProvider][${reqId}] 📐 Using replace range: ${replaceRange.start.line}:${replaceRange.start.character} -> ${replaceRange.end.line}:${replaceRange.end.character}`);
		} else if (suffix && suffix.trim().length > 0) {
			const lineEndPos = document.lineAt(position.line).range.end;
			finalRange = new vscode.Range(position, lineEndPos);
			console.log(`[PukuFimProvider][${reqId}] 📐 Using line-end range: ${position.line}:${position.character} -> ${lineEndPos.line}:${lineEndPos.character}`);
		} else {
			finalRange = new vscode.Range(position, position);
			console.log(`[PukuFimProvider][${reqId}] 📐 Using cursor position range: ${position.line}:${position.character}`);
		}

		// Store context for handleShown (use first completion for CurrentGhostText)
		this._storeShownContext(fileUri, prefix, suffix, completions[0], reqId);

		// Feature #64: Create multiple completion items (one for each completion)
		console.log(`[PukuFimProvider][${reqId}] 🎨 Creating ${completions.length} completion item(s)...`);
		const completionItems = completions.map(completion =>
			this._createCompletionItem(completion, finalRange, position, document.uri)
		);

		console.log(`[PukuFimProvider][${reqId}] ✅ Returning ${completionItems.length} completion item(s) to racing model`);
		return {
			type: 'fim',
			completion: completionItems, // Always return array (Feature #64)
			requestId: reqId
		};
	}

	/**
	 * Store speculative request for next completion (Copilot-style)
	 * Feature #64: Returns array of completions for cycling support
	 */
	private _storeSpeculativeRequest(completionId: string, document: vscode.TextDocument): void {
		const speculativeRequestFn = async (): Promise<string[]> => {
			// Get FRESH document state at execution time
			const editor = vscode.window.activeTextEditor;
			if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
				return [];
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
		this._lastCompletionIdByFile.set(document.uri.toString(), completionId);
	}

	/**
	 * Fetch completion using context-aware /v1/fim/context endpoint
	 * Feature #64: Supports multiple completions via `n` parameter
	 */
	private async _fetchContextAwareCompletion(
		prefix: string,
		suffix: string,
		openFiles: Array<{ filepath: string; content: string }>,
		languageId: string,
		token: vscode.CancellationToken,
		n: number = 1 // Number of completions to generate (1 for automatic, 3 for cycling)
	): Promise<string[] | null> {
		const config = this._configService.getConfig();
		const url = config.endpoints.fim;
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
			n, // Feature #64: Multiple completions
		};

		console.log(`[FetchCompletion] 📤 Calling API: ${url} (language=${languageId})`);
		console.log(`[FetchCompletion] 📝 Request body:`, {
			prefixLength: prefix.length,
			suffixLength: suffix.length,
			openFilesCount: openFiles.length,
			prefixPreview: prefix.substring(Math.max(0, prefix.length - 100)),
			suffixPreview: suffix.substring(0, 100)
		});
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
		console.log(`[FetchCompletion] 📥 API response: ${data.choices?.length || 0} choice(s)`);

		if (!data.choices || data.choices.length === 0) {
			console.log(`[FetchCompletion] ❌ No choices in API response`);
			return null;
		}

		// Feature #64: Process ALL choices (not just the first one)
		const validCompletions: string[] = [];
		const prefixLines = prefix.split('\n');
		const lastLines = prefixLines.slice(-10).join('\n');

		for (let i = 0; i < data.choices.length; i++) {
			const choice = data.choices[i];
			const text = choice.text || '';
			const trimmed = text.trim();

			console.log(`[FetchCompletion] Processing choice ${i + 1}/${data.choices.length}: length=${trimmed.length}`);

			if (!trimmed) {
				console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} is empty, skipping`);
				continue;
			}

			// Check for duplicates with prefix
			const completionLines = trimmed.split('\n');
			let hasDuplicates = false;

			for (const line of completionLines) {
				const cleanLine = line.trim();
				if (cleanLine.length > 10 && lastLines.includes(cleanLine)) {
					console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} has duplicate: "${cleanLine.substring(0, 50)}..."`);
					hasDuplicates = true;
					break;
				}
			}

			if (hasDuplicates) {
				continue;
			}

			// Check for internal repetition
			const lineFrequency = new Map<string, number>();
			for (const line of completionLines) {
				const cleanLine = line.trim();
				if (cleanLine.length > 10) {
					lineFrequency.set(cleanLine, (lineFrequency.get(cleanLine) || 0) + 1);
				}
			}

			let hasRepetition = false;
			for (const [line, count] of lineFrequency) {
				if (count >= 2) {
					console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} has repetition: "${line.substring(0, 50)}..."`);
					hasRepetition = true;
					break;
				}
			}

			if (hasRepetition) {
				continue;
			}

			console.log(`[FetchCompletion] ✅ Choice ${i + 1} is valid: "${trimmed.substring(0, 50)}..."`);
			validCompletions.push(trimmed);
		}

		if (validCompletions.length === 0) {
			console.log(`[FetchCompletion] ❌ No valid completions after filtering`);
			return null;
		}

		console.log(`[FetchCompletion] ✅ Returning ${validCompletions.length} valid completion(s)`);
		return validCompletions;
	}

	/**
	 * Create completion item
	 */
	private _createCompletionItem(
		completion: string,
		range: vscode.Range,
		position: vscode.Position,
		documentUri: vscode.Uri
	): vscode.InlineCompletionItem {
		return new vscode.InlineCompletionItem(completion, range);
	}

	/**
	 * Lifecycle handlers - IPukuNextEditProvider interface
	 */

	handleShown(result: PukuFimResult): void {
		console.log(`[PukuFimProvider] 👁️ Completion shown: reqId=${result.requestId}`);

		// Populate CurrentGhostText with the shown completion context
		const context = this._pendingShownContextByRequestId.get(String(result.requestId));
		if (context) {
			const { fileUri, prefix, suffix, completionText } = context;
			const currentGhostText = this._getCurrentGhostText(fileUri);
			currentGhostText.setCompletion(prefix, suffix, completionText, String(result.requestId));
			console.log(`[PukuFimProvider] 💾 CurrentGhostText populated for ${fileUri} (prefixLen=${prefix.length}, completionLen=${completionText.length})`);

			// Clean up pending context
			this._pendingShownContextByRequestId.delete(String(result.requestId));
		}
	}

	handleAcceptance(docId: DocumentId, result: PukuFimResult): void {
		console.log(`[PukuFimProvider] ✅ Completion accepted: reqId=${result.requestId}`);
		// Track acceptance for analytics and model improvement
	}

	handleRejection(docId: DocumentId, result: PukuFimResult): void {
		console.log(`[PukuFimProvider] ❌ Completion rejected: reqId=${result.requestId}`);

		// Clear CurrentGhostText for this file (user rejected the completion)
		const fileUri = docId.document.uri.toString();
		const currentGhostText = this._getCurrentGhostText(fileUri);
		currentGhostText.clear();
		console.log(`[PukuFimProvider] 🧹 CurrentGhostText cleared for ${fileUri}`);
	}

	handleIgnored(docId: DocumentId, result: PukuFimResult, supersededBy?: PukuFimResult): void {
		console.log(`[PukuFimProvider] ⏭️ Completion ignored: reqId=${result.requestId}, supersededBy=${supersededBy?.requestId}`);
		// Track when completions are superseded by newer ones (racing)
	}
}
