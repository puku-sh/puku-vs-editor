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
const workspaceContext_1 = require("../../src/extension/prompts/node/panel/workspace/workspaceContext");
const endpointProvider_1 = require("../../src/platform/endpoint/common/endpointProvider");
const simulationWorkspace_1 = require("../../src/platform/test/node/simulationWorkspace");
const telemetryCorrelationId_1 = require("../../src/util/common/telemetryCorrelationId");
const mockChatResponseStream_1 = require("../../src/util/common/test/mockChatResponseStream");
const cancellation_1 = require("../../src/util/vs/base/common/cancellation");
const uuid_1 = require("../../src/util/vs/base/common/uuid");
const instantiation_1 = require("../../src/util/vs/platform/instantiation/common/instantiation");
const stest_1 = require("../base/stest");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
(0, stest_1.ssuite)({ title: 'workspace', subtitle: 'metaprompt', location: 'panel' }, (inputPath) => {
    // No default cases checked in at the moment
    if (!inputPath) {
        return;
    }
    const scenariosFolder = inputPath;
    const scenarios = (0, scenarioLoader_1.discoverScenarios)(scenariosFolder);
    for (const scenario of scenarios) {
        const fileName = scenario[0].name;
        const testName = fileName.substring(0, fileName.indexOf('.'));
        stest_1.stest.optional(scenarioTest_1.shouldSkip.bind(undefined, scenario), { description: testName }, async (testingServiceCollection) => {
            const simulationWorkspace = new simulationWorkspace_1.SimulationWorkspace();
            simulationWorkspace.setupServices(testingServiceCollection);
            const accessor = testingServiceCollection.createTestingAccessor();
            const instantiationService = accessor.get(instantiation_1.IInstantiationService);
            for (let i = 0; i < scenario.length; i++) {
                const testCase = scenario[i];
                simulationWorkspace.resetFromDeserializedWorkspaceState(testCase.getState?.());
                const requestId = (0, uuid_1.generateUuid)();
                const context = instantiationService.createInstance(workspaceContext_1.WorkspaceContext, {
                    telemetryInfo: new telemetryCorrelationId_1.TelemetryCorrelationId('e2e', requestId),
                    promptContext: {
                        requestId,
                        chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                        history: [],
                        query: testCase.question,
                    }
                });
                const endpoint = await accessor.get(endpointProvider_1.IEndpointProvider).getChatEndpoint('gpt-4.1');
                const tokenizer = endpoint.acquireTokenizer();
                const countTokens = (text) => tokenizer.tokenLength(text);
                const mockProgressReporter = new mockChatResponseStream_1.SpyChatResponseStream();
                const a = await context.prepare({ tokenBudget: 2048, endpoint, countTokens }, mockProgressReporter, cancellation_1.CancellationToken.None);
                const resolved = await a?.resolveQueryAndKeywords(cancellation_1.CancellationToken.None);
                assert_1.default.ok(resolved.keywords.length > 0, 'No keywords found in meta response');
            }
        });
    }
});
//# sourceMappingURL=workspace-metaprompt.stest.js.map