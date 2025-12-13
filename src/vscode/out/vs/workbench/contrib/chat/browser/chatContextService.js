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
import { ThemeIcon } from '../../../../base/common/themables.js';
import { score } from '../../../../editor/common/languageSelector.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatContextPickService } from './chatContextPickService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable, DisposableMap } from '../../../../base/common/lifecycle.js';
export const IChatContextService = createDecorator('chatContextService');
let ChatContextService = class ChatContextService extends Disposable {
    constructor(_contextPickService, _extensionService) {
        super();
        this._contextPickService = _contextPickService;
        this._extensionService = _extensionService;
        this._providers = new Map();
        this._workspaceContext = new Map();
        this._registeredPickers = this._register(new DisposableMap());
        this._lastResourceContext = new Map();
    }
    setChatContextProvider(id, picker) {
        const providerEntry = this._providers.get(id) ?? { picker: undefined };
        providerEntry.picker = picker;
        this._providers.set(id, providerEntry);
        this._registerWithPickService(id);
    }
    _registerWithPickService(id) {
        const providerEntry = this._providers.get(id);
        if (!providerEntry || !providerEntry.picker || !providerEntry.chatContextProvider) {
            return;
        }
        const title = `${providerEntry.picker.title.replace(/\.+$/, '')}...`;
        this._registeredPickers.set(id, this._contextPickService.registerChatContextItem(this._asPicker(title, providerEntry.picker.icon, id)));
    }
    registerChatContextProvider(id, selector, provider) {
        const providerEntry = this._providers.get(id) ?? { picker: undefined };
        providerEntry.chatContextProvider = { selector, provider };
        this._providers.set(id, providerEntry);
        this._registerWithPickService(id);
    }
    unregisterChatContextProvider(id) {
        this._providers.delete(id);
        this._registeredPickers.deleteAndDispose(id);
    }
    updateWorkspaceContextItems(id, items) {
        this._workspaceContext.set(id, items);
    }
    getWorkspaceContextItems() {
        const items = [];
        for (const workspaceContexts of this._workspaceContext.values()) {
            for (const item of workspaceContexts) {
                if (!item.value) {
                    continue;
                }
                items.push({
                    value: item.value,
                    name: item.label,
                    modelDescription: item.modelDescription,
                    id: item.label,
                    kind: 'workspace'
                });
            }
        }
        return items;
    }
    async contextForResource(uri) {
        return this._contextForResource(uri, false);
    }
    async _contextForResource(uri, withValue) {
        const scoredProviders = [];
        for (const providerEntry of this._providers.values()) {
            if (!providerEntry.chatContextProvider?.provider.provideChatContextForResource || (providerEntry.chatContextProvider.selector === undefined)) {
                continue;
            }
            const matchScore = score(providerEntry.chatContextProvider.selector, uri, '', true, undefined, undefined);
            scoredProviders.push({ score: matchScore, provider: providerEntry.chatContextProvider.provider });
        }
        scoredProviders.sort((a, b) => b.score - a.score);
        if (scoredProviders.length === 0 || scoredProviders[0].score <= 0) {
            return;
        }
        const context = (await scoredProviders[0].provider.provideChatContextForResource(uri, withValue, CancellationToken.None));
        if (!context) {
            return;
        }
        const contextValue = {
            value: undefined,
            name: context.label,
            icon: context.icon,
            uri: uri,
            modelDescription: context.modelDescription
        };
        this._lastResourceContext.clear();
        this._lastResourceContext.set(contextValue, { originalItem: context, provider: scoredProviders[0].provider });
        return contextValue;
    }
    async resolveChatContext(context) {
        if (context.value !== undefined) {
            return context;
        }
        const item = this._lastResourceContext.get(context);
        if (!item) {
            const resolved = await this._contextForResource(context.uri, true);
            context.value = resolved?.value;
            context.modelDescription = resolved?.modelDescription;
            return context;
        }
        else if (item.provider.resolveChatContext) {
            const resolved = await item.provider.resolveChatContext(item.originalItem, CancellationToken.None);
            if (resolved) {
                context.value = resolved.value;
                context.modelDescription = resolved.modelDescription;
                return context;
            }
        }
        return context;
    }
    _asPicker(title, icon, id) {
        const asPicker = () => {
            let providerEntry = this._providers.get(id);
            if (!providerEntry) {
                throw new Error('No chat context provider registered');
            }
            const picks = async () => {
                if (providerEntry && !providerEntry.chatContextProvider) {
                    // Activate the extension providing the chat context provider
                    await this._extensionService.activateByEvent(`onChatContextProvider:${id}`);
                    providerEntry = this._providers.get(id);
                    if (!providerEntry?.chatContextProvider) {
                        return [];
                    }
                }
                const results = await providerEntry?.chatContextProvider.provider.provideChatContext({}, CancellationToken.None);
                return results || [];
            };
            return {
                picks: picks().then(items => {
                    return items.map(item => ({
                        label: item.label,
                        iconClass: ThemeIcon.asClassName(item.icon),
                        asAttachment: async () => {
                            let contextValue = item;
                            if ((contextValue.value === undefined) && providerEntry?.chatContextProvider?.provider.resolveChatContext) {
                                contextValue = await providerEntry.chatContextProvider.provider.resolveChatContext(item, CancellationToken.None);
                            }
                            return {
                                kind: 'generic',
                                id: contextValue.label,
                                name: contextValue.label,
                                icon: contextValue.icon,
                                value: contextValue.value
                            };
                        }
                    }));
                }),
                placeholder: title
            };
        };
        const picker = {
            asPicker,
            type: 'pickerPick',
            label: title,
            icon
        };
        return picker;
    }
};
ChatContextService = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IExtensionService)
], ChatContextService);
export { ChatContextService };
registerSingleton(IChatContextService, ChatContextService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZXh0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFvQixLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUE4Qyx1QkFBdUIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRWxILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRTVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3RGLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBRzlGLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLGVBQWUsQ0FBc0Isb0JBQW9CLENBQUMsQ0FBQztBQVl2RixJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFRakQsWUFDMEIsbUJBQTZELEVBQ25FLGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUhrQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXlCO1FBQ2xELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFQeEQsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFDO1FBQzFELHNCQUFpQixHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO1FBQzFELHVCQUFrQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQXVCLENBQUMsQ0FBQztRQUN2Rix5QkFBb0IsR0FBb0csSUFBSSxHQUFHLEVBQUUsQ0FBQztJQU8xSSxDQUFDO0lBRUQsc0JBQXNCLENBQUMsRUFBVSxFQUFFLE1BQTBDO1FBQzVFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQ3ZFLGFBQWEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQzlCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVPLHdCQUF3QixDQUFDLEVBQVU7UUFDMUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNuRixPQUFPO1FBQ1IsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekksQ0FBQztJQUVELDJCQUEyQixDQUFDLEVBQVUsRUFBRSxRQUFzQyxFQUFFLFFBQThCO1FBQzdHLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBQ3ZFLGFBQWEsQ0FBQyxtQkFBbUIsR0FBRyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQztRQUMzRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxFQUFVO1FBQ3ZDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBRUQsMkJBQTJCLENBQUMsRUFBVSxFQUFFLEtBQXlCO1FBQ2hFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFRCx3QkFBd0I7UUFDdkIsTUFBTSxLQUFLLEdBQXlDLEVBQUUsQ0FBQztRQUN2RCxLQUFLLE1BQU0saUJBQWlCLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7WUFDakUsS0FBSyxNQUFNLElBQUksSUFBSSxpQkFBaUIsRUFBRSxDQUFDO2dCQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNqQixTQUFTO2dCQUNWLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLElBQUksQ0FBQztvQkFDVixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSztvQkFDaEIsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQjtvQkFDdkMsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNkLElBQUksRUFBRSxXQUFXO2lCQUNqQixDQUFDLENBQUM7WUFDSixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxHQUFRO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRU8sS0FBSyxDQUFDLG1CQUFtQixDQUFDLEdBQVEsRUFBRSxTQUFrQjtRQUM3RCxNQUFNLGVBQWUsR0FBNkQsRUFBRSxDQUFDO1FBQ3JGLEtBQUssTUFBTSxhQUFhLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3RELElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDZCQUE2QixJQUFJLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsS0FBSyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM5SSxTQUFTO1lBQ1YsQ0FBQztZQUNELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUMxRyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsYUFBYSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUNELGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsRCxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbkUsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyw2QkFBOEIsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0gsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLFlBQVksR0FBMkI7WUFDNUMsS0FBSyxFQUFFLFNBQVM7WUFDaEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ25CLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtZQUNsQixHQUFHLEVBQUUsR0FBRztZQUNSLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7U0FDMUMsQ0FBQztRQUNGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzlHLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBK0I7UUFDdkQsSUFBSSxPQUFPLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNYLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkUsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLEVBQUUsS0FBSyxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxRQUFRLEVBQUUsZ0JBQWdCLENBQUM7WUFDdEQsT0FBTyxPQUFPLENBQUM7UUFDaEIsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQzdDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25HLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsT0FBTyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO2dCQUMvQixPQUFPLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLGdCQUFnQixDQUFDO2dCQUNyRCxPQUFPLE9BQU8sQ0FBQztZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFTyxTQUFTLENBQUMsS0FBYSxFQUFFLElBQWUsRUFBRSxFQUFVO1FBQzNELE1BQU0sUUFBUSxHQUFHLEdBQXVCLEVBQUU7WUFDekMsSUFBSSxhQUFhLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7WUFDeEQsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLEtBQUssSUFBaUMsRUFBRTtnQkFDckQsSUFBSSxhQUFhLElBQUksQ0FBQyxhQUFhLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztvQkFDekQsNkRBQTZEO29CQUM3RCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMseUJBQXlCLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQzVFLGFBQWEsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDeEMsSUFBSSxDQUFDLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxDQUFDO3dCQUN6QyxPQUFPLEVBQUUsQ0FBQztvQkFDWCxDQUFDO2dCQUNGLENBQUM7Z0JBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxhQUFhLEVBQUUsbUJBQW9CLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbEgsT0FBTyxPQUFPLElBQUksRUFBRSxDQUFDO1lBQ3RCLENBQUMsQ0FBQztZQUVGLE9BQU87Z0JBQ04sS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDM0IsT0FBTyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDekIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO3dCQUNqQixTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO3dCQUMzQyxZQUFZLEVBQUUsS0FBSyxJQUErQyxFQUFFOzRCQUNuRSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUM7NEJBQ3hCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxLQUFLLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxRQUFTLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztnQ0FDNUcsWUFBWSxHQUFHLE1BQU0sYUFBYSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ2xILENBQUM7NEJBQ0QsT0FBTztnQ0FDTixJQUFJLEVBQUUsU0FBUztnQ0FDZixFQUFFLEVBQUUsWUFBWSxDQUFDLEtBQUs7Z0NBQ3RCLElBQUksRUFBRSxZQUFZLENBQUMsS0FBSztnQ0FDeEIsSUFBSSxFQUFFLFlBQVksQ0FBQyxJQUFJO2dDQUN2QixLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7NkJBQ3pCLENBQUM7d0JBQ0gsQ0FBQztxQkFDRCxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUM7Z0JBQ0YsV0FBVyxFQUFFLEtBQUs7YUFDbEIsQ0FBQztRQUNILENBQUMsQ0FBQztRQUVGLE1BQU0sTUFBTSxHQUEyQjtZQUN0QyxRQUFRO1lBQ1IsSUFBSSxFQUFFLFlBQVk7WUFDbEIsS0FBSyxFQUFFLEtBQUs7WUFDWixJQUFJO1NBQ0osQ0FBQztRQUVGLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztDQUNELENBQUE7QUE5S1ksa0JBQWtCO0lBUzVCLFdBQUEsdUJBQXVCLENBQUE7SUFDdkIsV0FBQSxpQkFBaUIsQ0FBQTtHQVZQLGtCQUFrQixDQThLOUI7O0FBRUQsaUJBQWlCLENBQUMsbUJBQW1CLEVBQUUsa0JBQWtCLG9DQUE0QixDQUFDIn0=