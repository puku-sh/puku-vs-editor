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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationWorkspace = void 0;
exports.isQualifiedFile = isQualifiedFile;
exports.isRelativeFile = isRelativeFile;
exports.isNotebook = isNotebook;
exports.applyEdits = applyEdits;
exports.getLanguageForFile = getLanguageForFile;
const assert_1 = __importDefault(require("assert"));
const fs = __importStar(require("fs"));
const languages_1 = require("../../../util/common/languages");
const markdown_1 = require("../../../util/common/markdown");
const notebookDocument_1 = require("../../../util/common/test/shims/notebookDocument");
const notebookEditor_1 = require("../../../util/common/test/shims/notebookEditor");
const textDocument_1 = require("../../../util/common/test/shims/textDocument");
const textEditor_1 = require("../../../util/common/test/shims/textEditor");
const types_1 = require("../../../util/common/types");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const network_1 = require("../../../util/vs/base/common/network");
const path = __importStar(require("../../../util/vs/base/common/path"));
const types_2 = require("../../../util/vs/base/common/types");
const uri_1 = require("../../../util/vs/base/common/uri");
const descriptors_1 = require("../../../util/vs/platform/instantiation/common/descriptors");
const vscodeTypes_1 = require("../../../vscodeTypes");
const debugOutputService_1 = require("../../debug/common/debugOutputService");
const dialogService_1 = require("../../dialog/common/dialogService");
const diffService_1 = require("../../diff/common/diffService");
const diffServiceImpl_1 = require("../../diff/node/diffServiceImpl");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const gitService_1 = require("../../git/common/gitService");
const languageDiagnosticsService_1 = require("../../languages/common/languageDiagnosticsService");
const languageFeaturesService_1 = require("../../languages/common/languageFeaturesService");
const alternativeContent_1 = require("../../notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../notebook/common/notebookService");
const reviewService_1 = require("../../review/common/reviewService");
const searchService_1 = require("../../search/common/searchService");
const tabsAndEditorsService_1 = require("../../tabs/common/tabsAndEditorsService");
const terminalService_1 = require("../../terminal/common/terminalService");
const nullWorkspaceMutationManager_1 = require("../../testing/common/nullWorkspaceMutationManager");
const workspaceMutationManager_1 = require("../../testing/common/workspaceMutationManager");
const setupTestDetector_1 = require("../../testing/node/setupTestDetector");
const testDepsResolver_1 = require("../../testing/node/testDepsResolver");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const simulationWorkspaceServices_1 = require("./simulationWorkspaceServices");
function isQualifiedFile(file) {
    return file && file.kind === 'qualifiedFile' && (0, types_1.isUri)(file.uri) && (0, types_2.isString)(file.fileContents) && (file.languageId === undefined || (0, types_2.isString)(file.languageId));
}
function isRelativeFile(file) {
    return file && file.kind === 'relativeFile' && (0, types_2.isString)(file.fileName) && (0, types_2.isString)(file.fileContents) && (file.languageId === undefined || (0, types_2.isString)(file.languageId));
}
function getWorkspaceFolderPath(workspaceFolders) {
    let workspaceFolder = simulationWorkspaceServices_1.WORKSPACE_PATH;
    if (workspaceFolders) {
        assert_1.default.ok(workspaceFolders.length === 1, 'filePathToUri: not sure how to pick a workspace folder when there are multiple possible');
        workspaceFolder = workspaceFolders[0].path;
    }
    return workspaceFolder;
}
function filePathToUri(filePath, workspaceFolders) {
    const workspaceFolder = getWorkspaceFolderPath(workspaceFolders);
    if (filePath.includes('#index')) {
        // this is a notebook cell. filePath: errors#index2.py
        const parts = filePath.split('#');
        const fileName = parts[0] + '.ipynb';
        const index = parts[1].replace('.py', '');
        return vscodeTypes_1.Uri.file(path.join(workspaceFolder, fileName)).with({ scheme: network_1.Schemas.vscodeNotebookCell, fragment: index });
    }
    return vscodeTypes_1.Uri.file(path.join(workspaceFolder, filePath));
}
function uriToFilePath(uri, workspaceFolders) {
    const workspaceFolder = getWorkspaceFolderPath(workspaceFolders);
    if (uri.scheme === network_1.Schemas.vscodeNotebookCell) {
        // we need to append fragment to the path
        const filePathWithoutSuffix = uri.fsPath.substring(workspaceFolder.length, uri.fsPath.length - '.ipynb'.length);
        return `${filePathWithoutSuffix}#${uri.fragment}.py`;
    }
    return uri.fsPath.substring(workspaceFolder.length);
}
function isNotebook(file) {
    if (typeof file === 'string') {
        return file.endsWith('.ipynb');
    }
    if ('path' in file) {
        return file.path.endsWith('.ipynb');
    }
    return file.uri.scheme === network_1.Schemas.vscodeNotebookCell || file.uri.fsPath.endsWith('.ipynb');
}
class SimulationWorkspace extends lifecycle_1.Disposable {
    get repositories() { return this._workspaceState?.repositories; }
    get workspaceSymbols() { return this._workspaceState?.workspaceSymbols; }
    get debugConsoleOutput() { return this._workspaceState?.debugConsoleOutput; }
    get terminalBuffer() { return this._workspaceState?.terminalBuffer; }
    get terminalLastCommand() { return this._workspaceState?.terminalLastCommand; }
    get terminalSelection() { return this._workspaceState?.terminalSelection; }
    get terminalShellType() { return this._workspaceState?.terminalShellType; }
    get changeFiles() { return this._workspaceState?.changeFiles; }
    get lsifIndex() { return this._workspaceState?.lsifIndex; }
    get testFailures() { return this._workspaceState?.testFailures; }
    get workspaceFolderPath() { return this._workspaceState?.workspaceFolderPath; }
    get documents() {
        return Array.from(this._docs.values());
    }
    get activeTextEditor() {
        return this.currentEditor?.value;
    }
    get activeNotebookEditor() {
        return this.currentNotebookEditor?.apiEditor;
    }
    get workspaceFolders() {
        return this._workspaceFolders ?? [filePathToUri('/', this._workspaceFolders)];
    }
    get activeFileDiagnostics() {
        const uri = this.currentEditor?.value.document.uri;
        if (!uri) {
            return [];
        }
        return this._diagnostics.get(uri) ?? [];
    }
    constructor() {
        super();
        this._onDidChangeDiagnostics = this._register(new event_1.Emitter());
        this.onDidChangeDiagnostics = this._onDidChangeDiagnostics.event;
        this._docs = new map_1.ResourceMap();
        this._notebooks = new map_1.ResourceMap();
        this._diagnostics = new map_1.ResourceMap();
        this.currentEditor = undefined;
        this.currentNotebookEditor = undefined;
        this._clear();
    }
    dispose() {
        super.dispose();
        this._clear();
    }
    /**
     * Clear out all fields.
     */
    _clear() {
        this._workspaceState = undefined;
        this._workspaceFolders = undefined;
        this._docs.clear();
        this._notebooks.clear();
        this._diagnostics = new map_1.ResourceMap();
        this.currentEditor = undefined;
        this.currentNotebookEditor = undefined;
    }
    setupServices(testingServiceCollection) {
        testingServiceCollection.define(fileSystemService_1.IFileSystemService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationFileSystemAdaptor, [this]));
        testingServiceCollection.define(workspaceService_1.IWorkspaceService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationWorkspaceService, [this]));
        testingServiceCollection.define(notebookService_1.INotebookService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationNotebookService, [this]));
        testingServiceCollection.define(languageFeaturesService_1.ILanguageFeaturesService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingLanguageService, [this]));
        testingServiceCollection.define(searchService_1.ISearchService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SnapshotSearchService));
        testingServiceCollection.define(tabsAndEditorsService_1.ITabsAndEditorsService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingTabsAndEditorsService, [{
                getActiveTextEditor: () => this.activeTextEditor,
                getVisibleTextEditors: () => this.activeTextEditor ? [this.activeTextEditor] : [],
                getActiveNotebookEditor: () => this.activeNotebookEditor
            }]));
        testingServiceCollection.define(languageDiagnosticsService_1.ILanguageDiagnosticsService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationLanguageDiagnosticsService, [this]));
        testingServiceCollection.define(terminalService_1.ITerminalService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingTerminalService, [this]));
        testingServiceCollection.define(debugOutputService_1.IDebugOutputService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingDebugOutputService, [this]));
        testingServiceCollection.define(gitService_1.IGitService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingGitService, [this]));
        testingServiceCollection.define(dialogService_1.IDialogService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.TestingDialogService));
        testingServiceCollection.define(testDepsResolver_1.ITestDepsResolver, new descriptors_1.SyncDescriptor(testDepsResolver_1.TestDepsResolver));
        testingServiceCollection.define(setupTestDetector_1.ISetupTestsDetector, new descriptors_1.SyncDescriptor(setupTestDetector_1.NullSetupTestsDetector));
        testingServiceCollection.define(workspaceMutationManager_1.IWorkspaceMutationManager, new descriptors_1.SyncDescriptor(nullWorkspaceMutationManager_1.NullWorkspaceMutationManager));
        testingServiceCollection.define(reviewService_1.IReviewService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationReviewService));
        testingServiceCollection.define(alternativeContent_1.IAlternativeNotebookContentService, new descriptors_1.SyncDescriptor(simulationWorkspaceServices_1.SimulationAlternativeNotebookContentService));
        testingServiceCollection.define(alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator, new descriptors_1.SyncDescriptor(alternativeContentEditGenerator_1.AlternativeNotebookContentEditGenerator));
        testingServiceCollection.define(diffService_1.IDiffService, new descriptors_1.SyncDescriptor(diffServiceImpl_1.DiffServiceImpl));
    }
    resetFromDeserializedWorkspaceState(workspaceState) {
        this._clear();
        if (workspaceState) {
            this._workspaceState = workspaceState;
            this._workspaceFolders = workspaceState.workspaceFolders;
            if (workspaceState.activeTextEditor) {
                const sourceDoc = workspaceState.activeTextEditor.document;
                const doc = (0, textDocument_1.createTextDocumentData)(sourceDoc.uri, sourceDoc.getText(), sourceDoc.languageId);
                this.addDocument(doc);
                this.setCurrentDocument(doc.document.uri);
                this.setCurrentSelection(workspaceState.activeTextEditor.selection);
                this.setCurrentVisibleRanges(workspaceState.activeTextEditor.visibleRanges);
            }
            if (workspaceState.textDocumentFilePaths) {
                for (const filePath of workspaceState.textDocumentFilePaths) {
                    if (workspaceState.workspaceFolderPath && workspaceState.workspaceFolders) {
                        const fileContents = fs.readFileSync(path.join(workspaceState.workspaceFolderPath, filePath), 'utf8');
                        const documentUri = uri_1.URI.joinPath(workspaceState.workspaceFolders[0], filePath);
                        const doc = (0, textDocument_1.createTextDocumentData)(documentUri, fileContents, (0, markdown_1.getLanguageId)(documentUri));
                        this.addDocument(doc);
                    }
                }
            }
            if (workspaceState.activeFileDiagnostics && workspaceState.activeFileDiagnostics.length > 0) {
                if (!workspaceState.activeTextEditor) {
                    throw new Error(`Cannot have active file diagnostics without an active text editor!`);
                }
                this.setDiagnostics(new map_1.ResourceMap([
                    [workspaceState.activeTextEditor.document.uri, workspaceState.activeFileDiagnostics]
                ]));
            }
            for (const notebookDoc of workspaceState.__notebookExtHostDocuments) {
                this._notebooks.set(notebookDoc.uri, notebookDoc);
            }
            if (workspaceState.activeNotebookEditor) {
                const sourceDocUri = workspaceState.activeNotebookEditor.notebook.uri;
                this.setCurrentNotebookDocument(this.getNotebook(sourceDocUri));
                this.setCurrentNotebookSelection(workspaceState.activeNotebookEditor.selections);
            }
        }
    }
    resetFromFiles(files, workspaceFolders) {
        this._clear();
        if (workspaceFolders !== undefined) {
            (0, assert_1.default)(workspaceFolders.length > 0, 'workspaceFolders must not be empty');
            this._workspaceFolders = workspaceFolders;
        }
        for (const file of files) {
            if (file.kind === 'qualifiedFile') {
                if (isNotebook(file.uri)) {
                    this._setNotebookFile(file.uri, file.fileContents);
                }
                else {
                    const language = file.languageId ? (0, languages_1.getLanguage)(file.languageId) : getLanguageForFile(file);
                    const doc = (0, textDocument_1.createTextDocumentData)(file.uri, file.fileContents, language.languageId);
                    this._docs.set(doc.document.uri, doc);
                }
            }
            else if (isNotebook(file.fileName)) {
                this._setNotebookFile(this.getUriFromFilePath(file.fileName), file.fileContents);
            }
            else {
                const language = getLanguageForFile(file);
                const doc = (0, textDocument_1.createTextDocumentData)(this.getUriFromFilePath(file.fileName), file.fileContents, language.languageId);
                this._docs.set(doc.document.uri, doc);
            }
        }
    }
    _setNotebookFile(uri, contents) {
        const notebook = notebookDocument_1.ExtHostNotebookDocumentData.createJupyterNotebook(uri, contents);
        for (let index = 0; index < notebook.cells.length; index++) {
            const cell = notebook.cellAt(index);
            this._docs.set(cell.documentData.document.uri, cell.documentData);
        }
        this._notebooks.set(notebook.uri, notebook);
        const doc = (0, textDocument_1.createTextDocumentData)(uri, contents, 'json');
        this._docs.set(doc.document.uri, doc);
    }
    setCurrentDocument(uri) {
        if (uri.toString() === this.currentEditor?.value.document.uri.toString()) {
            // no change
            return;
        }
        const doc = this.getDocument(uri);
        this.currentEditor = new textEditor_1.ExtHostTextEditor(doc.document, [], {}, [], undefined);
    }
    setCurrentDocumentIndentInfo(options) {
        if (!this.currentEditor) {
            throw new Error('cannot set doc indent info before there is a document');
        }
        this.currentEditor?._acceptOptions(options);
    }
    setCurrentSelection(selection) {
        if (this.currentEditor) {
            this.currentEditor._acceptSelections([selection]);
        }
    }
    setCurrentVisibleRanges(visibleRanges) {
        if (this.currentEditor) {
            this.currentEditor._acceptVisibleRanges(visibleRanges);
        }
    }
    setDiagnostics(diagnostics) {
        const changedUris = new map_1.ResourceMap();
        for (const uri of this._diagnostics.keys()) {
            changedUris.set(uri, uri);
        }
        for (const uri of diagnostics.keys()) {
            changedUris.set(uri, uri);
        }
        const changeEvent = {
            uris: Array.from(changedUris.values())
        };
        this._diagnostics = diagnostics;
        this._onDidChangeDiagnostics.fire(changeEvent);
    }
    getDiagnostics(uri) {
        return this._diagnostics.get(uri) ?? [];
    }
    getAllDiagnostics() {
        return Array.from(this._diagnostics.entries());
    }
    getDocument(filePathOrUri) {
        const queryUri = typeof filePathOrUri === 'string' ? this.getUriFromFilePath(filePathOrUri) : filePathOrUri;
        const candidateFile = this._docs.get(queryUri);
        if (!candidateFile) {
            throw new Error(`Missing file ${JSON.stringify(filePathOrUri, null, '\t')}\n\nHave ${Array.from(this._docs.keys()).map(k => k.toString()).join('\n')}`);
        }
        return candidateFile;
    }
    hasDocument(uri) {
        return this._docs.has(uri);
    }
    addDocument(doc) {
        this._docs.set(doc.document.uri, doc);
    }
    hasNotebookDocument(uri) {
        return this._notebooks.has(uri);
    }
    getNotebookDocuments() {
        return Array.from(this._notebooks.values()).map(data => data.document);
    }
    addNotebookDocument(notebook) {
        this._notebooks.set(notebook.uri, notebook);
    }
    tryGetNotebook(filePathOrUri) {
        const queryUri = typeof filePathOrUri === 'string' ? this.getUriFromFilePath(filePathOrUri) : filePathOrUri;
        if (queryUri.scheme === network_1.Schemas.vscodeNotebookCell) {
            // loop through notebooks to find the one matching the path
            for (const notebook of this._notebooks.values()) {
                if (notebook.uri.path === queryUri.path) {
                    // found it
                    return notebook;
                }
            }
        }
        return this._notebooks.get(queryUri);
    }
    getNotebook(filePathOrUri) {
        const candidateFile = this.tryGetNotebook(filePathOrUri);
        if (!candidateFile) {
            throw new Error(`Missing file ${JSON.stringify(filePathOrUri, null, '\t')}\n\nHave ${Array.from(this._docs.keys()).map(k => k.toString()).join('\n')}`);
        }
        return candidateFile;
    }
    setCurrentNotebookDocument(notebook) {
        if (notebook.uri.toString() === this.currentNotebookEditor?.apiEditor.notebook.uri.toString()) {
            // no change
            return;
        }
        const doc = this.getNotebook(notebook.uri);
        this.currentNotebookEditor = new notebookEditor_1.ExtHostNotebookEditor(doc, []);
    }
    setCurrentNotebookSelection(selections) {
        if (this.currentNotebookEditor) {
            this.currentNotebookEditor.apiEditor.selections = selections;
            this.currentNotebookEditor.apiEditor.selection = selections[0];
        }
    }
    getFilePath(uri) {
        return uriToFilePath(uri, this.workspaceFolders);
    }
    getUriFromFilePath(filePath) {
        return filePathToUri(filePath, this.workspaceFolders);
    }
    applyEdits(uri, edits, initialRange) {
        if (uri.toString() === this.currentEditor?.value.document.uri.toString()) {
            return this._applyEditsOnCurrentEditor(this.currentEditor, edits, initialRange);
        }
        const { range } = applyEdits(this.getDocument(uri), edits, initialRange ?? new vscodeTypes_1.Range(0, 0, 0, 0), new vscodeTypes_1.Range(0, 0, 0, 0));
        return range;
    }
    applyNotebookEdits(uri, edits) {
        applyNotebookEdits(this.getNotebook(uri), edits, this);
    }
    _applyEditsOnCurrentEditor(editor, edits, initialRange) {
        const { range, selection } = applyEdits(this.getDocument(editor.value.document.uri), edits, initialRange ?? editor.value.selection, editor.value.selection);
        editor._acceptSelections([selection]);
        return range;
    }
    mapLocation(uri, forWriting = false) {
        if (this.workspaceFolderPath && uri.scheme === network_1.Schemas.file && uri.path.startsWith(simulationWorkspaceServices_1.WORKSPACE_PATH)) {
            const location = vscodeTypes_1.Uri.file(path.join(this.workspaceFolderPath, uri.path.substring(simulationWorkspaceServices_1.WORKSPACE_PATH.length)));
            if (forWriting) {
                console.log('Warning: Writing to simulation folder');
            }
            return location;
        }
        return uri;
    }
}
exports.SimulationWorkspace = SimulationWorkspace;
/**
 * Apply edits to `file` and return the new range and the new selection.
 */
function applyEdits(doc, edits, range, selection) {
    const offsetBasedEdits = edits.map(edit => {
        return {
            range: convertRangeToOffsetBasedRange(doc.document, edit.range),
            text: edit.newText,
        };
    });
    const { fileContents: newFileContents, range: newRange, selection: newSelection, } = doApplyEdits(doc.getText(), offsetBasedEdits, convertRangeToOffsetBasedRange(doc.document, range), convertRangeToOffsetBasedRange(doc.document, selection));
    (0, textDocument_1.setDocText)(doc, newFileContents);
    return {
        range: convertOffsetBasedRangeToSelection(doc.document, newRange),
        selection: convertOffsetBasedRangeToSelection(doc.document, newSelection),
    };
}
/**
 * Apply edits to `notebook`.
 */
function applyNotebookEdits(doc, edits, simulationWorkspace) {
    notebookDocument_1.ExtHostNotebookDocumentData.applyEdits(doc, edits, simulationWorkspace);
}
function convertRangeToOffsetBasedRange(doc, range) {
    const startOffset = doc.offsetAt(range.start);
    const endOffset = doc.offsetAt(range.end);
    return {
        offset: startOffset,
        length: endOffset - startOffset,
    };
}
function convertOffsetBasedRangeToSelection(doc, range) {
    const start = doc.positionAt(range.offset);
    const end = doc.positionAt(range.offset + range.length);
    return new vscodeTypes_1.Selection(start, end);
}
function doApplyEdits(fileContents, edits, range, selection) {
    // Sort edits by start position
    edits.sort((a, b) => {
        return a.range.offset - b.range.offset;
    });
    // Check that edits are not overlapping
    for (let i = 0; i < edits.length - 1; i++) {
        const aRange = edits[i].range;
        const bRange = edits[i + 1].range;
        if (aRange.offset + aRange.length > bRange.offset) {
            throw new Error(`Overlapping edits are not allowed!`);
        }
    }
    // Reduce edits at edges
    for (const edit of edits) {
        const prefixLen = commonPrefixLen(fileContents.substring(edit.range.offset, edit.range.offset + edit.range.length), edit.text);
        edit.range = { offset: edit.range.offset + prefixLen, length: edit.range.length - prefixLen };
        edit.text = edit.text.substring(prefixLen);
        const suffixLen = commonSuffixLen(fileContents.substring(edit.range.offset, edit.range.offset + edit.range.length), edit.text);
        edit.range = { offset: edit.range.offset, length: edit.range.length - suffixLen };
        edit.text = edit.text.substring(0, edit.text.length - suffixLen);
    }
    // Apply edits
    let fileText = fileContents;
    let hasNewSelection = false;
    for (let i = edits.length - 1; i >= 0; i--) {
        const edit = edits[i];
        const { offset, length } = edit.range;
        const editText = edit.text;
        range = adjustRangeAfterEdit(range, edit);
        // apply the edit on the file text
        fileText = fileText.substring(0, offset) + editText + fileText.substring(offset + length);
        if (!hasNewSelection) {
            // selection goes at the end of the inserted text
            const selectionCandidate = { offset: offset + editText.length, length: 0 };
            // a selection is considered only if it is inside the range
            // this is to accomodate edits unrelated to the range
            if (selectionCandidate.offset >= range.offset && selectionCandidate.offset <= range.offset + range.length) {
                selection = selectionCandidate;
                hasNewSelection = true;
            }
        }
    }
    return { fileContents: fileText, range, selection };
}
function adjustRangeAfterEdit(range, edit) {
    const rangeStart = range.offset;
    const rangeEnd = range.offset + range.length;
    const editStart = edit.range.offset;
    const editEnd = edit.range.offset + edit.range.length;
    const editText = edit.text;
    const charDelta = editText.length - edit.range.length;
    if (editEnd < rangeStart) {
        // the edit is before the range, the range is pushed down by the delta
        //                  [---range---]
        //     [---edit---]
        return offsetRangeFromOffsets(rangeStart + charDelta, rangeEnd + charDelta);
    }
    if (editStart <= rangeStart && editEnd <= rangeEnd) {
        // the edit begins before the range, and it intersects the range, but doesn't encompass it
        //                  [---range---]
        //            [---edit---]
        return offsetRangeFromOffsets(editStart, rangeEnd + charDelta);
    }
    if (editStart <= rangeStart && editEnd >= rangeEnd) {
        // the edit begins before the range, and it encompasses the range
        //                  [---range---]
        //            [---edit------------]
        return offsetRangeFromOffsets(editStart, editStart + editText.length);
    }
    if (editStart <= rangeEnd && editEnd <= rangeEnd) {
        // the edit is in the range, and it ends in the range
        //          [-----range-----]
        //            [---edit---]
        return offsetRangeFromOffsets(rangeStart, rangeEnd + charDelta);
    }
    if (editStart <= rangeEnd && editEnd >= rangeEnd) {
        // the edit is in the range, and it ends after the range
        //          [---range---]
        //              [---edit---]
        return offsetRangeFromOffsets(rangeStart, editStart + editText.length);
    }
    if (editStart >= rangeEnd) {
        // the edit begins after the range
        //       [---range---]
        //                      [---edit---]
        return range;
    }
    throw new Error('Unexpected');
}
function offsetRangeFromOffsets(start, end) {
    return { offset: start, length: end - start };
}
function commonPrefixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) {
        i++;
    }
    return i;
}
function commonSuffixLen(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) {
        i++;
    }
    return i;
}
function getLanguageForFile(file) {
    if (file.kind === 'relativeFile') {
        if (file.languageId) {
            return (0, languages_1.getLanguage)(file.languageId);
        }
        return (0, languages_1.getLanguageForResource)(uri_1.URI.from({ scheme: 'fake', 'path': '/' + file.fileName }));
    }
    else {
        return (0, languages_1.getLanguageForResource)(file.uri);
    }
}
//# sourceMappingURL=simulationWorkspace.js.map