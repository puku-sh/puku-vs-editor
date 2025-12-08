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
exports.PanelChatFixPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const commonTypes_1 = require("../../../../platform/chat/common/commonTypes");
const languageDiagnosticsService_1 = require("../../../../platform/languages/common/languageDiagnosticsService");
const fixSelection_1 = require("../../../context/node/resolvers/fixSelection");
const capabilities_1 = require("../base/capabilities");
const instructionMessage_1 = require("../base/instructionMessage");
const responseTranslationRules_1 = require("../base/responseTranslationRules");
const safetyRules_1 = require("../base/safetyRules");
const diagnosticsContext_1 = require("../inline/diagnosticsContext");
const chatVariables_1 = require("./chatVariables");
const codeBlockFormattingRules_1 = require("./codeBlockFormattingRules");
const conversationHistory_1 = require("./conversationHistory");
const customInstructions_1 = require("./customInstructions");
const toolCalling_1 = require("./toolCalling");
let PanelChatFixPrompt = class PanelChatFixPrompt extends prompt_tsx_1.PromptElement {
    constructor(props, languageDiagnosticsService) {
        super(props);
        this.languageDiagnosticsService = languageDiagnosticsService;
    }
    render(state, sizing) {
        const documentContext = this.props.documentContext;
        const { history, chatVariables, } = this.props.promptContext;
        const query = this.props.promptContext.query || 'There is a problem in this code. Rewrite the code to show it with the bug fixed.';
        const getDiagnostics = ({ document, selection }) => (0, fixSelection_1.findDiagnosticForSelectionAndPrompt)(this.languageDiagnosticsService, document.uri, selection, query);
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.SystemMessage, { priority: 1000 },
                "You are an AI programming assistant.",
                vscpp("br", null),
                "When asked for your name, you must respond with \"Puku Editor\".",
                vscpp("br", null),
                "Follow the user's requirements carefully & to the letter.",
                vscpp("br", null),
                vscpp(safetyRules_1.SafetyRules, null),
                vscpp("br", null),
                vscpp("br", null),
                vscpp(capabilities_1.Capabilities, { location: commonTypes_1.ChatLocation.Panel })),
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, passPriority: true, historyPriority: 700, history: history },
                vscpp(instructionMessage_1.InstructionMessage, { priority: 1000 },
                    "First think step-by-step - describe your plan for what to build in pseudocode, written out in great detail.",
                    vscpp("br", null),
                    "Then output the code in a single code block.",
                    vscpp("br", null),
                    "Minimize any other prose.",
                    vscpp("br", null),
                    "Use Markdown formatting in your answers.",
                    vscpp("br", null),
                    vscpp(codeBlockFormattingRules_1.CodeBlockFormattingRules, null),
                    "The user works in an IDE called Visual Studio Code which has a concept for editors with open files, integrated unit test support, an output pane that shows the output of running the code as well as an integrated terminal.",
                    vscpp("br", null),
                    "The active document is the source code the user is looking at right now.",
                    vscpp("br", null),
                    "You can only give one reply for each conversation turn.",
                    vscpp("br", null),
                    vscpp("br", null),
                    "Additional Rules",
                    vscpp("br", null),
                    "You specialize in being a highly skilled code generator. Your task is to help the Developer fix an issue.",
                    vscpp("br", null),
                    "If context is provided, try to match the style of the provided code as best as possible.",
                    vscpp("br", null),
                    "Generated code is readable and properly indented.",
                    vscpp("br", null),
                    "Markdown blocks are used to denote code.",
                    vscpp("br", null),
                    "Preserve user's code comment blocks, do not exclude them when refactoring code.",
                    vscpp("br", null),
                    "Pay especially close attention to the selection or exception context.",
                    vscpp("br", null),
                    "Given a description of what to do you can refactor, fix or enhance the existing code.",
                    vscpp(responseTranslationRules_1.ResponseTranslationRules, null))),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 750 },
                vscpp(customInstructions_1.CustomInstructions, { languageId: documentContext?.language.languageId, chatVariables: chatVariables })),
            documentContext &&
                vscpp(prompt_tsx_1.UserMessage, { flexGrow: 1, priority: 800 },
                    vscpp(diagnosticsContext_1.Diagnostics, { documentContext: documentContext, diagnostics: getDiagnostics(documentContext) })),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, toolCallRounds: this.props.promptContext.toolCallRounds, toolCallResults: this.props.promptContext.toolCallResults }),
            vscpp(chatVariables_1.ChatToolReferences, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, embeddedInsideUserMessage: false }),
            vscpp(chatVariables_1.ChatVariablesAndQuery, { flexGrow: 2, priority: 900, chatVariables: chatVariables, query: query, embeddedInsideUserMessage: false })));
    }
};
exports.PanelChatFixPrompt = PanelChatFixPrompt;
exports.PanelChatFixPrompt = PanelChatFixPrompt = __decorate([
    __param(1, languageDiagnosticsService_1.ILanguageDiagnosticsService)
], PanelChatFixPrompt);
//# sourceMappingURL=panelChatFixPrompt.js.map