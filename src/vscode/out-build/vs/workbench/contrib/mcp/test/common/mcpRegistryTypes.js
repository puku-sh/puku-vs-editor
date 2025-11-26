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
import { Emitter, Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { LogLevel, NullLogger } from '../../../../../platform/log/common/log.js';
import { McpServerConnection } from '../../common/mcpServerConnection.js';
import { MCP } from '../../common/modelContextProtocol.js';
/**
 * Implementation of IMcpMessageTransport for testing purposes.
 * Allows tests to easily send/receive messages and control the connection state.
 */
export class TestMcpMessageTransport extends Disposable {
    constructor() {
        super();
        this._onDidLog = this._register(new Emitter());
        this.onDidLog = this._onDidLog.event;
        this._onDidReceiveMessage = this._register(new Emitter());
        this.onDidReceiveMessage = this._onDidReceiveMessage.event;
        this._stateValue = observableValue('testTransportState', { state: 1 /* McpConnectionState.Kind.Starting */ });
        this.state = this._stateValue;
        this._sentMessages = [];
        this.setResponder('initialize', () => ({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: 1, // The handler uses 1 for the first request
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                serverInfo: {
                    name: 'Test MCP Server',
                    version: '1.0.0',
                },
                capabilities: {
                    resources: {
                        supportedTypes: ['text/plain'],
                    },
                    tools: {
                        supportsCancellation: true,
                    }
                }
            }
        }));
    }
    /**
     * Set a responder function for a specific method.
     * The responder receives the sent message and should return a response object,
     * which will be simulated as a server response.
     */
    setResponder(method, responder) {
        if (!this._responders) {
            this._responders = new Map();
        }
        this._responders.set(method, responder);
    }
    /**
     * Send a message through the transport.
     */
    send(message) {
        this._sentMessages.push(message);
        if (this._responders && 'method' in message && typeof message.method === 'string') {
            const responder = this._responders.get(message.method);
            if (responder) {
                const response = responder(message);
                if (response) {
                    setTimeout(() => this.simulateReceiveMessage(response));
                }
            }
        }
    }
    /**
     * Stop the transport.
     */
    stop() {
        this._stateValue.set({ state: 0 /* McpConnectionState.Kind.Stopped */ }, undefined);
    }
    // Test Helper Methods
    /**
     * Simulate receiving a message from the server.
     */
    simulateReceiveMessage(message) {
        this._onDidReceiveMessage.fire(message);
    }
    /**
     * Simulates a reply to an 'initialized' request.
     */
    simulateInitialized() {
        if (!this._sentMessages.length) {
            throw new Error('initialize was not called yet');
        }
        this.simulateReceiveMessage({
            jsonrpc: MCP.JSONRPC_VERSION,
            id: this.getSentMessages()[0].id,
            result: {
                protocolVersion: MCP.LATEST_PROTOCOL_VERSION,
                capabilities: {
                    tools: {},
                },
                serverInfo: {
                    name: 'Test Server',
                    version: '1.0.0'
                },
            }
        });
    }
    /**
     * Simulate a log event.
     */
    simulateLog(message) {
        this._onDidLog.fire({ level: LogLevel.Info, message });
    }
    /**
     * Set the connection state.
     */
    setConnectionState(state) {
        this._stateValue.set(state, undefined);
    }
    /**
     * Get all messages that have been sent.
     */
    getSentMessages() {
        return [...this._sentMessages];
    }
    /**
     * Clear the sent messages history.
     */
    clearSentMessages() {
        this._sentMessages.length = 0;
    }
}
let TestMcpRegistry = class TestMcpRegistry {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.makeTestTransport = () => new TestMcpMessageTransport();
        this.onDidChangeInputs = Event.None;
        this.collections = observableValue(this, [{
                id: 'test-collection',
                remoteAuthority: null,
                label: 'Test Collection',
                configTarget: 2 /* ConfigurationTarget.USER */,
                serverDefinitions: observableValue(this, [{
                        id: 'test-server',
                        label: 'Test Server',
                        launch: { type: 1 /* McpServerTransportType.Stdio */, command: 'echo', args: ['Hello MCP'], env: {}, envFile: undefined, cwd: undefined },
                        cacheNonce: 'a',
                    }]),
                trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
                scope: -1 /* StorageScope.APPLICATION */,
            }]);
        this.delegates = observableValue(this, [{
                priority: 0,
                canStart: () => true,
                substituteVariables(serverDefinition, launch) {
                    return Promise.resolve(launch);
                },
                start: () => {
                    const t = this.makeTestTransport();
                    setTimeout(() => t.setConnectionState({ state: 2 /* McpConnectionState.Kind.Running */ }));
                    return t;
                },
                waitForInitialProviderPromises: () => Promise.resolve(),
            }]);
        this.lazyCollectionState = observableValue(this, { state: 2 /* LazyCollectionState.AllKnown */, collections: [] });
    }
    collectionToolPrefix(collection) {
        return observableValue(this, `mcp-${collection.id}-`);
    }
    getServerDefinition(collectionRef, definitionRef) {
        const collectionObs = this.collections.map(cols => cols.find(c => c.id === collectionRef.id));
        return collectionObs.map((collection, reader) => {
            const server = collection?.serverDefinitions.read(reader).find(s => s.id === definitionRef.id);
            return { collection, server };
        });
    }
    discoverCollections() {
        throw new Error('Method not implemented.');
    }
    registerDelegate(delegate) {
        throw new Error('Method not implemented.');
    }
    registerCollection(collection) {
        throw new Error('Method not implemented.');
    }
    resetTrust() {
        throw new Error('Method not implemented.');
    }
    clearSavedInputs(scope, inputId) {
        throw new Error('Method not implemented.');
    }
    editSavedInput(inputId, folderData, configSection, target) {
        throw new Error('Method not implemented.');
    }
    setSavedInput(inputId, target, value) {
        throw new Error('Method not implemented.');
    }
    getSavedInputs(scope) {
        throw new Error('Method not implemented.');
    }
    resolveConnection(options) {
        const collection = this.collections.get().find(c => c.id === options.collectionRef.id);
        const definition = collection?.serverDefinitions.get().find(d => d.id === options.definitionRef.id);
        if (!collection || !definition) {
            throw new Error(`Collection or definition not found: ${options.collectionRef.id}, ${options.definitionRef.id}`);
        }
        const del = this.delegates.get()[0];
        return Promise.resolve(new McpServerConnection(collection, definition, del, definition.launch, new NullLogger(), false, this._instantiationService));
    }
};
TestMcpRegistry = __decorate([
    __param(0, IInstantiationService)
], TestMcpRegistry);
export { TestMcpRegistry };
//# sourceMappingURL=mcpRegistryTypes.js.map