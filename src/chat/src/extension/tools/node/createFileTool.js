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
exports.CreateFileTool = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../platform/filesystem/common/fileSystemService");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const alternativeContentEditGenerator_1 = require("../../../platform/notebook/common/alternativeContentEditGenerator");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../util/common/languages");
const markdown_1 = require("../../../util/common/markdown");
const resources_1 = require("../../../util/vs/base/common/resources");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const codeBlockProcessor_1 = require("../../codeBlocks/node/codeBlockProcessor");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const codeMapper_1 = require("../../prompts/node/codeMapper/codeMapper");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolsService_1 = require("../common/toolsService");
const toolUtils_1 = require("../common/toolUtils");
const parser_1 = require("./applyPatch/parser");
const editFileToolResult_1 = require("./editFileToolResult");
const editFileToolUtils_1 = require("./editFileToolUtils");
const toolUtils_2 = require("./toolUtils");
let CreateFileTool = class CreateFileTool {
    static { this.toolName = toolNames_1.ToolName.CreateFile; }
    constructor(promptPathRepresentationService, instantiationService, workspaceService, toolsService, notebookService, alternativeNotebookContent, alternativeNotebookEditGenerator, fileSystemService, telemetryService, endpointProvider) {
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.workspaceService = workspaceService;
        this.toolsService = toolsService;
        this.notebookService = notebookService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.alternativeNotebookEditGenerator = alternativeNotebookEditGenerator;
        this.fileSystemService = fileSystemService;
        this.telemetryService = telemetryService;
        this.endpointProvider = endpointProvider;
    }
    async invoke(options, token) {
        const uri = this.promptPathRepresentationService.resolveFilePath(options.input.filePath);
        if (!uri) {
            throw new Error(`Invalid file path`);
        }
        await this.instantiationService.invokeFunction(accessor => (0, toolUtils_2.assertFileNotContentExcluded)(accessor, uri));
        if (!this._promptContext?.stream) {
            throw new Error('Invalid stream');
        }
        // Validate parameters
        if (!options.input.filePath || options.input.content === undefined) {
            throw new Error('Invalid input: filePath and content are required');
        }
        const fileExists = await this.fileExists(uri);
        const hasSupportedNotebooks = this.notebookService.hasSupportedNotebooks(uri);
        let doc = undefined;
        try {
            if (hasSupportedNotebooks) {
                doc = await this.workspaceService.openNotebookDocumentAndSnapshot(uri, this.alternativeNotebookContent.getFormat(this._promptContext?.request?.model));
            }
            else {
                doc = await this.workspaceService.openTextDocumentAndSnapshot(uri);
            }
        }
        catch (e) {
            // ignored
        }
        // note: fileExists could be `false` but we might still get a `doc` if it's held in memory
        if (fileExists && !!doc?.getText()) {
            if (hasSupportedNotebooks) {
                throw new Error(`File already exists. You must use the ${toolNames_1.ToolName.EditNotebook} tool to modify it.`);
            }
            else {
                throw new Error(`File already exists. You must use an edit tool to modify it.`);
            }
        }
        const languageId = doc?.languageId ?? (0, languages_1.getLanguageForResource)(uri).languageId;
        const fileExtension = (0, resources_1.extname)(uri);
        const modelId = options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
        if (hasSupportedNotebooks) {
            // Its possible we have a code block with a language id
            // Also possible we have file paths in the content.
            let content = options.input.content;
            const processor = new codeBlockProcessor_1.CodeBlockProcessor(() => undefined, () => undefined, (codeBlock) => content = codeBlock.code);
            processor.processMarkdown(options.input.content);
            processor.flush();
            content = (0, markdown_1.removeLeadingFilepathComment)(options.input.content, languageId, options.input.filePath);
            await (0, codeMapper_1.processFullRewriteNewNotebook)(uri, content, this._promptContext.stream, this.alternativeNotebookEditGenerator, { source: alternativeContentEditGenerator_1.NotebookEditGenrationSource.createFile, requestId: options.chatRequestId, model: options.model ? this.endpointProvider.getChatEndpoint(options.model).then(m => m.model) : undefined }, token);
            this._promptContext.stream.notebookEdit(uri, true);
            this.sendTelemetry(options.chatRequestId, modelId, fileExtension);
        }
        else {
            const content = (0, markdown_1.removeLeadingFilepathComment)(options.input.content, languageId, options.input.filePath);
            await (0, codeMapper_1.processFullRewrite)(uri, doc, content, this._promptContext.stream, token, []);
            this._promptContext.stream.textEdit(uri, true);
            this.sendTelemetry(options.chatRequestId, modelId, fileExtension);
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, editFileToolResult_1.EditFileResult, { files: [{ operation: parser_1.ActionType.ADD, uri, isNotebook: false }], diagnosticsTimeout: 2000, toolName: toolNames_1.ToolName.CreateFile, requestId: options.chatRequestId, model: options.model }, options.tokenizationOptions ?? {
                    tokenBudget: 1000,
                    countTokens: (t) => Promise.resolve(t.length * 3 / 4)
                }, token))
            ]);
        }
        return new vscodeTypes_1.LanguageModelToolResult([
            new vscodeTypes_1.LanguageModelTextPart(`File created at ${this.promptPathRepresentationService.getFilePath(uri)}`)
        ]);
    }
    /**
     * Don't copy this helper, this is generally not a good pattern because it's vulnerable to race conditions. But the fileSystemService doesn't give us a proper atomic method for this.
     */
    async fileExists(uri) {
        try {
            await this.fileSystemService.stat(uri);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext;
        return input;
    }
    async prepareInvocation(options, token) {
        const uri = (0, toolUtils_2.resolveToolInputPath)(options.input.filePath, this.promptPathRepresentationService);
        const content = options.input.content || '';
        const confirmation = await this.instantiationService.invokeFunction(editFileToolUtils_1.createEditConfirmation, [uri], async () => this.instantiationService.invokeFunction(editFileToolUtils_1.formatDiffAsUnified, uri, '', // Empty initial content
        content));
        return {
            ...confirmation,
            presentation: undefined,
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Creating ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
            pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Created ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`)
        };
    }
    sendTelemetry(requestId, model, fileExtension) {
        /* __GDPR__
            "createFileToolInvoked" : {
                "owner": "bhavyaus",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "fileExtension": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The file extension of the created file" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('createFileToolInvoked', {
            requestId,
            model,
            fileExtension
        });
    }
};
exports.CreateFileTool = CreateFileTool;
exports.CreateFileTool = CreateFileTool = __decorate([
    __param(0, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(1, instantiation_1.IInstantiationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, toolsService_1.IToolsService),
    __param(4, notebookService_1.INotebookService),
    __param(5, alternativeContent_1.IAlternativeNotebookContentService),
    __param(6, alternativeContentEditGenerator_1.IAlternativeNotebookContentEditGenerator),
    __param(7, fileSystemService_1.IFileSystemService),
    __param(8, telemetry_1.ITelemetryService),
    __param(9, endpointProvider_1.IEndpointProvider)
], CreateFileTool);
toolsRegistry_1.ToolRegistry.registerTool(CreateFileTool);
//# sourceMappingURL=createFileTool.js.map