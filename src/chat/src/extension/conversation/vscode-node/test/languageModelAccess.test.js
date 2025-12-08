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
const chatMLFetcher_1 = require("../../../../platform/chat/common/chatMLFetcher");
const mockChatMLFetcher_1 = require("../../../../platform/chat/test/common/mockChatMLFetcher");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const services_1 = require("../../../test/vscode-node/services");
const languageModelAccess_1 = require("../languageModelAccess");
suite('CopilotLanguageModelWrapper', () => {
    let accessor;
    let instaService;
    function createAccessor(vscodeExtensionContext) {
        const testingServiceCollection = (0, services_1.createExtensionTestingServices)();
        testingServiceCollection.define(chatMLFetcher_1.IChatMLFetcher, new mockChatMLFetcher_1.MockChatMLFetcher());
        accessor = testingServiceCollection.createTestingAccessor();
        instaService = accessor.get(instantiation_1.IInstantiationService);
    }
    suite('validateRequest - invalid', async () => {
        let wrapper;
        let endpoint;
        setup(async () => {
            createAccessor();
            endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
            wrapper = instaService.createInstance(languageModelAccess_1.CopilotLanguageModelWrapper);
        });
        const runTest = async (messages, tools, errMsg) => {
            await assert_1.default.rejects(() => wrapper.provideLanguageModelResponse(endpoint, messages, { tools, requestInitiator: 'unknown', toolMode: vscode.LanguageModelChatToolMode.Auto }, vscode.extensions.all[0].id, { report: () => { } }, cancellation_1.CancellationToken.None), err => {
                errMsg ??= 'Invalid request';
                assert_1.default.ok(err instanceof Error, 'expected an Error');
                assert_1.default.ok(err.message.includes(errMsg), `expected error to include "${errMsg}", got ${err.message}`);
                return true;
            });
        };
        test('empty', async () => {
            await runTest([]);
        });
        test('bad tool name', async () => {
            await runTest([vscode.LanguageModelChatMessage.User('hello')], [{ name: 'hello world', description: 'my tool' }], 'Invalid tool name');
        });
    });
    suite('validateRequest - valid', async () => {
        let wrapper;
        let endpoint;
        setup(async () => {
            createAccessor();
            endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
            wrapper = instaService.createInstance(languageModelAccess_1.CopilotLanguageModelWrapper);
        });
        const runTest = async (messages, tools) => {
            await wrapper.provideLanguageModelResponse(endpoint, messages, { tools, requestInitiator: 'unknown', toolMode: vscode.LanguageModelChatToolMode.Auto }, vscode.extensions.all[0].id, { report: () => { } }, cancellation_1.CancellationToken.None);
        };
        test('simple', async () => {
            await runTest([vscode.LanguageModelChatMessage.User('hello')]);
        });
        test('tool call and user message', async () => {
            const toolCall = vscode.LanguageModelChatMessage.Assistant('');
            toolCall.content = [new vscode.LanguageModelToolCallPart('id', 'func', { param: 123 })];
            const toolResult = vscode.LanguageModelChatMessage.User('');
            toolResult.content = [new vscode.LanguageModelToolResultPart('id', [new vscode.LanguageModelTextPart('result')])];
            await runTest([toolCall, toolResult, vscode.LanguageModelChatMessage.User('user message')]);
        });
        test('good tool name', async () => {
            await runTest([vscode.LanguageModelChatMessage.User('hello2')], [{ name: 'hello_world', description: 'my tool' }]);
        });
    });
});
//# sourceMappingURL=languageModelAccess.test.js.map