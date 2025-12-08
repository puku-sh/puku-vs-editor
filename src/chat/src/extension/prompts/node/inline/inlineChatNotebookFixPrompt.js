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
exports.InlineFixNotebookPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const network_1 = require("../../../../util/vs/base/common/network");
const stringEdit_1 = require("../../../../util/vs/editor/common/core/edits/stringEdit");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const fixSelection_1 = require("../../../context/node/resolvers/fixSelection");
const inlineChatSelection_1 = require("../../../context/node/resolvers/inlineChatSelection");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const intents_1 = require("../../../prompt/node/intents");
const common_1 = require("../base/common");
const instructionMessage_1 = require("../base/instructionMessage");
const promptRenderer_1 = require("../base/promptRenderer");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const patchEditGeneration_1 = require("../codeMapper/patchEditGeneration");
const commonPrompts_1 = require("../notebook/commonPrompts");
const chatVariables_1 = require("../panel/chatVariables");
const conversationHistory_1 = require("../panel/conversationHistory");
const customInstructions_1 = require("../panel/customInstructions");
const safeElements_1 = require("../panel/safeElements");
const inlineChatFix3Prompt_1 = require("./inlineChatFix3Prompt");
const inlineChatNotebookCommon_1 = require("./inlineChatNotebookCommon");
const inlineChatNotebookCommonPromptElements_1 = require("./inlineChatNotebookCommonPromptElements");
const summarizeDocument_1 = require("./summarizedDocument/summarizeDocument");
const summarizeDocumentHelpers_1 = require("./summarizedDocument/summarizeDocumentHelpers");
const FIX_SELECTION_LENGTH_THRESHOLD = 15;
let InlineFixNotebookPrompt = class InlineFixNotebookPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _instantiationService, _languageDiagnosticsService, _parserService, _tabsAndEditorsService, _workspaceService, _promptEndpoint) {
        super(props);
        this._ignoreService = _ignoreService;
        this._instantiationService = _instantiationService;
        this._languageDiagnosticsService = _languageDiagnosticsService;
        this._parserService = _parserService;
        this._tabsAndEditorsService = _tabsAndEditorsService;
        this._workspaceService = _workspaceService;
        this._promptEndpoint = _promptEndpoint;
    }
    async prepare(sizing) {
        const { documentContext: context } = this.props;
        const isIgnored = await this._ignoreService.isCopilotIgnored(context.document.uri);
        return {
            isIgnored,
            priorities: inlineChatNotebookCommon_1.promptPriorities
        };
    }
    async render(state, sizing) {
        const documentContext = this.props.documentContext;
        if (!(0, notebooks_1.isNotebookCellOrNotebookChatInput)(documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineFixNotebookPrompt should not be used with a non-notebook!');
        }
        if (state.isIgnored) {
            return vscpp("ignoredFiles", { value: [documentContext.document.uri] });
        }
        const { query, history, chatVariables } = this.props.promptContext;
        const selection = documentContext.selection;
        // find the diagnostics of interest and the selection of interest surrounding the diagnostics
        const diagnostics = (0, fixSelection_1.findDiagnosticForSelectionAndPrompt)(this._languageDiagnosticsService, documentContext.document.uri, documentContext.selection, query);
        const range = diagnostics.length > 0 ? (0, languageDiagnosticsService_1.rangeSpanningDiagnostics)(diagnostics) : documentContext.selection;
        const treeSitterAST = this._parserService.getTreeSitterAST(documentContext.document);
        const rangeOfInterest = treeSitterAST ? await (0, fixSelection_1.findFixRangeOfInterest)(treeSitterAST, range, FIX_SELECTION_LENGTH_THRESHOLD) : range;
        const fixContext = (0, fixSelection_1.generateFixContext)(this._promptEndpoint, documentContext, range, rangeOfInterest);
        const inputDocCharLimit = (sizing.endpoint.modelMaxPromptTokens / 3) * 4; // consume one 3rd of the model window, estimating roughly 4 chars per token;
        let projectedDocument;
        let isSummarized = false;
        if (documentContext.document.getText().length > inputDocCharLimit) {
            // only compute the summarized document if needed
            const structure = await (0, selectionContextHelpers_1.getStructure)(this._parserService, documentContext.document, documentContext.fileIndentInfo);
            projectedDocument = (0, summarizeDocumentHelpers_1.summarizeDocumentSync)(inputDocCharLimit, documentContext.document, documentContext.wholeRange, structure, { tryPreserveTypeChecking: true });
            isSummarized = true;
        }
        else {
            projectedDocument = new summarizeDocument_1.ProjectedDocument(documentContext.document.getText(), stringEdit_1.StringEdit.empty, documentContext.document.languageId);
        }
        const adjustedSelection = projectedDocument.projectRange(selection);
        const selectedLinesContent = documentContext.document.getText(new vscodeTypes_1.Range(selection.start.line, 0, selection.end.line + 1, 0)).trimEnd();
        const contextInfo = (0, inlineChatSelection_1.generateNotebookCellContext)(this._tabsAndEditorsService, this._workspaceService, documentContext, fixContext.contextInfo, fixContext.tracker);
        const replyInterpreter = this._instantiationService.createInstance(inlineChatFix3Prompt_1.PatchEditFixReplyInterpreter, projectedDocument, documentContext.document.uri, adjustedSelection);
        // const replyInterpreter = this._instantiationService.createInstance(FixNotebookReplyInterpreter, range, contextInfo, documentContext);
        const exampleUri = vscodeTypes_1.Uri.file('/someFolder/myFile.ts');
        const priorities = state.priorities;
        return (vscpp(vscppf, null,
            vscpp("meta", { value: new intents_1.ReplyInterpreterMetaData(replyInterpreter) }),
            vscpp(prompt_tsx_1.SystemMessage, { priority: priorities.core },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "You are a world class expert in programming, and especially good at ",
                documentContext.language.languageId,
                ".",
                vscpp("br", null),
                "Source code is always contained in ``` blocks.",
                vscpp("br", null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, passPriority: true, historyPriority: priorities.history ?? 700, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: priorities.core },
                    "The user needs help to write some new code.",
                    vscpp("br", null),
                    vscpp(commonPrompts_1.JupyterNotebookRules, null),
                    "When dealing with Jupyter Notebook, do not generate CELL INDEX in the code blocks in your answer, it is only used to help you understand the context.",
                    vscpp("br", null),
                    "If you suggest to run a terminal command, use a code block that starts with ```bash.",
                    vscpp("br", null),
                    "When fixing \"ModuleNotFoundError\" or \"Import could not be resolved\" errors, always use magic command \"%pip install\" to add the missing packages. The imports MUST be inserted at the top of the code block and it should not replace existing code.",
                    vscpp("br", null),
                    "You should not import the same module twice.",
                    vscpp("br", null),
                    vscpp(patchEditGeneration_1.PatchEditRules, null),
                    vscpp(safetyRules_1.LegacySafetyRules, null),
                    vscpp(tag_1.Tag, { name: 'example', priority: 100 },
                        vscpp(tag_1.Tag, { name: 'user' },
                            "I have the following code open in the editor.",
                            vscpp("br", null),
                            vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: exampleUri, languageId: 'csharp', code: ["// This is my class", "class C { }", "", "new C().Field = 9;"] })),
                        vscpp(tag_1.Tag, { name: 'assistant' },
                            "The problem is that the class 'C' does not have a field or property named 'Field'. To fix this, you need to add a 'Field' property to the 'C' class.",
                            vscpp("br", null),
                            vscpp("br", null),
                            vscpp(patchEditGeneration_1.PatchEditExamplePatch, { changes: [
                                    {
                                        uri: exampleUri,
                                        find: ["// This is my class", "class C { }"],
                                        replace: ["// This is my class", "class C {", "public int Field { get; set; }", "}"]
                                    },
                                    {
                                        uri: exampleUri,
                                        find: ["new C().Field = 9;"],
                                        replace: ["// set the field to 9", "new C().Field = 9;"]
                                    }
                                ] }))))),
            vscpp(prompt_tsx_1.UserMessage, { priority: priorities.context },
                vscpp(customInstructions_1.CustomInstructions, { languageId: documentContext.language.languageId, chatVariables: chatVariables })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: priorities.context, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: priorities.context, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(InlineChatFixNotebookSelectionRenderer, { priority: priorities.core, documentContext: documentContext, aboveCells: contextInfo.aboveCells, belowCells: contextInfo.belowCells, document: documentContext.document, projectedDocument: projectedDocument, language: documentContext.language, diagnostics: diagnostics, selection: documentContext.selection, adjustedSelection: adjustedSelection, isSummarized: isSummarized, selectedLinesContent: selectedLinesContent }),
            vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatNotebookVariables, { notebookURI: this.props.documentContext.document.uri, priority: priorities.runtimeCore, priorities: priorities, query: query }),
            vscpp(prompt_tsx_1.UserMessage, { priority: priorities.core },
                "Please find a fix for my code so that the result is without any errors.",
                vscpp("br", null),
                vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                vscpp("br", null))));
    }
};
exports.InlineFixNotebookPrompt = InlineFixNotebookPrompt;
exports.InlineFixNotebookPrompt = InlineFixNotebookPrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService),
    __param(3, languageDiagnosticsService_1.ILanguageDiagnosticsService),
    __param(4, parserService_1.IParserService),
    __param(5, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(6, workspaceService_1.IWorkspaceService),
    __param(7, promptRenderer_1.IPromptEndpoint)
], InlineFixNotebookPrompt);
class InlineChatFixNotebookSelectionRenderer extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        if (this.props.documentContext.document.uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookSelectionRenderer should be used only with a notebook!');
        }
        const jupyterNotebook = (0, notebooks_1.isJupyterNotebookUri)(this.props.documentContext.document.uri);
        const { projectedDocument, aboveCells, belowCells } = this.props;
        const aboveCellsInfo = aboveCells || [];
        const belowCellsInfo = belowCells || [];
        const lang = this.props.documentContext.language;
        return (vscpp(vscppf, null,
            jupyterNotebook
                ? vscpp(vscppf, null,
                    vscpp(InlineChatFixNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }))
                : vscpp(vscppf, null,
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookInfoRenderer, { documentContext: this.props.documentContext }),
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo })),
            vscpp(NotebookCellSelection, { cellIndex: aboveCellsInfo.length, document: this.props.document, projectedDocument: projectedDocument, language: lang, diagnostics: this.props.diagnostics, selection: this.props.selection, adjustedSelection: this.props.adjustedSelection, isSummarized: this.props.isSummarized, selectedLinesContent: this.props.selectedLinesContent })));
    }
}
class NotebookCellSelection extends prompt_tsx_1.PromptElement {
    render() {
        const { cellIndex, document, projectedDocument, diagnostics, language, selection, adjustedSelection, isSummarized, selectedLinesContent } = this.props;
        const notebookType = (0, notebooks_1.isNotebookCellOrNotebookChatInput)(document.uri) ? 'Jupyter' : 'custom';
        const isMarkdown = language.languageId === 'markdown';
        return vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                "Now I create a new cell in this ",
                notebookType,
                " Notebook document at index ",
                this.props.cellIndex,
                ".",
                vscpp("br", null),
                isMarkdown && vscpp(vscppf, null,
                    "This is a markdown cell. Markdown cell is used to describe and document your workflow.",
                    vscpp("br", null)),
                vscpp(NotebookCellRenderer, { cellIndex: cellIndex, document: document, projectedDocument: projectedDocument, diagnostics: diagnostics, language: language, selection: selection, adjustedSelection: adjustedSelection, isSummarized: isSummarized, selectedLinesContent: selectedLinesContent })));
    }
}
class NotebookCellRenderer extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    render() {
        const { document, projectedDocument, diagnostics, language, selection, adjustedSelection, isSummarized, selectedLinesContent } = this.props;
        const isMarkdown = language.languageId === 'markdown';
        return vscpp(vscppf, null,
            vscpp(common_1.CompositeElement, null, projectedDocument.text.length > 0 ?
                vscpp(vscppf, null,
                    isMarkdown ?
                        vscpp(vscppf, null,
                            "I have the following markdown content in this cell, starting from line 1 to line ",
                            projectedDocument.lineCount,
                            ".",
                            vscpp("br", null)) :
                        vscpp(vscppf, null,
                            "I have the following code in this cell, starting from line 1 to line ",
                            projectedDocument.lineCount,
                            ".",
                            vscpp("br", null)),
                    vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: document.uri, languageId: language.languageId, code: projectedDocument.text, shouldTrim: false, isSummarized: isSummarized }),
                    vscpp("br", null)) :
                vscpp(vscppf, null,
                    "I am in an empty file:",
                    vscpp(patchEditGeneration_1.PatchEditInputCodeBlock, { uri: document.uri, languageId: language.languageId, code: projectedDocument.text, shouldTrim: false, isSummarized: isSummarized }),
                    vscpp("br", null))),
            vscpp(common_1.CompositeElement, null, selection.isEmpty ?
                vscpp(vscppf, null,
                    "I have the selection at line ",
                    adjustedSelection.start.line + 1,
                    ", column ",
                    adjustedSelection.start.character + 1,
                    vscpp("br", null)) :
                vscpp(vscppf, null,
                    "I have currently selected from line ",
                    adjustedSelection.start.line + 1,
                    ", column ",
                    adjustedSelection.start.character + 1,
                    " to line ",
                    adjustedSelection.end.line + 1,
                    " column ",
                    adjustedSelection.end.character + 1,
                    ".",
                    vscpp("br", null))),
            vscpp(common_1.CompositeElement, null, selectedLinesContent.length && !diagnostics.some(d => d.range.contains(selection)) &&
                vscpp(vscppf, null,
                    "The content of the lines at the selection is",
                    vscpp(safeElements_1.CodeBlock, { uri: document.uri, languageId: language.languageId, code: selectedLinesContent, shouldTrim: false }),
                    vscpp("br", null))));
    }
}
/**
 * Notebook cell context renderer. Used by Fix intents.
 * It's using following example for llm response:
 * 	---FILEPATH Untitled-1<br />
    ---FIND<br />
    ---REPLACE<br />
    ```python<br />
    df.plot(x='Name', y='Age', kind='bar')<br />
    ```<br />
    ---COMPLETE<br />
 * However, we don't use this in Generate and Edit intents yet.
 */
class InlineChatFixNotebookCellsContextRenderer extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        if (!(0, notebooks_1.isNotebookCellOrNotebookChatInput)(this.props.documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookSelectionRenderer should be used only with a notebook!');
        }
        const { aboveCells: aboveCellsInfo, belowCells: belowCellsInfo } = this.props;
        const lang = this.props.documentContext.language;
        return (vscpp(vscppf, null, (aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) &&
            vscpp(prompt_tsx_1.UserMessage, null,
                "I am working on a Jupyter notebook.",
                vscpp("br", null),
                "This Jupyter Notebook already contains multiple cells.",
                vscpp("br", null),
                "The content of cells are listed below, each cell starts with CELL INDEX and a code block started with ```",
                lang.languageId,
                vscpp("br", null),
                "Each cell is a block of code that can be executed independently.",
                vscpp("br", null),
                "Since it is Jupyter Notebook, if a module is already imported in a cell, it can be used in other cells as well.",
                vscpp("br", null),
                "For the same reason, if a variable is defined in a cell, it can be used in other cells as well.",
                vscpp("br", null),
                "We should not repeat the same import or variable definition in multiple cells, unless we want to overwrite the previous definition.",
                vscpp("br", null),
                "Do not generate CELL INDEX in your answer, it is only used to help you understand the context.",
                vscpp("br", null),
                vscpp("br", null),
                vscpp(vscppf, null,
                    "Below you will find a set of examples of what you should respond with. Please follow the exmaples on how to avoid repeating code.",
                    vscpp("br", null),
                    "## Examples starts here",
                    vscpp("br", null),
                    "Here are the cells in this Jupyter Notebook:",
                    vscpp("br", null),
                    "`CELL INDEX: 0",
                    vscpp("br", null),
                    "```python",
                    vscpp("br", null),
                    "import pandas as pd",
                    vscpp("br", null),
                    vscpp("br", null),
                    "# create a dataframe with sample data",
                    vscpp("br", null),
                    "df = pd.DataFrame({'Name': ['Alice', 'Bob', 'Charlie'], 'Age': [25, 30, 35], 'Gender': ['F', 'M', 'M']})",
                    vscpp("br", null),
                    "print(df)",
                    vscpp("br", null),
                    "```",
                    vscpp("br", null),
                    "---------------------------------",
                    vscpp("br", null),
                    "USER:",
                    vscpp("br", null),
                    "Now I create a new cell in this Jupyter Notebook document at index 1.",
                    vscpp("br", null),
                    "I have the following code open in this cell, starting from line 1 to line 1.",
                    vscpp("br", null),
                    "```python",
                    vscpp("br", null),
                    "```",
                    vscpp("br", null),
                    "---------------------------------",
                    vscpp("br", null),
                    "USER:",
                    vscpp("br", null),
                    "plot the data frame",
                    vscpp("br", null),
                    vscpp("br", null),
                    "---------------------------------",
                    vscpp("br", null),
                    "Assistant Answer",
                    vscpp("br", null),
                    "---------------------------------",
                    vscpp("br", null),
                    "To plot the dataframe, we can use the `plot()` method of pandas dataframe.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "---FILEPATH Untitled-1",
                    vscpp("br", null),
                    "---FIND",
                    vscpp("br", null),
                    "---REPLACE",
                    vscpp("br", null),
                    "```python",
                    vscpp("br", null),
                    "df.plot(x='Name', y='Age', kind='bar')",
                    vscpp("br", null),
                    "```",
                    vscpp("br", null),
                    "---COMPLETE",
                    vscpp("br", null),
                    "## Example ends here",
                    vscpp("br", null)),
                aboveCellsInfo.length > 0 && vscpp(inlineChatNotebookCommonPromptElements_1.NotebookCellList, { cells: aboveCellsInfo, title: 'Here are the cells in this Jupyter Notebook:\n' }),
                belowCellsInfo.length > 0 && vscpp(inlineChatNotebookCommonPromptElements_1.NotebookCellList, { cells: belowCellsInfo, cellIndexDelta: aboveCellsInfo.length + 1, title: 'Here are the cells below the current cell that I am editing in this Jupyter Notebook:\n' }))));
    }
}
//# sourceMappingURL=inlineChatNotebookFixPrompt.js.map