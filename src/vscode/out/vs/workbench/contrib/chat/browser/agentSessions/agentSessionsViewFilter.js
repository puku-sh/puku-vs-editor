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
            { id: 1 /* ChatSessionStatus.Completed */, label: localize('chatSessionStatus.completed', "Completed") },
            { id: 2 /* ChatSessionStatus.InProgress */, label: localize('chatSessionStatus.inProgress', "In Progress") },
            { id: 0 /* ChatSessionStatus.Failed */, label: localize('chatSessionStatus.failed', "Failed") },
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
                    title: localize('agentSessions.filter.archived', 'Archived'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnRTZXNzaW9uc1ZpZXdGaWx0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9ob21lL3BvcmlkaGkvZGV2ZWxvcG1lbnQvcHVrdS12cy1lZGl0b3Ivc3JjL3ZzY29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWdlbnRTZXNzaW9ucy9hZ2VudFNlc3Npb25zVmlld0ZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFVLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFxQixvQkFBb0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBYXhGLE1BQU0sZ0JBQWdCLEdBQStCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDbEUsU0FBUyxFQUFFLEVBQVc7SUFDdEIsTUFBTSxFQUFFLEVBQVc7SUFDbkIsUUFBUSxFQUFFLElBQWE7Q0FDdkIsQ0FBQyxDQUFDO0FBRUgsTUFBTSxrQkFBa0IsR0FBRyw4QkFBOEIsQ0FBQztBQUUxRCxNQUFNLFVBQVUsV0FBVyxDQUFDLGNBQStCO0lBQzFELE1BQU0sUUFBUSxHQUFHO1FBQ2hCLFNBQVMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxD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