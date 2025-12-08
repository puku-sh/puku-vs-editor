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
exports.NotebookXmlFormatPrompt = exports.NotebookFormat = exports.NotebookReminderInstructions = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const types_1 = require("../../../../util/common/types");
const arrays_1 = require("../../../../util/vs/base/common/arrays");
const map_1 = require("../../../../util/vs/base/common/map");
const network_1 = require("../../../../util/vs/base/common/network");
const resources_1 = require("../../../../util/vs/base/common/resources");
const editCodeStep_1 = require("../../../intents/node/editCodeStep");
const chatVariablesCollection_1 = require("../../../prompt/common/chatVariablesCollection");
const intents_1 = require("../../../prompt/common/intents");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const safeElements_1 = require("./safeElements");
let NotebookReminderInstructions = class NotebookReminderInstructions extends prompt_tsx_1.PromptElement {
    constructor(props, notebookService, _workspaceService) {
        super(props);
        this.notebookService = notebookService;
        this._workspaceService = _workspaceService;
    }
    render(_state, _sizing) {
        const notebookRelatedUris = this.props.chatVariables instanceof chatVariablesCollection_1.ChatVariablesCollection ?
            getNotebookUrisFromChatVariables(this.props.chatVariables, this._workspaceService, this.notebookService) :
            this.props.chatVariables.filter(entry => (0, intents_1.isNotebookWorkingSetEntry)(entry)).map(entry => entry.document.uri);
        if (notebookRelatedUris.length || queryContainsNotebookSpecificKeywords(this.props.query)) {
            return vscpp(vscppf, null,
                "Do not show Cell IDs to the user.",
                vscpp("br", null));
        }
    }
};
exports.NotebookReminderInstructions = NotebookReminderInstructions;
exports.NotebookReminderInstructions = NotebookReminderInstructions = __decorate([
    __param(1, notebookService_1.INotebookService),
    __param(2, workspaceService_1.IWorkspaceService)
], NotebookReminderInstructions);
let NotebookFormat = class NotebookFormat extends prompt_tsx_1.PromptElement {
    constructor(props, promptPathRepresentationService, alternativeNotebookContentService, notebookService, _workspaceService, _promptEndpoint) {
        super(props);
        this.promptPathRepresentationService = promptPathRepresentationService;
        this.alternativeNotebookContentService = alternativeNotebookContentService;
        this.notebookService = notebookService;
        this._workspaceService = _workspaceService;
        this._promptEndpoint = _promptEndpoint;
    }
    render(_state, _sizing) {
        // These could be cell uris or output uris etc.
        const notebookRelatedUris = this.props.chatVariables instanceof chatVariablesCollection_1.ChatVariablesCollection ?
            getNotebookUrisFromChatVariables(this.props.chatVariables, this._workspaceService, this.notebookService) :
            this.props.chatVariables.filter(entry => (0, intents_1.isNotebookWorkingSetEntry)(entry)).map(entry => entry.document.uri);
        if (notebookRelatedUris.length || queryContainsNotebookSpecificKeywords(this.props.query)) {
            const notebookUris = getNotebookUris(notebookRelatedUris, this._workspaceService);
            return vscpp(vscppf, null,
                vscpp(tag_1.Tag, { name: "notebookFormatInstructions" }, this.getNotebookFormatInstructions(notebookUris)),
                this.getListOfNotebookFiles(notebookUris));
        }
    }
    getListOfNotebookFiles(notebookUris) {
        if (notebookUris.length) {
            return vscpp(vscppf, null,
                vscpp("br", null),
                "The following files are notebooks:",
                vscpp("br", null),
                notebookUris.map(uri => (vscpp(vscppf, null,
                    "- ",
                    uri.toString(),
                    vscpp("br", null)))),
                vscpp("br", null));
        }
        else {
            return vscpp(vscppf, null);
        }
    }
    getNotebookFormatInstructions(notebookUris) {
        const hasJupyterNotebook = notebookUris.some(uri => (0, notebooks_1.isJupyterNotebookUri)(uri));
        const extension = (hasJupyterNotebook || notebookUris.length === 0) ? '.ipynb' : (0, resources_1.extname)(notebookUris[0]);
        const tsExampleFilePath = this.promptPathRepresentationService.getExampleFilePath(`/Users/someone/proj01/example${extension}`);
        switch (this.alternativeNotebookContentService.getFormat(this._promptEndpoint)) {
            case 'xml':
                return vscpp(NotebookXmlFormatPrompt, { tsExampleFilePath: tsExampleFilePath });
            case 'text':
                return vscpp(NotebookTextFormatPrompt, { tsExampleFilePath: tsExampleFilePath });
            default:
                return vscpp(NotebookJsonFormatPrompt, { tsExampleFilePath: tsExampleFilePath });
        }
    }
};
exports.NotebookFormat = NotebookFormat;
exports.NotebookFormat = NotebookFormat = __decorate([
    __param(1, promptPathRepresentationService_1.IPromptPathRepresentationService),
    __param(2, alternativeContent_1.IAlternativeNotebookContentService),
    __param(3, notebookService_1.INotebookService),
    __param(4, workspaceService_1.IWorkspaceService),
    __param(5, promptRenderer_1.IPromptEndpoint)
], NotebookFormat);
function queryContainsNotebookSpecificKeywords(query) {
    const keywords = ['notebook', 'jupyter'];
    return keywords.some(keyword => query.toLowerCase().includes(keyword));
}
function getNotebookUris(uris, workspace) {
    return Array.from(new map_1.ResourceSet((0, arrays_1.coalesce)(uris.map(uri => {
        const nb = (0, notebooks_1.findNotebook)(uri, workspace.notebookDocuments);
        if (nb) {
            return nb.uri;
        }
        const info = (0, notebooks_1.getNotebookAndCellFromUri)(uri, workspace.notebookDocuments);
        if (info[0]) {
            return info[0].uri;
        }
        return undefined;
    }))));
}
function getNotebookUrisFromChatVariables(chatVariables, workspaceService, notebookService) {
    const notebookUris = [];
    for (const chatVar of chatVariables) {
        let notebookUri;
        if ((0, editCodeStep_1.isNotebookVariable)(chatVar.value)) {
            // Notebook cell or output
            const [notebook,] = (0, notebooks_1.getNotebookAndCellFromUri)(chatVar.value, workspaceService.notebookDocuments);
            if (chatVar.value.scheme === network_1.Schemas.vscodeNotebookCellOutput) {
                continue;
            }
            notebookUri = notebook?.uri;
        }
        else if ((0, types_1.isUri)(chatVar.value)) {
            notebookUri = chatVar.value;
        }
        else if ((0, types_1.isLocation)(chatVar.value)) {
            notebookUri = chatVar.value.uri;
        }
        if (notebookUri && notebookService.hasSupportedNotebooks(notebookUri)) {
            notebookUris.push(notebookUri);
        }
    }
    return notebookUris;
}
class NotebookXmlFormatPrompt extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    async render(_state, _sizing) {
        return vscpp(vscppf, null,
            "When generating notebook content, use an XML-based format. ",
            vscpp("br", null),
            "1. Each cell must be wrapped in a ",
            '<VSCode.Cell>',
            " with a `language` attribute indicating the type of content. (e.g., `markdown`, `python`). ",
            vscpp("br", null),
            "2. Existing cells must contain the `id` attribute to uniquely identify each cell. ",
            vscpp("br", null),
            "3. New cells do not need an `id` attribute. ",
            vscpp("br", null),
            "4. Ensure that each ",
            '<VSCode.Cell>',
            " is valid XML and logically structured. ",
            vscpp("br", null),
            "5. Do not XML encode the contents within each ",
            '<VSCode.Cell>',
            " cell. ",
            vscpp("br", null),
            "6. Do not reference the XML tags ",
            `<VSCode.Cell>`,
            " in user messages. ",
            vscpp("br", null),
            "7. Do not reference Cell Ids (as users cannot see these values) in user messages, instead use the Cell number (starting from 1). ",
            vscpp("br", null),
            vscpp("br", null),
            "Here is sample content of a Notebook document:",
            vscpp("br", null),
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: "example" },
                vscpp(safeElements_1.ExampleCodeBlock, { languageId: "xml", examplePath: this.props.tsExampleFilePath, includeFilepath: true, minNumberOfBackticks: 4, code: [
                        `<VSCode.Cell id="f8939937" language="markdown">`,
                        `# Import Required Libraries`,
                        `Import the necessary libraries, including pandas and plotly.`,
                        `</VSCode.Cell>`,
                        `<VSCode.Cell id="0b4e03d1" language="python">`,
                        `# Import Required Libraries`,
                        `import pandas as pd`,
                        `import plotly.express as px`,
                        `</VSCode.Cell>`,
                    ].join('\n') })));
    }
}
exports.NotebookXmlFormatPrompt = NotebookXmlFormatPrompt;
class NotebookJsonFormatPrompt extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    async render(_state, _sizing) {
        return vscpp(vscppf, null,
            "When generating notebook content, use a JSON format. ",
            vscpp("br", null),
            "1. Each cell must be a valid JSON object within the ",
            'cells',
            " array property with a `metadata.language` property indicating the type of content (e.g., `markdown`, `python`). ",
            vscpp("br", null),
            "2. Existing cells must contain the `metadata.id` property to uniquely identify each cell. ",
            vscpp("br", null),
            "3. New cells do not need a `metadata.id` property. ",
            vscpp("br", null),
            "4. Ensure the content is valid JSON and logically structured. ",
            vscpp("br", null),
            "5. Do not reference Cell Ids (as users cannot see these values) in user messages, instead use the Cell number (starting from 1). ",
            vscpp("br", null),
            vscpp("br", null),
            "Here is sample content of a Notebook document:",
            vscpp("br", null),
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: "example" },
                vscpp(safeElements_1.ExampleCodeBlock, { languageId: "json", examplePath: this.props.tsExampleFilePath, includeFilepath: true, minNumberOfBackticks: 4, code: [
                        `{`,
                        `  cells: [`,
                        `    {`,
                        `      cell_type: "markdown",`,
                        `      metadata: {`,
                        `          id: "f8939937",`,
                        `          language: "markdown"`,
                        `      },`,
                        `      source: [`,
                        `          "# Import Required Libraries",`,
                        `          "Import the necessary libraries, including pandas and plotly."`,
                        `      ]`,
                        `    },`,
                        `    {`,
                        `      cell_type: "code",`,
                        `      metadata: {`,
                        `          id: "0b4e03d1",`,
                        `          language: "python"`,
                        `      },`,
                        `      source: [`,
                        `          "# Import Required Libraries",`,
                        `          "import pandas as pd",`,
                        `          "import plotly.express as px"`,
                        `      ]`,
                        `    }`,
                        `  ]`,
                        `}`,
                    ].join('\n') })));
    }
}
class NotebookTextFormatPrompt extends prompt_tsx_1.PromptElement {
    constructor(props) {
        super(props);
    }
    async render(_state, _sizing) {
        return vscpp(vscppf, null,
            "When generating notebook content, use a Jupytext like format. ",
            vscpp("br", null),
            "1. Each cell must begin with a comment beginning with `#%% vscode.cell` followed by the cell attributes.",
            vscpp("br", null),
            "2. For existing cell in the document, use the `id` attribute to identify the cell. If the cell is new, DO NOT include the `id` attribute.",
            vscpp("br", null),
            "3. Use the `language` attribute to define the language of the content (e.g., `markdown`, `python`). ",
            vscpp("br", null),
            "4. For markdown cells, use triple quotes to wrap the content.",
            vscpp("br", null),
            "5. Ensure that each cell is logically structured. ",
            vscpp("br", null),
            "6. Do not reference Cell Ids (as users cannot see these values) in user messages, instead use the Cell number (starting from 1). ",
            vscpp("br", null),
            vscpp("br", null),
            "Here is sample content of a Notebook document:",
            vscpp("br", null),
            vscpp("br", null),
            vscpp(tag_1.Tag, { name: "example" },
                vscpp(safeElements_1.ExampleCodeBlock, { languageId: "python", examplePath: this.props.tsExampleFilePath, includeFilepath: true, minNumberOfBackticks: 4, code: [
                        `#%% vscode.cell [id=0fd89b28] [language=markdown]`,
                        `"""`,
                        `# Import Required Libraries`,
                        `Import the necessary libraries, including pandas and plotly.`,
                        `"""`,
                        `#%% vscode.cell [id=0b4e03d1] [language=python]`,
                        `# Import Required Libraries`,
                        `import pandas as pd`,
                        `import plotly.express as px`,
                    ].join('\n') })));
    }
}
//# sourceMappingURL=notebookEditCodePrompt.js.map