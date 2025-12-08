"use strict";
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
exports.ReadFileTool = exports.readFileV2Description = void 0;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../platform/configuration/common/configurationService");
const textDocumentSnapshot_1 = require("../../../platform/editing/common/textDocumentSnapshot");
const endpointProvider_1 = require("../../../platform/endpoint/common/endpointProvider");
const alternativeContent_1 = require("../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../platform/prompts/common/promptPathRepresentationService");
const nullExperimentationService_1 = require("../../../platform/telemetry/common/nullExperimentationService");
const telemetry_1 = require("../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../platform/workspace/common/workspaceService");
const numbers_1 = require("../../../util/vs/base/common/numbers");
const instantiation_1 = require("../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../vscodeTypes");
const promptRenderer_1 = require("../../prompts/node/base/promptRenderer");
const safeElements_1 = require("../../prompts/node/panel/safeElements");
const toolNames_1 = require("../common/toolNames");
const toolsRegistry_1 = require("../common/toolsRegistry");
const toolUtils_1 = require("../common/toolUtils");
const toolUtils_2 = require("./toolUtils");
exports.readFileV2Description = {
    name: toolNames_1.ToolName.ReadFile,
    description: 'Read the contents of a file. Line numbers are 1-indexed. This tool will truncate its output at 2000 lines and may be called repeatedly with offset and limit parameters to read larger files in chunks.',
    tags: ['vscode_codesearch'],
    source: undefined,
    inputSchema: {
        type: 'object',
        required: ['filePath'],
        properties: {
            filePath: {
                description: 'The absolute path of the file to read.',
                type: 'string'
            },
            offset: {
                description: 'Optional: the 1-based line number to start reading from. Only use this if the file is too large to read at once. If not specified, the file will be read from the beginning.',
                type: 'number'
            },
            limit: {
                description: 'Optional: the maximum number of lines to read. Only use this together with `offset` if the file is too large to read at once.',
                type: 'number'
            },
        }
    },
};
const MAX_LINES_PER_READ = 2000;
const isParamsV2 = (params) => params.startLine === undefined;
const getParamRanges = (params, snapshot) => {
    let start;
    let end;
    let truncated = false;
    if (isParamsV2(params)) {
        // Check if offset is out of bounds before clamping
        if (params.offset !== undefined && params.offset > snapshot.lineCount) {
            throw new Error(`Invalid offset ${params.offset}: file only has ${snapshot.lineCount} line${snapshot.lineCount === 1 ? '' : 's'}. Line numbers are 1-indexed.`);
        }
        const limit = (0, numbers_1.clamp)(params.limit || Infinity, 1, MAX_LINES_PER_READ - 1);
        start = (0, numbers_1.clamp)(params.offset ?? 1, 1, snapshot.lineCount);
        end = (0, numbers_1.clamp)(start + limit, 1, snapshot.lineCount);
        // signal truncation if we applied a limit to the lines other than what the model requested
        truncated = limit !== params.limit && end < snapshot.lineCount;
    }
    else {
        start = (0, numbers_1.clamp)(params.startLine, 1, snapshot.lineCount);
        end = (0, numbers_1.clamp)(params.endLine, 1, snapshot.lineCount);
    }
    if (start > end) {
        [end, start] = [start, end];
    }
    return { start, end, truncated };
};
let ReadFileTool = class ReadFileTool {
    static { this.toolName = toolNames_1.ToolName.ReadFile; }
    constructor(workspaceService, notebookService, alternativeNotebookContent, promptPathRepresentationService, instantiationService, endpointProvider, telemetryService, configurationService, experimentationService) {
        this.workspaceService = workspaceService;
        this.notebookService = notebookService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.instantiationService = instantiationService;
        this.endpointProvider = endpointProvider;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.experimentationService = experimentationService;
    }
    async invoke(options, token) {
        let ranges;
        try {
            const uri = (0, toolUtils_2.resolveToolInputPath)(options.input.filePath, this.promptPathRepresentationService);
            const documentSnapshot = await this.getSnapshot(uri);
            ranges = getParamRanges(options.input, documentSnapshot);
            void this.sendReadFileTelemetry('success', options, ranges);
            return new vscodeTypes_1.LanguageModelToolResult([
                new vscodeTypes_1.LanguageModelPromptTsxPart(await (0, promptRenderer_1.renderPromptElementJSON)(this.instantiationService, ReadFileResult, { uri, startLine: ranges.start, endLine: ranges.end, truncated: ranges.truncated, snapshot: documentSnapshot, languageModel: this._promptContext?.request?.model }, 
                // If we are not called with tokenization options, have _some_ fake tokenizer
                // otherwise we end up returning the entire document on every readFile.
                options.tokenizationOptions ?? {
                    tokenBudget: 600,
                    countTokens: (t) => Promise.resolve(t.length * 3 / 4)
                }, token))
            ]);
        }
        catch (err) {
            void this.sendReadFileTelemetry('error', options, ranges || { start: 0, end: 0, truncated: false });
            throw err;
        }
    }
    async prepareInvocation(options, token) {
        const { input } = options;
        if (!input.filePath.length) {
            return;
        }
        let uri;
        let documentSnapshot;
        try {
            uri = (0, toolUtils_2.resolveToolInputPath)(input.filePath, this.promptPathRepresentationService);
            await this.instantiationService.invokeFunction(accessor => (0, toolUtils_2.assertFileOkForTool)(accessor, uri));
            documentSnapshot = await this.getSnapshot(uri);
        }
        catch (err) {
            void this.sendReadFileTelemetry('invalidFile', options, { start: 0, end: 0, truncated: false });
            throw err;
        }
        const { start, end } = getParamRanges(input, documentSnapshot);
        if (start === 1 && end === documentSnapshot.lineCount) {
            return {
                invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Reading ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
                pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Read ${(0, toolUtils_1.formatUriForFileWidget)(uri)}`),
            };
        }
        // Jump to the start of the range, don't select the whole range
        const readLocation = new vscodeTypes_1.Location(uri, new vscodeTypes_1.Range(start - 1, 0, start - 1, 0));
        return {
            invocationMessage: new vscodeTypes_1.MarkdownString(l10n.t `Reading ${(0, toolUtils_1.formatUriForFileWidget)(readLocation)}, lines ${start} to ${end}`),
            pastTenseMessage: new vscodeTypes_1.MarkdownString(l10n.t `Read ${(0, toolUtils_1.formatUriForFileWidget)(readLocation)}, lines ${start} to ${end}`),
        };
    }
    alternativeDefinition(originTool) {
        if (this.configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.Internal.EnableReadFileV2, this.experimentationService)) {
            return exports.readFileV2Description;
        }
        return originTool;
    }
    async getSnapshot(uri) {
        return this.notebookService.hasSupportedNotebooks(uri) ?
            await this.workspaceService.openNotebookDocumentAndSnapshot(uri, this.alternativeNotebookContent.getFormat(this._promptContext?.request?.model)) :
            textDocumentSnapshot_1.TextDocumentSnapshot.create(await this.workspaceService.openTextDocument(uri));
    }
    async sendReadFileTelemetry(outcome, options, { start, end, truncated }) {
        const model = options.model && (await this.endpointProvider.getChatEndpoint(options.model)).model;
        /* __GDPR__
            "readFileToolInvoked" : {
                "owner": "roblourens",
                "comment": "The read_file tool was invoked",
                "requestId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current request turn." },
                "interactionId": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The id of the current interaction." },
                "toolOutcome": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the invocation was successful, or a failure reason" },
                "model": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "The model that invoked the tool" },
                "linesRead": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The number of lines that were read" },
                "truncated": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true, "comment": "The file length was truncated" },
                "isV2": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the tool is a v2 version" },
                "isEntireFile": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "comment": "Whether the entire file was read with v2 params" }
            }
        */
        this.telemetryService.sendMSFTTelemetryEvent('readFileToolInvoked', {
            requestId: options.chatRequestId,
            interactionId: options.chatRequestId,
            toolOutcome: outcome, // Props named "outcome" often get stuck in the kusto pipeline
            isV2: isParamsV2(options.input) ? 'true' : 'false',
            isEntireFile: isParamsV2(options.input) && options.input.offset === undefined && options.input.limit === undefined ? 'true' : 'false',
            model
        }, {
            linesRead: end - start,
            truncated: truncated ? 1 : 0,
        });
    }
    async resolveInput(input, promptContext) {
        this._promptContext = promptContext;
        return input;
    }
};
exports.ReadFileTool = ReadFileTool;
exports.ReadFileTool = ReadFileTool = __decorate([
    __param(0, workspaceService_1.IWorkspaceService),
    __param(1, notebookService_1.INotebookService),
    __param(2, alternativeContent_1.IAlternativeNotebookContentService),
    __param(3, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(4, instantiation_1.IInstantiationService),
    __param(5, endpointProvider_1.IEndpointProvider),
    __param(6, telemetry_1.ITelemetryService),
    __param(7, configurationService_1.IConfigurationService),
    __param(8, nullExperimentationService_1.IExperimentationService)
], ReadFileTool);
toolsRegistry_1.ToolRegistry.registerTool(ReadFileTool);
let ReadFileResult = class ReadFileResult extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, promptPathRepresentationService) {
        super(props);
        this.instantiationService = instantiationService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async render() {
        await this.instantiationService.invokeFunction(accessor => (0, toolUtils_2.assertFileOkForTool)(accessor, this.props.uri));
        const documentSnapshot = this.props.snapshot;
        const documentText = documentSnapshot.getText();
        if (documentText.length === 0) {
            return vscpp(vscppf, null,
                "(The file `",
                this.promptPathRepresentationService.getFilePath(this.props.uri),
                "` exists, but is empty)");
        }
        else if (documentText.trim().length === 0) {
            return vscpp(vscppf, null,
                "(The file `",
                this.promptPathRepresentationService.getFilePath(this.props.uri),
                "` exists, but contains only whitespace)");
        }
        const range = new vscodeTypes_1.Range(this.props.startLine - 1, 0, this.props.endLine - 1, Infinity);
        let contents = documentSnapshot.getText(range);
        if (this.props.truncated) {
            contents += `\n[File content truncated at line ${this.props.endLine}. Use ${toolNames_1.ToolName.ReadFile} with offset/limit parameters to view more.]\n`;
        }
        return vscpp(vscppf, null,
            range.end.line + 1 === documentSnapshot.lineCount && !this.props.truncated ? undefined : vscpp(vscppf, null,
                "File: `",
                this.promptPathRepresentationService.getFilePath(this.props.uri),
                "`. Lines ",
                range.start.line + 1,
                " to ",
                range.end.line + 1,
                " (",
                documentSnapshot.lineCount,
                " lines total): ",
                vscpp("br", null)),
            vscpp(safeElements_1.CodeBlock, { uri: this.props.uri, code: contents, languageId: documentSnapshot.languageId, shouldTrim: false, includeFilepath: false, references: [new prompt_tsx_1.PromptReference(this.props.uri, undefined, { isFromTool: true })], lineBasedPriority: true }));
    }
};
ReadFileResult = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], ReadFileResult);
//# sourceMappingURL=readFileTool.js.map