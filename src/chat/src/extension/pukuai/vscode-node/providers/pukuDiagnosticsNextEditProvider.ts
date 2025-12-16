/*---------------------------------------------------------------------------------------------
 *  Puku Diagnostics Next Edit Provider - Copilot-style Racing Provider
 *  Implements IPukuNextEditProvider for diagnostic-based code fixes
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { ILogService } from '../../../../platform/log/common/logService';
import { Disposable } from '../../../../util/vs/base/common/lifecycle';
import { IPukuAuthService } from '../../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../../pukuIndexing/common/pukuConfig';
import { IPukuIndexingService, PukuIndexingStatus } from '../../../pukuIndexing/node/pukuIndexingService';
import { IPukuNextEditProvider, PukuDiagnosticsResult, DocumentId } from '../../common/nextEditProvider';
import { PukuDiagnosticsCache } from '../../node/pukuDiagnosticsCache';
import { DiagnosticFix, DiagnosticFixRequest, DiagnosticFixResponse } from '../../common/diagnosticTypes';

/**
 * Diagnostics Next Edit Provider - Racing provider for diagnostic fixes
 * Extracted from PukuDiagnosticsProvider for separation of concerns
 *
 * Key features:
 * - Implements runUntilNextEdit() with delay (Copilot pattern - give FIM priority)
 * - Caches diagnostics state to avoid redundant API calls
 * - Generates fixes via semantic search + LLM
 */
export class PukuDiagnosticsNextEditProvider extends Disposable implements IPukuNextEditProvider<PukuDiagnosticsResult> {
	readonly ID = 'puku-diagnostics';

	private _enabled = true;
	private _pukuEndpoint: string;
	private _cache = new PukuDiagnosticsCache();
	private _requestId = 0;

	constructor(
		@IPukuAuthService private readonly _authService: IPukuAuthService,
		@IPukuConfigService private readonly _configService: IPukuConfigService,
		@IPukuIndexingService private readonly _indexingService: IPukuIndexingService,
		@ILogService private readonly _logService: ILogService
	) {
		super();

		// Extract base endpoint from FIM endpoint (remove /v1/fim/context)
		const fimEndpoint = this._configService.getConfig().endpoints.fim;
		this._pukuEndpoint = fimEndpoint.replace(/\/v1\/fim\/context$/, '');

		// Listen to document changes for cache position tracking
		this._register(
			vscode.workspace.onDidChangeTextDocument(e => this._onDocumentChange(e))
		);

		this._logService.info('[PukuDiagnosticsNextEdit] Provider initialized with caching');
	}

	/**
	 * IPukuNextEditProvider implementation - main entry point
	 * Called immediately when inline completion is requested
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		const reqId = ++this._requestId;
		const document = docId.document;
		const position = docId.position;

		console.log(`[PukuDiagnosticsNextEdit][${reqId}] ⚡ getNextEdit called at ${document.fileName}:${position.line}:${position.character}`);

		return await this._computeDiagnosticFix(reqId, document, position, token);
	}

	/**
	 * Copilot-style delayed execution - gives FIM priority
	 * Diagnostics provider runs with delay to avoid blocking fast FIM completions
	 */
	async runUntilNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		delayMs: number,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		const reqId = ++this._requestId;
		const document = docId.document;
		const position = docId.position;

		console.log(`[PukuDiagnosticsNextEdit][${reqId}] ⏱️ runUntilNextEdit called with delay ${delayMs}ms`);

		// Wait for delay (allows FIM to win the race if it's fast)
		await new Promise(resolve => setTimeout(resolve, delayMs));

		if (token.isCancellationRequested) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] ❌ Cancelled during delay`);
			return null;
		}

		return await this._computeDiagnosticFix(reqId, document, position, token);
	}

	/**
	 * Core logic: compute diagnostic fix
	 */
	private async _computeDiagnosticFix(
		reqId: number,
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		// Early exits
		if (!this._enabled) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] ❌ Provider disabled`);
			return null;
		}

		// Get auth token asynchronously (fix for issue #54)
		const authToken = await this._authService.getToken();
		if (!authToken) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] ❌ No auth token`);
			return null;
		}
		const apiKey = authToken.token;

		// Check configuration
		const config = vscode.workspace.getConfiguration('puku.diagnostics');
		const autoFix = config.get<boolean>('autoFix', true);
		if (!autoFix) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] ❌ autoFix disabled in config`);
			return null;
		}

		// Get diagnostics near cursor
		const diagnostics = this._getDiagnosticsNearCursor(document, position);
		console.log(`[PukuDiagnosticsNextEdit][${reqId}] Found ${diagnostics.length} diagnostics near cursor`);

		// Check for 0 diagnostics FIRST (before cache) - Issue #107
		// This prevents returning stale cached fixes when diagnostics are cleared
		if (diagnostics.length === 0) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] No diagnostics near cursor`);
			this._cache.setCachedFix(null);
			return null;
		}

		// Check cache: only recompute if diagnostics changed (Copilot's approach)
		const diagnosticsChanged = this._cache.isEqualAndUpdate(diagnostics, document.uri);
		console.log(`[PukuDiagnosticsNextEdit][${reqId}] Diagnostics changed: ${diagnosticsChanged}`);

		if (!diagnosticsChanged) {
			// Diagnostics unchanged, check cached fix
			const cachedFix = this._cache.getCachedFix();

			// Re-validate distance for import fixes (cursor may have moved)
			// Use config value (GitHub Copilot uses maxDistance=12 for imports)
			if (cachedFix && cachedFix.fix.label.includes('import')) {
				const config = this._configService.getConfig();
				const maxDistance = config?.diagnostics?.maxDistanceForImport ?? 12; // Default to 12 (Copilot value)
				const distanceFromCursor = Math.abs(cachedFix.fix.range.start.line - position.line);
				if (distanceFromCursor > maxDistance) {
					console.log(`[PukuDiagnosticsNextEdit][${reqId}] Cached import fix too far from cursor (distance: ${distanceFromCursor}, max: ${maxDistance})`);
					return null;
				}
			}

			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Using cached fix`);
			return cachedFix;
		}

		// Diagnostics exist and changed, recompute fix

		// Check indexing is ready
		if (this._indexingService.status !== PukuIndexingStatus.Ready) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Indexing not ready (status: ${this._indexingService.status})`);
			return null;
		}

		console.log(`[PukuDiagnosticsNextEdit][${reqId}] ✓ All checks passed! Processing diagnostic: ${diagnostics[0].message}`);

		// Get closest diagnostic
		const diagnostic = diagnostics[0];

		// Generate fix
		const fix = await this._generateDiagnosticFix(reqId, diagnostic, document, token, apiKey);

		if (!fix) {
			this._logService.info(`[PukuDiagnosticsNextEdit][${reqId}] No fix generated`);
			return null;
		}

		// Check if this import already exists in the file (prevent duplicates)
		if (fix.label.includes('import')) {
			const fileText = document.getText();
			const importToAdd = fix.newText.trim();

			if (fileText.includes(importToAdd)) {
				console.log(`[PukuDiagnosticsNextEdit][${reqId}] Import already exists, skipping: ${importToAdd}`);
				return null;
			}

			// Skip import fixes that are too far from cursor (Copilot approach)
			// Use config value (GitHub Copilot uses maxDistance=12 for imports)
			const config = this._configService.getConfig();
			const maxDistance = config?.diagnostics?.maxDistanceForImport ?? 12; // Default to 12 (Copilot value)
			const distanceFromCursor = Math.abs(fix.range.start.line - position.line);
			if (distanceFromCursor > maxDistance) {
				console.log(`[PukuDiagnosticsNextEdit][${reqId}] Import fix too far from cursor (distance: ${distanceFromCursor}, max: ${maxDistance})`);
				return null;
			}
		}

		this._logService.info(`[PukuDiagnosticsNextEdit][${reqId}] Generated fix: ${fix.label}`);

		// Convert to PukuDiagnosticsResult format
		const result: PukuDiagnosticsResult = {
			type: 'diagnostics',
			fix: {
				range: new vscode.Range(
					new vscode.Position(fix.range.start.line, fix.range.start.character),
					new vscode.Position(fix.range.end.line, fix.range.end.character)
				),
				newText: fix.newText,
				label: fix.label
			},
			requestId: reqId
		};

		// Cache the result for future requests
		this._cache.setCachedFix(result);
		console.log(`[PukuDiagnosticsNextEdit][${reqId}] Cached fix for future requests: ${result.fix.label}`);

		return result;
	}

	/**
	 * Generate diagnostic fix using semantic search + LLM
	 */
	private async _generateDiagnosticFix(
		reqId: number,
		diagnostic: vscode.Diagnostic,
		document: vscode.TextDocument,
		token: vscode.CancellationToken,
		apiKey: string
	): Promise<DiagnosticFix | null> {
		try {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Generating diagnostic fix...`);

			// 1. Build search query from diagnostic
			const query = this._buildSearchQuery(diagnostic);
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Search query: ${query}`);
			this._logService.info(`[PukuDiagnosticsNextEdit][${reqId}] Search query: ${query}`);

			// 2. Search codebase using existing indexing service
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Searching codebase...`);
			const searchResults = await this._indexingService.search(
				query,
				5,   // top 5 results
				document.languageId
			);

			if (searchResults.length === 0) {
				console.log(`[PukuDiagnosticsNextEdit][${reqId}] No similar code found in codebase`);
				this._logService.info(`[PukuDiagnosticsNextEdit][${reqId}] No similar code found in codebase`);
				return null;
			}

			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Found ${searchResults.length} similar code chunks`);
			this._logService.info(`[PukuDiagnosticsNextEdit][${reqId}] Found ${searchResults.length} similar code chunks`);

			// 3. Build examples from search results
			const codebaseExamples = searchResults.map(result => ({
				code: result.content,
				file: this._getFileName(result.uri.toString()),
				similarity: result.score
			}));

			// 4. Call worker to generate fix
			const requestBody: DiagnosticFixRequest = {
				diagnostic: {
					source: diagnostic.source || 'unknown',
					code: diagnostic.code?.toString() || '',
					message: diagnostic.message,
					range: {
						start: {
							line: diagnostic.range.start.line,
							character: diagnostic.range.start.character
						},
						end: {
							line: diagnostic.range.end.line,
							character: diagnostic.range.end.character
						}
					}
				},
				codebaseExamples,
				fileContent: document.getText(),
				currentImports: this._extractImports(document),
				language: document.languageId
			};

			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Calling worker API...`);
			const response = await fetch(`${this._pukuEndpoint}/v1/diagnostics/fix`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`
				},
				body: JSON.stringify(requestBody)
			});

			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Worker response status: ${response.status}`);

			if (!response.ok) {
				console.log(`[PukuDiagnosticsNextEdit][${reqId}] Worker returned ${response.status}`);
				this._logService.error(`[PukuDiagnosticsNextEdit][${reqId}] Worker returned ${response.status}`);
				return null;
			}

			const result: DiagnosticFixResponse = await response.json();
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Got fix from worker: ${result.fix?.label}`);
			return result.fix;

		} catch (error) {
			console.log(`[PukuDiagnosticsNextEdit][${reqId}] Error generating fix:`, error);
			this._logService.error(`[PukuDiagnosticsNextEdit][${reqId}] Error generating fix:`, error);
			return null;
		}
	}

	/**
	 * Build semantic search query from diagnostic message
	 */
	private _buildSearchQuery(diagnostic: vscode.Diagnostic): string {
		// Extract symbol name from error message
		// e.g., "Cannot find name 'useState'" -> "useState"
		const symbolMatch = diagnostic.message.match(/['"`](\w+)['"`]/);
		const symbol = symbolMatch?.[1] || '';

		// Build semantic search query
		return `${symbol} usage example`;
	}

	/**
	 * Get diagnostics near cursor position
	 */
	private _getDiagnosticsNearCursor(
		document: vscode.TextDocument,
		position: vscode.Position
	): vscode.Diagnostic[] {
		const allDiagnostics = vscode.languages.getDiagnostics(document.uri);
		const maxDistance = vscode.workspace.getConfiguration('puku.diagnostics').get<number>('maxDistance', 2);

		// Only errors and warnings within maxDistance lines
		return allDiagnostics
			.filter(d =>
				d.severity <= vscode.DiagnosticSeverity.Warning &&
				Math.abs(d.range.start.line - position.line) <= maxDistance
			)
			.sort((a, b) =>
				Math.abs(a.range.start.line - position.line) -
				Math.abs(b.range.start.line - position.line)
			);
	}

	/**
	 * Extract imports from document
	 */
	private _extractImports(document: vscode.TextDocument): string[] {
		const text = document.getText();
		const imports: string[] = [];

		// Match various import patterns
		const patterns = [
			/^import\s+.*?\s+from\s+['"](.+?)['"]/gm,  // ES6: import ... from '...'
			/^import\s+['"](.+?)['"]/gm,               // ES6: import '...'
			/^const\s+.*?\s*=\s*require\(['"](.+?)['"]\)/gm,  // CommonJS
			/^from\s+(\S+)\s+import/gm                 // Python
		];

		for (const pattern of patterns) {
			let match;
			while ((match = pattern.exec(text)) !== null) {
				imports.push(match[1]);
			}
		}

		return imports;
	}

	/**
	 * Get file name from URI
	 */
	private _getFileName(uri: string): string {
		return uri.substring(uri.lastIndexOf('/') + 1);
	}

	/**
	 * Handle document changes to update cached diagnostic positions
	 */
	private _onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
		// Update cached diagnostic positions for all changes
		for (const change of e.contentChanges) {
			this._cache.applyEdit(change);
		}
	}

	/**
	 * Lifecycle handlers - IPukuNextEditProvider interface
	 */

	handleShown(result: PukuDiagnosticsResult): void {
		console.log(`[PukuDiagnosticsNextEdit] 👁️ Fix shown: ${result.fix.label}`);
		// Track shown fixes for analytics
	}

	handleAcceptance(docId: DocumentId, result: PukuDiagnosticsResult): void {
		console.log(`[PukuDiagnosticsNextEdit] ✅ Fix accepted: ${result.fix.label}`);
		// Track acceptance for analytics and model improvement
	}

	handleRejection(docId: DocumentId, result: PukuDiagnosticsResult): void {
		console.log(`[PukuDiagnosticsNextEdit] ❌ Fix rejected: ${result.fix.label}`);
		// Track rejection for analytics
	}

	handleIgnored(docId: DocumentId, result: PukuDiagnosticsResult, supersededBy?: PukuDiagnosticsResult): void {
		console.log(`[PukuDiagnosticsNextEdit] ⏭️ Fix ignored: ${result.fix.label}, supersededBy: ${supersededBy?.fix.label}`);
		// Track when fixes are superseded by newer ones (racing)
	}

	/**
	 * Enable/disable the provider
	 */
	setEnabled(enabled: boolean): void {
		this._enabled = enabled;
		this._logService.info(`[PukuDiagnosticsNextEdit] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}

	override dispose(): void {
		this._cache.clear();
		super.dispose();
		this._logService.info('[PukuDiagnosticsNextEdit] Provider disposed');
	}
}
