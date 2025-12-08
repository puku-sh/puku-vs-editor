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
exports.EditFileTool = exports.InternalEditToolId = void 0;
const notebookDocumentSnapshot_1 = require("../../../platform/editing/common/notebookDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const languageDiagnosticsService_1 = require("../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const editToolLearningService_1 = require("../common/editToolLearningService");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolsService_1 = require("../common/toolsService");
const parser_1 = require("./applyPatch/parser");
const editFileToolResult_1 = require("./editFileToolResult");
const editFileToolUtils_1 = require("./editFileToolUtils");
const editNotebookTool_1 = require("./editNotebookTool");
const toolUtils_1 = require("./toolUtils");
exports.InternalEditToolId = 'vscode_editFile_internal';
let EditFileTool = class EditFileTool {
    static { this.toolName = toolNames_1.ToolName.EditFile; }
    constructor(promptPathRepresentationService, instantiationService, workspaceService, toolsService, notebookService, languageDiagnosticsService, alternativeNotebookContentService, telemetryService, endpointProvider, editToolLearningService, logService) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
        this.notebookService = notebookService;
        this.languageDiagnosticsService = languageDiagnosticsService;
        this.alternativeNotebookContentService = alternativeNotebookContentService;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
        this.editToolLearningService = editToolLearningService;
        this.logService = logService;
    }
    async invoke(options, token) {
        const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        if (!uri) {
            throw new Error(`Invalid file path`);
        }
        await this.instantiationService.invokeFunction(accessor => (0, toolUtils_1.assertFileNotContentExcluded)(accessor, uri));
        const existingDiagnostics = this.languageDiagnosticsService.getDiagnostics(uri);
        // Wait for vscode to do the edit, call the codemapper service, wait for textedits to be applied
        const internalOptions = {
            ...options,
            input: {
                ...options.input,
                uri
            }
        };
        try {
            await this.toolsService.invokeTool(exports.InternalEditToolId, internalOptions, token);
            void this.recordEditSuccess(options, true);
        }
        catch (error) {
            void this.recordEditSuccess(options, false);
            throw error;
        }
        const isNotebook = this.notebookService.hasSupportedNotebooks(uri);
        const document = isNotebook ?
            await this.workspaceService.openNotebookDocumentAndSnapshot(uri, this.alternativeNotebookContentService.getFormat(this.promptContext?.request?.model)) :
            await this.workspaceService.openTextDocumentAndSnapshot(uri);
        if (document instanceof notebookDocumentSnapshot_1.NotebookDocumentSnapshot) {
            (0, editNotebookTool_1.sendEditNotebookTelemetry)(this.telemetryService, this.endpointProvider, 'insertEdit', uri, this.promptContext?.requestId, options.model ?? this.promptContext?.request?.model);
        }
        // Then fill in the tool result
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, editFileToolResult_1.EditFileResult, { files: [{ operation: parser_1.ActionType.UPDATE, uri, isNotebook, existingDiagnostics }], toolName: toolNames_1.ToolName.EditFile, requestId: options.chatRequestId, model: options.model }, 
            // If we are not called with tokenization options, have _some_ fake tokenizer
            // otherwise we end up returning the entire document
            options.tokenizationOptions ?? {
                tokenBudget: 1000,
                countTokens: (t) => Promise.resolve(t.length * 3 / 4)
            }, token))
        ]);
    }
    prepareInvocation(options, token) {
        const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        return this.instantiationService.invokeFunction(editFileToolUtils_1.createEditConfirmation, uri ? [uri] : [], async () => '```\n' + options.input.code + '\n```');
    }
    async resolveInput(input, promptContext) {
        this.promptContext = promptContext;
        return input;
    }
    recordEditSuccess(options, success) {
        if (options.model) {
            this.editToolLearningService.didMakeEdit(options.model, toolNames_1.ToolName.EditFile, success);
        }
        (0, editFileToolUtils_1.logEditToolResult)(this.logService, options.chatRequestId, { input: options.input, success });
    }
};
exports.EditFileTool = EditFileTool;
exports.EditFileTool = EditFileTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, toolsService_1.IToolsService),
    __param(4, notebookService_1.INotebookService),
    __param(5, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(6, alternativeContent_1.IAlternativeNotebookContentService),
    __param(7, telemetry_1.ITelemetryService),
    __param(8, endpointProvider_1.IEndpointProvider),
    __param(9, editToolLearningService_1.IEditToolLearningService),
    __param(10, logService_1.ILogService)
], EditFileTool);
toolsRegistry_1.ToolRegistry.registerTool(EditFileTool);
//# sourceMappingURL=insertEditTool.js.map