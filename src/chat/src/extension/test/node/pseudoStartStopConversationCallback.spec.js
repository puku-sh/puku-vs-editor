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
const vitest_1 = require("vitest");
const services_1 = require("../../../platform/test/node/services");
const mockChatResponseStream_1 = require("../../../util/common/test/mockChatResponseStream");
const async_1 = require("../../../util/vs/base/common/async");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const pseudoStartStopConversationCallback_1 = require("../../prompt/node/pseudoStartStopConversationCallback");
(0, vitest_1.suite)('Post Report Conversation Callback', () => {
    const postReportFn = (deltas) => {
        return ['<processed>', ...deltas.map(d => d.text), '</processed>'];
    };
    const annotations = [{ id: 123, details: { type: 'type', description: 'description' } }, { id: 456, details: { type: 'type2', description: 'description2' } }];
    let instaService;
    (0, vitest_1.beforeEach)(() => {
        const accessor = (0, services_1.createPlatformServices)().createTestingAccessor();
        instaService = accessor.get(instantiation_1.IInstantiationService);
    });
    (0, vitest_1.test)('Simple post-report', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [{
                start: 'end',
                stop: 'start'
            }], postReportFn);
        responseSource.emitOne({ delta: { text: 'one' } });
        responseSource.emitOne({ delta: { text: ' start ' } });
        responseSource.emitOne({ delta: { text: 'two' } });
        responseSource.emitOne({ delta: { text: ' end' } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(stream.items.map(p => p.value.value), ['one', ' ', '<processed>', ' ', 'two', ' ', '</processed>']);
    });
    (0, vitest_1.test)('Partial stop word with extra text before', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [{
                start: 'end',
                stop: 'start'
            }], postReportFn);
        responseSource.emitOne({ delta: { text: 'one sta' } });
        responseSource.emitOne({ delta: { text: 'rt' } });
        responseSource.emitOne({ delta: { text: ' two end' } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(stream.items.map(p => p.value.value), ['one ', '<processed>', ' two ', '</processed>']);
    });
    (0, vitest_1.test)('Partial stop word with extra text after', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [{
                start: 'end',
                stop: 'start'
            }], postReportFn);
        responseSource.emitOne({ delta: { text: 'one ', codeVulnAnnotations: annotations } });
        responseSource.emitOne({ delta: { text: 'sta' } });
        responseSource.emitOne({ delta: { text: 'rt two' } });
        responseSource.emitOne({ delta: { text: ' end' } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(stream.items[0].vulnerabilities, annotations.map(a => ({ title: a.details.type, description: a.details.description })));
        assert_1.default.deepStrictEqual(stream.items.map(p => p.value.value), ['one ', '<processed>', ' two', ' ', '</processed>']);
    });
    (0, vitest_1.test)('no second stop word', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [{
                start: 'end',
                stop: 'start'
            }], postReportFn);
        responseSource.emitOne({ delta: { text: 'one' } });
        responseSource.emitOne({ delta: { text: ' start ' } });
        responseSource.emitOne({ delta: { text: 'two' } });
        responseSource.emitOne({ delta: { text: ' ' } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(stream.items.map(p => p.value.value), ['one', ' ']);
    });
    (0, vitest_1.test)('Text on same line as start', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [
            {
                start: 'end',
                stop: 'start'
            }
        ], postReportFn);
        responseSource.emitOne({ delta: { text: 'this is test text\n\n' } });
        responseSource.emitOne({ delta: { text: 'eeep start\n\n' } });
        responseSource.emitOne({ delta: { text: 'test test test test 123456' } });
        responseSource.emitOne({ delta: { text: 'end\n\nhello' } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.deepStrictEqual(stream.items.map(p => p.value.value), ['this is test text\n\n', 'eeep ', '<processed>', '\n\n', 'test test test test 123456', '</processed>', '\n\nhello']);
    });
    (0, vitest_1.test)('Start word without a stop word', async () => {
        const responseSource = new async_1.AsyncIterableSource();
        const stream = new mockChatResponseStream_1.SpyChatResponseStream();
        const testObj = instaService.createInstance(pseudoStartStopConversationCallback_1.PseudoStopStartResponseProcessor, [{
                start: '[RESPONSE END]',
                stop: '[RESPONSE START]'
            }], postReportFn);
        responseSource.emitOne({ delta: { text: `I'm sorry, but as an AI programming assistant, I'm here to provide assistance with software development topics, specifically related to Visual Studio Code. I'm not equipped to provide a definition of a computer. [RESPONSE END]` } });
        responseSource.resolve();
        await testObj.doProcessResponse(responseSource.asyncIterable, stream, cancellation_1.CancellationToken.None);
        assert_1.default.strictEqual(stream.items[0].value.value, `I'm sorry, but as an AI programming assistant, I'm here to provide assistance with software development topics, specifically related to Visual Studio Code. I'm not equipped to provide a definition of a computer. [RESPONSE END]`);
    });
    (0, vitest_1.afterEach)(() => sinon.restore());
});
//# sourceMappingURL=pseudoStartStopConversationCallback.spec.js.map