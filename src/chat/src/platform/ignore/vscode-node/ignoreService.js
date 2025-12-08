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
exports.VsCodeIgnoreService = void 0;
const vscode_1 = require("vscode");
const authentication_1 = require("../../authentication/common/authentication");
const capiClient_1 = require("../../endpoint/common/capiClient");
const fileSystemServiceImpl_1 = require("../../filesystem/vscode/fileSystemServiceImpl");
const gitExtensionService_1 = require("../../git/common/gitExtensionService");
const gitService_1 = require("../../git/common/gitService");
const logService_1 = require("../../log/common/logService");
const baseSearchServiceImpl_1 = require("../../search/vscode/baseSearchServiceImpl");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const ignoreServiceImpl_1 = require("../node/ignoreServiceImpl");
let VsCodeIgnoreService = class VsCodeIgnoreService extends ignoreServiceImpl_1.BaseIgnoreService {
    constructor(_gitService, _gitExtensionService, _logService, _authService, _workspaceService, _capiClientService) {
        super(_gitService, _logService, _authService, _workspaceService, _capiClientService, new baseSearchServiceImpl_1.BaseSearchServiceImpl(), new fileSystemServiceImpl_1.VSCodeFileSystemService());
        this.installListeners();
    }
    installListeners() {
        this._disposables.push(vscode_1.workspace.onDidChangeWorkspaceFolders(e => {
            for (const folder of e.removed) {
                this.removeWorkspace(folder.uri);
            }
            for (const folder of e.added) {
                this.addWorkspace(folder.uri);
            }
        }));
        // Lets watch for changed .copilotignore files
        this._disposables.push(vscode_1.workspace.onDidSaveTextDocument(async (doc) => {
            if (this.isIgnoreFile(doc.uri)) {
                const contents = (await vscode_1.workspace.fs.readFile(doc.uri)).toString();
                const folder = vscode_1.workspace.getWorkspaceFolder(doc.uri);
                this.trackIgnoreFile(folder?.uri, doc.uri, contents);
            }
        }), vscode_1.workspace.onDidDeleteFiles(e => {
            for (const f of e.files) {
                this.removeIgnoreFile(f);
            }
        }), vscode_1.workspace.onDidRenameFiles(async (e) => {
            for (const f of e.files) {
                if (this.isIgnoreFile(f.newUri)) {
                    const contents = (await vscode_1.workspace.fs.readFile(f.newUri)).toString();
                    this.removeIgnoreFile(f.oldUri);
                    const folder = vscode_1.workspace.getWorkspaceFolder(f.newUri);
                    this.trackIgnoreFile(folder?.uri, f.newUri, contents);
                }
            }
        }));
    }
};
exports.VsCodeIgnoreService = VsCodeIgnoreService;
exports.VsCodeIgnoreService = VsCodeIgnoreService = __decorate([
    __param(0, gitService_1.IGitService),
    __param(1, gitExtensionService_1.IGitExtensionService),
    __param(2, logService_1.ILogService),
    __param(3, authentication_1.IAuthenticationService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, capiClient_1.ICAPIClientService)
], VsCodeIgnoreService);
//# sourceMappingURL=ignoreService.js.map