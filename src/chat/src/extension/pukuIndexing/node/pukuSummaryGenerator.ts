/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  LLM-based code summarization for semantic search
 *--------------------------------------------------------------------------------------------*/

import sql from 'node:sqlite';
import { SemanticChunk } from './pukuASTChunker';
import { IPukuAuthService } from '../common/pukuAuth';
import { PukuSummaryJobManager } from './pukuSummaryJobManager';

/**
 * Puku Summary Generator - generates natural language summaries of code chunks
 * using LLM (GLM-4.5-Air) for improved semantic search.
 *
 * Summaries describe what code does (functionality), inputs, and outputs in
 * natural language, enabling better matching between comments and code.
 *
 * Supports job-based parallel processing for faster indexing.
 */
export class PukuSummaryGenerator {
	private static readonly BATCH_SIZE = 10; // Process 10 chunks per API call
	private static readonly CHUNKS_PER_JOB = 20; // Chunks per parallel job
	private static readonly MAX_PARALLEL_JOBS = 5; // Max concurrent jobs
	private static readonly API_ENDPOINT = 'https://api.puku.sh/v1/summarize/batch';

	private _jobManager: PukuSummaryJobManager | undefined;

	constructor(
		private readonly _authService: IPukuAuthService,
		private readonly _db?: sql.DatabaseSync
	) {
		if (this._db) {
			this._jobManager = new PukuSummaryJobManager(this._db);
		}
	}

	/**
	 * Generate summaries for multiple chunks using parallel job-based processing
	 *
	 * @param chunks Code chunks to summarize
	 * @param languageId Programming language (e.g., 'go', 'typescript')
	 * @param fileId Database file ID (required for job tracking)
	 * @param progressCallback Optional callback for progress updates
	 * @returns Array of summaries (one per chunk)
	 */
	async generateSummariesBatch(
		chunks: SemanticChunk[],
		languageId: string,
		fileId?: number,
		progressCallback?: (current: number, total: number) => void
	): Promise<string[]> {
		// Use job-based parallel processing if fileId provided and job manager available
		if (fileId !== undefined && this._jobManager) {
			return this._generateSummariesWithJobs(chunks, languageId, fileId, progressCallback);
		}

		// Fallback to sequential processing (for backward compatibility)
		return this._generateSummariesSequential(chunks, languageId, progressCallback);
	}

	/**
	 * Generate summaries using parallel jobs (5 concurrent jobs)
	 */
	private async _generateSummariesWithJobs(
		chunks: SemanticChunk[],
		languageId: string,
		fileId: number,
		progressCallback?: (current: number, total: number) => void
	): Promise<string[]> {
		if (!this._jobManager) {
			throw new Error('Job manager not initialized');
		}

		console.log(`[SummaryGenerator] Starting parallel job processing for ${chunks.length} chunks`);

		// Create jobs (shards of 20 chunks each)
		const jobIds = this._jobManager.createJobs(fileId, chunks.length, PukuSummaryGenerator.CHUNKS_PER_JOB);

		// Process jobs in parallel (limit to MAX_PARALLEL_JOBS at a time)
		const jobPromises: Promise<void>[] = [];

		for (const jobId of jobIds) {
			const jobPromise = this._processJob(jobId, chunks, languageId);
			jobPromises.push(jobPromise);

			// Limit parallelism
			if (jobPromises.length >= PukuSummaryGenerator.MAX_PARALLEL_JOBS) {
				await Promise.race(jobPromises);
				// Remove completed promises
				const stillPending = jobPromises.filter(p => {
					let isPending = true;
					p.then(() => { isPending = false; }).catch(() => { isPending = false; });
					return isPending;
				});
				jobPromises.length = 0;
				jobPromises.push(...stillPending);
			}
		}

		// Wait for all jobs to complete
		await Promise.allSettled(jobPromises);

		// Collect summaries from completed jobs
		const summaries = this._jobManager.collectSummaries(fileId);

		// Apply fallback for empty summaries
		const finalSummaries = summaries.map((summary, i) =>
			summary || this._fallbackSummary(chunks[i])
		);

		// Clean up jobs
		this._jobManager.cleanupJobs(fileId);

		// Report final progress
		if (progressCallback) {
			progressCallback(chunks.length, chunks.length);
		}

		console.log(`[SummaryGenerator] Completed parallel processing: ${finalSummaries.length}/${chunks.length} summaries`);
		return finalSummaries;
	}

	/**
	 * Process a single job (shard of chunks)
	 */
	private async _processJob(
		jobId: number,
		allChunks: SemanticChunk[],
		languageId: string
	): Promise<void> {
		if (!this._jobManager) {
			return;
		}

		const job = this._jobManager.getJob(jobId);
		if (!job) {
			console.error(`[SummaryGenerator] Job ${jobId} not found`);
			return;
		}

		try {
			// Update status to running
			this._jobManager.updateJobStatus(jobId, 'running');

			const jobChunks = allChunks.slice(job.chunkStartIndex, job.chunkEndIndex);
			const summaries: string[] = [];

			// Process job chunks in batches of 10
			for (let i = 0; i < jobChunks.length; i += PukuSummaryGenerator.BATCH_SIZE) {
				const batch = jobChunks.slice(i, i + PukuSummaryGenerator.BATCH_SIZE);
				const batchSummaries = await this._generateBatch(batch, languageId);
				summaries.push(...batchSummaries);
			}

			// Update job as completed
			this._jobManager.updateJobStatus(jobId, 'completed', summaries);
			console.log(`[SummaryGenerator] Job ${jobId} completed: ${summaries.length} summaries`);
		} catch (error) {
			console.error(`[SummaryGenerator] Job ${jobId} failed:`, error);
			this._jobManager.updateJobStatus(jobId, 'failed', undefined, String(error));
		}
	}

	/**
	 * Generate summaries sequentially (fallback for backward compatibility)
	 */
	private async _generateSummariesSequential(
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
