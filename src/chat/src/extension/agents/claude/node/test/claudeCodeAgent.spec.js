"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cancellation_1 = require("../../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../../test/node/services");
const testHelpers_1 = require("../../../../test/node/testHelpers");
const claudeCodeAgent_1 = require("../claudeCodeAgent");
const claudeCodeSdkService_1 = require("../claudeCodeSdkService");
(0, vitest_1.describe)('ClaudeAgentManager', () => {
    const store = new lifecycle_1.DisposableStore();
    let instantiationService;
    let mockService;
    (0, vitest_1.beforeEach)(() => {
        const services = store.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        instantiationService = accessor.get(instantiation_1.IInstantiationService);
        // Reset mock service call count
        mockService = accessor.get(claudeCodeSdkService_1.IClaudeCodeSdkService);
        mockService.queryCallCount = 0;
    });
    (0, vitest_1.afterEach)(() => {
        store.clear();
        vitest_1.vi.resetAllMocks();
    });
    (0, vitest_1.it)('reuses a live session across requests and streams assistant text', async () => {
        const manager = instantiationService.createInstance(claudeCodeAgent_1.ClaudeAgentManager);
        // Use MockChatResponseStream to capture markdown output
        const stream1 = new testHelpers_1.MockChatResponseStream();
        const req1 = new testHelpers_1.TestChatRequest('Hi');
        const res1 = await manager.handleRequest(undefined, req1, { history: [] }, stream1, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(stream1.output.join('\n')).toContain('Hello from mock!');
        (0, vitest_1.expect)(res1.claudeSessionId).toBe('sess-1');
        // Second request should reuse the same live session (SDK query created only once)
        const stream2 = new testHelpers_1.MockChatResponseStream();
        const req2 = new testHelpers_1.TestChatRequest('Again');
        const res2 = await manager.handleRequest(res1.claudeSessionId, req2, { history: [] }, stream2, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(stream2.output.join('\n')).toContain('Hello from mock!');
        (0, vitest_1.expect)(res2.claudeSessionId).toBe('sess-1');
        // Verify session continuity by checking that the same session ID was returned
        (0, vitest_1.expect)(res1.claudeSessionId).toBe(res2.claudeSessionId);
        // Verify that the service's query method was called only once (proving session reuse)
        (0, vitest_1.expect)(mockService.queryCallCount).toBe(1);
    });
});
(0, vitest_1.describe)('ClaudeCodeSession', () => {
    const store = new lifecycle_1.DisposableStore();
    let instantiationService;
    (0, vitest_1.beforeEach)(() => {
        const services = store.add((0, services_1.createExtensionUnitTestingServices)());
        const accessor = services.createTestingAccessor();
        instantiationService = accessor.get(instantiation_1.IInstantiationService);
    });
    (0, vitest_1.afterEach)(() => {
        store.clear();
        vitest_1.vi.resetAllMocks();
    });
    (0, vitest_1.it)('processes a single request correctly', async () => {
        const serverConfig = { port: 8080, nonce: 'test-nonce' };
        const session = store.add(instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'test-session'));
        const stream = new testHelpers_1.MockChatResponseStream();
        await session.invoke('Hello', {}, stream, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(stream.output.join('\n')).toContain('Hello from mock!');
    });
    (0, vitest_1.it)('queues multiple requests and processes them sequentially', async () => {
        const serverConfig = { port: 8080, nonce: 'test-nonce' };
        const session = store.add(instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'test-session'));
        const stream1 = new testHelpers_1.MockChatResponseStream();
        const stream2 = new testHelpers_1.MockChatResponseStream();
        // Start both requests simultaneously
        const promise1 = session.invoke('First', {}, stream1, cancellation_1.CancellationToken.None);
        const promise2 = session.invoke('Second', {}, stream2, cancellation_1.CancellationToken.None);
        // Wait for both to complete
        await Promise.all([promise1, promise2]);
        // Both should have received responses
        (0, vitest_1.expect)(stream1.output.join('\n')).toContain('Hello from mock!');
        (0, vitest_1.expect)(stream2.output.join('\n')).toContain('Hello from mock!');
    });
    (0, vitest_1.it)('cancels pending requests when cancelled', async () => {
        const serverConfig = { port: 8080, nonce: 'test-nonce' };
        const session = store.add(instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'test-session'));
        const stream = new testHelpers_1.MockChatResponseStream();
        const source = new cancellation_1.CancellationTokenSource();
        source.cancel();
        await (0, vitest_1.expect)(session.invoke('Hello', {}, stream, source.token)).rejects.toThrow();
    });
    (0, vitest_1.it)('cleans up resources when disposed', async () => {
        const serverConfig = { port: 8080, nonce: 'test-nonce' };
        const session = instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'test-session');
        // Dispose the session immediately
        session.dispose();
        // Any new requests should be rejected
        const stream = new testHelpers_1.MockChatResponseStream();
        await (0, vitest_1.expect)(session.invoke('Hello', {}, stream, cancellation_1.CancellationToken.None))
            .rejects.toThrow('Session disposed');
    });
    (0, vitest_1.it)('handles multiple sessions with different session IDs', async () => {
        const serverConfig = { port: 8080, nonce: 'test-nonce' };
        const session1 = store.add(instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'session-1'));
        const session2 = store.add(instantiationService.createInstance(claudeCodeAgent_1.ClaudeCodeSession, serverConfig, 'session-2'));
        (0, vitest_1.expect)(session1.sessionId).toBe('session-1');
        (0, vitest_1.expect)(session2.sessionId).toBe('session-2');
        const stream1 = new testHelpers_1.MockChatResponseStream();
        const stream2 = new testHelpers_1.MockChatResponseStream();
        // Both sessions should work independently
        await Promise.all([
            session1.invoke('Hello from session 1', {}, stream1, cancellation_1.CancellationToken.None),
            session2.invoke('Hello from session 2', {}, stream2, cancellation_1.CancellationToken.None)
        ]);
        (0, vitest_1.expect)(stream1.output.join('\n')).toContain('Hello from mock!');
        (0, vitest_1.expect)(stream2.output.join('\n')).toContain('Hello from mock!');
    });
});
//# sourceMappingURL=claudeCodeAgent.spec.js.map