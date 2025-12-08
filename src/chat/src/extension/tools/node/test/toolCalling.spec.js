"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const globalStringUtils_1 = require("../../../../platform/chat/common/globalStringUtils");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
// import * as vscodeTypes from '../../../../vscodeTypes';
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const mockEndpoint_1 = require("../../../../platform/endpoint/test/node/mockEndpoint");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolCallRound_1 = require("../../../prompt/common/toolCallRound");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const toolCalling_1 = require("../../../prompts/node/panel/toolCalling");
const services_1 = require("../../../test/node/services");
const toolsService_1 = require("../../common/toolsService");
(0, vitest_1.suite)('TestFailureTool', () => {
    let accessor;
    let testToolsService;
    (0, vitest_1.beforeEach)(async () => {
        const testingServiceCollection = (0, services_1.createExtensionUnitTestingServices)();
        accessor = testingServiceCollection.createTestingAccessor();
        testToolsService = accessor.get(toolsService_1.IToolsService);
    });
    async function doTest(toolCallRounds, toolCallResults, otherProps) {
        const element = otherProps?.isHistorical ? ChatToolCallsWrapper : toolCalling_1.ChatToolCalls;
        const renderer = promptRenderer_1.PromptRenderer.create(accessor.get(instantiation_1.IInstantiationService), accessor.get(instantiation_1.IInstantiationService).createInstance(mockEndpoint_1.MockEndpoint, undefined), element, {
            promptContext: {
                tools: {
                    toolInvocationToken: '1',
                    toolReferences: [],
                    availableTools: testToolsService.tools
                }
            },
            toolCallResults,
            toolCallRounds,
            ...otherProps
        });
        const r = await renderer.render();
        (0, vitest_1.expect)(r.messages.map(m => `# ${(0, globalStringUtils_1.roleToString)(m.role).toUpperCase()}\n${(0, globalStringUtils_1.getTextPart)(m.content)}`).join('\n\n')).toMatchSnapshot();
        return r;
    }
    (0, vitest_1.test)('tool does not exist', async () => {
        await doTest([
            new toolCallRound_1.ToolCallRound('I will run the tool', [{ id: '1', name: 'tool', arguments: '{}' }], 0, 'id-1')
        ]);
    });
    (0, vitest_1.test)('includes text responses with no tool calls in historical rounds', async () => {
        await doTest([
            new toolCallRound_1.ToolCallRound('I will run the tool', [{ id: '1', name: 'tool', arguments: '{}' }], 0, 'id-2'),
            new toolCallRound_1.ToolCallRound('I ran it!', [], 0, 'id-3')
        ], {
            '1': new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('result')])
        }, {
            isHistorical: true
        });
    });
    (0, vitest_1.test)('tool fails on first call, not second', async () => {
        let i = 0;
        testToolsService.addTestToolOverride({ name: 'testTool', description: '', inputSchema: undefined, tags: [], source: undefined }, {
            invoke: async () => {
                if (i++ !== 1) {
                    throw new Error('failed!');
                }
                return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('result')]);
            }
        });
        const toolCallResults = {};
        const id1 = '1';
        const toolCallRounds = [
            new toolCallRound_1.ToolCallRound('I will run the tool', [{ id: id1, name: 'testTool', arguments: '{}' }], 0, 'id-4')
        ];
        const result = await doTest(toolCallRounds, toolCallResults);
        result.metadata.getAll(toolCalling_1.ToolResultMetadata).forEach(renderedResult => {
            toolCallResults[renderedResult.toolCallId] = renderedResult.result;
        });
        const toolFailMetadata = result.metadata.getAll(toolCalling_1.ToolFailureEncountered);
        (0, vitest_1.expect)(toolFailMetadata.length).toBe(1);
        toolCallRounds.push(new toolCallRound_1.ToolCallRound('I will retry the tool', [{ id: '2', name: 'testTool', arguments: '{}' }], 1, 'id-5'));
        await doTest(toolCallRounds, toolCallResults);
        (0, vitest_1.expect)(i).toBe(2);
        (0, vitest_1.expect)(toolCallResults[id1]).toBeDefined();
    });
    (0, vitest_1.test)('invalid JSON on first call, not second', async () => {
        let i = 0;
        testToolsService.addTestToolOverride({ name: 'testTool', description: '', inputSchema: undefined, tags: [], source: undefined }, {
            invoke: async (options) => {
                i++;
                if (options.input.xyz !== 123) {
                    throw new Error('Invalid input');
                }
                return new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('result')]);
            }
        });
        const toolCallResults = {};
        const id1 = '1';
        const toolCallRounds = [
            new toolCallRound_1.ToolCallRound('I will run the tool', [{ id: id1, name: 'testTool', arguments: '{ "xyz": ' }], 0, 'id-6')
        ];
        const result = await doTest(toolCallRounds, toolCallResults);
        result.metadata.getAll(toolCalling_1.ToolResultMetadata).forEach(renderedResult => {
            toolCallResults[renderedResult.toolCallId] = renderedResult.result;
        });
        const toolFailMetadata = result.metadata.getAll(toolCalling_1.ToolFailureEncountered);
        (0, vitest_1.expect)(toolFailMetadata.length).toBe(1);
        toolCallRounds.push(new toolCallRound_1.ToolCallRound('I will retry the tool', [{ id: '2', name: 'testTool', arguments: '{ "xyz": 123}' }], 1, 'id-7'));
        await doTest(toolCallRounds, toolCallResults);
        (0, vitest_1.expect)(i).toBe(1);
        (0, vitest_1.expect)(toolCallResults[id1]).toBeDefined();
    });
    (0, vitest_1.test)('tool does exist', async () => {
        await doTest([
            new toolCallRound_1.ToolCallRound('I will run the tool', [{ id: '1', name: 'testTool', arguments: '{}' }], 0, 'id-8')
        ], {});
    });
});
class ChatToolCallsWrapper extends prompt_tsx_1.PromptElement {
    async render(state, sizing) {
        return vscpp(vscppf, null,
            vscpp(toolCalling_1.ChatToolCalls, { ...this.props }),
            vscpp(prompt_tsx_1.UserMessage, null, "Required user message for test"));
    }
}
//# sourceMappingURL=toolCalling.spec.js.map