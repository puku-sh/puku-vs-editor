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
exports.NotebookSummary = exports.NotebookSummaryTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookSummaryTracker_1 = require("../../../platform/notebook/common/notebookSummaryTracker");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../util/common/notebooks");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const notebookVariables_1 = require("../../prompts/node/panel/notebookVariables");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const logService_1 = require("../../../platform/log/common/logService");
let NotebookSummaryTool = class NotebookSummaryTool {
    static { this.toolName = toolNames_1.ToolName.GetNotebookSummary; }
    constructor(promptPathRepresentationService, instantiationService, workspaceService, alternativeNotebookContent, notebookStructureTracker, notebookService, logger) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.notebookStructureTracker = notebookStructureTracker;
        this.notebookService = notebookService;
        this.logger = logger;
    }
    async invoke(options, token) {
        this.logger.trace(`Invoking Notebook Summary Tool for file ${options.input.filePath}`);
        let uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        if (!uri) {
            throw new Error(`Invalid file path`);
        }
        // Sometimes we get the notebook cell Uri in the resource.
        // Resolve this to notebook.
        let notebook = (0, notebooks_1.findNotebook)(uri, this.workspaceService.notebookDocuments);
        if (notebook) {
            uri = notebook.uri;
        }
        else if (!this.notebookService.hasSupportedNotebooks(uri)) {
            throw new Error(`Use this tool only with Notebook files, the file ${uri.toString()} is not a notebook.`);
        }
        try {
            notebook = notebook || await this.workspaceService.openNotebookDocument(uri);
        }
        catch (ex) {
            this.logger.error(`Failed to open notebook: ${uri.toString()}`, ex);
            throw new Error(`Failed to open the notebook ${uri.toString()}, ${ex.message || ''}. Verify the file exists.`);
        }
        if (token.isCancellationRequested) {
            return;
        }
        this.notebookStructureTracker.trackNotebook(notebook);
        this.notebookStructureTracker.clearState(notebook);
        const format = this.alternativeNotebookContent.getFormat(this.promptContext?.request?.model);
        const altDoc = this.alternativeNotebookContent.create(format).getAlternativeDocument(notebook);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, NotebookSummary, { notebook, altDoc, includeCellLines: true }, 
            // If we are not called with tokenization options, have _some_ fake tokenizer
            // otherwise we end up returning the entire document
            options.tokenizationOptions ?? {
                tokenBudget: 1000,
                countTokens: (t) => Promise.resolve(t.length * 3 / 4)
            }, token))
        ]);
    }
    async resolveInput(input, promptContext) {
        this.promptContext = promptContext;
        return input;
    }
    prepareInvocation(options, token) {
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Retrieving Notebook summary.`)
        };
    }
};
exports.NotebookSummaryTool = NotebookSummaryTool;
exports.NotebookSummaryTool = NotebookSummaryTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, alternativeContent_1.IAlternativeNotebookContentService),
    __param(4, notebookSummaryTracker_1.INotebookSummaryTracker),
    __param(5, notebookService_1.INotebookService),
    __param(6, logService_1.ILogService)
], NotebookSummaryTool);
toolsRegistry_1.ToolRegistry.registerTool(NotebookSummaryTool);
let NotebookSummary = class NotebookSummary extends prompt_tsx_1.PromptElement {
    constructor(props, alternativeNotebookContent, promptPathRepresentationService, logger) {
        super(props);
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.logger = logger;
    }
    async render(state, sizing) {
        try {
            return (vscpp(vscppf, null,
                this.getSummary(),
                vscpp("br", null),
                vscpp(notebookVariables_1.NotebookVariables, { notebook: this.props.notebook })));
        }
        catch (ex) {
            this.logger.error(`Error rendering NotebookSummary prompt element for notebook ${this.props.notebook.uri.toString()}`, ex);
            throw ex;
        }
    }
    getSummary() {
        this.logger.trace(`Generating notebook summary for ${this.props.notebook.uri.toString()}`);
        const hasAnyCellBeenExecuted = this.props.notebook.getCells().some(cell => cell.executionSummary?.executionOrder !== undefined && cell.executionSummary?.timing);
        const altDoc = this.props.altDoc;
        const includeCellLines = this.props.includeCellLines && !!altDoc;
        return (vscpp(vscppf, null,
            "Below is a summary of the notebook ",
            this.promptPathRepresentationService.getFilePath(this.props.notebook.uri),
            ":",
            vscpp("br", null),
            hasAnyCellBeenExecuted ? 'The execution count can be used to determine the order in which the cells were executed' : 'None of the cells have been executed',
            ".",
            vscpp("br", null),
            this.props.notebook.cellCount === 0 ? 'This notebook does not have any cells.' : '',
            vscpp("br", null),
            this.props.notebook.getCells().map((cell, i) => {
                const cellNumber = i + 1;
                const language = cell.kind === vscodeTypes_1.NotebookCellKind.Code ? `, Language = ${cell.document.languageId}` : '';
                const cellType = cell.kind === vscodeTypes_1.NotebookCellKind.Code ? 'Code' : 'Markdown';
                const executionOrder = cell.executionSummary?.executionOrder;
                const cellId = (0, helpers_1.getCellId)(cell);
                let executionSummary = '';
                const altCellStartLine = includeCellLines ? altDoc.fromCellPosition(cell, new vscodeTypes_1.Position(0, 0)).line + 1 : -1;
                const altCellEndLine = includeCellLines ? altDoc.fromCellPosition(cell, new vscodeTypes_1.Position(cell.document.lineCount - 1, 0)).line + 1 : -1;
                const cellLines = `From ${altCellStartLine} to ${altCellEndLine}`;
                // If there's no timing, then means the notebook wasn't executed in current session.
                // Timing information is generally not stored in notebooks.
                if (executionOrder === undefined || !cell.executionSummary?.timing) {
                    executionSummary = `Execution = Cell not executed.`;
                }
                else {
                    const state = typeof cell.executionSummary?.success === 'undefined' ? 'and' : (cell.executionSummary.success ? 'successfully and' : 'with errors and');
                    executionSummary = `Execution = Cell executed ${state} execution Count = ${executionOrder}`;
                }
                if (cell.kind === vscodeTypes_1.NotebookCellKind.Markup) {
                    executionSummary = 'This is a markdown cell, and cannot be executed.';
                }
                const indent = '    ';
                const mimeTypes = new Set();
                cell.outputs.forEach(output => output.items.forEach(item => mimeTypes.add(item.mime)));
                const outputs = (cell.kind !== vscodeTypes_1.NotebookCellKind.Markup && cell.outputs.length > 0) ? vscpp(vscppf, null,
                    indent,
                    "Cell has outputs with mime types = ",
                    Array.from(mimeTypes).join(', '),
                    vscpp("br", null)) : vscpp(vscppf, null);
                return (vscpp(vscppf, null,
                    cellNumber,
                    ". Cell Id = ",
                    cellId,
                    vscpp("br", null),
                    indent,
                    "Cell Type = ",
                    cellType,
                    language,
                    vscpp("br", null),
                    includeCellLines && vscpp(vscppf, null,
                        indent,
                        "Cell Lines = ",
                        cellLines,
                        vscpp("br", null)),
                    indent,
                    executionSummary,
                    vscpp("br", null),
                    outputs));
            })));
    }
};
exports.NotebookSummary = NotebookSummary;
exports.NotebookSummary = NotebookSummary = __decorate([
    __param(1, alternativeContent_1.IAlternativeNotebookContentService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(3, logService_1.ILogService)
], NotebookSummary);
//# sourceMappingURL=notebookSummaryTool.js.map