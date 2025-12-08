"use strict";
/*---------------------------------------------------------------------------------------------
 *  Puku Editor - AI-powered code editor
 *  Copyright (c) Puku AI. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_sqlite_1 = require("node:sqlite");
const pukuSummaryGenerator_1 = require("../pukuSummaryGenerator");
// Mock auth service
const mockAuthService = {
    getToken: vitest_1.vi.fn().mockResolvedValue({ token: 'test-token', expiresAt: Date.now() + 10000 }),
    clearToken: vitest_1.vi.fn(),
    onDidChangeToken: vitest_1.vi.fn(),
};
// Mock fetch globally
global.fetch = vitest_1.vi.fn();
(0, vitest_1.suite)('PukuSummaryGenerator', () => {
    let db;
    let generator;
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

			-- Insert test file record
			INSERT INTO Files (id, uri, contentHash, languageId, lastIndexed) VALUES (1, 'file:///test.ts', 'hash1', 'typescript', ${Date.now()});
		`);
        generator = new pukuSummaryGenerator_1.PukuSummaryGenerator(mockAuthService, db);
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        db.close();
    });
    const createMockChunks = (count) => {
        return Array.from({ length: count }, (_, i) => ({
            text: `function test${i}() { return ${i}; }`,
            lineStart: i * 10,
            lineEnd: i * 10 + 5,
            chunkType: 'function',
            symbolName: `test${i}`,
        }));
    };
    (0, vitest_1.suite)('parallel job processing', () => {
        (0, vitest_1.test)('should use parallel jobs when fileId is provided', async () => {
            const chunks = createMockChunks(50);
            const fileId = 1;
            // Mock API responses
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test summary') }),
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript', fileId);
            (0, vitest_1.expect)(summaries.length).toBe(50);
            // Should have made 5 API calls (50 chunks / 10 per batch = 5 batches across jobs)
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(5);
        });
        (0, vitest_1.test)('should create correct number of jobs', async () => {
            const chunks = createMockChunks(100);
            const fileId = 1;
            let jobsCreated = false;
            global.fetch.mockImplementation(async () => {
                // On first call, check that jobs were created
                if (!jobsCreated) {
                    const jobs = db.prepare('SELECT * FROM SummaryJobs WHERE fileId = ?').all(fileId);
                    (0, vitest_1.expect)(jobs.length).toBe(5); // Should create 5 jobs (100 chunks / 20 per job = 5)
                    jobsCreated = true;
                }
                return {
                    ok: true,
                    json: async () => ({ summaries: Array(10).fill('test summary') }),
                };
            });
            await generator.generateSummariesBatch(chunks, 'typescript', fileId);
        });
        (0, vitest_1.test)('should handle parallel job failures gracefully', async () => {
            const chunks = createMockChunks(50);
            const fileId = 1;
            // Make first 2 API calls succeed, rest fail
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({ summaries: Array(10).fill('success') }),
                    });
                }
                return Promise.resolve({
                    ok: false,
                    status: 500,
                    text: async () => 'API error',
                });
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript', fileId);
            // Should return fallback summaries for failed batches
            (0, vitest_1.expect)(summaries.length).toBe(50);
            (0, vitest_1.expect)(summaries.every(s => s.length > 0)).toBe(true);
        });
        (0, vitest_1.test)('should clean up jobs after completion', async () => {
            const chunks = createMockChunks(40);
            const fileId = 1;
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test') }),
            });
            await generator.generateSummariesBatch(chunks, 'typescript', fileId);
            // Jobs should be cleaned up
            const jobs = db.prepare('SELECT * FROM SummaryJobs WHERE fileId = ?').all(fileId);
            (0, vitest_1.expect)(jobs.length).toBe(0);
        });
        (0, vitest_1.test)('should call progress callback', async () => {
            const chunks = createMockChunks(30);
            const fileId = 1;
            const progressCallback = vitest_1.vi.fn();
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test') }),
            });
            await generator.generateSummariesBatch(chunks, 'typescript', fileId, progressCallback);
            // Should call progress callback at least once with final progress
            (0, vitest_1.expect)(progressCallback).toHaveBeenCalledWith(30, 30);
        });
    });
    (0, vitest_1.suite)('sequential fallback processing', () => {
        (0, vitest_1.test)('should use sequential processing when fileId not provided', async () => {
            const chunks = createMockChunks(25);
            // Mock API responses to return correct number of summaries per call
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                const summaries = callCount === 3
                    ? Array(5).fill('test summary') // Last batch: 5 chunks
                    : Array(10).fill('test summary'); // First two batches: 10 chunks each
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ summaries }),
                });
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript');
            (0, vitest_1.expect)(summaries.length).toBe(25);
            // Should make 3 API calls (25 chunks / 10 per batch = 3 batches)
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(3);
        });
        (0, vitest_1.test)('should use sequential processing when database not provided', async () => {
            const generatorWithoutDb = new pukuSummaryGenerator_1.PukuSummaryGenerator(mockAuthService);
            const chunks = createMockChunks(20);
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test summary') }),
            });
            const summaries = await generatorWithoutDb.generateSummariesBatch(chunks, 'go');
            (0, vitest_1.expect)(summaries.length).toBe(20);
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(2);
        });
        (0, vitest_1.test)('should handle sequential batch failures', async () => {
            const chunks = createMockChunks(30);
            // First batch succeeds, second fails, third succeeds
            let callCount = 0;
            global.fetch.mockImplementation(() => {
                callCount++;
                if (callCount === 2) {
                    return Promise.resolve({
                        ok: false,
                        status: 500,
                        text: async () => 'Server error',
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ summaries: Array(10).fill('ok') }),
                });
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript');
            // Should have fallback summaries for failed batch
            (0, vitest_1.expect)(summaries.length).toBe(30);
            (0, vitest_1.expect)(summaries.slice(0, 10).every(s => s === 'ok')).toBe(true);
            (0, vitest_1.expect)(summaries.slice(10, 20).every(s => s.startsWith('function'))).toBe(true); // Fallback
            (0, vitest_1.expect)(summaries.slice(20, 30).every(s => s === 'ok')).toBe(true);
        });
    });
    (0, vitest_1.suite)('API interaction', () => {
        (0, vitest_1.test)('should send correct request format', async () => {
            const chunks = createMockChunks(5);
            const fileId = 1;
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(5).fill('test') }),
            });
            await generator.generateSummariesBatch(chunks, 'go', fileId);
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledWith('https://api.puku.sh/v1/summarize/batch', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Authorization': 'Bearer test-token',
                    'Content-Type': 'application/json',
                }),
            }));
            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            (0, vitest_1.expect)(body.languageId).toBe('go');
            (0, vitest_1.expect)(body.chunks.length).toBe(5);
        });
        (0, vitest_1.test)('should use fallback summaries when no auth token available', async () => {
            const mockAuthWithoutToken = {
                getToken: vitest_1.vi.fn().mockResolvedValue(null),
                clearToken: vitest_1.vi.fn(),
                onDidChangeToken: vitest_1.vi.fn(),
            };
            const generatorWithoutAuth = new pukuSummaryGenerator_1.PukuSummaryGenerator(mockAuthWithoutToken, db);
            const chunks = createMockChunks(10);
            // With fileId, it uses parallel jobs which will fail but return fallback summaries
            const summaries = await generatorWithoutAuth.generateSummariesBatch(chunks, 'typescript', 1);
            // Should return fallback summaries for all chunks
            (0, vitest_1.expect)(summaries.length).toBe(10);
            (0, vitest_1.expect)(summaries.every(s => s.length > 0)).toBe(true);
            (0, vitest_1.expect)(summaries.every(s => s.startsWith('function test'))).toBe(true);
            // Verify jobs are cleaned up
            const jobs = db.prepare('SELECT * FROM SummaryJobs WHERE fileId = ?').all(1);
            (0, vitest_1.expect)(jobs.length).toBe(0);
        });
    });
    (0, vitest_1.suite)('fallback summaries', () => {
        (0, vitest_1.test)('should use AST metadata for fallback', async () => {
            const chunks = [
                {
                    text: 'function foo() {}',
                    lineStart: 1,
                    lineEnd: 1,
                    chunkType: 'function',
                    symbolName: 'foo',
                },
                {
                    text: 'class Bar {}',
                    lineStart: 3,
                    lineEnd: 5,
                    chunkType: 'class',
                    symbolName: 'Bar',
                },
            ];
            // Make API fail to trigger fallback
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'error',
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript');
            (0, vitest_1.expect)(summaries[0]).toBe('function foo');
            (0, vitest_1.expect)(summaries[1]).toBe('class Bar');
        });
        (0, vitest_1.test)('should extract first line when no AST metadata', async () => {
            const chunks = [
                {
                    text: 'const x = 42;\nconst y = 100;',
                    lineStart: 1,
                    lineEnd: 2,
                },
            ];
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'error',
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript');
            (0, vitest_1.expect)(summaries[0]).toBe('const x = 42;');
        });
    });
    (0, vitest_1.suite)('batching behavior', () => {
        (0, vitest_1.test)('should batch 10 chunks per API call', async () => {
            const chunks = createMockChunks(25);
            const fileId = 1;
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test') }),
            });
            await generator.generateSummariesBatch(chunks, 'typescript', fileId);
            // Should make 3 API calls (25 / 10 = 2.5 → 3 calls)
            (0, vitest_1.expect)(global.fetch).toHaveBeenCalledTimes(3);
            const calls = global.fetch.mock.calls;
            const body1 = JSON.parse(calls[0][1].body);
            const body2 = JSON.parse(calls[1][1].body);
            const body3 = JSON.parse(calls[2][1].body);
            // First two batches: 10 chunks each
            (0, vitest_1.expect)(body1.chunks.length).toBe(10);
            (0, vitest_1.expect)(body2.chunks.length).toBe(10);
            // Last batch: 5 chunks (25 % 10 = 5)
            (0, vitest_1.expect)(body3.chunks.length).toBe(5);
        });
    });
    (0, vitest_1.suite)('edge cases', () => {
        (0, vitest_1.test)('should handle empty chunks array', async () => {
            const summaries = await generator.generateSummariesBatch([], 'typescript', 1);
            (0, vitest_1.expect)(summaries.length).toBe(0);
            (0, vitest_1.expect)(global.fetch).not.toHaveBeenCalled();
        });
        (0, vitest_1.test)('should handle single chunk', async () => {
            const chunks = createMockChunks(1);
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: ['single summary'] }),
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript', 1);
            (0, vitest_1.expect)(summaries.length).toBe(1);
            (0, vitest_1.expect)(summaries[0]).toBe('single summary');
        });
        (0, vitest_1.test)('should handle exactly 20 chunks (one job)', async () => {
            const chunks = createMockChunks(20);
            const fileId = 1;
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ summaries: Array(10).fill('test') }),
            });
            const summaries = await generator.generateSummariesBatch(chunks, 'typescript', fileId);
            (0, vitest_1.expect)(summaries.length).toBe(20);
            // Should create exactly 1 job (20 chunks / 20 per job = 1)
            const jobs = db.prepare('SELECT COUNT(*) as count FROM SummaryJobs').get();
            (0, vitest_1.expect)(jobs.count).toBe(0); // Jobs cleaned up after completion
        });
    });
});
//# sourceMappingURL=pukuSummaryGenerator.spec.js.map