"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const envService_1 = require("../../../../../platform/env/common/envService");
const fileSystemService_1 = require("../../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../../platform/filesystem/common/fileTypes");
const mockFileSystemService_1 = require("../../../../../platform/filesystem/node/test/mockFileSystemService");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const testUtils_1 = require("../../../../../util/common/test/testUtils");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../../test/node/services");
const claudeCodeSessionService_1 = require("../claudeCodeSessionService");
function computeFolderSlug(folderUri) {
    return folderUri.path.replace(/\//g, '-');
}
(0, vitest_1.describe)('ClaudeCodeSessionService', () => {
    const workspaceFolderPath = '/project';
    const folderUri = uri_1.URI.file(workspaceFolderPath);
    const slug = computeFolderSlug(folderUri);
    let dirUri;
    let mockFs;
    let testingServiceCollection;
    let service;
    const store = (0, testUtils_1.ensureNoDisposablesAreLeakedInTestSuite)();
    (0, vitest_1.beforeEach)(() => {
        mockFs = new mockFileSystemService_1.MockFileSystemService();
        testingServiceCollection = store.add((0, services_1.createExtensionUnitTestingServices)(store));
        testingServiceCollection.set(fileSystemService_1.IFileSystemService, mockFs);
        // Create mock workspace service with the test workspace folder
        const workspaceService = store.add(new testWorkspaceService_1.TestWorkspaceService([folderUri]));
        testingServiceCollection.set(workspaceService_1.IWorkspaceService, workspaceService);
        const accessor = testingServiceCollection.createTestingAccessor();
        mockFs = accessor.get(fileSystemService_1.IFileSystemService);
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        const nativeEnvService = accessor.get(envService_1.INativeEnvService);
        dirUri = uri_1.URI.joinPath(nativeEnvService.userHome, '.claude', 'projects', slug);
        service = instaService.createInstance(claudeCodeSessionService_1.ClaudeCodeSessionService);
    });
    (0, vitest_1.it)('loads 2 sessions from 3 real fixture files', async () => {
        // Setup mock with all 3 real fixture files
        const fileName1 = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
        const fileName2 = 'b02ed4d8-1f00-45cc-949f-3ea63b2dbde2.jsonl';
        const fileName3 = 'c8bcb3a7-8728-4d76-9aae-1cbaf2350114.jsonl';
        const fixturePath1 = path.resolve(__dirname, 'fixtures', fileName1);
        const fixturePath2 = path.resolve(__dirname, 'fixtures', fileName2);
        const fixturePath3 = path.resolve(__dirname, 'fixtures', fileName3);
        const fileContents1 = await (0, promises_1.readFile)(fixturePath1, 'utf8');
        const fileContents2 = await (0, promises_1.readFile)(fixturePath2, 'utf8');
        const fileContents3 = await (0, promises_1.readFile)(fixturePath3, 'utf8');
        mockFs.mockDirectory(dirUri, [
            [fileName1, fileTypes_1.FileType.File],
            [fileName2, fileTypes_1.FileType.File],
            [fileName3, fileTypes_1.FileType.File]
        ]);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName1), fileContents1, 1000);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName2), fileContents2, 2000);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName3), fileContents3, 3000);
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(sessions).toHaveLength(2);
        (0, vitest_1.expect)(sessions.map(s => ({
            id: s.id,
            messages: s.messages.map(m => {
                if (m.type === 'user' || m.type === 'assistant') {
                    if (typeof m.message.content === 'string') {
                        return m.message.content;
                    }
                    else {
                        return m.message.content.map(c => c.type === 'text' ? c.text : `<${c.type}>`).join('');
                    }
                }
            }),
            label: s.label,
            timestamp: s.timestamp.toISOString()
        }))).toMatchInlineSnapshot(`
			[
			  {
			    "id": "553dd2b5-8a53-4fbf-9db2-240632522fe5",
			    "label": "hello session 2",
			    "messages": [
			      "hello session 2",
			      "Hello! I'm ready to help you with your coding tasks in the vscode-copilot-chat project.",
			    ],
			    "timestamp": "2025-08-29T21:42:37.329Z",
			  },
			  {
			    "id": "b02ed4d8-1f00-45cc-949f-3ea63b2dbde2",
			    "label": "VS Code Copilot Chat: Initial Project Setup",
			    "messages": [
			      "hello session 1",
			      "Hello! How can I help you with your VS Code Copilot Chat project today?",
			      "hello session 1 continued",
			      "Hi! I'm ready to continue helping with your VS Code Copilot Chat project. What would you like to work on?",
			      "hello session 1 resumed",
			      "Hello! I see you have the \`claudeCodeSessionLoader.ts\` file open. How can I help you with your VS Code Copilot Chat project?",
			    ],
			    "timestamp": "2025-08-29T21:42:28.431Z",
			  },
			]
		`);
    });
    (0, vitest_1.it)('filters meta user messages and normalizes command content', async () => {
        const fileName = '30530d66-37fb-4f3b-aa5f-d92b6a8afae2.jsonl';
        const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
        const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
        mockFs.mockDirectory(dirUri, [[fileName, fileTypes_1.FileType.File]]);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents, 1000);
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(sessions).toHaveLength(1);
        const session = sessions[0];
        const metaUuid = 'e7f4ab9f-8e19-4262-a430-18d3e48b0c6c';
        (0, vitest_1.expect)(session.messages.some(message => message.uuid === metaUuid)).toBe(false);
        const commandUuid = 'a867fb32-ba62-4d51-917c-0fe40fa36067';
        const commandMessage = session.messages.find((message) => message.uuid === commandUuid && message.type === 'user');
        (0, vitest_1.expect)(commandMessage).toBeDefined();
        if (!commandMessage) {
            return;
        }
        const commandContent = commandMessage.message.content;
        (0, vitest_1.expect)(typeof commandContent === 'string' ? commandContent : null).toBe('/init is analyzing your codebase…');
        const assistantUuid = '6ed016f4-0df4-4a9f-8c3b-82303b68d29e';
        const assistantMessage = session.messages.find(message => message.uuid === assistantUuid);
        (0, vitest_1.expect)(assistantMessage?.parentUuid).toBe(commandUuid);
    });
    (0, vitest_1.it)('handles empty directory correctly', async () => {
        mockFs.mockDirectory(dirUri, []);
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(sessions).toHaveLength(0);
    });
    (0, vitest_1.it)('filters out non-jsonl files', async () => {
        const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
        const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
        const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
        mockFs.mockDirectory(dirUri, [
            [fileName, fileTypes_1.FileType.File],
            ['invalid.txt', fileTypes_1.FileType.File],
            ['another-dir', fileTypes_1.FileType.Directory]
        ]);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents);
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(sessions).toHaveLength(1);
        (0, vitest_1.expect)(sessions[0].id).toBe('553dd2b5-8a53-4fbf-9db2-240632522fe5');
    });
    (0, vitest_1.it)('skips files that fail to read', async () => {
        const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
        const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
        const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
        mockFs.mockDirectory(dirUri, [
            [fileName, fileTypes_1.FileType.File],
            ['broken.jsonl', fileTypes_1.FileType.File]
        ]);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents);
        mockFs.mockError(uri_1.URI.joinPath(dirUri, 'broken.jsonl'), new Error('File read error'));
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        // Should only return the working session
        (0, vitest_1.expect)(sessions).toHaveLength(1);
        (0, vitest_1.expect)(sessions[0].id).toBe('553dd2b5-8a53-4fbf-9db2-240632522fe5');
    });
    (0, vitest_1.it)('handles malformed jsonl content gracefully', async () => {
        mockFs.mockDirectory(dirUri, [['malformed.jsonl', fileTypes_1.FileType.File]]);
        // Mix of valid and invalid JSON lines, but no valid SDK messages with UUIDs
        const malformedContent = [
            '{"type": "summary", "summary": "Test"}', // Valid JSON but not an SDK message
            '{invalid json}', // Invalid JSON
            '{"type": "user", "message": {"role": "user", "content": "test"}}' // Valid JSON but missing uuid
        ].join('\n');
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, 'malformed.jsonl'), malformedContent);
        // Should not throw an error, even with malformed content
        const sessions = await service.getAllSessions(cancellation_1.CancellationToken.None);
        // Should handle partial parsing gracefully - no sessions because no valid SDK messages with UUIDs
        (0, vitest_1.expect)(sessions).toHaveLength(0);
    });
    (0, vitest_1.it)('handles cancellation correctly', async () => {
        const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
        const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
        const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
        mockFs.mockDirectory(dirUri, [[fileName, fileTypes_1.FileType.File]]);
        mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents);
        const tokenSource = new cancellation_1.CancellationTokenSource();
        tokenSource.cancel(); // Cancel the token
        const sessions = await service.getAllSessions(tokenSource.token);
        (0, vitest_1.expect)(sessions).toHaveLength(0);
    });
    (0, vitest_1.describe)('caching', () => {
        (0, vitest_1.it)('caches sessions and uses cache when files are unchanged', async () => {
            // Setup mock with real fixture file
            const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
            const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
            const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
            mockFs.mockDirectory(dirUri, [[fileName, fileTypes_1.FileType.File]]);
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents, 1000);
            // First call - should read from disk
            mockFs.resetStatCallCount();
            const sessions1 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            const firstCallStatCount = mockFs.getStatCallCount();
            (0, vitest_1.expect)(sessions1).toHaveLength(1);
            (0, vitest_1.expect)(sessions1[0].id).toBe('553dd2b5-8a53-4fbf-9db2-240632522fe5');
            (0, vitest_1.expect)(sessions1[0].label).toBe('hello session 2');
            (0, vitest_1.expect)(firstCallStatCount).toBeGreaterThan(0);
            // Second call - should use cache (no file changes)
            mockFs.resetStatCallCount();
            const sessions2 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            const secondCallStatCount = mockFs.getStatCallCount();
            (0, vitest_1.expect)(sessions2).toHaveLength(1);
            (0, vitest_1.expect)(sessions2[0].id).toBe(sessions1[0].id);
            (0, vitest_1.expect)(sessions2[0].label).toBe(sessions1[0].label);
            // Should have made some stat calls to check mtimes for cache validation
            (0, vitest_1.expect)(secondCallStatCount).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('invalidates cache when file is modified', async () => {
            const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
            const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
            const originalContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
            mockFs.mockDirectory(dirUri, [[fileName, fileTypes_1.FileType.File]]);
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), originalContents, 1000);
            // First call
            const sessions1 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions1).toHaveLength(1);
            (0, vitest_1.expect)(sessions1[0].label).toBe('hello session 2');
            // Modify file by changing the user message content (simulate file modification)
            const modifiedContents = originalContents.replace('hello session 2', 'modified session message');
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), modifiedContents, 2000); // Higher mtime
            // Second call - should detect change and reload
            const sessions2 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions2).toHaveLength(1);
            (0, vitest_1.expect)(sessions2[0].label).toBe('modified session message');
            (0, vitest_1.expect)(sessions2[0].id).toBe('553dd2b5-8a53-4fbf-9db2-240632522fe5'); // Same session ID
        });
        (0, vitest_1.it)('invalidates cache when file is deleted', async () => {
            const fileName = '553dd2b5-8a53-4fbf-9db2-240632522fe5.jsonl';
            const fixturePath = path.resolve(__dirname, 'fixtures', fileName);
            const fileContents = await (0, promises_1.readFile)(fixturePath, 'utf8');
            mockFs.mockDirectory(dirUri, [[fileName, fileTypes_1.FileType.File]]);
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName), fileContents, 1000);
            // First call
            const sessions1 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions1).toHaveLength(1);
            // Simulate file deletion by updating directory to be empty
            mockFs.mockDirectory(dirUri, []); // Empty directory - file is gone
            // Second call - should detect deletion and return empty array
            const sessions2 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions2).toHaveLength(0);
        });
        (0, vitest_1.it)('invalidates cache when new file is added', async () => {
            const fileName1 = 'session1.jsonl';
            const fileContents1 = JSON.stringify({
                parentUuid: null,
                sessionId: 'session1',
                type: 'user',
                message: { role: 'user', content: 'first session' },
                uuid: 'uuid1',
                timestamp: new Date().toISOString()
            });
            mockFs.mockDirectory(dirUri, [[fileName1, fileTypes_1.FileType.File]]);
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName1), fileContents1, 1000);
            // First call - one session
            const sessions1 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions1).toHaveLength(1);
            // Add a new file
            const fileName2 = 'session2.jsonl';
            const fileContents2 = JSON.stringify({
                parentUuid: null,
                sessionId: 'session2',
                type: 'user',
                message: { role: 'user', content: 'second session' },
                uuid: 'uuid2',
                timestamp: new Date().toISOString()
            });
            mockFs.mockDirectory(dirUri, [
                [fileName1, fileTypes_1.FileType.File],
                [fileName2, fileTypes_1.FileType.File]
            ]);
            mockFs.mockFile(uri_1.URI.joinPath(dirUri, fileName2), fileContents2, 2000);
            // Second call - should detect new file and return both sessions
            const sessions2 = await service.getAllSessions(cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(sessions2).toHaveLength(2);
            const sessionIds = sessions2.map(s => s.id).sort();
            (0, vitest_1.expect)(sessionIds).toEqual(['session1', 'session2']);
        });
    });
});
//# sourceMappingURL=claudeCodeSessionService.spec.js.map