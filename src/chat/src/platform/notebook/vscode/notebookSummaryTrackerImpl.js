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
exports.NotebookSummaryTrackerImpl = void 0;
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const extensionContext_1 = require("../../extContext/common/extensionContext");
const workspaceService_1 = require("../../workspace/common/workspaceService");
let NotebookSummaryTrackerImpl = class NotebookSummaryTrackerImpl extends lifecycle_1.DisposableStore {
    constructor(workspaceService, vsCodeExtensionContext) {
        super();
        this.workspaceService = workspaceService;
        this.trackedNotebooks = new WeakSet();
        this.notebooksWithChanges = new WeakSet();
        vsCodeExtensionContext.subscriptions.push(this);
        this.add(this.workspaceService.onDidChangeNotebookDocument((e) => {
            if (!this.trackedNotebooks.has(e.notebook)) {
                return;
            }
            if (e.contentChanges.length) {
                this.notebooksWithChanges.add(e.notebook);
            }
            if (e.cellChanges.some(c => c.executionSummary)) {
                this.notebooksWithChanges.add(e.notebook);
            }
        }));
    }
    trackNotebook(notebook) {
        this.trackedNotebooks.add(notebook);
    }
    clearState(notebook) {
        this.notebooksWithChanges.delete(notebook);
    }
    listNotebooksWithChanges() {
        return this.workspaceService.notebookDocuments.filter((notebook) => this.notebooksWithChanges.has(notebook));
    }
};
exports.NotebookSummaryTrackerImpl = NotebookSummaryTrackerImpl;
exports.NotebookSummaryTrackerImpl = NotebookSummaryTrackerImpl = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, extensionContext_1.IVSCodeExtensionContext)
], NotebookSummaryTrackerImpl);
//# sourceMappingURL=notebookSummaryTrackerImpl.js.map