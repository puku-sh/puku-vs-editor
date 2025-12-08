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
exports.TestEditFileTool = void 0;
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const packagejson_1 = require("../../../../platform/env/common/packagejson");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const logService_1 = require("../../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptRenderer_1 = require("../../../prompts/node/base/promptRenderer");
const codeMapperService_1 = require("../../../prompts/node/codeMapper/codeMapperService");
const editToolLearningService_1 = require("../../common/editToolLearningService");
const toolNames_1 = require("../../common/toolNames");
const toolsService_1 = require("../../common/toolsService");
const parser_1 = require("../applyPatch/parser");
const editFileToolResult_1 = require("../editFileToolResult");
const insertEditTool_1 = require("../insertEditTool");
/**
 * An implementation of the EditFile tool for simulation tests
 */
let TestEditFileTool = class TestEditFileTool extends insertEditTool_1.EditFileTool {
    constructor(stream, codeMapperService, instantiationService, workspaceService, promptPathRepresentationService, toolsService, notebookService, languageDiagnosticsService, alternativeNotebookContentService, telemetryService, endpointProvider, editToolLearningService, logService) {
        super(promptPathRepresentationService, instantiationService, workspaceService, toolsService, notebookService, languageDiagnosticsService, alternativeNotebookContentService, telemetryService, endpointProvider, editToolLearningService, logService);
        this.stream = stream;
        this.codeMapperService = codeMapperService;
        const contributedTool = packagejson_1.packageJson.contributes.languageModelTools.find(contributedTool => contributedTool.name === toolNames_1.ContributedToolName.EditFile);
        if (!contributedTool) {
            throw new Error(`Tool ${toolNames_1.ContributedToolName.EditFile} is not in package.json`);
        }
        this.info = {
            name: toolNames_1.ToolName.EditFile,
            tags: contributedTool.tags ?? [],
            description: (0, toolNames_1.mapContributedToolNamesInString)(contributedTool.modelDescription),
            source: undefined,
            inputSchema: contributedTool.inputSchema && (0, toolNames_1.mapContributedToolNamesInSchema)(contributedTool.inputSchema),
        };
    }
    async invoke(options, token) {
        const parameters = options.input;
        const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        if (!uri) {
            throw new Error('Invalid file path');
        }
        const mapperResult = await this.codeMapperService.mapCode({
            codeBlock: { code: parameters.code, resource: uri, markdownBeforeBlock: parameters.explanation },
        }, this.stream, undefined, token);
        if (mapperResult?.errorDetails) {
            throw new Error(mapperResult.errorDetails.message);
        }
        const document = await this.workspaceService.openTextDocumentAndSnapshot(uri);
        // Showing the document is necessary for some extensions to report diagnostics when running in the ext host simulator
        await this.workspaceService.showTextDocument(document.document);
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, editFileToolResult_1.EditFileResult, { files: [{ operation: parser_1.ActionType.UPDATE, uri, isNotebook: false }], toolName: toolNames_1.ToolName.EditFile, requestId: 'test', model: undefined }, 
            // If we are not called with tokenization options, have _some_ fake tokenizer
            // otherwise we end up returning the entire document
            options.tokenizationOptions ?? {
                tokenBudget: 1000,
                countTokens: (t) => Promise.resolve(t.length * 3 / 4)
            }, token))
        ]);
    }
};
exports.TestEditFileTool = TestEditFileTool;
exports.TestEditFileTool = TestEditFileTool = __decorate([
    __param(1, codeMapperService_1.ICodeMapperService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, workspaceService_1.IWorkspaceService),
    __param(4, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(5, toolsService_1.IToolsService),
    __param(6, notebookService_1.INotebookService),
    __param(7, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(8, alternativeContent_1.IAlternativeNotebookContentService),
    __param(9, telemetry_1.ITelemetryService),
    __param(10, endpointProvider_1.IEndpointProvider),
    __param(11, editToolLearningService_1.IEditToolLearningService),
    __param(12, logService_1.ILogService)
], TestEditFileTool);
//# sourceMappingURL=testTools.js.map