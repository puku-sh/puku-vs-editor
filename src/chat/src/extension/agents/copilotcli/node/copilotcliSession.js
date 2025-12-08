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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CopilotCLISession = void 0;
const authentication_1 = require("../../../../platform/authentication/common/authentication");
const gitService_1 = require("../../../../platform/git/common/gitService");
const logService_1 = require("../../../../platform/log/common/logService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const event_1 = require("../../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../../util/vs/base/common/map");
const resources_1 = require("../../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const externalEditTracker_1 = require("../../common/externalEditTracker");
const copilotCLITools_1 = require("../common/copilotCLITools");
const copilotCli_1 = require("./copilotCli");
const permissionHelpers_1 = require("./permissionHelpers");
let CopilotCLISession = class CopilotCLISession extends lifecycle_1.DisposableStore {
    get status() {
        return this._status;
    }
    get permissionRequested() {
        return this._permissionRequested;
    }
    get sdkSession() {
        return this._sdkSession;
    }
    constructor(_options, _sdkSession, gitService, logService, workspaceService, authenticationService, instantiationService) {
        super();
        this._options = _options;
        this._sdkSession = _sdkSession;
        this.gitService = gitService;
        this.logService = logService;
        this.workspaceService = workspaceService;
        this.authenticationService = authenticationService;
        this.instantiationService = instantiationService;
        this._pendingToolInvocations = new Map();
        this._statusChange = this.add(new vscodeTypes_1.EventEmitter());
        this.onDidChangeStatus = this._statusChange.event;
        this._onPermissionRequested = this.add(new vscodeTypes_1.EventEmitter());
        this.onPermissionRequested = this._onPermissionRequested.event;
        this._permissionHandlerSet = this.add(new event_1.Emitter());
        this.sessionId = _sdkSession.sessionId;
    }
    attachStream(stream) {
        this._stream = stream;
        return (0, lifecycle_1.toDisposable)(() => {
            if (this._stream === stream) {
                this._stream = undefined;
            }
        });
    }
    attachPermissionHandler(handler) {
        this._permissionHandler = handler;
        this._permissionHandlerSet.fire();
        return (0, lifecycle_1.toDisposable)(() => {
            if (this._permissionHandler === handler) {
                this._permissionHandler = undefined;
            }
        });
    }
    async handleRequest(prompt, attachments, modelId, token) {
        if (this.isDisposed) {
            throw new Error('Session disposed');
        }
        this._status = vscodeTypes_1.ChatSessionStatus.InProgress;
        this._statusChange.fire(this._status);
        this.logService.trace(`[CopilotCLISession] Invoking session ${this.sessionId}`);
        const disposables = this.add(new lifecycle_1.DisposableStore());
        const abortController = new AbortController();
        disposables.add(token.onCancellationRequested(() => {
            abortController.abort();
        }));
        disposables.add((0, lifecycle_1.toDisposable)(() => abortController.abort()));
        const toolNames = new Map();
        const editToolIds = new Set();
        const editTracker = new externalEditTracker_1.ExternalEditTracker();
        const editFilesAndToolCallIds = new map_1.ResourceMap();
        disposables.add(this._options.addPermissionHandler(async (permissionRequest) => {
            // Need better API from SDK to correlate file edits in permission requests to tool invocations.
            return await this.requestPermission(permissionRequest, editTracker, (file) => {
                const ids = editFilesAndToolCallIds.get(file);
                return ids?.shift();
            }, this._options.toSessionOptions().workingDirectory, token);
        }));
        try {
            // Where possible try to avoid an extra call to getSelectedModel by using cached value.
            const [currentModel, authInfo] = await Promise.all([
                modelId ? (this._lastUsedModel ?? this._sdkSession.getSelectedModel()) : undefined,
                (0, copilotCli_1.getAuthInfo)(this.authenticationService)
            ]);
            if (authInfo) {
                this._sdkSession.setAuthInfo(authInfo);
            }
            if (modelId && modelId !== currentModel) {
                this._lastUsedModel = modelId;
                await this._sdkSession.setSelectedModel(modelId);
            }
            disposables.add((0, lifecycle_1.toDisposable)(this._sdkSession.on('*', (event) => this.logService.trace(`[CopilotCLISession]CopilotCLI Event: ${JSON.stringify(event, null, 2)}`))));
            disposables.add((0, lifecycle_1.toDisposable)(this._sdkSession.on('assistant.message', (event) => {
                if (typeof event.data.content === 'string' && event.data.content.length) {
                    this._stream?.markdown(event.data.content);
                }
            })));
            disposables.add((0, lifecycle_1.toDisposable)(this._sdkSession.on('tool.execution_start', (event) => {
                toolNames.set(event.data.toolCallId, event.data.toolName);
                if ((0, copilotCLITools_1.isCopilotCliEditToolCall)(event.data)) {
                    editToolIds.add(event.data.toolCallId);
                    // Track edits for edit tools.
                    const editUris = (0, copilotCLITools_1.getAffectedUrisForEditTool)(event.data);
                    if (editUris.length) {
                        editUris.forEach(uri => {
                            const ids = editFilesAndToolCallIds.get(uri) || [];
                            ids.push(event.data);
                            editFilesAndToolCallIds.set(uri, ids);
                            this.logService.trace(`[CopilotCLISession] Tracking for toolCallId ${event.data.toolCallId} of file ${uri.fsPath}`);
                        });
                    }
                }
                else {
                    const responsePart = (0, copilotCLITools_1.processToolExecutionStart)(event, this._pendingToolInvocations);
                    if (responsePart instanceof vscodeTypes_1.ChatResponseThinkingProgressPart) {
                        this._stream?.push(responsePart);
                        this._stream?.push(new vscodeTypes_1.ChatResponseThinkingProgressPart('', '', { vscodeReasoningDone: true }));
                    }
                }
                this.logService.trace(`[CopilotCLISession] Start Tool ${event.data.toolName || '<unknown>'}`);
            })));
            disposables.add((0, lifecycle_1.toDisposable)(this._sdkSession.on('tool.execution_complete', (event) => {
                // Mark the end of the edit if this was an edit tool.
                editTracker.completeEdit(event.data.toolCallId);
                if (editToolIds.has(event.data.toolCallId)) {
                    this.logService.trace(`[CopilotCLISession] Completed edit tracking for toolCallId ${event.data.toolCallId}`);
                    return;
                }
                const responsePart = (0, copilotCLITools_1.processToolExecutionComplete)(event, this._pendingToolInvocations);
                if (responsePart && !(responsePart instanceof vscodeTypes_1.ChatResponseThinkingProgressPart)) {
                    this._stream?.push(responsePart);
                }
                const toolName = toolNames.get(event.data.toolCallId) || '<unknown>';
                const success = `success: ${event.data.success}`;
                const error = event.data.error ? `error: ${event.data.error.code},${event.data.error.message}` : '';
                const result = event.data.result ? `result: ${event.data.result?.content}` : '';
                const parts = [success, error, result].filter(part => part.length > 0).join(', ');
                this.logService.trace(`[CopilotCLISession]Complete Tool ${toolName}, ${parts}`);
            })));
            disposables.add((0, lifecycle_1.toDisposable)(this._sdkSession.on('session.error', (event) => {
                this.logService.error(`[CopilotCLISession]CopilotCLI error: (${event.data.errorType}), ${event.data.message}`);
                this._stream?.markdown(`\n\n❌ Error: (${event.data.errorType}) ${event.data.message}`);
            })));
            await this._sdkSession.send({ prompt, attachments, abortController });
            this.logService.trace(`[CopilotCLISession] Invoking session (completed) ${this.sessionId}`);
            if (this._options.isolationEnabled) {
                // When isolation is enabled and we are using a git workspace, stage
                // all changes in the working directory when the session is completed
                const workingDirectory = this._options.toSessionOptions().workingDirectory;
                if (workingDirectory) {
                    await this.gitService.add(vscodeTypes_1.Uri.file(workingDirectory), []);
                    this.logService.trace(`[CopilotCLISession] Staged all changes in working directory ${workingDirectory}`);
                }
            }
            this._status = vscodeTypes_1.ChatSessionStatus.Completed;
            this._statusChange.fire(this._status);
        }
        catch (error) {
            this._status = vscodeTypes_1.ChatSessionStatus.Failed;
            this._statusChange.fire(this._status);
            this.logService.error(`[CopilotCLISession] Invoking session (error) ${this.sessionId}`, error);
            this._stream?.markdown(`\n\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            disposables.dispose();
        }
    }
    addUserMessage(content) {
        this._sdkSession.emit('user.message', { content });
    }
    addUserAssistantMessage(content) {
        this._sdkSession.emit('assistant.message', {
            messageId: `msg_${Date.now()}`,
            content
        });
    }
    getSelectedModelId() {
        return this._sdkSession.getSelectedModel();
    }
    getChatHistory() {
        const events = this._sdkSession.getEvents();
        return (0, copilotCLITools_1.buildChatHistoryFromEvents)(events);
    }
    async requestPermission(permissionRequest, editTracker, getEditKeyForFile, workingDirectory, token) {
        if (permissionRequest.kind === 'read') {
            // If user is reading a file in the working directory or workspace, auto-approve
            // read requests. Outside workspace reads (e.g., /etc/passwd) will still require
            // approval.
            const data = vscodeTypes_1.Uri.file(permissionRequest.path);
            if (workingDirectory && resources_1.extUriBiasedIgnorePathCase.isEqualOrParent(data, vscodeTypes_1.Uri.file(workingDirectory))) {
                this.logService.trace(`[CopilotCLISession] Auto Approving request to read file in working directory ${permissionRequest.path}`);
                return { kind: 'approved' };
            }
            if (this.workspaceService.getWorkspaceFolder(data)) {
                this.logService.trace(`[CopilotCLISession] Auto Approving request to read workspace file ${permissionRequest.path}`);
                return { kind: 'approved' };
            }
        }
        let toolCall;
        if (workingDirectory && permissionRequest.kind === 'write') {
            // TODO:@rebornix @lszomoru
            // If user is writing a file in the working directory configured for the session, AND the working directory is not a workspace folder,
            // auto-approve the write request. Currently we only set non-workspace working directories when using git worktrees.
            const editFile = vscodeTypes_1.Uri.file(permissionRequest.fileName);
            toolCall = getEditKeyForFile(editFile);
            const isWorkspaceFile = this.workspaceService.getWorkspaceFolder(editFile);
            const isWorkingDirectoryFile = !this.workspaceService.getWorkspaceFolder(vscodeTypes_1.Uri.file(workingDirectory)) && resources_1.extUriBiasedIgnorePathCase.isEqualOrParent(editFile, vscodeTypes_1.Uri.file(workingDirectory));
            let autoApprove = false;
            // If isolation is enabled, we only auto-approve writes within the working directory.
            if (this._options.isolationEnabled && isWorkingDirectoryFile) {
                autoApprove = true;
            }
            // If its a workspace file, and not editing protected files, we auto-approve.
            if (!autoApprove && isWorkspaceFile && !(await (0, permissionHelpers_1.requiresFileEditconfirmation)(this.instantiationService, permissionRequest))) {
                autoApprove = true;
            }
            if (autoApprove) {
                this.logService.trace(`[CopilotCLISession] Auto Approving request ${permissionRequest.fileName}`);
                // If we're editing a file, start tracking the edit & wait for core to acknowledge it.
                if (toolCall && this._stream) {
                    this.logService.trace(`[CopilotCLISession] Starting to track edit for toolCallId ${toolCall.toolCallId} & file ${editFile.fsPath}`);
                    await editTracker.trackEdit(toolCall.toolCallId, [editFile], this._stream);
                }
                return { kind: 'approved' };
            }
        }
        try {
            const permissionHandler = await this.waitForPermissionHandler(permissionRequest);
            if (!permissionHandler) {
                this.logService.warn(`[CopilotCLISession] No permission handler registered, denying request for ${permissionRequest.kind} permission.`);
                return { kind: 'denied-interactively-by-user' };
            }
            if (await permissionHandler(permissionRequest, toolCall, token)) {
                // If we're editing a file, start tracking the edit & wait for core to acknowledge it.
                const editFile = permissionRequest.kind === 'write' ? vscodeTypes_1.Uri.file(permissionRequest.fileName) : undefined;
                if (editFile && toolCall && this._stream) {
                    this.logService.trace(`[CopilotCLISession] Starting to track edit for toolCallId ${toolCall.toolCallId} & file ${editFile.fsPath}`);
                    await editTracker.trackEdit(toolCall.toolCallId, [editFile], this._stream);
                }
                return { kind: 'approved' };
            }
        }
        catch (error) {
            this.logService.error(`[CopilotCLISession] Permission request error: ${error}`);
        }
        finally {
            this._permissionRequested = undefined;
        }
        return { kind: 'denied-interactively-by-user' };
    }
    async waitForPermissionHandler(permissionRequest) {
        if (!this._permissionHandler) {
            this._permissionRequested = permissionRequest;
            this._onPermissionRequested.fire(permissionRequest);
            const disposables = this.add(new lifecycle_1.DisposableStore());
            await event_1.Event.toPromise(this._permissionHandlerSet.event, disposables);
            disposables.dispose();
            this._permissionRequested = undefined;
        }
        return this._permissionHandler;
    }
};
exports.CopilotCLISession = CopilotCLISession;
exports.CopilotCLISession = CopilotCLISession = __decorate([
    __param(2, gitService_1.IGitService),
    __param(3, logService_1.ILogService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, authentication_1.IAuthenticationService),
    __param(6, instantiation_1.IInstantiationService)
], CopilotCLISession);
//# sourceMappingURL=copilotcliSession.js.map