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
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue, transaction } from '../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { mcpAutoStartConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { McpServer, McpServerMetadataCache } from './mcpServer.js';
import { IAutostartResult, McpServerDefinition, McpStartServerInteraction, UserInteractionRequiredError } from './mcpTypes.js';
import { startServerAndWaitForLiveTools } from './mcpTypesUtils.js';
let McpService = class McpService extends Disposable {
    get lazyCollectionState() { return this._mcpRegistry.lazyCollectionState; }
    constructor(_instantiationService, _mcpRegistry, _logService, configurationService) {
        super();
        this._instantiationService = _instantiationService;
        this._mcpRegistry = _mcpRegistry;
        this._logService = _logService;
        this.configurationService = configurationService;
        this._currentAutoStarts = new Set();
        this._servers = observableValue(this, []);
        this.servers = this._servers.map(servers => servers.map(s => s.object));
        this.userCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 0 /* StorageScope.PROFILE */));
        this.workspaceCache = this._register(_instantiationService.createInstance(McpServerMetadataCache, 1 /* StorageScope.WORKSPACE */));
        const updateThrottle = this._store.add(new RunOnceScheduler(() => this.updateCollectedServers(), 500));
        // Throttle changes so that if a collection is changed, or a server is
        // unregistered/registered, we don't stop servers unnecessarily.
        this._register(autorun(reader => {
            for (const collection of this._mcpRegistry.collections.read(reader)) {
                collection.serverDefinitions.read(reader);
            }
            updateThrottle.schedule(500);
        }));
    }
    cancelAutostart() {
        for (const cts of this._currentAutoStarts) {
            cts.cancel();
        }
    }
    autostart(_token) {
        const autoStartConfig = this.configurationService.getValue(mcpAutoStartConfig);
        if (autoStartConfig === "never" /* McpAutoStartValue.Never */) {
            return observableValue(this, IAutostartResult.Empty);
        }
        const state = observableValue(this, { working: true, starting: [], serversRequiringInteraction: [] });
        const store = new DisposableStore();
        const cts = store.add(new CancellationTokenSource(_token));
        this._currentAutoStarts.add(cts);
        store.add(toDisposable(() => {
            this._currentAutoStarts.delete(cts);
        }));
        store.add(cts.token.onCancellationRequested(() => {
            state.set(IAutostartResult.Empty, undefined);
        }));
        this._autostart(autoStartConfig, state, cts.token)
            .catch(err => {
            this._logService.error('Error during MCP autostart:', err);
            state.set(IAutostartResult.Empty, undefined);
        })
            .finally(() => store.dispose());
        return state;
    }
    async _autostart(autoStartConfig, state, token) {
        await this._activateCollections();
        if (token.isCancellationRequested) {
            return;
        }
        // don't try re-running errored servers, let the user choose if they want that
        const candidates = this.servers.get().filter(s => s.connectionState.get().state !== 3 /* McpConnectionState.Kind.Error */);
        let todo = new Set();
        if (autoStartConfig === "onlyNew" /* McpAutoStartValue.OnlyNew */) {
            todo = new Set(candidates.filter(s => s.cacheState.get() === 0 /* McpServerCacheState.Unknown */));
        }
        else if (autoStartConfig === "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */) {
            todo = new Set(candidates.filter(s => {
                const c = s.cacheState.get();
                return c === 0 /* McpServerCacheState.Unknown */ || c === 2 /* McpServerCacheState.Outdated */;
            }));
        }
        if (!todo.size) {
            state.set(IAutostartResult.Empty, undefined);
            return;
        }
        const interaction = new McpStartServerInteraction();
        const requiringInteraction = [];
        const update = () => state.set({
            working: todo.size > 0,
            starting: [...todo].map(t => t.definition),
            serversRequiringInteraction: requiringInteraction,
        }, undefined);
        update();
        await Promise.all([...todo].map(async (server, i) => {
            try {
                await startServerAndWaitForLiveTools(server, { interaction, errorOnUserInteraction: true }, token);
            }
            catch (error) {
                if (error instanceof UserInteractionRequiredError) {
                    requiringInteraction.push({ id: server.definition.id, label: server.definition.label, errorMessage: error.message });
                }
            }
            finally {
                todo.delete(server);
                if (!token.isCancellationRequested) {
                    update();
                }
            }
        }));
    }
    resetCaches() {
        this.userCache.reset();
        this.workspaceCache.reset();
    }
    resetTrust() {
        this.resetCaches(); // same difference now
    }
    async activateCollections() {
        await this._activateCollections();
    }
    async _activateCollections() {
        const collections = await this._mcpRegistry.discoverCollections();
        this.updateCollectedServers();
        return new Set(collections.map(c => c.id));
    }
    updateCollectedServers() {
        const prefixGenerator = new McpPrefixGenerator();
        const definitions = this._mcpRegistry.collections.get().flatMap(collectionDefinition => collectionDefinition.serverDefinitions.get().map(serverDefinition => {
            const toolPrefix = prefixGenerator.generate(serverDefinition.label);
            return { serverDefinition, collectionDefinition, toolPrefix };
        }));
        const nextDefinitions = new Set(definitions);
        const currentServers = this._servers.get();
        const nextServers = [];
        const pushMatch = (match, rec) => {
            nextDefinitions.delete(match);
            nextServers.push(rec);
            const connection = rec.object.connection.get();
            // if the definition was modified, stop the server; it'll be restarted again on-demand
            if (connection && !McpServerDefinition.equals(connection.definition, match.serverDefinition)) {
                rec.object.stop();
                this._logService.debug(`MCP server ${rec.object.definition.id} stopped because the definition changed`);
            }
        };
        // Transfer over any servers that are still valid.
        for (const server of currentServers) {
            const match = definitions.find(d => defsEqual(server.object, d) && server.toolPrefix === d.toolPrefix);
            if (match) {
                pushMatch(match, server);
            }
            else {
                server.object.dispose();
            }
        }
        // Create any new servers that are needed.
        for (const def of nextDefinitions) {
            const object = this._instantiationService.createInstance(McpServer, def.collectionDefinition, def.serverDefinition, def.serverDefinition.roots, !!def.collectionDefinition.lazy, def.collectionDefinition.scope === 1 /* StorageScope.WORKSPACE */ ? this.workspaceCache : this.userCache, def.toolPrefix);
            nextServers.push({ object, toolPrefix: def.toolPrefix });
        }
        transaction(tx => {
            this._servers.set(nextServers, tx);
        });
    }
    dispose() {
        this._servers.get().forEach(s => s.object.dispose());
        super.dispose();
    }
};
McpService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IMcpRegistry),
    __param(2, ILogService),
    __param(3, IConfigurationService)
], McpService);
export { McpService };
function defsEqual(server, def) {
    return server.collection.id === def.collectionDefinition.id && server.definition.id === def.serverDefinition.id;
}
// Helper class for generating unique MCP tool prefixes
class McpPrefixGenerator {
    constructor() {
        this.seenPrefixes = new Set();
    }
    generate(label) {
        const baseToolPrefix = "mcp_" /* McpToolName.Prefix */ + label.toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').slice(0, 18 /* McpToolName.MaxPrefixLen */ - "mcp_" /* McpToolName.Prefix */.length - 1);
        let toolPrefix = baseToolPrefix + '_';
        for (let i = 2; this.seenPrefixes.has(toolPrefix); i++) {
            toolPrefix = baseToolPrefix + i + '_';
        }
        this.seenPrefixes.add(toolPrefix);
        return toolPrefix;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNwRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBb0MsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsa0JBQWtCLEVBQXFCLE1BQU0sa0RBQWtELENBQUM7QUFFekcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXFILG1CQUFtQixFQUFFLHlCQUF5QixFQUFlLDRCQUE0QixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQy9QLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBSTdELElBQU0sVUFBVSxHQUFoQixNQUFNLFVBQVcsU0FBUSxVQUFVO0lBUXpDLElB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