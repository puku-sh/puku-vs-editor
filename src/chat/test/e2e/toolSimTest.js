"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToolTestRunner = generateToolTestRunner;
exports.fetchToolScenarios = fetchToolScenarios;
const assert_1 = __importDefault(require("assert"));
const toolsService_1 = require("../../src/extension/tools/common/toolsService");
const testToolsService_1 = require("../../src/extension/tools/node/test/testToolsService");
const configurationService_1 = require("../../src/platform/configuration/common/configurationService");
const descriptors_1 = require("../../src/util/vs/platform/instantiation/common/descriptors");
const validate_1 = require("../base/validate");
const scenarioLoader_1 = require("./scenarioLoader");
const scenarioTest_1 = require("./scenarioTest");
function generateToolTestRunner(toolScenario, expectedToolCalls) {
    if (!Array.isArray(toolScenario)) {
        toolScenario = [toolScenario];
    }
    return async (testingServiceCollection) => {
        testingServiceCollection.define(toolsService_1.IToolsService, new descriptors_1.SyncDescriptor(testToolsService_1.NoopTestToolsService));
        if (toolScenario.length !== 1) {
            throw new Error('Tool test cases must only have one scenario');
        }
        const testCase = toolScenario[0];
        testCase.question = ensureSlashEditAgent(testCase.question);
        testCase.setupCase = accessor => {
            accessor.get(configurationService_1.IConfigurationService).setNonExtensionConfig('chat.agent.maxRequests', 0);
        };
        // Apply default name
        const scenario = toolScenario.map(testCase => ({
            ...testCase,
            name: testCase.name ?? testCase.question,
        }));
        return (0, scenarioTest_1.generateScenarioTestRunner)(scenario, async (accessor, question, userVisibleAnswer, rawResponse, turn, scenarioIndex, commands) => {
            const toolCalls = turn?.resultMetadata?.toolCallRounds;
            if (!toolCalls || toolCalls.length === 0) {
                return { success: false, errorMessage: 'No tool calls were made.' };
            }
            if (toolCalls.length !== 1) {
                return { success: false, errorMessage: `Multiple tool call rounds, this shouldn't've happened.` };
            }
            await validateToolCallExpectation(accessor, testCase, expectedToolCalls, toolCalls[0].toolCalls);
            return { success: true };
        })(testingServiceCollection);
    };
}
async function validateToolCallExpectation(accessor, testCase, expectation, toolCalls) {
    const toolsService = accessor.get(toolsService_1.IToolsService);
    const expectedAnyOfToolNames = testCase.expectedToolCalls && new Set(typeof testCase.expectedToolCalls === 'string' ?
        [testCase.expectedToolCalls] :
        testCase.expectedToolCalls.anyOf);
    const toolCallsByName = new Map();
    for (const toolCall of toolCalls) {
        if (expectedAnyOfToolNames) {
            if (!expectedAnyOfToolNames.has(toolCall.name)) {
                throw new Error(`Tool call name "${toolCall.name}" does not match expected tool call names (${Array.from(expectedAnyOfToolNames).join(', ')}).`);
            }
            if (!expectation?.allowParallelToolCalls) {
                // Add a flag if we need to support multiple calls to the same tool
                expectedAnyOfToolNames.delete(toolCall.name);
            }
        }
        const validationResult = toolsService.validateToolInput(toolCall.name, toolCall.arguments);
        if ('error' in validationResult) {
            throw new Error(`Tool call input "${JSON.stringify(toolCall.arguments)}" is invalid: ${validationResult.error}`);
        }
        const toolName = toolCall.name;
        const parsedToolCall = {
            ...toolCall,
            input: validationResult.inputObj
        };
        toolCallsByName.set(toolName, toolCallsByName.get(toolName) ?? []);
        toolCallsByName.get(toolName)?.push(parsedToolCall);
        if (testCase.toolInputValues) {
            Object.keys(testCase.toolInputValues).forEach(key => {
                const argValue = parsedToolCall.input[key];
                const keyword = testCase.toolInputValues[key];
                if (typeof keyword === 'boolean') {
                    assert_1.default.strictEqual(argValue, keyword, key);
                    return;
                }
                if (typeof argValue !== 'string') {
                    throw new Error(`Tool call input arg "${key}" must be a string to use toolInputValues. Got: ${JSON.stringify(argValue)}`);
                }
                const err = (0, validate_1.validate)(argValue, keyword);
                if (err) {
                    throw new Error(err);
                }
            });
        }
    }
    for (const [toolName, toolCalls] of toolCallsByName) {
        const validator = expectation?.toolCallValidators?.[toolName];
        if (validator) {
            await validator(toolCalls);
        }
    }
}
function fetchToolScenarios(scenarioFolderPath) {
    const scenarios = (0, scenarioLoader_1.fetchConversationScenarios)(scenarioFolderPath);
    return scenarios.map(scenario => {
        return scenario.map(testCase => {
            if (!testCase.json.expectedToolCalls) {
                throw new Error(`Tool test case "${testCase.name}" must define expectedToolCalls.`);
            }
            return {
                ...testCase,
                expectedToolCalls: testCase.json.expectedToolCalls,
            };
        });
    });
}
function ensureSlashEditAgent(question) {
    if (question.startsWith('/editAgent')) {
        return question;
    }
    return '/editAgent ' + question;
}
//# sourceMappingURL=toolSimTest.js.map