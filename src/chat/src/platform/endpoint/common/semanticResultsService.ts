/*---------------------------------------------------------------------------------------------
 *  Semantic Results Service - Bridge between prompts and endpoint
 *  Stores semantic search results from prompts so endpoint can include them in requests
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../util/vs/platform/instantiation/common/instantiation';

export interface SemanticSearchResult {
	content: string;
	file: string;
	score: number;
	line_start: number;
	line_end: number;
}

export const ISemanticResultsService = createDecorator<ISemanticResultsService>('semanticResultsService');

/**
 * Service to share semantic search results between prompts and endpoints
 *
 * Flow:
 * 1. Prompt (InlineChat2Prompt / AgentPrompt) performs semantic search
 * 2. Prompt stores results in this service
 * 3. Endpoint (PukuChatEndpoint) retrieves results and adds to request
 * 4. After request is sent, results are cleared
 */
export interface ISemanticResultsService {
	readonly _serviceBrand: undefined;

	/**
	 * Store semantic search results for the next request
	 * Called by prompts after performing semantic search
	 */
	setResults(results: SemanticSearchResult[]): void;

	/**
	 * Get and clear semantic search results
	 * Called by endpoint when creating request body
	 */
	consumeResults(): SemanticSearchResult[] | undefined;

	/**
	 * Check if results are available
	 */
	hasResults(): boolean;

	/**
	 * Clear stored results (e.g., on error or cancel)
	 */
	clear(): void;
}

/**
 * Implementation of ISemanticResultsService
 */
export class SemanticResultsService implements ISemanticResultsService {
	readonly _serviceBrand: undefined;

	private _results: SemanticSearchResult[] | undefined;

	setResults(results: SemanticSearchResult[]): void {
		console.log(`[SemanticResultsService] Storing ${results.length} semantic search results`);
		this._results = results;
	}

	consumeResults(): SemanticSearchResult[] | undefined {
		const results = this._results;
		this._results = undefined; // Clear after consuming
		if (results) {
			console.log(`[SemanticResultsService] Consuming ${results.length} results`);
		}
		return results;
	}

	hasResults(): boolean {
		return this._results !== undefined && this._results.length > 0;
	}

	clear(): void {
		console.log(`[SemanticResultsService] Clearing results`);
		this._results = undefined;
	}
}
