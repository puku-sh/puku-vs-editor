/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  LLM-based code summarization for semantic search
 *--------------------------------------------------------------------------------------------*/

import { SemanticChunk } from './pukuASTChunker';
import { IPukuAuthService } from '../common/pukuAuth';

/**
 * Puku Summary Generator - generates natural language summaries of code chunks
 * using LLM (GLM-4.5-Air) for improved semantic search.
 *
 * Summaries describe what code does (functionality), inputs, and outputs in
 * natural language, enabling better matching between comments and code.
 */
export class PukuSummaryGenerator {
	private static readonly BATCH_SIZE = 10; // Process 10 chunks per API call
	private static readonly API_ENDPOINT = 'https://api.puku.sh/v1/summarize/batch';

	constructor(
		private readonly _authService: IPukuAuthService
	) { }

	/**
	 * Generate summaries for multiple chunks in batched API calls
	 *
	 * @param chunks Code chunks to summarize
	 * @param languageId Programming language (e.g., 'go', 'typescript')
	 * @param progressCallback Optional callback for progress updates
	 * @returns Array of summaries (one per chunk)
	 */
	async generateSummariesBatch(
		chunks: SemanticChunk[],
		languageId: string,
		progressCallback?: (current: number, total: number) => void
	): Promise<string[]> {
		const summaries: string[] = [];

		// Process chunks in batches of 10
		for (let i = 0; i < chunks.length; i += PukuSummaryGenerator.BATCH_SIZE) {
			const batch = chunks.slice(i, i + PukuSummaryGenerator.BATCH_SIZE);

			// Report progress
			if (progressCallback) {
				progressCallback(Math.min(i + batch.length, chunks.length), chunks.length);
			}

			try {
				const batchSummaries = await this._generateBatch(batch, languageId);
				summaries.push(...batchSummaries);

				console.log(`[SummaryGenerator] Generated ${summaries.length}/${chunks.length} summaries`);
			} catch (error) {
				console.error(`[SummaryGenerator] Batch ${i / PukuSummaryGenerator.BATCH_SIZE + 1} failed:`, error);

				// Fallback to basic summaries for failed batch
				const fallbackSummaries = batch.map(c => this._fallbackSummary(c));
				summaries.push(...fallbackSummaries);
			}
		}

		return summaries;
	}

	/**
	 * Generate summaries for a single batch using dedicated summary endpoint
	 */
	private async _generateBatch(
		chunks: SemanticChunk[],
		languageId: string
	): Promise<string[]> {
		const token = await this._authService.getToken();
		if (!token) {
			throw new Error('No auth token available for summary generation');
		}

		console.log(`[SummaryGenerator] Calling summary API for ${chunks.length} chunks`);

		// Call dedicated summary endpoint (uses server-side API key)
		const response = await fetch(PukuSummaryGenerator.API_ENDPOINT, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token.token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				chunks: chunks.map(c => ({ text: c.text })),
				languageId
			})
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Summary API failed: ${response.status} ${errorText}`);
		}

		const data = await response.json() as { summaries: string[] };
		return data.summaries;
	}

	/**
	 * Create batch prompt for LLM
	 * Asks LLM to summarize each chunk with functionality, inputs, and outputs
	 */
	private _createBatchPrompt(chunks: SemanticChunk[], languageId: string): string {
		// Format chunks with index markers
		const chunksText = chunks.map((chunk, i) =>
			`[CHUNK ${i + 1}]\n${chunk.text}\n`
		).join('\n');

		return `You are a code documentation expert. Summarize each ${languageId} code chunk below in ONE concise sentence.

For each chunk, describe:
1. What it does (main functionality)
2. What inputs/parameters it takes
3. What it returns or produces

Format your response as EXACTLY ${chunks.length} lines, one summary per line. Start each line with "[N] " where N is the chunk number.

Example:
[1] function that sends email notification to user, takes userId and message as input, returns boolean indicating success
[2] class UserService with methods for getting and updating user data

${chunksText}

Remember: Return EXACTLY ${chunks.length} summaries, one per line, in order.`;
	}

	/**
	 * Parse batch response from LLM
	 */
	private _parseBatchResponse(response: string, expectedCount: number): string[] {
		const lines = response.split('\n').map(l => l.trim()).filter(l => l);
		const summaries: string[] = [];

		for (let i = 0; i < expectedCount; i++) {
			// Look for line starting with [N]
			const pattern = new RegExp(`^\\[${i + 1}\\]\\s*(.+)$`);
			let found = false;

			for (const line of lines) {
				const match = line.match(pattern);
				if (match) {
					summaries.push(match[1].trim());
					found = true;
					break;
				}
			}

			if (!found) {
				// Fallback: try to find any remaining unparsed line
				const remainingLines = lines.filter(l =>
					!summaries.some(s => l.includes(s))
				);

				if (remainingLines.length > 0) {
					// Take first remaining line, strip any [N] prefix
					const line = remainingLines[0].replace(/^\[\d+\]\s*/, '').trim();
					summaries.push(line || 'Code chunk');
				} else {
					summaries.push('Code chunk'); // Ultimate fallback
				}
			}
		}

		return summaries;
	}

	/**
	 * Fallback summary when LLM fails
	 * Uses AST metadata to create basic summary
	 */
	private _fallbackSummary(chunk: SemanticChunk): string {
		const { chunkType, symbolName, text } = chunk;

		// Use AST metadata if available
		if (chunkType && symbolName) {
			switch (chunkType) {
				case 'function':
				case 'method':
					return `${chunkType} ${symbolName}`;
				case 'class':
					return `class ${symbolName}`;
				case 'interface':
					return `interface ${symbolName}`;
				case 'type':
					return `type ${symbolName}`;
				default:
					return `${chunkType} ${symbolName}`;
			}
		}

		// Extract first non-comment line as fallback
		const lines = text.split('\n')
			.map(l => l.trim())
			.filter(l =>
				l.length > 0 &&
				!l.startsWith('//') &&
				!l.startsWith('#') &&
				!l.startsWith('/*') &&
				!l.startsWith('*')
			);

		const firstLine = lines[0] || text.substring(0, 100);
		return firstLine.substring(0, 100);
	}
}

/**
 * Singleton instance
 */
export const pukuSummaryGenerator = new PukuSummaryGenerator(
	undefined as any // Will be injected by service
);
