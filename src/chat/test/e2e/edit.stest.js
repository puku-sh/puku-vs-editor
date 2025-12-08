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
const path_1 = __importDefault(require("path"));
const toolNames_1 = require("../../src/extension/tools/common/toolNames");
const promptContextModel_1 = require("../../src/platform/test/node/promptContextModel");
const stest_1 = require("../base/stest");
const toolSimTest_1 = require("./toolSimTest");
const tools_stest_1 = require("./tools.stest");
stest_1.ssuite.optional(tools_stest_1.shouldSkipAgentTests, { title: 'edit', subtitle: 'toolCalling', location: 'panel' }, () => {
    const scenarioFolder = path_1.default.join(__dirname, '..', 'test/scenarios/test-tools');
    const getState = () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolder, path_1.default.join(scenarioFolder, 'chatSetup.state.json'));
    (0, stest_1.stest)('does not read', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'This code fails because whenLanguageModelReady waits for any model, not the correct model. From doInvokeWithoutSetup, wait for the model with id IChatAgentRequest.userSelectedModelId to be registered',
        scenarioFolderPath: '',
        getState,
        tools: {},
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.ReadFile]: (toolCalls) => {
                assert_1.default.ok(!toolCalls.some(tc => tc.input.filePath.endsWith('chatSetup.ts')), 'Should not read_file the attached file');
            },
            [toolNames_1.ToolName.Codebase]: (toolCalls) => {
                assert_1.default.ok(!toolCalls.some(tc => {
                    const query = tc.input.query;
                    return query.includes('doForwardRequestToCopilotWhenReady') || query.includes('whenLanguageModelReady');
                }), 'Should not do semantic_search for something that is in the attached file');
            }
        }
    }));
});
//# sourceMappingURL=edit.stest.js.map