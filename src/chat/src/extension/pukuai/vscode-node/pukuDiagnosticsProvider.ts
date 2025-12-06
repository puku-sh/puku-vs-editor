/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Diagnostics-based code fix provider using codebase semantic search
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuAuthService } from '../../pukuIndexing/common/pukuAuth';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';
import { IPukuIndexingService, PukuIndexingStatus } from '../../pukuIndexing/node/pukuIndexingService';
import { DiagnosticFix, DiagnosticFixRequest, DiagnosticFixResponse } from '../common/diagnosticTypes';
import { IPukuDiagnosticsProvider, PukuDiagnosticsResult } from './pukuInlineEditModel';
import { PukuDiagnosticsCache } from '../node/pukuDiagnosticsCache';

/**
 * Provides diagnostic fixes via unified provider architecture
 * - Implements IPukuDiagnosticsProvider: getDiagnosticsFix() for unified provider racing model
 * - Implements CodeActionProvider: provideCodeActions() for lightbulb menu (💡)
 *
 * Note: Does NOT implement InlineCompletionItemProvider (handled by PukuUnifiedInlineProvider)
 */
export class PukuDiagnosticsProvider implements vscode.CodeActionProvider, IPukuDiagnosticsProvider {
	private enabled = true;
	private pukuEndpoint: string;
	private apiKey: string | undefined;
	private _cache = new PukuDiagnosticsCache();
	private _disposables: vscode.Disposable[] = [];

	constructor(
		@IPukuAuthService private readonly pukuAuthService: IPukuAuthService,
		@IPukuConfigService private readonly pukuConfigService: IPukuConfigService,
		@IPukuIndexingService private readonly pukuIndexingService: IPukuIndexingService,
		@ILogService private readonly logService: ILogService
	) {
		// Extract base endpoint from FIM endpoint (remove /v1/fim/context)
		const fimEndpoint = this.pukuConfigService.getConfig().endpoints.fim;
		this.pukuEndpoint = fimEndpoint.replace(/\/v1\/fim\/context$/, '');
		this.apiKey = this.pukuAuthService.token?.token;

		// Listen for auth changes
		this.pukuAuthService.onDidChangeAuthStatus(() => {
			this.apiKey = this.pukuAuthService.token?.token;
		});

		// Listen to document changes for cache position tracking
		this._disposables.push(
			vscode.workspace.onDidChangeTextDocument(e => this._onDocumentChange(e))
		);

		this.logService.info('[PukuDiagnostics] Provider initialized with caching');
	}

	/**
	 * Public API for unified provider - implements IPukuDiagnosticsProvider
	 * Returns a diagnostics fix result or null
	 */
	async getDiagnosticsFix(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null> {
		console.log('[PukuDiagnostics] getDiagnosticsFix called', {
			file: document.fileName,
			line: position.line,
			char: position.character
		});

		// Early exits
		if (!this.enabled) {
			console.log('[PukuDiagnostics] Provider disabled');
			this.logService.info('[PukuDiagnostics] Provider disabled');
			return null;
		}

		if (!this.apiKey) {
			console.log('[PukuDiagnostics] No API key, skipping');
			this.logService.info('[PukuDiagnostics] No API key, skipping');
			return null;
		}

		// Check configuration
		const config = vscode.workspace.getConfiguration('puku.diagnostics');
		const autoFix = config.get<boolean>('autoFix', true);
		if (!autoFix) {
			console.log('[PukuDiagnostics] autoFix disabled in config');
			this.logService.info('[PukuDiagnostics] autoFix disabled in config');
			return null;
		}

		// Get diagnostics near cursor
		const diagnostics = this.getDiagnosticsNearCursor(document, position);
		console.log('[PukuDiagnostics] ✅ CACHE CHECK: Found', diagnostics.length, 'diagnostics near cursor');

		// ✅ Check cache: only recompute if diagnostics changed (Copilot's approach)
		const diagnosticsChanged = this._cache.isEqualAndUpdate(diagnostics, document.uri);
		console.log('[PukuDiagnostics] ✅ CACHE RESULT: diagnosticsChanged =', diagnosticsChanged);

		if (!diagnosticsChanged) {
			// Diagnostics unchanged, check cached fix
			const cachedFix = this._cache.getCachedFix();

			// ✅ Re-validate distance for import fixes (cursor may have moved)
			// Import fixes insert at line 0, but cursor might have moved far away
			if (cachedFix && cachedFix.fix.label.includes('import')) {
				const distanceFromCursor = Math.abs(cachedFix.fix.range.start.line - position.line);
				if (distanceFromCursor > 2) {
					console.log('[PukuDiagnostics] Cached import fix too far from cursor (distance:', distanceFromCursor, '), skipping');
					this.logService.info(`[PukuDiagnostics] Cached import fix too far from cursor (distance: ${distanceFromCursor}), skipping`);
					return null;
				}
			}

			console.log('[PukuDiagnostics] Using cached fix (diagnostics unchanged), cachedFix:', cachedFix ? 'present' : 'null');
			this.logService.info('[PukuDiagnostics] Using cached fix (diagnostics unchanged)');
			return cachedFix;
		}

		// Diagnostics changed, log and recompute
		console.log(`[PukuDiagnostics] Diagnostics changed! Found ${diagnostics.length} diagnostics near cursor (recomputing)`);
		if (diagnostics.length === 0) {
			console.log('[PukuDiagnostics] No diagnostics near cursor - all diagnostics:', vscode.languages.getDiagnostics(document.uri).length);
			this.logService.info('[PukuDiagnostics] No diagnostics near cursor');
			this._cache.setCachedFix(null); // Cache null result
			return null;
		}

		// Check indexing is ready
		if (this.pukuIndexingService.status !== PukuIndexingStatus.Ready) {
			console.log(`[PukuDiagnostics] Indexing not ready (status: ${this.pukuIndexingService.status}), skipping`);
			this.logService.info(`[PukuDiagnostics] Indexing not ready (status: ${this.pukuIndexingService.status}), skipping`);
			return null;
		}

		console.log(`[PukuDiagnostics] ✓ All checks passed! Processing diagnostic: ${diagnostics[0].message}`);

		// Get closest diagnostic
		const diagnostic = diagnostics[0];
		this.logService.info(`[PukuDiagnostics] Generating fix for: ${diagnostic.message}`);

		// Generate fix
		const fix = await this.generateDiagnosticFix(diagnostic, document, token);

		if (!fix) {
			this.logService.info('[PukuDiagnostics] No fix generated');
			return null;
		}

		// Check if this import already exists in the file (prevent duplicates)
		if (fix.label.includes('import')) {
			const fileText = document.getText();
			const importToAdd = fix.newText.trim();

			// Check if exact import already exists
			if (fileText.includes(importToAdd)) {
				console.log('[PukuDiagnostics] Import already exists, skipping:', importToAdd);
				this.logService.info('[PukuDiagnostics] Import already exists, skipping');
				return null;
			}

			// Skip import fixes that are too far from cursor (Copilot approach)
			// Import fixes insert at line 0, but if cursor is far away, skip to avoid blocking FIM
			const distanceFromCursor = Math.abs(fix.range.start.line - position.line);
			if (distanceFromCursor > 2) {
				console.log('[PukuDiagnostics] Import fix too far from cursor, skipping (distance:', distanceFromCursor, ')');
				this.logService.info(`[PukuDiagnostics] Import fix too far from cursor (distance: ${distanceFromCursor}), skipping`);
				return null;
			}
		}

		this.logService.info(`[PukuDiagnostics] Generated fix: ${fix.label}`);

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
			}
		};

		// ✅ Cache the result for future requests
		this._cache.setCachedFix(result);
		console.log('[PukuDiagnostics] Cached fix for future requests:', result.fix.label);

		return result;
	}

	// Note: provideInlineCompletionItems() removed - handled by PukuUnifiedInlineProvider
	// All inline completion requests go through: UnifiedProvider → Racing Model → getDiagnosticsFix()

	private async generateDiagnosticFix(
		diagnostic: vscode.Diagnostic,
		document: vscode.TextDocument,
		token: vscode.CancellationToken
	): Promise<DiagnosticFix | null> {

		try {
			console.log('[PukuDiagnostics] generateDiagnosticFix starting...');

			// 1. Build search query from diagnostic
			const query = this.buildSearchQuery(diagnostic);
			console.log(`[PukuDiagnostics] Search query: ${query}`);
			this.logService.info(`[PukuDiagnostics] Search query: ${query}`);

			// 2. Search codebase using existing indexing service (handles embedding internally)
			console.log('[PukuDiagnostics] Searching codebase...');
			const searchResults = await this.pukuIndexingService.search(
				query,
				5,   // top 5 results
				document.languageId
			);

			if (searchResults.length === 0) {
				console.log('[PukuDiagnostics] No similar code found in codebase');
				this.logService.info('[PukuDiagnostics] No similar code found in codebase');
				return null;
			}

			console.log(`[PukuDiagnostics] Found ${searchResults.length} similar code chunks`);
			this.logService.info(`[PukuDiagnostics] Found ${searchResults.length} similar code chunks`);

			// 3. Build examples from search results
			const codebaseExamples = searchResults.map(result => ({
				code: result.content,
				file: this.getFileName(result.uri.toString()),
				similarity: result.score
			}));

			// 5. Call worker to generate fix
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
				currentImports: this.extractImports(document),
				language: document.languageId
			};

			console.log('[PukuDiagnostics] Calling worker API...');
			const response = await fetch(`${this.pukuEndpoint}/v1/diagnostics/fix`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.apiKey}`
				},
				body: JSON.stringify(requestBody)
			});

			console.log(`[PukuDiagnostics] Worker response status: ${response.status}`);

			if (!response.ok) {
				console.log(`[PukuDiagnostics] Worker returned ${response.status}`);
				this.logService.error(`[PukuDiagnostics] Worker returned ${response.status}`);
				return null;
			}

			const result: DiagnosticFixResponse = await response.json();
			console.log('[PukuDiagnostics] Got fix from worker:', result.fix?.label);
			return result.fix;

		} catch (error) {
			console.log('[PukuDiagnostics] Error generating fix:', error);
			this.logService.error('[PukuDiagnostics] Error generating fix:', error);
			return null;
		}
	}

	// Note: createInlineEditItem() removed - unified provider handles inline completion item creation

	private buildSearchQuery(diagnostic: vscode.Diagnostic): string {
		// Extract symbol name from error message
		// e.g., "Cannot find name 'useState'" -> "useState"
		const symbolMatch = diagnostic.message.match(/['"`](\w+)['"`]/);
		const symbol = symbolMatch?.[1] || '';

		// Build semantic search query
		return `${symbol} usage example`;
	}

	private getDiagnosticsNearCursor(
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

	private extractImports(document: vscode.TextDocument): string[] {
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

	private getFileName(uri: string): string {
		return uri.substring(uri.lastIndexOf('/') + 1);
	}

	/**
	 * Provide code actions for diagnostics (lightbulb menu 💡)
	 * Used for import fixes and other distant refactorings
	 */
	async provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
		context: vscode.CodeActionContext,
		token: vscode.CancellationToken
	): Promise<vscode.CodeAction[] | undefined> {
		// Only provide code actions if there are diagnostics
		if (context.diagnostics.length === 0) {
			return undefined;
		}

		if (!this.enabled || !this.apiKey) {
			return undefined;
		}

		const actions: vscode.CodeAction[] = [];

		for (const diagnostic of context.diagnostics) {
			// Only handle errors and warnings
			if (diagnostic.severity > vscode.DiagnosticSeverity.Warning) {
				continue;
			}

			// Generate fix for this diagnostic
			const fix = await this.generateDiagnosticFix(diagnostic, document, token);

			if (!fix) {
				continue;
			}

			// Create code action
			const action = new vscode.CodeAction(
				fix.label.replace('TAB to ', ''), // Remove TAB instruction for lightbulb
				vscode.CodeActionKind.QuickFix
			);

			// Apply the fix
			const edit = new vscode.WorkspaceEdit();
			const fixRange = new vscode.Range(
				new vscode.Position(fix.range.start.line, fix.range.start.character),
				new vscode.Position(fix.range.end.line, fix.range.end.character)
			);
			edit.replace(document.uri, fixRange, fix.newText);

			action.edit = edit;
			action.diagnostics = [diagnostic];
			action.isPreferred = true; // Mark as preferred quick fix

			actions.push(action);
		}

		return actions.length > 0 ? actions : undefined;
	}

	/**
	 * Handle document changes to update cached diagnostic positions
	 * Based on Copilot's approach (diagnosticsCompletionProcessor.ts:208-260)
	 */
	private _onDocumentChange(e: vscode.TextDocumentChangeEvent): void {
		// Update cached diagnostic positions for all changes
		for (const change of e.contentChanges) {
			this._cache.applyEdit(change);
		}
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		this.logService.info(`[PukuDiagnostics] Provider ${enabled ? 'enabled' : 'disabled'}`);
	}

	dispose(): void {
		this._cache.clear();
		this._disposables.forEach(d => d.dispose());
		this.logService.info('[PukuDiagnostics] Provider disposed');
	}
}
