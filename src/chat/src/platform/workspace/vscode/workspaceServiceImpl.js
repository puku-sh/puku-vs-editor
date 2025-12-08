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
exports.ExtensionTextDocumentManager = void 0;
const vscode_1 = require("vscode");
const notebooks_1 = require("../../../util/common/notebooks");
const logService_1 = require("../../log/common/logService");
const utils_1 = require("../../remoteRepositories/common/utils");
const remoteRepositories_1 = require("../../remoteRepositories/vscode/remoteRepositories");
const workspaceService_1 = require("../common/workspaceService");
let ExtensionTextDocumentManager = class ExtensionTextDocumentManager extends workspaceService_1.AbstractWorkspaceService {
    constructor(_logService, _remoteRepositoriesService) {
        super();
        this._logService = _logService;
        this._remoteRepositoriesService = _remoteRepositoriesService;
        this.onDidOpenTextDocument = vscode_1.workspace.onDidOpenTextDocument;
        this.onDidChangeTextDocument = vscode_1.workspace.onDidChangeTextDocument;
        this.onDidOpenNotebookDocument = vscode_1.workspace.onDidOpenNotebookDocument;
        this.onDidCloseNotebookDocument = vscode_1.workspace.onDidCloseNotebookDocument;
        this.onDidCloseTextDocument = vscode_1.workspace.onDidCloseTextDocument;
        this.onDidChangeWorkspaceFolders = vscode_1.workspace.onDidChangeWorkspaceFolders;
        this.onDidChangeNotebookDocument = vscode_1.workspace.onDidChangeNotebookDocument;
        this.onDidChangeTextEditorSelection = vscode_1.window.onDidChangeTextEditorSelection;
    }
    get textDocuments() {
        return vscode_1.workspace.textDocuments;
    }
    async openTextDocument(uri) {
        return await vscode_1.workspace.openTextDocument(uri);
    }
    get fs() {
        return vscode_1.workspace.fs;
    }
    async showTextDocument(document) {
        await vscode_1.window.showTextDocument(document);
    }
    async openNotebookDocument(arg1, arg2) {
        if (typeof arg1 === 'string') {
            // Handle the overload for notebookType and content
            return await vscode_1.workspace.openNotebookDocument(arg1, arg2);
        }
        else {
            // Handle the overload for Uri
            // Possible we have an untitled file opened as a notebook.
            return (0, notebooks_1.findNotebook)(arg1, vscode_1.workspace.notebookDocuments) || await vscode_1.workspace.openNotebookDocument(arg1);
        }
    }
    get notebookDocuments() {
        return vscode_1.workspace.notebookDocuments;
    }
    getWorkspaceFolders() {
        return vscode_1.workspace.workspaceFolders?.map(f => f.uri) ?? [];
    }
    getWorkspaceFolderName(workspaceFolderUri) {
        const workspaceFolder = vscode_1.workspace.getWorkspaceFolder(workspaceFolderUri);
        if (workspaceFolder) {
            return workspaceFolder.name;
        }
        return '';
    }
    asRelativePath(pathOrUri, includeWorkspaceFolder) {
        return vscode_1.workspace.asRelativePath(pathOrUri, includeWorkspaceFolder);
    }
    applyEdit(edit) {
        return vscode_1.workspace.applyEdit(edit);
    }
    // NOTE: I don't think it's possible to have a multi-root workspace with virtual workspaces
    // so we shouldn't need to handle when the workspace folders change... but something to be
    // aware of if we ever do support multi-root workspaces
    ensureWorkspaceIsFullyLoaded() {
        this._fullyLoadedPromise ??= (async () => {
            for (const uri of this.getWorkspaceFolders()) {
                if ((0, utils_1.isGitHubRemoteRepository)(uri)) {
                    this._logService.debug(`Preloading virtual workspace contents for ${uri}`);
                    try {
                        const result = await this._remoteRepositoriesService.loadWorkspaceContents(uri);
                        this._logService.info(`loading virtual workspace contents resulted in ${result} for: ${uri}`);
                    }
                    catch (e) {
                        this._logService.error(`Error loading virtual workspace contents for ${uri}: ${e}`);
                    }
                }
            }
        })();
        return this._fullyLoadedPromise;
    }
    async showWorkspaceFolderPicker() {
        const workspaceFolders = this.getWorkspaceFolders();
        if (workspaceFolders) {
            return vscode_1.window.showWorkspaceFolderPick();
        }
        return;
    }
};
exports.ExtensionTextDocumentManager = ExtensionTextDocumentManager;
exports.ExtensionTextDocumentManager = ExtensionTextDocumentManager = __decorate([
    __param(0, logService_1.ILogService),
    __param(1, remoteRepositories_1.IRemoteRepositoriesService)
], ExtensionTextDocumentManager);
//# sourceMappingURL=workspaceServiceImpl.js.map