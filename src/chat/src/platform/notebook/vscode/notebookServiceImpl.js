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
exports.NotebookService = exports.NOTEBOOK_ALTERNATIVE_CONTENT_SCHEME = void 0;
const vscode_1 = require("vscode");
const notebooks_1 = require("../../../util/common/notebooks");
const configurationService_1 = require("../../configuration/common/configurationService");
const logService_1 = require("../../log/common/logService");
const nullExperimentationService_1 = require("../../telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../workspace/common/workspaceService");
const notebookExectionServiceImpl_1 = require("./notebookExectionServiceImpl");
exports.NOTEBOOK_ALTERNATIVE_CONTENT_SCHEME = 'alternative-notebook-content';
const NOTEBOOK_AGENT_USAGE_KEY = 'puku.notebookAgentModeUsage';
let NotebookService = class NotebookService {
    get isVariableFilteringEnabled() {
        return this._isVariableFilteringEnabled;
    }
    constructor(_configurationService, _experimentationService, _workspaceService, _logger) {
        this._configurationService = _configurationService;
        this._experimentationService = _experimentationService;
        this._workspaceService = _workspaceService;
        this._logger = _logger;
        this._cellExecution = new Map();
        this._cellSymbols = new WeakMap();
        this._executionService = new notebookExectionServiceImpl_1.NotebookExecutionServiceImpl();
        this._disposables = [];
        this._isVariableFilteringEnabled = false;
        this._notebookEditorContribInitFlag = false;
        this._notebookEditorContributions = [];
        this.followExecutionState = false;
        this._isVariableFilteringEnabled = this._experimentationService.getTreatmentVariable('copilotchat.notebookVariableFiltering')
            || this._configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.NotebookVariableFilteringEnabled);
        this._registerExecutionListener();
    }
    _hasJupyterExtension() {
        return vscode_1.extensions.getExtension('ms-toolsai.jupyter')?.isActive;
    }
    trackAgentUsage() {
        vscode_1.commands.executeCommand('setContext', NOTEBOOK_AGENT_USAGE_KEY, true);
    }
    setFollowState(state) {
        this.followExecutionState = state;
    }
    getFollowState() {
        return this.followExecutionState;
    }
    async getVariables(notebook) {
        if (!this._hasJupyterExtension()) {
            try {
                const results = await vscode_1.commands.executeCommand('vscode.executeNotebookVariableProvider', notebook);
                if (results && Array.isArray(results)) {
                    const variableResults = results.map(this._convertResult);
                    return this._filterVariables(notebook, variableResults);
                }
                return [];
            }
            catch (_ex) {
                this._logger.error(`Failed to get notebook variables (vscode.executeNotebookVariableProvider) for ${notebook.toString()}: ${_ex}`);
                return [];
            }
        }
        try {
            const results = await vscode_1.commands.executeCommand('jupyter.listVariables', notebook);
            if (results && Array.isArray(results)) {
                const variableResults = results.map(this._convertResult);
                return this._filterVariables(notebook, variableResults);
            }
            return [];
        }
        catch (_ex) {
            this._logger.error(`Failed to get notebook variables (jupyter.listVariables) for ${notebook.toString()}: ${_ex}`);
            return [];
        }
    }
    _convertResult(result) {
        if ('variable' in result) {
            return result;
        }
        else {
            return {
                variable: result,
                hasNamedChildren: false,
                indexedChildrenCount: 0
            };
        }
    }
    _filterVariables(notebook, variables) {
        if (!this.isVariableFilteringEnabled) {
            return variables;
        }
        const symbolNames = new Set();
        (0, notebooks_1.findNotebook)(notebook, vscode_1.workspace.notebookDocuments)?.getCells().forEach(cell => {
            const cellSymbols = this._cellSymbols.get(cell);
            if (cellSymbols) {
                cellSymbols.forEach(symbol => symbolNames.add(symbol.name));
            }
        });
        return variables.filter(v => symbolNames.has(v.variable.name));
    }
    async getPipPackages(notebook) {
        if (!this._hasJupyterExtension()) {
            return [];
        }
        try {
            const packages = await vscode_1.commands.executeCommand('jupyter.listPipPackages', notebook);
            return packages;
        }
        catch (_ex) {
            this._logger.error(`Failed to get pip packages (jupyter.listPipPackages) for ${notebook.toString()}: ${_ex}`);
            return [];
        }
    }
    setVariables(notebook, variables) {
        // no op
    }
    //#region Notebook Support
    populateNotebookEditorContributions() {
        const notebookContributions = [];
        const exts = vscode_1.extensions.all;
        for (const extension of exts) {
            const contrib = extension.packageJSON.contributes?.notebooks;
            if (Array.isArray(contrib)) {
                notebookContributions.push(...contrib);
            }
        }
        for (const contrib of notebookContributions) {
            if ((0, notebooks_1.isNotebookEditorContribution)(contrib)) {
                this._notebookEditorContributions.push(contrib);
            }
        }
    }
    hasSupportedNotebooks(uri) {
        if (!this._notebookEditorContribInitFlag) {
            this.populateNotebookEditorContributions();
            this._notebookEditorContribInitFlag = true;
        }
        const editorAssociationObjects = this._configurationService.getNonExtensionConfig('workbench.editorAssociations');
        const validatedEditorAssociations = (0, notebooks_1.extractEditorAssociation)(editorAssociationObjects ?? {});
        const res = (0, notebooks_1._hasSupportedNotebooks)(uri, this._workspaceService.notebookDocuments, this._notebookEditorContributions, validatedEditorAssociations);
        return res;
    }
    //#endregion
    //#region Execution Summary
    _registerExecutionListener() {
        this._disposables.push(this._executionService.onDidChangeNotebookCellExecutionState(e => {
            const cell = e.cell;
            const notebookUri = cell.notebook.uri;
            const notebookUriString = notebookUri.toString();
            let cellExecutionList = this._cellExecution.get(notebookUriString);
            if (!cellExecutionList) {
                cellExecutionList = [];
                this._cellExecution.set(notebookUriString, cellExecutionList);
            }
            const index = cellExecutionList.findIndex(item => item.cell === cell);
            if (index !== -1) {
                // we are executing cell again
                // remove it from the list first
                cellExecutionList.splice(index, 1);
            }
            cellExecutionList.push({ cell, executionCount: cell.executionSummary?.executionOrder });
        }));
        this._disposables.push(vscode_1.workspace.onDidChangeNotebookDocument(e => {
            if (!this.isVariableFilteringEnabled) {
                return;
            }
            for (const cellChange of e.cellChanges) {
                if (cellChange.executionSummary) {
                    const executionSummary = cellChange.executionSummary;
                    if (executionSummary.success) {
                        // finished execution
                        vscode_1.commands.executeCommand('vscode.executeDocumentSymbolProvider', cellChange.cell.document.uri).then(symbols => {
                            this._cellSymbols.set(cellChange.cell, symbols || []);
                        });
                    }
                }
                if (cellChange.document) {
                    // content changed
                    this._cellSymbols.delete(cellChange.cell);
                }
            }
            for (const contentChange of e.contentChanges) {
                contentChange.removedCells.forEach(cell => { this._cellSymbols.delete(cell); });
            }
        }));
    }
    getCellExecutions(notebook) {
        return this._cellExecution.get(notebook.toString())?.map(e => e.cell) || [];
    }
    async runCells(notebookUri, range, autoReveal) {
        await vscode_1.commands.executeCommand('notebook.cell.execute', {
            ranges: [range],
            document: notebookUri,
            autoReveal: autoReveal,
        });
    }
    async ensureKernelSelected(notebookUri) {
        if (vscode_1.window.visibleNotebookEditors.find(editor => editor.notebook.uri.toString() === notebookUri.toString())) {
            await vscode_1.commands.executeCommand('notebook.selectKernel', {
                notebookUri,
                skipIfAlreadySelected: true,
            });
        }
    }
    //#endregion
    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
};
exports.NotebookService = NotebookService;
exports.NotebookService = NotebookService = __decorate([
    __param(0, configurationService_1.IConfigurationService),
    __param(1, nullExperimentationService_1.IExperimentationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, logService_1.ILogService)
], NotebookService);
//# sourceMappingURL=notebookServiceImpl.js.map