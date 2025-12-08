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
exports.InlineChatEditMarkdownPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const instantiation_1 = require("../../../../util/vs/platform/instantiation/common/instantiation");
const summarizedDocumentWithSelection_1 = require("../../../intents/node/testIntent/summarizedDocumentWithSelection");
const intents_1 = require("../../../prompt/node/intents");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const instructionMessage_1 = require("../base/instructionMessage");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("../panel/chatVariables");
const conversationHistory_1 = require("../panel/conversationHistory");
const customInstructions_1 = require("../panel/customInstructions");
const inlineChatGenerateMarkdownPrompt_1 = require("./inlineChatGenerateMarkdownPrompt");
let InlineChatEditMarkdownPrompt = class InlineChatEditMarkdownPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _instantiationService) {
        super(props);
        this._ignoreService = _ignoreService;
        this._instantiationService = _instantiationService;
    }
    async render(state, sizing) {
        const context = this.props.documentContext;
        const document = context.document;
        const languageId = document.languageId;
        if ((0, notebooks_1.isNotebookCellOrNotebookChatInput)(this.props.documentContext.document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatEditMarkdownPrompt should not be used with a notebook!');
        }
        if (languageId !== 'markdown') {
            throw (0, errors_1.illegalArgument)('InlineChatEditMarkdownPrompt should only be used with markdown documents!');
        }
        const isIgnored = await this._ignoreService.isCopilotIgnored(context.document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [this.props.documentContext.document.uri] });
        }
        const data = await this._instantiationService.invokeFunction(summarizedDocumentWithSelection_1.SummarizedDocumentData.create, document, context.fileIndentInfo, context.wholeRange, summarizedDocumentWithSelection_1.SelectionSplitKind.Adjusted);
        const { query, history, chatVariables, } = this.props.promptContext;
        // const summarizedDocument = await createPromptingSummarizedDocument(
        // 	this._parserService,
        // 	context.document,
        // 	context.fileIndentInfo,
        // 	context.document.validateRange(context.wholeRange),
        // 	sizing.endpoint.modelMaxPromptTokens / 3 // consume one 3rd of the model window
        // );
        // const splitDoc = summarizedDocument.splitAroundAdjustedSelection();
        // const { codeAbove, codeSelected, codeBelow, hasCodeWithoutSelection } = splitDoc;
        // const placeHolder = '$SELECTION_PLACEHOLDER$';
        // const codeWithoutSelection = `${codeAbove}${placeHolder}${codeBelow}`;
        const replyInterpreterFn = (splitDoc) => splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, 0 /* EarlyStopping.None */, splitDoc.replaceSelectionStreaming, streamingEdits_1.TextPieceClassifiers.createFencedBlockClassifier(inlineChatGenerateMarkdownPrompt_1.MarkdownBlock.FenceSequence), line => line.value.trim() !== data.placeholderText);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "You are a world class markdown editor, very well versed in programming.",
                vscpp("br", null),
                "The user needs help to modify some markdown content.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, historyPriority: 700, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "The markdown is always delimited by ",
                    inlineChatGenerateMarkdownPrompt_1.MarkdownBlock.FenceSequence,
                    ".",
                    vscpp("br", null),
                    "Your answer must begin and end with ",
                    inlineChatGenerateMarkdownPrompt_1.MarkdownBlock.FenceSequence,
                    ".",
                    vscpp("br", null))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 725 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: languageId, chatVariables: chatVariables })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: 750, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900, flexGrow: 2, flexReserve: sizing.endpoint.modelMaxPromptTokens / 3 },
                vscpp(summarizedDocumentWithSelection_1.SummarizedDocumentWithSelection, { documentData: data, createReplyInterpreter: replyInterpreterFn, tokenBudget: 'usePromptSizingBudget' }),
                vscpp(tag_1.Tag, { name: 'userPrompt' },
                    vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                    vscpp("br", null),
                    "The rewritten markdown content that would fit at ",
                    data.placeholderText,
                    " wrapped with ",
                    inlineChatGenerateMarkdownPrompt_1.MarkdownBlock.FenceSequence,
                    " is:"))));
    }
};
exports.InlineChatEditMarkdownPrompt = InlineChatEditMarkdownPrompt;
exports.InlineChatEditMarkdownPrompt = InlineChatEditMarkdownPrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService)
], InlineChatEditMarkdownPrompt);
//# sourceMappingURL=inlineChatEditMarkdownPrompt.js.map