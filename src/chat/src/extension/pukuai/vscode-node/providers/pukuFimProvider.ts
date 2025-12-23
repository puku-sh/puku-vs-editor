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
import { CurrentFileContextFlow } from '../flows/currentFileContext';
import { isInsideComment } from '../helpers/commentDetection';
import { ImportFilteringAspect } from '../../node/importFiltering';
import { isInlineSuggestion } from '../utils/isInlineSuggestion';
import { DocumentResolver } from '../utils/documentResolver';
import { DisplayLocationFactory } from '../utils/displayLocationFactory';
import { NavigationCommandFactory } from '../utils/navigationCommandFactory';

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
		metadata?: {
			targetDocument?: string;    // URI string
			targetLine?: number;         // 0-indexed
			targetColumn?: number;       // 0-indexed
			displayType?: 'code' | 'label';
		};
	}>;
}

/**
 * Completion with metadata for multi-document support
 */
interface CompletionWithMetadata {
	text: string;
	metadata?: {
		targetDocument?: string;
		targetLine?: number;
		targetColumn?: number;
		displayType?: 'code' | 'label';
	};
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
 * Pending FIM request wrapper - stores cancellation token and result promise
 * Based on Copilot's StatelessNextEditRequest pattern
 * Reference: vscode-copilot-chat/src/platform/inlineEdits/common/statelessNextEditProvider.ts:44-64
 */
interface PendingFimRequest {
	cancellationTokenSource: vscode.CancellationTokenSource;
	resultPromise: Promise<PukuFimResult | null>;
	fileUri: string; // For validation (like Copilot's activeDoc.id)
	prefix: string;  // For validation (like Copilot's documentBeforeEdits.value)
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
	private _lastFileUri = ''; // Track last file to skip debounce on file switch
	private _lastPrefix = ''; // Track last prefix for optimization
	// Global single pending request (Copilot pattern - nextEditProvider.ts:70)
	private _pendingFimRequest: PendingFimRequest | null = null;
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
	private _currentFileContextFlow: CurrentFileContextFlow;
	// Multi-document completion support (Copilot parity)
	private _documentResolver: DocumentResolver;
	private _displayLocationFactory: DisplayLocationFactory;
	private _navigationCommandFactory: NavigationCommandFactory;
	// Track active displayLocation navigation completions for post-navigation cycling
	// Key: "${fileUri}:${targetLine}", Value: completion item
	private _activeDisplayLocationCompletions = new Map<string, vscode.InlineCompletionItem>();

	constructor(
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
		@IPukuConfigService private readonly _configService: IPukuConfigService,
	) {
		super();
		const config = this._configService.getConfig();
		this._logService.info(`[PukuFimProvider] Provider created`);
		this._logService.info(`[PukuFimProvider] Config: FIM endpoint=${config.endpoints.fim}, model=${config.models.fim}, debounce=${config.performance.debounceMs}ms`);
		console.log(`[PukuFimProvider] Config loaded: debounce=${config.performance.debounceMs}ms, model=${config.models.fim}`);
		this._commentFlow = new CommentCompletionFlow(_indexingService);
		this._refactoringFlow = new RefactoringDetectionFlow(_logService, _fetcherService, _authService);
		this._importFlow = new ImportContextFlow();
		this._semanticSearchFlow = new SemanticSearchFlow(_indexingService, _configService);
		this._currentFileContextFlow = new CurrentFileContextFlow();
		// Initialize multi-document completion components (Copilot parity)
		this._documentResolver = new DocumentResolver(vscode.workspace);
		this._displayLocationFactory = new DisplayLocationFactory();
		this._navigationCommandFactory = new NavigationCommandFactory();
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

		// No position validation - matches Copilot's approach (completionsCache.ts has no position checks)
		// Cache hits are determined ONLY by prefix/suffix matching, not position
		const fileUri = document.uri.toString();

		// Extract prefix/suffix for all cache checks
		const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));

		// Check CurrentGhostText FIRST (Layer 1) - instant forward typing through current completion
		// Skip cache when cycling (Tab key) to allow multiple completions
		const isCycling = docId.isCycling || false;
		const currentGhostText = this._getCurrentGhostText(fileUri);
		const typingAsSuggested = !isCycling ? currentGhostText.getCompletionForTyping(prefix, suffix) : undefined;
		if (typingAsSuggested !== undefined) {
			console.log(`[PukuFimProvider][${reqId}] ⚡ CurrentGhostText cache HIT! Instant forward typing (0ms)`);
			console.log(`[PukuFimProvider][${reqId}] 📄 Remaining completion: "${typingAsSuggested.substring(0, 100)}${typingAsSuggested.length > 100 ? '...' : ''}"`);
			// Store context for handleShown (so CurrentGhostText can be refreshed with new position)
			this._storeShownContext(fileUri, prefix, suffix, typingAsSuggested, reqId);
			// Return remaining completion instantly (no API call)
			const completionItems = [this._createCompletionItem(typingAsSuggested, new vscode.Range(position, position), position, document.uri, document)];
			return {
				type: 'fim',
				completion: completionItems,
				requestId: reqId
			};
		}
		console.log(`[PukuFimProvider][${reqId}] ❌ CurrentGhostText cache MISS`);

		// Check Radix Trie cache (Layer 2) - handles typing, backspace, partial edits
		// Issue #58.5: Pass document and position for rebase support
		// Issue #133: Returns CompletionChoice[] with metadata
		const completionsCache = this._getCompletionsCache(fileUri);
		const cachedChoices = completionsCache.findAll(prefix, suffix, document, position);
		if (cachedChoices.length > 0) {
			console.log(`[PukuFimProvider][${reqId}] 🎯 Radix Trie cache HIT! Found ${cachedChoices.length} cached completion(s)`);

			const firstChoice = cachedChoices[0];
			console.log(`[PukuFimProvider][${reqId}] 📄 First cached completion preview: "${firstChoice.completionText.substring(0, 100)}${firstChoice.completionText.length > 100 ? '...' : ''}" (hasMetadata=${!!firstChoice.metadata})`);

			// Store context for handleShown (use first completion for CurrentGhostText)
			this._storeShownContext(fileUri, prefix, suffix, firstChoice.completionText, reqId);

			// Create completion items for all cached completions (Feature #64)
			const completionItems = cachedChoices.map(choice =>
				this._createCompletionItem(
					choice.completionText,
					new vscode.Range(position, position),
					position,
					document.uri,
					document,
					choice.metadata
				)
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
			console.log(`[PukuFimProvider][${reqId}] 🔮 Speculative cache found, attempting to use...`);

			// Check for existing pending request (Copilot pattern - nextEditProvider.ts:425-431)
			if (this._pendingFimRequest) {
				const fileMatches = this._pendingFimRequest.fileUri === fileUri;
				const prefixMatches = this._pendingFimRequest.prefix === prefix;
				const notCancelled = !this._pendingFimRequest.cancellationTokenSource.token.isCancellationRequested;

				if (fileMatches && prefixMatches && notCancelled) {
					console.log(`[PukuFimProvider][${reqId}] 🔁 Reusing pending request (file + prefix match)`);
					return await this._pendingFimRequest.resultPromise;
				}
			}

			const cachedCompletionId = lastCompletionId;
			const completions: string[] = await this._speculativeCache.request(cachedCompletionId);

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

				// Store context for handleShown (use first completion for CurrentGhostText)
				this._storeShownContext(fileUri, prefix, suffix, completions[0], reqId);

				// Create completion items for all completions (Feature #64)
				const completionItems = completions.map(completion =>
					this._createCompletionItem(completion, new vscode.Range(position, position), position, document.uri, document)
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

		// Check for existing pending request (Copilot pattern - nextEditProvider.ts:425-431)
		if (this._pendingFimRequest) {
			const fileMatches = this._pendingFimRequest.fileUri === fileUri;
			const prefixMatches = this._pendingFimRequest.prefix === prefix;
			const notCancelled = !this._pendingFimRequest.cancellationTokenSource.token.isCancellationRequested;

			if (fileMatches && prefixMatches && notCancelled) {
				console.log(`[PukuFimProvider][${reqId}] 🔁 Reusing pending request (file + prefix match)`);
				return await this._pendingFimRequest.resultPromise;
			}
		}
		console.log(`[PukuFimProvider][${reqId}] ✓ No reusable pending request, starting new request`);

		this._lastRequestTime = now;
		this._lastFileUri = fileUri;


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

		// Gather context from current file (for style matching) - HIGHEST PRIORITY
		let currentFileContent = '';
		try {
			currentFileContent = await this._currentFileContextFlow.getCurrentFileContext(document, position, 10000);
			console.log(`[PukuFimProvider][${reqId}] Current file context: ${currentFileContent ? currentFileContent.length + ' chars' : 'none'}`);
		} catch (error) {
			console.log(`[PukuFimProvider][${reqId}] Failed to extract current file context:`, error);
		}

		// Gather context from imports
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
		// Issue #135: Increased from 3 to 5 to account for quality filtering (repetition detection)
		const n = isCycling ? 5 : 1;
		console.log(`[PukuFimProvider][${reqId}] 🌐 Requesting ${n} completion(s) from API (cycling: ${isCycling})...`);
		this._logService.debug(`[PukuFimProvider][${reqId}] Requesting completion at ${document.fileName}:${position.line} (n=${n})`);

		// Cancel any stale pending request (Copilot pattern - nextEditProvider.ts:545-547)
		if (this._pendingFimRequest) {
			console.log(`[PukuFimProvider][${reqId}] 🚫 Cancelling stale pending request`);
			this._pendingFimRequest.cancellationTokenSource.cancel();
			this._pendingFimRequest = null;
		}

		// Create cancellation token source for this request (Copilot pattern)
		const requestCts = new vscode.CancellationTokenSource();
		// Link to parent token for cancellation propagation
		token.onCancellationRequested(() => requestCts.cancel());

		// Store pending request placeholder (will be updated with resultPromise)
		let pendingRequest: PendingFimRequest | null = null;

		// Create promise wrapper (self-cleaning like Copilot's removeFromPending)
		const resultPromise = (async (): Promise<PukuFimResult | null> => {
			try {
				// Mark request start time
				this._lastRequestTime = now;
				this._lastFileUri = fileUri;

				// Fetch completion from API
				const openFiles = [...importedFiles, ...semanticFiles];
				console.log(`[PukuFimProvider][${reqId}] Context: ${importedFiles.length} imports + ${semanticFiles.length} semantic files`);

				const completionsWithMeta = await this._fetchContextAwareCompletion(prefix, suffix, openFiles, document.languageId, requestCts.token, n, document, position, currentFileContent);
				console.log(`[PukuFimProvider][${reqId}] 📊 Fetch returned ${completionsWithMeta?.length || 0} completion(s)`);

				if (!completionsWithMeta || completionsWithMeta.length === 0) {
					console.log(`[PukuFimProvider][${reqId}] ❌ API returned null/empty completions`);
					return null;
				}
				console.log(`[PukuFimProvider][${reqId}] ✓ Got ${completionsWithMeta.length} completion(s)`);

				if (requestCts.token.isCancellationRequested) {
					console.log(`[PukuFimProvider][${reqId}] ❌ Cancelled after API call`);
					return null;
				}
				console.log(`[PukuFimProvider][${reqId}] ✓ Not cancelled`);
				console.log(`[PukuFimProvider][${reqId}] ✅ API returned ${completionsWithMeta.length} completion(s), first: "${completionsWithMeta[0].text.substring(0, 50)}..."`);

				// Store speculative request for next completion
				console.log(`[PukuFimProvider][${reqId}] 💾 Storing speculative request...`);
				this._storeSpeculativeRequest(completionId, document);

				// Store ALL completions in Radix Trie cache for future lookups (Feature #64)
				// Issue #133: Convert to CompletionChoice format (Copilot pattern)
				const choices = completionsWithMeta.map(c => ({
					completionText: c.text,
					metadata: c.metadata
				}));
				console.log(`[PukuFimProvider][${reqId}] 💾 Storing ${choices.length} completion(s) WITH METADATA in Radix Trie cache (prefixLen=${prefix.length})`);
				console.log(`[PukuFimProvider][${reqId}] [Issue #134] completionsWithMeta array length: ${completionsWithMeta.length}`);
				console.log(`[PukuFimProvider][${reqId}] [Issue #134] choices array length: ${choices.length}`);
				for (let i = 0; i < choices.length; i++) {
					console.log(`[PukuFimProvider][${reqId}] [Issue #134] Choice ${i + 1}: text="${choices[i].completionText.substring(0, 50)}...", metadata=${JSON.stringify(choices[i].metadata)}`);
				}
				completionsCache.append(prefix, suffix, choices, document, position);

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
				this._storeShownContext(fileUri, prefix, suffix, completionsWithMeta[0].text, reqId);

				// Feature #64: Create completion items with metadata
				// _createCompletionItem will determine display type (ghost text vs label)
				const completionItems = completionsWithMeta
					.map(c => this._createCompletionItem(c.text, finalRange, position, document.uri, document, c.metadata));

				console.log(`[PukuFimProvider][${reqId}] ✅ Returning ${completionItems.length}/${completionsWithMeta.length} completion item(s) to racing model`);
				console.log(`[PukuFimProvider][${reqId}] [Issue #136] completionsWithMeta.length: ${completionsWithMeta.length}`);
				console.log(`[PukuFimProvider][${reqId}] [Issue #136] completionItems.length: ${completionItems.length}`);
				for (let i = 0; i < completionItems.length; i++) {
					const item = completionItems[i];
					const hasDisplayLocation = (item as any).displayLocation !== undefined;
					console.log(`[PukuFimProvider][${reqId}] [Issue #136] Item ${i + 1}: hasDisplayLocation=${hasDisplayLocation}, text="${item.insertText.toString().substring(0, 50)}..."`);
				}
				return {
					type: 'fim',
					completion: completionItems, // Always return array (Feature #64)
					requestId: reqId
				};
			} catch (error) {
				console.error(`[PukuFimProvider][${reqId}] ❌ API error: ${error}`);
				this._logService.error(`[PukuFimProvider][${reqId}] Error: ${error}`);
				return null;
			} finally {
				// Self-cleanup (Copilot pattern - removeFromPending at lines 698-703)
				if (this._pendingFimRequest === pendingRequest) {
					this._pendingFimRequest = null;
				}
				requestCts.dispose();
			}
		})();

		// Store pending request for reuse (Copilot pattern - line 550)
		pendingRequest = {
			cancellationTokenSource: requestCts,
			resultPromise,
			fileUri,
			prefix: completionPrefix
		};
		this._pendingFimRequest = pendingRequest;

		// Await and return
		return await resultPromise;
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

			// Get FRESH current file context
			let currentFileContent = '';
			try {
				currentFileContent = await this._currentFileContextFlow.getCurrentFileContext(currentDoc, currentPos, 10000);
			} catch (error) {
				// Failed to extract current file context
			}

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
								if (result.uri.fsPath !== currentDoc.uri.fsPath) {return true;}
								const cursorInChunk = currentPos.line >= result.lineStart && currentPos.line <= result.lineEnd;
								return !cursorInChunk;
							})
							.map(result => ({ filepath: result.uri.fsPath, content: result.content }));
					}
				} catch (err) {
					// Semantic search failed silently
				}
			}

			const openFiles: Array<{ filepath: string; content: string }> = [...importedFiles, ...semanticFiles];
			const result = await this._fetchContextAwareCompletion(freshPrefix, freshSuffix, openFiles, currentDoc.languageId, new vscode.CancellationTokenSource().token, 1, currentDoc, currentPos, currentFileContent);
			return result ? result.map(c => c.text) : [];
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
		n: number = 1, // Number of completions to generate (1 for automatic, 3 for cycling)
		document?: vscode.TextDocument,
		position?: vscode.Position,
		currentFileContent?: string // For same-file style matching (Issue #3)
	): Promise<CompletionWithMetadata[] | null> {
		const config = this._configService.getConfig();
		const url = config.endpoints.fim;
		const authToken = await this._authService.getToken();
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',

		};

		// DEBUG: Log auth token status (Issue #109 debugging)
		console.log(`[FetchCompletion] 🔑 Auth token status: ${authToken ? 'PRESENT' : 'MISSING'}`);
		if (authToken) {
			console.log(`[FetchCompletion] 🔑 Token length: ${authToken.token?.length || 0}, starts with: "${authToken.token?.substring(0, 10)}..."`);
			headers['Authorization'] = `Bearer ${authToken.token}`;
		} else {
			console.error(`[FetchCompletion] ⚠️ NO AUTH TOKEN - API call will likely fail!`);
		}

		const requestBody: any = {
			prompt: prefix,
			suffix: suffix,
			openFiles: openFiles,
			language: languageId,
			max_tokens: 500, // Match GitHub Copilot's DEFAULT_MAX_COMPLETION_LENGTH (Issue #83)
			temperature: 0.1,
			stream: false, // Streaming not needed for fast FIM responses
			n, // Feature #64: Multiple completions
		};

		// Add metadata context for multi-document completions (Issue #133)
		if (document && position !== undefined) {
			const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
			requestBody.currentDocument = document.uri.toString();
			requestBody.position = { line: position.line, column: position.character };
			if (workspaceFolder) {
				requestBody.workspaceRoot = workspaceFolder.uri.fsPath;
			}
			console.log(`[FetchCompletion] 📍 Metadata context: doc=${requestBody.currentDocument}, pos=${requestBody.position.line}:${requestBody.position.column}, workspace=${requestBody.workspaceRoot || 'N/A'}`);
		}

		// Add current file context for style matching (Issue #3)
		if (currentFileContent && currentFileContent.length > 0) {
			requestBody.currentFileContent = currentFileContent;
			console.log(`[FetchCompletion] 📄 Current file context: ${currentFileContent.length} chars`);
		}

		console.log(`[FetchCompletion] 📤 Calling API: ${url} (language=${languageId})`);
		console.log(`[FetchCompletion] 📝 Request body (FULL PROMPT):`, JSON.stringify({
			...requestBody,
			prompt: `${requestBody.prompt.substring(0, 100)}...(${requestBody.prompt.length} chars total)...${requestBody.prompt.substring(Math.max(0, requestBody.prompt.length - 100))}`,
			suffix: `${requestBody.suffix?.substring(0, 100)}...(${requestBody.suffix?.length || 0} chars total)`,
			currentFileContent: currentFileContent ? `${currentFileContent.substring(0, 100)}...(${currentFileContent.length} chars)` : 'none',
			openFiles: requestBody.openFiles.map((f: any) => ({
				filepath: f.filepath,
				contentLength: f.content?.length || 0
			}))
		}, null, 2));
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
		const validCompletions: CompletionWithMetadata[] = [];

		// DEBUG: Log raw API response
		console.log(`[FetchCompletion] 🔍 Raw API response:`, JSON.stringify(data, null, 2));

		for (let i = 0; i < data.choices.length; i++) {
			const choice = data.choices[i];
			const text = choice.text || '';
			const trimmed = text.trim();
			const metadata = choice.metadata;

			console.log(`[FetchCompletion] Processing choice ${i + 1}/${data.choices.length}: length=${trimmed.length}, text="${text.substring(0, 100)}..."`);

			if (!trimmed) {
				console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} is empty, skipping`);
				continue;
			}

			// Check for duplicates with SUFFIX (Copilot's approach - Issue #109)
			// Only filter out if completion EXACTLY matches text that's already AFTER the cursor
			const suffixTrimmed = suffix.trimStart();
			if (suffixTrimmed.startsWith(trimmed)) {
				console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} is duplicate of suffix: "${trimmed.substring(0, 50)}..."`);
				continue;
			}

			// Filter import statements (Copilot's approach - importFiltering.ts)
			// Models often hallucinate wrong imports - let IDE handle this
			// EXCEPT: Allow import-only completions when they have displayLocation metadata (Issue #137)
			// These are intentional import redirections to line 0
			const hasDisplayLocationMetadata = metadata && metadata.displayType === 'label';
			const filteredText = ImportFilteringAspect.filterCompletion(trimmed, languageId);
			if (!filteredText || filteredText.trim().length === 0) {
				if (!hasDisplayLocationMetadata) {
					console.log(`[FetchCompletion] ⚠️ Choice ${i + 1} contains only imports, filtering out`);
					continue;
				}
				// Allow import-only completion because it has displayLocation metadata
				console.log(`[FetchCompletion] ✅ Choice ${i + 1} is import-only BUT has displayLocation metadata, allowing`);
			}

			// Use filtered text (with imports removed) for further processing
			// BUT: If this is a displayLocation import, use the original text (don't filter)
			const completionText = hasDisplayLocationMetadata ? trimmed : (filteredText || trimmed).trim();

			// Check for internal repetition
			const completionLines = completionText.split('\n');
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

			console.log(`[FetchCompletion] ✅ Choice ${i + 1} is valid: "${completionText.substring(0, 50)}..."`);
			validCompletions.push({ text: completionText, metadata });
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
	/**
	 * Create inline completion item with multi-document support
	 * Based on Copilot's createNextEditorEditCompletionItem() pattern
	 * Reference: inlineCompletionProvider.ts:320-349
	 *
	 * @param completion Completion text
	 * @param range Range for insertion
	 * @param position Current cursor position
	 * @param documentUri Current document URI
	 * @param metadata Completion metadata from API response
	 * @returns InlineCompletionItem with display location and command
	 */
	private _createCompletionItem(
		completion: string,
		range: vscode.Range,
		position: vscode.Position,
		documentUri: vscode.Uri,
		document: vscode.TextDocument,
		metadata?: {
			targetDocument?: string;
			targetLine?: number;
			targetColumn?: number;
			displayType?: 'code' | 'label';
		}
	): vscode.InlineCompletionItem {
		console.log(`[PukuFimProvider] 🔨 _createCompletionItem called: hasMetadata=${!!metadata}, completion="${completion.substring(0, 50)}..."`);

		// Resolve target document from metadata (Copilot pattern)
		// Reference: inlineCompletionProvider.ts:238-264
		const resolvedDocument = this._documentResolver.resolveFromMetadata(
			metadata,
			documentUri
		);

		// Determine if this is a simple inline suggestion (ghost text) or complex edit (label)
		// Priority 1: If metadata says "label", always use label (backend decision)
		// Priority 2: Multi-document edit (resolvedDocument exists)
		// Priority 3: Use Copilot's isInlineSuggestion() logic for same-document edits
		const hasMetadataLabel = metadata?.displayType === 'label';
		const isInlineCompletion = !hasMetadataLabel && this._isInlineSuggestion(position, document, range, completion);
		const isInlineEdit = !isInlineCompletion;

		console.log(`[PukuFimProvider] 🔍 Display logic: hasMetadataLabel=${hasMetadataLabel}, isInlineCompletion=${isInlineCompletion}, isInlineEdit=${isInlineEdit}, resolvedDocument=${!!resolvedDocument}`);

		// Use label display if:
		// 1. Metadata explicitly says "label", OR
		// 2. Multi-document edit (resolvedDocument exists), OR
		// 3. It's an inline edit (not simple inline completion)
		if (hasMetadataLabel || resolvedDocument || isInlineEdit) {
			// For same-document label displays, use current document
			const targetDocument = resolvedDocument?.document ?? vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri.toString())!;
			const targetRange = resolvedDocument?.range ?? range;

			// Determine edit type for context-aware labeling
			const editType = this.mapMetadataEditType(metadata?.editType);

			// Create label-based display location (Copilot pattern)
			// Reference: inlineCompletionProvider.ts:326-330
			const displayLocation = this._displayLocationFactory.createLabel(
				editType,
				targetDocument,
				targetRange,
				document,
				position,
				completion
			);

			// Create navigation command (Copilot pattern)
			// Reference: inlineCompletionProvider.ts:336-340
			const command = this._navigationCommandFactory.create(
				targetDocument.uri,
				targetRange
			);

			// Return completion item with label display (Copilot pattern)
			// Reference: inlineCompletionProvider.ts:341-348
			// CRITICAL: For displayLocation label edits, InlineCompletionItem.range must be TARGET
			// displayLocation.range is current position (where label shows)
			// InlineCompletionItem.range is target position (where code will be inserted)
			const item = new vscode.InlineCompletionItem(completion, targetRange);
			item.displayLocation = displayLocation;
			item.isInlineEdit = true; // Same as Copilot: isInlineEdit = !isInlineCompletion
			item.command = command;

			this._logService.info(
				`[PukuFimProvider] Created ${resolvedDocument ? 'multi-document' : 'label'} completion: ${targetDocument.uri.fsPath}:${targetRange.start.line + 1}`
			);

			// Track displayLocation completion for post-navigation cycling (Issue #displayLocation-cycling)
			// When Tab is pressed, VS Code navigates to target and re-queries completions
			// We need to return this same completion instead of cached results
			const trackingKey = `${targetDocument.uri.toString()}:${targetRange.start.line}`;
			this._activeDisplayLocationCompletions.set(trackingKey, item);
			console.log(`[PukuFimProvider] 📍 Tracking displayLocation completion: ${trackingKey}`);

			return item;
		}

		// Same-document edit: use ghost text (backward compatibility)
		// Reference: inlineCompletionProvider.ts:248-264
		return new vscode.InlineCompletionItem(completion, range);
	}

	/**
	 * Lifecycle handlers - IPukuNextEditProvider interface
	 */

	/**
	 * Wrapper for isInlineSuggestion() utility function
	 * Determines if completion should show as ghost text (true) or inline edit (false)
	 * Based on Copilot's pattern in inlineCompletionProvider.ts:251
	 */
	private _isInlineSuggestion(
		position: vscode.Position,
		document: vscode.TextDocument,
		range: vscode.Range,
		completionText: string
	): boolean {
		return isInlineSuggestion(position, document, range, completionText);
	}

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

	/**
	 * Clear ghost text for a file (Issue #57)
	 * Called by unified provider's lifecycle hooks when completion is accepted/rejected/ignored
	 */
	public clearGhostText(fileUri: string): void {
		const currentGhostText = this._currentGhostTextByFile.get(fileUri);
		if (currentGhostText) {
			currentGhostText.clear();
			console.log(`[PukuFimProvider] 🗑️ Cleared ghost text for ${fileUri}`);
		}
	}

	/**
	 * Get tracked displayLocation completion for post-navigation cycling (Issue #displayLocation-cycling)
	 * Returns the original completion item if it exists, and clears it from tracking
	 */
	public getTrackedDisplayLocationCompletion(fileUri: string, line: number): vscode.InlineCompletionItem | undefined {
		const trackingKey = `${fileUri}:${line}`;
		const item = this._activeDisplayLocationCompletions.get(trackingKey);
		if (item) {
			console.log(`[PukuFimProvider] ✅ Found tracked displayLocation completion: ${trackingKey}`);
			// Clear after retrieval (one-time use)
			this._activeDisplayLocationCompletions.delete(trackingKey);
			return item;
		}
		return undefined;
	}

	/**
	 * Map backend metadata editType to frontend EditType enum
	 */
	private mapMetadataEditType(editType: string | undefined): import('../utils/displayLocationFactory').EditType {
		const { EditType } = require('../utils/displayLocationFactory');

		switch (editType) {
			case 'import':
				return EditType.Import;
			case 'include':
				return EditType.Include;
			case 'newFile':
				return EditType.NewFile;
			case 'distantEdit':
				return EditType.DistantEdit;
			case 'generic':
			default:
				return EditType.Generic;
		}
	}
}
