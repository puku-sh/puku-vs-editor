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
const chatVariablesCollection_1 = require("../../src/extension/prompt/common/chatVariablesCollection");
const vscode_1 = require("../../src/extension/prompts/node/panel/vscode");
const endpointProvider_1 = require("../../src/platform/endpoint/common/endpointProvider");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
stest_1.ssuite.skip({ title: 'vscode', subtitle: 'metaprompt', location: 'panel' }, async (_) => {
    const scenarios = [
        {
            question: 'how to opne command pallete',
            keywords: ['open', 'command palette'],
            excludedKeywords: ['how',]
        },
        {
            question: 'how do I change font size setting',
            keywords: ['setting', 'font size'],
            excludedKeywords: ['how',]
        },
        {
            question: 'enable word wrap in editer',
            keywords: ['enable', 'editor', 'word wrap'],
            excludedKeywords: []
        },
    ];
    for (const scenario of scenarios) {
        (0, stest_1.stest)({ description: scenario.question }, async (testingServiceCollection) => {
            const accessor = testingServiceCollection.createTestingAccessor();
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
            const vscodePrompt = instantiationService.createInstance(vscode_1.VscodePrompt, {
                promptContext: {
                    chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                    history: [],
                    query: scenario.question,
                },
                endpoint
            });
            const tokenizer = endpoint.acquireTokenizer();
            const countTokens = (text) => tokenizer.tokenLength(text);
            const prompt = await vscodePrompt.prepare({ tokenBudget: 2048, endpoint, countTokens }, undefined, cancellation_1.CancellationToken.None);
            assert_1.default.notEqual(prompt.query, scenario.question);
            for (const keyword of scenario.keywords) {
                assert_1.default.ok(prompt.query.toLowerCase().includes(keyword.toLowerCase()), `${keyword} not found in prompt query`);
            }
            for (const keyword of scenario.excludedKeywords) {
                assert_1.default.ok(!prompt.query.toLowerCase().includes(keyword.toLowerCase()), `prompt query should not include "${keyword}"`);
            }
        });
    }
});
//# sourceMappingURL=vscode-metaprompt.stest.js.map