"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuFimProvider = void 0;
/*---------------------------------------------------------------------------------------------
 *  Puku AI FIM Provider - Copilot-style Next Edit Provider
 *  Implements IPukuNextEditProvider for racing architecture
 *--------------------------------------------------------------------------------------------*/
const vscode = __importStar(require("vscode"));
const logService_1 = require("../../../../platform/log/common/logService");
const fetcherService_1 = require("../../../../platform/networking/common/fetcherService");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const pukuAuth_1 = require("../../../pukuIndexing/common/pukuAuth");
const pukuConfig_1 = require("../../../pukuIndexing/common/pukuConfig");
const pukuIndexingService_1 = require("../../../pukuIndexing/node/pukuIndexingService");
const completionsCache_1 = require("../../common/completionsCache");
const commentCompletion_1 = require("../flows/commentCompletion");
const refactoringDetection_1 = require("../flows/refactoringDetection");
const importContext_1 = require("../flows/importContext");
const semanticSearch_1 = require("../flows/semanticSearch");
const commentDetection_1 = require("../helpers/commentDetection");
const positionValidation_1 = require("../helpers/positionValidation");
/**
 * LRU Cache implementation (Copilot-style)
 * Stores request functions for lazy execution
 */
class LRUCacheMap {
    constructor(size = 10) {
        this.valueMap = new Map();
        if (size < 1) {
            throw new Error('Size limit must be at least 1');
        }
        this.sizeLimit = size;
    }
    set(key, value) {
        if (this.has(key)) {
            this.valueMap.delete(key);
        }
        else if (this.valueMap.size >= this.sizeLimit) {
            // LRU eviction - remove oldest (first) entry
            const oldest = this.valueMap.keys().next().value;
            this.delete(oldest);
        }
        this.valueMap.set(key, value);
        return this;
    }
    get(key) {
        if (this.valueMap.has(key)) {
            const entry = this.valueMap.get(key);
            // Move to end (most recently used)
            this.valueMap.delete(key);
            this.valueMap.set(key, entry);
            return entry;
        }
        return undefined;
    }
    delete(key) {
        return this.valueMap.delete(key);
    }
    clear() {
        this.valueMap.clear();
    }
    get size() {
        return this.valueMap.size;
    }
    has(key) {
        return this.valueMap.has(key);
    }
    peek(key) {
        return this.valueMap.get(key);
    }
    keys() { return new Map(this.valueMap).keys(); }
    values() { return new Map(this.valueMap).values(); }
    entries() { return new Map(this.valueMap).entries(); }
    [Symbol.iterator]() { return this.entries(); }
    forEach(callbackfn, thisArg) {
        new Map(this.valueMap).forEach(callbackfn, thisArg);
    }
    get [Symbol.toStringTag]() { return 'LRUCacheMap'; }
}
class SpeculativeRequestCache {
    constructor() {
        this.cache = new LRUCacheMap(1000);
    }
    set(completionId, requestFunction) {
        this.cache.set(completionId, requestFunction);
    }
    async request(completionId) {
        const fn = this.cache.get(completionId);
        if (fn === undefined) {
            return null;
        }
        this.cache.delete(completionId);
        return await fn();
    }
    has(completionId) {
        return this.cache.has(completionId);
    }
    clear() {
        this.cache.clear();
    }
}
/**
 * Puku FIM Provider - Implements racing provider architecture
 * Extracted from PukuInlineCompletionProvider for separation of concerns
 */
let PukuFimProvider = class PukuFimProvider extends lifecycle_1.Disposable {
    constructor(_endpoint, _fetcherService, _logService, _authService, _indexingService, _configService) {
        super();
        this._endpoint = _endpoint;
        this._fetcherService = _fetcherService;
        this._logService = _logService;
        this._authService = _authService;
        this._indexingService = _indexingService;
        this._configService = _configService;
        this.ID = 'puku-fim';
        this._lastRequestTime = 0;
        this._requestId = 0;
        this._completionId = 0;
        this._speculativeCache = new SpeculativeRequestCache();
        this._lastCompletionIdByFile = new Map(); // File URI -> completion ID
        this._lastPrefix = '';
        this._lastFileUri = ''; // Track last file to skip debounce on file switch
        this._requestsInFlightByFile = new Map(); // Per-file locks for concurrent requests
        // Radix Trie cache for intelligent completion matching (handles typing, backspace, partial edits)
        // File-aware: separate cache per file
        this._completionsCacheByFile = new Map();
        const config = this._configService.getConfig();
        this._logService.info(`[PukuFimProvider] Provider created with endpoint: ${_endpoint}`);
        this._logService.info(`[PukuFimProvider] Config: FIM endpoint=${config.endpoints.fim}, model=${config.models.fim}, debounce=${config.performance.debounceMs}ms`);
        console.log(`[PukuFimProvider] Config loaded: debounce=${config.performance.debounceMs}ms, model=${config.models.fim}`);
        this._commentFlow = new commentCompletion_1.CommentCompletionFlow(_indexingService);
        this._refactoringFlow = new refactoringDetection_1.RefactoringDetectionFlow(_logService, _fetcherService, _authService);
        this._importFlow = new importContext_1.ImportContextFlow();
        this._semanticSearchFlow = new semanticSearch_1.SemanticSearchFlow(_indexingService, _configService);
        this._positionValidator = new positionValidation_1.PositionValidator();
    }
    /**
     * Get debounce delay from config service
     */
    get _debounceMs() {
        return this._configService.getConfig().performance.debounceMs;
    }
    /**
     * Generate unique completion ID (Copilot-style)
     */
    _generateCompletionId() {
        return `puku-completion-${++this._completionId}`;
    }
    /**
     * Get or create CompletionsCache for a file
     */
    _getCompletionsCache(fileUri) {
        let cache = this._completionsCacheByFile.get(fileUri);
        if (!cache) {
            cache = new completionsCache_1.CompletionsCache();
            this._completionsCacheByFile.set(fileUri, cache);
        }
        return cache;
    }
    /**
     * IPukuNextEditProvider implementation - main entry point
     */
    async getNextEdit(docId, context, token) {
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
        // Check Radix Trie cache FIRST (handles typing, backspace, partial edits)
        const completionsCache = this._getCompletionsCache(fileUri);
        const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const suffix = document.getText(new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end));
        const cached = completionsCache.findAll(prefix, suffix);
        if (cached.length > 0) {
            console.log(`[PukuFimProvider][${reqId}] 🎯 Radix Trie cache HIT! Found ${cached.length} cached completion(s)`);
            console.log(`[PukuFimProvider][${reqId}] 📄 Cached completion preview: "${cached[0].substring(0, 100)}${cached[0].length > 100 ? '...' : ''}"`);
            // Store position for validation
            this._positionValidator.update(fileUri, position);
            const completionItem = this._createCompletionItem(cached[0], new vscode.Range(position, position), position, document.uri);
            return {
                type: 'fim',
                completion: completionItem,
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
            let completion = null;
            try {
                completion = await this._speculativeCache.request(cachedCompletionId);
            }
            finally {
                // Always release lock
                this._requestsInFlightByFile.delete(fileUri);
            }
            if (completion && !token.isCancellationRequested) {
                // Update tracking for cache hits
                this._lastRequestTime = Date.now();
                this._lastFileUri = fileUri;
                this._lastPrefix = prefix;
                // Store speculative request for next completion
                this._storeSpeculativeRequest(completionId, document);
                // Store completion in Radix Trie cache for future lookups
                console.log(`[PukuFimProvider] 💾 Storing in Radix Trie cache (prefixLen=${prefix.length}, completionLen=${completion.length})`);
                completionsCache.append(prefix, suffix, completion);
                // Store position for validation
                this._positionValidator.update(fileUri, position);
                const completionItem = this._createCompletionItem(completion, new vscode.Range(position, position), position, document.uri);
                return {
                    type: 'fim',
                    completion: completionItem,
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
        let commentIntent = null;
        if (isCommentCompletion) {
            commentIntent = await this._commentFlow.extractCommentIntent(document, position);
        }
        // Skip completions if typing INSIDE a comment
        if (!isCommentCompletion && await (0, commentDetection_1.isInsideComment)(document, position)) {
            console.log(`[PukuFimProvider][${reqId}] ❌ Inside comment (not comment-based completion)`);
            return null;
        }
        console.log(`[PukuFimProvider][${reqId}] ✓ Not inside comment or is comment-based completion`);
        // Gather context
        const importedFiles = await this._importFlow.getImportedFilesContent(document, 3, 500);
        // Get semantic search context
        let semanticFiles = [];
        if (this._indexingService.isAvailable()) {
            const searchQuery = commentIntent || document.lineAt(position.line).text.trim();
            if (searchQuery.length > 3) {
                try {
                    if (commentIntent) {
                        semanticFiles = await this._commentFlow.getCommentContext(commentIntent, document, 3);
                    }
                    else {
                        semanticFiles = await this._semanticSearchFlow.searchSimilarCode(searchQuery, document.languageId, document.uri);
                    }
                }
                catch (searchError) {
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
        const contextScore = ((contextStrength.hasImports ? 3 : 0) +
            (contextStrength.hasSemanticMatches ? 2 : 0) +
            (contextStrength.isFileSwitched ? 2 : 0) +
            (contextStrength.isKnownLanguage ? 1 : 0) +
            (contextStrength.hasFileStructure ? 1 : 0));
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
        let replaceRange;
        let completionPrefix = prefix;
        let completionSuffix = suffix;
        if (shouldCheckRange) {
            const openFiles = [...importedFiles, ...semanticFiles];
            const detection = await this._refactoringFlow.detectEditRange(prefix, suffix, document.languageId, openFiles);
            if (detection?.shouldReplace && detection.confidence > 0.75) {
                this._logService.info(`[RangeDetection] Replacement suggested: ${detection.reason} (confidence: ${detection.confidence})`);
                const startLine = position.line - (detection.replaceRange.startLine - 1);
                const endLine = position.line + (detection.replaceRange.endLine - detection.replaceRange.startLine);
                replaceRange = new vscode.Range(new vscode.Position(Math.max(0, startLine), 0), new vscode.Position(endLine, document.lineAt(Math.min(endLine, document.lineCount - 1)).text.length));
                const lines = prefix.split('\n');
                completionPrefix = lines.slice(0, -detection.replaceRange.startLine + 1).join('\n');
            }
        }
        // Fetch completion from API
        console.log(`[PukuFimProvider][${reqId}] 🌐 Requesting completion from API...`);
        this._logService.debug(`[PukuFimProvider][${reqId}] Requesting completion at ${document.fileName}:${position.line}`);
        // Mark request as in flight for this file
        this._requestsInFlightByFile.set(fileUri, true);
        let completion = null;
        try {
            const openFiles = [...importedFiles, ...semanticFiles];
            console.log(`[PukuFimProvider][${reqId}] Context: ${importedFiles.length} imports + ${semanticFiles.length} semantic files`);
            completion = await this._fetchContextAwareCompletion(completionPrefix, completionSuffix, openFiles, document.languageId, token);
            console.log(`[PukuFimProvider][${reqId}] 📊 Fetch returned, completion=${completion ? `"${completion.substring(0, 30)}..."` : 'null'}, length=${completion?.length || 0}`);
            if (!completion) {
                console.log(`[PukuFimProvider][${reqId}] ❌ API returned null/empty completion`);
                return null;
            }
            console.log(`[PukuFimProvider][${reqId}] ✓ Completion is non-null`);
            if (token.isCancellationRequested) {
                console.log(`[PukuFimProvider][${reqId}] ❌ Cancelled after API call`);
                return null;
            }
            console.log(`[PukuFimProvider][${reqId}] ✓ Not cancelled`);
            console.log(`[PukuFimProvider][${reqId}] ✅ API returned completion: ${completion.substring(0, 50)}...`);
        }
        catch (error) {
            console.error(`[PukuFimProvider][${reqId}] ❌ API error: ${error}`);
            this._logService.error(`[PukuFimProvider][${reqId}] Error: ${error}`);
            return null;
        }
        finally {
            // Always release the lock for this file
            this._requestsInFlightByFile.delete(fileUri);
        }
        // Store speculative request for next completion
        console.log(`[PukuFimProvider][${reqId}] 💾 Storing speculative request...`);
        this._storeSpeculativeRequest(completionId, document);
        // Store completion in Radix Trie cache for future lookups
        console.log(`[PukuFimProvider][${reqId}] 💾 Storing in Radix Trie cache (prefixLen=${prefix.length}, completionLen=${completion.length})`);
        completionsCache.append(prefix, suffix, completion);
        // Store position for validation
        console.log(`[PukuFimProvider][${reqId}] 💾 Updating position validator...`);
        this._positionValidator.update(fileUri, position);
        // Calculate replacement range
        let finalRange;
        if (replaceRange) {
            finalRange = replaceRange;
            console.log(`[PukuFimProvider][${reqId}] 📐 Using replace range: ${replaceRange.start.line}:${replaceRange.start.character} -> ${replaceRange.end.line}:${replaceRange.end.character}`);
        }
        else if (suffix && suffix.trim().length > 0) {
            const lineEndPos = document.lineAt(position.line).range.end;
            finalRange = new vscode.Range(position, lineEndPos);
            console.log(`[PukuFimProvider][${reqId}] 📐 Using line-end range: ${position.line}:${position.character} -> ${lineEndPos.line}:${lineEndPos.character}`);
        }
        else {
            finalRange = new vscode.Range(position, position);
            console.log(`[PukuFimProvider][${reqId}] 📐 Using cursor position range: ${position.line}:${position.character}`);
        }
        console.log(`[PukuFimProvider][${reqId}] 🎨 Creating completion item...`);
        const completionItem = this._createCompletionItem(completion, finalRange, position, document.uri);
        console.log(`[PukuFimProvider][${reqId}] ✅ Returning completion item to racing model`);
        return {
            type: 'fim',
            completion: completionItem,
            requestId: reqId
        };
    }
    /**
     * Store speculative request for next completion (Copilot-style)
     */
    _storeSpeculativeRequest(completionId, document) {
        const speculativeRequestFn = async () => {
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
            let semanticFiles = [];
            if (this._indexingService.isAvailable()) {
                try {
                    const currentLine = currentDoc.lineAt(currentPos.line).text.trim();
                    if (currentLine.length > 3) {
                        const searchResults = await this._indexingService.search(currentLine, 2, currentDoc.languageId);
                        semanticFiles = searchResults
                            .filter(result => {
                            if (result.uri.fsPath !== currentDoc.uri.fsPath)
                                return true;
                            const cursorInChunk = currentPos.line >= result.lineStart && currentPos.line <= result.lineEnd;
                            return !cursorInChunk;
                        })
                            .map(result => ({ filepath: result.uri.fsPath, content: result.content }));
                    }
                }
                catch (err) {
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
     */
    async _fetchContextAwareCompletion(prefix, suffix, openFiles, languageId, token) {
        const config = this._configService.getConfig();
        const url = config.endpoints.fim;
        const authToken = await this._authService.getToken();
        const headers = {
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
        const data = await response.json();
        console.log(`[FetchCompletion] 📥 API response: ${JSON.stringify(data).substring(0, 200)}...`);
        if (data.choices && data.choices.length > 0) {
            const text = data.choices[0].text || '';
            const trimmed = text.trim();
            console.log(`[FetchCompletion] Raw text length: ${text.length}, trimmed: ${trimmed.length}`);
            if (!trimmed) {
                console.log(`[FetchCompletion] ❌ Empty completion after trim`);
                return null;
            }
            // Check for duplicates
            const prefixLines = prefix.split('\n');
            const lastLines = prefixLines.slice(-10).join('\n');
            const completionLines = trimmed.split('\n');
            console.log(`[FetchCompletion] Duplicate check: ${completionLines.length} completion lines vs last ${prefixLines.slice(-10).length} prefix lines`);
            for (const line of completionLines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 10 && lastLines.includes(cleanLine)) {
                    console.log(`[FetchCompletion] ❌ Duplicate detected: "${cleanLine.substring(0, 50)}..."`);
                    return null;
                }
            }
            console.log(`[FetchCompletion] ✓ No duplicates found`);
            // Check for internal repetition
            const lineFrequency = new Map();
            for (const line of completionLines) {
                const cleanLine = line.trim();
                if (cleanLine.length > 10) {
                    lineFrequency.set(cleanLine, (lineFrequency.get(cleanLine) || 0) + 1);
                }
            }
            for (const [line, count] of lineFrequency) {
                if (count >= 2) {
                    console.log(`[FetchCompletion] ❌ Repetition detected: "${line.substring(0, 50)}..." appears ${count} times`);
                    return null;
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
     * Create completion item
     */
    _createCompletionItem(completion, range, position, documentUri) {
        return new vscode.InlineCompletionItem(completion, range);
    }
    /**
     * Lifecycle handlers - IPukuNextEditProvider interface
     */
    handleShown(result) {
        console.log(`[PukuFimProvider] 👁️ Completion shown: reqId=${result.requestId}`);
        // Track shown completions for analytics
    }
    handleAcceptance(docId, result) {
        console.log(`[PukuFimProvider] ✅ Completion accepted: reqId=${result.requestId}`);
        // Track acceptance for analytics and model improvement
    }
    handleRejection(docId, result) {
        console.log(`[PukuFimProvider] ❌ Completion rejected: reqId=${result.requestId}`);
        // Track rejection for analytics
    }
    handleIgnored(docId, result, supersededBy) {
        console.log(`[PukuFimProvider] ⏭️ Completion ignored: reqId=${result.requestId}, supersededBy=${supersededBy?.requestId}`);
        // Track when completions are superseded by newer ones (racing)
    }
};
exports.PukuFimProvider = PukuFimProvider;
exports.PukuFimProvider = PukuFimProvider = __decorate([
    __param(1, fetcherService_1.IFetcherService),
    __param(2, logService_1.ILogService),
    __param(3, pukuAuth_1.IPukuAuthService),
    __param(4, pukuIndexingService_1.IPukuIndexingService),
    __param(5, pukuConfig_1.IPukuConfigService)
], PukuFimProvider);
//# sourceMappingURL=pukuFimProvider.js.map