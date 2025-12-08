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
var SimulationTerminal_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestingLanguageService = exports.TestingTerminalService = exports.TestingGitService = exports.TestingDebugOutputService = exports.TestingTabsAndEditorsService = exports.TestingDialogService = exports.SnapshotSearchService = exports.SimulationAlternativeNotebookContentService = exports.SimulationNotebookSummaryTracker = exports.SimulationNotebookService = exports.SimulationReviewService = exports.SimulationFileSystemAdaptor = exports.SimulationLanguageDiagnosticsService = exports.SimulationWorkspaceService = exports.WORKSPACE_PATH = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs/promises"));
const util_1 = require("util");
const glob = __importStar(require("../../../util/common/glob"));
const languages_1 = require("../../../util/common/languages");
const textDocument_1 = require("../../../util/common/test/shims/textDocument");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const async_1 = require("../../../util/vs/base/common/async");
const event_1 = require("../../../util/vs/base/common/event");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const map_1 = require("../../../util/vs/base/common/map");
const observableInternal_1 = require("../../../util/vs/base/common/observableInternal");
const resources_1 = require("../../../util/vs/base/common/resources");
const strings_1 = require("../../../util/vs/base/common/strings");
const uri_1 = require("../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const configurationService_1 = require("../../configuration/common/configurationService");
const fileSystemService_1 = require("../../filesystem/common/fileSystemService");
const fileTypes_1 = require("../../filesystem/common/fileTypes");
const fileSystemServiceImpl_1 = require("../../filesystem/node/fileSystemServiceImpl");
const languageDiagnosticsService_1 = require("../../languages/common/languageDiagnosticsService");
const logService_1 = require("../../log/common/logService");
const alternativeContent_1 = require("../../notebook/common/alternativeContent");
const searchService_1 = require("../../search/common/searchService");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const simulationWorkspace_1 = require("./simulationWorkspace");
exports.WORKSPACE_PATH = `/Users/someone/Projects/proj01/`;
class SimulationWorkspaceService extends workspaceService_1.AbstractWorkspaceService {
    constructor(workspace) {
        super();
        this.workspace = workspace;
        this.onDidOpenTextDocument = event_1.Event.None;
        this.onDidCloseTextDocument = event_1.Event.None;
        this.onDidOpenNotebookDocument = event_1.Event.None;
        this.onDidCloseNotebookDocument = event_1.Event.None;
        this.onDidChangeTextDocument = event_1.Event.None;
        this.onDidChangeWorkspaceFolders = event_1.Event.None;
        this.onDidChangeNotebookDocument = event_1.Event.None;
        this.onDidChangeTextEditorSelection = event_1.Event.None;
    }
    get textDocuments() {
        return this.workspace.documents.map(d => d.document);
    }
    showTextDocument(document) {
        return Promise.resolve();
    }
    async openTextDocument(uri) {
        if (this.workspace.hasDocument(uri)) {
            return this.workspace.getDocument(uri).document;
        }
        if (uri.scheme === 'file') {
            const fileContents = await fs.readFile(this.workspace.mapLocation(uri).fsPath, 'utf8');
            const language = (0, languages_1.getLanguageForResource)(uri);
            const doc = (0, textDocument_1.createTextDocumentData)(uri, fileContents, language.languageId);
            this.workspace.addDocument(doc);
            return doc.document;
        }
        throw new Error(`File not found ${uri.fsPath}`);
    }
    async openNotebookDocument(arg1, arg2) {
        if (typeof arg1 === 'string') {
            // Handle the overload for notebookType and content
            throw new Error('Not implemented');
        }
        else {
            if (this.workspace.hasNotebookDocument(arg1)) {
                return this.workspace.getNotebook(arg1)?.document;
            }
            throw new Error(`Notebook file not found ${arg1.fsPath}`);
        }
    }
    get notebookDocuments() {
        return this.workspace.getNotebookDocuments();
    }
    getWorkspaceFolders() {
        return this.workspace.workspaceFolders;
    }
    getWorkspaceFolderName(workspaceFolderUri) {
        return workspaceFolderUri.path.split('/').pop();
    }
    ensureWorkspaceIsFullyLoaded() {
        // We aren't using virtual workspaces here, so we can just return
        return Promise.resolve();
    }
    async showWorkspaceFolderPicker() {
        return undefined;
    }
    applyEdit(edit) {
        return Promise.resolve(true);
    }
}
exports.SimulationWorkspaceService = SimulationWorkspaceService;
class SimulationLanguageDiagnosticsService extends languageDiagnosticsService_1.AbstractLanguageDiagnosticsService {
    constructor(workspace) {
        super();
        this.workspace = workspace;
        this.onDidChangeDiagnostics = this.workspace.onDidChangeDiagnostics;
        this.getDiagnostics = this.workspace.getDiagnostics.bind(this.workspace);
    }
    getAllDiagnostics() {
        return this.workspace.getAllDiagnostics();
    }
}
exports.SimulationLanguageDiagnosticsService = SimulationLanguageDiagnosticsService;
let SimulationFileSystemAdaptor = class SimulationFileSystemAdaptor {
    constructor(_workspace, _workspaceService) {
        this._workspace = _workspace;
        this._workspaceService = _workspaceService;
        this._time = Date.now();
        this._delegate = new fileSystemServiceImpl_1.NodeFileSystemService();
    }
    async stat(uri) {
        const doc = await this._workspaceService.openTextDocument(uri);
        if (doc) {
            return {
                type: fileTypes_1.FileType.File,
                ctime: this._time,
                mtime: this._time,
                size: new TextEncoder().encode(doc.getText()).byteLength
            };
        }
        return await this._delegate.stat(this._workspace.mapLocation(uri));
    }
    async readFile(uri) {
        const containsDoc = this._workspaceService.textDocuments.some(d => d.uri.toString() === uri.toString());
        if (containsDoc) {
            const doc = await this._workspaceService.openTextDocument(uri);
            return new TextEncoder().encode(doc.getText());
        }
        return await this._delegate.readFile(this._workspace.mapLocation(uri));
    }
    async readDirectory(uri) {
        const uriPath = uri.path.endsWith('/') ? uri.path : `${uri.path}/`;
        if (uriPath.startsWith(exports.WORKSPACE_PATH)) {
            const seen = new Set();
            const result = [];
            for (const document of this._workspaceService.textDocuments) {
                const path = document.uri.path;
                if (path.startsWith(uriPath)) {
                    const [first, remaining] = path.substring(uriPath.length).split('/', 2);
                    if (first && !seen.has(first)) {
                        seen.add(first);
                        result.push([first, remaining === undefined ? fileTypes_1.FileType.File : fileTypes_1.FileType.Directory]);
                    }
                }
            }
            const scenarioFolderLoc = this._workspace.mapLocation(uri);
            if (scenarioFolderLoc) {
                try {
                    const entries = await this._delegate.readDirectory(scenarioFolderLoc);
                    const filter = uriPath === exports.WORKSPACE_PATH ? ((name) => (name.endsWith('.conversation.json') || name.endsWith('.state.json'))) : (() => false);
                    for (const [name, type] of entries) {
                        if (!seen.has(name) && !filter(name)) {
                            seen.add(name);
                            result.push([name, type]);
                        }
                    }
                }
                catch (e) {
                    // ignore non existing folders
                }
            }
            return result;
        }
        return await this._delegate.readDirectory(uri);
    }
    async createDirectory(uri) {
        return await this._delegate.createDirectory(this._workspace.mapLocation(uri, true));
    }
    async writeFile(uri, content) {
        return await this._delegate.writeFile(this._workspace.mapLocation(uri, true), content);
    }
    async delete(uri, options) {
        return await this._delegate.delete(this._workspace.mapLocation(uri, true), options);
    }
    async rename(oldURI, newURI, options) {
        return await this._delegate.rename(this._workspace.mapLocation(oldURI, true), this._workspace.mapLocation(newURI, true), options);
    }
    async copy(source, destination, options) {
        return await this._delegate.copy(this._workspace.mapLocation(source), this._workspace.mapLocation(destination, true), options);
    }
    isWritableFileSystem(scheme) {
        return this._delegate.isWritableFileSystem(scheme);
    }
    createFileSystemWatcher(glob) {
        return this._delegate.createFileSystemWatcher(glob);
    }
};
exports.SimulationFileSystemAdaptor = SimulationFileSystemAdaptor;
exports.SimulationFileSystemAdaptor = SimulationFileSystemAdaptor = __decorate([
    __param(1, workspaceService_1.IWorkspaceService)
], SimulationFileSystemAdaptor);
class SimulationReviewService {
    constructor() {
        this.diagnosticCollection = {
            diagnosticCollection: new Map(),
            get(uri) {
                return this.diagnosticCollection.get(uri.toString());
            },
            set(uri, diagnostics) {
                if (diagnostics?.length) {
                    this.diagnosticCollection.set(uri.toString(), diagnostics);
                }
                else {
                    this.diagnosticCollection.delete(uri.toString());
                }
            }
        };
        this._comments = [];
    }
    updateContextValues() {
    }
    isCodeFeedbackEnabled() {
        if (configurationService_1.ConfigValueValidators.isDefaultValueWithTeamValue(configurationService_1.ConfigKey.CodeFeedback.defaultValue)) {
            return configurationService_1.ConfigKey.CodeFeedback.defaultValue.defaultValue;
        }
        return configurationService_1.ConfigKey.CodeFeedback.defaultValue;
    }
    isReviewDiffEnabled() {
        return false;
    }
    isIntentEnabled() {
        if (configurationService_1.ConfigValueValidators.isDefaultValueWithTeamValue(configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent.defaultValue)) {
            return configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent.defaultValue.defaultValue;
        }
        return configurationService_1.ConfigKey.AdvancedExperimental.ReviewIntent.defaultValue;
    }
    getDiagnosticCollection() {
        return this.diagnosticCollection;
    }
    getReviewComments() {
        return this._comments.slice();
    }
    addReviewComments(comments) {
        this._comments.push(...comments);
    }
    collapseReviewComment(_comment) {
    }
    removeReviewComments(comments) {
        for (const comment of comments) {
            const index = this._comments.indexOf(comment);
            if (index !== -1) {
                this._comments.splice(index, 1);
            }
        }
    }
    updateReviewComment(_comment) {
    }
    findReviewComment(_threadOrComment) {
        return undefined;
    }
    findCommentThread(comment) {
        return undefined;
    }
}
exports.SimulationReviewService = SimulationReviewService;
class SimulationNotebookService {
    constructor(_workspace, _variablesMap = new map_1.ResourceMap()) {
        this._workspace = _workspace;
        this._variablesMap = _variablesMap;
    }
    getCellExecutions(notebook) {
        return [];
    }
    runCells(notebook, range, autoReveal) {
        return Promise.resolve();
    }
    ensureKernelSelected(notebook) {
        return Promise.resolve();
    }
    async getVariables(notebook) {
        return this._variablesMap.get(notebook) ?? [];
    }
    async getPipPackages(notebook) {
        return [];
    }
    setVariables(uri, variables) {
        if (!this._workspace.getNotebook(uri)) {
            return;
        }
        this._variablesMap.set(uri, variables);
    }
    populateNotebookProviders() { }
    hasSupportedNotebooks(uri) {
        if ((0, simulationWorkspace_1.isNotebook)(uri)) {
            return true;
        }
        const KNOWN_NOTEBOOK_TYPES = [
            '.ipynb',
            '.github-issues',
            '.knb'
        ];
        if (KNOWN_NOTEBOOK_TYPES.some(type => uri.path.endsWith(type))) {
            return true;
        }
        return false;
    }
    trackAgentUsage() { }
    setFollowState(state) { }
    getFollowState() {
        return false;
    }
}
exports.SimulationNotebookService = SimulationNotebookService;
class SimulationNotebookSummaryTracker {
    trackNotebook(notebook) {
        //
    }
    clearState(notebook) {
        //
    }
    listNotebooksWithChanges() {
        return [];
    }
}
exports.SimulationNotebookSummaryTracker = SimulationNotebookSummaryTracker;
class SimulationAlternativeNotebookContentService {
    constructor(
    /**
     * Allow tests to override the format of the alternative content provider.
     */
    format = 'json') {
        this.format = format;
    }
    getFormat() {
        return this.format;
    }
    create(format) {
        return (0, alternativeContent_1.getAlternativeNotebookDocumentProvider)(format);
    }
}
exports.SimulationAlternativeNotebookContentService = SimulationAlternativeNotebookContentService;
let SnapshotSearchService = class SnapshotSearchService extends searchService_1.AbstractSearchService {
    constructor(fileSystemService, workspaceService) {
        super();
        this.fileSystemService = fileSystemService;
        this.workspaceService = workspaceService;
    }
    async findTextInFiles(query, options, progress, token) {
        const uris = await this.findFiles(options.include ?? '**/*', { exclude: options.exclude ? [options.exclude] : undefined, maxResults: options.maxResults }, token);
        const maxResults = options.maxResults ?? Number.MAX_SAFE_INTEGER;
        let count = 0;
        for (const uri of uris) {
            const doc = await this.workspaceService.openTextDocument(uri);
            count += this._search(query, doc, progress);
            if (count >= maxResults) {
                break;
            }
        }
        return Promise.resolve({
            limitHit: count >= maxResults,
            message: undefined
        });
    }
    findTextInFiles2(query, options, token) {
        const iterableSource = new async_1.AsyncIterableSource();
        const doSearch = async () => {
            const uris = await this.findFiles(options?.include ?? ['**/*'], { exclude: options?.exclude, maxResults: options?.maxResults }, token);
            const maxResults = options?.maxResults ?? Number.MAX_SAFE_INTEGER;
            let count = 0;
            try {
                for (const uri of uris) {
                    const doc = await this.workspaceService.openTextDocument(uri);
                    count += this._search2(query, doc, iterableSource);
                    if (count >= maxResults) {
                        break;
                    }
                }
            }
            catch {
                // I can't figure out why errors here fire 'unhandledrejection' so just swallow them
            }
            return {
                limitHit: count >= maxResults
            };
        };
        const completePromise = doSearch();
        completePromise.catch(() => { });
        completePromise.finally(() => iterableSource.resolve());
        return {
            complete: completePromise,
            results: iterableSource.asyncIterable
        };
    }
    _search2(query, document, iterableSource) {
        return this._search(query, document, {
            report: match => {
                iterableSource.emitOne({
                    uri: match.uri,
                    previewText: match.preview.text,
                    ranges: [{
                            previewRange: (0, arrays_1.asArray)(match.preview.matches)[0],
                            sourceRange: (0, arrays_1.asArray)(match.ranges)[0]
                        }]
                });
            }
        });
    }
    _search(query, document, progress) {
        let matches = 0;
        const r = (0, strings_1.createRegExp)(query.pattern, query.isRegExp ?? false, {
            global: true,
            matchCase: query.isCaseSensitive,
            wholeWord: query.isWordMatch,
            multiline: query.isMultiline
        });
        const text = document.getText();
        let m;
        while (m = r.exec(text)) {
            matches += 1;
            const start = m.index;
            const end = m.index + m[0].length;
            const range = new vscodeTypes_1.Range(document.positionAt(start), document.positionAt(end));
            const fullLine = document.lineAt(range.start.line).text;
            const relativeRange = new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, range.start.character), new vscodeTypes_1.Position(range.end.line - range.start.line, range.end.character));
            progress.report({
                uri: document.uri,
                ranges: range,
                preview: {
                    text: fullLine,
                    matches: [relativeRange]
                }
            });
        }
        return matches;
    }
    async findFiles(filePattern, options, token) {
        const filePatterns = (0, arrays_1.asArray)(filePattern);
        const out = [];
        const processDir = async (dir, workspaceRoot) => {
            if (token?.isCancellationRequested) {
                return;
            }
            let entries;
            try {
                entries = await this.fileSystemService.readDirectory(dir);
            }
            catch (e) {
                console.log(e);
                return;
            }
            const toRelativePattern = (pattern) => {
                if (typeof pattern === 'string') {
                    return new fileTypes_1.RelativePattern(workspaceRoot, pattern);
                }
                else {
                    return pattern;
                }
            };
            for (const [name, type] of entries) {
                const uri = uri_1.URI.joinPath(dir, name);
                if (type === fileTypes_1.FileType.File) {
                    if (filePatterns.some(pattern => glob.isMatch(uri, toRelativePattern(pattern)))) {
                        if (!options?.exclude || !options.exclude.some(e => glob.isMatch(uri, e))) {
                            out.push(uri);
                        }
                    }
                }
                else if (type === fileTypes_1.FileType.Directory) {
                    await processDir(uri, workspaceRoot);
                }
            }
        };
        for (const root of this.workspaceService.getWorkspaceFolders()) {
            await processDir(root, root);
        }
        return out;
    }
};
exports.SnapshotSearchService = SnapshotSearchService;
exports.SnapshotSearchService = SnapshotSearchService = __decorate([
    __param(0, fileSystemService_1.IFileSystemService),
    __param(1, workspaceService_1.IWorkspaceService)
], SnapshotSearchService);
class TestingDialogService {
    showQuickPick(items, options, token) {
        throw new Error('Method not implemented.');
    }
    showOpenDialog(options) {
        throw new Error('Method not implemented.');
    }
}
exports.TestingDialogService = TestingDialogService;
class TestingTabsAndEditorsService {
    constructor(delegate) {
        this.onDidChangeActiveTextEditor = event_1.Event.None;
        this.onDidChangeTabs = event_1.Event.None;
        this.delegate = delegate;
    }
    get activeTextEditor() {
        return this.delegate.getActiveTextEditor();
    }
    get visibleTextEditors() {
        return this.delegate.getVisibleTextEditors();
    }
    get activeNotebookEditor() {
        return this.delegate.getActiveNotebookEditor();
    }
    get visibleNotebookEditors() {
        return this.activeNotebookEditor ? [this.activeNotebookEditor] : [];
    }
    get tabs() {
        if (!this.activeTextEditor) {
            return [];
        }
        const tab = {
            group: null,
            isActive: true,
            input: { uri: this.activeTextEditor.document.uri },
            isDirty: this.activeTextEditor.document.isDirty,
            isPinned: false,
            isPreview: false,
            label: `TESTING ${this.activeTextEditor.document.fileName}`,
        };
        return [{ tab, uri: this.activeTextEditor.document.uri }];
    }
}
exports.TestingTabsAndEditorsService = TestingTabsAndEditorsService;
class TestingDebugOutputService {
    get consoleOutput() {
        return this._workspace.debugConsoleOutput ?? '';
    }
    constructor(_workspace) {
        this._workspace = _workspace;
    }
}
exports.TestingDebugOutputService = TestingDebugOutputService;
class TestingGitService {
    constructor(_workspace, _createImplicitRepos = true) {
        this._workspace = _workspace;
        this._createImplicitRepos = _createImplicitRepos;
        this.activeRepository = (0, observableInternal_1.observableValue)(this, undefined);
        this.onDidOpenRepository = event_1.Event.None;
        this.onDidCloseRepository = event_1.Event.None;
        this.onDidFinishInitialization = event_1.Event.None;
        this.isInitialized = true;
    }
    dispose() {
        return;
    }
    async log() {
        return [];
    }
    // TODO implement later if tests use this, only used by ignore service
    getRepository(uri) {
        return Promise.resolve(undefined);
    }
    getRepositoryFetchUrls(uri) {
        return Promise.resolve(undefined);
    }
    async initialize() {
        return undefined;
    }
    get repositories() {
        const workspaceFolderPath = this._workspace.workspaceFolderPath
            ? uri_1.URI.file(this._workspace.workspaceFolderPath)
            : this._workspace.workspaceFolders[0];
        const workspaceStateRepos = this._workspace.repositories;
        if (workspaceStateRepos) {
            return (0, arrays_1.coalesce)(workspaceStateRepos.map((repo) => {
                if (!repo) {
                    return repo;
                }
                return {
                    ...repo,
                    // rootUri is not set on some serialized repos
                    rootUri: repo.rootUri
                        ? uri_1.URI.revive(repo.rootUri)
                        : workspaceFolderPath
                };
            }));
        }
        if (this._createImplicitRepos) {
            return [{
                    rootUri: workspaceFolderPath,
                    headBranchName: undefined,
                    headCommitHash: undefined,
                    upstreamBranchName: undefined,
                    upstreamRemote: undefined,
                    isRebasing: false,
                    remoteFetchUrls: [
                        `https://github.com/microsoft/simuluation-test-${(0, resources_1.basename)(workspaceFolderPath)}`
                    ],
                    remotes: [],
                    changes: undefined,
                    headBranchNameObs: (0, observableInternal_1.constObservable)(undefined),
                    headCommitHashObs: (0, observableInternal_1.constObservable)(undefined),
                    upstreamBranchNameObs: (0, observableInternal_1.constObservable)(undefined),
                    upstreamRemoteObs: (0, observableInternal_1.constObservable)(undefined),
                    isRebasingObs: (0, observableInternal_1.constObservable)(false),
                    isIgnored: async () => false,
                }];
        }
        return [];
    }
    async diffBetween(uri, ref1, ref2) {
        return [];
    }
    async diffWith(uri, ref) {
        return undefined;
    }
    async diffIndexWithHEADShortStats(uri) {
        return undefined;
    }
    async fetch(uri, remote, ref, depth) {
        return;
    }
    async getMergeBase(uri, ref1, ref2) {
        return undefined;
    }
    async add(uri, paths) {
        return;
    }
}
exports.TestingGitService = TestingGitService;
let TestingTerminalService = class TestingTerminalService extends lifecycle_1.Disposable {
    constructor(_workspace, instantiationService) {
        super();
        this._workspace = _workspace;
        this.instantiationService = instantiationService;
        this._onDidChangeTerminalShellIntegration = this._register(new event_1.Emitter());
        this.onDidChangeTerminalShellIntegration = this._onDidChangeTerminalShellIntegration.event;
        this._onDidEndTerminalShellExecution = this._register(new event_1.Emitter());
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this.onDidCloseTerminal = event_1.Event.None;
        this.onDidWriteTerminalData = event_1.Event.None;
        this.sessionTerminals = new Map();
    }
    get terminals() {
        return [];
    }
    createTerminal(nameOrOpts, shellPath, shellArgs) {
        const options = typeof nameOrOpts === 'string' || nameOrOpts === undefined ?
            { name: nameOrOpts, shellPath, shellArgs } :
            nameOrOpts;
        if ('pty' in options) {
            throw new Error('Not implemented');
        }
        const terminal = this._register(this.instantiationService.createInstance(SimulationTerminal, options, this._workspace));
        this._register(terminal.shellIntegration.onDidEndTerminalShellExecution(e => this._onDidEndTerminalShellExecution.fire(e)));
        setTimeout(() => {
            this._onDidChangeTerminalShellIntegration.fire({ terminal, shellIntegration: terminal.shellIntegration });
        });
        return terminal;
    }
    getCwdForSession(sessionId) {
        return Promise.resolve(undefined);
    }
    associateTerminalWithSession(terminal, sessionId, id, shellIntegrationQuality) {
        const terms = this.sessionTerminals.get(sessionId);
        if (terms) {
            terms.push({ terminal, shellIntegrationQuality, id });
        }
        else {
            this.sessionTerminals.set(sessionId, [{ terminal, shellIntegrationQuality, id }]);
        }
        return Promise.resolve();
    }
    getCopilotTerminals(sessionId) {
        return Promise.resolve(this.sessionTerminals.get(sessionId)?.map(t => { return { ...t.terminal, id: t.id }; }) || []);
    }
    getToolTerminalForSession(sessionId) {
        return Promise.resolve(this.sessionTerminals.get(sessionId)?.at(0));
    }
    getLastCommandForTerminal(terminal) {
        return undefined;
    }
    get terminalBuffer() {
        return this._workspace.terminalBuffer ?? '';
    }
    get terminalLastCommand() {
        return this._workspace.terminalLastCommand;
    }
    get terminalSelection() {
        return this._workspace.terminalSelection ?? '';
    }
    get terminalShellType() {
        return this._workspace.terminalShellType ?? '';
    }
    getBufferForTerminal(terminal, maxChars) {
        return '';
    }
    getBufferWithPid(pid, maxChars) {
        throw new Error('Method not implemented.');
    }
    contributePath(contributor, pathLocation, description) {
        // No-op for test service
    }
    removePathContribution(contributor) {
        // No-op for test service
    }
};
exports.TestingTerminalService = TestingTerminalService;
exports.TestingTerminalService = TestingTerminalService = __decorate([
    __param(1, instantiation_1.IInstantiationService)
], TestingTerminalService);
let SimulationTerminal = class SimulationTerminal extends lifecycle_1.Disposable {
    static { SimulationTerminal_1 = this; }
    static { this.NextPID = 0; }
    constructor(creationOptions, workspace, instantiationService) {
        super();
        this.creationOptions = creationOptions;
        this.instantiationService = instantiationService;
        this.processId = Promise.resolve(SimulationTerminal_1.NextPID++);
        this.name = creationOptions.name ?? '';
        this.state = { isInteractedWith: false, shell: undefined };
        const cwd = creationOptions.cwd ?? workspace.workspaceFolders[0];
        if (typeof cwd === 'string') {
            throw new Error('String cwd not implemented');
        }
        this.shellIntegration = this._register(this.instantiationService.createInstance(SimulationTerminalShellIntegration, cwd, workspace, this));
    }
    sendText(text, shouldExecute = true) {
        throw new Error('Method not implemented.');
    }
    show(preserveFocus = true) {
        // no-op
    }
    hide() {
        // no-op
    }
};
SimulationTerminal = SimulationTerminal_1 = __decorate([
    __param(2, instantiation_1.IInstantiationService)
], SimulationTerminal);
let SimulationTerminalShellIntegration = class SimulationTerminalShellIntegration extends lifecycle_1.Disposable {
    constructor(cwd, workspace, terminal, instantiationService) {
        super();
        this.cwd = cwd;
        this.workspace = workspace;
        this.terminal = terminal;
        this.instantiationService = instantiationService;
        this._onDidEndTerminalShellExecution = this._register(new event_1.Emitter());
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
        this.cwd = cwd && workspace.mapLocation(cwd);
    }
    executeCommand(command, args) {
        if (args) {
            command = `${command} ${args.join(' ')}`;
        }
        const exe = this._register(this.instantiationService.createInstance(SimulationTerminalShellExecution, { value: command, confidence: vscodeTypes_1.TerminalShellExecutionCommandLineConfidence.High, isTrusted: true }, this.cwd, this.workspace));
        this._register(exe.onDidEndTerminalShellExecution(() => {
            this._onDidEndTerminalShellExecution.fire({ terminal: this.terminal, shellIntegration: this, execution: exe, exitCode: undefined });
        }));
        return exe;
    }
};
SimulationTerminalShellIntegration = __decorate([
    __param(3, instantiation_1.IInstantiationService)
], SimulationTerminalShellIntegration);
let SimulationTerminalShellExecution = class SimulationTerminalShellExecution extends lifecycle_1.Disposable {
    constructor(commandLine, cwd, workspace, logService) {
        super();
        this.commandLine = commandLine;
        this.cwd = cwd;
        this.workspace = workspace;
        this.logService = logService;
        this._onDidEndTerminalShellExecution = new event_1.Emitter();
        this.onDidEndTerminalShellExecution = this._onDidEndTerminalShellExecution.event;
    }
    async run() {
        const fakeWorkspacePath = this.workspace.workspaceFolders[0].fsPath.replace(/\/$/, '');
        const realWorkspacePath = this.workspace.mapLocation(this.workspace.workspaceFolders[0]).fsPath.replace(/\/$/, '');
        try {
            let command = this.commandLine.value;
            this.logService.trace(`Original command: ${command}`);
            command = command.replaceAll(fakeWorkspacePath, realWorkspacePath);
            this.logService.trace(`Command with replaced workspace path: ${command}`);
            const execPromise = (0, util_1.promisify)(child_process_1.exec);
            const execP = execPromise(command, { cwd: this.cwd?.fsPath });
            const result = await (0, async_1.raceTimeout)(execP, 600_000);
            let output = result ? result.stdout + result.stderr : undefined;
            this.logService.trace(`Done executing command: ${command}`);
            let resultStr;
            try {
                resultStr = !result ? String(result) : JSON.stringify(result);
            }
            catch (e) {
                resultStr = `cannot stringify result: ${e}. Result: ${result}`;
            }
            this.logService.trace(`Result: ${resultStr}`);
            if (output) {
                this.logService.trace(`Original output: ${output}`);
                output = output.replaceAll(realWorkspacePath, fakeWorkspacePath);
                this.logService.trace(`Output with replaced workspace path: ${output}`);
            }
            return output;
        }
        catch (e) {
            let msg = '';
            if (e.stdout) {
                msg += e.stdout;
            }
            if (e.stderr) {
                msg += e.stderr;
            }
            if (!msg) {
                msg = e instanceof Error ? e.message : String(e);
            }
            this.logService.trace(`Original error message: ${msg}`);
            msg = msg.replaceAll(realWorkspacePath, fakeWorkspacePath);
            this.logService.trace(`Error message with replaced workspace path: ${msg}`);
            return msg;
        }
    }
    async *read() {
        this.logService.trace(`SimulationTerminalShellExecution: read()`);
        const result = await this.run();
        this.logService.trace(`SimulationTerminalShellExecution: result: ${result}`);
        if (result) {
            yield result;
        }
        this.logService.trace(`SimulationTerminalShellExecution: firing end event`);
        this._onDidEndTerminalShellExecution.fire();
    }
};
SimulationTerminalShellExecution = __decorate([
    __param(3, logService_1.ILogService)
], SimulationTerminalShellExecution);
class TestingLanguageService {
    constructor(_workspace) {
        this._workspace = _workspace;
    }
    async getWorkspaceSymbols(query) {
        return this._workspace.workspaceSymbols?.filter(s => s.name.includes(query)) ?? [];
    }
    async getDefinitions(uri, position) {
        throw new Error('Method not implemented.');
    }
    async getImplementations(uri, position) {
        throw new Error('Method not implemented.');
    }
    async getReferences(uri, position) {
        throw new Error('Method not implemented.');
    }
    async getDocumentSymbols(uri) {
        throw new Error('Method not implemented.');
    }
    getDiagnostics(uri) {
        return [];
    }
}
exports.TestingLanguageService = TestingLanguageService;
//# sourceMappingURL=simulationWorkspaceServices.js.map