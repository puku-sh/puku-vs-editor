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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uVmlld01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FnZW50U2Vzc2lvbnMvYWdlbnRTZXNzaW9uVmlld01vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFDO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUM7QUFFdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQWtELG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakosT0FBTyxFQUFFLHFCQUFxQixFQUFFLDJCQUEyQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDckgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUErQ3ZFLE1BQU0sVUFBVSx1QkFB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