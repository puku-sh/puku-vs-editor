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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWxDaGF0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0csT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBMEUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqSixPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG1EQUFtRCxDQUFDO0FBQ2pILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXpFLElBQVcsV0FHVjtBQUhELFdBQVcsV0FBVztJQUNyQix1RUFBd0QsQ0FBQTtJQUN4RCxtRUFBb0QsQ0FBQTtBQUNyRCxDQUFDLEVBSFUsV0FBVyxLQUFYLFdBQVcsUUFHckI7QUFHRDs7R0FFRztBQUNJLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQThCbEQsWUFDYyxX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