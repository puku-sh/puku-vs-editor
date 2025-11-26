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
import { Disposable } from '../../../base/common/lifecycle.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { IChatContextService } from '../../contrib/chat/browser/chatContextService.js';
let MainThreadChatContext = class MainThreadChatContext extends Disposable {
    constructor(extHostContext, _chatContextService) {
        super();
        this._chatContextService = _chatContextService;
        this._providers = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatContext);
    }
    $registerChatContextProvider(handle, id, selector, _options, support) {
        this._providers.set(handle, { selector, support, id });
        this._chatContextService.registerChatContextProvider(id, selector, {
            provideChatContext: (token) => {
                return this._proxy.$provideChatContext(handle, token);
            },
            resolveChatContext: support.supportsResolve ? (context, token) => {
                return this._proxy.$resolveChatContext(handle, context, token);
            } : undefined,
            provideChatContextForResource: support.supportsResource ? (resource, withValue, token) => {
                return this._proxy.$provideChatContextForResource(handle, { resource, withValue }, token);
            } : undefined
        });
    }
    $unregisterChatContextProvider(handle) {
        const provider = this._providers.get(handle);
        if (!provider) {
            return;
        }
        this._chatContextService.unregisterChatContextProvider(provider.id);
        this._providers.delete(handle);
    }
    $updateWorkspaceContextItems(handle, items) {
        const provider = this._providers.get(handle);
        if (!provider) {
            return;
        }
        this._chatContextService.updateWorkspaceContextItems(provider.id, items);
    }
};
MainThreadChatContext = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatContext),
    __param(1, IChatContextService)
], MainThreadChatContext);
export { MainThreadChatContext };
//# sourceMappingURL=mainThreadChatContext.js.map