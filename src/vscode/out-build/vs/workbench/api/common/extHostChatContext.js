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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { DocumentSelector } from './extHostTypeConverters.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
let ExtHostChatContext = class ExtHostChatContext extends Disposable {
    constructor(extHostRpc) {
        super();
        this._handlePool = 0;
        this._providers = new Map();
        this._itemPool = 0;
        this._items = new Map(); // handle -> itemHandle -> item
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadChatContext);
    }
    async $provideChatContext(handle, token) {
        this._items.delete(handle); // clear previous items
        const provider = this._getProvider(handle);
        if (!provider.provideChatContextExplicit) {
            throw new Error('provideChatContext not implemented');
        }
        const result = (await provider.provideChatContextExplicit(token)) ?? [];
        const items = [];
        for (const item of result) {
            const itemHandle = this._addTrackedItem(handle, item);
            items.push({
                handle: itemHandle,
                icon: item.icon,
                label: item.label,
                modelDescription: item.modelDescription,
                value: item.value
            });
        }
        return items;
    }
    _addTrackedItem(handle, item) {
        const itemHandle = this._itemPool++;
        if (!this._items.has(handle)) {
            this._items.set(handle, new Map());
        }
        this._items.get(handle).set(itemHandle, item);
        return itemHandle;
    }
    async $provideChatContextForResource(handle, options, token) {
        const provider = this._getProvider(handle);
        if (!provider.provideChatContextForResource) {
            throw new Error('provideChatContextForResource not implemented');
        }
        const result = await provider.provideChatContextForResource({ resource: URI.revive(options.resource) }, token);
        if (!result) {
            return undefined;
        }
        const itemHandle = this._addTrackedItem(handle, result);
        const item = {
            handle: itemHandle,
            icon: result.icon,
            label: result.label,
            modelDescription: result.modelDescription,
            value: options.withValue ? result.value : undefined
        };
        if (options.withValue && !item.value && provider.resolveChatContext) {
            const resolved = await provider.resolveChatContext(result, token);
            item.value = resolved?.value;
        }
        return item;
    }
    async _doResolve(provider, context, extItem, token) {
        const extResult = await provider.resolveChatContext(extItem, token);
        const result = extResult ?? context;
        return {
            handle: context.handle,
            icon: result.icon,
            label: result.label,
            modelDescription: result.modelDescription,
            value: result.value
        };
    }
    async $resolveChatContext(handle, context, token) {
        const provider = this._getProvider(handle);
        if (!provider.resolveChatContext) {
            throw new Error('resolveChatContext not implemented');
        }
        const extItem = this._items.get(handle)?.get(context.handle);
        if (!extItem) {
            throw new Error('Chat context item not found');
        }
        return this._doResolve(provider, context, extItem, token);
    }
    registerChatContextProvider(selector, id, provider) {
        const handle = this._handlePool++;
        const disposables = new DisposableStore();
        this._listenForWorkspaceContextChanges(handle, provider, disposables);
        this._providers.set(handle, { provider, disposables });
        this._proxy.$registerChatContextProvider(handle, `${id}`, selector ? DocumentSelector.from(selector) : undefined, {}, { supportsResource: !!provider.provideChatContextForResource, supportsResolve: !!provider.resolveChatContext });
        return {
            dispose: () => {
                this._providers.delete(handle);
                this._proxy.$unregisterChatContextProvider(handle);
                disposables.dispose();
            }
        };
    }
    _listenForWorkspaceContextChanges(handle, provider, disposables) {
        if (!provider.onDidChangeWorkspaceChatContext || !provider.provideWorkspaceChatContext) {
            return;
        }
        disposables.add(provider.onDidChangeWorkspaceChatContext(async () => {
            const workspaceContexts = await provider.provideWorkspaceChatContext(CancellationToken.None);
            const resolvedContexts = [];
            for (const item of workspaceContexts ?? []) {
                const contextItem = {
                    icon: item.icon,
                    label: item.label,
                    modelDescription: item.modelDescription,
                    value: item.value,
                    handle: this._itemPool++
                };
                const resolved = await this._doResolve(provider, contextItem, item, CancellationToken.None);
                resolvedContexts.push(resolved);
            }
            this._proxy.$updateWorkspaceContextItems(handle, resolvedContexts);
        }));
    }
    _getProvider(handle) {
        if (!this._providers.has(handle)) {
            throw new Error('Chat context provider not found');
        }
        return this._providers.get(handle).provider;
    }
    dispose() {
        super.dispose();
        for (const { disposables } of this._providers.values()) {
            disposables.dispose();
        }
    }
};
ExtHostChatContext = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostChatContext);
export { ExtHostChatContext };
//# sourceMappingURL=extHostChatContext.js.map