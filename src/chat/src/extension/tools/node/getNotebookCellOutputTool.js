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
exports.GetNotebookCellOutputTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../util/common/notebooks");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const runNotebookCellTool_1 = require("./runNotebookCellTool");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const helpers_1 = require("../../../platform/notebook/common/helpers");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const logService_1 = require("../../../platform/log/common/logService");
const languageModelChatMessageHelpers_1 = require("../../conversation/common/languageModelChatMessageHelpers");
let GetNotebookCellOutputTool = class GetNotebookCellOutputTool {
    static { this.toolName = toolNames_1.ToolName.ReadCellOutput; }
    constructor(instantiationService, promptPathRepresentationService, workspaceService, alternativeNotebookContent, endpointProvider, telemetryService, notebookService, logger) {
        this.instantiationService = instantiationService;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.workspaceService = workspaceService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.endpointProvider = endpointProvider;
        this.telemetryService = telemetryService;
        this.notebookService = notebookService;
        this.logger = logger;
    }
    async invoke(options, token) {
        const { filePath, cellId } = options.input;
        let uri = this.promptPathRepresentationService.resolveFilePath(filePath);
        if (!uri) {
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'invalid_file_path');
            throw new Error(`Invalid file path`);
        }
        // Sometimes we get the notebook cell Uri in the resource.
        // Resolve this to notebook.
        let notebook = (0, notebooks_1.findNotebook)(uri, this.workspaceService.notebookDocuments);
        if (notebook) {
            uri = notebook.uri;
        }
        else if (!this.notebookService.hasSupportedNotebooks(uri)) {
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'notNotebookUri');
            throw new Error(`Use this tool only with Notebook files, the file ${uri.toString()} is not a notebook.`);
        }
        try {
            notebook = notebook || await this.workspaceService.openNotebookDocument(uri);
        }
        catch (ex) {
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'failedToOpenNotebook');
            this.logger.error(`Failed to open notebook: ${uri.toString()}`, ex);
            throw new Error(`Failed to open the notebook ${uri.toString()}, ${ex.message || ''}. Verify the file exists.`);
        }
        const cell = (0, helpers_1.getCellIdMap)(notebook).get(cellId);
        if (!cell) {
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'cellNotFound');
            throw new Error(`Cell not found, use the ${toolNames_1.ToolName.ReadFile} file tool to get the latest content of the notebook file.`);
        }
        try {
            const outputs = cell.outputs;
            const toolCallResults = [];
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
                    toolCallResults.push(new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, runNotebookCellTool_1.RunNotebookCellOutput, { output, index: i, sizeLimitRatio: 1.2 }, options.tokenizationOptions, token)));
                }
            }
            const result = new vscodeTypes_1.ExtendedLanguageModelToolResult(toolCallResults);
            const cellUri = cell?.document.uri;
            result.toolResultMessage = new vscodeTypes_1.MarkdownString(`Read output of [](${cellUri?.toString()})`);
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'success');
            return result;
        }
        catch (ex) {
            sendOutcomeTelemetry(this.telemetryService, this.endpointProvider, options, 'error');
            throw ex;
        }
    }
    prepareInvocation(options) {
        return {
            invocationMessage: l10n.t `Reading cell output`,
            pastTenseMessage: l10n.t `Read cell output`,
        };
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext;
        return input;
    }
};
exports.GetNotebookCellOutputTool = GetNotebookCellOutputTool;
exports.GetNotebookCellOutputTool = GetNotebookCellOutputTool = __decorate([
    __param(0, instantiation_1.IInstantiationService),
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, alternativeContent_1.IAlternativeNotebookContentService),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, telemetry_1.ITelemetryService),
    __param(6, notebookService_1.INotebookService),
    __param(7, logService_1.ILogService)
], GetNotebookCellOutputTool);
toolsRegistry_1.ToolRegistry.registerTool(GetNotebookCellOutputTool);
async function sendOutcomeTelemetry(telemetryService, endpointProvider, options, outcome) {
    const model = (options.model && endpointProvider && (await endpointProvider.getChatEndpoint(options.model)).model);
    /* __GDPR__
        "getNotebookCellOutput.toolOutcome" : {
            "owner": "donjayamanne",
            "comment": "Tracks the tool used to get Notebook cell outputs",
            "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
            "isNotebook": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "Whether the document is a notebook (this measure is used to identify notebook related telemetry)." },
            "outcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Outcome of the edit operation" },
            "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model used for the request." }
        }
    */
    telemetryService.sendMSFTTelemetryEvent('getNotebookCellOutput.toolOutcome', { requestId: options.chatRequestId, outcome, model }, { isNotebook: 1 });
}
//# sourceMappingURL=getNotebookCellOutputTool.js.map