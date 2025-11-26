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
var AgentSessionsViewFilter_1;
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { registerAction2, Action2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IChatSessionsService } from '../../common/chatSessionsService.js';
import { AgentSessionProviders, getAgentSessionProviderName } from './agentSessions.js';
const DEFAULT_EXCLUDES = Object.freeze({
    providers: [],
    states: [],
    archived: true,
});
const FILTER_STORAGE_KEY = 'agentSessions.filterExcludes';
export function resetFilter(storageService) {
    const excludes = {
        providers: [...DEFAULT_EXCLUDES.providers],
        states: [...DEFAULT_EXCLUDES.states],
        archived: DEFAULT_EXCLUDES.archived,
    };
    storageService.store(FILTER_STORAGE_KEY, JSON.stringify(excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
}
let AgentSessionsViewFilter = class AgentSessionsViewFilter extends Disposable {
    static { AgentSessionsViewFilter_1 = this; }
    static { this.STORAGE_KEY = FILTER_STORAGE_KEY; }
    constructor(options, chatSessionsService, storageService) {
        super();
        this.options = options;
        this.chatSessionsService = chatSessionsService;
        this.storageService = storageService;
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this.excludes = DEFAULT_EXCLUDES;
        this.actionDisposables = this._register(new DisposableStore());
        this.updateExcludes(false);
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.chatSessionsService.onDidChangeItemsProviders(() => this.updateFilterActions()));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => this.updateFilterActions()));
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, AgentSessionsViewFilter_1.STORAGE_KEY, this._store)(() => this.updateExcludes(true)));
    }
    updateExcludes(fromEvent) {
        const excludedTypesRaw = this.storageService.get(AgentSessionsViewFilter_1.STORAGE_KEY, 0 /* StorageScope.PROFILE */);
        this.excludes = excludedTypesRaw ? JSON.parse(excludedTypesRaw) : {
            providers: [...DEFAULT_EXCLUDES.providers],
            states: [...DEFAULT_EXCLUDES.states],
            archived: DEFAULT_EXCLUDES.archived,
        };
        this.updateFilterActions();
        if (fromEvent) {
            this._onDidChange.fire();
        }
    }
    storeExcludes(excludes) {
        this.excludes = excludes;
        this.storageService.store(AgentSessionsViewFilter_1.STORAGE_KEY, JSON.stringify(this.excludes), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    updateFilterActions() {
        this.actionDisposables.clear();
        this.registerProviderActions(this.actionDisposables);
        this.registerStateActions(this.actionDisposables);
        this.registerArchivedActions(this.actionDisposables);
    }
    registerProviderActions(disposables) {
        const providers = [
            { id: AgentSessionProviders.Local, label: getAgentSessionProviderName(AgentSessionProviders.Local) },
            { id: AgentSessionProviders.Background, label: getAgentSessionProviderName(AgentSessionProviders.Background) },
            { id: AgentSessionProviders.Cloud, label: getAgentSessionProviderName(AgentSessionProviders.Cloud) },
        ];
        for (const provider of this.chatSessionsService.getAllChatSessionContributions()) {
            if (providers.find(p => p.id === provider.type)) {
                continue; // already added
            }
            providers.push({ id: provider.type, label: provider.name });
        }
        const that = this;
        let counter = 0;
        for (const provider of providers) {
            disposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `agentSessions.filter.toggleExclude:${provider.id}`,
                        title: provider.label,
                        menu: {
                            id: that.options.filterMenuId,
                            group: '1_providers',
                            order: counter++,
                        },
                        toggled: that.excludes.providers.includes(provider.id) ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                    });
                }
                run() {
                    const providerExcludes = new Set(that.excludes.providers);
                    if (providerExcludes.has(provider.id)) {
                        providerExcludes.delete(provider.id);
                    }
                    else {
                        providerExcludes.add(provider.id);
                    }
                    that.storeExcludes({ ...that.excludes, providers: Array.from(providerExcludes) });
                }
            }));
        }
    }
    registerStateActions(disposables) {
        const states = [
            { id: 1 /* ChatSessionStatus.Completed */, label: localize(5334, null) },
            { id: 2 /* ChatSessionStatus.InProgress */, label: localize(5335, null) },
            { id: 0 /* ChatSessionStatus.Failed */, label: localize(5336, null) },
        ];
        const that = this;
        let counter = 0;
        for (const state of states) {
            disposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `agentSessions.filter.toggleExcludeState:${state.id}`,
                        title: state.label,
                        menu: {
                            id: that.options.filterMenuId,
                            group: '2_states',
                            order: counter++,
                        },
                        toggled: that.excludes.states.includes(state.id) ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                    });
                }
                run() {
                    const stateExcludes = new Set(that.excludes.states);
                    if (stateExcludes.has(state.id)) {
                        stateExcludes.delete(state.id);
                    }
                    else {
                        stateExcludes.add(state.id);
                    }
                    that.storeExcludes({ ...that.excludes, states: Array.from(stateExcludes) });
                }
            }));
        }
    }
    registerArchivedActions(disposables) {
        const that = this;
        disposables.add(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'agentSessions.filter.toggleExcludeArchived',
                    title: localize(5337, null),
                    menu: {
                        id: that.options.filterMenuId,
                        group: '2_states',
                        order: 1000,
                    },
                    toggled: that.excludes.archived ? ContextKeyExpr.false() : ContextKeyExpr.true(),
                });
            }
            run() {
                that.storeExcludes({ ...that.excludes, archived: !that.excludes.archived });
            }
        }));
    }
    exclude(session) {
        if (this.excludes.archived && session.archived) {
            return true;
        }
        if (this.excludes.providers.includes(session.providerType)) {
            return true;
        }
        if (this.excludes.states.includes(session.status)) {
            return true;
        }
        return false;
    }
};
AgentSessionsViewFilter = AgentSessionsViewFilter_1 = __decorate([
    __param(1, IChatSessionsService),
    __param(2, IStorageService)
], AgentSessionsViewFilter);
export { AgentSessionsViewFilter };
//# sourceMappingURL=agentSessionsViewFilter.js.map