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
exports.TestMergeConflictServiceImpl = exports.MergeConflictServiceImpl = void 0;
const vscode = __importStar(require("vscode"));
const gitService_1 = require("../../../platform/git/common/gitService");
const utils_1 = require("../../../platform/git/common/utils");
const ignoreService_1 = require("../../../platform/ignore/common/ignoreService");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const mergeConflictParser_1 = require("./mergeConflictParser");
let MergeConflictServiceImpl = class MergeConflictServiceImpl extends lifecycle_1.Disposable {
    constructor(gitService, ignoreService) {
        super();
        this.gitService = gitService;
        this.ignoreService = ignoreService;
    }
    async resolveMergeConflicts(resources, cancellationToken) {
        if (cancellationToken?.isCancellationRequested) {
            return;
        }
        // Attachments
        const attachFiles = [];
        const attachHistoryItemChanges = [];
        const attachHistoryItemChangeRanges = [];
        for (const resource of resources) {
            // Copilot ignored
            if (await this.ignoreService.isCopilotIgnored(resource, cancellationToken)) {
                continue;
            }
            // No merge conflicts
            const textDocument = await vscode.workspace.openTextDocument(resource);
            if (!mergeConflictParser_1.MergeConflictParser.containsConflict(textDocument)) {
                continue;
            }
            const conflicts = mergeConflictParser_1.MergeConflictParser.scanDocument(textDocument);
            if (conflicts.length === 0) {
                continue;
            }
            // Attach file
            attachFiles.push(resource);
            const currentName = conflicts[0].current.name;
            const incomingName = conflicts[0].incoming.name;
            // Get merge base
            const mergeBase = await this.gitService.getMergeBase(resource, currentName, incomingName);
            if (mergeBase) {
                // Attach merge base
                attachHistoryItemChanges.push({
                    uri: (0, utils_1.toGitUri)(resource, mergeBase),
                    historyItemId: mergeBase
                });
                // Attach merge base -> current
                attachHistoryItemChangeRanges.push({
                    start: {
                        uri: (0, utils_1.toGitUri)(resource, mergeBase),
                        historyItemId: mergeBase
                    },
                    end: {
                        uri: (0, utils_1.toGitUri)(resource, currentName),
                        historyItemId: currentName
                    }
                });
                // Attach merge base -> incoming
                attachHistoryItemChangeRanges.push({
                    start: {
                        uri: (0, utils_1.toGitUri)(resource, mergeBase),
                        historyItemId: mergeBase
                    },
                    end: {
                        uri: (0, utils_1.toGitUri)(resource, incomingName),
                        historyItemId: incomingName
                    }
                });
            }
        }
        if (cancellationToken?.isCancellationRequested) {
            return;
        }
        if (attachFiles.length > 0) {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                mode: 'agent',
                attachFiles,
                attachHistoryItemChanges,
                attachHistoryItemChangeRanges,
                query: 'Resolve all merge conflicts'
            });
        }
    }
};
exports.MergeConflictServiceImpl = MergeConflictServiceImpl;
exports.MergeConflictServiceImpl = MergeConflictServiceImpl = __decorate([
    __param(0, gitService_1.IGitService),
    __param(1, ignoreService_1.IIgnoreService)
], MergeConflictServiceImpl);
class TestMergeConflictServiceImpl {
    async resolveMergeConflicts(resources, cancellationToken) { }
}
exports.TestMergeConflictServiceImpl = TestMergeConflictServiceImpl;
//# sourceMappingURL=mergeConflictServiceImpl.js.map