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
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import * as nls from '../../../../../../nls.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { SyncDescriptor } from '../../../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { registerIcon } from '../../../../../../platform/theme/common/iconRegistry.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { ViewPaneContainer } from '../../../../../browser/parts/views/viewPaneContainer.js';
import { Extensions, IViewDescriptorService } from '../../../../../common/views.js';
import { IExtensionService } from '../../../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../../../services/layout/browser/layoutService.js';
import { ChatContextKeyExprs } from '../../../common/chatContextKeys.js';
import { IChatSessionsService, localChatSessionType } from '../../../common/chatSessionsService.js';
import { LEGACY_AGENT_SESSIONS_VIEW_ID } from '../../../common/constants.js';
import { ACTION_ID_OPEN_CHAT } from '../../actions/chatActions.js';
import { ChatSessionTracker } from '../chatSessionTracker.js';
import { SessionsViewPane } from './sessionsViewPane.js';
export class ChatSessionsView extends Disposable {
    static { this.ID = 'workbench.contrib.chatSessionsView'; }
    constructor() {
        super();
        this.registerViewContainer();
    }
    registerViewContainer() {
        Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: LEGACY_AGENT_SESSIONS_VIEW_ID,
            title: nls.localize2('chat.agent.sessions', "Agent Sessions"),
            ctorDescriptor: new SyncDescriptor(ChatSessionsViewPaneContainer),
            hideIfEmpty: true,
            icon: registerIcon('chat-sessions-icon', Codicon.commentDiscussionSparkle, 'Icon for Agent Sessions View'),
            order: 6
        }, 0 /* ViewContainerLocation.Sidebar */);
    }
}
let ChatSessionsViewContrib = class ChatSessionsViewContrib extends Disposable {
    static { this.ID = 'workbench.contrib.chatSessions'; }
    constructor(instantiationService, chatSessionsService, logService, productService) {
        super();
        this.instantiationService = instantiationService;
        this.chatSessionsService = chatSessionsService;
        this.logService = logService;
        this.productService = productService;
        this.registeredViewDescriptors = new Map();
        this.sessionTracker = this._register(this.instantiationService.createInstance(ChatSessionTracker));
        // Initial check
        void this.updateViewRegistration();
        this._register(this.chatSessionsService.onDidChangeItemsProviders(() => {
            void this.updateViewRegistration();
        }));
        this._register(this.chatSessionsService.onDidChangeAvailability(() => {
            void this.updateViewRegistration();
        }));
    }
    getAllChatSessionItemProviders() {
        return Array.from(this.chatSessionsService.getAllChatSessionItemProviders());
    }
    async updateViewRegistration() {
        // prepare all chat session providers
        const contributions = this.chatSessionsService.getAllChatSessionContributions();
        await Promise.all(contributions.map(contrib => this.chatSessionsService.activateChatSessionItemProvider(contrib.type)));
        const currentProviders = this.getAllChatSessionItemProviders();
        const currentProviderIds = new Set(currentProviders.map(p => p.chatSessionType));
        // Find views that need to be unregistered (providers that are no longer available)
        const viewsToUnregister = [];
        for (const [providerId, viewDescriptor] of this.registeredViewDescriptors.entries()) {
            if (!currentProviderIds.has(providerId)) {
                viewsToUnregister.push(viewDescriptor);
                this.registeredViewDescriptors.delete(providerId);
            }
        }
        // Unregister removed views
        if (viewsToUnregister.length > 0) {
            const container = Registry.as(Extensions.ViewContainersRegistry).get(LEGACY_AGENT_SESSIONS_VIEW_ID);
            if (container) {
                Registry.as(Extensions.ViewsRegistry).deregisterViews(viewsToUnregister, container);
            }
        }
        // Register new views
        this.registerViews(contributions);
    }
    async registerViews(extensionPointContributions) {
        const container = Registry.as(Extensions.ViewContainersRegistry).get(LEGACY_AGENT_SESSIONS_VIEW_ID);
        const providers = this.getAllChatSessionItemProviders();
        if (container && providers.length > 0) {
            const viewDescriptorsToRegister = [];
            // Separate providers by type and prepare display names with order
            const localProvider = providers.find(p => p.chatSessionType === localChatSessionType);
            const historyProvider = providers.find(p => p.chatSessionType === 'history');
            const otherProviders = providers.filter(p => p.chatSessionType !== localChatSessionType && p.chatSessionType !== 'history');
            // Sort other providers by order, then alphabetically by display name
            const providersWithDisplayNames = otherProviders.map(provider => {
                const extContribution = extensionPointContributions.find(c => c.type === provider.chatSessionType);
                if (!extContribution) {
                    this.logService.warn(`No extension contribution found for chat session type: ${provider.chatSessionType}`);
                    return null;
                }
                return {
                    provider,
                    displayName: extContribution.displayName,
                    order: extContribution.order
                };
            }).filter(item => item !== null);
            providersWithDisplayNames.sort((a, b) => {
                // Both have no order - sort by display name
                if (a.order === undefined && b.order === undefined) {
                    return a.displayName.localeCompare(b.displayName);
                }
                // Only a has no order - push it to the end
                if (a.order === undefined) {
                    return 1;
                }
                // Only b has no order - push it to the end
                if (b.order === undefined) {
                    return -1;
                }
                // Both have orders - compare numerically
                const orderCompare = a.order - b.order;
                if (orderCompare !== 0) {
                    return orderCompare;
                }
                // Same order - sort by display name
                return a.displayName.localeCompare(b.displayName);
            });
            // Register views in priority order: local, history, then alphabetically sorted others
            const orderedProviders = [
                ...(localProvider ? [{ provider: localProvider, displayName: 'Local Chat Agent', baseOrder: 0, when: ChatContextKeyExprs.agentViewWhen }] : []),
                ...(historyProvider ? [{ provider: historyProvider, displayName: 'History', baseOrder: 1, when: ChatContextKeyExprs.agentViewWhen }] : []),
                ...providersWithDisplayNames.map((item, index) => ({
                    ...item,
                    baseOrder: 2 + index, // Start from 2 for other providers
                    when: ChatContextKeyExprs.agentViewWhen,
                }))
            ];
            orderedProviders.forEach(({ provider, displayName, baseOrder, when }) => {
                // Only register if not already registered
                if (!this.registeredViewDescriptors.has(provider.chatSessionType)) {
                    const viewId = `${LEGACY_AGENT_SESSIONS_VIEW_ID}.${provider.chatSessionType}`;
                    const viewDescriptor = {
                        id: viewId,
                        name: {
                            value: displayName,
                            original: displayName,
                        },
                        ctorDescriptor: new SyncDescriptor(SessionsViewPane, [provider, this.sessionTracker, viewId]),
                        canToggleVisibility: true,
                        canMoveView: true,
                        order: baseOrder, // Use computed order based on priority and alphabetical sorting
                        when,
                    };
                    viewDescriptorsToRegister.push(viewDescriptor);
                    this.registeredViewDescriptors.set(provider.chatSessionType, viewDescriptor);
                    if (provider.chatSessionType === localChatSessionType) {
                        const viewsRegistry = Registry.as(Extensions.ViewsRegistry);
                        this._register(viewsRegistry.registerViewWelcomeContent(viewDescriptor.id, {
                            content: nls.localize('chatSessions.noResults', "No local chat agent sessions\n[Start an Agent Session](command:{0})", ACTION_ID_OPEN_CHAT),
                        }));
                    }
                }
            });
            const gettingStartedViewId = `${LEGACY_AGENT_SESSIONS_VIEW_ID}.gettingStarted`;
            if (!this.registeredViewDescriptors.has('gettingStarted')
                && this.productService.chatSessionRecommendations?.length) {
                const gettingStartedDescriptor = {
                    id: gettingStartedViewId,
                    name: {
                        value: nls.localize('chat.sessions.gettingStarted', "Getting Started"),
                        original: 'Getting Started',
                    },
                    ctorDescriptor: new SyncDescriptor(SessionsViewPane, [null, this.sessionTracker, gettingStartedViewId]),
                    canToggleVisibility: true,
                    canMoveView: true,
                    order: 1000,
                    collapsed: !!otherProviders.length,
                    when: ContextKeyExpr.false()
                };
                viewDescriptorsToRegister.push(gettingStartedDescriptor);
                this.registeredViewDescriptors.set('gettingStarted', gettingStartedDescriptor);
            }
            if (viewDescriptorsToRegister.length > 0) {
                Registry.as(Extensions.ViewsRegistry).registerViews(viewDescriptorsToRegister, container);
            }
        }
    }
    dispose() {
        // Unregister all views before disposal
        if (this.registeredViewDescriptors.size > 0) {
            const container = Registry.as(Extensions.ViewContainersRegistry).get(LEGACY_AGENT_SESSIONS_VIEW_ID);
            if (container) {
                const allRegisteredViews = Array.from(this.registeredViewDescriptors.values());
                Registry.as(Extensions.ViewsRegistry).deregisterViews(allRegisteredViews, container);
            }
            this.registeredViewDescriptors.clear();
        }
        super.dispose();
    }
};
ChatSessionsViewContrib = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatSessionsService),
    __param(2, ILogService),
    __param(3, IProductService)
], ChatSessionsViewContrib);
export { ChatSessionsViewContrib };
// Chat sessions container
let ChatSessionsViewPaneContainer = class ChatSessionsViewPaneContainer extends ViewPaneContainer {
    constructor(instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService) {
        super(LEGACY_AGENT_SESSIONS_VIEW_ID, {
            mergeViewWithContainerWhenSingleView: false,
        }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
    }
    getTitle() {
        const title = nls.localize('chat.agent.sessions.title', "Agent Sessions");
        return title;
    }
};
ChatSessionsViewPaneContainer = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IWorkbenchLayoutService),
    __param(3, IContextMenuService),
    __param(4, ITelemetryService),
    __param(5, IExtensionService),
    __param(6, IThemeService),
    __param(7, IStorageService),
    __param(8, IWorkspaceContextService),
    __param(9, IViewDescriptorService),
    __param(10, ILogService)
], ChatSessionsViewPaneContainer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2Vzc2lvbnMvdmlldy9jaGF0U2Vzc2lvbnNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQztBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDNUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDcEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDOUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlEQUF5RCxDQUFD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