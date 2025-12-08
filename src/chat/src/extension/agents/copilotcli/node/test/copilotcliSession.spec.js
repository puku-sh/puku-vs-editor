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
const gitService_1 = require("../../../../../platform/git/common/gitService");
const logService_1 = require("../../../../../platform/log/common/logService");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const simpleMock_1 = require("../../../../../util/common/test/simpleMock");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const path = __importStar(require("../../../../../util/vs/base/common/path"));
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const services_1 = require("../../../../test/node/services");
const testHelpers_1 = require("../../../../test/node/testHelpers");
const externalEditTracker_1 = require("../../../common/externalEditTracker");
const copilotCli_1 = require("../copilotCli");
const copilotcliSession_1 = require("../copilotcliSession");
class MockSdkSession {
    constructor() {
        this.onHandlers = new Map();
        this.sessionId = 'mock-session-id';
        this._selectedModel = 'modelA';
    }
    on(event, handler) {
        if (!this.onHandlers.has(event)) {
            this.onHandlers.set(event, new Set());
        }
        this.onHandlers.get(event).add(handler);
        return () => this.onHandlers.get(event).delete(handler);
    }
    emit(event, data) {
        this.onHandlers.get(event)?.forEach(h => h({ data }));
    }
    async send({ prompt }) {
        // Simulate a normal successful turn with a message
        this.emit('assistant.turn_start', {});
        this.emit('assistant.message', { content: `Echo: ${prompt}` });
        this.emit('assistant.turn_end', {});
    }
    setAuthInfo(info) { this.authInfo = info; }
    async getSelectedModel() { return this._selectedModel; }
    async setSelectedModel(model) { this._selectedModel = model; }
    async getEvents() { return []; }
}
function createWorkspaceService(root) {
    const rootUri = vscodeTypes_1.Uri.file(root);
    return new class extends testWorkspaceService_1.TestWorkspaceService {
        getWorkspaceFolders() {
            return [
                rootUri
            ];
        }
        getWorkspaceFolder(uri) {
            return uri.fsPath.startsWith(rootUri.fsPath) ? rootUri : undefined;
        }
    };
}
(0, vitest_1.describe)('CopilotCLISession', () => {
    const disposables = new lifecycle_1.DisposableStore();
    let sdkSession;
    let workspaceService;
    let logger;
    let gitService;
    let sessionOptions;
    let authService;
    let instaService;
    (0, vitest_1.beforeEach)(async () => {
        const services = disposables.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        logger = accessor.get(logService_1.ILogService);
        gitService = accessor.get(gitService_1.IGitService);
        authService = new class extends (0, simpleMock_1.mock)() {
            async getAnyGitHubSession() {
                return {
                    accessToken: '',
                };
            }
        }();
        sdkSession = new MockSdkSession();
        workspaceService = createWorkspaceService('/workspace');
        sessionOptions = new copilotCli_1.CopilotCLISessionOptions({ workingDirectory: workspaceService.getWorkspaceFolders()[0].fsPath }, logger);
        instaService = services.seal();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
        disposables.clear();
    });
    async function createSession() {
        return disposables.add(new copilotcliSession_1.CopilotCLISession(sessionOptions, sdkSession, gitService, logger, workspaceService, authService, instaService));
    }
    (0, vitest_1.it)('handles a successful request and streams assistant output', async () => {
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        // Attach stream first, then invoke with new signature (no stream param)
        session.attachStream(stream);
        await session.handleRequest('Hello', [], undefined, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(session.status).toBe(vscodeTypes_1.ChatSessionStatus.Completed);
        (0, vitest_1.expect)(stream.output.join('\n')).toContain('Echo: Hello');
        // Listeners are disposed after completion, so we only assert original streamed content.
    });
    (0, vitest_1.it)('switches model when different modelId provided', async () => {
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        await session.handleRequest('Hi', [], 'modelB', cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(sdkSession._selectedModel).toBe('modelB');
    });
    (0, vitest_1.it)('fails request when underlying send throws', async () => {
        // Force send to throw
        sdkSession.send = async () => { throw new Error('network'); };
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        await session.handleRequest('Boom', [], undefined, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(session.status).toBe(vscodeTypes_1.ChatSessionStatus.Failed);
        (0, vitest_1.expect)(stream.output.join('\n')).toContain('Error: network');
    });
    (0, vitest_1.it)('emits status events on successful request', async () => {
        const session = await createSession();
        const statuses = [];
        const listener = disposables.add(session.onDidChangeStatus(s => statuses.push(s)));
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        await session.handleRequest('Status OK', [], 'modelA', cancellation_1.CancellationToken.None);
        listener.dispose?.();
        (0, vitest_1.expect)(statuses).toEqual([vscodeTypes_1.ChatSessionStatus.InProgress, vscodeTypes_1.ChatSessionStatus.Completed]);
        (0, vitest_1.expect)(session.status).toBe(vscodeTypes_1.ChatSessionStatus.Completed);
    });
    (0, vitest_1.it)('emits status events on failed request', async () => {
        // Force failure
        sdkSession.send = async () => { throw new Error('boom'); };
        const session = await createSession();
        const statuses = [];
        const listener = disposables.add(session.onDidChangeStatus(s => statuses.push(s)));
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        await session.handleRequest('Will Fail', [], undefined, cancellation_1.CancellationToken.None);
        listener.dispose?.();
        (0, vitest_1.expect)(statuses).toEqual([vscodeTypes_1.ChatSessionStatus.InProgress, vscodeTypes_1.ChatSessionStatus.Failed]);
        (0, vitest_1.expect)(session.status).toBe(vscodeTypes_1.ChatSessionStatus.Failed);
        (0, vitest_1.expect)(stream.output.join('\n')).toContain('Error: boom');
    });
    (0, vitest_1.it)('auto-approves read permission inside workspace without external handler', async () => {
        // Keep session active while requesting permission
        let resolveSend;
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        const handlePromise = session.handleRequest('Test', [], undefined, cancellation_1.CancellationToken.None);
        // Path must be absolute within workspace, should auto-approve
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'read', path: path.join('/workspace', 'file.ts'), intention: 'Read file' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'approved' });
    });
    (0, vitest_1.it)('auto-approves read permission inside working directory without external handler', async () => {
        // Keep session active while requesting permission
        let resolveSend;
        sessionOptions = new copilotCli_1.CopilotCLISessionOptions({ workingDirectory: '/workingDirectory' }, logger);
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        const handlePromise = session.handleRequest('Test', [], undefined, cancellation_1.CancellationToken.None);
        // Path must be absolute within workspace, should auto-approve
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'read', path: path.join('/workingDirectory', 'file.ts'), intention: 'Read file' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'approved' });
    });
    (0, vitest_1.it)('requires read permission outside workspace and working directory', async () => {
        // Keep session active while requesting permission
        let resolveSend;
        let askedForPermission = undefined;
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const session = await createSession();
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        disposables.add(session.attachPermissionHandler((permission) => {
            askedForPermission = permission;
            return Promise.resolve(false);
        }));
        const handlePromise = session.handleRequest('Test', [], undefined, cancellation_1.CancellationToken.None);
        // Path must be absolute within workspace, should auto-approve
        const file = path.join('/workingDirectory', 'file.ts');
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'read', path: file, intention: 'Read file' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'denied-interactively-by-user' });
        (0, vitest_1.expect)(askedForPermission).not.toBeUndefined();
        (0, vitest_1.expect)(askedForPermission.kind).toBe('read');
        (0, vitest_1.expect)(askedForPermission.path).toBe(file);
    });
    (0, vitest_1.it)('approves write permission when handler returns true', async () => {
        const session = await createSession();
        // Register approval handler
        disposables.add(session.attachPermissionHandler(async () => true));
        let resolveSend;
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        const handlePromise = session.handleRequest('Write', [], undefined, cancellation_1.CancellationToken.None);
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'write', fileName: 'a.ts', intention: 'Update file', diff: '' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'approved' });
    });
    (0, vitest_1.it)('denies write permission when handler returns false', async () => {
        const session = await createSession();
        session.attachPermissionHandler(async () => false);
        let resolveSend;
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        const handlePromise = session.handleRequest('Write', [], undefined, cancellation_1.CancellationToken.None);
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'write', fileName: 'b.ts', intention: 'Update file', diff: '' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'denied-interactively-by-user' });
    });
    (0, vitest_1.it)('denies write permission when handler throws', async () => {
        const session = await createSession();
        session.attachPermissionHandler(async () => { throw new Error('oops'); });
        let resolveSend;
        sdkSession.send = async ({ prompt }) => new Promise(r => { resolveSend = r; }).then(() => {
            sdkSession.emit('assistant.turn_start', {});
            sdkSession.emit('assistant.message', { content: `Echo: ${prompt}` });
            sdkSession.emit('assistant.turn_end', {});
        });
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        const handlePromise = session.handleRequest('Write', [], undefined, cancellation_1.CancellationToken.None);
        const result = await sessionOptions.toSessionOptions().requestPermission({ kind: 'write', fileName: 'err.ts', intention: 'Update file', diff: '' });
        resolveSend();
        await handlePromise;
        (0, vitest_1.expect)(result).toEqual({ kind: 'denied-interactively-by-user' });
    });
    (0, vitest_1.it)('preserves order of edit toolCallIds and permissions for multiple pending edits', async () => {
        // Arrange a deferred send so we can emit tool events before request finishes
        let resolveSend;
        sdkSession.send = async () => new Promise(r => { resolveSend = r; });
        const session = await createSession();
        session.attachPermissionHandler(async () => true);
        const stream = new testHelpers_1.MockChatResponseStream();
        session.attachStream(stream);
        // Spy on trackEdit to capture ordering (we don't want to depend on externalEdit mechanics here)
        const trackedOrder = [];
        const trackSpy = vitest_1.vi.spyOn(externalEditTracker_1.ExternalEditTracker.prototype, 'trackEdit').mockImplementation(async function (editKey) {
            trackedOrder.push(editKey);
            // Immediately resolve to avoid hanging on externalEdit lifecycle
            return Promise.resolve();
        });
        // Act: start handling request (do not await yet)
        const requestPromise = session.handleRequest('Edits', [], undefined, cancellation_1.CancellationToken.None);
        // Wait a tick to ensure event listeners are registered inside handleRequest
        await new Promise(r => setTimeout(r, 0));
        // Emit 10 edit tool start events in rapid succession for the same file
        const filePath = '/workspace/abc.py';
        for (let i = 1; i <= 10; i++) {
            sdkSession.emit('tool.execution_start', {
                toolCallId: String(i),
                toolName: 'str_replace_editor',
                arguments: { command: 'str_replace', path: filePath }
            });
        }
        // Now request permissions sequentially AFTER all tool calls have been emitted
        const permissionResults = [];
        for (let i = 1; i <= 10; i++) {
            // Each permission request should dequeue the next toolCallId for the file
            const result = await sessionOptions.toSessionOptions().requestPermission({
                kind: 'write',
                fileName: filePath,
                intention: 'Apply edit',
                diff: ''
            });
            permissionResults.push(result);
            // Complete the edit so the tracker (if it were real) would finish; emit completion event
            sdkSession.emit('tool.execution_complete', {
                toolCallId: String(i),
                toolName: 'str_replace_editor',
                arguments: { command: 'str_replace', path: filePath },
                success: true,
                result: { content: '' }
            });
        }
        // Allow the request to finish
        resolveSend();
        await requestPromise;
        // Assert ordering of trackEdit invocations exactly matches toolCallIds 1..10
        (0, vitest_1.expect)(trackedOrder).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
        (0, vitest_1.expect)(permissionResults.every(r => r.kind === 'approved')).toBe(true);
        (0, vitest_1.expect)(trackSpy).toHaveBeenCalledTimes(10);
        trackSpy.mockRestore();
    });
});
//# sourceMappingURL=copilotcliSession.spec.js.map