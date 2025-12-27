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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1jcC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RNY3AudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDM0csT0FBTyxFQUFFLGlCQUFpQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzFILE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxnQ0FBZ0MsRUFBRSxxQkFBcUIsRUFBRSx3QkFBd0IsRUFBeUUsMEJBQTBCLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeFEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUcsT0FBTyxFQUFFLG1CQUFtQixFQUF5QixNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztB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