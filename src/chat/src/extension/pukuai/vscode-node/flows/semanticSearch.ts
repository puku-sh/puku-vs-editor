/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Semantic search flow (signature extraction for context)
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { IPukuIndexingService } from '../../../pukuIndexing/node/pukuIndexingService';
import { IPukuConfigService } from '../../../pukuIndexing/common/pukuConfig';

/**
 * Handles semantic code search and signature extraction for FIM context
 * Searches for similar code using embeddings and extracts signatures (not full implementations)
 * Uses adaptive scaling based on query complexity (configured from server)
 */
export class SemanticSearchFlow {
	constructor(
		private readonly _indexingService: IPukuIndexingService,
		private readonly _configService: IPukuConfigService,
	) { }

	/**
	 * Determine semantic search limit based on query complexity
	 * Uses server-provided configuration for adaptive scaling
	 */
	private _determineSemanticLimit(query: string): number {
		const config = this._configService.getConfig().semanticSearch;

		// Comment-driven generation needs more context
		const trimmed = query.trim();
		if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
			const words = query.split(/\s+/).length;
			if (words > 10) {
				return config.commentLongLimit; // Long comment: 15 chunks
			}
			if (words > 5) {
				return config.commentMediumLimit; // Medium comment: 10 chunks
			}
			return config.commentShortLimit; // Short comment: 5 chunks
		}

		// Query length-based scaling
		if (query.length < 30) {
			return config.minLimit; // Short query: 2-3 chunks
		}

		return config.defaultLimit; // Default: 8-10 chunks
	}

	/**
	 * Search for similar code using semantic search (embeddings)
	 * Returns SIGNATURES only (not full implementations) to avoid model duplication
	 * Uses adaptive scaling - automatically determines optimal number of results based on query
	 *
	 * @param query Search query (typically current line or function context)
	 * @param languageId Language filter
	 * @param currentFileUri Exclude results from this file
	 * @returns Array of {filepath, content} with signatures
	 */
	async searchSimilarCode(
		query: string,
		languageId: string,
		currentFileUri: vscode.Uri
	): Promise<Array<{ filepath, content: string }>> {
		if (!await this._indexingService.isAvailable()) {
			return [];
		}

		try {
			// Adaptive scaling: determine limit based on query complexity
			const adaptiveLimit = this._determineSemanticLimit(query);
			console.log(`[SemanticSearch] Using adaptive limit: ${adaptiveLimit} for query: "${query.substring(0, 50)}..."`);

			const searchResults = await this._indexingService.search(query, adaptiveLimit, languageId);

			// Convert search results to openFiles format
			// Exclude ALL same-file results to prevent model from duplicating existing code
			// Extract ONLY signatures using tree-sitter metadata (not full implementations)
			return searchResults
				.filter(result => result.uri.fsPath !== currentFileUri.fsPath)
				.map(result => ({
					filepath: result.uri.fsPath,
					content: this._extractSignatureFromChunk(result)
				}));
		} catch (error) {
			console.error(`[SemanticSearch] Search failed: ${error}`);
			return [];
		}
	}

	/**
	 * Extract signature from tree-sitter chunk (not full implementation)
	 * Uses chunk metadata to extract just the function/class signature line
	 */
	private _extractSignatureFromChunk(result: any): string {
		const lines = result.content.split('\n');

		// If we have chunk metadata from tree-sitter, use it
		if (result.chunkType && result.symbolName) {
			// Extract just the first line (signature) for functions/methods
			if (result.chunkType === 'function' || result.chunkType === 'method') {
				// Find the line with the function declaration
				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
						// Return signature without opening brace
						return trimmed.replace(/\s*\{.*$/, '').trim();
					}
				}
			}

			// For classes, return class declaration line
			if (result.chunkType === 'class' || result.chunkType === 'interface') {
				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith('class ') || trimmed.startsWith('interface ') ||
					    trimmed.startsWith('export class') || trimmed.startsWith('export interface')) {
						return trimmed.replace(/\s*\{.*$/, '').trim();
					}
				}
			}
		}

		// Fallback: return first non-comment, non-empty line
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
				return trimmed.replace(/\s*\{.*$/, '').trim();
			}
		}

		return result.content;
	}
}
