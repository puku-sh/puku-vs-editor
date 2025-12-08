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
stest_1.ssuite.optional(tools_stest_1.shouldSkipAgentTests, { title: 'findFilesTool', subtitle: 'toolCalling', location: 'panel' }, () => {
    const scenarioFolder = path_1.default.join(__dirname, '..', 'test/scenarios/test-tools');
    const getState = () => (0, promptContextModel_1.deserializeWorkbenchState)(scenarioFolder, path_1.default.join(scenarioFolder, 'tools.state.json'));
    (0, stest_1.stest)('proper glob patterns', (0, toolSimTest_1.generateToolTestRunner)({
        question: 'which folder are my tsx and jsx files in?',
        scenarioFolderPath: '',
        getState,
        expectedToolCalls: toolNames_1.ToolName.FindFiles,
        tools: {
            [toolNames_1.ToolName.FindFiles]: true,
            [toolNames_1.ToolName.FindTextInFiles]: true,
            [toolNames_1.ToolName.ReadFile]: true,
            [toolNames_1.ToolName.EditFile]: true,
            [toolNames_1.ToolName.Codebase]: true,
            [toolNames_1.ToolName.ListDirectory]: true,
            [toolNames_1.ToolName.SearchWorkspaceSymbols]: true,
        },
    }, {
        allowParallelToolCalls: true,
        toolCallValidators: {
            [toolNames_1.ToolName.FindFiles]: async (toolCalls) => {
                if (toolCalls.length === 1) {
                    const input = toolCalls[0].input;
                    assert_1.default.ok(input.query.includes('**/'), 'should match **/');
                    assert_1.default.ok(input.query.includes('tsx') && input.query.includes('jsx'), 'should match *.tsx and *.jsx');
                }
                else if (toolCalls.length === 2) {
                    const input1 = toolCalls[0].input;
                    const input2 = toolCalls[1].input;
                    const queries = `${input1.query}, ${input2.query}`;
                    assert_1.default.ok(queries.includes('**/'), 'should match **/');
                    assert_1.default.ok(queries.includes('.tsx') && queries.includes('.jsx'), 'should match *.tsx and *.jsx');
                }
                else {
                    throw new Error('Too many tool calls');
                }
            }
        }
    }));
});
//# sourceMappingURL=findFilesTool.stest.js.map