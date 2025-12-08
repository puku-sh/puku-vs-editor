"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Job manager for parallel summary generation
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.PukuSummaryJobManager = void 0;
/**
 * Manages summary generation jobs for parallel processing
 * Tracks job progress in SQLite database for resilience and observability
 */
class PukuSummaryJobManager {
    constructor(_db) {
        this._db = _db;
    }
    /**
     * Create summary jobs for a file (split chunks into shards)
     *
     * @param fileId Database file ID
     * @param totalChunks Total number of chunks to process
     * @param chunksPerJob Number of chunks per job (shard size)
     * @returns Array of created job IDs
     */
    createJobs(fileId, totalChunks, chunksPerJob = 20) {
        const jobIds = [];
        const now = Date.now();
        // Clean up any existing jobs for this file first
        this._db.prepare('DELETE FROM SummaryJobs WHERE fileId = ?').run(fileId);
        const insertStmt = this._db.prepare(`
			INSERT INTO SummaryJobs (fileId, status, chunkStartIndex, chunkEndIndex, createdAt)
			VALUES (?, 'pending', ?, ?, ?)
		`);
        // Create jobs (shards)
        for (let i = 0; i < totalChunks; i += chunksPerJob) {
            const startIndex = i;
            const endIndex = Math.min(i + chunksPerJob, totalChunks);
            const result = insertStmt.run(fileId, startIndex, endIndex, now);
            jobIds.push(result.lastInsertRowid);
        }
        console.log(`[SummaryJobManager] Created ${jobIds.length} jobs for fileId=${fileId} (${totalChunks} chunks, ${chunksPerJob} per job)`);
        return jobIds;
    }
    /**
     * Get all jobs for a file
     */
    getJobsForFile(fileId) {
        const rows = this._db.prepare(`
			SELECT id, fileId, status, chunkStartIndex, chunkEndIndex, summaries, error, createdAt, completedAt
			FROM SummaryJobs
			WHERE fileId = ?
			ORDER BY chunkStartIndex ASC
		`).all(fileId);
        return rows.map(row => ({
            id: row.id,
            fileId: row.fileId,
            status: row.status,
            chunkStartIndex: row.chunkStartIndex,
            chunkEndIndex: row.chunkEndIndex,
            summaries: row.summaries ? JSON.parse(row.summaries) : undefined,
            error: row.error ?? undefined,
            createdAt: row.createdAt,
            completedAt: row.completedAt ?? undefined,
        }));
    }
    /**
     * Get a specific job by ID
     */
    getJob(jobId) {
        const row = this._db.prepare(`
			SELECT id, fileId, status, chunkStartIndex, chunkEndIndex, summaries, error, createdAt, completedAt
			FROM SummaryJobs
			WHERE id = ?
		`).get(jobId);
        if (!row) {
            return undefined;
        }
        return {
            id: row.id,
            fileId: row.fileId,
            status: row.status,
            chunkStartIndex: row.chunkStartIndex,
            chunkEndIndex: row.chunkEndIndex,
            summaries: row.summaries ? JSON.parse(row.summaries) : undefined,
            error: row.error ?? undefined,
            createdAt: row.createdAt,
            completedAt: row.completedAt ?? undefined,
        };
    }
    /**
     * Update job status
     */
    updateJobStatus(jobId, status, summaries, error) {
        const now = Date.now();
        const summariesJson = summaries ? JSON.stringify(summaries) : null;
        this._db.prepare(`
			UPDATE SummaryJobs
			SET status = ?, summaries = ?, error = ?, completedAt = ?
			WHERE id = ?
		`).run(status, summariesJson, error ?? null, status === 'completed' || status === 'failed' ? now : null, jobId);
        console.log(`[SummaryJobManager] Job ${jobId} status: ${status}`);
    }
    /**
     * Collect all summaries from completed jobs in order
     * Handles partial failures gracefully
     *
     * @param fileId Database file ID
     * @returns Array of summaries (empty string for failed jobs)
     */
    collectSummaries(fileId) {
        const jobs = this.getJobsForFile(fileId);
        const allSummaries = [];
        for (const job of jobs) {
            if (job.status === 'completed' && job.summaries) {
                allSummaries.push(...job.summaries);
            }
            else {
                // Generate empty summaries for failed jobs (will use fallback in generator)
                const chunkCount = job.chunkEndIndex - job.chunkStartIndex;
                for (let i = 0; i < chunkCount; i++) {
                    allSummaries.push(''); // Empty summary = trigger fallback
                }
            }
        }
        return allSummaries;
    }
    /**
     * Clean up completed jobs for a file
     */
    cleanupJobs(fileId) {
        const result = this._db.prepare('DELETE FROM SummaryJobs WHERE fileId = ?').run(fileId);
        console.log(`[SummaryJobManager] Cleaned up ${result.changes} jobs for fileId=${fileId}`);
    }
    /**
     * Get job statistics for a file
     */
    getJobStats(fileId) {
        const jobs = this.getJobsForFile(fileId);
        return {
            total: jobs.length,
            pending: jobs.filter(j => j.status === 'pending').length,
            running: jobs.filter(j => j.status === 'running').length,
            completed: jobs.filter(j => j.status === 'completed').length,
            failed: jobs.filter(j => j.status === 'failed').length,
        };
    }
}
exports.PukuSummaryJobManager = PukuSummaryJobManager;
//# sourceMappingURL=pukuSummaryJobManager.js.map