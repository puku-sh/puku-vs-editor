/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline edit model - coordinates between diagnostics and FIM providers
 *  Now uses IPukuNextEditProvider racing architecture (Copilot-style)
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IPukuNextEditProvider, PukuFimResult, PukuDiagnosticsResult, PukuNesResult, PukuNextEditResult, DocumentId } from '../common/nextEditProvider';
import { IPukuConfigService } from '../../pukuIndexing/common/pukuConfig';
import { InlineEditRequestLogContext } from '../common/inlineEditLogContext';

/**
 * Result type discriminator (kept for backwards compatibility)
 */
export type PukuCompletionResultType = 'diagnostics' | 'fim' | 'nes';

/**
 * Union type for all completion results (kept for backwards compatibility)
 */
export type PukuCompletionResult = PukuDiagnosticsResult | PukuFimResult | PukuNesResult | null;

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
 * Model that coordinates between FIM, diagnostics, and NES providers
 * Uses Copilot's racing architecture with IPukuNextEditProvider
 */
export class PukuInlineEditModel extends Disposable {
	private _lastShownResult: PukuNextEditResult = null;

	constructor(
		private readonly fimProvider: IPukuNextEditProvider<PukuFimResult>,
		private readonly diagnosticsProvider: IPukuNextEditProvider<PukuDiagnosticsResult> | undefined,
		private readonly nesProvider: IPukuNextEditProvider<PukuNesResult> | undefined,
		@ILogService private readonly logService: ILogService,
		@IPukuConfigService private readonly configService: IPukuConfigService
	) {
		super();
		console.log('[PukuInlineEditModel] Model constructor called with 3-way racing providers (FIM + Diagnostics + NES)');
		this.logService.info('[PukuInlineEditModel] Model initialized with 3-way racing providers');
	}

	/**
	 * Get completion by racing FIM, diagnostics, and NES providers
	 * Uses Copilot's racing strategy: FIM starts immediately, diagnostics + NES with delays
	 *
	 * Racing priorities:
	 * 1. FIM (0ms delay) - fastest, speculative cache
	 * 2. NES (75ms delay) - refactoring suggestions
	 * 3. Diagnostics (50ms delay) - import fixes
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
		console.log('[PukuInlineEditModel] XXX RACING MODEL START XXX - getCompletion called, cycling:', isCycling);
		this.logService.info(`[PukuInlineEditModel] getCompletion called (3-way racing mode, cycling: ${isCycling})`);

		if (token.isCancellationRequested) {
			console.log('[PukuInlineEditModel] Token already cancelled');
			return null;
		}

		// Create DocumentId for provider interface
		const docId: DocumentId = { document, position, isCycling }; // Pass cycling state

		// Create logContext following Copilot's pattern (inlineCompletionProvider.ts:167)
		const logContext = new InlineEditRequestLogContext(document.uri.toString(), document.version, context);

		// Create cancellation tokens for coordination
		const diagnosticsCts = new vscode.CancellationTokenSource(token);
		const nesCts = new vscode.CancellationTokenSource(token);
		const fimCts = new vscode.CancellationTokenSource(); // Independent token - FIM continues even if cancelled

		try {
			// Start FIM immediately (fast path with speculative cache)
			const fimPromise = this.fimProvider.getNextEdit(docId, context, fimCts.token);

			// Start diagnostics with delay (Copilot pattern - give FIM priority)
			// Pass logContext following Copilot's pattern (inlineCompletionProvider.ts:183)
			const diagnosticsDelayMs = this.configService.getConfig()?.diagnostics?.delayBeforeFixMs ?? 50;
			const diagnosticsPromise = this.diagnosticsProvider
				? this.diagnosticsProvider.runUntilNextEdit?.(docId, context, logContext, diagnosticsDelayMs, diagnosticsCts.token) ||
				  this.diagnosticsProvider.getNextEdit(docId, context, diagnosticsCts.token)
				: Promise.resolve(null);

			// Start NES with delay (give FIM priority, but slightly longer delay than diagnostics)
			const nesDelayMs = 75; // NES gets 75ms delay (diagnostics is 50ms)
// 			console.log(`[PukuInlineEditModel] 🏁 Starting 3-way race: FIM (0ms) vs Diagnostics (${diagnosticsDelayMs}ms) vs NES (${nesDelayMs}ms)`);
			const nesPromise = this.nesProvider
				? this.nesProvider.runUntilNextEdit?.(docId, context, nesDelayMs, nesCts.token) ||
				  this.nesProvider.getNextEdit(docId, context, nesCts.token)
				: Promise.resolve(null);

			// Use raceAndAll pattern from Copilot (now with 3 providers)
			const { first, all } = this.raceAndAll([fimPromise, diagnosticsPromise, nesPromise]);

			// Wait for first result
			let [fimResult, diagnosticsResult, nesResult] = await first;

			console.log('[PukuInlineEditModel] 🔍 Race results:', {
				fimResult: fimResult ? `type=${fimResult.type}, hasCompletion=${!!fimResult.completion}` : 'null/undefined',
				diagnosticsResult: diagnosticsResult ? 'has result' : 'null/undefined',
				nesResult: nesResult ? `type=${nesResult.type}, hasCompletion=${!!nesResult.completion}` : 'null/undefined'
			});

			// Distinguish between "settled" (promise resolved) vs "has result" (has actual completion)
			// undefined = provider hasn't completed yet
			// null = provider completed but returned nothing
			const fimSettled = fimResult !== undefined;
			const nesSettled = nesResult !== undefined;

			const fimHasResult = fimResult !== null && fimResult !== undefined && fimResult.completion && (Array.isArray(fimResult.completion) ? fimResult.completion.length > 0 : true);
			const nesHasResult = nesResult !== null && nesResult !== undefined && nesResult.completion && (Array.isArray(nesResult.completion) ? nesResult.completion.length > 0 : true);

			// Copilot pattern (inlineCompletionProvider.ts:195-201):
			// Give diagnostics MORE TIME (1s total) if FIM and NES have no results
			// This ensures diagnostics can complete when FIM/NES are empty or slow
			const shouldGiveMoreTimeToDiagnostics = !fimHasResult && !nesHasResult && this.diagnosticsProvider;

			if (shouldGiveMoreTimeToDiagnostics) {
				this.logService.info('[PukuInlineEditModel] ⏳ No FIM/NES results, giving diagnostics 1s more time (Copilot pattern)');
				console.log('[PukuInlineEditModel] ⏳ No FIM/NES results, giving diagnostics 1s more time (Copilot pattern)');

				// Set timeout to cancel after 1 second (Copilot: line 199)
				this.timeout(1000).then(() => {
					diagnosticsCts.cancel();
					nesCts.cancel();
					// Don't cancel FIM - let it complete and cache
				});

				// Wait for diagnostics to finish (Copilot: line 200)
				[, diagnosticsResult] = await all;

				console.log('[PukuInlineEditModel] 📊 Diagnostics result after extended wait:', {
					diagnosticsResult: diagnosticsResult ? 'has result' : 'null/undefined'
				});
			}

			// Also wait if FIM is still fetching from API (not settled)
			// This ensures we don't return too early when all providers are slow
			if (!fimSettled) {
				this.logService.info('[PukuInlineEditModel] ⏳ FIM still fetching, waiting for all promises...');
				console.log('[PukuInlineEditModel] ⏳ FIM still fetching, waiting for all promises...');

				// Set timeout to cancel after 1 second
				this.timeout(1000).then(() => {
					diagnosticsCts.cancel();
					nesCts.cancel();
					// Don't cancel FIM - let it complete and cache
				});

				// Wait for all results
				[fimResult, diagnosticsResult, nesResult] = await all;

				console.log('[PukuInlineEditModel] 📊 Final results after wait:', {
					fimResult: fimResult ? `type=${fimResult.type}, hasCompletion=${!!fimResult.completion}` : 'null/undefined',
					diagnosticsResult: diagnosticsResult ? 'has result' : 'null/undefined',
					nesResult: nesResult ? `type=${nesResult.type}, hasCompletion=${!!nesResult.completion}` : 'null/undefined'
				});
			}

			// Cancel ongoing requests (but FIM will complete anyway due to independent token)
			diagnosticsCts.cancel();
			nesCts.cancel();
			// Don't cancel FIM - let it complete and cache the result
			// fimCts.cancel();

			// Recalculate hasResult flags based on CURRENT result values (after await all)
			// This ensures flags reflect the actual state after promises complete (Issue #108)
			const fimHasActualResult = fimResult !== null && fimResult !== undefined && fimResult.completion && (Array.isArray(fimResult.completion) ? fimResult.completion.length > 0 : true);
			const nesHasActualResult = nesResult !== null && nesResult !== undefined && nesResult.completion && (Array.isArray(nesResult.completion) ? nesResult.completion.length > 0 : true);
			const diagnosticsHasActualResult = diagnosticsResult !== null && diagnosticsResult !== undefined;

			console.log('[PukuInlineEditModel] 🔍 Fresh hasResult checks:', {
				fimHasActualResult,
				nesHasActualResult,
				diagnosticsHasActualResult
			});

			// Track lifecycle events
			let winningResult: PukuNextEditResult = null;
			const losingResults: PukuNextEditResult[] = [];

			// Priority logic: FIM > NES > Diagnostics (Copilot's approach)
			// Use fresh hasResult checks (not stale flags from line 137-139) - Issue #108
			console.log('[PukuInlineEditModel] 🔍 Checking winner selection with flags:', {
				fimHasActualResult,
				nesHasActualResult,
				diagnosticsHasActualResult
			});
			if (fimHasActualResult) {
				console.log('[PukuInlineEditModel] ✅ FIM wins the race!');
				this.logService.info('[PukuInlineEditModel] ✅ Using FIM result (won race)');
				winningResult = fimResult;
				if (diagnosticsResult) { losingResults.push(diagnosticsResult); }
				if (nesResult) { losingResults.push(nesResult); }
			} else if (nesHasActualResult) {
				console.log('[PukuInlineEditModel] ✅ NES wins the race!');
				this.logService.info('[PukuInlineEditModel] ✅ Using NES result (FIM has no completions)');
				winningResult = nesResult;
				if (diagnosticsResult) { losingResults.push(diagnosticsResult); }
			} else if (diagnosticsHasActualResult) {
				console.log('[PukuInlineEditModel] ✅ Diagnostics wins the race!');
				this.logService.info('[PukuInlineEditModel] ✅ Using diagnostics result (FIM and NES have no completions)');
				winningResult = diagnosticsResult;
			} else {
				console.log('[PukuInlineEditModel] ❌ No provider has results');
			}

			// Handle ignored results (losing providers)
			for (const losingResult of losingResults) {
				if (!losingResult) { continue; }

				console.log(`[PukuInlineEditModel] Handling ignored result from ${losingResult.type} provider`);
				if (losingResult.type === 'fim') {
					this.fimProvider.handleIgnored(docId, losingResult, winningResult || undefined);
				} else if (losingResult.type === 'diagnostics' && this.diagnosticsProvider) {
					this.diagnosticsProvider.handleIgnored(docId, losingResult, winningResult || undefined);
				} else if (losingResult.type === 'nes' && this.nesProvider) {
					this.nesProvider.handleIgnored(docId, losingResult, winningResult || undefined);
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
				} else if (winningResult.type === 'nes' && this.nesProvider) {
					this.nesProvider.handleShown(winningResult);
				}
			}

			// Convert to backwards-compatible format (priority: FIM > NES > Diagnostics)
			// Use fresh hasResult checks (not stale flags from line 137-139) - Issue #108
			if (fimHasActualResult) {
				return {
					type: 'fim',
					completion: fimResult.completion,
					requestId: fimResult.requestId,
					enableForwardStability: true // Prevent ghost text from jumping during edits
				};
			}

			if (nesHasActualResult) {
				return {
					type: 'nes',
					completion: nesResult.completion,
					requestId: nesResult.requestId
				};
			}

			if (diagnosticsHasActualResult) {
				return diagnosticsResult;
			}

			this.logService.info('[PukuInlineEditModel] No results from any provider');
			return null;
		} catch (error) {
			this.logService.error('[PukuInlineEditModel] Error getting completion:', error);
			return null;
		} finally {
			// Cleanup
			diagnosticsCts.dispose();
			nesCts.dispose();
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
		} else if (this._lastShownResult.type === 'nes' && this.nesProvider) {
			this.nesProvider.handleAcceptance(docId, this._lastShownResult);
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
		} else if (this._lastShownResult.type === 'nes' && this.nesProvider) {
			this.nesProvider.handleRejection(docId, this._lastShownResult);
		}

		this._lastShownResult = null;
	}

	/**
	 * Race promises and get both first and all results
	 * Copied from Copilot's raceAndAll utility (inlineCompletionProvider.ts:556-596)
	 * Returns sparse array for `first` - only the winning index is filled, others are undefined
	 */
	private raceAndAll<T>(promises: Promise<T>[]): { first: Promise<(T | undefined)[]>, all: Promise<T[]> } {
		let settled = false;

		const first = new Promise<(T | undefined)[]>((resolve, reject) => {
			promises.forEach((promise, index) => {
				promise.then(result => {
					if (settled) {
						return;
					}
					settled = true;
					const output: (T | undefined)[] = Array(promises.length).fill(undefined);
					output[index] = result;
					resolve(output);
				}, error => {
					settled = true;
					console.error('[PukuInlineEditModel] Promise error in race:', error);
					const output: (T | undefined)[] = Array(promises.length).fill(undefined);
					resolve(output);
				});
			});
		});

		const all = Promise.all(promises);

		return { first, all };
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
