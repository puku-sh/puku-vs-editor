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
exports.InlineChatNotebookVariables = exports.InlineChatCustomNotebookCellsContextRenderer = exports.InlineChatCustomNotebookInfoRenderer = exports.CustomNotebookExampleRenderer = exports.CustomNotebookExamples = exports.IndexedTag = exports.InlineChatJupyterNotebookCellsContextTagBasedRenderer = exports.InlineChatJupyterNotebookCellsContextRenderer = exports.NotebookCellList = void 0;
exports.generateSelectionContextInNotebook = generateSelectionContextInNotebook;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const tabsAndEditorsService_1 = require("../../../../platform/tabs/common/tabsAndEditorsService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const markdown_1 = require("../../../../util/common/markdown");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const inlineChatSelection_1 = require("../../../context/node/resolvers/inlineChatSelection");
const codeContextRegion_1 = require("../../../inlineChat/node/codeContextRegion");
const tag_1 = require("../base/tag");
class NotebookCellList extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            this.props.title,
            vscpp("br", null),
            this.props.cells.map((cell, index) => (vscpp(NotebookCellContent, { index: index + (this.props.cellIndexDelta ?? 0), cell: cell }))));
    }
}
exports.NotebookCellList = NotebookCellList;
class NotebookCellContent extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            "CELL INDEX: ",
            this.props.index,
            vscpp("br", null),
            "```",
            this.props.cell.language.languageId,
            vscpp("br", null),
            this.props.cell.lines.join('\n'),
            vscpp("br", null),
            "```");
    }
}
/**
 * Notebook cell context renderer. Used by Generate and Edit intents.
 * It includes the document context of the notebook. It' using legacy prompt technique to include the examples and the cell position and content.
 */
class InlineChatJupyterNotebookCellsContextRenderer extends prompt_tsx_1.PromptElement {
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
                    "In this new cell, I am working with the following code:",
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
                    vscpp("br", null)),
                aboveCellsInfo.length > 0 && vscpp(NotebookCellList, { cells: aboveCellsInfo, title: 'Here are the cells in this Jupyter Notebook:\n' }),
                belowCellsInfo.length > 0 && vscpp(NotebookCellList, { cells: belowCellsInfo, cellIndexDelta: aboveCellsInfo.length + 1, title: 'Here are the cells below the current cell that I am editing in this Jupyter Notebook:\n' }))));
    }
}
exports.InlineChatJupyterNotebookCellsContextRenderer = InlineChatJupyterNotebookCellsContextRenderer;
class InlineChatJupyterNotebookCellsContextTagBasedRenderer extends prompt_tsx_1.PromptElement {
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
                "The content of cells are listed below, source code is contained in ```",
                lang.languageId,
                " blocks",
                vscpp("br", null),
                "Each cell is a block of code that can be executed independently.",
                vscpp("br", null),
                "Below you will find a set of examples of what you should respond with. Please follow the exmaples on how to avoid repeating code.",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: "example" },
                    vscpp(tag_1.Tag, { name: "cellsAbove" },
                        "Here are the cells above the current cell that I am editing in this Jupyter Notebook:",
                        vscpp("br", null),
                        vscpp(IndexedTag, { name: "cell", index: 0 },
                            vscpp(prompt_tsx_1.TextChunk, null,
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
                                "```"))),
                    vscpp(tag_1.Tag, { name: "UserRequest" },
                        "Now I create a new cell in this Jupyter Notebook document at index 1.",
                        vscpp("br", null),
                        vscpp(prompt_tsx_1.TextChunk, null,
                            "```python",
                            vscpp("br", null),
                            "```",
                            vscpp("br", null)),
                        "plot the data frame",
                        vscpp("br", null)),
                    vscpp(tag_1.Tag, { name: "Response" },
                        "To plot the dataframe, we can use the `plot()` method of pandas dataframe. Here's the code:",
                        vscpp("br", null),
                        "```python",
                        vscpp("br", null),
                        "df.plot(x='Name', y='Age', kind='bar')",
                        vscpp("br", null),
                        "```",
                        vscpp("br", null))),
                aboveCellsInfo.length > 0 &&
                    vscpp(tag_1.Tag, { name: "cellsAbove" },
                        "Here are the cells above the current cell that I am editing in this Jupyter Notebook:",
                        vscpp("br", null),
                        aboveCellsInfo.map((cell, index) => (this._renderCellContent(cell, index)))),
                belowCellsInfo.length > 0 &&
                    vscpp(tag_1.Tag, { name: "cellsBelow" },
                        "Here are the cells below the current cell that I am editing in this Jupyter Notebook:",
                        vscpp("br", null),
                        belowCellsInfo.map((cell, index) => (this._renderCellContent(cell, index + aboveCellsInfo.length + 1)))))));
    }
    _renderCellContent(cell, index) {
        const code = (0, markdown_1.createFencedCodeBlock)(cell.language.languageId, cell.lines.join('\n'));
        return vscpp(IndexedTag, { name: "cell", index: index },
            vscpp(prompt_tsx_1.TextChunk, null, code));
    }
}
exports.InlineChatJupyterNotebookCellsContextTagBasedRenderer = InlineChatJupyterNotebookCellsContextTagBasedRenderer;
class IndexedTag extends prompt_tsx_1.PromptElement {
    static { this._regex = /^[a-zA-Z_][\w\.\-]*$/; }
    render() {
        const { name, index } = this.props;
        if (!IndexedTag._regex.test(name)) {
            throw new Error(`Invalid tag name: ${this.props.name}`);
        }
        return (vscpp(vscppf, null,
            '<',
            name,
            " index=",
            index,
            '>',
            vscpp("br", null),
            vscpp(vscppf, null,
                this.props.children,
                vscpp("br", null)),
            '</',
            name,
            '>'));
    }
}
exports.IndexedTag = IndexedTag;
//#region Utility
function generateSelectionContextInNotebook(tokensBudget, documentContext, range, tabsAndEditorsService, workspaceService) {
    // 4 chars per token
    const charLimit = (tokensBudget * 4);
    const initialTracker = new codeContextRegion_1.CodeContextTracker(charLimit);
    const initialContext = (0, inlineChatSelection_1.getSelectionAndCodeAroundSelection)(documentContext.document, documentContext.selection, range, new vscodeTypes_1.Range(0, 0, documentContext.document.lineCount, 0), documentContext.language, initialTracker);
    return (0, inlineChatSelection_1.generateNotebookCellContext)(tabsAndEditorsService, workspaceService, documentContext, initialContext, initialTracker);
}
//#endregion
//#region Custom Notebook
exports.CustomNotebookExamples = [
    {
        viewType: 'polyglot-notebook',
        exampleCells: [
            { lan: 'markdown', source: 'Samples' },
            { lan: 'csharp', source: 'using Microsoft.Data.Analysis;' },
            { lan: 'csharp', source: 'DateTimeDataFrameColumn dateTimes = new DateTimeDataFrameColumn(\"DateTimes\");\n Int32DataFrameColumn ints = new Int32DataFrameColumn(\"Ints\", 6);\n StringDataFrameColumn strings = new StringDataFrameColumn(\"Strings\", 6);' },
            { lan: 'csharp', source: 'dateTimes.Append(DateTime.Parse(\"2019/01/01\"));' }
        ]
    },
    {
        viewType: 'sql-notebook',
        exampleCells: [
            { lan: 'sql', source: 'SELECT * FROM users;' },
        ]
    },
    {
        viewType: 'node-notebook',
        exampleCells: [
            { lan: 'javascript', source: `console.log("Hello World");` },
            { lan: 'javascript', source: `const {display} = require('node-kernel');` },
            { lan: 'markdown', source: '# Plain text output' },
            { lan: 'javascript', source: `display.text('Hello World');` },
        ]
    },
    {
        viewType: 'sas-notebook',
        exampleCells: [
            { lan: 'sas', source: 'proc print data=sashelp.class; run;' },
            { lan: 'sas', source: 'data race;\npr = probnorm(-15/sqrt(325));\nrun;\n\nproc print data=race;\nvar pr;\nrun;\n' },
        ]
    },
    {
        viewType: 'http-notebook',
        exampleCells: [
            { lan: 'http', source: 'GET https://httpbin.org/get' },
            { lan: 'http', source: 'POST https://httpbin.org/post' },
        ]
    },
    {
        viewType: 'powerbi-notebook',
        exampleCells: [
            { lan: 'markdown', source: '# Get Groups' },
            { lan: 'powerbi-api', source: 'GET /groups' },
            { lan: 'powerbi-api', source: '%dax /groups/ccce57d1-10af-1234-1234-665f8bbd8458/datasets/51ba6d4b-1234-1234-8635-a7d743a5ea89\nEVALUATE INFO.TABLES()\nThis' },
        ]
    },
    {
        viewType: 'wolfram-language-notebook',
        exampleCells: [
            { lan: 'wolfram', source: 'Plot[Sin[x], {x, 0, 2 Pi}]' },
        ]
    },
    {
        viewType: 'github-issues',
        exampleCells: [
            { lan: 'github-issues', source: '$vscode=repo:microsoft/vscode\n$milestone=milestone:"May 2020"' },
            { lan: 'github-issues', source: '$vscode $milestone is:closed author:@me -assignee:@me label:bug -label:verified' },
            { lan: 'github-issues', source: '$vscode assignee:@me is:open label:freeze-slow-crash-leak' },
        ]
    },
    {
        viewType: 'rest-book',
        exampleCells: [
            { lan: 'rest-book', source: 'GET google.com' },
            { lan: 'rest-book', source: 'GET https://www.google.com\n    ?query="fun"\n    &page=2\n    User-Agent: rest-book\n    Content-Type: application/json' },
        ]
    }
];
class CustomNotebookExampleRenderer extends prompt_tsx_1.PromptElement {
    render() {
        const viewType = this.props.viewType;
        const matchedExample = exports.CustomNotebookExamples.find(example => example.viewType === this.props.viewType);
        if (!matchedExample) {
            return vscpp(vscppf, null);
        }
        const { exampleCells } = matchedExample;
        return (vscpp(prompt_tsx_1.UserMessage, null,
            "Below you will find a set of example cells for a ",
            viewType,
            " notebook.",
            vscpp("br", null),
            exampleCells.map((cell, index) => (vscpp(vscppf, null,
                "CELL INDEX: ",
                index,
                ":",
                vscpp("br", null),
                "```",
                cell.lan,
                vscpp("br", null),
                cell.source,
                vscpp("br", null),
                vscpp("br", null),
                "```")))));
    }
}
exports.CustomNotebookExampleRenderer = CustomNotebookExampleRenderer;
function findNotebookType(workspaceService, uri) {
    const notebook = workspaceService.notebookDocuments.find(doc => doc.uri.fsPath === uri.fsPath);
    return notebook?.notebookType;
}
let InlineChatCustomNotebookInfoRenderer = class InlineChatCustomNotebookInfoRenderer extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService) {
        super(props);
        this.workspaceService = workspaceService;
    }
    render(state, sizing) {
        if (!(0, notebooks_1.isNotebookCellOrNotebookChatInput)(this.props.documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatCustomNotebookInfoRenderer should be used only with a notebook!');
        }
        const notebookType = findNotebookType(this.workspaceService, this.props.documentContext.document.uri);
        const matchedExample = exports.CustomNotebookExamples.find(example => example.viewType === notebookType);
        const notebookTypeName = matchedExample ? notebookType : 'custom';
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null,
                "I am working on a ",
                notebookTypeName,
                " notebook in VS Code.",
                vscpp("br", null),
                notebookTypeName,
                " notebooks in VS Code are documents that contain a mix of rich Markdown, executable code snippets, ",
                vscpp("br", null),
                "and accompanying rich output. These are all separated into distinct cells and can be interleaved in any order ",
                vscpp("br", null),
                "A ",
                notebookTypeName,
                " notebook contains multiple cells.",
                vscpp("br", null)),
            matchedExample &&
                vscpp(CustomNotebookExampleRenderer, { viewType: matchedExample.viewType })));
    }
};
exports.InlineChatCustomNotebookInfoRenderer = InlineChatCustomNotebookInfoRenderer;
exports.InlineChatCustomNotebookInfoRenderer = InlineChatCustomNotebookInfoRenderer = __decorate([
    __param(1, workspaceService_1.IWorkspaceService)
], InlineChatCustomNotebookInfoRenderer);
class InlineChatCustomNotebookCellsContextRenderer extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        if (!(0, notebooks_1.isNotebookCellOrNotebookChatInput)(this.props.documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatCustomNotebookCellsContextRenderer should be used only with a notebook!');
        }
        const { aboveCells, belowCells, documentContext } = this.props;
        const aboveCellsInfo = aboveCells || [];
        const belowCellsInfo = belowCells || [];
        const lang = documentContext.language;
        return (vscpp(vscppf, null, (aboveCellsInfo.length > 0 || belowCellsInfo.length > 0) &&
            vscpp(prompt_tsx_1.UserMessage, null,
                "The content of cells are listed below, each cell starts with CELL INDEX and a code block started with ```",
                lang.languageId,
                vscpp("br", null),
                "Each cell is a block of code that can be executed independently.",
                vscpp("br", null),
                "Do not generate CELL INDEX in your answer, it is only used to help you understand the context.",
                vscpp("br", null),
                vscpp("br", null),
                "Below you will find a set of examples of what you should respond with. Please follow the exmaples on how to avoid repeating code.",
                vscpp("br", null),
                aboveCellsInfo.length > 0 && vscpp(NotebookCellList, { cells: aboveCellsInfo, title: 'Here are the cells in this custom notebook:\n' }),
                belowCellsInfo.length > 0 && vscpp(NotebookCellList, { cells: belowCellsInfo, cellIndexDelta: aboveCellsInfo.length + 1, title: 'Here are the cells below the current cell that I am editing in this custom notebook:\n' }))));
    }
}
exports.InlineChatCustomNotebookCellsContextRenderer = InlineChatCustomNotebookCellsContextRenderer;
let InlineChatNotebookVariables = class InlineChatNotebookVariables extends prompt_tsx_1.PromptElement {
    constructor(props, tabsAndEditorsService, notebookService) {
        super(props);
        this.tabsAndEditorsService = tabsAndEditorsService;
        this.notebookService = notebookService;
    }
    async prepare() {
        if (this.tabsAndEditorsService.activeNotebookEditor?.notebook.uri.path !== this.props.notebookURI.path) {
            return { variables: [], packages: [] };
        }
        const notebookEditor = this.tabsAndEditorsService.activeNotebookEditor;
        const notebook = notebookEditor?.notebook;
        if (!notebook) {
            return { variables: [], packages: [] };
        }
        const fetchVariables = this.notebookService.getVariables(notebook.uri);
        // disable fetching available packages
        const fetchPackages = Promise.resolve([]);
        const [variables, packages] = await Promise.all([fetchVariables, fetchPackages]);
        return { variables, packages };
    }
    render(state) {
        const { priorities } = this.props;
        return (vscpp(prompt_tsx_1.TokenLimit, { max: 16384 },
            state.variables.length !== 0 &&
                vscpp(vscppf, null,
                    vscpp(prompt_tsx_1.UserMessage, { priority: priorities.runtimeCore },
                        "The following variables are present in this Jupyter Notebook:",
                        state.variables.map((variable) => (vscpp(vscppf, null,
                            vscpp(prompt_tsx_1.TextChunk, null,
                                "Name: ",
                                variable.variable.name,
                                vscpp("br", null),
                                variable.variable.type && vscpp(vscppf, null,
                                    "Type: ",
                                    variable.variable.type),
                                vscpp("br", null),
                                "Value: ",
                                variable.variable.value,
                                vscpp("br", null),
                                variable.indexedChildrenCount > 0 && vscpp(vscppf, null,
                                    "Length: ",
                                    variable.indexedChildrenCount),
                                vscpp("br", null),
                                variable.variable.summary && vscpp(vscppf, null,
                                    "Summary: ",
                                    variable.variable.summary))))))),
            state.packages.length !== 0 &&
                vscpp(vscppf, null,
                    vscpp(prompt_tsx_1.UserMessage, { priority: priorities.other },
                        "The following pip packages are available in this Jupyter Notebook:",
                        state.packages.map((pkg) => (vscpp(vscppf, null,
                            vscpp(prompt_tsx_1.TextChunk, null,
                                pkg.name,
                                "==",
                                pkg.version),
                            vscpp("br", null))))))));
    }
};
exports.InlineChatNotebookVariables = InlineChatNotebookVariables;
exports.InlineChatNotebookVariables = InlineChatNotebookVariables = __decorate([
    __param(1, tabsAndEditorsService_1.ITabsAndEditorsService),
    __param(2, notebookService_1.INotebookService)
], InlineChatNotebookVariables);
//#endregion
//# sourceMappingURL=inlineChatNotebookCommonPromptElements.js.map