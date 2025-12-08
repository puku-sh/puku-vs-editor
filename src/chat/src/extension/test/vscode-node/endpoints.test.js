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
const sinon_1 = require("sinon");
const tokenizer_1 = require("../../../util/common/tokenizer");
const event_1 = require("../../../util/vs/base/common/event");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const endpointProviderImpl_1 = require("../../prompt/vscode-node/endpointProviderImpl");
const services_1 = require("./services");
class FakeModelMetadataFetcher {
    constructor() {
        this.onDidModelsRefresh = event_1.Event.None;
    }
    async getAllChatModels() {
        return [];
    }
    async getAllCompletionModels(forceRefresh) {
        return [];
    }
    async getChatModelFromApiModel(model) {
        return undefined;
    }
    async getChatModelFromFamily(modelId) {
        return {
            id: modelId,
            name: 'fake-name',
            version: 'fake-version',
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            capabilities: {
                supports: { streaming: true },
                type: 'chat',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                family: 'fake-family'
            }
        };
    }
    async getEmbeddingsModel() {
        return {
            id: 'text-embedding-3-small',
            name: 'fake-name',
            version: 'fake-version',
            model_picker_enabled: false,
            is_chat_default: false,
            is_chat_fallback: false,
            capabilities: {
                type: 'embeddings',
                tokenizer: tokenizer_1.TokenizerType.O200K,
                family: 'text-embedding-3-small',
                limits: { max_inputs: 256 }
            }
        };
    }
}
suite('Endpoint Class Test', function () {
    let accessor;
    let endpointProvider;
    let sandbox;
    setup(() => {
        accessor = (0, services_1.createExtensionTestingServices)().createTestingAccessor();
        endpointProvider = accessor.get(instantiation_1.IInstantiationService).createInstance(endpointProviderImpl_1.ProductionEndpointProvider, () => { });
        sandbox = (0, sinon_1.createSandbox)();
        //@ts-expect-error
        sandbox.replace(endpointProvider, '_modelFetcher', new FakeModelMetadataFetcher());
    });
    teardown(() => {
        sandbox.restore();
    });
    test('getChatEndpoint by family', async function () {
        const chatEndpointInfo = await endpointProvider.getChatEndpoint('gpt-5-mini');
        assert_1.default.strictEqual(chatEndpointInfo.model, 'gpt-5-mini');
    });
    test('Model names have proper casing', async function () {
        assert_1.default.strictEqual("gpt-4.1-2025-04-14" /* CHAT_MODEL.GPT41 */, 'gpt-4.1-2025-04-14', 'Incorrect GPT 41 model name, changing this will break requests.');
        assert_1.default.strictEqual("gpt-4o-mini" /* CHAT_MODEL.GPT4OMINI */, 'gpt-4o-mini', 'Incorrect GPT 4o mini model name, changing this will break requests.');
    });
});
//# sourceMappingURL=endpoints.test.js.map