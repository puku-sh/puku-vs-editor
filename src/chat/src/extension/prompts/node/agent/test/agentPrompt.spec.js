"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
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
const toolsService_1 = require("../../../../tools/common/toolsService");
const promptRenderer_1 = require("../../base/promptRenderer");
const agentPrompt_1 = require("../agentPrompt");
const testFamilies = [
    'default',
    'gpt-4.1',
    'gpt-5',
    'gpt-5.1',
    'gpt-5.1-codex',
    'gpt-5.1-codex-mini',
    'claude-sonnet-4.5',
    'gemini-2.0-flash',
    'grok-code-fast-1'
];
testFamilies.forEach(family => {
    (0, vitest_1.suite)(`AgentPrompt - ${family}`, () => {
        let accessor;
        let chatResponse = [];
        const fileTsUri = uri_1.URI.file('/workspace/file.ts');
        function getSnapshotFile(name) {
            return `./__snapshots__/agentPrompts-${name}-${family}.spec.snap`;
        }
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
        async function agentPromptToString(accessor, promptContext, otherProps) {
            const instaService = accessor.get(instantiation_1.IInstantiationService);
            const endpoint = family === "default"
                ? instaService.createInstance(mockEndpoint_1.MockEndpoint, undefined)
                : instaService.createInstance(mockEndpoint_1.MockEndpoint, family);
            if (!promptContext.conversation) {
                promptContext = { ...promptContext, conversation };
            }
            const baseProps = {
                priority: 1,
                endpoint,
                location: commonTypes_1.ChatLocation.Panel,
                promptContext,
                ...otherProps
            };
            const props = baseProps;
            const renderer = promptRenderer_1.PromptRenderer.create(instaService, endpoint, agentPrompt_1.AgentPrompt, props);
            const r = await renderer.render();
            (0, cacheBreakpoints_1.addCacheBreakpoints)(r.messages);
            return r.messages
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
        (0, vitest_1.test)('simple case', async () => {
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('simple_case'));
        });
        (0, vitest_1.test)('all tools', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
                tools: {
                    availableTools: toolsService.tools,
                    toolInvocationToken: null,
                    toolReferences: [],
                }
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('all_tools'));
        });
        (0, vitest_1.test)('all non-edit tools', async () => {
            const toolsService = accessor.get(toolsService_1.IToolsService);
            const editTools = new Set([toolNames_1.ToolName.ApplyPatch, toolNames_1.ToolName.EditFile, toolNames_1.ToolName.ReplaceString, toolNames_1.ToolName.MultiReplaceString]);
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
                tools: {
                    availableTools: toolsService.tools.filter(t => !editTools.has(t.name)),
                    toolInvocationToken: null,
                    toolReferences: [],
                }
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('all_non_edit_tools'));
        });
        (0, vitest_1.test)('one attachment', async () => {
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
                history: [],
                query: 'hello',
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('one_attachment'));
        });
        const tools = {
            availableTools: [],
            toolInvocationToken: null,
            toolReferences: [],
        };
        (0, vitest_1.test)('tool use', async () => {
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
                history: [],
                query: 'edit this file',
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('ok', [createEditFileToolCall(1)]),
                ],
                toolCallResults: createEditFileToolResult(1),
                tools,
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('tool_use'));
        });
        (0, vitest_1.test)('cache BPs', async () => {
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([{ id: 'vscode.file', name: 'file', value: fileTsUri }]),
                history: [],
                query: 'edit this file',
            }, {
                enableCacheBreakpoints: true,
            })).toMatchFileSnapshot(getSnapshotFile('cache_BPs'));
        });
        (0, vitest_1.test)('cache BPs with multi tool call rounds', async () => {
            let toolIdx = 0;
            const previousTurn = new conversation_1.Turn('id', { type: 'user', message: 'previous turn' });
            const previousTurnResult = {
                metadata: {
                    toolCallRounds: [
                        new toolCallRound_1.ToolCallRound('response', [
                            createEditFileToolCall(toolIdx++),
                            createEditFileToolCall(toolIdx++),
                        ], undefined, 'toolCallRoundId1'),
                        new toolCallRound_1.ToolCallRound('response 2', [
                            createEditFileToolCall(toolIdx++),
                            createEditFileToolCall(toolIdx++),
                        ], undefined, 'toolCallRoundId1'),
                    ],
                    toolCallResults: createEditFileToolResult(0, 1, 2, 3),
                }
            };
            previousTurn.setResponse(conversation_1.TurnStatus.Success, { type: 'user', message: 'response' }, 'responseId', previousTurnResult);
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection([]),
                history: [previousTurn],
                query: 'edit this file',
                toolCallRounds: [
                    new toolCallRound_1.ToolCallRound('ok', [
                        createEditFileToolCall(toolIdx++),
                        createEditFileToolCall(toolIdx++),
                    ]),
                    new toolCallRound_1.ToolCallRound('ok', [
                        createEditFileToolCall(toolIdx++),
                        createEditFileToolCall(toolIdx++),
                    ]),
                ],
                toolCallResults: createEditFileToolResult(4, 5, 6, 7),
                tools,
            }, {
                enableCacheBreakpoints: true,
            })).toMatchFileSnapshot(getSnapshotFile('cache_BPs_multi_round'));
        });
        (0, vitest_1.test)('custom instructions not in system message', async () => {
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.CustomInstructionsInSystemMessage, false);
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
                modeInstructions: { name: 'Plan', content: 'custom mode instructions' },
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('custom_instructions_not_in_system_message'));
        });
        (0, vitest_1.test)('omit base agent instructions', async () => {
            accessor.get(configurationService_1.IConfigurationService).setConfig(configurationService_1.ConfigKey.AdvancedExperimental.OmitBaseAgentInstructions, true);
            (0, vitest_1.expect)(await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
            }, undefined)).toMatchFileSnapshot(getSnapshotFile('omit_base_agent_instructions'));
        });
        (0, vitest_1.test)('edited file events are grouped by kind', async () => {
            const otherUri = uri_1.URI.file('/workspace/other.ts');
            (0, vitest_1.expect)((await agentPromptToString(accessor, {
                chatVariables: new chatVariablesCollection_1.ChatVariablesCollection(),
                history: [],
                query: 'hello',
                editedFileEvents: [
                    { eventKind: vscodeTypes_1.ChatRequestEditedFileEventKind.Undo, uri: fileTsUri },
                    { eventKind: vscodeTypes_1.ChatRequestEditedFileEventKind.UserModification, uri: otherUri },
                    // duplicate to ensure deduplication within a group
                    { eventKind: vscodeTypes_1.ChatRequestEditedFileEventKind.Undo, uri: fileTsUri },
                ],
            }, undefined))).toMatchFileSnapshot(getSnapshotFile('edited_file_events_grouped_by_kind'));
        });
    });
});
//# sourceMappingURL=agentPrompt.spec.js.map