"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const envService_1 = require("../../../../platform/env/common/envService");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const testWorkspaceService_1 = require("../../../../platform/test/node/testWorkspaceService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const serviceCollection_1 = require("../../../../util/vs/platform/instantiation/common/serviceCollection");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const claudeCodeSessionService_1 = require("../../../agents/claude/node/claudeCodeSessionService");
const services_1 = require("../../../test/node/services");
const claudeChatSessionContentProvider_1 = require("../claudeChatSessionContentProvider");
(0, vitest_1.describe)('ChatSessionContentProvider', () => {
    let mockSessionService;
    let provider;
    const store = new lifecycle_1.DisposableStore();
    let accessor;
    const workspaceFolderUri = uri_1.URI.file('/project');
    (0, vitest_1.beforeEach)(() => {
        mockSessionService = {
            getSession: vitest_1.vi.fn()
        };
        const serviceCollection = store.add((0, services_1.createExtensionUnitTestingServices)());
        const workspaceService = new testWorkspaceService_1.TestWorkspaceService([workspaceFolderUri]);
        serviceCollection.set(workspaceService_1.IWorkspaceService, workspaceService);
        serviceCollection.define(claudeCodeSessionService_1.IClaudeCodeSessionService, mockSessionService);
        accessor = serviceCollection.createTestingAccessor();
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        provider = instaService.createInstance(claudeChatSessionContentProvider_1.ClaudeChatSessionContentProvider);
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.clearAllMocks();
        store.clear();
    });
    // Helper function to create simplified objects for snapshot testing
    function mapHistoryForSnapshot(history) {
        return history.map(turn => {
            if (turn instanceof vscodeTypes_1.ChatRequestTurn) {
                return {
                    type: 'request',
                    prompt: turn.prompt
                };
            }
            else if (turn instanceof vscodeTypes_1.ChatResponseTurn2) {
                return {
                    type: 'response',
                    parts: turn.response.map(part => {
                        if (part instanceof vscodeTypes_1.ChatResponseMarkdownPart) {
                            return {
                                type: 'markdown',
                                content: part.value.value
                            };
                        }
                        else if (part instanceof vscodeTypes_1.ChatToolInvocationPart) {
                            return {
                                type: 'tool',
                                toolName: part.toolName,
                                toolCallId: part.toolCallId,
                                isError: part.isError,
                                invocationMessage: part.invocationMessage
                                    ? (typeof part.invocationMessage === 'string'
                                        ? part.invocationMessage
                                        : part.invocationMessage.value)
                                    : undefined
                            };
                        }
                        return { type: 'unknown' };
                    })
                };
            }
            return { type: 'unknown' };
        });
    }
    (0, vitest_1.describe)('provideChatSessionContent', () => {
        (0, vitest_1.it)('returns empty history when no existing session', async () => {
            vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(undefined);
            const sessionUri = createClaudeSessionUri('test-session');
            const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(result.history).toEqual([]);
            (0, vitest_1.expect)(mockSessionService.getSession).toHaveBeenCalledWith(sessionUri, cancellation_1.CancellationToken.None);
        });
        (0, vitest_1.it)('converts user messages to ChatRequestTurn2', async () => {
            const mockSession = {
                id: 'test-session',
                messages: [
                    {
                        type: 'user',
                        message: {
                            role: 'user',
                            content: 'Hello, how are you?'
                        }
                    }
                ]
            };
            vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
            const sessionUri = createClaudeSessionUri('test-session');
            const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
				[
				  {
				    "prompt": "Hello, how are you?",
				    "type": "request",
				  },
				]
			`);
        });
        (0, vitest_1.it)('converts assistant messages with text to ChatResponseTurn2', async () => {
            const mockSession = {
                id: 'test-session',
                messages: [
                    {
                        type: 'assistant',
                        message: {
                            id: 'msg-1',
                            type: 'message',
                            role: 'assistant',
                            content: [
                                {
                                    type: 'text',
                                    text: 'I am doing well, thank you!'
                                }
                            ],
                            model: 'claude-3-sonnet',
                            stop_reason: 'end_turn',
                            stop_sequence: null,
                            usage: { input_tokens: 10, output_tokens: 8 }
                        }
                    }
                ]
            };
            vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
            const sessionUri = createClaudeSessionUri('test-session');
            const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
				[
				  {
				    "parts": [
				      {
				        "content": "I am doing well, thank you!",
				        "type": "markdown",
				      },
				    ],
				    "type": "response",
				  },
				]
			`);
        });
        (0, vitest_1.it)('converts assistant messages with tool_use to ChatToolInvocationPart', async () => {
            const mockSession = {
                id: 'test-session',
                messages: [
                    {
                        type: 'assistant',
                        message: {
                            id: 'msg-1',
                            type: 'message',
                            role: 'assistant',
                            content: [
                                {
                                    type: 'tool_use',
                                    id: 'tool-1',
                                    name: 'bash',
                                    input: { command: 'ls -la' }
                                }
                            ],
                            model: 'claude-3-sonnet',
                            stop_reason: 'tool_use',
                            stop_sequence: null,
                            usage: { input_tokens: 15, output_tokens: 12 }
                        }
                    }
                ]
            };
            vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
            const sessionUri = createClaudeSessionUri('test-session');
            const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
            (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
				[
				  {
				    "parts": [
				      {
				        "invocationMessage": "Used tool: bash",
				        "isError": false,
				        "toolCallId": "tool-1",
				        "toolName": "bash",
				        "type": "tool",
				      },
				    ],
				    "type": "response",
				  },
				]
			`);
        });
    });
    (0, vitest_1.it)('handles mixed content with text and tool_use', async () => {
        const mockSession = {
            id: 'test-session',
            messages: [
                {
                    type: 'assistant',
                    message: {
                        id: 'msg-1',
                        type: 'message',
                        role: 'assistant',
                        content: [
                            {
                                type: 'text',
                                text: 'Let me run a command:'
                            },
                            {
                                type: 'tool_use',
                                id: 'tool-1',
                                name: 'bash',
                                input: { command: 'pwd' }
                            }
                        ],
                        model: 'claude-3-sonnet',
                        stop_reason: 'tool_use',
                        stop_sequence: null,
                        usage: { input_tokens: 20, output_tokens: 15 }
                    }
                }
            ]
        };
        vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
        const sessionUri = createClaudeSessionUri('test-session');
        const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
			[
			  {
			    "parts": [
			      {
			        "content": "Let me run a command:",
			        "type": "markdown",
			      },
			      {
			        "invocationMessage": "Used tool: bash",
			        "isError": false,
			        "toolCallId": "tool-1",
			        "toolName": "bash",
			        "type": "tool",
			      },
			    ],
			    "type": "response",
			  },
			]
		`);
    });
    (0, vitest_1.it)('handles complete tool invocation flow: user → assistant with tool_use → user with tool_result', async () => {
        const mockSession = {
            id: 'test-session',
            messages: [
                // Initial user message
                {
                    type: 'user',
                    message: {
                        role: 'user',
                        content: 'Can you list the files in the current directory?'
                    }
                },
                // Assistant message with text and tool_use
                {
                    type: 'assistant',
                    message: {
                        id: 'msg-1',
                        type: 'message',
                        role: 'assistant',
                        content: [
                            {
                                type: 'text',
                                text: 'I\'ll list the files for you.'
                            },
                            {
                                type: 'tool_use',
                                id: 'tool-1',
                                name: 'bash',
                                input: { command: 'ls -la' }
                            }
                        ],
                        model: 'claude-3-sonnet',
                        stop_reason: 'tool_use',
                        stop_sequence: null,
                        usage: { input_tokens: 20, output_tokens: 15 }
                    }
                },
                // User message with tool_result
                {
                    type: 'user',
                    message: {
                        role: 'user',
                        content: [
                            {
                                type: 'tool_result',
                                tool_use_id: 'tool-1',
                                content: 'total 8\ndrwxr-xr-x  3 user user 4096 Aug 29 10:00 .\ndrwxr-xr-x  5 user user 4096 Aug 29 09:30 ..\n-rw-r--r--  1 user user  256 Aug 29 10:00 file.txt',
                                is_error: false
                            }
                        ]
                    }
                }
            ]
        };
        vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
        const sessionUri = createClaudeSessionUri('test-session');
        const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
			[
			  {
			    "prompt": "Can you list the files in the current directory?",
			    "type": "request",
			  },
			  {
			    "parts": [
			      {
			        "content": "I'll list the files for you.",
			        "type": "markdown",
			      },
			      {
			        "invocationMessage": "Used tool: bash",
			        "isError": false,
			        "toolCallId": "tool-1",
			        "toolName": "bash",
			        "type": "tool",
			      },
			    ],
			    "type": "response",
			  },
			]
		`);
    });
    (0, vitest_1.it)('handles user messages with complex content blocks', async () => {
        const mockSession = {
            id: 'test-session',
            messages: [
                {
                    type: 'user',
                    message: {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Check this result: '
                            },
                            {
                                type: 'tool_result',
                                tool_use_id: 'tool-1',
                                content: 'Command executed successfully',
                                is_error: false
                            }
                        ]
                    }
                }
            ]
        };
        vitest_1.vi.mocked(mockSessionService.getSession).mockResolvedValue(mockSession);
        const sessionUri = createClaudeSessionUri('test-session');
        const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchInlineSnapshot(`
			[
			  {
			    "prompt": "Check this result: ",
			    "type": "request",
			  },
			]
		`);
    });
    (0, vitest_1.it)('loads real fixture file with tool invocation flow and converts to correct chat history', async () => {
        const fixtureContent = await (0, promises_1.readFile)(path.join(__dirname, 'fixtures', '4c289ca8-f8bb-4588-8400-88b78beb784d.jsonl'), 'utf8');
        const mockFileSystem = accessor.get(fileSystemService_1.IFileSystemService);
        const testEnvService = accessor.get(envService_1.INativeEnvService);
        const folderSlug = '/project'.replace(/[\/\.]/g, '-');
        const projectDir = (0, resources_1.joinPath)(testEnvService.userHome, `.claude/projects/${folderSlug}`);
        const fixtureFile = uri_1.URI.joinPath(projectDir, '4c289ca8-f8bb-4588-8400-88b78beb784d.jsonl');
        mockFileSystem.mockDirectory(projectDir, [['4c289ca8-f8bb-4588-8400-88b78beb784d.jsonl', fileTypes_1.FileType.File]]);
        mockFileSystem.mockFile(fixtureFile, fixtureContent);
        const instaService = accessor.get(instantiation_1.IInstantiationService);
        const realSessionService = instaService.createInstance(claudeCodeSessionService_1.ClaudeCodeSessionService);
        const childInstantiationService = instaService.createChild(new serviceCollection_1.ServiceCollection([claudeCodeSessionService_1.IClaudeCodeSessionService, realSessionService]));
        const provider = childInstantiationService.createInstance(claudeChatSessionContentProvider_1.ClaudeChatSessionContentProvider);
        const sessionUri = createClaudeSessionUri('4c289ca8-f8bb-4588-8400-88b78beb784d');
        const result = await provider.provideChatSessionContent(sessionUri, cancellation_1.CancellationToken.None);
        (0, vitest_1.expect)(mapHistoryForSnapshot(result.history)).toMatchSnapshot();
    });
});
function createClaudeSessionUri(id) {
    return uri_1.URI.parse(`claude-code:/${id}`);
}
//# sourceMappingURL=claudeChatSessionContentProvider.spec.js.map