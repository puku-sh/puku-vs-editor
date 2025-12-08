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
exports.NotebookCellOutputVariable = exports.NotebookVariables = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const logService_1 = require("../../../../platform/log/common/logService");
const helpers_1 = require("../../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const summarizeDocumentHelpers_1 = require("../inline/summarizedDocument/summarizeDocumentHelpers");
const image_1 = require("./image");
let NotebookVariables = class NotebookVariables extends prompt_tsx_1.PromptElement {
    constructor(props, notebookService, _promptPathRepresentationService, logger) {
        super(props);
        this.notebookService = notebookService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
        this.logger = logger;
    }
    async prepare() {
        try {
            this.logger.trace(`Fetching notebook variables for ${this.props.notebook.uri.toString()}`);
            const variables = await this.notebookService.getVariables(this.props.notebook.uri);
            return { variables };
        }
        catch (error) {
            this.logger.error(`Failed to get notebook variables for ${this.props.notebook.uri.toString()}: ${error}`);
            return { variables: [] };
        }
    }
    render(state) {
        const filePath = this._promptPathRepresentationService.getFilePath(this.props.notebook.uri);
        const isJupyterNotebook = (0, notebooks_1.isJupyterNotebookUri)(this.props.notebook.uri);
        const notebookType = isJupyterNotebook ? 'Jupyter Notebook' : 'Notebook';
        if (state.variables.length === 0) {
            return (vscpp(vscppf, null));
        }
        return (vscpp(prompt_tsx_1.TokenLimit, { max: 16384 },
            "<notebook-kernel-variables>",
            vscpp("br", null),
            state.variables.length !== 0 &&
                vscpp(vscppf, null,
                    "The following variables are present in the ",
                    notebookType,
                    " ",
                    filePath,
                    ":",
                    state.variables.map((variable) => (vscpp(vscppf, null,
                        vscpp(prompt_tsx_1.TextChunk, null,
                            "Name: ",
                            variable.variable.name,
                            vscpp("br", null),
                            variable.variable.type && vscpp(vscppf, null,
                                "Type: ",
                                variable.variable.type),
                            vscpp("br", null)))))),
            "</notebook-kernel-variables>",
            vscpp("br", null)));
    }
};
exports.NotebookVariables = NotebookVariables;
exports.NotebookVariables = NotebookVariables = __decorate([
    __param(1, notebookService_1.INotebookService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(3, logService_1.ILogService)
], NotebookVariables);
let NotebookCellOutputVariable = class NotebookCellOutputVariable extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, promptPathRepresentationService, promptEndpoint) {
        super(props);
        this.workspaceService = workspaceService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.promptEndpoint = promptEndpoint;
    }
    render(state, sizing) {
        const outputUri = this.props.outputUri;
        const outputInfo = (0, notebooks_1.getNotebookCellOutput)(outputUri, this.workspaceService.notebookDocuments);
        if (!outputInfo) {
            return;
        }
        const [notebook, cell, notebookCellOutput] = outputInfo;
        const outputIndex = cell.outputs.indexOf(notebookCellOutput);
        const allowedTextMimeTypes = ['text/plain', 'text/html', 'text/markdown', 'application/vnd.code.notebook.stdout', 'application/vnd.code.notebook.error', 'application/vnd.code.notebook.stderr'];
        const item = notebookCellOutput.items.length ? notebookCellOutput.items[0] : undefined;
        if (!item || (!allowedTextMimeTypes.includes(item.mime) && !item.mime.startsWith('image/'))) {
            return vscpp(vscppf, null);
        }
        let text;
        const cellIndex = cell.index;
        const notebookPath = this.promptPathRepresentationService.getFilePath(notebook.uri);
        if (item.mime === 'image/png') {
            if (this.promptEndpoint.supportsVision) {
                text = (vscpp(vscppf, null,
                    vscpp("br", null),
                    vscpp(tag_1.Tag, { name: `cell-output`, attrs: { mimeType: item.mime, outputIndex, cellIndex, notebookPath } },
                        vscpp(image_1.Image, { variableName: `cell-output-image-${outputIndex}`, variableValue: item.data }))));
            }
            else {
                text = (vscpp(vscppf, null,
                    vscpp("br", null),
                    "The user attempted to attach an image which is the output from the cell with index: ",
                    cellIndex,
                    " of the notebook ",
                    notebookPath,
                    " but images cannot be sent to this endpoint at this time and is therefore not attached. ",
                    vscpp("br", null),
                    vscpp("br", null)));
            }
        }
        else {
            // force 1/4 of the token budget for text
            const textSize = (0, summarizeDocumentHelpers_1.getCharLimit)(sizing.tokenBudget / 4);
            let textChunk = item.data.toString();
            if (item.mime === 'application/vnd.code.notebook.stderr' || item.mime === 'application/vnd.code.notebook.error') {
                textChunk = (0, helpers_1.parseAndCleanStack)(textChunk);
            }
            if (textChunk.length > textSize) {
                textChunk = textChunk.substring(0, textSize);
            }
            text = (vscpp(vscppf, null,
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: `notebook-cell-output`, attrs: { mimeType: item.mime, outputIndex, cellIndex, notebookPath } }, textChunk)));
        }
        return text;
    }
};
exports.NotebookCellOutputVariable = NotebookCellOutputVariable;
exports.NotebookCellOutputVariable = NotebookCellOutputVariable = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(3, promptRenderer_1.IPromptEndpoint)
], NotebookCellOutputVariable);
//#endregion
//# sourceMappingURL=notebookVariables.js.map