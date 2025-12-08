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
const vscode = __importStar(require("vscode"));
const copilotTokenManager_1 = require("../../../../platform/authentication/common/copilotTokenManager");
const telemetry_1 = require("../../../../platform/test/node/telemetry");
const mockChatResponseStream_1 = require("../../../../util/common/test/mockChatResponseStream");
const event_1 = require("../../../../util/vs/base/common/event");
const descriptors_1 = require("../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const chatParticipantRequestHandler_1 = require("../../../prompt/node/chatParticipantRequestHandler");
const testHelpers_1 = require("../../../test/node/testHelpers");
const services_1 = require("../../../test/vscode-node/services");
suite('Conversation telemetry tests - Integration tests', function () {
    this.timeout(10000);
    test.skip('Telemetry for user message', async function () {
        const testingServiceCollection = (0, services_1.createExtensionTestingServices)();
        testingServiceCollection.define(copilotTokenManager_1.ICopilotTokenManager, new descriptors_1.SyncDescriptor(SimulationTestCopilotTokenManager));
        const messageText = 'Write me a function that returns the square root of a number.';
        const [messages] = await (0, telemetry_1.withTelemetryCapture)(testingServiceCollection, async (accessor) => {
            const token = new vscode.CancellationTokenSource().token;
            const request = new testHelpers_1.TestChatRequest(messageText);
            const stream = new mockChatResponseStream_1.SpyChatResponseStream();
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            const session = instantiationService.createInstance(chatParticipantRequestHandler_1.ChatParticipantRequestHandler, [], request, stream, token, { agentName: '', agentId: '' }, event_1.Event.None);
            await session.getResult(); // and throw away the result
        });
        assert_1.default.ok((0, telemetry_1.allEvents)(messages));
        const names = messages
            .map(message => message.data.baseData.name.split('/')[1])
            // in case we need a new Copilot token, we don't care about the messages that triggers
            .filter(name => !['auth.new_login', 'auth.new_token'].includes(name));
        // Check client telemetry events
        orderMatches([
            'conversation.message',
            'conversation.messageText',
            'request.sent',
            'request.response',
            'engine.messages',
            'engine.messages.length',
            'model.request.added',
            'model.message.added',
            'model.modelCall.input',
            'model.request.options.added',
            'request.shownWarning',
        ].sort(), names.filter(name => name !== 'log').sort());
        // Check there exists a conversation.message event for the user with the correct properties and measurements
        const userMessage = messages.find(message => message.data.baseData.name.split('/')[1] === 'conversation.message' &&
            message.data.baseData.properties.source === 'user');
        const userMessageId = userMessage?.data.baseData.properties.messageId;
        // conversation.message event exists
        assert_1.default.ok(userMessage, 'conversation.message event for user message does not exist');
        // Turn index is 0 because this is the first message in the conversation
        assert_1.default.ok(userMessage.data.baseData.properties.turnIndex === '0', 'conversation.message event for user message has turn index != 0');
        // Message length equals the length of the message text
        assert_1.default.ok(userMessage.data.baseData.measurements.messageCharLen === messageText.length, 'conversation.message event for user message has incorrect message length');
        // Check there exists a conversation.messageText event for the user with the correct properties and measurements
        const userMessageText = messages.find(message => message.data.baseData.name.split('/')[1] === 'conversation.messageText' &&
            message.data.baseData.properties.messageId === userMessageId);
        // conversation.messageText event exists with matching messageId
        assert_1.default.ok(userMessageText, 'conversation.messageText event for user message does not exist');
        assert_1.default.ok(userMessageText.data.baseData.properties.messageText === messageText, 'conversation.messageText event for user message has incorrect message text');
        // Check there exists a request.sent event with matching messageId
        const userMessageRequest = messages.find(message => message.data.baseData.name.split('/')[1] === 'request.sent' &&
            message.data.baseData.properties.messageId === userMessageId);
        // request.sent event exists with matching messageId
        assert_1.default.ok(userMessageRequest, 'request.sent event for user message does not exist');
        // Check there exists a request.response event with matching messageId
        const userMessageResponse = messages.find(message => message.data.baseData.name.split('/')[1] === 'request.response' &&
            message.data.baseData.properties.messageId === userMessageId);
        // request.sent event exists with matching messageId
        assert_1.default.ok(userMessageResponse, 'request.response event for user message does not exist');
        // Check there exists a engine.messages event with matching messageId
        const userMessageEngine = messages.find(message => message.data.baseData.name.split('/')[1] === 'engine.messages' &&
            message.data.baseData.properties.messageId === userMessageId);
        // engine.messages event exists with matching messageId
        assert_1.default.ok(userMessageEngine, 'engine.messages event for user message does not exist');
        // Check that the engine.messages event has a messagesJson property with length greater than or equal to message
        assert_1.default.ok(userMessageEngine.data.baseData.properties.messagesJson.length >= messageText.length, 'engine.messages event for user message has messagesJson property with length < message length');
        // Check there exists a engine.messages.length event with matching messageId
        const userMessageEngineLength = messages.find(message => message.data.baseData.name.split('/')[1] === 'engine.messages.length' &&
            message.data.baseData.properties.messageId === userMessageId);
        assert_1.default.ok(userMessageEngineLength, 'engine.messages.length event for user message does not exist');
        // Check there exists a model.request.added event with matching headerRequestId
        const modelRequestAdded = messages.find(message => message.data.baseData.name.split('/')[1] === 'model.request.added' &&
            message.data.baseData.properties.headerRequestId);
        assert_1.default.ok(modelRequestAdded, 'model.request.added event for user message does not exist');
        // Check there exists a model.message.added event with messageUuid
        const modelMessageAdded = messages.find(message => message.data.baseData.name.split('/')[1] === 'model.message.added' &&
            message.data.baseData.properties.messageUuid);
        assert_1.default.ok(modelMessageAdded, 'model.message.added event for user message does not exist');
        // Check there exists a model.modelCall.input event with modelCallId
        const modelCallInput = messages.find(message => message.data.baseData.name.split('/')[1] === 'model.modelCall.input' &&
            message.data.baseData.properties.modelCallId);
        assert_1.default.ok(modelCallInput, 'model.modelCall.input event for user message does not exist');
        // Check there exists a model.request.options.added event with requestOptionsId
        const modelRequestOptionsAdded = messages.find(message => message.data.baseData.name.split('/')[1] === 'model.request.options.added' &&
            message.data.baseData.properties.requestOptionsId);
        assert_1.default.ok(modelRequestOptionsAdded, 'model.request.options.added event for user message does not exist');
    });
});
function orderMatches(list1, list2) {
    const filteredList2 = list2.filter(el => list1.includes(el));
    const result = list1.every((el, index) => el === filteredList2[index]);
    assert_1.default.ok(result, `Expected members\n[${list2.join(', ')}]\nto be in order\n[${list1.join(', ')}].`);
}
//# sourceMappingURL=interactiveSessionProvider.telemetry.test.js.map