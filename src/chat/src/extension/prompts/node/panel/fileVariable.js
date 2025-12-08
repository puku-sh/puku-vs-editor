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
exports.fileVariableCostFn = exports.FilePathMode = exports.FileVariable = void 0;
const l10n = __importStar(require("@vscode/l10n"));
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const promptElements_1 = require("@vscode/prompt-tsx/dist/base/promptElements");
const textDocumentSnapshot_1 = require("../../../../platform/editing/common/textDocumentSnapshot");
const fileSystemService_1 = require("../../../../platform/filesystem/common/fileSystemService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const alternativeContent_1 = require("../../../../platform/notebook/common/alternativeContent");
const notebookService_1 = require("../../../../platform/notebook/common/notebookService");
const promptPathRepresentationService_1 = require("../../../../platform/prompts/common/promptPathRepresentationService");
const workspaceService_1 = require("../../../../platform/workspace/common/workspaceService");
const notebooks_1 = require("../../../../util/common/notebooks");
const types_1 = require("../../../../util/common/types");
const cache_1 = require("../../../../util/vs/base/common/cache");
const network_1 = require("../../../../util/vs/base/common/network");
const resources_1 = require("../../../../util/vs/base/common/resources");
const strings_1 = require("../../../../util/vs/base/common/strings");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const vscodeTypes_1 = require("../../../../vscodeTypes");
const promptRenderer_1 = require("../base/promptRenderer");
const tag_1 = require("../base/tag");
const summarizeDocumentHelpers_1 = require("../inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("./safeElements");
let FileVariable = class FileVariable extends prompt_tsx_1.PromptElement {
    constructor(props, workspaceService, ignoreService, fileService, notebookService, alternativeNotebookContent, promptEndpoint) {
        super(props);
        this.workspaceService = workspaceService;
        this.ignoreService = ignoreService;
        this.fileService = fileService;
        this.notebookService = notebookService;
        this.alternativeNotebookContent = alternativeNotebookContent;
        this.promptEndpoint = promptEndpoint;
    }
    async render(_state, sizing) {
        const uri = 'uri' in this.props.variableValue ? this.props.variableValue.uri : this.props.variableValue;
        if (await this.ignoreService.isCopilotIgnored(uri)) {
            return vscpp("ignoredFiles", { value: [uri] });
        }
        if (uri.scheme === 'untitled' && !this.workspaceService.textDocuments.some(doc => doc.uri.toString() === uri.toString())) {
            // A previously open untitled document that isn't open anymore- opening it would open an empty text editor
            return;
        }
        if (/\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(uri.path)) {
            const options = { status: { description: l10n.t("{0} does not support images.", this.promptEndpoint.model), kind: prompt_tsx_1.ChatResponseReferencePartStatusKind.Omitted } };
            if (this.props.omitReferences) {
                return;
            }
            if (!this.promptEndpoint.supportsVision) {
                return (vscpp(vscppf, null,
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: uri } : uri, undefined, options)] })));
            }
            try {
                const buffer = await this.fileService.readFile(uri);
                const base64string = Buffer.from(buffer).toString('base64');
                return (vscpp(promptElements_1.UserMessage, { priority: 0 },
                    vscpp(prompt_tsx_1.Image, { src: base64string, detail: 'high' }),
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: uri } : uri, undefined, options)] })));
            }
            catch (err) {
                return (vscpp(vscppf, null,
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: uri } : uri, undefined, options)] })));
            }
        }
        let range = (0, types_1.isUri)(this.props.variableValue) ? undefined : this.props.variableValue.range;
        let documentSnapshot;
        let fileUri = uri;
        if (uri.scheme === network_1.Schemas.vscodeNotebookCellOutput) {
            // add exception for notebook cell output with image mime type in unsupported endpoint
            const items = (0, notebooks_1.getNotebookCellOutput)(uri, this.workspaceService.notebookDocuments);
            if (!items) {
                return;
            }
            const outputCell = items[2];
            if (outputCell.items.length > 0 && outputCell.items[0].mime.startsWith('image/') && !this.promptEndpoint.supportsVision) {
                const options = { status: { description: l10n.t("{0} does not support images.", this.promptEndpoint.model), kind: prompt_tsx_1.ChatResponseReferencePartStatusKind.Omitted } };
                if (this.props.omitReferences) {
                    return;
                }
                return (vscpp(vscppf, null,
                    vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: this.props.variableValue } : this.props.variableValue, undefined, options)] })));
            }
        }
        if (uri.scheme === network_1.Schemas.vscodeNotebookCell || uri.scheme === network_1.Schemas.vscodeNotebookCellOutput) {
            const [notebook, cell] = (0, notebooks_1.getNotebookAndCellFromUri)(uri, this.workspaceService.notebookDocuments);
            if (!notebook) {
                return;
            }
            fileUri = notebook.uri;
            if (cell) {
                const cellRange = new vscodeTypes_1.Range(cell.document.lineAt(0).range.start, cell.document.lineAt(cell.document.lineCount - 1).range.end);
                range = range ?? cellRange;
                // Ensure the range is within the cell range
                if (range.start > cellRange.end || range.end < cellRange.start) {
                    range = cellRange;
                }
                const altDocument = this.alternativeNotebookContent.create(this.alternativeNotebookContent.getFormat(this.promptEndpoint)).getAlternativeDocument(notebook);
                //Translate the range to alternative content.
                range = new vscodeTypes_1.Range(altDocument.fromCellPosition(cell, range.start), altDocument.fromCellPosition(cell, range.end));
            }
            else {
                range = undefined;
            }
        }
        try {
            documentSnapshot = this.notebookService.hasSupportedNotebooks(fileUri) ?
                await this.workspaceService.openNotebookDocumentAndSnapshot(fileUri, this.alternativeNotebookContent.getFormat(this.promptEndpoint)) :
                await this.workspaceService.openTextDocumentAndSnapshot(fileUri);
        }
        catch (err) {
            const options = { status: { description: l10n.t('This file could not be read: {0}', err.message), kind: prompt_tsx_1.ChatResponseReferencePartStatusKind.Omitted } };
            if (this.props.omitReferences) {
                return;
            }
            return (vscpp(vscppf, null,
                vscpp("references", { value: [new prompt_tsx_1.PromptReference(this.props.variableName ? { variableName: this.props.variableName, value: this.props.variableValue } : this.props.variableValue, undefined, options)] })));
        }
        if ((range && (!this.props.alwaysIncludeSummary || range.isEqual(new vscodeTypes_1.Range(new vscodeTypes_1.Position(0, 0), documentSnapshot.lineAt(documentSnapshot.lineCount - 1).range.end)))) || /\.(svg)$/i.test(uri.path)) {
            // Don't summarize if the file is an SVG, since summarization will almost certainly not work as expected
            return vscpp(CodeSelection, { variableName: this.props.variableName, document: documentSnapshot, range: range, filePathMode: this.props.filePathMode, omitReferences: this.props.omitReferences, description: this.props.description });
        }
        if (range) {
            const selectionDesc = this.props.description ? this.props.description : ``;
            const summaryDesc = `User's active file for additional context`;
            return (vscpp(vscppf, null,
                vscpp(CodeSelection, { variableName: this.props.variableName, document: documentSnapshot, range: range, filePathMode: this.props.filePathMode, omitReferences: this.props.omitReferences, description: selectionDesc }),
                vscpp(CodeSummary, { flexGrow: 1, variableName: '', document: documentSnapshot, range: range, filePathMode: this.props.filePathMode, lineNumberStyle: this.props.lineNumberStyle, omitReferences: this.props.omitReferences, description: summaryDesc })));
        }
        return vscpp(CodeSummary, { variableName: this.props.variableName, document: documentSnapshot, range: range, filePathMode: this.props.filePathMode, lineNumberStyle: this.props.lineNumberStyle, omitReferences: this.props.omitReferences, description: this.props.description });
    }
};
exports.FileVariable = FileVariable;
exports.FileVariable = FileVariable = __decorate([
    __param(1, workspaceService_1.IWorkspaceService),
    __param(2, ignoreService_1.IIgnoreService),
    __param(3, fileSystemService_1.IFileSystemService),
    __param(4, notebookService_1.INotebookService),
    __param(5, alternativeContent_1.IAlternativeNotebookContentService),
    __param(6, promptRenderer_1.IPromptEndpoint)
], FileVariable);
class CodeSelection extends prompt_tsx_1.PromptElement {
    async render(_state, sizing) {
        const { document, range } = this.props;
        const { uri } = document;
        const references = this.props.omitReferences ? undefined : [new prompt_tsx_1.PromptReference(range ? new vscodeTypes_1.Location(uri, range) : uri)];
        return (vscpp(tag_1.Tag, { name: 'attachment', attrs: this.props.variableName ? { id: this.props.variableName } : undefined },
            this.props.description ? this.props.description + ':\n' : '',
            "Excerpt from ",
            (0, resources_1.basename)(uri),
            range ? `, lines ${range.start.line + 1} to ${range.end.line + 1}` : '',
            ":",
            vscpp(safeElements_1.CodeBlock, { includeFilepath: this.props.filePathMode === FilePathMode.AsComment, languageId: document.languageId, uri: uri, references: references, code: document.getText(range) })));
    }
}
var FilePathMode;
(function (FilePathMode) {
    FilePathMode[FilePathMode["AsAttribute"] = 0] = "AsAttribute";
    FilePathMode[FilePathMode["AsComment"] = 1] = "AsComment";
    FilePathMode[FilePathMode["None"] = 2] = "None";
})(FilePathMode || (exports.FilePathMode = FilePathMode = {}));
let CodeSummary = class CodeSummary extends prompt_tsx_1.PromptElement {
    constructor(props, instantiationService, _promptPathRepresentationService) {
        super(props);
        this.instantiationService = instantiationService;
        this._promptPathRepresentationService = _promptPathRepresentationService;
    }
    async render(_state, sizing) {
        const { document, range } = this.props;
        const { uri } = document;
        const lineNumberStyle = this.props.lineNumberStyle === 'legacy' ? undefined : this.props.lineNumberStyle;
        const summarized = document instanceof textDocumentSnapshot_1.TextDocumentSnapshot ?
            await this.instantiationService.createInstance(summarizeDocumentHelpers_1.DocumentSummarizer).summarizeDocument(document, undefined, range, sizing.tokenBudget, {
                costFnOverride: exports.fileVariableCostFn,
                lineNumberStyle,
            }) :
            await this.instantiationService.createInstance(summarizeDocumentHelpers_1.NotebookDocumentSummarizer).summarizeDocument(document, undefined, range, sizing.tokenBudget, {
                costFnOverride: exports.fileVariableCostFn,
                lineNumberStyle,
            });
        const code = this.props.lineNumberStyle === 'legacy' ? this.includeLineNumbers(summarized) : summarized.text;
        const promptReferenceOptions = !summarized.isOriginal
            ? { status: { description: l10n.t('Part of this file was not sent to the model due to context window limitations. Try attaching specific selections from your file instead.'), kind: 2 } }
            : undefined;
        const references = this.props.omitReferences ? undefined : [new prompt_tsx_1.PromptReference(uri, undefined, promptReferenceOptions)];
        const attrs = {};
        if (this.props.variableName) {
            attrs.id = this.props.variableName;
        }
        if (!summarized.isOriginal) {
            attrs.isSummarized = 'true';
        }
        if (this.props.filePathMode === FilePathMode.AsAttribute) {
            attrs.filePath = this._promptPathRepresentationService.getFilePath(uri);
        }
        return (vscpp(tag_1.Tag, { name: 'attachment', attrs: attrs },
            this.props.description ? this.props.description + ':\n' : '',
            vscpp(safeElements_1.CodeBlock, { includeFilepath: this.props.filePathMode === FilePathMode.AsComment, languageId: document.languageId, uri: uri, references: references, code: code, fence: '' })));
    }
    includeLineNumbers(summarized) {
        const lines = (0, strings_1.splitLines)(summarized.text);
        const lineNumberWidth = lines.length.toString().length;
        return lines.map((line, index) => {
            let lineNumber;
            if (summarized.isOriginal) {
                lineNumber = index;
            }
            else {
                const offset = summarized.positionOffsetTransformer.getOffset(new vscodeTypes_1.Position(index, 0));
                const originalPosition = summarized.originalPositionOffsetTransformer.getPosition(summarized.projectBack(offset));
                lineNumber = originalPosition.line;
            }
            return `${(lineNumber + 1).toString().padStart(lineNumberWidth)}: ${line}`;
        }).join('\n');
    }
};
CodeSummary = __decorate([
    __param(1, instantiation_1.IInstantiationService),
    __param(2, promptPathRepresentationService_1.IPromptPathRepresentationService)
], CodeSummary);
exports.fileVariableCostFn = {
    createCostFn(doc) {
        const nodeMultiplier = new cache_1.CachedFunction(node => {
            if (doc.languageId === 'typescript') {
                const parentCost = node.parent ? nodeMultiplier.get(node.parent) : 1;
                const nodeText = node.text.trim();
                if (nodeText.startsWith('private ')) {
                    return parentCost * 1.1;
                }
                if (nodeText.startsWith('export ') || nodeText.startsWith('public ')) {
                    return parentCost * 0.9;
                }
            }
            return 1;
        });
        return (node, currentCost) => {
            if (!node) {
                return currentCost;
            }
            if (node.kind === 'import_statement') {
                return 1000; // Include import statements last
            }
            const m = nodeMultiplier.get(node);
            return currentCost * m;
        };
    },
};
//# sourceMappingURL=fileVariable.js.map