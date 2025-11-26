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
                    label: localize('mcp.command.showOutput', "Show Output"),
                    run: () => this.showOutput(),
                }];
            if (cnx.definition.devMode?.debug?.type === 'debugpy' && debug) {
                this._notificationService.prompt(Severity.Error, localize('mcpDebugPyHelp', 'The command "{0}" was not found. You can specify the path to debugpy in the `dev.debug.debugpyPath` option.', cnx.launchDefinition.command, cnx.definition.label), [...options, {
                        label: localize('mcpViewDocs', 'View Docs'),
                        run: () => this._openerService.open(URI.parse('https://aka.ms/vscode-mcp-install/debugpy')),
                    }]);
                return;
            }
            if (docsLink) {
                options.push({
                    label: localize('mcpServerInstall', 'Install {0}', cnx.launchDefinition.command),
                    run: () => this._openerService.open(URI.parse(docsLink)),
                });
            }
            this._notificationService.prompt(Severity.Error, localize('mcpServerNotFound', 'The command "{0}" needed to run {1} was not found.', cnx.launchDefinition.command, cnx.definition.label), options);
        }
        else {
            this._notificationService.warn(localize('mcpServerError', 'The MCP server {0} could not be started: {1}', cnx.definition.label, error.message));
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
                error += localize('mcpBadSchema.tool', 'Tool `{0}` has invalid JSON parameters:', tools[i].name) + '\n';
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
            message: localize('mcpBadSchema', 'MCP server `{0}` has tools with invalid parameters which will be omitted.', serverName),
            actions: {
                primary: [{
                        class: undefined,
                        enabled: true,
                        id: 'mcpBadSchema.show',
                        tooltip: '',
                        label: localize('mcpBadSchema.show', 'Show'),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxLQUFLLElBQUksTUFBTSxpQ0FBaUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFzRCxtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDclAsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNqRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEs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