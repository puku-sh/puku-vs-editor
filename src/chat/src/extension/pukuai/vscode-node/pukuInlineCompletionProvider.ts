/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Standalone inline completion provider using Puku AI proxy
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IFetcherService } from '../../../platform/networking/common/fetcherService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuIndexingService } from '../../pukuIndexing/node/pukuIndexingService';
import { pukuImportExtractor } from '../../pukuIndexing/node/pukuImportExtractor';

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
	private _debounceMs = 600; // Higher debounce for "accept word" which triggers multiple rapid requests
	private _enabled = true;
	private _requestId = 0;
	private _completionId = 0;
	private _speculativeCache = new SpeculativeRequestCache();
	private _lastCompletionId: string | null = null;
	private _lastPrefix = '';
	private _requestInFlight = false; // Prevent concurrent requests
	// Track current completion being displayed (for word-by-word acceptance)
	private _currentCompletion: string | null = null;
	private _currentCompletionPrefix: string = '';

	constructor(
		private readonly _endpoint: string,
		@IFetcherService private readonly _fetcherService: IFetcherService,
		@ILogService private readonly _logService: ILogService,
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
	) {
		super();
		this._logService.info(`[PukuInlineCompletion] Provider created with endpoint: ${_endpoint}`);
	}

	/**
	 * Generate unique completion ID (Copilot-style)
	 */
	private _generateCompletionId(): string {
		return `puku-completion-${++this._completionId}`;
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

		// Check if user is accepting the current completion word-by-word
		// This prevents unnecessary API calls when user uses Cmd+Right Arrow
		const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
		if (this._currentCompletion && this._currentCompletionPrefix && prefix.startsWith(this._currentCompletionPrefix)) {
			const acceptedLength = prefix.length - this._currentCompletionPrefix.length;

			if (acceptedLength < this._currentCompletion.length) {
				// User is still accepting the same completion - return remaining part
				const remaining = this._currentCompletion.slice(acceptedLength);
				console.log(`[PukuInlineCompletion][${reqId}] Reusing current completion - ${acceptedLength}/${this._currentCompletion.length} chars accepted, ${remaining.length} remaining (NO API CALL!)`);
				return [new vscode.InlineCompletionItem(remaining, new vscode.Range(position, position))];
			} else {
				// User has fully accepted the completion or gone beyond it
				console.log(`[PukuInlineCompletion][${reqId}] Current completion exhausted - need new completion`);
				this._currentCompletion = null;
				this._currentCompletionPrefix = '';
			}
		} else if (this._currentCompletionPrefix && !prefix.startsWith(this._currentCompletionPrefix)) {
			// User typed something different - invalidate current completion
			console.log(`[PukuInlineCompletion][${reqId}] Prefix changed - invalidating current completion`);
			this._currentCompletion = null;
			this._currentCompletionPrefix = '';
		}

		// Generate completion ID early (needed for cache and storing next request)
		const completionId = this._generateCompletionId();

		// Check speculative cache FIRST (before debounce) - Copilot-style prefetching
		// This happens when user accepted the previous completion
		console.log(`[PukuInlineCompletion][${reqId}] Cache check: _lastCompletionId=${this._lastCompletionId}, has=${this._lastCompletionId ? this._speculativeCache.has(this._lastCompletionId) : false}`);
		if (this._lastCompletionId && this._speculativeCache.has(this._lastCompletionId)) {
			console.log(`[PukuInlineCompletion][${reqId}] Speculative cache HIT for ${this._lastCompletionId}! Bypassing debounce...`);

			// Set lock to prevent concurrent requests while cache executes
			this._requestInFlight = true;

			const cachedCompletionId = this._lastCompletionId;
			const completion = await this._speculativeCache.request(cachedCompletionId);

			// Release lock
			this._requestInFlight = false;

			if (completion && !token.isCancellationRequested) {
				// Update tracking for cache hits
				const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
				this._lastRequestTime = Date.now();
				this._lastPrefix = prefix;

				// Store next speculative request for when user types after accepting this one
				const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));
				const nextPrefix = prefix + completion;
				const nextSuffix = suffix;

				const speculativeRequestFn = async (): Promise<string | null> => {
					console.log(`[PukuInlineCompletion][${reqId}] Executing speculative prefetch for completion ${completionId}...`);
					const importedFiles = await this._getImportedFilesContent(document, 3, 500);
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
				this._lastCompletionId = completionId;
				console.log(`[PukuInlineCompletion][${reqId}] Cache HIT - Stored next speculative request for completion ${completionId}`);

				// Store current completion for word-by-word acceptance
				this._currentCompletion = completion;
				this._currentCompletionPrefix = prefix;

				return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
			}
		}

		// Cache MISS - Check debounce (prefix already extracted above)
		console.log(`[PukuInlineCompletion][${reqId}] Speculative cache MISS - Checking debounce...`);

		// Debounce - wait between requests (only for cache misses)
		// Single-char skip removed - conflicts with speculative caching
		const now = Date.now();
		if (now - this._lastRequestTime < this._debounceMs) {
			console.log(`[PukuInlineCompletion][${reqId}] Debounced`);
			return null;
		}

		// Block concurrent requests - only one API call at a time
		if (this._requestInFlight) {
			console.log(`[PukuInlineCompletion][${reqId}] Request already in flight - skipping`);
			return null;
		}

		this._lastRequestTime = now;
		this._lastPrefix = prefix;

		const suffix = document.getText(new vscode.Range(
			position,
			document.lineAt(document.lineCount - 1).range.end
		));

		console.log(`[PukuInlineCompletion][${reqId}] Prefix length: ${prefix.length}, suffix length: ${suffix.length}`);

		// Don't complete if prefix is too short
		if (prefix.trim().length < 2) {
			console.log(`[PukuInlineCompletion][${reqId}] Prefix too short: ${prefix.trim().length}`);
			return null;
		}

		// Fetch completion from API
		console.log(`[PukuInlineCompletion][${reqId}] Fetching completion from API...`);
		this._logService.debug(`[PukuInlineCompletion][${reqId}] Requesting completion at ${document.fileName}:${position.line}`);

		// Mark request as in flight
		this._requestInFlight = true;

		let completion: string | null = null;
		try {
			// 1. Get import-based context (NEW!)
			const importedFiles = await this._getImportedFilesContent(document, 3, 500);
			console.log(`[PukuInlineCompletion][${reqId}] Import context: ${importedFiles.length} files`);

			// 2. Get semantic search context (existing)
			let semanticFiles: Array<{ filepath: string; content: string }> = [];

			if (this._indexingService.isAvailable()) {
				// Get current line as search query
				const currentLine = document.lineAt(position.line).text.trim();
				if (currentLine.length > 3) {
					try {
						const searchResults = await this._indexingService.search(currentLine, 2, document.languageId);
						console.log(`[PukuInlineCompletion][${reqId}] Found ${searchResults.length} similar code snippets for ${document.languageId}`);

						// Convert search results to openFiles format
						// Allow same-file results if they don't overlap with cursor position
						semanticFiles = searchResults
							.filter(result => {
								// Different file - always include
								if (result.uri.fsPath !== document.uri.fsPath) {
									return true;
								}
								// Same file - exclude if chunk contains cursor (would duplicate what user is typing)
								const cursorInChunk = position.line >= result.lineStart && position.line <= result.lineEnd;
								return !cursorInChunk;
							})
							.map(result => ({
								filepath: result.uri.fsPath,
								content: result.content
							}));
					} catch (searchError) {
						console.log(`[PukuInlineCompletion][${reqId}] Semantic search failed: ${searchError}`);
					}
				}
			}

			// 3. Combine: imports FIRST, then semantic search
			const openFiles = [...importedFiles, ...semanticFiles];
			console.log(`[PukuInlineCompletion][${reqId}] Total context: ${openFiles.length} files (${importedFiles.length} imports, ${semanticFiles.length} semantic)`);

			// 4. Call FIM with combined context
			completion = await this._fetchContextAwareCompletion(prefix, suffix, openFiles, document.languageId, token);

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
			const importedFiles = await this._getImportedFilesContent(document, 3, 500);

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
		this._lastCompletionId = completionId;
		console.log(`[PukuInlineCompletion][${reqId}] Stored speculative request for completion ${completionId}`);

		// Store current completion for word-by-word acceptance
		this._currentCompletion = completion;
		this._currentCompletionPrefix = prefix;

		return [new vscode.InlineCompletionItem(completion, new vscode.Range(position, position))];
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
		const url = `${this._endpoint}/v1/fim/context`;
		console.log(`[PukuInlineCompletion] Calling ${url} with language=${languageId}`);

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
		console.log(`[PukuInlineCompletion] Request body:`, JSON.stringify(requestBody, null, 2));

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

	/**
	 * Get file extensions to try for a language
	 */
	private _getExtensionsForLanguage(languageId: string): string[] {
		const extensionMap: Record<string, string[]> = {
			'typescript': ['.ts', '.tsx', '.js', '.jsx'],
			'javascript': ['.js', '.jsx', '.ts', '.tsx'],
			'typescriptreact': ['.tsx', '.ts', '.jsx', '.js'],
			'javascriptreact': ['.jsx', '.js', '.tsx', '.ts'],
			'python': ['.py'],
			'go': ['.go'],
			'java': ['.java'],
			'rust': ['.rs'],
			'cpp': ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
			'c': ['.c', '.h'],
			'csharp': ['.cs'],
			'ruby': ['.rb'],
			'php': ['.php'],
		};

		return extensionMap[languageId] || [''];
	}

	/**
	 * Resolve import paths to actual file URIs
	 */
	private _resolveImportPaths(
		imports: string[],
		currentFile: vscode.Uri,
		languageId: string
	): vscode.Uri[] {
		const resolvedFiles: vscode.Uri[] = [];
		const currentDir = vscode.Uri.joinPath(currentFile, '..');

		for (const importPath of imports) {
			try {
				let uri: vscode.Uri | undefined;

				if (importPath.startsWith('.')) {
					// Relative import: ./utils or ../helpers
					const extensions = this._getExtensionsForLanguage(languageId);

					for (const ext of extensions) {
						const candidatePath = importPath + ext;
						const candidateUri = vscode.Uri.joinPath(currentDir, candidatePath);

						// Check if file exists
						try {
							vscode.workspace.fs.stat(candidateUri);
							uri = candidateUri;
							break;
						} catch {
							// Try next extension
						}
					}
				} else if (importPath.startsWith('/')) {
					// Absolute import from workspace root
					const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
					if (workspaceRoot) {
						const extensions = this._getExtensionsForLanguage(languageId);
						for (const ext of extensions) {
							const candidatePath = importPath + ext;
							const candidateUri = vscode.Uri.joinPath(workspaceRoot, candidatePath);

							try {
								vscode.workspace.fs.stat(candidateUri);
								uri = candidateUri;
								break;
							} catch {
								// Try next extension
							}
						}
					}
				}

				if (uri) {
					resolvedFiles.push(uri);
				}
			} catch (error) {
				// Skip failed imports
				console.log(`[PukuInlineCompletion] Failed to resolve import: ${importPath}`);
			}
		}

		return resolvedFiles;
	}

	/**
	 * Read content from imported files using AST-based extraction
	 */
	private async _getImportedFilesContent(
		document: vscode.TextDocument,
		limit: number = 3,
		maxCharsPerFile: number = 500
	): Promise<Array<{ filepath: string; content: string }>> {
		// Use AST-based import extractor with caching
		const imports = await pukuImportExtractor.extractImportsWithCache(
			document.getText(),
			document.languageId,
			document.uri.toString()
		);

		if (imports.length === 0) {
			return [];
		}

		const resolvedUris = this._resolveImportPaths(imports, document.uri, document.languageId);
		const importedFiles: Array<{ filepath: string; content: string }> = [];

		// Take top N imports
		for (const uri of resolvedUris.slice(0, limit)) {
			try {
				const importedDoc = await vscode.workspace.openTextDocument(uri);
				const content = importedDoc.getText();

				// Take first N chars (truncate to avoid huge context)
				const truncated = content.substring(0, maxCharsPerFile);

				importedFiles.push({
					filepath: uri.fsPath,
					content: truncated,
				});
			} catch (error) {
				console.log(`[PukuInlineCompletion] Failed to read import: ${uri.fsPath}`);
			}
		}

		return importedFiles;
	}
}
