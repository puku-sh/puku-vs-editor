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
exports.InlineChatNotebookGeneratePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const network_1 = require("../../../../util/vs/base/common/network");
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
let InlineChatNotebookGeneratePrompt = class InlineChatNotebookGeneratePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, ignoreService, parserService, experimentationService) {
        super(props);
        this.ignoreService = ignoreService;
        this.parserService = parserService;
        this.experimentationService = experimentationService;
    }
    async prepare(sizing) {
        const { documentContext: context } = this.props;
        const isIgnored = await this.ignoreService.isCopilotIgnored(context.document.uri);
        const wholeRange = context.document.validateRange(context.wholeRange);
        const summarizedDocument = await (0, promptingSummarizedDocument_1.createPromptingSummarizedDocument)(this.parserService, context.document, context.fileIndentInfo, wholeRange, sizing.endpoint.modelMaxPromptTokens / 3 // consume one 3rd of the model window
        );
        const isTagBasedDocumentSummary = this.experimentationService.getTreatmentVariable('copilotchat.tagBasedDocumentSummary') ?? false;
        return {
            summarizedDocument,
            isIgnored,
            priorities: inlineChatNotebookCommon_1.promptPriorities,
            tagBasedDocumentSummary: isTagBasedDocumentSummary
        };
    }
    render(state, sizing) {
        if (this.props.documentContext.document.uri.scheme !== network_1.Schemas.vscodeNotebookCell) {
            throw (0, errors_1.illegalArgument)('InlineChatNotebookBasePrompt should be used only with a notebook!');
        }
        const { query, history, chatVariables } = this.props.promptContext;
        const { language: lang } = this.props.documentContext;
        const extractCodeBlock = lang.languageId !== 'markdown';
        const jupyterNotebook = (0, notebooks_1.isJupyterNotebookUri)(this.props.documentContext.document.uri);
        const splitDoc = state.summarizedDocument.splitAroundOriginalSelectionEnd();
        const { codeAbove, hasContent, codeBelow } = splitDoc;
        const code = `${codeAbove}$PLACEHOLDER$${codeBelow}`;
        const replyInterpreter = splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, extractCodeBlock ? 1 /* EarlyStopping.StopAfterFirstCodeBlock */ : 0 /* EarlyStopping.None */, splitDoc.insertOrReplaceStreaming, extractCodeBlock ? streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier() : streamingEdits_1.TextPieceClassifiers.createAlwaysInsideCodeBlockClassifier(), line => line.value.trim() !== '$PLACEHOLDER$');
        const priorities = state.priorities;
        const tagBasedDocumentSummary = state.tagBasedDocumentSummary;
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
                "The user needs help to write some new code.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, historyPriority: priorities.history ?? 700, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: priorities.core },
                    jupyterNotebook &&
                        vscpp(vscppf, null,
                            vscpp(commonPrompts_1.JupyterNotebookRules, null),
                            !tagBasedDocumentSummary && vscpp(vscppf, null,
                                "When dealing with Jupyter Notebook, do not generate CELL INDEX in the code blocks in your answer, it is only used to help you understand the context.",
                                vscpp("br", null))),
                    hasContent && vscpp(vscppf, null,
                        "The user includes existing code and marks with $PLACEHOLDER$ where the new code should go.",
                        vscpp("br", null)),
                    hasContent && vscpp(vscppf, null,
                        "DO NOT include the text \"$PLACEHOLDER$\" in your reply.",
                        vscpp("br", null)),
                    hasContent && vscpp(vscppf, null,
                        "DO NOT repeat any code from the user in your reply.",
                        vscpp("br", null)),
                    (!hasContent && extractCodeBlock) && vscpp(vscppf, null,
                        "Your must generate a code block surrounded with ``` that will be used in a new file",
                        vscpp("br", null)),
                    !extractCodeBlock && vscpp(vscppf, null, "When generating content for markdown cell, provide the answer directly without any additional introductory text. Ensure that the response is structured in Markdown format to seamlessly integrate into the markdown file."))),
            vscpp(prompt_tsx_1.UserMessage, { priority: priorities.context },
                vscpp(customInstructions_1.CustomInstructions, { languageId: lang.languageId, chatVariables: chatVariables })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: priorities.context, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: priorities.context, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(InlineChatNotebookGenerateSelection, { documentContext: this.props.documentContext, hasContent: hasContent, code: code, priority: priorities.core, tagBasedDocumentSummary: tagBasedDocumentSummary }),
            vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatNotebookVariables, { notebookURI: this.props.documentContext.document.uri, priorities: priorities, query: query }),
            vscpp(prompt_tsx_1.UserMessage, { priority: priorities.core },
                vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                vscpp("br", null),
                (hasContent && extractCodeBlock) && vscpp(vscppf, null, "The code that would fit at $PLACEHOLDER$ with ``` is:"),
                (hasContent && !extractCodeBlock) && vscpp(vscppf, null, "The code that would fit at $PLACEHOLDER$ without ``` is:"))));
    }
};
exports.InlineChatNotebookGeneratePrompt = InlineChatNotebookGeneratePrompt;
exports.InlineChatNotebookGeneratePrompt = InlineChatNotebookGeneratePrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, parserService_1.IParserService),
    __param(3, nullExperimentationService_1.IExperimentationService)
], InlineChatNotebookGeneratePrompt);
let InlineChatNotebookGenerateSelection = class InlineChatNotebookGenerateSelection extends prompt_tsx_1.PromptElement {
    constructor(props, configurationService, notebookService, tabsAndEditorsService, experimentationService, workspaceService) {
        super(props);
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.experimentationService = experimentationService;
        this.workspaceService = workspaceService;
    }
    async prepare() {
        const { document, wholeRange } = this.props.documentContext;
        const inSummaryExperiment = this.experimentationService.getTreatmentVariable('copilotchat.notebookSummary')
            || this.configurationService.getConfig(configurationService_1.ConfigKey.AdvancedExperimental.NotebookSummaryExperimentEnabled);
        let executedCells = undefined;
        if (inSummaryExperiment && this.tabsAndEditorsService.activeNotebookEditor?.notebook && this.tabsAndEditorsService.activeNotebookEditor?.notebook.uri.path === document.uri.path) {
            // experiment new notebook summary
            executedCells = this.notebookService.getCellExecutions(this.tabsAndEditorsService.activeNotebookEditor.notebook.uri);
        }
        return {
            wholeRange: document.validateRange(wholeRange),
            executedCells
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
        const { hasContent, code } = this.props;
        const { aboveCells, belowCells } = contextInfo;
        const aboveCellsInfo = aboveCells || [];
        const belowCellsInfo = belowCells || [];
        const lang = this.props.documentContext.language;
        const isMarkdown = lang.languageId === 'markdown';
        const executedCells = state.executedCells || [];
        const tagBasedDocumentSummary = this.props.tagBasedDocumentSummary;
        return vscpp(vscppf, null, jupyterNotebook
            ? vscpp(vscppf, null,
                (executedCells.length > 0 &&
                    vscpp(InlineChatJupyterNotebookCellSummaryContextRenderer, { documentContext: this.props.documentContext, executedCells: executedCells })),
                (executedCells.length === 0 && (aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) && !tagBasedDocumentSummary) &&
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatJupyterNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                (executedCells.length === 0 && (aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) && tagBasedDocumentSummary) &&
                    vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatJupyterNotebookCellsContextTagBasedRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                vscpp(prompt_tsx_1.UserMessage, null, isMarkdown ?
                    vscpp(vscppf, null,
                        hasContent && vscpp(vscppf, null,
                            "Now I edit a markdown cell in this Jupyter Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        !hasContent && vscpp(vscppf, null,
                            "Now I create a new markdown cell in this Jupyter Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        "This is a markdown cell. Markdown cell is used to describe and document your workflow.",
                        vscpp("br", null),
                        hasContent && vscpp(vscppf, null,
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: code, shouldTrim: false }),
                            vscpp("br", null)))
                    :
                        vscpp(vscppf, null,
                            hasContent && vscpp(vscppf, null,
                                "Now I edit a cell in this Jupyter Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            !hasContent && vscpp(vscppf, null,
                                "Now I create a new cell in this Jupyter Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            hasContent && vscpp(vscppf, null,
                                vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: code, shouldTrim: false }),
                                vscpp("br", null)))))
            : vscpp(vscppf, null,
                vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookInfoRenderer, { documentContext: this.props.documentContext }),
                vscpp(inlineChatNotebookCommonPromptElements_1.InlineChatCustomNotebookCellsContextRenderer, { documentContext: this.props.documentContext, aboveCells: aboveCellsInfo, belowCells: belowCellsInfo }),
                vscpp(prompt_tsx_1.UserMessage, null, isMarkdown ?
                    vscpp(vscppf, null,
                        hasContent && vscpp(vscppf, null,
                            "Now I edit a markdown cell in this custom Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        !hasContent && vscpp(vscppf, null,
                            "Now I create a new markdown cell in this custom Notebook document at index ",
                            aboveCellsInfo.length,
                            ".",
                            vscpp("br", null)),
                        "This is a markdown cell. Markdown cell is used to describe and document your workflow.",
                        vscpp("br", null),
                        hasContent && vscpp(vscppf, null,
                            vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: code, shouldTrim: false }),
                            vscpp("br", null)))
                    :
                        vscpp(vscppf, null,
                            hasContent && vscpp(vscppf, null,
                                "Now I edit a cell in this custom Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            !hasContent && vscpp(vscppf, null,
                                "Now I create a new cell in this custom Notebook document at index ",
                                aboveCellsInfo.length,
                                ".",
                                vscpp("br", null)),
                            hasContent && vscpp(vscppf, null,
                                vscpp(safeElements_1.CodeBlock, { uri: doc.uri, languageId: lang.languageId, code: code, shouldTrim: false }),
                                vscpp("br", null))))));
    }
};
InlineChatNotebookGenerateSelection = __decorate([
    __param(1, configurationService_1.IConfigurationService),
    __param(2, notebookService_1.INotebookService),
    __param(3, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(4, nullExperimentationService_1.IExperimentationService),
    __param(5, workspaceService_1.IWorkspaceService)
], InlineChatNotebookGenerateSelection);
class InlineChatJupyterNotebookCellSummaryContextRenderer extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        if (!(0, notebooks_1.isNotebookCellOrNotebookChatInput)(this.props.documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatJupyterNotebookCellSummaryContextRenderer should be used only with a notebook!');
        }
        const lang = this.props.documentContext.language;
        const executedCells = this.props.executedCells || [];
        return (vscpp(vscppf, null, vscpp(prompt_tsx_1.UserMessage, null,
            "I am working on a Jupyter notebook.",
            vscpp("br", null),
            "Users have executed the following cells in this notebook",
            vscpp("br", null),
            "Each cell contains a code block started with ```",
            lang.languageId,
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
            "Below you will find a set of examples of what you should respond with. Please follow the exmaples on how to avoid repeating code.",
            vscpp("br", null),
            "## Examples starts here",
            vscpp("br", null),
            "Here are the executed cells in this Jupyter Notebook:",
            vscpp("br", null),
            "```python",
            vscpp("br", null),
            "import pandas as pd",
            vscpp("br", null),
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
            "USER:",
            vscpp("br", null),
            "plot the data frame",
            vscpp("br", null),
            vscpp("br", null),
            "---------------------------------",
            vscpp("br", null),
            "ChatGPT Answer",
            vscpp("br", null),
            "---------------------------------",
            vscpp("br", null),
            "To plot the dataframe, we can use the `plot()` method of pandas dataframe. Here's the code:",
            vscpp("br", null),
            vscpp("br", null),
            "```python",
            vscpp("br", null),
            "df.plot(x='Name', y='Age', kind='bar')",
            vscpp("br", null),
            "```",
            vscpp("br", null),
            "## Example ends here",
            vscpp("br", null),
            executedCells.map((cell) => (vscpp(NotebookCellContent, { cell: cell }))))));
    }
}
class NotebookCellContent extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            "```",
            this.props.cell.document.languageId,
            vscpp("br", null),
            this.props.cell.document.getText(),
            vscpp("br", null),
            "```");
    }
}
//# sourceMappingURL=inlineChatNotebookGeneratePrompt.js.map