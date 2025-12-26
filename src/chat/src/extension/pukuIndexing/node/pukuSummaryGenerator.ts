/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  LLM-based code summarization for semantic search
 *--------------------------------------------------------------------------------------------*/

import sql from 'node:sqlite';
import { SemanticChunk } from './pukuASTChunker';
import { IPukuAuthService } from '../common/pukuAuth';
import { IPukuConfigService } from '../common/pukuConfig';
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
	private _jobManager: PukuSummaryJobManager | undefined;

	constructor(
		private readonly _authService: IPukuAuthService,
		private readonly _configService: IPukuConfigService,
		private readonly _db?: sql.DatabaseSync
	) {
		if (this._db) {
			this._jobManager = new PukuSummaryJobManager(this._db);
		}
		const config = this._configService.getConfig();
// 		console.log(`[SummaryGenerator] Config loaded: endpoint=${config.endpoints.summarize}, chunksPerJob=${config.performance.chunksPerJob}, maxJobs=${config.performance.maxConcurrentJobs}`);
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
		// Skip LLM summarization for minified files (1 chunk with no structure)
		if (chunks.length === 1 && this._isMinified(chunks[0].text)) {
			console.log(`[SummaryGenerator] Skipping minified file (1 chunk, minified)`);
			return [this._fallbackSummary(chunks[0])];
		}

		console.log(`[SummaryGenerator] generateSummariesBatch called:`, {
			chunksCount: chunks.length,
			languageId,
			fileId,
			hasJobManager: !!this._jobManager
		});

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

		const config = this._configService.getConfig();
		// Create jobs (shards configured by server)
		const jobIds = this._jobManager.createJobs(fileId, chunks.length, config.performance.chunksPerJob);

		// Process jobs in parallel (limit configured by server)
		const jobPromises: Promise<void>[] = [];

		for (const jobId of jobIds) {
			const jobPromise = this._processJob(jobId, chunks, languageId);
			jobPromises.push(jobPromise);

			// Limit parallelism (configured by server)
			if (jobPromises.length >= config.performance.maxConcurrentJobs) {
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
		// Iterate over chunks (not summaries) to ensure we don't go out of bounds
		const finalSummaries = chunks.map((chunk, i) => {
			return summaries[i] || this._fallbackSummary(chunk);
		});

		// Clean up jobs
		this._jobManager.cleanupJobs(fileId);

		// Report final progress
		if (progressCallback) {
			progressCallback(chunks.length, chunks.length);
		}

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

			console.log(`[SummaryGenerator] Processing job ${jobId}:`, {
				totalChunks: allChunks.length,
				chunkStartIndex: job.chunkStartIndex,
				chunkEndIndex: job.chunkEndIndex,
				expectedJobChunks: job.chunkEndIndex - job.chunkStartIndex
			});

			const jobChunks = allChunks.slice(job.chunkStartIndex, job.chunkEndIndex);
			console.log(`[SummaryGenerator] Job ${jobId} sliced chunks:`, {
				jobChunksLength: jobChunks.length,
				languageId
			});

			const summaries: string[] = [];

			const config = this._configService.getConfig();
			const batchSize = config.performance.batchSize || 50; // Default to 50 if not set

			console.log(`[SummaryGenerator] Job ${jobId} config check:`, {
				configBatchSize: config.performance.batchSize,
				actualBatchSize: batchSize,
				jobChunksLength: jobChunks.length
			});

			// Process job chunks in batches (configured by server)
			for (let i = 0; i < jobChunks.length; i += batchSize) {
				const batch = jobChunks.slice(i, i + batchSize);
				console.log(`[SummaryGenerator] Job ${jobId} batch ${Math.floor(i / batchSize) + 1}:`, {
					batchSize: batch.length,
					batchIndex: i,
					maxBatchSize: batchSize
				});

				try {
					const batchSummaries = await this._generateBatch(batch, languageId);
					summaries.push(...batchSummaries);
				} catch (batchError) {
					// If batch fails, use fallback summaries for this batch
					console.warn(`[SummaryGenerator] Job ${jobId} batch ${i / config.performance.batchSize + 1} failed, using fallbacks:`, batchError);
					const fallbackSummaries = batch.map(c => this._fallbackSummary(c));
					summaries.push(...fallbackSummaries);
				}
			}

			// Update job as completed (even if some batches used fallbacks)
			this._jobManager.updateJobStatus(jobId, 'completed', summaries);
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

		const config = this._configService.getConfig();
		const batchSize = config.performance.batchSize || 50; // Default to 50 if not set

		// Process chunks in batches (configured by server)
		for (let i = 0; i < chunks.length; i += batchSize) {
			const batch = chunks.slice(i, i + batchSize);

			// Report progress
			if (progressCallback) {
				progressCallback(Math.min(i + batch.length, chunks.length), chunks.length);
			}

			try {
				const batchSummaries = await this._generateBatch(batch, languageId);
				summaries.push(...batchSummaries);
			} catch (error) {
				console.error(`[SummaryGenerator] Batch failed:`, error);

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
			console.error('[SummaryGenerator] ❌ No auth token available');
			throw new Error('Authentication required for summary generation. Please sign in.');
		}

		const config = this._configService.getConfig();
		const url = config.endpoints.summarize;

		try {
			const requestBody = {
				chunks: chunks.map(c => ({ text: c.text })),
				languageId
			};

			console.log('[SummaryGenerator] 📤 Sending batch:', {
				chunksCount: chunks.length,
				languageId,
				firstChunkPreview: chunks[0]?.text.substring(0, 50) || 'N/A'
			});

			// Call dedicated summary endpoint (uses server-side API key)
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestBody)
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error('[SummaryGenerator] ❌ API error:', {
					status: response.status,
					error: errorText
				});
				throw new Error(`Summary API failed: ${response.status} ${errorText}`);
			}

			const data = await response.json() as { summaries: string[] };
			return data.summaries;
		} catch (error) {
			console.error('[SummaryGenerator] ❌ Fetch failed:', error instanceof Error ? error.message : String(error));
			throw error;
		}
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
	 * Detect if code is minified (long lines, no whitespace)
	 */
	private _isMinified(text: string): boolean {
		const lines = text.split('\n');
		if (lines.length === 0) return false;

		// Check first line characteristics
		const firstLine = lines[0];
		const avgLineLength = text.length / lines.length;

		// Minified if:
		// - Very long average line length (>500 chars)
		// - OR first line is extremely long (>1000 chars) with few lines
		return avgLineLength > 500 || (firstLine.length > 1000 && lines.length < 10);
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
