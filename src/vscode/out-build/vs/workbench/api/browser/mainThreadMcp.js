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
import { mapFindFirst } from '../../../base/common/arraysFind.js';
import { disposableTimeout } from '../../../base/common/async.js';
import { CancellationError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { observableValue } from '../../../base/common/observable.js';
import Severity from '../../../base/common/severity.js';
import { URI } from '../../../base/common/uri.js';
import * as nls from '../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { IMcpRegistry } from '../../contrib/mcp/common/mcpRegistryTypes.js';
import { extensionPrefixedIdentifier, McpConnectionState, McpServerDefinition, McpServerLaunch, UserInteractionRequiredError } from '../../contrib/mcp/common/mcpTypes.js';
import { IAuthenticationMcpAccessService } from '../../services/authentication/browser/authenticationMcpAccessService.js';
import { IAuthenticationMcpService } from '../../services/authentication/browser/authenticationMcpService.js';
import { IAuthenticationMcpUsageService } from '../../services/authentication/browser/authenticationMcpUsageService.js';
import { IAuthenticationService } from '../../services/authentication/common/authentication.js';
import { IDynamicAuthenticationProviderStorageService } from '../../services/authentication/common/dynamicAuthenticationProviderStorage.js';
import { extensionHostKindToString } from '../../services/extensions/common/extensionHostKind.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadMcp = class MainThreadMcp extends Disposable {
    constructor(_extHostContext, _mcpRegistry, dialogService, _authenticationService, authenticationMcpServersService, authenticationMCPServerAccessService, authenticationMCPServerUsageService, _dynamicAuthenticationProviderStorageService, _extensionService, _contextKeyService) {
        super();
        this._extHostContext = _extHostContext;
        this._mcpRegistry = _mcpRegistry;
        this.dialogService = dialogService;
        this._authenticationService = _authenticationService;
        this.authenticationMcpServersService = authenticationMcpServersService;
        this.authenticationMCPServerAccessService = authenticationMCPServerAccessService;
        this.authenticationMCPServerUsageService = authenticationMCPServerUsageService;
        this._dynamicAuthenticationProviderStorageService = _dynamicAuthenticationProviderStorageService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._serverIdCounter = 0;
        this._servers = new Map();
        this._serverDefinitions = new Map();
        this._serverAuthTracking = new McpServerAuthTracker();
        this._collectionDefinitions = this._register(new DisposableMap());
        this._register(_authenticationService.onDidChangeSessions(e => this._onDidChangeAuthSessions(e.providerId, e.label)));
        const proxy = this._proxy = _extHostContext.getProxy(ExtHostContext.ExtHostMcp);
        this._register(this._mcpRegistry.registerDelegate({
            // Prefer Node.js extension hosts when they're available. No CORS issues etc.
            priority: _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */ ? 0 : 1,
            waitForInitialProviderPromises() {
                return proxy.$waitForInitialCollectionProviders();
            },
            canStart(collection, serverDefinition) {
                if (collection.remoteAuthority !== _extHostContext.remoteAuthority) {
                    return false;
                }
                if (serverDefinition.launch.type === 1 /* McpServerTransportType.Stdio */ && _extHostContext.extensionHostKind === 2 /* ExtensionHostKind.LocalWebWorker */) {
                    return false;
                }
                return true;
            },
            async substituteVariables(serverDefinition, launch) {
                const ser = await proxy.$substituteVariables(serverDefinition.variableReplacement?.folder?.uri, McpServerLaunch.toSerialized(launch));
                return McpServerLaunch.fromSerialized(ser);
            },
            start: (_collection, serverDefiniton, resolveLaunch, options) => {
                const id = ++this._serverIdCounter;
                const launch = new ExtHostMcpServerLaunch(_extHostContext.extensionHostKind, () => proxy.$stopMcp(id), msg => proxy.$sendMessage(id, JSON.stringify(msg)));
                this._servers.set(id, launch);
                this._serverDefinitions.set(id, serverDefiniton);
                proxy.$startMcp(id, {
                    launch: resolveLaunch,
                    defaultCwd: serverDefiniton.variableReplacement?.folder?.uri,
                    errorOnUserInteraction: options?.errorOnUserInteraction,
                });
                return launch;
            },
        }));
    }
    $upsertMcpCollection(collection, serversDto) {
        const servers = serversDto.map(McpServerDefinition.fromSerialized);
        const existing = this._collectionDefinitions.get(collection.id);
        if (existing) {
            existing.servers.set(servers, undefined);
        }
        else {
            const serverDefinitions = observableValue('mcpServers', servers);
            const extensionId = new ExtensionIdentifier(collection.extensionId);
            const store = new DisposableStore();
            const handle = store.add(new MutableDisposable());
            const register = () => {
                handle.value ??= this._mcpRegistry.registerCollection({
                    ...collection,
                    source: extensionId,
                    resolveServerLanch: collection.canResolveLaunch ? (async (def) => {
                        const r = await this._proxy.$resolveMcpLaunch(collection.id, def.label);
                        return r ? McpServerLaunch.fromSerialized(r) : undefined;
                    }) : undefined,
                    trustBehavior: collection.isTrustedByDefault ? 0 /* McpServerTrust.Kind.Trusted */ : 1 /* McpServerTrust.Kind.TrustedOnNonce */,
                    remoteAuthority: this._extHostContext.remoteAuthority,
                    serverDefinitions,
                });
            };
            const whenClauseStr = mapFindFirst(this._extensionService.extensions, e => ExtensionIdentifier.equals(extensionId, e.identifier)
                ? e.contributes?.mcpServerDefinitionProviders?.find(p => extensionPrefixedIdentifier(extensionId, p.id) === collection.id)?.when
                : undefined);
            const whenClause = whenClauseStr && ContextKeyExpr.deserialize(whenClauseStr);
            if (!whenClause) {
                register();
            }
            else {
                const evaluate = () => {
                    if (this._contextKeyService.contextMatchesRules(whenClause)) {
                        register();
                    }
                    else {
                        handle.clear();
                    }
                };
                store.add(this._contextKeyService.onDidChangeContext(evaluate));
                evaluate();
            }
            this._collectionDefinitions.set(collection.id, {
                servers: serverDefinitions,
                dispose: () => store.dispose(),
            });
        }
    }
    $deleteMcpCollection(collectionId) {
        this._collectionDefinitions.deleteAndDispose(collectionId);
    }
    $onDidChangeState(id, update) {
        const server = this._servers.get(id);
        if (!server) {
            return;
        }
        server.state.set(update, undefined);
        if (!McpConnectionState.isRunning(update)) {
            server.dispose();
            this._servers.delete(id);
            this._serverDefinitions.delete(id);
            this._serverAuthTracking.untrack(id);
        }
    }
    $onDidPublishLog(id, level, log) {
        if (typeof level === 'string') {
            level = LogLevel.Info;
            log = level;
        }
        this._servers.get(id)?.pushLog(level, log);
    }
    $onDidReceiveMessage(id, message) {
        this._servers.get(id)?.pushMessage(message);
    }
    async $getTokenForProviderId(id, providerId, scopes, options = {}) {
        const server = this._serverDefinitions.get(id);
        if (!server) {
            return undefined;
        }
        return this._getSessionForProvider(id, server, providerId, scopes, undefined, options.errorOnUserInteraction);
    }
    async $getTokenFromServerMetadata(id, authDetails, { errorOnUserInteraction, forceNewRegistration } = {}) {
        const server = this._serverDefinitions.get(id);
        if (!server) {
            return undefined;
        }
        const authorizationServer = URI.revive(authDetails.authorizationServer);
        const resourceServer = authDetails.resourceMetadata?.resource ? URI.parse(authDetails.resourceMetadata.resource) : undefined;
        const resolvedScopes = authDetails.scopes ?? authDetails.resourceMetadata?.scopes_supported ?? authDetails.authorizationServerMetadata.scopes_supported ?? [];
        let providerId = await this._authenticationService.getOrActivateProviderIdForServer(authorizationServer, resourceServer);
        if (forceNewRegistration && providerId) {
            this._authenticationService.unregisterAuthenticationProvider(providerId);
            // TODO: Encapsulate this and the unregister in one call in the auth service
            await this._dynamicAuthenticationProviderStorageService.removeDynamicProvider(providerId);
            providerId = undefined;
        }
        if (!providerId) {
            const provider = await this._authenticationService.createDynamicAuthenticationProvider(authorizationServer, authDetails.authorizationServerMetadata, authDetails.resourceMetadata);
            if (!provider) {
                return undefined;
            }
            providerId = provider.id;
        }
        return this._getSessionForProvider(id, server, providerId, resolvedScopes, authorizationServer, errorOnUserInteraction);
    }
    async _getSessionForProvider(serverId, server, providerId, scopes, authorizationServer, errorOnUserInteraction = false) {
        const sessions = await this._authenticationService.getSessions(providerId, scopes, { authorizationServer }, true);
        const accountNamePreference = this.authenticationMcpServersService.getAccountPreference(server.id, providerId);
        let matchingAccountPreferenceSession;
        if (accountNamePreference) {
            matchingAccountPreferenceSession = sessions.find(session => session.account.label === accountNamePreference);
        }
        const provider = this._authenticationService.getProvider(providerId);
        let session;
        if (sessions.length) {
            // If we have an existing session preference, use that. If not, we'll return any valid session at the end of this function.
            if (matchingAccountPreferenceSession && this.authenticationMCPServerAccessService.isAccessAllowed(providerId, matchingAccountPreferenceSession.account.label, server.id)) {
                this.authenticationMCPServerUsageService.addAccountUsage(providerId, matchingAccountPreferenceSession.account.label, scopes, server.id, server.label);
                this._serverAuthTracking.track(providerId, serverId, scopes);
                return matchingAccountPreferenceSession.accessToken;
            }
            // If we only have one account for a single auth provider, lets just check if it's allowed and return it if it is.
            if (!provider.supportsMultipleAccounts && this.authenticationMCPServerAccessService.isAccessAllowed(providerId, sessions[0].account.label, server.id)) {
                this.authenticationMCPServerUsageService.addAccountUsage(providerId, sessions[0].account.label, scopes, server.id, server.label);
                this._serverAuthTracking.track(providerId, serverId, scopes);
                return sessions[0].accessToken;
            }
        }
        if (errorOnUserInteraction) {
            throw new UserInteractionRequiredError('authentication');
        }
        const isAllowed = await this.loginPrompt(server.label, provider.label, false);
        if (!isAllowed) {
            throw new Error('User did not consent to login.');
        }
        if (sessions.length) {
            if (provider.supportsMultipleAccounts && errorOnUserInteraction) {
                throw new UserInteractionRequiredError('authentication');
            }
            session = provider.supportsMultipleAccounts
                ? await this.authenticationMcpServersService.selectSession(providerId, server.id, server.label, scopes, sessions)
                : sessions[0];
        }
        else {
            if (errorOnUserInteraction) {
                throw new UserInteractionRequiredError('authentication');
            }
            const accountToCreate = matchingAccountPreferenceSession?.account;
            do {
                session = await this._authenticationService.createSession(providerId, scopes, {
                    activateImmediate: true,
                    account: accountToCreate,
                    authorizationServer
                });
            } while (accountToCreate
                && accountToCreate.label !== session.account.label
                && !await this.continueWithIncorrectAccountPrompt(session.account.label, accountToCreate.label));
        }
        this.authenticationMCPServerAccessService.updateAllowedMcpServers(providerId, session.account.label, [{ id: server.id, name: server.label, allowed: true }]);
        this.authenticationMcpServersService.updateAccountPreference(server.id, providerId, session.account);
        this.authenticationMCPServerUsageService.addAccountUsage(providerId, session.account.label, scopes, server.id, server.label);
        this._serverAuthTracking.track(providerId, serverId, scopes);
        return session.accessToken;
    }
    async continueWithIncorrectAccountPrompt(chosenAccountLabel, requestedAccountLabel) {
        const result = await this.dialogService.prompt({
            message: nls.localize(2847, null),
            detail: nls.localize(2848, null, chosenAccountLabel, requestedAccountLabel),
            type: Severity.Warning,
            cancelButton: true,
            buttons: [
                {
                    label: nls.localize(2849, null, chosenAccountLabel),
                    run: () => chosenAccountLabel
                },
                {
                    label: nls.localize(2850, null, requestedAccountLabel),
                    run: () => requestedAccountLabel
                }
            ],
        });
        if (!result.result) {
            throw new CancellationError();
        }
        return result.result === chosenAccountLabel;
    }
    async _onDidChangeAuthSessions(providerId, providerLabel) {
        const serversUsingProvider = this._serverAuthTracking.get(providerId);
        if (!serversUsingProvider) {
            return;
        }
        for (const { serverId, scopes } of serversUsingProvider) {
            const server = this._servers.get(serverId);
            const serverDefinition = this._serverDefinitions.get(serverId);
            if (!server || !serverDefinition) {
                continue;
            }
            // Only validate servers that are running
            const state = server.state.get();
            if (state.state !== 2 /* McpConnectionState.Kind.Running */) {
                continue;
            }
            // Validate if the session is still available
            try {
                await this._getSessionForProvider(serverId, serverDefinition, providerId, scopes, undefined, true);
            }
            catch (e) {
                if (UserInteractionRequiredError.is(e)) {
                    // Session is no longer valid, stop the server
                    server.pushLog(LogLevel.Warning, nls.localize(2851, null, providerLabel));
                    server.stop();
                }
                // Ignore other errors to avoid disrupting other servers
            }
        }
    }
    async loginPrompt(mcpLabel, providerLabel, recreatingSession) {
        const message = recreatingSession
            ? nls.localize(2852, null, mcpLabel, providerLabel)
            : nls.localize(2853, null, mcpLabel, providerLabel);
        const buttons = [
            {
                label: nls.localize(2854, null),
                run() {
                    return true;
                },
            }
        ];
        const { result } = await this.dialogService.prompt({
            type: Severity.Info,
            message,
            buttons,
            cancelButton: true,
        });
        return result ?? false;
    }
    dispose() {
        for (const server of this._servers.values()) {
            server.extHostDispose();
        }
        this._servers.clear();
        this._serverDefinitions.clear();
        this._serverAuthTracking.clear();
        super.dispose();
    }
};
MainThreadMcp = __decorate([
    extHostNamedCustomer(MainContext.MainThreadMcp),
    __param(1, IMcpRegistry),
    __param(2, IDialogService),
    __param(3, IAuthenticationService),
    __param(4, IAuthenticationMcpService),
    __param(5, IAuthenticationMcpAccessService),
    __param(6, IAuthenticationMcpUsageService),
    __param(7, IDynamicAuthenticationProviderStorageService),
    __param(8, IExtensionService),
    __param(9, IContextKeyService)
], MainThreadMcp);
export { MainThreadMcp };
class ExtHostMcpServerLaunch extends Disposable {
    pushLog(level, message) {
        this._onDidLog.fire({ message, level });
    }
    pushMessage(message) {
        let parsed;
        try {
            parsed = JSON.parse(message);
        }
        catch (e) {
            this.pushLog(LogLevel.Warning, `Failed to parse message: ${JSON.stringify(message)}`);
        }
        if (parsed) {
            if (Array.isArray(parsed)) { // streamable HTTP supports batching
                parsed.forEach(p => this._onDidReceiveMessage.fire(p));
            }
            else {
                this._onDidReceiveMessage.fire(parsed);
            }
        }
    }
    constructor(extHostKind, stop, send) {
        super();
        this.stop = stop;
        this.send = send;
        this.state = observableValue('mcpServerState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._register(disposableTimeout(() => {
            this.pushLog(LogLevel.Info, `Starting server from ${extensionHostKindToString(extHostKind)} extension host`);
        }));
    }
    extHostDispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.pushLog(LogLevel.Warning, 'Extension host shut down, server will stop.');
            this.state.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
        }
        this.dispose();
    }
    dispose() {
        if (McpConnectionState.isRunning(this.state.get())) {
            this.stop();
        }
        super.dispose();
    }
}
/**
 * Tracks which MCP servers are using which authentication providers.
 * Organized by provider ID for efficient lookup when auth sessions change.
 */
class McpServerAuthTracker {
    constructor() {
        // Provider ID -> Array of serverId and scopes used
        this._tracking = new Map();
    }
    /**
     * Track authentication for a server with a specific provider.
     * Replaces any existing tracking for this server/provider combination.
     */
    track(providerId, serverId, scopes) {
        const servers = this._tracking.get(providerId) || [];
        const filtered = servers.filter(s => s.serverId !== serverId);
        filtered.push({ serverId, scopes });
        this._tracking.set(providerId, filtered);
    }
    /**
     * Remove all authentication tracking for a server across all providers.
     */
    untrack(serverId) {
        for (const [providerId, servers] of this._tracking.entries()) {
            const filtered = servers.filter(s => s.serverId !== serverId);
            if (filtered.length === 0) {
                this._tracking.delete(providerId);
            }
            else {
                this._tracking.set(providerId, filtered);
            }
        }
    }
    /**
     * Get all servers using a specific authentication provider.
     */
    get(providerId) {
        return this._tracking.get(providerId);
    }
    /**
     * Clear all tracking data.
     */
    clear() {
        this._tracking.clear();
    }
}
//# sourceMappingURL=mainThreadMcp.js.map