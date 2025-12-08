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
exports.RunNotebookCellOutput = exports.RunNotebookCellTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const extensionsService_1 = require("../../../platform/extensions/common/extensionsService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const crypto_1 = require("../../../util/common/crypto");
const notebooks_1 = require("../../../util/common/notebooks");
const async_1 = require("../../../util/vs/base/common/async");
const lifecycle_1 = require("../../../util/vs/base/common/lifecycle");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const tag_1 = require("../../prompts/node/base/tag");
const summarizeDocumentHelpers_1 = require("../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolsService_1 = require("../common/toolsService");
const languageModelChatMessageHelpers_1 = require("../../conversation/common/languageModelChatMessageHelpers");
class RunNotebookTelemetryEvent {
    constructor(filepath, requestId, model) {
        this.filepath = filepath;
        this.requestId = requestId;
        this.model = model;
        this.result = 'failure';
    }
    skipped(reason) {
        this.result = 'skipped';
        this.resultInfo = reason;
    }
    failed(reason) {
        this.result = 'failure';
        this.resultInfo = reason;
    }
    async send(telemetryService) {
        const resourceHash = await (0, crypto_1.createSha256Hash)(this.filepath);
        /* __GDPR__
            "runNotebookCellInvoked" : {
                "owner": "amunger",
                "comment": "Tracks the usage and result ",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "resourceHash": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The hash of the resource of the current request turn. (Notebook Uri)" },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." },
                "result": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Result of the operation: success, failure, or unknown." },
                "resultInfo": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Reason for failure if the result is failure." }
            }
        */
        telemetryService.sendMSFTTelemetryEvent('runNotebookCellInvoked', {
            requestId: this.requestId,
            resourceHash,
            model: this.model,
            result: this.result,
            resultInfo: this.resultInfo,
        });
    }
}
let RunNotebookCellTool = class RunNotebookCellTool {
    static { this.toolName = toolNames_1.ToolName.RunNotebookCell; }
    constructor(instantiationService, promptPathRepresentationService, workspaceService, notebookService, alternativeNotebookContent, extensionsService, endpointProvider, toolsService, telemetryService) {
        this.instantiationService = instantiationService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.workspaceService = workspaceService;
        this.notebookService = notebookService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.extensionsService = extensionsService;
        this.endpointProvider = endpointProvider;
        this.toolsService = toolsService;
        this.telemetryService = telemetryService;
    }
    async invoke(options, token) {
        const { filePath, cellId, continueOnError } = options.input;
        const model = options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
        const telemetryEvent = new RunNotebookTelemetryEvent(filePath, options.chatRequestId, model);
        try {
            const { notebook, cell } = this.getNotebookAndCell(filePath, cellId);
            // track that a notebook tool was invoked by the agent, exposes follow execution action to toolbar
            this.notebookService.trackAgentUsage();
            // If this is a Jupyter notebook with Python code and Jupyter extension isn't installed, recommend installing it
            const JUPYTER_EXTENSION_ID = 'ms-toolsai.jupyter';
            if ((0, notebooks_1.isJupyterNotebookUri)(notebook.uri) && notebook.getCells().some(c => c.document.languageId.toLowerCase() === 'python') && !this.extensionsService.getExtension(JUPYTER_EXTENSION_ID)) {
                try {
                    const input = {
                        id: JUPYTER_EXTENSION_ID,
                        name: 'Jupyter'
                    };
                    await this.toolsService.invokeTool(toolNames_1.ToolName.InstallExtension, { ...options, input }, token);
                }
                catch {
                    //
                }
            }
            await this.notebookService.ensureKernelSelected(notebook.uri);
            if (token.isCancellationRequested) {
                telemetryEvent.skipped('canceled');
                return new vscodeTypes_1.LanguageModelToolResult([]);
            }
            const index = notebook.getCells().findIndex((c) => c === cell);
            if (cell.kind !== 2) {
                telemetryEvent.skipped('markdownCell');
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart(`Cell ${cellId} is not a code cell so it can't be executed. If this is unexpected, then use the ${toolNames_1.ToolName.ReadFile} file tool to get the latest content of the notebook file`)
                ]);
            }
            else if (cell.document.getText().trim() === '') {
                telemetryEvent.skipped('emptyCell');
                return new vscodeTypes_1.LanguageModelToolResult([
                    new vscodeTypes_1.LanguageModelTextPart(`Cell ${cellId} is empty, so it won't be executed. If this is unexpected, then use the ${toolNames_1.ToolName.ReadFile} file tool to get the latest content of the notebook file`)
                ]);
            }
            let infoMessage = undefined;
            let executionSummary = undefined;
            const disposables = [];
            try {
                const cellExecution = (0, async_1.raceCancellationError)(this.waitForCellExecution(cell, disposables), token);
                const autoRevealArg = this.notebookService.getFollowState();
                await this.notebookService.runCells(notebook.uri, { start: index, end: index + 1 }, autoRevealArg);
                executionSummary = await (0, async_1.raceTimeout)(cellExecution, 3_000);
                if (executionSummary) {
                    if (executionSummary.success === false) {
                        telemetryEvent.failed('ExecutionFailed');
                        if (!continueOnError) {
                            infoMessage = `Cell ${cellId} execution failed. The error should be fixed before running any more cells.`;
                        }
                    }
                    else {
                        telemetryEvent.result = 'success';
                    }
                }
                else {
                    // some controllers will return before finishing execution,
                    // But we can't tell the difference between a cell that is still executing and one that just failed to execute
                    infoMessage = `Cell ${cellId} did not finish executing. It may still be running, or it may have failed to execute.`;
                    telemetryEvent.failed('ExecutionTimeout');
                }
            }
            finally {
                (0, lifecycle_1.dispose)(disposables);
            }
            const outputs = cell?.outputs || [];
            const toolCallResults = [];
            // execution summary
            toolCallResults.push(new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, RunNotebookCellResultSummary, { executionSummary, infoMessage }, options.tokenizationOptions, token)));
            const endpoint = this._promptContext?.request ? await this.endpointProvider.getChatEndpoint(this._promptContext?.request) : undefined;
            for (let i = 0; i < outputs.length; i++) {
                const output = outputs[i];
                const imageItem = endpoint?.supportsVision ? output.items.find((item) => item.mime === 'image/png' || item.mime === 'image/jpeg') : undefined;
                if (imageItem) {
                    toolCallResults.push(new vscodeTypes_1.LanguageModelTextPart(`<cell-output>\nOutput ${i}:\n`));
                    toolCallResults.push(vscodeTypes_1.LanguageModelDataPart.image(imageItem.data, imageItem.mime === 'image/png' ? languageModelChatMessageHelpers_1.ChatImageMimeType.PNG : languageModelChatMessageHelpers_1.ChatImageMimeType.JPEG));
                    toolCallResults.push(new vscodeTypes_1.LanguageModelTextPart(`</cell-output>`));
                }
                else {
                    toolCallResults.push(new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, RunNotebookCellOutput, { output, index: i, sizeLimitRatio: 4 }, options.tokenizationOptions, token)));
                }
            }
            const result = new vscodeTypes_1.ExtendedLanguageModelToolResult(toolCallResults);
            const cellUri = cell?.document.uri;
            result.toolResultMessage = new vscodeTypes_1.MarkdownString(`Ran [](${cellUri?.toString()})`);
            return result;
        }
        catch (error) {
            telemetryEvent.failed(error.message || 'exceptionThrown');
        }
        finally {
            await telemetryEvent.send(this.telemetryService);
        }
    }
    prepareInvocation(options) {
        const { filePath, cellId, reason } = options.input;
        const { cell } = this.getNotebookAndCell(filePath, cellId);
        // track that a notebook tool was invoked by the agent, exposes follow execution action to toolbar
        this.notebookService.trackAgentUsage();
        const cellContent = this.formatRunMessage(cell, reason);
        const confirmationMessages = {
            title: l10n.t `Run Notebook Cell`,
            message: cellContent,
        };
        return {
            confirmationMessages,
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Running [](${cell.document.uri.toString()})`),
        };
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext;
        return input;
    }
    getNotebookAndCell(filePath, cellId) {
        const resolvedUri = this.promptPathRepresentationService.resolveFilePath(filePath);
        if (!resolvedUri) {
            throw new Error(`Invalid file path`);
        }
        const notebook = (0, notebooks_1.findNotebook)(resolvedUri, this.workspaceService.notebookDocuments);
        if (!notebook) {
            throw new Error(`Notebook ${resolvedUri} not found.`);
        }
        const cell = (0, helpers_1.getCellIdMap)(notebook).get(cellId);
        if (!cell) {
            throw new Error(`Cell ${cellId} not found in the notebook, use the ${toolNames_1.ToolName.ReadFile} file tool to get the latest content of the notebook file`);
        }
        return { notebook, cell };
    }
    formatRunMessage(cell, reason) {
        const lines = [`[](${cell.document.uri.toString()})`, ''];
        lines.push('```' + cell.document.languageId);
        let emptyLine = true;
        // remove leading and consecutive empty lines
        for (const line of cell.document.getText().split('\n')) {
            if (lines.length > 10) {
                lines.push('...');
                break;
            }
            if (line.trim() === '') {
                if (emptyLine) {
                    continue;
                }
                emptyLine = true;
            }
            else {
                emptyLine = false;
            }
            lines.push(line);
        }
        if (reason) {
            lines.unshift('');
            lines.unshift(reason);
        }
        const message = lines.join('\n').trim() + '\n```';
        return new vscodeTypes_1.MarkdownString(message);
    }
    async waitForCellExecution(cell, disposables) {
        return new Promise((resolve) => {
            disposables.push(this.workspaceService.onDidChangeNotebookDocument((e) => {
                for (const change of e.cellChanges) {
                    if (change.executionSummary && typeof change.executionSummary.success === 'boolean' && change.cell === cell) {
                        resolve(change.executionSummary);
                    }
                }
            }));
        });
    }
};
exports.RunNotebookCellTool = RunNotebookCellTool;
exports.RunNotebookCellTool = RunNotebookCellTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, notebookService_1.INotebookService),
    __param(4, alternativeContent_1.IAlternativeNotebookContentService),
    __param(5, extensionsService_1.IExtensionsService),
    __param(6, endpointProvider_1.IEndpointProvider),
    __param(7, toolsService_1.IToolsService),
    __param(8, telemetry_1.ITelemetryService)
], RunNotebookCellTool);
class RunNotebookCellResultSummary extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { executionSummary } = this.props;
        return (vscpp(vscppf, null,
            vscpp(tag_1.Tag, { name: `execution-summaries` }, executionSummary && this.renderSummary('cellId', executionSummary, true)),
            this.renderAdditionalInfo()));
    }
    renderAdditionalInfo() {
        if (!this.props.infoMessage) {
            return vscpp(vscppf, null);
        }
        return (vscpp(tag_1.Tag, { name: 'additional-info' }, this.renderInfoMessage(this.props.infoMessage)));
    }
    renderSummary(cellId, execution, renderExecutionOrder) {
        let result = vscpp(vscppf, null,
            "cell ",
            cellId,
            " ");
        if (typeof execution?.success === 'boolean') {
            result = vscpp(vscppf, null,
                result,
                execution?.success ? vscpp(vscppf, null,
                    "executed successfully ",
                    vscpp("br", null)) : vscpp(vscppf, null,
                    "execution failed ",
                    vscpp("br", null)));
        }
        else {
            result = vscpp(vscppf, null,
                result,
                vscpp("br", null));
        }
        if (execution?.timing) {
            result = vscpp(vscppf, null,
                result,
                "Total Duration: ",
                execution.timing.endTime - execution.timing.startTime,
                "ms ",
                vscpp("br", null));
        }
        if (renderExecutionOrder && execution?.executionOrder) {
            result = vscpp(vscppf, null,
                result,
                "Last Execution Order: ",
                execution.executionOrder,
                " ");
        }
        return result;
    }
    renderInfoMessage(infoMessage) {
        return (vscpp(vscppf, null,
            infoMessage,
            " ",
            vscpp("br", null),
            " "));
    }
}
class RunNotebookCellOutput extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const { output, index } = this.props;
        const error = output.items.find((item) => item.mime === 'application/vnd.code.notebook.error');
        if (error) {
            const errorMessage = error.data.toString();
            const isMissingPackageError = errorMessage.includes('ModuleNotFoundError');
            return vscpp(tag_1.Tag, { name: 'cell-execution-error' },
                "Error: ",
                (0, helpers_1.parseAndCleanStack)(errorMessage),
                vscpp("br", null),
                isMissingPackageError ?
                    `Either use notebook_install_packages_tool to install the missing package if the tool exists, or add/edit a cell with '%pip install' to install the package.` :
                    'Make sure to check the contents of previous cells to see if rerunning those cells would resolve the issue.');
        }
        const textItem = output.items.find((item) => item.mime === 'text/html'
            || item.mime === 'text/markdown'
            || item.mime === 'text/plain'
            || item.mime === 'application/vnd.code.notebook.stdout'
            || item.mime === 'application/vnd.code.notebook.stderr'
            || item.mime === 'application/json');
        if (textItem) {
            if ((0, summarizeDocumentHelpers_1.getCharLimit)(textItem.data.byteLength) > sizing.tokenBudget / this.props.sizeLimitRatio) {
                return vscpp(tag_1.Tag, { name: `cell-output`, attrs: { mimeType: textItem.mime } },
                    "Output ",
                    index + 1,
                    ": Output is too large to be used as context in the language model, but the user should be able to see it in the notebook.",
                    vscpp("br", null),
                    vscpp("br", null));
            }
            return vscpp(tag_1.Tag, { name: `cell-output`, attrs: { mimeType: textItem.mime } },
                "Output ",
                index + 1,
                ": ",
                textItem.data.toString());
        }
        const largeOutput = output.items.find((item) => (0, summarizeDocumentHelpers_1.getCharLimit)(item.data.byteLength) > sizing.tokenBudget / this.props.sizeLimitRatio);
        if (largeOutput) {
            return vscpp(tag_1.Tag, { name: `cell-output`, attrs: { mimeType: largeOutput.mime } },
                "Output ",
                index + 1,
                ": Output is too large to be used as context in the language model, but the user should be able to see it in the notebook.",
                vscpp("br", null),
                vscpp("br", null));
        }
        return vscpp(tag_1.Tag, { name: "cell-output" },
            "Output with mimeTypes: ",
            output.items.map((item) => item.mime).join(', '),
            vscpp("br", null),
            `Output ${index}: ${this.renderOutputFallback(output, sizing.tokenBudget / 8)}`);
    }
    renderOutputFallback(output, limit) {
        const items = output.items.map(item => {
            const buffer = item.data;
            const text = buffer.toString();
            return text;
        });
        const itemsText = items.join('\n');
        const textChunk = itemsText.length > limit ? itemsText.substring(0, limit) : itemsText;
        return textChunk;
    }
}
exports.RunNotebookCellOutput = RunNotebookCellOutput;
toolsRegistry_1.ToolRegistry.registerTool(RunNotebookCellTool);
//# sourceMappingURL=runNotebookCellTool.js.map