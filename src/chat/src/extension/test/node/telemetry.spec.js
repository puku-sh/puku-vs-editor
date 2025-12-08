"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const services_1 = require("../../../platform/test/node/services");
const telemetry_2 = require("../../../platform/test/node/telemetry");
const telemetry_3 = require("../../prompt/node/telemetry");
// TODO @lramos15 Re-enable once telemetry has been fully cleaned up
vitest_1.suite.skip('Conversation telemetry tests', { timeout: 10000 }, function () {
    (0, vitest_1.test)('Test telemetryMessage', async function () {
        // Set up inputs
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        const document = undefined;
        const messageText = 'hello world!';
        const messageLen = 12;
        const prompt = 'You are a programming assistant. Respond to the question hello world!';
        const source = 'user';
        const turnIndex = 0;
        const intentClassifierScore = 1;
        const intentClassifierLatency = 10;
        // Call function
        const [messages] = await (0, telemetry_2.withTelemetryCapture)(testingServiceCollection, async (accessor) => {
            const telemetryData = (0, telemetry_3.sendConversationalMessageTelemetry)(accessor.get(telemetry_1.ITelemetryService), document, commonTypes_1.ChatLocation.Panel, messageText, { source: source, turnIndex: turnIndex.toString() }, {
                messageCharLen: messageLen,
                promptCharLen: prompt.length,
                intentClassifierScore: intentClassifierScore,
                intentClassifierLatency: intentClassifierLatency,
            }, (0, telemetry_3.createTelemetryWithId)());
            // Check that properties and measurements for standard telemetry are correct
            assert_1.default.strictEqual(telemetryData.properties.source, source);
            assert_1.default.strictEqual(telemetryData.properties.turnIndex, turnIndex.toString());
            assert_1.default.strictEqual(telemetryData.measurements.messageCharLen, messageText.length);
            assert_1.default.strictEqual(telemetryData.measurements.promptCharLen, prompt.length);
            assert_1.default.strictEqual(telemetryData.measurements.intentClassifierScore, intentClassifierScore);
            assert_1.default.strictEqual(telemetryData.measurements.intentClassifierLatency, intentClassifierLatency);
            // Check that enhanced telemetry fields are not in standard telemetry data
            (0, assert_1.default)(!('messageText' in telemetryData.properties));
        });
        // All of the below adapted from the ghostText telemetry integration tests
        assert_1.default.ok((0, telemetry_2.allEvents)(messages));
        const names = messages
            .map(message => message.data.baseData.name.split('/')[1])
            // In case we need a new Copilot token, we don't care about the messages that triggers
            .filter(name => !['auth.new_login', 'auth.new_token'].includes(name));
        // Correct events are created
        assert_1.default.deepStrictEqual(names.filter(name => !name.startsWith('engine.') && name !== 'log').sort(), ['conversation.message', 'conversation.messageText'].sort());
        // Correct properties are attached to the message events
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.properties.source === source));
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.properties.turnIndex === turnIndex.toString()));
        // Correct measurements are attached to the message events
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.measurements.messageCharLen === messageLen));
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.measurements.promptCharLen === prompt.length));
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.measurements.intentClassifierScore === intentClassifierScore));
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.message')
            .every(message => message.data.baseData.measurements.intentClassifierLatency === intentClassifierLatency));
        // Correct properties are attached to the messageText events
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.messageText')
            .every(message => message.data.baseData.properties.messageText === messageText));
    });
    (0, vitest_1.test)('Test telemetryUserAction', async function () {
        // Set up inputs
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        const document = undefined;
        const rating = 'positive';
        const messageId = '12345';
        const name = 'conversation.messageRating';
        // Call function
        const [messages] = await (0, telemetry_2.withTelemetryCapture)(testingServiceCollection, async (accessor) => {
            const telemetryData = (0, telemetry_3.sendUserActionTelemetry)(accessor.get(telemetry_1.ITelemetryService), document, { rating: rating, messageId: messageId }, {}, name);
            // Check that properties and measurements for standard telemetry are correct
            assert_1.default.strictEqual(telemetryData.properties.rating, rating);
            assert_1.default.strictEqual(telemetryData.properties.messageId, messageId);
        });
        // All of the below adapted from the ghostText telemetry integration tests
        assert_1.default.ok((0, telemetry_2.allEvents)(messages));
        const names = messages
            .map(message => message.data.baseData.name.split('/')[1])
            // In case we need a new Copilot token, we don't care about the messages that triggers
            .filter(name => !['auth.new_login', 'auth.new_token'].includes(name));
        // Correct events are created
        assert_1.default.deepStrictEqual(names.filter(name => !name.startsWith('engine.') && name !== 'log').sort(), ['conversation.messageRating'].sort());
        // Correct properties are attached to the message events
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.messageRating')
            .every(message => message.data.baseData.properties.rating === rating));
        assert_1.default.ok(messages
            .filter(message => message.data.baseData.name.split('/')[1] === 'conversation.messageRating')
            .every(message => message.data.baseData.properties.messageId === messageId));
    });
    (0, vitest_1.test)('Test getCodeBlocks with no code', async function () {
        // Set up inputs
        const noCode = 'hello world';
        // Test no code case
        const noCodeResult = (0, telemetry_3.getCodeBlocks)(noCode);
        assert_1.default.strictEqual(noCodeResult.length, 0, 'Length of no code result should be 0');
    });
    (0, vitest_1.test)('Test getCodeBlocks with one code block, no language', async function () {
        // Set up inputs
        const basicNoLang = '\n```\nhello world\n```';
        // Test basic no lang case
        const basicNoLangResult = (0, telemetry_3.getCodeBlocks)(basicNoLang);
        assert_1.default.deepEqual(basicNoLangResult, [''], 'Basic no lang result should be an array with an empty string');
    });
    (0, vitest_1.test)('Test getCodeBlocks with one code block with language', async function () {
        // Set up inputs
        const basicWithLang = '\n```python\nhello world\n```';
        // Test basic with lang case
        const basicWithLangResult = (0, telemetry_3.getCodeBlocks)(basicWithLang);
        assert_1.default.deepEqual(basicWithLangResult, ['python'], 'Basic with lang result should be an array with a single string');
    });
    (0, vitest_1.test)('Test getCodeBlocks with nested code blocks', async function () {
        // Set up inputs
        const nested = '\n```\n```python\ndef hello_world():\n    print("Hello, world!")\n```\n```\n\n';
        // Test nested case
        const nestedResult = (0, telemetry_3.getCodeBlocks)(nested);
        assert_1.default.deepEqual(nestedResult, [''], 'Nested result should be an array with one empty string, ignoring backticks within the code block');
    });
    (0, vitest_1.test)('Test getCodeBlocks with multiple nested code blocks', async function () {
        // Set up inputs
        const multiNested = "\n```\n```python\ndef hello_world():\n    print('Hello, world!'')\n```\n```\n\nThis will render as:\n\n```python\ndef hello_world():\n    print('Hello, world!'')\n```";
        // Test multi nested case
        const multiNestedResult = (0, telemetry_3.getCodeBlocks)(multiNested);
        assert_1.default.deepEqual(multiNestedResult, ['', ''], 'Multi nested result should be an array with two empty strings, ignoring backticks within the code block');
    });
    (0, vitest_1.test)('Test getCodeBlocks with escaped backticks', async function () {
        // Set up inputs
        const escaped = '\n\n\\`\\`\\`python\nprint("Hello, world!")\n\\`\\`\\`\n\nThis will produce:\n\n```python\nprint("Hello, world!")\n```';
        // Test escaped case
        const escapedResult = (0, telemetry_3.getCodeBlocks)(escaped);
        assert_1.default.deepEqual(escapedResult, ['python'], 'Escaped result should be an array with a single string, ignoring escaped backticks');
    });
});
//# sourceMappingURL=telemetry.spec.js.map