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
exports.ChatToolReferences = exports.ChatVariablesAndQuery = exports.UserQuery = exports.ChatVariables = void 0;
exports.renderChatVariables = renderChatVariables;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const endpointProvider_1 = require("../../../../platform/endpoint/common/endpointProvider");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const fileTypes_1 = require("../../../../platform/filesystem/common/fileTypes");
const logService_1 = require("../../../../platform/log/common/logService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const telemetry_1 = require("../../../../platform/telemetry/common/telemetry");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const languages_1 = require("../../../../util/common/languages");
const markdown_1 = require("../../../../util/common/markdown");
const notebooks_1 = require("../../../../util/common/notebooks");
const types_1 = require("../../../../util/common/types");
const cancellation_1 = require("../../../../util/vs/base/common/cancellation");
const network_1 = require("../../../../util/vs/base/common/network");
const resources_1 = require("../../../../util/vs/base/common/resources");
const uri_1 = require("../../../../util/vs/base/common/uri");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const diagnostic_1 = require("../../../../util/vs/workbench/api/common/extHostTypes/diagnostic");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const toolSchemaNormalizer_1 = require("../../../tools/common/toolSchemaNormalizer");
const toolsService_1 = require("../../../tools/common/toolsService");
const promptElement_1 = require("../base/promptElement");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const diagnosticsContext_1 = require("../inline/diagnosticsContext");
const fixCookbookService_1 = require("../inline/fixCookbookService");
const implementation_1 = require("../inline/summarizedDocument/implementation");
const fileVariable_1 = require("./fileVariable");
const image_1 = require("./image");
const notebookVariables_1 = require("./notebookVariables");
const panelChatBasePrompt_1 = require("./panelChatBasePrompt");
const promptFile_1 = require("./promptFile");
const toolCalling_1 = require("./toolCalling");
const visualFileTree_1 = require("./workspace/visualFileTree");
let ChatVariables = class ChatVariables extends prompt_tsx_1.PromptElement {
    constructor(props, fileSystemService) {
        super(props);
        this.fileSystemService = fileSystemService;
    }
    async render(state, sizing) {
        const elements = await renderChatVariables(this.props.chatVariables, this.fileSystemService, this.props.includeFilepath, this.props.omitReferences, this.props.isAgent, this.props.useFixCookbook);
        if (elements.length === 0) {
            return undefined;
        }
        if (this.props.embeddedInsideUserMessage ?? promptElement_1.embeddedInsideUserMessageDefault) {
            return (vscpp(vscppf, null, Boolean(elements.length) && vscpp(tag_1.Tag, { name: 'attachments', priority: this.props.priority }, ...elements)));
        }
        return (vscpp(vscppf, null, ...elements.map(element => asUserMessage(element, this.props.priority))));
    }
};
exports.ChatVariables = ChatVariables;
exports.ChatVariables = ChatVariables = __decorate([
    __param(1, fileSystemService_1.IFileSystemService)
], ChatVariables);
class UserQuery extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        const rewrittenMessage = this.props.chatVariables.substituteVariablesWithReferences(this.props.query);
        return (vscpp(vscppf, null, rewrittenMessage));
    }
}
exports.UserQuery = UserQuery;
let ChatVariablesAndQuery = class ChatVariablesAndQuery extends prompt_tsx_1.PromptElement {
    constructor(props, fileSystemService) {
        super(props);
        this.fileSystemService = fileSystemService;
    }
    async render(state, sizing) {
        const chatVariables = this.props.maintainOrder ? this.props.chatVariables : this.props.chatVariables.reverse();
        const elements = await renderChatVariables(chatVariables, this.fileSystemService, this.props.includeFilepath, this.props.omitReferences, undefined);
        if (this.props.embeddedInsideUserMessage ?? promptElement_1.embeddedInsideUserMessageDefault) {
            if (!elements.length) {
                return (vscpp(tag_1.Tag, { name: 'prompt' },
                    vscpp(UserQuery, { chatVariables: chatVariables, query: this.props.query, priority: this.props.priority })));
            }
            return (vscpp(vscppf, null,
                Boolean(elements.length) && vscpp(tag_1.Tag, { name: 'attachments', flexGrow: 1, priority: this.props.priority }, elements),
                vscpp(tag_1.Tag, { name: 'prompt' },
                    vscpp(UserQuery, { chatVariables: chatVariables, query: this.props.query, priority: this.props.priority }))));
        }
        return (vscpp(vscppf, null,
            ...elements.map(element => asUserMessage(element, this.props.priority && this.props.priority - 1)),
            asUserMessage(vscpp(UserQuery, { chatVariables: chatVariables, query: this.props.query }), this.props.priority)));
    }
};
exports.ChatVariablesAndQuery = ChatVariablesAndQuery;
exports.ChatVariablesAndQuery = ChatVariablesAndQuery = __decorate([
    __param(1, fileSystemService_1.IFileSystemService)
], ChatVariablesAndQuery);
function asUserMessage(element, priority) {
    return (vscpp(prompt_tsx_1.UserMessage, { priority: priority }, element));
}
async function renderChatVariables(chatVariables, fileSystemService, includeFilepathInCodeBlocks = true, omitReferences, isAgent, useFixCookbook) {
    const elements = [];
    const filePathMode = (isAgent && includeFilepathInCodeBlocks)
        ? fileVariable_1.FilePathMode.AsAttribute
        : includeFilepathInCodeBlocks
            ? fileVariable_1.FilePathMode.AsComment
            : fileVariable_1.FilePathMode.None;
    for (const variable of chatVariables) {
        const { uniqueName: variableName, value: variableValue, reference } = variable;
        if ((0, chatVariablesCollection_1.isPromptInstruction)(variable)) { // prompt instructions are handled in the `CustomInstructions` element
            continue;
        }
        if ((0, chatVariablesCollection_1.isPromptFile)(variable)) {
            elements.push(vscpp(promptFile_1.PromptFile, { variable: variable, omitReferences: omitReferences, filePathMode: filePathMode }));
            continue;
        }
        if (uri_1.URI.isUri(variableValue) || (0, types_1.isLocation)(variableValue)) {
            const uri = 'uri' in variableValue ? variableValue.uri : variableValue;
            // Check if the variable is a directory
            let isDirectory = false;
            try {
                const stat = await fileSystemService.stat(uri);
                isDirectory = stat.type === fileTypes_1.FileType.Directory;
            }
            catch { }
            if (isDirectory) {
                elements.push(vscpp(FolderVariable, { variableName: variableName, folderUri: uri, omitReferences: omitReferences, description: reference.modelDescription }));
            }
            else {
                const file = vscpp(fileVariable_1.FileVariable, { alwaysIncludeSummary: true, filePathMode: filePathMode, variableName: variableName, variableValue: variableValue, omitReferences: omitReferences, description: reference.modelDescription, lineNumberStyle: isAgent ? implementation_1.SummarizedDocumentLineNumberStyle.OmittedRanges : undefined });
                if (!isAgent || (!uri_1.URI.isUri(variableValue) || variableValue.scheme !== network_1.Schemas.vscodeNotebookCellOutput)) {
                    // When attaching outupts, there's no need to add the entire notebook file again, as model can request the notebook file.
                    // In non agent mode, we need to add the file for context.
                    elements.push(file);
                }
                if (uri_1.URI.isUri(variableValue) && variableValue.scheme === network_1.Schemas.vscodeNotebookCellOutput) {
                    elements.push(vscpp(notebookVariables_1.NotebookCellOutputVariable, { outputUri: variableValue }));
                }
            }
        }
        else if (typeof variableValue === 'string') {
            elements.push(vscpp(tag_1.Tag, { name: 'attachment', attrs: variableName ? { id: variableName } : undefined },
                vscpp(prompt_tsx_1.TextChunk, null,
                    !omitReferences && vscpp("references", { value: [new prompt_tsx_1.PromptReference({ variableName })] }),
                    reference.modelDescription ? reference.modelDescription + ':\n' : '',
                    variableValue)));
        }
        else if (variableValue instanceof vscodeTypes_1.ChatReferenceBinaryData) {
            elements.push(vscpp(image_1.Image, { variableName: variableName, variableValue: await variableValue.data(), reference: variableValue.reference, omitReferences: omitReferences }));
        }
        else if (typeof vscodeTypes_1.ChatReferenceDiagnostic !== 'undefined' && variableValue instanceof vscodeTypes_1.ChatReferenceDiagnostic) { // check undefined to avoid breaking old Insiders versions
            elements.push(vscpp(DiagnosticVariable, { diagnostics: variableValue.diagnostics, useCookbook: useFixCookbook ?? false }));
        }
    }
    return elements;
}
const diagnosticSeverityMap = {
    [diagnostic_1.DiagnosticSeverity.Error]: 'error',
    [diagnostic_1.DiagnosticSeverity.Warning]: 'warning',
    [diagnostic_1.DiagnosticSeverity.Information]: 'info',
    [diagnostic_1.DiagnosticSeverity.Hint]: 'hint'
};
let DiagnosticVariable = class DiagnosticVariable extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService, workspaceService, fixCookbookService, alternativeNotebookContent, endpoint) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.workspaceService = workspaceService;
        this.fixCookbookService = fixCookbookService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.endpoint = endpoint;
    }
    render() {
        return vscpp(vscppf, null, this.props.diagnostics.flatMap(([uri, diagnostics]) => diagnostics.map(d => {
            let range = d.range;
            ([uri, range] = this.translateNotebookUri(uri, range));
            let cookbook;
            if (this.props.useCookbook) {
                const doc = this.workspaceService.textDocuments.find(doc => (0, resources_1.isEqual)(doc.uri, uri));
                const lang = doc ? (0, languages_1.getLanguage)(doc) : (0, languages_1.getLanguageForResource)(uri);
                cookbook = this.fixCookbookService.getCookbook(lang.languageId, d);
            }
            return vscpp(vscppf, null,
                vscpp(tag_1.Tag, { name: "error", attrs: { path: this.promptPathRepresentationService.getFilePath(uri), line: range.start.line + 1, code: getDiagnosticCode(d), severity: diagnosticSeverityMap[d.severity] } }, d.message),
                cookbook && vscpp(diagnosticsContext_1.DiagnosticSuggestedFix, { cookbook: cookbook }));
        })));
    }
    translateNotebookUri(uri, range) {
        if (uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            return [uri, range];
        }
        const [notebook, cell] = (0, notebooks_1.getNotebookAndCellFromUri)(uri, this.workspaceService.notebookDocuments);
        if (!notebook || !cell) {
            return [uri, range];
        }
        if (range.start.line > cell.document.lineCount || range.end.line > cell.document.lineCount) {
            return [uri, range];
        }
        const altDocument = this.alternativeNotebookContent.create(this.alternativeNotebookContent.getFormat(this.endpoint)).getAlternativeDocument(notebook);
        const start = altDocument.fromCellPosition(cell, range.start);
        const end = altDocument.fromCellPosition(cell, range.end);
        const newRange = new vscodeTypes_1.Range(start, end);
        return [notebook.uri, newRange];
    }
};
DiagnosticVariable = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, workspaceService_1.IWorkspaceService),
    __param(3, fixCookbookService_1.IFixCookbookService),
    __param(4, alternativeContent_1.IAlternativeNotebookContentService),
    __param(5, promptRenderer_1.IPromptEndpoint)
], DiagnosticVariable);
function getDiagnosticCode(diagnostic) {
    const code = (typeof diagnostic.code === 'object' && !!diagnostic.code) ? diagnostic.code.value : diagnostic.code;
    return String(code);
}
let FolderVariable = class FolderVariable extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, promptPathRepresentationService) {
        super(props);
        this.instantiationService = instantiationService;
        this.promptPathRepresentationService = promptPathRepresentationService;
    }
    async prepare(sizing) {
        try {
            return this.instantiationService.invokeFunction(accessor => (0, visualFileTree_1.workspaceVisualFileTree)(accessor, this.props.folderUri, { maxLength: 2000, excludeDotFiles: false }, cancellation_1.CancellationToken.None));
        }
        catch {
            // Directory doesn't exist or is not accessible
            return undefined;
        }
    }
    render(state) {
        const folderPath = this.promptPathRepresentationService.getFilePath(this.props.folderUri);
        return (vscpp(tag_1.Tag, { name: 'attachment', attrs: this.props.variableName ? { id: this.props.variableName, folderPath } : undefined },
            vscpp(prompt_tsx_1.TextChunk, null,
                !this.props.omitReferences && vscpp("references", { value: [new prompt_tsx_1.PromptReference({ variableName: this.props.variableName })] }),
                this.props.description ? this.props.description + ':\n' : '',
                "The user attached the folder `",
                folderPath,
                "`",
                state ? ' which has the following structure: ' + (0, markdown_1.createFencedCodeBlock)('', state.tree) : '')));
    }
};
FolderVariable = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], FolderVariable);
/**
 * Render toolReferences set on the request.
 */
let ChatToolReferences = class ChatToolReferences extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, toolsService, logService, endpointProvider, promptEndpoint, telemetryService) {
        super(props);
        this.instantiationService = instantiationService;
        this.toolsService = toolsService;
        this.logService = logService;
        this.endpointProvider = endpointProvider;
        this.promptEndpoint = promptEndpoint;
        this.telemetryService = telemetryService;
    }
    async render(state, sizing) {
        const { tools, toolCallResults } = this.props.promptContext;
        if (!tools || !tools.toolReferences.length) {
            return;
        }
        const results = [];
        for (const toolReference of tools.toolReferences) {
            const tool = this.toolsService.getTool(toolReference.name);
            if (!tool) {
                throw new Error(`Unknown tool: "${toolReference.name}"`);
            }
            if (toolCallResults?.[toolReference.id]) {
                results.push({ name: toolReference.name, value: toolCallResults[toolReference.id] });
                continue;
            }
            const toolArgsEndpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');
            const internalToolArgs = toolReference.input ?? {};
            const toolArgs = await this.fetchToolArgs(tool, toolArgsEndpoint);
            const name = toolReference.range ? this.props.promptContext.query.slice(toolReference.range[0], toolReference.range[1]) : undefined;
            try {
                const result = await this.toolsService.invokeTool(tool.name, { input: { ...toolArgs, ...internalToolArgs }, toolInvocationToken: tools.toolInvocationToken }, cancellation_1.CancellationToken.None);
                (0, toolCalling_1.sendInvokedToolTelemetry)(this.promptEndpoint.acquireTokenizer(), this.telemetryService, tool.name, result);
                results.push({ name, value: result });
            }
            catch (err) {
                const errResult = (0, toolCalling_1.toolCallErrorToResult)(err);
                results.push({ name, value: errResult.result });
            }
        }
        if (this.props.embeddedInsideUserMessage ?? promptElement_1.embeddedInsideUserMessageDefault) {
            return this._renderChatToolResults(tools.toolReferences, results, this.props.priority);
        }
        return (vscpp(prompt_tsx_1.UserMessage, { priority: this.props.priority }, this._renderChatToolResults(tools.toolReferences, results)));
    }
    _renderChatToolResults(tools, results, priority) {
        return (vscpp(vscppf, null,
            "These attachments may have useful context for the user's query. The user may refer to these attachments directly using a term that starts with #.",
            vscpp("br", null),
            ...results.map((toolResult, i) => this.renderChatToolResult(tools[i].id, toolResult, priority))));
    }
    renderChatToolResult(id, toolResult, priority) {
        return vscpp(tag_1.Tag, { name: 'attachment', attrs: toolResult.name ? { tool: toolResult.name } : undefined, priority: priority },
            vscpp("meta", { value: new toolCalling_1.ToolResultMetadata(id, toolResult.value) }),
            vscpp(toolCalling_1.ToolResult, { content: toolResult.value.content }));
    }
    async fetchToolArgs(tool, endpoint) {
        const ownTool = this.toolsService.getCopilotTool(tool.name);
        if (typeof ownTool?.provideInput === 'function') {
            const input = await ownTool.provideInput(this.props.promptContext);
            if (input) {
                return input;
            }
        }
        if (!tool.inputSchema || Object.keys(tool.inputSchema).length === 0) {
            return {};
        }
        const argFetchProps = {
            ...this.props,
            promptContext: {
                ...this.props.promptContext,
                tools: undefined
            }
        };
        const toolTokens = await endpoint.acquireTokenizer().countToolTokens([tool]);
        const { messages } = await promptRenderer_1.PromptRenderer.create(this.instantiationService, { ...endpoint, modelMaxPromptTokens: endpoint.modelMaxPromptTokens - toolTokens }, panelChatBasePrompt_1.PanelChatBasePrompt, argFetchProps).render();
        let fnCall;
        const fetchResult = await endpoint.makeChatRequest('fetchToolArgs', messages, async (text, _, delta) => {
            if (delta.copilotToolCalls) {
                fnCall = delta.copilotToolCalls[0];
            }
            return undefined;
        }, cancellation_1.CancellationToken.None, commonTypes_1.ChatLocation.Panel, undefined, {
            tools: (0, toolSchemaNormalizer_1.normalizeToolSchema)(endpoint.family, [
                {
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.inputSchema
                    }
                }
            ], (tool, rule) => this.logService.warn(`Tool ${tool} failed validation: ${rule}`)),
            tool_choice: {
                type: 'function',
                function: {
                    name: tool.name,
                }
            },
        }, false);
        if (!fnCall) {
            throw new Error(`Failed to compute args for tool: "${tool.name}"`);
        }
        if (fetchResult.type !== commonTypes_1.ChatFetchResponseType.Success) {
            throw new Error(`Fetching tool args failed: ${fetchResult.type} ${fetchResult.reason}`);
        }
        try {
            const args = JSON.parse(fnCall.arguments);
            return args;
        }
        catch (e) {
            throw new Error('Invalid tool arguments: ' + e.message);
        }
    }
};
exports.ChatToolReferences = ChatToolReferences;
exports.ChatToolReferences = ChatToolReferences = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, toolsService_1.IToolsService),
    __param(3, logService_1.ILogService),
    __param(4, endpointProvider_1.IEndpointProvider),
    __param(5, promptRenderer_1.IPromptEndpoint),
    __param(6, telemetry_1.ITelemetryService)
], ChatToolReferences);
//# sourceMappingURL=chatVariables.js.map