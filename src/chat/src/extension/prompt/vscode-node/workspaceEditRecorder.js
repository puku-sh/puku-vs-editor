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
exports.WorkspaceEditRecorder = void 0;
const vscode = __importStar(require("vscode"));
const observableGit_1 = require("../../../platform/inlineEdits/common/observableGit");
const workspaceDocumentEditTracker_1 = require("../../../platform/inlineEdits/common/workspaceEditTracker/workspaceDocumentEditTracker");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeWorkspace_1 = require("../../inlineEdits/vscode-node/parts/vscodeWorkspace");
let WorkspaceEditRecorder = class WorkspaceEditRecorder extends lifecycle_1.Disposable {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._workspace = this._instantiationService.createInstance(vscodeWorkspace_1.VSCodeWorkspace);
        const git = this._instantiationService.createInstance(observableGit_1.ObservableGit);
        this._workspaceDocumentEditHistory = this._register(new workspaceDocumentEditTracker_1.WorkspaceDocumentEditHistory(this._workspace, git, 100));
    }
    getEditsAndReset() {
        const serializedEdits = [];
        this._workspace.openDocuments.get().forEach(doc => {
            const edits = this._workspaceDocumentEditHistory.getRecentEdits(doc.id);
            if (edits && edits.edits.replacements.length > 0) {
                const docUri = vscode.Uri.parse(doc.id.path);
                const relativePath = vscode.workspace.asRelativePath(docUri, false);
                serializedEdits.push({
                    path: relativePath,
                    edits: JSON.stringify(edits.edits)
                });
            }
        });
        this._workspaceDocumentEditHistory.resetEditHistory();
        return serializedEdits;
    }
};
exports.WorkspaceEditRecorder = WorkspaceEditRecorder;
exports.WorkspaceEditRecorder = WorkspaceEditRecorder = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], WorkspaceEditRecorder);
//# sourceMappingURL=workspaceEditRecorder.js.map