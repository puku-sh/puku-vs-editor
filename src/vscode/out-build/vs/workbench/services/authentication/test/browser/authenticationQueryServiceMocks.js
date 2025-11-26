/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
/**
 * Helper function to create a mock authentication provider
 */
export function createProvider(overrides = {}) {
    return {
        id: 'test-provider',
        label: 'Test Provider',
        supportsMultipleAccounts: true,
        createSession: () => Promise.resolve(createSession()),
        removeSession: () => Promise.resolve(),
        getSessions: () => Promise.resolve([]),
        onDidChangeSessions: new Emitter().event,
        ...overrides
    };
}
/**
 * Helper function to create a mock authentication session
 */
export function createSession() {
    return {
        id: 'test-session',
        accessToken: 'test-token',
        account: { id: 'test-account', label: 'Test Account' },
        scopes: ['read', 'write'],
        idToken: undefined
    };
}
/**
 * Base class for test services with common functionality and call tracking
 */
export class BaseTestService extends Disposable {
    constructor() {
        super(...arguments);
        this.data = new Map();
        this._methodCalls = [];
    }
    getKey(...parts) {
        return parts.join('::');
    }
    /**
     * Track a method call for verification in tests
     */
    trackCall(method, ...args) {
        this._methodCalls.push({
            method,
            args: [...args],
            timestamp: Date.now()
        });
    }
    /**
     * Get all method calls for verification
     */
    getMethodCalls() {
        return [...this._methodCalls];
    }
    /**
     * Get calls for a specific method
     */
    getCallsFor(method) {
        return this._methodCalls.filter(call => call.method === method);
    }
    /**
     * Clear method call history
     */
    clearCallHistory() {
        this._methodCalls.length = 0;
    }
    /**
     * Get the last call for a specific method
     */
    getLastCallFor(method) {
        const calls = this.getCallsFor(method);
        return calls[calls.length - 1];
    }
}
/**
 * Test implementation that actually stores and retrieves data
 */
export class TestUsageService extends BaseTestService {
    readAccountUsages(providerId, accountName) {
        this.trackCall('readAccountUsages', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    addAccountUsage(providerId, accountName, scopes, extensionId, extensionName) {
        this.trackCall('addAccountUsage', providerId, accountName, scopes, extensionId, extensionName);
        const key = this.getKey(providerId, accountName);
        const usages = this.data.get(key) || [];
        usages.push({ extensionId, extensionName, scopes: [...scopes], lastUsed: Date.now() });
        this.data.set(key, usages);
    }
    removeAccountUsage(providerId, accountName) {
        this.trackCall('removeAccountUsage', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
    // Stub implementations for missing methods
    async initializeExtensionUsageCache() { }
    async extensionUsesAuth(extensionId) { return false; }
}
export class TestMcpUsageService extends BaseTestService {
    readAccountUsages(providerId, accountName) {
        this.trackCall('readAccountUsages', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    addAccountUsage(providerId, accountName, scopes, mcpServerId, mcpServerName) {
        this.trackCall('addAccountUsage', providerId, accountName, scopes, mcpServerId, mcpServerName);
        const key = this.getKey(providerId, accountName);
        const usages = this.data.get(key) || [];
        usages.push({ mcpServerId, mcpServerName, scopes: [...scopes], lastUsed: Date.now() });
        this.data.set(key, usages);
    }
    removeAccountUsage(providerId, accountName) {
        this.trackCall('removeAccountUsage', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
    // Stub implementations for missing methods
    async initializeUsageCache() { }
    async hasUsedAuth(mcpServerId) { return false; }
}
export class TestAccessService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeExtensionSessionAccess = this._register(new Emitter());
        this.onDidChangeExtensionSessionAccess = this._onDidChangeExtensionSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, extensionId) {
        this.trackCall('isAccessAllowed', providerId, accountName, extensionId);
        const extensions = this.data.get(this.getKey(providerId, accountName)) || [];
        const extension = extensions.find((e) => e.id === extensionId);
        return extension?.allowed;
    }
    readAllowedExtensions(providerId, accountName) {
        this.trackCall('readAllowedExtensions', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    updateAllowedExtensions(providerId, accountName, extensions) {
        this.trackCall('updateAllowedExtensions', providerId, accountName, extensions);
        const key = this.getKey(providerId, accountName);
        const existing = this.data.get(key) || [];
        // Merge with existing data, updating or adding extensions
        const merged = [...existing];
        for (const ext of extensions) {
            const existingIndex = merged.findIndex(e => e.id === ext.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = ext;
            }
            else {
                merged.push(ext);
            }
        }
        this.data.set(key, merged);
        this._onDidChangeExtensionSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedExtensions(providerId, accountName) {
        this.trackCall('removeAllowedExtensions', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
    }
}
export class TestMcpAccessService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeMcpSessionAccess = this._register(new Emitter());
        this.onDidChangeMcpSessionAccess = this._onDidChangeMcpSessionAccess.event;
    }
    isAccessAllowed(providerId, accountName, mcpServerId) {
        this.trackCall('isAccessAllowed', providerId, accountName, mcpServerId);
        const servers = this.data.get(this.getKey(providerId, accountName)) || [];
        const server = servers.find((s) => s.id === mcpServerId);
        return server?.allowed;
    }
    readAllowedMcpServers(providerId, accountName) {
        this.trackCall('readAllowedMcpServers', providerId, accountName);
        return this.data.get(this.getKey(providerId, accountName)) || [];
    }
    updateAllowedMcpServers(providerId, accountName, mcpServers) {
        this.trackCall('updateAllowedMcpServers', providerId, accountName, mcpServers);
        const key = this.getKey(providerId, accountName);
        const existing = this.data.get(key) || [];
        // Merge with existing data, updating or adding MCP servers
        const merged = [...existing];
        for (const server of mcpServers) {
            const existingIndex = merged.findIndex(s => s.id === server.id);
            if (existingIndex >= 0) {
                merged[existingIndex] = server;
            }
            else {
                merged.push(server);
            }
        }
        this.data.set(key, merged);
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
    removeAllowedMcpServers(providerId, accountName) {
        this.trackCall('removeAllowedMcpServers', providerId, accountName);
        this.data.delete(this.getKey(providerId, accountName));
        this._onDidChangeMcpSessionAccess.fire({ providerId, accountName });
    }
}
export class TestPreferencesService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeAccountPreference = this._register(new Emitter());
        this.onDidChangeAccountPreference = this._onDidChangeAccountPreference.event;
    }
    getAccountPreference(clientId, providerId) {
        return this.data.get(this.getKey(clientId, providerId));
    }
    updateAccountPreference(clientId, providerId, account) {
        this.data.set(this.getKey(clientId, providerId), account.label);
    }
    removeAccountPreference(clientId, providerId) {
        this.data.delete(this.getKey(clientId, providerId));
    }
}
export class TestExtensionsService extends TestPreferencesService {
    // Stub implementations for methods we don't test
    updateSessionPreference() { }
    getSessionPreference() { return undefined; }
    removeSessionPreference() { }
    selectSession() { return Promise.resolve(createSession()); }
    requestSessionAccess() { }
    requestNewSession() { return Promise.resolve(); }
    updateNewSessionRequests() { }
}
export class TestMcpService extends TestPreferencesService {
    // Stub implementations for methods we don't test
    updateSessionPreference() { }
    getSessionPreference() { return undefined; }
    removeSessionPreference() { }
    selectSession() { return Promise.resolve(createSession()); }
    requestSessionAccess() { }
    requestNewSession() { return Promise.resolve(); }
}
/**
 * Minimal authentication service mock that only implements what we need
 */
export class TestAuthenticationService extends BaseTestService {
    constructor() {
        super(...arguments);
        this._onDidChangeSessions = this._register(new Emitter());
        this._onDidRegisterAuthenticationProvider = this._register(new Emitter());
        this._onDidUnregisterAuthenticationProvider = this._register(new Emitter());
        this._onDidChangeDeclaredProviders = this._register(new Emitter());
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this.onDidRegisterAuthenticationProvider = this._onDidRegisterAuthenticationProvider.event;
        this.onDidUnregisterAuthenticationProvider = this._onDidUnregisterAuthenticationProvider.event;
        this.onDidChangeDeclaredProviders = this._onDidChangeDeclaredProviders.event;
        this.accountsMap = new Map();
    }
    registerAuthenticationProvider(id, provider) {
        this.data.set(id, provider);
        this._onDidRegisterAuthenticationProvider.fire({ id, label: provider.label });
    }
    getProviderIds() {
        return Array.from(this.data.keys());
    }
    isAuthenticationProviderRegistered(id) {
        return this.data.has(id);
    }
    getProvider(id) {
        return this.data.get(id);
    }
    addAccounts(providerId, accounts) {
        this.accountsMap.set(providerId, accounts);
    }
    async getAccounts(providerId) {
        return this.accountsMap.get(providerId) || [];
    }
    // All other methods are stubs since we don't test them
    get declaredProviders() { return []; }
    isDynamicAuthenticationProvider() { return false; }
    async getSessions() { return []; }
    async createSession() { return createSession(); }
    async removeSession() { }
    manageTrustedExtensionsForAccount() { }
    async removeAccountSessions() { }
    registerDeclaredAuthenticationProvider() { }
    unregisterDeclaredAuthenticationProvider() { }
    unregisterAuthenticationProvider() { }
    registerAuthenticationProviderHostDelegate() { return { dispose: () => { } }; }
    createDynamicAuthenticationProvider() { return Promise.resolve(undefined); }
    async requestNewSession() { return createSession(); }
    async getSession() { return createSession(); }
    getOrActivateProviderIdForServer() { return Promise.resolve(undefined); }
    supportsHeimdallConnection() { return false; }
}
//# sourceMappingURL=authenticationQueryServiceMocks.js.map