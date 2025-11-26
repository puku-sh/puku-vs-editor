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
import { DeferredPromise, raceCancellationError, Sequencer, timeout } from '../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { AUTH_SCOPE_SEPARATOR, fetchAuthorizationServerMetadata, fetchResourceMetadata, getDefaultMetadataForUrl, parseWWWAuthenticateHeader, scopesMatch } from '../../../base/common/oauth.js';
import { SSEParser } from '../../../base/common/sseParser.js';
import { URI } from '../../../base/common/uri.js';
import { vArray, vNumber, vObj, vObjAny, vOptionalProp, vString } from '../../../base/common/validation.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { canLog, ILogService, LogLevel } from '../../../platform/log/common/log.js';
import product from '../../../platform/product/common/product.js';
import { extensionPrefixedIdentifier, McpServerLaunch, UserInteractionRequiredError } from '../../contrib/mcp/common/mcpTypes.js';
import { MCP } from '../../contrib/mcp/common/modelContextProtocol.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as Convert from './extHostTypeConverters.js';
import { McpToolAvailability } from './extHostTypes.js';
import { IExtHostVariableResolverProvider } from './extHostVariableResolverService.js';
import { IExtHostWorkspace } from './extHostWorkspace.js';
export const IExtHostMpcService = createDecorator('IExtHostMpcService');
const serverDataValidation = vObj({
    label: vString(),
    version: vOptionalProp(vString()),
    metadata: vOptionalProp(vObj({
        capabilities: vOptionalProp(vObjAny()),
        serverInfo: vOptionalProp(vObjAny()),
        tools: vOptionalProp(vArray(vObj({
            availability: vNumber(),
            definition: vObjAny(),
        }))),
    })),
    authentication: vOptionalProp(vObj({
        providerId: vString(),
        scopes: vArray(vString()),
    }))
});
// Can be validated with:
// declare const _serverDataValidationTest: vscode.McpStdioServerDefinition | vscode.McpHttpServerDefinition;
// const _serverDataValidationProd: ValidatorType<typeof serverDataValidation> = _serverDataValidationTest;
let ExtHostMcpService = class ExtHostMcpService extends Disposable {
    constructor(extHostRpc, _logService, _extHostInitData, _workspaceService, _variableResolver) {
        super();
        this._logService = _logService;
        this._extHostInitData = _extHostInitData;
        this._workspaceService = _workspaceService;
        this._variableResolver = _variableResolver;
        this._initialProviderPromises = new Set();
        this._sseEventSources = this._register(new DisposableMap());
        this._unresolvedMcpServers = new Map();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMcp);
    }
    $startMcp(id, opts) {
        this._startMcp(id, McpServerLaunch.fromSerialized(opts.launch), opts.defaultCwd && URI.revive(opts.defaultCwd), opts.errorOnUserInteraction);
    }
    _startMcp(id, launch, _defaultCwd, errorOnUserInteraction) {
        if (launch.type === 2 /* McpServerTransportType.HTTP */) {
            this._sseEventSources.set(id, new McpHTTPHandle(id, launch, this._proxy, this._logService, errorOnUserInteraction));
            return;
        }
        throw new Error('not implemented');
    }
    async $substituteVariables(_workspaceFolder, value) {
        const folderURI = URI.revive(_workspaceFolder);
        const folder = folderURI && await this._workspaceService.resolveWorkspaceFolder(folderURI);
        const variableResolver = await this._variableResolver.getResolver();
        return variableResolver.resolveAsync(folder && {
            uri: folder.uri,
            name: folder.name,
            index: folder.index,
        }, value);
    }
    $stopMcp(id) {
        this._sseEventSources.get(id)
            ?.close()
            .then(() => this._didClose(id));
    }
    _didClose(id) {
        this._sseEventSources.deleteAndDispose(id);
    }
    $sendMessage(id, message) {
        this._sseEventSources.get(id)?.send(message);
    }
    async $waitForInitialCollectionProviders() {
        await Promise.all(this._initialProviderPromises);
    }
    async $resolveMcpLaunch(collectionId, label) {
        const rec = this._unresolvedMcpServers.get(collectionId);
        if (!rec) {
            return;
        }
        const server = rec.servers.find(s => s.label === label);
        if (!server) {
            return;
        }
        if (!rec.provider.resolveMcpServerDefinition) {
            return Convert.McpServerDefinition.from(server);
        }
        const resolved = await rec.provider.resolveMcpServerDefinition(server, CancellationToken.None);
        return resolved ? Convert.McpServerDefinition.from(resolved) : undefined;
    }
    /** {@link vscode.lm.registerMcpServerDefinitionProvider} */
    registerMcpConfigurationProvider(extension, id, provider) {
        const store = new DisposableStore();
        const metadata = extension.contributes?.mcpServerDefinitionProviders?.find(m => m.id === id);
        if (!metadata) {
            throw new Error(`MCP configuration providers must be registered in the contributes.mcpServerDefinitionProviders array within your package.json, but "${id}" was not`);
        }
        const mcp = {
            id: extensionPrefixedIdentifier(extension.identifier, id),
            isTrustedByDefault: true,
            label: metadata?.label ?? extension.displayName ?? extension.name,
            scope: 1 /* StorageScope.WORKSPACE */,
            canResolveLaunch: typeof provider.resolveMcpServerDefinition === 'function',
            extensionId: extension.identifier.value,
            configTarget: this._extHostInitData.remote.isRemote ? 4 /* ConfigurationTarget.USER_REMOTE */ : 2 /* ConfigurationTarget.USER */,
        };
        const update = async () => {
            const list = await provider.provideMcpServerDefinitions(CancellationToken.None);
            this._unresolvedMcpServers.set(mcp.id, { servers: list ?? [], provider });
            const servers = [];
            for (const item of list ?? []) {
                let id = ExtensionIdentifier.toKey(extension.identifier) + '/' + item.label;
                if (servers.some(s => s.id === id)) {
                    let i = 2;
                    while (servers.some(s => s.id === id + i)) {
                        i++;
                    }
                    id = id + i;
                }
                serverDataValidation.validateOrThrow(item);
                if (item.authentication) {
                    checkProposedApiEnabled(extension, 'mcpToolDefinitions');
                }
                let staticMetadata;
                const castAs2 = item;
                if (isProposedApiEnabled(extension, 'mcpToolDefinitions') && castAs2.metadata) {
                    staticMetadata = {
                        capabilities: castAs2.metadata.capabilities,
                        instructions: castAs2.metadata.instructions,
                        serverInfo: castAs2.metadata.serverInfo,
                        tools: castAs2.metadata.tools?.map(t => ({
                            availability: t.availability === McpToolAvailability.Dynamic ? 1 /* McpServerStaticToolAvailability.Dynamic */ : 0 /* McpServerStaticToolAvailability.Initial */,
                            definition: t.definition,
                        })),
                    };
                }
                servers.push({
                    id,
                    label: item.label,
                    cacheNonce: item.version || '$$NONE',
                    staticMetadata,
                    launch: Convert.McpServerDefinition.from(item),
                });
            }
            this._proxy.$upsertMcpCollection(mcp, servers);
        };
        store.add(toDisposable(() => {
            this._unresolvedMcpServers.delete(mcp.id);
            this._proxy.$deleteMcpCollection(mcp.id);
        }));
        if (provider.onDidChangeMcpServerDefinitions) {
            store.add(provider.onDidChangeMcpServerDefinitions(update));
        }
        // todo@connor4312: proposed API back-compat
        // eslint-disable-next-line local/code-no-any-casts
        if (provider.onDidChangeServerDefinitions) {
            // eslint-disable-next-line local/code-no-any-casts
            store.add(provider.onDidChangeServerDefinitions(update));
        }
        // eslint-disable-next-line local/code-no-any-casts
        if (provider.onDidChange) {
            // eslint-disable-next-line local/code-no-any-casts
            store.add(provider.onDidChange(update));
        }
        const promise = new Promise(resolve => {
            setTimeout(() => update().finally(() => {
                this._initialProviderPromises.delete(promise);
                resolve();
            }), 0);
        });
        this._initialProviderPromises.add(promise);
        return store;
    }
};
ExtHostMcpService = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostInitDataService),
    __param(3, IExtHostWorkspace),
    __param(4, IExtHostVariableResolverProvider)
], ExtHostMcpService);
export { ExtHostMcpService };
var HttpMode;
(function (HttpMode) {
    HttpMode[HttpMode["Unknown"] = 0] = "Unknown";
    HttpMode[HttpMode["Http"] = 1] = "Http";
    HttpMode[HttpMode["SSE"] = 2] = "SSE";
})(HttpMode || (HttpMode = {}));
const MAX_FOLLOW_REDIRECTS = 5;
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
/**
 * Implementation of both MCP HTTP Streaming as well as legacy SSE.
 *
 * The first request will POST to the endpoint, assuming HTTP streaming. If the
 * server is legacy SSE, it should return some 4xx status in that case,
 * and we'll automatically fall back to SSE and res
 */
export class McpHTTPHandle extends Disposable {
    constructor(_id, _launch, _proxy, _logService, _errorOnUserInteraction) {
        super();
        this._id = _id;
        this._launch = _launch;
        this._proxy = _proxy;
        this._logService = _logService;
        this._errorOnUserInteraction = _errorOnUserInteraction;
        this._requestSequencer = new Sequencer();
        this._postEndpoint = new DeferredPromise();
        this._mode = { value: 0 /* HttpMode.Unknown */ };
        this._cts = new CancellationTokenSource();
        this._abortCtrl = new AbortController();
        this._didSendClose = false;
        this._register(toDisposable(() => {
            this._abortCtrl.abort();
            this._cts.dispose(true);
        }));
        this._proxy.$onDidChangeState(this._id, { state: 2 /* McpConnectionState.Kind.Running */ });
    }
    async send(message) {
        try {
            if (this._mode.value === 0 /* HttpMode.Unknown */) {
                await this._requestSequencer.queue(() => this._send(message));
            }
            else {
                await this._send(message);
            }
        }
        catch (err) {
            const msg = `Error sending message to ${this._launch.uri}: ${String(err)}`;
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: msg });
        }
    }
    async close() {
        if (this._mode.value === 1 /* HttpMode.Http */ && this._mode.sessionId && !this._didSendClose) {
            this._didSendClose = true;
            try {
                await this._closeSession(this._mode.sessionId);
            }
            catch {
                // ignored -- already logged
            }
        }
        this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
    }
    async _closeSession(sessionId) {
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Mcp-Session-Id': sessionId,
        };
        await this._addAuthHeader(headers);
        // no fetch with retry here -- don't try to auth if we get an auth failure
        await this._fetch(this._launch.uri.toString(true), {
            method: 'DELETE',
            headers,
        });
    }
    _send(message) {
        if (this._mode.value === 2 /* HttpMode.SSE */) {
            return this._sendLegacySSE(this._mode.endpoint, message);
        }
        else {
            return this._sendStreamableHttp(message, this._mode.value === 1 /* HttpMode.Http */ ? this._mode.sessionId : undefined);
        }
    }
    /**
     * Sends a streamable-HTTP request.
     * 1. Posts to the endpoint
     * 2. Updates internal state as needed. Falls back to SSE if appropriate.
     * 3. If the response body is empty, JSON, or a JSON stream, handle it appropriately.
     */
    async _sendStreamableHttp(message, sessionId) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
            Accept: 'text/event-stream, application/json',
        };
        if (sessionId) {
            headers['Mcp-Session-Id'] = sessionId;
        }
        await this._addAuthHeader(headers);
        const res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
            method: 'POST',
            headers,
            body: asBytes,
        }, headers);
        const wasUnknown = this._mode.value === 0 /* HttpMode.Unknown */;
        // Mcp-Session-Id is the strongest signal that we're in streamable HTTP mode
        const nextSessionId = res.headers.get('Mcp-Session-Id');
        if (nextSessionId) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: nextSessionId };
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */ &&
            // We care about 4xx errors...
            res.status >= 400 && res.status < 500
            // ...except for auth errors
            && !isAuthStatusCode(res.status)) {
            this._log(LogLevel.Info, `${res.status} status sending message to ${this._launch.uri}, will attempt to fall back to legacy SSE`);
            this._sseFallbackWithMessage(message);
            return;
        }
        if (res.status >= 300) {
            // "When a client receives HTTP 404 in response to a request containing an Mcp-Session-Id, it MUST start a new session by sending a new InitializeRequest without a session ID attached"
            // Though this says only 404, some servers send 400s as well, including their example
            // https://github.com/modelcontextprotocol/typescript-sdk/issues/389
            const retryWithSessionId = this._mode.value === 1 /* HttpMode.Http */ && !!this._mode.sessionId && (res.status === 400 || res.status === 404);
            this._proxy.$onDidChangeState(this._id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `${res.status} status sending message to ${this._launch.uri}: ${await this._getErrText(res)}` + (retryWithSessionId ? `; will retry with new session ID` : ''),
                shouldRetry: retryWithSessionId,
            });
            return;
        }
        if (this._mode.value === 0 /* HttpMode.Unknown */) {
            this._mode = { value: 1 /* HttpMode.Http */, sessionId: undefined };
        }
        if (wasUnknown) {
            this._attachStreamableBackchannel();
        }
        await this._handleSuccessfulStreamableHttp(res, message);
    }
    async _sseFallbackWithMessage(message) {
        const endpoint = await this._attachSSE();
        if (endpoint) {
            this._mode = { value: 2 /* HttpMode.SSE */, endpoint };
            await this._sendLegacySSE(endpoint, message);
        }
    }
    async _populateAuthMetadata(mcpUrl, originalResponse) {
        // If there is a resource_metadata challenge, use that to get the oauth server. This is done in 2 steps.
        // First, extract the resource_metada challenge from the WWW-Authenticate header (if available)
        const { resourceMetadataChallenge, scopesChallenge: scopesChallengeFromHeader } = this._parseWWWAuthenticateHeader(originalResponse);
        // Second, fetch the resource metadata either from the challenge URL or from well-known URIs
        let serverMetadataUrl;
        let resource;
        let scopesChallenge = scopesChallengeFromHeader;
        try {
            const resourceMetadata = await fetchResourceMetadata(mcpUrl, resourceMetadataChallenge, {
                sameOriginHeaders: {
                    ...Object.fromEntries(this._launch.headers),
                    'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
                },
                fetch: (url, init) => this._fetch(url, init)
            });
            // TODO:@TylerLeonhardt support multiple authorization servers
            // Consider using one that has an auth provider first, over the dynamic flow
            serverMetadataUrl = resourceMetadata.authorization_servers?.[0];
            this._log(LogLevel.Debug, `Using auth server metadata url: ${serverMetadataUrl}`);
            scopesChallenge ??= resourceMetadata.scopes_supported;
            resource = resourceMetadata;
        }
        catch (e) {
            this._log(LogLevel.Debug, `Could not fetch resource metadata: ${String(e)}`);
        }
        const baseUrl = new URL(originalResponse.url).origin;
        // If we are not given a resource_metadata, see if the well-known server metadata is available
        // on the base url.
        let additionalHeaders = {};
        if (!serverMetadataUrl) {
            serverMetadataUrl = baseUrl;
            // Maintain the launch headers when talking to the MCP origin.
            additionalHeaders = {
                ...Object.fromEntries(this._launch.headers),
                'MCP-Protocol-Version': MCP.LATEST_PROTOCOL_VERSION
            };
        }
        try {
            this._log(LogLevel.Debug, `Fetching auth server metadata for: ${serverMetadataUrl} ...`);
            const serverMetadataResponse = await fetchAuthorizationServerMetadata(serverMetadataUrl, {
                additionalHeaders,
                fetch: (url, init) => this._fetch(url, init)
            });
            this._log(LogLevel.Info, 'Populated auth metadata');
            this._authMetadata = {
                authorizationServer: URI.parse(serverMetadataUrl),
                serverMetadata: serverMetadataResponse,
                resourceMetadata: resource,
                scopes: scopesChallenge
            };
            return;
        }
        catch (e) {
            this._log(LogLevel.Warning, `Error populating auth server metadata for ${serverMetadataUrl}: ${String(e)}`);
        }
        // If there's no well-known server metadata, then use the default values based off of the url.
        const defaultMetadata = getDefaultMetadataForUrl(new URL(baseUrl));
        this._authMetadata = {
            authorizationServer: URI.parse(baseUrl),
            serverMetadata: defaultMetadata,
            resourceMetadata: resource,
            scopes: scopesChallenge
        };
        this._log(LogLevel.Info, 'Using default auth metadata');
    }
    async _handleSuccessfulStreamableHttp(res, message) {
        if (res.status === 202) {
            return; // no body
        }
        const contentType = res.headers.get('Content-Type')?.toLowerCase() || '';
        if (contentType.startsWith('text/event-stream')) {
            const parser = new SSEParser(event => {
                if (event.type === 'message') {
                    this._proxy.$onDidReceiveMessage(this._id, event.data);
                }
                else if (event.type === 'endpoint') {
                    // An SSE server that didn't correctly return a 4xx status when we POSTed
                    this._log(LogLevel.Warning, `Received SSE endpoint from a POST to ${this._launch.uri}, will fall back to legacy SSE`);
                    this._sseFallbackWithMessage(message);
                    throw new CancellationError(); // just to end the SSE stream
                }
            });
            try {
                await this._doSSE(parser, res);
            }
            catch (err) {
                this._log(LogLevel.Warning, `Error reading SSE stream: ${String(err)}`);
            }
        }
        else if (contentType.startsWith('application/json')) {
            this._proxy.$onDidReceiveMessage(this._id, await res.text());
        }
        else {
            const responseBody = await res.text();
            if (isJSON(responseBody)) { // try to read as JSON even if the server didn't set the content type
                this._proxy.$onDidReceiveMessage(this._id, responseBody);
            }
            else {
                this._log(LogLevel.Warning, `Unexpected ${res.status} response for request: ${responseBody}`);
            }
        }
    }
    /**
     * Attaches the SSE backchannel that streamable HTTP servers can use
     * for async notifications. This is a "MAY" support, so if the server gives
     * us a 4xx code, we'll stop trying to connect..
     */
    async _attachStreamableBackchannel() {
        let lastEventId;
        let canReconnectAt;
        for (let retry = 0; !this._store.isDisposed; retry++) {
            if (canReconnectAt !== undefined) {
                await timeout(Math.max(0, canReconnectAt - Date.now()), this._cts.token);
                canReconnectAt = undefined;
            }
            else {
                await timeout(Math.min(retry * 1000, 30_000), this._cts.token);
            }
            let res;
            try {
                const headers = {
                    ...Object.fromEntries(this._launch.headers),
                    'Accept': 'text/event-stream',
                };
                await this._addAuthHeader(headers);
                if (this._mode.value === 1 /* HttpMode.Http */ && this._mode.sessionId !== undefined) {
                    headers['Mcp-Session-Id'] = this._mode.sessionId;
                }
                if (lastEventId) {
                    headers['Last-Event-ID'] = lastEventId;
                }
                res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                    method: 'GET',
                    headers,
                }, headers);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error connecting to ${this._launch.uri} for async notifications, will retry`);
                continue;
            }
            if (res.status >= 400) {
                this._log(LogLevel.Debug, `${res.status} status connecting to ${this._launch.uri} for async notifications; they will be disabled: ${await this._getErrText(res)}`);
                return;
            }
            // Only reset the retry counter if we definitely get an event stream to avoid
            // spamming servers that (incorrectly) don't return one from this endpoint.
            if (res.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
                retry = 0;
            }
            const parser = new SSEParser(event => {
                if (event.retry) {
                    canReconnectAt = Date.now() + event.retry;
                }
                if (event.type === 'message' && event.data) {
                    this._proxy.$onDidReceiveMessage(this._id, event.data);
                }
                if (event.id) {
                    lastEventId = event.id;
                }
            });
            try {
                await this._doSSE(parser, res);
            }
            catch (e) {
                this._log(LogLevel.Info, `Error reading from async stream, we will reconnect: ${e}`);
            }
        }
    }
    /**
     * Starts a legacy SSE attachment, where the SSE response is the session lifetime.
     * Unlike `_attachStreamableBackchannel`, this fails the server if it disconnects.
     */
    async _attachSSE() {
        const postEndpoint = new DeferredPromise();
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Accept': 'text/event-stream',
        };
        await this._addAuthHeader(headers);
        let res;
        try {
            res = await this._fetchWithAuthRetry(this._launch.uri.toString(true), {
                method: 'GET',
                headers,
            }, headers);
            if (res.status >= 300) {
                this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `${res.status} status connecting to ${this._launch.uri} as SSE: ${await this._getErrText(res)}` });
                return;
            }
        }
        catch (e) {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error connecting to ${this._launch.uri} as SSE: ${e}` });
            return;
        }
        const parser = new SSEParser(event => {
            if (event.type === 'message') {
                this._proxy.$onDidReceiveMessage(this._id, event.data);
            }
            else if (event.type === 'endpoint') {
                postEndpoint.complete(new URL(event.data, this._launch.uri.toString(true)).toString());
            }
        });
        this._register(toDisposable(() => postEndpoint.cancel()));
        this._doSSE(parser, res).catch(err => {
            this._proxy.$onDidChangeState(this._id, { state: 3 /* McpConnectionState.Kind.Error */, message: `Error reading SSE stream: ${String(err)}` });
        });
        return postEndpoint.p;
    }
    /**
     * Sends a legacy SSE message to the server. The response is always empty and
     * is otherwise received in {@link _attachSSE}'s loop.
     */
    async _sendLegacySSE(url, message) {
        const asBytes = new TextEncoder().encode(message);
        const headers = {
            ...Object.fromEntries(this._launch.headers),
            'Content-Type': 'application/json',
            'Content-Length': String(asBytes.length),
        };
        await this._addAuthHeader(headers);
        const res = await this._fetch(url, {
            method: 'POST',
            headers,
            body: asBytes,
        });
        if (res.status >= 300) {
            this._log(LogLevel.Warning, `${res.status} status sending message to ${this._postEndpoint}: ${await this._getErrText(res)}`);
        }
    }
    /** Generic handle to pipe a response into an SSE parser. */
    async _doSSE(parser, res) {
        if (!res.body) {
            return;
        }
        const reader = res.body.getReader();
        let chunk;
        do {
            try {
                chunk = await raceCancellationError(reader.read(), this._cts.token);
            }
            catch (err) {
                reader.cancel();
                if (this._store.isDisposed) {
                    return;
                }
                else {
                    throw err;
                }
            }
            if (chunk.value) {
                parser.feed(chunk.value);
            }
        } while (!chunk.done);
    }
    async _addAuthHeader(headers, forceNewRegistration) {
        if (this._authMetadata) {
            try {
                const authDetails = {
                    authorizationServer: this._authMetadata.authorizationServer.toJSON(),
                    authorizationServerMetadata: this._authMetadata.serverMetadata,
                    resourceMetadata: this._authMetadata.resourceMetadata,
                    scopes: this._authMetadata.scopes
                };
                const token = await this._proxy.$getTokenFromServerMetadata(this._id, authDetails, {
                    errorOnUserInteraction: this._errorOnUserInteraction,
                    forceNewRegistration
                });
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }
            catch (e) {
                if (UserInteractionRequiredError.is(e)) {
                    this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */, reason: 'needs-user-interaction' });
                    throw new CancellationError();
                }
                this._log(LogLevel.Warning, `Error getting token from server metadata: ${String(e)}`);
            }
        }
        if (this._launch.authentication) {
            try {
                this._log(LogLevel.Debug, `Using provided authentication config: providerId=${this._launch.authentication.providerId}, scopes=${this._launch.authentication.scopes.join(', ')}`);
                const token = await this._proxy.$getTokenForProviderId(this._id, this._launch.authentication.providerId, this._launch.authentication.scopes, {
                    errorOnUserInteraction: this._errorOnUserInteraction,
                    forceNewRegistration
                });
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                    this._log(LogLevel.Info, 'Successfully obtained token from provided authentication config');
                }
            }
            catch (e) {
                if (UserInteractionRequiredError.is(e)) {
                    this._proxy.$onDidChangeState(this._id, { state: 0 /* McpConnectionState.Kind.Stopped */, reason: 'needs-user-interaction' });
                    throw new CancellationError();
                }
                this._log(LogLevel.Warning, `Error getting token from provided authentication config: ${String(e)}`);
            }
        }
        return headers;
    }
    _log(level, message) {
        if (!this._store.isDisposed) {
            this._proxy.$onDidPublishLog(this._id, level, message);
        }
    }
    _parseWWWAuthenticateHeader(response) {
        let resourceMetadataChallenge;
        let scopesChallenge;
        if (response.headers.has('WWW-Authenticate')) {
            const authHeader = response.headers.get('WWW-Authenticate');
            const challenges = parseWWWAuthenticateHeader(authHeader);
            for (const challenge of challenges) {
                if (challenge.scheme === 'Bearer') {
                    if (!resourceMetadataChallenge && challenge.params['resource_metadata']) {
                        resourceMetadataChallenge = challenge.params['resource_metadata'];
                        this._log(LogLevel.Debug, `Found resource_metadata challenge in WWW-Authenticate header: ${resourceMetadataChallenge}`);
                    }
                    if (!scopesChallenge && challenge.params['scope']) {
                        const scopes = challenge.params['scope'].split(AUTH_SCOPE_SEPARATOR).filter(s => s.trim().length);
                        if (scopes.length) {
                            this._log(LogLevel.Debug, `Found scope challenge in WWW-Authenticate header: ${challenge.params['scope']}`);
                            scopesChallenge = scopes;
                        }
                    }
                    if (resourceMetadataChallenge && scopesChallenge) {
                        break;
                    }
                }
            }
        }
        return { resourceMetadataChallenge, scopesChallenge };
    }
    async _getErrText(res) {
        try {
            return await res.text();
        }
        catch {
            return res.statusText;
        }
    }
    /**
     * Helper method to perform fetch with authentication retry logic.
     * If the initial request returns an auth error and we don't have auth metadata,
     * it will populate the auth metadata and retry once.
     * If we already have auth metadata, check if the scopes changed and update them.
     */
    async _fetchWithAuthRetry(mcpUrl, init, headers) {
        const doFetch = () => this._fetch(mcpUrl, init);
        let res = await doFetch();
        if (isAuthStatusCode(res.status)) {
            if (!this._authMetadata) {
                await this._populateAuthMetadata(mcpUrl, res);
                await this._addAuthHeader(headers);
                if (headers['Authorization']) {
                    // Update the headers in the init object
                    init.headers = headers;
                    res = await doFetch();
                }
            }
            else {
                // We have auth metadata, but got an auth error. Check if the scopes changed.
                const { scopesChallenge } = this._parseWWWAuthenticateHeader(res);
                if (!scopesMatch(scopesChallenge, this._authMetadata.scopes)) {
                    this._log(LogLevel.Debug, `Scopes changed from ${JSON.stringify(this._authMetadata.scopes)} to ${JSON.stringify(scopesChallenge)}, updating and retrying`);
                    this._authMetadata.scopes = scopesChallenge;
                    await this._addAuthHeader(headers);
                    if (headers['Authorization']) {
                        // Update the headers in the init object
                        init.headers = headers;
                        res = await doFetch();
                    }
                }
            }
        }
        // If we have an Authorization header and still get an auth error, we should retry with a new auth registration
        if (headers['Authorization'] && isAuthStatusCode(res.status)) {
            await this._addAuthHeader(headers, true);
            res = await doFetch();
        }
        return res;
    }
    async _fetch(url, init) {
        init.headers['user-agent'] = `${product.nameLong}/${product.version}`;
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const traceObj = { ...init, headers: { ...init.headers } };
            if (traceObj.body) {
                traceObj.body = new TextDecoder().decode(traceObj.body);
            }
            if (traceObj.headers?.Authorization) {
                traceObj.headers.Authorization = '***'; // don't log the auth header
            }
            this._log(LogLevel.Trace, `Fetching ${url} with options: ${JSON.stringify(traceObj)}`);
        }
        let currentUrl = url;
        let response;
        for (let redirectCount = 0; redirectCount < MAX_FOLLOW_REDIRECTS; redirectCount++) {
            response = await this._fetchInternal(currentUrl, {
                ...init,
                signal: this._abortCtrl.signal,
                redirect: 'manual'
            });
            // Check for redirect status codes (301, 302, 303, 307, 308)
            if (!REDIRECT_STATUS_CODES.includes(response.status)) {
                break;
            }
            const location = response.headers.get('location');
            if (!location) {
                break;
            }
            const nextUrl = new URL(location, currentUrl).toString();
            this._log(LogLevel.Trace, `Redirect (${response.status}) from ${currentUrl} to ${nextUrl}`);
            currentUrl = nextUrl;
            // Per fetch spec, for 303 always use GET, keep method unless original was POST and 301/302, then GET.
            if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) {
                init.method = 'GET';
                delete init.body;
            }
        }
        if (canLog(this._logService.getLevel(), LogLevel.Trace)) {
            const headers = {};
            response.headers.forEach((value, key) => { headers[key] = value; });
            this._log(LogLevel.Trace, `Fetched ${currentUrl}: ${JSON.stringify({
                status: response.status,
                headers: headers,
            })}`);
        }
        return response;
    }
    _fetchInternal(url, init) {
        return fetch(url, init);
    }
}
function isJSON(str) {
    try {
        JSON.parse(str);
        return true;
    }
    catch (e) {
        return false;
    }
}
function isAuthStatusCode(status) {
    return status === 401 || status === 403;
}
//# sourceMappingURL=extHostMcp.js.map