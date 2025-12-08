"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const vitest_1 = require("vitest");
const chatMLFetcher_1 = require("../../../../../platform/chat/common/chatMLFetcher");
const commonTypes_1 = require("../../../../../platform/chat/common/commonTypes");
const staticChatMLFetcher_1 = require("../../../../../platform/chat/test/common/staticChatMLFetcher");
const configurationService_1 = require("../../../../../platform/configuration/common/configurationService");
const mockEndpoint_1 = require("../../../../../platform/endpoint/test/node/mockEndpoint");
const messageStringify_1 = require("../../../../../platform/log/common/messageStringify");
const testWorkspaceService_1 = require("../../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
const textDocument_1 = require("../../../../../util/common/test/shims/textDocument");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../../../util/vs/platform/instantiation/common/descriptors");
const instantiation_1 = require("../../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const cacheBreakpoints_1 = require("../../../../intents/node/cacheBreakpoints");
const chatVariablesCollection_1 = require("../../../../prompt/common/chatVariablesCollection");
const conversation_1 = require("../../../../prompt/common/conversation");
const toolCallRound_1 = require("../../../../prompt/common/toolCallRound");
const services_1 = require("../../../../test/node/services");
const toolNames_1 = require("../../../../tools/common/toolNames");
const promptRenderer_1 = require("../../base/promptRenderer");
const agentPrompt_1 = require("../agentPrompt");
const summarizedConversationHistory_1 = require("../summarizedConversationHistory");
(0, vitest_1.suite)('Agent Summarization', () => {
    let accessor;
    let chatResponse = [];
    const fileTsUri = uri_1.URI.file('/workspace/file.ts');
    let conversation;
    (0, vitest_1.beforeAll)(() => {
        const testDoc = (0, textDocument_1.createTextDocumentData)(fileTsUri, 'line 1\nline 2\n\nline 4\nline 5', 'ts').document;
        const services = (0, services_1.createExtensionUnitTestingServices)();
        services.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(testWorkspaceService_1.TestWorkspaceService, [
            [uri_1.URI.file('/workspace')],
            [testDoc]
        ]));
        chatResponse = [];
        services.define(chatMLFetcher_1.IChatMLFetcher, new staticChatMLFetcher_1.StaticChatMLFetcher(chatResponse));
        accessor = services.createTestingAccessor();
        accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.CodeGenerationInstructions, [{
                text: 'This is a test custom instruction file',
            }]);
    });
    (0, vitest_1.beforeEach)(() => {
        const turn = new conversation_1.Turn('turnId', { type: 'user', message: 'hello' });
        conversation = new conversation_1.Conversation('sessionId', [turn]);
    });
    (0, vitest_1.afterAll)(() => {
        accessor.dispose();
    });
    let TestPromptType;
    (function (TestPromptType) {
        TestPromptType["Agent"] = "Agent";
        TestPromptType["FullSummarization"] = "FullSumm";
        TestPromptType["SimpleSummarization"] = "SimpleSummarizedHistory";
    })(TestPromptType || (TestPromptType = {}));
    async function agentPromptToString(accessor, promptContext, otherProps, promptType = TestPromptType.Agent) {
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        const endpoint = instaService.createInstance(mockEndpoint_1.MockEndpoint, undefined);
        (0, conversation_1.normalizeSummariesOnRounds)(promptContext.history);
        if (!promptContext.conversation) {
            promptContext = { ...promptContext, conversation };
        }
        const baseProps = {
            priority: 1,
            endpoint,
            location: commonTypes_1.ChatLocation.Panel,
            promptContext,
            maxToolResultLength: Infinity,
            ...otherProps
        };
        let renderer;
        if (promptType === 'Agent') {
            const props = baseProps;
            renderer = promptRenderer_1.PromptRenderer.create(instaService, endpoint, agentPrompt_1.AgentPrompt, props);
        }
        else {
            const propsInfo = instaService.createInstance(summarizedConversationHistory_1.SummarizedConversationHistoryPropsBuilder).getProps(baseProps);
            const simpleMode = promptType === TestPromptType.SimpleSummarization;
            renderer = promptRenderer_1.PromptRenderer.create(instaService, endpoint, summarizedConversationHistory_1.ConversationHistorySummarizationPrompt, { ...propsInfo.props, simpleMode });
        }
        const r = await renderer.render();
        const summarizedConversationMetadata = r.metadata.get(summarizedConversationHistory_1.SummarizedConversationHistoryMetadata);
        if (summarizedConversationMetadata && promptContext.toolCallRounds) {
            for (const toolCallRound of promptContext.toolCallRounds) {
                if (toolCallRound.id === summarizedConversationMetadata.toolCallRoundId) {
                    toolCallRound.summary = summarizedConversationMetadata.text;
                }
            }
        }
        (0, cacheBreakpoints_1.addCacheBreakpoints)(r.messages);
        return r.messages
            .filter(message => message.role !== prompt_tsx_1.Raw.ChatRole.System)
            .map(m => (0, messageStringify_1.messageToMarkdown)(m))
            .join('\n\n')
            .replace(/\\+/g, '/')
            .replace(/The current date is.*/g, '(Date removed from snapshot)');
    }
    function createEditFileToolCall(idx) {
        return {
            id: `tooluse_${idx}`,
            name: toolNames_1.ToolName.EditFile,
            arguments: JSON.stringify({
                filePath: fileTsUri.fsPath, code: `// existing code...\nconsole.log('hi')`
            })
        };
    }
    function createEditFileToolResult(...idxs) {
        const result = {};
        for (const idx of idxs) {
            result[`tooluse_${idx}`] = new vscodeTypes_1.LanguageModelToolResult([new vscodeTypes_1.LanguageModelTextPart('success')]);
        }
        return result;
    }
    function getSnapshotFile(promptType, name) {
        return `./__snapshots__/summarization-${name}-${promptType}.spec.snap`;
    }
    const tools = {
        availableTools: [],
        toolInvocationToken: null,
        toolReferences: [],
    };
    (0, vitest_1.test)('continuation turns are not rendered in conversation history', async () => {
        const firstTurn = new conversation_1.Turn('id1', { type: 'user', message: 'previous turn message' });
        const continuationTurn = new conversation_1.Turn('id2', { type: 'user', message: 'continuation turn message' }, undefined, [], undefined, undefined, true);
        const promptContext = {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [firstTurn, continuationTurn],
            query: 'edit this file',
            toolCallRounds: [],
            tools,
        };
        const rendered = await agentPromptToString(accessor, promptContext, { enableCacheBreakpoints: true }, TestPromptType.Agent);
        (0, vitest_1.expect)(rendered).toContain('previous turn message');
        (0, vitest_1.expect)(rendered).not.toContain('continuation turn message');
    });
    (0, vitest_1.test)('cannot summarize with no history', async () => {
        const promptContextNoHistory = {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [],
            query: 'edit this file',
            toolCallRounds: [],
            tools,
        };
        await (0, vitest_1.expect)(() => agentPromptToString(accessor, promptContextNoHistory, undefined, TestPromptType.FullSummarization)).rejects.toThrow();
        await (0, vitest_1.expect)(() => agentPromptToString(accessor, {
            ...promptContextNoHistory,
            toolCallRounds: [
                new toolCallRound_1.ToolCallRound('ok', [createEditFileToolCall(1)]),
            ],
            toolCallResults: createEditFileToolResult(1),
            tools,
        }, undefined, TestPromptType.FullSummarization)).rejects.toThrow();
    });
    async function testTriggerSummarizationDuringToolCalling(promptType) {
        chatResponse[0] = 'summarized!';
        const toolCallRounds = [
            new toolCallRound_1.ToolCallRound('ok', [createEditFileToolCall(1)]),
            new toolCallRound_1.ToolCallRound('ok 2', [createEditFileToolCall(2)]),
            new toolCallRound_1.ToolCallRound('ok 3', [createEditFileToolCall(3)]),
        ];
        await (0, vitest_1.expect)(await agentPromptToString(accessor, {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [],
            query: 'edit this file',
            toolCallRounds,
            toolCallResults: createEditFileToolResult(1, 2, 3),
            tools
        }, {
            enableCacheBreakpoints: true,
            triggerSummarize: true,
        }, promptType)).toMatchFileSnapshot(getSnapshotFile(promptType, 'duringToolCalling'));
        if (promptType === TestPromptType.Agent) {
            (0, vitest_1.expect)(toolCallRounds.at(-2)?.summary).toBe('summarized!');
        }
    }
    // Summarization for rounds in current turn
    (0, vitest_1.test)('trigger summarization during tool calling', async () => await testTriggerSummarizationDuringToolCalling(TestPromptType.Agent));
    (0, vitest_1.test)('FullSummarization - trigger summarization during tool calling', async () => await testTriggerSummarizationDuringToolCalling(TestPromptType.FullSummarization));
    (0, vitest_1.test)('SimpleSummarization - trigger summarization during tool calling', async () => await testTriggerSummarizationDuringToolCalling(TestPromptType.SimpleSummarization));
    async function testSummaryCurrentTurn(promptType) {
        const excludedPreviousRound = new toolCallRound_1.ToolCallRound('previous round EXCLUDED', [createEditFileToolCall(1)]);
        const round = new toolCallRound_1.ToolCallRound('ok', [createEditFileToolCall(2)]);
        round.summary = 'summarized!';
        await (0, vitest_1.expect)(await agentPromptToString(accessor, {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [],
            query: 'edit this file',
            toolCallRounds: [
                excludedPreviousRound,
                round
            ],
            toolCallResults: createEditFileToolResult(1, 2),
            tools
        }, {
            enableCacheBreakpoints: true,
        }, promptType)).toMatchFileSnapshot(getSnapshotFile(promptType, 'currentTurn'));
    }
    // SummarizationPrompt test is not relevant when the last round was summarized
    (0, vitest_1.test)('render summary in current turn', async () => await testSummaryCurrentTurn(TestPromptType.Agent));
    async function testSummaryCurrentTurnEarlierRound(promptType) {
        const round = new toolCallRound_1.ToolCallRound('round 1', [createEditFileToolCall(1)]);
        round.summary = 'summarized!';
        const round2 = new toolCallRound_1.ToolCallRound('round 2', [createEditFileToolCall(2)]);
        const round3 = new toolCallRound_1.ToolCallRound('round 3', [createEditFileToolCall(3)]);
        await (0, vitest_1.expect)(await agentPromptToString(accessor, {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [],
            query: 'edit this file',
            toolCallRounds: [
                round,
                round2,
                round3
            ],
            toolCallResults: createEditFileToolResult(1, 2, 3),
            tools
        }, {
            enableCacheBreakpoints: true,
        }, promptType)).toMatchFileSnapshot(getSnapshotFile(promptType, 'currentTurnEarlierRound'));
    }
    (0, vitest_1.test)('render summary in previous turn', async () => await testSummaryCurrentTurnEarlierRound(TestPromptType.Agent));
    (0, vitest_1.test)('FullSummarization - render summary in previous turn', async () => await testSummaryCurrentTurnEarlierRound(TestPromptType.FullSummarization));
    (0, vitest_1.test)('SimpleSummarization - render summary in previous turn', async () => await testSummaryCurrentTurnEarlierRound(TestPromptType.SimpleSummarization));
    async function testSummaryPrevTurnMultiple(promptType) {
        const previousTurn = new conversation_1.Turn('id', { type: 'user', message: 'previous turn excluded' });
        const previousTurnResult = {
            metadata: {
                summary: {
                    text: 'summarized 1!',
                    toolCallRoundId: 'toolCallRoundId1'
                },
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('response', [createEditFileToolCall(1)], undefined, 'toolCallRoundId1'),
                ],
                toolCallResults: createEditFileToolResult(1),
            }
        };
        previousTurn.setResponse(conversation_1.TurnStatus.Success, { type: 'user', message: 'response' }, 'responseId', previousTurnResult);
        const turn = new conversation_1.Turn('id', { type: 'user', message: 'hello' });
        const result = {
            metadata: {
                summary: {
                    text: 'summarized 2!',
                    toolCallRoundId: 'toolCallRoundId3'
                },
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('response excluded', [createEditFileToolCall(2)], undefined, 'toolCallRoundId2'),
                    new toolCallRound_1.ToolCallRound('response with summary', [createEditFileToolCall(3)], undefined, 'toolCallRoundId3'),
                    new toolCallRound_1.ToolCallRound('next response', [createEditFileToolCall(4)], undefined, 'toolCallRoundId4'),
                ],
                toolCallResults: createEditFileToolResult(2, 3, 4),
            }
        };
        turn.setResponse(conversation_1.TurnStatus.Success, { type: 'user', message: 'response' }, 'responseId', result);
        await (0, vitest_1.expect)(await agentPromptToString(accessor, {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [previousTurn, turn],
            query: 'edit this file',
            toolCallRounds: [(new toolCallRound_1.ToolCallRound('hello next round', [createEditFileToolCall(5)]))],
            toolCallResults: createEditFileToolResult(5),
            tools
        }, {
            enableCacheBreakpoints: true,
        }, promptType)).toMatchFileSnapshot(getSnapshotFile(promptType, 'previousTurnMultiple'));
    }
    (0, vitest_1.test)('render summary in previous turn (with multiple)', () => testSummaryPrevTurnMultiple(TestPromptType.Agent));
    (0, vitest_1.test)('FullSummarization - render summary in previous turn (with multiple)', () => testSummaryPrevTurnMultiple(TestPromptType.FullSummarization));
    (0, vitest_1.test)('SimpleSummarization - render summary in previous turn (with multiple)', () => testSummaryPrevTurnMultiple(TestPromptType.SimpleSummarization));
    async function testSummarizeWithNoRoundsInCurrentTurn(promptType) {
        const previousTurn1 = new conversation_1.Turn('id', { type: 'user', message: 'previous turn 1' });
        previousTurn1.setResponse(conversation_1.TurnStatus.Success, { type: 'user', message: 'response' }, 'responseId', {});
        const previousTurn2 = new conversation_1.Turn('id', { type: 'user', message: 'previous turn 2' });
        const previousTurn2Result = {
            metadata: {
                toolCallRounds: [],
                summary: {
                    toolCallRoundId: 'previous',
                    text: 'previous turn 1 summary'
                }
            }
        };
        previousTurn2.setResponse(conversation_1.TurnStatus.Success, { type: 'user', message: 'response' }, 'responseId', previousTurn2Result);
        await (0, vitest_1.expect)(await agentPromptToString(accessor, {
            chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
            history: [previousTurn1, previousTurn2],
            query: 'hello',
            tools
        }, {
            enableCacheBreakpoints: true,
        }, promptType)).toMatchFileSnapshot(getSnapshotFile(promptType, 'previousTurnNoRounds'));
    }
    (0, vitest_1.test)('summary for previous turn, no tool call rounds', async () => testSummarizeWithNoRoundsInCurrentTurn(TestPromptType.Agent));
    (0, vitest_1.test)('FullSummarization - summary for previous turn, no tool call rounds', async () => testSummarizeWithNoRoundsInCurrentTurn(TestPromptType.FullSummarization));
    (0, vitest_1.test)('SimpleSummarization - summary for previous turn, no tool call rounds', async () => testSummarizeWithNoRoundsInCurrentTurn(TestPromptType.SimpleSummarization));
});
//# sourceMappingURL=summarization.spec.js.map