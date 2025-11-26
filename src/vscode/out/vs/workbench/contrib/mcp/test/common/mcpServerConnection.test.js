/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, LogLevel, NullLogger } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpServerConnection } from '../../common/mcpServerConnection.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
import { Event } from '../../../../../base/common/event.js';
class TestMcpHostDelegate extends Disposable {
    constructor() {
        super();
        this._canStartValue = true;
        this.priority = 0;
        this._transport = this._register(new TestMcpMessageTransport());
    }
    substituteVariables(serverDefinition, launch) {
        return Promise.resolve(launch);
    }
    canStart() {
        return this._canStartValue;
    }
    start() {
        if (!this._canStartValue) {
            throw new Error('Cannot start server');
        }
        return this._transport;
    }
    getTransport() {
        return this._transport;
    }
    setCanStart(value) {
        this._canStartValue = value;
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
suite('Workbench - MCP - ServerConnection', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let delegate;
    let transport;
    let collection;
    let serverDefinition;
    setup(() => {
        delegate = store.add(new TestMcpHostDelegate());
        transport = delegate.getTransport();
        // Setup test services
        const services = new ServiceCollection([ILoggerService, store.add(new TestLoggerService())], [IOutputService, upcast({ showChannel: () => { } })], [IStorageService, store.add(new TestStorageService())], [IProductService, TestProductService]);
        instantiationService = store.add(new TestInstantiationService(services));
        // Create test collection
        collection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
            scope: -1 /* StorageScope.APPLICATION */,
            configTarget: 2 /* ConfigurationTarget.USER */,
        };
        // Create server definition
        serverDefinition = {
            id: 'test-server',
            label: 'Test Server',
            cacheNonce: 'a',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: '/test'
            }
        };
    });
    function waitForHandler(cnx) {
        const handler = cnx.handler.get();
        if (handler) {
            return Promise.resolve(handler);
        }
        return new Promise(resolve => {
            const disposable = autorun(reader => {
                const handler = cnx.handler.read(reader);
                if (handler) {
                    disposable.dispose();
                    resolve(handler);
                }
            });
        });
    }
    test('should start and set state to Running when transport succeeds', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const startPromise = connection.start({});
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state = await startPromise;
        assert.strictEqual(state.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
    });
    test('should handle errors during start', async () => {
        // Setup delegate to fail on start
        delegate.setCanStart(false);
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const state = await connection.start({});
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.ok(state.message);
    });
    test('should handle transport errors', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const startPromise = connection.start({});
        // Simulate error in transport
        transport.setConnectionState({
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Test error message'
        });
        const state = await startPromise;
        assert.strictEqual(state.state, 3 /* McpConnectionState.Kind.Error */);
        assert.strictEqual(state.message, 'Test error message');
    });
    test('should stop and set state to Stopped', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const startPromise = connection.start({});
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Stop the connection
        const stopPromise = connection.stop();
        await stopPromise;
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should not restart if already starting', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const startPromise1 = connection.start({});
        // Try to start again while starting
        const startPromise2 = connection.start({});
        // Simulate successful connection
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        const state1 = await startPromise1;
        const state2 = await startPromise2;
        // Both promises should resolve to the same state
        assert.strictEqual(state1.state, 2 /* McpConnectionState.Kind.Running */);
        assert.strictEqual(state2.state, 2 /* McpConnectionState.Kind.Running */);
        transport.simulateInitialized();
        assert.ok(await waitForHandler(connection));
        connection.dispose();
    });
    test('should clean up when disposed', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        // Start the connection
        const startPromise = connection.start({});
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Dispose the connection
        connection.dispose();
        assert.strictEqual(connection.state.get().state, 0 /* McpConnectionState.Kind.Stopped */);
    });
    test('should log transport messages', async () => {
        // Track logged messages
        const loggedMessages = [];
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, {
            onDidChangeLogLevel: Event.None,
            getLevel: () => LogLevel.Debug,
            info: (message) => {
                loggedMessages.push(message);
            },
            error: () => { },
            dispose: () => { }
        }, false);
        store.add(connection);
        // Start the connection
        const startPromise = connection.start({});
        // Simulate log message from transport
        transport.simulateLog('Test log message');
        // Set connection to running
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        // Check that the message was logged
        assert.ok(loggedMessages.some(msg => msg === 'Test log message'));
        connection.dispose();
        await timeout(10);
    });
    test('should correctly handle transitions to and from error state', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // Start the connection
        const startPromise = connection.start({});
        // Transition to error state
        const errorState = {
            state: 3 /* McpConnectionState.Kind.Error */,
            message: 'Temporary error'
        };
        transport.setConnectionState(errorState);
        let state = await startPromise;
        assert.equal(state, errorState);
        transport.setConnectionState({ state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Transition back to running state
        const startPromise2 = connection.start({});
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        state = await startPromise2;
        assert.deepStrictEqual(state, { state: 2 /* McpConnectionState.Kind.Running */ });
        connection.dispose();
        await timeout(10);
    });
    test('should handle multiple start/stop cycles', async () => {
        // Create server connection
        const connection = instantiationService.createInstance(McpServerConnection, collection, serverDefinition, delegate, serverDefinition.launch, new NullLogger(), false);
        store.add(connection);
        // First cycle
        let startPromise = connection.start({});
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        // Second cycle
        startPromise = connection.start({});
        transport.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ });
        await startPromise;
        assert.deepStrictEqual(connection.state.get(), { state: 2 /* McpConnectionState.Kind.Running */ });
        await connection.stop();
        assert.deepStrictEqual(connection.state.get(), { state: 0 /* McpConnectionState.Kind.Stopped */ });
        connection.dispose();
        await timeout(10);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQ29ubmVjdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL3Rlc3QvY29tbW9uL21jcFNlcnZlckNvbm5lY3Rpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBVyxjQUFjLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzFHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLG1EQUFtRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUU3SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFB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