/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, ILogService, NullLogger, NullLogService } from '../../../../../platform/log/common/log.js';
import { mcpAccessConfig } from '../../../../../platform/mcp/common/mcpManagement.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistry } from '../../common/mcpRegistry.js';
import { McpStartServerInteraction } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
class TestConfigurationResolverService {
    constructor() {
        this.interactiveCounter = 0;
        // Used to simulate stored/resolved variables
        this.resolvedVariables = new Map();
        // Add some test variables
        this.resolvedVariables.set('workspaceFolder', '/test/workspace');
        this.resolvedVariables.set('fileBasename', 'test.txt');
    }
    resolveAsync(folder, value) {
        const parsed = ConfigurationResolverExpression.parse(value);
        for (const variable of parsed.unresolved()) {
            const resolved = this.resolvedVariables.get(variable.inner);
            if (resolved) {
                parsed.resolve(variable, resolved);
            }
        }
        return Promise.resolve(parsed.toObject());
    }
    resolveWithInteraction(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        // For testing, we simulate interaction by returning a map with some variables
        const result = new Map();
        result.set('input:testInteractive', `interactiveValue${this.interactiveCounter++}`);
        result.set('command:testCommand', `commandOutput${this.interactiveCounter++}}`);
        // If variables are provided, include those too
        for (const [k, v] of result.entries()) {
            const replacement = {
                id: '${' + k + '}',
                inner: k,
                name: k.split(':')[0] || k,
                arg: k.split(':')[1]
            };
            parsed.resolve(replacement, v);
        }
        return Promise.resolve(result);
    }
}
class TestMcpHostDelegate {
    constructor() {
        this.priority = 0;
    }
    substituteVariables(serverDefinition, launch) {
        return Promise.resolve(launch);
    }
    canStart() {
        return true;
    }
    start() {
        return new TestMcpMessageTransport();
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
class TestDialogService {
    constructor() {
        this._promptResult = true;
        this._promptSpy = sinon.stub();
        this._promptSpy.callsFake(() => {
            return Promise.resolve({ result: this._promptResult });
        });
    }
    setPromptResult(result) {
        this._promptResult = result;
    }
    get promptSpy() {
        return this._promptSpy;
    }
    prompt(options) {
        return this._promptSpy(options);
    }
}
class TestMcpRegistry extends McpRegistry {
    _promptForTrustOpenDialog() {
        return Promise.resolve(this.nextDefinitionIdsToTrust);
    }
}
suite('Workbench - MCP - Registry', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    let testStorageService;
    let testConfigResolverService;
    let testDialogService;
    let testCollection;
    let baseDefinition;
    let configurationService;
    let logger;
    let trustNonceBearer;
    setup(() => {
        testConfigResolverService = new TestConfigurationResolverService();
        testStorageService = store.add(new TestStorageService());
        testDialogService = new TestDialogService();
        configurationService = new TestConfigurationService({ [mcpAccessConfig]: "all" /* McpAccessValue.All */ });
        trustNonceBearer = { trustedAtNonce: undefined };
        const services = new ServiceCollection([IConfigurationService, configurationService], [IConfigurationResolverService, testConfigResolverService], [IStorageService, testStorageService], [ISecretStorageService, new TestSecretStorageService()], [ILoggerService, store.add(new TestLoggerService())], [ILogService, store.add(new NullLogService())], [IOutputService, upcast({ showChannel: () => { } })], [IDialogService, testDialogService], [IProductService, {}]);
        logger = new NullLogger();
        const instaService = store.add(new TestInstantiationService(services));
        registry = store.add(instaService.createInstance(TestMcpRegistry));
        // Create test collection that can be reused
        testCollection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
            scope: -1 /* StorageScope.APPLICATION */,
            configTarget: 2 /* ConfigurationTarget.USER */,
        };
        // Create base definition that can be reused
        baseDefinition = {
            id: 'test-server',
            label: 'Test Server',
            cacheNonce: 'a',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: '/test',
            }
        };
    });
    test('registerCollection adds collection to registry', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        assert.strictEqual(registry.collections.get()[0], testCollection);
        disposable.dispose();
        assert.strictEqual(registry.collections.get().length, 0);
    });
    test('collections are not visible when not enabled', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        configurationService.setUserConfiguration(mcpAccessConfig, "none" /* McpAccessValue.None */);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([mcpAccessConfig]),
            change: { keys: [mcpAccessConfig], overrides: [] },
            source: 2 /* ConfigurationTarget.USER */
        });
        assert.strictEqual(registry.collections.get().length, 0);
        configurationService.setUserConfiguration(mcpAccessConfig, "all" /* McpAccessValue.All */);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([mcpAccessConfig]),
            change: { keys: [mcpAccessConfig], overrides: [] },
            source: 2 /* ConfigurationTarget.USER */
        });
    });
    test('registerDelegate adds delegate to registry', () => {
        const delegate = new TestMcpHostDelegate();
        const disposable = registry.registerDelegate(delegate);
        store.add(disposable);
        assert.strictEqual(registry.delegates.get().length, 1);
        assert.strictEqual(registry.delegates.get()[0], delegate);
        disposable.dispose();
        assert.strictEqual(registry.delegates.get().length, 0);
    });
    test('resolveConnection creates connection with resolved variables and memorizes them until cleared', async () => {
        const definition = {
            ...baseDefinition,
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: '${workspaceFolder}/cmd',
                args: ['--file', '${fileBasename}'],
                env: {
                    PATH: '${input:testInteractive}'
                },
                envFile: undefined,
                cwd: '/test',
            },
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(testCollection));
        const connection = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection);
        assert.strictEqual(connection.definition, definition);
        assert.strictEqual(connection.launchDefinition.command, '/test/workspace/cmd');
        assert.strictEqual(connection.launchDefinition.env.PATH, 'interactiveValue0');
        connection.dispose();
        const connection2 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection2);
        assert.strictEqual(connection2.launchDefinition.env.PATH, 'interactiveValue0');
        connection2.dispose();
        registry.clearSavedInputs(1 /* StorageScope.WORKSPACE */);
        const connection3 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection3);
        assert.strictEqual(connection3.launchDefinition.env.PATH, 'interactiveValue4');
        connection3.dispose();
    });
    test('resolveConnection uses user-provided launch configuration', async () => {
        // Create a collection with custom launch resolver
        const customCollection = {
            ...testCollection,
            resolveServerLanch: async (def) => {
                return {
                    ...def.launch,
                    env: { CUSTOM_ENV: 'value' },
                };
            }
        };
        // Create a definition with variable replacement
        const definition = {
            ...baseDefinition,
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(customCollection));
        // Resolve connection should use the custom launch configuration
        const connection = await registry.resolveConnection({
            collectionRef: customCollection,
            definitionRef: definition,
            logger,
            trustNonceBearer,
        });
        assert.ok(connection);
        // Verify the launch configuration passed to _replaceVariablesInLaunch was the custom one
        assert.deepStrictEqual(connection.launchDefinition.env, { CUSTOM_ENV: 'value' });
        connection.dispose();
    });
    suite('Lazy Collections', () => {
        let lazyCollection;
        let normalCollection;
        let removedCalled;
        setup(() => {
            removedCalled = false;
            lazyCollection = {
                ...testCollection,
                id: 'lazy-collection',
                lazy: {
                    isCached: false,
                    load: () => Promise.resolve(),
                    removed: () => { removedCalled = true; }
                }
            };
            normalCollection = {
                ...testCollection,
                id: 'lazy-collection',
                serverDefinitions: observableValue('serverDefs', [baseDefinition])
            };
        });
        test('registers lazy collection', () => {
            const disposable = registry.registerCollection(lazyCollection);
            store.add(disposable);
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.collections.get()[0], lazyCollection);
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
        test('lazy collection is replaced by normal collection', () => {
            store.add(registry.registerCollection(lazyCollection));
            store.add(registry.registerCollection(normalCollection));
            const collections = registry.collections.get();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0], normalCollection);
            assert.strictEqual(collections[0].lazy, undefined);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
        });
        test('lazyCollectionState updates correctly during loading', async () => {
            lazyCollection = {
                ...lazyCollection,
                lazy: {
                    ...lazyCollection.lazy,
                    load: async () => {
                        await timeout(0);
                        store.add(registry.registerCollection(normalCollection));
                        return Promise.resolve();
                    }
                }
            };
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
            const loadingPromise = registry.discoverCollections();
            assert.strictEqual(registry.lazyCollectionState.get().state, 1 /* LazyCollectionState.LoadingUnknown */);
            await loadingPromise;
            // The collection wasn't replaced, so it should be removed
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            assert.strictEqual(removedCalled, false);
        });
        test('removed callback is called when lazy collection is not replaced', async () => {
            store.add(registry.registerCollection(lazyCollection));
            await registry.discoverCollections();
            assert.strictEqual(removedCalled, true);
        });
        test('cached lazy collections are tracked correctly', () => {
            lazyCollection.lazy.isCached = true;
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            // Adding an uncached lazy collection changes the state
            const uncachedLazy = {
                ...lazyCollection,
                id: 'uncached-lazy',
                lazy: {
                    ...lazyCollection.lazy,
                    isCached: false
                }
            };
            store.add(registry.registerCollection(uncachedLazy));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
    });
    suite('Trust Flow', () => {
        /**
         * Helper to create a test MCP collection with a specific trust behavior
         */
        function createTestCollection(trustBehavior, id = 'test-collection') {
            return {
                id,
                label: 'Test Collection',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                trustBehavior,
                scope: -1 /* StorageScope.APPLICATION */,
                configTarget: 2 /* ConfigurationTarget.USER */,
            };
        }
        /**
         * Helper to create a test server definition with a specific cache nonce
         */
        function createTestDefinition(id = 'test-server', cacheNonce = 'nonce-a') {
            return {
                id,
                label: 'Test Server',
                cacheNonce,
                launch: {
                    type: 1 /* McpServerTransportType.Stdio */,
                    command: 'test-command',
                    args: [],
                    env: {},
                    envFile: undefined,
                    cwd: '/test',
                }
            };
        }
        /**
         * Helper to set up a basic registry with delegate and collection
         */
        function setupRegistry(trustBehavior = 1 /* McpServerTrust.Kind.TrustedOnNonce */, cacheNonce = 'nonce-a') {
            const delegate = new TestMcpHostDelegate();
            store.add(registry.registerDelegate(delegate));
            const collection = createTestCollection(trustBehavior);
            const definition = createTestDefinition('test-server', cacheNonce);
            collection.serverDefinitions.set([definition], undefined);
            store.add(registry.registerCollection(collection));
            return { collection, definition, delegate };
        }
        test('trusted collection allows connection without prompting', async () => {
            const { collection, definition } = setupRegistry(0 /* McpServerTrust.Kind.Trusted */);
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created for trusted collection');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust allows connection when nonce matches', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-a');
            trustNonceBearer.trustedAtNonce = 'nonce-a';
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created when nonce matches');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust prompts when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = [definition.id]; // User trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created when user trusts');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('nonce-based trust denies connection when user rejects', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = []; // User does not trust the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created when user rejects');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, '__vscode_not_trusted', 'Should mark as explicitly not trusted');
        });
        test('autoTrustChanges bypasses prompt when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                autoTrustChanges: true,
            });
            assert.ok(connection, 'Connection should be created with autoTrustChanges');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('promptType "never" skips prompt and fails silently', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'never',
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created with promptType "never"');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "only-new" skips previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'only-new',
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created for previously untrusted server');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "all-untrusted" prompts for previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            registry.nextDefinitionIdsToTrust = [definition.id]; // User now trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'all-untrusted',
            });
            assert.ok(connection, 'Connection should be created when user trusts previously untrusted server');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('concurrent resolveConnection calls with same interaction are grouped', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // Trust both servers
            registry.nextDefinitionIdsToTrust = [definition.id, definition2.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.ok(connection1, 'First connection should be created');
            assert.ok(connection2, 'Second connection should be created');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, 'nonce-c', 'Second nonce should be updated');
            connection1.dispose();
            connection2.dispose();
        });
        test('user cancelling trust dialog returns undefined for all pending connections', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User cancels the dialog
            registry.nextDefinitionIdsToTrust = undefined;
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.strictEqual(connection1, undefined, 'First connection should not be created when user cancels');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when user cancels');
        });
        test('partial trust selection in grouped interaction', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User trusts only the first server
            registry.nextDefinitionIdsToTrust = [definition.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.ok(connection1, 'First connection should be created when trusted');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when not trusted');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, '__vscode_not_trusted', 'Second nonce should be marked as not trusted');
            connection1.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL2hvbWUvcG9yaWRoaS9kZXZlbG9wbWVudC9wdWt1LXZzLWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQWtELHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEosT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBVyxNQUFNLG1EQUFtRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBVyxjQUFjLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZUFBZSxFQUFrQixNQUFNLHFEQUFxRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtREFBbUQs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