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
//# sourceMappingURL=mcpService.js.map