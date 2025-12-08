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
exports.ImportDiagnosticCompletionProvider = exports.ImportDiagnosticCompletionItem = void 0;
const vscode = __importStar(require("vscode"));
const packagejson_1 = require("../../../../../platform/env/common/packagejson");
const documentId_1 = require("../../../../../platform/inlineEdits/common/dataTypes/documentId");
const path_1 = require("../../../../../util/vs/base/common/path");
const resources_1 = require("../../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../../util/vs/base/common/uri");
const textEdit_1 = require("../../../../../util/vs/editor/common/core/edits/textEdit");
const diagnosticsCompletions_1 = require("./diagnosticsCompletions");
class ImportCodeAction {
    get importName() {
        return this._importDetails.importName;
    }
    get importPath() {
        return this._importDetails.importPath;
    }
    get labelShort() {
        return this._importDetails.labelShort;
    }
    get labelDeduped() {
        return this._importDetails.labelDeduped;
    }
    get importSource() {
        return this._importDetails.importSource;
    }
    constructor(codeAction, edit, _importDetails, hasExistingSameFileImport) {
        this.codeAction = codeAction;
        this.edit = edit;
        this._importDetails = _importDetails;
        this.hasExistingSameFileImport = hasExistingSameFileImport;
    }
    compareTo(other) {
        if (this.hasExistingSameFileImport && !other.hasExistingSameFileImport) {
            return -1;
        }
        if (!this.hasExistingSameFileImport && other.hasExistingSameFileImport) {
            return 1;
        }
        if (this.importSource === ImportSource.local && other.importSource !== ImportSource.local ||
            this.importSource !== ImportSource.external && other.importSource === ImportSource.external) {
            return -1;
        }
        if (this.importSource !== ImportSource.local && other.importSource === ImportSource.local ||
            this.importSource === ImportSource.external && other.importSource !== ImportSource.external) {
            return 1;
        }
        if (this.importSource !== ImportSource.unknown && other.importSource !== ImportSource.unknown) {
            const aPathDistance = this.importPath.split('/').length - 1;
            const bPathDistance = other.importPath.split('/').length - 1;
            if (aPathDistance !== bPathDistance) {
                return aPathDistance - bPathDistance;
            }
        }
        return -1;
    }
    toString() {
        return this.codeAction.toString();
    }
}
class ImportDiagnosticCompletionItem extends diagnosticsCompletions_1.DiagnosticCompletionItem {
    static { this.type = 'import'; }
    get importItemName() {
        return this._importCodeAction.importName;
    }
    get importSourceFile() {
        return this._importSourceFile;
    }
    get isLocalImport() {
        switch (this._importCodeAction.importSource) {
            case ImportSource.local: return true;
            case ImportSource.external: return false;
            default: return undefined;
        }
    }
    get hasExistingSameFileImport() {
        return this._importCodeAction.hasExistingSameFileImport;
    }
    constructor(_importCodeAction, diagnostic, _importLabel, workspaceDocument, alternativeImportsCount) {
        super(ImportDiagnosticCompletionItem.type, diagnostic, _importCodeAction.edit, workspaceDocument);
        this._importCodeAction = _importCodeAction;
        this._importLabel = _importLabel;
        this.alternativeImportsCount = alternativeImportsCount;
        this.providerName = 'import';
        let importFilePath;
        if ((0, path_1.isAbsolute)(this._importCodeAction.importPath)) {
            importFilePath = this._importCodeAction.importPath;
        }
        else {
            importFilePath = (0, resources_1.resolvePath)((0, resources_1.dirname)(workspaceDocument.id.toUri()), this._importCodeAction.importPath).path;
        }
        this._importSourceFile = documentId_1.DocumentId.create(importFilePath);
    }
    _getDisplayLocation() {
        const transformer = this._workspaceDocument.value.get().getTransformer();
        return { range: transformer.getRange(this.diagnostic.range), label: this._importLabel };
    }
}
exports.ImportDiagnosticCompletionItem = ImportDiagnosticCompletionItem;
class WorkspaceInformation {
    get nodeModules() {
        return this._nodeModules;
    }
    constructor(_workspaceService, _fileService) {
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._nodeModules = new Set();
        this.tsconfigPaths = {};
    }
    async updateNodeModules() {
        const workspaceFolders = this._workspaceService.getWorkspaceFolders();
        const workspaceNodeModules = await Promise.all(workspaceFolders.map(async (folder) => {
            try {
                const nodeModulesFolder = uri_1.URI.joinPath(folder, 'node_modules');
                // Check if node_modules folder exists
                const resourceStat = await this._fileService.stat(nodeModulesFolder);
                if (resourceStat.type !== vscode.FileType.Directory) {
                    return new Set();
                }
                // Read all node_modules directories
                const entries = await this._fileService.readDirectory(nodeModulesFolder);
                const directories = entries.filter(([_, type]) => type === vscode.FileType.Directory);
                const directoryNames = directories.map(([name, _]) => name);
                return new Set(directoryNames);
            }
            catch {
                return new Set();
            }
        }));
        this._nodeModules = new Set(...workspaceNodeModules);
    }
}
class ImportDiagnosticCompletionProvider {
    static { this.SupportedLanguages = new Set(['typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'python', 'java']); }
    constructor(_tracer, _workspaceService, _fileService) {
        this._tracer = _tracer;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this.providerName = 'import';
        this._importRejectionMap = new Map();
        this._workspaceInfo = new WorkspaceInformation(this._workspaceService, this._fileService);
        this._workspaceInfo.updateNodeModules(); // Only update once on startup
        const javascriptImportHandler = new JavascriptImportHandler();
        const pythonImportHandler = new PythonImportHandler();
        const javaImportHandler = new JavaImportHandler();
        this._importHandlers = new Map([
            ['javascript', javascriptImportHandler],
            ['typescript', javascriptImportHandler],
            ['typescriptreact', javascriptImportHandler],
            ['javascriptreact', javascriptImportHandler],
            ['python', pythonImportHandler],
        ]);
        if (packagejson_1.isPreRelease) {
            this._importHandlers.set('java', javaImportHandler);
        }
    }
    providesCompletionsForDiagnostic(workspaceDocument, diagnostic, language, pos) {
        const importHandler = this._importHandlers.get(language);
        if (!importHandler) {
            return false;
        }
        if (!(0, diagnosticsCompletions_1.isDiagnosticWithinDistance)(workspaceDocument, diagnostic, pos, 12)) {
            return false;
        }
        return importHandler.isImportDiagnostic(diagnostic);
    }
    async provideDiagnosticCompletionItem(workspaceDocument, sortedDiagnostics, pos, logContext, token) {
        const language = workspaceDocument.languageId.get();
        const importDiagnosticToFix = sortedDiagnostics.find(diagnostic => this.providesCompletionsForDiagnostic(workspaceDocument, diagnostic, language, pos));
        if (!importDiagnosticToFix) {
            return null;
        }
        // fetch code actions for missing import
        const startTime = Date.now();
        const availableCodeActions = await workspaceDocument.getCodeActions(importDiagnosticToFix.range, 3, token);
        const resolveCodeActionDuration = Date.now() - startTime;
        if (availableCodeActions === undefined) {
            (0, diagnosticsCompletions_1.log)(`Fetching code actions likely timed out for \`${importDiagnosticToFix.message}\``, logContext, this._tracer);
            return null;
        }
        (0, diagnosticsCompletions_1.log)(`Resolving code actions for \`${importDiagnosticToFix.message}\` took \`${resolveCodeActionDuration}ms\``, logContext, this._tracer);
        const availableImportCodeActions = this._getImportCodeActions(availableCodeActions, workspaceDocument, importDiagnosticToFix, this._workspaceInfo);
        if (availableImportCodeActions.length === 0) {
            (0, diagnosticsCompletions_1.log)('No import code actions found in the available code actions', logContext, this._tracer);
            return null;
        }
        const sortedImportCodeActions = availableImportCodeActions.sort((a, b) => a.compareTo(b));
        (0, diagnosticsCompletions_1.logList)(`Sorted import code actions for \`${importDiagnosticToFix.message}\``, sortedImportCodeActions, logContext, this._tracer);
        for (const codeAction of sortedImportCodeActions) {
            const importCodeActionLabel = availableImportCodeActions.length === 1 && codeAction.importSource !== ImportSource.external ? codeAction.labelShort : codeAction.labelDeduped;
            const item = new ImportDiagnosticCompletionItem(codeAction, importDiagnosticToFix, importCodeActionLabel, workspaceDocument, availableImportCodeActions.length - 1);
            if (this._hasImportBeenRejected(item)) {
                (0, diagnosticsCompletions_1.log)(`Rejected import completion item ${codeAction.labelDeduped} for ${importDiagnosticToFix.toString()}`, logContext, this._tracer);
                logContext.markToBeLogged();
                continue;
            }
            (0, diagnosticsCompletions_1.log)(`Created import completion item ${codeAction.labelDeduped} for ${importDiagnosticToFix.toString()}`, logContext, this._tracer);
            return item;
        }
        return null;
    }
    completionItemRejected(item) {
        let rejectedItems = this._importRejectionMap.get(item.importSourceFile);
        if (rejectedItems === undefined) {
            rejectedItems = new Set();
            this._importRejectionMap.set(item.importSourceFile, rejectedItems);
        }
        rejectedItems.add(item.importItemName);
    }
    isCompletionItemStillValid(item, workspaceDocument) {
        if (this._hasImportBeenRejected(item)) {
            return false;
        }
        return item.diagnostic.range.substring(workspaceDocument.value.get().value) === item.importItemName;
    }
    _hasImportBeenRejected(item) {
        const rejected = this._importRejectionMap.get(item.importSourceFile);
        return rejected?.has(item.importItemName) ?? false;
    }
    _getImportCodeActions(codeActions, workspaceDocument, diagnostic, workspaceInfo) {
        const documentContent = workspaceDocument.value.get();
        const importName = diagnostic.range.substring(documentContent.value);
        const language = workspaceDocument.languageId.get();
        const importHandler = this._importHandlers.get(language);
        if (!importHandler) {
            throw new Error(`No import handler found for language: ${language}`);
        }
        const importCodeActions = [];
        for (const codeAction of codeActions) {
            if (!importHandler.isImportCodeAction(codeAction)) {
                continue;
            }
            if (!codeAction.edits) {
                continue;
            }
            const joinedEdit = textEdit_1.TextReplacement.joinReplacements(codeAction.edits, documentContent);
            // The diagnostic might have changed in the meantime to a different range
            // So we need to get the import name from the referenced diagnostic
            let codeActionImportName = importName;
            if (codeAction.diagnostics && codeAction.diagnostics.length > 0) {
                codeActionImportName = codeAction.diagnostics[0].range.substring(documentContent.value);
            }
            const importDetails = importHandler.getImportDetails(codeAction, codeActionImportName, workspaceInfo);
            if (!importDetails) {
                continue;
            }
            const importCodeAction = new ImportCodeAction(codeAction, joinedEdit, importDetails, !joinedEdit.text.includes('import'));
            if (codeActionImportName.length < 2 || importHandler.isImportInIgnoreList(importCodeAction)) {
                continue;
            }
            importCodeActions.push(importCodeAction);
        }
        return importCodeActions;
    }
}
exports.ImportDiagnosticCompletionProvider = ImportDiagnosticCompletionProvider;
var ImportSource;
(function (ImportSource) {
    ImportSource[ImportSource["local"] = 0] = "local";
    ImportSource[ImportSource["external"] = 1] = "external";
    ImportSource[ImportSource["unknown"] = 2] = "unknown";
})(ImportSource || (ImportSource = {}));
class JavascriptImportHandler {
    static { this.CodeActionTitlePrefixes = ['Add import from', 'Update import from']; }
    static { this.ImportsToIgnore = new Set(['type', 'namespace', 'module', 'declare', 'abstract', 'from', 'of', 'require', 'async']); }
    static { this.ModulesToIgnore = new Set(['node']); }
    isImportDiagnostic(diagnostic) {
        return diagnostic.message.includes('Cannot find name');
    }
    isImportCodeAction(codeAction) {
        return JavascriptImportHandler.CodeActionTitlePrefixes.some(prefix => codeAction.title.startsWith(prefix));
    }
    isImportInIgnoreList(importCodeAction) {
        if (importCodeAction.importSource === ImportSource.local) {
            return false;
        }
        if (importCodeAction.importSource === ImportSource.external && importCodeAction.importPath.includes('/')) {
            return true; // Ignore imports that are from node_modules and point to a subpath
        }
        if (JavascriptImportHandler.ImportsToIgnore.has(importCodeAction.importName)) {
            return true;
        }
        if (JavascriptImportHandler.ModulesToIgnore.has(importCodeAction.importPath.split(':')[0])) {
            return true;
        }
        return false;
    }
    getImportDetails(codeAction, importName, workspaceInfo) {
        const importTitlePrefix = JavascriptImportHandler.CodeActionTitlePrefixes.find(prefix => codeAction.title.startsWith(prefix));
        if (!importTitlePrefix) {
            return null;
        }
        const pathAsInTitle = codeAction.title.substring(importTitlePrefix.length).trim();
        let importPath = pathAsInTitle;
        if ((importPath.startsWith('"') && importPath.endsWith('"')) ||
            (importPath.startsWith("'") && importPath.endsWith("'")) ||
            (importPath.startsWith('`') && importPath.endsWith('`'))) {
            importPath = importPath.slice(1, -1);
        }
        return {
            importName,
            importPath,
            labelShort: `import ${importName}`,
            labelDeduped: `import ${importName} from ${pathAsInTitle}`,
            importSource: this._getImportSource(importPath, workspaceInfo)
        };
    }
    _getImportSource(importPath, workspaceInfo) {
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
            return ImportSource.local;
        }
        // Resolve against tsconfig paths
        for (const [alias, _] of Object.entries(workspaceInfo.tsconfigPaths)) {
            const aliasBase = alias.replace(/\*$/, '');
            if (importPath.startsWith(aliasBase)) {
                return ImportSource.local;
            }
        }
        const potentialNodeModules = [importPath, importPath.split('/')[0], importPath.split(':')[0]];
        if (potentialNodeModules.some(importPath => workspaceInfo.nodeModules.has(importPath))) {
            return ImportSource.external;
        }
        return ImportSource.unknown;
    }
}
class PythonImportHandler {
    isImportDiagnostic(diagnostic) {
        return diagnostic.message.includes('is not defined');
    }
    isImportCodeAction(codeAction) {
        return codeAction.title.startsWith('Add "from') || codeAction.title.startsWith('Add "import');
    }
    isImportInIgnoreList(importCodeAction) {
        return false;
    }
    getImportDetails(codeAction, importName, workspaceInfo) {
        const fromImportMatch = codeAction.title.match(/Add "from\s+(.+?)\s+import\s(.+?)"/);
        if (fromImportMatch) {
            const importPath = fromImportMatch[1];
            const importName = fromImportMatch[2];
            return { importName, importPath, labelDeduped: `import from ${importPath}`, labelShort: `import ${importName}`, importSource: this._getImportSource(importPath) };
        }
        const importAsMatch = codeAction.title.match(/Add "import\s+(.+?)\s+as\s(.+?)"/);
        if (importAsMatch) {
            const importName = importAsMatch[1];
            const importAs = importAsMatch[2];
            return { importName, importPath: importName, labelDeduped: `import ${importName} as ${importAs}`, labelShort: `import ${importName} as ${importAs}`, importSource: ImportSource.unknown };
        }
        const importMatch = codeAction.title.match(/Add "import\s+(.+?)"/);
        if (importMatch) {
            const importName = importMatch[1];
            return { importName, importPath: importName, labelDeduped: `import ${importName}`, labelShort: `import ${importName}`, importSource: ImportSource.unknown };
        }
        return null;
    }
    _getImportSource(importPath) {
        if (importPath.startsWith('.')) {
            return ImportSource.local;
        }
        return ImportSource.unknown;
    }
}
class JavaImportHandler {
    isImportDiagnostic(diagnostic) {
        return String(diagnostic.data.code) === '16777218' || diagnostic.message.endsWith('cannot be resolved to a type');
    }
    isImportCodeAction(codeAction) {
        return codeAction.title.startsWith('Import');
    }
    isImportInIgnoreList(importCodeAction) {
        return false;
    }
    getImportDetails(codeAction, importName, workspaceInfo) {
        return {
            importName,
            importPath: codeAction.title.split(`\'`)[2].trim(),
            labelShort: 'import ' + importName,
            labelDeduped: codeAction.title,
            importSource: ImportSource.unknown
        };
    }
}
//# sourceMappingURL=importDiagnosticsCompletionProvider.js.map