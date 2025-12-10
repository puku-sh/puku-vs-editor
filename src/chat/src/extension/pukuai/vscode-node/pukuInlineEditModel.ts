/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline edit model - coordinates between diagnostics and FIM providers
 *  Now uses IPukuNextEditProvider racing architecture (Copilot-style)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuNextEditProvider, PukuFimResult, PukuDiagnosticsResult, PukuNextEditResult, DocumentId } from '../common/nextEditProvider';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';

/**
 * Result type discriminator (kept for backwards compatibility)
 */
export type PukuCompletionResultType = 'diagnostics' | 'fim';

/**
 * Union type for all completion results (kept for backwards compatibility)
 */
export type PukuCompletionResult = PukuDiagnosticsResult | PukuFimResult | null;

/**
 * Legacy provider interfaces (kept for backwards compatibility)
 * New code should use IPukuNextEditProvider instead
 */
export interface IPukuFimProvider {
	getFimCompletion(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem | null>;
}

export interface IPukuDiagnosticsProvider {
	getDiagnosticsFix(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuDiagnosticsResult | null>;
}

/**
 * Model that coordinates between FIM and diagnostics providers
 * Uses Copilot's racing architecture with IPukuNextEditProvider
 */
export class PukuInlineEditModel extends Disposable {
	private _lastShownResult: PukuNextEditResult = null;

	constructor(
		private readonly fimProvider: IPukuNextEditProvider<PukuFimResult>,
		private readonly diagnosticsProvider: IPukuNextEditProvider<PukuDiagnosticsResult> | undefined,
		@ILogService private readonly logService: ILogService,
		@IPukuConfigService private readonly configService: IPukuConfigService
	) {
		super();
		console.log('[PukuInlineEditModel] Model constructor called with racing providers');
		this.logService.info('[PukuInlineEditModel] Model initialized with racing providers');
	}

	/**
	 * Get completion by racing FIM and diagnostics providers
	 * Uses Copilot's racing strategy: FIM starts immediately, diagnostics with delay
	 *
	 * Based on Copilot's approach in inlineCompletionProvider.ts:181-224
	 */
	async getCompletion(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken,
		isCycling: boolean = false // Feature #64: Multiple completions
	): Promise<PukuCompletionResult> {
		console.log(`[PukuInlineEditModel] ⚡ getCompletion called (racing mode, cycling: ${isCycling})`);
		this.logService.info(`[PukuInlineEditModel] getCompletion called (racing mode, cycling: ${isCycling})`);

		if (token.isCancellationRequested) {
			console.log('[PukuInlineEditModel] Token already cancelled');
			return null;
		}

		// Create DocumentId for provider interface
		const docId: DocumentId = { document, position, isCycling }; // Pass cycling state

		// Create cancellation tokens for coordination
		const diagnosticsCts = new vscode.CancellationTokenSource(token);
		const fimCts = new vscode.CancellationTokenSource(); // Independent token - FIM continues even if cancelled

		try {
			// Start FIM immediately (fast path with speculative cache)
			const fimPromise = this.fimProvider.getNextEdit(docId, context, fimCts.token);

			// Start diagnostics with delay (Copilot pattern - give FIM priority)
			// Use config value for delay (default 50ms, matching Copilot)
			const delayMs = this.configService.getConfig()?.diagnostics?.delayBeforeFixMs ?? 50;
			console.log(`[PukuInlineEditModel] 🏁 Starting race: FIM vs Diagnostics (delay: ${delayMs}ms)`);
			const diagnosticsPromise = this.diagnosticsProvider
				? this.diagnosticsProvider.runUntilNextEdit?.(docId, context, delayMs, diagnosticsCts.token) ||
				  this.diagnosticsProvider.getNextEdit(docId, context, diagnosticsCts.token)
				: Promise.resolve(null);

			// Use raceAndAll pattern from Copilot
			const { first, all } = this.raceAndAll([fimPromise, diagnosticsPromise]);

			// Wait for first result
			let [fimResult, diagnosticsResult] = await first;

			console.log('[PukuInlineEditModel] 🔍 Race results:', {
				fimResult: fimResult ? `type=${fimResult.type}, hasCompletion=${!!fimResult.completion}` : 'null/undefined',
				diagnosticsResult: diagnosticsResult ? 'has result' : 'null/undefined'
			});

			// Distinguish between "settled" (promise resolved) vs "has result" (has actual completion)
			// undefined = provider hasn't completed yet
			// null = provider completed but returned nothing
			const fimSettled = fimResult !== undefined;
			const diagnosticsSettled = diagnosticsResult !== undefined;

			const fimHasResult = fimResult !== null && fimResult !== undefined && fimResult.completion;
			const diagnosticsHasResult = diagnosticsResult !== null && diagnosticsResult !== undefined;

			// Wait for all if:
			// 1. FIM hasn't settled yet (still fetching from API), OR
			// 2. Both settled but neither has results (give diagnostics more time)
			const shouldWaitForAll = !fimSettled || (!fimHasResult && !diagnosticsHasResult);

			if (shouldWaitForAll) {
				const reason = !fimSettled
					? 'FIM still fetching'
					: 'both returned null, giving diagnostics 1s more';

				this.logService.info(`[PukuInlineEditModel] Waiting for all promises: ${reason}`);
				console.log(`[PukuInlineEditModel] ⏳ Waiting for all promises: ${reason}`);

				// Set timeout to cancel after 1 second
				this.timeout(1000).then(() => {
					diagnosticsCts.cancel();
					// Don't cancel FIM - let it complete and cache
				});

				// Wait for all results
				[fimResult, diagnosticsResult] = await all;

				console.log('[PukuInlineEditModel] 📊 Final results after wait:', {
					fimResult: fimResult ? `type=${fimResult.type}, hasCompletion=${!!fimResult.completion}` : 'null/undefined',
					diagnosticsResult: diagnosticsResult ? 'has result' : 'null/undefined'
				});
			}

			// Cancel ongoing requests (but FIM will complete anyway due to independent token)
			diagnosticsCts.cancel();
			// Don't cancel FIM - let it complete and cache the result
			// fimCts.cancel();

			// Track lifecycle events
			let winningResult: PukuNextEditResult = null;
			let losingResult: PukuNextEditResult = null;

			// Priority logic: FIM > Diagnostics (Copilot's approach)
			if (fimResult) {
				this.logService.info('[PukuInlineEditModel] ✅ Using FIM result (won race)');
				winningResult = fimResult;
				losingResult = diagnosticsResult;
			} else if (diagnosticsResult) {
				this.logService.info('[PukuInlineEditModel] ✅ Using diagnostics result (FIM returned null)');
				winningResult = diagnosticsResult;
				losingResult = fimResult; // Should be null
			}

			// Handle ignored results (losing provider)
			if (losingResult) {
				console.log('[PukuInlineEditModel] Handling ignored result from losing provider');
				if (losingResult.type === 'fim') {
					this.fimProvider.handleIgnored(docId, losingResult, winningResult || undefined);
				} else if (losingResult.type === 'diagnostics' && this.diagnosticsProvider) {
					this.diagnosticsProvider.handleIgnored(docId, losingResult, winningResult || undefined);
				}
			}

			// Track shown result for acceptance/rejection handling
			this._lastShownResult = winningResult;

			// Call handleShown for winning provider
			if (winningResult) {
				console.log(`[PukuInlineEditModel] Calling handleShown for ${winningResult.type} provider`);
				if (winningResult.type === 'fim') {
					this.fimProvider.handleShown(winningResult);
				} else if (winningResult.type === 'diagnostics' && this.diagnosticsProvider) {
					this.diagnosticsProvider.handleShown(winningResult);
				}
			}

			// Convert to backwards-compatible format
			if (fimResult) {
				return {
					type: 'fim',
					completion: fimResult.completion,
					requestId: fimResult.requestId,
					enableForwardStability: true // Prevent ghost text from jumping during edits
				};
			}

			if (diagnosticsResult) {
				return diagnosticsResult;
			}

			this.logService.info('[PukuInlineEditModel] No results from either provider');
			return null;
		} catch (error) {
			this.logService.error('[PukuInlineEditModel] Error getting completion:', error);
			return null;
		} finally {
			// Cleanup
			diagnosticsCts.dispose();
			fimCts.dispose();
		}
	}

	/**
	 * Handle when user accepts a completion (TAB)
	 */
	handleAcceptance(document: vscode.TextDocument, position: vscode.Position): void {
		if (!this._lastShownResult) {
			return;
		}

		const docId: DocumentId = { document, position };
		console.log(`[PukuInlineEditModel] ✅ Handling acceptance for ${this._lastShownResult.type} provider`);

		if (this._lastShownResult.type === 'fim') {
			this.fimProvider.handleAcceptance(docId, this._lastShownResult);
		} else if (this._lastShownResult.type === 'diagnostics' && this.diagnosticsProvider) {
			this.diagnosticsProvider.handleAcceptance(docId, this._lastShownResult);
		}

		this._lastShownResult = null;
	}

	/**
	 * Handle when user rejects a completion (ESC or typing)
	 */
	handleRejection(document: vscode.TextDocument, position: vscode.Position): void {
		if (!this._lastShownResult) {
			return;
		}

		const docId: DocumentId = { document, position };
		console.log(`[PukuInlineEditModel] ❌ Handling rejection for ${this._lastShownResult.type} provider`);

		if (this._lastShownResult.type === 'fim') {
			this.fimProvider.handleRejection(docId, this._lastShownResult);
		} else if (this._lastShownResult.type === 'diagnostics' && this.diagnosticsProvider) {
			this.diagnosticsProvider.handleRejection(docId, this._lastShownResult);
		}

		this._lastShownResult = null;
	}

	/**
	 * Race promises and get both first and all results
	 * Based on Copilot's raceAndAll utility
	 */
	private raceAndAll<T>(promises: Promise<T>[]): { first: Promise<T[]>, all: Promise<T[]> } {
		return {
			first: Promise.race(promises.map((p, i) => p.then(result => {
				const results: T[] = new Array(promises.length);
				results[i] = result;
				return results;
			}))),
			all: Promise.all(promises)
		};
	}

	/**
	 * Timeout utility
	 */
	private timeout(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	override dispose(): void {
		super.dispose();
		this.logService.info('[PukuInlineEditModel] Model disposed');
	}
}
