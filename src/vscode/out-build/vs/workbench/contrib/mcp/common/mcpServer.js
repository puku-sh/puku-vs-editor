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
var McpServer_1;
import { AsyncIterableProducer, raceCancellationError, Sequencer } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Iterable } from '../../../../base/common/iterator.js';
import * as json from '../../../../base/common/json.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { LRUCache } from '../../../../base/common/map.js';
import { mapValues } from '../../../../base/common/objects.js';
import { autorun, autorunSelfDisposable, derived, disposableObservableValue, observableFromEvent, ObservablePromise, observableValue, transaction } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { createURITransformer } from '../../../../base/common/uriTransformer.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IOutputService } from '../../../services/output/common/output.js';
import { mcpActivationEvent } from './mcpConfiguration.js';
import { McpDevModeServerAttache } from './mcpDevMode.js';
import { McpIcons, parseAndValidateMcpIcon } from './mcpIcons.js';
import { IMcpRegistry } from './mcpRegistryTypes.js';
import { extensionMcpCollectionPrefix, IMcpElicitationService, IMcpSamplingService, McpConnectionFailedError, McpConnectionState, mcpPromptReplaceSpecialChars, McpResourceURI, MpcResponseError, UserInteractionRequiredError } from './mcpTypes.js';
import { MCP } from './modelContextProtocol.js';
import { UriTemplate } from './uriTemplate.js';
const emptyToolEntry = {
    serverName: undefined,
    serverIcons: [],
    serverInstructions: undefined,
    trustedAtNonce: undefined,
    nonce: undefined,
    tools: [],
    prompts: undefined,
    capabilities: undefined,
};
const toolInvalidCharRe = /[^a-z0-9_-]/gi;
let McpServerMetadataCache = class McpServerMetadataCache extends Disposable {
    constructor(scope, storageService) {
        super();
        this.didChange = false;
        this.cache = new LRUCache(128);
        this.extensionServers = new Map();
        const storageKey = 'mcpToolCache';
        this._register(storageService.onWillSaveState(() => {
            if (this.didChange) {
                storageService.store(storageKey, {
                    extensionServers: [...this.extensionServers],
                    serverTools: this.cache.toJSON(),
                }, scope, 1 /* StorageTarget.MACHINE */);
                this.didChange = false;
            }
        }));
        try {
            const cached = storageService.getObject(storageKey, scope);
            this.extensionServers = new Map(cached?.extensionServers ?? []);
            cached?.serverTools?.forEach(([k, v]) => this.cache.set(k, v));
        }
        catch {
            // ignored
        }
    }
    /** Resets the cache for primitives and extension servers */
    reset() {
        this.cache.clear();
        this.extensionServers.clear();
        this.didChange = true;
    }
    /** Gets cached primitives for a server (used before a server is running) */
    get(definitionId) {
        return this.cache.get(definitionId);
    }
    /** Sets cached primitives for a server */
    store(definitionId, entry) {
        const prev = this.get(definitionId) || emptyToolEntry;
        this.cache.set(definitionId, { ...prev, ...entry });
        this.didChange = true;
    }
    /** Gets cached servers for a collection (used for extensions, before the extension activates) */
    getServers(collectionId) {
        return this.extensionServers.get(collectionId);
    }
    /** Sets cached servers for a collection */
    storeServers(collectionId, entry) {
        if (entry) {
            this.extensionServers.set(collectionId, entry);
        }
        else {
            this.extensionServers.delete(collectionId);
        }
        this.didChange = true;
    }
};
McpServerMetadataCache = __decorate([
    __param(1, IStorageService)
], McpServerMetadataCache);
export { McpServerMetadataCache };
class CachedPrimitive {
    /**
     * @param _definitionId Server definition ID
     * @param _cache Metadata cache instance
     * @param _fromStaticDefinition Static definition that came with the server.
     * This should ONLY have a value if it should be used instead of whatever
     * is currently in the cache.
     * @param _fromCache Pull the value from the cache entry.
     * @param _toT Transform the value to the observable type.
     * @param defaultValue Default value if no cache entry.
     */
    constructor(_definitionId, _cache, _fromStaticDefinition, _fromCache, _toT, defaultValue) {
        this._definitionId = _definitionId;
        this._cache = _cache;
        this._fromStaticDefinition = _fromStaticDefinition;
        this._fromCache = _fromCache;
        this._toT = _toT;
        this.defaultValue = defaultValue;
        this.fromServerPromise = observableValue(this, undefined);
        this.fromServer = derived(reader => this.fromServerPromise.read(reader)?.promiseResult.read(reader)?.data);
        this.value = derived(reader => {
            const serverTools = this.fromServer.read(reader);
            const definitions = serverTools?.data ?? this._fromStaticDefinition?.read(reader) ?? this.fromCache?.data ?? this.defaultValue;
            return this._toT(definitions, reader);
        });
    }
    get fromCache() {
        const c = this._cache.get(this._definitionId);
        return c ? { data: this._fromCache(c), nonce: c.nonce } : undefined;
    }
    hasStaticDefinition(reader) {
        return !!this._fromStaticDefinition?.read(reader);
    }
}
let McpServer = McpServer_1 = class McpServer extends Disposable {
    /**
     * Helper function to call the function on the handler once it's online. The
     * connection started if it is not already.
     */
    static async callOn(server, fn, token = CancellationToken.None) {
        await server.start({ promptType: 'all-untrusted' }); // idempotent
        let ranOnce = false;
        let d;
        const callPromise = new Promise((resolve, reject) => {
            d = autorun(reader => {
                const connection = server.connection.read(reader);
                if (!connection || ranOnce) {
                    return;
                }
                const handler = connection.handler.read(reader);
                if (!handler) {
                    const state = connection.state.read(reader);
                    if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                        reject(new McpConnectionFailedError(`MCP server could not be started: ${state.message}`));
                        return;
                    }
                    else if (state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                        reject(new McpConnectionFailedError('MCP server has stopped'));
                        return;
                    }
                    else {
                        // keep waiting for handler
                        return;
                    }
                }
                resolve(fn(handler));
                ranOnce = true; // aggressive prevent multiple racey calls, don't dispose because autorun is sync
            });
        });
        return raceCancellationError(callPromise, token).finally(() => d.dispose());
    }
    get capabilities() {
        return this._capabilities.value;
    }
    get tools() {
        return this._tools.value;
    }
    get prompts() {
        return this._prompts.value;
    }
    get serverMetadata() {
        return this._serverMetadata.value;
    }
    get trustedAtNonce() {
        return this._primitiveCache.get(this.definition.id)?.trustedAtNonce;
    }
    set trustedAtNonce(nonce) {
        this._primitiveCache.store(this.definition.id, { trustedAtNonce: nonce });
    }
    constructor(initialCollection, definition, explicitRoots, _requiresExtensionActivation, _primitiveCache, toolPrefix, _mcpRegistry, workspacesService, _extensionService, _loggerService, _outputService, _telemetryService, _commandService, _instantiationService, _notificationService, _openerService, _samplingService, _elicitationService, environmentService) {
        super();
        this.definition = definition;
        this._requiresExtensionActivation = _requiresExtensionActivation;
        this._primitiveCache = _primitiveCache;
        this._mcpRegistry = _mcpRegistry;
        this._extensionService = _extensionService;
        this._loggerService = _loggerService;
        this._outputService = _outputService;
        this._telemetryService = _telemetryService;
        this._commandService = _commandService;
        this._instantiationService = _instantiationService;
        this._notificationService = _notificationService;
        this._openerService = _openerService;
        this._samplingService = _samplingService;
        this._elicitationService = _elicitationService;
        this._connectionSequencer = new Sequencer();
        this._connection = this._register(disposableObservableValue(this, undefined));
        this.connection = this._connection;
        this.connectionState = derived(reader => this._connection.read(reader)?.state.read(reader) ?? { state: 0 /* McpConnectionState.Kind.Stopped */ });
        this.cacheState = derived(reader => {
            const currentNonce = () => this._fullDefinitions.read(reader)?.server?.cacheNonce;
            const stateWhenServingFromCache = () => {
                if (this._tools.hasStaticDefinition(reader)) {
                    return 1 /* McpServerCacheState.Cached */;
                }
                if (!this._tools.fromCache) {
                    return 0 /* McpServerCacheState.Unknown */;
                }
                return currentNonce() === this._tools.fromCache.nonce ? 1 /* McpServerCacheState.Cached */ : 2 /* McpServerCacheState.Outdated */;
            };
            const fromServer = this._tools.fromServerPromise.read(reader);
            const connectionState = this.connectionState.read(reader);
            const isIdle = McpConnectionState.canBeStarted(connectionState.state) || !fromServer;
            if (isIdle) {
                return stateWhenServingFromCache();
            }
            const fromServerResult = fromServer?.promiseResult.read(reader);
            if (!fromServerResult) {
                return this._tools.fromCache ? 4 /* McpServerCacheState.RefreshingFromCached */ : 3 /* McpServerCacheState.RefreshingFromUnknown */;
            }
            if (fromServerResult.error) {
                return stateWhenServingFromCache();
            }
            return fromServerResult.data?.nonce === currentNonce() ? 5 /* McpServerCacheState.Live */ : 2 /* McpServerCacheState.Outdated */;
        });
        this._lastModeDebugged = false;
        /** Count of running tool calls, used to detect if sampling is during an LM call */
        this.runningToolCalls = new Set();
        this.collection = initialCollection;
        this._fullDefinitions = this._mcpRegistry.getServerDefinition(this.collection, this.definition);
        this._loggerId = `mcpServer.${definition.id}`;
        this._logger = this._register(_loggerService.createLogger(this._loggerId, { hidden: true, name: `MCP: ${definition.label}` }));
        const that = this;
        this._register(this._instantiationService.createInstance(McpDevModeServerAttache, this, { get lastModeDebugged() { return that._lastModeDebugged; } }));
        // If the logger is disposed but not deregistered, then the disposed instance
        // is reused and no-ops. todo@sandy081 this seems like a bug.
        this._register(toDisposable(() => _loggerService.deregisterLogger(this._loggerId)));
        // 1. Reflect workspaces into the MCP roots
        const workspaces = explicitRoots
            ? observableValue(this, explicitRoots.map(uri => ({ uri, name: basename(uri) })))
            : observableFromEvent(this, workspacesService.onDidChangeWorkspaceFolders, () => workspacesService.getWorkspace().folders);
        const uriTransformer = environmentService.remoteAuthority ? createURITransformer(environmentService.remoteAuthority) : undefined;
        this._register(autorun(reader => {
            const cnx = this._connection.read(reader)?.handler.read(reader);
            if (!cnx) {
                return;
            }
            cnx.roots = workspaces.read(reader)
                .filter(w => w.uri.authority === (initialCollection.remoteAuthority || ''))
                .map(w => ({
                name: w.name,
                uri: URI.from(uriTransformer?.transformIncoming(w.uri) ?? w.uri).toString()
            }));
        }));
        // 2. Populate this.tools when we connect to a server.
        this._register(autorun(reader => {
            const cnx = this._connection.read(reader);
            const handler = cnx?.handler.read(reader);
            if (handler) {
                this._populateLiveData(handler, cnx?.definition.cacheNonce, reader.store);
            }
            else if (this._tools) {
                this.resetLiveData();
            }
        }));
        const staticMetadata = derived(reader => {
            const def = this._fullDefinitions.read(reader).server;
            return def && def.cacheNonce !== this._tools.fromCache?.nonce ? def.staticMetadata : undefined;
        });
        // 3. Publish tools
        this._tools = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata
            .map(m => {
            const tools = m?.tools?.filter(t => t.availability === 0 /* McpServerStaticToolAvailability.Initial */).map(t => t.definition);
            return tools?.length ? new ObservablePromise(this._getValidatedTools(tools)) : undefined;
        })
            .map((o, reader) => o?.promiseResult.read(reader)?.data), (entry) => entry.tools, (entry) => entry.map(def => this._instantiationService.createInstance(McpTool, this, toolPrefix, def)).sort((a, b) => a.compare(b)), []);
        // 4. Publish prompts
        this._prompts = new CachedPrimitive(this.definition.id, this._primitiveCache, undefined, (entry) => entry.prompts || [], (entry) => entry.map(e => new McpPrompt(this, e)), []);
        this._serverMetadata = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata.map(m => m ? this._toStoredMetadata(m?.serverInfo, m?.instructions) : undefined), (entry) => ({ serverName: entry.serverName, serverInstructions: entry.serverInstructions, serverIcons: entry.serverIcons }), (entry) => ({ serverName: entry?.serverName, serverInstructions: entry?.serverInstructions, icons: McpIcons.fromStored(entry?.serverIcons) }), undefined);
        this._capabilities = new CachedPrimitive(this.definition.id, this._primitiveCache, staticMetadata.map(m => m?.capabilities !== undefined ? encodeCapabilities(m.capabilities) : undefined), (entry) => entry.capabilities, (entry) => entry, undefined);
    }
    readDefinitions() {
        return this._fullDefinitions;
    }
    showOutput(preserveFocus) {
        this._loggerService.setVisibility(this._loggerId, true);
        return this._outputService.showChannel(this._loggerId, preserveFocus);
    }
    resources(token) {
        const cts = new CancellationTokenSource(token);
        return new AsyncIterableProducer(async (emitter) => {
            await McpServer_1.callOn(this, async (handler) => {
                for await (const resource of handler.listResourcesIterable({}, cts.token)) {
                    emitter.emitOne(resource.map(r => new McpResource(this, r, McpIcons.fromParsed(this._parseIcons(r)))));
                    if (cts.token.isCancellationRequested) {
                        return;
                    }
                }
            });
        }, () => cts.dispose(true));
    }
    resourceTemplates(token) {
        return McpServer_1.callOn(this, async (handler) => {
            const templates = await handler.listResourceTemplates({}, token);
            return templates.map(t => new McpResourceTemplate(this, t, McpIcons.fromParsed(this._parseIcons(t))));
        }, token);
    }
    start({ interaction, autoTrustChanges, promptType, debug, errorOnUserInteraction } = {}) {
        interaction?.participants.set(this.definition.id, { s: 'unknown' });
        return this._connectionSequencer.queue(async () => {
            const activationEvent = mcpActivationEvent(this.collection.id.slice(extensionMcpCollectionPrefix.length));
            if (this._requiresExtensionActivation && !this._extensionService.activationEventIsDone(activationEvent)) {
                await this._extensionService.activateByEvent(activationEvent);
                await Promise.all(this._mcpRegistry.delegates.get()
                    .map(r => r.waitForInitialProviderPromises()));
                // This can happen if the server was created from a cached MCP server seen
                // from an extension, but then it wasn't registered when the extension activated.
                if (this._store.isDisposed) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
            }
            let connection = this._connection.get();
            if (connection && McpConnectionState.canBeStarted(connection.state.get().state)) {
                connection.dispose();
                connection = undefined;
                this._connection.set(connection, undefined);
            }
            if (!connection) {
                this._lastModeDebugged = !!debug;
                const that = this;
                connection = await this._mcpRegistry.resolveConnection({
                    interaction,
                    autoTrustChanges,
                    promptType,
                    trustNonceBearer: {
                        get trustedAtNonce() { return that.trustedAtNonce; },
                        set trustedAtNonce(nonce) { that.trustedAtNonce = nonce; }
                    },
                    logger: this._logger,
                    collectionRef: this.collection,
                    definitionRef: this.definition,
                    debug,
                    errorOnUserInteraction,
                });
                if (!connection) {
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                if (this._store.isDisposed) {
                    connection.dispose();
                    return { state: 0 /* McpConnectionState.Kind.Stopped */ };
                }
                this._connection.set(connection, undefined);
                if (connection.definition.devMode) {
                    this.showOutput();
                }
            }
            const start = Date.now();
            let state = await connection.start({
                createMessageRequestHandler: params => this._samplingService.sample({
                    isDuringToolCall: this.runningToolCalls.size > 0,
                    server: this,
                    params,
                }).then(r => r.sample),
                elicitationRequestHandler: async (req) => {
                    const serverInfo = connection.handler.get()?.serverInfo;
                    if (serverInfo) {
                        this._telemetryService.publicLog2('mcp.elicitationRequested', {
                            serverName: serverInfo.name,
                            serverVersion: serverInfo.version,
                        });
                    }
                    const r = await this._elicitationService.elicit(this, Iterable.first(this.runningToolCalls), req, CancellationToken.None);
                    r.dispose();
                    return r.value;
                }
            });
            this._telemetryService.publicLog2('mcp/serverBootState', {
                state: McpConnectionState.toKindString(state.state),
                time: Date.now() - start,
            });
            if (state.state === 3 /* McpConnectionState.Kind.Error */) {
                this.showInteractiveError(connection, state, debug);
            }
            // MCP servers that need auth can 'start' but will stop with an interaction-needed
            // error they first make a request. In this case, wait until the handler fully
            // initializes before resolving (throwing if it ends up needing auth)
            if (errorOnUserInteraction && state.state === 2 /* McpConnectionState.Kind.Running */) {
                let disposable;
                state = await new Promise((resolve, reject) => {
                    disposable = autorun(reader => {
                        const handler = connection.handler.read(reader);
                        if (handler) {
                            resolve(state);
                        }
                        const s = connection.state.read(reader);
                        if (s.state === 0 /* McpConnectionState.Kind.Stopped */ && s.reason === 'needs-user-interaction') {
                            reject(new UserInteractionRequiredError('auth'));
                        }
                        if (!McpConnectionState.isRunning(s)) {
                            resolve(s);
                        }
                    });
                }).finally(() => disposable.dispose());
            }
            return state;
        }).finally(() => {
            interaction?.participants.set(this.definition.id, { s: 'resolved' });
        });
    }
    showInteractiveError(cnx, error, debug) {
        if (error.code === 'ENOENT' && cnx.launchDefinition.type === 1 /* McpServerTransportType.Stdio */) {
            let docsLink;
            switch (cnx.launchDefinition.command) {
                case 'uvx':
                    docsLink = `https://aka.ms/vscode-mcp-install/uvx`;
                    break;
                case 'npx':
                    docsLink = `https://aka.ms/vscode-mcp-install/npx`;
                    break;
                case 'dnx':
                    docsLink = `https://aka.ms/vscode-mcp-install/dnx`;
                    break;
                case 'dotnet':
                    docsLink = `https://aka.ms/vscode-mcp-install/dotnet`;
                    break;
            }
            const options = [{
                    label: localize(9893, null),
                    run: () => this.showOutput(),
                }];
            if (cnx.definition.devMode?.debug?.type === 'debugpy' && debug) {
                this._notificationService.prompt(Severity.Error, localize(9894, null, cnx.launchDefinition.command, cnx.definition.label), [...options, {
                        label: localize(9895, null),
                        run: () => this._openerService.open(URI.parse('https://aka.ms/vscode-mcp-install/debugpy')),
                    }]);
                return;
            }
            if (docsLink) {
                options.push({
                    label: localize(9896, null, cnx.launchDefinition.command),
                    run: () => this._openerService.open(URI.parse(docsLink)),
                });
            }
            this._notificationService.prompt(Severity.Error, localize(9897, null, cnx.launchDefinition.command, cnx.definition.label), options);
        }
        else {
            this._notificationService.warn(localize(9898, null, cnx.definition.label, error.message));
        }
    }
    stop() {
        return this._connection.get()?.stop() || Promise.resolve();
    }
    /** Waits for any ongoing tools to be refreshed before resolving. */
    awaitToolRefresh() {
        return new Promise(resolve => {
            autorunSelfDisposable(reader => {
                const promise = this._tools.fromServerPromise.read(reader);
                const result = promise?.promiseResult.read(reader);
                if (result) {
                    resolve();
                }
            });
        });
    }
    resetLiveData() {
        transaction(tx => {
            this._tools.fromServerPromise.set(undefined, tx);
            this._prompts.fromServerPromise.set(undefined, tx);
        });
    }
    async _normalizeTool(originalTool) {
        const tool = {
            ...originalTool,
            serverToolName: originalTool.name,
            _icons: this._parseIcons(originalTool),
        };
        if (!tool.description) {
            // Ensure a description is provided for each tool, #243919
            this._logger.warn(`Tool ${tool.name} does not have a description. Tools must be accurately described to be called`);
            tool.description = '<empty>';
        }
        if (toolInvalidCharRe.test(tool.name)) {
            this._logger.warn(`Tool ${JSON.stringify(tool.name)} is invalid. Tools names may only contain [a-z0-9_-]`);
            tool.name = tool.name.replace(toolInvalidCharRe, '_');
        }
        let diagnostics = [];
        const toolJson = JSON.stringify(tool.inputSchema);
        try {
            const schemaUri = URI.parse('https://json-schema.org/draft-07/schema');
            diagnostics = await this._commandService.executeCommand('json.validate', schemaUri, toolJson) || [];
        }
        catch (e) {
            // ignored (error in json extension?);
        }
        if (!diagnostics.length) {
            return tool;
        }
        // because it's all one line from JSON.stringify, we can treat characters as offsets.
        const tree = json.parseTree(toolJson);
        const messages = diagnostics.map(d => {
            const node = json.findNodeAtOffset(tree, d.range[0].character);
            const path = node && `/${json.getNodePath(node).join('/')}`;
            return d.message + (path ? ` (at ${path})` : '');
        });
        return { error: messages };
    }
    async _getValidatedTools(tools) {
        let error = '';
        const validations = await Promise.all(tools.map(t => this._normalizeTool(t)));
        const validated = [];
        for (const [i, result] of validations.entries()) {
            if ('error' in result) {
                error += localize(9899, null, tools[i].name) + '\n';
                for (const message of result.error) {
                    error += `\t- ${message}\n`;
                }
                error += `\t- Schema: ${JSON.stringify(tools[i].inputSchema)}\n\n`;
            }
            else {
                validated.push(result);
            }
        }
        if (error) {
            this._logger.warn(`${tools.length - validated.length} tools have invalid JSON schemas and will be omitted`);
            warnInvalidTools(this._instantiationService, this.definition.label, error);
        }
        return validated;
    }
    /**
     * Parses incoming MCP icons and returns the resulting 'stored' record. Note
     * that this requires an active MCP server connection since we validate
     * against some of that connection's data. The icons may however be stored
     * and rehydrated later.
     */
    _parseIcons(icons) {
        const cnx = this._connection.get();
        if (!cnx) {
            return [];
        }
        return parseAndValidateMcpIcon(icons, cnx.launchDefinition, this._logger);
    }
    _setServerTools(nonce, toolsPromise, tx) {
        const toolPromiseSafe = toolsPromise.then(async (tools) => {
            this._logger.info(`Discovered ${tools.length} tools`);
            const data = await this._getValidatedTools(tools);
            this._primitiveCache.store(this.definition.id, { tools: data, nonce });
            return { data, nonce };
        });
        this._tools.fromServerPromise.set(new ObservablePromise(toolPromiseSafe), tx);
        return toolPromiseSafe;
    }
    _setServerPrompts(nonce, promptsPromise, tx) {
        const promptsPromiseSafe = promptsPromise.then((result) => {
            const data = result.map(prompt => ({
                ...prompt,
                _icons: this._parseIcons(prompt)
            }));
            this._primitiveCache.store(this.definition.id, { prompts: data, nonce });
            return { data, nonce };
        });
        this._prompts.fromServerPromise.set(new ObservablePromise(promptsPromiseSafe), tx);
        return promptsPromiseSafe;
    }
    _toStoredMetadata(serverInfo, instructions) {
        return {
            serverName: serverInfo ? serverInfo.title || serverInfo.name : undefined,
            serverInstructions: instructions,
            serverIcons: serverInfo ? this._parseIcons(serverInfo) : undefined,
        };
    }
    _setServerMetadata(nonce, { serverInfo, instructions, capabilities }, tx) {
        const serverMetadata = this._toStoredMetadata(serverInfo, instructions);
        this._serverMetadata.fromServerPromise.set(ObservablePromise.resolved({ nonce, data: serverMetadata }), tx);
        const capabilitiesEncoded = encodeCapabilities(capabilities);
        this._capabilities.fromServerPromise.set(ObservablePromise.resolved({ data: capabilitiesEncoded, nonce }), tx);
        this._primitiveCache.store(this.definition.id, { ...serverMetadata, nonce, capabilities: capabilitiesEncoded });
    }
    _populateLiveData(handler, cacheNonce, store) {
        const cts = new CancellationTokenSource();
        store.add(toDisposable(() => cts.dispose(true)));
        const updateTools = (tx) => {
            const toolPromise = handler.capabilities.tools ? handler.listTools({}, cts.token) : Promise.resolve([]);
            return this._setServerTools(cacheNonce, toolPromise, tx);
        };
        const updatePrompts = (tx) => {
            const promptsPromise = handler.capabilities.prompts ? handler.listPrompts({}, cts.token) : Promise.resolve([]);
            return this._setServerPrompts(cacheNonce, promptsPromise, tx);
        };
        store.add(handler.onDidChangeToolList(() => {
            this._logger.info('Tool list changed, refreshing tools...');
            updateTools(undefined);
        }));
        store.add(handler.onDidChangePromptList(() => {
            this._logger.info('Prompts list changed, refreshing prompts...');
            updatePrompts(undefined);
        }));
        transaction(tx => {
            this._setServerMetadata(cacheNonce, { serverInfo: handler.serverInfo, instructions: handler.serverInstructions, capabilities: handler.capabilities }, tx);
            updatePrompts(tx);
            const toolUpdate = updateTools(tx);
            toolUpdate.then(tools => {
                this._telemetryService.publicLog2('mcp/serverBoot', {
                    supportsLogging: !!handler.capabilities.logging,
                    supportsPrompts: !!handler.capabilities.prompts,
                    supportsResources: !!handler.capabilities.resources,
                    toolCount: tools.data.length,
                    serverName: handler.serverInfo.name,
                    serverVersion: handler.serverInfo.version,
                });
            });
        });
    }
};
McpServer = McpServer_1 = __decorate([
    __param(6, IMcpRegistry),
    __param(7, IWorkspaceContextService),
    __param(8, IExtensionService),
    __param(9, ILoggerService),
    __param(10, IOutputService),
    __param(11, ITelemetryService),
    __param(12, ICommandService),
    __param(13, IInstantiationService),
    __param(14, INotificationService),
    __param(15, IOpenerService),
    __param(16, IMcpSamplingService),
    __param(17, IMcpElicitationService),
    __param(18, IWorkbenchEnvironmentService)
], McpServer);
export { McpServer };
class McpPrompt {
    constructor(_server, _definition) {
        this._server = _server;
        this._definition = _definition;
        this.id = mcpPromptReplaceSpecialChars(this._server.definition.label + '.' + _definition.name);
        this.name = _definition.name;
        this.title = _definition.title;
        this.description = _definition.description;
        this.arguments = _definition.arguments || [];
        this.icons = McpIcons.fromStored(this._definition._icons);
    }
    async resolve(args, token) {
        const result = await McpServer.callOn(this._server, h => h.getPrompt({ name: this._definition.name, arguments: args }, token), token);
        return result.messages;
    }
    async complete(argument, prefix, alreadyResolved, token) {
        const result = await McpServer.callOn(this._server, h => h.complete({
            ref: { type: 'ref/prompt', name: this._definition.name },
            argument: { name: argument, value: prefix },
            context: { arguments: alreadyResolved },
        }, token), token);
        return result.completion.values;
    }
}
function encodeCapabilities(cap) {
    let out = 0;
    if (cap.logging) {
        out |= 1 /* McpCapability.Logging */;
    }
    if (cap.completions) {
        out |= 2 /* McpCapability.Completions */;
    }
    if (cap.prompts) {
        out |= 4 /* McpCapability.Prompts */;
        if (cap.prompts.listChanged) {
            out |= 8 /* McpCapability.PromptsListChanged */;
        }
    }
    if (cap.resources) {
        out |= 16 /* McpCapability.Resources */;
        if (cap.resources.subscribe) {
            out |= 32 /* McpCapability.ResourcesSubscribe */;
        }
        if (cap.resources.listChanged) {
            out |= 64 /* McpCapability.ResourcesListChanged */;
        }
    }
    if (cap.tools) {
        out |= 128 /* McpCapability.Tools */;
        if (cap.tools.listChanged) {
            out |= 256 /* McpCapability.ToolsListChanged */;
        }
    }
    return out;
}
let McpTool = class McpTool {
    get definition() { return this._definition; }
    constructor(_server, idPrefix, _definition, _elicitationService) {
        this._server = _server;
        this._definition = _definition;
        this._elicitationService = _elicitationService;
        this.referenceName = _definition.name.replaceAll('.', '_');
        this.id = (idPrefix + _definition.name).replaceAll('.', '_').slice(0, 64 /* McpToolName.MaxLength */);
        this.icons = McpIcons.fromStored(this._definition._icons);
    }
    async call(params, context, token) {
        if (context) {
            this._server.runningToolCalls.add(context);
        }
        try {
            return await this._callWithProgress(params, undefined, context, token);
        }
        finally {
            if (context) {
                this._server.runningToolCalls.delete(context);
            }
        }
    }
    async callWithProgress(params, progress, context, token) {
        if (context) {
            this._server.runningToolCalls.add(context);
        }
        try {
            return await this._callWithProgress(params, progress, context, token);
        }
        finally {
            if (context) {
                this._server.runningToolCalls.delete(context);
            }
        }
    }
    _callWithProgress(params, progress, context, token = CancellationToken.None, allowRetry = true) {
        // serverToolName is always set now, but older cache entries (from 1.99-Insiders) may not have it.
        const name = this._definition.serverToolName ?? this._definition.name;
        const progressToken = progress ? generateUuid() : undefined;
        const store = new DisposableStore();
        return McpServer.callOn(this._server, async (h) => {
            if (progress) {
                store.add(h.onDidReceiveProgressNotification((e) => {
                    if (e.params.progressToken === progressToken) {
                        progress.report({
                            message: e.params.message,
                            progress: e.params.total !== undefined && e.params.progress !== undefined ? e.params.progress / e.params.total : undefined,
                        });
                    }
                }));
            }
            const meta = { progressToken };
            if (context?.chatSessionId) {
                meta['vscode.conversationId'] = context.chatSessionId;
            }
            if (context?.chatRequestId) {
                meta['vscode.requestId'] = context.chatRequestId;
            }
            try {
                const result = await h.callTool({ name, arguments: params, _meta: meta }, token);
                // Wait for tools to refresh for dynamic servers (#261611)
                await this._server.awaitToolRefresh();
                return result;
            }
            catch (err) {
                // Handle URL elicitation required error
                if (err instanceof MpcResponseError && err.code === MCP.URL_ELICITATION_REQUIRED && allowRetry) {
                    await this._handleElicitationErr(err, context, token);
                    return this._callWithProgress(params, progress, context, token, false);
                }
                const state = this._server.connectionState.get();
                if (allowRetry && state.state === 3 /* McpConnectionState.Kind.Error */ && state.shouldRetry) {
                    return this._callWithProgress(params, progress, context, token, false);
                }
                else {
                    throw err;
                }
            }
            finally {
                store.dispose();
            }
        }, token);
    }
    async _handleElicitationErr(err, context, token) {
        const elicitations = err.data?.elicitations;
        if (Array.isArray(elicitations) && elicitations.length > 0) {
            for (const elicitation of elicitations) {
                const elicitResult = await this._elicitationService.elicit(this._server, context, elicitation, token);
                try {
                    if (elicitResult.value.action !== 'accept') {
                        throw err;
                    }
                    if (elicitResult.kind === 1 /* ElicitationKind.URL */) {
                        await elicitResult.wait;
                    }
                }
                finally {
                    elicitResult.dispose();
                }
            }
        }
    }
    compare(other) {
        return this._definition.name.localeCompare(other.definition.name);
    }
};
McpTool = __decorate([
    __param(3, IMcpElicitationService)
], McpTool);
export { McpTool };
function warnInvalidTools(instaService, serverName, errorText) {
    instaService.invokeFunction((accessor) => {
        const notificationService = accessor.get(INotificationService);
        const editorService = accessor.get(IEditorService);
        notificationService.notify({
            severity: Severity.Warning,
            message: localize(9900, null, serverName),
            actions: {
                primary: [{
                        class: undefined,
                        enabled: true,
                        id: 'mcpBadSchema.show',
                        tooltip: '',
                        label: localize(9901, null),
                        run: () => {
                            editorService.openEditor({
                                resource: undefined,
                                contents: errorText,
                            });
                        }
                    }]
            }
        });
    });
}
class McpResource {
    constructor(server, original, icons) {
        this.icons = icons;
        this.mcpUri = original.uri;
        this.title = original.title;
        this.uri = McpResourceURI.fromServer(server.definition, original.uri);
        this.name = original.name;
        this.description = original.description;
        this.mimeType = original.mimeType;
        this.sizeInBytes = original.size;
    }
}
class McpResourceTemplate {
    constructor(_server, _definition, icons) {
        this._server = _server;
        this._definition = _definition;
        this.icons = icons;
        this.name = _definition.name;
        this.description = _definition.description;
        this.mimeType = _definition.mimeType;
        this.title = _definition.title;
        this.template = UriTemplate.parse(_definition.uriTemplate);
    }
    resolveURI(vars) {
        const serverUri = this.template.resolve(vars);
        return McpResourceURI.fromServer(this._server.definition, serverUri);
    }
    async complete(templatePart, prefix, alreadyResolved, token) {
        const result = await McpServer.callOn(this._server, h => h.complete({
            ref: { type: 'ref/resource', uri: this._definition.uriTemplate },
            argument: { name: templatePart, value: prefix },
            context: {
                arguments: mapValues(alreadyResolved, v => Array.isArray(v) ? v.join('/') : v),
            },
        }, token), token);
        return result.completion.values;
    }
}
//# sourceMappingURL=mcpServer.js.map