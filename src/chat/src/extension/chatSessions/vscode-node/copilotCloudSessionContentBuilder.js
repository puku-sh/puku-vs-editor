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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionContentBuilder = exports.StrReplaceEditorToolData = void 0;
const pathLib = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const gitService_1 = require("../../../platform/git/common/gitService");
const copilotCodingAgentUtils_1 = require("../vscode/copilotCodingAgentUtils");
const pullRequestFileChangesService_1 = require("./pullRequestFileChangesService");
var StrReplaceEditorToolData;
(function (StrReplaceEditorToolData) {
    function is(value) {
        return value && (typeof value.command === 'string');
    }
    StrReplaceEditorToolData.is = is;
})(StrReplaceEditorToolData || (exports.StrReplaceEditorToolData = StrReplaceEditorToolData = {}));
let ChatSessionContentBuilder = class ChatSessionContentBuilder {
    constructor(type, _gitService, _prFileChangesService) {
        this.type = type;
        this._gitService = _gitService;
        this._prFileChangesService = _prFileChangesService;
    }
    async buildSessionHistory(problemStatementPromise, sessions, pullRequest, getLogsForSession, initialReferences) {
        const history = [];
        // Process all sessions concurrently and assemble results in order
        const sessionResults = await Promise.all(sessions.map(async (session, sessionIndex) => {
            const [logs, problemStatement] = await Promise.all([getLogsForSession(session.id), sessionIndex === 0 ? problemStatementPromise : Promise.resolve(undefined)]);
            const turns = [];
            // Create request turn with references for the first session
            const references = sessionIndex === 0 && initialReferences ? Array.from(initialReferences) : [];
            turns.push(new vscode_1.ChatRequestTurn2(problemStatement || session.name, undefined, // command
            references, // references
            this.type, [], // toolReferences
            []));
            // Create the PR card right after problem statement for first session
            if (sessionIndex === 0 && pullRequest.author) {
                const uri = await (0, copilotCodingAgentUtils_1.toOpenPullRequestWebviewUri)({ owner: pullRequest.repository.owner.login, repo: pullRequest.repository.name, pullRequestNumber: pullRequest.number });
                const plaintextBody = pullRequest.body;
                const card = new vscode.ChatResponsePullRequestPart(uri, pullRequest.title, plaintextBody, (0, copilotCodingAgentUtils_1.getAuthorDisplayName)(pullRequest.author), `#${pullRequest.number}`);
                const cardTurn = new vscode.ChatResponseTurn2([card], {}, this.type);
                turns.push(cardTurn);
            }
            const response = await this.createResponseTurn(pullRequest, logs, session);
            if (response) {
                turns.push(response);
            }
            return { sessionIndex, turns };
        }));
        // Assemble results in correct order
        sessionResults
            .sort((a, b) => a.sessionIndex - b.sessionIndex)
            .forEach(result => history.push(...result.turns));
        return history;
    }
    async createResponseTurn(pullRequest, logs, session) {
        if (logs.trim().length > 0) {
            return await this.parseSessionLogsIntoResponseTurn(pullRequest, logs, session);
        }
        else if (session.state === 'in_progress' || session.state === 'queued') {
            // For in-progress sessions without logs, create a placeholder response
            const placeholderParts = [new vscode_1.ChatResponseProgressPart('Session is initializing...')];
            const responseResult = {};
            return new vscode_1.ChatResponseTurn2(placeholderParts, responseResult, this.type);
        }
        else {
            // For completed sessions without logs, add an empty response to maintain pairing
            const emptyParts = [new vscode_1.ChatResponseMarkdownPart('_No logs available for this session_')];
            const responseResult = {};
            return new vscode_1.ChatResponseTurn2(emptyParts, responseResult, this.type);
        }
    }
    async parseSessionLogsIntoResponseTurn(pullRequest, logs, session) {
        try {
            const logChunks = this.parseSessionLogs(logs);
            const responseParts = [];
            for (const chunk of logChunks) {
                if (!chunk.choices || !Array.isArray(chunk.choices)) {
                    continue;
                }
                for (const choice of chunk.choices) {
                    const delta = choice.delta;
                    if (delta.role === 'assistant') {
                        this.processAssistantDelta(delta, choice, pullRequest, responseParts);
                    }
                }
            }
            if (session.state === 'completed' || session.state === 'failed' /** session can fail with proposed changes */) {
                const multiDiffPart = await this._prFileChangesService.getFileChangesMultiDiffPart(pullRequest);
                if (multiDiffPart) {
                    responseParts.push(multiDiffPart);
                }
            }
            if (responseParts.length > 0) {
                const responseResult = {};
                return new vscode_1.ChatResponseTurn2(responseParts, responseResult, this.type);
            }
            return undefined;
        }
        catch (error) {
            return undefined;
        }
    }
    parseSessionLogs(rawText) {
        const parts = rawText
            .split(/\r?\n/)
            .filter(part => part.startsWith('data: '))
            .map(part => part.slice('data: '.length).trim())
            .map(part => JSON.parse(part));
        return parts;
    }
    processAssistantDelta(delta, choice, pullRequest, responseParts) {
        let currentResponseContent = '';
        if (delta.role === 'assistant') {
            // Handle special case for run_custom_setup_step
            if (choice.finish_reason === 'tool_calls' &&
                delta.tool_calls?.length &&
                (delta.tool_calls[0].function.name === 'run_custom_setup_step' || delta.tool_calls[0].function.name === 'run_setup')) {
                const toolCall = delta.tool_calls[0];
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments);
                }
                catch {
                    // fallback to empty args
                }
                if (delta.content && delta.content.trim()) {
                    const toolPart = this.createToolInvocationPart(pullRequest, toolCall, args.name || delta.content);
                    if (toolPart) {
                        responseParts.push(toolPart);
                        if (toolPart instanceof vscode_1.ChatResponseThinkingProgressPart) {
                            responseParts.push(new vscode_1.ChatResponseThinkingProgressPart('', '', { vscodeReasoningDone: true }));
                        }
                    }
                }
                // Skip if content is empty (running state)
            }
            else {
                if (delta.content) {
                    if (!delta.content.startsWith('<pr_title>') && !delta.content.startsWith('<error>')) {
                        currentResponseContent += delta.content;
                    }
                }
                const isError = delta.content?.startsWith('<error>');
                if (delta.tool_calls) {
                    // Add any accumulated content as markdown first
                    if (currentResponseContent.trim()) {
                        responseParts.push(new vscode_1.ChatResponseMarkdownPart(currentResponseContent.trim()));
                        currentResponseContent = '';
                    }
                    for (const toolCall of delta.tool_calls) {
                        const toolPart = this.createToolInvocationPart(pullRequest, toolCall, delta.content || '');
                        if (toolPart) {
                            responseParts.push(toolPart);
                            if (toolPart instanceof vscode_1.ChatResponseThinkingProgressPart) {
                                responseParts.push(new vscode_1.ChatResponseThinkingProgressPart('', '', { vscodeReasoningDone: true }));
                            }
                        }
                    }
                    if (isError) {
                        const toolPart = new vscode_1.ChatToolInvocationPart('Command', 'command');
                        // Remove <error> at the start and </error> at the end
                        const cleaned = (delta.content ?? '').replace(/^\s*<error>\s*/i, '').replace(/\s*<\/error>\s*$/i, '');
                        toolPart.invocationMessage = cleaned;
                        toolPart.isError = true;
                        responseParts.push(toolPart);
                    }
                }
            }
        }
        return currentResponseContent;
    }
    createToolInvocationPart(pullRequest, toolCall, deltaContent = '') {
        if (!toolCall.function?.name || !toolCall.id) {
            return undefined;
        }
        // Hide reply_to_comment tool
        if (toolCall.function.name === 'reply_to_comment') {
            return undefined;
        }
        const toolPart = new vscode_1.ChatToolInvocationPart(toolCall.function.name, toolCall.id);
        toolPart.isComplete = true;
        toolPart.isError = false;
        toolPart.isConfirmed = true;
        try {
            const toolDetails = this.parseToolCallDetails(toolCall, deltaContent);
            toolPart.toolName = toolDetails.toolName;
            if (toolPart.toolName === 'think') {
                return new vscode_1.ChatResponseThinkingProgressPart(toolDetails.invocationMessage);
            }
            if (toolCall.function.name === 'bash') {
                toolPart.invocationMessage = new vscode_1.MarkdownString(`\`\`\`bash\n${toolDetails.invocationMessage}\n\`\`\``);
            }
            else {
                toolPart.invocationMessage = new vscode_1.MarkdownString(toolDetails.invocationMessage);
            }
            if (toolDetails.pastTenseMessage) {
                toolPart.pastTenseMessage = new vscode_1.MarkdownString(toolDetails.pastTenseMessage);
            }
            if (toolDetails.originMessage) {
                toolPart.originMessage = new vscode_1.MarkdownString(toolDetails.originMessage);
            }
            if (toolDetails.toolSpecificData) {
                if (StrReplaceEditorToolData.is(toolDetails.toolSpecificData)) {
                    if ((toolDetails.toolSpecificData.command === 'view' || toolDetails.toolSpecificData.command === 'edit') && toolDetails.toolSpecificData.fileLabel) {
                        const currentRepository = this._gitService.activeRepository.get();
                        const uri = currentRepository?.rootUri ? vscode_1.Uri.file(pathLib.join(currentRepository.rootUri.fsPath, toolDetails.toolSpecificData.fileLabel)) : vscode_1.Uri.file(toolDetails.toolSpecificData.fileLabel);
                        toolPart.invocationMessage = new vscode_1.MarkdownString(`${toolPart.toolName} [](${uri.toString()})` + (toolDetails.toolSpecificData?.viewRange ? `, lines ${toolDetails.toolSpecificData.viewRange?.start} to ${toolDetails.toolSpecificData.viewRange?.end}` : ''));
                        toolPart.invocationMessage.supportHtml = true;
                        toolPart.pastTenseMessage = new vscode_1.MarkdownString(`${toolPart.toolName} [](${uri.toString()})` + (toolDetails.toolSpecificData?.viewRange ? `, lines ${toolDetails.toolSpecificData.viewRange?.start} to ${toolDetails.toolSpecificData.viewRange?.end}` : ''));
                    }
                }
                else {
                    toolPart.toolSpecificData = toolDetails.toolSpecificData;
                }
            }
        }
        catch (error) {
            toolPart.toolName = toolCall.function.name || 'unknown';
            toolPart.invocationMessage = new vscode_1.MarkdownString(`Tool: ${toolCall.function.name}`);
            toolPart.isError = true;
        }
        return toolPart;
    }
    /**
     * Convert absolute file path to relative file label
     * File paths are absolute and look like: `/home/runner/work/repo/repo/<path>`
     */
    toFileLabel(file) {
        const parts = file.split('/');
        return parts.slice(6).join('/');
    }
    parseRange(view_range) {
        if (!view_range) {
            return undefined;
        }
        if (!Array.isArray(view_range)) {
            return undefined;
        }
        if (view_range.length !== 2) {
            return undefined;
        }
        const start = view_range[0];
        const end = view_range[1];
        if (typeof start !== 'number' || typeof end !== 'number') {
            return undefined;
        }
        return {
            start,
            end
        };
    }
    /**
     * Parse diff content and extract file information
     */
    parseDiff(content) {
        const lines = content.split(/\r?\n/g);
        let fileA;
        let fileB;
        let startDiffLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('diff --git')) {
                const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
                if (match) {
                    fileA = match[1];
                    fileB = match[2];
                }
            }
            else if (line.startsWith('@@ ')) {
                startDiffLineIndex = i + 1;
                break;
            }
        }
        if (startDiffLineIndex < 0) {
            return undefined;
        }
        return {
            content: lines.slice(startDiffLineIndex).join('\n'),
            fileA: typeof fileA === 'string' ? '/' + fileA : undefined,
            fileB: typeof fileB === 'string' ? '/' + fileB : undefined
        };
    }
    /**
      * Parse tool call arguments and return normalized tool details
      */
    parseToolCallDetails(toolCall, content) {
        // Parse arguments once with graceful fallback
        let args = {};
        try {
            args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        }
        catch { /* ignore */ }
        const name = toolCall.function.name;
        // Small focused helpers to remove duplication while preserving behavior
        const buildReadDetails = (filePath, parsedRange, opts) => {
            const fileLabel = filePath && this.toFileLabel(filePath);
            if (fileLabel === undefined || fileLabel === '') {
                return { toolName: 'Read repository', invocationMessage: 'Read repository', pastTenseMessage: 'Read repository' };
            }
            const rangeSuffix = parsedRange ? `, lines ${parsedRange.start} to ${parsedRange.end}` : '';
            // Default helper returns bracket variant (used for generic view). Plain variant handled separately for str_replace_editor non-diff.
            return {
                toolName: 'Read',
                invocationMessage: `Read [](${fileLabel})${rangeSuffix}`,
                pastTenseMessage: `Read [](${fileLabel})${rangeSuffix}`,
                toolSpecificData: {
                    command: 'view',
                    filePath: filePath,
                    fileLabel: fileLabel,
                    parsedContent: opts?.parsedContent,
                    viewRange: parsedRange
                }
            };
        };
        const buildEditDetails = (filePath, command = 'edit', parsedRange, opts) => {
            const fileLabel = filePath && this.toFileLabel(filePath);
            const rangeSuffix = parsedRange ? `, lines ${parsedRange.start} to ${parsedRange.end}` : '';
            let invocationMessage;
            let pastTenseMessage;
            if (fileLabel) {
                invocationMessage = `Edit [](${fileLabel})${rangeSuffix}`;
                pastTenseMessage = `Edit [](${fileLabel})${rangeSuffix}`;
            }
            else {
                if (opts?.defaultName === 'Create') {
                    invocationMessage = pastTenseMessage = `Create File ${filePath}`;
                }
                else {
                    invocationMessage = pastTenseMessage = (opts?.defaultName || 'Edit');
                }
                invocationMessage += rangeSuffix;
                pastTenseMessage += rangeSuffix;
            }
            return {
                toolName: opts?.defaultName || 'Edit',
                invocationMessage,
                pastTenseMessage,
                toolSpecificData: fileLabel ? {
                    command: command || (opts?.defaultName === 'Create' ? 'create' : (command || 'edit')),
                    filePath: filePath,
                    fileLabel: fileLabel,
                    viewRange: parsedRange
                } : undefined
            };
        };
        const buildStrReplaceDetails = (filePath) => {
            const fileLabel = filePath && this.toFileLabel(filePath);
            const message = fileLabel ? `Edit [](${fileLabel})` : `Edit ${filePath}`;
            return {
                toolName: 'Edit',
                invocationMessage: message,
                pastTenseMessage: message,
                toolSpecificData: fileLabel ? { command: 'str_replace', filePath, fileLabel } : undefined
            };
        };
        const buildCreateDetails = (filePath) => {
            const fileLabel = filePath && this.toFileLabel(filePath);
            const message = fileLabel ? `Create [](${fileLabel})` : `Create File ${filePath}`;
            return {
                toolName: 'Create',
                invocationMessage: message,
                pastTenseMessage: message,
                toolSpecificData: fileLabel ? { command: 'create', filePath, fileLabel } : undefined
            };
        };
        const buildBashDetails = (bashArgs, contentStr) => {
            const command = bashArgs.command ? `$ ${bashArgs.command}` : undefined;
            const bashContent = [command, contentStr].filter(Boolean).join('\n');
            const MAX_CONTENT_LENGTH = 200;
            let displayContent = bashContent;
            if (bashContent && bashContent.length > MAX_CONTENT_LENGTH) {
                // Check if content contains EOF marker (heredoc pattern)
                const hasEOF = (bashContent && /<<\s*['"]?EOF['"]?/.test(bashContent));
                if (hasEOF) {
                    // show the command line up to EOL
                    const firstLineEnd = bashContent.indexOf('\n');
                    if (firstLineEnd > 0) {
                        const firstLine = bashContent.substring(0, firstLineEnd);
                        const remainingChars = bashContent.length - firstLineEnd - 1;
                        displayContent = firstLine + `\n... [${remainingChars} characters of heredoc content]`;
                    }
                    else {
                        displayContent = bashContent;
                    }
                }
                else {
                    displayContent = bashContent.substring(0, MAX_CONTENT_LENGTH) + `\n... [${bashContent.length - MAX_CONTENT_LENGTH} more characters]`;
                }
            }
            const details = { toolName: 'Run Bash command', invocationMessage: bashContent || 'Run Bash command' };
            if (bashArgs.command) {
                details.toolSpecificData = { commandLine: { original: displayContent ?? '' }, language: 'bash' };
            }
            return details;
        };
        switch (name) {
            case 'str_replace_editor': {
                if (args.command === 'view') {
                    const parsedContent = this.parseDiff(content);
                    const parsedRange = this.parseRange(args.view_range);
                    if (parsedContent) {
                        const file = parsedContent.fileA ?? parsedContent.fileB;
                        const fileLabel = file && this.toFileLabel(file);
                        if (fileLabel === '') {
                            return { toolName: 'Read repository', invocationMessage: 'Read repository', pastTenseMessage: 'Read repository' };
                        }
                        else if (fileLabel === undefined) {
                            return { toolName: 'Read', invocationMessage: 'Read repository', pastTenseMessage: 'Read repository' };
                        }
                        else {
                            const rangeSuffix = parsedRange ? `, lines ${parsedRange.start} to ${parsedRange.end}` : '';
                            return {
                                toolName: 'Read',
                                invocationMessage: `Read [](${fileLabel})${rangeSuffix}`,
                                pastTenseMessage: `Read [](${fileLabel})${rangeSuffix}`,
                                toolSpecificData: { command: 'view', filePath: file, fileLabel, parsedContent, viewRange: parsedRange }
                            };
                        }
                    }
                    // No diff parsed: use PLAIN (non-bracket) variant for str_replace_editor views
                    const plainRange = this.parseRange(args.view_range);
                    const fp = args.path;
                    const fl = fp && this.toFileLabel(fp);
                    if (fl === undefined || fl === '') {
                        return { toolName: 'Read repository', invocationMessage: 'Read repository', pastTenseMessage: 'Read repository' };
                    }
                    const suffix = plainRange ? `, lines ${plainRange.start} to ${plainRange.end}` : '';
                    return {
                        toolName: 'Read',
                        invocationMessage: `Read ${fl}${suffix}`,
                        pastTenseMessage: `Read ${fl}${suffix}`,
                        toolSpecificData: { command: 'view', filePath: fp, fileLabel: fl, viewRange: plainRange }
                    };
                }
                return buildEditDetails(args.path, args.command, this.parseRange(args.view_range));
            }
            case 'str_replace':
                return buildStrReplaceDetails(args.path);
            case 'create':
                return buildCreateDetails(args.path);
            case 'view':
                return buildReadDetails(args.path, this.parseRange(args.view_range)); // generic view always bracket variant
            case 'think': {
                const thought = args.thought || content || 'Thought';
                return { toolName: 'think', invocationMessage: thought };
            }
            case 'report_progress': {
                const details = { toolName: 'Progress Update', invocationMessage: `${args.prDescription}` || content || 'Progress Update' };
                if (args.commitMessage) {
                    details.originMessage = `Commit: ${args.commitMessage}`;
                }
                return details;
            }
            case 'bash':
                return buildBashDetails(args, content);
            case 'read_bash':
                return { toolName: 'read_bash', invocationMessage: 'Read logs from Bash session' };
            case 'stop_bash':
                return { toolName: 'stop_bash', invocationMessage: 'Stop Bash session' };
            case 'edit':
                return buildEditDetails(args.path, args.command, undefined);
            default:
                return { toolName: name || 'unknown', invocationMessage: content || name || 'unknown' };
        }
    }
};
exports.ChatSessionContentBuilder = ChatSessionContentBuilder;
exports.ChatSessionContentBuilder = ChatSessionContentBuilder = __decorate([
    __param(1, gitService_1.IGitService),
    __param(2, pullRequestFileChangesService_1.IPullRequestFileChangesService)
], ChatSessionContentBuilder);
//# sourceMappingURL=copilotCloudSessionContentBuilder.js.map