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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { bindContextKey } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IMcpService } from './mcpTypes.js';
export var McpContextKeys;
(function (McpContextKeys) {
    McpContextKeys.serverCount = new RawContextKey('mcp.serverCount', undefined, { type: 'number', description: localize(9857, null) });
    McpContextKeys.hasUnknownTools = new RawContextKey('mcp.hasUnknownTools', undefined, { type: 'boolean', description: localize(9858, null) });
    /**
     * A context key that indicates whether there are any servers with errors.
     *
     * @type {boolean}
     * @default undefined
     * @description This key is used to track the presence of servers with errors in the MCP context.
     */
    McpContextKeys.hasServersWithErrors = new RawContextKey('mcp.hasServersWithErrors', undefined, { type: 'boolean', description: localize(9859, null) });
    McpContextKeys.toolsCount = new RawContextKey('mcp.toolsCount', undefined, { type: 'number', description: localize(9860, null) });
})(McpContextKeys || (McpContextKeys = {}));
let McpContextKeysController = class McpContextKeysController extends Disposable {
    static { this.ID = 'workbench.contrib.mcp.contextKey'; }
    constructor(mcpService, contextKeyService) {
        super();
        const ctxServerCount = McpContextKeys.serverCount.bindTo(contextKeyService);
        const ctxToolsCount = McpContextKeys.toolsCount.bindTo(contextKeyService);
        const ctxHasUnknownTools = McpContextKeys.hasUnknownTools.bindTo(contextKeyService);
        this._store.add(bindContextKey(McpContextKeys.hasServersWithErrors, contextKeyService, r => mcpService.servers.read(r).some(c => c.connectionState.read(r).state === 3 /* McpConnectionState.Kind.Error */)));
        this._store.add(autorun(r => {
            const servers = mcpService.servers.read(r);
            const serverTools = servers.map(s => s.tools.read(r));
            ctxServerCount.set(servers.length);
            ctxToolsCount.set(serverTools.reduce((count, tools) => count + tools.length, 0));
            ctxHasUnknownTools.set(mcpService.lazyCollectionState.read(r).state !== 2 /* LazyCollectionState.AllKnown */ || servers.some(s => {
                const toolState = s.cacheState.read(r);
                return toolState === 0 /* McpServerCacheState.Unknown */ || toolState === 2 /* McpServerCacheState.Outdated */ || toolState === 3 /* McpServerCacheState.RefreshingFromUnknown */;
            }));
        }));
    }
};
McpContextKeysController = __decorate([
    __param(0, IMcpService),
    __param(1, IContextKeyService)
], McpContextKeysController);
export { McpContextKeysController };
//# sourceMappingURL=mcpContextKeys.js.map