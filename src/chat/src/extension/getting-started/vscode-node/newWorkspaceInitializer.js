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
exports.NewWorkspaceInitializer = void 0;
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const newWorkspaceContext_1 = require("../common/newWorkspaceContext");
let NewWorkspaceInitializer = class NewWorkspaceInitializer extends lifecycle_1.Disposable {
    constructor(_extensionContext, workspaceService, fileSystemService) {
        super();
        this._extensionContext = _extensionContext;
        this.workspaceService = workspaceService;
        this.fileSystemService = fileSystemService;
        this._updateWorkspace();
    }
    async _updateWorkspace() {
        const workspace = this.workspaceService.getWorkspaceFolders();
        if (!workspace || workspace.length === 0) {
            return;
        }
        const newWorkspaceContextsList = this._extensionContext.globalState.get(newWorkspaceContext_1.NEW_WORKSPACE_STORAGE_KEY, []);
        const exactIndex = newWorkspaceContextsList.findIndex(c => c.workspaceURI === workspace[0].toString());
        if (exactIndex === -1) {
            return;
        }
        const context = newWorkspaceContextsList[exactIndex];
        const confirm = vscode_1.l10n.t('Continue Setup');
        const message = vscode_1.l10n.t('Continue Workspace Setup?');
        const detail = vscode_1.l10n.t('Copilot will resume setting up the workspace by creating the necessary files.');
        if (!context.initialized) {
            context.initialized = true;
            newWorkspaceContextsList[exactIndex] = context;
            this._extensionContext.globalState.update(newWorkspaceContext_1.NEW_WORKSPACE_STORAGE_KEY, newWorkspaceContextsList);
            const result = await vscode.window.showInformationMessage(message, { modal: true, detail }, confirm);
            if (result === confirm) {
                vscode.commands.executeCommand('workbench.action.chat.open', { mode: 'agent', query: `${vscode_1.l10n.t('Continue with #new workspace setup')}` });
            }
            else {
                newWorkspaceContextsList.splice(exactIndex, 1);
                this._extensionContext.globalState.update(newWorkspaceContext_1.NEW_WORKSPACE_STORAGE_KEY, newWorkspaceContextsList);
            }
            return;
        }
        if ((await this.fileSystemService.readDirectory(workspace[0])).length > 0) {
            // workspace is not empty and we've already initialized it
            newWorkspaceContextsList.splice(exactIndex, 1);
            this._extensionContext.globalState.update(newWorkspaceContext_1.NEW_WORKSPACE_STORAGE_KEY, newWorkspaceContextsList);
        }
        else {
            // workspace is still empty, so ask to setup again
            const result = await vscode.window.showInformationMessage(message, { modal: true, detail }, confirm);
            if (result === confirm) {
                vscode.commands.executeCommand('workbench.action.chat.open', { mode: 'agent', query: context.userPrompt });
            }
            else {
                newWorkspaceContextsList.splice(exactIndex, 1);
                this._extensionContext.globalState.update(newWorkspaceContext_1.NEW_WORKSPACE_STORAGE_KEY, newWorkspaceContextsList);
            }
        }
    }
};
exports.NewWorkspaceInitializer = NewWorkspaceInitializer;
exports.NewWorkspaceInitializer = NewWorkspaceInitializer = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, fileSystemService_1.IFileSystemService)
], NewWorkspaceInitializer);
//# sourceMappingURL=newWorkspaceInitializer.js.map