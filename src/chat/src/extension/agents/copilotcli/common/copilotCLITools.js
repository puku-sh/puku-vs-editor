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
exports.isCopilotCliEditToolCall = isCopilotCliEditToolCall;
exports.getAffectedUrisForEditTool = getAffectedUrisForEditTool;
exports.stripReminders = stripReminders;
exports.buildChatHistoryFromEvents = buildChatHistoryFromEvents;
exports.processToolExecutionStart = processToolExecutionStart;
exports.processToolExecutionComplete = processToolExecutionComplete;
exports.createCopilotCLIToolInvocation = createCopilotCLIToolInvocation;
const l10n = __importStar(require("@vscode/l10n"));
const uri_1 = require("../../../../util/vs/base/common/uri");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolUtils_1 = require("../../../tools/common/toolUtils");
function isInstructionAttachmentPath(path) {
    const normalizedPath = path.replace(/\\/g, '/');
    return normalizedPath.endsWith('/.github/copilot-instructions.md')
        || (normalizedPath.includes('/.github/instructions/') && normalizedPath.endsWith('.md'));
}
function isCopilotCliEditToolCall(data) {
    const toolCall = data;
    if (toolCall.toolName === 'str_replace_editor') {
        return toolCall.arguments.command !== 'view';
    }
    return toolCall.toolName === 'create' || toolCall.toolName === 'edit';
}
function getAffectedUrisForEditTool(data) {
    const toolCall = data;
    // Old versions used str_replace_editor
    // This should be removed eventually
    // TODO @DonJayamanne verify with SDK & Padawan folk.
    if (toolCall.toolName === 'str_replace_editor' && toolCall.arguments.command !== 'view' && typeof toolCall.arguments.path === 'string') {
        return [uri_1.URI.file(toolCall.arguments.path)];
    }
    if ((toolCall.toolName === 'create' || toolCall.toolName === 'edit' || toolCall.toolName === 'undo_edit') && typeof toolCall.arguments.path === 'string') {
        return [uri_1.URI.file(toolCall.arguments.path)];
    }
    return [];
}
function stripReminders(text) {
    // Remove any <reminder> ... </reminder> blocks, including newlines
    // Also remove <current_datetime> ... </current_datetime> blocks
    // Also remove <pr_metadata .../> tags
    return text
        .replace(/<reminder>[\s\S]*?<\/reminder>\s*/g, '')
        .replace(/<current_datetime>[\s\S]*?<\/current_datetime>\s*/g, '')
        .replace(/<pr_metadata[^>]*\/?>\s*/g, '')
        .trim();
}
/**
 * Extract PR metadata from assistant message content
 */
function extractPRMetadata(content) {
    const prMetadataRegex = /<pr_metadata\s+uri="([^"]+)"\s+title="([^"]+)"\s+description="([^"]+)"\s+author="([^"]+)"\s+linkTag="([^"]+)"\s*\/?>/;
    const match = content.match(prMetadataRegex);
    if (match) {
        const [fullMatch, uri, title, description, author, linkTag] = match;
        // Unescape XML entities
        const unescapeXml = (text) => text
            .replace(/&apos;/g, "'")
            .replace(/&quot;/g, '"')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&');
        const prPart = new vscodeTypes_1.ChatResponsePullRequestPart(vscodeTypes_1.Uri.parse(uri), unescapeXml(title), unescapeXml(description), unescapeXml(author), unescapeXml(linkTag));
        const cleanedContent = content.replace(fullMatch, '').trim();
        return { cleanedContent, prPart };
    }
    return { cleanedContent: content };
}
/**
 * Build chat history from SDK events for VS Code chat session
 * Converts SDKEvents into ChatRequestTurn2 and ChatResponseTurn2 objects
 */
function buildChatHistoryFromEvents(events) {
    const turns = [];
    let currentResponseParts = [];
    const pendingToolInvocations = new Map();
    for (const event of events) {
        switch (event.type) {
            case 'user.message': {
                // Flush any pending response parts before adding user message
                if (currentResponseParts.length > 0) {
                    turns.push(new vscodeTypes_1.ChatResponseTurn2(currentResponseParts, {}, ''));
                    currentResponseParts = [];
                }
                // Filter out vscode instruction files from references when building session history
                // TODO@rebornix filter instructions should be rendered as "references" in chat response like normal chat.
                const references = (event.data.attachments || [])
                    .filter(attachment => !isInstructionAttachmentPath(attachment.path))
                    .map(attachment => ({ id: attachment.path, name: attachment.displayName, value: vscodeTypes_1.Uri.file(attachment.path) }));
                turns.push(new vscodeTypes_1.ChatRequestTurn2(stripReminders(event.data.content || ''), undefined, references, '', [], undefined));
                break;
            }
            case 'assistant.message': {
                if (event.data.content) {
                    // Extract PR metadata if present
                    const { cleanedContent, prPart } = extractPRMetadata(event.data.content);
                    // Add PR part first if it exists
                    if (prPart) {
                        currentResponseParts.push(prPart);
                    }
                    if (cleanedContent) {
                        currentResponseParts.push(new vscodeTypes_1.ChatResponseMarkdownPart(new vscodeTypes_1.MarkdownString(cleanedContent)));
                    }
                }
                break;
            }
            case 'tool.execution_start': {
                const responsePart = processToolExecutionStart(event, pendingToolInvocations);
                if (responsePart instanceof vscodeTypes_1.ChatResponseThinkingProgressPart) {
                    currentResponseParts.push(responsePart);
                }
                break;
            }
            case 'tool.execution_complete': {
                const responsePart = processToolExecutionComplete(event, pendingToolInvocations);
                if (responsePart && !(responsePart instanceof vscodeTypes_1.ChatResponseThinkingProgressPart)) {
                    currentResponseParts.push(responsePart);
                }
                break;
            }
        }
    }
    if (currentResponseParts.length > 0) {
        turns.push(new vscodeTypes_1.ChatResponseTurn2(currentResponseParts, {}, ''));
    }
    return turns;
}
function processToolExecutionStart(event, pendingToolInvocations) {
    const toolInvocation = createCopilotCLIToolInvocation(event.data);
    if (toolInvocation) {
        // Store pending invocation to update with result later
        pendingToolInvocations.set(event.data.toolCallId, toolInvocation);
    }
    return toolInvocation;
}
function processToolExecutionComplete(event, pendingToolInvocations) {
    const invocation = pendingToolInvocations.get(event.data.toolCallId);
    pendingToolInvocations.delete(event.data.toolCallId);
    if (invocation && invocation instanceof vscodeTypes_1.ChatToolInvocationPart) {
        invocation.isComplete = true;
        invocation.isError = !!event.data.error;
        invocation.invocationMessage = event.data.error?.message || invocation.invocationMessage;
        if (!event.data.success && (event.data.error?.code === 'rejected' || event.data.error?.code === 'denied')) {
            invocation.isConfirmed = false;
        }
        else {
            invocation.isConfirmed = true;
        }
    }
    return invocation;
}
/**
 * Creates a formatted tool invocation part for CopilotCLI tools
 */
function createCopilotCLIToolInvocation(data) {
    if (!Object.hasOwn(ToolFriendlyNameAndHandlers, data.toolName)) {
        const invocation = new vscodeTypes_1.ChatToolInvocationPart(data.toolName ?? 'unknown', data.toolCallId ?? '', false);
        invocation.isConfirmed = false;
        invocation.isComplete = false;
        formatGenericInvocation(invocation, data);
        return invocation;
    }
    const toolCall = data;
    // Ensures arguments is at least an empty object
    toolCall.arguments = toolCall.arguments ?? {};
    if (toolCall.toolName === 'report_intent') {
        return undefined; // Ignore these for now
    }
    if (toolCall.toolName === 'think') {
        if (toolCall.arguments && typeof toolCall.arguments.thought === 'string') {
            return new vscodeTypes_1.ChatResponseThinkingProgressPart(toolCall.arguments.thought);
        }
        return undefined;
    }
    const [friendlyToolName, formatter] = ToolFriendlyNameAndHandlers[toolCall.toolName];
    const invocation = new vscodeTypes_1.ChatToolInvocationPart(friendlyToolName ?? toolCall.toolName ?? 'unknown', toolCall.toolCallId ?? '', false);
    invocation.isConfirmed = false;
    invocation.isComplete = false;
    formatter(invocation, toolCall);
    return invocation;
}
const ToolFriendlyNameAndHandlers = {
    'str_replace_editor': [l10n.t('Edit File'), formatStrReplaceEditorInvocation],
    'edit': [l10n.t('Edit File'), formatEditToolInvocation],
    'str_replace': [l10n.t('Edit File'), formatEditToolInvocation],
    'create': [l10n.t('Create File'), formatCreateToolInvocation],
    'insert': [l10n.t('Edit File'), formatInsertToolInvocation],
    'undo_edit': [l10n.t('Edit File'), formatUndoEdit],
    'view': [l10n.t('Read'), formatViewToolInvocation],
    'bash': [l10n.t('Run Shell Command'), formatShellInvocation],
    'powershell': [l10n.t('Run Shell Command'), formatShellInvocation],
    'write_bash': [l10n.t('Write to Bash'), emptyInvocation],
    'write_powershell': [l10n.t('Write to PowerShell'), emptyInvocation],
    'read_bash': [l10n.t('Read Terminal'), emptyInvocation],
    'read_powershell': [l10n.t('Read Terminal'), emptyInvocation],
    'stop_bash': [l10n.t('Stop Terminal Session'), emptyInvocation],
    'stop_powershell': [l10n.t('Stop Terminal Session'), emptyInvocation],
    'search': [l10n.t('Search'), formatSearchToolInvocation],
    'grep': [l10n.t('Search'), formatSearchToolInvocation],
    'glob': [l10n.t('Search'), formatSearchToolInvocation],
    'search_bash': [l10n.t('Search'), formatSearchToolInvocation],
    'semantic_code_search': [l10n.t('Search'), formatSearchToolInvocation],
    'reply_to_comment': [l10n.t('Reply to Comment'), formatReplyToCommentInvocation],
    'code_review': [l10n.t('Review Code'), formatCodeReviewInvocation],
    'report_intent': [l10n.t('Report Intent'), emptyInvocation],
    'think': [l10n.t('Thinking'), emptyInvocation],
    'report_progress': [l10n.t('Progress Update'), formatProgressToolInvocation],
};
function formatProgressToolInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    invocation.invocationMessage = args.prDescription?.trim() || 'Progress Update';
    if (args.commitMessage) {
        invocation.originMessage = `Commit: ${args.commitMessage}`;
    }
}
function formatViewToolInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    if (!args.path) {
        return;
    }
    else if (args.view_range && args.view_range[1] >= args.view_range[0]) {
        const display = (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path));
        const [start, end] = args.view_range;
        const localizedMessage = start === end
            ? l10n.t("Read {0}, line {1}", display, start)
            : l10n.t("Read {0}, lines {1} to {2}", display, start, end);
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(localizedMessage);
    }
    else {
        const display = (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path));
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Read {0}", display));
    }
}
function formatStrReplaceEditorInvocation(invocation, toolCall) {
    if (!toolCall.arguments.path) {
        return;
    }
    const args = toolCall.arguments;
    const display = (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path));
    switch (args.command) {
        case 'view':
            formatViewToolInvocation(invocation, { toolName: 'view', arguments: args });
            break;
        case 'edit':
            formatEditToolInvocation(invocation, { toolName: 'edit', arguments: args });
            break;
        case 'insert':
            formatInsertToolInvocation(invocation, { toolName: 'insert', arguments: args });
            break;
        case 'create':
            formatCreateToolInvocation(invocation, { toolName: 'create', arguments: args });
            break;
        case 'undo_edit':
            formatUndoEdit(invocation, { toolName: 'undo_edit', arguments: args });
            break;
        default:
            invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Modified {0}", display));
    }
}
function formatInsertToolInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    if (args.path) {
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Inserted text in {0}", (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path))));
    }
}
function formatUndoEdit(invocation, toolCall) {
    const args = toolCall.arguments;
    if (args.path) {
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Undid edit in {0}", (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path))));
    }
}
function formatEditToolInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    const display = args.path ? (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path)) : '';
    invocation.invocationMessage = display
        ? new vscodeTypes_1.MarkdownString(l10n.t("Edited {0}", display))
        : new vscodeTypes_1.MarkdownString(l10n.t("Edited file"));
}
function formatCreateToolInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    const display = args.path ? (0, toolUtils_1.formatUriForFileWidget)(vscodeTypes_1.Uri.file(args.path)) : '';
    if (display) {
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Created {0}", display));
    }
    else {
        invocation.invocationMessage = new vscodeTypes_1.MarkdownString(l10n.t("Created file"));
    }
}
function formatShellInvocation(invocation, toolCall) {
    const args = toolCall.arguments;
    const command = args.command ?? '';
    // TODO @DonJayamanne This is the code in copilot cloud, discuss and decide if we want to use it.
    // Not for Cli as we want users to see the exact command being run so they can review and approve it.
    // const MAX_CONTENT_LENGTH = 200;
    // if (command.length > MAX_CONTENT_LENGTH) {
    // 	// Check if content contains EOF marker (heredoc pattern)
    // 	const hasEOF = (command && /<<\s*['"]?EOF['"]?/.test(command));
    // 	if (hasEOF) {
    // 		// show the command line up to EOL
    // 		const firstLineEnd = command.indexOf('\n');
    // 		if (firstLineEnd > 0) {
    // 			const firstLine = command.substring(0, firstLineEnd);
    // 			const remainingChars = command.length - firstLineEnd - 1;
    // 			command = firstLine + `\n... [${remainingChars} characters of heredoc content]`;
    // 		}
    // 	} else {
    // 		command = command.substring(0, MAX_CONTENT_LENGTH) + `\n... [${command.length - MAX_CONTENT_LENGTH} more characters]`;
    // 	}
    // }
    invocation.invocationMessage = args.description ? new vscodeTypes_1.MarkdownString(args.description) : '';
    invocation.toolSpecificData = {
        commandLine: {
            original: command,
        },
        language: toolCall.toolName === 'bash' ? 'bash' : 'powershell'
    };
}
function formatSearchToolInvocation(invocation, toolCall) {
    if (toolCall.toolName === 'search') {
        invocation.invocationMessage = `Criteria: ${toolCall.arguments.question}  \nReason: ${toolCall.arguments.reason}`;
    }
    else if (toolCall.toolName === 'semantic_code_search') {
        invocation.invocationMessage = `Criteria: ${toolCall.arguments.question}`;
    }
    else if (toolCall.toolName === 'search_bash') {
        invocation.invocationMessage = `Command: ${toolCall.arguments.command}`;
    }
    else if (toolCall.toolName === 'glob') {
        const searchInPath = toolCall.arguments.path ? ` in ${toolCall.arguments.path}` : '';
        invocation.invocationMessage = `Pattern: ${toolCall.arguments.pattern}${searchInPath}`;
    }
    else if (toolCall.toolName === 'grep') {
        const searchInPath = toolCall.arguments.path ? ` in ${toolCall.arguments.path}` : '';
        invocation.invocationMessage = `Pattern: ${toolCall.arguments.pattern}${searchInPath}`;
    }
}
function formatCodeReviewInvocation(invocation, toolCall) {
    invocation.invocationMessage = `**${toolCall.arguments.prTitle}**  \n${toolCall.arguments.prDescription}`;
}
function formatReplyToCommentInvocation(invocation, toolCall) {
    invocation.invocationMessage = toolCall.arguments.reply;
}
function formatGenericInvocation(invocation, toolCall) {
    invocation.invocationMessage = l10n.t("Used tool: {0}", toolCall.toolName ?? 'unknown');
}
/**
 * No-op formatter for tool invocations that do not require custom formatting.
 * The `toolCall` parameter is unused and present for interface consistency.
 */
function emptyInvocation(_invocation, _toolCall) {
    //
}
//# sourceMappingURL=copilotCLITools.js.map