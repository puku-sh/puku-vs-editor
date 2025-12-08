"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  LLM-based code summarization for semantic search
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuSummaryGenerator = void 0;
const pukuSummaryJobManager_1 = require("./pukuSummaryJobManager");
/**
 * Puku Summary Generator - generates natural language summaries of code chunks
 * using LLM (GLM-4.5-Air) for improved semantic search.
 *
 * Summaries describe what code does (functionality), inputs, and outputs in
 * natural language, enabling better matching between comments and code.
 *
 * Supports job-based parallel processing for faster indexing.
 */
class PukuSummaryGenerator {
    constructor(_authService, _configService, _db) {
        this._authService = _authService;
        this._configService = _configService;
        this._db = _db;
        if (this._db) {
            this._jobManager = new pukuSummaryJobManager_1.PukuSummaryJobManager(this._db);
        }
        const config = this._configService.getConfig();
        console.log(`[SummaryGenerator] Config loaded: endpoint=${config.endpoints.summarize}, chunksPerJob=${config.performance.chunksPerJob}, maxJobs=${config.performance.maxConcurrentJobs}`);
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
    async generateSummariesBatch(chunks, languageId, fileId, progressCallback) {
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
    async _generateSummariesWithJobs(chunks, languageId, fileId, progressCallback) {
        if (!this._jobManager) {
            throw new Error('Job manager not initialized');
        }
        const config = this._configService.getConfig();
        // Create jobs (shards configured by server)
        const jobIds = this._jobManager.createJobs(fileId, chunks.length, config.performance.chunksPerJob);
        // Process jobs in parallel (limit configured by server)
        const jobPromises = [];
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
        // Ensure we don't go out of bounds if summaries.length > chunks.length
        const finalSummaries = summaries.map((summary, i) => {
            if (i >= chunks.length) {
                console.error(`[SummaryGenerator] Index ${i} out of bounds (chunks.length=${chunks.length}), skipping`);
                return ''; // Return empty summary for out-of-bounds
            }
            return summary || this._fallbackSummary(chunks[i]);
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
    async _processJob(jobId, allChunks, languageId) {
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
            const summaries = [];
            const config = this._configService.getConfig();
            // Process job chunks in batches (configured by server)
            for (let i = 0; i < jobChunks.length; i += config.performance.batchSize) {
                const batch = jobChunks.slice(i, i + config.performance.batchSize);
                const batchSummaries = await this._generateBatch(batch, languageId);
                summaries.push(...batchSummaries);
            }
            // Update job as completed
            this._jobManager.updateJobStatus(jobId, 'completed', summaries);
        }
        catch (error) {
            console.error(`[SummaryGenerator] Job ${jobId} failed:`, error);
            this._jobManager.updateJobStatus(jobId, 'failed', undefined, String(error));
        }
    }
    /**
     * Generate summaries sequentially (fallback for backward compatibility)
     */
    async _generateSummariesSequential(chunks, languageId, progressCallback) {
        const summaries = [];
        const config = this._configService.getConfig();
        // Process chunks in batches (configured by server)
        for (let i = 0; i < chunks.length; i += config.performance.batchSize) {
            const batch = chunks.slice(i, i + config.performance.batchSize);
            // Report progress
            if (progressCallback) {
                progressCallback(Math.min(i + batch.length, chunks.length), chunks.length);
            }
            try {
                const batchSummaries = await this._generateBatch(batch, languageId);
                summaries.push(...batchSummaries);
            }
            catch (error) {
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
    async _generateBatch(chunks, languageId) {
        const token = await this._authService.getToken();
        if (!token) {
            throw new Error('No auth token available for summary generation');
        }
        const config = this._configService.getConfig();
        const url = config.endpoints.summarize;
        // Call dedicated summary endpoint (uses server-side API key)
        const response = await fetch(url, {
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
        const data = await response.json();
        return data.summaries;
    }
    /**
     * Create batch prompt for LLM
     * Asks LLM to summarize each chunk with functionality, inputs, and outputs
     */
    _createBatchPrompt(chunks, languageId) {
        // Format chunks with index markers
        const chunksText = chunks.map((chunk, i) => `[CHUNK ${i + 1}]\n${chunk.text}\n`).join('\n');
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
    _parseBatchResponse(response, expectedCount) {
        const lines = response.split('\n').map(l => l.trim()).filter(l => l);
        const summaries = [];
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
                const remainingLines = lines.filter(l => !summaries.some(s => l.includes(s)));
                if (remainingLines.length > 0) {
                    // Take first remaining line, strip any [N] prefix
                    const line = remainingLines[0].replace(/^\[\d+\]\s*/, '').trim();
                    summaries.push(line || 'Code chunk');
                }
                else {
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
    _fallbackSummary(chunk) {
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
            .filter(l => l.length > 0 &&
            !l.startsWith('//') &&
            !l.startsWith('#') &&
            !l.startsWith('/*') &&
            !l.startsWith('*'));
        const firstLine = lines[0] || text.substring(0, 100);
        return firstLine.substring(0, 100);
    }
}
exports.PukuSummaryGenerator = PukuSummaryGenerator;
//# sourceMappingURL=pukuSummaryGenerator.js.map