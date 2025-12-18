/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *  Next Edit Suggestions Manager - Coordinates multiple providers
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IPukuNextEditProvider, DocumentId, PukuNextEditResult, PukuNesResult, PukuFimResult } from '../../common/nextEditProvider';
import { CancellationToken } from '../../../base/common/cancellation';
import { Disposable } from '../../../base/common/lifecycle';
import { ILogService } from '../../../platform/log/common/logService';
import { IPukuConfigService } from '../../config/common/configService';

/**
 * Provider race result with timing information
 */
interface ProviderRaceResult {
	provider: IPukuNextEditProvider<PukuNextEditResult>;
	result: PukuNextEditResult;
	raceTime: number;
}

/**
 * Next Edit Manager
 *
 * Coordinates multiple next edit providers (FIM, NES, Diagnostics) and implements
 * provider racing to get the best suggestion from any available source.
 */
export class PukuNextEditManager extends Disposable {
	/** Registered providers */
	private readonly providers: IPukuNextEditProvider<PukuNextEditResult>[] = [];

	/** Current active result */
	private currentResult: { result: PukuNextEditResult; provider: IPukuNextEditProvider<PukuNextEditResult> } | null = null;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IPukuConfigService private readonly configService: IPukuConfigService,
	) {
		super();
		this.logService.info('[PukuNextEditManager] Initialized');
	}

	/**
	 * Register a new next edit provider
	 */
	registerProvider(provider: IPukuNextEditProvider<PukuNextEditResult>): void {
		this.providers.push(provider);
		this.logService.debug(`[PukuNextEditManager] Registered provider: ${provider.ID}`);
	}

	/**
	 * Get the best next edit suggestion by racing all providers
	 */
	async getNextEdit(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: CancellationToken
	): Promise<PukuNextEditResult | null> {
		if (!this.isEnabled()) {
			this.logService.debug('[PukuNextEditManager] Next edit suggestions disabled');
			return null;
		}

		// Clear previous result if it exists
		if (this.currentResult) {
			this.notifyIgnored(this.currentResult.result);
		}

		try {
			// Race all providers
			const raceResults = await this.raceProviders(docId, context, token);

			if (raceResults.length === 0) {
				return null;
			}

			// Select the best result based on priority and timing
			const bestResult = this.selectBestResult(raceResults);

			if (bestResult) {
				this.currentResult = { result: bestResult.result, provider: bestResult.provider };
				this.notifyShown(bestResult.result);
				return bestResult.result;
			}

		} catch (error) {
			this.logService.error('[PukuNextEditManager] Error in next edit race:', error);
		}

		return null;
	}

	/**
	 * Accept the current suggestion
	 */
	acceptSuggestion(docId: DocumentId): boolean {
		if (!this.currentResult) {
			return false;
		}

		this.notifyAccepted(docId, this.currentResult.result);
		this.currentResult = null;
		return true;
	}

	/**
	 * Reject the current suggestion
	 */
	rejectSuggestion(docId: DocumentId): boolean {
		if (!this.currentResult) {
			return false;
		}

		this.notifyRejected(docId, this.currentResult.result);
		this.currentResult = null;
		return true;
	}

	/**
	 * Ignore the current suggestion (superseded by another)
	 */
	ignoreSuggestion(supersededBy?: PukuNextEditResult): boolean {
		if (!this.currentResult) {
			return false;
		}

		this.notifyIgnored(this.currentResult.result, supersededBy);
		this.currentResult = null;
		return true;
	}

	/**
	 * Get the current suggestion
	 */
	getCurrentSuggestion(): PukuNextEditResult | null {
		return this.currentResult?.result || null;
	}

	/**
	 * Race all providers to get suggestions
	 */
	private async raceProviders(
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: CancellationToken
	): Promise<ProviderRaceResult[]> {
		const results: Promise<ProviderRaceResult | null>[] = [];
		const startTime = Date.now();

		// Start all provider races
		for (const provider of this.providers) {
			const providerPromise = this.raceSingleProvider(provider, docId, context, token, startTime);
			results.push(providerPromise);
		}

		// Wait for all providers to complete or timeout
		const timeoutMs = this.configService.get('puku.nextEditSuggestions.timeout', 3000);
		const raceResults = await Promise.race([
			Promise.all(results),
			new Promise<ProviderRaceResult[]>(resolve =>
				setTimeout(() => resolve([]), timeoutMs)
			)
		]);

		// Filter out null results
		return raceResults.filter((result): result is ProviderRaceResult => result !== null);
	}

	/**
	 * Race a single provider with delay configuration
	 */
	private async raceSingleProvider(
		provider: IPukuNextEditProvider<PukuNextEditResult>,
		docId: DocumentId,
		context: vscode.InlineCompletionContext,
		token: CancellationToken,
		startTime: number
	): Promise<ProviderRaceResult | null> {
		try {
			// Get provider-specific delay configuration
			const delayMs = this.getProviderDelay(provider.ID);

			let result: PukuNextEditResult | null;

			// Use runUntilNextEdit if provider supports it and has delay
			if (provider.runUntilNextEdit && delayMs > 0) {
				result = await provider.runUntilNextEdit(docId, context, delayMs, token);
			} else {
				result = await provider.getNextEdit(docId, context, token);
			}

			if (result && !token.isCancellationRequested) {
				const raceTime = Date.now() - startTime;
				return { provider, result, raceTime };
			}

		} catch (error) {
			this.logService.debug(`[PukuNextEditManager] Provider ${provider.ID} failed:`, error);
		}

		return null;
	}

	/**
	 * Get delay configuration for a specific provider
	 */
	private getProviderDelay(providerId: string): number {
		// NES should have slight delay to let FIM go first
		switch (providerId) {
			case 'puku-nes':
				return this.configService.get('puku.nextEditSuggestions.nesDelay', 500);
			case 'puku-diagnostics':
				return this.configService.get('puku.nextEditSuggestions.diagnosticsDelay', 200);
			case 'puku-fim':
			default:
				return 0; // FIM should start immediately
		}
	}

	/**
	 * Select the best result from provider race
	 */
	private selectBestResult(results: ProviderRaceResult[]): ProviderRaceResult | null {
		if (results.length === 0) {
			return null;
		}

		if (results.length === 1) {
			return results[0];
		}

		// Priority order: NES > FIM > Diagnostics
		const priorityOrder = ['puku-nes', 'puku-fim', 'puku-diagnostics'];

		// Sort by priority first, then by timing
		results.sort((a, b) => {
			const aPriority = priorityOrder.indexOf(a.provider.ID);
			const bPriority = priorityOrder.indexOf(b.provider.ID);

			// If both have same priority (or both not in priority list), prefer faster
			if (aPriority === bPriority) {
				return a.raceTime - b.raceTime;
			}

			// Lower index in priority array = higher priority
			return aPriority - bPriority;
		});

		return results[0];
	}

	/**
	 * Notify provider that suggestion was shown
	 */
	private notifyShown(result: PukuNextEditResult): void {
		const provider = this.findProviderForResult(result);
		if (provider) {
			provider.handleShown(result);
		}
	}

	/**
	 * Notify provider that suggestion was accepted
	 */
	private notifyAccepted(docId: DocumentId, result: PukuNextEditResult): void {
		const provider = this.findProviderForResult(result);
		if (provider) {
			provider.handleAcceptance(docId, result);
		}
	}

	/**
	 * Notify provider that suggestion was rejected
	 */
	private notifyRejected(docId: DocumentId, result: PukuNextEditResult): void {
		const provider = this.findProviderForResult(result);
		if (provider) {
			provider.handleRejection(docId, result);
		}
	}

	/**
	 * Notify provider that suggestion was ignored
	 */
	private notifyIgnored(result: PukuNextEditResult, supersededBy?: PukuNextEditResult): void {
		const provider = this.findProviderForResult(result);
		if (provider) {
			provider.handleIgnored({ document: null, position: null }, result, supersededBy);
		}
	}

	/**
	 * Find the provider that created a specific result
	 */
	private findProviderForResult(result: PukuNextEditResult): IPukuNextEditProvider<PukuNextEditResult> | null {
		for (const provider of this.providers) {
			// This is a simple check - in practice you might want to track provider IDs in results
			if (result?.type === 'nes' && provider.ID === 'puku-nes') {
				return provider;
			}
			if (result?.type === 'fim' && provider.ID === 'puku-fim') {
				return provider;
			}
			if (result?.type === 'diagnostics' && provider.ID === 'puku-diagnostics') {
				return provider;
			}
		}
		return null;
	}

	/**
	 * Check if next edit suggestions are enabled
	 */
	private isEnabled(): boolean {
		return this.configService.get('puku.nextEditSuggestions.enabled', true);
	}
}