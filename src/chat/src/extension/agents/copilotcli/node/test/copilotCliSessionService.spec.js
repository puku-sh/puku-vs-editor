"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCliSdkSessionManager = exports.MockCliSdkSession = void 0;
const vitest_1 = require("vitest");
const vscode_languageserver_protocol_1 = require("vscode-languageserver-protocol");
const configurationService_1 = require("../../../../../platform/configuration/common/configurationService");
const nullEnvService_1 = require("../../../../../platform/env/common/nullEnvService");
const mockFileSystemService_1 = require("../../../../../platform/filesystem/node/test/mockFileSystemService");
const gitService_1 = require("../../../../../platform/git/common/gitService");
const logService_1 = require("../../../../../platform/log/common/logService");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const services_1 = require("../../../../test/node/services");
const copilotcliSession_1 = require("../copilotcliSession");
const copilotcliSessionService_1 = require("../copilotcliSessionService");
const mcpHandler_1 = require("../mcpHandler");
// --- Minimal SDK & dependency stubs ---------------------------------------------------------
class MockCliSdkSession {
    constructor(sessionId, startTime) {
        this.sessionId = sessionId;
        this.startTime = startTime;
        this.emittedEvents = [];
        this.aborted = false;
        this.messages = [];
        this.events = [];
    }
    getChatContextMessages() { return Promise.resolve(this.messages); }
    getEvents() { return this.events; }
    abort() { this.aborted = true; }
    emit(event, args) {
        this.emittedEvents.push({ event, content: args.content });
    }
}
exports.MockCliSdkSession = MockCliSdkSession;
class MockCliSdkSessionManager {
    constructor(_opts) {
        this.sessions = new Map();
    }
    createSession(_options) {
        const id = `sess_${Math.random().toString(36).slice(2, 10)}`;
        const s = new MockCliSdkSession(id, new Date());
        this.sessions.set(id, s);
        return Promise.resolve(s);
    }
    getSession(opts, _writable) {
        if (opts && opts.sessionId && this.sessions.has(opts.sessionId)) {
            return Promise.resolve(this.sessions.get(opts.sessionId));
        }
        return Promise.resolve(undefined);
    }
    listSessions() {
        return Promise.resolve(Array.from(this.sessions.values()).map(s => ({ sessionId: s.sessionId, startTime: s.startTime })));
    }
    deleteSession(id) { this.sessions.delete(id); return Promise.resolve(); }
    closeSession(_id) { return Promise.resolve(); }
}
exports.MockCliSdkSessionManager = MockCliSdkSessionManager;
(0, vitest_1.describe)('CopilotCLISessionService', () => {
    const disposables = new lifecycle_1.DisposableStore();
    let logService;
    let instantiationService;
    let service;
    let manager;
    (0, vitest_1.beforeEach)(async () => {
        vitest_1.vi.useRealTimers();
        const sdk = {
            getPackage: vitest_1.vi.fn(async () => ({ internal: { CLISessionManager: MockCliSdkSessionManager } }))
        };
        const services = disposables.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        logService = accessor.get(logService_1.ILogService);
        const gitService = accessor.get(gitService_1.IGitService);
        const workspaceService = new workspaceService_1.NullWorkspaceService();
        const authService = {
            getCopilotToken: vitest_1.vi.fn(async () => ({ token: 'test-token' })),
        };
        instantiationService = {
            invokeFunction(fn, ...args) {
                return fn(accessor, ...args);
            },
            createInstance: (_ctor, options, sdkSession) => {
                return disposables.add(new copilotcliSession_1.CopilotCLISession(options, sdkSession, gitService, logService, workspaceService, authService, instantiationService));
            }
        };
        const configurationService = accessor.get(configurationService_1.IConfigurationService);
        service = disposables.add(new copilotcliSessionService_1.CopilotCLISessionService(logService, sdk, instantiationService, new nullEnvService_1.NullNativeEnvService(), new mockFileSystemService_1.MockFileSystemService(), new mcpHandler_1.CopilotCLIMCPHandler(logService, new testWorkspaceService_1.TestWorkspaceService(), authService, configurationService)));
        manager = await service.getSessionManager();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.useRealTimers();
        vitest_1.vi.restoreAllMocks();
        disposables.clear();
    });
    // --- Tests ----------------------------------------------------------------------------------
    (0, vitest_1.describe)('CopilotCLISessionService.createSession', () => {
        (0, vitest_1.it)('get session will return the same session created using createSession', async () => {
            const session = await service.createSession('   ', { model: 'gpt-test', workingDirectory: '/tmp' }, vscode_languageserver_protocol_1.CancellationToken.None);
            const existingSession = await service.getSession(session.object.sessionId, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None);
            (0, vitest_1.expect)(existingSession).toBe(session);
        });
        (0, vitest_1.it)('get session will return new once previous session is disposed', async () => {
            const session = await service.createSession('   ', { model: 'gpt-test', workingDirectory: '/tmp' }, vscode_languageserver_protocol_1.CancellationToken.None);
            session.dispose();
            await new Promise(resolve => setTimeout(resolve, 0)); // allow dispose async cleanup to run
            const existingSession = await service.getSession(session.object.sessionId, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None);
            (0, vitest_1.expect)(existingSession?.object).toBeDefined();
            (0, vitest_1.expect)(existingSession?.object).not.toBe(session);
            (0, vitest_1.expect)(existingSession?.object.sessionId).toBe(session.object.sessionId);
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.getSession concurrency & locking', () => {
        (0, vitest_1.it)('concurrent getSession calls for same id create only one wrapper', async () => {
            const targetId = 'concurrent';
            const sdkSession = new MockCliSdkSession(targetId, new Date());
            manager.sessions.set(targetId, sdkSession);
            const originalGetSession = manager.getSession.bind(manager);
            const getSessionSpy = vitest_1.vi.fn((opts, writable) => {
                // Introduce delay to force overlapping acquire attempts
                return new Promise(resolve => setTimeout(() => resolve(originalGetSession(opts, writable)), 20));
            });
            manager.getSession = getSessionSpy;
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(service.getSession(targetId, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None));
            }
            const results = await Promise.all(promises);
            // All results refer to same instance
            const first = results.shift();
            for (const r of results) {
                (0, vitest_1.expect)(r).toBe(first);
            }
            (0, vitest_1.expect)(getSessionSpy).toHaveBeenCalledTimes(1);
            // Verify ref-count like disposal only disposes when all callers release
            let sentinelDisposed = false;
            first.object.add((0, lifecycle_1.toDisposable)(() => { sentinelDisposed = true; }));
            results.forEach(r => r?.dispose());
            (0, vitest_1.expect)(sentinelDisposed).toBe(false);
            // Only after disposing the last reference is the session disposed.
            first.dispose();
            (0, vitest_1.expect)(sentinelDisposed).toBe(true);
        });
        (0, vitest_1.it)('getSession for different ids does not block on mutex for another id', async () => {
            const slowId = 'slow';
            const fastId = 'fast';
            manager.sessions.set(slowId, new MockCliSdkSession(slowId, new Date()));
            manager.sessions.set(fastId, new MockCliSdkSession(fastId, new Date()));
            const originalGetSession = manager.getSession.bind(manager);
            manager.getSession = vitest_1.vi.fn((opts, writable) => {
                if (opts.sessionId === slowId) {
                    return new Promise(resolve => setTimeout(() => resolve(originalGetSession(opts, writable)), 40));
                }
                return originalGetSession(opts, writable);
            });
            const slowPromise = service.getSession(slowId, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None).then(() => 'slow');
            const fastPromise = service.getSession(fastId, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None).then(() => 'fast');
            const firstResolved = await Promise.race([slowPromise, fastPromise]);
            (0, vitest_1.expect)(firstResolved).toBe('fast');
        });
        (0, vitest_1.it)('session only fully disposes after all acquired references dispose', async () => {
            const id = 'refcount';
            manager.sessions.set(id, new MockCliSdkSession(id, new Date()));
            // Acquire 5 times sequentially
            const sessions = [];
            for (let i = 0; i < 5; i++) {
                sessions.push((await service.getSession(id, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None)));
            }
            const base = sessions[0];
            for (const s of sessions) {
                (0, vitest_1.expect)(s).toBe(base);
            }
            let sentinelDisposed = false;
            const lastSession = sessions.pop();
            lastSession.object.add((0, lifecycle_1.toDisposable)(() => { sentinelDisposed = true; }));
            // Dispose all other session refs, session should not yet be disposed
            sessions.forEach(s => s.dispose());
            (0, vitest_1.expect)(sentinelDisposed).toBe(false);
            // Final dispose triggers actual disposal
            lastSession.dispose();
            (0, vitest_1.expect)(sentinelDisposed).toBe(true);
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.getSession missing', () => {
        (0, vitest_1.it)('returns undefined when underlying manager has no session', async () => {
            const session = await service.getSession('does-not-exist', { readonly: true }, vscode_languageserver_protocol_1.CancellationToken.None);
            disposables.add(session);
            (0, vitest_1.expect)(session).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.getAllSessions', () => {
        (0, vitest_1.it)('will not list created sessions', async () => {
            const session = await service.createSession('   ', { model: 'gpt-test', workingDirectory: '/tmp' }, vscode_languageserver_protocol_1.CancellationToken.None);
            disposables.add(session);
            const s1 = new MockCliSdkSession('s1', new Date(0));
            s1.messages.push({ role: 'user', content: 'a'.repeat(100) });
            s1.events.push({ type: 'user.message', data: { content: 'a'.repeat(100) }, timestamp: '2024-01-01T00:00:00.000Z' });
            manager.sessions.set(s1.sessionId, s1);
            const result = await service.getAllSessions(vscode_languageserver_protocol_1.CancellationToken.None);
            (0, vitest_1.expect)(result.length).toBe(1);
            const item = result[0];
            (0, vitest_1.expect)(item.id).toBe('s1');
            (0, vitest_1.expect)(item.label.endsWith('...')).toBe(true); // truncated
            (0, vitest_1.expect)(item.label.length).toBeLessThanOrEqual(50);
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.deleteSession', () => {
        (0, vitest_1.it)('disposes active wrapper, removes from manager and fires change event', async () => {
            const session = await service.createSession('to delete', {}, vscode_languageserver_protocol_1.CancellationToken.None);
            const id = session.object.sessionId;
            let fired = false;
            disposables.add(session);
            disposables.add(service.onDidChangeSessions(() => { fired = true; }));
            await service.deleteSession(id);
            (0, vitest_1.expect)(manager.sessions.has(id)).toBe(false);
            (0, vitest_1.expect)(fired).toBe(true);
            (0, vitest_1.expect)(await service.getSession(id, { readonly: false }, vscode_languageserver_protocol_1.CancellationToken.None)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.label generation', () => {
        (0, vitest_1.it)('uses first user message line when present', async () => {
            const s = new MockCliSdkSession('lab1', new Date());
            s.messages.push({ role: 'user', content: 'Line1\nLine2' });
            s.events.push({ type: 'user.message', data: { content: 'Line1\nLine2' }, timestamp: Date.now().toString() });
            manager.sessions.set(s.sessionId, s);
            const sessions = await service.getAllSessions(vscode_languageserver_protocol_1.CancellationToken.None);
            const item = sessions.find(i => i.id === 'lab1');
            (0, vitest_1.expect)(item?.label).toBe('Line1');
        });
    });
    (0, vitest_1.describe)('CopilotCLISessionService.auto disposal timeout', () => {
        vitest_1.it.skip('disposes session after completion timeout and aborts underlying sdk session', async () => {
            vitest_1.vi.useFakeTimers();
            const session = await service.createSession('will timeout', {}, vscode_languageserver_protocol_1.CancellationToken.None);
            vitest_1.vi.advanceTimersByTime(31000);
            await Promise.resolve(); // allow any pending promises to run
            // dispose should have been called by timeout
            (0, vitest_1.expect)(session.object.isDisposed).toBe(true);
        });
    });
});
//# sourceMappingURL=copilotCliSessionService.spec.js.map