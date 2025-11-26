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
var AgentSessionsCache_1;
import { ThrottledDelayer } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { URI } from '../../../../../base/common/uri.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ILifecycleService } from '../../../../services/lifecycle/common/lifecycle.js';
import { IChatSessionsService, localChatSessionType } from '../../common/chatSessionsService.js';
import { AgentSessionProviders, getAgentSessionProviderIcon, getAgentSessionProviderName } from './agentSessions.js';
import { AgentSessionsViewFilter } from './agentSessionsViewFilter.js';
export function isLocalAgentSessionItem(session) {
    return session.providerType === localChatSessionType;
}
export function isAgentSession(obj) {
    const session = obj;
    return URI.isUri(session?.resource);
}
export function isAgentSessionsViewModel(obj) {
    const sessionsViewModel = obj;
    return Array.isArray(sessionsViewModel?.sessions);
}
let AgentSessionsViewModel = class AgentSessionsViewModel extends Disposable {
    get sessions() {
        return this._sessions.filter(session => !this.filter.exclude(session));
    }
    constructor(options, chatSessionsService, lifecycleService, instantiationService, storageService) {
        super();
        this.chatSessionsService = chatSessionsService;
        this.lifecycleService = lifecycleService;
        this.instantiationService = instantiationService;
        this.storageService = storageService;
        this._onWillResolve = this._register(new Emitter());
        this.onWillResolve = this._onWillResolve.event;
        this._onDidResolve = this._register(new Emitter());
        this.onDidResolve = this._onDidResolve.event;
        this._onDidChangeSessions = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._sessions = [];
        this.resolver = this._register(new ThrottledDelayer(100));
        this.providersToResolve = new Set();
        this.mapSessionToState = new ResourceMap();
        this.filter = this._register(this.instantiationService.createInstance(AgentSessionsViewFilter, { filterMenuId: options.filterMenuId }));
        this.cache = this.instantiationService.createInstance(AgentSessionsCache);
        this._sessions = this.cache.loadCachedSessions();
        this.resolve(undefined);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.chatSessionsService.onDidChangeItemsProviders(({ chatSessionType: provider }) => this.resolve(provider)));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => this.resolve(undefined)));
        this._register(this.chatSessionsService.onDidChangeSessionItems(provider => this.resolve(provider)));
        this._register(this.filter.onDidChange(() => this._onDidChangeSessions.fire()));
        this._register(this.storageService.onWillSaveState(() => this.cache.saveCachedSessions(this._sessions)));
    }
    async resolve(provider) {
        if (Array.isArray(provider)) {
            for (const p of provider) {
                this.providersToResolve.add(p);
            }
        }
        else {
            this.providersToResolve.add(provider);
        }
        return this.resolver.trigger(async (token) => {
            if (token.isCancellationRequested || this.lifecycleService.willShutdown) {
                return;
            }
            try {
                this._onWillResolve.fire();
                return await this.doResolve(token);
            }
            finally {
                this._onDidResolve.fire();
            }
        });
    }
    async doResolve(token) {
        const providersToResolve = Array.from(this.providersToResolve);
        this.providersToResolve.clear();
        const mapSessionContributionToType = new Map();
        for (const contribution of this.chatSessionsService.getAllChatSessionContributions()) {
            mapSessionContributionToType.set(contribution.type, contribution);
        }
        const resolvedProviders = new Set();
        const sessions = new ResourceMap();
        for (const provider of this.chatSessionsService.getAllChatSessionItemProviders()) {
            if (!providersToResolve.includes(undefined) && !providersToResolve.includes(provider.chatSessionType)) {
                continue; // skip: not considered for resolving
            }
            const providerSessions = await provider.provideChatSessionItems(token);
            resolvedProviders.add(provider.chatSessionType);
            if (token.isCancellationRequested) {
                return;
            }
            for (const session of providerSessions) {
                // Icon + Label
                let icon;
                let providerLabel;
                switch ((provider.chatSessionType)) {
                    case AgentSessionProviders.Local:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Local);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Local);
                        break;
                    case AgentSessionProviders.Background:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Background);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Background);
                        break;
                    case AgentSessionProviders.Cloud:
                        providerLabel = getAgentSessionProviderName(AgentSessionProviders.Cloud);
                        icon = getAgentSessionProviderIcon(AgentSessionProviders.Cloud);
                        break;
                    default: {
                        providerLabel = mapSessionContributionToType.get(provider.chatSessionType)?.name ?? provider.chatSessionType;
                        icon = session.iconPath ?? Codicon.terminal;
                    }
                }
                // State + Timings
                // TODO@bpasero this is a workaround for not having precise timing info in sessions
                // yet: we only track the time when a transition changes because then we can say with
                // confidence that the time is correct by assuming `Date.now()`. A better approach would
                // be to get all this information directly from the session.
                const status = session.status ?? 1 /* ChatSessionStatus.Completed */;
                const state = this.mapSessionToState.get(session.resource);
                let inProgressTime = state?.inProgressTime;
                let finishedOrFailedTime = state?.finishedOrFailedTime;
                // No previous state, just add it
                if (!state) {
                    this.mapSessionToState.set(session.resource, {
                        status
                    });
                }
                // State changed, update it
                else if (status !== state.status) {
                    inProgressTime = status === 2 /* ChatSessionStatus.InProgress */ ? Date.now() : state.inProgressTime;
                    finishedOrFailedTime = (status !== 2 /* ChatSessionStatus.InProgress */) ? Date.now() : state.finishedOrFailedTime;
                    this.mapSessionToState.set(session.resource, {
                        status,
                        inProgressTime,
                        finishedOrFailedTime
                    });
                }
                sessions.set(session.resource, {
                    providerType: provider.chatSessionType,
                    providerLabel,
                    resource: session.resource,
                    label: session.label,
                    description: session.description,
                    icon,
                    tooltip: session.tooltip,
                    status,
                    archived: session.archived ?? false,
                    timing: {
                        startTime: session.timing.startTime,
                        endTime: session.timing.endTime,
                        inProgressTime,
                        finishedOrFailedTime
                    },
                    statistics: session.statistics,
                });
            }
        }
        for (const session of this._sessions) {
            if (!resolvedProviders.has(session.providerType)) {
                sessions.set(session.resource, session); // fill in existing sessions for providers that did not resolve
            }
        }
        this._sessions.length = 0;
        this._sessions.push(...sessions.values());
        for (const [resource] of this.mapSessionToState) {
            if (!sessions.has(resource)) {
                this.mapSessionToState.delete(resource); // clean up tracking for removed sessions
            }
        }
        this._onDidChangeSessions.fire();
    }
};
AgentSessionsViewModel = __decorate([
    __param(1, IChatSessionsService),
    __param(2, ILifecycleService),
    __param(3, IInstantiationService),
    __param(4, IStorageService)
], AgentSessionsViewModel);
export { AgentSessionsViewModel };
let AgentSessionsCache = class AgentSessionsCache {
    static { AgentSessionsCache_1 = this; }
    static { this.STORAGE_KEY = 'agentSessions.cache'; }
    constructor(storageService) {
        this.storageService = storageService;
    }
    saveCachedSessions(sessions) {
        const serialized = sessions
            .filter(session => 
        // Only consider providers that we own where we know that
        // we can also invalidate the data after startup
        // Other providers are bound to a different lifecycle (extensions)
        session.providerType === AgentSessionProviders.Local ||
            session.providerType === AgentSessionProviders.Background ||
            session.providerType === AgentSessionProviders.Cloud)
            .map(session => ({
            providerType: session.providerType,
            providerLabel: session.providerLabel,
            resource: session.resource.toJSON(),
            icon: session.icon.id,
            label: session.label,
            description: session.description,
            tooltip: session.tooltip,
            status: session.status,
            archived: session.archived,
            timing: {
                startTime: session.timing.startTime,
                endTime: session.timing.endTime,
            },
            statistics: session.statistics,
        }));
        this.storageService.store(AgentSessionsCache_1.STORAGE_KEY, JSON.stringify(serialized), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    loadCachedSessions() {
        const sessionsCache = this.storageService.get(AgentSessionsCache_1.STORAGE_KEY, 1 /* StorageScope.WORKSPACE */);
        if (!sessionsCache) {
            return [];
        }
        try {
            const cached = JSON.parse(sessionsCache);
            return cached.map(session => ({
                providerType: session.providerType,
                providerLabel: session.providerLabel,
                resource: URI.revive(session.resource),
                icon: ThemeIcon.fromId(session.icon),
                label: session.label,
                description: session.description,
                tooltip: session.tooltip,
                status: session.status,
                archived: session.archived,
                timing: {
                    startTime: session.timing.startTime,
                    endTime: session.timing.endTime,
                },
                statistics: session.statistics,
            }));
        }
        catch {
            return []; // invalid data in storage, fallback to empty sessions list
        }
    }
};
AgentSessionsCache = AgentSessionsCache_1 = __decorate([
    __param(0, IStorageService)
], AgentSessionsCache);
//#endregion
//# sourceMappingURL=agentSessionViewModel.js.map