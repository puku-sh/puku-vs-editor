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
const vitest_1 = require("vitest");
const vscode = __importStar(require("vscode"));
const mockRunCommandExecutionService_1 = require("../../../../platform/commands/common/mockRunCommandExecutionService");
const nullEnvService_1 = require("../../../../platform/env/common/nullEnvService");
const mockFileSystemService_1 = require("../../../../platform/filesystem/node/test/mockFileSystemService");
const gitService_1 = require("../../../../platform/git/common/gitService");
const logService_1 = require("../../../../platform/log/common/logService");
const nullTelemetryService_1 = require("../../../../platform/telemetry/common/nullTelemetryService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const simpleMock_1 = require("../../../../util/common/test/simpleMock");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const copilotcliSession_1 = require("../../../agents/copilotcli/node/copilotcliSession");
const copilotcliSessionService_1 = require("../../../agents/copilotcli/node/copilotcliSessionService");
const copilotCliSessionService_spec_1 = require("../../../agents/copilotcli/node/test/copilotCliSessionService.spec");
const services_1 = require("../../../test/node/services");
const testHelpers_1 = require("../../../test/node/testHelpers");
const copilotCLIChatSessionsContribution_1 = require("../copilotCLIChatSessionsContribution");
// Mock terminal integration to avoid importing PowerShell asset (.ps1) which Vite cannot parse during tests
vitest_1.vi.mock('../copilotCLITerminalIntegration', () => {
    // Minimal stand-in for createServiceIdentifier
    const createServiceIdentifier = (name) => {
        const fn = () => { };
        fn.toString = () => name;
        return fn;
    };
    class CopilotCLITerminalIntegration {
        constructor() {
            this.openTerminal = vitest_1.vi.fn(async () => { });
        }
        dispose() { }
    }
    return {
        ICopilotCLITerminalIntegration: createServiceIdentifier('ICopilotCLITerminalIntegration'),
        CopilotCLITerminalIntegration
    };
});
class FakeWorktreeManager extends (0, simpleMock_1.mock)() {
    constructor() {
        super(...arguments);
        this.createWorktree = vitest_1.vi.fn(async () => undefined);
        this.storeWorktreePath = vitest_1.vi.fn(async () => { });
        this.getWorktreePath = vitest_1.vi.fn((_id) => undefined);
        this.getIsolationPreference = vitest_1.vi.fn(() => false);
    }
}
class FakeModels {
    constructor() {
        this.getDefaultModel = vitest_1.vi.fn(async () => ({ id: 'base', name: 'Base' }));
        this.getAvailableModels = vitest_1.vi.fn(async () => [{ id: 'base', name: 'Base' }]);
        this.setDefaultModel = vitest_1.vi.fn(async () => { });
        this.toModelProvider = vitest_1.vi.fn((id) => id); // passthrough
    }
}
class FakeGitService extends (0, simpleMock_1.mock)() {
    constructor() {
        super(...arguments);
        this.activeRepository = { get: () => undefined };
    }
}
// Cloud provider fake for delegate scenario
class FakeCloudProvider extends (0, simpleMock_1.mock)() {
    constructor() {
        super(...arguments);
        this.tryHandleUncommittedChanges = vitest_1.vi.fn(async () => false);
        this.createDelegatedChatSession = vitest_1.vi.fn(async () => ({ uri: 'pr://1', title: 'PR Title', description: 'Desc', author: 'Me', linkTag: 'tag' }));
    }
}
function createChatContext(sessionId, isUntitled) {
    return {
        chatSessionContext: {
            chatSessionItem: { resource: vscode.Uri.from({ scheme: 'copilotcli', path: `/${sessionId}` }), label: 'temp' },
            isUntitled
        },
        chatSummary: undefined
    };
}
class TestCopilotCLISession extends copilotcliSession_1.CopilotCLISession {
    constructor() {
        super(...arguments);
        this.requests = [];
    }
    handleRequest(prompt, attachments, modelId, token) {
        this.requests.push({ prompt, attachments, modelId, token });
        return Promise.resolve();
    }
}
(0, vitest_1.describe)('CopilotCLIChatSessionParticipant.handleRequest', () => {
    const disposables = new lifecycle_1.DisposableStore();
    let promptResolver;
    let itemProvider;
    let cloudProvider;
    let summarizer;
    let worktree;
    let git;
    let models;
    let sessionService;
    let telemetry;
    let tools;
    let participant;
    let commandExecutionService;
    let workspaceService;
    let instantiationService;
    let manager;
    let mcpHandler;
    const cliSessions = [];
    (0, vitest_1.beforeEach)(async () => {
        cliSessions.length = 0;
        const sdk = {
            getPackage: vitest_1.vi.fn(async () => ({ internal: { CLISessionManager: copilotCliSessionService_spec_1.MockCliSdkSessionManager } }))
        };
        const services = disposables.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        promptResolver = new class extends (0, simpleMock_1.mock)() {
            resolvePrompt(request) {
                return Promise.resolve({ prompt: request.prompt, attachments: [] });
            }
        }();
        itemProvider = new class extends (0, simpleMock_1.mock)() {
            constructor() {
                super(...arguments);
                this.swap = vitest_1.vi.fn();
            }
        }();
        cloudProvider = new FakeCloudProvider();
        summarizer = new class extends (0, simpleMock_1.mock)() {
            provideChatSummary(_context) { return Promise.resolve('summary text'); }
        }();
        worktree = new FakeWorktreeManager();
        git = new FakeGitService();
        models = new FakeModels();
        telemetry = new nullTelemetryService_1.NullTelemetryService();
        tools = new class FakeToolsService extends (0, simpleMock_1.mock)() {
        }();
        workspaceService = new workspaceService_1.NullWorkspaceService();
        commandExecutionService = new mockRunCommandExecutionService_1.MockRunCommandExecutionService();
        const authService = new class extends (0, simpleMock_1.mock)() {
        }();
        const logService = accessor.get(logService_1.ILogService);
        const gitService = accessor.get(gitService_1.IGitService);
        mcpHandler = new class extends (0, simpleMock_1.mock)() {
            async loadMcpConfig(_workingDirectory) {
                return undefined;
            }
        }();
        instantiationService = {
            invokeFunction(fn, ...args) {
                return fn(accessor, ...args);
            },
            createInstance: (_ctor, options, sdkSession) => {
                const session = new TestCopilotCLISession(options, sdkSession, gitService, logService, workspaceService, authService, instantiationService);
                cliSessions.push(session);
                return disposables.add(session);
            }
        };
        sessionService = disposables.add(new copilotcliSessionService_1.CopilotCLISessionService(logService, sdk, instantiationService, new nullEnvService_1.NullNativeEnvService(), new mockFileSystemService_1.MockFileSystemService(), mcpHandler));
        manager = await sessionService.getSessionManager();
        participant = new copilotCLIChatSessionsContribution_1.CopilotCLIChatSessionParticipant(promptResolver, itemProvider, cloudProvider, summarizer, worktree, git, models, sessionService, telemetry, tools, commandExecutionService, workspaceService, instantiationService);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
        disposables.clear();
    });
    (0, vitest_1.it)('creates new session for untitled context and invokes request', async () => {
        const request = new testHelpers_1.TestChatRequest('Say hi');
        const context = createChatContext('temp-new', true);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        (0, vitest_1.expect)(cliSessions.length).toBe(0);
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(cliSessions.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].requests.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].requests[0]).toEqual({ prompt: 'Say hi', attachments: [], modelId: 'base', token });
    });
    (0, vitest_1.it)('reuses existing session (non-untitled) and does not create new one', async () => {
        const sessionId = 'existing-123';
        const sdkSession = new copilotCliSessionService_spec_1.MockCliSdkSession(sessionId, new Date());
        manager.sessions.set(sessionId, sdkSession);
        const request = new testHelpers_1.TestChatRequest('Continue');
        const context = createChatContext(sessionId, false);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        (0, vitest_1.expect)(cliSessions.length).toBe(0);
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(cliSessions.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].sessionId).toBe(sessionId);
        (0, vitest_1.expect)(cliSessions[0].requests.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].requests[0]).toEqual({ prompt: 'Continue', attachments: [], modelId: 'base', token });
        (0, vitest_1.expect)(itemProvider.swap).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('handles /delegate command for existing session (no session.handleRequest)', async () => {
        const sessionId = 'existing-123';
        const sdkSession = new copilotCliSessionService_spec_1.MockCliSdkSession(sessionId, new Date());
        manager.sessions.set(sessionId, sdkSession);
        git.activeRepository = { get: () => ({ changes: { indexChanges: [{ path: 'file.ts' }] } }) };
        const request = new testHelpers_1.TestChatRequest('/delegate Build feature');
        const context = createChatContext(sessionId, false);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        (0, vitest_1.expect)(cliSessions.length).toBe(0);
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(cliSessions.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].sessionId).toBe(sessionId);
        (0, vitest_1.expect)(cliSessions[0].requests.length).toBe(0);
        (0, vitest_1.expect)(sdkSession.emittedEvents.length).toBe(2);
        (0, vitest_1.expect)(sdkSession.emittedEvents[0].event).toBe('user.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[0].content).toBe('/delegate Build feature');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].event).toBe('assistant.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].content).toContain('pr://1');
        // Uncommitted changes warning surfaced
        // Warning should appear (we emitted stream.warning). The mock stream only records markdown.
        // Delegate path adds assistant PR metadata; ensure output contains PR metadata tag instead of relying on warning capture.
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].content).toMatch(/<pr_metadata uri="pr:\/\/1"/);
        (0, vitest_1.expect)(cloudProvider.tryHandleUncommittedChanges).toHaveBeenCalled();
        (0, vitest_1.expect)(cloudProvider.createDelegatedChatSession).toHaveBeenCalled();
    });
    (0, vitest_1.it)('handles /delegate command for new session', async () => {
        (0, vitest_1.expect)(manager.sessions.size).toBe(0);
        git.activeRepository = { get: () => ({ changes: { indexChanges: [{ path: 'file.ts' }] } }) };
        const request = new testHelpers_1.TestChatRequest('/delegate Build feature');
        const context = createChatContext('existing-delegate', true);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(manager.sessions.size).toBe(1);
        const sdkSession = Array.from(manager.sessions.values())[0];
        (0, vitest_1.expect)(cloudProvider.tryHandleUncommittedChanges).toHaveBeenCalled();
        (0, vitest_1.expect)(cloudProvider.createDelegatedChatSession).toHaveBeenCalled();
        // PR metadata recorded
        (0, vitest_1.expect)(sdkSession.emittedEvents.length).toBe(2);
        (0, vitest_1.expect)(sdkSession.emittedEvents[0].event).toBe('user.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[0].content).toBe('/delegate Build feature');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].event).toBe('assistant.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].content).toContain('pr://1');
        // Warning should appear (we emitted stream.warning). The mock stream only records markdown.
        // Delegate path adds assistant PR metadata; ensure output contains PR metadata tag instead of relying on warning capture.
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].content).toMatch(/<pr_metadata uri="pr:\/\/1"/);
    });
    (0, vitest_1.it)('invokes handlePushConfirmationData without existing chatSessionContext (summary via summarizer)', async () => {
        const request = new testHelpers_1.TestChatRequest('Push this');
        const context = { chatSessionContext: undefined, chatSummary: undefined };
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        const summarySpy = vitest_1.vi.spyOn(summarizer, 'provideChatSummary');
        const execSpy = vitest_1.vi.spyOn(commandExecutionService, 'executeCommand');
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(manager.sessions.size).toBe(1);
        const sessionId = Array.from(manager.sessions.keys())[0];
        const expectedPrompt = 'Push this\n**Summary**\nsummary text';
        (0, vitest_1.expect)(summarySpy).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(execSpy.mock.calls[0]).toEqual(['vscode.open', vitest_1.expect.any(Object)]);
        (0, vitest_1.expect)(String(execSpy.mock.calls[0].at(1))).toContain(`copilotcli:/${sessionId}`);
        (0, vitest_1.expect)(execSpy.mock.calls[1]).toEqual(['workbench.action.chat.submit', { inputValue: expectedPrompt }]);
    });
    (0, vitest_1.it)('invokes handlePushConfirmationData using existing chatSummary and skips summarizer', async () => {
        const request = new testHelpers_1.TestChatRequest('Push that');
        const context = { chatSessionContext: undefined, chatSummary: { history: 'precomputed history' } };
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        const summarySpy = vitest_1.vi.spyOn(summarizer, 'provideChatSummary');
        const execSpy = vitest_1.vi.spyOn(commandExecutionService, 'executeCommand');
        await participant.createHandler()(request, context, stream, token);
        (0, vitest_1.expect)(manager.sessions.size).toBe(1);
        const expectedPrompt = 'Push that\n**Summary**\nprecomputed history';
        (0, vitest_1.expect)(summarySpy).not.toHaveBeenCalled();
        (0, vitest_1.expect)(execSpy).toHaveBeenCalledTimes(2);
        (0, vitest_1.expect)(execSpy.mock.calls[0].at(0)).toBe('vscode.open');
        (0, vitest_1.expect)(execSpy.mock.calls[1]).toEqual(['workbench.action.chat.submit', { inputValue: expectedPrompt }]);
    });
    (0, vitest_1.it)('handleConfirmationData accepts uncommitted-changes and records push', async () => {
        // Existing session (non-untitled) so confirmation path is hit
        const sessionId = 'existing-confirm';
        const sdkSession = new copilotCliSessionService_spec_1.MockCliSdkSession(sessionId, new Date());
        manager.sessions.set(sessionId, sdkSession);
        const request = new testHelpers_1.TestChatRequest('Apply');
        request.acceptedConfirmationData = [{ step: 'uncommitted-changes', metadata: { prompt: 'delegate work', history: 'hist' } }];
        const context = createChatContext(sessionId, false);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        // Cloud provider will create delegated chat session returning prInfo
        cloudProvider.createDelegatedChatSession.mockResolvedValue({ uri: 'pr://2', title: 'T', description: 'D', author: 'A', linkTag: 'L' });
        await participant.createHandler()(request, context, stream, token);
        // Should NOT call session.handleRequest, instead record push messages
        (0, vitest_1.expect)(cliSessions.length).toBe(1);
        (0, vitest_1.expect)(cliSessions[0].requests.length).toBe(0);
        (0, vitest_1.expect)(sdkSession.emittedEvents.length).toBe(2);
        (0, vitest_1.expect)(sdkSession.emittedEvents[0].event).toBe('user.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].event).toBe('assistant.message');
        (0, vitest_1.expect)(sdkSession.emittedEvents[1].content).toContain('pr://2');
        // Cloud provider used with provided metadata
        (0, vitest_1.expect)(cloudProvider.createDelegatedChatSession).toHaveBeenCalledWith({ prompt: 'delegate work', history: 'hist', chatContext: context }, vitest_1.expect.anything(), token);
    });
    (0, vitest_1.it)('handleConfirmationData cancels when uncommitted-changes rejected', async () => {
        const sessionId = 'existing-confirm-reject';
        const sdkSession = new copilotCliSessionService_spec_1.MockCliSdkSession(sessionId, new Date());
        manager.sessions.set(sessionId, sdkSession);
        const request = new testHelpers_1.TestChatRequest('Apply');
        request.rejectedConfirmationData = [{ step: 'uncommitted-changes', metadata: { prompt: 'delegate work', history: 'hist' } }];
        const context = createChatContext(sessionId, false);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        await participant.createHandler()(request, context, stream, token);
        // Should not record push or call delegate session
        (0, vitest_1.expect)(sdkSession.emittedEvents.length).toBe(0);
        (0, vitest_1.expect)(cloudProvider.createDelegatedChatSession).not.toHaveBeenCalled();
        // Cancellation message markdown captured
        (0, vitest_1.expect)(stream.output.some(o => /Cloud agent delegation request cancelled/i.test(o))).toBe(true);
    });
    (0, vitest_1.it)('handleConfirmationData unknown step warns and skips', async () => {
        const sessionId = 'existing-confirm-unknown';
        const sdkSession = new copilotCliSessionService_spec_1.MockCliSdkSession(sessionId, new Date());
        manager.sessions.set(sessionId, sdkSession);
        const request = new testHelpers_1.TestChatRequest('Apply');
        request.acceptedConfirmationData = [{ step: 'mystery-step', metadata: {} }];
        const context = createChatContext(sessionId, false);
        const stream = new testHelpers_1.MockChatResponseStream();
        const token = disposables.add(new cancellation_1.CancellationTokenSource()).token;
        await participant.createHandler()(request, context, stream, token);
        // No events are emitted
        (0, vitest_1.expect)(sdkSession.emittedEvents.length).toBe(0);
    });
});
//# sourceMappingURL=copilotCLIChatSessionParticipant.spec.js.map