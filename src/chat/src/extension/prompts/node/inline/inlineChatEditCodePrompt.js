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
exports.InlineChatEditCodePrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const configurationService_1 = require("../../../../platform/configuration/common/configurationService");
const ignoreService_1 = require("../../../../platform/ignore/common/ignoreService");
const languageContextService_1 = require("../../../../platform/languageServer/common/languageContextService");
const parserService_1 = require("../../../../platform/parser/node/parserService");
const nullExperimentationService_1 = require("../../../../platform/telemetry/common/nullExperimentationService");
const notebooks_1 = require("../../../../util/common/notebooks");
const errors_1 = require("../../../../util/vs/base/common/errors");
const summarizedDocumentWithSelection_1 = require("../../../intents/node/testIntent/summarizedDocumentWithSelection");
const intents_1 = require("../../../prompt/node/intents");
const streamingEdits_1 = require("../../../prompt/node/streamingEdits");
const instructionMessage_1 = require("../base/instructionMessage");
const safetyRules_1 = require("../base/safetyRules");
const tag_1 = require("../base/tag");
const chatVariables_1 = require("../panel/chatVariables");
const conversationHistory_1 = require("../panel/conversationHistory");
const customInstructions_1 = require("../panel/customInstructions");
const projectLabels_1 = require("../panel/projectLabels");
const languageServerContextPrompt_1 = require("./languageServerContextPrompt");
let InlineChatEditCodePrompt = class InlineChatEditCodePrompt extends prompt_tsx_1.PromptElement {
    constructor(props, _ignoreService, _parserService, _experimentationService, _configurationService) {
        super(props);
        this._ignoreService = _ignoreService;
        this._parserService = _parserService;
        this._experimentationService = _experimentationService;
        this._configurationService = _configurationService;
    }
    async render(state, sizing) {
        const context = this.props.documentContext;
        const document = context.document;
        const languageId = document.languageId;
        if ((0, notebooks_1.isNotebookCellOrNotebookChatInput)(document.uri)) {
            throw (0, errors_1.illegalArgument)('InlineChatEditCodePrompt should not be used with a notebook!');
        }
        if (languageId === 'markdown') {
            throw (0, errors_1.illegalArgument)('InlineChatEditCodePrompt should not be used with a markdown document!');
        }
        const isIgnored = await this._ignoreService.isCopilotIgnored(document.uri);
        if (isIgnored) {
            return vscpp("ignoredFiles", { value: [document.uri] });
        }
        const { query, history, chatVariables, } = this.props.promptContext;
        const useProjectLabels = this._configurationService.getExperimentBasedConfig(configurationService_1.ConfigKey.AdvancedExperimentalExperiments.ProjectLabelsInline, this._experimentationService);
        const data = await summarizedDocumentWithSelection_1.SummarizedDocumentData.create(this._parserService, document, context.fileIndentInfo, context.wholeRange, summarizedDocumentWithSelection_1.SelectionSplitKind.Adjusted);
        const replyInterpreterFactory = (splitDoc) => splitDoc.createReplyInterpreter(intents_1.LeadingMarkdownStreaming.Mute, 1 /* EarlyStopping.StopAfterFirstCodeBlock */, splitDoc.replaceSelectionStreaming, streamingEdits_1.TextPieceClassifiers.createCodeBlockClassifier(), line => line.value.trim() !== data.placeholderText);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "You are a world class expert in programming, and especially good at ",
                languageId,
                ".",
                vscpp("br", null),
                vscpp(safetyRules_1.LegacySafetyRules, null)),
            vscpp(conversationHistory_1.HistoryWithInstructions, { inline: true, historyPriority: 700, passPriority: true, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "Source code is always contained in ``` blocks.",
                    vscpp("br", null),
                    "The user needs help to modify some code.",
                    vscpp("br", null),
                    data.hasCodeWithoutSelection && vscpp(vscppf, null,
                        "The user includes existing code and marks with ",
                        data.placeholderText,
                        " where the selected code should go.",
                        vscpp("br", null)))),
            useProjectLabels && vscpp(projectLabels_1.ProjectLabels, { priority: 600, embeddedInsideUserMessage: false }),
            vscpp(prompt_tsx_1.UserMessage, null,
                vscpp(customInstructions_1.CustomInstructions, { priority: 725, chatVariables: chatVariables, languageId: languageId }),
                vscpp(languageServerContextPrompt_1.LanguageServerContextPrompt, { priority: 700, document: document, position: context.selection.start, requestId: this.props.promptContext.requestId, source: languageContextService_1.KnownSources.chat })),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 750, promptContext: this.props.promptContext, flexGrow: 1, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariables, { priority: 750, chatVariables: chatVariables, embeddedInsideUserMessage: false }),
            vscpp(prompt_tsx_1.UserMessage, { priority: 900, flexGrow: 2, flexReserve: sizing.endpoint.modelMaxPromptTokens / 3 },
                vscpp(summarizedDocumentWithSelection_1.SummarizedDocumentWithSelection, { flexGrow: 1, tokenBudget: 'usePromptSizingBudget', documentData: data, createReplyInterpreter: replyInterpreterFactory }),
                vscpp(tag_1.Tag, { name: 'userPrompt' },
                    vscpp(chatVariables_1.UserQuery, { chatVariables: chatVariables, query: query }),
                    vscpp("br", null)),
                data.hasCodeWithoutSelection && vscpp(vscppf, null,
                    "The modified ",
                    data.placeholderText,
                    " code with ``` is:"))));
    }
};
exports.InlineChatEditCodePrompt = InlineChatEditCodePrompt;
exports.InlineChatEditCodePrompt = InlineChatEditCodePrompt = __decorate([
    __param(1, ignoreService_1.IIgnoreService),
    __param(2, parserService_1.IParserService),
    __param(3, nullExperimentationService_1.IExperimentationService),
    __param(4, configurationService_1.IConfigurationService)
], InlineChatEditCodePrompt);
//# sourceMappingURL=inlineChatEditCodePrompt.js.map