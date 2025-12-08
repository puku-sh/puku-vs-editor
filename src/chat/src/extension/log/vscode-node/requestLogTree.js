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
exports.RequestLogTree = void 0;
const http_1 = require("http");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const tar = __importStar(require("tar"));
const vscode = __importStar(require("vscode"));
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const outputChannelLogTarget_1 = require("../../../platform/log/vscode/outputChannelLogTarget");
const requestLogger_1 = require("../../../platform/requestLogger/node/requestLogger");
const assert_1 = require("../../../util/vs/base/common/assert");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const types_1 = require("../../../util/vs/base/common/types");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const showHtmlCommand = 'vscode.copilot.chat.showRequestHtmlItem';
const exportLogItemCommand = 'puku.chat.debug.exportLogItem';
const exportPromptArchiveCommand = 'puku.chat.debug.exportPromptArchive';
const exportPromptLogsAsJsonCommand = 'puku.chat.debug.exportPromptLogsAsJson';
const exportAllPromptLogsAsJsonCommand = 'puku.chat.debug.exportAllPromptLogsAsJson';
const saveCurrentMarkdownCommand = 'puku.chat.debug.saveCurrentMarkdown';
const showRawRequestBodyCommand = 'puku.chat.debug.showRawRequestBody';
let RequestLogTree = class RequestLogTree extends lifecycle_1.Disposable {
    constructor(instantiationService, requestLogger) {
        super();
        this.id = 'requestLogTree';
        this.chatRequestProvider = this._register(instantiationService.createInstance(ChatRequestProvider));
        this._register(vscode.window.registerTreeDataProvider('copilot-chat', this.chatRequestProvider));
        let server;
        const getExportableLogEntries = (treeItem) => {
            if (!treeItem || !treeItem.children) {
                return [];
            }
            const logEntries = treeItem.children.map(child => {
                if (child instanceof ChatRequestItem || child instanceof ToolCallItem || child instanceof ChatElementItem) {
                    return child.info;
                }
                return undefined; // Skip non-loggable items
            }).filter(types_1.isDefined);
            return logEntries;
        };
        // Helper method to process log entries for a single prompt
        const preparePromptLogsAsJson = async (treeItem) => {
            const logEntries = getExportableLogEntries(treeItem);
            if (logEntries.length === 0) {
                return;
            }
            const promptLogs = [];
            for (const logEntry of logEntries) {
                try {
                    promptLogs.push(await logEntry.toJSON());
                }
                catch (error) {
                    // If we can't get content for this entry, add an error object
                    promptLogs.push({
                        id: logEntry.id,
                        kind: 'error',
                        error: error?.toString() || 'Unknown error',
                        timestamp: new Date().toISOString()
                    });
                }
            }
            return {
                prompt: treeItem.request.prompt,
                promptId: treeItem.id,
                hasSeen: treeItem.hasSeen,
                logCount: promptLogs.length,
                logs: promptLogs
            };
        };
        this._register(vscode.commands.registerCommand(showHtmlCommand, async (elementId) => {
            if (!server) {
                server = this._register(new RequestServer());
            }
            const req = requestLogger.getRequests().find(r => r.kind === 0 /* LoggedInfoKind.Element */ && r.id === elementId);
            if (!req) {
                return;
            }
            const address = await server.addRouter(req);
            await vscode.commands.executeCommand('simpleBrowser.show', address);
        }));
        this._register(vscode.commands.registerCommand(exportLogItemCommand, async (treeItem) => {
            if (!treeItem || !treeItem.id) {
                return;
            }
            let logEntry;
            if (treeItem instanceof ChatPromptItem) {
                // ChatPromptItem doesn't represent a single log entry
                vscode.window.showWarningMessage('Cannot export chat prompt item. Please select a specific request, tool call, or element.');
                return;
            }
            else if (treeItem instanceof ChatRequestItem || treeItem instanceof ToolCallItem || treeItem instanceof ChatElementItem) {
                logEntry = treeItem.info;
            }
            else {
                vscode.window.showErrorMessage('Unable to determine log entry ID for this item.');
                return;
            }
            // Check if this entry type supports markdown export
            if (logEntry.kind === 0 /* LoggedInfoKind.Element */) {
                vscode.window.showWarningMessage('Element entries cannot be exported as markdown. They contain HTML content that can be viewed in the browser.');
                return;
            }
            // Generate a default filename based on the entry type and id
            let defaultFilename;
            switch (logEntry.kind) {
                case 1 /* LoggedInfoKind.Request */: {
                    const requestEntry = logEntry;
                    const debugName = requestEntry.entry.debugName.replace(/\W/g, '_');
                    defaultFilename = `${debugName}_${logEntry.id}.copilotmd`;
                    break;
                }
                case 2 /* LoggedInfoKind.ToolCall */: {
                    const toolEntry = logEntry;
                    const toolName = toolEntry.name.replace(/\W/g, '_');
                    defaultFilename = `tool_${toolName}_${logEntry.id}.copilotmd`;
                    break;
                }
            }
            if (!defaultFilename) {
                return;
            }
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultFilename)),
                filters: {
                    'Copilot Markdown': ['copilotmd'],
                    'Markdown': ['md'],
                    'All Files': ['*']
                },
                title: 'Export Log Entry'
            });
            if (!saveUri) {
                return; // User cancelled
            }
            try {
                // Get the content using the virtual document URI
                const virtualUri = vscode.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: logEntry.id }));
                const document = await vscode.workspace.openTextDocument(virtualUri);
                const content = document.getText();
                // Write to the selected file
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
                // Show success message with option to open the file
                const openAction = 'Open File';
                const result = await vscode.window.showInformationMessage(`Successfully exported to ${saveUri.fsPath}`, openAction);
                if (result === openAction) {
                    await vscode.commands.executeCommand('vscode.open', saveUri);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export log entry: ${error}`);
            }
        }));
        // Save the currently opened chat log (ccreq:*.copilotmd) to a file
        this._register(vscode.commands.registerCommand(saveCurrentMarkdownCommand, async (...args) => {
            // Accept resource from menu invocation (editor/title passes the resource)
            let resource;
            const first = args?.[0];
            if (first instanceof vscode.Uri) {
                resource = first;
            }
            else if (first && typeof first === 'object') {
                // Some menu invocations pass { resource: Uri }
                const candidate = first.resource;
                if (candidate instanceof vscode.Uri) {
                    resource = candidate;
                }
            }
            // Fallback to the active editor's document
            resource ??= vscode.window.activeTextEditor?.document.uri;
            if (!resource) {
                vscode.window.showWarningMessage('No document is active to save.');
                return;
            }
            if (resource.scheme !== requestLogger_1.ChatRequestScheme.chatRequestScheme) {
                vscode.window.showWarningMessage('This command only works for Copilot request documents.');
                return;
            }
            // Determine a default filename from the virtual URI
            const parseResult = requestLogger_1.ChatRequestScheme.parseUri(resource.toString());
            const defaultBase = parseResult && parseResult.data.kind === 'request' ? parseResult.data.id : 'latestrequest';
            const defaultFilename = `${defaultBase}.md`;
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultFilename)),
                filters: {
                    'Markdown': ['md'],
                    'Copilot Markdown': ['copilotmd'],
                    'All Files': ['*']
                },
                title: 'Save Markdown As'
            });
            if (!saveUri) {
                return; // User cancelled
            }
            try {
                // Read the text from the virtual document URI explicitly
                const doc = await vscode.workspace.openTextDocument(resource);
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(doc.getText(), 'utf8'));
                const openAction = 'Open File';
                const result = await vscode.window.showInformationMessage(`Successfully saved to ${saveUri.fsPath}`, openAction);
                if (result === openAction) {
                    await vscode.commands.executeCommand('vscode.open', saveUri);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to save markdown: ${error}`);
            }
        }));
        this._register(vscode.commands.registerCommand(exportPromptArchiveCommand, async (treeItem) => {
            const logEntries = getExportableLogEntries(treeItem);
            if (logEntries.length === 0) {
                vscode.window.showInformationMessage('No exportable entries found in this prompt.');
                return;
            }
            // Generate a default filename based on the prompt
            const promptText = treeItem.request.prompt.replace(/\W/g, '_').substring(0, 50);
            const defaultFilename = `${promptText}_exports.tar.gz`;
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultFilename)),
                filters: {
                    'Tar Archive': ['tar.gz', 'tgz'],
                    'All Files': ['*']
                },
                title: 'Export Prompt Archive'
            });
            if (!saveUri) {
                return; // User cancelled
            }
            try {
                // Create temporary directory for files
                const tempDir = path.join(os.tmpdir(), `vscode-copilot-export-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`);
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(tempDir));
                const filesToArchive = [];
                // Export each child to a temporary file
                for (const logEntry of logEntries) {
                    // Generate filename for this entry
                    let filename;
                    switch (logEntry.kind) {
                        case 1 /* LoggedInfoKind.Request */: {
                            const requestEntry = logEntry;
                            const debugName = requestEntry.entry.debugName.replace(/\W/g, '_');
                            filename = `${debugName}_${logEntry.id}.copilotmd`;
                            break;
                        }
                        case 2 /* LoggedInfoKind.ToolCall */: {
                            const toolEntry = logEntry;
                            const toolName = toolEntry.name.replace(/\W/g, '_');
                            filename = `tool_${toolName}_${logEntry.id}.copilotmd`;
                            break;
                        }
                        default:
                            continue;
                    }
                    // Get the content and write to temporary file
                    const virtualUri = vscode.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: logEntry.id }));
                    const document = await vscode.workspace.openTextDocument(virtualUri);
                    const content = document.getText();
                    const tempFilePath = path.join(tempDir, filename);
                    await vscode.workspace.fs.writeFile(vscode.Uri.file(tempFilePath), Buffer.from(content, 'utf8'));
                    filesToArchive.push(tempFilePath);
                }
                if (filesToArchive.length > 0) {
                    // Create tar.gz archive
                    await tar.create({
                        gzip: true,
                        file: saveUri.fsPath,
                        cwd: tempDir
                    }, filesToArchive.map(f => path.basename(f)));
                    // Clean up temporary files
                    for (const filePath of filesToArchive) {
                        await vscode.workspace.fs.delete(vscode.Uri.file(filePath));
                    }
                    await vscode.workspace.fs.delete(vscode.Uri.file(tempDir));
                    // Show success message with option to reveal the file
                    const revealAction = 'Reveal in Explorer';
                    const result = await vscode.window.showInformationMessage(`Successfully exported ${filesToArchive.length} entries to ${saveUri.fsPath}`, revealAction);
                    if (result === revealAction) {
                        await vscode.commands.executeCommand('revealFileInOS', saveUri);
                    }
                }
                else {
                    vscode.window.showWarningMessage('No valid entries could be exported.');
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export prompt archive: ${error}`);
            }
        }));
        this._register(vscode.commands.registerCommand(exportPromptLogsAsJsonCommand, async (treeItem) => {
            const promptObject = await preparePromptLogsAsJson(treeItem);
            if (!promptObject) {
                vscode.window.showWarningMessage('No exportable entries found for this prompt.');
                return;
            }
            // Generate a default filename based on the prompt
            const promptText = treeItem.request.prompt.replace(/\W/g, '_').substring(0, 50);
            const defaultFilename = `${promptText}_logs.chatreplay.json`;
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultFilename)),
                filters: {
                    'JSON': ['json'],
                    'All Files': ['*']
                },
                title: 'Export Prompt Logs as JSON'
            });
            if (!saveUri) {
                return; // User cancelled
            }
            try {
                // Convert to JSON
                const finalContent = JSON.stringify(promptObject, null, 2);
                // Write to the selected file
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(finalContent, 'utf8'));
                // Show success message with option to reveal the file
                const revealAction = 'Reveal in Explorer';
                const openAction = 'Open File';
                const result = await vscode.window.showInformationMessage(`Successfully exported prompt with ${promptObject.logCount} log entries to ${saveUri.fsPath}`, revealAction, openAction);
                if (result === revealAction) {
                    await vscode.commands.executeCommand('revealFileInOS', saveUri);
                }
                else if (result === openAction) {
                    await vscode.commands.executeCommand('vscode.open', saveUri);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export prompt logs as JSON: ${error}`);
            }
        }));
        this._register(vscode.commands.registerCommand(exportAllPromptLogsAsJsonCommand, async (savePath) => {
            // Build the tree structure to get all chat prompt items
            const allTreeItems = await this.chatRequestProvider.getChildren();
            if (!allTreeItems || allTreeItems.length === 0) {
                vscode.window.showInformationMessage('No chat prompts found to export.');
                return;
            }
            // Filter to get only ChatPromptItem instances
            const chatPromptItems = allTreeItems.filter((item) => item instanceof ChatPromptItem);
            if (chatPromptItems.length === 0) {
                vscode.window.showInformationMessage('No chat prompts found to export.');
                return;
            }
            let saveUri;
            if (savePath && typeof savePath === 'string') {
                // Use provided path
                saveUri = vscode.Uri.file(savePath);
            }
            else {
                // Generate a default filename based on current timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const defaultFilename = `copilot_all_prompts_${timestamp}.chatreplay.json`;
                // Show save dialog
                const dialogResult = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.file(path.join(os.homedir(), defaultFilename)),
                    filters: {
                        'JSON': ['json'],
                        'All Files': ['*']
                    },
                    title: 'Export All Prompt Logs as JSON'
                });
                if (!dialogResult) {
                    return; // User cancelled
                }
                saveUri = dialogResult;
            }
            try {
                const allPromptsContent = [];
                let totalLogEntries = 0;
                // Process each chat prompt item using the shared function
                for (const chatPromptItem of chatPromptItems) {
                    // Use the shared processing function
                    const promptObject = await preparePromptLogsAsJson(chatPromptItem);
                    if (promptObject) {
                        allPromptsContent.push(promptObject);
                        totalLogEntries += promptObject.logCount;
                    }
                }
                // Combine all content as JSON
                const finalContent = JSON.stringify({
                    exportedAt: new Date().toISOString(),
                    totalPrompts: allPromptsContent.length,
                    totalLogEntries: totalLogEntries,
                    prompts: allPromptsContent
                }, null, 2);
                // Write to the selected file
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(finalContent, 'utf8'));
                // Show success message with option to reveal the file
                const revealAction = 'Reveal in Explorer';
                const openAction = 'Open File';
                const result = await vscode.window.showInformationMessage(`Successfully exported ${allPromptsContent.length} prompts with ${totalLogEntries} log entries to ${saveUri.fsPath}`, revealAction, openAction);
                if (result === revealAction) {
                    await vscode.commands.executeCommand('revealFileInOS', saveUri);
                }
                else if (result === openAction) {
                    await vscode.commands.executeCommand('vscode.open', saveUri);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to export all prompt logs as JSON: ${error}`);
            }
        }));
        this._register(vscode.commands.registerCommand(showRawRequestBodyCommand, async (arg) => {
            const requestId = arg?.id;
            if (!requestId) {
                return;
            }
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: requestId }, 'rawrequest')));
        }));
        this._register(vscode.commands.registerCommand('puku.debug.showOutputChannel', async () => {
            // Yes this is the correct auto-generated command for our output channel
            await vscode.commands.executeCommand(`workbench.action.output.show.GitHub.copilot-chat.${outputChannelLogTarget_1.OutputChannelName}`);
        }));
    }
};
exports.RequestLogTree = RequestLogTree;
exports.RequestLogTree = RequestLogTree = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, requestLogger_1.IRequestLogger)
], RequestLogTree);
/**
 * Servers that shows logged request html for the simple browser. Doing this
 * is annoying, but the markdown renderer is limited and doesn't show full HTML,
 * and the simple browser extension can't render internal or `file://` URIs.
 *
 * Note that we don't need secret tokens or anything at this point because the
 * server is read-only and does not advertise any CORS headers.
 */
class RequestServer extends lifecycle_1.Disposable {
    constructor() {
        super();
        this.routers = new map_1.LRUCache(10);
        const server = (0, http_1.createServer)((req, res) => {
            for (const [key, router] of this.routers) {
                if (router.route(req, res)) {
                    this.routers.get(key); // LRU touch
                    return;
                }
            }
            res.statusCode = 404;
            res.end('Not Found');
        });
        this.port = new Promise((resolve, reject) => {
            server.listen(0, '127.0.0.1', () => resolve(server.address().port)).on('error', reject);
        });
        this._register((0, lifecycle_1.toDisposable)(() => server.close()));
    }
    async addRouter(info) {
        const prev = this.routers.get(info.id);
        if (prev) {
            return prev.address;
        }
        const port = await this.port;
        const router = info.trace.serveRouter(`http://127.0.0.1:${port}`);
        this.routers.set(info.id, router);
        return router.address;
    }
}
let ChatRequestProvider = class ChatRequestProvider extends lifecycle_1.Disposable {
    constructor(requestLogger, instantiationService) {
        super();
        this.requestLogger = requestLogger;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.filters = this._register(instantiationService.createInstance(LogTreeFilters));
        this._register(new LogTreeFilterCommands(this.filters));
        this._register(this.requestLogger.onDidChangeRequests(() => this._onDidChangeTreeData.fire()));
        this._register(this.filters.onDidChangeFilters(() => this._onDidChangeTreeData.fire()));
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (element instanceof ChatPromptItem) {
            return element.children;
        }
        else if (element) {
            return [];
        }
        else {
            let lastPrompt;
            const result = [];
            const seen = new Set();
            for (const r of this.requestLogger.getRequests()) {
                const item = this.logToTreeItem(r);
                if (r.chatRequest !== lastPrompt?.request) {
                    if (lastPrompt) {
                        result.push(lastPrompt);
                    }
                    lastPrompt = r.chatRequest ? ChatPromptItem.create(r, r.chatRequest, seen.has(r.chatRequest)) : undefined;
                    seen.add(r.chatRequest);
                }
                if (lastPrompt) {
                    if (!lastPrompt.children.find(c => c.id === item.id)) {
                        lastPrompt.children.push(item);
                    }
                    if (!lastPrompt.children.find(c => c.id === item.id)) {
                        lastPrompt.children.push(item);
                    }
                }
                else {
                    result.push(item);
                }
            }
            if (lastPrompt) {
                result.push(lastPrompt);
            }
            return result.map(r => {
                if (r instanceof ChatPromptItem) {
                    return r.withFilteredChildren(child => this.filters.itemIncluded(child));
                }
                return r;
            })
                .filter(r => this.filters.itemIncluded(r));
        }
    }
    logToTreeItem(r) {
        switch (r.kind) {
            case 1 /* LoggedInfoKind.Request */:
                return new ChatRequestItem(r);
            case 0 /* LoggedInfoKind.Element */:
                return new ChatElementItem(r);
            case 2 /* LoggedInfoKind.ToolCall */:
                return new ToolCallItem(r);
            default:
                (0, assert_1.assertNever)(r);
        }
    }
};
ChatRequestProvider = __decorate([
    __param(0, requestLogger_1.IRequestLogger),
    __param(1, instantiation_1.IInstantiationService)
], ChatRequestProvider);
class ChatPromptItem extends vscode.TreeItem {
    static { this.ids = new WeakMap(); }
    static create(info, request, hasSeen) {
        const existing = ChatPromptItem.ids.get(info);
        if (existing) {
            return existing;
        }
        const item = new ChatPromptItem(request, hasSeen);
        item.id = info.id + '-prompt';
        ChatPromptItem.ids.set(info, item);
        return item;
    }
    constructor(request, hasSeen) {
        super(request.prompt, vscode.TreeItemCollapsibleState.Expanded);
        this.request = request;
        this.hasSeen = hasSeen;
        this.contextValue = 'chatprompt';
        this.children = [];
        this.iconPath = new vscode.ThemeIcon('comment');
        if (hasSeen) {
            this.description = '(Continued...)';
        }
    }
    withFilteredChildren(filter) {
        const item = new ChatPromptItem(this.request, this.hasSeen);
        item.children = this.children.filter(filter);
        return item;
    }
}
class ToolCallItem extends vscode.TreeItem {
    constructor(info) {
        // todo@connor4312: we should have flags from the renderer whether it dropped any messages and indicate that here
        super(info.name, vscode.TreeItemCollapsibleState.None);
        this.info = info;
        this.contextValue = 'toolcall';
        this.id = `${info.id}_${info.time}`;
        this.description = info.args === undefined ? '' : typeof info.args === 'string' ? info.args : JSON.stringify(info.args);
        this.command = {
            command: 'vscode.open',
            title: '',
            arguments: [vscode.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: info.id }))]
        };
        this.iconPath = new vscode.ThemeIcon('tools');
    }
}
class ChatElementItem extends vscode.TreeItem {
    constructor(info) {
        // todo@connor4312: we should have flags from the renderer whether it dropped any messages and indicate that here
        super(`<${info.name}/>`, vscode.TreeItemCollapsibleState.None);
        this.info = info;
        this.id = info.id;
        this.description = `${info.tokens} tokens`;
        this.command = { command: showHtmlCommand, title: '', arguments: [info.id] };
        this.iconPath = new vscode.ThemeIcon('code');
    }
}
class ChatRequestItem extends vscode.TreeItem {
    constructor(info) {
        super(info.entry.debugName, vscode.TreeItemCollapsibleState.None);
        this.info = info;
        this.contextValue = 'request';
        this.id = info.id;
        if (info.entry.type === "MarkdownContentRequest" /* LoggedRequestKind.MarkdownContentRequest */) {
            this.iconPath = info.entry.icon === undefined ? undefined : new vscode.ThemeIcon(info.entry.icon.id);
            const startTimeStr = new Date(info.entry.startTimeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.description = startTimeStr;
        }
        else {
            const durationMs = info.entry.endTime.getTime() - info.entry.startTime.getTime();
            const timeStr = `${durationMs.toLocaleString('en-US')}ms`;
            const startTimeStr = info.entry.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const tokensStr = info.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ && info.entry.usage ? `${info.entry.usage.prompt_tokens.toLocaleString('en-US')}tks` : '';
            const tokensStrPart = tokensStr ? `[${tokensStr}] ` : '';
            this.description = `${tokensStrPart}[${timeStr}] [${startTimeStr}]`;
            this.iconPath = info.entry.type === "ChatMLSuccess" /* LoggedRequestKind.ChatMLSuccess */ ? undefined : new vscode.ThemeIcon('error');
            this.tooltip = `${info.entry.type === "ChatMLCancelation" /* LoggedRequestKind.ChatMLCancelation */ ? 'cancelled' : info.entry.result.type}
	${info.entry.chatEndpoint.model}
	${timeStr}
	${startTimeStr}`;
            if (tokensStr) {
                this.tooltip += `\n\t${tokensStr}`;
            }
        }
        this.command = {
            command: 'vscode.open',
            title: '',
            arguments: [vscode.Uri.parse(requestLogger_1.ChatRequestScheme.buildUri({ kind: 'request', id: info.id }))]
        };
        this.iconPath ??= new vscode.ThemeIcon('copilot');
    }
}
let LogTreeFilters = class LogTreeFilters extends lifecycle_1.Disposable {
    constructor(vscodeExtensionContext) {
        super();
        this.vscodeExtensionContext = vscodeExtensionContext;
        this._elementsShown = true;
        this._toolsShown = true;
        this._nesRequestsShown = true;
        this._onDidChangeFilters = new vscode.EventEmitter();
        this.onDidChangeFilters = this._onDidChangeFilters.event;
        this.setElementsShown(!vscodeExtensionContext.workspaceState.get(this.getStorageKey('elements')));
        this.setToolsShown(!vscodeExtensionContext.workspaceState.get(this.getStorageKey('tools')));
        this.setNesRequestsShown(!vscodeExtensionContext.workspaceState.get(this.getStorageKey('nesRequests')));
    }
    getStorageKey(name) {
        return `puku.chat.debug.${name}Hidden`;
    }
    setElementsShown(value) {
        this._elementsShown = value;
        this.setShown('elements', this._elementsShown);
    }
    setToolsShown(value) {
        this._toolsShown = value;
        this.setShown('tools', this._toolsShown);
    }
    setNesRequestsShown(value) {
        this._nesRequestsShown = value;
        this.setShown('nesRequests', this._nesRequestsShown);
    }
    itemIncluded(item) {
        if (item instanceof ChatPromptItem) {
            return true; // Always show chat prompt items
        }
        else if (item instanceof ChatElementItem) {
            return this._elementsShown;
        }
        else if (item instanceof ToolCallItem) {
            return this._toolsShown;
        }
        else if (item instanceof ChatRequestItem) {
            // Check if this is a NES request
            if (this.isNesRequest(item)) {
                return this._nesRequestsShown;
            }
        }
        return true;
    }
    isNesRequest(item) {
        const debugName = item.info.entry.debugName.toLowerCase();
        return debugName.startsWith('nes |') || debugName === 'xtabprovider' || debugName.startsWith('nes.');
    }
    setShown(name, value) {
        vscode.commands.executeCommand('setContext', `puku.chat.debug.${name}Hidden`, !value);
        this.vscodeExtensionContext.workspaceState.update(this.getStorageKey(name), !value);
        this._onDidChangeFilters.fire();
    }
};
LogTreeFilters = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext)
], LogTreeFilters);
class LogTreeFilterCommands extends lifecycle_1.Disposable {
    constructor(filters) {
        super();
        this._register(vscode.commands.registerCommand('puku.chat.debug.showElements', () => filters.setElementsShown(true)));
        this._register(vscode.commands.registerCommand('puku.chat.debug.hideElements', () => filters.setElementsShown(false)));
        this._register(vscode.commands.registerCommand('puku.chat.debug.showTools', () => filters.setToolsShown(true)));
        this._register(vscode.commands.registerCommand('puku.chat.debug.hideTools', () => filters.setToolsShown(false)));
        this._register(vscode.commands.registerCommand('puku.chat.debug.showNesRequests', () => filters.setNesRequestsShown(true)));
        this._register(vscode.commands.registerCommand('puku.chat.debug.hideNesRequests', () => filters.setNesRequestsShown(false)));
    }
}
//# sourceMappingURL=requestLogTree.js.map