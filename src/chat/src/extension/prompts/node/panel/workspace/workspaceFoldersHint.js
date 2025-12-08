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
exports.WorkspaceFoldersHint = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptPathRepresentationService_1 = require("../../../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../../../platform/workspace/common/workspaceService");
let WorkspaceFoldersHint = class WorkspaceFoldersHint extends prompt_tsx_1.PromptElement {
    constructor(props, _workspaceService, _promptPathRepresentationService) {
        super(props);
        this._workspaceService = _workspaceService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    render(state, sizing) {
        const workspaceFolders = this._workspaceService.getWorkspaceFolders();
        if (workspaceFolders.length === 1) {
            return vscpp(vscppf, null,
                "The user has the following folder open: ",
                this._promptPathRepresentationService.getFilePath(workspaceFolders[0]),
                ".");
        }
        else if (workspaceFolders.length > 0) {
            return vscpp(vscppf, null,
                "The user has the following folders open: ",
                workspaceFolders.map(folder => this._promptPathRepresentationService.getFilePath(folder)).join(', '),
                ".");
        }
    }
};
exports.WorkspaceFoldersHint = WorkspaceFoldersHint;
exports.WorkspaceFoldersHint = WorkspaceFoldersHint = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], WorkspaceFoldersHint);
//# sourceMappingURL=workspaceFoldersHint.js.map