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
            title: nls.localize2(5983, "Agent Sessions"),
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
                            content: nls.localize(5980, null, ACTION_ID_OPEN_CHAT),
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
                        value: nls.localize(5981, null),
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
        const title = nls.localize(5982, null);
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
//# sourceMappingURL=chatSessionsView.js.map