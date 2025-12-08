"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefCountedSession = exports.Mutex = exports.CopilotCLISessionService = exports.ICopilotCLISessionService = void 0;
const envService_1 = require("../../../../platform/env/common/envService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const logService_1 = require("../../../../platform/log/common/logService");
const services_1 = require("../../../../util/common/services");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const async_1 = require("../../../../util/vs/base/common/async");
const event_1 = require("../../../../util/vs/base/common/event");
const lazy_1 = require("../../../../util/vs/base/common/lazy");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const copilotCLITools_1 = require("../common/copilotCLITools");
const copilotCli_1 = require("./copilotCli");
const copilotcliSession_1 = require("./copilotcliSession");
const logger_1 = require("./logger");
const mcpHandler_1 = require("./mcpHandler");
exports.ICopilotCLISessionService = (0, services_1.createServiceIdentifier)('ICopilotCLISessionService');
const SESSION_SHUTDOWN_TIMEOUT_MS = 300 * 1000;
let CopilotCLISessionService = class CopilotCLISessionService extends lifecycle_1.Disposable {
    constructor(logService, copilotCLISDK, instantiationService, nativeEnv, fileSystem, mcpHandler) {
        super();
        this.logService = logService;
        this.copilotCLISDK = copilotCLISDK;
        this.instantiationService = instantiationService;
        this.nativeEnv = nativeEnv;
        this.fileSystem = fileSystem;
        this.mcpHandler = mcpHandler;
        this._sessionWrappers = new lifecycle_1.DisposableMap();
        this._newActiveSessions = new Map();
        this._onDidChangeSessions = new event_1.Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this.sessionTerminators = new lifecycle_1.DisposableMap();
        this.sessionMutexForGetSession = new Map();
        this.monitorSessionFiles();
        this._sessionManager = new lazy_1.Lazy(async () => {
            const { internal } = await this.copilotCLISDK.getPackage();
            return new internal.CLISessionManager({
                logger: (0, logger_1.getCopilotLogger)(this.logService)
            });
        });
    }
    monitorSessionFiles() {
        try {
            const sessionDir = (0, resources_1.joinPath)(this.nativeEnv.userHome, '.copilot', 'session-state');
            const watcher = this._register(this.fileSystem.createFileSystemWatcher(new fileTypes_1.RelativePattern(sessionDir, '*.jsonl')));
            this._register(watcher.onDidCreate(() => this._onDidChangeSessions.fire()));
        }
        catch (error) {
            this.logService.error(`Failed to monitor Copilot CLI session files: ${error}`);
        }
    }
    async getSessionManager() {
        return this._sessionManager.value;
    }
    async getAllSessions(token) {
        if (!this._getAllSessionsProgress) {
            this._getAllSessionsProgress = this._getAllSessions(token);
        }
        return this._getAllSessionsProgress.finally(() => {
            this._getAllSessionsProgress = undefined;
        });
    }
    async _getAllSessions(token) {
        try {
            const sessionManager = await (0, async_1.raceCancellationError)(this.getSessionManager(), token);
            const sessionMetadataList = await (0, async_1.raceCancellationError)(sessionManager.listSessions(), token);
            // Convert SessionMetadata to ICopilotCLISession
            const diskSessions = (0, arrays_1.coalesce)(await Promise.all(sessionMetadataList.map(async (metadata) => {
                if (this._newActiveSessions.has(metadata.sessionId)) {
                    // This is a new session not yet persisted to disk by SDK
                    return undefined;
                }
                const id = metadata.sessionId;
                const timestamp = metadata.modifiedTime;
                const label = metadata.summary ? labelFromPrompt(metadata.summary) : undefined;
                // CLI adds `<current_datetime>` tags to user prompt, this needs to be removed.
                // However in summary CLI can end up truncating the prompt and adding `... <current_dateti...` at the end.
                // So if we see a `<` in the label, we need to load the session to get the first user message.
                if (label && !label.includes('<')) {
                    return {
                        id,
                        label,
                        timestamp,
                    };
                }
                try {
                    // Get the full session to access chat messages
                    const session = await this.getSession(metadata.sessionId, { readonly: true }, token);
                    const firstUserMessage = session?.object ? session.object.sdkSession.getEvents().find((msg) => msg.type === 'user.message')?.data.content : undefined;
                    session?.dispose();
                    const label = labelFromPrompt(firstUserMessage ?? '');
                    if (!label) {
                        this.logService.warn(`Copilot CLI session ${metadata.sessionId} has no user messages.`);
                        return;
                    }
                    return {
                        id,
                        label,
                        timestamp,
                    };
                }
                catch (error) {
                    this.logService.warn(`Failed to load session ${metadata.sessionId}: ${error}`);
                }
            })));
            // Merge with cached sessions (new sessions not yet persisted by SDK)
            const allSessions = diskSessions
                .map(session => {
                return {
                    ...session,
                    status: this._sessionWrappers.get(session.id)?.object?.status
                };
            });
            return allSessions;
        }
        catch (error) {
            this.logService.error(`Failed to get all sessions: ${error}`);
            return Array.from(this._newActiveSessions.values());
        }
    }
    async createSession(prompt, { model, workingDirectory, isolationEnabled }, token) {
        const mcpServers = await this.mcpHandler.loadMcpConfig(workingDirectory);
        const options = new copilotCli_1.CopilotCLISessionOptions({ model, workingDirectory, isolationEnabled, mcpServers }, this.logService);
        const sessionManager = await (0, async_1.raceCancellationError)(this.getSessionManager(), token);
        const sdkSession = await sessionManager.createSession(options.toSessionOptions());
        const label = labelFromPrompt(prompt);
        const newSession = {
            id: sdkSession.sessionId,
            label,
            timestamp: sdkSession.startTime
        };
        this._newActiveSessions.set(sdkSession.sessionId, newSession);
        this.logService.trace(`[CopilotCLIAgentManager] Created new CopilotCLI session ${sdkSession.sessionId}.`);
        const session = this.createCopilotSession(sdkSession, options, sessionManager);
        session.object.add((0, lifecycle_1.toDisposable)(() => this._newActiveSessions.delete(sdkSession.sessionId)));
        session.object.add(session.object.onDidChangeStatus(() => {
            // This will get swapped out as soon as the session has completed.
            if (session.object.status === vscodeTypes_1.ChatSessionStatus.Completed || session.object.status === vscodeTypes_1.ChatSessionStatus.Failed) {
                this._newActiveSessions.delete(sdkSession.sessionId);
            }
        }));
        return session;
    }
    async getSession(sessionId, { model, workingDirectory, isolationEnabled, readonly }, token) {
        // https://github.com/microsoft/vscode/issues/276573
        const lock = this.sessionMutexForGetSession.get(sessionId) ?? new Mutex();
        this.sessionMutexForGetSession.set(sessionId, lock);
        const lockDisposable = await lock.acquire(token);
        if (!lockDisposable || this._store.isDisposed || token.isCancellationRequested) {
            lockDisposable?.dispose();
            return;
        }
        try {
            {
                const session = this._sessionWrappers.get(sessionId);
                if (session) {
                    this.logService.trace(`[CopilotCLIAgentManager] Reusing CopilotCLI session ${sessionId}.`);
                    session.acquire();
                    return session;
                }
            }
            const [sessionManager, mcpServers] = await Promise.all([
                (0, async_1.raceCancellationError)(this.getSessionManager(), token),
                this.mcpHandler.loadMcpConfig(workingDirectory)
            ]);
            const options = new copilotCli_1.CopilotCLISessionOptions({ model, workingDirectory, isolationEnabled, mcpServers }, this.logService);
            const sdkSession = await sessionManager.getSession({ ...options.toSessionOptions(), sessionId }, !readonly);
            if (!sdkSession) {
                this.logService.error(`[CopilotCLIAgentManager] CopilotCLI failed to get session ${sessionId}.`);
                return undefined;
            }
            return this.createCopilotSession(sdkSession, options, sessionManager);
        }
        finally {
            lockDisposable.dispose();
        }
    }
    createCopilotSession(sdkSession, options, sessionManager) {
        const session = this.instantiationService.createInstance(copilotcliSession_1.CopilotCLISession, options, sdkSession);
        session.add(session.onDidChangeStatus(() => this._onDidChangeSessions.fire()));
        session.add((0, lifecycle_1.toDisposable)(() => {
            this._sessionWrappers.deleteAndLeak(sdkSession.sessionId);
            this.sessionMutexForGetSession.delete(sdkSession.sessionId);
            sdkSession.abort();
            void sessionManager.closeSession(sdkSession.sessionId);
        }));
        // We have no way of tracking Chat Editor life cycle.
        // Hence when we're done with a request, lets dispose the chat session (say 60s after).
        // If in the mean time we get another request, we'll clear the timeout.
        // When vscode shuts the sessions will be disposed anyway.
        // This code is to avoid leaving these sessions alive forever in memory.
        session.add(session.onDidChangeStatus(e => {
            // If we're waiting for a permission, then do not start the timeout.
            if (session.permissionRequested) {
                this.sessionTerminators.deleteAndDispose(session.sessionId);
            }
            else if (session.status === undefined || session.status === vscodeTypes_1.ChatSessionStatus.Completed || session.status === vscodeTypes_1.ChatSessionStatus.Failed) {
                // We're done with this session, start timeout to dispose it
                this.sessionTerminators.set(session.sessionId, (0, async_1.disposableTimeout)(() => {
                    session.dispose();
                    this.sessionTerminators.deleteAndDispose(session.sessionId);
                }, SESSION_SHUTDOWN_TIMEOUT_MS));
            }
            else {
                // Session is busy.
                this.sessionTerminators.deleteAndDispose(session.sessionId);
            }
        }));
        const refCountedSession = new RefCountedSession(session);
        this._sessionWrappers.set(sdkSession.sessionId, refCountedSession);
        return refCountedSession;
    }
    async deleteSession(sessionId) {
        try {
            {
                const session = this._sessionWrappers.get(sessionId);
                if (session) {
                    session.dispose();
                    this.logService.warn(`Delete an active session ${sessionId}.`);
                }
            }
            // Delete from session manager first
            const sessionManager = await this.getSessionManager();
            await sessionManager.deleteSession(sessionId);
        }
        catch (error) {
            this.logService.error(`Failed to delete session ${sessionId}: ${error}`);
        }
        finally {
            this._newActiveSessions.delete(sessionId);
            this._sessionWrappers.deleteAndLeak(sessionId);
            // Possible the session was deleted in another vscode session or the like.
            this._onDidChangeSessions.fire();
        }
    }
};
exports.CopilotCLISessionService = CopilotCLISessionService;
exports.CopilotCLISessionService = CopilotCLISessionService = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, copilotCli_1.ICopilotCLISDK),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, envService_1.INativeEnvService),
    __param(4, fileSystemService_1.IFileSystemService),
    __param(5, mcpHandler_1.ICopilotCLIMCPHandler)
], CopilotCLISessionService);
function labelFromPrompt(prompt) {
    // Strip system reminders and return first line or first 50 characters, whichever is shorter
    const cleanContent = (0, copilotCLITools_1.stripReminders)(prompt);
    const firstLine = cleanContent.split('\n').find((l) => l.trim().length > 0) ?? '';
    return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
}
class Mutex {
    constructor() {
        this._locked = false;
        this._acquireQueue = [];
    }
    isLocked() {
        return this._locked;
    }
    // Acquire the lock; resolves with a release function you MUST call.
    acquire(token) {
        return (0, async_1.raceCancellation)(new Promise(resolve => {
            const tryAcquire = () => {
                if (token.isCancellationRequested) {
                    resolve(undefined);
                    return;
                }
                if (!this._locked) {
                    this._locked = true;
                    resolve((0, lifecycle_1.toDisposable)(() => this._release()));
                }
                else {
                    this._acquireQueue.push(tryAcquire);
                }
            };
            tryAcquire();
        }), token);
    }
    _release() {
        if (!this._locked) {
            throw new Error('Mutex: release called while not locked');
        }
        this._locked = false;
        const next = this._acquireQueue.shift();
        if (next) {
            next();
        }
    }
}
exports.Mutex = Mutex;
class RefCountedSession extends lifecycle_1.RefCountedDisposable {
    constructor(object) {
        super(object);
        this.object = object;
    }
    dispose() {
        this.release();
    }
}
exports.RefCountedSession = RefCountedSession;
//# sourceMappingURL=copilotcliSessionService.js.map