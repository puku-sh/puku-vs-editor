"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const vscodeTypes_1 = require("../../../../../vscodeTypes");
const copilotCLITools_1 = require("../copilotCLITools");
// Helper to extract invocation message text independent of MarkdownString vs string
function getInvocationMessageText(part) {
    if (!part) {
        return '';
    }
    const msg = part.invocationMessage;
    if (!msg) {
        return '';
    }
    if (typeof msg === 'string') {
        return msg;
    }
    if (msg instanceof vscodeTypes_1.MarkdownString) {
        return msg.value ?? '';
    }
    return msg.value ?? '';
}
(0, vitest_1.describe)('CopilotCLITools', () => {
    (0, vitest_1.describe)('isCopilotCliEditToolCall', () => {
        (0, vitest_1.it)('detects StrReplaceEditor edit commands (non-view)', () => {
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'str_replace_editor', arguments: { command: 'str_replace', path: '/tmp/a' } })).toBe(true);
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'str_replace_editor', arguments: { command: 'insert', path: '/tmp/a', new_str: '' } })).toBe(true);
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'str_replace_editor', arguments: { command: 'create', path: '/tmp/a' } })).toBe(true);
        });
        (0, vitest_1.it)('excludes StrReplaceEditor view command', () => {
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'str_replace_editor', arguments: { command: 'view', path: '/tmp/a' } })).toBe(false);
        });
        (0, vitest_1.it)('always true for Edit & Create tools', () => {
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'edit', arguments: { path: '' } })).toBe(true);
            (0, vitest_1.expect)((0, copilotCLITools_1.isCopilotCliEditToolCall)({ toolName: 'create', arguments: { path: '' } })).toBe(true);
        });
    });
    (0, vitest_1.describe)('getAffectedUrisForEditTool', () => {
        (0, vitest_1.it)('returns URI for edit tool with path', () => {
            const [uri] = (0, copilotCLITools_1.getAffectedUrisForEditTool)({ toolName: 'str_replace_editor', arguments: { command: 'str_replace', path: '/tmp/file.txt' } });
            (0, vitest_1.expect)(uri.toString()).toContain('/tmp/file.txt');
        });
        (0, vitest_1.it)('returns empty for non-edit view command', () => {
            (0, vitest_1.expect)((0, copilotCLITools_1.getAffectedUrisForEditTool)({ toolName: 'str_replace_editor', arguments: { command: 'view', path: '/tmp/file.txt' } })).toHaveLength(0);
        });
    });
    (0, vitest_1.describe)('stripReminders', () => {
        (0, vitest_1.it)('removes reminder blocks and trims', () => {
            const input = '  <reminder>Keep this private</reminder>\nContent';
            (0, vitest_1.expect)((0, copilotCLITools_1.stripReminders)(input)).toBe('Content');
        });
        (0, vitest_1.it)('removes current datetime blocks', () => {
            const input = '<current_datetime>2025-10-10</current_datetime> Now';
            (0, vitest_1.expect)((0, copilotCLITools_1.stripReminders)(input)).toBe('Now');
        });
        (0, vitest_1.it)('removes pr_metadata tags', () => {
            const input = '<pr_metadata uri="u" title="t" description="d" author="a" linkTag="l"/> Body';
            (0, vitest_1.expect)((0, copilotCLITools_1.stripReminders)(input)).toBe('Body');
        });
        (0, vitest_1.it)('removes multiple constructs mixed', () => {
            const input = '<reminder>x</reminder>One<current_datetime>y</current_datetime> <pr_metadata uri="u" title="t" description="d" author="a" linkTag="l"/>Two';
            // Current behavior compacts content without guaranteeing spacing
            (0, vitest_1.expect)((0, copilotCLITools_1.stripReminders)(input)).toBe('OneTwo');
        });
    });
    (0, vitest_1.describe)('buildChatHistoryFromEvents', () => {
        (0, vitest_1.it)('builds turns with user and assistant messages including PR metadata', () => {
            const events = [
                { type: 'user.message', data: { content: 'Hello', attachments: [] } },
                { type: 'assistant.message', data: { content: '<pr_metadata uri="https://example.com/pr/1" title="Fix&amp;Improve" description="Desc" author="Alice" linkTag="PR#1"/>This is the PR body.' } }
            ];
            const turns = (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
            (0, vitest_1.expect)(turns).toHaveLength(2); // request + response
            (0, vitest_1.expect)(turns[0]).toBeInstanceOf(vscodeTypes_1.ChatRequestTurn2);
            (0, vitest_1.expect)(turns[1]).toBeInstanceOf(vscodeTypes_1.ChatResponseTurn2);
            const responseParts = turns[1].response;
            // ResponseParts is private-ish; fallback to accessing parts array property variations
            const parts = (responseParts.parts ?? responseParts._parts ?? responseParts);
            // First part should be PR metadata
            const prPart = parts.find(p => p instanceof vscodeTypes_1.ChatResponsePullRequestPart);
            (0, vitest_1.expect)(prPart).toBeTruthy();
            const markdownPart = parts.find(p => p instanceof vscodeTypes_1.ChatResponseMarkdownPart);
            (0, vitest_1.expect)(markdownPart).toBeTruthy();
            if (prPart) {
                (0, vitest_1.expect)(prPart.title).toBe('Fix&Improve'); // &amp; unescaped
                // uri is stored as a Uri
                (0, vitest_1.expect)(prPart.uri.toString()).toContain('https://example.com/pr/1');
            }
            if (markdownPart) {
                (0, vitest_1.expect)(markdownPart.value?.value || markdownPart.value).toContain('This is the PR body.');
            }
        });
        (0, vitest_1.it)('createCopilotCLIToolInvocation formats str_replace_editor view with range', () => {
            const invocation = (0, copilotCLITools_1.createCopilotCLIToolInvocation)({ toolName: 'str_replace_editor', toolCallId: 'id3', arguments: { command: 'view', path: '/tmp/file.ts', view_range: [1, 5] } });
            (0, vitest_1.expect)(invocation).toBeInstanceOf(vscodeTypes_1.ChatToolInvocationPart);
            const msg = typeof invocation.invocationMessage === 'string' ? invocation.invocationMessage : invocation.invocationMessage?.value;
            (0, vitest_1.expect)(msg).toMatch(/Read/);
            (0, vitest_1.expect)(msg).toMatch(/file.ts/);
        });
        (0, vitest_1.it)('includes tool invocation parts and thinking progress without duplication', () => {
            const events = [
                { type: 'user.message', data: { content: 'Run a command', attachments: [] } },
                { type: 'tool.execution_start', data: { toolName: 'think', toolCallId: 'think-1', arguments: { thought: 'Considering options' } } },
                { type: 'tool.execution_complete', data: { toolName: 'think', toolCallId: 'think-1', success: true } },
                { type: 'tool.execution_start', data: { toolName: 'bash', toolCallId: 'bash-1', arguments: { command: 'echo hi', description: 'Echo' } } },
                { type: 'tool.execution_complete', data: { toolName: 'bash', toolCallId: 'bash-1', success: true } }
            ];
            const turns = (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
            (0, vitest_1.expect)(turns).toHaveLength(2); // request + response
            const responseTurn = turns[1];
            const responseParts = responseTurn.response;
            const parts = (responseParts.parts ?? responseParts._parts ?? responseParts);
            const thinkingParts = parts.filter(p => p instanceof vscodeTypes_1.ChatResponseThinkingProgressPart);
            (0, vitest_1.expect)(thinkingParts).toHaveLength(1); // not duplicated on completion
            const toolInvocations = parts.filter(p => p instanceof vscodeTypes_1.ChatToolInvocationPart);
            (0, vitest_1.expect)(toolInvocations).toHaveLength(1); // bash only
            const bashInvocation = toolInvocations[0];
            (0, vitest_1.expect)(getInvocationMessageText(bashInvocation)).toContain('Echo');
        });
    });
    (0, vitest_1.describe)('createCopilotCLIToolInvocation', () => {
        (0, vitest_1.it)('returns undefined for report_intent', () => {
            (0, vitest_1.expect)((0, copilotCLITools_1.createCopilotCLIToolInvocation)({ toolName: 'report_intent', toolCallId: 'id', arguments: { intent: '' } })).toBeUndefined();
        });
        (0, vitest_1.it)('creates thinking progress part for think tool', () => {
            const part = (0, copilotCLITools_1.createCopilotCLIToolInvocation)({ toolName: 'think', toolCallId: 'tid', arguments: { thought: 'Analyzing' } });
            (0, vitest_1.expect)(part).toBeInstanceOf(vscodeTypes_1.ChatResponseThinkingProgressPart);
        });
        (0, vitest_1.it)('formats bash tool invocation with description', () => {
            const part = (0, copilotCLITools_1.createCopilotCLIToolInvocation)({ toolName: 'bash', toolCallId: 'b1', arguments: { command: 'ls', description: 'List files' } });
            (0, vitest_1.expect)(part).toBeInstanceOf(vscodeTypes_1.ChatToolInvocationPart);
            (0, vitest_1.expect)(getInvocationMessageText(part)).toContain('List files');
        });
        (0, vitest_1.it)('formats str_replace_editor create', () => {
            const part = (0, copilotCLITools_1.createCopilotCLIToolInvocation)({ toolName: 'str_replace_editor', toolCallId: 'e1', arguments: { command: 'create', path: '/tmp/x.ts' } });
            (0, vitest_1.expect)(part).toBeInstanceOf(vscodeTypes_1.ChatToolInvocationPart);
            const msg = getInvocationMessageText(part);
            (0, vitest_1.expect)(msg).toMatch(/Created/);
        });
    });
    (0, vitest_1.describe)('process tool execution lifecycle', () => {
        (0, vitest_1.it)('marks tool invocation complete and confirmed on success', () => {
            const pending = new Map();
            const startEvent = { type: 'tool.execution_start', data: { toolName: 'bash', toolCallId: 'bash-1', arguments: { command: 'echo hi' } } };
            const part = (0, copilotCLITools_1.processToolExecutionStart)(startEvent, pending);
            (0, vitest_1.expect)(part).toBeInstanceOf(vscodeTypes_1.ChatToolInvocationPart);
            const completeEvent = { type: 'tool.execution_complete', data: { toolName: 'bash', toolCallId: 'bash-1', success: true } };
            const completed = (0, copilotCLITools_1.processToolExecutionComplete)(completeEvent, pending);
            (0, vitest_1.expect)(completed.isComplete).toBe(true);
            (0, vitest_1.expect)(completed.isError).toBe(false);
            (0, vitest_1.expect)(completed.isConfirmed).toBe(true);
        });
        (0, vitest_1.it)('marks tool invocation error and unconfirmed when denied', () => {
            const pending = new Map();
            (0, copilotCLITools_1.processToolExecutionStart)({ type: 'tool.execution_start', data: { toolName: 'bash', toolCallId: 'bash-2', arguments: { command: 'rm *' } } }, pending);
            const completeEvent = { type: 'tool.execution_complete', data: { toolName: 'bash', toolCallId: 'bash-2', success: false, error: { message: 'Denied', code: 'denied' } } };
            const completed = (0, copilotCLITools_1.processToolExecutionComplete)(completeEvent, pending);
            (0, vitest_1.expect)(completed.isComplete).toBe(true);
            (0, vitest_1.expect)(completed.isError).toBe(true);
            (0, vitest_1.expect)(completed.isConfirmed).toBe(false);
            (0, vitest_1.expect)(getInvocationMessageText(completed)).toContain('Denied');
        });
    });
    (0, vitest_1.describe)('integration edge cases', () => {
        (0, vitest_1.it)('ignores report_intent events inside history build', () => {
            const events = [
                { type: 'user.message', data: { content: 'Hi', attachments: [] } },
                { type: 'tool.execution_start', data: { toolName: 'report_intent', toolCallId: 'ri-1', arguments: {} } },
                { type: 'tool.execution_complete', data: { toolName: 'report_intent', toolCallId: 'ri-1', success: true } }
            ];
            const turns = (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
            (0, vitest_1.expect)(turns).toHaveLength(1); // Only user turn, no response parts because no assistant/tool parts were added
        });
        (0, vitest_1.it)('handles multiple user messages flushing response parts correctly', () => {
            const events = [
                { type: 'assistant.message', data: { content: 'Hello' } },
                { type: 'user.message', data: { content: 'Follow up', attachments: [] } },
                { type: 'assistant.message', data: { content: 'Response 2' } }
            ];
            const turns = (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
            // Expect: first assistant message buffered until user msg -> becomes response turn, then user request, then second assistant -> another response
            (0, vitest_1.expect)(turns.filter(t => t instanceof vscodeTypes_1.ChatResponseTurn2)).toHaveLength(2);
            (0, vitest_1.expect)(turns.filter(t => t instanceof vscodeTypes_1.ChatRequestTurn2)).toHaveLength(1);
        });
        (0, vitest_1.it)('creates markdown part only when cleaned content not empty after stripping PR metadata', () => {
            const events = [
                { type: 'assistant.message', data: { content: '<pr_metadata uri="u" title="t" description="d" author="a" linkTag="l"/>' } }
            ];
            const turns = (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
            // Single response turn with ONLY PR part (no markdown text)
            const responseTurns = turns.filter(t => t instanceof vscodeTypes_1.ChatResponseTurn2);
            (0, vitest_1.expect)(responseTurns).toHaveLength(1);
            const responseParts = responseTurns[0].response;
            const parts = (responseParts.parts ?? responseParts._parts ?? responseParts);
            const prCount = parts.filter(p => p instanceof vscodeTypes_1.ChatResponsePullRequestPart).length;
            const mdCount = parts.filter(p => p instanceof vscodeTypes_1.ChatResponseMarkdownPart).length;
            (0, vitest_1.expect)(prCount).toBe(1);
            (0, vitest_1.expect)(mdCount).toBe(0);
        });
    });
});
//# sourceMappingURL=copilotCLITools.spec.js.map