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
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, toDisposable } from '../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { TerminalChatContextKeys } from './terminalChat.js';
import { LocalChatSessionUri } from '../../../chat/common/chatUri.js';
import { isNumber, isString } from '../../../../../base/common/types.js';
var StorageKeys;
(function (StorageKeys) {
    StorageKeys["ToolSessionMappings"] = "terminalChat.toolSessionMappings";
    StorageKeys["CommandIdMappings"] = "terminalChat.commandIdMappings";
})(StorageKeys || (StorageKeys = {}));
/**
 * Used to manage chat tool invocations and the underlying terminal instances they create/use.
 */
let TerminalChatService = class TerminalChatService extends Disposable {
    constructor(_logService, _terminalService, _storageService, _contextKeyService, _chatService) {
        super();
        this._logService = _logService;
        this._terminalService = _terminalService;
        this._storageService = _storageService;
        this._contextKeyService = _contextKeyService;
        this._chatService = _chatService;
        this._terminalInstancesByToolSessionId = new Map();
        this._toolSessionIdByTerminalInstance = new Map();
        this._chatSessionIdByTerminalInstance = new Map();
        this._terminalInstanceListenersByToolSessionId = this._register(new DisposableMap());
        this._chatSessionListenersByTerminalInstance = this._register(new DisposableMap());
        this._onDidRegisterTerminalInstanceForToolSession = new Emitter();
        this.onDidRegisterTerminalInstanceWithToolSession = this._onDidRegisterTerminalInstanceForToolSession.event;
        this._activeProgressParts = new Set();
        /**
         * Pending mappings restored from storage that have not yet been matched to a live terminal
         * instance (we match by persistentProcessId when it becomes available after reconnection).
         * toolSessionId -> persistentProcessId
         */
        this._pendingRestoredMappings = new Map();
        /**
         * Tracks chat session IDs that have auto approval enabled for all commands. This is a temporary
         * approval that lasts only for the duration of the session.
         */
        this._sessionAutoApprovalEnabled = new Set();
        this._hasToolTerminalContext = TerminalChatContextKeys.hasChatTerminals.bindTo(this._contextKeyService);
        this._hasHiddenToolTerminalContext = TerminalChatContextKeys.hasHiddenChatTerminals.bindTo(this._contextKeyService);
        this._restoreFromStorage();
    }
    registerTerminalInstanceWithToolSession(terminalToolSessionId, instance) {
        if (!terminalToolSessionId) {
            this._logService.warn('Attempted to register a terminal instance with an undefined tool session ID');
            return;
        }
        this._terminalInstancesByToolSessionId.set(terminalToolSessionId, instance);
        this._toolSessionIdByTerminalInstance.set(instance, terminalToolSessionId);
        this._onDidRegisterTerminalInstanceForToolSession.fire(instance);
        this._terminalInstanceListenersByToolSessionId.set(terminalToolSessionId, instance.onDisposed(() => {
            this._terminalInstancesByToolSessionId.delete(terminalToolSessionId);
            this._toolSessionIdByTerminalInstance.delete(instance);
            this._terminalInstanceListenersByToolSessionId.deleteAndDispose(terminalToolSessionId);
            this._persistToStorage();
            this._updateHasToolTerminalContextKeys();
        }));
        this._register(this._chatService.onDidDisposeSession(e => {
            if (LocalChatSessionUri.parseLocalSessionId(e.sessionResource) === terminalToolSessionId) {
                this._terminalInstancesByToolSessionId.delete(terminalToolSessionId);
                this._toolSessionIdByTerminalInstance.delete(instance);
                this._terminalInstanceListenersByToolSessionId.deleteAndDispose(terminalToolSessionId);
                // Clean up session auto approval state
                const sessionId = LocalChatSessionUri.parseLocalSessionId(e.sessionResource);
                if (sessionId) {
                    this._sessionAutoApprovalEnabled.delete(sessionId);
                }
                this._persistToStorage();
                this._updateHasToolTerminalContextKeys();
            }
        }));
        // Update context keys when terminal instances change (including when terminals are created, disposed, revealed, or hidden)
        this._register(this._terminalService.onDidChangeInstances(() => this._updateHasToolTerminalContextKeys()));
        if (isNumber(instance.shellLaunchConfig?.attachPersistentProcess?.id) || isNumber(instance.persistentProcessId)) {
            this._persistToStorage();
        }
        this._updateHasToolTerminalContextKeys();
    }
    async getTerminalInstanceByToolSessionId(terminalToolSessionId) {
        await this._terminalService.whenConnected;
        if (!terminalToolSessionId) {
            return undefined;
        }
        if (this._pendingRestoredMappings.has(terminalToolSessionId)) {
            const instance = this._terminalService.instances.find(i => i.shellLaunchConfig.attachPersistentProcess?.id === this._pendingRestoredMappings.get(terminalToolSessionId));
            if (instance) {
                this._tryAdoptRestoredMapping(instance);
                return instance;
            }
        }
        return this._terminalInstancesByToolSessionId.get(terminalToolSessionId);
    }
    getToolSessionTerminalInstances(hiddenOnly) {
        if (hiddenOnly) {
            const foregroundInstances = new Set(this._terminalService.foregroundInstances.map(i => i.instanceId));
            const uniqueInstances = new Set(this._terminalInstancesByToolSessionId.values());
            return Array.from(uniqueInstances).filter(i => !foregroundInstances.has(i.instanceId));
        }
        // Ensure unique instances in case multiple tool sessions map to the same terminal
        return Array.from(new Set(this._terminalInstancesByToolSessionId.values()));
    }
    getToolSessionIdForInstance(instance) {
        return this._toolSessionIdByTerminalInstance.get(instance);
    }
    registerTerminalInstanceWithChatSession(chatSessionId, instance) {
        // If already registered with the same session ID, skip to avoid duplicate listeners
        if (this._chatSessionIdByTerminalInstance.get(instance) === chatSessionId) {
            return;
        }
        // Clean up previous listener if the instance was registered with a different session
        this._chatSessionListenersByTerminalInstance.deleteAndDispose(instance);
        this._chatSessionIdByTerminalInstance.set(instance, chatSessionId);
        // Clean up when the instance is disposed
        const disposable = instance.onDisposed(() => {
            this._chatSessionIdByTerminalInstance.delete(instance);
            this._chatSessionListenersByTerminalInstance.deleteAndDispose(instance);
        });
        this._chatSessionListenersByTerminalInstance.set(instance, disposable);
    }
    getChatSessionIdForInstance(instance) {
        return this._chatSessionIdByTerminalInstance.get(instance);
    }
    isBackgroundTerminal(terminalToolSessionId) {
        if (!terminalToolSessionId) {
            return false;
        }
        const instance = this._terminalInstancesByToolSessionId.get(terminalToolSessionId);
        if (!instance) {
            return false;
        }
        return this._terminalService.instances.includes(instance) && !this._terminalService.foregroundInstances.includes(instance);
    }
    registerProgressPart(part) {
        this._activeProgressParts.add(part);
        if (this._isAfter(part, this._mostRecentProgressPart)) {
            this._mostRecentProgressPart = part;
        }
        return toDisposable(() => {
            this._activeProgressParts.delete(part);
            if (this._focusedProgressPart === part) {
                this._focusedProgressPart = undefined;
            }
            if (this._mostRecentProgressPart === part) {
                this._mostRecentProgressPart = this._getLastActiveProgressPart();
            }
        });
    }
    setFocusedProgressPart(part) {
        this._focusedProgressPart = part;
    }
    clearFocusedProgressPart(part) {
        if (this._focusedProgressPart === part) {
            this._focusedProgressPart = undefined;
        }
    }
    getFocusedProgressPart() {
        return this._focusedProgressPart;
    }
    getMostRecentProgressPart() {
        return this._mostRecentProgressPart;
    }
    _getLastActiveProgressPart() {
        let latest;
        for (const part of this._activeProgressParts) {
            if (this._isAfter(part, latest)) {
                latest = part;
            }
        }
        return latest;
    }
    _isAfter(candidate, current) {
        if (!current) {
            return true;
        }
        if (candidate.elementIndex === current.elementIndex) {
            return candidate.contentIndex >= current.contentIndex;
        }
        return candidate.elementIndex > current.elementIndex;
    }
    _restoreFromStorage() {
        try {
            const raw = this._storageService.get("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, 1 /* StorageScope.WORKSPACE */);
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            for (const [toolSessionId, persistentProcessId] of parsed) {
                if (isString(toolSessionId) && isNumber(persistentProcessId)) {
                    this._pendingRestoredMappings.set(toolSessionId, persistentProcessId);
                }
            }
        }
        catch (err) {
            this._logService.warn('Failed to restore terminal chat tool session mappings', err);
        }
    }
    _tryAdoptRestoredMapping(instance) {
        if (this._pendingRestoredMappings.size === 0) {
            return;
        }
        for (const [toolSessionId, persistentProcessId] of this._pendingRestoredMappings) {
            if (persistentProcessId === instance.shellLaunchConfig.attachPersistentProcess?.id) {
                this._terminalInstancesByToolSessionId.set(toolSessionId, instance);
                this._toolSessionIdByTerminalInstance.set(instance, toolSessionId);
                this._onDidRegisterTerminalInstanceForToolSession.fire(instance);
                this._terminalInstanceListenersByToolSessionId.set(toolSessionId, instance.onDisposed(() => {
                    this._terminalInstancesByToolSessionId.delete(toolSessionId);
                    this._toolSessionIdByTerminalInstance.delete(instance);
                    this._terminalInstanceListenersByToolSessionId.deleteAndDispose(toolSessionId);
                    this._persistToStorage();
                }));
                this._pendingRestoredMappings.delete(toolSessionId);
                this._persistToStorage();
                break;
            }
        }
    }
    _persistToStorage() {
        this._updateHasToolTerminalContextKeys();
        try {
            const entries = [];
            for (const [toolSessionId, instance] of this._terminalInstancesByToolSessionId.entries()) {
                if (isNumber(instance.persistentProcessId) && instance.shouldPersist) {
                    entries.push([toolSessionId, instance.persistentProcessId]);
                }
            }
            if (entries.length > 0) {
                this._storageService.store("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, JSON.stringify(entries), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
            }
            else {
                this._storageService.remove("terminalChat.toolSessionMappings" /* StorageKeys.ToolSessionMappings */, 1 /* StorageScope.WORKSPACE */);
            }
        }
        catch (err) {
            this._logService.warn('Failed to persist terminal chat tool session mappings', err);
        }
    }
    _updateHasToolTerminalContextKeys() {
        const toolCount = this._terminalInstancesByToolSessionId.size;
        this._hasToolTerminalContext.set(toolCount > 0);
        const hiddenTerminalCount = this.getToolSessionTerminalInstances(true).length;
        this._hasHiddenToolTerminalContext.set(hiddenTerminalCount > 0);
    }
    setChatSessionAutoApproval(chatSessionId, enabled) {
        if (enabled) {
            this._sessionAutoApprovalEnabled.add(chatSessionId);
        }
        else {
            this._sessionAutoApprovalEnabled.delete(chatSessionId);
        }
    }
    hasChatSessionAutoApproval(chatSessionId) {
        return this._sessionAutoApprovalEnabled.has(chatSessionId);
    }
};
TerminalChatService = __decorate([
    __param(0, ILogService),
    __param(1, ITerminalService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IChatService)
], TerminalChatService);
export { TerminalChatService };
//# sourceMappingURL=terminalChatService.js.map