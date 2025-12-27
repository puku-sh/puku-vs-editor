/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextKeyService } from '../../../../platform/contextkey/browser/contextKeyService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../platform/log/common/log.js';
import { ChatSessionsService } from '../../../contrib/chat/browser/chatSessions.contribution.js';
import { IChatSessionsService } from '../../../contrib/chat/common/chatSessionsService.js';
import { LocalChatSessionUri } from '../../../contrib/chat/common/chatUri.js';
import { ChatAgentLocation } from '../../../contrib/chat/common/constants.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { mock, TestExtensionService } from '../../../test/common/workbenchTestServices.js';
import { MainThreadChatSessions, ObservableChatSession } from '../../browser/mainThreadChatSessions.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { isEqual } from '../../../../base/common/resources.js';
suite('ObservableChatSession', function () {
    let disposables;
    let logService;
    let dialogService;
    let proxy;
    setup(function () {
        disposables = new DisposableStore();
        logService = new NullLogService();
        dialogService = new class extends mock() {
            async confirm() {
                return { confirmed: true };
            }
        };
        proxy = {
            $provideChatSessionContent: sinon.stub(),
            $provideChatSessionProviderOptions: sinon.stub().resolves(undefined),
            $provideHandleOptionsChange: sinon.stub(),
            $interruptChatSessionActiveResponse: sinon.stub(),
            $invokeChatSessionRequestHandler: sinon.stub(),
            $disposeChatSessionContent: sinon.stub(),
            $provideChatSessionItems: sinon.stub(),
            $provideNewChatSessionItem: sinon.stub().resolves({ label: 'New Session' })
        };
    });
    teardown(function () {
        disposables.dispose();
        sinon.restore();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function createSessionContent(options = {}) {
        return {
            id: options.id || 'test-id',
            history: options.history || [],
            hasActiveResponseCallback: options.hasActiveResponseCallback || false,
            hasRequestHandler: options.hasRequestHandler || false
        };
    }
    async function createInitializedSession(sessionContent, sessionId = 'test-id') {
        const resource = LocalChatSessionUri.forSession(sessionId);
        const session = new ObservableChatSession(resource, 1, proxy, logService, dialogService);
        proxy.$provideChatSessionContent.resolves(sessionContent);
        await session.initialize(CancellationToken.None);
        return session;
    }
    test('constructor creates session with proper initial state', function () {
        const sessionId = 'test-id';
        const resource = LocalChatSessionUri.forSession(sessionId);
        const session = disposables.add(new ObservableChatSession(resource, 1, proxy, logService, dialogService));
        assert.strictEqual(session.providerHandle, 1);
        assert.deepStrictEqual(session.history, []);
        assert.ok(session.progressObs);
        assert.ok(session.isCompleteObs);
        // Initial state should be inactive and incomplete
        assert.deepStrictEqual(session.progressObs.get(), []);
        assert.strictEqual(session.isCompleteObs.get(), false);
    });
    test('session queues progress before initialization and processes it after', async function () {
        const sessionId = 'test-id';
        const resource = LocalChatSessionUri.forSession(sessionId);
        const session = disposables.add(new ObservableChatSession(resource, 1, proxy, logService, dialogService));
        const progress1 = { kind: 'progressMessage', content: { value: 'Hello', isTrusted: false } };
        const progress2 = { kind: 'progressMessage', content: { value: 'World', isTrusted: false } };
        // Add progress before initialization - should be queued
        session.handleProgressChunk('req1', [progress1]);
        session.handleProgressChunk('req1', [progress2]);
        // Progress should be queued, not visible yet
        assert.deepStrictEqual(session.progressObs.get(), []);
        // Initialize the session
        const sessionContent = createSessionContent();
        proxy.$provideChatSessionContent.resolves(sessionContent);
        await session.initialize(CancellationToken.None);
        // Now progress should be visible
        assert.strictEqual(session.progressObs.get().length, 2);
        assert.deepStrictEqual(session.progressObs.get(), [progress1, progress2]);
        assert.strictEqual(session.isCompleteObs.get(), true); // Should be complete for sessions without active response callback or request handler
    });
    test('initialization loads session history and sets up capabilities', async function () {
        const sessionHistory = [
            { type: 'request', prompt: 'Previous question' },
            { type: 'response', parts: [{ kind: 'progressMessage', content: { value: 'Previous answer', isTrusted: false } }] }
        ];
        const sessionContent = createSessionContent({
            history: sessionHistory,
            hasActiveResponseCallback: true,
            hasRequestHandler: true
        });
        const session = disposables.add(await createInitializedSession(sessionContent));
        // Verify history was loaded
        assert.strictEqual(session.history.length, 2);
        assert.strictEqual(session.history[0].type, 'request');
        assert.strictEqual(session.history[0].prompt, 'Previous question');
        assert.strictEqual(session.history[1].type, 'response');
        // Verify capabilities were set up
        assert.ok(session.interruptActiveResponseCallback);
        assert.ok(session.requestHandler);
    });
    test('initialization is idempotent and returns same promise', async function () {
        const sessionId = 'test-id';
        const resource = LocalChatSessionUri.forSession(sessionId);
        const session = disposables.add(new ObservableChatSession(resource, 1, proxy, logService, dialogService));
        const sessionContent = createSessionContent();
        proxy.$provideChatSessionContent.resolves(sessionContent);
        const promise1 = session.initialize(CancellationToken.None);
        const promise2 = session.initialize(CancellationToken.None);
        assert.strictEqual(promise1, promise2);
        await promise1;
        // Should only call proxy once even though initialize was called twice
        assert.ok(proxy.$provideChatSessionContent.calledOnce);
    });
    test('progress handling works correctly after initialization', async function () {
        const sessionContent = createSessionContent();
        const session = disposables.add(await createInitializedSession(sessionContent));
        const progress = { kind: 'progressMessage', content: { value: 'New progress', isTrusted: false } };
        // Add progress after initialization
        session.handleProgressChunk('req1', [progress]);
        assert.deepStrictEqual(session.progressObs.get(), [progress]);
        // Session with no capabilities should remain complete
        assert.strictEqual(session.isCompleteObs.get(), true);
    });
    test('progress completion updates session state correctly', async function () {
        const sessionContent = createSessionContent();
        const session = disposables.add(await createInitializedSession(sessionContent));
        // Add some progress first
        const progress = { kind: 'progressMessage', content: { value: 'Processing...', isTrusted: false } };
        session.handleProgressChunk('req1', [progress]);
        // Session with no capabilities should already be complete
        assert.strictEqual(session.isCompleteObs.get(), true);
        session.handleProgressComplete('req1');
        assert.strictEqual(session.isCompleteObs.get(), true);
    });
    test('session with active response callback becomes active when progress is added', async function () {
        const sessionContent = createSessionContent({ hasActiveResponseCallback: true });
        const session = disposables.add(await createInitializedSession(sessionContent));
        // Session should start inactive and incomplete (has capabilities but no active progress)
        assert.strictEqual(session.isCompleteObs.get(), false);
        const progress = { kind: 'progressMessage', content: { value: 'Processing...', isTrusted: false } };
        session.handleProgressChunk('req1', [progress]);
        assert.strictEqual(session.isCompleteObs.get(), false);
        session.handleProgressComplete('req1');
        assert.strictEqual(session.isCompleteObs.get(), true);
    });
    test('request handler forwards requests to proxy', async function () {
        const sessionContent = createSessionContent({ hasRequestHandler: true });
        const session = disposables.add(await createInitializedSession(sessionContent));
        assert.ok(session.requestHandler);
        const request = {
            requestId: 'req1',
            sessionId: 'test-session',
            sessionResource: LocalChatSessionUri.forSession('test-session'),
            agentId: 'test-agent',
            message: 'Test prompt',
            location: ChatAgentLocation.Chat,
            variables: { variables: [] }
        };
        const progressCallback = sinon.stub();
        await session.requestHandler(request, progressCallback, [], CancellationToken.None);
        assert.ok(proxy.$invokeChatSessionRequestHandler.calledOnceWith(1, session.sessionResource, request, [], CancellationToken.None));
    });
    test('request handler forwards progress updates to external callback', async function () {
        const sessionContent = createSessionContent({ hasRequestHandler: true });
        const session = disposables.add(await createInitializedSession(sessionContent));
        assert.ok(session.requestHandler);
        const request = {
            requestId: 'req1',
            sessionId: 'test-session',
            sessionResource: LocalChatSessionUri.forSession('test-session'),
            agentId: 'test-agent',
            message: 'Test prompt',
            location: ChatAgentLocation.Chat,
            variables: { variables: [] }
        };
        const progressCallback = sinon.stub();
        let resolveRequest;
        const requestPromise = new Promise(resolve => {
            resolveRequest = resolve;
        });
        proxy.$invokeChatSessionRequestHandler.returns(requestPromise);
        const requestHandlerPromise = session.requestHandler(request, progressCallback, [], CancellationToken.None);
        const progress1 = { kind: 'progressMessage', content: { value: 'Progress 1', isTrusted: false } };
        const progress2 = { kind: 'progressMessage', content: { value: 'Progress 2', isTrusted: false } };
        session.handleProgressChunk('req1', [progress1]);
        session.handleProgressChunk('req1', [progress2]);
        // Wait a bit for autorun to trigger
        await new Promise(resolve => setTimeout(resolve, 0));
        assert.ok(progressCallback.calledTwice);
        assert.deepStrictEqual(progressCallback.firstCall.args[0], [progress1]);
        assert.deepStrictEqual(progressCallback.secondCall.args[0], [progress2]);
        // Complete the request
        resolveRequest();
        await requestHandlerPromise;
        assert.strictEqual(session.isCompleteObs.get(), true);
    });
    test('dispose properly cleans up resources and notifies listeners', function () {
        const sessionId = 'test-id';
        const resource = LocalChatSessionUri.forSession(sessionId);
        const session = disposables.add(new ObservableChatSession(resource, 1, proxy, logService, dialogService));
        let disposeEventFired = false;
        const disposable = session.onWillDispose(() => {
            disposeEventFired = true;
        });
        session.dispose();
        assert.ok(disposeEventFired);
        assert.ok(proxy.$disposeChatSessionContent.calledOnceWith(1, resource));
        disposable.dispose();
    });
    test('session with multiple request/response pairs in history', async function () {
        const sessionHistory = [
            { type: 'request', prompt: 'First question' },
            { type: 'response', parts: [{ kind: 'progressMessage', content: { value: 'First answer', isTrusted: false } }] },
            { type: 'request', prompt: 'Second question' },
            { type: 'response', parts: [{ kind: 'progressMessage', content: { value: 'Second answer', isTrusted: false } }] }
        ];
        const sessionContent = createSessionContent({
            history: sessionHistory,
            hasActiveResponseCallback: false,
            hasRequestHandler: false
        });
        const session = disposables.add(await createInitializedSession(sessionContent));
        // Verify all history was loaded correctly
        assert.strictEqual(session.history.length, 4);
        assert.strictEqual(session.history[0].type, 'request');
        assert.strictEqual(session.history[0].prompt, 'First question');
        assert.strictEqual(session.history[1].type, 'response');
        assert.strictEqual(session.history[1].parts[0].content.value, 'First answer');
        assert.strictEqual(session.history[2].type, 'request');
        assert.strictEqual(session.history[2].prompt, 'Second question');
        assert.strictEqual(session.history[3].type, 'response');
        assert.strictEqual(session.history[3].parts[0].content.value, 'Second answer');
        // Session should be complete since it has no capabilities
        assert.strictEqual(session.isCompleteObs.get(), true);
    });
});
suite('MainThreadChatSessions', function () {
    let instantiationService;
    let mainThread;
    let proxy;
    let chatSessionsService;
    let disposables;
    const exampleSessionResource = LocalChatSessionUri.forSession('new-session-id');
    setup(function () {
        disposables = new DisposableStore();
        instantiationService = new TestInstantiationService();
        proxy = {
            $provideChatSessionContent: sinon.stub(),
            $provideChatSessionProviderOptions: sinon.stub().resolves(undefined),
            $provideHandleOptionsChange: sinon.stub(),
            $interruptChatSessionActiveResponse: sinon.stub(),
            $invokeChatSessionRequestHandler: sinon.stub(),
            $disposeChatSessionContent: sinon.stub(),
            $provideChatSessionItems: sinon.stub(),
            $provideNewChatSessionItem: sinon.stub().resolves({ resource: exampleSessionResource, label: 'New Session' })
        };
        const extHostContext = new class {
            constructor() {
                this.remoteAuthority = '';
                this.extensionHostKind = 1 /* ExtensionHostKind.LocalProcess */;
            }
            dispose() { }
            assertRegistered() { }
            set(v) { return null; }
            getProxy() { return proxy; }
            drain() { return null; }
        };
        instantiationService.stub(IConfigurationService, new TestConfigurationService());
        instantiationService.stub(IContextKeyService, disposables.add(instantiationService.createInstance(ContextKeyService)));
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IEditorService, new class extends mock() {
        });
        instantiationService.stub(IExtensionService, new TestExtensionService());
        instantiationService.stub(IViewsService, new class extends mock() {
            async openView() { return null; }
        });
        instantiationService.stub(IDialogService, new class extends mock() {
            async confirm() {
                return { confirmed: true };
            }
        });
        instantiationService.stub(ILabelService, new class extends mock() {
            registerFormatter() {
                return {
                    dispose: () => { }
                };
            }
        });
        chatSessionsService = disposables.add(instantiationService.createInstance(ChatSessionsService));
        instantiationService.stub(IChatSessionsService, chatSessionsService);
        mainThread = disposables.add(instantiationService.createInstance(MainThreadChatSessions, extHostContext));
    });
    teardown(function () {
        disposables.dispose();
        instantiationService.dispose();
        sinon.restore();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('provideNewChatSessionItem creates a new chat session', async function () {
        mainThread.$registerChatSessionItemProvider(1, 'test-type');
        // Create a mock IChatAgentRequest
        const mockRequest = {
            sessionId: 'test-session',
            sessionResource: LocalChatSessionUri.forSession('test-session'),
            requestId: 'test-request',
            agentId: 'test-agent',
            message: 'my prompt',
            location: ChatAgentLocation.Chat,
            variables: { variables: [] }
        };
        // Valid
        const chatSessionItem = await chatSessionsService.getNewChatSessionItem('test-type', {
            request: mockRequest,
            metadata: {}
        }, CancellationToken.None);
        assert.ok(isEqual(chatSessionItem.resource, exampleSessionResource));
        assert.strictEqual(chatSessionItem.label, 'New Session');
        // Invalid session type should throw
        await assert.rejects(chatSessionsService.getNewChatSessionItem('invalid-type', {
            request: mockRequest,
            metadata: {}
        }, CancellationToken.None));
        mainThread.$unregisterChatSessionItemProvider(1);
    });
    test('provideChatSessionContent creates and initializes session', async function () {
        const sessionScheme = 'test-session-type';
        mainThread.$registerChatSessionContentProvider(1, sessionScheme);
        const sessionContent = {
            id: 'test-session',
            history: [],
            hasActiveResponseCallback: false,
            hasRequestHandler: false
        };
        const resource = URI.parse(`${sessionScheme}:/test-session`);
        proxy.$provideChatSessionContent.resolves(sessionContent);
        const session1 = await chatSessionsService.getOrCreateChatSession(resource, CancellationToken.None);
        assert.ok(session1);
        const session2 = await chatSessionsService.getOrCreateChatSession(resource, CancellationToken.None);
        assert.strictEqual(session1, session2);
        assert.ok(proxy.$provideChatSessionContent.calledOnce);
        mainThread.$unregisterChatSessionContentProvider(1);
    });
    test('$handleProgressChunk routes to correct session', async function () {
        const sessionScheme = 'test-session-type';
        mainThread.$registerChatSessionContentProvider(1, sessionScheme);
        const sessionContent = {
            id: 'test-session',
            history: [],
            hasActiveResponseCallback: false,
            hasRequestHandler: false
        };
        proxy.$provideChatSessionContent.resolves(sessionContent);
        const resource = URI.parse(`${sessionScheme}:/test-session`);
        const session = await chatSessionsService.getOrCreateChatSession(resource, CancellationToken.None);
        const progressDto = { kind: 'progressMessage', content: { value: 'Test', isTrusted: false } };
        await mainThread.$handleProgressChunk(1, resource, 'req1', [progressDto]);
        assert.strictEqual(session.progressObs.get().length, 1);
        assert.strictEqual(session.progressObs.get()[0].kind, 'progressMessage');
        mainThread.$unregisterChatSessionContentProvider(1);
    });
    test('$handleProgressComplete marks session complete', async function () {
        const sessionScheme = 'test-session-type';
        mainThread.$registerChatSessionContentProvider(1, sessionScheme);
        const sessionContent = {
            id: 'test-session',
            history: [],
            hasActiveResponseCallback: false,
            hasRequestHandler: false
        };
        proxy.$provideChatSessionContent.resolves(sessionContent);
        const resource = URI.parse(`${sessionScheme}:/test-session`);
        const session = await chatSessionsService.getOrCreateChatSession(resource, CancellationToken.None);
        const progressDto = { kind: 'progressMessage', content: { value: 'Test', isTrusted: false } };
        await mainThread.$handleProgressChunk(1, resource, 'req1', [progressDto]);
        mainThread.$handleProgressComplete(1, resource, 'req1');
        assert.strictEqual(session.isCompleteObs.get(), true);
        mainThread.$unregisterChatSessionContentProvider(1);
    });
    test('integration with multiple request/response pairs', async function () {
        const sessionScheme = 'test-session-type';
        mainThread.$registerChatSessionContentProvider(1, sessionScheme);
        const sessionContent = {
            id: 'multi-turn-session',
            history: [
                { type: 'request', prompt: 'First question' },
                { type: 'response', parts: [{ kind: 'progressMessage', content: { value: 'First answer', isTrusted: false } }] },
                { type: 'request', prompt: 'Second question' },
                { type: 'response', parts: [{ kind: 'progressMessage', content: { value: 'Second answer', isTrusted: false } }] }
            ],
            hasActiveResponseCallback: false,
            hasRequestHandler: false
        };
        proxy.$provideChatSessionContent.resolves(sessionContent);
        const resource = URI.parse(`${sessionScheme}:/multi-turn-session`);
        const session = await chatSessionsService.getOrCreateChatSession(resource, CancellationToken.None);
        // Verify the session loaded correctly
        assert.ok(session);
        assert.strictEqual(session.history.length, 4);
        // Verify all history items are correctly loaded
        assert.strictEqual(session.history[0].type, 'request');
        assert.strictEqual(session.history[0].prompt, 'First question');
        assert.strictEqual(session.history[1].type, 'response');
        assert.strictEqual(session.history[2].type, 'request');
        assert.strictEqual(session.history[2].prompt, 'Second question');
        assert.strictEqual(session.history[3].type, 'response');
        // Session should be complete since it has no active capabilities
        assert.strictEqual(session.isCompleteObs.get(), true);
        mainThread.$unregisterChatSessionContentProvider(1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTZXNzaW9ucy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZENoYXRTZXNzaW9ucy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEtBQUssS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUMvQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQ3RILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUN0SCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBR2pHLE9BQU8sRUFBb0Isb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztB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