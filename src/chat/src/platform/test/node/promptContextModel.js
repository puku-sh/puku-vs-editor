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
exports.noopFileSystemWatcher = void 0;
exports.deserializeWorkbenchState = deserializeWorkbenchState;
const fs = __importStar(require("fs"));
const notebookDocument_1 = require("../../../util/common/test/shims/notebookDocument");
const notebookEditor_1 = require("../../../util/common/test/shims/notebookEditor");
const textDocument_1 = require("../../../util/common/test/shims/textDocument");
const textEditor_1 = require("../../../util/common/test/shims/textEditor");
const event_1 = require("../../../util/vs/base/common/event");
const path = __importStar(require("../../../util/vs/base/common/path"));
const resources_1 = require("../../../util/vs/base/common/resources");
const uri_1 = require("../../../util/vs/base/common/uri");
const notebooks_1 = require("../../../util/vs/workbench/api/common/extHostTypes/notebooks");
const vscodeTypes_1 = require("../../../vscodeTypes");
const isInExtensionHost_1 = require("./isInExtensionHost");
const simulationWorkspaceServices_1 = require("./simulationWorkspaceServices");
function copyFolderContents(src, dest) {
    if (src === dest) {
        return;
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        fs.cpSync(srcPath, destPath, { recursive: true });
    }
}
function deserializeWorkbenchState(scenarioFolderPath, stateFilePath) {
    const state = JSON.parse(fs.readFileSync(stateFilePath, 'utf8'));
    if (state.workspaceFoldersFilePaths && state.workspaceFoldersFilePaths.length > 1) {
        throw new Error('Currently only supporting a single workspace folder');
    }
    // workspace folder is relative to the scenario folder
    let workspaceFolderPath = state.workspaceFoldersFilePaths ? path.join(scenarioFolderPath, state.workspaceFoldersFilePaths[0]) : scenarioFolderPath;
    let workspaceFolderUri = state.workspaceFolderFilePath ? vscodeTypes_1.Uri.file(path.join(scenarioFolderPath, state.workspaceFolderFilePath)) : uri_1.URI.file(simulationWorkspaceServices_1.WORKSPACE_PATH);
    let workspaceFolders = [workspaceFolderUri];
    if (isInExtensionHost_1.isInExtensionHost) {
        workspaceFolderUri = (0, isInExtensionHost_1.extensionHostWorkspaceUri)();
        copyFolderContents(workspaceFolderPath, workspaceFolderUri.fsPath);
        workspaceFolderPath = workspaceFolderUri.fsPath;
        workspaceFolders = [workspaceFolderUri];
    }
    // all other resources are relative to the workspace folder
    function readFileSync(filePath) {
        return fs.readFileSync(path.join(workspaceFolderPath, filePath), 'utf8');
    }
    const repositories = state?.repoContexts;
    const activeFileDiagnostics = state.activeFileDiagnostics?.map(diagnostic => {
        const relatedInformation = diagnostic.relatedInformation?.map(relatedInfo => (new vscodeTypes_1.DiagnosticRelatedInformation(new vscodeTypes_1.Location(vscodeTypes_1.Uri.joinPath(workspaceFolderUri, relatedInfo.filePath), new vscodeTypes_1.Range(relatedInfo.start.line, relatedInfo.start.character, relatedInfo.end.line, relatedInfo.end.character)), relatedInfo.message)));
        const diag = new vscodeTypes_1.Diagnostic(new vscodeTypes_1.Range(diagnostic.start.line, diagnostic.start.character, diagnostic.end.line, diagnostic.end.character), diagnostic.message, diagnostic.severity);
        diag.relatedInformation = relatedInformation;
        return diag;
    });
    const workspaceSymbols = (state.symbols ?? []).map(symbol => {
        return new vscodeTypes_1.SymbolInformation(symbol.name, symbol.kind, new vscodeTypes_1.Range(symbol.start.line, symbol.start.character, symbol.end.line, symbol.end.character), vscodeTypes_1.Uri.joinPath(workspaceFolderUri, symbol.filePath), symbol.containerName);
    });
    const terminalLastCommand = state.terminalLastCommand ? { terminal: null, ...state.terminalLastCommand } : undefined;
    const notebookExtHostDocuments = state.notebookDocumentFilePaths?.map((path) => {
        const fileContents = readFileSync(path);
        const notebookFileUri = uri_1.URI.joinPath(workspaceFolderUri, path);
        const notebook = notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(notebookFileUri, fileContents);
        return notebook;
    }) ?? [];
    const notebookDocuments = notebookExtHostDocuments.map(doc => doc.document);
    let extHostNotebookEditor;
    if (state.activeNotebookEditor) {
        const activeNotebookEditor = state.activeNotebookEditor;
        const notebookFileUri = uri_1.URI.joinPath(workspaceFolderUri, activeNotebookEditor.documentFilePath);
        let activeNotebookDocument = notebookExtHostDocuments.find(doc => (0, resources_1.isEqual)(doc.document.uri, notebookFileUri));
        if (!activeNotebookDocument) {
            const fileContents = readFileSync(activeNotebookEditor.documentFilePath);
            activeNotebookDocument = notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(notebookFileUri, fileContents);
            notebookExtHostDocuments.push(activeNotebookDocument);
        }
        extHostNotebookEditor = new notebookEditor_1.ExtHostNotebookEditor(activeNotebookDocument, activeNotebookEditor.selections.map(selection => new notebooks_1.NotebookRange(selection.start, selection.end)));
    }
    // No active text editor so skip constructing one
    if (!state.activeTextEditor) {
        return {
            activeFileDiagnostics,
            workspaceSymbols,
            activeTextEditor: undefined,
            __notebookExtHostDocuments: notebookExtHostDocuments,
            activeNotebookEditor: extHostNotebookEditor?.apiEditor,
            terminalBuffer: state.terminalBuffer,
            terminalLastCommand,
            terminalSelection: state.terminalSelection,
            terminalShellType: state.terminalShellType,
            debugConsoleOutput: state.debugConsoleOutput,
            repositories,
            notebookDocuments,
            workspaceFolders,
            workspaceFolderPath,
            textDocumentFilePaths: state.textDocumentFilePaths || [],
            changeFiles: state.changeFiles || [],
            lsifIndex: state.lsifIndex,
            testFailures: state.testFailures,
        };
    }
    const fileContents = readFileSync(state.activeTextEditor.documentFilePath);
    const activeEditorFileUri = uri_1.URI.joinPath(workspaceFolderUri, state.activeTextEditor.documentFilePath);
    const selections = [];
    for (const selection of state.activeTextEditor.selections) {
        const mockSelection = new vscodeTypes_1.Selection(selection.anchor.line, selection.anchor.character, selection.active.line, selection.active.character);
        selections.push(mockSelection);
    }
    const visibleRanges = [];
    for (const visibleRange of state.activeTextEditor.visibleRanges) {
        const mockRange = new vscodeTypes_1.Range(visibleRange.start.line, visibleRange.start.character, visibleRange.end.line, visibleRange.end.character);
        visibleRanges.push(mockRange);
    }
    const mockTextDocument = (0, textDocument_1.createTextDocumentData)(activeEditorFileUri, fileContents, state.activeTextEditor.languageId).document;
    const mockTextEditor = new textEditor_1.ExtHostTextEditor(mockTextDocument, selections, {}, visibleRanges, undefined).value;
    return {
        activeFileDiagnostics,
        workspaceSymbols,
        activeTextEditor: mockTextEditor,
        __notebookExtHostDocuments: notebookExtHostDocuments,
        activeNotebookEditor: extHostNotebookEditor?.apiEditor,
        terminalBuffer: state.terminalBuffer,
        terminalLastCommand,
        terminalSelection: state.terminalSelection,
        terminalShellType: state.terminalShellType,
        debugConsoleOutput: state.debugConsoleOutput,
        repositories,
        notebookDocuments,
        workspaceFolders,
        workspaceFolderPath,
        textDocumentFilePaths: state.textDocumentFilePaths,
        changeFiles: state.changeFiles || [],
        lsifIndex: state.lsifIndex,
        testFailures: state.testFailures,
    };
}
exports.noopFileSystemWatcher = new class {
    constructor() {
        this.ignoreCreateEvents = false;
        this.ignoreChangeEvents = false;
        this.ignoreDeleteEvents = false;
        this.onDidCreate = event_1.Event.None;
        this.onDidChange = event_1.Event.None;
        this.onDidDelete = event_1.Event.None;
    }
    dispose() {
        // noop
    }
};
//# sourceMappingURL=promptContextModel.js.map