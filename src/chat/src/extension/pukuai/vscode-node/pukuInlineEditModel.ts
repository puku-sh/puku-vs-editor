/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Unified inline edit model - coordinates between diagnostics and FIM providers
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';

/**
 * Result type discriminator
 */
export type PukuCompletionResultType = 'diagnostics' | 'fim';

/**
 * Diagnostics-based fix result
 */
export interface PukuDiagnosticsResult {
	type: 'diagnostics';
	fix: {
		range: vscode.Range;
		newText: string;
		label: string; // e.g., "TAB to add import"
	};
}

/**
 * FIM completion result
 */
export interface PukuFimResult {
	type: 'fim';
	completion: vscode.InlineCompletionItem;
}

/**
 * Union type for all completion results
 */
export type PukuCompletionResult = PukuDiagnosticsResult | PukuFimResult | null;

/**
 * Provider interfaces that the model will coordinate
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
 * Model that coordinates between diagnostics and FIM providers
 * Similar to Copilot's InlineEditModel architecture
 */
export class PukuInlineEditModel extends Disposable {
	constructor(
		private readonly fimProvider: IPukuFimProvider,
		private readonly diagnosticsProvider: IPukuDiagnosticsProvider | undefined,
		@ILogService private readonly logService: ILogService
	) {
		super();
		console.log('[PukuInlineEditModel] Model constructor called');
		this.logService.info('[PukuInlineEditModel] Model initialized');
	}

	/**
	 * Get completion by racing diagnostics and FIM providers
	 * Uses Copilot's racing strategy with timeout
	 *
	 * Based on Copilot's approach in inlineCompletionProvider.ts:181-224
	 */
	async getCompletion(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<PukuCompletionResult> {
		console.log('[PukuInlineEditModel] ⚡ getCompletion called');
		this.logService.info('[PukuInlineEditModel] getCompletion called');

		if (token.isCancellationRequested) {
			console.log('[PukuInlineEditModel] Token already cancelled');
			return null;
		}

		// Create cancellation tokens for coordination
		// IMPORTANT: Don't link FIM token to parent - let FIM requests complete even if VS Code cancels
		// The FIM provider's _requestInFlight lock prevents concurrent requests
		const diagnosticsCts = new vscode.CancellationTokenSource(token);
		const fimCts = new vscode.CancellationTokenSource(); // Independent token - no parent

		try {
			// Start both providers racing (no delay - FIM is slow anyway at 800ms+)
			const fimPromise = this.fimProvider.getFimCompletion(document, position, context, fimCts.token);
			const diagnosticsPromise = this.diagnosticsProvider
				? this.diagnosticsProvider.getDiagnosticsFix(document, position, context, diagnosticsCts.token)
				: Promise.resolve(null);

			// Use raceAndAll pattern from Copilot
			const { first, all } = this.raceAndAll([fimPromise, diagnosticsPromise]);

			// Wait for first result
			let [fimResult, diagnosticsResult] = await first;

			const hasFim = fimResult !== null && fimResult !== undefined;
			const hasDiagnostics = diagnosticsResult !== null && diagnosticsResult !== undefined;

			// If neither has result, give diagnostics 1 second more (Copilot's approach)
			const shouldGiveMoreTimeToDiagnostics = !hasFim && !hasDiagnostics && this.diagnosticsProvider;

			if (shouldGiveMoreTimeToDiagnostics) {
				this.logService.info('[PukuInlineEditModel] Giving diagnostics 1 second more...');

				// Set timeout to cancel after 1 second
				this.timeout(1000).then(() => diagnosticsCts.cancel());

				// Wait for all results
				[fimResult, diagnosticsResult] = await all;
			}

			// Cancel ongoing requests (but FIM will complete anyway due to independent token)
			diagnosticsCts.cancel();
			// Don't cancel FIM - let it complete and cache the result
			// fimCts.cancel();

			// Priority logic: FIM > Diagnostics (Copilot's approach)
			if (fimResult) {
				this.logService.info('[PukuInlineEditModel] Using FIM result');
				return {
					type: 'fim',
					completion: fimResult
				};
			}

			if (diagnosticsResult) {
				this.logService.info('[PukuInlineEditModel] Using diagnostics result');
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
