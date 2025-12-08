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
exports.CopilotFileScheme = exports.GithubWorkspaceScheme = exports.CopilotWorkspaceScheme = exports.NewWorkspaceIntentInvocation = exports.NewWorkspaceIntent = exports.newId = exports.NewWorkspaceCopilotContentManager = exports.NewWorkspacePreviewContentManagerImpl = exports.OpenFileCommand = exports.CreateFileCommand = exports.CreateProjectCommand = exports.INewWorkspacePreviewContentManager = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const jsonc_parser_1 = require("jsonc-parser");
const commonTypes_1 = require("../../../platform/chat/common/commonTypes");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileTypes_1 = require("../../../platform/filesystem/common/fileTypes");
const githubService_1 = require("../../../platform/github/common/githubService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../util/common/markdown");
const services_1 = require("../../../util/common/services");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const path = __importStar(require("../../../util/vs/base/common/path"));
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const commands_1 = require("../../linkify/common/commands");
const fileTreeParser_1 = require("../../prompt/common/fileTreeParser");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const newWorkspace_1 = require("../../prompts/node/panel/newWorkspace/newWorkspace");
const generateNewWorkspaceContent_1 = require("./generateNewWorkspaceContent");
exports.INewWorkspacePreviewContentManager = (0, services_1.createServiceIdentifier)('INewWorkspacePreviewContentManager');
exports.CreateProjectCommand = 'puku.createProject';
exports.CreateFileCommand = 'puku.createFile';
exports.OpenFileCommand = 'puku.openFile';
let NewWorkspacePreviewContentManagerImpl = class NewWorkspacePreviewContentManagerImpl {
    constructor(instantiationService) {
        this.responseScopedData = new Map();
        this.prevFileContents = new Map();
        this.copilotContentManager = instantiationService.createInstance(NewWorkspaceCopilotContentManager);
        this.githubContentManager = instantiationService.createInstance(NewWorkspaceGitHubContentManager);
        this.fileContentManager = new NewWorkspaceFileContentManager();
    }
    set(responseId, projectName, fileTree, serviceArgs) {
        this.responseScopedData.set(responseId, fileTree);
        if (isGithubWorkspaceUri(fileTree.baseUri)) {
            this.githubContentManager.set(responseId, projectName, fileTree, serviceArgs);
        }
        else if (isCopiltoFileWorkspaceUri(fileTree.baseUri)) {
            this.fileContentManager.set(responseId, projectName, fileTree, serviceArgs);
        }
        else {
            this.copilotContentManager.set(responseId, projectName, fileTree, serviceArgs);
        }
    }
    get(uri) {
        if (this.prevResponseId !== uri.authority) {
            this.prevFileContents.clear();
            this.prevResponseId = uri.authority;
        }
        let fileContents;
        if (isGithubWorkspaceUri(uri)) {
            fileContents = this.githubContentManager.get(uri.authority, uri.path);
        }
        else if (isCopiltoFileWorkspaceUri(uri)) {
            fileContents = this.fileContentManager.get(uri.authority, uri.path);
        }
        else {
            fileContents = this.copilotContentManager.get(uri.authority, uri.path, this.prevFileContents);
        }
        fileContents?.content?.then((content) => {
            if (this.prevFileContents.has(uri.path)) {
                return;
            }
            const decoder = new TextDecoder();
            const fileContentStr = decoder.decode(content);
            this.prevFileContents.set(uri.path, fileContentStr);
        });
        return fileContents;
    }
    getFileTree(responseId) {
        return this.responseScopedData.get(responseId);
    }
};
exports.NewWorkspacePreviewContentManagerImpl = NewWorkspacePreviewContentManagerImpl;
exports.NewWorkspacePreviewContentManagerImpl = NewWorkspacePreviewContentManagerImpl = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], NewWorkspacePreviewContentManagerImpl);
let NewWorkspaceCopilotContentManager = class NewWorkspaceCopilotContentManager {
    constructor(instantiationService) {
        this.instantiationService = instantiationService;
        this.promises = [];
        this.responseScopedData = new Map();
        this.generatePlanPrompt = this.instantiationService.createInstance(generateNewWorkspaceContent_1.ProjectSpecificationGenerator);
        this.generateFilePrompt = this.instantiationService.createInstance(generateNewWorkspaceContent_1.FileContentsGenerator);
    }
    // TODO@joyceerhl persistence between reloads
    set(responseId, projectName, fileTree, serviceArgs) {
        const { userPrompt, projectStructure, chatMessages } = serviceArgs;
        const promptArgs = {
            query: userPrompt,
            fileTreeStr: projectStructure,
            history: chatMessages
        };
        const projectSpecificationPromise = this.generatePlanPrompt.generate(promptArgs, cancellation_1.CancellationToken.None);
        this.promises.push(projectSpecificationPromise);
        const sessionScopedData = this._getResponseScopedData(responseId);
        const projectData = { userPrompt, projectSpecification: projectSpecificationPromise, projectStructure, fileTree: fileTree, chatMessages };
        sessionScopedData.set(projectName, projectData);
    }
    get(responseId, path, prevFileContents) {
        const { projectName, path: relativePath } = this._getProjectMetadata(path);
        const responseScopedData = this._getResponseScopedData(responseId);
        const data = responseScopedData.get(projectName);
        if (!data) {
            return;
        }
        const fileNodes = data.fileTree.value;
        const currentNode = findMatchingNodeFromPath(fileNodes, relativePath);
        if (currentNode && !currentNode?.content) {
            const nodeWithMissingContent = currentNode;
            nodeWithMissingContent.content = this._getFileContent(data.userPrompt, data.projectStructure, data.projectSpecification, path, data.chatMessages, prevFileContents).catch(() => nodeWithMissingContent.content = undefined);
        }
        return currentNode;
    }
    _prefetch(userPrompt, projectStructure, projectSpecification, fileTree, chatMessages) {
        const ctime = Date.now();
        if (fileTree.children) {
            return { ...fileTree, type: fileTypes_1.FileType.Directory, children: fileTree.children.map((child) => this._prefetch(userPrompt, projectStructure, projectSpecification, child, chatMessages)), ctime };
        }
        // Disable prefetching for now
        // node.content = this._getFileContent(userPrompt, projectStructure, projectSpecification, fileTreeData.uri.path, chatMessages).catch(() => node.content = undefined);
        return { ...fileTree, type: fileTypes_1.FileType.File, content: undefined, ctime };
    }
    async _getFileContent(projectDescription, projectStructure, projectSpecPromise, filePath, chatMessages, prevFileContents) {
        const promptArgs = {
            query: projectDescription,
            fileTreeStr: projectStructure,
            filePath: filePath,
            projectSpecification: await projectSpecPromise,
            history: chatMessages,
            relavantFiles: prevFileContents.has(filePath) ? new Map([[filePath, prevFileContents.get(filePath)]]) : undefined
        };
        return this.generateFilePrompt.generate(promptArgs, cancellation_1.CancellationToken.None).then((response) => Buffer.from(response));
    }
    _getResponseScopedData(responseId) {
        let responseScopedData = this.responseScopedData.get(responseId);
        if (!responseScopedData) {
            responseScopedData = new Map();
            this.responseScopedData.set(responseId, responseScopedData);
        }
        return responseScopedData;
    }
    _getProjectMetadata(fullPath) {
        // Format: vscode-copilot-workspace://<sessionId>/<projectName>/<filePath>
        const [, projectName, ...path] = fullPath.split('/');
        return { projectName, path };
    }
};
exports.NewWorkspaceCopilotContentManager = NewWorkspaceCopilotContentManager;
exports.NewWorkspaceCopilotContentManager = NewWorkspaceCopilotContentManager = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], NewWorkspaceCopilotContentManager);
let NewWorkspaceGitHubContentManager = class NewWorkspaceGitHubContentManager {
    constructor(repositoryService) {
        this.repositoryService = repositoryService;
        this.responseScopedData = new Map();
    }
    set(responseId, projectName, fileTree, serviceArgs) {
        const githubContentMetadata = serviceArgs;
        const sessionScopedData = this._getResponseScopedData(responseId);
        const githubData = { ...githubContentMetadata, fileTree };
        sessionScopedData.set(projectName, githubData);
    }
    get(responseId, filePath) {
        const { projectName, path: relativePath } = this._getProjectMetadata(filePath);
        const responseScopedData = this._getResponseScopedData(responseId);
        const rootNode = responseScopedData.get(projectName);
        if (!rootNode) {
            return;
        }
        const fileNodes = rootNode.fileTree.value;
        const currentNode = findMatchingNodeFromPath(fileNodes, relativePath);
        if (currentNode && !currentNode?.content && !currentNode?.children) {
            const nodeWithMissingContent = currentNode;
            const folderPath = rootNode.path === '.' ? path.posix.relative(rootNode.repo, filePath) : path.posix.relative(rootNode.path, filePath.slice(1));
            nodeWithMissingContent.content = this.repositoryService.getRepositoryItemContent(rootNode.org, rootNode.repo, folderPath).catch(() => nodeWithMissingContent.content = undefined);
        }
        return currentNode;
    }
    _getProjectMetadata(fullPath) {
        // Format: vscode-copilot-github-workspace://<sessionId>/<projectName>/<filePath>
        const [, projectName, ...path] = fullPath.split('/');
        return { projectName, path };
    }
    _getResponseScopedData(responseId) {
        let responseScopedData = this.responseScopedData.get(responseId);
        if (!responseScopedData) {
            responseScopedData = new Map();
            this.responseScopedData.set(responseId, responseScopedData);
        }
        return responseScopedData;
    }
};
NewWorkspaceGitHubContentManager = __decorate([
    __param(0, githubService_1.IGithubRepositoryService)
], NewWorkspaceGitHubContentManager);
class NewWorkspaceFileContentManager {
    constructor() {
        this.responseScopedData = new Map();
    }
    set(responseId, projectName, fileTree, serviceArgs) {
        const fileContents = serviceArgs;
        const sessionScopedData = this._getResponseScopedData(responseId);
        const fileContentData = { content: fileContents, fileTree };
        sessionScopedData.set(projectName, fileContentData);
    }
    get(responseId, filePath) {
        const { projectName, path: relativePath } = this._getFileMetadata(filePath);
        const responseScopedData = this._getResponseScopedData(responseId);
        const rootNode = responseScopedData.get(projectName);
        if (!rootNode) {
            return;
        }
        const fileNodes = rootNode.fileTree.value;
        const currentNode = findMatchingNodeFromPath(fileNodes, relativePath);
        if (currentNode && !currentNode?.content && !currentNode?.children) {
            currentNode.content = Promise.resolve(new Uint8Array(new TextEncoder().encode(rootNode.content)));
        }
        return currentNode;
    }
    _getFileMetadata(fullPath) {
        // Format: vscode-copilot-file://<sessionId>/<projectName>/<filePath>
        const [, projectName, ...path] = fullPath.split('/');
        return { projectName, path };
    }
    _getResponseScopedData(responseId) {
        let responseScopedData = this.responseScopedData.get(responseId);
        if (!responseScopedData) {
            responseScopedData = new Map();
            this.responseScopedData.set(responseId, responseScopedData);
        }
        return responseScopedData;
    }
}
function findMatchingNodeFromPath(fileTree, pathElements) {
    let currentNode = undefined;
    for (const element of pathElements) {
        if (currentNode) {
            if (currentNode.children) {
                currentNode = currentNode.children.find(node => node.name === element) ?? currentNode;
            }
        }
        else {
            currentNode = fileTree.find(node => node.name === element);
        }
    }
    return currentNode;
}
exports.newId = 'new';
let NewWorkspaceIntent = class NewWorkspaceIntent {
    static { this.ID = "new" /* Intent.New */; }
    constructor(endpointProvider, instantiationService) {
        this.endpointProvider = endpointProvider;
        this.instantiationService = instantiationService;
        this.id = "new" /* Intent.New */;
        this.locations = [commonTypes_1.ChatLocation.Panel];
        this.description = l10n.t('Scaffold code for a new file or project in a workspace');
        this.commandInfo = {
            allowsEmptyArgs: false,
            defaultEnablement: true,
        };
    }
    async invoke(invocationContext) {
        const location = invocationContext.location;
        const endpoint = await this.endpointProvider.getChatEndpoint(invocationContext.request);
        return this.instantiationService.createInstance(NewWorkspaceIntentInvocation, this, endpoint, location);
    }
};
exports.NewWorkspaceIntent = NewWorkspaceIntent;
exports.NewWorkspaceIntent = NewWorkspaceIntent = __decorate([
    __param(0, endpointProvider_1.IEndpointProvider),
    __param(1, instantiation_1.IInstantiationService)
], NewWorkspaceIntent);
function createProjectCommand(fileTree, workspaceRoot) {
    return {
        command: exports.CreateProjectCommand,
        arguments: [fileTree, workspaceRoot],
        title: l10n.t('Create Workspace...'),
    };
}
function createFileCommand(fileTree) {
    return {
        command: exports.CreateFileCommand,
        arguments: [fileTree],
        title: l10n.t('Create File...'),
    };
}
let NewWorkspaceIntentInvocation = class NewWorkspaceIntentInvocation {
    constructor(intent, endpoint, location, instantiationService, configurationService, newWorkspacePreviewContentManager, workspaceService) {
        this.intent = intent;
        this.endpoint = endpoint;
        this.location = location;
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.newWorkspacePreviewContentManager = newWorkspacePreviewContentManager;
        this.workspaceService = workspaceService;
        this.linkification = { disable: true };
    }
    async getShouldUseProjectTemplate() {
        const useProjectTemplates = this.configurationService.getConfig(configurationService_1.ConfigKey.UseProjectTemplates);
        if (useProjectTemplates !== undefined) {
            return useProjectTemplates;
        }
        return false;
    }
    async buildPrompt(promptContext, progress, token) {
        // TODO: @bhavyaus enable using project templates with variables
        const { query, history, chatVariables } = promptContext;
        const useTemplates = !chatVariables.hasVariables() && history[history.length - 1]?.request?.message !== query && await this.getShouldUseProjectTemplate();
        const renderer = promptRenderer_1.PromptRenderer.create(this.instantiationService, this.endpoint, newWorkspace_1.NewWorkspacePrompt, {
            promptContext,
            useTemplates: useTemplates,
            endpoint: this.endpoint,
        });
        const result = await renderer.render(progress, token);
        const metadata = result.metadata.get(newWorkspace_1.NewWorkspaceGithubContentMetadata);
        if (metadata) {
            this.githubContentMetadata = metadata;
        }
        return result;
    }
    processResponse(context, inputStream, outputStream, token) {
        const responseProcessor = new NewWorkspaceResponseProcessor(this.newWorkspacePreviewContentManager, this.workspaceService, this.githubContentMetadata);
        return responseProcessor.processResponse(context, inputStream, outputStream, token);
    }
};
exports.NewWorkspaceIntentInvocation = NewWorkspaceIntentInvocation;
exports.NewWorkspaceIntentInvocation = NewWorkspaceIntentInvocation = __decorate([
    __param(3, instantiation_1.IInstantiationService),
    __param(4, configurationService_1.IConfigurationService),
    __param(5, exports.INewWorkspacePreviewContentManager),
    __param(6, workspaceService_1.IWorkspaceService)
], NewWorkspaceIntentInvocation);
function convertGitHubItemsToChatResponseFileTree(items, baseUri, isRepoRoot) {
    let paths;
    if (isRepoRoot) {
        paths = items.map(item => [baseUri.path, item.path].join('/'));
    }
    else {
        paths = items.map(item => item.path);
    }
    const rootName = paths[0].split('/')[0];
    const root = { name: rootName, children: [] };
    const result = { rootName: root };
    for (const path of paths) {
        const pathParts = path.split('/');
        let currentPath = rootName;
        let currentNode = root;
        for (let i = 1; i < pathParts.length; i++) {
            const pathPart = pathParts[i];
            currentPath += `/${pathPart}`;
            if (!result[currentPath]) {
                const newNode = { name: pathPart };
                if (currentNode.children === undefined) {
                    currentNode.children = [];
                }
                currentNode.children.push(newNode);
                result[currentPath] = newNode;
            }
            currentNode = result[currentPath];
        }
    }
    let baseTree;
    if (isRepoRoot) {
        baseTree = root.children?.[0].children ?? [];
    }
    else {
        baseTree = root.children ?? [];
    }
    const sortedTree = baseTree?.sort((a, b) => (a.children && !b.children) ? -1 : 1) ?? [];
    return new vscodeTypes_1.ChatResponseFileTreePart([{ name: rootName, children: sortedTree }], baseUri);
}
exports.CopilotWorkspaceScheme = 'vscode-copilot-workspace';
exports.GithubWorkspaceScheme = 'vscode-copilot-github-workspace';
exports.CopilotFileScheme = 'vscode-copilot-file';
function getNewPreviewUri(requestId, filePath, isGithubRepo = false) {
    return vscodeTypes_1.Uri.from({
        scheme: isGithubRepo ? exports.GithubWorkspaceScheme : exports.CopilotWorkspaceScheme,
        authority: requestId ?? '',
        path: filePath ? `/${filePath}` : undefined
    });
}
class NewWorkspaceResponseProcessor {
    constructor(newWorkspacePreviewContentManager, workspaceService, githubContentMetadata) {
        this.newWorkspacePreviewContentManager = newWorkspacePreviewContentManager;
        this.workspaceService = workspaceService;
        this.githubContentMetadata = githubContentMetadata;
        this._appliedText = '';
        this._p = Promise.resolve('');
    }
    async processResponse(context, inputStream, outputStream, token) {
        const { turn, messages } = context;
        let isBufferingFileTree = false;
        let projectStructure = '';
        const fileTreeStartRegex = /```filetree\n/;
        const chatMessages = messages.filter(message => message.role !== prompt_tsx_1.Raw.ChatRole.System); // Exclude system messages as we want to use a different identity for the additional prompts we run
        let hasReportingStarted = false;
        for await (const { delta } of inputStream) {
            if (token.isCancellationRequested) {
                break;
            }
            const incomingText = delta.text;
            this._p = this._p.then(async () => {
                const requestId = turn.id;
                if (!incomingText) {
                    return this._appliedText;
                }
                this._appliedText += incomingText;
                if (!this._appliedText.startsWith('#')) {
                    const userPrompt = turn.request.message;
                    const hasWholeCodeBlock = this._appliedText.match(/```filetree\n([\s\S]+?)\n```/);
                    if (hasWholeCodeBlock && (isBufferingFileTree || !hasReportingStarted)) {
                        isBufferingFileTree = false;
                        const [before, after] = this._appliedText.split(hasWholeCodeBlock[0]);
                        if (!hasReportingStarted) {
                            // We have the whole codeblock but we haven't started reporting yet.
                            // This only happens in test when the entire response is in the incomingText.
                            outputStream.markdown(before);
                        }
                        projectStructure = hasWholeCodeBlock[1];
                        const { chatResponseTree, projectName } = (0, fileTreeParser_1.convertFileTreeToChatResponseFileTree)(projectStructure, fp => getNewPreviewUri(requestId, fp));
                        outputStream.progress(l10n.t('Generating workspace preview...'));
                        outputStream.push(chatResponseTree);
                        outputStream.markdown(after);
                        this.newWorkspacePreviewContentManager.set(requestId, projectName, chatResponseTree, { userPrompt, projectStructure, chatMessages });
                    }
                    else if ((this._appliedText.match(fileTreeStartRegex)) && !isBufferingFileTree && !hasWholeCodeBlock) {
                        isBufferingFileTree = true;
                        const [_, after] = this._appliedText.split(fileTreeStartRegex);
                        projectStructure += after;
                        outputStream.progress(l10n.t('Generating workspace preview...'));
                    }
                    else if (isBufferingFileTree) {
                        projectStructure += incomingText;
                    }
                    else if (!isBufferingFileTree && (!this._appliedText.match(/```/))) {
                        hasReportingStarted = true;
                        outputStream.markdown(incomingText);
                    }
                }
                else if (/(?:.*\n){1,}/.test(this._appliedText)) {
                    outputStream.markdown(incomingText);
                }
                return this._appliedText;
            });
        }
        await this._p;
        if (turn.id &&
            this.githubContentMetadata &&
            this.githubContentMetadata.org &&
            this.githubContentMetadata.repo &&
            this.githubContentMetadata.path &&
            this.githubContentMetadata.githubRepoItems &&
            !this.newWorkspacePreviewContentManager.getFileTree(turn.id)) {
            outputStream.reference(vscodeTypes_1.Uri.parse(this.githubContentMetadata.githubRepoItems[0].html_url));
            outputStream.progress(l10n.t('Generating workspace preview...'));
            const isRepoRoot = this.githubContentMetadata.path === '.';
            const projectName = isRepoRoot ? this.githubContentMetadata.repo : this.githubContentMetadata.path.split('/')[0];
            const chatResponseTree = convertGitHubItemsToChatResponseFileTree(this.githubContentMetadata.githubRepoItems, getNewPreviewUri(turn.id, projectName, true), isRepoRoot);
            outputStream.push(chatResponseTree);
            const workspaceFolders = this.workspaceService.getWorkspaceFolders();
            outputStream.button(createProjectCommand(chatResponseTree, workspaceFolders.length > 0 ? workspaceFolders[0] : undefined));
            this.newWorkspacePreviewContentManager.set(turn.id, projectName, chatResponseTree, this.githubContentMetadata);
            const query = encodeURIComponent(`["@workspace /${exports.newId} ${turn.request.message}"]`);
            const markdownString = new vscodeTypes_1.MarkdownString(l10n.t(`Hint: You can [regenerate this project without using this sample](command:workbench.action.chat.open?{0}) or use this [setting](command:workbench.action.openSettings?%5B%22puku.chat.useProjectTemplates%22%5D) to configure the behavior.`, query));
            markdownString.isTrusted = { enabledCommands: ['workbench.action.openSettings', 'workbench.action.chat.open'] };
            outputStream.markdown(markdownString);
        }
        else {
            const fileContentGeneration = (0, markdown_1.extractCodeBlocks)(this._appliedText);
            if (fileContentGeneration.length === 2) {
                let fileName;
                try {
                    fileName = (0, jsonc_parser_1.parse)(fileContentGeneration[1].code);
                }
                catch (e) {
                    throw e;
                }
                const baseUri = vscodeTypes_1.Uri.from({
                    scheme: exports.CopilotFileScheme,
                    authority: turn.id,
                    path: `/${fileName.fileName}`
                });
                const fileTree = new vscodeTypes_1.ChatResponseFileTreePart([{ name: `${fileName.fileName}` }], baseUri);
                const commandstr = (0, commands_1.commandUri)(exports.OpenFileCommand, [fileTree]);
                const markdownString = new vscodeTypes_1.MarkdownString(`[${fileName.fileName}](${commandstr})`);
                markdownString.isTrusted = { enabledCommands: [exports.OpenFileCommand] };
                outputStream.markdown(l10n.t('Sure, here is the file you requested:'));
                outputStream.markdown(markdownString);
                this.newWorkspacePreviewContentManager.set(turn.id, fileName.fileName, fileTree, fileContentGeneration[0].code);
            }
        }
        this.pushCommands(turn.id, outputStream);
    }
    pushCommands(turnRequestId, outputStream) {
        // Extract the Repo structure here
        const fileTree = this.newWorkspacePreviewContentManager.getFileTree(turnRequestId);
        if (!fileTree) {
            return;
        }
        if (isGithubWorkspaceUri(fileTree.baseUri)) {
            return;
        }
        else if (isCopiltoFileWorkspaceUri(fileTree.baseUri)) {
            outputStream.button(createFileCommand(fileTree));
            return;
        }
        const workspaceFolders = this.workspaceService.getWorkspaceFolders();
        outputStream.button(createProjectCommand(fileTree, workspaceFolders.length > 0 ? workspaceFolders[0] : undefined));
    }
}
function isGithubWorkspaceUri(uri) {
    return uri.scheme === exports.GithubWorkspaceScheme;
}
function isCopiltoFileWorkspaceUri(uri) {
    return uri.scheme === exports.CopilotFileScheme;
}
//# sourceMappingURL=newIntent.js.map