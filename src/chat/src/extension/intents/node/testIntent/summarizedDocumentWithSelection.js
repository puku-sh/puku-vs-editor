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
exports.SummarizedDocumentWithSelection = exports.SummarizedDocumentData = exports.SelectionSplitKind = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const abstractText_1 = require("../../../../platform/editing/common/abstractText");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const logService_1 = require("../../../../platform/log/common/logService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const strings_1 = require("../../../../util/vs/base/common/strings");
const offsetRange_1 = require("../../../../util/vs/editor/common/core/ranges/offsetRange");
const selectionContextHelpers_1 = require("../../../context/node/resolvers/selectionContextHelpers");
const intents_1 = require("../../../prompt/node/intents");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const tag_1 = require("../../../prompts/node/base/tag");
const adjustSelection_1 = require("../../../prompts/node/inline/adjustSelection");
const inlineChatGenerateMarkdownPrompt_1 = require("../../../prompts/node/inline/inlineChatGenerateMarkdownPrompt");
const promptingSummarizedDocument_1 = require("../../../prompts/node/inline/promptingSummarizedDocument");
const summarizeDocumentHelpers_1 = require("../../../prompts/node/inline/summarizedDocument/summarizeDocumentHelpers");
const safeElements_1 = require("../../../prompts/node/panel/safeElements");
var SelectionSplitKind;
(function (SelectionSplitKind) {
    SelectionSplitKind[SelectionSplitKind["Adjusted"] = 0] = "Adjusted";
    SelectionSplitKind[SelectionSplitKind["OriginalEnd"] = 1] = "OriginalEnd";
})(SelectionSplitKind || (exports.SelectionSplitKind = SelectionSplitKind = {}));
function isServiceAccessor(obj) {
    return obj !== null && typeof obj === 'object' && typeof obj.get === 'function';
}
class SummarizedDocumentData {
    /**
     * Create new summarized document data that is be used for the `SummarizedDocumentWithSelection`-element,
     * the data should also be used for other parts of the prompt, e.g to know if there is selected code, etc pp
     *
     * @param document the document to summarize
     * @param formattingOptions (optional) formatting options
     * @param selection The selection or whole range
     * @param selectionSplitKind Split around adjusted or original selection.
     * @returns
     */
    static async create(parserService, document, formattingOptions, selection, selectionSplitKind) {
        if (isServiceAccessor(parserService)) {
            parserService = parserService.get(parserService_1.IParserService);
        }
        const structure = await (0, selectionContextHelpers_1.getStructure)(parserService, document, formattingOptions);
        selection = document.validateRange(selection);
        const offsetSelections = (0, adjustSelection_1.getAdjustedSelection)(structure, new abstractText_1.VsCodeTextDocument(document), selection);
        return new SummarizedDocumentData(document, formattingOptions, structure, selection, offsetSelections, selectionSplitKind);
    }
    constructor(document, formattingOptions, structure, selection, offsetSelections, kind) {
        this.document = document;
        this.formattingOptions = formattingOptions;
        this.structure = structure;
        this.selection = selection;
        this.offsetSelections = offsetSelections;
        this.kind = kind;
        const offsetSelection = kind === SelectionSplitKind.Adjusted
            ? offsetSelections.adjusted
            : offsetSelections.original;
        const text = document.getText();
        const codeSelected = text.substring(offsetSelection.start, offsetSelection.endExclusive);
        const codeAbove = text.substring(0, offsetSelection.start);
        const codeBelow = text.substring(offsetSelection.endExclusive);
        this.hasCodeWithoutSelection = codeAbove.trim().length > 0 || codeBelow.trim().length > 0;
        this.hasContent = codeSelected.trim().length > 0 || codeAbove.trim().length > 0 || codeBelow.trim().length > 0;
        this.placeholderText = offsetSelection.isEmpty ? '$PLACEHOLDER$' : '$SELECTION_PLACEHOLDER$';
    }
    summarizeDocument(tokenBudget) {
        const doc = (0, summarizeDocumentHelpers_1.summarizeDocumentSync)((0, summarizeDocumentHelpers_1.getCharLimit)(tokenBudget), this.document, this.selection, this.structure);
        let selection;
        if (this.kind === SelectionSplitKind.Adjusted) {
            selection = doc.projectOffsetRange(this.offsetSelections.adjusted);
        }
        else {
            selection = doc.projectOffsetRange(new offsetRange_1.OffsetRange(this.offsetSelections.original.endExclusive, this.offsetSelections.original.endExclusive));
        }
        return new promptingSummarizedDocument_1.SummarizedDocumentSplit(doc, this.document.uri, this.formattingOptions, selection);
    }
}
exports.SummarizedDocumentData = SummarizedDocumentData;
let SummarizedDocumentWithSelection = class SummarizedDocumentWithSelection extends prompt_tsx_1.PromptElement {
    constructor(props, logger, ignoreService) {
        super(props);
        this.logger = logger;
        this.ignoreService = ignoreService;
    }
    async render(_state, sizing) {
        const { createReplyInterpreter, documentData } = this.props;
        const isIgnored = await this.ignoreService.isCopilotIgnored(documentData.document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [documentData.document.uri] });
        }
        let { tokenBudget } = this.props;
        if (tokenBudget === 'usePromptSizingBudget') {
            // some hard coded value to account for the message padding below,
            // e.g the placeholder message, the path, etc
            tokenBudget = (sizing.tokenBudget * .85) - 300;
        }
        let splitDoc = documentData.summarizeDocument(tokenBudget);
        for (let tries = 0; tries < 5; tries++) {
            const text = splitDoc.codeAbove + splitDoc.codeSelected + splitDoc.codeBelow;
            const actualTokens = await sizing.countTokens({ type: prompt_tsx_1.Raw.ChatCompletionContentPartKind.Text, text });
            if (actualTokens <= tokenBudget) {
                break;
            }
            tokenBudget *= 0.85;
            splitDoc = documentData.summarizeDocument(tokenBudget);
        }
        this.logger.info(`Summarized doc to fit token budget (${tokenBudget} / ${sizing.endpoint.modelMaxPromptTokens}): ${splitDoc.codeAbove.length} + ${splitDoc.codeSelected.length} + ${splitDoc.codeBelow.length}`);
        const { uri, languageId } = documentData.document;
        const isMarkdown = languageId === 'markdown';
        const type = isMarkdown ? 'markdown' : 'code';
        const { codeAbove, codeSelected, codeBelow, hasCodeWithoutSelection, hasContent } = splitDoc;
        const codeWithoutSelection = `${codeAbove}${documentData.placeholderText}${codeBelow}`;
        const replyInterpreter = createReplyInterpreter
            ? createReplyInterpreter(splitDoc)
            : splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, splitDoc.replaceSelectionStreaming, streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), line => line.value.trim() !== documentData.placeholderText);
        return (vscpp(tag_1.Tag, { name: 'currentDocument' },
            vscpp("meta", { value: new intents_1.ReplyInterpreterMetaData(replyInterpreter) }),
            !hasContent && vscpp(vscppf, null,
                "I am in an empty file `",
                vscpp(safeElements_1.Uri, { value: uri, mode: 1 /* UriMode.Path */ }),
                "`."),
            hasContent && vscpp(vscppf, null,
                "I have the following ",
                type,
                " in a file called `",
                vscpp(safeElements_1.Uri, { value: uri, mode: 1 /* UriMode.Path */ }),
                "`:",
                vscpp("br", null)),
            (!isMarkdown && hasCodeWithoutSelection) && vscpp(vscppf, null,
                vscpp(safeElements_1.CodeBlock, { uri: uri, languageId: languageId, code: codeWithoutSelection, shouldTrim: false }),
                vscpp("br", null)),
            (isMarkdown && hasCodeWithoutSelection) && vscpp(vscppf, null,
                vscpp(inlineChatGenerateMarkdownPrompt_1.MarkdownBlock, { uri: uri, code: codeWithoutSelection }),
                vscpp("br", null)),
            (!(0, strings_1.isFalsyOrWhitespace)(codeSelected) || this.props._allowEmptySelection) &&
                vscpp(tag_1.Tag, { name: 'selection' },
                    (!isMarkdown && hasCodeWithoutSelection) && vscpp(vscppf, null,
                        "The ",
                        documentData.placeholderText,
                        " code is:",
                        vscpp("br", null)),
                    (isMarkdown && hasCodeWithoutSelection) && vscpp(vscppf, null, "I need your help with the following content:"),
                    !isMarkdown && vscpp(safeElements_1.CodeBlock, { uri: uri, languageId: languageId, code: codeSelected, shouldTrim: false }),
                    isMarkdown && vscpp(inlineChatGenerateMarkdownPrompt_1.MarkdownBlock, { uri: uri, code: codeSelected }))));
    }
};
exports.SummarizedDocumentWithSelection = SummarizedDocumentWithSelection;
exports.SummarizedDocumentWithSelection = SummarizedDocumentWithSelection = __decorate([
    __param(1, logService_1.ILogService),
    __param(2, ignoreService_1.IIgnoreService)
], SummarizedDocumentWithSelection);
//# sourceMappingURL=summarizedDocumentWithSelection.js.map