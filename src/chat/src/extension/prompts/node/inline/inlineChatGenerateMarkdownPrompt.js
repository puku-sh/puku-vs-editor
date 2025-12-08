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
exports.MarkdownBlock = exports.InlineChatGenerateMarkdownPrompt = void 0;
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
const safeElements_1 = require("../panel/safeElements");
let InlineChatGenerateMarkdownPrompt = class InlineChatGenerateMarkdownPrompt extends prompt_tsx_1.PromptElement {
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
            throw (0, errors_1.illegalArgument)('InlineChatGenerateMarkdownPrompt should not be used with a notebook!');
        }
        if (languageId !== 'markdown') {
            throw (0, errors_1.illegalArgument)('InlineChatGenerateMarkdownPrompt should only be used with markdown documents!');
        }
        const isIgnored = await this._ignoreService.isCopilotIgnored(context.document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [this.props.documentContext.document.uri] });
        }
        const { query, history, chatVariables, } = this.props.promptContext;
        const data = await this._instantiationService.invokeFunction(summarizedDocumentWithSelection_1.SummarizedDocumentData.create, context.document, context.fileIndentInfo, context.wholeRange, summarizedDocumentWithSelection_1.SelectionSplitKind.OriginalEnd);
        const replyInterpreterFn = (splitDoc) => splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, 0 /* EarlyStopping.None */, splitDoc.insertStreaming, streamingEdits_1.TextPieceClassifiers.createFencedBlockClassifier(MarkdownBlock.FenceSequence), line => line.value.trim() !== data.placeholderText);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "You are a world class markdown editor, very well versed in programming.",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, historyPriority: 700, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "The user needs help to write some new markdown.",
                    vscpp("br", null),
                    "The markdown is always delimited by ",
                    MarkdownBlock.FenceSequence,
                    ".",
                    vscpp("br", null),
                    data.hasContent && vscpp(vscppf, null,
                        "The user includes existing markdown and marks with ",
                        data.placeholderText,
                        " where the new code should go.",
                        vscpp("br", null)),
                    data.hasContent && vscpp(vscppf, null,
                        "DO NOT include the text \"",
                        data.placeholderText,
                        "\" in your reply.",
                        vscpp("br", null)),
                    data.hasContent && vscpp(vscppf, null,
                        "DO NOT repeat any markdown from the user in your reply.",
                        vscpp("br", null)),
                    !data.hasContent && vscpp(vscppf, null,
                        "Your answer must begin and end with ",
                        MarkdownBlock.FenceSequence,
                        vscpp("br", null)))),
            vscpp(prompt_tsx_1.UserMessage, { priority: 725 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: languageId, chatVariables: chatVariables })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: 750, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900, flexGrow: 2, flexReserve: sizing.endpoint.modelMaxPromptTokens / 3 },
                vscpp(summarizedDocumentWithSelection_1.SummarizedDocumentWithSelection, { flexGrow: 1, tokenBudget: 'usePromptSizingBudget', documentData: data, createReplyInterpreter: replyInterpreterFn }),
                vscpp(tag_1.Tag, { name: 'userPrompt' },
                    vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                    vscpp("br", null)),
                data.hasContent && vscpp(vscppf, null,
                    "Remember to start and end your answer with ",
                    MarkdownBlock.FenceSequence,
                    ". The markdown that would fit at ",
                    data.placeholderText,
                    " is:"))));
    }
};
exports.InlineChatGenerateMarkdownPrompt = InlineChatGenerateMarkdownPrompt;
exports.InlineChatGenerateMarkdownPrompt = InlineChatGenerateMarkdownPrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, instantiation_1.IInstantiationService)
], InlineChatGenerateMarkdownPrompt);
class MarkdownBlock extends safeElements_1.SafePromptElement {
    static { this.FenceSequence = `-+-+-+-+-+`; }
    async render(state) {
        const isIgnored = this.props.uri ? await this._ignoreService.isCopilotIgnored(this.props.uri) : false;
        if (isIgnored) {
            return this._handleFoulPrompt();
        }
        const fence = MarkdownBlock.FenceSequence;
        const code = `${fence}\n${this.props.code}\n${fence}`;
        return vscpp(prompt_tsx_1.TextChunk, null, code);
    }
}
exports.MarkdownBlock = MarkdownBlock;
//# sourceMappingURL=inlineChatGenerateMarkdownPrompt.js.map