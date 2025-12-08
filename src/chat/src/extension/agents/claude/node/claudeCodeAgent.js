"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ClaudeCodeSession_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeSession = exports.ClaudeAgentManager = void 0;
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const envService_1 = require("../../../../platform/env/common/envService");
const logService_1 = require("../../../../platform/log/common/logService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const types_1 = require("../../../../util/common/types");
const async_1 = require("../../../../util/vs/base/common/async");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const platform_1 = require("../../../../util/vs/base/common/platform");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const toolNames_1 = require("../../../tools/common/toolNames");
const toolsService_1 = require("../../../tools/common/toolsService");
const toolUtils_1 = require("../../../tools/node/toolUtils");
const externalEditTracker_1 = require("../../common/externalEditTracker");
const langModelServer_1 = require("../../node/langModelServer");
const claudeTools_1 = require("../common/claudeTools");
const toolInvocationFormatter_1 = require("../common/toolInvocationFormatter");
const claudeCodeSdkService_1 = require("./claudeCodeSdkService");
// Manages Claude Code agent interactions and language model server lifecycle
let ClaudeAgentManager = class ClaudeAgentManager extends lifecycle_1.Disposable {
    async getLangModelServer() {
        if (!this._langModelServer) {
            this._langModelServer = this.instantiationService.createInstance(langModelServer_1.LanguageModelServer);
            await this._langModelServer.start();
        }
        return this._langModelServer;
    }
    constructor(logService, instantiationService) {
        super();
        this.logService = logService;
        this.instantiationService = instantiationService;
        this._sessions = this._register(new lifecycle_1.DisposableMap());
    }
    async handleRequest(claudeSessionId, request, _context, stream, token) {
        try {
            // Get server config, start server if needed
            const serverConfig = (await this.getLangModelServer()).getConfig();
            const sessionIdForLog = claudeSessionId ?? 'new';
            this.logService.trace(`[ClaudeAgentManager] Handling request for sessionId=${sessionIdForLog}.`);
            let session;
            if (claudeSessionId && this._sessions.has(claudeSessionId)) {
                this.logService.trace(`[ClaudeAgentManager] Reusing Claude session ${claudeSessionId}.`);
                session = this._sessions.get(claudeSessionId);
            }
            else {
                this.logService.trace(`[ClaudeAgentManager] Creating Claude session for sessionId=${sessionIdForLog}.`);
                const newSession = this.instantiationService.createInstance(ClaudeCodeSession, serverConfig, claudeSessionId);
                if (newSession.sessionId) {
                    this._sessions.set(newSession.sessionId, newSession);
                }
                session = newSession;
            }
            await session.invoke(this.resolvePrompt(request), request.toolInvocationToken, stream, token);
            // Store the session if sessionId was assigned during invoke
            if (session.sessionId && !this._sessions.has(session.sessionId)) {
                this.logService.trace(`[ClaudeAgentManager] Tracking Claude session ${claudeSessionId} -> ${session.sessionId}`);
                this._sessions.set(session.sessionId, session);
            }
            return {
                claudeSessionId: session.sessionId
            };
        }
        catch (invokeError) {
            this.logService.error(invokeError);
            const errorMessage = (invokeError instanceof KnownClaudeError) ? invokeError.message : `Claude CLI Error: ${invokeError.message}`;
            stream.markdown('❌ Error: ' + errorMessage);
            return {
                // This currently can't be used by the sessions API https://github.com/microsoft/vscode/issues/263111
                errorDetails: { message: errorMessage },
            };
        }
    }
    resolvePrompt(request) {
        if (request.prompt.startsWith('/')) {
            return request.prompt; // likely a slash command, don't modify
        }
        const extraRefsTexts = [];
        let prompt = request.prompt;
        request.references.forEach(ref => {
            const valueText = uri_1.URI.isUri(ref.value) ?
                ref.value.fsPath :
                (0, types_1.isLocation)(ref.value) ?
                    `${ref.value.uri.fsPath}:${ref.value.range.start.line + 1}` :
                    undefined;
            if (valueText) {
                if (ref.range) {
                    prompt = prompt.slice(0, ref.range[0]) + valueText + prompt.slice(ref.range[1]);
                }
                else {
                    extraRefsTexts.push(`- ${valueText}`);
                }
            }
        });
        if (extraRefsTexts.length > 0) {
            prompt = `<system-reminder>\nThe user provided the following references:\n${extraRefsTexts.join('\n')}\n\nIMPORTANT: this context may or may not be relevant to your tasks. You should not respond to this context unless it is highly relevant to your task.\n</system-reminder>\n\n` + prompt;
        }
        return prompt;
    }
};
exports.ClaudeAgentManager = ClaudeAgentManager;
exports.ClaudeAgentManager = ClaudeAgentManager = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, instantiation_1.IInstantiationService)
], ClaudeAgentManager);
class KnownClaudeError extends Error {
}
let ClaudeCodeSession = class ClaudeCodeSession extends lifecycle_1.Disposable {
    static { ClaudeCodeSession_1 = this; }
    static { this.DenyToolMessage = 'The user declined to run the tool'; }
    constructor(serverConfig, sessionId, logService, configService, workspaceService, envService, instantiationService, toolsService, claudeCodeService, _log) {
        super();
        this.serverConfig = serverConfig;
        this.sessionId = sessionId;
        this.logService = logService;
        this.configService = configService;
        this.workspaceService = workspaceService;
        this.envService = envService;
        this.instantiationService = instantiationService;
        this.toolsService = toolsService;
        this.claudeCodeService = claudeCodeService;
        this._log = _log;
        this._promptQueue = [];
        this._abortController = new AbortController();
        this._editTracker = new externalEditTracker_1.ExternalEditTracker();
    }
    dispose() {
        this._abortController.abort();
        this._promptQueue.forEach(req => req.deferred.error(new Error('Session disposed')));
        this._promptQueue = [];
        this._pendingPrompt?.error(new Error('Session disposed'));
        this._pendingPrompt = undefined;
        super.dispose();
    }
    /**
     * Invokes the Claude Code session with a user prompt
     * @param prompt The user's prompt text
     * @param toolInvocationToken Token for invoking tools
     * @param stream Response stream for sending results back to VS Code
     * @param token Cancellation token for request cancellation
     */
    async invoke(prompt, toolInvocationToken, stream, token) {
        if (this._store.isDisposed) {
            throw new Error('Session disposed');
        }
        if (!this._queryGenerator) {
            await this._startSession(token);
        }
        // Add this request to the queue and wait for completion
        const deferred = new async_1.DeferredPromise();
        const request = {
            prompt,
            stream,
            toolInvocationToken,
            token,
            deferred
        };
        this._promptQueue.push(request);
        // Handle cancellation
        token.onCancellationRequested(() => {
            const index = this._promptQueue.indexOf(request);
            if (index !== -1) {
                this._promptQueue.splice(index, 1);
                deferred.error(new Error('Request was cancelled'));
            }
        });
        // If there's a pending prompt request, fulfill it immediately
        if (this._pendingPrompt) {
            const pendingPrompt = this._pendingPrompt;
            this._pendingPrompt = undefined;
            pendingPrompt.complete(request);
        }
        return deferred.p;
    }
    /**
     * Starts a new Claude Code session with the configured options
     */
    async _startSession(token) {
        // Build options for the Claude Code SDK
        // process.env.DEBUG = '1'; // debug messages from sdk.mjs
        const isDebugEnabled = this.configService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.ClaudeCodeDebugEnabled);
        this.logService.trace(`appRoot: ${this.envService.appRoot}`);
        const pathSep = platform_1.isWindows ? ';' : ':';
        const options = {
            cwd: this.workspaceService.getWorkspaceFolders().at(0)?.fsPath,
            abortController: this._abortController,
            executable: process.execPath, // get it to fork the EH node process
            env: {
                ...process.env,
                ...(isDebugEnabled ? { DEBUG: '1' } : {}),
                ANTHROPIC_BASE_URL: `http://localhost:${this.serverConfig.port}`,
                ANTHROPIC_API_KEY: this.serverConfig.nonce,
                CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
                USE_BUILTIN_RIPGREP: '0',
                PATH: `${this.envService.appRoot}/node_modules/@vscode/ripgrep/bin${pathSep}${process.env.PATH}`
            },
            resume: this.sessionId,
            hooks: {
                PreToolUse: [
                    {
                        matcher: claudeTools_1.claudeEditTools.join('|'),
                        hooks: [(input, toolID) => this._onWillEditTool(input, toolID, token)]
                    }
                ],
                PostToolUse: [
                    {
                        matcher: claudeTools_1.claudeEditTools.join('|'),
                        hooks: [(input, toolID) => this._onDidEditTool(input, toolID)]
                    }
                ],
            },
            canUseTool: async (name, input) => {
                return this._currentRequest ?
                    this.canUseTool(name, input, this._currentRequest.toolInvocationToken) :
                    { behavior: 'deny', message: 'No active request' };
            },
            appendSystemPrompt: 'Your responses will be rendered as markdown, so please reply with properly formatted markdown when appropriate. When replying with code or the name of a symbol, wrap it in backticks.'
        };
        this.logService.trace(`Claude CLI SDK: Starting query with options: ${JSON.stringify(options)}`);
        this._queryGenerator = await this.claudeCodeService.query({
            prompt: this._createPromptIterable(),
            options
        });
        // Start the message processing loop
        this._processMessages();
    }
    async _onWillEditTool(input, toolUseID, token) {
        let uris = [];
        try {
            uris = (0, claudeTools_1.getAffectedUrisForEditTool)(input);
        }
        catch (error) {
            this._log.error('Error getting affected URIs for edit tool', error);
        }
        if (!this._currentRequest) {
            return {};
        }
        await this._editTracker.trackEdit(toolUseID ?? '', uris, this._currentRequest.stream, token);
        return {};
    }
    async _onDidEditTool(_input, toolUseID) {
        await this._editTracker.completeEdit(toolUseID ?? '');
        return {};
    }
    async *_createPromptIterable() {
        while (true) {
            // Wait for a request to be available
            const request = await this._getNextRequest();
            this._currentRequest = {
                stream: request.stream,
                toolInvocationToken: request.toolInvocationToken,
                token: request.token
            };
            yield {
                type: 'user',
                message: {
                    role: 'user',
                    content: request.prompt
                },
                parent_tool_use_id: null,
                session_id: this.sessionId ?? ''
            };
            // Wait for this request to complete before yielding the next one
            await request.deferred.p;
        }
    }
    /**
     * Gets the next request from the queue or waits for one to be available
     * @returns Promise that resolves with the next queued request
     */
    async _getNextRequest() {
        if (this._promptQueue.length > 0) {
            return this._promptQueue[0]; // Don't shift yet, keep for resolution
        }
        // Wait for a request to be queued
        this._pendingPrompt = new async_1.DeferredPromise();
        return this._pendingPrompt.p;
    }
    /**
     * Processes messages from the Claude Code query generator
     * Routes messages to appropriate handlers and manages request completion
     */
    async _processMessages() {
        try {
            const unprocessedToolCalls = new Map();
            for await (const message of this._queryGenerator) {
                // Check if current request was cancelled
                if (this._currentRequest?.token.isCancellationRequested) {
                    throw new Error('Request was cancelled');
                }
                this.logService.trace(`Claude CLI SDK Message: ${JSON.stringify(message, null, 2)}`);
                if (message.session_id) {
                    this.sessionId = message.session_id;
                }
                if (message.type === 'assistant') {
                    this.handleAssistantMessage(message, this._currentRequest.stream, unprocessedToolCalls);
                }
                else if (message.type === 'user') {
                    this.handleUserMessage(message, this._currentRequest.stream, unprocessedToolCalls, this._currentRequest.toolInvocationToken, this._currentRequest.token);
                }
                else if (message.type === 'result') {
                    this.handleResultMessage(message, this._currentRequest.stream);
                    // Resolve and remove the completed request
                    if (this._promptQueue.length > 0) {
                        const completedRequest = this._promptQueue.shift();
                        completedRequest.deferred.complete();
                    }
                    this._currentRequest = undefined;
                }
            }
        }
        catch (error) {
            // Reject all pending requests
            this._promptQueue.forEach(req => req.deferred.error(error));
            this._promptQueue = [];
            this._pendingPrompt?.error(error);
            this._pendingPrompt = undefined;
        }
    }
    /**
     * Handles assistant messages containing text content and tool use blocks
     */
    handleAssistantMessage(message, stream, unprocessedToolCalls) {
        for (const item of message.message.content) {
            if (item.type === 'text' && item.text) {
                stream.markdown(item.text);
            }
            else if (item.type === 'tool_use') {
                // Don't show progress message for TodoWrite tool
                if (item.name !== claudeTools_1.ClaudeToolNames.TodoWrite) {
                    stream.progress(`\n\n🛠️ Using tool: ${item.name}...`);
                }
                unprocessedToolCalls.set(item.id, item);
            }
        }
    }
    /**
     * Handles user messages containing tool results
     */
    handleUserMessage(message, stream, unprocessedToolCalls, toolInvocationToken, token) {
        if (Array.isArray(message.message.content)) {
            for (const toolResult of message.message.content) {
                if (toolResult.type === 'tool_result') {
                    this.processToolResult(toolResult, stream, unprocessedToolCalls, toolInvocationToken, token);
                }
            }
        }
    }
    /**
     * Processes individual tool results and handles special tool types
     */
    processToolResult(toolResult, stream, unprocessedToolCalls, toolInvocationToken, token) {
        const toolUse = unprocessedToolCalls.get(toolResult.tool_use_id);
        if (!toolUse) {
            return;
        }
        unprocessedToolCalls.delete(toolResult.tool_use_id);
        const invocation = (0, toolInvocationFormatter_1.createFormattedToolInvocation)(toolUse, toolResult);
        if (toolResult?.content === ClaudeCodeSession_1.DenyToolMessage && invocation) {
            invocation.isConfirmed = false;
        }
        if (toolUse.name === claudeTools_1.ClaudeToolNames.TodoWrite) {
            this.processTodoWriteTool(toolUse, toolInvocationToken, token);
        }
        if (invocation) {
            stream.push(invocation);
        }
    }
    /**
     * Handles the TodoWrite tool by converting Claude's todo format to the core todo list format
     */
    processTodoWriteTool(toolUse, toolInvocationToken, token) {
        const input = toolUse.input;
        this.toolsService.invokeTool(toolNames_1.ToolName.CoreManageTodoList, {
            input: {
                operation: 'write',
                todoList: input.todos.map((todo, i) => ({
                    id: i,
                    title: todo.content,
                    description: '',
                    status: todo.status === 'pending' ?
                        'not-started' :
                        (todo.status === 'in_progress' ?
                            'in-progress' :
                            'completed')
                })),
            },
            toolInvocationToken,
        }, token);
    }
    /**
     * Handles result messages that indicate completion or errors
     */
    handleResultMessage(message, stream) {
        if (message.subtype === 'error_max_turns') {
            stream.progress(`⚠️ Maximum turns reached (${message.num_turns})`);
        }
        else if (message.subtype === 'error_during_execution') {
            throw new KnownClaudeError(`Error during execution`);
        }
    }
    /**
     * Handles tool permission requests by showing a confirmation dialog to the user
     */
    async canUseTool(toolName, input, toolInvocationToken) {
        this.logService.trace(`ClaudeCodeSession: canUseTool: ${toolName}(${JSON.stringify(input)})`);
        if (await this.canAutoApprove(toolName, input)) {
            this.logService.trace(`ClaudeCodeSession: auto-approving ${toolName}`);
            return {
                behavior: 'allow',
                updatedInput: input
            };
        }
        try {
            const result = await this.toolsService.invokeTool(toolNames_1.ToolName.CoreConfirmationTool, {
                input: this.getConfirmationToolParams(toolName, input),
                toolInvocationToken,
            }, cancellation_1.CancellationToken.None);
            const firstResultPart = result.content.at(0);
            if (firstResultPart instanceof vscodeTypes_1.LanguageModelTextPart && firstResultPart.value === 'yes') {
                return {
                    behavior: 'allow',
                    updatedInput: input
                };
            }
        }
        catch { }
        return {
            behavior: 'deny',
            message: ClaudeCodeSession_1.DenyToolMessage
        };
    }
    getConfirmationToolParams(toolName, input) {
        if (toolName === claudeTools_1.ClaudeToolNames.Bash) {
            return {
                title: `Use ${toolName}?`,
                message: `\`\`\`\n${JSON.stringify(input, null, 2)}\n\`\`\``,
                confirmationType: 'terminal',
                terminalCommand: input.command
            };
        }
        else if (toolName === claudeTools_1.ClaudeToolNames.ExitPlanMode) {
            const plan = input.plan;
            return {
                title: `Ready to code?`,
                message: 'Here is Claude\'s plan:\n\n' + plan,
                confirmationType: 'basic'
            };
        }
        return {
            title: `Use ${toolName}?`,
            message: `\`\`\`\n${JSON.stringify(input, null, 2)}\n\`\`\``,
            confirmationType: 'basic'
        };
    }
    async canAutoApprove(toolName, input) {
        if (toolName === claudeTools_1.ClaudeToolNames.Edit || toolName === claudeTools_1.ClaudeToolNames.Write || toolName === claudeTools_1.ClaudeToolNames.MultiEdit) {
            return await this.instantiationService.invokeFunction(toolUtils_1.isFileOkForTool, uri_1.URI.file(input.file_path));
        }
        return false;
    }
};
exports.ClaudeCodeSession = ClaudeCodeSession;
exports.ClaudeCodeSession = ClaudeCodeSession = ClaudeCodeSession_1 = __decorate([
    __param(2, logService_1.ILogService),
    __param(3, configurationService_1.IConfigurationService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, envService_1.IEnvService),
    __param(6, instantiation_1.IInstantiationService),
    __param(7, toolsService_1.IToolsService),
    __param(8, claudeCodeSdkService_1.IClaudeCodeSdkService),
    __param(9, logService_1.ILogService)
], ClaudeCodeSession);
//# sourceMappingURL=claudeCodeAgent.js.map