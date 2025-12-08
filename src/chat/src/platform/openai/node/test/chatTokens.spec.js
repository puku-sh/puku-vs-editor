"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const assert_1 = __importDefault(require("assert"));
const vitest_1 = require("vitest");
const services_1 = require("../../../../platform/test/node/services");
const tokenizer_1 = require("../../../../util/common/tokenizer");
const globalStringUtils_1 = require("../../../chat/common/globalStringUtils");
const nullTelemetryService_1 = require("../../../telemetry/common/nullTelemetryService");
const tokenizer_2 = require("../../../tokenizer/node/tokenizer");
(0, vitest_1.suite)('Chat tokens', function () {
    (0, vitest_1.test)('counts tokens of messages', async function () {
        const messages = [
            {
                role: prompt_tsx_1.Raw.ChatRole.System,
                content: (0, globalStringUtils_1.toTextParts)('You are a helpful, pattern-following assistant that translates corporate jargon into plain English.'),
            },
            { role: prompt_tsx_1.Raw.ChatRole.System, name: 'example_user', content: (0, globalStringUtils_1.toTextParts)('New synergies will help drive top-line growth.') },
            {
                role: prompt_tsx_1.Raw.ChatRole.System,
                name: 'example_assistant',
                content: (0, globalStringUtils_1.toTextParts)('Things working well together will increase revenue.'),
            },
            {
                role: prompt_tsx_1.Raw.ChatRole.System,
                name: 'example_user',
                content: (0, globalStringUtils_1.toTextParts)("Let's circle back when we have more bandwidth to touch base on opportunities for increased leverage."),
            },
            {
                role: prompt_tsx_1.Raw.ChatRole.System,
                name: 'example_assistant',
                content: (0, globalStringUtils_1.toTextParts)("Let's talk later when we're less busy about how to do better."),
            },
            {
                role: prompt_tsx_1.Raw.ChatRole.User,
                content: (0, globalStringUtils_1.toTextParts)("This late pivot means we don't have time to boil the ocean for the client deliverable."),
            },
        ];
        const testingServiceCollection = (0, services_1.createPlatformServices)();
        testingServiceCollection.define(tokenizer_2.ITokenizerProvider, new tokenizer_2.TokenizerProvider(false, new nullTelemetryService_1.NullTelemetryService()));
        const accessor = testingServiceCollection.createTestingAccessor();
        const tokens = await accessor.get(tokenizer_2.ITokenizerProvider).acquireTokenizer({ tokenizer: tokenizer_1.TokenizerType.CL100K }).countMessagesTokens(messages);
        assert_1.default.deepStrictEqual(tokens, 129);
    });
});
//# sourceMappingURL=chatTokens.spec.js.map