"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRemoteIndexCommandId = exports.buildLocalIndexCommandId = void 0;
exports.register = register;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n_1 = require("@vscode/l10n");
const vscode = __importStar(require("vscode"));
const codeSearchRepoTracker_1 = require("../../../platform/remoteCodeSearch/node/codeSearchRepoTracker");
const workspaceChunkSearchService_1 = require("../../../platform/workspaceChunkSearch/node/workspaceChunkSearchService");
const workspaceFileIndex_1 = require("../../../platform/workspaceChunkSearch/node/workspaceFileIndex");
const telemetryCorrelationId_1 = require("../../../util/common/telemetryCorrelationId");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
exports.buildLocalIndexCommandId = 'puku.buildLocalWorkspaceIndex';
exports.buildRemoteIndexCommandId = 'puku.buildRemoteWorkspaceIndex';
function register(accessor) {
    const workspaceChunkSearch = accessor.get(workspaceChunkSearchService_1.IWorkspaceChunkSearchService);
    const workspaceFileIndex = accessor.get(workspaceFileIndex_1.IWorkspaceFileIndex);
    const disposableStore = new lifecycle_1.DisposableStore();
    disposableStore.add(vscode.commands.registerCommand(exports.buildLocalIndexCommandId, onlyRunOneAtATime(async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: (0, l10n_1.t) `Updating local workspace index...`,
        }, async () => {
            const result = await workspaceChunkSearch.triggerLocalIndexing('manual', new telemetryCorrelationId_1.TelemetryCorrelationId('BuildLocalIndexCommand'));
            if (result.isError()) {
                vscode.window.showWarningMessage((0, l10n_1.t) `Could not build local workspace index.` + ' \n\n' + result.err.userMessage);
            }
        });
    })));
    disposableStore.add(vscode.commands.registerCommand(exports.buildRemoteIndexCommandId, onlyRunOneAtATime(async () => {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: (0, l10n_1.t) `Building remote workspace index...`,
        }, async () => {
            const triggerResult = await workspaceChunkSearch.triggerRemoteIndexing('manual', new telemetryCorrelationId_1.TelemetryCorrelationId('BuildRemoteIndexCommand'));
            if (triggerResult.isError()) {
                if (triggerResult.err.id === codeSearchRepoTracker_1.TriggerRemoteIndexingError.alreadyIndexed.id) {
                    vscode.window.showInformationMessage((0, l10n_1.t) `Remote workspace index ready to use.`);
                }
                else {
                    vscode.window.showWarningMessage((0, l10n_1.t) `Could not build remote workspace index. ` + '\n\n' + triggerResult.err.userMessage);
                }
            }
        });
    })));
    disposableStore.add(vscode.commands.registerCommand('puku.debug.collectWorkspaceIndexDiagnostics', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: (0, l10n_1.t) `Collecting workspace index diagnostics...`,
        }, async () => {
            const document = await vscode.workspace.openTextDocument({ language: 'markdown' });
            const editor = await vscode.window.showTextDocument(document);
            await appendText(editor, '# Workspace Index Diagnostics\n');
            await appendText(editor, 'Tracked file count: ' + workspaceFileIndex.fileCount + '\n\n');
            await appendText(editor, '## All tracked files\n');
            const fileEntries = Array.from(workspaceFileIndex.values());
            const stepSize = 500;
            for (let i = 0; i < fileEntries.length; i += stepSize) {
                if (editor.document.isClosed) {
                    return;
                }
                const files = fileEntries.slice(i, i + stepSize);
                if (files.length) {
                    await appendText(editor, files.map(file => `- ${file.uri.fsPath}`).join('\n') + '\n');
                }
            }
        });
    }));
    return disposableStore;
}
async function appendText(editor, string) {
    await editor.edit(builder => {
        builder.insert(editor.document.lineAt(editor.document.lineCount - 1).range.end, string);
    });
}
function onlyRunOneAtATime(taskFactory) {
    let runningTask;
    return async () => {
        if (runningTask) {
            return runningTask;
        }
        const task = taskFactory();
        runningTask = task;
        try {
            return await task;
        }
        finally {
            runningTask = undefined;
        }
    };
}
//# sourceMappingURL=commands.js.map