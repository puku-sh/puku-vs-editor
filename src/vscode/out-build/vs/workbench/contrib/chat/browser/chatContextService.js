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
//# sourceMappingURL=chatContextService.js.map