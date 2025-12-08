"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_sqlite_1 = require("node:sqlite");
const pukuSummaryJobManager_1 = require("../pukuSummaryJobManager");
(0, vitest_1.suite)('PukuSummaryJobManager', () => {
    let db;
    let jobManager;
    (0, vitest_1.beforeEach)(() => {
        // Create in-memory database
        db = new node_sqlite_1.DatabaseSync(':memory:');
        // Create required tables
        db.exec(`
			CREATE TABLE Files (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT NOT NULL UNIQUE,
				contentHash TEXT NOT NULL,
				languageId TEXT NOT NULL,
				lastIndexed INTEGER NOT NULL
			);

			CREATE TABLE SummaryJobs (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				fileId INTEGER NOT NULL,
				status TEXT NOT NULL,
				chunkStartIndex INTEGER NOT NULL,
				chunkEndIndex INTEGER NOT NULL,
				summaries TEXT,
				error TEXT,
				createdAt INTEGER NOT NULL,
				completedAt INTEGER,
				FOREIGN KEY (fileId) REFERENCES Files(id) ON DELETE CASCADE
			);

			CREATE INDEX idx_summary_jobs_fileId ON SummaryJobs(fileId);
			CREATE INDEX idx_summary_jobs_status ON SummaryJobs(status);

			-- Insert test file records
			INSERT INTO Files (id, uri, contentHash, languageId, lastIndexed) VALUES (1, 'file:///test1.ts', 'hash1', 'typescript', ${Date.now()});
			INSERT INTO Files (id, uri, contentHash, languageId, lastIndexed) VALUES (2, 'file:///test2.ts', 'hash2', 'typescript', ${Date.now()});
		`);
        jobManager = new pukuSummaryJobManager_1.PukuSummaryJobManager(db);
    });
    (0, vitest_1.afterEach)(() => {
        db.close();
    });
    (0, vitest_1.suite)('createJobs', () => {
        (0, vitest_1.test)('should create jobs for 100 chunks with default shard size', () => {
            const fileId = 1;
            const totalChunks = 100;
            const jobIds = jobManager.createJobs(fileId, totalChunks);
            // Should create 5 jobs (100 / 20 = 5)
            (0, vitest_1.expect)(jobIds.length).toBe(5);
            (0, vitest_1.expect)(jobIds.every(id => id > 0)).toBe(true);
            // Verify jobs in database
            const jobs = jobManager.getJobsForFile(fileId);
            (0, vitest_1.expect)(jobs.length).toBe(5);
            (0, vitest_1.expect)(jobs[0].chunkStartIndex).toBe(0);
            (0, vitest_1.expect)(jobs[0].chunkEndIndex).toBe(20);
            (0, vitest_1.expect)(jobs[4].chunkStartIndex).toBe(80);
            (0, vitest_1.expect)(jobs[4].chunkEndIndex).toBe(100);
        });
        (0, vitest_1.test)('should create jobs with custom shard size', () => {
            const fileId = 1;
            const totalChunks = 50;
            const chunksPerJob = 10;
            const jobIds = jobManager.createJobs(fileId, totalChunks, chunksPerJob);
            // Should create 5 jobs (50 / 10 = 5)
            (0, vitest_1.expect)(jobIds.length).toBe(5);
            const jobs = jobManager.getJobsForFile(fileId);
            (0, vitest_1.expect)(jobs.length).toBe(5);
            (0, vitest_1.expect)(jobs[0].chunkStartIndex).toBe(0);
            (0, vitest_1.expect)(jobs[0].chunkEndIndex).toBe(10);
        });
        (0, vitest_1.test)('should handle partial last shard', () => {
            const fileId = 1;
            const totalChunks = 25; // Not evenly divisible by 20
            const chunksPerJob = 20;
            const jobIds = jobManager.createJobs(fileId, totalChunks, chunksPerJob);
            // Should create 2 jobs (25 / 20 = 1.25 -> 2 jobs)
            (0, vitest_1.expect)(jobIds.length).toBe(2);
            const jobs = jobManager.getJobsForFile(fileId);
            (0, vitest_1.expect)(jobs[0].chunkEndIndex).toBe(20);
            (0, vitest_1.expect)(jobs[1].chunkStartIndex).toBe(20);
            (0, vitest_1.expect)(jobs[1].chunkEndIndex).toBe(25); // Partial last job
        });
        (0, vitest_1.test)('should clean up existing jobs before creating new ones', () => {
            const fileId = 1;
            // Create first batch
            jobManager.createJobs(fileId, 50, 10);
            (0, vitest_1.expect)(jobManager.getJobsForFile(fileId).length).toBe(5);
            // Create second batch (should replace first)
            jobManager.createJobs(fileId, 30, 10);
            (0, vitest_1.expect)(jobManager.getJobsForFile(fileId).length).toBe(3);
        });
        (0, vitest_1.test)('should set all jobs to pending status', () => {
            const fileId = 1;
            jobManager.createJobs(fileId, 40, 10);
            const jobs = jobManager.getJobsForFile(fileId);
            (0, vitest_1.expect)(jobs.every(job => job.status === 'pending')).toBe(true);
        });
    });
    (0, vitest_1.suite)('getJob', () => {
        (0, vitest_1.test)('should retrieve specific job by ID', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 40, 10);
            const job = jobManager.getJob(jobIds[1]);
            (0, vitest_1.expect)(job).toBeDefined();
            (0, vitest_1.expect)(job.id).toBe(jobIds[1]);
            (0, vitest_1.expect)(job.chunkStartIndex).toBe(10);
            (0, vitest_1.expect)(job.chunkEndIndex).toBe(20);
        });
        (0, vitest_1.test)('should return undefined for non-existent job', () => {
            const job = jobManager.getJob(9999);
            (0, vitest_1.expect)(job).toBeUndefined();
        });
    });
    (0, vitest_1.suite)('updateJobStatus', () => {
        (0, vitest_1.test)('should update job status to running', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 20, 10);
            jobManager.updateJobStatus(jobIds[0], 'running');
            const job = jobManager.getJob(jobIds[0]);
            (0, vitest_1.expect)(job.status).toBe('running');
            (0, vitest_1.expect)(job.completedAt).toBeUndefined();
        });
        (0, vitest_1.test)('should update job status to completed with summaries', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 20, 10);
            const summaries = ['summary1', 'summary2', 'summary3'];
            jobManager.updateJobStatus(jobIds[0], 'completed', summaries);
            const job = jobManager.getJob(jobIds[0]);
            (0, vitest_1.expect)(job.status).toBe('completed');
            (0, vitest_1.expect)(job.summaries).toEqual(summaries);
            (0, vitest_1.expect)(job.completedAt).toBeGreaterThan(0);
        });
        (0, vitest_1.test)('should update job status to failed with error', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 20, 10);
            const errorMsg = 'API failed with 500';
            jobManager.updateJobStatus(jobIds[0], 'failed', undefined, errorMsg);
            const job = jobManager.getJob(jobIds[0]);
            (0, vitest_1.expect)(job.status).toBe('failed');
            (0, vitest_1.expect)(job.error).toBe(errorMsg);
            (0, vitest_1.expect)(job.completedAt).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.suite)('collectSummaries', () => {
        (0, vitest_1.test)('should collect summaries from completed jobs in order', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 30, 10);
            // Complete jobs with summaries
            jobManager.updateJobStatus(jobIds[0], 'completed', ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10']);
            jobManager.updateJobStatus(jobIds[1], 'completed', ['s11', 's12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20']);
            jobManager.updateJobStatus(jobIds[2], 'completed', ['s21', 's22', 's23', 's24', 's25', 's26', 's27', 's28', 's29', 's30']);
            const summaries = jobManager.collectSummaries(fileId);
            (0, vitest_1.expect)(summaries.length).toBe(30);
            (0, vitest_1.expect)(summaries[0]).toBe('s1');
            (0, vitest_1.expect)(summaries[10]).toBe('s11');
            (0, vitest_1.expect)(summaries[29]).toBe('s30');
        });
        (0, vitest_1.test)('should use empty strings for failed jobs', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 30, 10);
            // Job 1: completed
            jobManager.updateJobStatus(jobIds[0], 'completed', Array(10).fill('ok'));
            // Job 2: failed
            jobManager.updateJobStatus(jobIds[1], 'failed', undefined, 'API error');
            // Job 3: completed
            jobManager.updateJobStatus(jobIds[2], 'completed', Array(10).fill('ok'));
            const summaries = jobManager.collectSummaries(fileId);
            (0, vitest_1.expect)(summaries.length).toBe(30);
            // First 10: completed
            (0, vitest_1.expect)(summaries.slice(0, 10).every(s => s === 'ok')).toBe(true);
            // Next 10: failed (empty strings)
            (0, vitest_1.expect)(summaries.slice(10, 20).every(s => s === '')).toBe(true);
            // Last 10: completed
            (0, vitest_1.expect)(summaries.slice(20, 30).every(s => s === 'ok')).toBe(true);
        });
        (0, vitest_1.test)('should use empty strings for pending jobs', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 20, 10);
            // Complete only first job
            jobManager.updateJobStatus(jobIds[0], 'completed', Array(10).fill('ok'));
            // Second job remains pending
            const summaries = jobManager.collectSummaries(fileId);
            (0, vitest_1.expect)(summaries.length).toBe(20);
            (0, vitest_1.expect)(summaries.slice(0, 10).every(s => s === 'ok')).toBe(true);
            (0, vitest_1.expect)(summaries.slice(10, 20).every(s => s === '')).toBe(true);
        });
    });
    (0, vitest_1.suite)('cleanupJobs', () => {
        (0, vitest_1.test)('should delete all jobs for a file', () => {
            const fileId = 1;
            jobManager.createJobs(fileId, 40, 10);
            (0, vitest_1.expect)(jobManager.getJobsForFile(fileId).length).toBe(4);
            jobManager.cleanupJobs(fileId);
            (0, vitest_1.expect)(jobManager.getJobsForFile(fileId).length).toBe(0);
        });
        (0, vitest_1.test)('should not affect jobs for other files', () => {
            jobManager.createJobs(1, 20, 10);
            jobManager.createJobs(2, 30, 10);
            jobManager.cleanupJobs(1);
            (0, vitest_1.expect)(jobManager.getJobsForFile(1).length).toBe(0);
            (0, vitest_1.expect)(jobManager.getJobsForFile(2).length).toBe(3);
        });
    });
    (0, vitest_1.suite)('getJobStats', () => {
        (0, vitest_1.test)('should return correct job statistics', () => {
            const fileId = 1;
            const jobIds = jobManager.createJobs(fileId, 50, 10);
            // Set different statuses
            jobManager.updateJobStatus(jobIds[0], 'running');
            jobManager.updateJobStatus(jobIds[1], 'completed', ['s1']);
            jobManager.updateJobStatus(jobIds[2], 'failed', undefined, 'error');
            // jobIds[3] and jobIds[4] remain pending
            const stats = jobManager.getJobStats(fileId);
            (0, vitest_1.expect)(stats.total).toBe(5);
            (0, vitest_1.expect)(stats.pending).toBe(2);
            (0, vitest_1.expect)(stats.running).toBe(1);
            (0, vitest_1.expect)(stats.completed).toBe(1);
            (0, vitest_1.expect)(stats.failed).toBe(1);
        });
    });
    (0, vitest_1.suite)('job ordering', () => {
        (0, vitest_1.test)('should return jobs in chunk order', () => {
            const fileId = 1;
            jobManager.createJobs(fileId, 50, 10);
            const jobs = jobManager.getJobsForFile(fileId);
            // Verify jobs are ordered by chunkStartIndex
            for (let i = 0; i < jobs.length - 1; i++) {
                (0, vitest_1.expect)(jobs[i].chunkStartIndex).toBeLessThan(jobs[i + 1].chunkStartIndex);
            }
        });
    });
    (0, vitest_1.suite)('concurrent file processing', () => {
        (0, vitest_1.test)('should handle multiple files independently', () => {
            const file1Jobs = jobManager.createJobs(1, 20, 10);
            const file2Jobs = jobManager.createJobs(2, 30, 10);
            // Complete all jobs for both files
            jobManager.updateJobStatus(file1Jobs[0], 'completed', Array(10).fill('f1s1'));
            jobManager.updateJobStatus(file1Jobs[1], 'completed', Array(10).fill('f1s2'));
            jobManager.updateJobStatus(file2Jobs[0], 'completed', Array(10).fill('f2s1'));
            jobManager.updateJobStatus(file2Jobs[1], 'completed', Array(10).fill('f2s2'));
            jobManager.updateJobStatus(file2Jobs[2], 'completed', Array(10).fill('f2s3'));
            const file1Summaries = jobManager.collectSummaries(1);
            const file2Summaries = jobManager.collectSummaries(2);
            (0, vitest_1.expect)(file1Summaries.length).toBe(20);
            (0, vitest_1.expect)(file2Summaries.length).toBe(30);
            (0, vitest_1.expect)(file1Summaries[0]).toBe('f1s1');
            (0, vitest_1.expect)(file2Summaries[0]).toBe('f2s1');
        });
    });
});
//# sourceMappingURL=pukuSummaryJobManager.spec.js.map