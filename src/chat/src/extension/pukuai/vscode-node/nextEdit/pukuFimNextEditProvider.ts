/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  FIM Next Edit Provider - Wraps existing FIM functionality
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuNextEditProvider, DocumentId, PukuFimResult } from '../../common/nextEditProvider';
import { IPukuInlineCompletionProvider } from './pukuInlineEditModel';
import { CancellationToken } from '../../../base/common/cancellation';
import { Disposable } from '../../../base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';

/**
 * FIM Next Edit Provider
 *
 * Wraps the existing inline completion provider to work with the next edit manager.
 * This allows FIM suggestions to participate in provider racing with NES and diagnostics.
 */
export class PukuFimNextEditProvider extends Disposable implements IPukuNextEditProvider<PukuFimResult> {
	readonly ID = 'puku-fim';

	constructor(
		@IPukuInlineCompletionProvider private readonly fimProvider: IPukuInlineCompletionProvider,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.logService.info('[PukuFimNextEditProvider] Initialized');
	}

	/**
	 * Get FIM completion as next edit result
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: CancellationToken
	): Promise<PukuFimResult | null> {
		try {
			// Delegate to existing FIM provider
			const completionResult = await this.fimProvider.provideInlineCompletionItems(
				docId.document,
				docId.position,
				context,
				token
			);

			if (completionResult && completionResult.items.length > 0) {
				// Convert to PukuFimResult format
				return {
					type: 'fim',
					completion: completionResult.items.length === 1
						? completionResult.items[0]
						: completionResult.items, // Support multiple completions (Feature #64)
					requestId: Date.now()
				};
			}

		} catch (error) {
			this.logService.debug('[PukuFimNextEditProvider] FIM completion failed:', error);
		}

		return null;
	}

	/**
	 * Run until next edit with delay (no delay for FIM - it should start immediately)
	 */
	async runUntilNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		delayMs: number,
		token: CancellationToken
	): Promise<PukuFimResult | null> {
		// FIM doesn't use delay - it should start immediately
		return this.getNextEdit(docId, context, token);
	}

	/**
	 * Handle when suggestion is shown to user
	 */
	handleShown(result: PukuFimResult): void {
		this.logService.debug(`[PukuFimNextEditProvider] FIM suggestion shown: ${result.requestId}`);
	}

	/**
	 * Handle when suggestion is accepted (TAB)
	 */
	handleAcceptance(docId: DocumentId, result: PukuFimResult): void {
		this.logService.info(`[PukuFimNextEditProvider] FIM suggestion accepted: ${result.requestId}`);

		// TODO: Track acceptance for FIM learning and telemetry
		// Could update the existing FIM cache and speculative request systems
	}

	/**
	 * Handle when suggestion is rejected (ESC or typing)
	 */
	handleRejection(docId: DocumentId, result: PukuFimResult): void {
		this.logService.debug(`[PukuFimNextEditProvider] FIM suggestion rejected: ${result.requestId}`);

		// TODO: Track rejection for FIM learning
		// Could update negative examples for better future suggestions
	}

	/**
	 * Handle when suggestion is ignored (superseded by another)
	 */
	handleIgnored(docId: DocumentId, result: PukuFimResult, supersededBy?: PukuFimResult): void {
		this.logService.debug(`[PukuFimNextEditProvider] FIM suggestion ignored: ${result.requestId}`);
	}
}