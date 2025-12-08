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
exports.InlineChatNotebookEditPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const network_1 = require("../../../../util/vs/base/common/network");
const summarizedDocumentWithSelection_1 = require("../../../intents/node/testIntent/summarizedDocumentWithSelection");
const intents_1 = require("../../../prompt/node/intents");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const instructionMessage_1 = require("../base/instructionMessage");
const safetyRules_1 = require("../base/safetyRules");
const commonPrompts_1 = require("../notebook/commonPrompts");
const chatVariables_1 = require("../panel/chatVariables");
const conversationHistory_1 = require("../panel/conversationHistory");
const customInstructions_1 = require("../panel/customInstructions");
const safeElements_1 = require("../panel/safeElements");
const inlineChatNotebookCommon_1 = require("./inlineChatNotebookCommon");
const inlineChatNotebookCommonPromptElements_1 = require("./inlineChatNotebookCommonPromptElements");
const promptingSummarizedDocument_1 = require("./promptingSummarizedDocument");
let InlineChatNotebookEditSelection = class InlineChatNotebookEditSelection extends prompt_tsx_1.PromptElement {
    constructor(props, tabsAndEditorsService, workspaceService) {
        super(props);
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.workspaceService = workspaceService;
    }
    async prepare() {
        const { document, wholeRange } = this.props.documentContext;
        return {
            wholeRange: document.validateRange(wholeRange)
        };
    }
    render(state, sizing) {
        if (this.props.documentContext.document.uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookSelection should be used only with a notebook!');
        }
        const { wholeRange } = state;
        const contextInfo = (0, inlineChatNotebookCommonPromptElements_1.generateSelectionContextInNotebook)(sizing.endpoint.modelMaxPromptTokens / 3, // consume one 3rd of the model window
        this.props.documentContext, wholeRange, this.tabsAndEditorsService, this.workspaceService);
        const doc = this.props.documentContext.document;
        const jupyterNotebook = (0, notebooks_1.isJupyterNotebookUri)(this.props.documentContext.document.uri);
        const { hasCodeWithoutSelection, codeWithoutSelection, codeSelected } = this.props;
        const { aboveCells, belowCells } = contextInfo;
        const aboveCellsInfo = aboveCells || [];
        const belowCellsInfo = belowCells || [];
        const lang = this.props.documentContext.language;
        const isMarkdown = lang.languageId === 'markdown';
        const isEditing = hasCodeWithoutSelection || codeSelected.length > 0;
        const tagBasedDocumentSummary = this.props.tagBasedDocumentSummary;
        return vscpp(vscppf, null, jupyterNotebook
            ? vscpp(vscppf, null,
                ((aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) && !tagBasedDocumentSummary) &&
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatJupyterNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                ((aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) && tagBasedDocumentSummary) &&
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatJupyterNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                vscpp(prompt_tsx_1.UserMessage, null, isMarkdown ?
                    vscpp(vscppf, null,
                        isEditing && vscpp(vscppf, null,
                            "Now I edit a markdown cell in this Jupyter Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        !isEditing && vscpp(vscppf, null,
                            "Now I create a new markdown cell in this Jupyter Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        "This is a markdown cell. Markdown cell is used to describe and document your workflow.",
                        vscpp("br", null),
                        hasCodeWithoutSelection && vscpp(vscppf, null,
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeWithoutSelection, shouldTrim: false }),
                            vscpp("br", null)),
                        hasCodeWithoutSelection && vscpp(vscppf, null,
                            "The $SELECTION_PLACEHOLDER$ code is:",
                            vscpp("br", null)),
                        vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeSelected, shouldTrim: false }))
                    :
                        vscpp(vscppf, null,
                            isEditing && vscpp(vscppf, null,
                                "Now I edit a cell in this Jupyter Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            !isEditing && vscpp(vscppf, null,
                                "Now I create a new cell in this Jupyter Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            hasCodeWithoutSelection && vscpp(vscppf, null,
                                vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeWithoutSelection, shouldTrim: false }),
                                vscpp("br", null)),
                            (codeSelected.length > 0) && vscpp(vscppf, null,
                                "The $SELECTION_PLACEHOLDER$ code is:",
                                vscpp("br", null)),
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeSelected, shouldTrim: false }))))
            : vscpp(vscppf, null,
                vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookInfoRenderer, { documentContext: this.props.documentContext }),
                vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                vscpp(prompt_tsx_1.UserMessage, null, isMarkdown ?
                    vscpp(vscppf, null,
                        hasCodeWithoutSelection && vscpp(vscppf, null,
                            "Now I edit a markdown cell in this custom Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        !hasCodeWithoutSelection && vscpp(vscppf, null,
                            "Now I create a new markdown cell in this custom Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        "This is a markdown cell. Markdown cell is used to describe and document your workflow.",
                        vscpp("br", null),
                        hasCodeWithoutSelection && vscpp(vscppf, null,
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeWithoutSelection, shouldTrim: false }),
                            vscpp("br", null)),
                        hasCodeWithoutSelection && vscpp(vscppf, null,
                            "The $SELECTION_PLACEHOLDER$ code is:",
                            vscpp("br", null)),
                        vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeSelected, shouldTrim: false }))
                    :
                        vscpp(vscppf, null,
                            hasCodeWithoutSelection && vscpp(vscppf, null,
                                "Now I edit a cell in this custom Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            !hasCodeWithoutSelection && vscpp(vscppf, null,
                                "Now I create a new cell in this custom Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            hasCodeWithoutSelection && vscpp(vscppf, null,
                                vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeWithoutSelection, shouldTrim: false }),
                                vscpp("br", null)),
                            hasCodeWithoutSelection && vscpp(vscppf, null,
                                "The $SELECTION_PLACEHOLDER$ code is:",
                                vscpp("br", null)),
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: codeSelected, shouldTrim: false })))));
    }
};
InlineChatNotebookEditSelection = __decorate([
    __param(1, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(2, workspaceService_1.IWorkspaceService)
], InlineChatNotebookEditSelection);
let InlineChatNotebookEditPrompt = class InlineChatNotebookEditPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, parserService, experimentationService, _parserService, workspaceService) {
        super(props);
        this.ignoreService = ignoreService;
        this.parserService = parserService;
        this.experimentationService = experimentationService;
        this._parserService = _parserService;
        this.workspaceService = workspaceService;
    }
    async prepare(sizing) {
        const currentDocumentContext = this.props.documentContext;
        const activeDocumentContext = currentDocumentContext;
        const notebook = (0, notebooks_1.findNotebook)(currentDocumentContext.document.uri, this.workspaceService.notebookDocuments);
        const isIgnored = await this.ignoreService.isCopilotIgnored(activeDocumentContext.document.uri);
        const wholeRange = activeDocumentContext.document.validateRange(activeDocumentContext.wholeRange);
        const summarizedDocument = await (0, promptingSummarizedDocument_1.createPromptingSummarizedDocument)(this.parserService, activeDocumentContext.document, activeDocumentContext.fileIndentInfo, wholeRange, sizing.endpoint.modelMaxPromptTokens / 3 // consume one 3rd of the model window
        );
        const isTagBasedDocumentSummary = this.experimentationService.getTreatmentVariable('copilotchat.tagBasedDocumentSummary') ?? false;
        return {
            notebook,
            isJupyterNotebook: (0, notebooks_1.isJupyterNotebookUri)(currentDocumentContext.document.uri),
            summarizedDocument,
            isIgnored,
            priorities: inlineChatNotebookCommon_1.promptPriorities,
            tagBasedDocumentSummary: isTagBasedDocumentSummary,
            activeDocumentContext: activeDocumentContext,
        };
    }
    async render(state, sizing) {
        if (!state.notebook) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookEditPrompt should be used only with a notebook!');
        }
        const context = state.activeDocumentContext;
        const promptContext = this.props.promptContext;
        if (context.document.uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookEditPrompt should be used only with a notebook!');
        }
        if (state.isIgnored) {
            return vscpp("ignoredFiles", { value: [context.document.uri] });
        }
        const tagBasedDocumentSummary = state.tagBasedDocumentSummary;
        const { query, history, chatVariables } = promptContext;
        const jupyterNotebook = state.isJupyterNotebook;
        const document = context.document;
        const lang = context.language;
        const isMarkdown = lang.languageId === 'markdown';
        const splitDoc = state.summarizedDocument.splitAroundAdjustedSelection();
        const { codeAbove, codeSelected, codeBelow, hasCodeWithoutSelection } = splitDoc;
        const data = await summarizedDocumentWithSelection_1.SummarizedDocumentData.create(this._parserService, document, context.fileIndentInfo, context.wholeRange, summarizedDocumentWithSelection_1.SelectionSplitKind.Adjusted);
        const codeWithoutSelection = `${codeAbove}${data.placeholderText}${codeBelow}`;
        const replyInterpreter = splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, splitDoc.replaceSelectionStreaming, streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), line => line.value.trim() !== data.placeholderText);
        const priorities = state.priorities;
        return (vscpp(vscppf, null,
            vscpp("meta", { value: new intents_1.ReplyInterpreterMetaData(replyInterpreter) }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: priorities.core },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "You are a world class expert in programming, and especially good at ",
                lang.languageId,
                ".",
                vscpp("br", null),
                "Source code is always contained in ``` blocks.",
                vscpp("br", null),
                "The user needs help to modify some code.",
                vscpp("br", null),
                hasCodeWithoutSelection && vscpp(vscppf, null,
                    "The user includes existing code and marks with ",
                    data.placeholderText,
                    " where the selected code should go.",
                    vscpp("br", null)),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, passPriority: true, historyPriority: priorities.history ?? 700, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: priorities.core },
                    jupyterNotebook &&
                        vscpp(vscppf, null,
                            vscpp(commonPrompts_1.JupyterNotebookRules, null),
                            !tagBasedDocumentSummary && vscpp(vscppf, null,
                                "When dealing with Jupyter Notebook, do not generate CELL INDEX in the code blocks in your answer, it is only used to help you understand the context.",
                                vscpp("br", null))),
                    isMarkdown && vscpp(vscppf, null, "When generating content for markdown cell, provide the answer directly without any additional introductory text. Ensure that the response is structured in Markdown format to seamlessly integrate into the markdown file."),
                    hasCodeWithoutSelection && vscpp(vscppf, null,
                        "The user includes existing code and marks with ",
                        data.placeholderText,
                        " where the selected code should go.",
                        vscpp("br", null)))),
            vscpp(chatVariables_1.ChatToolReferences, { priority: priorities.context, promptContext: promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: priorities.context, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(InlineChatNotebookEditSelection, { documentContext: context, hasCodeWithoutSelection: hasCodeWithoutSelection, codeWithoutSelection: codeWithoutSelection, codeSelected: codeSelected, priority: priorities.core, tagBasedDocumentSummary: tagBasedDocumentSummary }),
            vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatNotebookVariables, { notebookURI: context.document.uri, priority: priorities.runtimeCore, priorities: priorities, query: query }),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(customInstructions_1.CustomInstructions, { priority: priorities.context, languageId: lang.languageId, chatVariables: chatVariables }),
                vscpp(chatVariables_1.UserQuery, { priority: priorities.core, chatVariables: chatVariables, query: query }),
                vscpp("br", null),
                (hasCodeWithoutSelection && isMarkdown) && vscpp(prompt_tsx_1.TextChunk, { priority: priorities.core },
                    "The modified ",
                    data.placeholderText,
                    " code without ``` is:"),
                (hasCodeWithoutSelection && !isMarkdown) && vscpp(prompt_tsx_1.TextChunk, { priority: priorities.core },
                    "The modified ",
                    data.placeholderText,
                    " code with ``` is:"))));
    }
};
exports.InlineChatNotebookEditPrompt = InlineChatNotebookEditPrompt;
exports.InlineChatNotebookEditPrompt = InlineChatNotebookEditPrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, parserService_1.IParserService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, parserService_1.IParserService),
    __param(5, workspaceService_1.IWorkspaceService)
], InlineChatNotebookEditPrompt);
//# sourceMappingURL=inlineChatNotebookEditPrompt.js.map