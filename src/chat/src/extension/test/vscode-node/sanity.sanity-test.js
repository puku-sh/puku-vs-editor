"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const sinon = __importStar(require("sinon"));
const vscode = __importStar(require("vscode"));
const mockChatResponseStream_1 = require("../../../util/common/test/mockChatResponseStream");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const event_1 = require("../../../util/vs/base/common/event");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const conversationFeature_1 = require("../../conversation/vscode-node/conversationFeature");
const conversationStore_1 = require("../../conversationStore/node/conversationStore");
const extension_1 = require("../../extension/vscode-node/extension");
const chatParticipantRequestHandler_1 = require("../../prompt/node/chatParticipantRequestHandler");
const toolNames_1 = require("../../tools/common/toolNames");
const toolsService_1 = require("../../tools/common/toolsService");
const testHelpers_1 = require("../node/testHelpers");
suite('Copilot Chat Sanity Test', function () {
    this.timeout(1000 * 60 * 1); // 1 minute
    let realInstaAccessor;
    let realContext;
    let sandbox;
    const fakeToken = cancellation_1.CancellationToken.None;
    // Before everything, activate the extension
    suiteSetup(async function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(vscode.commands, 'registerCommand').returns({ dispose: () => { } });
        sandbox.stub(vscode.workspace, 'registerFileSystemProvider').returns({ dispose: () => { } });
        const extension = vscode.extensions.getExtension('Github.copilot-chat');
        assert_1.default.ok(extension, 'Extension is not available');
        realContext = await extension.activate();
        assert_1.default.ok(realContext, '`extension.activate()` did not return context`');
        assert_1.default.ok(realContext.extensionMode, 'extension context does not have `extensionMode`');
        const activateResult = await (0, extension_1.activate)(realContext, true);
        assert_1.default.ok(activateResult, 'Activation result is not available');
        // Assert that the activateResult is a service accessor
        assert_1.default.strictEqual(typeof activateResult.createInstance, 'function', 'createInstance is not a function');
        assert_1.default.strictEqual(typeof activateResult.invokeFunction, 'function', 'invokeFunction is not a function');
        realInstaAccessor = activateResult;
    });
    suiteTeardown(async function () {
        sandbox.restore();
        // Dispose of all subscriptions
        realContext.subscriptions.forEach((sub) => {
            try {
                sub.dispose();
            }
            catch (e) {
                console.error(e);
            }
        });
    });
    test('E2E Production Panel Chat Test', async function () {
        assert_1.default.ok(realInstaAccessor, 'Instantiation service accessor is not available');
        await realInstaAccessor.invokeFunction(async (accessor) => {
            const conversationStore = accessor.get(conversationStore_1.IConversationStore);
            const instaService = accessor.get(instantiation_1.IInstantiationService);
            const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
            try {
                conversationFeature.activated = true;
                let stream = new mockChatResponseStream_1.SpyChatResponseStream();
                let interactiveSession = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], new testHelpers_1.TestChatRequest('Write me a for loop in javascript'), stream, fakeToken, { agentName: '', agentId: '', intentId: '' }, event_1.Event.None);
                await interactiveSession.getResult();
                assert_1.default.ok(stream.currentProgress, 'Expected progress after first request');
                const oldText = stream.currentProgress;
                stream = new mockChatResponseStream_1.SpyChatResponseStream();
                interactiveSession = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], new testHelpers_1.TestChatRequest('Can you make it in typescript instead'), stream, fakeToken, { agentName: '', agentId: '', intentId: '' }, event_1.Event.None);
                const result2 = await interactiveSession.getResult();
                assert_1.default.ok(stream.currentProgress, 'Expected progress after second request');
                assert_1.default.notStrictEqual(stream.currentProgress, oldText, 'Expected different progress text after second request');
                const conversation = conversationStore.getConversation(result2.metadata.responseId);
                assert_1.default.ok(conversation, 'Expected conversation to be available');
            }
            finally {
                conversationFeature.activated = false;
            }
        });
    });
    test('E2E Production agent mode', async function () {
        assert_1.default.ok(realInstaAccessor, 'Instantiation service accessor is not available');
        await realInstaAccessor.invokeFunction(async (accessor) => {
            const conversationStore = accessor.get(conversationStore_1.IConversationStore);
            const instaService = accessor.get(instantiation_1.IInstantiationService);
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
            try {
                conversationFeature.activated = true;
                let stream = new mockChatResponseStream_1.SpyChatResponseStream();
                const testRequest = new testHelpers_1.TestChatRequest(`You must use the search tool to search for "foo". It may fail, that's ok, just testing`);
                testRequest.tools.set(toolNames_1.ContributedToolName.FindTextInFiles, true);
                let interactiveSession = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], testRequest, stream, fakeToken, { agentName: '', agentId: '', intentId: "editAgent" /* Intent.Agent */ }, event_1.Event.None);
                const onWillInvokeTool = event_1.Event.toPromise(toolsService.onWillInvokeTool);
                const getResultPromise = interactiveSession.getResult();
                await Promise.race([onWillInvokeTool, (0, async_1.timeout)(20_000).then(() => Promise.reject(new Error('timed out waiting for tool call. ' + (stream.currentProgress ? ('Got progress: ' + stream.currentProgress) : ''))))]);
                await getResultPromise;
                assert_1.default.ok(stream.currentProgress, 'Expected output');
                const oldText = stream.currentProgress;
                stream = new mockChatResponseStream_1.SpyChatResponseStream();
                interactiveSession = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], new testHelpers_1.TestChatRequest('And what is 1+1'), stream, fakeToken, { agentName: '', agentId: '', intentId: "editAgent" /* Intent.Agent */ }, event_1.Event.None);
                const result2 = await interactiveSession.getResult();
                assert_1.default.ok(stream.currentProgress, 'Expected progress after second request');
                assert_1.default.notStrictEqual(stream.currentProgress, oldText, 'Expected different progress text after second request');
                const conversation = conversationStore.getConversation(result2.metadata.responseId);
                assert_1.default.ok(conversation, 'Expected conversation to be available');
            }
            finally {
                conversationFeature.activated = false;
            }
        });
    });
    test('Slash Commands work properly', async function () {
        assert_1.default.ok(realInstaAccessor);
        await realInstaAccessor.invokeFunction(async (accessor) => {
            const instaService = accessor.get(instantiation_1.IInstantiationService);
            const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
            try {
                conversationFeature.activated = true;
                const progressReport = new mockChatResponseStream_1.SpyChatResponseStream();
                const interactiveSession = instaService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], new testHelpers_1.TestChatRequest('What is a fibonacci sequence?'), progressReport, fakeToken, { agentName: '', agentId: '', intentId: 'explain' }, event_1.Event.None);
                // Ask a `/explain` question
                await interactiveSession.getResult();
                assert_1.default.ok(progressReport.currentProgress);
            }
            finally {
                conversationFeature.activated = false;
            }
        });
    });
    test.skip('E2E Production Inline Chat Test', async function () {
        assert_1.default.ok(realInstaAccessor);
        await realInstaAccessor.invokeFunction(async (accessor) => {
            const r = vscode.lm.registerLanguageModelChatProvider('test', new class {
                async provideLanguageModelChatInformation(options, token) {
                    return [{
                            id: 'test',
                            name: 'test',
                            family: 'test',
                            version: '0.0.0',
                            maxInputTokens: 1000,
                            maxOutputTokens: 1000,
                            requiresAuthorization: true,
                            capabilities: {}
                        }];
                }
                async provideLanguageModelChatResponse(model, messages, options, progress, token) {
                    throw new Error('Method not implemented.');
                }
                async provideTokenCount(model, text, token) {
                    return 0;
                }
            });
            const instaService = accessor.get(instantiation_1.IInstantiationService);
            const conversationFeature = instaService.createInstance(conversationFeature_1.ConversationFeature);
            try {
                conversationFeature.activated = true;
                // Create and open a new file
                const document = await vscode.workspace.openTextDocument({ language: 'javascript' });
                await vscode.window.showTextDocument(document);
                // Wait for a document change event or 10 seconds whatever comes first then assert the text
                const textPromise = new Promise((resolve, reject) => {
                    const listener = vscode.workspace.onDidChangeTextDocument(async (e) => {
                        if (e.document.uri.scheme !== 'untitled') {
                            return;
                        }
                        if (e.document.getText().length !== 0) {
                            listener.dispose();
                            resolve(e.document.getText());
                        }
                    });
                });
                await vscode.commands.executeCommand('vscode.editorChat.start', {
                    autoSend: true,
                    message: 'Write me a for loop in javascript',
                    position: new vscode.Position(0, 0),
                    initialSelection: new vscode.Selection(0, 0, 0, 0),
                    initialRange: new vscode.Range(0, 0, 0, 0),
                });
                const text = await textPromise;
                assert_1.default.ok(text.length > 0);
            }
            finally {
                conversationFeature.activated = false;
                r.dispose();
            }
        });
    });
});
//# sourceMappingURL=sanity.sanity-test.js.map