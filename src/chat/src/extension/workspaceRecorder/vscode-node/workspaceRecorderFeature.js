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
exports.WorkspaceRecorderFeature = void 0;
const promises_1 = require("fs/promises");
const vscode = __importStar(require("vscode"));
const vscode_1 = require("vscode");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const extensionContext_1 = require("../../../platform/extContext/common/extensionContext");
const gitExtensionService_1 = require("../../../platform/git/common/gitExtensionService");
const async_1 = require("../../../util/common/async");
const notebooks_1 = require("../../../util/common/notebooks");
const jsonFile_1 = require("../../../util/node/jsonFile");
const cache_1 = require("../../../util/vs/base/common/cache");
const cancellation_1 = require("../../../util/vs/base/common/cancellation");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const network_1 = require("../../../util/vs/base/common/network");
const observable_1 = require("../../../util/vs/base/common/observable");
const path_1 = require("../../../util/vs/base/common/path");
const strings_1 = require("../../../util/vs/base/common/strings");
const common_1 = require("../../inlineEdits/vscode-node/parts/common");
const virtualTextDocumentProvider_1 = require("../../inlineEdits/vscode-node/utils/virtualTextDocumentProvider");
const jsonlUtil_1 = require("../common/jsonlUtil");
const workspaceListenerService_1 = require("../common/workspaceListenerService");
const utilsObservable_1 = require("./utilsObservable");
const workspaceRecorder_1 = require("./workspaceRecorder");
let WorkspaceRecorderFeature = class WorkspaceRecorderFeature extends lifecycle_1.Disposable {
    constructor(_vscodeExtensionContext, _configurationService, _gitExtensionService, _workspaceListenerService) {
        super();
        this._vscodeExtensionContext = _vscodeExtensionContext;
        this._configurationService = _configurationService;
        this._gitExtensionService = _gitExtensionService;
        this._workspaceListenerService = _workspaceListenerService;
        this._gitApi = (0, observable_1.observableFromEvent)(this, (listener) => this._gitExtensionService.onDidChange(listener), () => this._gitExtensionService.getExtensionApi());
        this._workspaceRecordingEnabled = this._configurationService.getConfigObservable(configurationService_1.ConfigKey.AdvancedExperimental.WorkspaceRecordingEnabled);
        this._register((0, observable_1.autorunWithStore)((reader, store) => {
            if (!this._workspaceRecordingEnabled.read(reader)) {
                return;
            }
            this.init(store);
        }));
    }
    async init(store) {
        const gitApi = await (0, observable_1.waitForState)(this._gitApi);
        const repos = (0, observable_1.observableFromEvent)(this, (e) => gitApi.onDidOpenRepository(e), () => gitApi.repositories);
        await (0, observable_1.waitForState)(repos, (repos) => repos.length > 0, undefined, (0, cancellation_1.cancelOnDispose)(store));
        const recordingDirPath = (0, path_1.join)(this._vscodeExtensionContext.globalStorageUri.fsPath, 'workspaceRecordings');
        await (0, promises_1.mkdir)(recordingDirPath, { recursive: true });
        const workspacesIndexFile = await jsonFile_1.JSONFile.readOrCreate((0, path_1.join)(recordingDirPath, 'workspaces.json'), { workspaceIdxByRoot: {} });
        if (store.isDisposed) {
            return;
        }
        const w = new InitializedWorkspaceRecorderFeature(gitApi, recordingDirPath, workspacesIndexFile, this._workspaceListenerService);
        store.add(w);
    }
};
exports.WorkspaceRecorderFeature = WorkspaceRecorderFeature;
exports.WorkspaceRecorderFeature = WorkspaceRecorderFeature = __decorate([
    __param(0, extensionContext_1.IVSCodeExtensionContext),
    __param(1, configurationService_1.IConfigurationService),
    __param(2, gitExtensionService_1.IGitExtensionService),
    __param(3, workspaceListenerService_1.IWorkspaceListenerService)
], WorkspaceRecorderFeature);
class InitializedWorkspaceRecorderFeature extends lifecycle_1.Disposable {
    constructor(gitApi, recordingDirPath, workspacesIndexFile, workspaceListenerService) {
        super();
        this.gitApi = gitApi;
        this.recordingDirPath = recordingDirPath;
        this.workspacesIndexFile = workspacesIndexFile;
        this.workspaceListenerService = workspaceListenerService;
        this._logProvider = new virtualTextDocumentProvider_1.VirtualTextDocumentProvider('copilotLogProvider');
        this.recorders = new Map();
        this.recordersChangedSignal = (0, observable_1.observableSignal)(this);
        this.hasWorkspace = (0, observable_1.derived)(this, reader => {
            this.recordersChangedSignal.read(reader);
            return [...this.recorders].length > 0;
        });
        const commandIdOpenRecordingFolder = 'vscodeCopilot.openRecordingFolder';
        this._register(vscode.commands.registerCommand(commandIdOpenRecordingFolder, () => {
            vscode.env.openExternal(vscode.Uri.file(recordingDirPath));
        }));
        const commandIdAddBookmark = 'vscodeCopilot.addRecordingBookmark';
        this._register(vscode.commands.registerCommand(commandIdAddBookmark, () => {
            for (const r of this.recorders.values()) {
                r.addBookmark();
            }
            vscode.window.showInformationMessage('Bookmark added to recording.');
        }));
        const doc = this._logProvider.createDocument('', 'current.recording.w.json');
        const commandIdViewRecording = 'vscodeCopilot.viewRecording';
        this._register(vscode.commands.registerCommand(commandIdViewRecording, async () => {
            const first = this.recorders.values().next().value;
            if (!first) {
                vscode.window.showInformationMessage('No recording found.');
                return;
            }
            const data = await (0, promises_1.readFile)(first.logFilePath, 'utf8');
            const entries = jsonlUtil_1.JSONL.parse(data);
            const recordingData = {
                log: entries
            };
            doc.setContent(JSON.stringify(recordingData));
            await vscode.commands.executeCommand('vscode.open', doc.uri);
        }));
        this._register((0, observable_1.autorunWithStore)((reader, store) => {
            if (!this.hasWorkspace.read(reader)) {
                return;
            }
            const item = store.add(vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000));
            item.text = '$(record) Rec';
            const lines = [];
            lines.push('## $(record) Recording Workspace Changes');
            lines.push('All recordings are stored locally and not uploaded.');
            lines.push('$(chevron-right) Click status bar entry to add a bookmark');
            lines.push(`[$(chevron-right) Open local recording folder](command:${commandIdOpenRecordingFolder})`);
            lines.push(`[$(chevron-right) View recording](command:${commandIdViewRecording})`);
            const md = new vscode.MarkdownString(lines.join('\n\n'));
            md.isTrusted = true;
            md.supportThemeIcons = true;
            item.tooltip = md;
            item.color = 'yellow';
            item.show();
            item.command = { command: commandIdAddBookmark, title: 'Add bookmark' };
        }));
        this._register(vscode.workspace.onDidOpenTextDocument(e => {
            const docUri = documentUriFromTextDocument(e);
            const workspaceRecorder = this.getWorkspaceRecorder(docUri);
            if (workspaceRecorder) {
                workspaceRecorder.handleOnDidOpenTextDocument(docUri, e.getText(), e.version);
            }
        }));
        this._register(vscode.workspace.onDidOpenNotebookDocument(async (e) => {
            const docUri = e.uri.toString();
            const workspaceRecorder = this.getWorkspaceRecorder(docUri);
            if (workspaceRecorder) {
                workspaceRecorder.handleOnDidOpenTextDocument(docUri, (0, notebooks_1.serializeNotebookDocument)(e, { cell_uri_fragment: true }), e.version);
                workspaceRecorder.handleDocumentEvent(docUri, Date.now(), e.version);
            }
        }));
        this._register(this.workspaceListenerService.onStructuredData((item) => {
            if ('modelUri' in item) {
                const docUri = item.modelUri.toString();
                const workspaceRecorder = this.getWorkspaceRecorder(docUri);
                if (workspaceRecorder) {
                    workspaceRecorder.handleDocumentEvent(docUri, item.time, { ...item, time: undefined, modelUri: undefined, modelVersion: undefined, v: item.modelVersion });
                }
            }
            else {
                // send to first recorder
                const recorder = this.recorders.values().next().value;
                if (recorder) {
                    recorder.handleEvent(item.time, { ...item, time: undefined });
                }
            }
        }));
        this._register(vscode.workspace.onDidChangeTextDocument(e => {
            const docUri = documentUriFromTextDocument(e.document);
            const workspaceRecorder = this.getWorkspaceRecorder(docUri);
            if (workspaceRecorder) {
                const edit = (0, common_1.editFromTextDocumentContentChangeEvents)(e.contentChanges);
                workspaceRecorder.handleOnDidChangeTextDocument(docUri, edit, e.document.version, e.detailedReason?.metadata);
            }
        }));
        this._register(vscode.workspace.onDidCloseTextDocument(e => {
            const docUri = documentUriFromTextDocument(e);
            this.getWorkspaceRecorder(docUri)?.handleOnDidCloseTextDocument(docUri);
        }));
        for (const doc of vscode.workspace.textDocuments) {
            const docUri = documentUriFromTextDocument(doc);
            const workspaceRecorder = this.getWorkspaceRecorder(docUri);
            if (workspaceRecorder) {
                workspaceRecorder.handleOnDidOpenTextDocument(docUri, doc.getText(), doc.version);
            }
        }
        const observableVscodeApi = new utilsObservable_1.ObservableVsCode();
        this._register((0, observable_1.autorunWithStore)((reader, store) => {
            const activeEditor = observableVscodeApi.activeTextEditor.read(reader);
            if (!activeEditor) {
                return;
            }
            const docUri = documentUriFromTextDocument(activeEditor.editor.document);
            const workspaceRecorder = this.getWorkspaceRecorder(docUri);
            if (!workspaceRecorder) {
                return;
            }
            workspaceRecorder.handleOnDidFocusedDocumentChange(docUri);
            store.add((0, observable_1.autorun)(reader => {
                const selections = activeEditor.selection.read(reader);
                const offsetRanges = selections.map(s => (0, utilsObservable_1.rangeToOffsetRange)(s, activeEditor.editor.document));
                workspaceRecorder.handleOnDidSelectionChange(docUri, offsetRanges);
            }));
        }));
    }
    getWorkspaceRepository(docUri) {
        if (process.platform === 'win32') {
            // Use case insensitive
            return this.gitApi.repositories.find(r => (0, strings_1.startsWithIgnoreCase)(docUri, r.rootUri.toString()));
        }
        return this.gitApi.repositories.find(r => docUri.startsWith(r.rootUri.toString()));
    }
    getWorkspaceRecorder(docUri) {
        const workspaceRepo = this.getWorkspaceRepository(docUri);
        const workspaceRoot = workspaceRepo?.rootUri.toString();
        if (!workspaceRoot) {
            return undefined;
        }
        const workspaceRootKey = workspaceRoot.toLowerCase();
        let recorder = this.recorders.get(workspaceRootKey);
        if (!recorder) {
            let workspaceIdxByRoot = this.workspacesIndexFile.value.workspaceIdxByRoot;
            let workspaceIdx = workspaceIdxByRoot[workspaceRootKey];
            if (workspaceIdx === undefined) {
                workspaceIdx = Object.entries(workspaceIdxByRoot).length;
                workspaceIdxByRoot = { ...workspaceIdxByRoot, [workspaceRootKey]: workspaceIdx };
                this.workspacesIndexFile.setValue({ workspaceIdxByRoot: workspaceIdxByRoot });
            }
            const checkIsIgnored = new async_1.BatchedProcessor(async (paths) => {
                const result = await workspaceRepo.checkIgnore(paths);
                return paths.map(p => result.has(p));
            }, 1000);
            const isIgnored = new cache_1.CachedFunction(async (documentUri) => {
                const path = vscode_1.Uri.parse(documentUri).fsPath;
                return await checkIsIgnored.request(path);
            });
            const folderName = sanitizeFolderName((0, path_1.basename)(workspaceRootKey)) + '-' + workspaceIdx;
            recorder = new workspaceRecorder_1.WorkspaceRecorder(workspaceRoot, (0, path_1.join)(this.recordingDirPath, folderName), {
                isIgnoredDocument: documentUri => isIgnored.get(documentUri),
            });
            this._register(recorder);
            this.recorders.set(workspaceRootKey, recorder);
            this.recordersChangedSignal.trigger(undefined);
        }
        return recorder;
    }
}
function sanitizeFolderName(str) {
    return str.replaceAll(/[^a-zA-Z0-9_.-]/g, '');
}
function documentUriFromTextDocument(textDocument) {
    if (textDocument.uri.scheme === network_1.Schemas.vscodeNotebookCell) {
        const notebookDocument = (0, notebooks_1.findNotebook)(textDocument.uri, vscode.workspace.notebookDocuments);
        if (!notebookDocument) {
            throw new Error('No notebook document found for cell');
        }
        return notebookDocument.uri.with({ fragment: textDocument.uri.fragment }).toString();
    }
    return textDocument.uri.toString();
}
//# sourceMappingURL=workspaceRecorderFeature.js.map