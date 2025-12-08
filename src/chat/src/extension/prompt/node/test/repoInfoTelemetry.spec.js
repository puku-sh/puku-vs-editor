"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const copilotToken_1 = require("../../../../platform/authentication/common/copilotToken");
const copilotTokenStore_1 = require("../../../../platform/authentication/common/copilotTokenStore");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const gitDiffService_1 = require("../../../../platform/git/common/gitDiffService");
const gitExtensionService_1 = require("../../../../platform/git/common/gitExtensionService");
const gitService_1 = require("../../../../platform/git/common/gitService");
const nullGitDiffService_1 = require("../../../../platform/git/common/nullGitDiffService");
const nullGitExtensionService_1 = require("../../../../platform/git/common/nullGitExtensionService");
const logService_1 = require("../../../../platform/log/common/logService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const services_1 = require("../../../../platform/test/node/services");
const nullWorkspaceFileIndex_1 = require("../../../../platform/workspaceChunkSearch/node/nullWorkspaceFileIndex");
const workspaceFileIndex_1 = require("../../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
const event_1 = require("../../../../util/vs/base/common/event");
const observableValue_1 = require("../../../../util/vs/base/common/observableInternal/observables/observableValue");
const uri_1 = require("../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const repoInfoTelemetry_1 = require("../repoInfoTelemetry");
// Import Status enum - use const enum values directly since vitest doesn't handle .d.ts well
const Status = {
    INDEX_MODIFIED: 0,
    INDEX_ADDED: 1,
    INDEX_DELETED: 2,
    INDEX_RENAMED: 3,
    INDEX_COPIED: 4,
    MODIFIED: 5,
    DELETED: 6,
    UNTRACKED: 7,
    IGNORED: 8,
    INTENT_TO_ADD: 9,
    INTENT_TO_RENAME: 10,
    TYPE_CHANGED: 11,
    ADDED_BY_US: 12,
    ADDED_BY_THEM: 13,
    DELETED_BY_US: 14,
    DELETED_BY_THEM: 15,
    BOTH_ADDED: 16,
    BOTH_DELETED: 17,
    BOTH_MODIFIED: 18
};
(0, vitest_1.suite)('RepoInfoTelemetry', () => {
    let accessor;
    let telemetryService;
    let gitService;
    let gitDiffService;
    let gitExtensionService;
    let copilotTokenStore;
    let logService;
    let fileSystemService;
    let workspaceFileIndex;
    let mockWatcher;
    (0, vitest_1.beforeEach)(() => {
        const services = (0, services_1.createPlatformServices)();
        // Register extension-level services not in platform services by default
        services.define(gitDiffService_1.IGitDiffService, new descriptors_1.SyncDescriptor(nullGitDiffService_1.NullGitDiffService));
        services.define(gitExtensionService_1.IGitExtensionService, new nullGitExtensionService_1.NullGitExtensionService());
        services.define(workspaceFileIndex_1.IWorkspaceFileIndex, new descriptors_1.SyncDescriptor(nullWorkspaceFileIndex_1.NullWorkspaceFileIndex));
        // Override IGitService with a proper mock that has an observable activeRepository
        const mockGitService = {
            _serviceBrand: undefined,
            activeRepository: (0, observableValue_1.observableValue)('test-git-activeRepo', undefined),
            onDidOpenRepository: event_1.Event.None,
            onDidCloseRepository: event_1.Event.None,
            onDidFinishInitialization: event_1.Event.None,
            repositories: [],
            isInitialized: true,
            getRepository: vitest_1.vi.fn(),
            getRepositoryFetchUrls: vitest_1.vi.fn(),
            initialize: vitest_1.vi.fn(),
            log: vitest_1.vi.fn(),
            diffBetween: vitest_1.vi.fn(),
            diffWith: vitest_1.vi.fn(),
            diffIndexWithHEADShortStats: vitest_1.vi.fn(),
            fetch: vitest_1.vi.fn(),
            getMergeBase: vitest_1.vi.fn(),
            add: vitest_1.vi.fn(),
            dispose: vitest_1.vi.fn()
        };
        services.define(gitService_1.IGitService, mockGitService);
        accessor = services.createTestingAccessor();
        telemetryService = accessor.get(telemetry_1.ITelemetryService);
        gitService = accessor.get(gitService_1.IGitService);
        gitDiffService = accessor.get(gitDiffService_1.IGitDiffService);
        gitExtensionService = accessor.get(gitExtensionService_1.IGitExtensionService);
        copilotTokenStore = accessor.get(copilotTokenStore_1.ICopilotTokenStore);
        logService = accessor.get(logService_1.ILogService);
        fileSystemService = accessor.get(fileSystemService_1.IFileSystemService);
        workspaceFileIndex = accessor.get(workspaceFileIndex_1.IWorkspaceFileIndex);
        // Create a new mock watcher for each test
        mockWatcher = new MockFileSystemWatcher();
        // Mock the file system service to return our mock watcher
        vitest_1.vi.spyOn(fileSystemService, 'createFileSystemWatcher').mockReturnValue(mockWatcher);
        // Properly mock the sendInternalMSFTTelemetryEvent method
        telemetryService.sendInternalMSFTTelemetryEvent = vitest_1.vi.fn();
    });
    // ========================================
    // Basic Telemetry Flow Tests
    // ========================================
    (0, vitest_1.test)('should only send telemetry for internal users', async () => {
        // Setup: non-internal user
        const nonInternalToken = new copilotToken_1.CopilotToken({
            token: 'test-token',
            sku: 'testSku',
            expires_at: 9999999999,
            refresh_in: 180000,
            chat_enabled: true,
            organization_list: [],
            isVscodeTeamMember: false,
            username: 'testUser',
            copilot_plan: 'unknown',
        });
        copilotTokenStore.copilotToken = nonInternalToken;
        // Setup: mock git service to have a repository
        mockGitServiceWithRepository();
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: no telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    (0, vitest_1.test)('should send telemetry for internal users', async () => {
        // Setup: internal user
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: begin telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[0], 'request.repoInfo');
        assert_1.default.strictEqual(call[1].location, 'begin');
        assert_1.default.strictEqual(call[1].telemetryMessageId, 'test-message-id');
        // Check measurements parameter exists
        assert_1.default.ok(call[2], 'measurements parameter should be present');
        assert_1.default.strictEqual(typeof call[2].workspaceFileCount, 'number');
    });
    (0, vitest_1.test)('should send begin telemetry only once', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: only one begin telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
    });
    (0, vitest_1.test)('should send end telemetry after begin', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: both begin and end telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 2);
        const beginCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        const endCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[1];
        assert_1.default.strictEqual(beginCall[1].location, 'begin');
        assert_1.default.strictEqual(endCall[1].location, 'end');
        assert_1.default.strictEqual(beginCall[1].telemetryMessageId, endCall[1].telemetryMessageId);
    });
    (0, vitest_1.test)('should send end telemetry when begin has success result', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: both begin and end telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 2);
        const beginCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        const endCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[1];
        assert_1.default.strictEqual(beginCall[1].location, 'begin');
        assert_1.default.strictEqual(beginCall[1].result, 'success');
        assert_1.default.strictEqual(endCall[1].location, 'end');
        assert_1.default.strictEqual(endCall[1].result, 'success');
    });
    (0, vitest_1.test)('should send end telemetry when begin has noChanges result', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock: no changes from upstream
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: both begin and end telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 2);
        const beginCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        const endCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[1];
        assert_1.default.strictEqual(beginCall[1].location, 'begin');
        assert_1.default.strictEqual(beginCall[1].result, 'noChanges');
        assert_1.default.strictEqual(endCall[1].location, 'end');
        assert_1.default.strictEqual(endCall[1].result, 'noChanges');
    });
    (0, vitest_1.test)('should skip end telemetry when begin has failure result', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock: too many changes (failure result)
        const manyChanges = Array.from({ length: 101 }, (_, i) => ({
            uri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            originalUri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            renameUri: undefined,
            status: Status.MODIFIED
        }));
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue(manyChanges);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: only begin telemetry sent, end was skipped
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const beginCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(beginCall[1].location, 'begin');
        assert_1.default.strictEqual(beginCall[1].result, 'tooManyChanges');
    });
    // ========================================
    // Git Repository Detection Tests
    // ========================================
    (0, vitest_1.test)('should not send telemetry when no active repository', async () => {
        setupInternalUser();
        // Mock: no active repository
        vitest_1.vi.spyOn(gitService.activeRepository, 'get').mockReturnValue(undefined);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: no telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    (0, vitest_1.test)('should send telemetry with noChanges result when no changes from upstream', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock: no changes from upstream
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: telemetry sent with noChanges result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'noChanges');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://github.com/microsoft/vscode.git');
        assert_1.default.strictEqual(call[1].headCommitHash, 'abc123');
    });
    (0, vitest_1.test)('should not send telemetry when no GitHub or ADO remote', async () => {
        setupInternalUser();
        // Mock: repository with changes but no GitHub or ADO remote
        vitest_1.vi.spyOn(gitService.activeRepository, 'get').mockReturnValue({
            rootUri: uri_1.URI.file('/test/repo'),
            changes: {
                mergeChanges: [],
                indexChanges: [],
                workingTree: [],
                untrackedChanges: []
            },
            remotes: [],
            remoteFetchUrls: [],
            upstreamRemote: undefined,
        });
        mockGitExtensionWithUpstream('abc123', 'https://gitlab.com/user/repo.git');
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: no telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    (0, vitest_1.test)('should send telemetry with correct repoType for Azure DevOps repository', async () => {
        setupInternalUser();
        // Mock: ADO repository
        vitest_1.vi.spyOn(gitService.activeRepository, 'get').mockReturnValue({
            rootUri: uri_1.URI.file('/test/repo'),
            changes: {
                mergeChanges: [],
                indexChanges: [],
                workingTree: [{
                        uri: uri_1.URI.file('/test/repo/file.ts'),
                        originalUri: uri_1.URI.file('/test/repo/file.ts'),
                        renameUri: undefined,
                        status: Status.MODIFIED
                    }],
                untrackedChanges: []
            },
            remotes: ['origin'],
            remoteFetchUrls: ['https://dev.azure.com/myorg/myproject/_git/myrepo'],
            upstreamRemote: 'origin',
            headBranchName: 'main',
            headCommitHash: 'abc123',
            upstreamBranchName: 'origin/main',
            isRebasing: false,
        });
        mockGitExtensionWithUpstream('abc123def456', 'https://dev.azure.com/myorg/myproject/_git/myrepo');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: telemetry sent with repoType = 'ado'
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[0], 'request.repoInfo');
        assert_1.default.strictEqual(call[1].repoType, 'ado');
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://dev.azure.com/myorg/myproject/_git/myrepo');
        assert_1.default.strictEqual(call[1].headCommitHash, 'abc123def456');
        assert_1.default.strictEqual(call[1].result, 'success');
    });
    (0, vitest_1.test)('should normalize remote URL when logging telemetry', async () => {
        setupInternalUser();
        // Mock: repository with SSH-style URL that needs normalization
        const sshUrl = 'git@github.com:microsoft/vscode.git';
        vitest_1.vi.spyOn(gitService.activeRepository, 'get').mockReturnValue({
            rootUri: uri_1.URI.file('/test/repo'),
            changes: {
                mergeChanges: [],
                indexChanges: [],
                workingTree: [{
                        uri: uri_1.URI.file('/test/repo/file.ts'),
                        originalUri: uri_1.URI.file('/test/repo/file.ts'),
                        renameUri: undefined,
                        status: Status.MODIFIED
                    }],
                untrackedChanges: []
            },
            remotes: ['origin'],
            remoteFetchUrls: [sshUrl],
            upstreamRemote: 'origin',
            headBranchName: 'main',
            headCommitHash: 'abc123',
            upstreamBranchName: 'origin/main',
            isRebasing: false,
        });
        mockGitExtensionWithUpstream('abc123def456', sshUrl);
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: URL is normalized to HTTPS
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://github.com/microsoft/vscode.git');
        assert_1.default.notStrictEqual(call[1].remoteUrl, sshUrl);
    });
    (0, vitest_1.test)('should not send telemetry when no upstream commit', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        // Mock: no upstream commit
        mockGitExtensionWithUpstream(undefined);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: no telemetry sent
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    (0, vitest_1.test)('should send telemetry with valid GitHub repository', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123def456');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: telemetry sent with correct properties
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[0], 'request.repoInfo');
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://github.com/microsoft/vscode.git');
        assert_1.default.strictEqual(call[1].headCommitHash, 'abc123def456');
        assert_1.default.strictEqual(call[1].result, 'success');
    });
    // ========================================
    // File System Watching Tests
    // ========================================
    (0, vitest_1.test)('should detect file creation during diff', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock git diff to trigger file change during execution
        vitest_1.vi.spyOn(gitService, 'diffWith').mockImplementation(async () => {
            // Simulate file creation during diff
            mockWatcher.triggerCreate(uri_1.URI.file('/test/repo/newfile.ts'));
            // Mock a change being returned from diffWith, we don't want to see this in the final telemetry
            // instead we want to see the 'filesChanged' result due to the file system change
            return [{
                    uri: uri_1.URI.file('/test/repo/file.ts'),
                    originalUri: uri_1.URI.file('/test/repo/file.ts'),
                    renameUri: undefined,
                    status: Status.MODIFIED
                }];
        });
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: filesChanged result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'filesChanged');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
    });
    (0, vitest_1.test)('should detect file modification during diff', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock git diff to trigger file change during execution
        vitest_1.vi.spyOn(gitService, 'diffWith').mockImplementation(async () => {
            // Simulate file modification during diff
            mockWatcher.triggerChange(uri_1.URI.file('/test/repo/file.ts'));
            // Mock a change being returned from diffWith, we don't want to see this in the final telemetry
            // instead we want to see the 'filesChanged' result due to the file system change
            return [{
                    uri: uri_1.URI.file('/test/repo/file.ts'),
                    originalUri: uri_1.URI.file('/test/repo/file.ts'),
                    renameUri: undefined,
                    status: Status.MODIFIED
                }];
        });
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: filesChanged result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'filesChanged');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
    });
    (0, vitest_1.test)('should detect file deletion during diff', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock git diff to trigger file change during execution
        vitest_1.vi.spyOn(gitService, 'diffWith').mockImplementation(async () => {
            // Simulate file deletion during diff
            mockWatcher.triggerDelete(uri_1.URI.file('/test/repo/oldfile.ts'));
            // Mock a change being returned from diffWith, we don't want to see this in the final telemetry
            // instead we want to see the 'filesChanged' result due to the file system change
            return [{
                    uri: uri_1.URI.file('/test/repo/file.ts'),
                    originalUri: uri_1.URI.file('/test/repo/file.ts'),
                    renameUri: undefined,
                    status: Status.MODIFIED
                }];
        });
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: filesChanged result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'filesChanged');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
    });
    (0, vitest_1.test)('should detect file change during diff processing', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Mock git diff service to trigger file change during processing
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockImplementation(async () => {
            // Simulate file change during diff processing
            mockWatcher.triggerChange(uri_1.URI.file('/test/repo/file.ts'));
            return [{
                    uri: uri_1.URI.file('/test/repo/file.ts'),
                    originalUri: uri_1.URI.file('/test/repo/file.ts'),
                    renameUri: undefined,
                    status: Status.MODIFIED,
                    diff: 'some diff content'
                }];
        });
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: filesChanged result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'filesChanged');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
    });
    (0, vitest_1.test)('should properly dispose file watcher', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: watcher was disposed
        assert_1.default.strictEqual(mockWatcher.isDisposed, true);
    });
    // ========================================
    // Diff Too Big Tests
    // ========================================
    (0, vitest_1.test)('should detect when there are too many changes', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Create 101 changes (exceeds MAX_CHANGES of 100)
        const manyChanges = Array.from({ length: 101 }, (_, i) => ({
            uri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            originalUri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            renameUri: undefined,
            status: Status.MODIFIED
        }));
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue(manyChanges);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: tooManyChanges result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'tooManyChanges');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://github.com/microsoft/vscode.git');
        assert_1.default.strictEqual(call[1].headCommitHash, 'abc123');
    });
    (0, vitest_1.test)('should detect when diff is too large', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Create a diff that exceeds 900KB when serialized to JSON
        const largeDiff = 'x'.repeat(901 * 1024);
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED,
                diff: largeDiff
            }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: diffTooLarge result
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'diffTooLarge');
        assert_1.default.strictEqual(call[1].diffsJSON, undefined);
        assert_1.default.strictEqual(call[1].remoteUrl, 'https://github.com/microsoft/vscode.git');
        assert_1.default.strictEqual(call[1].headCommitHash, 'abc123');
    });
    (0, vitest_1.test)('should send diff when within size limits', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Create a diff that is within limits
        const normalDiff = 'some normal diff content';
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED,
                diff: normalDiff
            }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: success with diff
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'success');
        assert_1.default.ok(call[1].diffsJSON);
        const diffs = JSON.parse(call[1].diffsJSON);
        assert_1.default.strictEqual(diffs.length, 1);
        assert_1.default.strictEqual(diffs[0].diff, normalDiff);
    });
    (0, vitest_1.test)('should handle multiple files in diff', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([
            {
                uri: uri_1.URI.file('/test/repo/file1.ts'),
                originalUri: uri_1.URI.file('/test/repo/file1.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            },
            {
                uri: uri_1.URI.file('/test/repo/file2.ts'),
                originalUri: uri_1.URI.file('/test/repo/file2.ts'),
                renameUri: undefined,
                status: Status.INDEX_ADDED
            },
            {
                uri: uri_1.URI.file('/test/repo/file3.ts'),
                originalUri: uri_1.URI.file('/test/repo/file3.ts'),
                renameUri: undefined,
                status: Status.DELETED
            }
        ]);
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([
            {
                uri: uri_1.URI.file('/test/repo/file1.ts'),
                originalUri: uri_1.URI.file('/test/repo/file1.ts'),
                renameUri: undefined,
                status: Status.MODIFIED,
                diff: 'diff for file1'
            },
            {
                uri: uri_1.URI.file('/test/repo/file2.ts'),
                originalUri: uri_1.URI.file('/test/repo/file2.ts'),
                renameUri: undefined,
                status: Status.INDEX_ADDED,
                diff: 'diff for file2'
            },
            {
                uri: uri_1.URI.file('/test/repo/file3.ts'),
                originalUri: uri_1.URI.file('/test/repo/file3.ts'),
                renameUri: undefined,
                status: Status.DELETED,
                diff: 'diff for file3'
            }
        ]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: success with all diffs
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'success');
        const diffs = JSON.parse(call[1].diffsJSON);
        assert_1.default.strictEqual(diffs.length, 3);
        assert_1.default.strictEqual(diffs[0].status, 'MODIFIED');
        assert_1.default.strictEqual(diffs[1].status, 'INDEX_ADDED');
        assert_1.default.strictEqual(diffs[2].status, 'DELETED');
    });
    (0, vitest_1.test)('should handle renamed files in diff', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/newname.ts'),
                originalUri: uri_1.URI.file('/test/repo/oldname.ts'),
                renameUri: uri_1.URI.file('/test/repo/newname.ts'),
                status: Status.INDEX_RENAMED
            }]);
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/newname.ts'),
                originalUri: uri_1.URI.file('/test/repo/oldname.ts'),
                renameUri: uri_1.URI.file('/test/repo/newname.ts'),
                status: Status.INDEX_RENAMED,
                diff: 'diff content'
            }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: success with rename info
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'success');
        const diffs = JSON.parse(call[1].diffsJSON);
        assert_1.default.strictEqual(diffs.length, 1);
        assert_1.default.strictEqual(diffs[0].status, 'INDEX_RENAMED');
        assert_1.default.ok(diffs[0].renameUri);
    });
    (0, vitest_1.test)('should include untracked files from both workingTreeChanges and untrackedChanges', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        // Mock git extension with untracked files in both workingTreeChanges and untrackedChanges
        const mockRepo = {
            getMergeBase: vitest_1.vi.fn(),
            getBranchBase: vitest_1.vi.fn(),
            state: {
                HEAD: {
                    upstream: {
                        commit: 'abc123',
                        remote: 'origin',
                    },
                },
                remotes: [{
                        name: 'origin',
                        fetchUrl: 'https://github.com/microsoft/vscode.git',
                        pushUrl: 'https://github.com/microsoft/vscode.git',
                        isReadOnly: false,
                    }],
                workingTreeChanges: [{
                        uri: uri_1.URI.file('/test/repo/filea.txt'),
                        originalUri: uri_1.URI.file('/test/repo/filea.txt'),
                        renameUri: undefined,
                        status: Status.UNTRACKED
                    }],
                untrackedChanges: [{
                        uri: uri_1.URI.file('/test/repo/fileb.txt'),
                        originalUri: uri_1.URI.file('/test/repo/fileb.txt'),
                        renameUri: undefined,
                        status: Status.UNTRACKED
                    }],
            },
        };
        mockRepo.getMergeBase.mockImplementation(async (ref1, ref2) => {
            if (ref1 === 'HEAD' && ref2 === '@{upstream}') {
                return 'abc123';
            }
            return undefined;
        });
        mockRepo.getBranchBase.mockResolvedValue(undefined);
        const mockApi = {
            getRepository: () => mockRepo,
        };
        vitest_1.vi.spyOn(gitExtensionService, 'getExtensionApi').mockReturnValue(mockApi);
        // Mock diffWith to return one modified file
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/modified.ts'),
                originalUri: uri_1.URI.file('/test/repo/modified.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Mock diff service to return all three files
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([
            {
                uri: uri_1.URI.file('/test/repo/modified.ts'),
                originalUri: uri_1.URI.file('/test/repo/modified.ts'),
                renameUri: undefined,
                status: Status.MODIFIED,
                diff: 'modified content'
            },
            {
                uri: uri_1.URI.file('/test/repo/filea.txt'),
                originalUri: uri_1.URI.file('/test/repo/filea.txt'),
                renameUri: undefined,
                status: Status.UNTRACKED,
                diff: 'new file a'
            },
            {
                uri: uri_1.URI.file('/test/repo/fileb.txt'),
                originalUri: uri_1.URI.file('/test/repo/fileb.txt'),
                renameUri: undefined,
                status: Status.UNTRACKED,
                diff: 'new file b'
            }
        ]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: success with all three files in telemetry
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'success');
        const diffs = JSON.parse(call[1].diffsJSON);
        assert_1.default.strictEqual(diffs.length, 3, 'Should include 1 modified file + 2 untracked files');
        // Verify all three files are present
        const uris = diffs.map((d) => d.uri);
        assert_1.default.ok(uris.includes('file:///test/repo/modified.ts'), 'Should include modified file');
        assert_1.default.ok(uris.includes('file:///test/repo/filea.txt'), 'Should include filea.txt from workingTreeChanges');
        assert_1.default.ok(uris.includes('file:///test/repo/fileb.txt'), 'Should include fileb.txt from untrackedChanges');
        // Verify statuses
        const fileaEntry = diffs.find((d) => d.uri === 'file:///test/repo/filea.txt');
        const filebEntry = diffs.find((d) => d.uri === 'file:///test/repo/fileb.txt');
        assert_1.default.strictEqual(fileaEntry.status, 'UNTRACKED');
        assert_1.default.strictEqual(filebEntry.status, 'UNTRACKED');
    });
    // ========================================
    // Measurements Tests
    // ========================================
    (0, vitest_1.test)('should include workspaceFileCount in measurements', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        // Set a specific file count
        workspaceFileIndex.fileCount = 250;
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: measurements contain workspaceFileCount
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.ok(call[2], 'measurements parameter should exist');
        assert_1.default.strictEqual(call[2].workspaceFileCount, 250);
    });
    (0, vitest_1.test)('should include changedFileCount in measurements', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock 5 changes
        const changes = Array.from({ length: 5 }, (_, i) => ({
            uri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            originalUri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            renameUri: undefined,
            status: Status.MODIFIED
        }));
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue(changes);
        vitest_1.vi.spyOn(gitDiffService, 'getChangeDiffs').mockResolvedValue(changes.map((c, i) => ({
            uri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            originalUri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            renameUri: undefined,
            status: Status.MODIFIED,
            diff: `diff for file${i}`
        })));
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: measurements contain changedFileCount
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.ok(call[2], 'measurements parameter should exist');
        assert_1.default.strictEqual(call[2].changedFileCount, 5);
    });
    (0, vitest_1.test)('should set changedFileCount to 0 when no changes', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock: no changes from upstream
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: changedFileCount is 0
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.ok(call[2], 'measurements parameter should exist');
        assert_1.default.strictEqual(call[2].changedFileCount, 0);
    });
    (0, vitest_1.test)('should include measurements in both begin and end telemetry', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: 'some diff' }]);
        workspaceFileIndex.fileCount = 150;
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        await repoTelemetry.sendEndTelemetry();
        // Assert: both begin and end have measurements
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 2);
        const beginCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.ok(beginCall[2], 'begin measurements should exist');
        assert_1.default.strictEqual(beginCall[2].workspaceFileCount, 150);
        assert_1.default.strictEqual(beginCall[2].changedFileCount, 1);
        const endCall = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[1];
        assert_1.default.ok(endCall[2], 'end measurements should exist');
        assert_1.default.strictEqual(endCall[2].workspaceFileCount, 150);
        assert_1.default.strictEqual(endCall[2].changedFileCount, 1);
    });
    (0, vitest_1.test)('should include measurements even when diff is too large', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Create a diff that exceeds 900KB when serialized to JSON
        const largeDiff = 'x'.repeat(901 * 1024);
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED,
                diff: largeDiff
            }]);
        workspaceFileIndex.fileCount = 200;
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: diffTooLarge result but measurements still present
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'diffTooLarge');
        assert_1.default.ok(call[2], 'measurements should still be present');
        assert_1.default.strictEqual(call[2].workspaceFileCount, 200);
        assert_1.default.strictEqual(call[2].changedFileCount, 1);
    });
    (0, vitest_1.test)('should include measurements when there are too many changes', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Create 101 changes (exceeds MAX_CHANGES of 100)
        const manyChanges = Array.from({ length: 101 }, (_, i) => ({
            uri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            originalUri: uri_1.URI.file(`/test/repo/file${i}.ts`),
            renameUri: undefined,
            status: Status.MODIFIED
        }));
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue(manyChanges);
        workspaceFileIndex.fileCount = 300;
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: tooManyChanges result but measurements still present
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'tooManyChanges');
        assert_1.default.ok(call[2], 'measurements should still be present');
        assert_1.default.strictEqual(call[2].workspaceFileCount, 300);
        assert_1.default.strictEqual(call[2].changedFileCount, 101);
    });
    (0, vitest_1.test)('should include diffSizeBytes in measurements when diffs are present', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        const testDiff = 'diff --git a/file.ts b/file.ts\n--- a/file.ts\n+++ b/file.ts\n@@ -1,1 +1,1 @@\n-old\n+new';
        mockGitDiffService([{ uri: '/test/repo/file.ts', diff: testDiff }]);
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: diffSizeBytes measurement is set
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 1);
        const call = telemetryService.sendInternalMSFTTelemetryEvent.mock.calls[0];
        assert_1.default.strictEqual(call[1].result, 'success');
        assert_1.default.ok(call[2], 'measurements parameter should be present');
        assert_1.default.strictEqual(typeof call[2].diffSizeBytes, 'number');
        assert_1.default.ok(call[2].diffSizeBytes > 0, 'diffSizeBytes should be greater than 0');
        // Calculate expected size from the mock data
        const expectedDiffsJSON = JSON.stringify([{
                uri: 'file:///test/repo/file.ts',
                originalUri: 'file:///test/repo/file.ts',
                renameUri: undefined,
                status: 'MODIFIED',
                diff: testDiff
            }]);
        const expectedSize = Buffer.byteLength(expectedDiffsJSON, 'utf8');
        assert_1.default.strictEqual(call[2].diffSizeBytes, expectedSize);
    });
    // ========================================
    // Error Handling Tests
    // ========================================
    (0, vitest_1.test)('should handle errors during git diff gracefully', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        // Mock git diff to throw error
        vitest_1.vi.spyOn(gitService, 'diffWith').mockRejectedValue(new Error('Git error'));
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        // Should not throw
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: no telemetry sent due to error
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    (0, vitest_1.test)('should handle errors during diff processing gracefully', async () => {
        setupInternalUser();
        mockGitServiceWithRepository();
        mockGitExtensionWithUpstream('abc123');
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue([{
                uri: uri_1.URI.file('/test/repo/file.ts'),
                originalUri: uri_1.URI.file('/test/repo/file.ts'),
                renameUri: undefined,
                status: Status.MODIFIED
            }]);
        // Mock diff service to throw error
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockRejectedValue(new Error('Diff processing error'));
        const repoTelemetry = new repoInfoTelemetry_1.RepoInfoTelemetry('test-message-id', telemetryService, gitService, gitDiffService, gitExtensionService, copilotTokenStore, logService, fileSystemService, workspaceFileIndex);
        // Should not throw
        await repoTelemetry.sendBeginTelemetryIfNeeded();
        // Assert: no telemetry sent due to error
        assert_1.default.strictEqual(telemetryService.sendInternalMSFTTelemetryEvent.mock.calls.length, 0);
    });
    // ========================================
    // Helper Functions
    // ========================================
    function setupInternalUser() {
        const internalToken = new copilotToken_1.CopilotToken({
            token: 'tid=test;rt=1',
            sku: 'testSku',
            expires_at: 9999999999,
            refresh_in: 180000,
            chat_enabled: true,
            organization_list: ['4535c7beffc844b46bb1ed4aa04d759a'], // GitHub org for internal users
            isVscodeTeamMember: true,
            username: 'testUser',
            copilot_plan: 'unknown',
        });
        copilotTokenStore.copilotToken = internalToken;
    }
    function mockGitServiceWithRepository() {
        vitest_1.vi.spyOn(gitService.activeRepository, 'get').mockReturnValue({
            rootUri: uri_1.URI.file('/test/repo'),
            changes: {
                mergeChanges: [],
                indexChanges: [],
                workingTree: [{
                        uri: uri_1.URI.file('/test/repo/file.ts'),
                        originalUri: uri_1.URI.file('/test/repo/file.ts'),
                        renameUri: undefined,
                        status: Status.MODIFIED
                    }],
                untrackedChanges: []
            },
            remotes: ['origin'],
            remoteFetchUrls: ['https://github.com/microsoft/vscode.git'],
            upstreamRemote: 'origin',
            headBranchName: 'main',
            headCommitHash: 'abc123',
            upstreamBranchName: 'origin/main',
            isRebasing: false,
        });
    }
    function mockGitExtensionWithUpstream(upstreamCommit, remoteUrl = 'https://github.com/microsoft/vscode.git') {
        const mockRepo = {
            getMergeBase: vitest_1.vi.fn(),
            getBranchBase: vitest_1.vi.fn(),
            state: {
                HEAD: {
                    upstream: upstreamCommit ? {
                        commit: upstreamCommit,
                        remote: 'origin',
                    } : undefined,
                },
                remotes: [{
                        name: 'origin',
                        fetchUrl: remoteUrl,
                        pushUrl: remoteUrl,
                        isReadOnly: false,
                    }],
                workingTreeChanges: [],
                untrackedChanges: [],
            },
        };
        // Set up getMergeBase to return upstreamCommit when called with 'HEAD' and '@upstream'
        mockRepo.getMergeBase.mockImplementation(async (ref1, ref2) => {
            if (ref1 === 'HEAD' && ref2 === '@{upstream}') {
                return upstreamCommit;
            }
            return undefined;
        });
        // Set up getBranchBase to return undefined by default
        mockRepo.getBranchBase.mockResolvedValue(undefined);
        const mockApi = {
            getRepository: () => mockRepo,
        };
        vitest_1.vi.spyOn(gitExtensionService, 'getExtensionApi').mockReturnValue(mockApi);
    }
    function mockGitDiffService(diffs) {
        // Mock diffWith to return Change objects
        const changes = diffs.map(d => ({
            uri: uri_1.URI.file(d.uri || '/test/repo/file.ts'),
            originalUri: uri_1.URI.file(d.originalUri || d.uri || '/test/repo/file.ts'),
            renameUri: d.renameUri ? uri_1.URI.file(d.renameUri) : undefined,
            status: d.status || Status.MODIFIED
        }));
        vitest_1.vi.spyOn(gitService, 'diffWith').mockResolvedValue(diffs.length > 0 ? changes : []);
        // Mock getWorkingTreeDiffsFromRef to return Diff objects (Change + diff property)
        vitest_1.vi.spyOn(gitDiffService, 'getWorkingTreeDiffsFromRef').mockResolvedValue(diffs.map(d => ({
            uri: uri_1.URI.file(d.uri || '/test/repo/file.ts'),
            originalUri: uri_1.URI.file(d.originalUri || d.uri || '/test/repo/file.ts'),
            renameUri: d.renameUri ? uri_1.URI.file(d.renameUri) : undefined,
            status: d.status || Status.MODIFIED,
            diff: d.diff || 'test diff'
        })));
    }
});
// ========================================
// Mock File System Watcher
// ========================================
class MockFileSystemWatcher {
    constructor() {
        this._createHandlers = [];
        this._changeHandlers = [];
        this._deleteHandlers = [];
        this.isDisposed = false;
        this.ignoreCreateEvents = false;
        this.ignoreChangeEvents = false;
        this.ignoreDeleteEvents = false;
    }
    get onDidCreate() {
        return (listener) => {
            this._createHandlers.push(listener);
            return {
                dispose: () => {
                    const index = this._createHandlers.indexOf(listener);
                    if (index > -1) {
                        this._createHandlers.splice(index, 1);
                    }
                }
            };
        };
    }
    get onDidChange() {
        return (listener) => {
            this._changeHandlers.push(listener);
            return {
                dispose: () => {
                    const index = this._changeHandlers.indexOf(listener);
                    if (index > -1) {
                        this._changeHandlers.splice(index, 1);
                    }
                }
            };
        };
    }
    get onDidDelete() {
        return (listener) => {
            this._deleteHandlers.push(listener);
            return {
                dispose: () => {
                    const index = this._deleteHandlers.indexOf(listener);
                    if (index > -1) {
                        this._deleteHandlers.splice(index, 1);
                    }
                }
            };
        };
    }
    triggerCreate(uri) {
        this._createHandlers.forEach(h => h(uri));
    }
    triggerChange(uri) {
        this._changeHandlers.forEach(h => h(uri));
    }
    triggerDelete(uri) {
        this._deleteHandlers.forEach(h => h(uri));
    }
    dispose() {
        this.isDisposed = true;
        this._createHandlers = [];
        this._changeHandlers = [];
        this._deleteHandlers = [];
    }
}
//# sourceMappingURL=repoInfoTelemetry.spec.js.map