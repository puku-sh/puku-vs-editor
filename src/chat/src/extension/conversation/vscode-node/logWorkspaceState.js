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
exports.WorkspaceStateSnapshotHelper = exports.LogWorkspaceStateContribution = void 0;
const vscode = __importStar(require("vscode"));
const debugOutputService_1 = require("../../../platform/debug/common/debugOutputService");
const gitService_1 = require("../../../platform/git/common/gitService");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const languageFeaturesService_1 = require("../../../platform/languages/common/languageFeaturesService");
const tabsAndEditorsService_1 = require("../../../platform/tabs/common/tabsAndEditorsService");
const terminalService_1 = require("../../../platform/terminal/common/terminalService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const arrays_1 = require("../../../util/vs/base/common/arrays");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
let LogWorkspaceStateContribution = class LogWorkspaceStateContribution extends lifecycle_1.Disposable {
    constructor(instantiationService) {
        super();
        // register command "Developer: Log Workbench State"
        this._register(vscode.commands.registerCommand('puku.debug.workbenchState', async () => {
            const symbolQueries = await vscode.window.showInputBox({
                prompt: 'Enter a comma-separated list of symbol queries. Can be left blank if not using WorkspaceSymbols',
            });
            // Show a quick input asking the user for a file name
            const fileName = await vscode.window.showInputBox({
                prompt: 'Enter a file name - .state.json will be appended as the extension',
                value: 'workspaceState',
            });
            if (!fileName) {
                return;
            }
            const state = await instantiationService.createInstance(WorkspaceStateSnapshotHelper).captureWorkspaceStateSnapshot(symbolQueries?.split(',') ?? []);
            // Get workspace root
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri;
            if (!workspaceRoot) {
                return;
            }
            // Write the file
            const fileUri = vscode.Uri.joinPath(workspaceRoot, `${fileName}.state.json`);
            let serializedState = JSON.stringify(state, null, 2);
            // Replace workspaceRoot with `./` to make the file path relative
            serializedState = serializedState.replace(new RegExp(`${workspaceRoot.fsPath}/`, 'g'), './');
            vscode.workspace.fs.writeFile(fileUri, Buffer.from(serializedState));
        }));
    }
};
exports.LogWorkspaceStateContribution = LogWorkspaceStateContribution;
exports.LogWorkspaceStateContribution = LogWorkspaceStateContribution = __decorate([
    __param(0, instantiation_1.IInstantiationService)
], LogWorkspaceStateContribution);
let WorkspaceStateSnapshotHelper = class WorkspaceStateSnapshotHelper {
    /**
     * Constructs a new instance of the PromptContextModel.
     *
     * @param tabAndEditorsService - Service for managing tabs and editors.
     * @param languageDiagnosticService - Service for providing language diagnostics.
     * @param languageService - Service for language features.
     * @param workspaceService - Service for workspace management.
     * @param terminalService - Service for terminal operations.
     * @param debugOutputService - Service for debug output.
     * @param gitService - Service for Git operations.
     */
    constructor(tabAndEditorsService, languageDiagnosticService, languageService, workspaceService, terminalService, debugOutputService, gitService) {
        this.tabAndEditorsService = tabAndEditorsService;
        this.languageDiagnosticService = languageDiagnosticService;
        this.languageService = languageService;
        this.workspaceService = workspaceService;
        this.terminalService = terminalService;
        this.debugOutputService = debugOutputService;
        this.gitService = gitService;
    }
    async captureWorkspaceStateSnapshot(symbolQueries) {
        const workspaceFoldersFilePaths = this.workspaceService.getWorkspaceFolders().map(w => w.fsPath + "/");
        const notebookDocumentFilePaths = this.workspaceService.notebookDocuments.map(d => d.uri.fsPath);
        const symbols = (await Promise.all(symbolQueries.map(q => this.languageService.getWorkspaceSymbols(q)))).flat();
        const serializedSymbols = symbols.map(s => ({
            name: s.name,
            kind: s.kind,
            containerName: s.containerName,
            filePath: s.location.uri.fsPath,
            start: s.location.range.start,
            end: s.location.range.end,
        }));
        const activeFileDiagnostics = !this.tabAndEditorsService.activeTextEditor ? [] : this.languageDiagnosticService.getDiagnostics(this.tabAndEditorsService.activeTextEditor.document.uri).map(d => ({
            start: d.range.start,
            end: d.range.end,
            message: d.message,
            severity: d.severity,
            relatedInformation: d.relatedInformation?.map(serializeRelatedInformation)
        }));
        const activeTextEditor = this.tabAndEditorsService.activeTextEditor ? {
            selections: this.tabAndEditorsService.activeTextEditor?.selections.map(s => ({
                anchor: s.anchor,
                active: s.active,
                isReversed: s.isReversed,
            })) ?? [],
            documentFilePath: this.tabAndEditorsService.activeTextEditor?.document.uri.fsPath ?? '',
            visibleRanges: this.tabAndEditorsService.activeTextEditor?.visibleRanges.map(r => ({
                start: r.start,
                end: r.end
            })) ?? [],
            languageId: this.tabAndEditorsService.activeTextEditor?.document.languageId ?? 'javascript',
        } : undefined;
        const terminalLastCommand = this.terminalService.terminalLastCommand ? {
            commandLine: this.terminalService.terminalLastCommand.commandLine,
            cwd: typeof this.terminalService.terminalLastCommand.cwd === 'object' ? this.terminalService.terminalLastCommand.cwd.toString() : this.terminalService.terminalLastCommand.cwd,
            exitCode: this.terminalService.terminalLastCommand.exitCode,
            output: this.terminalService.terminalLastCommand.output,
        } : undefined;
        const workspaceState = {
            workspaceFoldersFilePaths,
            workspaceFolderFilePath: undefined,
            symbols: serializedSymbols,
            activeFileDiagnostics,
            activeTextEditor,
            debugConsoleOutput: this.debugOutputService.consoleOutput,
            terminalBuffer: this.terminalService.terminalBuffer,
            terminalLastCommand,
            terminalSelection: this.terminalService.terminalSelection,
            terminalShellType: this.terminalService.terminalShellType,
            repoContexts: this.gitService.repositories,
            notebookDocumentFilePaths,
            textDocumentFilePaths: (0, arrays_1.coalesce)(this.workspaceService.textDocuments.map(doc => {
                const parentFolder = this.workspaceService.getWorkspaceFolder(doc.uri);
                return parentFolder ? (0, resources_1.relativePath)(parentFolder, doc.uri) : undefined;
            })),
            activeNotebookEditor: undefined
        };
        return workspaceState;
    }
};
exports.WorkspaceStateSnapshotHelper = WorkspaceStateSnapshotHelper;
exports.WorkspaceStateSnapshotHelper = WorkspaceStateSnapshotHelper = __decorate([
    __param(0, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(1, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(2, languageFeaturesService_1.ILanguageFeaturesService),
    __param(3, workspaceService_1.IWorkspaceService),
    __param(4, terminalService_1.ITerminalService),
    __param(5, debugOutputService_1.IDebugOutputService),
    __param(6, gitService_1.IGitService)
], WorkspaceStateSnapshotHelper);
function serializeRelatedInformation(r) {
    return {
        filePath: r.location.uri.fsPath,
        start: r.location.range.start,
        end: r.location.range.end,
        message: r.message
    };
}
//# sourceMappingURL=logWorkspaceState.js.map