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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENoYXRDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENoYXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUEyQixXQUFXLEVBQThCLE1BQU0sdUJBQXVCLENBQUM7QUFDekcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV6RSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFTakQsWUFBZ0MsVUFBOEI7UUFFN0QsS0FBSyxFQUFFLENBQUM7UUFQRCxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixlQUFVLEdBQXdGLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUcsY0FBUyxHQUFXLENBQUMsQ0FBQztRQUN0QixXQUFNLEdBQXFELElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQywrQkFBK0I7UUFLNUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CLENBQUMsTUFBYyxFQUFFLEtBQXdCO1FBQ2pFLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFD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